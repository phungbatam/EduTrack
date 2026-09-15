import { useMemo, useState } from 'react'
import { MessageSquareWarning, Search, X, Check, FileWarning } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { timeAgo, violationDateLabel } from '../utils/helpers.js'

const BADGE = (status) =>
  status === 'pending'
    ? { label: 'Chờ xử lý', cls: 'bg-amber-50 text-amber-600 border-amber-200' }
    : status === 'removed'
      ? { label: 'Đã chấp nhận', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' }
      : { label: 'Đã bác', cls: 'bg-rose-50 text-rose-600 border-rose-200' }

export default function AppealsView() {
  const { appeals, violations, resolveAppeal, notify } = useApp()
  const [tab, setTab] = useState('pending')
  const [active, setActive] = useState(null)
  const [note, setNote] = useState('')

  const violationOf = (id) => violations.find((v) => v.id === id)

  const filtered = useMemo(() => {
    const list = [...appeals]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    if (tab === 'pending') return list.filter((a) => a.status === 'pending')
    if (tab === 'done') return list.filter((a) => a.status !== 'pending')
    return list
  }, [appeals, tab])

  const openResolve = (a) => {
    setActive(a)
    setNote(a.adminNote || '')
  }

  const handleResolve = (status) => {
    if (!active) return
    if (!note.trim()) return notify('Vui lòng nhập phản hồi.', 'error')
    resolveAppeal(active.id, { status, note: note.trim(), violationId: status === 'removed' ? active.violationId : undefined })
    notify(status === 'removed' ? 'Đã chấp nhận khiếu nại và xóa vi phạm.' : 'Đã bác khiếu nại, giữ nguyên vi phạm.')
    setActive(null)
  }

  const tabs = [
    { key: 'pending', label: 'Chờ xử lý' },
    { key: 'done', label: 'Đã xử lý' },
    { key: 'all', label: 'Tất cả' },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquareWarning size={20} className="text-amber-500" />
          <h2 className="text-lg font-extrabold text-slate-800">Xử lý khiếu nại của học sinh</h2>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          Học sinh có thể gửi đơn khiếu nại khi cho rằng nội dung vi phạm được ghi chưa đúng. Kiểm tra và phản hồi từng đơn.
        </p>
        <div className="mt-4 flex items-center gap-1 overflow-x-auto border-b border-slate-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === t.key ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <p className="text-sm text-slate-500">Tổng: {filtered.length} đơn</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Học sinh</th>
                <th className="px-4 py-3 font-semibold">Vi phạm</th>
                <th className="px-4 py-3 font-semibold">Ngày vi phạm</th>
                <th className="px-4 py-3 font-semibold">Lý do khiếu nại</th>
                <th className="px-4 py-3 font-semibold">Gửi lúc</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Không có đơn khiếu nại nào.
                  </td>
                </tr>
              )}
              {filtered.map((a) => {
                const v = violationOf(a.violationId)
                const badge = BADGE(a.status)
                return (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{a.studentName || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{a.ruleName || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{v ? violationDateLabel(v.date) : '—'}</td>
                    <td className="max-w-[280px] truncate px-4 py-2.5 text-xs text-slate-500" title={a.reason}>
                      {a.reason || '—'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{timeAgo(a.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {a.adminNote && <p className="mt-1 max-w-[200px] truncate text-[11px] text-slate-400" title={a.adminNote}>"{a.adminNote}"</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        {a.status === 'pending' ? (
                          <button
                            onClick={() => openResolve(a)}
                            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-600"
                          >
                            <Search size={13} /> Xử lý
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Bởi: {a.resolvedBy || '—'}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {active && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActive(null)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
                  <FileWarning size={18} className="text-amber-500" />
                  Xử lý khiếu nại của {active.studentName}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Vi phạm: {active.ruleName} · {violationOf(active.violationId) ? violationDateLabel(violationOf(active.violationId).date) : '—'}
                </p>
              </div>
              <button onClick={() => setActive(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-sm text-slate-600">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Lý do học sinh trình bày</p>
              <p className="mt-1.5 leading-relaxed">{active.reason || '—'}</p>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
              placeholder="Phản hồi lại học sinh..."
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setActive(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleResolve('kept')}
                disabled={!note.trim()}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                <X size={15} /> Giữ vi phạm
              </button>
              <button
                onClick={() => handleResolve('removed')}
                disabled={!note.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check size={15} /> Chấp nhận & xóa vi phạm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}