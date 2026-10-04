<template>
  <!--
    QQ 音乐音量弹层（向上弹出，竖向）
    结构：顶部绿色圆钮(+) → 竖向音量条 → 百分比 → 分隔线 → 喇叭(静音开关)
    取值依据：参考图实测（卡片 100×232 / 圆钮 22 / 轨道 3px / 圆点 12）
  -->
  <div :class="$style.panel">
    <button
      :class="$style.plus"
      :aria-label="volumePercent >= 100 ? '降低音量' : '提高音量'" ignore-tip
      @click.stop="volumePercent >= 100 ? stepVolume(-2) : stepVolume(2)"
    >
      <svg-icon name="plus" />
    </button>
    <div
      ref="dom_volumeSlider"
      :class="$style.sliderWrap"
      @wheel.stop="handleVolumeWheel"
      @pointerdown.stop.prevent="handleVolumePointerDown"
    >
      <!-- 竖向音量条：轨道全高，填充自下而上，滑块圆点跟随 -->
      <div :class="$style.track">
        <div :class="$style.fill" :style="{ height: `${volumePercent}%` }" />
        <div :class="$style.thumb" :style="{ bottom: `calc(${volumePercent}% - 5px)` }" />
      </div>
    </div>
    <div :class="$style.text">{{ isMute ? '已静音' : `${volumePercent}%` }}</div>
    <div :class="$style.divider" />
    <button
      :class="$style.muteBtn"
      :aria-label="isMute ? $t('player__volume_mute') : $t('player__volume_mute_label')"
      ignore-tip
     @click.stop="toggleMute"
>
      <svg-icon :name="volumeIcon" />
    </button>
  </div>
</template>

<script setup>
import useVolumeControl from '@renderer/utils/compositions/useVolumeControl'

const {
  dom_volumeSlider,
  isMute,
  volumeIcon,
  volumePercent,
  toggleMute,
  stepVolume,
  handleVolumeWheel,
  handleVolumePointerDown,
} = useVolumeControl()
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq-icon.less';

.panel {
  box-sizing: border-box;
  // 参考图是 100 宽，两次收档后：卡片 66 宽 / 高度约 157
  width: 66px;
  padding: 6px 0 2px;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  font-size: var(--qm-fs-xs, 12px);
  user-select: none;
}

// 顶部绿色圆钮：满音量时点击降档，否则升档（每次 10%）
.plus {
  flex: none;
  width: 20px;
  height: 20px;
  margin-bottom: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background-color: var(--qm-primary);
  color: #fff;
  cursor: pointer;
  transition: transform @transition-fast, opacity @transition-fast;
  &:hover { opacity: 0.86; }
  &:active { transform: scale(0.94); }
  &:focus-visible { outline: 2px solid var(--qm-primary); outline-offset: 2px; }
  :global(.svg-icon) { width: var(--qm-icon-xs); height: var(--qm-icon-xs); opacity: 1; }
}

.sliderWrap {
  flex: none;
  width: 100%;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: none;
}

.track {
  position: relative;
  width: 3px;
  height: 100%;
  border-radius: var(--qm-radius-chip, 999px);
  background-color: var(--qm-line-2);
  transition: width @transition-fast;
}

.sliderWrap:hover .track { width: 5px; }

.fill {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  border-radius: var(--qm-radius-chip, 999px);
  background-color: var(--qm-primary);
}

.thumb {
  position: absolute;
  left: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translateX(-50%);
  background-color: var(--qm-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}

.text {
  flex: none;
  margin-top: 6px;
  font-variant-numeric: tabular-nums;
  font-size: var(--qm-fs-2xs, 11px);
  line-height: 14px;
  color: inherit;
}

.divider {
  flex: none;
  width: 28px;
  height: 1px;
  margin: 6px 0;
  background-color: var(--qm-line-2);
}

.muteBtn {
  .qm-icon-btn();

  flex: none;
  width: 24px;
  height: 20px;
  border-radius: var(--qm-radius-xs, 6px);
  &:hover:not(:disabled) { background-color: var(--qm-hover); }
  :global(.svg-icon) { width: var(--qm-icon-sm); height: var(--qm-icon-sm); }
}
</style>
