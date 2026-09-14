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
  session: 'et_session',
}

const DATA_VERSION = 4
const VERSION_KEY = 'et_data_version'

const DATA_KEYS = ['et_students', 'et_rules', 'et_violations', 'et_passwords', 'et_locked_weeks']

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
    ])
      .then(([s, r, v, m, l]) => {
        if (cancelled) return
        setStudents(Array.isArray(s) ? s : createSeedStudents())
        setRules(Array.isArray(r) ? r : createSeedRules())
        setViolations(Array.isArray(v) ? v : createSeedViolations())
        setSubmissions(Array.isArray(m) ? m : [])
        setLockedWeeks(Array.isArray(l) ? l : [])
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setStudents(read(STORAGE_KEYS.students, createSeedStudents))
        setRules(read(STORAGE_KEYS.rules, createSeedRules))
        setViolations(read(STORAGE_KEYS.violations, createSeedViolations))
        setSubmissions(read(STORAGE_KEYS.submissions, () => []))
        setLockedWeeks(read(STORAGE_KEYS.lockedWeeks, () => []))
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
    const keys = ['students', 'rules', 'violations', 'submissions', 'lockedWeeks']
    const setters = { students: setStudents, rules: setRules, violations: setViolations, submissions: setSubmissions, lockedWeeks: setLockedWeeks }

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
    if (!adminToken || isFromPoll.current) return
    setSyncStatus('saving')
    api.saveCollection('submissions', submissions, adminToken).then((ok) => {
      setSyncStatus(ok ? 'synced' : 'local-only')
    })
  }, [submissions, ready, adminToken])

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

  const addStudent = useCallback((student) => {
    setStudents((p) => [...p, student])
  }, [])
  const updateStudent = useCallback((id, patch) => {
    setStudents((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])
  const deleteStudent = useCallback((id) => {
    setStudents((p) => p.filter((s) => s.id !== id))
    setViolations((p) => p.filter((v) => v.studentId !== id))
  }, [])
  const moveStudent = useCallback((id, group) => {
    setStudents((p) => p.map((s) => (s.id === id ? { ...s, group } : s)))
  }, [])
  const importStudents = useCallback((list) => {
    setStudents((p) => [...p, ...list])
  }, [])

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
  }, [])

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
  }, [])

  const randomAssign = useCallback(() => {
    setStudents((p) => {
      const arr = [...p].sort(() => Math.random() - 0.5)
      return arr.map((s, i) => ({ ...s, group: (i % 4) + 1 }))
    })
  }, [])

  const addRule = useCallback((rule) => {
    setRules((p) => [...p, rule])
  }, [])
  const updateRule = useCallback((id, patch) => {
    setRules((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])
  const deleteRule = useCallback((id) => {
    setRules((p) => p.filter((r) => r.id !== id))
    setViolations((p) => p.filter((v) => v.ruleId !== id))
  }, [])

  const addViolation = useCallback((v) => {
    setViolations((p) => [v, ...p])
  }, [])
  const updateViolation = useCallback((id, patch) => {
    setViolations((p) => p.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  }, [])
  const deleteViolation = useCallback((id) => {
    setViolations((p) => p.filter((v) => v.id !== id))
  }, [])

  const addSubmission = useCallback((s) => {
    setSubmissions((p) => [s, ...p])
  }, [])
  const updateSubmission = useCallback((id, patch) => {
    setSubmissions((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }, [])
  const deleteSubmission = useCallback((id) => {
    setSubmissions((p) => p.filter((x) => x.id !== id))
  }, [])

  const approveSubmission = useCallback((sub, approvedBy) => {
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
  }, [])

  const lockWeek = useCallback((year, week) => {
    setLockedWeeks((p) => {
      if (p.some((l) => l.year === year && l.week === week)) return p
      return [...p, { id: `lw-${year}-${week}`, year, week, label: weekLabel({ year, week }), lockedAt: new Date().toISOString() }]
    })
  }, [])

  const unlockWeek = useCallback((year, week) => {
    setLockedWeeks((p) => p.filter((l) => !(l.year === year && l.week === week)))
  }, [])

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
        clear(STORAGE_KEYS.students)
        clear(STORAGE_KEYS.rules)
        clear(STORAGE_KEYS.violations)
        clear(STORAGE_KEYS.session)
        window.location.reload()
      })
  }, [adminToken])

  const value = {
    students,
    rules,
    violations,
    submissions,
    lockedWeeks,
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
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp phải được dùng bên trong AppProvider')
  return ctx
}