import { useMemo, useState } from 'react'
import { ShieldCheck, Search, FileText, Send } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import SubmissionModal from '../components/SubmissionModal.jsx'
import {
  submissionStatusOf,
  SUBMISSION_STATUS,
  submissionDelta,
  submissionWeekKey,
  weekKeyOf,
  currentPeriod,
  weekLabel,
} from '../utils/helpers.js'

const TABS_LEADER = [
  { key: 'queue', label: 'Chờ chốt' },
  { key: 'sent', label: 'Đã gửi lên GVCN' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Trả về' },
]

const TABS_ADMIN = [
  { key: 'queue', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Trả về' },
]

export default function ApprovalView() {
  const { session, isAdmin, students, rules, submissions, notify, updateSubmission, approveSubmission } = useApp()

  const roleLabel = session?.roleLabel || ''
  const isHead = roleLabel === 'Lớp trưởng'
  const level = isAdmin ? 2 : isHead ? 1 : 0
  const tabs = isAdmin ? TABS_ADMIN : TABS_LEADER
  const [tab, setTab] = useState(tabs[0].key)
  const [search, setSearch] = useState('')
  const [grp, setGrp] = useState('all')
  const [weekFilter, setWeekFilter] = useState('current')
  const [active, setActive] = useState(null)
  const [modalMode, setModalMode] = useState('review')

  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])
  const current = currentPeriod()

  const weeks = useMemo(() => {
    const map = new Map()
    submissions.forEach((s) => {
      if (s.week) map.set(weekKeyOf(s.week), s.week)
    })
    map.set(weekKeyOf(current), current)
    return [...map.values()].sort((a, b) => b.week - a.week)
  }, [submissions, current])

  const scoped = useMemo(() => {
    return submissions
      .map((s) => ({ ...s, st: submissionStatusOf(s) }))
      .filter((s) => {
        if (tab === 'queue') {
          if (level === 2) return s.st === 'pendingAdmin'
          return s.st === 'pendingLeader' && s.createdBy && s.createdBy.id !== session?.id
        }
        if (tab === 'sent') return level === 1 && s.st === 'pendingAdmin' && s.reviewedBy && s.reviewedBy.id === session?.id
        if (tab === 'approved') return s.st === 'approved'
        if (tab === 'rejected') return s.st === 'rejected'
        return false
      })
      .sort((a, b) => (b.submittedAt || b.createdAt || '').localeCompare(a.submittedAt || a.createdAt || ''))
  }, [submissions, tab, level, session])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const wkKey = weekFilter === 'current' ? weekKeyOf(current) : weekFilter
    return scoped
      .filter((s) => {
        if (grp !== 'all' && s.scopeGroup !== null && s.scopeGroup !== Number(grp)) return false
        if (weekFilter !== 'all' && s.week && weekKeyOf(s.week) !== wkKey) return false
        if (weekFilter !== 'all' && !s.week) return false
        if (!q) return true
        const creator = (s.createdBy && s.createdBy.name) || ''
        const lines = s.lines || []
        const matched = lines.some((l) => {
          const stu = students.find((x) => x.id === l.studentId)
          const rule = ruleMap[l.ruleId]
          return (
            (stu && (stu.name.toLowerCase().includes(q) || String(stu.code || '').toLowerCase().includes(q))) ||
            (rule && rule.name.toLowerCase().includes(q)) ||
            (l.note || '').toLowerCase().includes(q)
          )
        })
        return creator.toLowerCase().includes(q) || matched
      })
  }, [scoped, grp, weekFilter, search, students, ruleMap, current])

  const queueDelta = useMemo(() => filtered.reduce((sum, s) => sum + submissionDelta(s.lines, ruleMap), 0), [filtered, ruleMap])

  const openReview = (s) => {
    setActive(s)
    setModalMode(level === 2 ? 'approve' : 'review')
  }

  const handleForward = (sub, editedLines) => {
    if (level === 2) {
      approveSubmission(sub, session?.name || 'Quản trị')
      notify(`Đã duyệt phiếu - ${(editedLines || sub.lines || []).length} dòng đã vào bảng điểm.`)
    } else {
      const reviewed = { id: session?.id, name: session?.name }
      updateSubmission(sub.id, {
        lines: editedLines || sub.lines,
        status: 'pendingAdmin',
        reviewedBy: reviewed,
        reviewedAt: new Date().toISOString(),
      })
      notify('Đã chốt và gửi phiếu lên trang quản trị.')
    }
    setActive(null)
  }

  const handleReject = (sub, reason) => {
    if (!reason) return notify('Phải nhập lý do trả về.', 'error')
    updateSubmission(sub.id, {
      status: 'rejected',
      rejectedBy: session?.name || '',
      rejectedReason: reason,
      rejectedAt: new Date().toISOString(),
    })
    notify('Đã trả về phiếu cho người soạn.')
    setActive(null)
  }

  if (level === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <ShieldCheck size={40} className="mx-auto text-slate-300" />
        <p className="mt-4 font-semibold text-slate-700">Bạn không có quyền xem trang này.</p>
        <p className="mt-1 text-sm text-slate-400">Chức năng này dành cho lớp trưởng và giáo viên chủ nhiệm.</p>
      </div>
    )
  }

  const sendLabel = level === 2 ? 'Duyệt phiếu & tính điểm' : 'Chốt & gửi lên GVCN'

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
              <ShieldCheck size={20} className="text-indigo-500" />
              {level === 2 ? 'Duyệt phiếu tổng hợp' : 'Chốt phiếu tổng hợp'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {level === 2
                ? 'Bạn là giáo viên chủ nhiệm - duyệt phiếu cuối cùng trước khi tính điểm.'
                : 'Bạn là lớp trưởng - xem, chỉnh sửa và chốt phiếu của tổ trưởng trước khi gửi lên giáo viên.'}
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

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên học sinh, lỗi, người soạn, ghi chú..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
          <option value="current">Tuần hiện tại</option>
          {weeks
            .filter((w) => !(w.year === current.year && w.week === current.week))
            .map((w) => (
              <option key={weekKeyOf(w)} value={weekKeyOf(w)}>
                {weekLabel(w)}
              </option>
            ))}
          <option value="all">Tất cả tuần</option>
        </select>
        <select value={grp} onChange={(e) => setGrp(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
          <option value="all">Tất cả phạm vi</option>
          {[1, 2, 3, 4].map((g) => (
            <option key={g} value={g}>
              Tổ {g}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <p className="text-sm text-slate-500">
            {tab === 'queue'
              ? `Tổng: ${filtered.length} phiếu · Thay đổi điểm nếu duyệt: ${queueDelta >= 0 ? '+' : ''}${queueDelta}đ`
              : tab === 'sent'
                ? `Tổng: ${filtered.length} phiếu đã gửi lên GVCN`
                : tab === 'approved'
                  ? `Tổng: ${filtered.length} phiếu đã duyệt`
                  : `Tổng: ${filtered.length} phiếu bị trả về`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Tuần</th>
                <th className="px-4 py-3 font-semibold">Phạm vi</th>
                <th className="px-4 py-3 font-semibold">Người soạn</th>
                <th className="px-4 py-3 text-center font-semibold">Số dòng</th>
                <th className="px-4 py-3 text-right font-semibold">Điểm thay đổi</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Không có phiếu nào.
                  </td>
                </tr>
              )}
              {filtered.map((s) => {
                const cnt = (s.lines || []).filter((l) => l && l.studentId && l.ruleId).length
                const d = submissionDelta(s.lines, ruleMap)
                const st = s.st
                const creator = (s.createdBy && `${s.createdBy.name}${s.createdBy.role ? ` (${s.createdBy.role})` : ''}`) || '—'
                return (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{s.week ? weekLabel(s.week) : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{s.scopeGroup ? `Tổ ${s.scopeGroup}` : 'Cả lớp'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{creator}</td>
                    <td className="px-4 py-2.5 text-center text-slate-500">{cnt}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${d >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {d >= 0 ? '+' : ''}
                      {d}đ
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
                      {st === 'approved' && s.approvedBy && (
                        <p className="mt-1 text-[11px] text-emerald-600">Bởi: {s.approvedBy}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        {tab === 'queue' && (
                          <>
                            <button
                              onClick={() => openReview(s)}
                              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
                            >
                              <Send size={13} /> {level === 2 ? 'Xem & duyệt' : 'Xem & chốt'}
                            </button>
                          </>
                        )}
                        {(tab === 'approved' || tab === 'rejected' || tab === 'sent') && (
                          <button
                            onClick={() => {
                              setActive(s)
                              setModalMode('view')
                            }}
                            className="flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                          >
                            <FileText size={13} /> Xem phiếu
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
      </div>

      {level === 2 && tab === 'queue' && (
        <p className="rounded-2xl bg-amber-50 p-4 text-xs font-semibold text-amber-700">
          Duyệt phiếu sẽ đưa <b>tất cả dòng trong phiếu</b> vào bảng điểm và báo cáo. Điểm chỉ được tính sau khi duyệt.
        </p>
      )}

      <SubmissionModal
        open={!!active}
        onClose={() => setActive(null)}
        submission={active}
        mode={modalMode}
        members={active && level === 1 ? (active.scopeGroup ? students.filter((s) => s.group === active.scopeGroup) : students) : students}
        locked={false}
        sendLabel={sendLabel}
        onSend={handleForward}
        onReject={handleReject}
        onApprove={handleForward}
      />
    </div>
  )
}