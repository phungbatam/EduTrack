import * as XLSX from 'xlsx'
import { formatDate, GROUP_NAMES, periodLabel, conductOf } from './helpers.js'

function normHeader(h) {
  return String(h || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function clean(v) {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function excelDateToISO(v) {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number') {
    const ms = Math.round((v - 25569) * 86400 * 1000)
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) return ''
    return toISODateLocal(d)
  }
  const s = clean(v)
  const m = s.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/)
  if (!m) return ''
  let y, mo, d
  if (m[1].length === 4) {
    ;[y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  } else {
    ;[d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
    if (y < 100) y += 2000
  }
  if (!y || !mo || !d) return ''
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function toISODateLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function parseGroup(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v >= 1 && v <= 4 ? v : null
  const m = String(v).match(/\d+/)
  if (!m) return null
  const n = parseInt(m[0], 10)
  return n >= 1 && n <= 4 ? n : null
}

function findHeader(headers, aliases) {
  for (const alias of aliases) {
    const hit = headers.find((h) => normHeader(h).includes(normHeader(alias)))
    if (hit) return hit
  }
  return null
}

function sheet(wb, name, rows, widths = []) {
  const ws = XLSX.utils.json_to_sheet(rows)
  if (widths.length) ws['!cols'] = widths.map((w) => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws, name)
}

export function exportStudentsXlsx(students, filename = 'danh-sach-hoc-sinh.xlsx') {
  const wb = XLSX.utils.book_new()
  const rows = students.map((s, i) => ({
    STT: i + 1,
    'Mã HS': s.code || '',
    'Họ tên': s.name,
    'Ngày sinh': formatDate(s.birthDate),
    'Chức vụ': s.role || 'Học sinh',
    Tổ: GROUP_NAMES[s.group] || '',
  }))
  sheet(wb, 'Học sinh', rows, [5, 14, 30, 14, 18, 8])
  XLSX.writeFile(wb, filename)
}

export function downloadStudentTemplate() {
  const wb = XLSX.utils.book_new()
  const rows = [
    { 'Mã HS': '09235620017', 'Họ tên': 'Nguyễn Văn Ví Dụ', 'Ngày sinh': '12/05/2010', 'Chức vụ': 'Học sinh', Tổ: 'Tổ 1' },
    { 'Mã HS': '09235620018', 'Họ tên': 'Trần Thị Mẫu', 'Ngày sinh': '03/09/2010', 'Chức vụ': 'Học sinh', Tổ: 'Tổ 2' },
    { 'Mã HS': '', 'Họ tên': '', 'Ngày sinh': '', 'Chức vụ': 'Học sinh', Tổ: '' },
  ]
  sheet(wb, 'Mẫu nhập', rows, [14, 30, 14, 18, 8])
  XLSX.writeFile(wb, 'mau-nhap-danh-sach-hoc-sinh.xlsx')
}

export async function parseStudentsFile(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
  if (!raw.length) return { rows: [], total: 0 }
  const headers = Object.keys(raw[0])
  const key = {
    name: findHeader(headers, ['ho ten', 'ten hoc sinh', 'ho va ten', 'ten', 'name']),
    code: findHeader(headers, ['ma hs', 'ma hoc sinh', 'code', 'ma']),
    birthDate: findHeader(headers, ['ngay sinh', 'ngay thang nam sinh', 'birth', 'sinh ngay']),
    role: findHeader(headers, ['chuc vu', 'vai tro', 'role']),
    group: findHeader(headers, ['to', 'nhom', 'group']),
  }
  const rows = raw
    .map((r) => {
      const name = clean(r[key.name])
      if (!name) return null
      const group = parseGroup(r[key.group])
      return {
        name,
        code: clean(r[key.code]),
        birthDate: excelDateToISO(r[key.birthDate]),
        role: clean(r[key.role]) || 'Học sinh',
        group,
      }
    })
    .filter(Boolean)
  return { rows, total: raw.length }
}

export function exportReportXlsx(
  { rows, groups, rStats, ruleMap, period },
  filename = 'bao-cao-thi-dua.xlsx',
) {
  const wb = XLSX.utils.book_new()

  const groupRows = groups.map((g) => ({
    'Xếp hạng': g.rank,
    Tổ: GROUP_NAMES[g.group],
    'Số học sinh': g.members,
    'Tổng số lỗi': g.totalViolations,
    'Điểm thi đua TB': g.avg,
  }))
  sheet(wb, 'Xếp hạng tổ', groupRows, [9, 9, 13, 13, 15])

  const studentRows = rows.map((r) => ({
    'Xếp hạng': r.rank,
    'Mã HS': r.student.code || '',
    'Họ tên': r.student.name,
    Tổ: GROUP_NAMES[r.student.group],
    'Chức vụ': r.student.role || 'Học sinh',
    'Số lỗi': r.violations,
    'Điểm trừ': r.deducted,
    'Điểm thi đua': r.score,
    'Xếp loại': conductOf(r.score).label,
  }))
  sheet(wb, 'Chi tiết học sinh', studentRows, [9, 13, 28, 9, 16, 9, 9, 12, 11])

  const ruleRows = rStats.map((s) => ({
    'Tên lỗi': s.rule.name,
    'Số lần vi phạm': s.count,
    'Điểm trừ / lần': `-${s.rule.points}`,
    'Tổng điểm trừ': s.count * s.rule.points,
  }))
  sheet(wb, 'Theo loại lỗi', ruleRows, [34, 15, 15, 15])

  sheet(
    wb,
    'Thông tin',
    [
      { 'Kỳ báo cáo': periodLabel(period), 'Ngày xuất': formatDate(new Date().toISOString().slice(0, 10)) },
    ],
    [16, 16],
  )

  XLSX.writeFile(wb, filename)
}