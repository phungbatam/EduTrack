export const BASE_SCORE = 100

export const GROUP_NAMES = { 1: 'Tổ 1', 2: 'Tổ 2', 3: 'Tổ 3', 4: 'Tổ 4' }
export const GROUP_COLORS = { 1: '#6366f1', 2: '#10b981', 3: '#f59e0b', 4: '#ef4444' }

export const LEADER_ROLES = [
  'Lớp trưởng',
  'Lớp phó học tập',
  'Lớp phó lao động',
  'Lớp phó văn thể mỹ',
  'Tổ trưởng',
]

export function isLeaderRole(roleLabel) {
  return LEADER_ROLES.includes(roleLabel)
}

export function leaderScope(roleLabel, manageGroup, ownGroup) {
  if (!isLeaderRole(roleLabel)) return null
  if (roleLabel === 'Tổ trưởng') return { type: 'group', group: manageGroup || ownGroup || 0 }
  return { type: 'all' }
}

export function scopeLabel(scope) {
  if (!scope) return ''
  if (scope.type === 'group') return GROUP_NAMES[scope.group] || `Tổ ${scope.group}`
  return 'Cả lớp'
}

export const CLASS_LEADER_ROLES = ['Lớp trưởng', 'Lớp phó học tập', 'Lớp phó lao động', 'Lớp phó văn thể mỹ']

export function isClassLeaderRole(roleLabel) {
  return CLASS_LEADER_ROLES.includes(roleLabel)
}

