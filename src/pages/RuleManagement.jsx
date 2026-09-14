import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ClipboardList, AlertCircle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Modal from '../components/Modal.jsx'

function RuleForm({ initial, onSave, onCancel, onError }) {
  const [name, setName] = useState(initial ? initial.name : '')
  const [points, setPoints] = useState(initial ? String(initial.points) : '2')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return onError('Vui lòng nhập tên lỗi vi phạm.')
    const p = parseInt(points, 10)
    if (!p || p < 1 || p > 100) return onError('Điểm trừ phải là số nguyên dương (1-100).')
    onSave({ name: name.trim(), points: p })
  }

  const field =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tên lỗi vi phạm *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
          placeholder="Ví dụ: Không đeo khăn quàng"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Số điểm bị trừ *</label>
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
          Điểm thi đua mỗi học sinh bắt đầu từ 100 và bị trừ theo lỗi.
        </p>
      </div>
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
          {initial ? 'Cập nhật' : 'Thêm lỗi vi phạm'}
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
            Lớp đang có <b className="text-slate-700">{rules.length}</b> danh mục lỗi vi phạm
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700"
        >
          <Plus size={16} /> Thêm lỗi vi phạm
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((r) => {
          const usage = usageMap[r.id] || 0
          return (
            <div key={r.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                  <AlertCircle size={18} />
                </div>
                <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-sm font-extrabold text-rose-600">
                  -{r.points}đ
                </span>
              </div>
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
        title={editing ? 'Sửa lỗi vi phạm' : 'Thêm lỗi vi phạm'}
      >
        <RuleForm
          key={editing ? editing.id : 'new'}
          initial={editing}
          onError={(msg) => notify(msg, 'error')}
          onCancel={() => setModalOpen(false)}
          onSave={(data) => {
            if (editing) {
              updateRule(editing.id, data)
              notify('Đã cập nhật lỗi vi phạm.')
            } else {
              addRule({ ...data, id: `r-${Date.now()}` })
              notify('Đã thêm lỗi vi phạm.')
            }
            setModalOpen(false)
          }}
        />
      </Modal>
    </div>
  )
}