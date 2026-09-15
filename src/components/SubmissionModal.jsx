import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X, CalendarDays, Check, Pencil, MessageSquare, Send } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import PointsBadge from './PointsBadge.jsx'
import {
  todayISO,
  isoWeekInfo,
  weekLabel,
  weekdayName,
  violationDateLabel,
  isBonus,
  submissionDelta,
  timeAgo,
} from '../utils/helpers.js'

const field =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

let lineCounter = 0
function newLineId() {
  lineCounter += 1
  return `l-${Date.now()}-${lineCounter}`
}

export default function SubmissionModal({
  open,
  onClose,
  submission,
  mode = 'view',
  members,
  locked = false,
  sendLabel = 'Gửi phiếu lên duyệt',
  onSend,
  onSaveDraft,
  onReject,
  onApprove,
}) {
  const { rules, students, isWeekLocked, addComment } = useApp()
  const [lines, setLines] = useState([])
  const [form, setForm] = useState({ studentId: '', ruleId: '', date: todayISO(), note: '' })
  const [editingLineId, setEditingLineId] = useState(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    if (!open) return
    setLines((submission && submission.lines) || [])
    setForm({ studentId: '', ruleId: '', date: todayISO(), note: '' })
    setEditingLineId(null)
    setRejectOpen(false)
    setReason('')
    setCommentText('')
  }, [open, submission])

  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])
  const allowed = members || students
  const canEdit = mode === 'edit' || mode === 'review'

  const week = submission && submission.week ? submission.week : null
  const weekLocked = locked || (week ? isWeekLocked(week) : false)

  const delta = useMemo(() => submissionDelta(lines, ruleMap), [lines, ruleMap])

  const validCount = lines.filter((l) => l && l.studentId && l.ruleId).length

  const stuFor = (id) => (allowed || []).find((s) => s.id === id)

  const addOrSaveLine = (e) => {
    e.preventDefault()
    const { studentId, ruleId, date } = form
    if (!studentId) return
    if (!ruleId) return
    if (!date) return
    const line = { id: editingLineId || newLineId(), studentId, ruleId, date, note: form.note || '' }
    setLines((prev) =>
      editingLineId ? prev.map((l) => (l.id === editingLineId ? line : l)) : [...prev, line],
    )
    setForm({ studentId: '', ruleId: '', date: todayISO(), note: '' })
    setEditingLineId(null)
  }

  const startEditLine = (l) => {
    setEditingLineId(l.id)
    setForm({ studentId: l.studentId, ruleId: l.ruleId, date: l.date, note: l.note || '' })
  }

  const removeLine = (id) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
    if (editingLineId === id) {
      setEditingLineId(null)
      setForm({ studentId: '', ruleId: '', date: todayISO(), note: '' })
    }
  }

  if (!open) return null

  const lockedNote = week && weekLocked && (
    <p className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
      Tuần này đã chốt ({weekLabel(week)}) - không thể thêm/sửa/xóa. Hãy báo giáo viên mở khóa.
    </p>
  )

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative my-6 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              Phiếu tổng hợp {week ? `- ${weekLabel(week)}` : ''}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              {submission && submission.createdBy
                ? `${submission.createdBy.name || ''} (${submission.createdBy.role || 'Học sinh'}) soạn · `
                : ''}
              {validCount} dòng · Thay đổi điểm: {delta >= 0 ? '+' : ''}
              {delta}đ
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {lockedNote}

        {canEdit && (
          <form onSubmit={addOrSaveLine} className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-indigo-600">
              {editingLineId ? 'Sửa dòng vi phạm' : 'Thêm dòng vi phạm / khen thưởng'}
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                className={field}
              >
                <option value="">-- Học sinh --</option>
                {(allowed || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - Tổ {s.group}
                  </option>
                ))}
              </select>
              <select
                value={form.ruleId}
                onChange={(e) => setForm({ ...form, ruleId: e.target.value })}
                className={field}
              >
                <option value="">-- Lỗi / khen thưởng --</option>
                <optgroup label="Trừ điểm (vi phạm)">
                  {rules.filter((r) => !isBonus(r)).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (-{r.points}đ)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Cộng điểm (khen thưởng)">
                  {rules.filter((r) => isBonus(r)).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (+{r.points}đ)
                    </option>
                  ))}
                </optgroup>
              </select>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} />
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Ghi chú (tùy chọn)"
                className={field}
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
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
                disabled={weekLocked || !form.studentId || !form.ruleId || !form.date}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
              >
                {editingLineId ? <Pencil size={15} /> : <Plus size={15} />}
                {editingLineId ? 'Lưu dòng' : 'Thêm dòng'}
              </button>
            </div>
          </form>
        )}

        <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-slate-100">
          {lines.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">
              Chưa có dòng vi phạm nào trong phiếu.
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {lines.map((l) => {
                const stu = stuFor(l.studentId)
                const rule = ruleMap[l.ruleId]
                const w = l.date ? isoWeekInfo(l.date) : null
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                    <span className="min-w-[130px] font-semibold text-slate-700">{stu ? stu.name : '—'}</span>
                    <span className="flex-1 text-slate-600">
                      {rule ? rule.name : '—'} <PointsBadge rule={rule} />
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <CalendarDays size={12} />
                      {l.date ? violationDateLabel(l.date) : ''}
                      {w && weekLabel(w) !== weekLabel(week) ? ` · ${weekLabel(w)}` : ''}
                    </span>
                    {(l.note || '') && <span className="text-xs text-slate-400">"{l.note}"</span>}
                    {canEdit && (
                      <span className="flex items-center gap-0.5">
                        <button
                          onClick={() => startEditLine(l)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                          title="Sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => removeLine(l.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <MessageSquare size={14} className="text-sky-500" />
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Bình luận ({((submission && submission.comments) || []).length})
            </p>
          </div>
          {((submission && submission.comments) || []).length === 0 && (
            <p className="mb-2 text-xs text-slate-400">Chưa có bình luận nào.</p>
          )}
          <ul className="mb-2 space-y-1.5">
            {((submission && submission.comments) || []).map((c) => (
              <li key={c.id} className="flex items-start gap-2 rounded-lg bg-white p-2 text-xs">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-600">
                  {c.author && c.author.name ? c.author.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-700">
                    <span className="font-semibold">{c.author && (c.author.name || 'Người dùng')}</span>
                    {c.author && c.author.role ? <span className="ml-1 text-slate-400">· {c.author.role}</span> : null}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-slate-600">{c.text}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(c.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && commentText.trim()) {
                  addComment(submission.id, commentText)
                  setCommentText('')
                }
              }}
              placeholder="Viết bình luận cho phiếu này..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <button
              onClick={() => {
                if (!commentText.trim()) return
                addComment(submission.id, commentText)
                setCommentText('')
              }}
              disabled={!commentText.trim()}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              <Send size={12} /> Gửi
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {mode === 'edit' && (
            <>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              {onSaveDraft && (
                <button
                  onClick={() => onSaveDraft(submission, lines)}
                  disabled={!validCount}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Lưu nháp
                </button>
              )}
              <button
                onClick={() => onSend(submission, lines)}
                disabled={!validCount || weekLocked}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check size={16} /> {sendLabel}
              </button>
            </>
          )}

          {mode === 'review' && (
            <>
              <button
                onClick={() => setRejectOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100"
              >
                <X size={15} /> Từ chối
              </button>
              <button
                onClick={() => onSend(submission, lines)}
                disabled={!validCount || weekLocked}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check size={16} /> {sendLabel}
              </button>
            </>
          )}

          {mode === 'approve' && (
            <>
              <button
                onClick={() => setRejectOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100"
              >
                <X size={15} /> Từ chối
              </button>
              <button
                onClick={() => onApprove(submission, lines)}
                disabled={!validCount}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check size={16} /> Duyệt phiếu & tính điểm
              </button>
            </>
          )}

          {mode === 'view' && (
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Đóng
            </button>
          )}
        </div>

        {rejectOpen && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setRejectOpen(false)} />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-base font-bold text-slate-800">Lý do trả về phiếu</h3>
              <p className="mt-1 text-sm text-slate-500">Ghi rõ lý do để người soạn có thể sửa và gửi lại.</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                placeholder="Ví dụ: Thiếu bằng chứng, cần bổ sung ngày giờ chi tiết hơn."
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setRejectOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    onReject(submission, reason.trim())
                    setRejectOpen(false)
                    setReason('')
                  }}
                  disabled={!reason.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-rose-700 disabled:opacity-50"
                >
                  <X size={16} /> Trả về
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { field }