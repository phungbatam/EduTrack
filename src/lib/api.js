const LOCAL_KEYS = {
  students: 'et_students',
  rules: 'et_rules',
  violations: 'et_violations',
  passwords: 'et_passwords',
  lockedWeeks: 'et_locked_weeks',
  session: 'et_session',
}

const TS_KEYS = {
  students: 'et_students_ts',
  rules: 'et_rules_ts',
  violations: 'et_violations_ts',
  lockedWeeks: 'et_lockedWeeks_ts',
}

function localRead(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

function localWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    /* ignore */
  }
}

function getLocalTs(col) {
  const tsKey = TS_KEYS[col]
  if (!tsKey) return 0
  const raw = parseInt(localStorage.getItem(tsKey) || '0', 10)
  return isNaN(raw) ? 0 : raw
}

function markLocalTs(col) {
  const tsKey = TS_KEYS[col]
  if (tsKey) localWrite(tsKey, Date.now())
}

async function fetchJSON(url, options) {
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options && options.headers) },
  })
}

async function parseOrThrow(res) {
  let body = null
  try {
    body = await res.json()
  } catch (e) {
    body = null
  }
  if (!res.ok) {
    const err = new Error((body && body.error) || 'Yêu cầu thất bại')
    err.status = res.status
    throw err
  }
  return body
}

function isHttpError(err) {
  return Boolean(err && err.status)
}

function isApiUnavailable(err) {
  return !isHttpError(err) || err.status === 404 || err.status === 405
}

async function fetchWithRetry(url, options, retries = 2, delay = 800) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchJSON(url, options)
    } catch (e) {
      if (attempt < retries && !isHttpError(e)) {
        await new Promise((r) => setTimeout(r, delay * (attempt + 1)))
        continue
      }
      throw e
    }
  }
}

const SEED_COUNTS = { students: 45, rules: 12, violations: 0, lockedWeeks: 0 }

export async function loadCollection(col) {
  const local = localRead(LOCAL_KEYS[col])
  try {
    const res = await fetchWithRetry(`/api/store?col=${col}`, {})
    const body = await parseOrThrow(res)
    if (!Array.isArray(body.data)) throw new Error('Dữ liệu không hợp lệ')
    const apiData = body.data
    if (
      Array.isArray(local) &&
      local.length > 0 &&
      apiData.length <= (SEED_COUNTS[col] || 0)
    ) {
      return local
    }
    localWrite(LOCAL_KEYS[col], apiData)
    return apiData
  } catch (e) {
    if (isHttpError(e) && !isApiUnavailable(e)) throw e
    return Array.isArray(local) ? local : null
  }
}

export async function saveCollection(col, data, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    const res = await fetchWithRetry(
      `/api/store?col=${col}`,
      { method: 'POST', headers, body: JSON.stringify({ data }) },
      2,
      1000,
    )
    await parseOrThrow(res)
    localWrite(LOCAL_KEYS[col], data)
    markLocalTs(col)
    return true
  } catch (e) {
    console.warn('[api] Lưu dữ liệu từ xa thất bại, chỉ lưu cục bộ:', col, e)
    localWrite(LOCAL_KEYS[col], data)
    markLocalTs(col)
    return false
  }
}

export async function adminLogin({ account, password }) {
  try {
    const res = await fetchJSON('/api/auth', { method: 'POST', body: JSON.stringify({ kind: 'admin', account, password }) })
    return await parseOrThrow(res)
  } catch (e) {
    if (isApiUnavailable(e)) {
      if (String(account || '').trim() === 'AdminTNT1009' && password === 'TNT0917@aF') {
        const token = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
        return { role: 'admin', account: 'AdminTNT1009', name: 'Giáo viên chủ nhiệm', token }
      }
      throw new Error('Sai tài khoản hoặc mật khẩu quản trị.')
    }
    throw e
  }
}

