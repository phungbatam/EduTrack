import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
          <p className="text-3xl">⚠️</p>
          <h1 className="text-lg font-bold text-slate-800">Có lỗi xảy ra khi hiển thị trang</h1>
          <p className="max-w-md text-sm text-slate-500">
            Vui lòng tải lại trang. Nếu lỗi vẫn tiếp diễn, hãy liên hệ giáo viên chủ nhiệm để được hỗ trợ.
          </p>
          <p className="max-w-lg rounded-xl bg-rose-50 px-4 py-2 font-mono text-xs text-rose-600">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700"
          >
            Tải lại trang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}