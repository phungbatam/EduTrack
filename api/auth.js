import { KEYS, kvGet, kvSet } from './_lib/kv.js'
import { sha256 } from './_lib/hash.js'
import { SEEDS } from './_lib/seed.js'
import { ensureSeed } from './_lib/seed_version.js'
import { createToken } from './_lib/token.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' })

  const { kind, account, password, code } = req.body || {}
  if (!password) return res.status(400).json({ error: 'Thiếu mật khẩu.' })

  if (kind === 'admin') {
    let admin = await kvGet(KEYS.admin)
    if (!admin || typeof admin !== 'object') {
      admin = { account: 'admin', passHash: sha256('123456') }
      await kvSet(KEYS.admin, admin)
    }
    if (String(account || '').trim() === admin.account && sha256(password) === admin.passHash) {
      const token = await createToken()
      return res.json({ role: 'admin', account: admin.account, name: 'Giáo viên chủ nhiệm', token })
    }
    return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu quản trị.' })
  }

  if (kind === 'student') {
    await ensureSeed()
    let students = await kvGet(KEYS.students)
    if (!Array.isArray(students)) {
      students = SEEDS.students()
      await kvSet(KEYS.students, students)
    }
    const passwords = (await kvGet(KEYS.passwords)) || {}
    const c = String(code || '').trim().toLowerCase()
    const stu = students.find((s) => String(s.code || '').trim().toLowerCase() === c)
    if (!stu) return res.status(401).json({ error: 'Không tìm thấy học sinh có mã này.' })
    const hash = passwords[stu.id]
    if (!hash) return res.status(401).json({ error: 'Mật khẩu chưa được cấp. Hãy nhờ giáo viên chủ nhiệm đặt mật khẩu.' })
    if (sha256(password) !== hash) return res.status(401).json({ error: 'Sai mật khẩu. Vui lòng thử lại.' })
    return res.json({
      role: 'student',
      id: stu.id,
      name: stu.name,
      code: stu.code,
      group: stu.group,
      roleLabel: stu.role,
      manageGroup: stu.manageGroup || stu.group || null,
    })
  }

  return res.status(400).json({ error: 'Loại đăng nhập không hợp lệ.' })
}