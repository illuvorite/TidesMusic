<template>
  <div :class="$style.page">
    <header :class="$style.titleRow">
      <button type="button" :class="[$style.titleMain, $style.titleActive]">
        {{ $t('theme_center_title') }}
      </button>
    </header>

    <nav :class="$style.tabRow">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="[$style.tab, { [$style.tabActive]: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
      <div :class="$style.tabRight">
        <button type="button" :class="$style.customLink" @click="openCustomSkin">{{ $t('theme_center_custom') }}</button>
        <button ref="opacityBtnRef" type="button" :class="$style.customLink" @click.stop="showOpacity = !showOpacity">{{ $t('theme_center_skin_opacity') }}</button>
        <base-popup v-model:visible="showOpacity" :btn-el="opacityBtnRef">
          <div ref="opacityPopRef" :class="$style.opacityPop" @mousedown.stop>
            <span :class="$style.opacityPopLabel">{{ $t('theme_center_skin_opacity') }}</span>
            <!-- 拖动仅更新本地与预览，松手才提交一次设置：杜绝任何来源的连续写入 -->
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              :value="localOpacity"
              :class="$style.opacitySlider"
              @input="handleOpacityInput($event)"
              @change="commitOpacity"
            >
            <span :class="$style.opacityValue">{{ localOpacity }}%</span>
          </div>
        </base-popup>
      </div>
    </nav>

    <!-- 推荐：内置主题（带壁纸的做大横幅卡，纯色的做宫格卡） -->
    <div v-show="activeTab === 'recommend'" class="scroll" :class="$style.scrollArea">
      <div v-if="bannerList.length" :class="$style.bannerRow">
        <div v-for="t in bannerList" :key="t.id" :class="$style.bannerCard" :style="t.bgStyle" @click="applyThemeById(t.id)">
          <base-btn :class="$style.bannerBtn" @click.stop="applyThemeById(t.id)">{{ $t('theme_center_use_now') }}</base-btn>
        </div>
      </div>
      <div :class="$style.sectionHead">
        <h3 :class="$style.sectionTitle">{{ $t('theme_center_tab_user') }}</h3>
      </div>
      <div :class="$style.cardGrid">
        <div :class="$style.cardItem" @click="applyThemeById('auto')" @contextmenu="isShowThemeSelectorModal = true">
          <div :class="[$style.cardBg, $style.autoBg, { [$style.cardActive]: themeId === 'auto' }]">
            <div :class="$style.autoLight" :style="{ backgroundColor: autoLightColor }" />
            <div :class="$style.autoDark" :style="{ backgroundColor: autoDarkColor }" />
            <span v-if="themeId === 'auto'" :class="$style.checkBadge">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </span>
          </div>
          <span :class="$style.cardName">{{ $t('theme_auto') }}</span>
        </div>
        <div v-for="t in builtinGrid" :key="t.id" :class="$style.cardItem" @click="applyThemeById(t.id)">
          <div :class="[$style.cardBg, { [$style.cardActive]: themeId === t.id }]" :style="t.bgStyle">
            <span v-if="themeId === t.id" :class="$style.checkBadge">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </span>
          </div>
          <span :class="$style.cardName">{{ t.name }}</span>
        </div>
        <div v-for="t in userGrid" :key="t.id" :class="$style.cardItem" @click="applyThemeById(t.id)" @contextmenu="handleEditTheme(t)">
          <div :class="[$style.cardBg, { [$style.cardActive]: themeId === t.id }]" :style="t.bgStyle">
            <button type="button" :class="$style.editBtn" :aria-label="$t('theme_edit_modal__title_edit')" @click.stop="handleEditTheme(t)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z" fill="currentColor" /></svg>
            </button>
            <span v-if="themeId === t.id" :class="$style.checkBadge">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </span>
          </div>
          <span :class="$style.cardName">{{ t.name }}</span>
        </div>
        <div :class="[$style.cardItem, $style.addCard]" @click="handleEditTheme()">
          <div :class="[$style.cardBg, $style.addBg]">
            <svg-icon name="plus" :class="$style.addIcon" />
          </div>
          <span :class="$style.cardName">{{ $t('theme_add') }}</span>
        </div>
      </div>
      <div v-if="!bannerList.length && !builtinGrid.length && !userGrid.length" :class="$style.empty">{{ $t('theme_center_empty') }}</div>
    </div>

    <!-- 其它：用户自定义主题（皮肤/纯色） -->
    <div v-show="activeTab === 'user'" class="scroll" :class="$style.scrollArea">
      <div v-if="userGrid.length" :class="$style.cardGrid">
        <div v-for="t in userGrid" :key="t.id" :class="$style.cardItem" @click="applyThemeById(t.id)" @contextmenu="handleEditTheme(t)">
          <div :class="[$style.cardBg, { [$style.cardActive]: themeId === t.id }]" :style="t.bgStyle">
            <button type="button" :class="$style.editBtn" :aria-label="$t('theme_edit_modal__title_edit')" @click.stop="handleEditTheme(t)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z" fill="currentColor" /></svg>
            </button>
            <span v-if="themeId === t.id" :class="$style.checkBadge">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </span>
          </div>
          <span :class="$style.cardName">{{ t.name }}</span>
        </div>
        <div :class="[$style.cardItem, $style.addCard]" @click="handleEditTheme()">
          <div :class="[$style.cardBg, $style.addBg]">
            <svg-icon name="plus" :class="$style.addIcon" />
          </div>
          <span :class="$style.cardName">{{ $t('theme_add') }}</span>
        </div>
      </div>
      <div v-else :class="$style.empty">{{ $t('theme_center_user_empty') }}</div>
    </div>

    <!-- 纯色：色板 -->
    <div v-show="activeTab === 'pure'" class="scroll" :class="$style.scrollArea">
      <div :class="$style.colorGrid">
        <button
          v-for="c in palette"
          :key="c.id"
          type="button"
          :class="[$style.colorItem, { [$style.colorActive]: themeId === c.id }]"
          :style="{ backgroundColor: c.hex }"
          :aria-label="c.hex"
          @click="applyColor(c)"
        >
          <span v-if="themeId === c.id" :class="$style.checkBadge">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
        </button>
      </div>
    </div>

    <custom-skin-modal v-model="isShowCustomSkinModal" :skin-id="skinEditId" @submit="refresh" />
    <theme-edit-modal v-model="isShowThemeEditModal" :theme-id="editThemeId" @submit="refresh" />
    <theme-selector-modal v-model="isShowThemeSelectorModal" />
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from '@common/utils/vueTools'
import { themeId, themeInfo } from '@renderer/store'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { getThemes, copyTheme, applyTheme, buildBgUrl, findTheme, applySkinSurface } from '@renderer/store/utils'
import { createThemeColors } from '@common/theme/utils'
import { saveTheme } from '@renderer/utils/ipc'
import { dialog } from '@renderer/plugins/Dialog'
import CustomSkinModal from '@renderer/views/Setting/components/CustomSkinModal.vue'
import ThemeEditModal from '@renderer/views/Setting/components/ThemeEditModal/index.vue'
import ThemeSelectorModal from '@renderer/views/Setting/components/ThemeSelectorModal.vue'

