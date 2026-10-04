<template>
  <button :class="$style.btn" :aria-label="$t('player__sound_effect')" @click="visible = true">
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" width="90%" viewBox="0 0 24 24" space="preserve">
      <use xlink:href="#icon-tune-variant" />
    </svg>
  </button>
  <material-modal :show="visible" bg-close="bg-close" :teleport="teleport" @close="visible = false">
    <div :class="$style.panel">
      <!-- 顶部：标题 + 总开关 + 当前音效名 -->
      <header :class="$style.header">
        <div :class="$style.headerLeft">
          <svg :class="$style.headerIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" space="preserve">
            <use xlink:href="#icon-tune-variant" />
          </svg>
          <h2 :class="$style.headerTitle">{{ $t('player__sound_effect_title') }}</h2>
        </div>
        <div :class="$style.headerRight">
          <span :class="[$style.status, { [$style.statusOn]: enabled }]">{{ enabled ? $t('player__sound_effect_enabled') : $t('player__sound_effect_disabled') }}</span>
          <span v-if="enabled" :class="$style.presetName">{{ currentPresetLabel }}</span>
          <effect-switch :model-value="enabled" @update:model-value="handleMasterToggle" />
          <button type="button" :class="$style.closeBtn" aria-label="关闭" @click="visible = false">
            <svg viewBox="0 0 24 24" space="preserve">
              <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
            </svg>
          </button>
        </div>
      </header>

      <div :class="$style.body">
        <!-- 左侧竖向导航 -->
        <nav :class="$style.nav">
          <template v-for="(item, index) in tabs" :key="item.key">
            <span v-if="index === tabs.length - 1" :class="$style.navDivider" />
            <button
              type="button"
              :class="[$style.navItem, { [$style.navItemActive]: activeTab === item.key }]"
              @click="activeTab = item.key"
            >
            <svg-icon :class="$style.navIcon" :name="item.icon" />
            <span :class="$style.navLabel">{{ $t(item.label) }}</span>
            <span v-if="navSubLabel(item.key)" :class="$style.navSub">{{ navSubLabel(item.key) }}</span>
            </button>
          </template>
        </nav>

        <!-- 内容区 -->
        <div :class="['scroll', $style.content, { [$style.contentDisabled]: !enabled }]">
          <PresetTiles v-if="activeTab === 'preset'" />
          <EqPanel v-else-if="activeTab === 'eq'" />
          <AdvancedPanel v-else-if="activeTab === 'advanced'" />
          <PitchPanel v-else />
        </div>
      </div>

      <p v-if="showTip" :class="$style.tip">{{ $t('player__sound_effect_features_tip') }}</p>
    </div>
  </material-modal>
</template>

<script setup>
import { computed, ref, watch } from '@common/utils/vueTools'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { matchSoundPreset, matchEqTile, readEffectState, soundPresets, eqTiles } from './presets'
import PresetTiles from './PresetTiles.vue'
import EqPanel from './EqPanel.vue'
import AdvancedPanel from './AdvancedPanel.vue'
import PitchPanel from './PitchPanel.vue'
import EffectSwitch from './ui/EffectSwitch.vue'

defineProps({
  teleport: {
    type: String,
    default: '#root',
  },
})

const visible = ref(false)
const activeTab = ref('preset')

const tabs = [
  { key: 'preset', label: 'player__sound_effect_tab_preset', icon: 'music' },
  { key: 'advanced', label: 'player__sound_effect_tab_acoustic', icon: 'headphones' },
  { key: 'eq', label: 'player__sound_effect_biquad_filter', icon: 'equalizer' },
  { key: 'pitch', label: 'player__sound_effect_tab_make', icon: 'tune-variant' },
]

/** 总开关：关闭时整条音效链物理旁路（素音直出），各音效设置保留 */
const enabled = computed(() => appSetting['player.soundEffect.enable'])

const currentPresetLabel = computed(() => {
  const state = readEffectState(appSetting)
  const soundKey = matchSoundPreset(state)
  if (soundKey) return soundPresets.find(item => item.key === soundKey)?.label ?? ''
  const eqKey = matchEqTile(state.eq)
  if (eqKey && eqKey !== 'custom') return eqTiles.find(item => item.key === eqKey)?.label ?? ''
  return '自定义'
})

