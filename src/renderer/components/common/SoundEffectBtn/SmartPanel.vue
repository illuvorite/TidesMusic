<template>
  <section :class="$style.wrap">
    <!-- ===== 标题行 ===== -->
    <div :class="$style.head">
      <svg :class="$style.icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9.6 2.8 11 7.2l4.4 1.4L11 10l-1.4 4.4L8.2 10 3.8 8.6 8.2 7.2Z" fill="currentColor" />
        <path d="M17.6 13.4l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9Z" fill="currentColor" />
      </svg>
      <b :class="$style.title">{{ $t('player__sound_effect_smart_title') }}</b>
      <span v-if="appliedOverlay" :class="$style.badge">{{ $t('player__sound_effect_smart_on') }}</span>
      <span v-if="appliedOverlay && measuredText" :class="$style.stamp">
        {{ $t('player__sound_effect_smart_measured') }} {{ measuredText }}
      </span>
    </div>

    <p :class="$style.desc">{{ $t('player__sound_effect_smart_desc') }}</p>

    <!-- ===== 操作行 ===== -->
    <div :class="$style.bar">
      <button
        type="button"
        :class="$style.scanBtn"
        :disabled="scanning"
        @click="handleScan"
      >
        <span
          v-if="scanning"
          :class="$style.spinner"
          aria-hidden="true"
        />
        {{ scanButtonText }}
      </button>

      <button
        v-if="canApply"
        type="button"
        :class="$style.applyBtn"
        @click="handleApply"
      >{{ $t('player__sound_effect_smart_apply') }}</button>

      <button
        v-else-if="appliedOverlay"
        type="button"
        :class="$style.clearBtn"
        @click="handleClear"
      >{{ $t('player__sound_effect_smart_clear') }}</button>
    </div>

    <!-- ===== 进度条 ===== -->
    <div v-if="scanning" :class="$style.progress" role="progressbar" :aria-valuenow="Math.round(progress * 100)" aria-valuemin="0" aria-valuemax="100">
      <div :class="$style.progressFill" :style="{ width: `${Math.round(progress * 100)}%` }" />
    </div>

    <p v-if="error" :class="$style.error">{{ error }}</p>

    <!-- ===== 结果 ===== -->
    <template v-if="displayOverlay">
      <div :class="$style.resultHead">
        <span>{{ $t('player__sound_effect_smart_result') }}</span>
        <!-- 未应用必须明说：否则用户会以为已经在听了 -->
        <span v-if="pendingOverlay" :class="$style.pendingTag">{{ $t('player__sound_effect_smart_pending') }}</span>
      </div>

      <ul :class="$style.reasons">
        <li v-for="(reason, index) in displayOverlay?.reasons" :key="index">{{ reason }}</li>
      </ul>

      <div v-if="chips.length" :class="$style.chips">
        <span v-for="chip in chips" :key="`${chip.label}${chip.value}`" :class="$style.chip">
          <b :class="$style.chipLabel">{{ chip.label }}</b>{{ chip.value }}
        </span>
      </div>

      <eq-curve
        readonly
        :values="previewGains"
        :ghost="baseGains"
        :hint="$t('player__sound_effect_smart_curve_hint')"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from '@common/utils/vueTools'
import { EQ_GAIN_MAX, EQ_GAIN_MIN, getAudioContext, getSmartAnalysers } from '@renderer/plugins/player'
import type { SmartMeasurement, SmartOverlay, SmartSuggestion } from '@renderer/plugins/player/galaxy'
import {
  isSmartOverlayEffective,
  overlayFromSuggestion,
  runSmartMeasurement,
  smartOverlayChips,
  suggestFromProfile,
} from '@renderer/plugins/player/galaxy'
import {
  applySmartSuggestion,
  clearSmartSuggestion,
  currentEqGainsForPreview,
  readSmartOverlay,
} from '@renderer/plugins/player/galaxy/bridge'
import EqCurve from './EqCurve.vue'

const scanning = ref(false)
const progress = ref(0)
const error = ref('')
/** 刚检测完、尚未应用的建议 */
const pendingSuggestion = ref<SmartSuggestion | null>(null)

let measurement: SmartMeasurement | null = null

const t = (key: string) => window.i18n.t(key)

// appSetting 是响应式对象，这里读它即可让面板跟随设置变化（不需要额外订阅）
const appliedOverlay = computed<SmartOverlay | null>(() => readSmartOverlay())

/** 待应用的建议 → 叠加层（时间戳传 0，避免把「尚未应用」显示成检测时间） */
const pendingOverlay = computed<SmartOverlay | null>(() =>
  pendingSuggestion.value ? overlayFromSuggestion(pendingSuggestion.value, 0) : null)

/** 面板展示的那一份：优先未应用的建议，其次是已生效的补偿 */
const displayOverlay = computed<SmartOverlay | null>(() => pendingOverlay.value ?? appliedOverlay.value)

const chips = computed(() => smartOverlayChips(displayOverlay.value))

/** 全零建议没有应用价值，按钮不该出现（否则「应用」了却什么都没变） */
const canApply = computed(() => isSmartOverlayEffective(pendingOverlay.value))

/** 当前听到的 EQ 曲线，作为对比参照 */
const baseGains = computed(() => currentEqGainsForPreview())

const previewGains = computed(() => {
  const overlay = displayOverlay.value
  const base = baseGains.value
  if (!overlay) return base
  return base.map((value, index) => Math.min(
    EQ_GAIN_MAX,
    Math.max(EQ_GAIN_MIN, value + (overlay.eq[index] ?? 0)),
  ))
})

const measuredText = computed(() => {
  const at = appliedOverlay.value?.measuredAt ?? 0
  if (!at) return ''
  const date = new Date(at)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
})

