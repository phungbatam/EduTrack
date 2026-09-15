import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import Toasts from './Toasts.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import StudentManagement from '../pages/StudentManagement.jsx'
import ViolationManagement from '../pages/ViolationManagement.jsx'
import RuleManagement from '../pages/RuleManagement.jsx'
import ReportView from '../pages/ReportView.jsx'
import StudentView from '../pages/StudentView.jsx'
import StudentWeeks from '../pages/StudentWeeks.jsx'
import StudentMonthly from '../pages/StudentMonthly.jsx'
import LeaderView from '../pages/LeaderView.jsx'
import ApprovalView from '../pages/ApprovalView.jsx'
import AppealsView from '../pages/AppealsView.jsx'
import ActivityLogView from '../pages/ActivityLogView.jsx'
import { isLeaderRole } from '../utils/helpers.js'

const VIEW_META = {
  admin: {
    dashboard: ['Bảng điều khiển', 'Tổng quan điểm thi đua của lớp'],
    students: ['Quản lý học sinh & phân tổ', 'Thêm, sửa, xóa học sinh và xếp tổ'],
    violations: ['Quản lý vi phạm', 'Ghi nhận lỗi vi phạm, chốt tuần làm bằng chứng'],
    approve: ['Duyệt phiếu tổng hợp', 'Duyệt/từ chối phiếu của lớp trưởng đã chốt'],
    rules: ['Danh mục lỗi vi phạm', 'Các quy định điểm trừ của lớp'],
    reports: ['Báo cáo & xuất dữ liệu', 'Tổng kết tuần/tháng, xếp loại hạnh kiểm, in ấn'],
    appeals: ['Xử lý khiếu nại', 'Phản hồi đơn khiếu nại của học sinh'],
    activity: ['Lịch sử hoạt động', 'Nhật ký các thao tác trong hệ thống'],
  },
  student: {
    lead: ['Điều hành của lớp', 'Soạn phiếu tổng hợp vi phạm theo tuần và gửi lên duyệt'],
    approve: ['Chốt phiếu tổng hợp', 'Xem, chỉnh sửa và chốt phiếu của tổ trưởng'],
    home: ['Trang chủ', 'Theo dõi điểm thi đua của bạn'],
    weeks: ['Vi phạm theo tuần', 'Xem vi phạm từng tuần và tuần được chốt'],
    monthly: ['Tổng kết tháng', 'Xếp loại hạnh kiểm theo điểm trung bình'],
  },
}

export default function Layout() {
  const { session } = useApp()
  const isAdmin = session && session.role === 'admin'
  const isLeader = !!session && session.role === 'student' && isLeaderRole(session.roleLabel)
  const [view, setView] = useState(isAdmin ? 'dashboard' : isLeader ? 'lead' : 'home')
  const [menuOpen, setMenuOpen] = useState(false)

  const views = isAdmin
    ? {
        dashboard: <Dashboard />,
        students: <StudentManagement />,
        violations: <ViolationManagement />,
        approve: <ApprovalView />,
        rules: <RuleManagement />,
        reports: <ReportView />,
        appeals: <AppealsView />,
        activity: <ActivityLogView />,
      }
    : {
        lead: <LeaderView />,
        approve: <ApprovalView />,
        home: <StudentView />,
        weeks: <StudentWeeks />,
        monthly: <StudentMonthly />,
      }

  const meta = VIEW_META[isAdmin ? 'admin' : 'student'][view]

  const navigate = (key) => {
    setView(key)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar view={view} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-72">
        <Header title={meta[0]} subtitle={meta[1]} onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-7xl p-4 md:p-6">{views[view]}</main>
      </div>
      <Toasts />
    </div>
  )
}