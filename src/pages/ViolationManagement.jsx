import { useMemo, useState } from 'react'
import { Pencil, Trash2, CalendarDays, Search, Check, Lock, LockOpen, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Modal from '../components/Modal.jsx'
import {
  todayISO,
  formatDate,
  weekLabel,
  isoWeekInfo,
  availableWeeks,
  matchesPeriod,
  statusOf,
  VIOLATION_STATUS,
} from '../utils/helpers.js'

function ViolationForm({ initial, onSave, onCancel, onError }) {
  const { students, rules, isWeekLocked } = useApp()
  const [form, setForm] = useState(() => ({
    studentId: initial ? initial.studentId : '',
    ruleId: initial ? initial.ruleId : '',
    date: initial ? initial.date : todayISO(),
    note: initial ? initial.note || '' : '',
  }))

  const rule = rules.find((r) => r.id === form.ruleId)
  const stu = students.find((s) => s.id === form.studentId)
  const week = form.date ? isoWeekInfo(form.date) : null
  const locked = week ? isWeekLocked(week) : false

  const submit = (e) => {
    e.preventDefault()
    if (!form.studentId) return onError('Vui lòng chọn học sinh.')
    if (!form.ruleId) return onError('Vui lòng chọn lỗi vi phạm.')
    if (!form.date) return onError('Vui lòng chọn ngày vi phạm.')
    if (locked)
      return onError(`Tuần này đã được chốt (${weekLabel(week)}). Không thể thêm/sửa vi phạm. Hãy mở khóa tuần trước.`)
    onSave(form)
  }

  const field =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Học sinh *</label>
          <select
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            className={field}
          >
            <option value="">-- Chọn học sinh --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code}) - {s.role}
              </option>
            ))}
          </select>
          {stu && (
            <p className="mt-1 text-[11px] text-slate-400">
              Đang chọn: <span className="font-semibold text-slate-600">{stu.name}</span> - Tổ {stu.group}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Lỗi vi phạm *</label>
          <select
            value={form.ruleId}
            onChange={(e) => setForm({ ...form, ruleId: e.target.value })}
            className={field}
          >
            <option value="">-- Chọn lỗi vi phạm --</option>
            {rules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (-{r.points} điểm)
              </option>
            ))}
          </select>
          {rule && (
            <p className="mt-1 text-[11px] text-slate-400">
              Điểm trừ: <span className="font-bold text-rose-500">-{rule.points} điểm</span>
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
              <Lock size={12} /> Tuần này đã chốt - không được sửa/xóa
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
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700"
        >
          <Check size={16} />
          {initial ? 'Cập nhật' : 'Ghi nhận vi phạm'}
        </button>
      </div>
    </form>
  )
}

