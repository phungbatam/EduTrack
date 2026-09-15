import { useMemo, useState } from 'react'
import { Brush, Droplets, CalendarRange, ChevronRight, Check, Plus, Trash2, Hammer } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Modal from '../components/Modal.jsx'
import {
  weekLabel,
  availableWeeks,
  currentWeek,
  isoWeekInfo,
  studentWeekSanction,
  violationPenaltyInfo,
  penaltyFormOf,
  PENALTY_FORMS,
  PENALTY_LABOR_POINTS,
  violationDateLabel,
  scoresIn,
  todayISO,
  submissionTargetFor,
} from '../utils/helpers.js'

export default function PenaltyView() {
  const { session, students, rules, violations, penalties, setPenalty, deletePenalty, addSubmission, notify } = useApp()
  const [weekSel, setWeekSel] = useState(() => {
    const c = currentWeek()
    return `${c.year}-W${c.week}`
  })

  const weeks = useMemo(() => availableWeeks(violations), [violations])
  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])

  const [yw, wkn] = useMemo(() => {
    const parts = weekSel.split('-W')
    return [Number(parts[0]), Number(parts[1])]
  }, [weekSel])
  const week = { type: 'week', year: yw, week: wkn }

  const rows = useMemo(() => {
    const auto = []
    students.forEach((stu) => {
      const s = studentWeekSanction(violations, stu.id, week, ruleMap)
      if (s.type === 'none') return
      const details = violations
        .filter((v) => v && scoresIn(v) && v.studentId === stu.id && (() => { const w = isoWeekInfo(v.date); return w && w.year === yw && w.week === wkn })())
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      const entry = penalties.find((p) => !p.manual && p.studentId === stu.id && p.year === yw && p.week === wkn) || null
      auto.push({ id: `a-${stu.id}`, student: stu, sanction: s, details, manual: false, entry })
    })
    const manual = penalties
      .filter((p) => p.manual && p.year === yw && p.week === wkn)
      .map((p) => {
        const stu = students.find((s) => s.id === p.studentId)
        if (!stu) return null
        const type = p.form === 'labor' ? 'labor' : 'duty'
        const sanction = { type, points: 0, dutyDays: type === 'duty' ? (p.days || 1) : 0, laborDays: type === 'labor' ? (p.days || 1) : 0 }
        return { id: `m-${p.id}`, student: stu, sanction, details: [], manual: true, entry: p }
      })
      .filter(Boolean)
    return [...auto, ...manual].sort((a, b) => {
      const order = { labor: 0, duty: 1 }
      if (order[a.sanction.type] !== order[b.sanction.type]) return order[a.sanction.type] - order[b.sanction.type]
      return a.student.name.localeCompare(b.student.name, 'vi')
    })
  }, [students, violations, penalties, ruleMap, week, yw, wkn])

  const totals = useMemo(
    () =>
      rows.reduce(
        (t, r) => {
          if (r.sanction.type === 'duty') t.dutyCount += 1
          else if (r.sanction.type === 'labor') t.laborCount += 1
          return t
        },
        { dutyCount: 0, laborCount: 0 },
      ),
    [rows],
  )

  const save = (row, patch) => {
    const e = row.entry
    setPenalty({
      studentId: row.student.id,
      year: yw,
      week: wkn,
      manual: row.manual,
      form: row.sanction.type === 'labor' ? 'labor' : 'duty',
      dutyDone: patch.dutyDone != null ? Boolean(patch.dutyDone) : Boolean(e && e.dutyDone),
      laborDone: patch.laborDone != null ? Boolean(patch.laborDone) : Boolean(e && e.laborDone),
      laborDays: patch.laborDays != null ? Number(patch.laborDays) : (e && e.laborDays != null ? e.laborDays : 1),
      days: patch.days != null ? Math.max(1, Number(patch.days) || 1) : (e && e.days != null ? e.days : 1),
      note: (e && e.note) || '',
    })
  }

  const updateDays = (row, value) => {
    if (row.manual) save(row, { days: Number(value) })
    else save(row, { laborDays: Number(value) })
  }

  const toggleDone = (row) => {
    const isLabor = row.sanction.type === 'labor'
    const done = isLabor ? Boolean(row.entry && row.entry.laborDone) : Boolean(row.entry && row.entry.dutyDone)
    save(row, { [isLabor ? 'laborDone' : 'dutyDone']: !done })
    notify(
      (!done ? 'Đã đánh dấu hoàn thành ' : 'Bỏ đánh dấu ') +
        (isLabor ? 'lao động: ' : 'trực nhật: ') +
        row.student.name,
    )
  }

  const isAdmin = session && session.role === 'admin'
  const isLaborRole = session && session.role !== 'admin' && session.roleLabel === 'Lớp phó lao động'
  const isAcademicRole = session && session.role !== 'admin' && session.roleLabel === 'Lớp phó học tập'
  const canManage = isAdmin || isLaborRole || isAcademicRole

  // Quy định có hình thức phạt tương ứng để tạo dòng vi phạm gửi lên Lớp trưởng duyệt
  const rulesByForm = useMemo(() => {
    const map = { duty: null, labor: null }
    rules.forEach((r) => {
      if (penaltyFormOf(r) === 'duty' && !map.duty) map.duty = r
      if (penaltyFormOf(r) === 'labor' && !map.labor) map.labor = r
    })
    return map
  }, [rules])

  const [modalOpen, setModalOpen] = useState(false)
  const [mForm, setMForm] = useState({ studentId: '', form: 'duty', days: 1, date: todayISO(), note: '' })

  const selectedRule = rulesByForm[mForm.form]

  const openManual = () => {
    setMForm({ studentId: '', form: 'duty', days: 1, date: todayISO(), note: '' })
    setModalOpen(true)
  }

  const submitPenaltyViolation = (e) => {
    e.preventDefault()
    if (!mForm.studentId) return notify('Vui lòng chọn học sinh.', 'error')
    if (!mForm.date) return notify('Vui lòng chọn ngày vi phạm.', 'error')
    if (!selectedRule) return notify(`Chưa có quy định nào mang hình thức phạt ${PENALTY_FORMS[mForm.form].label}. Hãy để giáo viên tạo trong "Danh mục lỗi vi phạm".`, 'error')
    const stu = students.find((s) => s.id === mForm.studentId)
    const formLabel = PENALTY_FORMS[mForm.form].label.toLowerCase()
    const days = Math.max(1, Number(mForm.days) || 1)
    const target = isAdmin ? 'pendingAdmin' : submissionTargetFor(session && session.roleLabel)
    const now = new Date().toISOString()
    const sub = {
      id: `s-${Date.now()}`,
      week: week,
      scopeGroup: null,
      createdBy: { id: session && session.id, name: session && session.name, role: session && session.roleLabel },
      status: target,
      lines: [
        {
          id: `l-${Date.now()}`,
          studentId: mForm.studentId,
          ruleId: selectedRule.id,
          date: mForm.date,
          note: mForm.note || `Phạt ${formLabel} ${days} ngày (${session && session.roleLabel ? session.roleLabel : 'Giáo viên'} ghi)`,
        },
      ],
      createdAt: now,
      submittedAt: now,
    }
    addSubmission(sub)
    notify(
      isAdmin
        ? `Đã ghi phạt ${formLabel} ${days} ngày cho ${stu ? stu.name : ''}. Vào "Duyệt phiếu" để duyệt tính điểm.`
        : `Đã gửi phiếu phạt ${formLabel} ${days} ngày cho ${stu ? stu.name : ''} lên Lớp trưởng duyệt.`,
    )
    setMForm({ studentId: '', form: 'duty', days: 1, date: todayISO(), note: '' })
    setModalOpen(false)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <Brush size={18} className="text-sky-500" />
              Trực nhật – Lao động theo tuần
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Số lần vi phạm để tăng ngày phạt đếm trong tuần và <b>reset khi sang tuần mới</b>; vi phạm tuần cũ vẫn
              lưu trong lịch sử.{' '}
              {canManage && !isAdmin
                ? 'Bạn có thể ghi phạt — phiếu sẽ được gửi lên Lớp trưởng duyệt, sau khi duyệt học sinh tự xuất hiện trong danh sách.'
                : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                onClick={() => openManual()}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow transition hover:bg-emerald-700"
              >
                <Hammer size={14} /> Ghi phạt & gửi Lớp trưởng
              </button>
            )}
            <CalendarRange size={16} className="text-slate-400" />
            <select value={weekSel} onChange={(e) => setWeekSel(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
              {weeks.map((w) => (
                <option key={`${w.year}-W${w.week}`} value={`${w.year}-W${w.week}`}>
                  {weekLabel(w)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Học sinh phạt trực nhật</p>
            <p className="mt-1 text-xl font-extrabold text-sky-600">{totals.dutyCount}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Học sinh đi lao động</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-600">{totals.laborCount}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 lg:col-span-2">
            <p className="text-xs text-slate-500">Quy tắc ngưỡng</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Tổng điểm vi phạm trong tuần <b className="text-rose-600">≥ {PENALTY_LABOR_POINTS}</b> điểm → đi lao
              động 1 ngày (sửa được tay); dưới ngưỡng → trực nhật theo cấp số nhân trong tuần.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h3 className="flex items-center gap-2 font-bold text-slate-800">
            <Droplets size={18} className="text-sky-500" /> Danh sách {weekLabel(week)}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Học sinh</th>
                <th className="px-4 py-3 font-semibold">Điểm tuần</th>
                <th className="px-4 py-3 font-semibold">Hình phạt</th>
                <th className="px-4 py-3 font-semibold">Chi tiết lỗi</th>
                <th className="px-4 py-3 font-semibold">Hoàn thành</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    Tuần này không có học sinh nào bị phạt trực nhật hoặc lao động.
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const { student, sanction, details, manual, entry } = row
                const isLabor = sanction.type === 'labor'
                const days = isLabor
                  ? manual
                    ? (entry && entry.days != null ? entry.days : 1)
                    : (entry && entry.laborDays != null ? entry.laborDays : sanction.laborDays || 1)
                  : sanction.dutyDays
                const done = isLabor ? Boolean(entry && entry.laborDone) : Boolean(entry && entry.dutyDone)
                return (
                  <tr key={row.id} className={`border-b border-slate-50 last:border-0 ${done ? 'bg-emerald-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1.5 font-semibold text-slate-700">
                        {student.name}
                        {manual && (
                          <span className="inline-block whitespace-nowrap rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">
                            Phạt thủ công
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400">{student.code} · Tổ {student.group}</p>
                    </td>
                    <td className="px-4 py-3">
                      {manual ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : (
                        <span className={`font-extrabold ${sanction.points >= PENALTY_LABOR_POINTS ? 'text-rose-600' : 'text-slate-700'}`}>
                          {sanction.points}
                        </span>
                      )}
                      {!manual && <span className="text-xs text-slate-400"> đ</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold ${PENALTY_FORMS[isLabor ? 'labor' : 'duty'].cls}`}>
                          {isLabor ? `Đi lao động ${days} ngày` : `Trực nhật ${days} ngày`}
                        </span>
                        {canManage && (isLabor || manual) && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            sửa:
                            <input
                              type="number"
                              min={1}
                              value={days || 1}
                              onChange={(ev) => updateDays(row, Number(ev.target.value))}
                              className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-emerald-400"
                              title="Số ngày phạt"
                            />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {manual ? (
                        <ul className="space-y-0.5">
                          <li className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <ChevronRight size={11} className="text-slate-300" />
                            {entry && entry.note ? entry.note : 'Phạt thủ công do lớp phó lao động / giáo viên gán.'}
                          </li>
                          {entry && entry.updatedBy && (
                            <li className="text-[10px] text-slate-400">
                              Gán bởi: {entry.updatedBy} · {new Date(entry.updatedAt).toLocaleString('vi-VN')}
                            </li>
                          )}
                        </ul>
                      ) : (
                        <ul className="space-y-0.5">
                          {details.map((v) => {
                            const rule = ruleMap[v.ruleId]
                            const pinfo = violationPenaltyInfo(violations, v, ruleMap)
                            return (
                              <li key={v.id} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <ChevronRight size={11} className="text-slate-300" />
                                {violationDateLabel(v.date)}: {rule ? rule.name : '—'} (-{rule ? rule.points : 0}đ)
                                {pinfo && (
                                  <span className={`inline-block rounded border px-1 py-0.5 text-[9px] font-bold ${PENALTY_FORMS[pinfo.form].cls}`}>
                                    {PENALTY_FORMS[pinfo.form].label} {pinfo.days} ngày
                                  </span>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleDone(row)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                          done
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
                        }`}
                      >
                        <Check size={14} />
                        {done ? 'Đã xong' : isLabor ? 'Đã đi lao động?' : 'Đã làm trực nhật?'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {manual && canManage && row.entry && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Hủy phạt thủ công (${isLabor ? 'đi lao động' : 'trực nhật'}) cho ${student.name}?`)) {
                                deletePenalty(row.entry.id)
                                notify('Đã hủy phạt thủ công.')
                              }
                            }}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="Hủy phạt thủ công"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400">
            {canManage && !isAdmin
              ? 'Vi phạm/ phạt do bạn ghi sẽ được gửi lên Lớp trưởng duyệt; khi được duyệt học sinh tự xuất hiện trong danh sách này. Bạn có thể sửa số ngày và đánh dấu hoàn thành.'
              : 'Danh sách tự động từ vi phạm đã duyệt. Giáo viên có thể ghi phạt gửi Lớp trưởng duyệt, sửa số ngày và đánh dấu hoàn thành.'}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ghi phạt & gửi Lớp trưởng duyệt" size="sm">
        <form onSubmit={submitPenaltyViolation} className="space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-xs leading-relaxed text-indigo-800">
            Vi phạm sẽ được tạo thành <b>phiếu phạt</b> và gửi lên <b>Lớp trưởng</b> duyệt. Khi được Lớp trưởng chốt
            và giáo viên duyệt, học sinh sẽ <b>tự động xuất hiện</b> trong Trực nhật – Lao động theo tuần.
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Học sinh *</label>
            <select
              value={mForm.studentId}
              onChange={(e) => setMForm({ ...mForm, studentId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">-- Chọn học sinh --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - Tổ {s.group}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Hình thức phạt *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'duty', label: 'Trực nhật', cls: 'text-sky-600' },
                { value: 'labor', label: 'Đi lao động', cls: 'text-emerald-600' },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setMForm({ ...mForm, form: o.value })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                    mForm.form === o.value ? `border-current ${o.cls} bg-slate-50` : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Tương ứng lỗi vi phạm:{' '}
              <span className="font-semibold text-slate-600">{selectedRule ? `"${selectedRule.name}" (${selectedRule.points}đ)` : `Chưa có quy định ${PENALTY_FORMS[mForm.form].label.toLowerCase()} - báo giáo viên tạo trong "Danh mục lỗi vi phạm"`}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ngày vi phạm *</label>
              <input
                type="date"
                value={mForm.date}
                onChange={(e) => setMForm({ ...mForm, date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Số ngày phạt *</label>
              <input
                type="number"
                min={1}
                max={30}
                value={mForm.days}
                onChange={(e) => setMForm({ ...mForm, days: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Lý do / ghi chú</label>
            <textarea
              value={mForm.note}
              onChange={(e) => setMForm({ ...mForm, note: e.target.value })}
              rows={2}
              placeholder="Ví dụ: Vắng buổi vệ sinh ngày 10/09, trực nhật bù..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!mForm.studentId}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus size={16} /> {isAdmin ? 'Ghi phạt' : 'Gửi lên Lớp trưởng'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}