import { KEYS, kvSet, kvAvailable } from './_lib/kv.js'
import { SEEDS } from './_lib/seed.js'
import { SEED_VERSION } from './_lib/seed_version.js'
import { bearer, verifyToken } from './_lib/token.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Phương thức không được hỗ trợ.' })
  if (!kvAvailable)
    return res.status(503).json({
      error:
        'Kho dữ liệu dùng chung chưa được cấu hình. Dữ liệu chỉ lưu trên từng trình duyệt (xem README để bật đồng bộ).',
    })

  if (!(await verifyToken(bearer(req)))) {
    return res.status(401).json({ error: 'Không có quyền thực hiện thao tác này.' })
  }

  await kvSet(KEYS.students, SEEDS.students())
  await kvSet(KEYS.rules, SEEDS.rules())
  await kvSet(KEYS.violations, SEEDS.violations())
  await kvSet(KEYS.passwords, {})
  await kvSet(KEYS.lockedWeeks, SEEDS.lockedWeeks())
  await kvSet(KEYS.seedVersion, SEED_VERSION)

  return res.json({ ok: true })
}