const activeTab = ref('recommend')
const isShowCustomSkinModal = ref(false)
const isShowThemeEditModal = ref(false)
const isShowThemeSelectorModal = ref(false)
const editThemeId = ref('')
const skinEditId = ref('')

const tabs = computed(() => {
  return [
    { id: 'recommend', label: window.i18n.t('theme_center_tab_recommend') },
    { id: 'user', label: window.i18n.t('theme_center_tab_user') },
    { id: 'pure', label: window.i18n.t('theme_center_tab_pure') },
  ]
})

// ===== 主题数据 =====
const bannerList = ref([])
const builtinGrid = ref([])
const userGrid = ref([])
const autoLightColor = ref('#31c27c')
const autoDarkColor = ref('#14171c')
let dataPath = ''

const bgOf = (t) => {
  const img = t.config.extInfo['--background-image']
  if (img === 'none' || !img) return { backgroundColor: t.config.themeColors['--color-theme'] }
  return {
    backgroundImage: t.isCustom ? buildBgUrl(img, dataPath) : img,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}

const toCard = (t, isUser) => {
  return {
    id: t.id,
    raw: t,
    name: isUser ? t.name : window.i18n.t('theme_' + t.id),
    bgStyle: bgOf(t),
  }
}

const refresh = () => {
  getThemes((info) => {
    dataPath = info.dataPath
    // 皮肤主题统一迁移为 cover 铺满全屏（历史 contain/100% 100% 数据）
    let skinMigrated = false
    info.userThemes.forEach(t => {
      if (isSkinTheme(t) && t.config.extInfo['--background-image-size'] !== 'cover') {
        t.config.extInfo['--background-image-size'] = 'cover'
        void saveTheme(t)
        skinMigrated = true
      }
    })
    const wallpaper = info.themes.filter(t => t.config.extInfo['--background-image'] !== 'none')
    const solid = info.themes.filter(t => t.config.extInfo['--background-image'] === 'none')
    bannerList.value = wallpaper.map(t => toCard(t, false))
    builtinGrid.value = solid.map(t => toCard(t, false))
    userGrid.value = info.userThemes.map(t => toCard(t, true))
    // 亮暗自动主题卡预览色
    let light = findTheme(info, appSetting['theme.lightId']) ?? info.themes.find(t => t.id == 'green')
    let dark = findTheme(info, appSetting['theme.darkId']) ?? info.themes.find(t => t.id == 'black')
    autoLightColor.value = light.config.themeColors['--color-theme']
    autoDarkColor.value = dark.config.themeColors['--color-theme']
    // 当前使用中的皮肤被迁移过 → 重新应用以刷新显示
    if (skinMigrated && info.userThemes.some(t => t.id === themeId.value)) {
      applyTheme(themeId.value, appSetting['theme.lightId'], appSetting['theme.darkId'], dataPath)
    }
  })
}

watch(() => [appSetting['theme.lightId'], appSetting['theme.darkId']], () => {
  refresh()
})

const applyThemeById = (id) => {
  if (themeId.value === id) return
  themeId.value = id
  applyTheme(id, appSetting['theme.lightId'], appSetting['theme.darkId'], dataPath)
  updateSetting({ 'theme.id': id })
}

// ===== 编辑 / 添加主题（自设置页整体移植） =====
// 皮肤类主题（自定义皮肤制作器产出的）应在皮肤制作器中编辑，而不是主题编辑器
const isSkinTheme = (t) => {
  return t.id.startsWith('user_skin_') || t.name === window.i18n.t('custom_skin_title')
}
const handleEditTheme = (theme) => {
  if (theme && isSkinTheme(theme)) {
    skinEditId.value = theme.id
    isShowCustomSkinModal.value = true
    return
  }
  if (theme) {
    editThemeId.value = theme.id
  } else {
    const manualCount = themeInfo.userThemes.filter(u => !u.id.startsWith('user_color_') && !isSkinTheme(u)).length
    if (manualCount >= 10) {
      void dialog({
        message: window.i18n.t('theme_max_tip'),
        confirmButtonText: window.i18n.t('alert_button_text'),
      })
      return
    }
    editThemeId.value = ''
  }
  isShowThemeEditModal.value = true
}
const openCustomSkin = () => {
  skinEditId.value = ''
  isShowCustomSkinModal.value = true
}

// ===== 纯色色板 =====
const hslToHex = (h, s, l) => {
  s /= 100
  l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const to = x => Math.round(255 * x).toString(16).padStart(2, '0')
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`
}
const isLightColor = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.56
}

const paletteRows = [320, 215, 95, 352, 42, 172, 22]
const palette = []
paletteRows.forEach((h, r) => {
  for (let j = 0; j < 10; j++) {
    const s = r === 6 ? Math.max(12, 34 - j * 2) : Math.max(24, 74 - j * 5)
    const l = 60 - j * 3
    const hex = hslToHex(h, s, l)
    palette.push({ hex, id: 'user_color_' + hex.replace('#', '') })
  }
})

const applyColor = (c) => {
  if (themeId.value === c.id) return
  const light = isLightColor(c.hex)
  const fontColor = light ? 'rgb(33, 33, 33)' : 'rgb(229, 229, 229)'
  getThemes(({ themes }) => {
    const existing = themeInfo.userThemes.find(u => u.id === c.id)
    const theme = existing ? copyTheme(existing) : copyTheme(themes[0])
    theme.id = c.id
    theme.name = c.hex
    theme.isCustom = true
    theme.isDark = false
    theme.isDarkFont = false
    theme.config.themeColors = createThemeColors(c.hex, fontColor, false, false)
    theme.config.extInfo['--background-image'] = 'none'
    theme.config.extInfo['--background-image-position'] = 'center'
    theme.config.extInfo['--background-image-size'] = 'cover'
    theme.config.extInfo['--color-app-background'] = 'var(--color-primary-light-600-alpha-700)'
    theme.config.extInfo['--color-nav-font'] = 'var(--color-primary)'

    const apply = () => {
      applyTheme(theme.id, appSetting['theme.lightId'], appSetting['theme.darkId'], dataPath)
      updateSetting({ 'theme.id': theme.id })
    }
    if (existing) {
      apply()
      return
    }
    void saveTheme(theme).then(() => {
      themeInfo.userThemes.push(theme)
      apply()
    })
  })
}

// ===== 皮肤透明度弹层 =====
const opacityBtnRef = ref(null)
const opacityPopRef = ref(null)
const showOpacity = ref(false)

// 拖动只更新本地值并实时预览，松手才提交一次设置：
// 拖动过程中不产生任何设置写入，杜绝连续写入导致的闪烁与取值乱跳
const localOpacity = ref(Math.round(appSetting['theme.skinOpacity'] ?? 82))
const handleOpacityInput = (event) => {
  localOpacity.value = Math.round(Number(event.target.value))
  applySkinSurface(localOpacity.value)
}
const commitOpacity = () => {
  if (localOpacity.value === Math.round(appSetting['theme.skinOpacity'] ?? -1)) return
  applySkinSurface(localOpacity.value)
  updateSetting({ 'theme.skinOpacity': localOpacity.value })
}
watch(() => appSetting['theme.skinOpacity'], (v) => {
  if (v != null) localOpacity.value = Math.round(v)
})

const handleDocDown = (event) => {
  if (!showOpacity.value) return
  const btn = opacityBtnRef.value
  const pop = opacityPopRef.value
  const target = event.target
  if (btn?.contains(target) || pop?.contains(target)) return
  showOpacity.value = false
}
onMounted(() => {
  refresh()
  document.addEventListener('mousedown', handleDocDown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocDown)
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
.page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  padding: 22px 30px 0;
  box-sizing: border-box;
  overflow: hidden;
}

// ===== 大标题行 =====
.titleRow {
  flex: none;
  display: flex;
  align-items: baseline;
  gap: 18px;
  margin-bottom: var(--qm-sp-2, 6px);
}
.titleMain {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: var(--qm-text-3, #888);
  transition: color @transition-fast;
}
.titleMain {
  font-size: 26px;
  font-weight: var(--qm-fw-semibold, 600);
  line-height: 1.3;
}
.titleActive {
  color: var(--qm-text-2);
}

// ===== tab 行 =====
.tabRow {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 26px;
  margin: 10px 0 14px;
}
.tab {
  position: relative;
  border: none;
  background: transparent;
  padding: 4px 2px 8px;
  font-size: var(--qm-fs-md, 14px);
  color: var(--qm-text-3, #888);
  cursor: pointer;
  transition: color @transition-fast;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%) scaleX(0);
    width: 22px;
    height: 3px;
    border-radius: var(--qm-radius-2xs, 4px);
    background-color: var(--qm-primary);
    transition: transform @transition-fast;
  }
  &:hover {
    color: var(--qm-text-2);
  }
  &.tabActive {
    color: var(--qm-text-2);
    &::after {
      transform: translateX(-50%) scaleX(1);
    }
  }
}
.tabRight {
  margin-left: auto;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-7, 16px);
}
.customLink {
  border: none;
  background: transparent;
  padding: 4px 2px;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-2);
  cursor: pointer;

  &:hover {
    color: var(--qm-primary);
  }
}
.opacityPop {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  padding: 12px 14px;
  min-width: 240px;

  .opacityPopLabel {
    flex: none;
    font-size: var(--qm-fs-xs, 12px);
    color: var(--qm-text-2);
  }
  .opacitySlider {
    flex: 1 1 auto;
    width: 140px;
    accent-color: var(--qm-primary);
    cursor: pointer;
  }
  .opacityValue {
    flex: none;
    width: 36px;
    font-size: var(--qm-fs-xs, 12px);
    text-align: right;
    color: var(--qm-text-3, #888);
  }
}

// ===== 滚动区 =====
.scrollArea {
  flex: auto;
  min-height: 0;
  padding-bottom: 18px;
}

// ===== 横幅卡 =====
.bannerRow {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  margin-bottom: var(--qm-sp-8, 20px);
}
.bannerCard {
  position: relative;
  height: 150px;
  border-radius: var(--qm-radius-sm, 8px);
  background-color: var(--qm-field, rgba(0, 0, 0, 0.08));
  background-size: cover;
  background-position: center;
  cursor: pointer;
  overflow: hidden;
  transition: transform @transition-fast;

  &:hover {
    transform: translateY(-2px);
  }
}
.bannerBtn {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
}

// ===== 宫格卡 =====
.sectionHead {
  margin: 6px 0 12px;

  .sectionTitle {
    margin: 0;
    font-size: 17px;
    font-weight: var(--qm-fw-semibold, 600);
    color: var(--qm-text-2);
  }
}
.cardGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: var(--qm-sp-8, 20px);
}
.cardItem {
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-3, 8px);
  cursor: pointer;
  min-width: 0;
}
.cardBg {
  position: relative;
  height: 96px;
  border-radius: var(--qm-radius-xs, 6px);
  border: 2px solid transparent;
  box-sizing: border-box;
  transition: border-color @transition-fast, transform @transition-fast;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);

    .editBtn {
      opacity: 1;
    }
  }
  &.cardActive {
    border-color: var(--qm-primary);
  }
}
.editBtn {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  padding: 0;
  background-color: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity @transition-fast, background-color @transition-fast;

  svg {
    width: var(--qm-icon-xs);
    height: var(--qm-icon-xs);
  }
  &:hover {
    background-color: rgba(0, 0, 0, 0.65);
  }
}
.autoBg {
  display: flex;

  .autoLight,
  .autoDark {
    flex: 1;
    height: 100%;
  }
}
.addBg {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--qm-line-dashed);
  background-color: transparent;

  .addIcon {
    width: 26px;
    height: 26px;
    color: var(--qm-primary);
  }
}
.checkBadge {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--qm-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: var(--qm-icon-xs);
    height: var(--qm-icon-xs);
  }
}
.cardName {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// ===== 纯色色板 =====
.colorGrid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 12px 10px;
}
.colorItem {
  position: relative;
  height: 34px;
  border: 2px solid transparent;
  border-radius: var(--qm-radius-xs, 6px);
  cursor: pointer;
  box-sizing: border-box;
  padding: 0;
  transition: border-color @transition-fast, transform @transition-fast;

  &:hover {
    transform: translateY(-2px);
  }
  &.colorActive {
    border-color: var(--qm-primary);
  }
}
.empty {
  padding: 40px 0;
  text-align: center;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-3, #888);
}
</style>
