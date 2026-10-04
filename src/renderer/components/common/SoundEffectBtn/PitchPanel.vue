<template>
  <div :class="$style.wrap">
    <!-- 音调升降 -->
    <div :class="$style.sectionHead">
      <h3 :class="$style.title">
        {{ $t('player__sound_effect_pitch_shifter') }}
        <svg-icon class="help-icon" name="information-slab-circle-outline" :aria-label="$t('player__sound_effect_pitch_shifter_tip')" />
      </h3>
      <div :class="$style.headRight">
        <span :class="[$style.valueText, { [$style.valueActive]: playbackRate != 1 }]">{{ playbackRate.toFixed(2) }}x</span>
        <base-btn min @click="handleSetPreset(1)">{{ $t('player__sound_effect_pitch_shifter_reset_btn') }}</base-btn>
      </div>
    </div>
    <effect-slider
      :class="$style.slider"
      :value="playbackRate * 100"
      :min="50"
      :max="150"
      @change="handleUpdatePlaybackRate"
    />
    <div :class="$style.grid4">
      <effect-tile
        v-for="item in semitoneTiles"
        :key="item.label"
        :label="item.label"
        :colors="item.colors"
        :selected="Math.abs(playbackRate - item.value) < 0.005"
        @click="handleSetPreset(item.value)"
      />
    </div>

    <!-- 3D 环绕速度（强度在「均衡器」页的环绕强度中调整） -->
    <div :class="$style.sectionHead">
      <h3 :class="$style.title">{{ $t('player__sound_effect_panner') }}</h3>
      <span :class="[$style.valueText, { [$style.valueActive]: surroundStrength != 0 }]">{{ surroundStrength == 0 ? '未启用' : '环绕强度 ' + surroundStrength }}</span>
    </div>
    <div :class="$style.row">
      <span :class="$style.rowLabel">{{ $t('player__sound_effect_panner_sound_speed') }}</span>
      <effect-slider
        :class="$style.slider"
        :value="appSetting['player.soundEffect.panner.speed']"
        :min="1"
        :max="50"
        :disabled="surroundStrength == 0"
        @change="handleUpdateSpeed"
      />
      <span :class="$style.rowValue">{{ appSetting['player.soundEffect.panner.speed'] }}</span>
    </div>
    <p :class="$style.tip">环绕强度请在「均衡器」页调整（0 即关闭 3D 环绕）。</p>
  </div>
</template>

<script setup>
import { computed } from '@common/utils/vueTools'
import { setMediaDeviceId } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'
import EffectTile from './ui/EffectTile.vue'
import EffectSlider from './ui/EffectSlider.vue'

const playbackRate = computed(() => appSetting['player.soundEffect.pitchShifter.playbackRate'])
const surroundStrength = computed(() => appSetting['player.soundEffect.surroundStrength'])

// 半音快捷磁贴：playbackRate = 2 ** (semitones / 12)
const semitoneTiles = [
  { label: '-2 半音', value: Number((2 ** (-2 / 12)).toFixed(2)), colors: 'linear-gradient(135deg, #9fb6d8, #4f6f9d)' },
  { label: '-1 半音', value: Number((2 ** (-1 / 12)).toFixed(2)), colors: 'linear-gradient(135deg, #a8c8e8, #5786b8)' },
  { label: '+1 半音', value: Number((2 ** (1 / 12)).toFixed(2)), colors: 'linear-gradient(135deg, #b8e0d8, #4f9d8a)' },
  { label: '+2 半音', value: Number((2 ** (2 / 12)).toFixed(2)), colors: 'linear-gradient(135deg, #d8c8a8, #9d7f4f)' },
]

const handleSetPreset = async(value) => {
  if (appSetting['player.mediaDeviceId'] != 'default') {
    await setMediaDeviceId('default').catch(_ => _)
    saveMediaDeviceId('default')
  }
  updateSetting({ 'player.soundEffect.pitchShifter.playbackRate': value })
}

const handleUpdatePlaybackRate = (value) => {
  void handleSetPreset(parseFloat((Math.round(value) / 100).toFixed(2)))
}

const handleUpdateSpeed = (value) => {
  updateSetting({ 'player.soundEffect.panner.speed': Math.round(value) })
}
</script>

<style lang="less" module>
.wrap {
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
}
.title {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-font);
  :global(.help-icon) {
    width: 14px;
    height: 14px;
    fill: var(--color-font-label);
  }
}
.sectionHead {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.headRight {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 10px;
}
.valueText {
  font-size: 12px;
  color: var(--color-font-label);
  &.valueActive {
    color: #12b981;
  }
}
.grid4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.slider {
  width: 100%;
}
.row {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 8px;
}
.rowLabel {
  flex: none;
  font-size: 12px;
  color: var(--color-font);
}
.rowValue {
  flex: none;
  width: 28px;
  font-size: 12px;
  text-align: right;
  color: var(--color-font-label);
}
.tip {
  margin: 0;
  font-size: 12px;
  color: var(--color-font-label);
}
</style>
