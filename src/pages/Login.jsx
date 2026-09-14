import { useState } from 'react'
import { GraduationCap, ShieldCheck, UserRound, LogIn, AlertCircle, KeyRound, IdCard } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import * as api from '../lib/api.js'

export default function Login() {
  const { login, notify } = useApp()
  const [role, setRole] = useState('admin')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (role === 'admin') {
        const user = await api.adminLogin({ account, password })
        login(user)
        notify('Đăng nhập quản trị thành công!')
      } else {
        if (!code.trim()) {
          setError('Vui lòng nhập mã học sinh.')
          setBusy(false)
          return
        }
        const user = await api.studentLogin({ code, password: studentPassword })
        login(user)
        notify(`Xin chào ${user.name}, chúc bạn học tốt!`)
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 overflow-hidden bg-slate-900 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-slate-900" />
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <GraduationCap size={30} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">EduTrack</h1>
              <p className="text-sm text-indigo-200">Quản lý học sinh & thi đua toàn lớp</p>
            </div>
          </div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">
            Theo dõi vi phạm & chấm điểm thi đua dễ dàng
          </h2>
          <p className="mt-4 max-w-md text-indigo-100/90">
            Quản lý danh sách học sinh, phân tổ, ghi nhận lỗi vi phạm, tổng kết điểm thi đua theo tuần /
            tháng, và xuất báo cáo Excel / PDF chỉ trong vài cú click.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {['Quản lý học sinh', 'Chấm điểm thi đua', 'Xuất báo cáo PDF', 'Nhập Excel'].map((f) => (
              <span key={f} className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm backdrop-blur">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-slate-50 px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800">EduTrack</h1>
              <p className="text-xs text-slate-500">Quản lý học sinh & thi đua</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8">
            <h2 className="text-2xl font-bold text-slate-800">Đăng nhập</h2>
            <p className="mt-1 text-sm text-slate-500">Chọn vai trò để tiếp tục</p>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => { setRole('admin'); setError('') }}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                  role === 'admin' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ShieldCheck size={16} className={role === 'admin' ? 'text-indigo-600' : ''} />
                Quản trị
              </button>
              <button
                type="button"
                onClick={() => { setRole('student'); setError('') }}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                  role === 'student' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserRound size={16} className={role === 'student' ? 'text-emerald-600' : ''} />
                Học sinh
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {role === 'admin' ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tài khoản</label>
                    <div className="relative">
                      <ShieldCheck size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                        placeholder="Tài khoản quản trị"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Mật khẩu</label>
                    <div className="relative">
                      <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                        placeholder="Mật khẩu"
                      />
                    </div>
                  </div>
                  {/* <div className="flex items-start gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs text-indigo-700">
                    <KeyRound size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Tài khoản mặc định: <b>admin</b> / mật khẩu: <b>123456</b>
                    </span>
                  </div> */}
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Mã học sinh</label>
                    <div className="relative">
                      <IdCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={code}
                        onChange={(e) => { setCode(e.target.value); setError('') }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                        placeholder="Ví dụ: 09235620001"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Mật khẩu</label>
                    <div className="relative">
                      <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={studentPassword}
                        onChange={(e) => { setStudentPassword(e.target.value); setError('') }}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                        placeholder="Mật khẩu do giáo viên chủ nhiệm cấp"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Mật khẩu do giáo viên chủ nhiệm cấp. Nếu chưa có, hãy nhờ thầy/cô đặt mật khẩu cho bạn.
                    </p>
                  </div>
                </>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
              >
                <LogIn size={17} />
                {busy ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            Học sinh chỉ được xem thông tin của bản thân, tổ và lớp.
          </p>
        </div>
      </div>
    </div>
  )
}