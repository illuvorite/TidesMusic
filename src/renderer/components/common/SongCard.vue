<template>
  <div
    :class="[$style.card, size === 'sm' && $style.sm]"
    :title="name"
    @click="$emit('click')"
    @contextmenu.prevent="$emit('contextmenu', $event)"
  >
    <div :class="$style.cover">
      <img v-if="img" :src="img" :alt="name" loading="lazy" @error="imgError = true">
      <div v-if="!img || imgError" :class="$style.placeholder">
        <svg-icon name="music" />
      </div>

      <span v-if="playCount" :class="$style.count">
        <svg-icon name="headphones" :class="$style.countIcon" />
        {{ playCount }}
      </span>

      <button
        type="button" :class="$style.play" :aria-label="$t('play')" ignore-tip
        @click.stop="$emit('play')"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
        </svg>
      </button>
    </div>

    <div :class="$style.body">
      <div :class="[$style.title, clamp && $style.clamp]">{{ name }}</div>
      <div v-if="meta" :class="$style.meta">{{ meta }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from '@common/utils/vueTools'

const props = defineProps({
  // 封面
  img: { type: String, default: '' },
  // 标题
  name: { type: String, default: '' },
  // 副标题（歌手 / 推荐理由）
  meta: { type: String, default: '' },
  // 播放量文案，如 2454.4万
  playCount: { type: String, default: '' },
  // 标题是否两行截断
  clamp: { type: Boolean, default: true },
  // 尺寸
  size: { type: String, default: '' },
})

defineEmits(['click', 'play', 'contextmenu'])

const imgError = ref(false)
watch(() => props.img, () => { imgError.value = false })
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq.less';

.card {
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  cursor: pointer;
  user-select: none;

  &:hover {
    .cover {
      box-shadow: var(--qm-shadow-2);
      img { transform: scale(1.04); }
    }
    .play { opacity: 1; transform: translateY(0) scale(1); }
    .count { opacity: 0; }
    .title { color: var(--qm-primary); }
  }
  &:active { opacity: 0.92; }
}

.cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--qm-radius-cover);
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.04);
  box-shadow: var(--qm-shadow-1);
  transition: box-shadow var(--qm-t-base);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform var(--qm-t-slow);
  }
}

.placeholder {
  .qm-cover-placeholder();
  :global(.svg-icon) { width: var(--qm-icon-lg); height: var(--qm-icon-lg); fill: currentColor; }
}

.count {
  position: absolute;
  right: 7px;
  bottom: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--qm-text-invert);
  font-size: var(--qm-fs-xs, 12px);
  font-weight: var(--qm-fw-semibold, 600);
  letter-spacing: 0.2px;
  font-variant-numeric: tabular-nums;
  text-shadow: var(--qm-shadow-text);
  transition: opacity var(--qm-t-fast);
  pointer-events: none;
}

.countIcon {
  width: 12px;
  height: 12px;
  fill: currentColor;
}

.play {
  position: absolute;
  right: 7px;
  bottom: 6px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background-color: var(--qm-primary);
  color: var(--qm-text-invert);
  cursor: pointer;
  opacity: 0;
  transform: translateY(4px) scale(0.9);
  transition: opacity var(--qm-t-base), transform var(--qm-t-base), background-color var(--qm-t-fast);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.24);

  &:hover { background-color: var(--qm-primary-hover); }
  &:active { transform: scale(0.94); }
  svg { display: block; margin-left: 1px; }
}

.body {
  margin-top: var(--qm-sp-3, 8px);
  min-width: 0;
}

.title {
  font-size: var(--qm-fs-sm, 13px);
  line-height: 19px;
  color: var(--qm-text-2);
  transition: color var(--qm-t-fast);
  .mixin-ellipsis-1();
}

.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
  overflow: hidden;
  text-overflow: initial;
  min-height: 38px;
}

.meta {
  margin-top: var(--qm-sp-0, 2px);
  font-size: var(--qm-fs-xs, 12px);
  line-height: 17px;
  color: var(--qm-text-4);
  .mixin-ellipsis-1();
}

.sm {
  .title { font-size: var(--qm-fs-xs, 12px); line-height: 17px; }
  .meta { font-size: var(--qm-fs-2xs, 11px); line-height: 16px; }
}
</style>
