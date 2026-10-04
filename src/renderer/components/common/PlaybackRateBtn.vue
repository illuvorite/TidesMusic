<template>
  <material-popup-btn :class="$style.btnContent">
    <button :class="[$style.btn, { [$style.active]: playbackRate != 1 }]" :aria-label="`${$t('player__playback_rate')}${playbackRate}x`" ignore-tip>
      <svg-icon name="speed" />
    </button>
    <template #content>
      <div :class="$style.setting">
        <div :class="$style.info">
          <span :class="$style.rateValue">{{ playbackRate.toFixed(2) }}x</span>
          <div :class="$style.control">
            <!-- 音调补偿：QQ 风格拨动开关（原来是 1em 的方形复选框，尺寸随字号漂移、观感很碎） -->
            <button
              type="button"
              role="switch"
              :class="[$style.switch, { [$style.switchOn]: appSetting['player.preservesPitch'] }]"
              :aria-checked="appSetting['player.preservesPitch']"
              :aria-label="$t('player__playback_preserves_pitch')"
              ignore-tip
             @click="updatePreservesPitch(!appSetting['player.preservesPitch'])"
>
              <span :class="$style.switchKnob" />
            </button>
            <span :class="$style.switchLabel" @click="updatePreservesPitch(!appSetting['player.preservesPitch'])">
              {{ $t('player__playback_preserves_pitch') }}
            </span>
            <button
              type="button" :class="$style.resetBtn" :disabled="playbackRate == 1"
              :aria-label="$t('player__playback_rate_reset_btn')" ignore-tip
             @click="handleUpdatePlaybackRate(100)"
>
              {{ $t('player__playback_rate_reset_btn') }}
            </button>
          </div>
        </div>
        <base-slider-bar :class="$style.slider" :value="playbackRate * 100" :min="50" :max="200" @change="handleUpdatePlaybackRate" />
      </div>
    </template>
  </material-popup-btn>
</template>

<script setup>
import { playbackRate } from '@renderer/store/player/playbackRate'
import { appSetting, updateSetting } from '@renderer/store/setting'

const handleUpdatePlaybackRate = (val) => {
  window.app_event.setPlaybackRate(Math.round(val) / 100)
}

const updatePreservesPitch = (enabled) => {
  updateSetting({ 'player.preservesPitch': enabled })
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq-icon.less';

.btnContent {
  flex: none;
  height: 100%;
}

// 统一图标按钮：三态一致（默认 72% → 悬停 100% + 加深 → 按下缩放 → 禁用 40% 不可点）
.btn {
  .qm-icon-btn-strong();

  position: relative;
  width: 32px;
  height: 32px;
  border-radius: var(--qm-radius-sm, 8px);

  &:hover:not(:disabled) { background-color: var(--qm-hover); }

  :global(.svg-icon) { width: var(--qm-icon); height: var(--qm-icon); }
}

.setting {
  display: flex;
  flex-flow: column nowrap;
  // 弹窗卡片不再统一加内边距（见 base/Popup.vue 的 .list），各弹窗自带
  padding: 10px;
  gap: var(--qm-sp-3, 8px);
  width: 268px;
}

.info {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
}

.rateValue {
  flex: none;
  font-size: var(--qm-fs-sm, 13px);
  font-weight: var(--qm-fw-medium, 500);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.control {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
}

/* 开关：36×20 胶囊 + 16px 圆钮；关闭为中性灰、开启为主色 */
.switch {
  flex: none;
  position: relative;
  width: 36px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: var(--qm-radius-chip, 999px);
  background-color: var(--qm-line-2);
  cursor: pointer;
  transition: background-color var(--qm-t-fast);
  box-sizing: border-box;

  &:focus-visible {
    outline: 2px solid var(--qm-primary);
    outline-offset: 2px;
  }
}

.switchOn {
  background-color: var(--qm-primary);
}

.switchKnob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .28);
  transition: transform var(--qm-t-fast);
}

.switchOn .switchKnob {
  transform: translateX(16px);
}

.switchLabel {
  flex: none;
  font-size: var(--qm-fs-xs, 12px);
  line-height: 1.3;
  cursor: pointer;
  white-space: nowrap;
}

.resetBtn {
  flex: none;
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--qm-radius-xs, 6px);
  background-color: var(--qm-primary-soft);
  color: var(--qm-primary);
  font-size: var(--qm-fs-xs, 12px);
  font-weight: var(--qm-fw-medium, 500);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast), transform var(--qm-t-fast);

  &:hover:not(:disabled) { background-color: var(--qm-primary-soft-hover); }
  &:active:not(:disabled) { transform: scale(.96); }
  &:disabled { opacity: .4; cursor: not-allowed; }
}

.slider {
  width: 100%;
}
</style>