export default function ViolationManagement() {
  const { session, students, rules, violations, notify, addViolation, updateViolation, deleteViolation, lockWeek, unlockWeek, isWeekLocked } = useApp()

  const [search, setSearch] = useState('')
  const [weekFilter, setWeekFilter] = useState('current')
  const [ruleFilter, setRuleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formKey, setFormKey] = useState(0)

  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])
  const weeks = useMemo(() => availableWeeks(violations), [violations])
  const current = isoWeekInfo(todayISO())

  const period = useMemo(() => {
    if (weekFilter === 'current') return { type: 'week', ...current }
    if (weekFilter === 'all') return { type: 'all' }
    const [y, w] = weekFilter.split('-W')
    return { type: 'week', year: Number(y), week: Number(w) }
  }, [weekFilter, current])

  const selectedLocked = period.type === 'week' ? isWeekLocked({ year: period.year, week: period.week }) : false

  const handleLock = () => {
    if (!window.confirm(`Xác nhận chốt ${weekLabel({ year: period.year, week: period.week })}?\n\nVi phạm tuần này sẽ được lưu làm bằng chứng và không thể sửa/xóa. Bạn có thể mở khóa lại khi cần.`)) return
    lockWeek(period.year, period.week)
    notify(`Đã chốt ${weekLabel({ year: period.year, week: period.week })}. Vi phạm không thể sửa/xóa.`)
  }

  const handleUnlock = () => {
    if (!window.confirm(`Mở khóa ${weekLabel({ year: period.year, week: period.week })}?\n\nVi phạm tuần này sẽ có thể sửa/xóa trở lại.`)) return
    unlockWeek(period.year, period.week)
    notify('Đã mở khóa tuần.')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...violations]
      .filter((v) => matchesPeriod(v.date, period))
      .filter((v) => ruleFilter === 'all' || v.ruleId === ruleFilter)
      .filter((v) => statusFilter === 'all' || statusOf(v) === statusFilter)
      .filter((v) => {
        if (!q) return true
        const stu = students.find((s) => s.id === v.studentId)
        const rule = ruleMap[v.ruleId]
        return (
          (stu && (stu.name.toLowerCase().includes(q) || String(stu.code || '').includes(q))) ||
          (rule && rule.name.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [violations, students, ruleMap, search, ruleFilter, statusFilter, period])

  const totalInPeriod = filtered.reduce((s, v) => s + (ruleMap[v.ruleId]?.points || 0), 0)

  const weekCount = violations.filter((v) => matchesPeriod(v.date, { type: 'week', ...current })).length

  const openEdit = (v) => {
    setEditing(v)
    setModalOpen(true)
  }

  const handleSaveNew = (formData) => {
    addViolation({
      ...formData,
      id: `v-${Date.now()}`,
      status: 'approved',
      by: session?.name || 'Giáo viên',
      byId: session?.id || null,
      byRole: session?.role === 'admin' ? 'Giáo viên' : null,
    })
    notify(`Đã ghi nhận vi phạm cho ${students.find((s) => s.id === formData.studentId)?.name || ''}.`)
    setFormKey((k) => k + 1)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <Check size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Ghi nhận vi phạm mới</h3>
            <p className="text-xs text-slate-400">Chọn học sinh → chọn lỗi → chọn ngày/tuần → ghi chú.</p>
          </div>
        </div>
        <ViolationForm
          key={formKey}
          initial={null}
          onError={(msg) => notify(msg, 'error')}
          onSave={handleSaveNew}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Vi phạm tuần này</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">{weekCount} lỗi</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Vi phạm trong kỳ lọc</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">{filtered.length} lỗi</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Tổng điểm trừ (kỳ lọc)</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-600">-{totalInPeriod}đ</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Danh mục lỗi hiện có</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-800">{rules.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, mã HS, loại lỗi..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={weekFilter}
              onChange={(e) => setWeekFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="current">Tuần hiện tại</option>
              {weeks
                .filter((w) => !(w.year === current.year && w.week === current.week))
                .map((w) => (
                  <option key={`${w.year}-W${w.week}`} value={`${w.year}-W${w.week}`}>
                    {weekLabel(w)}
                  </option>
                ))}
              <option value="all">Tất cả</option>
            </select>
            <select
              value={ruleFilter}
              onChange={(e) => setRuleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="all">Tất cả lỗi</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (-{r.points}đ)
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.values(VIOLATION_STATUS).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {period.type === 'week' &&
              (selectedLocked ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700">
                    <Lock size={14} /> Tuần đã chốt
                  </span>
                  <button
                    onClick={handleUnlock}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <LockOpen size={14} /> Mở khóa
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLock}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow transition hover:bg-indigo-700"
                >
                  <Lock size={14} /> Chốt tuần này
                </button>
              ))}
          </div>
        </div>

        {period.type === 'week' && selectedLocked && (
          <div className="flex items-center gap-2.5 border-b border-amber-100 bg-amber-50/70 px-4 py-3 text-sm font-semibold text-amber-700">
            <ShieldCheck size={18} />
            Tuần này đã được chốt làm bằng chứng - vi phạm không thể thêm mới, sửa hoặc xóa cho tới khi mở khóa.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Ngày / Tuần</th>
                <th className="px-4 py-3 font-semibold">Học sinh</th>
                <th className="px-4 py-3 font-semibold">Lỗi vi phạm</th>
                <th className="px-4 py-3 font-semibold">Điểm</th>
                <th className="px-4 py-3 font-semibold">Ghi chú</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Không có vi phạm nào trong kỳ này.
                  </td>
                </tr>
              )}
              {filtered.map((v) => {
                const rule = ruleMap[v.ruleId]
                const stu = students.find((s) => s.id === v.studentId)
                const w = v.date ? isoWeekInfo(v.date) : null
                const lockedRow = w ? isWeekLocked(w) : false
                return (
                  <tr
                    key={v.id}
                    className={`border-b border-slate-50 transition-colors last:border-0 ${
                      lockedRow ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1.5 font-medium text-slate-700">
                        {formatDate(v.date)}
                        {lockedRow && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            <Lock size={10} /> Đã chốt
                          </span>
                        )}
                      </p>
                      {w && <p className="text-[11px] text-slate-400">{weekLabel(w)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">{stu ? stu.name : '—'}</p>
                      <p className="text-[11px] text-slate-400">{stu ? `${stu.code} · Tổ ${stu.group}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{rule ? rule.name : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600">
                        -{rule ? rule.points : 0}đ
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-xs text-slate-400">{v.note || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                          VIOLATION_STATUS[statusOf(v)].cls
                        }`}
                      >
                        {VIOLATION_STATUS[statusOf(v)].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lockedRow ? (
                        <div className="flex justify-end text-amber-500" title="Vi phạm thuộc tuần đã chốt">
                          <Lock size={16} />
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(v)}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            title="Sửa"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Xóa vi phạm này?')) {
                                deleteViolation(v.id)
                                notify('Đã xóa vi phạm.')
                              }
                            }}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Sửa vi phạm" size="lg">
        <ViolationForm
          key={editing ? editing.id : 'none'}
          initial={editing}
          onError={(msg) => notify(msg, 'error')}
          onCancel={() => setModalOpen(false)}
          onSave={(formData) => {
            if (editing) {
              updateViolation(editing.id, formData)
              notify('Đã cập nhật vi phạm.')
            }
            setModalOpen(false)
          }}
        />
      </Modal>
    </div>
  )
}