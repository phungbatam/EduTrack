import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createSeedRules, createSeedStudents, createSeedViolations } from '../data/mockData.js'
import { weekLabel, ACADEMIC_LEVELS, ACADEMIC_ORDER } from '../utils/helpers.js'
import * as api from '../lib/api.js'

const STORAGE_KEYS = {
  students: 'et_students',
  rules: 'et_rules',
  violations: 'et_violations',
  submissions: 'et_submissions',
  lockedWeeks: 'et_locked_weeks',
  notifications: 'et_notifications',
  activityLog: 'et_activity',
  appeals: 'et_appeals',
  penalties: 'et_penalties',
  session: 'et_session',
}

const DATA_VERSION = 8
const VERSION_KEY = 'et_data_version'

const DATA_KEYS = [
  'et_students',
  'et_rules',
  'et_violations',
  'et_passwords',
  'et_locked_weeks',
  'et_submissions',
  'et_notifications',
  'et_activity',
  'et_appeals',
  'et_penalties',
]

function checkDataVersion() {
  try {
    if (localStorage.getItem(VERSION_KEY) !== String(DATA_VERSION)) {
      DATA_KEYS.forEach((k) => localStorage.removeItem(k))
      localStorage.setItem(VERSION_KEY, String(DATA_VERSION))
    }
  } catch (e) {
    /* ignore */
  }
}

function read(key, seed) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data) && data.length) return data
    }
  } catch (e) {
    console.warn('Không đọc được dữ liệu từ localStorage:', e)
  }
  return typeof seed === 'function' ? seed() : null
}

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session)
    if (raw) {
      const data = JSON.parse(raw)
      if (data && typeof data === 'object' && (data.role === 'admin' || data.role === 'student')) {
        if (data.role === 'admin' && !data.token) return null
        return data
      }
    }
  } catch (e) {
    console.warn('Không đọc được phiên đăng nhập:', e)
  }
  return null
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('Không ghi được vào localStorage:', e)
  }
}

