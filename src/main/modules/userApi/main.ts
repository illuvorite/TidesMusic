import { mainSend } from '@common/mainIpc'
import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'node:path'
import { openDevTools as handleOpenDevTools } from '@main/utils'
import { sendStatusChange } from '@main/modules/winMain/rendererEvent/userApi'
import USER_API_RENDERER_EVENT_NAME from './rendererEvent/name'
import { getScript } from './utils'

let browserWindow: Electron.BrowserWindow | null = null

let html: string | null = null
let dir: string | null = null

let initTimer: NodeJS.Timeout | null = null

const denyEvents = [
  'will-navigate',
  'will-redirect',
  'will-attach-webview',
  'will-prevent-unload',
  'media-started-playing',
] as const


export const getProxy = () => {
  if (global.lx.appSetting['network.proxy.enable'] && global.lx.appSetting['network.proxy.host']) {
    return {
      host: global.lx.appSetting['network.proxy.host'],
      port: global.lx.appSetting['network.proxy.port'],
    }
  }
  const envProxy = envParams.cmdParams['proxy-server']
  if (envProxy) {
    if (envProxy && typeof envProxy == 'string') {
      const [host, port = ''] = envProxy.split(':')
      return {
        host,
        port,
      }
    }
  }
  return {
    host: '',
    port: '',
  }
}
const handleUpdateProxy = (keys: Array<keyof LX.AppSetting>) => {
  if (keys.includes('network.proxy.enable') || (global.lx.appSetting['network.proxy.enable'] && keys.some(k => k.startsWith('network.proxy.')))) {
    sendEvent(USER_API_RENDERER_EVENT_NAME.proxyUpdate, getProxy())
  }
}

const winEvent = () => {
  if (!browserWindow) return
  browserWindow.on('closed', () => {
    clearInitTimer()
    browserWindow = null
  })
}

export const createWindow = async(userApi: LX.UserApi.UserApiInfo) => {
  await closeWindow()
  clearInitTimer()
  dir ??= process.env.NODE_ENV !== 'production' ? webpackUserApiPath : path.join(__dirname, 'userApi')

  if (!html) {
    // eslint-disable-next-line require-atomic-updates
    html = await fs.promises.readFile(path.join(dir, 'renderer/user-api.html'), 'utf8')
  }
  const preloadUrl = process.env.NODE_ENV !== 'production'
    ? `${path.join(__dirname, '../dist/user-api-preload.js')}`
    : `${path.join(__dirname, 'user-api-preload.js')}`
  // console.log(preloadUrl)

  /**
   * Initial window options
   */
  browserWindow = new BrowserWindow({
    // enableRemoteModule: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    roundedCorners: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      contextIsolation: true,
      // worldSafeExecuteJavaScript: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      sandbox: false,

      spellcheck: false,
      autoplayPolicy: 'document-user-activation-required',
      enableWebSQL: false,
      disableDialogs: true,
      // nativeWindowOpen: false,
      webgl: false,
      images: false,
      webSecurity: false,

      preload: preloadUrl,
    },
  })

  for (const eventName of denyEvents) {
    // @ts-expect-error
    browserWindow.webContents.on(eventName, (event: Electron.Event) => {
      event.preventDefault()
    })
  }
  browserWindow.webContents.session.setPermissionRequestHandler((webContents, permission, resolve) => {
    if (webContents === browserWindow?.webContents) {
      resolve(false)
      return
    }
    resolve(true)
  })
  browserWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  winEvent()

  // ==== 排查用：把 user-api 窗口的一切异常/日志转发到主进程终端 ====
  // 音源脚本、preload 的报错此前只存在于该窗口的 DevTools 里，看不到就只能猜
  browserWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`[user-api] preload 加载失败: ${preloadPath}\n`, error)
  })
  browserWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[user-api] 页面加载失败: ${errorCode} ${errorDescription} url=${validatedURL}`)
  })
  browserWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[user-api] 渲染进程退出:', details)
  })
  browserWindow.webContents.on('console-message', (_event: any, ...args: any[]) => {
    // Electron 新旧两个版本的签名兼容
    const detail = args[0] && typeof args[0] === 'object'
      ? args[0]
      : { level: args[0], message: args[1], lineNumber: args[2], sourceId: args[3] }
    console.log(`[user-api:console](${detail.level ?? ''}) ${detail.message ?? ''}${detail.sourceId ? ` @ ${detail.sourceId}:${detail.lineNumber ?? 0}` : ''}`)
  })

  // 排查用 devtools 仅在 dev 模式开启（生产版会弹出独立调试窗口，影响使用）
  if (process.env.NODE_ENV !== 'production') {
    browserWindow.webContents.openDevTools({ mode: 'detach' })
  }

  // console.log(html.replace('</body>', `<script>${userApi.script}</script></body>`))
  // const randomNum = Math.random().toString().substring(2, 10)
  await browserWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(html))

  browserWindow.on('ready-to-show', async() => {
    global.lx.event_app.on('updated_config', handleUpdateProxy)
    const script = await getScript(userApi.id)
    // 排查用日志：脚本为空则一定不会执行，必然走到下面的超时兜底
    console.log(`[user-api] send initEnv: id=${userApi.id} name=${userApi.name} scriptLength=${script?.length ?? 0} proxy=${JSON.stringify(getProxy())}`)
    if (!script) console.warn('[user-api] 音源脚本为空，脚本不会执行 → 必定初始化超时')
    sendEvent(USER_API_RENDERER_EVENT_NAME.initEnv, { ...userApi, script, proxy: getProxy() })
    initTimer = setTimeout(() => {
      console.warn(`[user-api] 初始化超时：20s 内未收到脚本的 inited 事件（id=${userApi.id}）`)
      sendStatusChange({ status: false, message: '初始化超时' })
    }, 20000)
  })

  // global.modules.userApiWindow.loadFile(join(dir, 'renderer/user-api.html'))
  // global.modules.userApiWindow.webContents.openDevTools()
}

export const closeWindow = async() => {
  global.lx.event_app.off('updated_config', handleUpdateProxy)
  if (!browserWindow) return
  await Promise.all([
    browserWindow.webContents.session.clearAuthCache(),
    browserWindow.webContents.session.clearStorageData(),
    browserWindow.webContents.session.clearCache(),
  ])
  browserWindow?.destroy()
  browserWindow = null
}

export const clearInitTimer = () => {
  if (initTimer) {
    clearTimeout(initTimer)
    initTimer = null
  }
}

export const sendEvent = <T = any>(name: string, params?: T) => {
  if (!browserWindow) return
  mainSend(browserWindow, name, params)
}

export const openDevTools = () => {
  if (!browserWindow) return
  handleOpenDevTools(browserWindow.webContents)
}
