import { useMemo, useRef, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  FileDown,
  FileSpreadsheet,
  Search,
  Shuffle,
  ArrowLeftRight,
  UserPlus,
  Users,
  KeyRound,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Modal from '../components/Modal.jsx'
import StatCard from '../components/StatCard.jsx'
import { formatDate, buildStandings, currentPeriod, GROUP_NAMES } from '../utils/helpers.js'
import { exportStudentsXlsx, downloadStudentTemplate, parseStudentsFile } from '../utils/excel.js'
import * as api from '../lib/api.js'

const ROLES = ['Học sinh', 'Lớp trưởng', 'Lớp phó học tập', 'Lớp phó lao động', 'Lớp phó văn thể mỹ', 'Tổ trưởng', 'Tổ phó', 'Phó bí thư', 'Bí thư']

function maxIdNum(students) {
  let max = 0
  students.forEach((s) => {
    const m = String(s.id || '').match(/\d+/)
    if (m) max = Math.max(max, parseInt(m[0], 10))
  })
  return max
}

const emptyForm = () => ({
  name: '',
  code: '',
  birthDate: '',
  role: 'Học sinh',
  manageGroup: null,
  group: 1,
})

function PasswordForm({ student, onDone, onCancel }) {
  const { session, notify } = useApp()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!session || session.role !== 'admin') {
      notify('Vui lòng đăng nhập quản trị để đặt mật khẩu.', 'error')
      return
    }
    const p = password.trim()
    if (p.length < 4) {
      notify('Mật khẩu phải có ít nhất 4 ký tự.', 'error')
      return
    }
    if (p !== confirm.trim()) {
      notify('Mật khẩu nhập lại không khớp.', 'error')
      return
    }
    setBusy(true)
    try {
      await api.setStudentPassword({ token: session.token, studentId: student.id, password: p })
      notify(`Đã đặt mật khẩu cho ${student.name}.`)
      onDone()
    } catch (err) {
      notify('Không đặt được mật khẩu: ' + err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const field =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Đặt mật khẩu cho <b className="text-slate-800">{student.name}</b>
        <span className="ml-1 font-mono text-xs text-slate-400">({student.code || student.id})</span>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Mật khẩu mới</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
          placeholder="Ít nhất 4 ký tự"
          autoFocus
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Nhập lại mật khẩu</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={field}
          placeholder="Nhập lại mật khẩu"
        />
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] leading-snug text-slate-400">
          Học sinh dùng <b>mã học sinh</b> và mật khẩu này để đăng nhập.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? 'Đang lưu...' : 'Lưu mật khẩu'}
          </button>
        </div>
      </div>
    </form>
  )
}