export async function studentLogin({ code, password }) {
  try {
    const res = await fetchJSON('/api/auth', { method: 'POST', body: JSON.stringify({ kind: 'student', code, password }) })
    return await parseOrThrow(res)
  } catch (e) {
    if (isApiUnavailable(e)) {
      const students = localRead(LOCAL_KEYS.students) || []
      const passwords = localRead(LOCAL_KEYS.passwords) || {}
      const c = String(code || '').trim().toLowerCase()
      const stu = students.find((s) => String(s.code || '').trim().toLowerCase() === c)
      if (!stu) throw new Error('Không tìm thấy học sinh có mã này.')
      const hash = passwords[stu.id]
      if (!hash) throw new Error('Mật khẩu chưa được cấp. Hãy nhờ giáo viên chủ nhiệm đặt mật khẩu.')
      if (sha256(password) !== hash) throw new Error('Sai mật khẩu. Vui lòng thử lại.')
      return { role: 'student', id: stu.id, name: stu.name, code: stu.code, group: stu.group, roleLabel: stu.role, manageGroup: stu.manageGroup || stu.group || null }
    }
    throw e
  }
}

export async function setStudentPassword({ token, studentId, password }) {
  let passHash = null
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetchJSON('/api/password', { method: 'POST', headers, body: JSON.stringify({ studentId, password }) })
    const body = await parseOrThrow(res)
    passHash = body.passHash || sha256(password)
  } catch (e) {
    if (isHttpError(e) && !isApiUnavailable(e)) throw e
    passHash = sha256(password)
  }
  const map = localRead(LOCAL_KEYS.passwords) || {}
  map[studentId] = passHash
  localWrite(LOCAL_KEYS.passwords, map)
  return { ok: true }
}

export async function resetData(token) {
  try {
    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetchJSON('/api/reset', { method: 'POST', headers })
    await parseOrThrow(res)
  } catch (e) {
    if (isHttpError(e)) throw e
  }
  Object.keys(LOCAL_KEYS).forEach((k) => {
    try {
      localStorage.removeItem(LOCAL_KEYS[k])
    } catch (e) {
      /* ignore */
    }
  })
  Object.values(TS_KEYS).forEach((k) => {
    try {
      localStorage.removeItem(k)
    } catch (e) {
      /* ignore */
    }
  })
}

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

function rotr(x, n) {
  return (x >>> n) | (x << (32 - n))
}

export function sha256(message) {
  const msg = String(message ?? '')
  const bytes = []
  for (let i = 0; i < msg.length; i += 1) {
    const c = msg.charCodeAt(i)
    if (c < 0x80) bytes.push(c)
    else if (c < 0x800) bytes.push((c >> 6) | 0xc0, (c & 0x3f) | 0x80)
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < msg.length) {
      const c2 = msg.charCodeAt(i + 1)
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        const code = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00)
        bytes.push((code >> 18) | 0xf0, ((code >> 12) & 0x3f) | 0x80, ((code >> 6) & 0x3f) | 0x80, (code & 0x3f) | 0x80)
        i += 1
      } else {
        bytes.push(0xef, 0xbf, 0xbd)
      }
    } else if (c < 0x10000) {
      bytes.push((c >> 12) | 0xe0, ((c >> 6) & 0x3f) | 0x80, (c & 0x3f) | 0x80)
    } else {
      bytes.push(0xef, 0xbf, 0xbd)
    }
  }
  const bitLen = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  const view = new DataView(new ArrayBuffer(8))
  view.setUint32(0, Math.floor(bitLen / 0x100000000))
  view.setUint32(4, bitLen >>> 0)
  for (let i = 0; i < 8; i += 1) bytes.push(view.getUint8(i))

  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  const w = new Uint32Array(64)
  const dv = new DataView(new Uint8Array(bytes).buffer)

  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t += 1) w[t] = dv.getUint32(i + t * 4, false)
    for (let t = 16; t < 64; t += 1) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7

    for (let t = 0; t < 64; t += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  const hex = (n) => n.toString(16).padStart(8, '0')
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7)
}