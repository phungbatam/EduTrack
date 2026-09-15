import { Redis } from '@upstash/redis'
import { promises as fsp } from 'node:fs'
import pathMod from 'node:path'

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

export const redis = url && token ? new Redis({ url, token }) : null

// Khi không có Redis (chạy server file local, `npm run server`),
// dùng file JSON để lưu dữ liệu dùng chung cho mọi trình duyệt/thiết bị.
export const FILE_PATH = process.env.KV_FILE_PATH ? pathMod.resolve(process.env.KV_FILE_PATH) : null

export const kvAvailable = Boolean(redis || FILE_PATH)

export const KEYS = {
  students: 'et_students',
  rules: 'et_rules',
  violations: 'et_violations',
  submissions: 'et_submissions',
  passwords: 'et_passwords',
  lockedWeeks: 'et_locked_weeks',
  admin: 'et_admin',
  adminTokens: 'et_admin_tokens',
  studentTokens: 'et_student_tokens',
  seedVersion: 'et_seed_version',
}

let fileCache = null
let writeQueue = Promise.resolve()

async function loadFileCache() {
  if (fileCache !== null) return fileCache
  fileCache = {}
  if (!FILE_PATH) return fileCache
  try {
    const raw = await fsp.readFile(FILE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) fileCache = parsed
  } catch (e) {
    fileCache = {}
  }
  return fileCache
}

function persistFile() {
  const snapshot = fileCache || {}
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    await fsp.mkdir(pathMod.dirname(FILE_PATH), { recursive: true })
    await fsp.writeFile(FILE_PATH, JSON.stringify(snapshot), 'utf8')
  })
  return writeQueue
}

async function fileGet(key) {
  if (!FILE_PATH) return null
  const cache = await loadFileCache()
  const val = cache[key]
  if (val == null) return null
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch (e) {
      return val
    }
  }
  return val
}

function fileSet(key, value) {
  if (!FILE_PATH) return Promise.resolve()
  const snapshot = fileCache || {}
  snapshot[key] = typeof value === 'string' ? value : JSON.parse(JSON.stringify(value))
  fileCache = snapshot
  return persistFile()
}

function fileDel(key) {
  if (!FILE_PATH) return Promise.resolve()
  const snapshot = fileCache || {}
  delete snapshot[key]
  fileCache = snapshot
  return persistFile()
}

export async function kvGet(key) {
  if (!redis) return fileGet(key)
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
  if (!redis) return fileSet(key, value)
  await redis.set(key, typeof value === 'string' ? value : JSON.stringify(value))
}

export async function kvDel(key) {
  if (!redis) return fileDel(key)
  await redis.del(key)
}