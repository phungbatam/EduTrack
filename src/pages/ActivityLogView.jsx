import { useMemo, useState } from 'react'
import { Clock, History, Search, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { timeAgo, todayISO } from '../utils/helpers.js'

const ACTION_LABEL = {
  student: { label: 'Học sinh', cls: 'bg-indigo-50 text-indigo-600 border-indigo-200', icon: '👥' },
  rule: { label: 'Quy định', cls: 'bg-sky-50 text-sky-600 border-sky-200', icon: '📋' },
  violation: { label: 'Vi phạm', cls: 'bg-rose-50 text-rose-600 border-rose-200', icon: '⚠️' },
  submission: { label: 'Phiếu', cls: 'bg-sky-50 text-sky-600 border-sky-200', icon: '📄' },
  approve: { label: 'Duyệt', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: '✅' },
  week: { label: 'Tuần', cls: 'bg-amber-50 text-amber-600 border-amber-200', icon: '📅' },
  comment: { label: 'Bình luận', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: '💬' },
  appeal: { label: 'Khiếu nại', cls: 'bg-violet-50 text-violet-600 border-violet-200', icon: '📨' },
}

export default function ActivityLogView() {
  const { activityLog } = useApp()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const actions = useMemo(() => [...new Set(activityLog.map((a) => a.action))], [activityLog])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...activityLog]
      .filter((a) => (filter === 'all' ? true : a.action === filter))
      .filter((a) => {
        if (!q) return true
        const actor = (a.actor && `${a.actor.name} ${a.actor.role}`) || ''
        return `${actor} ${a.detail}`.toLowerCase().includes(q)
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [activityLog, filter, search])

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <History size={20} className="text-indigo-500" />
          <h2 className="text-lg font-extrabold text-slate-800">Lịch sử hoạt động</h2>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          Nhật ký ghi lại các thao tác: quản lý học sinh, quy định, vi phạm, phiếu tổng hợp, duyệt phiếu, chốt tuần...
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo hành động, người thực hiện..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
          >
            <option value="all">Tất cả loại</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a] ? ACTION_LABEL[a].label : a}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400">Hôm nay: {todayISO()}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            <Clock size={14} /> Tổng: {filtered.length} hoạt động
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Thời gian</th>
                <th className="px-4 py-3 font-semibold">Loại</th>
                <th className="px-4 py-3 font-semibold">Người thực hiện</th>
                <th className="px-4 py-3 font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    Chưa có hoạt động nào.
                  </td>
                </tr>
              )}
              {filtered.map((a) => {
                const meta = ACTION_LABEL[a.action] || { label: a.action, cls: 'bg-slate-50 text-slate-500 border-slate-200' }
                const actor = a.actor || {}
                return (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{timeAgo(a.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-700">{actor.name || '—'}</p>
                      <p className="text-[11px] text-slate-400">{actor.role || ''}</p>
                    </td>
                    <td className="max-w-[420px] px-4 py-2.5 text-xs text-slate-600">{a.detail || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        <ShieldCheck size={12} className="inline-block" /> Nhật ký chỉ hiển thị cho quản trị viên.
      </p>
    </div>
  )
}