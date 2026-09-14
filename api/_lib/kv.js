import { Redis } from '@upstash/redis'

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

export const redis = url && token ? new Redis({ url, token }) : null

export const KEYS = {
  students: 'et_students',
  rules: 'et_rules',
  violations: 'et_violations',
  submissions: 'et_submissions',
  passwords: 'et_passwords',
  lockedWeeks: 'et_locked_weeks',
  admin: 'et_admin',
  adminTokens: 'et_admin_tokens',
  seedVersion: 'et_seed_version',
}

export async function kvGet(key) {
  if (!redis) return null
  try {
    const val = await redis.get(key)
    if (val == null) return null
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch (e) {
        return val
      }
    }
    return val
  } catch (e) {
    console.warn('KV read failed:', key, e)
    return null
  }
}

export async function kvSet(key, value) {
  if (!redis) return
  await redis.set(key, typeof value === 'string' ? value : JSON.stringify(value))
}

export async function kvDel(key) {
  if (!redis) return
  await redis.del(key)
}