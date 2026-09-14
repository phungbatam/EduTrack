import { useMemo, useState } from 'react'
import { ShieldCheck, Check, X, Search, AlertTriangle, Lock, CalendarDays, RotateCcw, FileText } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import {
  formatDate,
  weekLabel,
  isoWeekInfo,
  statusOf,
  VIOLATION_STATUS,
  isClassLeaderRole,
} from '../utils/helpers.js'

const TABS_BY_ROLE = {
  2: [
    { key: 'queue', label: 'Chờ duyệt' },
    { key: 'drafts', label: 'Nháp chưa gửi' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Từ chối' },
  ],
  1: [
    { key: 'queue', label: 'Chờ duyệt' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Từ chối' },
  ],
}

const TABS_BY_ROLE_COUNTS = {
  2: { queue: (q) => q.length, drafts: (q) => q.length, approved: (q) => q.length, rejected: (q) => q.length },
  1: { queue: (q) => q.length, approved: (q) => q.length, rejected: (q) => q.length },
}

function Chip({ status }) {
  const s = VIOLATION_STATUS[status] || VIOLATION_STATUS.draft
  return (
    <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

function RejectDialog({ open, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-bold text-slate-800">Lý do từ chối</h3>
        <p className="mt-1 text-sm text-slate-500">Ghi rõ lý do để người ghi có thể chỉnh sửa và gửi lại.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          placeholder="Ví dụ: Thiếu bằng chứng, cần bổ sung ngày giờ chi tiết hơn."
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Hủy
          </button>
          <button
            onClick={() => { onSubmit(reason.trim()); setReason('') }}
            disabled={!reason.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-rose-700 disabled:opacity-50"
          >
            <X size={16} /> Từ chối
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ApprovalView() {
  const { session, isAdmin, students, rules, violations, notify, updateViolation } = useApp()

  const myRole = session?.roleLabel || ''
  const level = isAdmin ? 2 : isClassLeaderRole(myRole) ? 1 : 0
  const tabs = TABS_BY_ROLE[level] || TABS_BY_ROLE[1]
  const [tab, setTab] = useState(tabs[0].key)
  const [search, setSearch] = useState('')
  const [grp, setGrp] = useState('all')
  const [weekFilter, setWeekFilter] = useState('current')
  const [rejectTarget, setRejectTarget] = useState(null)

  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])
  const stuMap = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])

  const scoringV = useMemo(
    () => violations.filter((v) => {
      if (tab === 'queue') {
        if (level === 2) return statusOf(v) === 'pendingClass' || statusOf(v) === 'pendingAdmin'
        return statusOf(v) === 'pendingClass'
      }
      if (tab === 'approved') return statusOf(v) === 'approved'
      if (tab === 'rejected') return statusOf(v) === 'rejected'
      if (tab === 'drafts') return statusOf(v) === 'draft' && isAdmin
      return false
    }),
    [violations, tab, level, isAdmin],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const cur = weekFilter === 'current' ? null : weekFilter
    return scoringV
      .filter((v) => {
        if (grp !== 'all') {
          const s = stuMap[v.studentId]
          if (!s || s.group !== Number(grp)) return false
        }
        if (cur && v.date) {
          const info = isoWeekInfo(v.date)
          if (info && `${info.year}-W${info.week}` !== cur) return false
        }
        if (!q) return true
        const s = stuMap[v.studentId]
        const rule = ruleMap[v.ruleId]
        return (
          (s && (s.name.toLowerCase().includes(q) || String(s.code || '').toLowerCase().includes(q))) ||
          (rule && rule.name.toLowerCase().includes(q)) ||
          (v.note || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [scoringV, grp, weekFilter, search, stuMap, ruleMap])

  const totalPoints = filtered.reduce((s, v) => s + (ruleMap[v.ruleId]?.points || 0), 0)

  const handleApprove = (id) => {
    const v = violations.find((x) => x.id === id)
    if (!v) return
    const st = statusOf(v)
    const patch = { status: isAdmin ? 'approved' : 'pendingAdmin' }
    if (isAdmin) { patch.adminBy = session?.name || 'Admin'; patch.adminAt = new Date().toISOString() }
    else { patch.approvedBy = session?.name || ''; patch.approvedAt = new Date().toISOString() }
    updateViolation(id, patch)
    notify(isAdmin ? 'Đã duyệt vi phạm.' : 'Đã chuyển lên giáo viên duyệt.')
  }

  const handleReject = (id, reason) => {
    if (!reason) return notify('Phải nhập lý do từ chối.', 'error')
    updateViolation(id, {
      status: 'rejected',
      rejectedBy: session?.name || '',
      rejectedReason: reason,
      rejectedAt: new Date().toISOString(),
    })
    notify('Đã từ chối vi phạm.')
    setRejectTarget(null)
  }

  const handleRestore = (id) => {
    updateViolation(id, { status: 'pendingAdmin', rejectedBy: null, rejectedReason: null, rejectedAt: null })
    notify('Đã khôi phục vào hàng chờ duyệt.')
  }

  if (level === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <ShieldCheck size={40} className="mx-auto text-slate-300" />
        <p className="mt-4 font-semibold text-slate-700">Bạn không có quyền duyệt vi phạm.</p>
        <p className="mt-1 text-sm text-slate-400">Chức năng này dành cho lớp trưởng, lớp phó hoặc giáo viên chủ nhiệm.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
              <ShieldCheck size={20} className="text-indigo-500" />
              Duyệt vi phạm
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {level === 2
                ? 'Bạn là giáo viên chủ nhiệm - duyệt tất cả vi phạm trước khi chính thức lưu.'
                : 'Bạn là lớp trưởng/phó - duyệt vi phạm của tổ trưởng trước khi gửi lên giáo viên.'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1 overflow-x-auto border-b border-slate-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'queue' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, mã HS, lý do, ghi chú..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <select value={grp} onChange={(e) => setGrp(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
            <option value="all">Tất cả tổ</option>
            {[1, 2, 3, 4].map((g) => <option key={g} value={g}>Tổ {g}</option>)}
          </select>
        </div>
      )}

      {(tab === 'approved' || tab === 'rejected' || tab === 'drafts') && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, mã HS, lỗi..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <p className="text-sm text-slate-500">
            {tab === 'queue'
              ? `Tổng: ${filtered.length} bản ghi chờ duyệt · Tổng điểm trừ: -${totalPoints}đ`
              : tab === 'drafts'
                ? `Tổng: ${filtered.length} nháp tổ trưởng chưa gửi`
                : tab === 'approved'
                  ? `Tổng: ${filtered.length} đã duyệt`
                  : `Tổng: ${filtered.length} bị từ chối`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Ngày</th>
                <th className="px-4 py-3 font-semibold">Học sinh</th>
                <th className="px-4 py-3 font-semibold">Lỗi vi phạm</th>
                <th className="px-4 py-3 font-semibold">Điểm</th>
                <th className="px-4 py-3 font-semibold">Ghi chú / Lý do</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Người ghi</th>
                {tab === 'queue' && <th className="px-4 py-3 text-right font-semibold">Thao tác</th>}
                {tab === 'rejected' && <th className="px-4 py-3 text-right font-semibold">Khôi phục</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={tab === 'queue' || tab === 'rejected' ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                    {tab === 'queue'
                      ? 'Không có vi phạm nào chờ duyệt.'
                      : tab === 'drafts'
                        ? 'Không có nháp nào.'
                        : tab === 'rejected'
                          ? 'Không có vi phạm nào bị từ chối.'
                          : 'Không có vi phạm đã duyệt.'}
                  </td>
                </tr>
              )}
              {filtered.map((v) => {
                const s = stuMap[v.studentId]
                const rule = ruleMap[v.ruleId]
                const w = v.date ? isoWeekInfo(v.date) : null
                const st = statusOf(v)
                return (
                  <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <p className="text-slate-700">{formatDate(v.date)}</p>
                      {w && <p className="text-[11px] text-slate-400">{weekLabel(w)}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-700">{s ? s.name : '—'}</p>
                      <p className="text-[11px] text-slate-400">{s ? `Tổ ${s.group}` : ''}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{rule ? rule.name : '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600">
                        -{rule ? rule.points : 0}đ
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-2.5 text-xs text-slate-400">
                      {tab === 'rejected' && v.rejectedReason ? (
                        <span className="text-rose-600 font-medium">{v.rejectedReason}</span>
                      ) : (
                        v.note || '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5"><Chip status={st} /></td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">
                      {v.by || 'Nhập tay'}
                      {v.byRole && v.byRole !== 'Học sinh' && (
                        <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-600">{v.byRole}</span>
                      )}
                    </td>
                    {tab === 'queue' && (
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleApprove(v.id)}
                            title={isAdmin ? 'Duyệt' : 'Chuyển lên giáo viên'}
                            className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <Check size={14} /> {isAdmin ? 'Duyệt' : 'Gửi lên'}
                          </button>
                          <button
                            onClick={() => setRejectTarget(v.id)}
                            title="Từ chối"
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                          >
                            <X size={14} /> Từ chối
                          </button>
                        </div>
                      </td>
                    )}
                    {tab === 'rejected' && level === 2 && (
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleRestore(v.id)}
                          className="flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                        >
                          <RotateCcw size={14} /> Khôi phục
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {level === 2 && tab === 'drafts' && (
        <p className="rounded-2xl bg-sky-50 p-4 text-xs font-semibold text-sky-700">
          Nháp chưa gửi là các vi phạm do tổ trưởng ghi nhưng chưa bấm "Gửi lên duyệt". Bạn có thể duyệt trực
          tiếp nháp này để đưa vào hệ thống. Vi phạm sẽ chuyển sang trạng thái <b>Đã duyệt</b>.
        </p>
      )}

      <RejectDialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} onSubmit={(reason) => handleReject(rejectTarget, reason)} />
    </div>
  )
}
