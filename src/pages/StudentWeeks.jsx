import { useMemo, useState } from 'react'
import { CalendarDays, Lock, ShieldCheck, Award, AlertTriangle, Medal, Trophy } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import {
  buildStandings,
  availableWeeks,
  currentWeek,
  matchesPeriod,
  weekStartISO,
  formatDate,
  conductOf,
  GROUP_NAMES,
  GROUP_COLORS,
} from '../utils/helpers.js'

export default function StudentWeeks() {
  const { session, students, rules, violations, lockedWeeks, isWeekLocked } = useApp()
  const me = students.find((s) => s.id === session.id) || session
  const [sel, setSel] = useState(() => currentWeek())

  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])

  const weekList = useMemo(() => {
    const map = new Map()
    const key = (w) => `${w.year}-W${w.week}`
    availableWeeks(violations).forEach((w) => map.set(key(w), w))
    lockedWeeks.forEach((l) => map.set(key(l), { year: l.year, week: l.week }))
    return [...map.values()].sort((a, b) => b.year - a.year || b.week - a.week)
  }, [violations, lockedWeeks])

  const period = { type: 'week', year: sel.year, week: sel.week }
  const locked = isWeekLocked(sel)

  const { rows, groups } = useMemo(
    () => buildStandings(students, rules, violations, period),
    [students, rules, violations, period],
  )
  const myRow = rows.find((r) => r.student.id === me.id)
  const myGroup = groups.find((g) => g.group === me.group)
  const conduct = conductOf(myRow ? myRow.score : 100)

  const myWeekViolations = useMemo(
    () =>
      violations
        .filter((v) => v.studentId === me.id && matchesPeriod(v.date, period))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [violations, me.id, period],
  )

  const medal = { 1: 'text-amber-400', 2: 'text-slate-400', 3: 'text-orange-400' }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              <CalendarDays size={22} /> Vi phạm theo tuần của tôi
            </h2>
            <p className="mt-1 text-sm text-sky-100">
              Xem từng tuần đã được ghi nhận. Tuần nào được giáo viên chủ nhiệm{' '}
              <b>chốt (Lưu tuần)</b> thì vi phạm được giữ nguyên làm bằng chứng.
            </p>
          </div>
          {myRow && (
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
              <Award size={22} className="text-amber-300" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-sky-200">Điểm tuần {sel.week}</p>
                <p className="text-2xl font-extrabold leading-tight">{myRow.score}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-slate-800">Chọn tuần xem</h3>
        <div className="flex flex-wrap gap-2">
          {weekList.map((w) => {
            const active = w.year === sel.year && w.week === sel.week
            const isLocked = isWeekLocked(w)
            return (
              <button
                key={`${w.year}-W${w.week}`}
                onClick={() => setSel(w)}
                className={`relative flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-100'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {isLocked && <Lock size={12} className={active ? 'text-amber-500' : 'text-amber-400'} />}
                Tuần {w.week} ({formatDate(weekStartISO(w))})
              </button>
            )
          })}
        </div>
      </div>

      {locked && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          <ShieldCheck size={18} />
          Tuần này đã được chốt làm bằng chứng. Vi phạm trong tuần không thể thay đổi.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Điểm thi đua tuần</p>
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
          <p className="text-xs text-slate-500">Số lỗi trong tuần</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-600">{myRow ? myRow.violations : 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Xếp loại</p>
          <p className="mt-1">
            <span className={`rounded-lg border px-2.5 py-1 text-sm font-bold ${conduct.cls}`}>{conduct.label}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Hạng tổ</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">
            {myGroup ? `#${myGroup.rank}` : '—'}
            <span className="text-xs font-medium text-slate-400">/{groups.length}</span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bold text-slate-800">
            <AlertTriangle size={18} className="text-rose-500" />
            Lịch sử vi phạm tuần {sel.week}
          </h3>
          {myGroup && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Medal size={14} className={medal[myGroup.rank] || 'text-slate-400'} />
              {GROUP_NAMES[me.group]}: hạng {myGroup.rank} · điểm TB {myGroup.avg}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2.5 pr-3 font-semibold">Ngày</th>
                <th className="py-2.5 pr-3 font-semibold">Lỗi vi phạm</th>
                <th className="py-2.5 pr-3 font-semibold">Điểm bị trừ</th>
                <th className="py-2.5 pr-3 font-semibold">Ghi chú</th>
                <th className="py-2.5 pr-3 font-semibold">Bằng chứng</th>
              </tr>
            </thead>
            <tbody>
              {myWeekViolations.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tuần này bạn không có vi phạm nào. Tuyệt vời!
                  </td>
                </tr>
              )}
              {myWeekViolations.map((v) => {
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
                    <td className="py-2.5 pr-3">
                      {locked ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          <Lock size={10} /> Đã chốt
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-300">Chưa chốt</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <Trophy size={18} className="text-amber-500" /> Xếp hạng các Tổ tuần {sel.week}
        </h3>
        <ul className="space-y-2.5">
          {groups.map((g) => {
            const isMine = g.group === me.group
            const color = GROUP_COLORS[g.group]
            return (
              <li
                key={g.group}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  isMine ? 'border-sky-200 bg-sky-50/70 ring-2 ring-sky-100' : 'border-slate-100 bg-slate-50/60'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Medal size={16} className={medal[g.rank]} />
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: color }}>
                  {g.group}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700">
                    {GROUP_NAMES[g.group]}
                    {isMine && <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold text-white">Tổ của bạn</span>}
                  </p>
                  <p className="text-[11px] text-slate-400">Hạng {g.rank} · {g.totalViolations} lỗi · {g.members} HS</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-slate-800">{g.avg}</p>
                  <p className="text-[10px] text-slate-400">điểm TB</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}