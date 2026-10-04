<template>
  <button :class="$style.btn" :aria-label="$t('player__sound_effect')" ignore-tip @click="visible = true">
    <svg-icon name="tune-variant" />
  </button>
  <teleport :to="teleport">
    <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div v-if="visible" :class="$style.container">
        <div :class="$style.mask" @click="visible = false" />
        <div :class="$style.panel">
          <!-- ===== 表头：音波图标 + 标题 + 总开关 + 状态 + 当前预设 + 关闭 ===== -->
          <header :class="$style.header">
            <svg :class="$style.headerIcon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M2.2 10.2v3.6M7 6.4v11.2M12 2.4v19.2M17 6.4v11.2M21.8 10.2v3.6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            <b :class="$style.headerTitle">{{ $t('player__sound_effect_galaxy_title') }}</b>
            <button
              type="button"
              :class="[$style.switch, { [$style.switchOn]: isAnyActive }]"
              :aria-label="isAnyActive ? $t('player__sound_effect_state_on') : $t('player__sound_effect_state_off')"
              :aria-pressed="isAnyActive"
              ignore-tip
             @click="handleToggleAll"
>
              <span :class="$style.switchDot" />
            </button>
            <span :class="$style.headerState">{{ isAnyActive ? $t('player__sound_effect_state_on') : $t('player__sound_effect_state_off') }}</span>
            <span v-if="isAnyActive" :class="$style.headerPreset">{{ eqPresetText }}</span>
            <button type="button" :class="$style.closeBtn" aria-label="close" ignore-tip @click="visible = false">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
              </svg>
            </button>
          </header>

          <!-- ===== 主体：左侧导航 + 右侧内容 ===== -->
          <div :class="$style.body">
            <nav :class="$style.side">
              <button
                v-for="tab in sideTabs"
                :key="tab.id"
                type="button"
                :class="[$style.navBtn, { [$style.navBtnActive]: activeTab === tab.id }]"
                :aria-label="tab.label"
                ignore-tip
               @click="activeTab = tab.id"
>
                <svg :class="$style.navIcon" viewBox="0 0 48 48" aria-hidden="true" v-html="tab.icon" />
                <span :class="$style.navLabel">{{ tab.label }}</span>
                <b v-if="tab.sub" :class="$style.navSub">{{ tab.sub }}</b>
              </button>
              <span :class="$style.sideDivider" />
              <button
                type="button"
                :class="[$style.navBtn, $style.navBtnPlain, { [$style.navBtnActive]: activeTab === 'make' }]"
                :aria-label="$t('player__sound_effect_tab_make')"
                ignore-tip
               @click="activeTab = 'make'"
>
                <span :class="$style.navLabel">{{ $t('player__sound_effect_tab_make') }}</span>
              </button>
            </nav>

            <main class="scroll" :class="$style.main">
              <div v-show="activeTab === 'recommend'">
                <AudioConvolution />
              </div>
              <div v-show="activeTab === 'acoustic'">
                <AudioPanner />
                <PitchShifter />
              </div>
              <div v-show="activeTab === 'eq'">
                <BiquadFilter />
              </div>
              <div v-show="activeTab === 'make'">
                <Make />
              </div>
            </main>
          </div>

          <p v-if="showTip" :class="$style.tip">{{ $t('player__sound_effect_features_tip') }}</p>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from '@common/utils/vueTools'
import BiquadFilter from './BiquadFilter.vue'
import AudioPanner from './AudioPanner.vue'
import AudioConvolution from './AudioConvolution.vue'
import PitchShifter from './PitchShifter.vue'
import Make from './Make.vue'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { freqs, freqsPreset } from '@renderer/plugins/player'

defineProps({
  teleport: {
    type: String,
    default: '#root',
  },
})

const visible = ref(false)

const showTip = ref(false)

watch(visible, (visible) => {
  if (visible) showTip.value = appSetting['player.mediaDeviceId'] != 'default'
})

// 当前均衡器预设（关闭 / 内置预设名 / 自定义）
const eqPreset = computed(() => {
  const vals = freqs.map(f => appSetting[`player.soundEffect.biquadFilter.hz${f}`])
  if (vals.every(v => v === 0)) return { i18n: 'close' }
  for (const preset of freqsPreset) {
    if (freqs.every((f, i) => preset[`hz${f}`] === vals[i])) return { i18n: preset.name }
  }
  return { i18n: 'custom' }
})
const eqPresetText = computed(() => window.i18n.t(`player__sound_effect_biquad_filter_preset_${eqPreset.value.i18n}`))

