import { useEffect, useMemo, useState } from 'react'
import { Check, Users, AlertTriangle, Trophy, ShieldCheck, CalendarDays, Lock, Trash2, Send, Plus, Pencil, FileText } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import StatCard from '../components/StatCard.jsx'
import PointsBadge from '../components/PointsBadge.jsx'
import SubmissionModal from '../components/SubmissionModal.jsx'
import {
  leaderScope,
  scopeLabel,
  todayISO,
  isoWeekInfo,
  weekLabel,
  weekdayName,
  violationDateLabel,
  currentPeriod,
  buildStandings,
  conductOf,
  matchesPeriod,
  statusOf,
  VIOLATION_STATUS,
  submissionStatusOf,
  SUBMISSION_STATUS,
  submissionTargetFor,
  submissionDelta,
  submissionWeekKey,
  weekKeyOf,
  scoresIn,
  isBonus,
  ruleDelta,
} from '../utils/helpers.js'

const field =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

function SubmissionPreview({ submission, rules, students }) {
  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(false)
  const lines = (submission.lines || []).filter((l) => l && l.studentId && l.ruleId)

  return (
    <>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
      >
        <FileText size={13} /> Xem phiếu ({lines.length})
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          {lines.length === 0 && <p className="text-xs text-slate-400">Phiếu trống.</p>}
          <ul className="space-y-1.5">
            {lines.map((l) => {
              const stu = students.find((s) => s.id === l.studentId)
              const rule = ruleMap[l.ruleId]
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-700">{stu ? stu.name : '—'}</span>
                  <span className="text-slate-600">
                    {rule ? rule.name : '—'} <PointsBadge rule={rule} />
                  </span>
                  <span className="text-xs text-slate-400">{violationDateLabel(l.date)}</span>
                  {(l.note || '') && <span className="text-xs text-slate-400">"{l.note}"</span>}
                </li>
              )
            })}
          </ul>
          {submission.rejectedReason && (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600">
              Lý do trả về: {submission.rejectedReason}
            </p>
          )}
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => setView(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Xem toàn màn hình
            </button>
          </div>
        </div>
      )}
      <SubmissionModal
        open={view}
        onClose={() => setView(false)}
        submission={submission}
        mode="view"
        locked={false}
      />
    </>
  )
}

