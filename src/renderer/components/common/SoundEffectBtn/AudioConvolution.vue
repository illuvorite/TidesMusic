<template>
  <div :class="$style.content">
    <h4 :class="$style.sectionTitle">{{ $t('player__sound_effect_recommend_featured') }}</h4>
    <div :class="$style.featuredGrid">
      <button
        v-for="item in featuredList"
        :key="item.id"
        type="button"
        :class="[$style.featuredCard, $style[item.themeCls], { [$style.active]: activeFeaturedId === item.id }]"
        :aria-label="item.name"
        :aria-pressed="activeFeaturedId === item.id"
        @click="applyEffect(item.effect)"
      >
        <span :class="$style.featuredName">{{ item.name }}</span>
        <svg v-if="activeFeaturedId === item.id" :class="$style.checkBadge" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <h4 :class="[$style.sectionTitle, $style.sectionTitleGap]">{{ $t('player__sound_effect_recommend_master') }}</h4>
    <div :class="$style.masterGrid">
      <div
        :class="$style.masterAdd"
        role="button"
        tabindex="0"
        :aria-label="$t('player__sound_effect_recommend_save_current')"
        :title="$t('player__sound_effect_recommend_save_current')"
        @click="saveCurrentAsMaster"
        @keydown.enter="saveCurrentAsMaster"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4.6v14.8M4.6 12h14.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </div>
      <div
        v-for="item in masterItems"
        :key="item.id"
        :class="[$style.masterItem, { [$style.masterActive]: activeMasterId === item.id }]"
        :aria-label="item.name"
        @click="applyEffect(item.effect)"
      >
        <span :class="$style.masterName">{{ item.name }}</span>
        <button
          v-if="item.removable"
          type="button"
          :class="$style.masterDelete"
          :aria-label="$t('player__sound_effect_delete')"
          @click.stop="removeMaster(item.id)"
        >&times;</button>
        <span :class="$style.masterUse">{{ $t('player__sound_effect_recommend_use') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from '@common/utils/vueTools'
import { freqs, freqsPreset } from '@renderer/plugins/player'
import { appSetting, saveMediaDeviceId, updateSetting } from '@renderer/store/setting'
import { getUserEQPresetList, removeUserEQPreset, saveUserEQPreset } from '@renderer/store/soundEffect'

const ZERO_EQ = { hz31: 0, hz62: 0, hz125: 0, hz250: 0, hz500: 0, hz1000: 0, hz2000: 0, hz4000: 0, hz8000: 0, hz16000: 0 }
const presetMap = {}
for (const p of freqsPreset) presetMap[p.name] = p
const eqOf = name => {
  const out = {}
  for (const f of freqs) out[`hz${f}`] = presetMap[name] ? presetMap[name][`hz${f}`] : 0
  return out
}

// effect: { eq, conv: [source, main, send] | null, panner, bass, hifi, dynamic, balance }
const C = (id, themeCls, name, eq, conv, opts = {}) => ({ id, themeCls, name, effect: { eq, conv: conv ? { source: conv[0], mainGain: conv[1], sendGain: conv[2] } : null, panner: !!opts.panner, bass: opts.bass || 0, hifi: opts.hifi || 0, dynamic: opts.dynamic || 0, balance: 0, pitch: 1 } })

// themeCls 对应下方渐变类：底色取自 QQ 音乐音效弹窗参考图的像素采样
const featuredList = [
  C('close', 'themeRed', window.i18n.t('player__sound_effect_biquad_filter_preset_close'), { ...ZERO_EQ }, null),
  C('smart', 'themePurple', window.i18n.t('player__sound_effect_featured_smart'), eqOf('pop'), ['matrix-reverb1.wav', 12, 6], { bass: 6, hifi: 6, dynamic: 5 }),
  C('superdj', 'themeTeal', window.i18n.t('player__sound_effect_featured_superdj'), eqOf('dance'), ['feedback-spring.wav', 15, 5], { bass: 18, hifi: 6, dynamic: 10 }),
  C('panorama', 'themeGreen', window.i18n.t('player__sound_effect_featured_panorama'), eqOf('soft'), ['bright-hall.wav', 10, 12], { panner: true, bass: 4, hifi: 4 }),
  C('stereo51', 'themeIndigo', window.i18n.t('player__sound_effect_featured_stereo51'), eqOf('pop'), ['s3_r1_bd.wav', 15, 5], { panner: true, bass: 6, hifi: 8, dynamic: 5 }),
  C('bass', 'themeCyan', window.i18n.t('player__sound_effect_featured_bass'), eqOf('subwoofer'), null, { bass: 25, dynamic: 8 }),
  C('clearvocal', 'themeAqua', window.i18n.t('player__sound_effect_featured_clearvocal'), eqOf('vocal'), null, { hifi: 12 }),
  C('livebeat', 'themeGreen2', window.i18n.t('player__sound_effect_featured_livebeat'), eqOf('rock'), ['cardiod-35-10-spread.wav', 15, 4], { bass: 10, hifi: 8, dynamic: 12 }),
  C('outdoor', 'themeViolet', window.i18n.t('player__sound_effect_featured_outdoor'), { ...ZERO_EQ }, ['filter-telephone.wav', 0, 15], { bass: 3, hifi: 10, dynamic: 10 }),
  C('china', 'themeRed2', window.i18n.t('player__sound_effect_featured_china'), eqOf('classical'), ['s2_r4_bd.wav', 15, 6], { bass: 4, hifi: 4, dynamic: 3 }),
]

const builtinMasters = [
  C('m_galaxy_hifi', '', window.i18n.t('player__sound_effect_master_galaxy_hifi'), eqOf('pop'), ['cardiod-35-10-spread.wav', 15, 4], { bass: 6, hifi: 12, dynamic: 5 }),
  C('m_virtual_hall', '', window.i18n.t('player__sound_effect_master_virtual_hall'), eqOf('classical'), ['bright-hall.wav', 10, 12], { bass: 4, hifi: 3 }),
  C('m_hifi_surround', '', window.i18n.t('player__sound_effect_master_hifi_surround'), eqOf('soft'), ['tim-omni-35-10-magnetic.wav', 10, 2], { bass: 3, hifi: 10, dynamic: 3 }),
  C('m_wide', '', window.i18n.t('player__sound_effect_master_wide'), eqOf('electronic'), ['cardiod-35-10-spread.wav', 15, 4], { bass: 5, hifi: 10, dynamic: 5 }),
  C('m_vr', '', window.i18n.t('player__sound_effect_master_vr'), eqOf('dance'), ['matrix-reverb2.wav', 13, 6], { panner: true, bass: 6, hifi: 5, dynamic: 6 }),
  C('m_oxygen_vocal', '', window.i18n.t('player__sound_effect_master_oxygen_vocal'), eqOf('vocal'), ['spreader50-65ms.wav', 10, 8], { bass: 3, hifi: 6, dynamic: 12 }),
  C('m_highreal', '', window.i18n.t('player__sound_effect_master_highreal'), eqOf('subwoofer'), null, { bass: 12, hifi: 15, dynamic: 4 }),
  C('m_sound_real', '', window.i18n.t('player__sound_effect_master_sound_real'), { ...ZERO_EQ }, ['filter-telephone.wav', 0, 15], { bass: 3, hifi: 12, dynamic: 10 }),
  C('m_folk_dj', '', window.i18n.t('player__sound_effect_master_folk_dj'), eqOf('country'), ['feedback-spring.wav', 15, 5], { bass: 10, hifi: 5, dynamic: 8 }),
  C('m_lsk', '', window.i18n.t('player__sound_effect_master_lsk'), eqOf('pop'), ['matrix-reverb2.wav', 13, 6], { bass: 5, hifi: 8, dynamic: 5 }),
  C('m_ierz1r', '', window.i18n.t('player__sound_effect_master_ierz1r'), eqOf('slow'), ['s2_r4_bd.wav', 15, 6], { bass: 4, hifi: 6, dynamic: 3 }),
  C('m_hifi_wrap', '', window.i18n.t('player__sound_effect_master_hifi_wrap'), eqOf('subwoofer'), ['cinema-diningroom.wav', 6, 12], { panner: true, bass: 8, hifi: 5, dynamic: 5 }),
  C('m_outdoor_only', '', window.i18n.t('player__sound_effect_master_outdoor_only'), { ...ZERO_EQ }, ['filter-telephone.wav', 0, 15], { hifi: 10, dynamic: 10 }),
  C('m_perfect_vocal', '', window.i18n.t('player__sound_effect_master_perfect_vocal'), eqOf('vocal'), ['living-bedroom-leveled.wav', 6, 11], { bass: 3, hifi: 8, dynamic: 4 }),
  C('m_soundbar', '', window.i18n.t('player__sound_effect_master_soundbar'), eqOf('vocal'), ['bright-hall.wav', 8, 10], { bass: 6, hifi: 5, dynamic: 5 }),
  C('m_ethereal', '', window.i18n.t('player__sound_effect_master_ethereal'), eqOf('slow'), ['matrix-reverb1.wav', 15, 6], { panner: true, bass: 3, hifi: 6, dynamic: 3 }),
]

// ===== 应用组合（统一入口） =====
const applyEffect = effect => {
  if (appSetting['player.mediaDeviceId'] != 'default') saveMediaDeviceId('default')
  const setting = {
    'player.soundEffect.enhance.bass': effect.bass ?? 0,
    'player.soundEffect.enhance.hifi': effect.hifi ?? 0,
    'player.soundEffect.enhance.dynamic': effect.dynamic ?? 0,
    'player.soundEffect.enhance.balance': effect.balance ?? 0,
    'player.soundEffect.pitchShifter.playbackRate': effect.pitch ?? 1,
    'player.soundEffect.panner.enable': effect.panner ?? false,
    // 开启环绕时若半径为 0（之前被用户关掉），给一个可感知的默认值，否则 panner 半径为 0 会导致音效静默失效
    'player.soundEffect.panner.soundR': effect.panner
      ? (appSetting['player.soundEffect.panner.soundR'] || 5)
      : appSetting['player.soundEffect.panner.soundR'],
  }
  const eq = effect.eq ?? { ...ZERO_EQ }
  for (const f of freqs) setting[`player.soundEffect.biquadFilter.hz${f}`] = eq[`hz${f}`] ?? 0
  setting['player.soundEffect.convolution.fileName'] = effect.conv ? effect.conv.source : ''
  setting['player.soundEffect.convolution.mainGain'] = effect.conv ? Math.round(effect.conv.mainGain * 10) : 10
  // 混响强度（sendGain）是用户的独立滑条，组合预设不覆盖它；
  // 启用混响且当前强度为 0 时给一个可感知的默认值
  if (effect.conv) {
    setting['player.soundEffect.convolution.sendGain'] = appSetting['player.soundEffect.convolution.sendGain'] || 12
  } else {
    setting['player.soundEffect.convolution.sendGain'] = 0
  }
  updateSetting(setting)
}

// ===== 当前选中项（值匹配） =====
const currentSnapshot = computed(() => ({
  eq: freqs.map(f => appSetting[`player.soundEffect.biquadFilter.hz${f}`]).join(','),
  conv: appSetting['player.soundEffect.convolution.fileName'],
  panner: appSetting['player.soundEffect.panner.enable'] ? 1 : 0,
  bass: appSetting['player.soundEffect.enhance.bass'],
  hifi: appSetting['player.soundEffect.enhance.hifi'],
  dynamic: appSetting['player.soundEffect.enhance.dynamic'],
  balance: appSetting['player.soundEffect.enhance.balance'],
}))
const matchSnapshot = effect => {
  const cur = currentSnapshot.value
  const eq = effect.eq ?? { ...ZERO_EQ }
  const eqStr = freqs.map(f => eq[`hz${f}`] ?? 0).join(',')
  const convMatch = effect.conv ? cur.conv === effect.conv.source : cur.conv === ''
  return cur.eq === eqStr && convMatch && cur.panner === (effect.panner ? 1 : 0) && cur.bass === (effect.bass ?? 0) && cur.hifi === (effect.hifi ?? 0) && cur.dynamic === (effect.dynamic ?? 0) && cur.balance === (effect.balance ?? 0)
}
const activeFeaturedId = computed(() => featuredList.find(item => matchSnapshot(item.effect))?.id ?? '')
const activeMasterId = computed(() => masterItems.value.find(item => matchSnapshot(item.effect))?.id ?? '')

// ===== 达人音效：内置 + 用户保存（复用 userEQPreset 存储） =====
const userMasters = ref([])
const masterItems = computed(() => {
  const userItems = userMasters.value.map(item => {
    const eq = {}
    for (const f of freqs) eq[`hz${f}`] = item[`hz${f}`] ?? 0
    return { id: 'u_' + item.id, name: item.name, removable: true, effect: { eq, conv: null, bass: 0, hifi: 0, dynamic: 0, balance: 0, pitch: 1 } }
  })
  return [...userItems, ...builtinMasters]
})

const refreshUserMasters = () => {
  void getUserEQPresetList().then(list => {
    userMasters.value = list
  })
}

const saveCurrentAsMaster = () => {
  const snapshot = currentSnapshot.value
  const name = window.i18n.t('player__sound_effect_recommend_my_effect') + ' ' + new Date().toLocaleTimeString()
  const preset = { id: Date.now().toString(), name }
  freqs.forEach((f, i) => { preset[`hz${f}`] = Number(snapshot.eq.split(',')[i]) })
  void saveUserEQPreset(preset).then(() => {
    refreshUserMasters()
  })
}

const removeMaster = id => {
  if (!id.startsWith('u_')) return
  void removeUserEQPreset(id.slice(2)).then(() => {
    refreshUserMasters()
  })
}

onMounted(() => {
  refreshUserMasters()
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.content {
  user-select: none;
  min-width: 0;
}

// ===== 区块标题 =====
.sectionTitle {
  margin: 0 0 8px;
  font-size: var(--se-fs-section, 14px);
  font-weight: 600;
  line-height: 20px;
  color: var(--se-text, #333);
}
.sectionTitleGap {
  // 实测：精选卡第二行底 291 → 达人行首行顶 347，中间夹标题行高 20
  margin: 17px 0 18px;
}

// ===== 精选音效：5 列卡片（实测 96×96、间距 10）=====
.featuredGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-auto-rows: 96px;
  gap: 10px;
}
.featuredCard {
  position: relative;
  box-sizing: border-box;
  border: 2px solid transparent;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  cursor: pointer;
  color: #fff;
  overflow: hidden;
  transition: transform var(--qm-t-fast, 150ms ease), box-shadow var(--qm-t-fast, 150ms ease);
  // 白色文字压在中等明度的色块上，加一层极轻的投影把对比度抬到达标线以上
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
  }
  &.active {
    border-color: var(--se-accent, #1ecc94);
  }
}
.featuredName {
  font-size: var(--se-fs-section, 14px);
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  // 参考图中「5.1 立体环绕声」只在数字前缀后的空格处断行（第一行「5.1」、第二行「立体环绕声」），
  // 因此禁用 CJK 逐字断行；万一某个语言文案过长，再由 anywhere 兜底避免溢出
  word-break: keep-all;
  overflow-wrap: anywhere;
}
.checkBadge {
  position: absolute;
  right: 3px;
  bottom: 2px;
  width: 16px;
  height: 16px;
  color: #fff;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
}

// 精选卡渐变（QQ 音乐音效弹窗实测色，160° 微渐变 + 一层柔和高光）
.themeRed    { background-color: #ea8383; background-image: linear-gradient(160deg, #ee9393, #e17878); }
.themePurple { background-color: #7a76a5; background-image: linear-gradient(160deg, #827eb0, #726ea0); }
.themeTeal   { background-color: #7faad6; background-image: linear-gradient(160deg, #8ab4e0, #6390bc); }
.themeGreen  { background-color: #70c48b; background-image: linear-gradient(160deg, #7ccb97, #65bd82); }
.themeIndigo { background-color: #737dab; background-image: linear-gradient(160deg, #7c86b4, #6a74a2); }
.themeCyan   { background-color: #78c3cc; background-image: linear-gradient(160deg, #82c9d1, #6fbcc6); }
.themeAqua   { background-color: #6db6aa; background-image: linear-gradient(160deg, #75bbaf, #64b0a4); }
.themeGreen2 { background-color: #71bfc2; background-image: linear-gradient(160deg, #7bc5c8, #68b9bc); }
.themeViolet { background-color: #d0a1d0; background-image: linear-gradient(160deg, #d8abd8, #c897c8); }
.themeRed2   { background-color: #c4615a; background-image: linear-gradient(160deg, #cb6d67, #b64d47); }

// ===== 达人音效：2 列 =====
.masterGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.masterAdd {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 4px;
  background-color: var(--se-field, #f8f8f8);
  color: var(--se-text-weak, #666);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, 150ms ease), color var(--qm-t-fast, 150ms ease);

  svg { width: var(--qm-icon); height: var(--qm-icon); }
  &:hover {
    background-color: var(--se-field-hover, #f1f1f1);
    color: var(--se-text, #333);
  }
}
.masterItem {
  position: relative;
  // 必须 border-box：1px 透明描边若按 content-box 计，会把行高撑到 38 使行距偏离实测的 46
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px 0 14px;
  border: 1px solid transparent;
  border-radius: 4px;
  background-color: var(--se-field, #f8f8f8);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, 150ms ease);

  &:hover {
    background-color: var(--se-field-hover, #f1f1f1);
  }
  &.masterActive {
    border-color: var(--se-accent, #1ecc94);
  }
}
.masterName {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--se-fs-body, 13px);
  color: var(--se-text, #333);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.masterActive .masterName {
  color: var(--se-accent, #1ecc94);
}
.masterDelete {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  padding: 0;
  background: transparent;
  color: var(--se-text-weak, #666);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--qm-t-fast, 150ms ease), background-color var(--qm-t-fast, 150ms ease);

  &:hover {
    background-color: #e74c3c;
    color: #fff;
  }
}
.masterItem:hover .masterDelete {
  opacity: 1;
}
.masterUse {
  flex: none;
  font-size: var(--se-fs-body, 13px);
  color: var(--se-text, #333);
}
.masterItem:hover .masterUse {
  color: var(--se-accent, #1ecc94);
}
</style>
