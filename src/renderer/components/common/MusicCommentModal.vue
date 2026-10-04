<template>
  <div v-if="commentModalInfo.visible" :class="$style.mask" @click="handleClose">
    <div :class="$style.panel" @click.stop>
      <div :class="$style.header">
        <h3 :class="$style.title">
          {{ $t('comment__title', { name: musicName }) }}
        </h3>
        <button type="button" :class="$style.close" :aria-label="$t('close')" @click="handleClose">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div :class="$style.body">
        <music-comment
          :show="true"
          :music-info="commentModalInfo.musicInfo"
          @close="handleClose"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from '@common/utils/vueTools'
import { commentModalInfo, hideMusicComment } from '@renderer/store/player/commentModal'
import MusicComment from '@renderer/components/layout/PlayDetail/components/MusicComment/index.vue'

const musicName = computed(() => {
  const info: any = commentModalInfo.musicInfo
  if (!info) return ''
  return 'progress' in info ? (info.metadata?.musicInfo?.name ?? info.name ?? '') : (info.name ?? '')
})

const handleClose = () => {
  hideMusicComment()
}
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
  width: 640px;
  max-width: calc(100vw - 80px);
  height: 66vh;
  min-height: 360px;
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
  font-size: var(--qm-fs-lg, 16px);
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1, #222);
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
  color: var(--qm-text-3, #666);
  &:hover {
    background-color: var(--qm-hover, rgba(0, 0, 0, .05));
    color: var(--qm-text-1, #222);
  }
}
.body {
  flex: auto;
  min-height: 0;
  padding: 10px 14px 14px;
  // 面板内部自带滚动与分页，外层不再滚动
  overflow: hidden;
  :global(.comment) {
    width: 100% !important;
    height: 100%;
  }
}
</style>
