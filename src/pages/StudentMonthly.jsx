import { useMemo, useState } from 'react'
import { CalendarRange, Lock, Award, TrendingUp, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import {
  buildStandings,
  conductOf,
  currentMonth,
  availableMonths,
  weeksInMonth,
  monthLabel,
  monthKey,
  matchesPeriod,
  formatDate,
  weekStartISO,
  CONDUCT_LEVELS,
} from '../utils/helpers.js'

export default function StudentMonthly() {
  const { session, students, rules, violations, isWeekLocked } = useApp()
  const me = students.find((s) => s.id === session.id) || session
  const start = currentMonth()
  const [monthSel, setMonthSel] = useState(() => monthKey(start.year, start.month))

  const [year, month] = monthSel.split('-').map(Number)
  const period = { type: 'month', year, month }
  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])
  const months = useMemo(() => availableMonths(violations), [violations])
  const weeks = useMemo(() => weeksInMonth(year, month), [year, month])

  const { rows } = useMemo(
    () => buildStandings(students, rules, violations, period),
    [students, rules, violations, period],
  )
  const myRow = rows.find((r) => r.student.id === me.id)
  const conduct = conductOf(myRow ? myRow.score : 100)

  const conductDist = useMemo(() => {
    const acc = { 'Tốt': 0, 'Khá': 0, 'Đạt': 0, 'Chưa đạt': 0 }
    rows.forEach((r) => {
      const l = conductOf(r.score).label
      acc[l] = (acc[l] || 0) + 1
    })
    return acc
  }, [rows])

  const weekRows = useMemo(
    () =>
      weeks.map((w) => {
        const wp = { type: 'week', year: w.year, week: w.week }
        const list = violations.filter((v) => v.studentId === me.id && matchesPeriod(v.date, wp))
        const deducted = list.reduce((s, v) => s + (ruleMap[v.ruleId]?.points || 0), 0)
        const score = Math.max(0, 100 - deducted)
        return {
          ...w,
          locked: isWeekLocked(w),
          list,
          count: list.length,
          deducted,
          score,
          conduct: conductOf(score),
        }
      }),
    [weeks, violations, me.id, ruleMap, isWeekLocked],
  )

  const myMonthViolations = useMemo(
    () =>
      violations
        .filter((v) => v.studentId === me.id && matchesPeriod(v.date, period))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [violations, me.id, period],
  )

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-800 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              <CalendarRange size={22} /> Tổng kết tháng của tôi
            </h2>
            <p className="mt-1 text-sm text-violet-200">
              Điểm trung bình tháng = trung bình cộng điểm thi đua của từng tuần trong tháng.
              Xếp loại: Tốt ≥ 90 · Khá ≥ 80 · Đạt ≥ 70 · Chưa đạt &lt; 70.
            </p>
          </div>
          {myRow && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
              <Award size={22} className="text-amber-300" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-violet-200">Điểm TB tháng</p>
                <p className="text-2xl font-extrabold leading-tight">{myRow.score}</p>
              </div>
              <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${conduct.cls}`}>{conduct.label}</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800">Chọn tháng tổng kết</h3>
          <div className="flex flex-wrap items-center gap-2">
            {months.map((m) => {
              const [yy, mm] = m.split('-').map(Number)
              const active = m === monthSel
              return (
                <button
                  key={m}
                  onClick={() => setMonthSel(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {monthLabel({ year: yy, month: mm })}
                </button>
              )
            })}
            <input
              type="month"
              value={monthSel}
              onChange={(e) => e.target.value && setMonthSel(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Điểm TB tháng</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">{myRow ? myRow.score : '—'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Xếp hạng lớp</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">
            {myRow ? `#${myRow.rank}` : '—'}
            <span className="text-xs font-medium text-slate-400">/{students.length}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Tổng lỗi trong tháng</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-600">{myRow ? myRow.violations : 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Xếp loại</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">{conduct.label}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
          <TrendingUp size={18} className="text-sky-500" /> Chi tiết từng tuần trong tháng
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2.5 pr-3 font-semibold">Tuần</th>
                <th className="py-2.5 pr-3 font-semibold">Điểm</th>
                <th className="py-2.5 pr-3 font-semibold">Số lỗi</th>
                <th className="py-2.5 pr-3 font-semibold">Điểm trừ</th>
                <th className="py-2.5 pr-3 font-semibold">Xếp loại</th>
                <th className="py-2.5 pr-3 font-semibold">Bằng chứng</th>
              </tr>
            </thead>
            <tbody>
              {weekRows.map((w) => (
                <tr key={`${w.year}-W${w.week}`} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-slate-700">
                    Tuần {w.week} (bắt đầu {formatDate(weekStartISO(w))})
                  </td>
                  <td className="py-2.5 pr-3 font-bold text-slate-700">{w.score}</td>
                  <td className="py-2.5 pr-3 text-slate-500">{w.count}</td>
                  <td className="py-2.5 pr-3 text-rose-500">-{w.deducted}đ</td>
                  <td className="py-2.5 pr-3">
                    <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-bold ${w.conduct.cls}`}>
                      {w.conduct.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    {w.locked ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <Lock size={10} /> Đã chốt
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-300">Chưa chốt</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-slate-800">Xếp loại toàn lớp (tháng {month})</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CONDUCT_LEVELS.map((l) => (
            <div key={l.label} className={`rounded-xl border ${l.cls} px-4 py-3 text-center`}>
              <p className="text-xl font-extrabold">{conductDist[l.label]}</p>
              <p className="text-xs font-semibold opacity-80">{l.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-500" />
          <h3 className="font-bold text-slate-800">Lịch sử vi phạm của tôi ({monthLabel(period)})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2.5 pr-3 font-semibold">Ngày</th>
                <th className="py-2.5 pr-3 font-semibold">Lỗi vi phạm</th>
                <th className="py-2.5 pr-3 font-semibold">Điểm bị trừ</th>
                <th className="py-2.5 pr-3 font-semibold">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {myMonthViolations.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Tháng này bạn không có vi phạm nào. Cố gắng nhé!
                  </td>
                </tr>
              )}
              {myMonthViolations.map((v) => {
                const rule = ruleMap[v.ruleId]
                return (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-3 text-slate-500">{formatDate(v.date)}</td>
                    <td className="py-2.5 pr-3 font-medium text-slate-700">{rule ? rule.name : '—'}</td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600">
                        -{rule ? rule.points : 0}đ
                      </span>
                    </td>
                    <td className="max-w-[260px] truncate py-2.5 pr-3 text-xs text-slate-400">{v.note || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}