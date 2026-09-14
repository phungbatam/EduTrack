const COLORS = {
  indigo: 'bg-indigo-100 text-indigo-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  rose: 'bg-rose-100 text-rose-600',
  amber: 'bg-amber-100 text-amber-600',
  sky: 'bg-sky-100 text-sky-600',
  violet: 'bg-violet-100 text-violet-600',
}

export default function StatCard({ label, value, icon: Icon, color = 'indigo', hint }) {
  const chip = COLORS[color] || COLORS.indigo
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 md:text-sm">{label}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-800 md:text-3xl">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${chip}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}