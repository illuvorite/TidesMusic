<template>
  <div :class="$style.content">
    <!-- ===== 预设宫格：关闭 / 内置 10 种 / 自定义，4×3 ===== -->
    <div :class="$style.presetGrid">
      <button
        v-for="item in presetItems"
        :key="item.key"
        type="button"
        :class="[$style.presetBtn, { [$style.active]: activePresetKey === item.key }]"
        :aria-label="item.label"
        :aria-pressed="activePresetKey === item.key"
        @click="item.preset ? handleSetPreset(item.preset) : handleReset()"
      >
        <span :class="$style.presetLabel">{{ item.label }}</span>
        <svg v-if="activePresetKey === item.key" :class="$style.presetCheck" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- ===== 十段竖向均衡器 ===== -->
    <div :class="$style.eqArea">
      <div :class="$style.eqList">
        <div
          v-for="(v, i) in freqs"
          :key="v"
          :class="$style.eqItem"
          @mouseenter="hoverFreq = v"
          @mouseleave="hoverFreq = 0"
        >
          <span v-if="hoverFreq === v || dragFreq === v" :class="$style.bandValue">{{ bandText(v) }}</span>
          <div :class="$style.vslider" @mousedown="handleBandDown($event, v)">
            <div :class="$style.vtrack" />
            <div :class="$style.vfill" :style="{ height: bandRatio(v) * 100 + '%' }" />
            <div :class="$style.vthumb" :style="{ bottom: `calc(${bandRatio(v) * 100}% - 7px)` }" />
          </div>
          <span :class="$style.freqLabel">{{ labels[i] }}</span>
        </div>
      </div>
    </div>

    <!-- ===== 增强效果：2 列 × 3 行（双击标签行可重置） ===== -->
    <div :class="$style.enhanceGrid">
      <div
        v-for="item in enhanceItems"
        :key="item.key"
        :class="$style.enhanceItem"
        :title="item.tip"
        @dblclick="item.reset()"
      >
        <span :class="$style.enhanceLabel">{{ item.label }}</span>
        <se-slider
          :value="item.value"
          :min="item.min"
          :max="item.max"
          @change="item.change($event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from '@common/utils/vueTools'
import { freqs, freqsPreset, setMediaDeviceId } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'
import SeSlider from './SeSlider.vue'

const labels = freqs.map(num => num < 1000 ? num : `${num / 1000}k`)

const ensureDefaultDevice = async() => {
  if (appSetting['player.mediaDeviceId'] != 'default') {
    await setMediaDeviceId('default').catch(_ => _)
    saveMediaDeviceId('default')
  }
}

const handleUpdate = async(key, value) => {
  await ensureDefaultDevice()
  value = Math.round(value)
  updateSetting({ [`player.soundEffect.biquadFilter.hz${key}`]: value })
}

const handleReset = () => {
  const setting = {}
  for (const key of freqs) {
    setting[`player.soundEffect.biquadFilter.hz${key}`] = 0
  }
  updateSetting(setting)
}

