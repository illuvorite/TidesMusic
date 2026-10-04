import { createBaseStore } from './BaseStore'
import defaultSetting from '@common/defaultSetting'
import { updateSetting as saveSetting } from '@renderer/utils/ipc'

/** 标记当前正在应用主进程广播的设置（见 onStateChange 回声抑制） */
let isApplyingRemote = false

/** 由 useEventListener 在应用主进程广播前/后调用 */
export const setApplyingRemote = (value: boolean) => {
  isApplyingRemote = value
}

const settingStore = createBaseStore<LX.AppSetting>({
  initialState: defaultSetting,
  useShallow: true,
  persistKeys: [
    'common.apiSource',
    'common.transparentWindow',
    'common.isShowAnimation',
    'player.volume',
    'player.isMute',
    'player.playbackRate',
    'player.playQuality',
    'player.togglePlayMethod',
    'player.autoSkipOnError',
    'player.autoSwitchSource',
    'player.isSavePlayTime',
    'player.isAutoCleanPlayedList',
    'player.isSavePlayHistory',
    'player.playHistoryMax',
    'player.mediaDeviceId',
    'player.audioVisualization',
    'desktopLyric.enable',
    'desktopLyric.isLock',
    'playDetail.style.fontSize',
    'playDetail.style.align',
    'theme.skinOpacity',
  ],
  onStateChange: (key, value) => {
    // 回声抑制：来自主进程广播（onSettingChanged → mergeSetting）的写入不再回写主进程。
    // 否则「本地写值 → 主进程 → 广播回本地 → 再次回写」会与在途的连续值（如滑条拖动流）
    // 形成两值乒乓的 IPC 死循环（表现为滑条数值持续自我跳动、无法调节）。
    if (isApplyingRemote) return
    void saveSetting({ [key]: value })
  },
})

export const appSetting = settingStore.state

export const isShowAnimation = settingStore.computed('common.isShowAnimation')

export const initSetting = (newSetting: LX.AppSetting) => {
  // 启动初始化：设置来自主进程，无需回写（同样属于回声，且会产生大量冗余 IPC）
  setApplyingRemote(true)
  try {
    settingStore.patch(newSetting)
  } finally {
    setApplyingRemote(false)
  }
}

export const mergeSetting = (newSetting: Partial<LX.AppSetting>) => {
  settingStore.patch(newSetting)
}

export const updateSetting = (setting: Partial<LX.AppSetting>) => {
  settingStore.patch(setting)
}

export const saveAgreePact = (isAgreePact: boolean) => {
  updateSetting({ 'common.isAgreePact': isAgreePact })
}

export const saveMediaDeviceId = (id: string) => {
  updateSetting({ 'player.mediaDeviceId': id })
}

export const saveVolume = (volume: number) => {
  updateSetting({ 'player.volume': volume })
}

export const saveVolumeIsMute = (isMute: boolean) => {
  updateSetting({ 'player.isMute': isMute })
}

export const savePlaybackRate = (rate: number) => {
  updateSetting({ 'player.playbackRate': rate })
}

export const setVisibleDesktopLyric = (enabled: boolean) => {
  updateSetting({ 'desktopLyric.enable': enabled })
}

export const setLockDesktopLyric = (isLock: boolean) => {
  updateSetting({ 'desktopLyric.isLock': isLock })
}

export const setTogglePlayMode = (mode: LX.AppSetting['player.togglePlayMethod']) => {
  updateSetting({ 'player.togglePlayMethod': mode })
}

export const setApiSource = (sourceId: string) => {
  updateSetting({ 'common.apiSource': sourceId })
}

export const setPlayDetailLyricFont = (size: number) => {
  updateSetting({ 'playDetail.style.fontSize': size })
}

export const setPlayDetailLyricAlign = (align: LX.AppSetting['playDetail.style.align']) => {
  updateSetting({ 'playDetail.style.align': align })
}

export const setEnableAudioVisualization = (enable: boolean) => {
  updateSetting({ 'player.audioVisualization': enable })
}