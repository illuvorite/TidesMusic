<template>
  <div :class="$style.wrap">
    <!-- 读数条：固定高度，避免出现/消失时布局跳动 -->
    <div :class="$style.readout">
      <template v-if="activeNode">
        <b :class="$style.readoutFreq">{{ activeNode.freqText }}</b>
        <span :class="$style.readoutGain">{{ activeNode.gainText }}</span>
      </template>
      <span v-else-if="hint" :class="$style.readoutHint">{{ hint }}</span>
      <span v-else-if="!isReadonly" :class="$style.readoutHint">拖动控制点，或使用下方滑杆</span>
    </div>

    <svg
      ref="svgRef"
      :class="$style.svg"
      :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
      role="group"
      :aria-label="ariaLabel"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--se-accent)" stop-opacity="0.20" />
          <stop offset="100%" stop-color="var(--se-accent)" stop-opacity="0.01" />
        </linearGradient>
      </defs>

      <!-- dB 网格 + 频率网格 -->
      <g :class="$style.grid">
        <line
          v-for="line in dbLines"
          :key="`db${line.db}`"
          :x1="PLOT_X0"
          :x2="PLOT_X1"
          :y1="line.y"
          :y2="line.y"
        />
        <line
          v-for="tick in freqTicks"
          :key="`f${tick.freq}`"
          :x1="tick.x"
          :x2="tick.x"
          :y1="PLOT_Y0"
          :y2="PLOT_Y1"
        />
      </g>

      <!-- 0dB 基准线：EQ 的「不改变」参考，必须比普通网格明显 -->
      <line :class="$style.zeroLine" :x1="PLOT_X0" :x2="PLOT_X1" :y1="zeroY" :y2="zeroY" />

      <!-- 坐标轴文字 -->
      <text
        v-for="line in dbLines"
        :key="`dbl${line.db}`"
        :class="$style.axisText"
        :x="PLOT_X0 - 5"
        :y="line.y"
        text-anchor="end"
        dominant-baseline="central"
      >{{ line.db > 0 ? `+${line.db}` : line.db }}</text>
      <text
        v-for="tick in freqTicks"
        :key="`fl${tick.freq}`"
        :class="$style.axisText"
        :x="tick.x"
        :y="PLOT_Y1 + 11"
        text-anchor="middle"
      >{{ tick.label }}</text>

      <!-- 对比曲线：当前生效的曲线（虚线、弱化）——只看建议曲线看不出「差多少」 -->
      <path v-if="ghostPath" :class="$style.ghostCurve" :d="ghostPath" />

      <!-- 曲线填充 + 曲线本体 -->
      <path :class="$style.fill" :d="fillPath" :fill="`url(#${gradientId})`" />
      <path :class="$style.curve" :d="curvePath" />

      <!-- 频段控制点（拖动改增益；纵向限定，频点固定为 ISO 倍频程） -->
      <g
        v-for="(node, i) in nodes"
        :key="node.frequency"
        :class="[$style.nodeGroup, { [$style.nodeGroupReadonly]: isReadonly }]"
        :role="isReadonly ? 'img' : 'slider'"
        :tabindex="isReadonly ? -1 : 0"
        :aria-label="nodeLabel(node)"
        :aria-valuenow="isReadonly ? undefined : node.gain"
        :aria-valuemin="isReadonly ? undefined : EQ_GAIN_MIN"
        :aria-valuemax="isReadonly ? undefined : EQ_GAIN_MAX"
        :aria-valuetext="isReadonly ? undefined : `${node.gain > 0 ? '+' : ''}${node.gain} dB`"
        @pointerdown.prevent.stop="handlePointerDown(i, $event)"
        @keydown="handleKeydown(i, $event)"
        @focus="activeIndex = i"
        @blur="activeIndex = -1"
      >
        <circle v-if="!isReadonly" :class="$style.nodeHit" :cx="node.x" :cy="node.y" r="11" />
        <circle
          :class="[
            $style.node,
            { [$style.nodeActive]: !isReadonly && (activeIndex === i || draggingIndex === i),
              [$style.nodeZero]: Math.abs(node.gain) < 0.001,
              [$style.nodeReadonly]: isReadonly },
          ]"
          :cx="node.x"
          :cy="node.y"
          :r="isReadonly ? 3 : 4.5"
        />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from '@common/utils/vueTools'
