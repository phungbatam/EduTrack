import {
  GraduationCap,
  LayoutDashboard,
  Users,
  AlertTriangle,
  ClipboardList,
  FileText,
  LogOut,
  RefreshCcw,
  CalendarDays,
  BarChart3,
  Megaphone,
  ShieldCheck,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { isLeaderRole } from '../utils/helpers.js'

const ADMIN_NAV = [
  { key: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
  { key: 'students', label: 'Học sinh & Phân tổ', icon: Users },
  { key: 'violations', label: 'Quản lý vi phạm', icon: AlertTriangle },
  { key: 'approve', label: 'Duyệt phiếu', icon: ShieldCheck },
  { key: 'rules', label: 'Danh mục lỗi vi phạm', icon: ClipboardList },
  { key: 'reports', label: 'Báo cáo & Xuất dữ liệu', icon: FileText },
]

const LEAD_NAV = [{ key: 'lead', label: 'Điều hành của lớp', icon: Megaphone }]

const LEAD_APPROVE_NAV = [{ key: 'approve', label: 'Chốt phiếu tổng hợp', icon: ShieldCheck }]

const STUDENT_NAV = [
  { key: 'home', label: 'Trang chủ', icon: LayoutDashboard },
  { key: 'weeks', label: 'Vi phạm theo tuần', icon: CalendarDays },
  { key: 'monthly', label: 'Tổng kết tháng', icon: BarChart3 },
]

export default function Sidebar({ view, onNavigate, open, onClose }) {
  const { session, isAdmin, logout, resetDemo, notify } = useApp()
  const isLeader = !!session && !isAdmin && isLeaderRole(session.roleLabel)
  const isHead = session && !isAdmin && session.roleLabel === 'Lớp trưởng'
  const nav = isAdmin
    ? ADMIN_NAV
    : isLeader
      ? isHead
        ? [...LEAD_NAV, ...LEAD_APPROVE_NAV, ...STUDENT_NAV]
        : [...LEAD_NAV, ...STUDENT_NAV]
      : STUDENT_NAV

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-slate-300 transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/40">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-lg font-bold text-white">EduTrack</p>
            <p className="text-xs text-slate-400">Quản lý thi đua lớp học</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {isAdmin ? 'Quản trị' : 'Menu'}
          </p>
          {nav.map((item) => {
            const Icon = item.icon
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          {isAdmin && (
            <button
              onClick={() => {
                if (window.confirm('Khôi phục toàn bộ dữ liệu mẫu ban đầu?')) {
                  resetDemo()
                  notify('Đã khôi phục dữ liệu mẫu')
                }
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <RefreshCcw size={14} />
              Khôi phục dữ liệu mẫu
            </button>
          )}
          <div className="flex items-center gap-3 rounded-xl bg-slate-800/70 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-bold text-white">
              {session?.name ? session.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{session?.name}</p>
              <p className="text-[11px] text-slate-400">
                {isAdmin ? 'Quản trị viên' : isLeader ? session.roleLabel : `Học sinh - ${session?.code || ''}`}
              </p>
            </div>
            <button
              onClick={logout}
              title="Đăng xuất"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-rose-400"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}