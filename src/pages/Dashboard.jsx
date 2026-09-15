import { useMemo, useState } from 'react'
import {
  Users,
  AlertTriangle,
  TrendingDown,
  Trophy,
  Medal,
  FileWarning,
  Skull,
  TrendingUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import StatCard from '../components/StatCard.jsx'
import BarChart from '../components/BarChart.jsx'
import PointsBadge from '../components/PointsBadge.jsx'
import {
  buildStandings,
  ruleStats,
  weeklyTrend,
  GROUP_NAMES,
  GROUP_COLORS,
  periodLabel,
  formatDate,
  currentPeriod,
  matchesPeriod,
  getWeekInfo,
  weekLabel,
  violationDateLabel,
  isBonus,
  ruleDelta,
} from '../utils/helpers.js'

const lastWeekInfo = () => getWeekInfo(new Date(Date.now() - 7 * 86400000))

export default function Dashboard() {
  const { students, rules, violations } = useApp()
  const [period, setPeriod] = useState(currentPeriod())
  const lastWeek = lastWeekInfo()

  const isActive = (p) =>
    p.type === period.type &&
    (p.type === 'all' || (p.year === period.year && (p.type === 'month' ? p.month === period.month : p.week === period.week)))

  const { rows, groups } = useMemo(
    () => buildStandings(students, rules, violations, period),
    [students, rules, violations, period],
  )

  const rulesOfPeriod = useMemo(() => ruleStats(violations, rules, period), [violations, rules, period])

  const trend = useMemo(() => weeklyTrend(violations), [violations])

  const filtered = useMemo(
    () => violations.filter((v) => matchesPeriod(v.date, period)),
    [violations, period],
  )

  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])

  const totalDelta = filtered.reduce((s, v) => s + ruleDelta(ruleMap[v.ruleId]), 0)
  const classAvg = groups.length
    ? +(groups.reduce((s, g) => s + (g.members ? g.avg : 0), 0) / Math.max(groups.filter((g) => g.members).length, 1)).toFixed(1)
    : 0
  const worst = [...rows].filter((r) => r.violations > 0).sort((a, b) => b.violations - a.violations).slice(0, 5)
  const best = rows.slice(0, 5)
  const topRules = rulesOfPeriod.filter((s) => !isBonus(s.rule)).slice(0, 5)

  const periodSwitch = (label, p) => (
    <button
      key={label}
      onClick={() => setPeriod(p)}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        isActive(p) ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  )

  const latestViolations = [...filtered]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 6)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Kỳ xem: <span className="font-semibold text-slate-700">{periodLabel(period)}</span>
        </p>
        <div className="flex gap-1.5">
          {periodSwitch('Tuần này', currentPeriod())}
          {periodSwitch(weekLabel(lastWeek), { type: 'week', ...lastWeek })}
          {periodSwitch('Tất cả', { type: 'all' })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Học sinh" value={students.length} icon={Users} color="indigo" hint="Toàn lớp" />
        <StatCard
          label="Ghi nhận trong kỳ"
          value={filtered.length}
          icon={AlertTriangle}
          color="rose"
          hint={periodLabel(period)}
        />
        <StatCard label="Điểm thay đổi trong kỳ" value={`${totalDelta >= 0 ? '+' : ''}${totalDelta}đ`} icon={TrendingDown} color={totalDelta >= 0 ? 'emerald' : 'amber'} hint="Trong kỳ" />
        <StatCard label="Điểm TB lớp" value={classAvg} icon={Trophy} color="emerald" hint="Trên thang 100" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Điểm thi đua theo Tổ</h3>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
              {periodLabel(period)}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => {
              const color = GROUP_COLORS[g.group]
              const pct = Math.max((g.avg / 100) * 100, 2)
              return (
                <div
                  key={g.group}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {g.group}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{GROUP_NAMES[g.group]}</p>
                        <p className="text-[11px] text-slate-400">{g.members} học sinh</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {g.rank <= 3 ? <Medal size={16} className={g.rank === 1 ? 'text-amber-400' : g.rank === 2 ? 'text-slate-400' : 'text-orange-400'} /> : null}
                      <span className="text-lg font-extrabold text-slate-800">{g.avg}</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {g.totalViolations} lỗi trong kỳ · Hạng {g.rank}/4
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Skull size={18} className="text-rose-500" />
            <h3 className="font-bold text-slate-800">Top vi phạm nhiều nhất</h3>
          </div>
          <ul className="space-y-2.5">
            {worst.length ? (
              worst.map((r, i) => (
                <li key={r.student.id} className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${i < 3 ? 'bg-rose-500' : 'bg-slate-300'}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700">{r.student.name}</p>
                    <p className="text-[11px] text-slate-400">
                      Tổ {r.student.group} · {r.violations} lỗi
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${r.score >= 90 ? 'bg-emerald-50 text-emerald-600' : r.score >= 75 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                    {r.score}đ
                  </span>
                </li>
              ))
            ) : (
              <li className="py-8 text-center text-sm text-slate-400">Không có ai vi phạm trong kỳ này - cả lớp tuyệt vời!</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileWarning size={18} className="text-amber-500" />
            <h3 className="font-bold text-slate-800">Lỗi vi phạm phổ biến ({periodLabel(period)})</h3>
          </div>
          {topRules.length ? (
            <ul className="space-y-3">
              {topRules.map((s, i) => (
                <li key={s.rule.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{s.rule.name}</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {s.count} lần · {s.count * ruleDelta(s.rule) >= 0 ? '+' : ''}{s.count * ruleDelta(s.rule)}đ
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                      style={{ width: `${(s.count / (rulesOfPeriod[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có vi phạm nào trong kỳ này.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" />
            <h3 className="font-bold text-slate-800">Số vi phạm theo tuần (8 tuần gần nhất)</h3>
          </div>
          <BarChart data={trend} color="#6366f1" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-500" />
            <h3 className="font-bold text-slate-800">Vi phạm / khen thưởng mới nhất</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2.5 pr-3 font-semibold">Ngày</th>
                <th className="py-2.5 pr-3 font-semibold">Học sinh</th>
                <th className="py-2.5 pr-3 font-semibold">Lỗi vi phạm / khen thưởng</th>
                <th className="py-2.5 pr-3 font-semibold">Điểm</th>
              </tr>
            </thead>
            <tbody>
              {latestViolations.map((v) => {
                const rule = ruleMap[v.ruleId]
                const stu = students.find((s) => s.id === v.studentId)
                return (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-3 text-slate-500">{violationDateLabel(v.date)}</td>
                    <td className="py-2.5 pr-3 font-medium text-slate-700">
                      {stu ? stu.name : '—'}
                      <span className="ml-1 text-xs text-slate-400">(Tổ {stu ? stu.group : '?'})</span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{rule ? rule.name : '—'}</td>
                    <td className="py-2.5 pr-3">
                      <PointsBadge rule={rule} />
                    </td>
                  </tr>
                )
              })}
              {!latestViolations.length && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Không có ghi nhận nào trong kỳ này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-amber-500" />
          <h3 className="font-bold text-slate-800">Điểm thi đua cao nhất ({periodLabel(period)})</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {best.map((r) => (
            <div key={r.student.id} className="rounded-xl bg-emerald-50/60 p-3 text-center">
              <p className="text-lg font-extrabold text-emerald-600">{r.score}</p>
              <p className="truncate text-xs font-semibold text-slate-700">{r.student.name}</p>
              <p className="text-[10px] text-slate-400">Tổ {r.student.group} · {r.violations} lỗi</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}