// 是否有任一音效生效
const isAnyActive = computed(() => {
  if (freqs.some(f => appSetting[`player.soundEffect.biquadFilter.hz${f}`] !== 0)) return true
  if (appSetting['player.soundEffect.panner.enable']) return true
  if (appSetting['player.soundEffect.convolution.fileName']) return true
  if (appSetting['player.soundEffect.pitchShifter.playbackRate'] !== 1) return true
  // 增强效果链已实现（见 plugins/player 的 applyEnhanceRouting），需一并计入
  if (appSetting['player.soundEffect.enhance.bass'] !== 0) return true
  if (appSetting['player.soundEffect.enhance.hifi'] !== 0) return true
  if (appSetting['player.soundEffect.enhance.dynamic'] !== 0) return true
  if (appSetting['player.soundEffect.enhance.balance'] !== 0) return true
  return false
})

// 总开关：一键关闭全部音效（与各子功能的原有逻辑一致，仅批量复位）
const handleToggleAll = () => {
  if (!isAnyActive.value) return
  const setting = {}
  for (const f of freqs) setting[`player.soundEffect.biquadFilter.hz${f}`] = 0
  setting['player.soundEffect.panner.enable'] = false
  setting['player.soundEffect.panner.soundR'] = 0
  setting['player.soundEffect.convolution.fileName'] = ''
  setting['player.soundEffect.pitchShifter.playbackRate'] = 1
  setting['player.soundEffect.enhance.bass'] = 0
  setting['player.soundEffect.enhance.hifi'] = 0
  setting['player.soundEffect.enhance.dynamic'] = 0
  setting['player.soundEffect.enhance.balance'] = 0
  updateSetting(setting)
  // 同步关闭通用音效链的「开启效果」状态，防止其后续再写全局音效
  try {
    const raw = localStorage.getItem('lx_galaxy_general_chain')
    if (raw) {
      const data = JSON.parse(raw)
      if (data.enabled) {
        data.enabled = false
        localStorage.setItem('lx_galaxy_general_chain', JSON.stringify(data))
      }
    }
  } catch {}
}

const activeTab = ref('recommend')

// 侧栏前三项带 40px 线性图标；「音效制作」按参考图只有文字（分隔线下方）
const sideTabs = computed(() => {
  return [
    {
      id: 'recommend',
      label: window.i18n.t('player__sound_effect_tab_recommend'),
      sub: '',
      // 音符 + 声波弧
      icon: '<path d="M20 34.5V16.2l12-2.6v15.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16.4" cy="34.6" r="4.2" fill="currentColor"/><circle cx="28.4" cy="29.4" r="4.2" fill="currentColor"/>',
    },
    {
      id: 'acoustic',
      label: window.i18n.t('player__sound_effect_tab_acoustic'),
      sub: '',
      // 耳机
      icon: '<path d="M11 29.4v-5a13 13 0 0 1 26 0v5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="5.4" y="26.4" width="9.4" height="13.6" rx="4.4" fill="currentColor"/><rect x="33.2" y="26.4" width="9.4" height="13.6" rx="4.4" fill="currentColor"/>',
    },
    {
      id: 'eq',
      label: window.i18n.t('player__sound_effect_biquad_filter'),
      // 参考图中该子标签只在「均衡器」页处于选中态时出现，其它页不显示
      sub: activeTab.value === 'eq' && isAnyActive.value ? eqPresetText.value : '',
      // 三段竖向推子
      icon: '<path d="M15.4 13v22M24 13v22M32.6 13v22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="15.4" cy="29.4" r="3.6" fill="currentColor"/><circle cx="24" cy="19.6" r="3.6" fill="currentColor"/><circle cx="32.6" cy="32.4" r="3.6" fill="currentColor"/>',
    },
  ]
})
</script>

<style lang="less">
@import '@renderer/assets/styles/layout.less';
// 子组件仍在使用的全局标题样式
.player__sound_effect_title {
  font-size: var(--se-fs-title, 14px);
  font-weight: 600;
  color: var(--se-text, #333);
  padding-bottom: 12px;
}
</style>

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

// ============================================================
//  弹窗根：--se-* 局部令牌
//  取值全部来自 QQ 音乐音效弹窗参考图的**像素采样**（见 docs/qq-music-todo.md）。
//  统一收敛在这里，组件样式只引用变量，避免色值散落；
//  与全局 --qm-* 的差异说明：QQ 该面板实测主绿为 #1ECC94（比主题绿更偏青），
//  卡片/输入底为 #F8F8F8（比 --qm-field 更浅），为保证一比一保真不复用主题值。
// ============================================================
.panel {
  --se-accent: #1ecc94;
  --se-accent-switch: #1edaaa;
  --se-bg: #ffffff;
  --se-side-bg: #f1f1f1;
  --se-field: #f8f8f8;
  --se-field-hover: #f1f1f1;
  --se-line: #dddddd;
  --se-track: #acacac;
  --se-track-v: #b7b7b7;
  --se-text: #333333;
  --se-text-weak: #666666;
  --se-text-title: #1a1a1a;
  --se-fs-title: 17px;
  --se-fs-section: 14px;
  --se-fs-body: 13px;
  --se-fs-aux: 12px;
  --se-fs-badge: 11px;

  position: relative;
  width: 730px;
  max-width: 94%;
  height: 560px;
  max-height: 92%;
  display: flex;
  flex-flow: column nowrap;
  background-color: var(--se-bg);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.24);
  overflow: hidden;
  color: var(--se-text);
}

