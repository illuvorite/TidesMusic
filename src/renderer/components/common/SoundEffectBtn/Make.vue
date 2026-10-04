<template>
  <!-- 音效制作：主页三卡片 / 通用音效编辑器 / DJ 音效 -->
  <div :class="$style.content">
    <!-- ===== 主页 ===== -->
    <template v-if="view === 'home'">
      <div :class="$style.cardGrid">
        <button type="button" :class="$style.bigCard" @click="view = 'general'">
          <svg :class="$style.bigIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h3v14H5zM11 8h3v8h-3zM17 5h3v14h-3z" fill="none" stroke="currentColor" stroke-width="1.5" /><circle cx="6.5" cy="15" r="2" fill="currentColor" /><circle cx="12.5" cy="9" r="2" fill="currentColor" /><circle cx="18.5" cy="13" r="2" fill="currentColor" /></svg>
          <b :class="$style.bigName">{{ $t('player__sound_effect_make_general') }}</b>
          <span :class="$style.bigDesc">{{ $t('player__sound_effect_make_general_desc') }}</span>
        </button>
        <button type="button" :class="$style.bigCard" @click="view = 'dj'">
          <svg :class="$style.bigIcon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" /></svg>
          <b :class="$style.bigName">{{ $t('player__sound_effect_make_dj') }}</b>
          <span :class="$style.bigDesc">{{ $t('player__sound_effect_make_dj_desc') }}</span>
        </button>
        <button type="button" :class="$style.bigCard" @click="handleMultiTrack">
          <svg :class="$style.bigIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v13M10 4v16M14 4v9M18 4v13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /><circle cx="6" cy="19" r="1.6" fill="currentColor" /><circle cx="10" cy="21" r="1.6" fill="currentColor" /><circle cx="14" cy="14" r="1.6" fill="currentColor" /><circle cx="18" cy="19" r="1.6" fill="currentColor" /></svg>
          <b :class="$style.bigName">{{ $t('player__sound_effect_make_multi') }}</b>
          <span :class="$style.bigDesc">{{ $t('player__sound_effect_make_multi_desc') }}</span>
        </button>
      </div>
      <footer :class="$style.homeFooter">
        <button type="button" :class="$style.footerLink" @click="importChain">{{ $t('player__sound_effect_make_import') }}</button>
        <button type="button" :class="$style.footerLink" @click="exportChain">{{ $t('player__sound_effect_make_upload') }}</button>
      </footer>
      <input ref="fileRef" type="file" accept=".json,application/json" style="display: none" @change="handleImportFile">
    </template>

    <!-- ===== 通用音效编辑器 ===== -->
    <template v-else-if="view === 'general'">
      <div :class="$style.subHeader">
        <button type="button" :class="$style.backBtn" :aria-label="$t('back')" @click="view = 'home'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <b :class="$style.subTitle">{{ $t('player__sound_effect_make_general') }}</b>
      </div>
      <div :class="$style.genToolbar">
        <input v-model="generalName" :class="$style.genName" type="text" :placeholder="$t('player__sound_effect_make_new_general')">
        <span :class="$style.genPhone">{{ $t('player__sound_effect_make_phone') }}</span>
        <button type="button" :class="[$style.genSwitch, { [$style.genSwitchOn]: chainEnabled }]" :aria-label="$t('player__sound_effect_make_enable_effect')" @click="toggleChainEnabled">
          <span :class="$style.genSwitchDot" />
        </button>
        <span :class="$style.genSwitchLabel">{{ $t('player__sound_effect_make_enable_effect') }}</span>
        <button type="button" :class="$style.genPill" @click="clearChain">{{ $t('player__sound_effect_make_clear') }}</button>
        <button type="button" :class="$style.genPill" @click="exportChain">{{ $t('player__sound_effect_make_export') }}</button>
      </div>
      <div v-if="showAddGrid" :class="$style.addArea">
        <div :class="$style.addHead">
          <b>{{ $t('player__sound_effect_make_add_effect') }}</b>
          <button type="button" :class="$style.addLocalBtn">{{ $t('player__sound_effect_make_add_local') }}</button>
        </div>
        <p :class="$style.addGroup">{{ $t('player__sound_effect_make_basic_effects') }}</p>
        <div :class="$style.fxGrid">
          <button
            v-for="fx in effectCatalog"
            :key="fx.id"
            type="button"
            :class="$style.fxBtn"
            @click="addEffect(fx)"
          >{{ $t('player__sound_effect_fx_' + fx.id) }}</button>
        </div>
      </div>
      <button v-else type="button" :class="$style.addBigBtn" @click="showAddGrid = true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
      </button>

      <div :class="$style.chainList">
        <div v-for="(item, index) in chain" :key="item.uid" :class="$style.chainItem">
          <button type="button" :class="$style.chainHead" @click="toggleExpand(item.uid)">
            <span>{{ $t('player__sound_effect_fx_' + item.fxId) }}</span>
            <svg :class="[$style.arrow, { [$style.arrowOpen]: expandUid === item.uid }]" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
          <button type="button" :class="$style.chainDelete" :aria-label="$t('player__sound_effect_delete')" @click="removeEffect(index)">&times;</button>
          <div v-if="expandUid === item.uid" :class="$style.paramArea">
            <label v-for="p in getFx(item.fxId).params" :key="p.key" :class="$style.paramRow">
              <span :class="$style.paramLabel">{{ $t(p.label) }}</span>
              <se-slider
                :class="$style.paramSlider"
                :value="item.params[p.key] ?? p.def"
                :min="p.min"
                :max="p.max"
                @change="setParam(item.uid, p.key, $event)"
              />
              <span :class="$style.paramValue">{{ item.params[p.key] ?? p.def }}</span>
            </label>
          </div>
        </div>
      </div>
    </template>

    <!-- ===== DJ 音效 ===== -->
    <template v-else-if="view === 'dj'">
      <div :class="$style.subHeader">
        <button type="button" :class="$style.backBtn" :aria-label="$t('back')" @click="view = 'home'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <b :class="$style.subTitle">{{ $t('player__sound_effect_make_dj') }}</b>
      </div>
      <div :class="$style.djGrid">
        <div :class="$style.djAdd">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
          <span>{{ $t('player__sound_effect_make_new_dj') }}</span>
        </div>
        <button
          v-for="card in djCards"
          :key="card.id"
          type="button"
          :class="[$style.djCard, $style[card.themeCls]]"
          @click="playDj(card.id)"
        >
          <b :class="$style.djName">{{ $t('player__sound_effect_dj_' + card.id) }}</b>
          <span :class="$style.djDesc">{{ $t('player__sound_effect_dj_' + card.id + '_desc') }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from '@common/utils/vueTools'
import { dialog } from '@renderer/plugins/Dialog'
import { playDjEffect } from '@renderer/plugins/player'
import SeSlider from './SeSlider.vue'

const view = ref<'home' | 'general' | 'dj'>('home')

// ===== 多轨混音（占位） =====
const handleMultiTrack = () => {
  void dialog({ message: window.i18n.t('player__sound_effect_make_multi_soon') })
}

// ===== 34 种基础音效器（QQ 银河音效名单） =====
// 支持实时应用：EQ 类（十段/30段）、低音类、高保真、声道平衡、环绕、混响（脉冲响应/混响器）、动态类（压缩/限制/推进）、变调
// 其余类型可添加保存，应用时忽略（面板标灰）
interface FxDef { id: string, params: Array<{ key: string, label: string, min: number, max: number, def: number }> }
const P = (key: string, label: string, min: number, max: number, def: number) => ({ key, label, min, max, def })
const EQ_BANDS: FxDef['params'] = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000].map((f: number, i: number) => P(`b${i}`, `player__sound_effect_fx_band_${f}`, -15, 15, 0))
const effectCatalog: FxDef[] = [
  { id: 'impulse', params: [P('wet', 'player__sound_effect_fx_param_wet', 0, 50, 20)] },
  { id: 'volume', params: [P('gain', 'player__sound_effect_fx_param_gain', 0, 200, 100)] },
  { id: 'rotary', params: [P('speed', 'player__sound_effect_fx_param_speed', 1, 50, 25)] },
  { id: 'limiter', params: [P('threshold', 'player__sound_effect_fx_param_threshold', 0, 50, 20)] },
  { id: 'stacker', params: [P('gain', 'player__sound_effect_fx_param_gain', 0, 200, 100)] },
  { id: 'eq30', params: EQ_BANDS },
  { id: 'exciter', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'stereo_wide', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'delay', params: [P('time', 'player__sound_effect_fx_param_time', 0, 1000, 200)] },
  { id: 'hifi', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'bass', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'surround', params: [P('amount', 'player__sound_effect_fx_param_amount', 1, 30, 5)] },
  { id: 'ambient', params: [P('wet', 'player__sound_effect_fx_param_wet', 0, 50, 20)] },
  { id: 'dynamic', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'balance', params: [P('pan', 'player__sound_effect_fx_param_pan', -50, 50, 0)] },
  { id: 'pitch', params: [P('rate', 'player__sound_effect_fx_param_rate', 50, 150, 100)] },
  { id: 'virtual_bass', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'lowpass', params: [P('freq', 'player__sound_effect_fx_param_freq', 100, 20000, 18000)] },
  { id: 'highpass', params: [P('freq', 'player__sound_effect_fx_param_freq', 20, 2000, 100)] },
  { id: 'bandpass', params: [P('freq', 'player__sound_effect_fx_param_freq', 100, 10000, 1000)] },
  { id: 'notch', params: [P('freq', 'player__sound_effect_fx_param_freq', 100, 10000, 1000)] },
  { id: 'lowshelf', params: [P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'highshelf', params: [P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'bell', params: [P('freq', 'player__sound_effect_fx_param_freq', 100, 10000, 1000), P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'tilt', params: [P('gain', 'player__sound_effect_fx_param_gain', -15, 15, 0)] },
  { id: 'super_bass', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'clear_vocal', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'wide_field', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'reverb', params: [P('wet', 'player__sound_effect_fx_param_wet', 0, 50, 20)] },
  { id: 'compressor', params: [P('threshold', 'player__sound_effect_fx_param_threshold', 0, 50, 20)] },
  { id: 'eq10', params: EQ_BANDS },
  { id: 'dynamic_eq', params: EQ_BANDS.slice(0, 4) },
  { id: 'spatial', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
  { id: 'chorus', params: [P('amount', 'player__sound_effect_fx_param_amount', 0, 50, 10)] },
]
const effectMap = computed(() => {
  const map: Record<string, FxDef> = {}
  for (const fx of effectCatalog) map[fx.id] = fx
  return map
})
const getFx = (id: string) => effectMap.value[id] ?? { params: [] }

// ===== 通用音效链（localStorage 持久化） =====
const CHAIN_KEY = 'lx_galaxy_general_chain'
const generalName = ref('') // 未命名音效
const chainEnabled = ref(false)
const chain = ref<Array<{ uid: string, fxId: string, params: Record<string, number> }>>([])
const showAddGrid = ref(false)
const expandUid = ref('')

const loadChain = () => {
  try {
    const raw = localStorage.getItem(CHAIN_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    chain.value = data.chain ?? []
    generalName.value = data.name ?? ''
    chainEnabled.value = !!data.enabled
  } catch {}
}
const persistChain = (enabled = chainEnabled.value) => {
  localStorage.setItem(CHAIN_KEY, JSON.stringify({ chain: chain.value, name: generalName.value, enabled }))
}
loadChain()

const toggleExpand = (uid: string) => {
  expandUid.value = expandUid.value === uid ? '' : uid
}
const addEffect = (fx: FxDef) => {
  const params: Record<string, number> = {}
  for (const p of fx.params) params[p.key] = p.def
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  chain.value = [...chain.value, { uid, fxId: fx.id, params }]
  expandUid.value = uid
  persistChain()
}
const removeEffect = (index: number) => {
  chain.value = chain.value.filter((_, i) => i !== index)
  persistChain()
}
const setParam = (uid: string, key: string, value: number) => {
  chain.value = chain.value.map(item => item.uid === uid ? { ...item, params: { ...item.params, [key]: Math.round(value) } } : item)
  persistChain()
}
const clearChain = () => {
  chain.value = []
  showAddGrid.value = false
  persistChain(false)
  chainEnabled.value = false
}

const toggleChainEnabled = () => {
  chainEnabled.value = !chainEnabled.value
  persistChain()
  // 通用音效的实时应用即将支持：当前开关仅保存状态，
  // 不写全局音效设置（避免与均衡器/推荐音效页的滑条互相覆盖）
  void dialog({ message: window.i18n.t('player__sound_effect_make_enable_soon') })
}

// ===== 导入 / 导出（JSON） =====
const fileRef = ref<HTMLInputElement | null>(null)
const exportChain = () => {
  const data = JSON.stringify({ type: 'lx-galaxy-general', name: generalName.value, chain: chain.value }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${generalName.value || 'sound-effect'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
const importChain = () => {
  fileRef.value?.click()
}
const handleImportFile = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result))
      if (data.type != 'lx-galaxy-general' || !Array.isArray(data.chain)) throw new Error('bad format')
      chain.value = data.chain
      generalName.value = data.name ?? ''
      persistChain()
      void dialog({ message: window.i18n.t('player__sound_effect_make_import_ok') })
    } catch {
      void dialog({ message: window.i18n.t('player__sound_effect_make_import_bad') })
    }
  }
  reader.readAsText(file)
  ;(event.target as HTMLInputElement).value = ''
}

// ===== DJ 音效 =====
type DjType = 'clap' | 'twist' | 'jump' | 'shake' | 'leg' | 'knock'
// id 显式收敛成字面量联合，避免模板里 card.id 被推断为 string 而无法传给 playDj
const djCards: Array<{ id: DjType, themeCls: string }> = [
  { id: 'clap', themeCls: 'djBlue' },
  { id: 'twist', themeCls: 'djTeal' },
  { id: 'jump', themeCls: 'djPink' },
  { id: 'shake', themeCls: 'djPurple' },
  { id: 'leg', themeCls: 'djIndigo' },
  { id: 'knock', themeCls: 'djGreen' },
]
const playDj = (type: DjType) => {
  playDjEffect(type)
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.content {
  user-select: none;
  min-width: 0;
}

// ===== 子页标题栏 =====
.subHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.backBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--se-text, #333);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, 150ms ease);

  svg { width: var(--qm-icon-sm); height: var(--qm-icon-sm); }
  &:hover { background-color: rgba(0, 0, 0, 0.06); }
}
.subTitle {
  flex: 1;
  text-align: center;
  margin-right: 30px;
  font-size: var(--se-fs-section, 14px);
  font-weight: 600;
  color: var(--se-text, #333);
}

// ===== 主页三卡片 =====
.cardGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 34px 10px 0;
}
.bigCard {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: 12px;
  padding: 30px 16px 26px;
  border: 1px solid transparent;
  border-radius: 4px;
  background-color: var(--se-field, #f8f8f8);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, 150ms ease), border-color var(--qm-t-fast, 150ms ease);

  &:hover {
    border-color: var(--se-accent, #1ecc94);
    background-color: var(--se-field-hover, #f1f1f1);
  }
}
.bigIcon {
  width: 40px;
  height: 40px;
  color: var(--se-text, #333);
}
.bigName {
  font-size: var(--se-fs-section, 14px);
  font-weight: 600;
  color: var(--se-text, #333);
}
.bigDesc {
  font-size: var(--se-fs-aux, 12px);
  line-height: 1.6;
  color: var(--se-text-weak, #666);
  text-align: center;
}
.homeFooter {
  display: flex;
  justify-content: center;
  gap: 40px;
  padding: 36px 0 8px;
}
.footerLink {
  border: none;
  background: transparent;
  font-size: var(--se-fs-body, 13px);
  color: var(--se-text-weak, #666);
  cursor: pointer;

  &:hover { color: var(--se-accent, #1ecc94); }
}

// ===== 通用音效编辑器 =====
.genToolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.genName {
  width: 160px;
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  background: var(--se-field, #f8f8f8);
  font-size: var(--se-fs-body, 13px);
  font-weight: 600;
  color: var(--se-text, #333);
  box-sizing: border-box;

  &:focus { outline: none; box-shadow: 0 0 0 2px rgba(30, 204, 148, 0.3); }
}
.genPhone {
  margin-left: auto;
  font-size: var(--se-fs-aux, 12px);
  color: var(--se-text-weak, #666);
}
.genSwitch {
  position: relative;
  width: 36px;
  height: 20px;
  border: none;
  border-radius: 999px;
  background-color: #d8d8d8;
  cursor: pointer;
  padding: 0;
  transition: background-color var(--qm-t-base, 200ms ease);

  .genSwitchDot {
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
  &.genSwitchOn {
    background-image: linear-gradient(90deg, #21d4b2, var(--se-accent-switch, #1edaaa));
    .genSwitchDot { left: 18px; }
  }
}
.genSwitchLabel {
  font-size: var(--se-fs-aux, 12px);
  color: var(--se-text-weak, #666);
}
.genPill {
  border: none;
  border-radius: 4px;
  padding: 6px 14px;
  background-color: var(--se-field, #f8f8f8);
  color: var(--se-text, #333);
  font-size: var(--se-fs-aux, 12px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, 150ms ease), color var(--qm-t-fast, 150ms ease);

  &:hover {
    background-color: var(--se-accent, #1ecc94);
    color: #fff;
  }
}

.addArea {
  margin-bottom: 14px;
}
.addHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  b {
    font-size: var(--se-fs-section, 14px);
    color: var(--se-text, #333);
  }
}
.addLocalBtn {
  border: none;
  border-radius: 4px;
  padding: 6px 14px;
  background-color: var(--se-accent, #1ecc94);
  color: #fff;
  font-size: var(--se-fs-aux, 12px);
  cursor: pointer;
}
.addGroup {
  margin: 0 0 8px;
  font-size: var(--se-fs-aux, 12px);
  color: var(--se-text-weak, #666);
}
.fxGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
.fxBtn {
  height: 30px;
  border: none;
  border-radius: 4px;
  background-color: var(--se-field, #f8f8f8);
  color: var(--se-text, #333);
  font-size: var(--se-fs-aux, 12px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, 150ms ease), color var(--qm-t-fast, 150ms ease);
  box-sizing: border-box;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 6px;

  &:hover {
    background-color: var(--se-field-hover, #f1f1f1);
    color: var(--se-accent, #1ecc94);
  }
}
.addBigBtn {
  width: 100%;
  height: 48px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background-color: var(--se-field, #f8f8f8);
  color: var(--se-text-weak, #666);
  cursor: pointer;

  svg { width: var(--qm-icon); height: var(--qm-icon); }
  &:hover {
    background-color: var(--se-field-hover, #f1f1f1);
    color: var(--se-text, #333);
  }
}

.chainList {
  display: flex;
  flex-flow: column nowrap;
  gap: 8px;
}
.chainItem {
  position: relative;
  border-radius: 4px;
  background-color: var(--se-field, #f8f8f8);
}
.chainHead {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 40px 10px 14px;
  border: none;
  background: transparent;
  color: var(--se-text, #333);
  font-size: var(--se-fs-body, 13px);
  cursor: pointer;

  &:hover { color: var(--se-accent, #1ecc94); }
}
.arrow {
  width: 16px;
  height: 16px;
  transition: transform var(--qm-t-fast, 150ms ease);

  &.arrowOpen { transform: rotate(180deg); }
}
.chainDelete {
  position: absolute;
  right: 12px;
  top: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--se-text-weak, #666);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background-color: #e74c3c;
    color: #fff;
  }
}
.paramArea {
  padding: 4px 14px 12px;
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
}
.paramRow {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.paramLabel {
  flex: none;
  width: 108px;
  font-size: var(--se-fs-body, 13px);
  color: var(--se-text, #333);
}
.paramSlider {
  flex: 1 1 auto;
  min-width: 0;
}
.paramValue {
  flex: none;
  width: 40px;
  text-align: right;
  font-size: var(--se-fs-aux, 12px);
  color: var(--se-text-weak, #666);
  font-variant-numeric: tabular-nums;
}

// ===== DJ 音效 =====
.djGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  padding-top: 16px;
}
.djAdd {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 112px;
  border-radius: 4px;
  background-color: var(--se-field, #f8f8f8);
  color: var(--se-text-weak, #666);
  font-size: var(--se-fs-body, 13px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, 150ms ease), color var(--qm-t-fast, 150ms ease);

  svg { width: var(--qm-icon); height: var(--qm-icon); }
  &:hover {
    background-color: var(--se-field-hover, #f1f1f1);
    color: var(--se-text, #333);
  }
}
.djCard {
  min-height: 112px;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color var(--qm-t-fast, 150ms ease), transform var(--qm-t-fast, 150ms ease);

  &:hover {
    border-color: var(--se-accent, #1ecc94);
    transform: translateY(-1px);
  }
  &:active { transform: scale(0.99); }
}
.djName {
  font-size: var(--se-fs-section, 14px);
  font-weight: 600;
  color: var(--se-text, #333);
}
.djDesc {
  font-size: var(--se-fs-aux, 12px);
  color: var(--se-text-weak, #666);
}

// DJ 卡底色：与精选卡同一档低饱和色，保持面板整体观感一致
.djBlue   { background-image: linear-gradient(160deg, #dfeaf6, #d2e1f2); }
.djTeal   { background-image: linear-gradient(160deg, #daefe9, #cee9e1); }
.djPink   { background-image: linear-gradient(160deg, #f7e3e2, #f2d8d6); }
.djPurple { background-image: linear-gradient(160deg, #e6e4f2, #dddaf0); }
.djIndigo { background-image: linear-gradient(160deg, #e0e4f1, #d8dcee); }
.djGreen  { background-image: linear-gradient(160deg, #e0efe2, #d5ead8); }
</style>
