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
    cells[s.id] = { violations: 0, deducted: 0 }
    weekMap[s.id] = new Map()
  })
  violations.forEach((v) => {
    if (!v || !cells[v.studentId]) return
    if (!scoresIn(v)) return
    if (!matchesPeriod(v.date, period)) return
    cells[v.studentId].violations += 1
    const pts = ruleMap[v.ruleId]?.points || 0
    cells[v.studentId].deducted += pts
    if (period.type === 'month' && v.date) {
      const info = isoWeekInfo(v.date)
      if (info) {
        const wk = `${info.year}-W${info.week}`
        weekMap[v.studentId].set(wk, (weekMap[v.studentId].get(wk) || 0) + pts)
      }
    }
  })
  const monthWeeks = period.type === 'month' ? weeksInMonth(period.year, period.month) : []
  const rows = students
    .map((s) => {
      const c = cells[s.id]
      let score
      if (period.type === 'month') {
        let sum = 0
        monthWeeks.forEach((w) => {
          sum += Math.max(0, BASE_SCORE - (weekMap[s.id].get(`${w.year}-W${w.week}`) || 0))
        })
        score = monthWeeks.length ? Math.round((sum / monthWeeks.length) * 10) / 10 : BASE_SCORE
      } else {
        score = Math.max(0, BASE_SCORE - c.deducted)
      }
      return { student: s, violations: c.violations, deducted: c.deducted, score }
    })
    .sort((a, b) => a.score - b.score)
  const n = rows.length
  rows.forEach((r, i) => {
    r.rank = n - i
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
    out.push({ year: info.year, week: info.week, label: `T${info.week}`, count })
  }
  return out
}