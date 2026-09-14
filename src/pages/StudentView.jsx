import { useMemo, useState } from 'react'
import { Medal, Trophy, Bell, AlertTriangle, TrendingUp, Award, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import StatCard from '../components/StatCard.jsx'
import PointsBadge from '../components/PointsBadge.jsx'
import {
  buildStandings,
  currentPeriod,
  periodLabel,
  formatDate,
  timeAgo,
  violationDateLabel,
  GROUP_NAMES,
  GROUP_COLORS,
  ruleDelta,
} from '../utils/helpers.js'

export default function StudentView() {
  const { session, students, rules, violations } = useApp()
  const me = students.find((s) => s.id === session.id) || session
  const [period, setPeriod] = useState(currentPeriod())

  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])

  const { rows, groups } = useMemo(
    () => buildStandings(students, rules, violations, period),
    [students, rules, violations, period],
  )

  const myRow = rows.find((r) => r.student.id === me.id)
  const myGroup = groups.find((g) => g.group === me.group)

  const myViolations = useMemo(
    () =>
      violations
        .filter((v) => v.studentId === me.id)
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [violations, me.id],
  )

  const allTimeMy = useMemo(() => {
    const all = violations.filter((v) => v.studentId === me.id)
    const delta = all.reduce((s, v) => s + ruleDelta(ruleMap[v.ruleId]), 0)
    return { count: all.length, delta }
  }, [violations, me.id, ruleMap])

  const notifications = useMemo(
    () =>
      [...violations]
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 12),
    [violations],
  )

  const medal = { 1: 'text-amber-400', 2: 'text-slate-400', 3: 'text-orange-400' }
  const rankTabs = [
    { label: 'Tuần này', p: currentPeriod() },
    { label: 'Tất cả', p: { type: 'all' } },
  ]

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-extrabold backdrop-blur">
            {me.name ? me.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1">
            <p className="text-sm text-indigo-200">Xin chào,</p>
            <h2 className="text-2xl font-extrabold">{me.name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                Lớp 12A3
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                {GROUP_NAMES[me.group]}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                {me.role}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-mono backdrop-blur">
                Mã: {me.code}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
            <Award size={22} className="text-amber-300" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-indigo-200">Điểm thi đua</p>
              <p className="text-2xl font-extrabold leading-tight">{myRow ? myRow.score : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Bạn đang ở chế độ <b className="text-emerald-600">Học sinh (chỉ xem)</b> - kỳ xem:{' '}
          <span className="font-semibold text-slate-700">{periodLabel(period)}</span>
        </p>
        <div className="flex gap-1.5">
          {rankTabs.map((t) => {
            const active =
              t.p.type === 'all' ? period.type === 'all' : period.type === 'week' && (t.p.year === period.year && t.p.week === period.week)
            return (
              <button
                key={t.label}
                onClick={() => setPeriod(t.p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active ? 'bg-indigo-600 text-white shadow' : 'bg-white text-slate-500 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Điểm thi đua (kỳ)"
          value={`${myRow ? myRow.score : '—'}`}
          icon={Trophy}
          color="emerald"
          hint={myRow ? `Xếp hạng ${myRow.rank}/${students.length}` : ''}
        />
        <StatCard
          label="Lỗi trong kỳ"
          value={myRow ? myRow.violations : 0}
          icon={AlertTriangle}
          color="rose"
          hint="Số lỗi đã bị ghi nhận"
        />
        <StatCard
          label="Điểm TB tổ (kỳ)"
          value={myGroup ? myGroup.avg : '—'}
          icon={TrendingUp}
          color="sky"
          hint={myGroup ? `${GROUP_NAMES[me.group]} đứng hạng ${myGroup.rank}/${groups.length}` : ''}
        />
        <StatCard
          label="Tổng ghi nhận từ đầu năm"
          value={allTimeMy.count}
          icon={ShieldCheck}
          color="amber"
          hint={`Thay đổi điểm: ${allTimeMy.delta >= 0 ? '+' : ''}${allTimeMy.delta}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Medal size={18} className="text-amber-500" />
            <h3 className="font-bold text-slate-800">Xếp hạng các Tổ trong lớp</h3>
          </div>
          <ul className="space-y-2.5">
            {groups.map((g) => {
              const isMine = g.group === me.group
              const color = GROUP_COLORS[g.group]
              return (
                <li
                  key={g.group}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                    isMine ? 'border-indigo-200 bg-indigo-50/70 ring-2 ring-indigo-100' : 'border-slate-100 bg-slate-50/60'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${g.rank <= 3 ? 'bg-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
                    <Medal size={16} className={medal[g.rank]} />
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: color }}>
                    {g.group}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700">
                      {GROUP_NAMES[g.group]}
                      {isMine && <span className="ml-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">Tổ của bạn</span>}
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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell size={18} className="text-sky-500" />
            <h3 className="font-bold text-slate-800">Thông báo vi phạm mới nhất của lớp</h3>
          </div>
          <ul className="space-y-2.5">
            {notifications.map((v) => {
              const rule = ruleMap[v.ruleId]
              const stu = students.find((s) => s.id === v.studentId)
              const isMine = v.studentId === me.id
              return (
                <li key={v.id} className={`flex items-start gap-3 rounded-xl border p-3 ${isMine ? 'border-rose-200 bg-rose-50/60' : 'border-slate-100 bg-slate-50/60'}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                    {stu ? stu.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">
                      <span className={`font-semibold ${isMine ? 'text-rose-600' : 'text-slate-800'}`}>
                        {stu ? stu.name : 'Học sinh'}
                      </span>{' '}
                      - <span className="text-slate-600">{rule ? rule.name : '—'}</span>
                      {isMine && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">Của bạn</span>}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                      <AlertTriangle size={11} /> {timeAgo(v.date)} · <PointsBadge rule={rule} />
                    </p>
                  </div>
                </li>
              )
            })}
            {!notifications.length && <li className="py-8 text-center text-sm text-slate-400">Chưa có vi phạm nào.</li>}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-500" />
          <h3 className="font-bold text-slate-800">Lịch sử vi phạm của tôi ({periodLabel(period)})</h3>
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
              {myViolations.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Bạn chưa có vi phạm nào trong kỳ này. Cố gắng nhé!
                  </td>
                </tr>
              )}
              {myViolations.map((v) => {
                const rule = ruleMap[v.ruleId]
                return (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-3 text-slate-500">{violationDateLabel(v.date)}</td>
                    <td className="py-2.5 pr-3 font-medium text-slate-700">{rule ? rule.name : '—'}</td>
                    <td className="py-2.5 pr-3">
                      <PointsBadge rule={rule} />
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