import { EQ_GAIN_MIN, EQ_GAIN_MAX } from '@renderer/plugins/player'
import { EQ_FREQUENCIES, eqResponseCurve, toEqBands } from '@renderer/plugins/player/galaxy'

/**
 * ⚠️ 用普通 `defineProps` 而不是 `withDefaults`，且 `ghost` 的类型**不能带 `| null`**：
 * 编译器的运行时 prop 生成器会把联合类型摊成 `type: [Array, null]`，
 * 而 `null` 不是合法的 PropConstructor，会直接编译失败（TS2769）。
 * 「没有对比曲线」用**不传**（undefined）表达即可。
 */
const props = defineProps<{
  /** 10 段增益（dB），顺序 31/62/125/250/500/1k/2k/4k/8k/16k */
  values: number[]
  /** 只读：不响应拖动与键盘，用于「检测结果预览」这类不能直接改设置的场合 */
  readonly?: boolean
  /** 对比曲线（10 段增益），用于「当前 vs 建议」；不传则不画 */
  ghost?: number[]
  /** 只读时读数条的提示文案 */
  hint?: string
}>()

// prop 是可选的，这里收敛成确定的 boolean，避免模板里到处写 undefined 判断
const isReadonly = computed(() => props.readonly ?? false)

const emit = defineEmits<{
  change: [index: number, gain: number, ended: boolean]
}>()

// ============================================================
//  画布几何（viewBox 固定，实际渲染宽度由 CSS 决定，指针换算时按比例缩放）
// ============================================================
const VIEW_W = 520
const VIEW_H = 152
const PLOT_X0 = 34
const PLOT_X1 = 510
const PLOT_Y0 = 12
const PLOT_Y1 = 132
const PLOT_W = PLOT_X1 - PLOT_X0
const PLOT_H = PLOT_Y1 - PLOT_Y0

const F_MIN = 20
const F_MAX = 20000
/** 纵轴范围比 ±12dB 略宽，避免 ±12 的控制点贴在边框上 */
const DB_MAX = 15
const DB_MIN = -15

/** 拖动时吸附到 0dB 的阈值（与 dsssp 的 gainSnapDb 一致） */
const GAIN_SNAP_DB = 0.05

const LOG_MIN = Math.log10(F_MIN)
const LOG_MAX = Math.log10(F_MAX)

