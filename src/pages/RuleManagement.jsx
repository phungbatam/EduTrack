import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ClipboardList, AlertCircle, Award } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Modal from '../components/Modal.jsx'
import { isBonus, penaltyFormOf, PENALTY_FORMS } from '../utils/helpers.js'

function penaltySequence(chargeBase, chargeRatio, count = 5) {
  const base = Math.max(1, Number(chargeBase) || 1)
  const ratio = Math.max(1, Number(chargeRatio) || 2)
  return Array.from({ length: count }, (_, k) => base * Math.pow(ratio, k)).map((d) => Math.round(d))
}

function RuleForm({ initial, onSave, onCancel, onError }) {
  const [name, setName] = useState(initial ? initial.name : '')
  const [kind, setKind] = useState(initial ? initial.kind : 'deduct')
  const [points, setPoints] = useState(initial ? String(initial.points) : '2')
  const [penaltyForm, setPenaltyForm] = useState(initial ? initial.penaltyForm || '' : '')
  const [chargeBase, setChargeBase] = useState(initial && initial.chargeBase ? String(initial.chargeBase) : '1')
  const [chargeRatio, setChargeRatio] = useState(initial && initial.chargeRatio ? String(initial.chargeRatio) : '2')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return onError('Vui lòng nhập tên.')
    const p = parseInt(points, 10)
    if (!p || p < 1 || p > 100) return onError('Điểm phải là số nguyên dương (1-100).')
    if (kind === 'deduct') {
      if (penaltyForm) {
        if (!chargeBase || Number(chargeBase) < 1) return onError('Số ngày lần đầu phải từ 1 trở lên.')
        if (!chargeRatio || Number(chargeRatio) < 1) return onError('Hệ số nhân phải từ 1 trở lên.')
      }
      onSave({
        name: name.trim(),
        points: p,
        kind,
        penaltyForm: penaltyForm || null,
        chargeBase: penaltyForm ? Math.max(1, Number(chargeBase) || 1) : null,
        chargeRatio: penaltyForm ? Math.max(1, Number(chargeRatio) || 2) : null,
      })
    } else {
      onSave({ name: name.trim(), points: p, kind, penaltyForm: null, chargeBase: null, chargeRatio: null })
    }
  }

  const field =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tên *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
          placeholder={kind === 'deduct' ? 'Ví dụ: Không đeo khăn quàng' : 'Ví dụ: Đạt giải trong hoạt động của trường'}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Loại *</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
          <option value="deduct">Trừ điểm (vi phạm)</option>
          <option value="bonus">Cộng điểm (khen thưởng)</option>
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          {kind === 'deduct'
            ? 'Bị ghi khi học sinh vi phạm quy định, làm giảm điểm thi đua.'
            : 'Được ghi khi học sinh được khen thưởng, làm tăng điểm thi đua.'}
        </p>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Số điểm *</label>
        <input
          type="number"
          min={1}
          max={100}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          className={field}
          placeholder="Ví dụ: 2"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Mỗi học sinh bắt đầu từ 100 điểm/ngày; bị trừ theo lỗi hoặc được cộng thêm khi khen thưởng.
        </p>
      </div>
      {kind === 'deduct' && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Hình thức phạt ngoài điểm (tùy chọn)</label>
          <select value={penaltyForm} onChange={(e) => setPenaltyForm(e.target.value)} className={field}>
            <option value="">Chỉ trừ điểm, không phạt thêm</option>
            <option value="duty">Trực nhật (tính theo ngày)</option>
            <option value="labor">Đi lao động (tính theo ngày)</option>
          </select>
          {penaltyForm ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Số ngày lần đầu</label>
                  <input
                    type="number"
                    min={1}
                    value={chargeBase}
                    onChange={(e) => setChargeBase(e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Hệ số nhân</label>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    value={chargeRatio}
                    onChange={(e) => setChargeRatio(e.target.value)}
                    className={field}
                  />
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-white px-3 py-2 text-[11px] text-slate-500">
                {PENALTY_FORMS[penaltyForm].label} theo lần vi phạm cùng quy định:{' '}
                <b className="font-bold text-slate-700">{penaltySequence(chargeBase, chargeRatio).join(' → ')}</b> ngày...
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Lần 1 = {penaltyForm === 'duty' ? 'trực nhật' : 'đi lao động'}{' '}
                {penaltySequence(chargeBase, chargeRatio)[0]} ngày, lần 2 ={' '}
                {penaltySequence(chargeBase, chargeRatio)[1]} ngày, lần 3 ={' '}
                {penaltySequence(chargeBase, chargeRatio)[2]} ngày. Điểm hạnh kiểm vẫn trừ bình thường theo điểm quy định.
              </p>
            </>
          ) : (
            <p className="mt-2 text-[11px] text-slate-400">
              Chọn hình thức để hệ thống tự tính số ngày tăng theo cấp số nhân khi học sinh tái phạm cùng quy định.
            </p>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700"
        >
          {initial ? 'Cập nhật' : 'Thêm danh mục'}
        </button>
      </div>
    </form>
  )
}

export default function RuleManagement() {
  const { rules, violations, notify, addRule, updateRule, deleteRule } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const usageMap = useMemo(() => {
    const acc = {}
    violations.forEach((v) => {
      acc[v.ruleId] = (acc[v.ruleId] || 0) + 1
    })
    return acc
  }, [violations])

  const sorted = [...rules].sort((a, b) => a.points - b.points)

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (r) => {
    setEditing(r)
    setModalOpen(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-500">
          <ClipboardList size={18} className="text-indigo-500" />
          <p className="text-sm">
            Lớp đang có <b className="text-slate-700">{rules.length}</b> danh mục ghi nhận (vi phạm + khen thưởng)
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700"
        >
          <Plus size={16} /> Thêm danh mục
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((r) => {
          const usage = usageMap[r.id] || 0
          return (
            <div key={r.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isBonus(r) ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                  {isBonus(r) ? <Award size={18} /> : <AlertCircle size={18} />}
                </div>
                <span className={`rounded-lg px-2.5 py-1 text-sm font-extrabold ${isBonus(r) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {isBonus(r) ? '+' : '-'}{r.points}đ
                </span>
              </div>
              {penaltyFormOf(r) && (
                <span className={`mb-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${PENALTY_FORMS[penaltyFormOf(r)].cls}`}>
                  {PENALTY_FORMS[penaltyFormOf(r)].label}{' '}
                  <span className="font-semibold opacity-70">×{r.chargeRatio || 2}</span>
                </span>
              )}
              <h3 className="font-semibold text-slate-800">{r.name}</h3>
              <p className="mt-1 text-xs text-slate-400">{usage} lần được ghi nhận</p>
              <div className="mt-3 flex gap-1 border-t border-slate-50 pt-3">
                <button
                  onClick={() => openEdit(r)}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <Pencil size={14} /> Sửa
                </button>
                <button
                  onClick={() => {
                    if (usage > 0) {
                      if (!window.confirm(`Xóa lỗi "${r.name}"? ${usage} vi phạm liên quan sẽ bị xóa theo.`)) return
                    } else if (!window.confirm(`Xóa lỗi "${r.name}"?`)) return
                    deleteRule(r.id)
                    notify('Đã xóa lỗi vi phạm.')
                  }}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}
      >
        <RuleForm
          key={editing ? editing.id : 'new'}
          initial={editing}
          onError={(msg) => notify(msg, 'error')}
          onCancel={() => setModalOpen(false)}
          onSave={(data) => {
            if (editing) {
              updateRule(editing.id, data)
              notify('Đã cập nhật danh mục.')
            } else {
              addRule({ ...data, id: `r-${Date.now()}` })
              notify('Đã thêm danh mục.')
            }
            setModalOpen(false)
          }}
        />
      </Modal>
    </div>
  )
}