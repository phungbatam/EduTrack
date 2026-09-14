import { useMemo } from 'react'
import { FileText, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import PointsBadge from './PointsBadge.jsx'
import {
  buildStandings,
  weeksInMonth,
  weekStartISO,
  isoWeekInfo,
  monthLabel,
  formatDate,
  matchesPeriod,
  scoresIn,
  statusOf,
  conductOf,
  VIOLATION_STATUS,
  GROUP_NAMES,
  ruleDelta,
} from '../utils/helpers.js'

const th = 'px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap'
const td = 'px-3 py-2 text-sm whitespace-nowrap'

export default function MonthlySummary({ year, month, studentId }) {
  const { students, rules, violations } = useApp()

  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])
  const stuMap = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])
  const period = { type: 'month', year, month }
  const weeks = useMemo(() => weeksInMonth(year, month), [year, month])

  const inMonth = useMemo(
    () => violations.filter((v) => scoresIn(v) && matchesPeriod(v.date, period)),
    [violations, period],
  )

  const pendingCount = violations.filter(
    (v) => scoresIn(v) && matchesPeriod(v.date, period) && (statusOf(v) === 'pendingClass' || statusOf(v) === 'pendingAdmin'),
  ).length

  const weekRows = useMemo(
    () =>
      weeks.map((w) => ({
        w,
        dates: `${formatDate(weekStartISO(w))} - ${formatDate(new Date(new Date(`${weekStartISO(w)}T00:00:00`).getTime() + 6 * 86400000).toISOString().slice(0, 10))}`,
        rows: buildStandings(students, rules, violations, { type: 'week', year: w.year, week: w.week }).rows,
      })),
    [weeks, students, rules, violations],
  )

  const monthRows = useMemo(() => buildStandings(students, rules, violations, period).rows, [students, rules, violations, period])

  const matrix = useMemo(() => {
    const acc = {}
    weeks.forEach((w) => {
      const key = `${w.year}-W${w.week}`
      violations
        .filter((v) => scoresIn(v) && v.date)
        .forEach((v) => {
          const i = isoWeekInfo(v.date)
          if (!i || `${i.year}-W${i.week}` !== key) return
          if (!acc[v.studentId]) acc[v.studentId] = { total: 0, week: {} }
          const delta = ruleDelta(ruleMap[v.ruleId])
          acc[v.studentId].total += delta
          acc[v.studentId].week[key] = (acc[v.studentId].week[key] || 0) + delta
        })
    })
    return acc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks, violations, ruleMap])

  const diary = useMemo(() => {
    return inMonth
      .filter((v) => (studentId ? v.studentId === studentId : true))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.studentId || '').localeCompare(b.studentId || ''))
  }, [inMonth, studentId])

  const displayRows = studentId ? monthRows.filter((r) => r.student.id === studentId) : monthRows
  const display = displayRows

  const pendingNote = pendingCount > 0 && (
    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
      <AlertTriangle size={16} />
      Có {pendingCount} vi phạm trong tháng đang chờ duyệt - bảng tổng kết này đang tính điểm tạm thời. Khi duyệt xong điểm sẽ được cập nhật lại.
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm print:bg-white print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Báo cáo tổng kết</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold text-slate-800">
              <FileText size={20} className="text-indigo-500" /> TỔNG KẾT {monthLabel({ month, year })} · LỚP 12A3
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tổng số tuần làm việc: {weeks.length} · Số vi phạm đã tính điểm trong tháng: {inMonth.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-500">
            Xuất/In: bấm <b>Ctrl+P</b> và chọn "Save as PDF"
          </div>
        </div>
      </div>

      {pendingNote}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:shadow-none">
        <h3 className="mb-3 font-bold text-slate-800">
          I. Tổng kết {monthLabel({ month, year })} - Xếp loại hạnh kiểm
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className={th}>STT</th>
                <th className={th}>Mã HS</th>
                <th className={th}>Họ tên</th>
                <th className={th}>Tổ</th>
                <th className={`${th} text-center`}>Vi phạm</th>
                <th className={`${th} text-center`}>Khen</th>
                <th className={`${th} text-right`}>Điểm trừ</th>
                <th className={`${th} text-right`}>Điểm cộng</th>
                <th className={`${th} text-right`}>Điểm TB tuần</th>
                <th className={`${th} text-center`}>Xếp loại</th>
              </tr>
            </thead>
            <tbody>
              {display.length === 0 && (
                <tr>
                  <td colSpan={10} className={`${td} text-center text-slate-400`}>Không có học sinh.</td>
                </tr>
              )}
              {display.map((r, i) => {
                const c = conductOf(r.score)
                return (
                  <tr key={r.student.id} className="border-b border-slate-100 last:border-0">
                    <td className={td}>{studentId ? '' : i + 1}</td>
                    <td className={`${td} font-mono text-xs text-slate-400`}>{r.student.code}</td>
                    <td className={`${td} font-semibold text-slate-700`}>
                      {r.student.name}
                      {studentId && <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">Bạn</span>}
                    </td>
                    <td className={td}>{GROUP_NAMES[r.student.group]}</td>
                    <td className={`${td} text-center text-slate-500`}>{r.violations}</td>
                    <td className={`${td} text-center text-emerald-600`}>{r.bonuses}</td>
                    <td className={`${td} text-right font-bold text-rose-600`}>-{r.deducted}đ</td>
                    <td className={`${td} text-right font-bold text-emerald-600`}>+{r.bonus}đ</td>
                    <td className={`${td} text-right font-bold text-slate-800`}>{r.score}</td>
                    <td className={`${td} text-center`}>
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${c.cls}`}>{c.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:shadow-none">
        <h3 className="mb-3 font-bold text-slate-800">II. Chi tiết theo từng tuần</h3>
        <div className="space-y-4">
          {weekRows.map(({ w, dates, rows }) => {
            const list = studentId ? rows.filter((r) => r.student.id === studentId) : rows
            return (
              <div key={`${w.year}-W${w.week}`} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
                  <p className="text-sm font-bold text-slate-700">Tuần {w.week}</p>
                  <p className="text-xs text-slate-400">{dates}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className={th}>STT</th>
                        <th className={th}>Mã HS</th>
                        <th className={th}>Họ tên</th>
                        <th className={th}>Tổ</th>
                        <th className={`${th} text-right`}>Điểm trừ</th>
                        <th className={`${th} text-right`}>Điểm cộng</th>
                        <th className={`${th} text-right`}>Điểm</th>
                        <th className={`${th} text-center`}>Xếp loại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.length === 0 && (
                        <tr>
                          <td colSpan={8} className={`${td} text-center text-slate-400`}>Không có dữ liệu.</td>
                        </tr>
                      )}
                      {list.map((r, i) => {
                        const c = conductOf(r.score)
                        return (
                          <tr key={r.student.id} className="border-b border-slate-100 last:border-0">
                            <td className={td}>{studentId ? '' : i + 1}</td>
                            <td className={`${td} font-mono text-xs text-slate-400`}>{r.student.code}</td>
                            <td className={`${td} font-semibold text-slate-700`}>{r.student.name}</td>
                            <td className={td}>{GROUP_NAMES[r.student.group]}</td>
                            <td className={`${td} text-right text-rose-600`}>-{r.deducted}đ</td>
                            <td className={`${td} text-right text-emerald-600`}>+{r.bonus}đ</td>
                            <td className={`${td} text-right font-bold text-slate-800`}>{r.score}</td>
                            <td className={`${td} text-center`}>
                              <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${c.cls}`}>{c.label}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:shadow-none">
        <h3 className="mb-3 font-bold text-slate-800">III. Ma trận điểm (trừ/cộng) theo tuần</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className={th}>Học sinh</th>
                {weeks.map((w) => (
                  <th key={`${w.year}-W${w.week}`} className={`${th} text-center`}>Tuần {w.week}</th>
                ))}
                <th className={`${th} text-center`}>Tổng</th>
              </tr>
            </thead>
            <tbody>
              {display.map((r) => {
                const m = matrix[r.student.id] || { week: {} }
                return (
                  <tr key={r.student.id} className="border-b border-slate-100 last:border-0">
                    <td className={`${td} font-semibold text-slate-700`}>{r.student.name}</td>
                    {weeks.map((x) => {
                      const k = `${x.year}-W${x.week}`
                      const v = m.week[k] || 0
                      return (
                        <td key={k} className={`${td} text-center ${v > 0 ? 'font-bold text-emerald-600' : v < 0 ? 'font-bold text-rose-600' : 'text-slate-300'}`}>
                          {v > 0 ? `+${v}` : v < 0 ? `${v}đ` : '—'}
                        </td>
                      )
                    })}
                    <td className={`${td} text-center font-bold ${m.total > 0 ? 'text-emerald-600' : m.total < 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                      {m.total > 0 ? `+${m.total}` : m.total < 0 ? `${m.total}đ` : '—'}
                    </td>
                  </tr>
                )
              })}
              {display.length === 0 && (
                <tr>
                  <td colSpan={weeks.length + 2} className={`${td} text-center text-slate-400`}>Không có dữ liệu.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Ô hiển thị <b>+điểm</b> là khen thưởng (cộng điểm), <b>-điểm</b> là vi phạm (trừ điểm); dấu <b>—</b> nghĩa là không có ghi nhận trong tuần đó.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:shadow-none">
        <h3 className="mb-3 font-bold text-slate-800">IV. Nhật ký vi phạm {monthLabel({ month, year })}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className={th}>Ngày</th>
                <th className={th}>Học sinh</th>
                <th className={th}>Mã HS</th>
                <th className={th}>Lỗi vi phạm</th>
                <th className={`${th} text-right`}>Điểm</th>
                <th className={th}>Người ghi</th>
                <th className={th}>Ghi chú</th>
                <th className={th}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {diary.length === 0 && (
                <tr>
                  <td colSpan={8} className={`${td} text-center text-slate-400`}>Không có vi phạm nào trong tháng này.</td>
                </tr>
              )}
              {diary.map((v) => {
                const st = statusOf(v)
                const s = VIOLATION_STATUS[st]
                return (
                  <tr key={v.id} className="border-b border-slate-100 last:border-0">
                    <td className={`${td} text-slate-500`}>{formatDate(v.date)}</td>
                    <td className={`${td} font-semibold text-slate-700`}>{stuMap[v.studentId]?.name || '—'}</td>
                    <td className={`${td} font-mono text-xs text-slate-400`}>{stuMap[v.studentId]?.code || ''}</td>
                    <td className={`${td} text-slate-600`}>{ruleMap[v.ruleId]?.name || '—'}</td>
                    <td className={`${td} text-right`}>
                      <PointsBadge rule={ruleMap[v.ruleId]} />
                    </td>
                    <td className={`${td} text-xs text-slate-400`}>{v.by || 'Nhập tay'}</td>
                    <td className={`${td} max-w-[240px] truncate text-xs text-slate-400`}>{v.note || '—'}</td>
                    <td className={td}>
                      <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}