const scanButtonText = computed(() => {
  if (scanning.value) return `${t('player__sound_effect_smart_scanning')} ${Math.round(progress.value * 100)}%`
  return displayOverlay.value
    ? t('player__sound_effect_smart_rescan')
    : t('player__sound_effect_smart_scan')
})

const handleScan = () => {
  if (scanning.value) return

  const analysers = getSmartAnalysers()
  if (!analysers) {
    error.value = t('player__sound_effect_smart_need_playing')
    return
  }

  error.value = ''
  pendingSuggestion.value = null
  progress.value = 0
  scanning.value = true

  // 用局部引用而不是一直读模块变量：回调里会把 measurement 置空，
  // 继续通过模块变量访问会带上不必要的 null 判定
  const run = runSmartMeasurement(analysers, getAudioContext().sampleRate, {
    onProgress: (value: number) => { progress.value = value },
  })
  measurement = run

  void run.promise.then((profile) => {
    if (measurement === run) measurement = null
    scanning.value = false
    if (!profile) {
      error.value = t('player__sound_effect_smart_need_playing')
      return
    }
    pendingSuggestion.value = suggestFromProfile(profile)
  })
}

const handleApply = () => {
  if (!pendingSuggestion.value) return
  applySmartSuggestion(pendingSuggestion.value)
  pendingSuggestion.value = null
}

const handleClear = () => {
  clearSmartSuggestion()
  pendingSuggestion.value = null
}

onBeforeUnmount(() => {
  measurement?.cancel()
  measurement = null
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.wrap {
  min-width: 0;
  padding: 12px 14px 14px;
  margin-bottom: 16px;
  border: 1px solid var(--se-line, #ddd);
  border-radius: 6px;
  background-color: var(--se-field, #f8f8f8);
}

.head {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 6px;
}
.icon {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--se-accent, #1ecc94);
}
.title {
  flex: none;
  font-size: var(--se-fs-section, 14px);
  font-weight: 600;
  color: var(--se-text, #333);
}
.badge {
  flex: none;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: var(--se-fs-badge, 11px);
  line-height: 16px;
  color: #fff;
  background-color: var(--se-accent, #1ecc94);
}
.stamp {
  flex: none;
  font-size: var(--se-fs-badge, 11px);
  color: var(--se-text-weak, #666);
  font-variant-numeric: tabular-nums;
}

.desc {
  margin: 6px 0 10px;
  font-size: var(--se-fs-aux, 12px);
  line-height: 1.5;
  color: var(--se-text-weak, #666);
}

.bar {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 8px;
}
.scanBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 14px;
  border: 1px solid var(--se-line, #ddd);
  border-radius: 4px;
  background-color: #fff;
  color: var(--se-text, #333);
  font-size: var(--se-fs-body, 13px);
  cursor: pointer;
  transition: border-color var(--qm-t-fast, 150ms ease), color var(--qm-t-fast, 150ms ease);

  &:hover:not(:disabled) {
    border-color: var(--se-accent, #1ecc94);
    color: var(--se-accent, #1ecc94);
  }
  &:disabled {
    cursor: default;
    color: var(--se-text-weak, #666);
  }
}
.applyBtn {
  height: 30px;
  padding: 0 16px;
  border: none;
  border-radius: 4px;
  background-color: var(--se-accent, #1ecc94);
  color: #fff;
  font-size: var(--se-fs-body, 13px);
  cursor: pointer;
  transition: opacity var(--qm-t-fast, 150ms ease);

  &:hover { opacity: 0.88; }
}
.clearBtn {
  height: 30px;
  padding: 0 14px;
  border: 1px solid var(--se-line, #ddd);
  border-radius: 4px;
  background-color: transparent;
  color: var(--se-text-weak, #666);
  font-size: var(--se-fs-body, 13px);
  cursor: pointer;

  &:hover {
    color: #e74c3c;
    border-color: #e74c3c;
  }
}

// 旋转指示：宽高必须固定，否则文案长度变化会把按钮撑得一跳一跳
.spinner {
  flex: none;
  width: 12px;
  height: 12px;
  border: 2px solid var(--se-line, #ddd);
  border-top-color: var(--se-accent, #1ecc94);
  border-radius: 50%;
  animation: smart-spin 700ms linear infinite;
}
@keyframes smart-spin {
  to { transform: rotate(360deg); }
}

.progress {
  margin-top: 10px;
  height: 4px;
  border-radius: 2px;
  background-color: var(--se-line, #ddd);
  overflow: hidden;
}
.progressFill {
  height: 100%;
  background-color: var(--se-accent, #1ecc94);
  transition: width 120ms linear;
}

.error {
  margin: 10px 0 0;
  font-size: var(--se-fs-aux, 12px);
  line-height: 1.5;
  color: #e74c3c;
}

.resultHead {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 6px;
  margin: 14px 0 6px;
  font-size: var(--se-fs-body, 13px);
  font-weight: 600;
  color: var(--se-text, #333);
}
.pendingTag {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: var(--se-fs-badge, 11px);
  font-weight: 400;
  line-height: 15px;
  color: #b06a00;
  background-color: #fff3d6;
}

.reasons {
  margin: 0 0 8px;
  padding-left: 18px;
  font-size: var(--se-fs-aux, 12px);
  line-height: 1.65;
  color: var(--se-text, #333);

  li { list-style: disc; }
}

.chips {
  display: flex;
  flex-flow: row wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.chip {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 3px;
  background-color: #fff;
  border: 1px solid var(--se-line, #ddd);
  font-size: var(--se-fs-badge, 11px);
  color: var(--se-text, #333);
  font-variant-numeric: tabular-nums;
}
.chipLabel {
  font-weight: 400;
  color: var(--se-text-weak, #666);
}
</style>
