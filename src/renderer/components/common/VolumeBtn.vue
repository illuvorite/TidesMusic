<template>
  <material-popup-btn ref="popupRef" :class="$style.btnContent">
    <button
      :class="$style.btn"
      :aria-label="isMute ? $t('player__volume_muted') : `${$t('player__volume')}${volumePercent}%`"
      ignore-tip
     @wheel="handleWheel"
>
      <svg-icon :name="volumeIcon" />
    </button>
    <template #content>
      <!-- 向上弹出的竖版音量条：与主播放栏共用同一实现 -->
      <div @click.stop @contextmenu.stop>
        <common-volume-popup />
      </div>
    </template>
  </material-popup-btn>
</template>

<script setup>
import { ref } from '@common/utils/vueTools'
import useVolumeControl from '@renderer/utils/compositions/useVolumeControl'

const popupRef = ref(null)

const {
  isMute,
  volume,
  volumeIcon,
  volumePercent,
} = useVolumeControl()

const handleWheel = (event) => {
  window.app_event.setVolume(Math.round(volume.value * 100 + (-event.deltaY / 100 * 2)) / 100)
}

defineExpose({
  hide() { popupRef.value?.hide() },
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq-icon.less';

.btnContent {
  flex: none;
  height: 100%;
}

// 统一图标按钮：三态一致（默认 72% → 悬停 100% + 加深 → 按下缩放 → 禁用 40% 不可点）
// 尺寸由使用方通过 --qm-volume-size 控制（播放栏 32 / 详情页底栏 20）
.btn {
  .qm-icon-btn-strong();

  position: relative;
  width: var(--qm-volume-size, 32px);
  height: var(--qm-volume-size, 32px);
  border-radius: var(--qm-radius-sm, 8px);

  &:hover:not(:disabled) { background-color: var(--qm-hover); }

  // 图标尺寸单独用变量下传：组件内的规则与使用方的覆盖规则
  // 特异性相同，胜负由 CSS Module 注入顺序决定（换文件顺序就回退）
  :global(.svg-icon) { width: var(--qm-volume-btn-icon, var(--qm-icon)); height: var(--qm-volume-btn-icon, var(--qm-icon)); }
}
</style>
