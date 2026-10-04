<template>
  <div :class="$style.content">
    <div class="player__sound_effect_title" :class="$style.header">
      <h3>
        {{ $t('player__sound_effect_pitch_shifter') }}
        <svg-icon class="help-icon" name="information-slab-circle-outline" :aria-label="$t('player__sound_effect_pitch_shifter_tip')" />
      </h3>
      <base-btn min @click="handleSetPreset(1)">{{ $t('player__sound_effect_pitch_shifter_reset_btn') }}</base-btn>
    </div>
    <div :class="$style.list">
      <div :class="$style.item">
        <span :class="[$style.value, { [$style.active]: playbackRate !== 1 }]">{{ playbackRate.toFixed(2) }}x</span>
        <se-slider :value="playbackRate * 100" :min="50" :max="150" @change="handleUpdatePlaybackRate" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from '@common/utils/vueTools'
import { setMediaDeviceId } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'
import SeSlider from './SeSlider.vue'

const playbackRate = computed(() => appSetting['player.soundEffect.pitchShifter.playbackRate'])

const handleSetPreset = async(value) => {
  if (appSetting['player.mediaDeviceId'] != 'default') {
    await setMediaDeviceId('default').catch(_ => _)
    saveMediaDeviceId('default')
  }
  updateSetting({ 'player.soundEffect.pitchShifter.playbackRate': value })
}

const handleUpdatePlaybackRate = (value) => {
  value = parseFloat((Math.round(value) / 100).toFixed(2))
  void handleSetPreset(value)
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
.value {
  flex: none;
  width: 44px;
  font-size: var(--se-fs-body, 13px);
  color: var(--se-text-weak, #666);
  font-variant-numeric: tabular-nums;

  &.active {
    color: var(--se-accent, #1ecc94);
  }
}
</style>
