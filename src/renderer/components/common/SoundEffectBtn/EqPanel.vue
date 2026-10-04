<template>
  <div :class="$style.wrap">
    <!-- 预设网格（参考图：浅灰按钮格，选中 = 绿框 + 绿勾） -->
    <div :class="$style.grid">
      <button
        v-for="item in eqTiles"
        :key="item.key"
        type="button"
        :class="[$style.cell, { [$style.cellSelected]: selectedTile === item.key, [$style.cellPlain]: item.key === 'custom' }]"
        :disabled="item.key === 'custom'"
        @click="handleApplyTile(item)"
      >
        {{ item.label }}
        <span v-if="selectedTile === item.key" :class="$style.cellCheck">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 40 448 448" space="preserve">
            <use xlink:href="#icon-check" />
          </svg>
        </span>
      </button>
    </div>

    <!-- 10 段竖向滑块 + 拖动时顶部浮动数值 -->
    <div :class="$style.sliders">
      <transition name="fade">
        <span v-if="floatValue" :class="$style.floatValue">{{ floatValue }}</span>
      </transition>
      <div v-for="(item, i) in freqs" :key="item" :class="$style.sliderCol">
        <div :class="$style.sliderBox">
          <effect-slider
            vertical
            :value="gains[i]"
            :min="EQ_GAIN_MIN"
            :max="EQ_GAIN_MAX"
            @change="handleUpdate(item, $event)"
          />
        </div>
        <span :class="$style.freq">{{ labels[i] }}</span>
      </div>
    </div>

    <!-- 底部 6 个连续音效滑块（2 列 × 3 行，与参考图一致） -->
    <div :class="$style.bottom">
      <div v-for="(col, ci) in bottomColumns" :key="ci" :class="$style.bottomCol">
        <div v-for="item in col" :key="item.key" :class="$style.bottomRow">
          <span :class="[$style.bottomLabel, { [$style.bottomLabelActive]: appSetting[`player.soundEffect.${item.key}`] != 0 }]">{{ item.label }}</span>
          <effect-slider
            :class="$style.bottomSlider"
            :value="appSetting[`player.soundEffect.${item.key}`]"
            :min="item.min"
            :max="item.max"
            @change="handleEffectSlider(item.key, $event)"
          />
        </div>
      </div>
    </div>

    <!-- 我的预设 -->
    <div :class="$style.myList">
      <span :class="$style.myTitle">我的预设</span>
      <button
        v-for="item in userPresetList"
        :key="item.id"
        type="button"
        :class="$style.myChip"
        @click="handleSetPreset(item)"
        @contextmenu.prevent="handleRemovePreset(item.id)"
      >{{ item.name }}</button>
      <AddEQPresetBtn v-if="userPresetList.length < 31" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { freqs, EQ_GAIN_MIN, EQ_GAIN_MAX } from '@renderer/plugins/player'
import { eqTiles, matchEqTile, readEffectState, effectSliders } from './presets'
import { applyEffectSetting } from './actions'
import EffectSlider from './ui/EffectSlider.vue'
import AddEQPresetBtn from './AddEQPresetBtn.vue'
import { getUserEQPresetList, removeUserEQPreset } from '@renderer/store/soundEffect'

const labels = freqs.map(num => num < 1000 ? num : `${num / 1000}k`)

const gains = computed(() => readEffectState(appSetting).eq)
const selectedTile = computed(() => matchEqTile(gains.value))

// 底部 6 个滑块按参考图分成左右两列
const bottomColumns = [effectSliders.slice(0, 3), effectSliders.slice(3)]

// ---- 拖动时的浮动数值（参考图顶部居中的 "-6dB" 提示）----
const floatValue = ref('')
let floatTimer = null
const showFloat = (value) => {
  floatValue.value = `${value > 0 ? '+' : ''}${Math.round(value)}dB`
  clearTimeout(floatTimer)
  floatTimer = setTimeout(() => {
    floatValue.value = ''
  }, 1200)
}

const handleUpdate = (key, value) => {
  const rounded = Math.round(value)
  showFloat(rounded)
  updateSetting({ [`player.soundEffect.biquadFilter.hz${key}`]: rounded })
}

const handleApplyTile = (item) => {
  if (!item.gains.length) return
  const payload = {}
  freqs.forEach((item2, index) => {
    payload[`player.soundEffect.biquadFilter.hz${item2}`] = item.gains[index]
  })
  void applyEffectSetting(payload)
}

