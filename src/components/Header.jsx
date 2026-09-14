import { Menu, LogOut, CloudOff } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

export default function Header({ title, subtitle, onMenu }) {
  const { session, isAdmin, logout, syncStatus } = useApp()
  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
        <button
          onClick={onMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Mở menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-slate-800 md:text-lg">{title}</h1>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{subtitle}</p>
        </div>
        {syncStatus === 'local-only' && (
          <span className="hidden items-center gap-1.5 rounded-xl bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-700 md:flex" title="Không thể đồng bộ lên máy chủ. Dữ liệu chỉ được lưu trên trình duyệt này.">
            <CloudOff size={14} />
            Chưa đồng bộ
          </span>
        )}
        <div className="hidden items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {today}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-bold text-white">
            {session?.name ? session.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="max-w-[140px] truncate text-xs font-semibold text-slate-700">{session?.name}</p>
            <p className={`text-[10px] font-medium ${isAdmin ? 'text-indigo-500' : 'text-emerald-500'}`}>
              {isAdmin ? 'Quản trị viên' : 'Học sinh'}
            </p>
          </div>
          <button
            onClick={logout}
            title="Đăng xuất"
            className="ml-1 rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}