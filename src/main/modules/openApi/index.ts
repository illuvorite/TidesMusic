import http from 'node:http'
import querystring from 'node:querystring'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { Socket } from 'node:net'
import { DATA_KEYS, STORE_NAMES } from '@common/constants'
import { getAddress } from '@common/utils/nodejs'
import getStore from '@main/utils/store'
import { sendTaskbarButtonClick } from '@main/modules/winMain'

const TOKEN_HEADER = 'x-lx-token'
const MAX_SSE_CONNECTIONS = 32
const MAX_AUTH_FAILURES = 20
const AUTH_FAIL_WINDOW = 60_000
const TOKEN_RXP = /^[0-9a-f]{64}$/

const authFailures = new Map<string, { count: number; expireAt: number }>()

const createToken = () => randomBytes(32).toString('hex')

const getToken = () => {
  const store = getStore(STORE_NAMES.DATA)
  let token = store.get<string>(DATA_KEYS.openApiToken)
  if (typeof token != 'string' || !TOKEN_RXP.test(token)) {
    token = createToken()
    store.set(DATA_KEYS.openApiToken, token)
  }
  return token
}

/** 重新生成访问令牌，用于用户主动吊销已泄露的令牌 */
export const regenerateToken = () => {
  const token = createToken()
  getStore(STORE_NAMES.DATA).set(DATA_KEYS.openApiToken, token)
  return token
}

const safeCompare = (a: string, b: string) => {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

const isAuthLocked = (ip: string) => {
  const fail = authFailures.get(ip)
  if (!fail) return false
  if (fail.expireAt <= Date.now()) {
    authFailures.delete(ip)
    return false
  }
  return fail.count >= MAX_AUTH_FAILURES
}

const recordAuthFailure = (ip: string) => {
  const fail = authFailures.get(ip)
  if (fail && fail.expireAt > Date.now()) {
    fail.count++
    fail.expireAt = Date.now() + AUTH_FAIL_WINDOW
  } else {
    authFailures.set(ip, { count: 1, expireAt: Date.now() + AUTH_FAIL_WINDOW })
  }
}

/**
 * 校验请求令牌。EventSource 无法自定义请求头，因此同时接受 url 查询参数。
 * 令牌校验通过才允许跨域读取响应，未通过时不下发 CORS 头，
 * 这样即使服务监听在局域网，第三方网页也无法读取返回内容。
 */
const checkAuth = (req: http.IncomingMessage) => {
  const ip = req.socket.remoteAddress ?? ''
  if (isAuthLocked(ip)) return false

  const query = querystring.parse((req.url ?? '').split('?')[1] ?? '')
  const headerToken = req.headers[TOKEN_HEADER]
  const provided = (Array.isArray(headerToken) ? headerToken[0] : headerToken)
    ?? (typeof query.token == 'string' ? query.token : '')
  if (provided && safeCompare(provided, getToken())) {
    authFailures.delete(ip)
    return true
  }
  recordAuthFailure(ip)
  return false
}

const sendResponse = (
  res: http.ServerResponse,
  code = 200,
  msg: string | Record<any, unknown> = 'OK',
  contentType = 'text/plain; charset=utf-8',
  withCors = false,
) => {
  const headers: Record<string, string> = { 'Content-Type': contentType }
  if (withCors) {
    headers['Access-Control-Allow-Origin'] = '*'
    headers['Access-Control-Allow-Headers'] = TOKEN_HEADER
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  }
  res.writeHead(code, headers)
  if (typeof msg === 'object') {
    res.end(JSON.stringify(msg))
  } else {
    res.end(msg)
  }
}

let status: LX.OpenAPI.Status = {
  status: false,
  message: '',
  address: '',
}

type SubscribeKeys = keyof LX.Player.Status

let httpServer: http.Server | null = null
let sockets = new Set<Socket>()
let responses = new Map<http.ServerResponse<http.IncomingMessage>, SubscribeKeys[]>()
let playerStatusKeys: SubscribeKeys[]

const defaultFilter = [
  'status',
  'name',
  'singer',
  'albumName',
  'lyricLineText',
  'duration',
  'progress',
  'playbackRate',
] satisfies SubscribeKeys[]

const parseFilter = (filter: any) => {
  if (typeof filter != 'string') return defaultFilter
  filter = filter.split(',')
  const subKeys = playerStatusKeys.filter(k => filter.includes(k))
  return subKeys.length ? subKeys : defaultFilter
}
const handleSendStatus = (res: http.ServerResponse<http.IncomingMessage>, query?: string) => {
  const keys = parseFilter(querystring.parse(query ?? '').filter)
  const resp: Partial<Record<SubscribeKeys, any>> = {}
  for (const k of keys) resp[k] = global.lx.player_status[k]
  sendResponse(res, 200, resp, 'application/json; charset=utf-8', true)
}
const handleSendAllLyric = (res: http.ServerResponse<http.IncomingMessage>) => {
  const resp: Partial<Record<SubscribeKeys, any>> = {
    lyric: global.lx.player_status.lyric,
    tlyric: global.lx.player_status.tlyric,
    rlyric: global.lx.player_status.rlyric,
    lxlyric: global.lx.player_status.lxlyric,
  }
  sendResponse(res, 200, resp, 'application/json; charset=utf-8', true)
}
const handleSubscribePlayerStatus = (req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>, query?: string) => {
  if (responses.size >= MAX_SSE_CONNECTIONS) {
    sendResponse(res, 503, 'Too many subscribers', 'text/plain; charset=utf-8', true)
    return
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  })
  req.socket.setTimeout(0)
  req.on('close', () => {
    res.end('OK')
    responses.delete(res)
  })
  const keys = parseFilter(querystring.parse(query ?? '').filter)
  responses.set(res, keys)
  for (const [k, v] of Object.entries(global.lx.player_status)) {
    if (!keys.includes(k as SubscribeKeys)) continue
    res.write(`event: ${k}\n`)
    res.write(`data: ${JSON.stringify(v)}\n\n`)
  }
}

