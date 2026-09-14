import { KEYS, kvGet, kvSet } from './_lib/kv.js'
import { SEEDS } from './_lib/seed.js'
import { ensureSeed } from './_lib/seed_version.js'
import { bearer, verifyToken } from './_lib/token.js'

export const config = { runtime: 'nodejs' }

const COLS = {
  students: KEYS.students,
  rules: KEYS.rules,
  violations: KEYS.violations,
  submissions: KEYS.submissions,
  lockedWeeks: KEYS.lockedWeeks,
}

export default async function handler(req, res) {
  const col = String(req.query.col || '')
  const key = COLS[col]
  if (!key)
    return res
      .status(400)
      .json({ error: 'Cột không hợp lệ. Chỉ chấp nhận: students, rules, violations, submissions, lockedWeeks.' })

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
    if (!(await verifyToken(bearer(req)))) {
      return res.status(401).json({ error: 'Không có quyền ghi dữ liệu. Vui lòng đăng nhập quản trị.' })
    }
    const data = Array.isArray(req.body && req.body.data) ? req.body.data : []
    await kvSet(key, data)
    return res.json({ ok: true, data })
  }

  return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' })
}