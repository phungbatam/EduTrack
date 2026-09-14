import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

export default function Toasts() {
  const { toasts, dismissToast } = useApp()
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const isError = t.type === 'error'
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl border bg-white p-3 shadow-lg ${
              isError ? 'border-rose-200' : 'border-emerald-200'
            }`}
          >
            {isError ? (
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
            ) : (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
            )}
            <p className="flex-1 text-sm font-medium text-slate-700">{t.message}</p>
            <button onClick={() => dismissToast(t.id)} className="shrink-0 text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}