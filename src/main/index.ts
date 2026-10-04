import { app } from 'electron'
import './utils/logInit'
import '@common/error'
import {
  initGlobalData,
  initSingleInstanceHandle,
  applyElectronEnvParams,
  setUserDataPath,
  registerDeeplink,
  listenerAppEvent,
} from './app'
import { isLinux } from '@common/utils'
import { initAppSetting } from '@main/app'
import initWinMain from '@main/modules/winMain'
import initWinLyric from '@main/modules/winLyric'
import initTray from '@main/modules/tray'

// ============================================================
// 修复：设置 → 播放设置 →「音频输出」下拉为空（找不到任何音频输出设备）
//
// 原因：Chromium 的音频服务默认以「沙箱化工具进程」(audio.mojom.AudioService) 运行。
// 在部分 Windows 环境（受限令牌/远程桌面/虚拟机等）下该工具进程无法拉起，
// 于是 navigator.mediaDevices.enumerateDevices() 只会返回摄像头，
// 音频输入/输出设备数均为 0，下拉列表在 UI 上表现为一条空白条。
//
// 处理：让音频服务改为在浏览器进程内运行（Chromium 早年的默认形态），
// 绕开工具进程沙箱。必须在 app ready 之前设置，且与已有 disable-features 合并。
// ============================================================
{
  const IN_PROCESS_AUDIO_FEATURE = 'AudioServiceOutOfProcess'
  const existed = app.commandLine.getSwitchValue('disable-features')
  const features = [
    IN_PROCESS_AUDIO_FEATURE,
    ...existed.split(',').map(item => item.trim()).filter(Boolean),
  ]
  app.commandLine.appendSwitch('disable-features', [...new Set(features)].join(','))
}

// 初始化应用
const init = () => {
  console.log('init')
  void initAppSetting().then(() => {
    initWinMain()
    initWinLyric()
    initTray()
    global.lx.event_app.app_inited()
  })
}

initGlobalData()
initSingleInstanceHandle()
applyElectronEnvParams()
setUserDataPath()
registerDeeplink(init)
listenerAppEvent(init)


// https://github.com/electron/electron/issues/16809
void app.whenReady().then(() => {
  isLinux ? setTimeout(init, 300) : init()
})