export default function LeaderView() {
  const {
    session,
    students,
    rules,
    violations,
    submissions,
    notify,
    addSubmission,
    updateSubmission,
    deleteSubmission,
    isWeekLocked,
  } = useApp()

  const me = students.find((s) => s.id === session?.id)
  const roleLabel = session?.roleLabel || me?.role || ''
  const manageGroup = session?.manageGroup ?? me?.manageGroup ?? me?.group ?? 0
  const scope = leaderScope(roleLabel, manageGroup, me?.group)
  const isHead = roleLabel === 'Lớp trưởng'
  const targetLabel = isHead ? 'trang quản trị (giáo viên duyệt)' : 'lớp trưởng chốt'

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

  const mySubmissions = useMemo(
    () => submissions.filter((s) => s.createdBy && s.createdBy.id === session?.id),
    [submissions, session],
  )

  const weekOptions = useMemo(() => {
    const map = new Map()
    mySubmissions.forEach((s) => {
      if (s.week) map.set(weekKeyOf(s.week), s.week)
    })
    map.set(weekKeyOf(current), current)
    return [...map.values()].sort((a, b) => b.week - a.week)
  }, [mySubmissions, current])

  const [selWeekKey, setSelWeekKey] = useState(() => weekKeyOf(current))
  const editorWeek = useMemo(
    () => weekOptions.find((w) => weekKeyOf(w) === selWeekKey) || current,
    [weekOptions, selWeekKey, current],
  )
  const weekLocked = isWeekLocked({ year: editorWeek.year, week: editorWeek.week })

  const editableMine = useMemo(
    () =>
      mySubmissions.filter(
        (s) =>
          (submissionStatusOf(s) === 'draft' || submissionStatusOf(s) === 'rejected') &&
          submissionWeekKey(s) === selWeekKey,
      ),
    [mySubmissions, selWeekKey],
  )

  const [activeId, setActiveId] = useState(null)
  const [lines, setLines] = useState([])
  const [form, setForm] = useState({ studentId: '', ruleId: '', date: todayISO(), note: '' })
  const [editingLineId, setEditingLineId] = useState(null)

  useEffect(() => {
    const first = editableMine[0] || null
    setActiveId(first ? first.id : null)
    setLines(first ? first.lines || [] : [])
    setForm({ studentId: '', ruleId: '', date: todayISO(), note: '' })
    setEditingLineId(null)
  }, [editableMine, selWeekKey])

  const activeSubmission = activeId ? mySubmissions.find((s) => s.id === activeId) : null
  const validLines = lines.filter((l) => l && l.studentId && l.ruleId)
  const delta = submissionDelta(lines, ruleMap)

  const now = () => new Date().toISOString()

  const persist = (newLines) => {
    if (activeId) {
      updateSubmission(activeId, { lines: newLines, updatedAt: now() })
    } else {
      const sub = {
        id: `s-${Date.now()}`,
        week: editorWeek,
        scopeGroup: scope.type === 'group' ? scope.group : null,
        createdBy: { id: session?.id, name: session?.name, role: roleLabel },
        status: 'draft',
        lines: newLines,
        createdAt: now(),
        updatedAt: now(),
      }
      addSubmission(sub)
      setActiveId(sub.id)
    }
  }

  const addOrUpdateLine = (e) => {
    e.preventDefault()
    if (weekLocked) return notify('Tuần này đã chốt - không thể thêm.', 'error')
    const { studentId, ruleId, date } = form
    if (!studentId) return notify('Vui lòng chọn học sinh.', 'error')
    if (!ruleId) return notify('Vui lòng chọn lỗi vi phạm hoặc khen thưởng.', 'error')
    if (!date) return notify('Vui lòng chọn ngày.', 'error')
    const line = {
      id: editingLineId || `l-${Date.now()}`,
      studentId,
      ruleId,
      date,
      note: form.note || '',
    }
    const next = editingLineId ? lines.map((l) => (l.id === editingLineId ? line : l)) : [...lines, line]
    setLines(next)
    persist(next)
    setForm({ studentId: '', ruleId: '', date: todayISO(), note: '' })
    setEditingLineId(null)
    notify(editingLineId ? 'Đã cập nhật dòng.' : 'Đã thêm dòng vào phiếu.')
  }

  const editLine = (l) => {
    setEditingLineId(l.id)
    setForm({ studentId: l.studentId, ruleId: l.ruleId, date: l.date, note: l.note || '' })
  }

  const deleteLine = (id) => {
    const next = lines.filter((l) => l.id !== id)
    setLines(next)
    persist(next)
    if (editingLineId === id) {
      setEditingLineId(null)
      setForm({ studentId: '', ruleId: '', date: todayISO(), note: '' })
    }
  }

  const clearEditor = () => {
    setActiveId(null)
    setLines([])
    setForm({ studentId: '', ruleId: '', date: todayISO(), note: '' })
    setEditingLineId(null)
  }

  const handleSaveDraft = () => {
    if (!validLines.length) return notify('Phiếu chưa có dòng nào.', 'error')
    persist(lines)
    notify('Đã lưu nháp phiếu.')
  }

  const handleSend = () => {
    if (!validLines.length) return notify('Phiếu chưa có dòng nào để gửi.', 'error')
    if (weekLocked) return notify('Tuần đã chốt - không thể gửi. Hãy báo giáo viên mở khóa.', 'error')
    const target = submissionTargetFor(roleLabel)
    const submittedAt = now()
    if (activeId) {
      updateSubmission(activeId, { lines, status: target, submittedAt })
    } else {
      addSubmission({
        id: `s-${Date.now()}`,
        week: editorWeek,
        scopeGroup: scope.type === 'group' ? scope.group : null,
        createdBy: { id: session?.id, name: session?.name, role: roleLabel },
        status: target,
        lines,
        createdAt: submittedAt,
        submittedAt,
      })
    }
    notify(
      isHead
        ? `Đã gửi phiếu lên trang quản trị (${validLines.length} dòng).`
        : `Đã gửi phiếu lên lớp trưởng chốt (${validLines.length} dòng).`,
    )
    clearEditor()
  }

  const handleDeleteSubmission = (id) => {
    if (!window.confirm('Xóa phiếu này?')) return
    deleteSubmission(id)
    if (id === activeId) clearEditor()
    notify('Đã xóa phiếu.')
  }

  const loadIntoEditor = (sub) => {
    setSelWeekKey(submissionWeekKey(sub))
    setActiveId(sub.id)
    setLines(sub.lines || [])
    setForm({ studentId: '', ruleId: '', date: todayISO(), note: '' })
    setEditingLineId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const periodScoring = useMemo(
    () => scopeViolations.filter((v) => scoresIn(v) && matchesPeriod(v.date, { type: 'week', ...current })),
    [scopeViolations, current],
  )

  const { rows } = useMemo(
    () => buildStandings(members, rules, violations, { type: 'week', ...current }),
    [members, rules, violations, current],
  )

  const recent = useMemo(
    () => [...scopeViolations].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 15),
    [scopeViolations],
  )

  const top = rows[0]
  const avgScore = members.length ? (rows.reduce((s, r) => s + r.score, 0) / members.length).toFixed(1) : '0'
  const periodDelta = periodScoring.reduce((s, v) => s + ruleDelta(ruleMap[v.ruleId]), 0)

  const statPending = mySubmissions.filter((s) => ['pendingLeader', 'pendingAdmin'].includes(submissionStatusOf(s))).length
  const statApproved = mySubmissions.filter((s) => submissionStatusOf(s) === 'approved').length
  const statDrafting = mySubmissions.filter((s) => ['draft', 'rejected'].includes(submissionStatusOf(s))).length

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Điều hành lớp</p>
          <h2 className="mt-1 text-xl font-extrabold md:text-2xl">
            {roleLabel} · {scopeLabel(scope)}
          </h2>
          <p className="mt-1 text-sm text-indigo-100">
            Ghi nhận vi phạm, tổng hợp theo tuần thành phiếu rồi gửi lên {targetLabel}.
          </p>
        </div>
        <div className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur">
          {session?.name} {me && `· ${me.code}`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Thành viên" value={members.length} icon={Users} color="indigo" />
        <StatCard label="Ghi nhận đã duyệt (tuần)" value={periodScoring.length} icon={AlertTriangle} color={periodScoring.length ? 'rose' : 'emerald'} />
        <StatCard label="Điểm TB" value={avgScore} icon={Trophy} color="amber" />
        <StatCard label="Điểm thay đổi tuần" value={`${periodDelta >= 0 ? '+' : ''}${periodDelta}`} icon={Lock} color={periodDelta >= 0 ? 'emerald' : 'rose'} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Phiếu soạn dở" value={statDrafting} icon={FileText} color="slate" />
        <StatCard label="Phiếu đang chờ duyệt" value={statPending} icon={Send} color="sky" />
        <StatCard label="Phiếu đã duyệt" value={statApproved} icon={Check} color="emerald" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Phiếu tổng hợp theo tuần</h3>
              <p className="text-xs text-slate-400">
                Soạn nhiều vi phạm trong tuần thành 1 phiếu, sau đó gửi lên {targetLabel}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-slate-400" />
            <select value={selWeekKey} onChange={(e) => setSelWeekKey(e.target.value)} className={field}>
              {weekOptions.map((w) => (
                <option key={weekKeyOf(w)} value={weekKeyOf(w)}>
                  {weekLabel(w)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs leading-relaxed text-indigo-800">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" />
          <p>
            Phiếu bắt đầu ở trạng thái <b>Đang soạn</b> (chưa tính điểm).{' '}
            {isHead ? (
              <>
                Khi bấm <b>Gửi phiếu</b>, phiếu lên thẳng <b>trang quản trị</b> để giáo viên duyệt lần cuối.
              </>
            ) : (
              <>
                Khi bấm <b>Gửi phiếu</b>, phiếu đến <b>lớp trưởng</b> xem, chỉnh sửa và chốt, sau đó tự chuyển lên{' '}
                <b>trang quản trị</b>. Giáo viên duyệt xong điểm mới được tính.
              </>
            )}
          </p>
        </div>

        {weekLocked && (
          <p className="mb-3 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            <Lock size={14} /> {weekLabel(editorWeek)} đã chốt - không thể thêm/sửa/gửi. Hãy báo giáo viên mở khóa.
          </p>
        )}

        <form onSubmit={addOrUpdateLine} className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            {editingLineId ? 'Sửa dòng vi phạm' : 'Thêm dòng vi phạm / khen thưởng'}
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className={field}
            >
              <option value="">-- Học sinh --</option>
              {members.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            <select
              value={form.ruleId}
              onChange={(e) => setForm({ ...form, ruleId: e.target.value })}
              className={field}
            >
              <option value="">-- Lỗi / khen thưởng --</option>
              <optgroup label="Trừ điểm">
                {rules.filter((r) => !isBonus(r)).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (-{r.points}đ)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Cộng điểm">
                {rules.filter((r) => isBonus(r)).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (+{r.points}đ)
                  </option>
                ))}
              </optgroup>
            </select>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={field}
            />
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ghi chú (tùy chọn)"
              className={field}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {form.studentId && (
              <p className="text-[11px] text-slate-400">
                {weekdayName(form.date)} · {form.date ? weekLabel(isoWeekInfo(form.date)) : ''}
              </p>
            )}
            <div className="flex gap-2">
              {editingLineId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLineId(null)
                    setForm({ studentId: '', ruleId: '', date: todayISO(), note: '' })
                  }}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Hủy sửa
                </button>
              )}
              <button
                type="submit"
                disabled={weekLocked}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
              >
                {editingLineId ? <Pencil size={15} /> : <Plus size={15} />}
                {editingLineId ? 'Lưu dòng' : 'Thêm dòng'}
              </button>
            </div>
          </div>
        </form>

        <div className="rounded-xl border border-slate-100 bg-white">
          {validLines.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Phiếu chưa có dòng nào. Thêm vi phạm / khen thưởng ở trên.
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {lines.map((l) => {
                if (!l || !l.studentId) return null
                const stu = members.find((s) => s.id === l.studentId)
                const rule = ruleMap[l.ruleId]
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                    <span className="min-w-[130px] font-semibold text-slate-700">{stu ? stu.name : '—'}</span>
                    <span className="flex-1 text-slate-600">
                      {rule ? rule.name : '—'} <PointsBadge rule={rule} />
                    </span>
                    <span className="text-xs text-slate-400">{violationDateLabel(l.date)}</span>
                    {(l.note || '') && <span className="text-xs text-slate-400">"{l.note}"</span>}
                    <span className="flex items-center gap-0.5">
                      <button
                        onClick={() => editLine(l)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        title="Sửa"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteLine(l.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {validLines.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500">
                {validLines.length} dòng · Thay đổi điểm: {delta >= 0 ? '+' : ''}
                {delta}đ
              </p>
              <div className="flex flex-wrap gap-2">
                {activeSubmission && submissionStatusOf(activeSubmission) === 'draft' && (
                  <button
                    onClick={() => handleDeleteSubmission(activeSubmission.id)}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={13} /> Xóa phiếu
                  </button>
                )}
                <button
                  onClick={handleSaveDraft}
                  disabled={weekLocked}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Lưu nháp
                </button>
                <button
                  onClick={handleSend}
                  disabled={weekLocked}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Send size={14} /> Gửi phiếu lên {targetLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-800">Các phiếu của bạn ({mySubmissions.length})</h3>
          <p className="text-xs text-slate-400">Theo dõi trạng thái phiếu đã tạo.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Tuần</th>
                <th className="px-4 py-3 font-semibold">Phạm vi</th>
                <th className="px-4 py-3 text-center font-semibold">Số dòng</th>
                <th className="px-4 py-3 text-right font-semibold">Điểm thay đổi</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {mySubmissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    Bạn chưa tạo phiếu tổng hợp nào.
                  </td>
                </tr>
              )}
              {mySubmissions.map((s) => {
                const st = submissionStatusOf(s)
                const cnt = (s.lines || []).filter((l) => l && l.studentId && l.ruleId).length
                return (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {s.week ? weekLabel(s.week) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {s.scopeGroup ? `Tổ ${s.scopeGroup}` : 'Cả lớp'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-500">{cnt}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                      {submissionDelta(s.lines, ruleMap) >= 0 ? '+' : ''}
                      {submissionDelta(s.lines, ruleMap)}đ
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${SUBMISSION_STATUS[st].cls}`}>
                        {SUBMISSION_STATUS[st].label}
                      </span>
                      {st === 'rejected' && s.rejectedReason && (
                        <p className="mt-1 max-w-[180px] truncate text-[11px] text-rose-500" title={s.rejectedReason}>
                          {s.rejectedReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {st === 'draft' && (
                          <button
                            onClick={() => loadIntoEditor(s)}
                            className="rounded-lg px-2 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                          >
                            Soạn tiếp
                          </button>
                        )}
                        {st === 'rejected' && (
                          <button
                            onClick={() => loadIntoEditor(s)}
                            className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                          >
                            Sửa & gửi lại
                          </button>
                        )}
                        {st === 'draft' && (
                          <button
                            onClick={() => handleDeleteSubmission(s.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Xóa phiếu"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <SubmissionPreview submission={s} rules={rules} students={students} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-800">Xếp hạng thi đua {weekLabel(current)} trong {scopeLabel(scope)}</h3>
          {top && <span className="text-xs font-semibold text-slate-400">Dẫn đầu: {top.student.name} ({top.score}đ)</span>}
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h3 className="font-bold text-slate-800">Vi phạm / khen thưởng đã duyệt gần đây trong {scopeLabel(scope)}</h3>
          <p className="text-xs text-slate-400">Chỉ hiện các ghi nhận đã được quản trị duyệt (đã tính điểm).</p>
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
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Chưa có ghi nhận nào được duyệt.
                  </td>
                </tr>
              )}
              {recent.map((v) => {
                const stu = students.find((s) => s.id === v.studentId)
                const rule = ruleMap[v.ruleId]
                return (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{violationDateLabel(v.date)}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{stu ? stu.name : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{rule ? rule.name : '—'}</td>
                    <td className="px-4 py-2.5">
                      <PointsBadge rule={rule} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{v.by || 'Nhập tay'}</td>
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