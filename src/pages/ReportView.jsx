import { useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, FileDown, Loader2, Trophy, Medal, School, CalendarRange, Lock, Printer, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import BarChart from '../components/BarChart.jsx'
import MonthlySummary from '../components/MonthlySummary.jsx'
import PointsBadge from '../components/PointsBadge.jsx'
import {
  buildStandings,
  ruleStats,
  weeklyTrend,
  currentPeriod,
  currentMonth,
  availableWeeks,
  GROUP_NAMES,
  GROUP_COLORS,
  periodLabel,
  formatDate,
  weekLabel,
  violationDateLabel,
  scoresIn,
  conductOf,
  CONDUCT_LEVELS,
  isBonus,
  ruleDelta,
  matchesPeriod,
  academicLabel,
  academicCls,
  currentWeek,
  violationPenaltyInfo,
  PENALTY_FORMS,
} from '../utils/helpers.js'
import { exportReportXlsx } from '../utils/excel.js'
import { exportNodeToPdf } from '../utils/pdf.js'

export default function ReportView() {
  const { students, rules, violations, isWeekLocked, notify } = useApp()
  const [periodType, setPeriodType] = useState('week')
  const [weekSel, setWeekSel] = useState(() => {
    const c = currentPeriod()
    return `${c.year}-W${c.week}`
  })
  const [monthSel, setMonthSel] = useState(() => {
    const m = currentMonth()
    return `${m.year}-${String(m.month).padStart(2, '0')}`
  })
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef(null)

  const weeks = useMemo(() => availableWeeks(violations), [violations])

  const period = useMemo(() => {
    if (periodType === 'month') {
      const [y, m] = monthSel.split('-').map(Number)
      return { type: 'month', year: y, month: m }
    }
    if (periodType === 'week') {
      const [y, w] = weekSel.split('-W').map(Number)
      return { type: 'week', year: y, week: w }
    }
    return { type: 'all' }
  }, [periodType, weekSel, monthSel])

  const { rows, groups } = useMemo(
    () => buildStandings(students, rules, violations, period),
    [students, rules, violations, period],
  )

  const rStats = useMemo(() => ruleStats(violations, rules, period), [violations, rules, period])
  const trend = useMemo(() => weeklyTrend(violations), [violations])
  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])

  const locked =
    period.type === 'week' ? isWeekLocked({ year: period.year, week: period.week }) : false

  const conductDist = useMemo(() => {
    const acc = { 'Tốt': 0, 'Khá': 0, 'Đạt': 0, 'Chưa đạt': 0 }
    rows.forEach((r) => {
      const label = conductOf(r.score).label
      acc[label] = (acc[label] || 0) + 1
    })
    return acc
  }, [rows])

  const filteredPeriod = useMemo(
    () =>
      violations
        .filter((v) => scoresIn(v) && matchesPeriod(v.date, period))
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [violations, period],
  )

  const totalMeanwhile = filteredPeriod.length
  const totalDelta = filteredPeriod.reduce((s, v) => s + ruleDelta(ruleMap[v.ruleId]), 0)
  const activeGroups = groups.filter((g) => g.members > 0)
  const classAvg = activeGroups.length
    ? +(activeGroups.reduce((s, g) => s + g.avg, 0) / activeGroups.length).toFixed(1)
    : 0

  const bestGroup = groups.find((g) => g.rank === 1)
  const worstStudent = rows.find((r) => r.violations > 0)

  const exportExcel = () => {
    exportReportXlsx({ rows, groups, rStats, ruleMap, period })
    notify('Đã xuất báo cáo Excel.')
  }

  const exportPDF = async () => {
    if (!reportRef.current) return
    setExporting(true)
    try {
      await exportNodeToPdf(reportRef.current, `bao-cao-thi-dua-${periodLabel(period).replace(/[/ ]/g, '-')}.pdf`)
      notify('Đã xuất báo cáo PDF.')
    } catch (err) {
      console.error(err)
      notify('Lỗi khi xuất PDF: ' + err.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  const printReport = () => {
    window.print()
  }

  const reportTitle =
    period.type === 'month'
      ? 'BÁO CÁO TỔNG KẾT THÁNG'
      : period.type === 'all'
        ? 'BÁO CÁO TỔNG KẾT CẢ NĂM'
        : 'BÁO CÁO VI PHẠM TUẦN'

  const inputCls =
    'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

  const periodTabs = [
    { key: 'week', label: 'Theo tuần' },
    { key: 'month', label: 'Theo tháng' },
    { key: 'all', label: 'Cả năm' },
  ]

  const medalColor = { 1: 'text-amber-400', 2: 'text-slate-400', 3: 'text-orange-400' }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <CalendarRange size={18} className="text-indigo-500" />
              Kỳ báo cáo: {periodLabel(period)}
              {locked && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">
                  <Lock size={12} /> Tuần đã chốt - bằng chứng
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Chọn kỳ để xem trước và xuất báo cáo Excel / PDF. Báo cáo dùng để in hoặc gửi GVCN / phụ huynh.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {periodTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setPeriodType(t.key)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    periodType === t.key ? 'bg-white text-slate-800 shadow' : 'text-slate-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {periodType === 'week' && (
              <select value={weekSel} onChange={(e) => setWeekSel(e.target.value)} className={inputCls}>
                {weeks.map((w) => (
                  <option key={`${w.year}-W${w.week}`} value={`${w.year}-W${w.week}`}>
                    {weekLabel(w)}
                  </option>
                ))}
              </select>
            )}
            {periodType === 'month' && (
              <input type="month" value={monthSel} onChange={(e) => setMonthSel(e.target.value)} className={inputCls} />
            )}
            <button
              onClick={exportExcel}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              <FileSpreadsheet size={16} /> Xuất Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
              {exporting ? 'Đang tạo...' : 'Xuất PDF'}
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
            >
              <Printer size={16} /> In ấn
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Số học sinh</p>
            <p className="mt-1 text-xl font-extrabold text-slate-800">{students.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Số ghi nhận trong kỳ</p>
            <p className="mt-1 text-xl font-extrabold text-rose-600">{totalMeanwhile}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Thay đổi điểm (trừ/cộng)</p>
            <p className={`mt-1 text-xl font-extrabold ${totalDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {totalDelta >= 0 ? '+' : ''}{totalDelta}đ
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Điểm TB lớp</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-600">{classAvg}</p>
          </div>
        </div>
      </div>

      <div ref={reportRef} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:p-0">
        <ReportHeader
          title={reportTitle}
          locked={locked}
          periodLabelText={periodLabel(period)}
          totalMeanwhile={totalMeanwhile}
          classAvg={classAvg}
          bestGroup={bestGroup}
          worstStudent={worstStudent}
        />

        {period.type === 'month' ? (
          <MonthlySummary year={period.year} month={period.month} />
        ) : (
          <>
        {period.type === 'all' && (
          <div className="mb-1 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs leading-relaxed text-slate-600">
            <span className="font-bold text-indigo-700">Công thức tính điểm cả năm:</span>{' '}
            Điểm từng tuần = <b>{'max(0, 100 + điểm cộng khen thưởng − điểm trừ vi phạm đã duyệt trong tuần)'}</b> (tính cả khen thưởng lẫn vi phạm của tất cả các tuần, các tháng);
            Điểm cả năm = <b>trung bình cộng (Điểm Tuần 1 → Tuần {currentWeek().week})</b> của tất cả các tuần học đã diễn ra trong năm học.
          </div>
        )}
        <section>
          <SectionTitle>1. Bảng xếp hạng thi đua giữa các Tổ</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-indigo-50/60 text-xs uppercase tracking-wide text-indigo-600">
                  <th className="px-4 py-3 font-semibold">Xếp hạng</th>
                  <th className="px-4 py-3 font-semibold">Tổ</th>
                  <th className="px-4 py-3 font-semibold">Số học sinh</th>
                  <th className="px-4 py-3 font-semibold">Tổng số lỗi</th>
                  <th className="px-4 py-3 font-semibold">Điểm thi đua TB</th>
                  <th className="px-4 py-3 font-semibold">Mức đạt</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.group} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${g.rank <= 3 ? `bg-amber-50 ${medalColor[g.rank]}` : 'bg-slate-100 text-slate-500'}`}>
                        <Medal size={15} />
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white" style={{ backgroundColor: GROUP_COLORS[g.group] }}>
                        {g.group}
                      </span>
                      {GROUP_NAMES[g.group]}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{g.members}</td>
                    <td className="px-4 py-3 text-slate-500">{g.totalViolations}</td>
                    <td className="px-4 py-3">
                      <span className="font-extrabold text-slate-800">{g.avg}</span>
                      <span className="text-xs text-slate-400"> / 100</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${g.avg}%`, backgroundColor: GROUP_COLORS[g.group] }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SectionTitle>2. Chi tiết điểm thi đua từng học sinh</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Xếp hạng</th>
                  <th className="px-4 py-3 font-semibold">Mã HS</th>
                  <th className="px-4 py-3 font-semibold">Họ tên</th>
                  <th className="px-4 py-3 font-semibold">Tổ</th>
                  <th className="px-4 py-3 font-semibold">Chức vụ</th>
                  <th className="px-4 py-3 font-semibold">Lực học</th>
                  <th className="px-4 py-3 font-semibold">Số lỗi</th>
                  <th className="px-4 py-3 font-semibold">Khen</th>
                  <th className="px-4 py-3 font-semibold">Điểm trừ</th>
                  <th className="px-4 py-3 font-semibold">Điểm cộng</th>
                  <th className="px-4 py-3 font-semibold">Điểm thi đua</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.student.id}
                    className={`border-b border-slate-50 last:border-0 ${r.score >= 90 ? 'bg-emerald-50/30' : r.score < 75 ? 'bg-rose-50/40' : ''}`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-500">{r.rank}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.student.code || '—'}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.student.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{GROUP_NAMES[r.student.group]}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.student.role}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded-lg border px-2 py-0.5 text-[11px] font-bold ${academicCls(academicLabel(r.student))}`}>
                        {academicLabel(r.student)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{r.violations}</td>
                    <td className="px-4 py-2.5 text-emerald-600">{r.bonuses}</td>
                    <td className="px-4 py-2.5 text-rose-500">-{r.deducted}</td>
                    <td className="px-4 py-2.5 text-emerald-600">+{r.bonus}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${r.score >= 90 ? 'bg-emerald-50 text-emerald-600' : r.score >= 75 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                        {r.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SectionTitle>
            3. Tổng hợp xếp loại hạnh kiểm (theo điểm trung bình) - Tốt ≥ 90 · Khá ≥ 80 · Đạt ≥ 70
          </SectionTitle>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CONDUCT_LEVELS.map((l) => (
              <div key={l.label} className={`rounded-xl border ${l.cls} px-4 py-3 text-center`}>
                <p className="text-xl font-extrabold">{conductDist[l.label]}</p>
                <p className="text-xs font-semibold opacity-80">{l.label}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Xếp hạng</th>
                  <th className="px-4 py-3 font-semibold">Mã HS</th>
                  <th className="px-4 py-3 font-semibold">Họ tên</th>
                  <th className="px-4 py-3 font-semibold">Tổ</th>
                  <th className="px-4 py-3 font-semibold">Số lỗi</th>
                  <th className="px-4 py-3 font-semibold">Điểm TB</th>
                  <th className="px-4 py-3 font-semibold">Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const c = conductOf(r.score)
                  return (
                    <tr key={`c-${r.student.id}`} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2.5 font-semibold text-slate-500">{r.rank}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.student.code || '—'}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{r.student.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{GROUP_NAMES[r.student.group]}</td>
                      <td className="px-4 py-2.5 text-slate-500">{r.violations}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-700">{r.score}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${c.cls}`}>{c.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SectionTitle>4. Tổng hợp vi phạm / khen thưởng theo loại</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Lỗi vi phạm / khen thưởng</th>
                  <th className="px-4 py-3 font-semibold">Số lần</th>
                  <th className="px-4 py-3 font-semibold">Điểm / lần</th>
                  <th className="px-4 py-3 font-semibold">Tổng điểm</th>
                </tr>
              </thead>
              <tbody>
                {rStats.length ? (
                  rStats.map((s) => (
                    <tr key={s.rule.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{s.rule.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{s.count}</td>
                      <td className={`px-4 py-2.5 ${isBonus(s.rule) ? 'text-emerald-500' : 'text-rose-500'}`}>{isBonus(s.rule) ? '+' : '-'}{s.rule.points}đ</td>
                      <td className={`px-4 py-2.5 font-semibold ${isBonus(s.rule) ? 'text-emerald-600' : 'text-rose-600'}`}>{s.count * ruleDelta(s.rule) >= 0 ? '+' : ''}{s.count * ruleDelta(s.rule)}đ</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      Không có ghi nhận nào trong kỳ.
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-50/70">
                  <td className="px-4 py-2.5 font-bold text-slate-700">Tổng cộng</td>
                  <td className="px-4 py-2.5 font-bold text-slate-700">{filteredPeriod.length}</td>
                  <td className="px-4 py-2.5" />
                  <td className={`px-4 py-2.5 font-bold ${totalDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{totalDelta >= 0 ? '+' : ''}{totalDelta}đ</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SectionTitle>5. Xu hướng vi phạm theo tuần (8 tuần gần nhất)</SectionTitle>
          <BarChart data={trend} color="#6366f1" />
        </section>

        {filteredPeriod.length > 0 && (
          <section>
            <SectionTitle>6. Chi tiết các ghi nhận trong kỳ</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">Ngày</th>
                    <th className="px-4 py-3 font-semibold">Học sinh</th>
                    <th className="px-4 py-3 font-semibold">Lỗi vi phạm / khen thưởng</th>
                    <th className="px-4 py-3 font-semibold">Hình phạt</th>
                    <th className="px-4 py-3 font-semibold">Điểm</th>
                    <th className="px-4 py-3 font-semibold">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeriod.map((v) => {
                    const rule = ruleMap[v.ruleId]
                    const stu = students.find((s) => s.id === v.studentId)
                    const pinfo = violationPenaltyInfo(violations, v, ruleMap)
                    return (
                      <tr key={v.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-2 text-slate-500">{violationDateLabel(v.date)}</td>
                        <td className="px-4 py-2">
                          {stu ? `${stu.name}` : '—'}
                          <span className="text-xs text-slate-400"> · Tổ {stu ? stu.group : '?'}</span>
                        </td>
                        <td className="px-4 py-2 text-slate-600">{rule ? rule.name : '—'}</td>
                        <td className="px-4 py-2">
                          {pinfo ? (
                            <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold ${PENALTY_FORMS[pinfo.form].cls}`}>
                              {PENALTY_FORMS[pinfo.form].label} {pinfo.days} ngày · lần {pinfo.rank}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2"><PointsBadge rule={rule} /></td>
                        <td className="max-w-[200px] truncate px-4 py-2 text-xs text-slate-400">{v.note || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
          </>
        )}

        <p className="border-t border-dashed border-slate-200 pt-4 text-center text-xs text-slate-400">
          Báo cáo được tạo bởi EduTrack · Lớp 12A3 ·{' '}
          <b>
            Ngày xuất: {formatDate(new Date().toISOString().slice(0, 10))}
          </b>
        </p>
        <div className="mt-8 grid grid-cols-2 gap-6 pt-4">
          <p className="text-center text-xs text-slate-500">
            <span className="block font-semibold">Xác nhận của Trưởng lớp</span>
            <span className="mt-10 block border-t border-slate-300 pt-1">(Ký, ghi rõ họ tên)</span>
          </p>
          <p className="text-center text-xs text-slate-500">
            <span className="block font-semibold">Giáo viên chủ nhiệm</span>
            <span className="mt-10 block border-t border-slate-300 pt-1">(Ký, ghi rõ họ tên)</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <h4 className="mb-3 border-l-4 border-indigo-500 pl-3 text-sm font-bold text-slate-700">{children}</h4>
}

function ReportHeader({ title, locked, periodLabelText, totalMeanwhile, classAvg, bestGroup, worstStudent }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <School size={16} className="text-indigo-500" />
            TRƯỜNG THPT NGUYỄN TẤT THÀNH
          </p>
          <p className="text-xs text-slate-400">LỚP 12A3 - NĂM HỌC 2026 - 2027</p>
        </div>
        <div className="text-right">
          <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
          <p className="flex items-center justify-end gap-1.5 text-xs text-slate-400">
            Kỳ: {periodLabelText}
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                <ShieldCheck size={11} /> Tuần đã chốt
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
        <div className="text-center">
          <p className="text-[11px] text-slate-500">Số ghi nhận</p>
          <p className="text-lg font-extrabold text-rose-600">{totalMeanwhile}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-slate-500">Điểm TB lớp</p>
          <p className="text-lg font-extrabold text-emerald-600">{classAvg}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-slate-500">Tổ dẫn đầu</p>
          <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-slate-800">
            <Trophy size={16} className="text-amber-500" />
            {bestGroup ? GROUP_NAMES[bestGroup.group] : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[11px] text-slate-500">Điểm thấp nhất</p>
          <p className="truncate text-lg font-extrabold text-slate-800">
            {worstStudent ? worstStudent.score : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}