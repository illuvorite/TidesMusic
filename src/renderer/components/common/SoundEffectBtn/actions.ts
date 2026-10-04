/**
 * 音效设置写入的统一入口。
 * 保留原有逻辑：音效设置与「自定义音频输出设备」冲突，启用音效时把输出设备重置为默认。
 */
import { setMediaDeviceId } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'

export const applyEffectSetting = async(payload: Record<string, any>): Promise<void> => {
  if (appSetting['player.mediaDeviceId'] != 'default') {
    await setMediaDeviceId('default').catch(_ => _)
    saveMediaDeviceId('default')
  }
  updateSetting(payload)
}

/** 同步版本：用于滑杆拖动这类高频、且无需等待设备切换的写入 */
export const applyEffectSettingSync = (payload: Record<string, any>): void => {
  updateSetting(payload)
}
