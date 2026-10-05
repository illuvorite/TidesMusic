<template>
  <!-- 音效制作：主页三卡片 / 通用音效编辑器 / DJ 音效 -->
  <div :class="$style.content">
    <!-- ===== 主页 ===== -->
    <template v-if="view === 'home'">
      <div :class="$style.cardGrid">
        <button type="button" :class="$style.bigCard" @click="openGeneral">
          <svg :class="$style.bigIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h3v14H5zM11 8h3v8h-3zM17 5h3v14h-3z" fill="none" stroke="currentColor" stroke-width="1.5" /><circle cx="6.5" cy="15" r="2" fill="currentColor" /><circle cx="12.5" cy="9" r="2" fill="currentColor" /><circle cx="18.5" cy="13" r="2" fill="currentColor" /></svg>
          <b :class="$style.bigName">{{ $t('player__sound_effect_make_general') }}</b>
          <span :class="$style.bigDesc">{{ $t('player__sound_effect_make_general_desc') }}</span>
          <span v-if="chainEnabled" :class="$style.bigBadge">{{ $t('player__sound_effect_make_live') }}</span>
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
        <input v-model="generalName" :class="$style.genName" type="text" :placeholder="$t('player__sound_effect_make_new_general')" @input="persist()">
        <button type="button" :class="[$style.genSwitch, { [$style.genSwitchOn]: chainEnabled }]" :aria-label="$t('player__sound_effect_make_enable_effect')" @click="toggleChainEnabled">
          <span :class="$style.genSwitchDot" />
        </button>
        <span :class="$style.genSwitchLabel">{{ $t('player__sound_effect_make_enable_effect') }}</span>
        <button type="button" :class="$style.genPill" @click="clearChain">{{ $t('player__sound_effect_make_clear') }}</button>
        <button type="button" :class="$style.genPill" @click="exportChain">{{ $t('player__sound_effect_make_export') }}</button>
      </div>

      <!-- 降级说明：把「哪些效果没有真的生效」直接讲清楚，而不是让用户自己猜 -->
      <div v-if="warnings.length" :class="$style.warnBox">
        <div v-for="(w, i) in warnings" :key="i" :class="$style.warnRow">
          <b v-if="w.fxId" :class="$style.warnName">{{ $t('player__sound_effect_fx_' + w.fxId) }}</b>
          <span>{{ warningText(w.kind) }}</span>
        </div>
      </div>

      <div v-if="showAddGrid" :class="$style.addArea">
        <div :class="$style.addHead">
          <b>{{ $t('player__sound_effect_make_add_effect') }}</b>
          <button type="button" :class="$style.addLocalBtn" @click="importChain">{{ $t('player__sound_effect_make_add_local') }}</button>
        </div>
        <p :class="$style.addGroup">{{ $t('player__sound_effect_make_basic_effects') }}</p>
        <div :class="$style.fxGrid">
          <button
            v-for="fx in effectCatalog"
            :key="fx.id"
            type="button"
            :class="$style.fxBtn"
            @click="addEffect(fx.id)"
          >{{ $t('player__sound_effect_fx_' + fx.id) }}</button>
        </div>
      </div>
      <button v-else type="button" :class="$style.addBigBtn" @click="showAddGrid = true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
      </button>

      <p v-if="!chain.length" :class="$style.emptyTip">{{ $t('player__sound_effect_make_empty') }}</p>
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
import { computed, onBeforeUnmount, ref } from '@common/utils/vueTools'
import { dialog } from '@renderer/plugins/Dialog'
import { playDjEffect } from '@renderer/plugins/player'
import {
  USER_CHAIN_MAX_ITEMS,
  USER_FX_CATALOG,
  compileUserChain,
  createUserChainItem,
  findUserFx,
  parseUserChain,
  serializeUserChain,
} from '@renderer/plugins/player/galaxy'
import type { UserChain, UserFxDef, UserChainWarning } from '@renderer/plugins/player/galaxy'
import {
  loadUserChainForEdit,
  saveUserChain,
  setUserChainEnabled,
} from '@renderer/plugins/player/galaxy/bridge'
import { appSetting } from '@renderer/store/setting'
import SeSlider from './SeSlider.vue'

const view = ref<'home' | 'general' | 'dj'>('home')

// ===== 多轨混音（占位） =====
const handleMultiTrack = () => {
  void dialog({ message: window.i18n.t('player__sound_effect_make_multi_soon') })
}

// ===== 效果器目录 =====
// 参数定义与实际 DSP 映射都集中在 galaxy/userChain.ts：
// 这一页只负责「编辑」，不关心每个效果如何落到 Web Audio 节点上。
const effectCatalog: UserFxDef[] = USER_FX_CATALOG
const getFx = (id: string) => findUserFx(id) ?? { id, params: [] }