const handleSetPreset = (item) => {
  updateSetting({
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

// ===== 预设宫格（QQ 银河音效顺序：关闭 + 10 内置 + 自定义） =====
const PRESET_ORDER = ['close', 'pop', 'dance', 'blues', 'classical', 'jazz', 'slow', 'electronic', 'rock', 'country', 'vocal', 'custom']
const presetItems = computed(() => {
  return PRESET_ORDER.map(key => {
    if (key === 'close') {
      return { key, label: window.i18n.t('player__sound_effect_biquad_filter_preset_close'), preset: null }
    }
    if (key === 'custom') {
      return { key, label: window.i18n.t('player__sound_effect_biquad_filter_preset_custom'), preset: null }
    }
    const preset = freqsPreset.find(p => p.name === key)
    return {
      key,
      label: window.i18n.t(`player__sound_effect_biquad_filter_preset_${key}`),
      preset: preset ?? null,
    }
  })
})

const activePresetKey = computed(() => {
  const vals = freqs.map(f => appSetting[`player.soundEffect.biquadFilter.hz${f}`])
  if (vals.every(v => v === 0)) return 'close'
  for (const preset of freqsPreset) {
    if (freqs.every((f, i) => preset[`hz${f}`] === vals[i])) return preset.name
  }
  return 'custom'
})

// ===== 竖向频段滑杆 =====
const MIN_DB = -15
const MAX_DB = 15
const RANGE_DB = MAX_DB - MIN_DB

const hoverFreq = ref(0)
const dragFreq = ref(0)
const dragState = { startY: 0, startVal: 0, height: 0 }

const clampDb = val => Math.min(MAX_DB, Math.max(MIN_DB, val))

const bandRatio = v => (appSetting[`player.soundEffect.biquadFilter.hz${v}`] - MIN_DB) / RANGE_DB
const bandText = v => {
  const val = appSetting[`player.soundEffect.biquadFilter.hz${v}`]
  return `${val > 0 ? '+' : ''}${val}dB`
}

const handleBandDown = (event, freq) => {
  const height = event.currentTarget.clientHeight
  if (!height) return
  const ratio = 1 - (event.offsetY / height)
  const val = clampDb(Math.round(MIN_DB + ratio * RANGE_DB))
  dragFreq.value = freq
  dragState.startY = event.clientY
  dragState.height = height
  dragState.startVal = val
  void handleUpdate(freq, val)
}
const handleBandMove = event => {
  if (!dragFreq.value) return
  // 兜底：按键已松开却仍处于拖拽状态时强制结束，防止取值乱跳
  if (event.buttons === 0) {
    dragFreq.value = 0
    return
  }
  const delta = (dragState.startY - event.clientY) / dragState.height * RANGE_DB
  void handleUpdate(dragFreq.value, clampDb(Math.round(dragState.startVal + delta)))
}
const handleBandUp = () => {
  dragFreq.value = 0
}

// ===== 增强效果滑条（高保真度/超重低音/混响强度/动态推进/环绕强度/声道平衡） =====
const DEFAULT_REVERB = { source: 'matrix-reverb1.wav', mainGain: 10 }

const ensureReverbOn = () => {
  if (appSetting['player.soundEffect.convolution.fileName']) return
  updateSetting({
    'player.soundEffect.convolution.fileName': DEFAULT_REVERB.source,
    'player.soundEffect.convolution.mainGain': DEFAULT_REVERB.mainGain,
    // 尊重用户当前混响强度；为 0 时给一个可感知的默认值
    'player.soundEffect.convolution.sendGain': appSetting['player.soundEffect.convolution.sendGain'] || 15,
  })
}

const enhanceItems = computed(() => {
  return [
    {
      key: 'hifi',
      label: window.i18n.t('player__sound_effect_enhance_hifi'),
      tip: '提亮高频细节，让人声与乐器更通透（双击重置）',
      value: appSetting['player.soundEffect.enhance.hifi'],
      min: 0,
      max: 50,
      change: v => { updateSetting({ 'player.soundEffect.enhance.hifi': Math.round(v) }) },
      reset: () => { updateSetting({ 'player.soundEffect.enhance.hifi': 0 }) },
    },
    {
      key: 'bass',
      label: window.i18n.t('player__sound_effect_enhance_bass'),
      tip: '增强 120Hz 以下低频力度（双击重置）',
      value: appSetting['player.soundEffect.enhance.bass'],
      min: 0,
      max: 50,
      change: v => { updateSetting({ 'player.soundEffect.enhance.bass': Math.round(v) }) },
      reset: () => { updateSetting({ 'player.soundEffect.enhance.bass': 0 }) },
    },
    {
      key: 'reverb',
      label: window.i18n.t('player__sound_effect_enhance_reverb'),
      tip: '为声音添加空间混响（双击重置；拖动会自动启用默认混响）',
      value: appSetting['player.soundEffect.convolution.sendGain'],
      min: 0,
      max: 50,
      change: v => {
        if (Math.round(v) === 0) {
          // 拖回 0 = 关闭混响（保留用户选择的采样文件，仅静音）
          updateSetting({ 'player.soundEffect.convolution.sendGain': 0 })
          return
        }
        ensureReverbOn()
        updateSetting({ 'player.soundEffect.convolution.sendGain': Math.round(v) })
      },
      reset: () => { updateSetting({ 'player.soundEffect.convolution.sendGain': 0 }) },
    },
    {
      key: 'dynamic',
      label: window.i18n.t('player__sound_effect_enhance_dynamic'),
      tip: '动态压缩让响度更饱满、强弱对比更明显（双击重置）',
      value: appSetting['player.soundEffect.enhance.dynamic'],
      min: 0,
      max: 50,
      change: v => { updateSetting({ 'player.soundEffect.enhance.dynamic': Math.round(v) }) },
      reset: () => { updateSetting({ 'player.soundEffect.enhance.dynamic': 0 }) },
    },
    {
      key: 'surround',
      label: window.i18n.t('player__sound_effect_enhance_surround'),
      tip: '3D 环绕：声音围绕头部旋转，0% 为关闭（双击重置）',
      value: appSetting['player.soundEffect.panner.soundR'],
      min: 0,
      max: 30,
      change: v => {
        v = Math.round(v)
        if (v <= 0) {
          // 0% = 真正关闭环绕（停掉 panner 旋转，释放 CPU）
          updateSetting({ 'player.soundEffect.panner.enable': false, 'player.soundEffect.panner.soundR': 0 })
          return
        }
        if (!appSetting['player.soundEffect.panner.enable']) updateSetting({ 'player.soundEffect.panner.enable': true })
        updateSetting({ 'player.soundEffect.panner.soundR': v })
      },
      reset: () => { updateSetting({ 'player.soundEffect.panner.enable': false, 'player.soundEffect.panner.soundR': 0 }) },
    },
    {
      key: 'balance',
      label: window.i18n.t('player__sound_effect_enhance_balance'),
      tip: '左右声道平衡，居中为标准立体声（双击重置）',
      value: appSetting['player.soundEffect.enhance.balance'],
      min: -50,
      max: 50,
      change: v => { updateSetting({ 'player.soundEffect.enhance.balance': Math.round(v) }) },
      reset: () => { updateSetting({ 'player.soundEffect.enhance.balance': 0 }) },
    },
  ]
})

onMounted(() => {
  document.addEventListener('mousemove', handleBandMove)
  document.addEventListener('mouseup', handleBandUp)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleBandMove)
  document.removeEventListener('mouseup', handleBandUp)
})

</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.content {
  user-select: none;
  min-width: 0;
}

// ===== 预设宫格：4 列 × 3 行（实测 445×444 宽、左内缩 35px，行高 30、列距 15 / 行距 10）=====
.presetGrid {
  width: 445px;
  margin: 5px 0 0 35px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px 15px;
}
.presetBtn {
  position: relative;
  box-sizing: border-box;
  height: 30px;
  // 左右对称内距，保证文字真正居中；选中勾是绝对定位覆盖在右侧，不占位
  padding: 0 6px;
  border: 2px solid transparent;
  border-radius: 4px;
  background-color: var(--se-field, #f8f8f8);
  color: var(--se-text, #333);
  font-size: var(--se-fs-body, 13px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, 150ms ease), border-color var(--qm-t-fast, 150ms ease);

  .presetLabel {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  // 选中勾：贴右侧、垂直居中（实测 20×20 贴边）
  .presetCheck {
    position: absolute;
    right: 1px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    color: var(--se-accent, #1ecc94);
  }

  &:hover {
    background-color: var(--se-field-hover, #f1f1f1);
  }
  &.active {
    border-color: var(--se-accent, #1ecc94);
    color: var(--se-accent, #1ecc94);
  }
}

// ===== 十段竖向均衡器 =====
.eqArea {
  margin-top: 28px;
}
.eqList {
  // 实测轨心在 219.5…651.5（间距 48），即区块左沿 195.5：并非居中（居中会是 200）
  width: 480px;
  margin: 0 0 0 15px;
  display: flex;
  flex-flow: row nowrap;
}
.eqItem {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
}
// 悬停/拖动时在轨道正上方显示当前 dB（实测 11px、#333、轨顶上方 3px）
.bandValue {
  position: absolute;
  bottom: calc(100% + 3px);
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--se-fs-badge, 11px);
  line-height: 1;
  color: var(--se-text, #333);
  white-space: nowrap;
  pointer-events: none;
}
.vslider {
  position: relative;
  width: 18px;
  height: 186px;
  cursor: pointer;
}
.vtrack {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  width: 4px;
  height: 100%;
  border-radius: 999px;
  background-color: var(--se-track-v, #b7b7b7);
}
.vfill {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 4px;
  border-radius: 999px;
  background-color: var(--se-accent, #1ecc94);
}
.vthumb {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.22);
  pointer-events: none;
}
.freqLabel {
  // 实测：轨底到频率数字墨迹仅 4px
  margin-top: 2px;
  line-height: 14px;
  font-size: var(--se-fs-aux, 12px);
  color: var(--se-text, #333);
}

// ===== 增强效果滑条：2 列 × 3 行（实测 439×439、左内缩 35px、行距 30）=====
.enhanceGrid {
  width: 439px;
  margin: 30px 0 0 35px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 51px;
}
.enhanceItem {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 14px;
  min-width: 0;
  height: 16px;
}
.enhanceLabel {
  flex: none;
  width: 51px;
  font-size: var(--se-fs-body, 13px);
  color: var(--se-text, #333);
  white-space: nowrap;
}
</style>