const handleStartServer = async(port: number, ip: string) => new Promise<void>((resolve, reject) => {
  playerStatusKeys = Object.keys(global.lx.player_status) as SubscribeKeys[]
  const server = http.createServer((req, res): void => {
    // 跨域预检请求：仅在令牌校验通过后才允许自定义请求头
    if (req.method === 'OPTIONS') {
      if (checkAuth(req)) sendResponse(res, 204, '', 'text/plain; charset=utf-8', true)
      else sendResponse(res, 403, 'Forbidden')
      return
    }

    if (!checkAuth(req)) {
      sendResponse(res, 401, 'Unauthorized', 'text/plain; charset=utf-8')
      return
    }

    const [endUrl, query] = `/${req.url?.split('/').at(-1) ?? ''}`.split('?')
    let code = 200
    let msg = 'OK'
    switch (endUrl) {
      case '/status':
        handleSendStatus(res, query)
        return
      case '/lyric':
        msg = global.lx.player_status.lyric
        break
      case '/lyric-all':
        handleSendAllLyric(res)
        return
      case '/play':
        sendTaskbarButtonClick('play')
        break
      case '/pause':
        sendTaskbarButtonClick('pause')
        break
      case '/skip-next':
        sendTaskbarButtonClick('next')
        break
      case '/skip-prev':
        sendTaskbarButtonClick('prev')
        break
      case '/seek': {
        const offset = parseFloat(querystring.parse(query ?? '').offset as string)
        if (Number.isNaN(offset) || offset < 0 || offset > global.lx.player_status.duration) {
          code = 400
          msg = 'Invalid offset'
        } else {
          sendTaskbarButtonClick('seek', parseFloat(offset.toFixed(3)))
        }
        break
      }
      case '/collect':
        sendTaskbarButtonClick('collect')
        break
      case '/uncollect':
        sendTaskbarButtonClick('unCollect')
        break
      case '/volume': {
        const volume = parseInt(querystring.parse(query ?? '').volume as string)
        if (Number.isNaN(volume) || volume < 0 || volume > 100) {
          code = 400
          msg = 'Invalid volume'
        } else {
          sendTaskbarButtonClick('volume', volume / 100)
        }
        break
      }
      case '/mute': {
        const mute = querystring.parse(query ?? '').mute
        if (mute == 'true') {
          sendTaskbarButtonClick('mute', true)
        } else if (mute == 'false') {
          sendTaskbarButtonClick('mute', false)
        } else {
          code = 400
          msg = 'Invalid mute value'
        }
        break
      }
      case '/subscribe-player-status':
        try {
          handleSubscribePlayerStatus(req, res, query)
          return
        } catch (err) {
          console.log(err)
          code = 500
          msg = 'Error'
        }
        break
      default:
        code = 404
        msg = 'Not Found'
        break
    }
    sendResponse(res, code, msg, 'text/plain; charset=utf-8', true)
  })
  server.on('error', error => {
    console.log(error)
    reject(error)
  })
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.once('close', () => {
      sockets.delete(socket)
    })
    socket.setTimeout(4000)
  })

  server.on('listening', () => {
    const addr = server.address()
    if (!addr) {
      reject(new Error('address is null'))
      return
    }
    resolve()
  })
  server.listen(port, ip)
  httpServer = server
})

const handleStopServer = async() => new Promise<void>((resolve, reject) => {
  const server = httpServer
  if (!server) {
    resolve()
    return
  }
  server.close((err) => {
    if (err) {
      reject(err)
      return
    }
    resolve()
  })
  for (const socket of sockets) socket.destroy()
  sockets.clear()
  responses.clear()
  authFailures.clear()
})


const sendStatus = (status: Partial<LX.Player.Status>) => {
  if (!responses.size) return
  for (const [resp, keys] of responses) {
    for (const [k, v] of Object.entries(status)) {
      if (!keys.includes(k as SubscribeKeys)) continue
      resp.write(`event: ${k}\n`)
      resp.write(`data: ${JSON.stringify(v)}\n\n`)
    }
  }
}
export const stopServer = async() => {
  global.lx.event_app.off('player_status', sendStatus)
  // 不依赖 status.status 判断：启动流程中途失败时 status 可能为 false 而端口已被占用
  if (!httpServer) {
    status.status = false
    status.message = ''
    status.address = ''
    return status
  }
  await handleStopServer().then(() => {
    httpServer = null
    status.status = false
    status.message = ''
    status.address = ''
  }).catch(err => {
    console.log(err)
    status.message = err.message
  })
  return status
}
export const startServer = async(port: number, bindLan: boolean) => {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    status.status = false
    status.message = 'Invalid port'
    status.address = ''
    return status
  }
  if (httpServer) await stopServer()
  await handleStartServer(port, bindLan ? '0.0.0.0' : '127.0.0.1').then(() => {
    status.status = true
    status.message = ''
    let address = ['127.0.0.1']
    if (bindLan) address = [...address, ...getAddress()]
    status.address = address.join(', ')
  }).catch(err => {
    console.log(err)
    status.status = false
    status.message = err.message
    status.address = ''
    httpServer = null
  })
  global.lx.event_app.on('player_status', sendStatus)
  return status
}

export const getStatus = (): LX.OpenAPI.Status => status

/** 获取当前访问令牌，供渲染层展示给用户配置到第三方客户端 */
export const getTokenStatus = () => ({ token: getToken() })