function StudentForm({ initial, onSave, onCancel }) {
  const { students, notify } = useApp()
  const [form, setForm] = useState(initial || emptyForm())

  const submit = (e) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      notify('Vui lòng nhập họ tên học sinh.', 'error')
      return
    }
    const code = form.code.trim()
    if (code) {
      const dup = students.find(
        (s) => String(s.code).trim().toLowerCase() === code.toLowerCase() && s.id !== (initial && initial.id),
      )
      if (dup) {
        notify(`Mã học sinh "${code}" đã tồn tại.`, 'error')
        return
      }
    }
    onSave({ ...form, name, code })
  }

  const field =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Họ tên *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={field}
            placeholder="Ví dụ: Nguyễn Văn A"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Mã học sinh</label>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className={field}
            placeholder="09235620017"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ngày sinh</label>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            className={field}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Chức vụ</label>
          <select
            value={form.role}
            onChange={(e) => {
              const role = e.target.value
              setForm({
                ...form,
                role,
                manageGroup: role === 'Tổ trưởng' && !form.manageGroup ? form.group : form.manageGroup,
              })
            }}
            className={field}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tổ</label>
          <select
            value={form.group}
            onChange={(e) => setForm({ ...form, group: Number(e.target.value) })}
            className={field}
          >
            {[1, 2, 3, 4].map((g) => (
              <option key={g} value={g}>
                Tổ {g}
              </option>
            ))}
          </select>
        </div>
        {form.role === 'Tổ trưởng' && (
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tổ được quản lý</label>
            <select
              value={form.manageGroup || form.group}
              onChange={(e) => setForm({ ...form, manageGroup: Number(e.target.value) })}
              className={field}
            >
              {[1, 2, 3, 4].map((g) => (
                <option key={g} value={g}>
                  Tổ {g}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Tổ trưởng sẽ được quyền xem và ghi vi phạm cho tổ này.
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700"
        >
          {initial ? 'Cập nhật' : 'Thêm học sinh'}
        </button>
      </div>
    </form>
  )
}

export default function StudentManagement() {
  const { students, rules, violations, notify, addStudent, updateStudent, deleteStudent, moveStudent, importStudents, rebalanceGroups, randomAssign } = useApp()

  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pwdStudent, setPwdStudent] = useState(null)
  const fileRef = useRef(null)
  const [importing, setImporting] = useState(false)

  const period = currentPeriod()
  const { rows } = useMemo(
    () => buildStandings(students, rules, violations, period),
    [students, rules, violations, period],
  )
  const scoreMap = useMemo(() => Object.fromEntries(rows.map((r) => [r.student.id, r.score])), [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (group !== 'all' && s.group !== Number(group)) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        String(s.code || '').toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
      )
    })
  }, [students, search, group])

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 }
  students.forEach((s) => {
    counts[s.group] = (counts[s.group] || 0) + 1
  })

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (stu) => {
    setEditing(stu)
    setModalOpen(true)
  }

  const handleDelete = (stu) => {
    if (window.confirm(`Xóa học sinh "${stu.name}" và toàn bộ vi phạm của em này?`)) {
      deleteStudent(stu.id)
      notify('Đã xóa học sinh.')
    }
  }

  const suggestCode = () => {
    let next = maxIdNum(students) + 1
    const existing = new Set(students.map((s) => String(s.code || '')))
    let code = `0923562${String(next).padStart(3, '0')}`
    while (existing.has(code)) {
      next += 1
      code = `0923562${String(next).padStart(3, '0')}`
    }
    return code
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    try {
      const { rows: parsed } = await parseStudentsFile(file)
      if (!parsed.length) {
        notify('File không có dữ liệu hợp lệ (cần cột "Họ tên").', 'error')
        return
      }
      const seen = new Set(students.map((s) => String(s.code || '').trim().toLowerCase()))
      const names = new Set(students.map((s) => s.name.toLowerCase()))
      let counter = maxIdNum(students)
      const news = []
      parsed.forEach((r) => {
        const codeKey = r.code ? String(r.code).trim().toLowerCase() : ''
        if (codeKey && seen.has(codeKey)) return
        if (!codeKey && names.has(r.name.toLowerCase())) return
        codeKey && seen.add(codeKey)
        names.add(r.name.toLowerCase())
        counter += 1
        news.push({
          id: `HS${String(counter).padStart(3, '0')}`,
          name: r.name,
          code: r.code || suggestCode(),
          birthDate: r.birthDate || '',
          role: r.role || 'Học sinh',
          group: r.group && r.group >= 1 && r.group <= 4 ? r.group : ((news.length + students.length) % 4) + 1,
        })
      })
      if (news.length) {
        importStudents(news)
        notify(`Đã nhập ${news.length} học sinh từ file Excel.`)
      } else {
        notify('Không có học sinh mới nào được nhập (có thể trùng mã/tên).', 'error')
      }
    } catch (err) {
      console.error(err)
      notify('Lỗi khi đọc file Excel: ' + err.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Tổng số học sinh" value={students.length} icon={UserPlus} color="indigo" />
        <StatCard label="Tổ 1" value={counts[1]} icon={Users} color="sky" />
        <StatCard label="Tổ 2" value={counts[2]} icon={Users} color="emerald" />
        <StatCard label="Tổ 3" value={counts[3]} icon={Users} color="amber" />
        <StatCard label="Tổ 4" value={counts[4]} icon={Users} color="rose" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, mã HS, chức vụ..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </div>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="all">Tất cả tổ</option>
              {[1, 2, 3, 4].map((g) => (
                <option key={g} value={g}>
                  Tổ {g}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <Upload size={15} /> {importing ? 'Đang nhập...' : 'Nhập Excel'}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <button
              onClick={() => { downloadStudentTemplate(); notify('Đã tải file mẫu Excel.') }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <FileDown size={15} /> Mẫu Excel
            </button>
            <button
              onClick={() => { exportStudentsXlsx(filtered); notify('Đã xuất file Excel danh sách học sinh.') }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <FileSpreadsheet size={15} /> Xuất Excel
            </button>
            <button
              onClick={() => {
                if (window.confirm('Tự động xếp lại tổ sao cho 4 tổ đều nhau nhất có thể?')) {
                  rebalanceGroups()
                  notify('Đã cân bằng lại các tổ.')
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeftRight size={15} /> Cân bằng tổ
            </button>
            <button
              onClick={() => {
                if (window.confirm('Xếp ngẫu nhiên học sinh vào 4 tổ? Có thể thay đổi tổ hiện tại.')) {
                  randomAssign()
                  notify('Đã xếp ngẫu nhiên lại các tổ.')
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Shuffle size={15} /> Xếp ngẫu nhiên
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
            >
              <Plus size={15} /> Thêm học sinh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-semibold">STT</th>
                <th className="px-4 py-3 font-semibold">Mã HS</th>
                <th className="px-4 py-3 font-semibold">Họ tên</th>
                <th className="px-4 py-3 font-semibold">Ngày sinh</th>
                <th className="px-4 py-3 font-semibold">Chức vụ</th>
                <th className="px-4 py-3 font-semibold">Tổ</th>
                <th className="px-4 py-3 font-semibold">Điểm tuần</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    Không có học sinh nào.
                  </td>
                </tr>
              )}
              {filtered.map((s, i) => {
                const color =
                  { 1: 'bg-indigo-100 text-indigo-700', 2: 'bg-emerald-100 text-emerald-700', 3: 'bg-amber-100 text-amber-700', 4: 'bg-rose-100 text-rose-700' }[
                    s.group
                  ] || 'bg-slate-100 text-slate-600'
                return (
                  <tr key={s.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/60 last:border-0">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.code || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-xs font-bold text-white">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-700">{s.name}</span>
                        {s.role !== 'Học sinh' && (
                          <span className="hidden rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 lg:inline">
                            {s.role === 'Tổ trưởng' ? `${s.role} · QL Tổ ${s.manageGroup || s.group}` : s.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(s.birthDate)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.role}</td>
                    <td className="px-4 py-3">
                      <select
                        value={s.group}
                        onChange={(e) => { moveStudent(s.id, Number(e.target.value)); notify(`Đã chuyển ${s.name} sang ${GROUP_NAMES[Number(e.target.value)]}.`) }}
                        className={`rounded-lg border border-transparent px-2 py-1 text-xs font-bold outline-none ${color}`}
                      >
                        {[1, 2, 3, 4].map((g) => (
                          <option key={g} value={g} className="bg-white text-slate-700">
                            Tổ {g}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-bold ${
                          scoreMap[s.id] >= 90
                            ? 'bg-emerald-50 text-emerald-600'
                            : scoreMap[s.id] >= 75
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {scoreMap[s.id]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setPwdStudent(s)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                          title="Đặt mật khẩu"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                          title="Sửa"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa học sinh' : 'Thêm học sinh mới'} size="lg">
        <StudentForm
          initial={editing}
          onCancel={() => setModalOpen(false)}
          onSave={(data) => {
            if (editing) {
              updateStudent(editing.id, data)
              notify('Đã cập nhật thông tin học sinh.')
            } else {
              let code = data.code
              if (!code) code = suggestCode()
              let counter = maxIdNum(students)
              const dupIds = new Set(students.map((s) => s.id))
              let id = `HS${String(counter + 1).padStart(3, '0')}`
              while (dupIds.has(id)) {
                counter += 1
                id = `HS${String(counter + 1).padStart(3, '0')}`
              }
              addStudent({ ...data, code, id })
              notify('Đã thêm học sinh mới.')
            }
            setModalOpen(false)
          }}
        />
      </Modal>

      <Modal open={Boolean(pwdStudent)} onClose={() => setPwdStudent(null)} title="Đặt mật khẩu học sinh" size="sm">
        {pwdStudent && (
          <PasswordForm student={pwdStudent} onCancel={() => setPwdStudent(null)} onDone={() => setPwdStudent(null)} />
        )}
      </Modal>
    </div>
  )
}