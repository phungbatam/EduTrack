import { useMemo, useState } from 'react'
import { Brush, Droplets, CalendarRange, ChevronRight, Check } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import {
  weekLabel,
  availableWeeks,
  currentWeek,
  isoWeekInfo,
  studentWeekSanction,
  violationPenaltyInfo,
  PENALTY_FORMS,
  PENALTY_LABOR_POINTS,
  violationDateLabel,
  scoresIn,
} from '../utils/helpers.js'

export default function PenaltyView() {
  const { session, students, rules, violations, penalties, setPenalty, notify } = useApp()
  const [weekSel, setWeekSel] = useState(() => {
    const c = currentWeek()
    return `${c.year}-W${c.week}`
  })

  const weeks = useMemo(() => availableWeeks(violations), [violations])
  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])

  const [yw, wkn] = useMemo(() => {
    const parts = weekSel.split('-W')
    return [Number(parts[0]), Number(parts[1])]
  }, [weekSel])
  const week = { type: 'week', year: yw, week: wkn }

  const rows = useMemo(() => {
    const out = []
    students.forEach((stu) => {
      const s = studentWeekSanction(violations, stu.id, week, ruleMap)
      if (s.type === 'none') return
      const details = violations
        .filter((v) => v && scoresIn(v) && v.studentId === stu.id && (() => { const w = isoWeekInfo(v.date); return w && w.year === yw && w.week === wkn })())
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      out.push({ student: stu, sanction: s, details })
    })
    return out.sort((a, b) => {
      const order = { labor: 0, duty: 1 }
      if (order[a.sanction.type] !== order[b.sanction.type]) return order[a.sanction.type] - order[b.sanction.type]
      return b.sanction.points - a.sanction.points
    })
  }, [students, violations, ruleMap, week, yw, wkn])

  const totals = useMemo(
    () =>
      rows.reduce(
        (t, r) => {
          if (r.sanction.type === 'duty') t.dutyCount += 1
          else if (r.sanction.type === 'labor') t.laborCount += 1
          return t
        },
        { dutyCount: 0, laborCount: 0 },
      ),
    [rows],
  )

  const penaltyOf = (studentId) =>
    penalties.find((p) => p.studentId === studentId && p.year === yw && p.week === wkn) || null

  const entryOf = (studentId) => {
    const e = penaltyOf(studentId)
    return {
      laborDays: e && e.laborDays != null ? e.laborDays : 1,
      dutyDone: e ? Boolean(e.dutyDone) : false,
      laborDone: e ? Boolean(e.laborDone) : false,
    }
  }

  const save = (studentId, patch) => {
    const e = entryOf(studentId)
    setPenalty({ studentId, year: yw, week: wkn, dutyDone: patch.dutyDone != null ? patch.dutyDone : e.dutyDone, laborDone: patch.laborDone != null ? patch.laborDone : e.laborDone, laborDays: patch.laborDays != null ? patch.laborDays : e.laborDays })
  }

  const isLaborRole = session && session.role !== 'admin' && session.roleLabel === 'Lớp phó lao động'

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <Brush size={18} className="text-sky-500" />
              Trực nhật – Lao động theo tuần
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Số lần vi phạm để tăng ngày phạt đếm trong tuần và <b>reset khi sang tuần mới</b>; vi phạm tuần cũ vẫn
              lưu trong lịch sử. Tuần này người quản lí là Lớp phó lao động.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-slate-400" />
            <select value={weekSel} onChange={(e) => setWeekSel(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
              {weeks.map((w) => (
                <option key={`${w.year}-W${w.week}`} value={`${w.year}-W${w.week}`}>
                  {weekLabel(w)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Học sinh phạt trực nhật</p>
            <p className="mt-1 text-xl font-extrabold text-sky-600">{totals.dutyCount}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Học sinh đi lao động</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-600">{totals.laborCount}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 lg:col-span-2">
            <p className="text-xs text-slate-500">Quy tắc ngưỡng</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Tổng điểm vi phạm trong tuần <b className="text-rose-600">≥ {PENALTY_LABOR_POINTS}</b> điểm → đi lao
              động 1 ngày (sửa được tay); dưới ngưỡng → trực nhật theo cấp số nhân trong tuần.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h3 className="flex items-center gap-2 font-bold text-slate-800">
            <Droplets size={18} className="text-sky-500" /> Danh sách {weekLabel(week)}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">Học sinh</th>
                <th className="px-4 py-3 font-semibold">Điểm tuần</th>
                <th className="px-4 py-3 font-semibold">Hình phạt</th>
                <th className="px-4 py-3 font-semibold">Chi tiết lỗi</th>
                <th className="px-4 py-3 font-semibold">Hoàn thành</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    Tuần này không có học sinh nào bị phạt trực nhật hoặc lao động.
                  </td>
                </tr>
              )}
              {rows.map(({ student, sanction, details }) => {
                const e = entryOf(student.id)
                const laborDays = e.laborDays
                const isLabor = sanction.type === 'labor'
                const done = isLabor ? e.laborDone : e.dutyDone
                return (
                  <tr key={student.id} className={`border-b border-slate-50 last:border-0 ${done ? 'bg-emerald-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-700">{student.name}</p>
                      <p className="text-[11px] text-slate-400">{student.code} · Tổ {student.group}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-extrabold ${sanction.points >= PENALTY_LABOR_POINTS ? 'text-rose-600' : 'text-slate-700'}`}>
                        {sanction.points}
                      </span>
                      <span className="text-xs text-slate-400"> đ</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold ${PENALTY_FORMS[isLabor ? 'labor' : 'duty'].cls}`}>
                          {isLabor ? `Đi lao động ${laborDays} ngày` : `Trực nhật ${sanction.dutyDays} ngày`}
                        </span>
                        {isLabor && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            sửa:
                            <input
                              type="number"
                              min={1}
                              value={laborDays || 1}
                              onChange={(ev) => save(student.id, { laborDays: Number(ev.target.value) })}
                              className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-emerald-400"
                              title="Số ngày lao động"
                            />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ul className="space-y-0.5">
                        {details.map((v) => {
                          const rule = ruleMap[v.ruleId]
                          const pinfo = violationPenaltyInfo(violations, v, ruleMap)
                          return (
                            <li key={v.id} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <ChevronRight size={11} className="text-slate-300" />
                              {violationDateLabel(v.date)}: {rule ? rule.name : '—'} (-{rule ? rule.points : 0}đ)
                              {pinfo && (
                                <span className={`inline-block rounded border px-1 py-0.5 text-[9px] font-bold ${PENALTY_FORMS[pinfo.form].cls}`}>
                                  {PENALTY_FORMS[pinfo.form].label} {pinfo.days} ngày
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (isLabor) {
                            save(student.id, { laborDone: !e.laborDone })
                            notify((!e.laborDone ? 'Đã đánh dấu hoàn thành lao động: ' : 'Bỏ đánh dấu lao động: ') + student.name)
                          } else {
                            save(student.id, { dutyDone: !e.dutyDone })
                            notify((!e.dutyDone ? 'Đã đánh dấu hoàn thành trực nhật: ' : 'Bỏ đánh dấu trực nhật: ') + student.name)
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                          done
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
                        }`}
                      >
                        <Check size={14} />
                        {done ? 'Đã xong' : isLabor ? 'Đã đi lao động?' : 'Đã làm trực nhật?'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400">
            Đây là danh sách phạt tự động từ vi phạm đã duyệt. {isLaborRole ? 'Bạn là Lớp phó lao động — hãy đối chiếu danh sách thực tế và đánh dấu hoàn thành.' : 'Giáo viên có thể sửa số ngày lao động và đánh dấu hoàn thành.'}
          </div>
        )}
      </div>
    </div>
  )
}