.container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.35);
}

// ===== 表头（50px）=====
// ===== 表头（实测 51px 内容 + 1px 底边 = 52px）=====
.header {
  flex: none;
  height: 51px;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  // 实测：图标墨迹左沿距弹窗左 25px、关闭图标墨迹右沿距弹窗右 15px
  padding: 0 6px 0 23px;
  background-color: var(--se-bg);
  // 实测标题栏下确有 1px #EDEDED 分隔线（比侧栏底与内容底都深，非抗锯齿）
  border-bottom: 1px solid #ededed;
}
.headerIcon {
  flex: none;
  width: 24px;
  height: 24px;
  color: var(--se-text);
  margin-right: 6px;
}
.headerTitle {
  flex: none;
  font-size: var(--se-fs-title);
  font-weight: 700;
  letter-spacing: 0.2px;
  color: var(--se-text-title);
  margin-right: 29px;
}

// 总开关 36×20
.switch {
  flex: none;
  position: relative;
  width: 36px;
  height: 20px;
  border: none;
  border-radius: 999px;
  background-color: #d8d8d8;
  cursor: pointer;
  padding: 0;
  transition: background-color var(--qm-t-base, 200ms ease);

  .switchDot {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: left var(--qm-t-base, 200ms ease);
  }
  &.switchOn {
    background-image: linear-gradient(90deg, #21d4b2, var(--se-accent-switch));
    .switchDot { left: 18px; }
  }
}
.headerState {
  flex: none;
  margin-left: 12px;
  font-size: var(--se-fs-body);
  color: var(--se-text);
}
.headerPreset {
  flex: none;
  margin-left: 6px;
  font-size: var(--se-fs-body);
  color: var(--se-accent);
}
.closeBtn {
  flex: none;
  margin-left: auto;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--se-text-weak);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, 150ms ease), color var(--qm-t-fast, 150ms ease);

  svg { width: var(--qm-icon-xs); height: var(--qm-icon-xs); }
  &:hover {
    background-color: rgba(0, 0, 0, 0.06);
    color: var(--se-text);
  }
}

// ===== 主体 =====
.body {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: row nowrap;
}

// 左侧导航 150px（浅灰底，通高到弹窗底部）
.side {
  flex: none;
  width: 150px;
  padding-top: 12px;
  display: flex;
  flex-flow: column nowrap;
  background-color: var(--se-side-bg);
  overflow-y: auto;

  &::-webkit-scrollbar { width: 0; }
}
.navBtn {
  flex: none;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: 13px;
  padding: 28px 6px;
  border: none;
  background: transparent;
  color: var(--se-text-weak);
  cursor: pointer;
  transition: color var(--qm-t-fast, 150ms ease);

  .navIcon {
    width: 40px;
    height: 40px;
  }
  .navLabel {
    font-size: var(--se-fs-body);
    line-height: 1.15;
    white-space: nowrap;
    color: inherit;
  }
  .navSub {
    margin-top: -3px;
    max-width: 100%;
    font-size: var(--se-fs-aux);
    font-weight: 400;
    line-height: 1.15;
    color: var(--se-accent);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    color: var(--se-text);
  }
  &.navBtnActive {
    color: var(--se-accent);
    .navLabel { color: var(--se-accent); }
    &:hover { color: var(--se-accent); }
  }
}
// 「音效制作」：只有文字、无图标
.navBtnPlain {
  gap: 0;
  padding: 26px 6px 28px;

  .navLabel {
    color: var(--se-text-weak);
  }
  &.navBtnActive .navLabel { color: var(--se-accent); }
  &:hover .navLabel { color: var(--se-text); }
  &.navBtnActive:hover .navLabel { color: var(--se-accent); }
}
// 短分隔线（居中，宽 58px）
.sideDivider {
  flex: none;
  width: 58px;
  height: 1px;
  margin: 6px auto;
  background-color: var(--se-line);
}

// 右侧内容
.main {
  flex: auto;
  min-width: 0;
  // 实测：表头底 52 + 10 = 内容顶 62，精选音效标题行高 20 + 8 后卡片顶落在 90
  padding: 10px 30px 18px;
  background-color: var(--se-bg);
}

.tip {
  flex: none;
  padding: 8px 30px 12px;
  font-size: var(--se-fs-aux);
  line-height: 1.4;
  color: var(--se-text-weak);
  border-top: 1px dashed var(--se-line);
  background-color: var(--se-bg);
}
</style>
