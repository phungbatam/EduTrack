export default function BarChart({ data, height = 180, color = '#6366f1', valueSuffix = '' }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const maxBarH = height - 26
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => {
          const barH = Math.max((d.value / max) * maxBarH, 3)
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] font-semibold text-slate-600">
                {d.value}
                {valueSuffix}
              </span>
              <div
                className="w-full rounded-t-md"
                style={{ height: barH, backgroundColor: d.color || color }}
                title={d.tooltip || d.label}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 truncate text-center text-[11px] font-medium text-slate-500">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}