import { useMemo, useState } from 'react'
import { Check, Users, AlertTriangle, Trophy, ShieldCheck, CalendarDays, Lock, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import StatCard from '../components/StatCard.jsx'
import PointsBadge from '../components/PointsBadge.jsx'
import {
  leaderScope,
  scopeLabel,
  todayISO,
  formatDate,
  isoWeekInfo,
  weekLabel,
  currentPeriod,
  buildStandings,
  conductOf,
  matchesPeriod,
  statusOf,
  VIOLATION_STATUS,
  submitTargetFor,
  scoresIn,
  isClassLeaderRole,
  isBonus,
  ruleDelta,
} from '../utils/helpers.js'

function LeaderViolationForm({ members, onSave, onError }) {
  const { rules, isWeekLocked } = useApp()
  const [form, setForm] = useState({ studentId: '', ruleId: '', date: todayISO(), note: '' })

  const rule = rules.find((r) => r.id === form.ruleId)
  const stu = members.find((s) => s.id === form.studentId)
  const week = form.date ? isoWeekInfo(form.date) : null
  const locked = week ? isWeekLocked(week) : false

  const submit = (e) => {
    e.preventDefault()
    if (!form.studentId) return onError('Vui lòng chọn học sinh.')
    if (!form.ruleId) return onError('Vui lòng chọn lỗi vi phạm.')
    if (!form.date) return onError('Vui lòng chọn ngày vi phạm.')
    if (locked)
      return onError(`Tuần này đã được chốt (${weekLabel(week)}). Không thể thêm vi phạm. Hãy báo giáo viên chủ nhiệm mở khóa.`)
    onSave(form)
    setForm({ studentId: '', ruleId: '', date: todayISO(), note: '' })
  }

  const field =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Học sinh *</label>
          <select
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            className={field}
          >
            <option value="">-- Chọn học sinh --</option>
            {members.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code}) - Tổ {s.group}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Lỗi vi phạm / Khen thưởng *</label>
          <select
            value={form.ruleId}
            onChange={(e) => setForm({ ...form, ruleId: e.target.value })}
            className={field}
          >
            <option value="">-- Chọn lỗi / khen thưởng --</option>
            <optgroup label="Trừ điểm (vi phạm)">
              {rules.filter((r) => !isBonus(r)).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (-{r.points} điểm)
                </option>
              ))}
            </optgroup>
            <optgroup label="Cộng điểm (khen thưởng)">
              {rules.filter((r) => isBonus(r)).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (+{r.points} điểm)
                </option>
              ))}
            </optgroup>
          </select>
          {rule && (
            <p className="mt-1 text-[11px] text-slate-400">
              {isBonus(rule) ? (
                <span className="font-bold text-emerald-600">Điểm cộng: +{rule.points} điểm</span>
              ) : (
                <span className="font-bold text-rose-500">Điểm trừ: -{rule.points} điểm</span>
              )}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ngày vi phạm *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={field}
          />
          {week && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
              <CalendarDays size={12} /> {weekLabel(week)}
            </p>
          )}
          {week && locked && (
            <p className="mt-1 flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-600">
              <Lock size={12} /> Tuần này đã chốt - không thể thêm
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ghi chú thêm</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            rows={3}
            className={`${field} resize-none`}
            placeholder="Mô tả ngắn (tùy chọn)"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
        >
          <Check size={16} />
          Ghi nhận vi phạm
        </button>
      </div>
      <p className="text-right text-[11px] text-slate-400">Tên người ghi sẽ được lưu kèm theo bản ghi.</p>
    </form>
  )
}

export default function LeaderView() {
  const { session, students, rules, violations, notify, addViolation, updateViolation, deleteViolation, isWeekLocked } = useApp()

  const me = students.find((s) => s.id === session?.id)
  const roleLabel = session?.roleLabel || me?.role || ''
  const manageGroup = session?.manageGroup ?? me?.manageGroup ?? me?.group ?? 0
  const scope = leaderScope(roleLabel, manageGroup, me?.group)

  const members = useMemo(() => {
    if (!scope) return []
    if (scope.type === 'group') return students.filter((s) => s.group === scope.group)
    return students
  }, [scope, students])

  const memberIds = useMemo(() => new Set(members.map((s) => s.id)), [members])
  const scopeViolations = useMemo(
    () => violations.filter((v) => memberIds.has(v.studentId)),
    [violations, memberIds],
  )

  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])
  const current = currentPeriod()
  const [periodType, setPeriodType] = useState('week')
  const period = useMemo(() => {
    if (periodType === 'week') return { type: 'week', ...current }
    return { type: 'all' }
  }, [periodType, current])

  const scoringViolations = useMemo(
    () => scopeViolations.filter((v) => scoresIn(v)),
    [scopeViolations],
  )

  const periodScoring = useMemo(
    () => scoringViolations.filter((v) => matchesPeriod(v.date, period)),
    [scoringViolations, period],
  )

  const { rows } = useMemo(
    () => buildStandings(members, rules, violations, period),
    [members, rules, violations, period],
  )

  const myDrafts = useMemo(
    () => scopeViolations.filter((v) => statusOf(v) === 'draft' && v.byId === session?.id),
    [scopeViolations, session],
  )

  const handleSubmitAll = () => {
    if (!myDrafts.length) return notify('Không có nháp nào để gửi.', 'error')
    const baseTarget = submitTargetFor(roleLabel)
    let toTeacher = 0
    myDrafts.forEach((v) => {
      const targetStu = students.find((s) => s.id === v.studentId)
      const isClassLeaderTarget = targetStu && isClassLeaderRole(targetStu.role)
      const target = baseTarget === 'pendingAdmin' || isClassLeaderTarget ? 'pendingAdmin' : 'pendingClass'
      if (target === 'pendingAdmin') toTeacher += 1
      updateViolation(v.id, { status: target, submittedAt: new Date().toISOString() })
    })
    const direct = toTeacher > 0
    notify(
      `Đã gửi ${myDrafts.length} vi phạm lên duyệt${
        direct ? (toTeacher === myDrafts.length ? ' (gửi thẳng giáo viên).' : ` - ${toTeacher} bản gửi thẳng giáo viên do là lớp trưởng/phó.`) : '.'
      }`,
    )
  }

  const handleDeleteDraft = (id) => {
    deleteViolation(id)
    notify('Đã xóa nháp.')
  }

  const top = rows[0]
  const weekLocked = isWeekLocked({ year: current.year, week: current.week })
  const recent = useMemo(
    () => [...scopeViolations].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 25),
    [scopeViolations],
  )

  if (!scope || members.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <ShieldCheck size={40} className="mx-auto text-slate-300" />
        <p className="mt-4 font-semibold text-slate-700">Bạn chưa được phân công vai trò lãnh đạo.</p>
        <p className="mt-1 text-sm text-slate-400">
          Nhờ giáo viên chủ nhiệm gán chức vụ trong Quản lý học sinh để sử dụng trang điều hành.
        </p>
      </div>
    )
  }

  const avgScore = members.length ? (rows.reduce((s, r) => s + r.score, 0) / members.length).toFixed(1) : '0'
  const periodDelta = periodScoring.reduce((s, v) => s + ruleDelta(ruleMap[v.ruleId]), 0)

  const handleRecord = (formData) => {
    addViolation({
      ...formData,
      id: `v-${Date.now()}`,
      status: 'draft',
      by: session?.name || 'Học sinh',
      byId: session?.id || '',
      byRole: roleLabel,
      createdAt: new Date().toISOString(),
    })
    notify(`Đã ghi nhận nháp cho ${members.find((s) => s.id === formData.studentId)?.name || ''}.`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Điều hành lớp</p>
          <h2 className="mt-1 text-xl font-extrabold md:text-2xl">
            {roleLabel} · {scopeLabel(scope)}
          </h2>
          <p className="mt-1 text-sm text-indigo-100">
            Xem điểm thi đua và ghi nhận vi phạm cho {scope.type === 'group' ? 'tổ' : 'cả lớp'} (số lượng:{' '}
            {members.length} học sinh).
          </p>
        </div>
        <div className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur">
          {session?.name} {me && `· ${me.code}`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Thành viên" value={members.length} icon={Users} color="indigo" />
        <StatCard
          label="Vi phạm ghi nhận (kỳ)"
          value={periodScoring.length}
          icon={AlertTriangle}
          color={periodScoring.length ? 'rose' : 'emerald'}
        />
        <StatCard
          label="Điểm trung bình"
          value={avgScore}
          icon={Trophy}
          color="amber"
          hint="Điểm thi đua TB của các thành viên"
        />
        <StatCard label="Điểm thay đổi kỳ này" value={`${periodDelta >= 0 ? '+' : ''}${periodDelta}`} icon={Lock} color={periodDelta >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs leading-relaxed text-indigo-800">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <p>
          Vi phạm bạn ghi sẽ nằm ở trạng thái <b>Chờ gửi</b> (không tính điểm). Khi bấm{' '}
          <b>Gửi vi phạm lên duyệt</b>
          {isClassLeaderRole(roleLabel) ? (
            <>
              {' '}
              chúng sẽ lên thẳng chỗ <b>giáo viên chủ nhiệm</b> duyệt.
            </>
          ) : (
            <>
              {' '}
              chúng sẽ được <b>lớp trưởng / lớp phó</b> duyệt trước, sau đó <b>giáo viên</b> duyệt cuối. Điểm tạm tính
              cho tới khi duyệt xong.
            </>
          )}
        </p>
      </div>

      {myDrafts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800">Nháp vi phạm đang soạn ({myDrafts.length})</h3>
              <p className="text-xs text-slate-400">
                Các vi phạm này chưa tính điểm. Xem lại rồi gửi lên để được duyệt.
              </p>
            </div>
            <button
              onClick={handleSubmitAll}
              disabled={weekLocked}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
            >
              <Check size={16} /> Gửi {myDrafts.length} vi phạm lên duyệt
            </button>
          </div>
          {weekLocked && (
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
              <Lock size={13} /> Tuần hiện tại đã chốt - hãy báo giáo viên mở khóa để gửi.
            </p>
          )}
          <ul className="space-y-2">
            {myDrafts.map((v) => {
              const stu = students.find((s) => s.id === v.studentId)
              const rule = ruleMap[v.ruleId]
              return (
                <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-sm">
                  <span className="font-semibold text-slate-700">{stu ? stu.name : '—'}</span>
                  <span className="text-slate-500">
                    {rule ? rule.name : '—'}{' '}
                    <PointsBadge rule={rule} />
                  </span>
                  <span className="text-xs text-slate-400">{v.date ? formatDate(v.date) : ''}</span>
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteDraft(v.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Xóa nháp"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <Check size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Ghi nhận vi phạm</h3>
              <p className="text-xs text-slate-400">Chỉ ghi cho học sinh trong phạm vi {scopeLabel(scope)}.</p>
            </div>
          </div>
          <LeaderViolationForm members={members} onSave={handleRecord} onError={(msg) => notify(msg, 'error')} />
          {weekLocked && (
            <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              <Lock size={14} />
              Tuần hiện tại đã chốt - không thể thêm vi phạm cho tới khi giáo viên chủ nhiệm mở khóa.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
            <h3 className="font-bold text-slate-800">Xếp hạng thi đua</h3>
            <div className="flex rounded-xl bg-slate-100 p-1">
              {['week', 'all'].map((t) => (
                <button
                  key={t}
                  onClick={() => setPeriodType(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    periodType === t ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t === 'week' ? 'Tuần này' : 'Cả năm'}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Học sinh</th>
                  <th className="px-4 py-3 font-semibold">Tổ</th>
                  <th className="px-4 py-3 text-center font-semibold">Vi phạm</th>
                  <th className="px-4 py-3 text-right font-semibold">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Không có thành viên.
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const c = conductOf(r.score)
                  return (
                    <tr key={r.student.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">
                        {r.student.id === session?.id ? '★ ' : ''}
                        {r.rank}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-slate-700">{r.student.name}</p>
                        <p className="text-[11px] text-slate-400">{r.student.code}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          Tổ {r.student.group}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-500">{r.violations}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-bold text-slate-800">{r.score}</span>
                        <span className={`ml-2 inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${c.cls}`}>
                          {c.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-800">Vi phạm gần đây trong {scopeLabel(scope)}</h3>
          {top && <span className="text-xs font-semibold text-slate-400">Dẫn đầu: {top.student.name} ({top.score}đ)</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Ngày</th>
                <th className="px-4 py-3 font-semibold">Học sinh</th>
                <th className="px-4 py-3 font-semibold">Lỗi vi phạm</th>
                <th className="px-4 py-3 font-semibold">Điểm</th>
                <th className="px-4 py-3 font-semibold">Người ghi</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Chưa có vi phạm nào.
                  </td>
                </tr>
              )}
              {recent.map((v) => {
                const stu = students.find((s) => s.id === v.studentId)
                const rule = ruleMap[v.ruleId]
                const st = VIOLATION_STATUS[statusOf(v)]
                return (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(v.date)}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{stu ? stu.name : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{rule ? rule.name : '—'}</td>
                    <td className="px-4 py-2.5">
                      <PointsBadge rule={rule} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{v.by || 'Nhập tay'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
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