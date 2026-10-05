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
        @click="handlePresetClick(item)"
      >
        <span :class="$style.presetLabel">{{ item.label }}</span>
        <svg v-if="activePresetKey === item.key" :class="$style.presetCheck" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- ===== 均衡器曲线：与下方滑杆双向绑定（拖控制点 = 改该频段增益）===== -->
    <div :class="$style.curveArea">
      <eq-curve :values="gains" @change="handleCurveChange" />
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
import { ENHANCE_BALANCE_MAX, ENHANCE_MAX, freqs, freqsPreset, setMediaDeviceId } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'
import { exitGalaxyForManualEnhance, markGalaxyEqCustom } from '@renderer/plugins/player/galaxy/bridge'
import EqCurve from './EqCurve.vue'
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
  // 手动调过 → 停在「自定义」。即使某次拖动恰好等于某个内置预设，
  // 也不应该跳回那个预设名 —— 用户要的是「我的」，不是「碰巧一样」
  manualMode.value = true
  updateSetting({ [`player.soundEffect.biquadFilter.hz${key}`]: value })
  // 银河链开着时，必须同时把 EQ 层切到「手动」。
  // 否则 EQ 层仍是「沿用 FX 预设自带曲线」，下一次银河同步（例如动一下强度）
  // 就会用预设曲线把用户刚拖的值覆盖掉 —— 表现为「拖了没反应、过一会儿又变回去」。
  markGalaxyEqCustom()
}

const handleReset = () => {
  const setting = {}
  for (const key of freqs) {
    setting[`player.soundEffect.biquadFilter.hz${key}`] = 0
  }
  updateSetting(setting)
}

// ============================================================
//  自定义曲线
//
//  手动调过的十段会单独留存一份，供宫格里的「自定义」回填。
//  没有这一层的话，用户调完再点一下别的预设，自己那条就永久丢了。
// ============================================================
const readCustomEq = () => {
  try {
    const raw = appSetting['player.soundEffect.biquadFilter.customEq']
    if (!raw) return null
    const list = JSON.parse(raw)
    if (!Array.isArray(list) || list.length !== freqs.length) return null
    return list.map(v => Number.isFinite(v) ? Math.round(v) : 0)
  } catch {
    // 设置文件是用户可编辑的，坏数据退化为「没有自定义」而不是让面板崩掉
    return null
  }
}

/** 把当前十段存为自定义曲线（在拖动结束时调用，避免拖动过程中反复写） */
const saveCustomEq = () => {
  const list = freqs.map(f => Math.round(appSetting[`player.soundEffect.biquadFilter.hz${f}`] ?? 0))
  updateSetting({ 'player.soundEffect.biquadFilter.customEq': JSON.stringify(list) })
}

/** 手动模式：决定宫格停在「自定义」还是某个内置预设上 */
const manualMode = ref(false)

const handleRecallCustom = async() => {
  const custom = readCustomEq()
  // 还没手动调过任何东西 —— 什么都不做。
  // （这一格以前被接的是 handleReset()，点一下就把 EQ 全清零，属于最伤的一种错）
  if (!custom) return
  manualMode.value = true
  await ensureDefaultDevice()
  const setting = {}
  freqs.forEach((f, i) => {
    setting[`player.soundEffect.biquadFilter.hz${f}`] = custom[i]
  })
  updateSetting(setting)
  // 同 handleUpdate：回填自定义曲线也要把银河 EQ 层切到「手动」，否则会被预设曲线覆盖
  markGalaxyEqCustom()
}

const handlePresetClick = (item) => {
  if (item.key === 'close') {
    manualMode.value = false
    handleReset()
    return
  }
  if (item.key === 'custom') {
    void handleRecallCustom()
    return
  }
  manualMode.value = false
  handleSetPreset(item.preset)
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
  if (manualMode.value) return 'custom'
  // 已保存的自定义曲线与当前值一致 → 停在「自定义」，不跳回碰巧相同的内置预设。
  // 这样关掉面板再打开，选中态也不会莫名变成某个预设名。
  const custom = readCustomEq()
  if (custom && freqs.every((f, i) => custom[i] === vals[i])) return 'custom'
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
  // 拖动结束才落盘「自定义曲线」，避免拖动过程中每一帧都写一次设置
  if (dragFreq.value) saveCustomEq()
  dragFreq.value = 0
}

// ===== 均衡器曲线 =====
/** 曲线用的十段增益（与滑杆同源，天然双向绑定） */
const gains = computed(() => freqs.map(f => appSetting[`player.soundEffect.biquadFilter.hz${f}`] ?? 0))

const handleCurveChange = (index, gain, ended) => {
  const key = freqs[index]
  if (key == null) return
  void handleUpdate(key, gain)
  // 松手才落盘自定义曲线，与滑杆拖动保持一致
  if (ended) saveCustomEq()
}

// ===== 增强效果滑条（高保真度/超重低音/混响强度/动态推进/环绕强度/声道平衡） =====
//
//  量程统一 0~100（声道平衡 -100~+100），与 audioEffects.ts 里的满量程常量一致 ——
//  UI 的 min/max 与引擎的 dB/增益换算**共用同一份定义**，避免两边各写一套再慢慢漂移。
const DEFAULT_REVERB = { source: 'matrix-reverb1.wav', mainGain: 10 }

