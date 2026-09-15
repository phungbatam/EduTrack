import { useMemo, useState } from 'react'
import { Medal, Trophy, Bell, AlertTriangle, TrendingUp, Award, ShieldCheck, MessageSquareWarning, X, Send } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import StatCard from '../components/StatCard.jsx'
import PointsBadge from '../components/PointsBadge.jsx'
import {
  buildStandings,
  currentPeriod,
  currentWeek,
  periodLabel,
  formatDate,
  timeAgo,
  violationDateLabel,
  GROUP_NAMES,
  GROUP_COLORS,
  ruleDelta,
  weekdayName,
  violationPenaltyInfo,
  studentWeekSanction,
  PENALTY_FORMS,
} from '../utils/helpers.js'

const APPEAL_BADGE = (status) =>
  status === 'pending'
    ? { label: 'Đang chờ xử lý', cls: 'bg-amber-50 text-amber-600 border-amber-200' }
    : status === 'removed'
      ? { label: 'Đã chấp nhận (xóa vi phạm)', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' }
      : { label: 'Đã bác', cls: 'bg-rose-50 text-rose-600 border-rose-200' }

function AppealModal({ open, onClose, violation, ruleName, onSubmit }) {
  const [reason, setReason] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <MessageSquareWarning size={18} className="text-amber-500" />
              Viết đơn khiếu nại
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {weekdayName(violation.date)} {formatDate(violation.date)} · {ruleName}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
          placeholder="Trình bày lý do: nội dung chưa đúng, thiếu căn cứ, ghi nhầm ngày/giờ..."
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              onSubmit(reason.trim())
              setReason('')
            }}
            disabled={!reason.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-amber-600 disabled:opacity-50"
          >
            <Send size={15} /> Gửi khiếu nại
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StudentView() {
  const { session, students, rules, violations, appeals, addAppeal, notify } = useApp()
  const me = students.find((s) => s.id === session.id) || session
  const [period, setPeriod] = useState(currentPeriod())
  const [appealTarget, setAppealTarget] = useState(null)

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

  const myAppeals = useMemo(() => appeals.filter((a) => a.studentId === me.id), [appeals, me.id])

  const appealOf = (v) => myAppeals.find((a) => a.violationId === v.id)

  const appealable = myViolations.filter((v) => !appealOf(v))

  const submitAppeal = (reason) => {
    if (!appealTarget) return
    addAppeal({
      violationId: appealTarget.id,
      ruleName: ruleMap[appealTarget.ruleId] ? ruleMap[appealTarget.ruleId].name : '—',
      studentId: me.id,
      studentName: me.name,
      reason,
    })
    notify('Đã gửi đơn khiếu nại lên quản trị viên.')
    setAppealTarget(null)
  }

  const allTimeMy = useMemo(() => {
    const all = violations.filter((v) => v.studentId === me.id)
    const delta = all.reduce((s, v) => s + ruleDelta(ruleMap[v.ruleId]), 0)
    return { count: all.length, delta }
  }, [violations, me.id, ruleMap])

  const curSanction = useMemo(
    () => studentWeekSanction(violations, me.id, currentWeek(), ruleMap),
    [violations, me.id, ruleMap],
  )

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

      <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <MessageSquareWarning size={18} className="text-amber-500" />
          <h3 className="font-bold text-slate-800">Khiếu nại vi phạm</h3>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-600">Dành cho học sinh</span>
          {appealable.length > 0 && (
            <span className="ml-auto rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-600">
              {appealable.length} vi phạm có thể khiếu nại
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Nếu bạn thấy nội dung vi phạm được ghi chưa đúng (sai lỗi, sai ngày, thiếu căn cứ...), hãy gửi đơn khiếu nại lên giáo viên chủ nhiệm để được xem xét.
        </p>
        {appealable.length > 0 ? (
          <ul className="space-y-2">
            {appealable.map((v) => {
              const rule = ruleMap[v.ruleId]
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700">{rule ? rule.name : '—'}</p>
                    <p className="text-[11px] text-slate-400">
                      {weekdayName(v.date)} {formatDate(v.date)} · <PointsBadge rule={rule} />
                    </p>
                  </div>
                  <button
                    onClick={() => setAppealTarget(v)}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                  >
                    <Send size={12} /> Viết đơn khiếu nại
                  </button>
                </li>
              )
            })}
          </ul>
        ) : myAppeals.length > 0 ? (
          <div className="rounded-xl bg-slate-50 py-4 text-center text-sm text-slate-500">
            Bạn đã gửi đơn cho tất cả vi phạm hiện có. Theo dõi kết quả ở bảng{' '}
            <b className="text-slate-700">Các đơn khiếu nại của tôi</b> bên dưới.
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 py-4 text-center text-sm text-slate-500">
            Bạn hiện chưa có vi phạm nào nên chưa cần khiếu nại. Khi có vi phạm, bạn có thể gửi đơn ngay tại đây.
          </div>
        )}
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
            <h3 className="font-bold text-slate-800">Thông báo vi phạm / khen thưởng mới nhất của lớp</h3>
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
            {!notifications.length && <li className="py-8 text-center text-sm text-slate-400">Chưa có ghi nhận nào.</li>}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <AlertTriangle size={18} className="text-rose-500" />
          <h3 className="font-bold text-slate-800">Lịch sử ghi nhận của tôi ({periodLabel(period)})</h3>
          {curSanction.type !== 'none' && (
            <div className="ml-auto flex flex-wrap gap-1.5">
              {curSanction.type === 'duty' && (
                <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700">
                  Tuần này: Trực nhật {curSanction.dutyDays} ngày
                </span>
              )}
              {curSanction.type === 'labor' && (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                  Tuần này: Đi lao động {curSanction.laborDays} ngày
                </span>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2.5 pr-3 font-semibold">Ngày</th>
                <th className="py-2.5 pr-3 font-semibold">Lỗi vi phạm / khen thưởng</th>
                <th className="py-2.5 pr-3 font-semibold">Hình phạt</th>
                <th className="py-2.5 pr-3 font-semibold">Điểm</th>
                <th className="py-2.5 pr-3 font-semibold">Ghi chú</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Khiếu nại</th>
              </tr>
            </thead>
            <tbody>
              {myViolations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Bạn chưa có ghi nhận nào trong kỳ này. Cố gắng nhé!
                  </td>
                </tr>
              )}
              {myViolations.map((v) => {
                const rule = ruleMap[v.ruleId]
                const ap = appealOf(v)
                const badge = ap ? APPEAL_BADGE(ap.status) : null
                const pinfo = violationPenaltyInfo(violations, v, ruleMap)
                return (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-3 text-slate-500">{violationDateLabel(v.date)}</td>
                    <td className="py-2.5 pr-3 font-medium text-slate-700">{rule ? rule.name : '—'}</td>
                    <td className="py-2.5 pr-3">
                      {pinfo ? (
                        <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold ${PENALTY_FORMS[pinfo.form].cls}`}>
                          {PENALTY_FORMS[pinfo.form].label} {pinfo.days} ngày · lần {pinfo.rank}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <PointsBadge rule={rule} />
                    </td>
                    <td className="max-w-[260px] truncate py-2.5 pr-3 text-xs text-slate-400">{v.note || '—'}</td>
                    <td className="py-2.5 pr-3 text-right">
                      {badge ? (
                        <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <button
                          onClick={() => setAppealTarget(v)}
                          className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                        >
                          <MessageSquareWarning size={12} /> Khiếu nại
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {myAppeals.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareWarning size={18} className="text-amber-500" />
            <h3 className="font-bold text-slate-800">Các đơn khiếu nại của tôi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2.5 pr-3 font-semibold">Vi phạm</th>
                  <th className="py-2.5 pr-3 font-semibold">Lý do</th>
                  <th className="py-2.5 pr-3 font-semibold">Ngày gửi</th>
                  <th className="py-2.5 pr-3 font-semibold">Trạng thái</th>
                  <th className="py-2.5 pr-3 font-semibold">Phản hồi của GVCN</th>
                </tr>
              </thead>
              <tbody>
                {myAppeals.map((a) => {
                  const badge = APPEAL_BADGE(a.status)
                  return (
                    <tr key={a.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-slate-700">{a.ruleName || '—'}</td>
                      <td className="max-w-[240px] truncate py-2.5 pr-3 text-xs text-slate-500" title={a.reason}>
                        {a.reason || '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">{timeAgo(a.createdAt)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="max-w-[240px] truncate py-2.5 pr-3 text-xs text-slate-500" title={a.adminNote}>
                        {a.adminNote || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AppealModal
        open={!!appealTarget}
        onClose={() => setAppealTarget(null)}
        violation={appealTarget || {}}
        ruleName={appealTarget ? ruleMap[appealTarget.ruleId]?.name || '—' : ''}
        onSubmit={submitAppeal}
      />
    </div>
  )
}