import { AppProvider, useApp } from './context/AppContext.jsx'
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import { GraduationCap } from 'lucide-react'

function Shell() {
  const { session, ready } = useApp()
  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
        <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
          <GraduationCap size={28} />
        </div>
        <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu...</p>
      </div>
    )
  }
  if (!session) return <Login />
  return <Layout />
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}