const ensureReverbOn = () => {
  if (appSetting['player.soundEffect.convolution.fileName']) return
  updateSetting({
    'player.soundEffect.convolution.fileName': DEFAULT_REVERB.source,
    'player.soundEffect.convolution.mainGain': DEFAULT_REVERB.mainGain,
    // 尊重用户当前混响强度；为 0 时给一个可感知的默认值（新量程下 40% ≈ 湿声 0.8）
    'player.soundEffect.convolution.sendGain': appSetting['player.soundEffect.convolution.sendGain'] || 40,
  })
}

/**
 * 增强滑条的统一写入入口。
 *
 * 三件事必须一起做，缺一个就有可感知的 bug：
 *   1. `exitGalaxyForManualEnhance()` —— 银河链与增强链互斥。银河链挂着时它独占尾段，
 *      这些滑条会变成「能拖但没反应」；之前这个调用点在被删掉的死组件里，所以一直没生效。
 *   2. 音效与「自定义音频输出设备」冲突，需要把输出设备复位为默认。
 *   3. 写设置。
 */
const setEnhanceValue = (key, value) => {
  exitGalaxyForManualEnhance()
  void ensureDefaultDevice()
  updateSetting({ [`player.soundEffect.enhance.${key}`]: Math.round(value) })
}

const enhanceItems = computed(() => {
  return [
    {
      key: 'hifi',
      label: window.i18n.t('player__sound_effect_enhance_hifi'),
      tip: '提亮 10kHz 以上的空气感，让人声与乐器更通透（双击重置）',
      value: appSetting['player.soundEffect.enhance.hifi'],
      min: 0,
      max: ENHANCE_MAX,
      change: v => { setEnhanceValue('hifi', v) },
      reset: () => { setEnhanceValue('hifi', 0) },
    },
    {
      key: 'bass',
      label: window.i18n.t('player__sound_effect_enhance_bass'),
      tip: '增强 90Hz 以下低频力度，并生成谐波让耳机也听得出下潜（双击重置）',
      value: appSetting['player.soundEffect.enhance.bass'],
      min: 0,
      max: ENHANCE_MAX,
      change: v => { setEnhanceValue('bass', v) },
      reset: () => { setEnhanceValue('bass', 0) },
    },
    {
      key: 'reverb',
      label: window.i18n.t('player__sound_effect_enhance_reverb'),
      tip: '为声音添加空间混响（双击重置；拖动会自动启用默认混响）',
      value: appSetting['player.soundEffect.convolution.sendGain'],
      min: 0,
      max: ENHANCE_MAX,
      change: v => {
        const rounded = Math.round(v)
        exitGalaxyForManualEnhance()
        void ensureDefaultDevice()
        if (rounded === 0) {
          // 拖回 0 = 关闭混响（保留用户选择的采样文件，仅静音）
          updateSetting({ 'player.soundEffect.convolution.sendGain': 0 })
          return
        }
        ensureReverbOn()
        updateSetting({ 'player.soundEffect.convolution.sendGain': rounded })
      },
      reset: () => {
        exitGalaxyForManualEnhance()
        updateSetting({ 'player.soundEffect.convolution.sendGain': 0 })
      },
    },
    {
      key: 'dynamic',
      label: window.i18n.t('player__sound_effect_enhance_dynamic'),
      tip: '动态压缩让响度更饱满（双击重置）',
      value: appSetting['player.soundEffect.enhance.dynamic'],
      min: 0,
      max: ENHANCE_MAX,
      change: v => { setEnhanceValue('dynamic', v) },
      reset: () => { setEnhanceValue('dynamic', 0) },
    },
    {
      key: 'surround',
      label: window.i18n.t('player__sound_effect_enhance_surround'),
      tip: '3D 环绕：声音围绕头部旋转，0% 为关闭（双击重置）',
      value: appSetting['player.soundEffect.panner.soundR'],
      min: 0,
      max: ENHANCE_MAX,
      change: v => {
        const rounded = Math.round(v)
        exitGalaxyForManualEnhance()
        void ensureDefaultDevice()
        if (rounded <= 0) {
          // 0% = 真正关闭环绕（停掉 panner 旋转，释放 CPU）
          updateSetting({ 'player.soundEffect.panner.enable': false, 'player.soundEffect.panner.soundR': 0 })
          return
        }
        if (!appSetting['player.soundEffect.panner.enable']) updateSetting({ 'player.soundEffect.panner.enable': true })
        updateSetting({ 'player.soundEffect.panner.soundR': rounded })
      },
      reset: () => {
        exitGalaxyForManualEnhance()
        updateSetting({ 'player.soundEffect.panner.enable': false, 'player.soundEffect.panner.soundR': 0 })
      },
    },
    {
      key: 'balance',
      label: window.i18n.t('player__sound_effect_enhance_balance'),
      tip: '左右声道平衡，居中为标准立体声（双击重置）',
      value: appSetting['player.soundEffect.enhance.balance'],
      min: -ENHANCE_BALANCE_MAX,
      max: ENHANCE_BALANCE_MAX,
      change: v => { setEnhanceValue('balance', v) },
      reset: () => { setEnhanceValue('balance', 0) },
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

// ===== 均衡器曲线：与宫格同宽同左沿，让「预设 → 曲线 → 滑杆」在一条竖直线上 =====
.curveArea {
  width: 445px;
  margin: 14px 0 0 35px;
}

// ===== 十段竖向均衡器 =====
.eqArea {
  margin-top: 18px;
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
