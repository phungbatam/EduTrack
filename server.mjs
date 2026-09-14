import http from 'node:http'
import { promises as fsp } from 'node:fs'
import pathMod from 'node:path'
import os from 'node:os'

const PORT = Number(process.env.PORT || 3000)
const DIST_DIR = pathMod.resolve(process.env.DIST_DIR || 'dist')
const DATA_FILE = pathMod.resolve(process.env.KV_FILE_PATH || 'server-data.json')

// Cấu hình bộ lưu trữ file (đọc trong api/_lib/kv.js) TRƯỚC khi nạp handlers.
process.env.KV_FILE_PATH = DATA_FILE

const { default: storeHandler } = await import('./api/store.js')
const { default: authHandler } = await import('./api/auth.js')
const { default: resetHandler } = await import('./api/reset.js')
const { default: passwordHandler } = await import('./api/password.js')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
}

const API_ROUTES = {
  '/api/store': storeHandler,
  '/api/auth': authHandler,
  '/api/reset': resetHandler,
  '/api/password': passwordHandler,
}

function readBody(rawReq, rawRes, cb) {
  const chunks = []
  let size = 0
  rawReq.on('data', (c) => {
    size += c.length
    if (size > 20 * 1024 * 1024) {
      rawRes.statusCode = 413
      rawRes.setHeader('Content-Type', 'application/json; charset=utf-8')
      rawRes.end(JSON.stringify({ error: 'Dữ liệu quá lớn.' }))
      rawReq.destroy()
      return
    }
    chunks.push(c)
  })
  rawReq.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8')
    if (!raw.trim()) return cb({})
    try {
      cb(JSON.parse(raw))
    } catch (e) {
      rawRes.statusCode = 400
      rawRes.setHeader('Content-Type', 'application/json; charset=utf-8')
      rawRes.end(JSON.stringify({ error: 'Dữ liệu JSON không hợp lệ.' }))
    }
  })
  rawReq.on('error', () => cb({}))
}

function makeReq(rawReq, urlObj, body) {
  return {
    method: rawReq.method,
    url: urlObj.pathname,
    headers: rawReq.headers,
    query: Object.fromEntries(urlObj.searchParams.entries()),
    body,
  }
}

function makeRes(rawRes) {
  return {
    statusCode: 200,
    _done: false,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      if (this._done) return this
      this._done = true
      rawRes.statusCode = this.statusCode
      rawRes.setHeader('Content-Type', 'application/json; charset=utf-8')
      rawRes.end(JSON.stringify(payload))
      return this
    },
  }
}

async function serveStatic(rawRes, pathname) {
  let rel = decodeURIComponent(pathname).split('?')[0]
  if (rel === '/' || rel === '') rel = '/index.html'
  const candidates = rel.endsWith('/') ? [`${rel}index.html`] : [rel]
  for (const c of candidates) {
    const file = pathMod.resolve(DIST_DIR, `.${c}`)
    if (file !== DIST_DIR && !file.startsWith(`${DIST_DIR}${pathMod.sep}`)) {
      rawRes.statusCode = 403
      rawRes.end('Forbidden')
      return
    }
    try {
      const stat = await fsp.stat(file)
      if (!stat.isFile()) continue
      const ext = pathMod.extname(file).toLowerCase()
      rawRes.statusCode = 200
      rawRes.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
      if (ext === '.html') rawRes.setHeader('Cache-Control', 'no-cache')
      const buf = await fsp.readFile(file)
      rawRes.end(buf)
      return
    } catch (e) {
      /* not found → SPA fallback */
    }
  }
  const indexFile = pathMod.join(DIST_DIR, 'index.html')
  try {
    const buf = await fsp.readFile(indexFile)
    rawRes.statusCode = 200
    rawRes.setHeader('Content-Type', 'text/html; charset=utf-8')
    rawRes.setHeader('Cache-Control', 'no-cache')
    rawRes.end(buf)
  } catch (e) {
    rawRes.statusCode = 404
    rawRes.end('Không tìm thấy. Hãy chạy `npm run build` trước.')
  }
}

function routeApi(rawReq, rawRes, urlObj) {
  const handler = API_ROUTES[urlObj.pathname]
  const method = String(rawReq.method || 'GET').toUpperCase()
  const finish = (body) => {
    const req = makeReq(rawReq, urlObj, body)
    const res = makeRes(rawRes)
    if (handler) {
      Promise.resolve(handler(req, res)).catch((e) => {
        console.error('[server] Lỗi xử lý API:', e)
        res.status?.(500)?.json?.({ error: 'Lỗi máy chủ nội bộ.' })
      })
      return
    }
    rawRes.statusCode = 404
    rawRes.setHeader('Content-Type', 'application/json; charset=utf-8')
    rawRes.end(JSON.stringify({ error: 'Không tìm thấy endpoint.' }))
  }
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return finish({})
  }
  readBody(rawReq, rawRes, finish)
}

const server = http.createServer((rawReq, rawRes) => {
  const urlObj = new URL(rawReq.url, `http://${rawReq.headers.host || 'localhost'}`)
  if (urlObj.pathname.startsWith('/api/')) {
    routeApi(rawReq, rawRes, urlObj)
    return
  }
  serveStatic(rawRes, urlObj.pathname).catch((e) => {
    console.error('[server] Lỗi phục vụ tĩnh:', e)
    rawRes.statusCode = 500
    rawRes.end('Lỗi máy chủ nội bộ.')
  })
})

function lanAddresses() {
  const out = []
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets || {})) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address)
    }
  }
  return out
}

server.listen(PORT, '0.0.0.0', () => {
  const urls = [`http://localhost:${PORT}`, ...lanAddresses().map((ip) => `http://${ip}:${PORT}`)]
  console.log('')
  console.log('EduTrack server đang chạy:')
  urls.forEach((u) => console.log(`  • ${u}`))
  console.log(`Dữ liệu dùng chung lưu tại: ${DATA_FILE}`)
  console.log('Mọi trình duyệt/thiết bị mở các địa chỉ trên sẽ dùng chung một nguồn dữ liệu (đồng bộ).')
  console.log('')
})