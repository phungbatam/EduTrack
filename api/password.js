import { KEYS, kvGet, kvSet } from './_lib/kv.js'
import { sha256 } from './_lib/hash.js'
import { bearer, verifyToken } from './_lib/token.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' })

  if (!(await verifyToken(bearer(req)))) {
    return res.status(401).json({ error: 'Không có quyền thực hiện thao tác này. Vui lòng đăng nhập quản trị.' })
  }

  const { studentId, password } = req.body || {}
  if (!studentId) return res.status(400).json({ error: 'Thiếu mã học sinh.' })

  const p = String(password || '')
  if (p.length < 4) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 4 ký tự.' })

  const students = (await kvGet(KEYS.students)) || []
  const stu = students.find((s) => s.id === studentId)
  if (!stu) return res.status(404).json({ error: 'Không tìm thấy học sinh.' })

  const passwords = (await kvGet(KEYS.passwords)) || {}
  const passHash = sha256(p)
  passwords[studentId] = passHash
  await kvSet(KEYS.passwords, passwords)

  return res.json({ ok: true, studentId, passHash })
}