const freqToX = (freq: number): number =>
  PLOT_X0 + ((Math.log10(freq) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * PLOT_W
const dbToY = (db: number): number =>
  PLOT_Y0 + ((DB_MAX - db) / (DB_MAX - DB_MIN)) * PLOT_H
const yToDb = (y: number): number =>
  DB_MAX - ((y - PLOT_Y0) / PLOT_H) * (DB_MAX - DB_MIN)

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

// ============================================================
//  网格
// ============================================================
const dbLines = [-12, -6, 0, 6, 12].map(db => ({ db, y: dbToY(db) }))
const zeroY = dbToY(0)

const FREQ_TICKS: Array<{ freq: number, label: string }> = [
  { freq: 20, label: '20' },
  { freq: 50, label: '50' },
  { freq: 100, label: '100' },
  { freq: 200, label: '200' },
  { freq: 500, label: '500' },
  { freq: 1000, label: '1k' },
  { freq: 2000, label: '2k' },
  { freq: 5000, label: '5k' },
  { freq: 10000, label: '10k' },
  { freq: 20000, label: '20k' },
]
const freqTicks = FREQ_TICKS.map(t => ({ ...t, x: freqToX(t.freq) }))

// ============================================================
//  曲线
//
//  采样点数按 2px/点 取（对齐 dsssp 的 resolutionFactor 思路：采样密度绑定像素宽度，
//  比像素更密没有意义）。10 段 × 240 点 ≈ 2400 次双二阶求值，单帧 <1ms。
// ============================================================
const CURVE_POINTS = Math.round(PLOT_W / 2)

const bands = computed(() => toEqBands(props.values))

const curvePoints = computed(() => eqResponseCurve(bands.value, {
  points: CURVE_POINTS,
  minFrequency: F_MIN,
  maxFrequency: F_MAX,
}))

const toSvgPoints = (pts: Array<{ frequency: number, gain: number }>) =>
  pts.map(p => ({ x: freqToX(p.frequency), y: dbToY(clamp(p.gain, DB_MIN, DB_MAX)) }))

const curvePath = computed(() => {
  const pts = toSvgPoints(curvePoints.value)
  if (pts.length < 2) return ''
  // 两端各向外延伸一个视宽，让曲线看起来是从边缘穿过去的（dsssp 的 offscreenPx 思路）
  const first = pts[0]
  const last = pts[pts.length - 1]
  let d = `M ${-VIEW_W} ${first.y}`
  for (const p of pts) d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  d += ` L ${VIEW_W * 2} ${last.y}`
  return d
})

const fillPath = computed(() => {
  const pts = toSvgPoints(curvePoints.value)
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(2)} ${zeroY}`
  for (const p of pts) d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  d += ` L ${pts[pts.length - 1].x.toFixed(2)} ${zeroY} Z`
  return d
})

/**
 * 对比曲线（当前生效的曲线）。画在建议曲线之下，
 * 让「智能补偿改了多少」一眼可见 —— 只给建议曲线等于让用户盲选。
 */
const ghostPath = computed(() => {
  const gains = props.ghost
  // 不传 ghost（undefined）或传空数组都视为「不画对比曲线」
  if (!gains || gains.length === 0) return ''
  const pts = toSvgPoints(eqResponseCurve(toEqBands(gains), {
    points: CURVE_POINTS,
    minFrequency: F_MIN,
    maxFrequency: F_MAX,
  }))
  if (pts.length < 2) return ''
  let d = `M ${-VIEW_W} ${pts[0].y}`
  for (const p of pts) d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  d += ` L ${VIEW_W * 2} ${pts[pts.length - 1].y}`
  return d
})

// ============================================================
//  控制点
// ============================================================
const gainAt = (index: number): number => {
  const v = props.values[index]
  if (!Number.isFinite(v)) return 0
  return clamp(v, EQ_GAIN_MIN, EQ_GAIN_MAX)
}

const nodes = computed(() => EQ_FREQUENCIES.map((frequency, index) => ({
  frequency,
  index,
  gain: gainAt(index),
  x: freqToX(frequency),
  y: dbToY(gainAt(index)),
})))

const nodeLabel = (node: { frequency: number, gain: number }): string => {
  const freqText = node.frequency >= 1000 ? `${node.frequency / 1000} kHz` : `${node.frequency} Hz`
  return `${freqText} 频段，当前 ${node.gain > 0 ? '+' : ''}${node.gain} dB`
}

// ============================================================
//  指针交互
// ============================================================
const activeIndex = ref(-1)
const draggingIndex = ref(-1)
const svgRef = ref<SVGSVGElement | null>(null)
let pointerId = -1

/** 当前聚焦/拖动的频段，用于顶部读数条 */
const activeNode = computed(() => {
  const index = draggingIndex.value >= 0 ? draggingIndex.value : activeIndex.value
  if (index < 0) return null
  const node = nodes.value[index]
  if (!node) return null
  return {
    freqText: node.frequency >= 1000 ? `${node.frequency / 1000} kHz` : `${node.frequency} Hz`,
    gainText: `${node.gain > 0 ? '+' : ''}${node.gain.toFixed(1)} dB`,
  }
})

/** 把客户区纵坐标换算成 viewBox 内的 dB（渲染尺寸可变，必须按 rect 比例缩放） */
const clientYToDb = (clientY: number): number => {
  const rect = svgRef.value?.getBoundingClientRect()
  if (!rect || rect.height <= 0) return 0
  const y = ((clientY - rect.top) / rect.height) * VIEW_H
  return yToDb(y)
}

const commit = (index: number, gain: number, ended: boolean) => {
  const snapped = Math.abs(gain) < GAIN_SNAP_DB ? 0 : Math.round(gain * 10) / 10
  emit('change', index, clamp(snapped, EQ_GAIN_MIN, EQ_GAIN_MAX), ended)
}

const handlePointerMove = (event: PointerEvent) => {
  if (draggingIndex.value < 0) return
  event.preventDefault()
  commit(draggingIndex.value, clientYToDb(event.clientY), false)
}

const handlePointerUp = (event: PointerEvent) => {
  if (draggingIndex.value < 0) return
  commit(draggingIndex.value, clientYToDb(event.clientY), true)
  draggingIndex.value = -1
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
  if (pointerId >= 0 && svgRef.value?.hasPointerCapture(pointerId)) svgRef.value.releasePointerCapture(pointerId)
  pointerId = -1
}

const handlePointerDown = (index: number, event: PointerEvent) => {
  if (isReadonly.value) return
  draggingIndex.value = index
  activeIndex.value = index
  pointerId = event.pointerId
  window.addEventListener('pointermove', handlePointerMove, { passive: false })
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('pointercancel', handlePointerUp)
}

// ============================================================
//  键盘可达性：把每个控制点做成真正的 slider
//  方向键 ±0.5dB，Shift 加速到 ±2dB，Home/End 跳到极值
// ============================================================
const handleKeydown = (index: number, event: KeyboardEvent) => {
  if (isReadonly.value) return
  const step = event.shiftKey ? 2 : 0.5
  const current = gainAt(index)
  let next: number | null = null

  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowRight': next = current + step; break
    case 'ArrowDown':
    case 'ArrowLeft': next = current - step; break
    case 'Home': next = EQ_GAIN_MIN; break
    case 'End': next = EQ_GAIN_MAX; break
    case '0': next = 0; break
    default: return
  }

  event.preventDefault()
  commit(index, next, true)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('pointercancel', handlePointerUp)
})

// 每个实例一个唯一渐变 id，避免多个曲线互相串色（必须在模板使用它之前初始化）
let gradientSeq = 0
const gradientId = `eq-curve-gradient-${++gradientSeq}-${Math.random().toString(36).slice(2, 7)}`

const ariaLabel = computed(() => {
  const active = props.values.map((v: number, i: number) => `${EQ_FREQUENCIES[i]}Hz ${v > 0 ? '+' : ''}${v}dB`).join('，')
  return isReadonly.value
    ? `均衡器频率响应曲线（只读预览）。当前曲线：${active}`
    : `均衡器频率响应曲线，可拖动控制点调整各频段增益。当前设置：${active}`
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.wrap {
  width: 100%;
  min-width: 0;
}

.readout {
  display: flex;
  align-items: baseline;
  gap: 6px;
  height: 16px;
  font-size: 11px;
  line-height: 16px;
}
.readoutFreq {
  font-weight: 500;
  color: var(--se-text, #333);
}
.readoutGain {
  color: var(--se-accent, #1ecc94);
  font-variant-numeric: tabular-nums;
}
.readoutHint {
  color: var(--se-text-weak, #666);
}

.svg {
  display: block;
  width: 100%;
  height: auto;
  // 整块 SVG 不吞事件，只有控制点单独开启（dsssp 的 pointer-events 隔离思路）
  pointer-events: none;
  user-select: none;
}

.grid {
  line {
    stroke: var(--se-line, #ddd);
    stroke-width: 0.5;
    opacity: 0.7;
  }
}

// 0dB 基准线：EQ 的「无改变」参考，必须比普通网格醒目
.zeroLine {
  stroke: var(--se-track, #acacac);
  stroke-width: 1;
  opacity: 0.85;
}

.axisText {
  font-size: 9px;
  fill: var(--se-text-weak, #666);
  font-variant-numeric: tabular-nums;
}

.curve {
  fill: none;
  stroke: var(--se-accent, #1ecc94);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

// 对比曲线：当前生效的那条。虚线 + 弱化色，明确是「参照物」而不是主角
.ghostCurve {
  fill: none;
  stroke: var(--se-track, #acacac);
  stroke-width: 1.4;
  stroke-dasharray: 4 3;
  stroke-linejoin: round;
  stroke-linecap: round;
  opacity: 0.9;
}

.fill {
  stroke: none;
}

.nodeGroup {
  pointer-events: auto;
  cursor: ns-resize;
  outline: none;

  &:focus-visible {
    .node {
      stroke-width: 3;
    }
  }
}

.nodeHit {
  fill: transparent;
}

.node {
  fill: #fff;
  stroke: var(--se-accent, #1ecc94);
  stroke-width: 2;
  transition: r 120ms ease, stroke-width 120ms ease;

  &.nodeActive {
    r: 6;
    stroke-width: 2.5;
  }
  // 0dB 时用中性灰，明确表示「这一段没有改变」
  &.nodeZero {
    stroke: var(--se-track, #acacac);
  }
  // 只读预览：实心、更小，一眼看出「这不是可拖的控件」
  &.nodeReadonly {
    fill: var(--se-accent, #1ecc94);
    stroke: var(--se-bg, #fff);
    stroke-width: 1.2;
  }
  &.nodeReadonly.nodeZero {
    fill: var(--se-track, #acacac);
  }
}

// 只读时不要显示「可拖」的光标语义
.nodeGroupReadonly {
  cursor: default;
}
</style>
