import { useMemo, useRef, useState, useEffect } from 'react'
import { Bell, Check, Send, MessageSquare, Megaphone, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { timeAgo } from '../utils/helpers.js'

const KIND_ICON = {
  submission: { icon: Send, cls: 'bg-indigo-50 text-indigo-600' },
  success: { icon: Check, cls: 'bg-emerald-50 text-emerald-600' },
  error: { icon: AlertTriangle, cls: 'bg-rose-50 text-rose-600' },
  comment: { icon: MessageSquare, cls: 'bg-sky-50 text-sky-600' },
  appeal: { icon: Megaphone, cls: 'bg-amber-50 text-amber-600' },
  info: { icon: ShieldCheck, cls: 'bg-slate-50 text-slate-500' },
}

export default function NotificationsBell() {
  const { notifications, meKey, session, isAdmin, markNotificationsRead } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const mine = useMemo(() => {
    if (!meKey) return []
    const roles = isAdmin ? ['admin'] : [session?.roleLabel, 'student'].filter(Boolean)
    return [...notifications]
      .filter((n) => {
        const byRole = (n.roles || []).some((r) => roles.includes(r))
        const byUser = (n.userIds || []).includes(meKey)
        return byRole || byUser
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [notifications, meKey, isAdmin, session])

  const unread = mine.filter((n) => !(n.readBy || []).includes(meKey)).length

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((p) => !p)
          if (!open) markNotificationsRead()
        }}
        className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50"
        title="Thông báo"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[70] mt-2 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-800">Thông báo</p>
            <button
              onClick={markNotificationsRead}
              className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
            >
              <Check size={12} /> Đã đọc tất cả
            </button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {mine.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-slate-400">Chưa có thông báo nào.</p>
            )}
            {mine.map((n) => {
              const def = KIND_ICON[n.kind] || KIND_ICON.info
              const Icon = def.icon
              const read = (n.readBy || []).includes(meKey)
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-slate-50 px-4 py-3 ${read ? 'bg-white' : 'bg-indigo-50/40'}`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${def.cls}`}>
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-relaxed ${read ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>
                      {n.text}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}