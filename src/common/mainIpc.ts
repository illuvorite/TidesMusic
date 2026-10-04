import { ipcMain } from 'electron'

/**
 * IPC 来源校验。
 *
 * 项目存在多个渲染进程，其中 userApi 窗口会执行用户导入的第三方音源脚本。
 * 若不校验 sender，该窗口一旦被注入即可调用全部 IPC 能力
 * （导入其他音源、读取/写入任意应用数据、打开外部程序等）。
 *
 * 策略：
 * - 完全可信的窗口（主窗口、桌面歌词）注册其 webContents.id，全量放行；
 * - userApi 窗口注册为受限来源，仅允许访问 `userApi_` 前缀的自有通道；
 * - 未注册任何窗口时不做拦截，避免启动顺序导致功能不可用。
 */
const trustedSenderIds = new Set<number>()

/** 受限来源：仅允许访问指定前缀的通道 */
const limitedSenderPrefixes = new Map<number, string[]>()

/** 注册完全可信的渲染进程来源 */
export const registerTrustedSender = (id: number) => {
  trustedSenderIds.add(id)
  limitedSenderPrefixes.delete(id)
}

/** 注册受限来源，仅可访问 prefixes 列出的通道前缀 */
export const registerLimitedSender = (id: number, prefixes: string[]) => {
  trustedSenderIds.delete(id)
  limitedSenderPrefixes.set(id, prefixes)
}

/**
 * 判定 IPC 来源是否可信。
 *
 * ⚠️ 通道名必须由调用方从闭包传入，不能从 `event.channelName` 取：
 * Electron 40 已移除 `IpcMainEvent.channelName`（实测该属性为 undefined），
 * 仅 `sender` / `senderFrame` 仍然可用。若依赖 channelName，
 * 受限窗口的所有调用都会被误判为未授权（表现为自定义音源一直卡在
 * 「初始化中」并最终超时）。
 *
 * 另注：`ipcMain` 是共享事件总线，Electron 内部的 Session 模块也会向它
 * emit 私有事件，这类事件连 sender 都可能缺失，直接取属性会抛 TypeError
 * 把整个主进程带崩。因此这里全程使用可选链 + 类型守卫。
 */
const isTrustedSender = (
  event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent,
  channel: string,
) => {
  const id = event.sender?.id
  // sender 缺失 ⇒ 无法证明来源可信，按未授权处理
  if (typeof id != 'number') return false
  // 启动期：尚未注册任何窗口时不做拦截，避免初始化顺序导致功能不可用
  if (!trustedSenderIds.size && !limitedSenderPrefixes.size) return true
  // 完全可信的窗口（主窗口、桌面歌词）
  if (trustedSenderIds.has(id)) return true
  // 受限窗口（userApi）：仅放行白名单前缀的通道
  const prefixes = limitedSenderPrefixes.get(id)
  if (!prefixes) return false
  return prefixes.some(prefix => channel.startsWith(prefix))
}

const denyUntrusted = (name: string, id: unknown) => {
  console.warn(`[mainIpc] blocked untrusted sender (id: ${String(id)}) for channel: ${name}`)
}

export function mainOn(name: string, listener: LX.IpcMainEventListener): void
export function mainOn<T>(name: string, listener: LX.IpcMainEventListenerParams<T>): void
export function mainOn<T>(name: string, listener: LX.IpcMainEventListenerParams<T>): void {
  ipcMain.on(name, (event, params) => {
    if (!isTrustedSender(event, name)) {
      denyUntrusted(name, event.sender?.id)
      return
    }
    listener({ event, params })
  })
}

export function mainOnce(name: string, listener: LX.IpcMainEventListener): void
export function mainOnce<T>(name: string, listener: LX.IpcMainEventListenerParams<T>): void
export function mainOnce<T>(name: string, listener: LX.IpcMainEventListenerParams<T>): void {
  ipcMain.once(name, (event, params) => {
    if (!isTrustedSender(event, name)) {
      denyUntrusted(name, event.sender?.id)
      return
    }
    listener({ event, params })
  })
}

export const mainOff = (name: string, listener: (...args: any[]) => void) => {
  ipcMain.removeListener(name, listener)
}

export const mainOffAll = (name: string) => {
  ipcMain.removeAllListeners(name)
}

export function mainHandle(name: string, listener: LX.IpcMainInvokeEventListener): void
export function mainHandle<T>(name: string, listener: LX.IpcMainInvokeEventListenerParams<T>): void
export function mainHandle<V>(name: string, listener: LX.IpcMainInvokeEventListenerValue<V>): void
export function mainHandle<T, V>(name: string, listener: LX.IpcMainInvokeEventListenerParamsValue<T, V>): void
export function mainHandle<T, V>(name: string, listener: LX.IpcMainInvokeEventListenerParamsValue<T, V>): void {
  ipcMain.handle(name, async(event, params) => {
    if (!isTrustedSender(event, name)) {
      denyUntrusted(name, event.sender?.id)
      throw new Error('unauthorized sender')
    }
    return listener({ event, params })
  })
}

export function mainHandleOnce(name: string, listener: LX.IpcMainInvokeEventListener): void
export function mainHandleOnce<T>(name: string, listener: LX.IpcMainInvokeEventListenerParams<T>): void
export function mainHandleOnce<V>(name: string, listener: LX.IpcMainInvokeEventListenerValue<V>): void
export function mainHandleOnce<T, V>(name: string, listener: LX.IpcMainInvokeEventListenerParamsValue<T, V>): void
export function mainHandleOnce<T, V>(name: string, listener: LX.IpcMainInvokeEventListenerParamsValue<T, V>): void {
  ipcMain.handleOnce(name, async(event, params) => {
    if (!isTrustedSender(event, name)) {
      denyUntrusted(name, event.sender?.id)
      throw new Error('unauthorized sender')
    }
    return listener({ event, params })
  })
}
export const mainHandleRemove = (name: string) => {
  ipcMain.removeHandler(name)
}

export function mainSend(window: Electron.BrowserWindow, name: string): void
export function mainSend<T>(window: Electron.BrowserWindow, name: string, params: T): void
export function mainSend<T>(window: Electron.BrowserWindow, name: string, params?: T): void {
  window.webContents.send(name, params)
}