/** 选中项下方的小字（与参考图一致：显示当前音效名） */
const navSubLabel = (key) => {
  if (key === 'preset') {
    const state = readEffectState(appSetting)
    const soundKey = matchSoundPreset(state)
    return soundKey ? soundPresets.find(item => item.key === soundKey)?.label ?? '' : ''
  }
  if (key === 'eq') {
    const state = readEffectState(appSetting)
    const eqKey = matchEqTile(state.eq)
    if (!eqKey || eqKey === 'custom') return ''
    return eqTiles.find(item => item.key === eqKey)?.label ?? ''
  }
  return ''
}

const handleMasterToggle = (value) => {
  updateSetting({ 'player.soundEffect.enable': value })
}

const showTip = ref(false)

watch(visible, (visible) => {
  if (visible) showTip.value = appSetting['player.mediaDeviceId'] != 'default'
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.btn {
  position: relative;
  justify-content: center;
  align-items: center;
  transition: color @transition-normal;
  cursor: pointer;
  background-color: transparent;
  border: none;
  width: 24px;
  display: flex;
  flex-flow: column nowrap;
  padding: 0;

  svg {
    transition: opacity @transition-fast;
    opacity: .6;
    filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.2));
  }
  &:hover {
    svg {
      opacity: .9;
    }
  }
  &:active {
    svg {
      opacity: 1;
    }
  }
}

.panel {
  display: flex;
  flex-flow: column nowrap;
  width: 720px;
  max-width: 94vw;
  min-height: 0;
}

.header {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--qm-line-2, var(--color-primary-light-100-alpha-700));
}
.headerLeft {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.headerIcon {
  width: 20px;
  height: 20px;
  flex: none;
  fill: var(--color-font);
}
.headerTitle {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-font);
  white-space: nowrap;
}
.headerRight {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 8px;
}
.status {
  font-size: 12px;
  color: var(--color-font-label);
  &.statusOn {
    color: #12b981;
  }
}
.presetName {
  font-size: 12px;
  color: var(--color-font);
  white-space: nowrap;
}

.body {
  display: flex;
  flex-flow: row nowrap;
  min-height: 0;
  height: 430px;
}

.nav {
  flex: none;
  width: 104px;
  display: flex;
  flex-flow: column nowrap;
  gap: 4px;
  padding: 12px 8px;
  border-right: 1px solid var(--qm-line-2, var(--color-primary-light-100-alpha-700));
  box-sizing: border-box;
}
.navItem {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 4px;
  border: none;
  border-radius: 10px;
  background-color: transparent;
  color: var(--color-font-label);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, .18s), color var(--qm-t-fast, .18s);

  &:hover {
    background-color: var(--qm-hover, var(--color-primary-light-100-alpha-700));
  }
}
.navItemActive {
  // 参考图：选中态不使用底色，仅图标与文字变为主色
  color: #12b981;
  .navIcon {
    fill: #12b981;
  }
}
.navIcon {
  width: 26px;
  height: 26px;
  fill: var(--color-font-label);
  transition: fill var(--qm-t-fast, .18s);
}
.navLabel {
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
}
.navSub {
  font-size: 11px;
  line-height: 1.1;
  color: #12b981;
  text-align: center;
}
.navDivider {
  height: 1px;
  margin: 8px 12px;
  background-color: var(--qm-line-2, var(--color-primary-light-100-alpha-700));
}
.closeBtn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: none;
  color: var(--color-font-label);
  cursor: pointer;

  svg {
    width: 15px;
    height: 15px;
  }
  &:hover {
    background-color: var(--qm-hover, var(--color-primary-light-100-alpha-700));
    color: var(--color-font);
  }
}

.content {
  flex: auto;
  min-width: 0;
  padding: 14px 16px;
  box-sizing: border-box;
  transition: opacity @transition-normal;
  &.contentDisabled {
    opacity: .45;
    pointer-events: none;
  }
}

.tip {
  flex: none;
  padding: 0 16px 14px;
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--color-font-label);
}
</style>
