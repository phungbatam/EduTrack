import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Lock, ShieldCheck, Award, AlertTriangle, Medal, ChevronDown, Hourglass } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import PointsBadge from '../components/PointsBadge.jsx'
import {
  buildStandings,
  availableWeeks,
  currentWeek,
  matchesPeriod,
  weekStartISO,
  formatDate,
  isoWeekInfo,
  conductOf,
  GROUP_NAMES,
  GROUP_COLORS,
  statusOf,
  VIOLATION_STATUS,
  scoresIn,
  ruleDelta,
  violationDateLabel,
} from '../utils/helpers.js'

const wkKey = (w) => `${w.year}-W${w.week}`

function addDaysISO(iso, n) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function WeekAccordion({ w, open, locked, myRow, myGroup, me, students, ruleMap, myWeekViolations, groups, onToggle }) {
  const conduct = conductOf(myRow ? myRow.score : 100)
  const weekDelta = myWeekViolations.reduce((s, v) => s + ruleDelta(ruleMap[v.ruleId]), 0)
  const pendingCount = myWeekViolations.filter((v) => statusOf(v) === 'pendingClass' || statusOf(v) === 'pendingAdmin').length
  const medal = { 1: 'text-amber-400', 2: 'text-slate-400', 3: 'text-orange-400' }

  return (
    <div className={`overflow-hidden rounded-2xl border shadow-sm transition ${open ? 'border-sky-300 ring-4 ring-sky-100' : 'border-slate-200'}`}>
      <button
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 bg-white px-4 py-4 text-left hover:bg-slate-50/60"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
          {locked ? <Lock size={18} className="text-amber-500" /> : <CalendarDays size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold text-slate-800">
            Tuần {w.week}
            <span className="text-xs font-medium text-slate-400">
              {formatDate(weekStartISO(w))} → {formatDate(addDaysISO(weekStartISO(w), 6))}
            </span>
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                <Lock size={10} /> Đã chốt
              </span>
            )}
          </p>
          {pendingCount > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <Hourglass size={11} /> {pendingCount} vi phạm đang chờ duyệt (điểm tính tạm)
            </p>
          )}
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-xs text-slate-400">Điểm tuần</p>
            <p className="text-lg font-extrabold text-slate-800">{myRow ? myRow.score : '—'}</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs text-slate-400">Xếp loại</p>
            <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${conduct.cls}`}>{conduct.label}</span>
          </div>
          <ChevronDown size={20} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="space-y-5 border-t border-slate-100 bg-white p-5">
          {locked && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              <ShieldCheck size={18} />
              Tuần này đã được chốt làm bằng chứng. Vi phạm trong tuần không thể thay đổi.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: 'Điểm thi đua tuần', value: myRow ? myRow.score : '—' },
              { label: 'Xếp hạng lớp', value: myRow ? `#${myRow.rank}` : '—', sub: `/ ${students.length}` },
              { label: 'Số lỗi trong tuần', value: myRow ? myRow.violations : 0 },
              { label: 'Điểm trừ', value: weekDelta < 0 ? `${weekDelta}đ` : '0đ' },
              { label: 'Điểm cộng', value: weekDelta > 0 ? `+${weekDelta}đ` : '0đ' },
              { label: 'Hạng tổ', value: myGroup ? `#${myGroup.rank}` : '—', sub: `/ ${groups.length}` },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-800">
                  {c.value}
                  {c.sub && <span className="text-xs font-medium text-slate-400">{c.sub}</span>}
                </p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-bold text-slate-800">
                <AlertTriangle size={18} className="text-rose-500" />
                Lịch sử ghi nhận tuần {w.week}
              </h3>
              {myGroup && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Medal size={14} className={medal[myGroup.rank] || 'text-slate-400'} />
                  {GROUP_NAMES[me.group]}: hạng {myGroup.rank} · điểm TB {myGroup.avg}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2.5 pr-3 font-semibold">Ngày</th>
                    <th className="py-2.5 pr-3 font-semibold">Lỗi vi phạm / khen thưởng</th>
                    <th className="py-2.5 pr-3 font-semibold">Điểm</th>
                    <th className="py-2.5 pr-3 font-semibold">Ghi chú</th>
                    <th className="py-2.5 pr-3 font-semibold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {myWeekViolations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tuần này bạn không có ghi nhận nào. Tuyệt vời!
                      </td>
                    </tr>
                  )}
                  {myWeekViolations.map((v) => {
                    const rule = ruleMap[v.ruleId]
                    const s = VIOLATION_STATUS[statusOf(v)]
                    return (
                      <tr key={v.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 pr-3 text-slate-500">{violationDateLabel(v.date)}</td>
                        <td className="py-2.5 pr-3 font-medium text-slate-700">
                          {rule ? rule.name : '—'}
                          {v.by && <span className="ml-2 text-[10px] font-normal text-slate-400">bởi {v.by}</span>}
                        </td>
                        <td className="py-2.5 pr-3">
                          <PointsBadge rule={rule} />
                        </td>
                        <td className="max-w-[260px] truncate py-2.5 pr-3 text-xs text-slate-400">{v.note || '—'}</td>
                        <td className="py-2.5 pr-3">
                          {locked ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              <Lock size={10} /> Đã chốt
                            </span>
                          ) : null}
                          <span className={`ml-1 inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
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

          <div>
            <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
              <Award size={18} className="text-amber-500" /> Xếp hạng các Tổ tuần {w.week}
            </h3>
            <ul className="space-y-2.5">
              {groups.map((g) => {
                const isMine = g.group === me.group
                const color = GROUP_COLORS[g.group]
                return (
                  <li
                    key={g.group}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      isMine ? 'border-sky-200 bg-sky-50/70 ring-2 ring-sky-100' : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                      <Medal size={16} className={medal[g.rank]} />
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: color }}>
                      {g.group}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-700">
                        {GROUP_NAMES[g.group]}
                        {isMine && <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold text-white">Tổ của bạn</span>}
                      </p>
                      <p className="text-[11px] text-slate-400">Hạng {g.rank} · {g.totalViolations} lỗi · {g.members} HS</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-slate-800">{g.avg}</p>
                      <p className="text-[10px] text-slate-400">điểm TB</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudentWeeks() {
  const { session, students, rules, violations, lockedWeeks, isWeekLocked } = useApp()
  const me = students.find((s) => s.id === session.id) || session

  const ruleMap = useMemo(() => Object.fromEntries(rules.map((r) => [r.id, r])), [rules])

  const current = useMemo(() => currentWeek(), [])
  const [openKey, setOpenKey] = useState(() => wkKey(current))

  const weekList = useMemo(() => {
    const map = new Map()
    availableWeeks(violations).forEach((w) => map.set(wkKey(w), w))
    lockedWeeks.forEach((l) => map.set(wkKey(l), { year: l.year, week: l.week }))
    return [...map.values()].sort((a, b) => b.year - a.year || b.week - a.week)
  }, [violations, lockedWeeks])

  useEffect(() => {
    if (weekList.length > 0 && !weekList.some((w) => wkKey(w) === openKey)) {
      setOpenKey(wkKey(weekList[0]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekList, openKey])

  const prevSigRef = useRef(null)
  useEffect(() => {
    const mine = violations.filter((v) => v.studentId === me.id)
    const sig = mine
      .map((v) => `${v.id}:${statusOf(v)}:${v.date}`)
      .sort()
      .join('|')
    if (prevSigRef.current === null) {
      prevSigRef.current = sig
      return
    }
    if (prevSigRef.current === sig) return
    prevSigRef.current = sig
    const newest = [...mine].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
    if (!newest || !newest.date) return
    const info = isoWeekInfo(newest.date)
    const key = info ? wkKey(info) : null
    if (key && weekList.some((w) => wkKey(w) === key)) setOpenKey(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violations, me.id, weekList])

  const myTotal = useMemo(() => {
    const inScope = violations.filter((v) => v.studentId === me.id && scoresIn(v))
    return inScope.reduce((s, v) => s + ruleDelta(ruleMap[v.ruleId]), 0)
  }, [violations, me.id, ruleMap])

  const pendingAll = useMemo(
    () => violations.filter((v) => v.studentId === me.id && (statusOf(v) === 'pendingClass' || statusOf(v) === 'pendingAdmin')).length,
    [violations, me.id],
  )

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              <CalendarDays size={22} /> Vi phạm theo tuần của tôi
            </h2>
            <p className="mt-1 text-sm text-sky-100">
              Bấm vào từng tuần để xem chi tiết. Tuần nào được giáo viên chủ nhiệm{' '}
              <b>chốt (Lưu tuần)</b> thì vi phạm được giữ nguyên làm bằng chứng.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
            <Award size={22} className="text-amber-300" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-sky-200">Chênh điểm cả năm</p>
              <p className="text-2xl font-extrabold leading-tight">{myTotal >= 0 ? '+' : ''}{myTotal}đ</p>
            </div>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-sky-100">
          {pendingAll > 0 && (
            <>
              <Hourglass size={13} /> Có {pendingAll} vi phạm đang chờ duyệt - điểm đang tạm tính.
            </>
          )}
          {pendingAll === 0 && 'Tất cả vi phạm hiển thị đều đã được duyệt.'}
        </p>
      </div>

      <div className="space-y-3">
        {weekList.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-slate-500">Chưa có dữ liệu tuần nào để hiển thị.</p>
            <p className="mt-1 text-sm text-slate-400">Khi có vi phạm được ghi nhận, các tuần sẽ xuất hiện tại đây.</p>
          </div>
        )}
        {weekList.map((w) => {
          const key = wkKey(w)
          const open = key === openKey
          const period = { type: 'week', year: w.year, week: w.week }
          const locked = isWeekLocked(w)
          const { rows, groups } = buildStandings(students, rules, violations, period)
          const myRow = rows.find((r) => r.student.id === me.id)
          const myGroup = groups.find((g) => g.group === me.group)
          const myWeekViolations = violations
            .filter((v) => v.studentId === me.id && matchesPeriod(v.date, period))
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
          return (
            <WeekAccordion
              key={key}
              w={w}
              open={open}
              locked={locked}
              myRow={myRow}
              myGroup={myGroup}
              me={me}
              students={students}
              ruleMap={ruleMap}
              myWeekViolations={myWeekViolations}
              groups={groups}
              rows={rows}
              onToggle={() => setOpenKey(open ? null : key)}
            />
          )
        })}
      </div>
    </div>
  )
}