export const VIOLATION_STATUS = {
  draft: { label: 'Chờ gửi', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  pendingClass: { label: 'Chờ lớp trưởng duyệt', cls: 'bg-sky-50 text-sky-600 border-sky-200' },
  pendingAdmin: { label: 'Chờ giáo viên duyệt', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  approved: { label: 'Đã duyệt', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  rejected: { label: 'Từ chối', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
}

export const VIOLATION_STATUS_ORDER = ['draft', 'pendingClass', 'pendingAdmin', 'approved', 'rejected']

export const SUBMISSION_STATUS = {
  draft: { label: 'Đang soạn', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  pendingLeader: { label: 'Chờ lớp trưởng chốt', cls: 'bg-sky-50 text-sky-600 border-sky-200' },
  pendingAdmin: { label: 'Chờ giáo viên duyệt', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  approved: { label: 'Đã duyệt', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  rejected: { label: 'Trả về', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
}

export const SUBMISSION_STATUS_ORDER = ['draft', 'pendingLeader', 'pendingAdmin', 'approved', 'rejected']

export function submissionStatusOf(s) {
  const st = s && s.status
  return st && SUBMISSION_STATUS[st] ? st : 'draft'
}

// Tổ trưởng / lớp phó gom phiếu gửi LỚP TRƯỞNG chốt; Lớp trưởng gửi thẳng trang quản trị.
export function submissionTargetFor(roleLabel) {
  return roleLabel === 'Lớp trưởng' ? 'pendingAdmin' : 'pendingLeader'
}

export function submissionDelta(lines, ruleMap) {
  return (lines || []).reduce((sum, l) => {
    if (!l || !l.ruleId) return sum
    return sum + ruleDelta(ruleMap && ruleMap[l.ruleId])
  }, 0)
}

export function weekKeyOf(info) {
  return info ? `${info.year}-W${info.week}` : ''
}

export function submissionWeekKey(s) {
  return s && s.week ? weekKeyOf(s.week) : ''
}

export function statusOf(v) {
  const s = v && v.status
  return s && VIOLATION_STATUS[s] ? s : 'approved'
}

export function scoresIn(v) {
  const s = statusOf(v)
  return s !== 'draft' && s !== 'rejected'
}

export function submitTargetFor(roleLabel) {
  return isClassLeaderRole(roleLabel) ? 'pendingAdmin' : 'pendingClass'
}

export const CONDUCT_LEVELS = [
  { label: 'Tốt', min: 90, cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { label: 'Khá', min: 80, cls: 'bg-sky-50 text-sky-600 border-sky-200' },
  { label: 'Đạt', min: 70, cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  { label: 'Chưa đạt', min: 40, cls: 'bg-rose-50 text-rose-600 border-rose-200' },
]

export function conductOf(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return { label: '—', cls: 'bg-slate-50 text-slate-500 border-slate-200' }
  return CONDUCT_LEVELS.find((l) => n >= l.min) || CONDUCT_LEVELS[CONDUCT_LEVELS.length - 1]
}

// Lực học (học lực) - dùng để phân tổ đồng đều; chưa xác định -> '--'
export const ACADEMIC_LEVELS = ['Giỏi', 'Khá', 'Trung bình', 'Yếu']
export const ACADEMIC_ORDER = { 'Giỏi': 0, 'Khá': 1, 'Trung bình': 2, 'Yếu': 3 }
export const ACADEMIC_CLS = {
  'Giỏi': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  'Khá': 'bg-sky-50 text-sky-600 border-sky-200',
  'Trung bình': 'bg-amber-50 text-amber-600 border-amber-200',
  'Yếu': 'bg-rose-50 text-rose-600 border-rose-200',
  '--': 'bg-slate-50 text-slate-400 border-slate-200',
}

export function academicLabel(student) {
  const v = student && student.academic
  return ACADEMIC_LEVELS.includes(v) ? v : '--'
}

export function academicCls(label) {
  return ACADEMIC_CLS[label] || ACADEMIC_CLS['--']
}

export function isBonus(rule) {
  return !!(rule && rule.kind === 'bonus')
}

export function ruleDelta(rule) {
  const p = rule && Number(rule.points) ? Number(rule.points) : 0
  return isBonus(rule) ? p : -p
}

export function ruleLabel(rule) {
  const p = rule && Number(rule.points) ? Number(rule.points) : 0
  return `${isBonus(rule) ? '+' : '-'}${p}đ`
}

// ---- Hình thức phạt: Trực nhật / Đi lao động ----
// Quy tắc:
//  - Số lần vi phạm để tính ngày phạt ĐẾM TRONG TUẦN (tuần mới reset lại từ 1).
//  - Lỗi có hình thức phạt (trực nhật/lao động): ngày = lần đầu × hệ số^(số lần trong tuần − 1) → 1, 2, 4, 8...
//  - Nếu tổng điểm vi phạm TRONG TUẦN của học sinh ≥ 15 → phạt ĐI LAO ĐỘNG 1 ngày (thay cho trực nhật).
export const PENALTY_FORMS = {
  duty: { label: 'Trực nhật', cls: 'bg-sky-50 text-sky-600 border-sky-200' },
  labor: { label: 'Đi lao động', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
}

// Tổng điểm vi phạm trong tuần đạt ngưỡng này → phạt đi lao động
export const PENALTY_LABOR_POINTS = 15

function sameWeekInfo(a, b) {
  if (!a || !b) return false
  return a.year === b.year && a.week === b.week
}

// Hình thức phạt mà quy định này áp dụng (chỉ lỗi trừ điểm): 'duty' | 'labor' | null
export function penaltyFormOf(rule) {
  if (!rule || isBonus(rule)) return null
  const p = rule.penaltyForm
  return p && PENALTY_FORMS[p] ? p : null
}

// Số ngày phạt cho lần vi phạm thứ n (1-based) của cùng một quy định trong tuần.
// Mặc định: lần đầu 1 ngày, nhân ×2 mỗi lần => 1, 2, 4, 8...
export function penaltyDaysFor(rule, n) {
  if (!penaltyFormOf(rule)) return 0
  const base = Math.max(1, Number(rule.chargeBase) || 1)
  const ratio = Math.max(1, Number(rule.chargeRatio) || 2)
  return Math.max(1, Math.round(base * Math.pow(ratio, Math.max(0, n - 1))))
}

// Số lần (1-based) của một vi phạm trong nhóm cùng học sinh + cùng quy định + CÙNG TUẦN
// (chỉ tính vi phạm CÓ ĐIỂM - đã duyệt/chờ duyệt, bỏ nháp/từ chối). Tuần mới sẽ reset về 1.
export function violationRepeat(violations, v) {
  if (!v || !v.studentId || !v.ruleId) return 1
  const vWeek = v.date ? isoWeekInfo(v.date) : null
  const group = violations
    .filter(
      (x) =>
        x &&
        scoresIn(x) &&
        x.studentId === v.studentId &&
        x.ruleId === v.ruleId &&
        (vWeek ? sameWeekInfo(isoWeekInfo(x.date), vWeek) : true),
    )
    .sort(
      (a, b) =>
        (a.date || '').localeCompare(b.date || '') ||
        (a.createdAt || '').localeCompare(b.createdAt || '') ||
        (a.id || '').localeCompare(b.id || ''),
    )
  const idx = group.findIndex((x) => x.id === v.id)
  return idx >= 0 ? idx + 1 : group.length + 1
}

// Số lần kế tiếp (1-based) khi ghi 1 vi phạm MỚI cho học sinh + quy định này (trong tuần chỉ định).
export function nextRepeatRank(violations, studentId, ruleId, week) {
  return (
    violations.filter(
      (x) =>
        x &&
        scoresIn(x) &&
        x.studentId === studentId &&
        x.ruleId === ruleId &&
        (week ? sameWeekInfo(isoWeekInfo(x.date), week) : true),
    ).length + 1
  )
}

// Tổng điểm vi phạm (đã duyệt/chờ duyệt) của 1 học sinh trong 1 tuần.
export function studentWeekPoints(violations, studentId, week, ruleMap) {
  if (!week) return 0
  return violations.reduce((s, v) => {
    if (!v || !scoresIn(v) || v.studentId !== studentId) return s
    if (!sameWeekInfo(isoWeekInfo(v.date), week)) return s
    const rule = ruleMap && v.ruleId ? ruleMap[v.ruleId] : null
    if (!rule || isBonus(rule)) return s
    return s + (Number(rule.points) || 0)
  }, 0)
}

// Tổng số ngày trực nhật của 1 học sinh trong 1 tuần (cộng dồn các lỗi có hình thức trực nhật, theo số lần trong tuần).
export function studentWeekDutyDays(violations, studentId, week, ruleMap) {
  const weekVs = violations.filter(
    (v) => v && scoresIn(v) && v.studentId === studentId && sameWeekInfo(isoWeekInfo(v.date), week),
  )
  let total = 0
  weekVs.forEach((v) => {
    const rule = ruleMap && v.ruleId ? ruleMap[v.ruleId] : null
    if (penaltyFormOf(rule) !== 'duty') return
    total += penaltyDaysFor(rule, violationRepeat(violations, v))
  })
  return total
}

// Kết luận hình phạt của 1 học sinh cho 1 tuần dựa trên tổng điểm vi phạm:
//  - points ≥ 15 → lao động 1 ngày
//  - points 1–14 + có lỗi trực nhật → trực nhật (số ngày cộng dồn theo cấp số nhân)
//  - còn lại → không phạt
export function studentWeekSanction(violations, studentId, week, ruleMap) {
  const points = studentWeekPoints(violations, studentId, week, ruleMap)
  if (points <= 0) return { type: 'none', points, dutyDays: 0, laborDays: 0 }
  if (points >= PENALTY_LABOR_POINTS) return { type: 'labor', points, dutyDays: 0, laborDays: 1 }
  const dutyDays = studentWeekDutyDays(violations, studentId, week, ruleMap)
  if (dutyDays < 1) return { type: 'none', points, dutyDays: 0, laborDays: 0 }
  return { type: 'duty', points, dutyDays, laborDays: 0 }
}

// Thông tin hình phạt của một vi phạm (dùng mảng đầy đủ các vi phạm để tính số lần trong tuần).
// Nếu tuần của vi phạm bị chuyển sang lao động (đủ 15 điểm) thì gán nhãn lao động.
export function violationPenaltyInfo(violations, v, ruleMap) {
  if (!v || !v.studentId) return null
  const rule = ruleMap && v.ruleId ? ruleMap[v.ruleId] : null
  const form = penaltyFormOf(rule)
  if (!form) return null
  const week = v.date ? isoWeekInfo(v.date) : null
  if (week) {
    const s = studentWeekSanction(violations, v.studentId, week, ruleMap)
    if (s.type === 'labor') return { form: 'labor', rank: 0, days: s.laborDays, week: true }
  }
  const n = violationRepeat(violations, v)
  return { form, rank: n, days: penaltyDaysFor(rule, n), week: false }
}

// Tổng ngày trực nhật / lao động của một tập vi phạm (target), gộp theo (học sinh, tuần)
// dựa trên toàn bộ vi phạm (all) để tính đúng theo tuần.
export function penaltyTotals(all, target, ruleMap) {
  const t = { duty: 0, labor: 0, dutyCount: 0, laborCount: 0 }
  const seen = new Set()
  ;(target || []).forEach((v) => {
    if (!v || !scoresIn(v) || !v.date || !v.studentId) return
    const week = isoWeekInfo(v.date)
    if (!week) return
    const key = `${v.studentId}|${week.year}-W${week.week}`
    if (seen.has(key)) return
    seen.add(key)
    const s = studentWeekSanction(all, v.studentId, week, ruleMap)
    if (s.type === 'duty') {
      t.duty += s.dutyDays
      t.dutyCount += 1
    } else if (s.type === 'labor') {
      t.labor += s.laborDays
      t.laborCount += 1
    }
  })
  return t
}

export function monthKey(y, m) {
  return `${y}-${String(m).padStart(2, '0')}`
}

export function availableMonths(violations) {
  const set = new Set()
  violations.forEach((v) => {
    if (v && v.date) set.add(v.date.slice(0, 7))
  })
  const cur = currentMonth()
  set.add(monthKey(cur.year, cur.month))
  return [...set].sort((a, b) => b.localeCompare(a))
}

export function weeksInMonth(year, month) {
  const days = new Date(year, month, 0).getDate()
  const seen = new Map()
  for (let d = 1; d <= days; d += 1) {
    const info = getWeekInfo(new Date(year, month - 1, d))
    const key = `${info.year}-W${info.week}`
    if (!seen.has(key)) seen.set(key, info)
  }
  return [...seen.values()].sort((a, b) => a.week - b.week)
}

export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function formatDate(iso) {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

const WEEKDAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

export function weekdayName(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return ''
  return WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()]
}

export function violationDateLabel(iso) {
  if (!iso) return '—'
  const wd = weekdayName(iso)
  const dd = formatDate(iso)
  const i = isoWeekInfo(iso)
  if (!i) return `${wd}, ${dd}`
  return `${wd}, ${dd} · Tuần ${i.week}`
}

export function timeAgo(iso) {
  if (!iso) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const t = new Date(iso)
  t.setHours(0, 0, 0, 0)
  const diff = Math.round((today - t) / 86400000)
  if (diff <= 0) return 'Hôm nay'
  if (diff === 1) return 'Hôm qua'
  if (diff < 7) return `${diff} ngày trước`
  return formatDate(iso)
}

export function daysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISODate(d)
}

// Năm học bắt đầu Thứ Hai 07/09/2026 = Tuần 1, tuần tiếp theo mỗi 7 ngày.
const SCHOOL_YEAR_START_MS = Date.UTC(2026, 8, 7)
const ONE_DAY = 86400000
const ONE_WEEK = 7 * ONE_DAY

export function getWeekInfo(date) {
  const t = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((t - SCHOOL_YEAR_START_MS) / ONE_DAY)
  const weekNo = diff < 0 ? 1 : Math.floor(diff / 7) + 1
  return { year: 2026, week: weekNo }
}

export function weekStartISO(info) {
  if (!info || !info.week) return ''
  const d = new Date(SCHOOL_YEAR_START_MS + (info.week - 1) * ONE_WEEK)
  return toISODate(d)
}

export function isoWeekInfo(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return getWeekInfo(new Date(y, m - 1, d))
}

export function weekLabel(info) {
  if (!info) return ''
  return `Tuần ${info.week} (${formatDate(weekStartISO(info))})`
}

export function monthLabel(m) {
  return `Tháng ${m.month}/${m.year}`
}

export function currentWeek() {
  return getWeekInfo(new Date())
}

export function currentMonth() {
  const n = new Date()
  return { year: n.getFullYear(), month: n.getMonth() + 1 }
}

export function currentPeriod() {
  return { type: 'week', ...currentWeek() }
}

export function matchesPeriod(dateStr, period) {
  if (!dateStr || !period || period.type === 'all') return true
  if (period.type === 'month') {
    const [y, m] = dateStr.split('-').map(Number)
    return y === period.year && m === period.month
  }
  const info = isoWeekInfo(dateStr)
  if (!info) return true
  return info.year === period.year && info.week === period.week
}

export function periodLabel(period) {
  if (!period) return ''
  if (period.type === 'month') return monthLabel(period)
  if (period.type === 'week') return weekLabel({ year: period.year, week: period.week })
  return 'Cả năm'
}

export function availableWeeks(violations) {
  const map = new Map()
  const key = (w) => `${w.year}-W${w.week}`
  violations.forEach((v) => {
    if (!v || !v.date) return
    const i = isoWeekInfo(v.date)
    if (i) map.set(key(i), i)
  })
  const cur = currentWeek()
  map.set(key(cur), cur)
  return [...map.values()].sort((a, b) => b.year - a.year || b.week - a.week)
}

export function buildStandings(students, rules, violations, period) {
  const ruleMap = Object.fromEntries(rules.map((r) => [r.id, r]))
  const cells = {}
  const weekMap = {}
  students.forEach((s) => {
    cells[s.id] = { violations: 0, bonuses: 0, deducted: 0, bonus: 0 }
    weekMap[s.id] = new Map()
  })
  violations.forEach((v) => {
    if (!v || !cells[v.studentId]) return
    if (!scoresIn(v)) return
    if (!matchesPeriod(v.date, period)) return
    const rule = ruleMap[v.ruleId]
    const pts = rule && Number(rule.points) ? Number(rule.points) : 0
    const delta = ruleDelta(rule)
    if (isBonus(rule)) {
      cells[v.studentId].bonuses += 1
      cells[v.studentId].bonus += pts
    } else {
      cells[v.studentId].violations += 1
      cells[v.studentId].deducted += pts
    }
    if ((period.type === 'month' || period.type === 'all') && v.date) {
      const info = isoWeekInfo(v.date)
      if (info) {
        const wk = `${info.year}-W${info.week}`
        weekMap[v.studentId].set(wk, (weekMap[v.studentId].get(wk) || 0) + delta)
      }
    }
  })
  const monthWeeks = period.type === 'month' ? weeksInMonth(period.year, period.month) : []
  const cw = period.type === 'all' ? currentWeek() : null
  const yearWeeks =
    period.type === 'all'
      ? Array.from({ length: Math.max(cw.week, 1) }, (_, i) => ({ year: cw.year, week: i + 1 }))
      : []
  const rows = students
    .map((s) => {
      const c = cells[s.id]
      let score
      if (period.type === 'month') {
        let sum = 0
        monthWeeks.forEach((w) => {
          sum += Math.max(0, BASE_SCORE + (weekMap[s.id].get(`${w.year}-W${w.week}`) || 0))
        })
        score = monthWeeks.length ? Math.round((sum / monthWeeks.length) * 10) / 10 : BASE_SCORE
      } else if (period.type === 'all') {
        // Điểm cả năm = trung bình cộng điểm của TẤT CẢ các tuần đã diễn ra của năm học
        // (Tuần 1 .. Tuần N hiện tại); mỗi tuần tính cả vi phạm (trừ) lẫn khen thưởng (cộng):
        //   Điểm tuần = max(0, 100 + tổng điểm cộng/trừ đã được duyệt trong tuần đó)
        let sum = 0
        yearWeeks.forEach((w) => {
          sum += Math.max(0, BASE_SCORE + (weekMap[s.id].get(`${w.year}-W${w.week}`) || 0))
        })
        score = yearWeeks.length ? Math.round((sum / yearWeeks.length) * 10) / 10 : BASE_SCORE
      } else {
        score = Math.max(0, BASE_SCORE - c.deducted + c.bonus)
      }
      return { student: s, violations: c.violations, bonuses: c.bonuses, deducted: c.deducted, bonus: c.bonus, score }
    })
    .sort((a, b) => b.score - a.score || a.violations - b.violations)
  rows.forEach((r, i) => {
    r.rank = i + 1
  })
  const groups = [1, 2, 3, 4]
    .map((g) => {
      const members = rows.filter((r) => r.student.group === g)
      const avg = members.length
        ? members.reduce((sum, r) => sum + r.score, 0) / members.length
        : 0
      return {
        group: g,
        avg: +avg.toFixed(1),
        members: members.length,
        totalViolations: members.reduce((sum, r) => sum + r.violations, 0),
      }
    })
    .sort((a, b) => b.avg - a.avg)
  groups.forEach((g, i) => {
    g.rank = i + 1
  })
  return { rows, groups }
}

export function ruleStats(violations, rules, period) {
  const ruleMap = Object.fromEntries(rules.map((r) => [r.id, r]))
  const acc = {}
  violations.forEach((v) => {
    if (!scoresIn(v)) return
    if (!matchesPeriod(v.date, period)) return
    const r = v && ruleMap[v.ruleId]
    if (!r) return
    if (!acc[r.id]) acc[r.id] = { rule: r, count: 0 }
    acc[r.id].count += 1
  })
  return Object.values(acc).sort((a, b) => b.count - a.count)
}

export function weeklyTrend(violations, n = 8) {
  const out = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setDate(d.getDate() - 7 * i)
    const info = getWeekInfo(d)
    const count = violations.filter(
      (v) => v && v.date && scoresIn(v) && matchesPeriod(v.date, { type: 'week', year: info.year, week: info.week }),
    ).length
    out.push({ year: info.year, week: info.week, label: `T${info.week}`, count, value: count })
  }
  return out
}