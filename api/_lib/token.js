import { KEYS, kvGet, kvSet } from './kv.js'
import { sha256 } from './hash.js'

const TOKEN_TTL = 1000 * 60 * 60 * 24 * 7

async function tokensMap() {
  const map = await kvGet(KEYS.adminTokens)
  return map && typeof map === 'object' ? map : {}
}

async function studentTokensMap() {
  const map = await kvGet(KEYS.studentTokens)
  return map && typeof map === 'object' ? map : {}
}

export async function createToken() {
  const t = `${sha256(`${Date.now()}-${Math.random()}`)}${sha256(`${Math.random()}-${Date.now()}`)}`
  const map = await tokensMap()
  map[t] = Date.now() + TOKEN_TTL
  await kvSet(KEYS.adminTokens, map)
  return t
}

export async function createStudentToken(student) {
  const t = `${sha256(`${Date.now()}-${Math.random()}`)}${sha256(`${Math.random()}-${Date.now()}`)}`
  const map = await studentTokensMap()
  map[t] = {
    exp: Date.now() + TOKEN_TTL,
    studentId: student.id,
    name: student.name,
    code: student.code,
    group: student.group,
    roleLabel: student.role,
    manageGroup: student.manageGroup || student.group || null,
  }
  await kvSet(KEYS.studentTokens, map)
  return t
}

export async function verifyStudentToken(token) {
  if (!token) return null
  const map = await studentTokensMap()
  const entry = map[token]
  if (!entry || typeof entry !== 'object' || !entry.exp) return null
  if (entry.exp < Date.now()) {
    delete map[token]
    await kvSet(KEYS.studentTokens, map)
    return null
  }
  return entry
}

export async function verifyToken(token) {
  if (!token) return false
  const map = await tokensMap()
  const exp = map[token]
  if (!exp) return false
  if (exp < Date.now()) {
    delete map[token]
    await kvSet(KEYS.adminTokens, map)
    return false
  }
  return true
}

export function bearer(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  return String(header).replace(/^Bearer\s+/i, '').trim() || null
}