function clear(key) {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    /* ignore */
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [students, setStudents] = useState([])
  const [rules, setRules] = useState([])
  const [violations, setViolations] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [lockedWeeks, setLockedWeeks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [appeals, setAppeals] = useState([])
  const [penalties, setPenalties] = useState([])
  const [session, setSession] = useState(readSession)
  const [toasts, setToasts] = useState([])
  const [ready, setReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState('synced')

  useEffect(() => {
    let cancelled = false
    checkDataVersion()
    Promise.all([
      api.loadCollection('students'),
      api.loadCollection('rules'),
      api.loadCollection('violations'),
      api.loadCollection('submissions'),
      api.loadCollection('lockedWeeks'),
      api.loadCollection('notifications'),
      api.loadCollection('activityLog'),
      api.loadCollection('appeals'),
      api.loadCollection('penalties'),
    ])
      .then(([s, r, v, m, l, n, a, ap, pe]) => {
        if (cancelled) return
        setStudents(Array.isArray(s) ? s : createSeedStudents())
        setRules(Array.isArray(r) ? r : createSeedRules())
        setViolations(Array.isArray(v) ? v : createSeedViolations())
        setSubmissions(Array.isArray(m) ? m : [])
        setLockedWeeks(Array.isArray(l) ? l : [])
        setNotifications(Array.isArray(n) ? n : [])
        setActivityLog(Array.isArray(a) ? a : [])
        setAppeals(Array.isArray(ap) ? ap : [])
        setPenalties(Array.isArray(pe) ? pe : [])
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setStudents(read(STORAGE_KEYS.students, createSeedStudents))
        setRules(read(STORAGE_KEYS.rules, createSeedRules))
        setViolations(read(STORAGE_KEYS.violations, createSeedViolations))
        setSubmissions(read(STORAGE_KEYS.submissions, () => []))
        setLockedWeeks(read(STORAGE_KEYS.lockedWeeks, () => []))
        setNotifications(read(STORAGE_KEYS.notifications, () => []))
        setActivityLog(read(STORAGE_KEYS.activityLog, () => []))
        setAppeals(read(STORAGE_KEYS.appeals, () => []))
        setPenalties(read(STORAGE_KEYS.penalties, () => []))
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isFromPoll = useRef(false)

  useEffect(() => {
    if (!ready) return
    const POLL_MS = 30000
    const keys = ['students', 'rules', 'violations', 'submissions', 'lockedWeeks', 'notifications', 'activityLog', 'appeals', 'penalties']
    const setters = {
      students: setStudents,
      rules: setRules,
      violations: setViolations,
      submissions: setSubmissions,
      lockedWeeks: setLockedWeeks,
      notifications: setNotifications,
      activityLog: setActivityLog,
      appeals: setAppeals,
      penalties: setPenalties,
    }

    const poll = async () => {
      isFromPoll.current = true
      try {
        const results = await Promise.all(keys.map((k) => api.fetchCollectionRaw(k)))
        keys.forEach((k, i) => {
          const data = results[i]
          if (Array.isArray(data)) {
            setters[k]((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data))
          }
        })
      } catch (e) {
        /* ignore */
      } finally {
        setTimeout(() => { isFromPoll.current = false }, 0)
      }
    }

    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [ready])

  const adminToken = session && session.role === 'admin' ? session.token : null
  const writeToken = adminToken || (session && session.role === 'student' && session.token) || null

  useEffect(() => {
    if (!ready) return
    write(STORAGE_KEYS.students, students)
    if (!adminToken || isFromPoll.current) return
    setSyncStatus('saving')
    api.saveCollection('students', students, adminToken).then((ok) => {
      setSyncStatus(ok ? 'synced' : 'local-only')
    })
  }, [students, ready, adminToken])

  useEffect(() => {
    if (!ready) return
    write(STORAGE_KEYS.rules, rules)
    if (!adminToken || isFromPoll.current) return
    setSyncStatus('saving')
    api.saveCollection('rules', rules, adminToken).then((ok) => {
      setSyncStatus(ok ? 'synced' : 'local-only')
    })
  }, [rules, ready, adminToken])

  useEffect(() => {
    if (!ready) return
    write(STORAGE_KEYS.violations, violations)
    if (!adminToken || isFromPoll.current) return
    setSyncStatus('saving')
    api.saveCollection('violations', violations, adminToken).then((ok) => {
      setSyncStatus(ok ? 'synced' : 'local-only')
    })
  }, [violations, ready, adminToken])

  useEffect(() => {
    if (!ready) return
    write(STORAGE_KEYS.submissions, submissions)
    if (!writeToken || isFromPoll.current) return
    setSyncStatus('saving')
    api.saveCollection('submissions', submissions, writeToken).then((ok) => {
      setSyncStatus(ok ? 'synced' : 'local-only')
    })
  }, [submissions, ready, writeToken])

  useEffect(() => {
    if (!ready) return
    write(STORAGE_KEYS.notifications, notifications)
    if (!writeToken || isFromPoll.current) return
    api.saveCollection('notifications', notifications, writeToken).then((ok) => {
      setSyncStatus(ok ? 'synced' : 'local-only')
    })
  }, [notifications, ready, writeToken])

  useEffect(() => {
    if (!ready) return
    write(STORAGE_KEYS.activityLog, activityLog)
    if (!writeToken || isFromPoll.current) return
    api.saveCollection('activityLog', activityLog, writeToken).then((ok) => {
      setSyncStatus(ok ? 'synced' : 'local-only')
    })
  }, [activityLog, ready, writeToken])

  useEffect(() => {
    if (!ready) return
    write(STORAGE_KEYS.appeals, appeals)
    if (!writeToken || isFromPoll.current) return
    api.saveCollection('appeals', appeals, writeToken).then((ok) => {
      setSyncStatus(ok ? 'synced' : 'local-only')
    })
  }, [appeals, ready, writeToken])

  useEffect(() => {
    if (!ready) return
    write(STORAGE_KEYS.penalties, penalties)
    if (!writeToken || isFromPoll.current) return
    api.saveCollection('penalties', penalties, writeToken).then((ok) => {
      setSyncStatus(ok ? 'synced' : 'local-only')
    })
  }, [penalties, ready, writeToken])

  useEffect(() => {
    if (!ready) return
    write(STORAGE_KEYS.lockedWeeks, lockedWeeks)
    if (!adminToken || isFromPoll.current) return
    setSyncStatus('saving')
    api.saveCollection('lockedWeeks', lockedWeeks, adminToken).then((ok) => {
      setSyncStatus(ok ? 'synced' : 'local-only')
    })
  }, [lockedWeeks, ready, adminToken])

  const notify = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3200)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const login = useCallback((user) => {
    setSession(user)
    write(STORAGE_KEYS.session, user)
  }, [])

  const logout = useCallback(() => {
    setSession(null)
    clear(STORAGE_KEYS.session)
  }, [])

  const isAdmin = Boolean(session && session.role === 'admin')

  const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const meKey = isAdmin ? 'admin' : session && session.id ? `u-${session.id}` : null

  const meActor = useCallback(() => {
    if (!session) return null
    return isAdmin
      ? { id: 'admin', name: session.name || 'Giáo viên chủ nhiệm', role: 'admin' }
      : { id: session.id, name: session.name, role: session.roleLabel || 'Học sinh' }
  }, [session, isAdmin])

  const pushActivity = useCallback(
    (action, detail) => {
      const actor = meActor()
      if (!actor) return
      setActivityLog((p) => [{ id: `act-${uid()}`, actor, action, detail, createdAt: new Date().toISOString() }, ...p].slice(0, 600))
    },
    [meActor],
  )

  const deleteActivity = useCallback(
    (id) => {
      const prev = activityLog.find((a) => a.id === id)
      setActivityLog((p) => p.filter((a) => a.id !== id))
      pushActivity('activity', `Xóa 1 bản ghi nhật ký${prev && prev.detail ? `: "${String(prev.detail).slice(0, 60)}"` : ''}`)
    },
    [activityLog, pushActivity],
  )

  const clearActivityLog = useCallback(() => {
    setActivityLog([])
    pushActivity('activity', 'Xóa toàn bộ lịch sử hoạt động')
  }, [pushActivity])

  const pushNotification = useCallback(({ roles = [], userIds = [], text, kind = 'info' }) => {
    setNotifications((p) => [
      { id: `nt-${uid()}`, roles, userIds: userIds.map((u) => `u-${u}`), text, kind, createdAt: new Date().toISOString(), readBy: [] },
      ...p,
    ].slice(0, 400))
  }, [])

  const markNotificationsRead = useCallback(() => {
    if (!meKey) return
    setNotifications((p) => p.map((n) => (n.readBy || []).includes(meKey) ? n : { ...n, readBy: [...(n.readBy || []), meKey] }))
  }, [meKey])

  const addComment = useCallback(
    (subId, text) => {
      const author = meActor()
      if (!author || !text.trim()) return
      const comment = { id: `c-${uid()}`, author: { id: author.id, name: author.name, role: author.role }, text: text.trim(), createdAt: new Date().toISOString() }
      setSubmissions((p) => p.map((x) => (x.id === subId ? { ...x, comments: [...(x.comments || []), comment] } : x)))
      const target = submissions.find((x) => x.id === subId)
      if (target) {
        pushActivity('comment', `${author.name} bình luận phiếu "${(target.week ? weekLabel(target.week) : '') || 'không tuần'}"`)
        if (target.createdBy && target.createdBy.id !== author.id) {
          pushNotification({
            userIds: [target.createdBy.id],
            text: `${author.name} đã bình luận trong phiếu của bạn: "${text.trim().slice(0, 80)}"`,
            kind: 'comment',
          })
        }
      }
    },
    [meActor, submissions, pushActivity, pushNotification],
  )

  const addAppeal = useCallback(
    (obj) => {
      const a = { id: `ap-${uid()}`, ...obj, status: 'pending', createdAt: new Date().toISOString() }
      setAppeals((p) => [a, ...p])
      pushNotification({ roles: ['admin'], text: `Học sinh ${obj.studentName || ''} khiếu nại vi phạm "${obj.ruleName || ''}".`, kind: 'appeal' })
      pushActivity('appeal', `${obj.studentName || 'Học sinh'} khiếu nại vi phạm "${obj.ruleName || ''}"`)
    },
    [pushActivity, pushNotification],
  )

  const resolveAppeal = useCallback(
    (id, { status, note, violationId }) => {
      const actor = meActor()
      setAppeals((p) =>
        p.map((x) =>
          x.id === id ? { ...x, status, adminNote: note || '', resolvedBy: actor ? actor.name : '', resolvedAt: new Date().toISOString() } : x,
        ),
      )
      if (status === 'removed' && violationId) {
        setViolations((p) => p.filter((v) => v.id !== violationId))
      }
      const ap = appeals.find((x) => x.id === id)
      if (ap && ap.studentId) {
        pushNotification({
          userIds: [ap.studentId],
          text:
            status === 'removed'
              ? 'Khiếu nại của bạn đã được chấp nhận - vi phạm đã bị xóa khỏi danh sách.'
              : 'Khiếu nại của bạn đã được xem xét và vi phạm được giữ nguyên.',
          kind: status === 'removed' ? 'success' : 'error',
        })
      }
      pushActivity('appeal', status === 'removed' ? `Chấp nhận khiếu nại của ${ap && ap.studentName}` : `Bác khiếu nại của ${ap && ap.studentName}`)
    },
    [meActor, appeals, pushActivity, pushNotification],
  )

  const setPenalty = useCallback(
    (entry) => {
      const actor = meActor()
      const now = new Date().toISOString()
      const wk = `${entry.year}-W${entry.week}`
      const isManual = Boolean(entry.manual)
      setPenalties((p) => {
        const idx = p.findIndex(
          (x) => Boolean(x.manual) === isManual && x.studentId === entry.studentId && x.year === entry.year && x.week === entry.week,
        )
        const rec = {
          id: idx >= 0 ? p[idx].id : `pen-${entry.studentId}-${entry.year}-W${entry.week}${isManual ? `-m${Date.now().toString(36)}` : ''}`,
          studentId: entry.studentId,
          year: entry.year,
          week: entry.week,
          manual: isManual,
          form: isManual ? (entry.form === 'labor' ? 'labor' : 'duty') : null,
          days: isManual ? Math.max(1, Number(entry.days) || 1) : null,
          laborDays: entry.laborDays != null ? Number(entry.laborDays) : null,
          dutyDone: Boolean(entry.dutyDone),
          laborDone: Boolean(entry.laborDone),
          note: entry.note || '',
          updatedBy: actor ? actor.name : '',
          updatedAt: now,
        }
        if (idx >= 0) {
          const next = [...p]
          next[idx] = rec
          return next
        }
        return [...p, rec]
      })
      pushActivity(
        'penalty',
        isManual
          ? `Gán phạt ${entry.form === 'labor' ? 'đi lao động' : 'trực nhật'} ${Math.max(1, Number(entry.days) || 1)} ngày (${wk})${entry.note ? ` - ${entry.note}` : ''}`
          : `Cập nhật trực nhật/lao động (${wk})`,
      )
    },
    [meActor, pushActivity],
  )

  const deletePenalty = useCallback(
    (id) => {
      const prev = penalties.find((x) => x.id === id)
      setPenalties((p) => p.filter((x) => x.id !== id))
      if (prev) {
        const stu = students.find((s) => s.id === prev.studentId)
        pushActivity(
          'penalty',
          `Hủy phạt ${prev.form === 'labor' ? 'đi lao động' : 'trực nhật'} cho ${stu ? stu.name : prev.studentId} (${prev.year}-W${prev.week})`,
        )
      }
    },
    [penalties, students, pushActivity],
  )

  const addStudent = useCallback(
    (student) => {
      setStudents((p) => [...p, student])
      pushActivity('student', `Thêm học sinh ${student.name} (${student.code || ''})`)
    },
    [pushActivity],
  )
  const updateStudent = useCallback(
    (id, patch) => {
      const prev = students.find((s) => s.id === id)
      setStudents((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)))
      pushActivity('student', `Cập nhật học sinh ${prev ? prev.name : id}`)
    },
    [students, pushActivity],
  )
  const deleteStudent = useCallback(
    (id) => {
      const prev = students.find((s) => s.id === id)
      setStudents((p) => p.filter((s) => s.id !== id))
      setViolations((p) => p.filter((v) => v.studentId !== id))
      pushActivity('student', `Xóa học sinh ${prev ? prev.name : id}`)
    },
    [students, pushActivity],
  )
  const moveStudent = useCallback(
    (id, group) => {
      const prev = students.find((s) => s.id === id)
      setStudents((p) => p.map((s) => (s.id === id ? { ...s, group } : s)))
      pushActivity('student', `Chuyển ${prev ? prev.name : id} sang Tổ ${group}`)
    },
    [students, pushActivity],
  )
  const importStudents = useCallback(
    (list) => {
      setStudents((p) => [...p, ...list])
      if (list && list.length) pushActivity('student', `Nhập ${list.length} học sinh mới`)
    },
    [pushActivity],
  )

  const rebalanceGroups = useCallback(() => {
    setStudents((p) => {
      const target = Math.ceil(p.length / 4)
      const buckets = [[], [], [], []]
      const leftover = []
      p.forEach((s) => {
        const gi = Math.min(Math.max((s.group || 1) - 1, 0), 3)
        if (buckets[gi].length < target) buckets[gi].push(s)
        else leftover.push({ ...s })
      })
      let gi = 0
      leftover.forEach((s) => {
        while (buckets[gi].length >= target) gi = (gi + 1) % 4
        buckets[gi].push(s)
      })
      return buckets.flatMap((bucket, idx) => bucket.map((s) => ({ ...s, group: idx + 1 })))
    })
    pushActivity('student', 'Cân bằng số học sinh giữa các tổ')
  }, [pushActivity])

  // Tự xếp lại 4 tổ cho ĐỒNG ĐỀU theo lực học: mỗi nhóm Giỏi/Khá/TB/Yếu được rải đều
  // vào các tổ; học sinh chưa xác định lực học (--) cũng được rải đều; Tổ trưởng đi theo tổ mới.
  const rebalanceByAcademic = useCallback(() => {
    setStudents((p) => {
      const buckets = { 0: [], 1: [], 2: [], 3: [], 4: [] }
      p.forEach((s) => {
        const key = ACADEMIC_LEVELS.includes(s.academic) ? ACADEMIC_ORDER[s.academic] : 4
        buckets[key].push(s)
      })
      const result = [[], [], [], []]
      let offset = 0
      Object.keys(buckets)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((key) => {
          const list = buckets[key]
          for (let i = 0; i < list.length; i += 1) {
            result[(i + offset) % 4].push(list[i])
          }
          offset += 1
        })
      return result.flatMap((bucket, idx) =>
        bucket.map((s) => ({
          ...s,
          group: idx + 1,
          manageGroup: s.role === 'Tổ trưởng' ? idx + 1 : s.manageGroup,
        })),
      )
    })
    pushActivity('student', 'Tự xếp lại tổ đồng đều theo lực học')
  }, [pushActivity])

  const randomAssign = useCallback(() => {
    setStudents((p) => {
      const arr = [...p].sort(() => Math.random() - 0.5)
      return arr.map((s, i) => ({ ...s, group: (i % 4) + 1 }))
    })
    pushActivity('student', 'Xếp lại tổ ngẫu nhiên')
  }, [pushActivity])

  const addRule = useCallback(
    (rule) => {
      setRules((p) => [...p, rule])
      pushActivity('rule', `Thêm quy định "${rule.name}" (${rule.points}đ)`)
    },
    [pushActivity],
  )
  const updateRule = useCallback(
    (id, patch) => {
      const prev = rules.find((r) => r.id === id)
      setRules((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)))
      pushActivity('rule', `Cập nhật quy định "${prev ? prev.name : id}"`)
    },
    [rules, pushActivity],
  )
  const deleteRule = useCallback(
    (id) => {
      const prev = rules.find((r) => r.id === id)
      setRules((p) => p.filter((r) => r.id !== id))
      setViolations((p) => p.filter((v) => v.ruleId !== id))
      pushActivity('rule', `Xóa quy định "${prev ? prev.name : id}"`)
    },
    [rules, pushActivity],
  )

  const addViolation = useCallback(
    (v) => {
      setViolations((p) => [v, ...p])
      const rule = rules.find((r) => r.id === v.ruleId)
      const stu = students.find((s) => s.id === v.studentId)
      pushActivity('violation', `Ghi nhận vi phạm "${rule ? rule.name : ''}" cho ${stu ? stu.name : ''}`)
    },
    [rules, students, pushActivity],
  )
  const updateViolation = useCallback(
    (id, patch) => {
      setViolations((p) => p.map((v) => (v.id === id ? { ...v, ...patch } : v)))
      pushActivity('violation', `Cập nhật vi phạm ${id}`)
    },
    [pushActivity],
  )
  const deleteViolation = useCallback(
    (id) => {
      const prev = violations.find((v) => v.id === id)
      setViolations((p) => p.filter((v) => v.id !== id))
      pushActivity('violation', `Xóa vi phạm ${id}${prev && prev.date ? ` ngày ${prev.date}` : ''}`)
    },
    [violations, pushActivity],
  )

  const addSubmission = useCallback(
    (s) => {
      setSubmissions((p) => [s, ...p])
      const status = s && s.status
      const byName = (s && s.createdBy && s.createdBy.name) || ''
      const wk = s && s.week ? weekLabel(s.week) : ''
      if (status === 'pendingLeader') {
        pushActivity('submission', `${byName} gửi phiếu ${wk} lên lớp trưởng`)
        pushNotification({ roles: ['Lớp trưởng'], text: `${byName} vừa gửi phiếu tổng hợp (${wk}) - chờ bạn chốt.`, kind: 'submission' })
      } else if (status === 'pendingAdmin') {
        pushActivity('submission', `${byName} chốt phiếu ${wk}, gửi lên giáo viên`)
        pushNotification({ roles: ['admin'], text: `${byName} vừa chốt phiếu tổng hợp (${wk}) - chờ giáo viên duyệt.`, kind: 'submission' })
      } else {
        pushActivity('submission', `${byName} tạo phiếu nháp ${wk}`)
      }
    },
    [pushActivity, pushNotification],
  )
  const updateSubmission = useCallback(
    (id, patch) => {
      const prev = submissions.find((x) => x.id === id)
      const byName = (prev && prev.createdBy && prev.createdBy.name) || ''
      const wk = prev && prev.week ? weekLabel(prev.week) : ''
      setSubmissions((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      if (patch && patch.status) {
        if (patch.status === 'pendingLeader') {
          pushActivity('submission', `${byName} gửi phiếu ${wk} lên lớp trưởng`)
          pushNotification({ roles: ['Lớp trưởng'], text: `${byName} vừa gửi phiếu tổng hợp (${wk}) - chờ bạn chốt.`, kind: 'submission' })
        } else if (patch.status === 'pendingAdmin') {
          pushActivity('submission', `${byName} chốt phiếu ${wk}, gửi lên giáo viên`)
          pushNotification({ roles: ['admin'], text: `${byName} vừa chốt phiếu tổng hợp (${wk}) - chờ giáo viên duyệt.`, kind: 'submission' })
        } else if (patch.status === 'rejected') {
          pushActivity('submission', `Trả về phiếu ${wk} cho ${byName}`)
          if (prev && prev.createdBy && prev.createdBy.id) {
            pushNotification({
              userIds: [prev.createdBy.id],
              text: `Phiếu tổng hợp (${wk}) của bạn bị trả về${patch.rejectedReason ? `: ${patch.rejectedReason}` : ''}. Hãy sửa và gửi lại.`,
              kind: 'error',
            })
          }
        } else {
          pushActivity('submission', `Cập nhật phiếu ${wk}`)
        }
      }
    },
    [submissions, pushActivity, pushNotification],
  )
  const deleteSubmission = useCallback(
    (id) => {
      const prev = submissions.find((x) => x.id === id)
      setSubmissions((p) => p.filter((x) => x.id !== id))
      if (prev) pushActivity('submission', `Xóa phiếu ${prev.week ? weekLabel(prev.week) : ''}`)
    },
    [submissions, pushActivity],
  )

  const approveSubmission = useCallback(
    (sub, approvedBy) => {
      const now = new Date().toISOString()
      const lines = (sub.lines || []).filter((l) => l && l.studentId && l.ruleId)
      setSubmissions((p) =>
        p.map((x) => (x.id === sub.id ? { ...x, status: 'approved', approvedAt: now, approvedBy: approvedBy || '' } : x)),
      )
      if (lines.length) {
        const next = lines.map((l) => ({
          id: `v-${sub.id}-${l.id}`,
          studentId: l.studentId,
          ruleId: l.ruleId,
          date: l.date,
          note: l.note || '',
          status: 'approved',
          by: (sub.createdBy && sub.createdBy.name) || 'Học sinh',
          byId: (sub.createdBy && sub.createdBy.id) || null,
          byRole: (sub.createdBy && sub.createdBy.role) || 'Học sinh',
          submissionId: sub.id,
          approvedAt: now,
          approvedBy: approvedBy || '',
        }))
        setViolations((p) => (p ? [...next, ...p] : next))
      }
      const wk = sub && sub.week ? weekLabel(sub.week) : ''
      pushActivity('approve', `Duyệt phiếu ${wk} - ${lines.length} dòng vào bảng điểm`)
      if (sub && sub.createdBy && sub.createdBy.id) {
        pushNotification({
          userIds: [sub.createdBy.id],
          text: `Phiếu tổng hợp (${wk}) của bạn đã được duyệt - ${lines.length} dòng đã tính điểm.`,
          kind: 'success',
        })
      }
    },
    [pushActivity, pushNotification],
  )

  const lockWeek = useCallback(
    (year, week) => {
      setLockedWeeks((p) => {
        if (p.some((l) => l.year === year && l.week === week)) return p
        return [...p, { id: `lw-${year}-${week}`, year, week, label: weekLabel({ year, week }), lockedAt: new Date().toISOString() }]
      })
      pushActivity('week', `Chốt ${weekLabel({ year, week })} làm bằng chứng`)
    },
    [pushActivity],
  )

  const unlockWeek = useCallback(
    (year, week) => {
      setLockedWeeks((p) => p.filter((l) => !(l.year === year && l.week === week)))
      pushActivity('week', `Mở khóa ${weekLabel({ year, week })}`)
    },
    [pushActivity],
  )

  const isWeekLocked = useCallback(
    (info) => {
      if (!info) return false
      return lockedWeeks.some((l) => l.year === info.year && l.week === info.week)
    },
    [lockedWeeks],
  )

  const resetDemo = useCallback(() => {
    api
      .resetData(adminToken)
      .catch((e) => console.warn('Khôi phục dữ liệu từ xa thất bại:', e))
      .then(() => {
        Object.keys(STORAGE_KEYS).forEach((k) => clear(STORAGE_KEYS[k]))
        window.location.reload()
      })
  }, [adminToken])

  const value = {
    students,
    rules,
    violations,
    submissions,
    lockedWeeks,
    notifications,
    activityLog,
    appeals,
    penalties,
    meKey,
    session,
    isAdmin,
    ready,
    toasts,
    syncStatus,
    notify,
    dismissToast,
    login,
    logout,
    resetDemo,
    lockWeek,
    unlockWeek,
    isWeekLocked,
    addStudent,
    updateStudent,
    deleteStudent,
    moveStudent,
    importStudents,
    rebalanceGroups,
    rebalanceByAcademic,
    randomAssign,
    addRule,
    updateRule,
    deleteRule,
    addViolation,
    updateViolation,
    deleteViolation,
    addSubmission,
    updateSubmission,
    deleteSubmission,
    approveSubmission,
    pushNotification,
    markNotificationsRead,
    addComment,
    addAppeal,
    resolveAppeal,
    setPenalty,
    deletePenalty,
    deleteActivity,
    clearActivityLog,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp phải được dùng bên trong AppProvider')
  return ctx
}