// ===== 通用音效链（设置持久化，实时生效）=====
const generalName = ref('')
const chain = ref<UserChainItemList>([])
const showAddGrid = ref(false)
const expandUid = ref('')

type UserChainItemList = UserChain['items']

const chainEnabled = computed(() => appSetting['player.soundEffect.galaxy.userChain.enable'])

// 打开编辑器时从设置里载入
const load = () => {
  const saved = loadUserChainForEdit()
  chain.value = saved.items
  generalName.value = saved.name
}
load()

/**
 * 落盘。拖动滑杆时每次 change 都写设置会带来大量
 * 「设置变更 → 重算整条链 → 重建音频路由」的抖动，因此做 150ms 合并；
 * 开关/清空这类结构性操作立即写入（`persist(true)`）。
 */
let saveTimer: ReturnType<typeof setTimeout> | null = null
const persist = (immediate = false) => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  const write = () => { saveUserChain({ name: generalName.value, items: chain.value }) }
  if (immediate) write()
  else saveTimer = setTimeout(write, 150)
}
onBeforeUnmount(() => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    saveUserChain({ name: generalName.value, items: chain.value })
  }
})

const toggleExpand = (uid: string) => {
  expandUid.value = expandUid.value === uid ? '' : uid
}
const addEffect = (fxId: string) => {
  if (chain.value.length >= USER_CHAIN_MAX_ITEMS) {
    void dialog({ message: window.i18n.t('player__sound_effect_make_too_many') })
    return
  }
  const item = createUserChainItem(fxId)
  chain.value = [...chain.value, item]
  expandUid.value = item.uid
  persist(true)
}
const removeEffect = (index: number) => {
  chain.value = chain.value.filter((_, i) => i !== index)
  persist(true)
}
const setParam = (uid: string, key: string, value: number) => {
  chain.value = chain.value.map(item => item.uid === uid
    ? { ...item, params: { ...item.params, [key]: Math.round(value) } }
    : item)
  persist()
}
const clearChain = () => {
  chain.value = []
  showAddGrid.value = false
  setUserChainEnabled(false)
  persist(true)
}

const toggleChainEnabled = () => {
  if (!chainEnabled.value && chain.value.length === 0) {
    // 空链开启等于「什么都没发生」，直说比留一个没反应的开关好
    void dialog({ message: window.i18n.t('player__sound_effect_make_empty_chain') })
    return
  }
  persist(true)
  setUserChainEnabled(!chainEnabled.value)
}

// ===== 编译反馈 =====
// 直接把编译结果跑一遍给用户看：哪些效果真的生效、哪些只能近似、哪些没有落点。
// 一个「点了没反应但界面说已启用」的开关，比明说"不支持"要糟得多。
const compiled = computed(() => {
  if (chain.value.length === 0) return null
  return compileUserChain({ name: generalName.value, items: chain.value })
})
const warnings = computed<UserChainWarning[]>(() => compiled.value?.warnings ?? [])

const warningText = (kind: UserChainWarning['kind']): string => {
  const key = kind === 'dropped'
    ? 'player__sound_effect_make_warn_dropped'
    : kind === 'approximated'
      ? 'player__sound_effect_make_warn_approximated'
      : 'player__sound_effect_make_warn_overflow'
  return window.i18n.t(key)
}

// ===== 导入 / 导出（JSON） =====
const fileRef = ref<HTMLInputElement | null>(null)
const exportChain = () => {
  if (chain.value.length === 0) return
  persist(true)
  const data = serializeUserChain({ name: generalName.value, items: chain.value })
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
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    // 用与设置同一条解析路径：格式不对就明确报错，而不是载入半份数据
    const parsed = parseUserChain(reader.result)
    if (!parsed) {
      void dialog({ message: window.i18n.t('player__sound_effect_make_import_bad') })
    } else {
      chain.value = parsed.items
      generalName.value = parsed.name
      persist(true)
      void dialog({ message: window.i18n.t('player__sound_effect_make_import_ok') })
    }
  }
  reader.readAsText(file)
  input.value = ''
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
  position: relative;
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
// 「已实时生效」角标：让用户一眼知道这条链正在参与音频路径
.bigBadge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 6px;
  border-radius: 8px;
  background-color: var(--se-accent, #1ecc94);
  color: #fff;
  font-size: 10px;
  line-height: 1.4;
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

// 编译降级说明
.warnBox {
  margin-bottom: 14px;
  padding: 8px 12px;
  border-radius: 4px;
  background-color: var(--se-field, #f8f8f8);
  border-left: 3px solid #e8a33d;
}
.warnRow {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: var(--se-fs-aux, 12px);
  line-height: 1.9;
  color: var(--se-text-weak, #666);
}
.warnName {
  flex: none;
  color: var(--se-text, #333);
}

.emptyTip {
  margin: 4px 0 10px;
  font-size: var(--se-fs-aux, 12px);
  line-height: 1.7;
  color: var(--se-text-weak, #666);
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
