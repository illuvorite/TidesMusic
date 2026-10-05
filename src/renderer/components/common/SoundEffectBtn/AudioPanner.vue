<template>
  <div :class="$style.content">
    <div class="player__sound_effect_title" :class="$style.header">
      <h3>{{ $t('player__sound_effect_panner') }}</h3>
      <base-checkbox
        id="player__sound_effect_panner_enabled"
        :class="$style.checkbox"
        :label="$t('player__sound_effect_panner_enabled')"
        :model-value="appSetting['player.soundEffect.panner.enable']"
        @update:model-value="updateEnabled"
      />
    </div>
    <div :class="$style.list">
      <div :class="$style.item">
        <span :class="$style.label">{{ $t('player__sound_effect_panner_sound_speed') }}</span>
        <se-slider :value="appSetting['player.soundEffect.panner.speed']" :min="1" :max="50" @change="handleUpdateSpeed" />
        <span :class="[$style.value, { [$style.active]: appSetting['player.soundEffect.panner.speed'] != 25 }]">{{ appSetting['player.soundEffect.panner.speed'] }}</span>
      </div>
      <div :class="$style.item">
        <span :class="$style.label">{{ $t('player__sound_effect_panner_sound_r') }}</span>
        <se-slider :value="appSetting['player.soundEffect.panner.soundR']" :min="1" :max="ENHANCE_MAX" @change="handleUpdateSoundR" />
        <span :class="[$style.value, { [$style.active]: appSetting['player.soundEffect.panner.soundR'] != DEFAULT_SOUND_R }]">{{ appSetting['player.soundEffect.panner.soundR'] }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { setMediaDeviceId, ENHANCE_MAX } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'
import SeSlider from './SeSlider.vue'

/**
 * 环绕强度的默认值（占满量程的百分比）。
 * 与 common/defaultSetting.ts 的 'player.soundEffect.panner.soundR' 保持一致 ——
 * 15% ≈ 旋转半径 0.45，是「有明显的空间移动但还不晕」的档位。
 */
const DEFAULT_SOUND_R = 15

const updateEnabled = async(enabled) => {
  if (appSetting['player.mediaDeviceId'] != 'default') {
    await setMediaDeviceId('default').catch(_ => _)
    saveMediaDeviceId('default')
  }
  // 半径为 0（可能由增强滑条或总开关关闭）时直接开启会静默无声，补一个可感知的默认半径
  if (enabled && !(appSetting['player.soundEffect.panner.soundR'] > 0)) {
    updateSetting({ 'player.soundEffect.panner.enable': true, 'player.soundEffect.panner.soundR': DEFAULT_SOUND_R })
    return
  }
  updateSetting({ 'player.soundEffect.panner.enable': enabled })
}

const handleUpdateSoundR = (value) => {
  value = Math.round(value)
  // 半径拖到 0 不再是合法取值（0 = 关闭，走开关），钳制到最小可感知值
  updateSetting({ 'player.soundEffect.panner.soundR': Math.max(1, value) })
}
const handleUpdateSpeed = (value) => {
  updateSetting({ 'player.soundEffect.panner.speed': Math.round(value) })
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.content {
  user-select: none;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  min-height: 0;
}
.header {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: var(--se-fs-section, 14px);
    font-weight: 600;
    color: var(--se-text, #333);
  }
}
.checkbox {
  margin-right: 4px;
  font-size: var(--se-fs-body, 13px);
}
.list {
  display: flex;
  flex-flow: column nowrap;
  gap: 19px;
  width: 100%;
  max-width: 520px;
}
.item {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 14px;
}
.label {
  flex: none;
  width: 124px;
  font-size: var(--se-fs-body, 13px);
  color: var(--se-text, #333);
}
.value {
  flex: none;
  width: 36px;
  text-align: right;
  font-size: var(--se-fs-body, 13px);
  color: var(--se-text-weak, #666);
  font-variant-numeric: tabular-nums;

  &.active {
    color: var(--se-accent, #1ecc94);
  }
}
</style>
