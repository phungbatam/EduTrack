import { KEYS, kvGet, kvSet } from './kv.js'
import { SEEDS } from './seed.js'

export const SEED_VERSION = 's2'

// Khi SEED_VERSION thay đổi (có phiên bản dữ liệu khởi tạo mới),
// tự nạp lại toàn bộ dữ liệu mẫu lên cloud một lần duy nhất.
export async function ensureSeed() {
  const rev = await kvGet(KEYS.seedVersion)
  if (rev === SEED_VERSION) return false
  await kvSet(KEYS.students, SEEDS.students())
  await kvSet(KEYS.rules, SEEDS.rules())
  await kvSet(KEYS.violations, SEEDS.violations())
  await kvSet(KEYS.passwords, {})
  await kvSet(KEYS.lockedWeeks, SEEDS.lockedWeeks())
  await kvSet(KEYS.seedVersion, SEED_VERSION)
  return true
}