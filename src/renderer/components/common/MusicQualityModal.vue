<template>
  <div v-if="musicQualityModalInfo.visible && current" :class="$style.mask" @click="handleClose">
    <div :class="$style.panel" @click.stop>
      <div :class="$style.header">
        <h3 :class="$style.title">{{ $t('player__quality_override_title', { name: currentName }) }}</h3>
        <button type="button" :class="$style.close" :aria-label="$t('close')" @click="handleClose">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div :class="$style.body">
        <button
          v-for="opt in options" :key="opt.value ?? '__global__'"
          type="button"
          :class="[$style.option, { [$style.optionActive]: opt.value === currentOverride }]"
          @click="handleSelect(opt.value)"
        >
          <span :class="$style.optionLabel">{{ opt.label }}</span>
          <svg v-if="opt.value === currentOverride" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <p :class="$style.tip">{{ $t('player__quality_override_tip') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount } from '@common/utils/vueTools'
import { musicQualityModalInfo, hideMusicQualityModal } from '@renderer/store/qualityOverrideModal'
import { musicQualityOverrides, setMusicQualityOverride } from '@renderer/store/qualityOverride'
import { registerModalCloser } from '@renderer/utils/modalStack'

const current = computed(() => musicQualityModalInfo.musicInfo)

const currentName = computed(() => {
  const info = current.value as { name?: string } | null
  return info?.name ?? ''
})

/** 当前生效的覆盖值（无则跟随全局） */
const currentOverride = computed(() => {
  const info = current.value
  return info ? (musicQualityOverrides[info.id] ?? null) : null
})

/**
 * 可选音质：只列出这首歌实际提供的档位（_qualitys），
 * 避免选一个源不支持的档位导致播放失败。
 */
const options = computed(() => {
  const info = current.value as { name?: string, meta?: { _qualitys?: Record<string, boolean> } } | null
  const qualitys = info?.meta?._qualitys ?? {}
  const list: Array<{ value: LX.Quality | null, label: string }> = [
    { value: null, label: window.i18n.t('player__quality_override_global') },
  ]
  const order: LX.Quality[] = ['flac24bit', 'flac', '320k', '128k']
  for (const q of order) {
    if (!qualitys[q]) continue
    list.push({ value: q, label: window.i18n.t(`player__quality_${q}`) })
  }
  return list
})

const handleClose = () => {
  hideMusicQualityModal()
}

const handleSelect = (quality: LX.Quality | null) => {
  const info = current.value
  if (!info) return
  setMusicQualityOverride(info.id, quality)
  handleClose()
}

// Esc 关闭，走统一弹层栈
const off = registerModalCloser(() => {
  if (!musicQualityModalInfo.visible) return false
  handleClose()
  return true
})
onBeforeUnmount(off)
</script>

<style lang="less" module>
.mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, .45);
}

.panel {
  width: 380px;
  max-width: calc(100vw - 80px);
  display: flex;
  flex-direction: column;
  background-color: var(--qm-surface, #fff);
  border-radius: var(--qm-radius-card, 12px);
  box-shadow: var(--qm-shadow-3, 0 12px 32px rgba(0, 0, 0, .18));
  overflow: hidden;
}

.header {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  padding: 14px 12px 12px 18px;
  border-bottom: 1px solid var(--qm-line-1);
}

.title {
  flex: auto;
  min-width: 0;
  margin: 0;
  font-size: var(--qm-fs-lg, 16px);
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close {
  flex: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: none;
  color: var(--qm-text-3);

  &:hover {
    background-color: var(--qm-hover);
    color: var(--qm-text-1);
  }
}

.body {
  flex: auto;
  min-height: 0;
  padding: 12px 14px 14px;
}

.option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--qm-radius-xs, 6px);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color var(--qm-t-fast);

  &:hover { background-color: var(--qm-hover); }
}

.optionActive {
  color: var(--qm-primary);
  background-color: var(--qm-primary-soft);

  &:hover { background-color: var(--qm-primary-soft); }
}

.optionLabel {
  flex: auto;
  min-width: 0;
  font-size: var(--qm-fs-sm, 13px);
}

.tip {
  margin: 10px 2px 0;
  font-size: var(--qm-fs-xs, 12px);
  line-height: 1.6;
  color: var(--qm-text-5);
}
</style>