// ---- 底部 6 个连续音效滑块 ----
const handleEffectSlider = (key, value) => {
  const rounded = Math.round(value)
  const payload = { [`player.soundEffect.${key}`]: rounded }
  // 拖动「混响强度」而尚未选择混响来源时，自动启用默认的中厅堂 IR，
  // 保证该滑块可以独立使用（模式磁贴会同步显示为「中厅堂」）
  if (
    key === 'reverb' && rounded > 0 &&
    appSetting['player.soundEffect.reverbMode'] == 'off' &&
    !appSetting['player.soundEffect.convolution.fileName']
  ) {
    payload['player.soundEffect.reverbMode'] = 'medium'
  }
  if (appSetting['player.mediaDeviceId'] != 'default') {
    void applyEffectSetting(payload)
    return
  }
  updateSetting(payload)
}

// ---- 我的预设 ----
const userPresetList = ref([])
const handleSetPreset = (item) => {
  void applyEffectSetting({
    'player.soundEffect.biquadFilter.hz31': item.hz31,
    'player.soundEffect.biquadFilter.hz62': item.hz62,
    'player.soundEffect.biquadFilter.hz125': item.hz125,
    'player.soundEffect.biquadFilter.hz250': item.hz250,
    'player.soundEffect.biquadFilter.hz500': item.hz500,
    'player.soundEffect.biquadFilter.hz1000': item.hz1000,
    'player.soundEffect.biquadFilter.hz2000': item.hz2000,
    'player.soundEffect.biquadFilter.hz4000': item.hz4000,
    'player.soundEffect.biquadFilter.hz8000': item.hz8000,
    'player.soundEffect.biquadFilter.hz16000': item.hz16000,
  })
}
const handleRemovePreset = (id) => {
  void removeUserEQPreset(id)
}

onMounted(() => {
  void getUserEQPresetList().then((list) => {
    userPresetList.value = list
  })
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.wrap {
  display: flex;
  flex-flow: column nowrap;
  gap: 12px;
}

// ===== 预设网格：浅灰按钮格（与参考图一致，不用彩色磁贴）=====
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.cell {
  position: relative;
  height: 34px;
  border: 1.5px solid transparent;
  border-radius: 6px;
  background-color: var(--qm-field, #f2f3f5);
  color: var(--color-font);
  font-size: 13px;
  cursor: pointer;
  transition: background-color var(--qm-t-fast, .18s), border-color var(--qm-t-fast, .18s);

  &:hover:not([disabled]) {
    background-color: var(--qm-hover, #e9ebef);
  }
  &:active:not([disabled]) {
    transform: scale(.98);
  }
}
.cellSelected {
  border-color: #12b981;
  color: #0f9d6e;
  font-weight: 500;
}
.cellPlain {
  cursor: default;
  opacity: .85;
}
.cellCheck {
  position: absolute;
  top: -1px;
  right: -1px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #12b981;

  svg {
    width: 14px;
    height: 14px;
    fill: #12b981;
  }
}

// ===== 10 段竖向滑块 =====
.sliders {
  position: relative;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  gap: 4px;
  padding-top: 16px;
}
.floatValue {
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: var(--color-font);
  pointer-events: none;
  white-space: nowrap;
}
.sliderCol {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: 8px;
  flex: auto;
  min-width: 0;
}
.sliderBox {
  height: 132px;
}
.freq {
  font-size: 11px;
  color: var(--color-font-label);
  white-space: nowrap;
}

// ===== 底部 6 个连续音效滑块 =====
.bottom {
  display: flex;
  flex-flow: row nowrap;
  gap: 20px;
  padding-top: 4px;
}
.bottomCol {
  flex: 1;
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
  min-width: 0;
}
.bottomRow {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 8px;
}
.bottomLabel {
  flex: none;
  width: 56px;
  font-size: 12px;
  color: var(--color-font);
}
.bottomLabelActive {
  color: #12b981;
}
.bottomSlider {
  flex: auto;
  min-width: 0;
}

// ===== 我的预设 =====
.myList {
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  gap: 8px;
  padding-top: 2px;
}
.myTitle {
  font-size: 12px;
  color: var(--color-font-label);
}
.myChip {
  height: 24px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background-color: var(--qm-field, #f2f3f5);
  color: var(--color-font);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background-color: var(--qm-hover, #e9ebef);
  }
}
</style>
