import { KEYS, kvGet, kvSet, kvAvailable } from './_lib/kv.js'
import { SEEDS } from './_lib/seed.js'
import { ensureSeed } from './_lib/seed_version.js'
import { bearer, verifyToken, verifyStudentToken } from './_lib/token.js'

export const config = { runtime: 'nodejs' }

const COLS = {
  students: KEYS.students,
  rules: KEYS.rules,
  violations: KEYS.violations,
  submissions: KEYS.submissions,
  lockedWeeks: KEYS.lockedWeeks,
  notifications: KEYS.notifications,
  activityLog: KEYS.activityLog,
  appeals: KEYS.appeals,
  penalties: KEYS.penalties,
}

export default async function handler(req, res) {
  const col = String(req.query.col || '')
  const key = COLS[col]
  if (!key)
    return res
      .status(400)
      .json({ error: 'Cột không hợp lệ. Chỉ chấp nhận: students, rules, violations, submissions, lockedWeeks, notifications, activityLog, appeals, penalties.' })
  if (!kvAvailable)
    return res.status(503).json({
      error:
        'Kho dữ liệu dùng chung chưa được cấu hình. Dữ liệu chỉ lưu trên từng trình duyệt (xem README để bật đồng bộ).',
    })

  if (req.method === 'GET') {
    await ensureSeed()
    let data = await kvGet(key)
    if (data == null) {
      data = SEEDS[col]()
      await kvSet(key, data)
    }
    return res.json({ data: Array.isArray(data) ? data : [] })
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const adminOk = await verifyToken(bearer(req))
    const student = adminOk ? null : await verifyStudentToken(bearer(req))
    const studentWritable = ['submissions', 'notifications', 'activityLog', 'appeals', 'penalties'].includes(col) && student
    const allowWrite = adminOk || studentWritable
    if (!allowWrite) {
      return res.status(401).json({ error: 'Không có quyền ghi dữ liệu. Vui lòng đăng nhập.' })
    }
    const data = Array.isArray(req.body && req.body.data) ? req.body.data : []
    await kvSet(key, data)
    return res.json({ ok: true, data })
  }

  return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' })
}