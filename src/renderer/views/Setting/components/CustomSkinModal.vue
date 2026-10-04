<template>
  <teleport to="#root">
    <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div v-if="modelValue" :class="$style.container">
        <div :class="$style.mask" @click="handleCancel" />
        <div :class="$style.panel">
          <header :class="$style.header">
            <div :class="$style.titleWrap">
              <span :class="$style.title">{{ $t('custom_skin_title') }}</span>
              <span :class="$style.titleLine" />
            </div>
            <button type="button" :class="$style.closeBtn" aria-label="close" @click="handleCancel">
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                <path d="M5.8 5.8 18.2 18.2M18.2 5.8 5.8 18.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </button>
          </header>
          <!-- 预览区 = 画布：图片按原始比例 contain 完整显示；
               绿色边框是「视口」（最终主界面范围，窗口比例）：
               可整体拖动、四角圆点等比缩放，框内画面即皮肤背景 -->
          <div ref="areaRef" :class="$style.previewArea">
            <div v-if="!imgSrc" :class="$style.empty" @click="selectImage">
              <svg-icon name="plus" :class="$style.emptyIcon" />
              <span>{{ $t('custom_skin_pick_image') }}</span>
            </div>
            <template v-else>
              <img
                ref="imgRef"
                :src="imgSrc"
                :class="$style.img"
                :style="imgStyle"
                draggable="false"
                @load="handleImgLoad"
                @dragstart.prevent
              >
              <!-- 视口选框：拖动移动，四角圆点/四条边线均可等比缩放 -->
              <div
                v-if="imgLoaded"
                :class="$style.cropFrame"
                :style="frameStyle"
                @mousedown="handleBoxDown"
              >
                <span :class="$style.edge_t" @mousedown.stop="handleHandleDown('t', $event)" />
                <span :class="$style.edge_b" @mousedown.stop="handleHandleDown('b', $event)" />
                <span :class="$style.edge_l" @mousedown.stop="handleHandleDown('l', $event)" />
                <span :class="$style.edge_r" @mousedown.stop="handleHandleDown('r', $event)" />
                <span
                  v-for="h in handles"
                  :key="h"
                  :class="[$style.handle, $style[`handle_${h}`]]"
                  @mousedown.stop="handleHandleDown(h, $event)"
                />
              </div>
            </template>
          </div>

          <footer :class="$style.footer">
            <div :class="$style.footerLeft">
              <span :class="$style.label">{{ $t('custom_skin_text_color') }}</span>
              <span ref="font_color_ref" :class="$style.colorDot" />
              <span :class="$style.label">{{ $t('custom_skin_icon_color') }}</span>
              <span ref="primary_color_ref" :class="$style.colorDot" />
              <span :class="$style.label">{{ $t('custom_skin_blur') }}</span>
              <base-slider-bar :class="$style.blurSlider" :value="blurSlider" :min="0" :max="100" @change="blurSlider = $event" />
            </div>
            <div :class="$style.footerRight">
              <button type="button" :class="$style.btnGhost" @click="selectImage">{{ $t('custom_skin_reselect') }}</button>
              <button type="button" :class="$style.btnFinish" @click="handleFinish">{{ $t('custom_skin_finish') }}</button>
            </div>
          </footer>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from '@common/utils/vueTools'
import { showSelectDialog, saveTheme } from '@renderer/utils/ipc'
import { getThemes, copyTheme, applyTheme, findTheme, buildThemeColors } from '@renderer/store/utils'
import { themeInfo, skinLivePreview, themeShouldUseDarkColors } from '@renderer/store'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { createThemeColors } from '@common/theme/utils'
import {
  defaultSkinParams, clampSkinParams, blurSliderToParam, blurParamToSlider, stringifySkinParams, parseSkinParams,
} from '@common/utils/skinParams'
import { joinPath, checkAndCreateDir, copyFile, removeFile, extname } from '@common/utils/nodejs'
import { encodePath } from '@common/utils/common'
import useMainColor from './ThemeEditModal/useMainColor'
import useFontColor from './ThemeEditModal/useFontColor'

export default {
  name: 'CustomSkinModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    // 传入皮肤主题 id 时为编辑模式：载入该皮肤的原图与渲染参数，完成后原地更新
    skinId: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'submit'],
  setup(props, { emit }) {
    const areaRef = ref(null)
    const imgRef = ref(null)
    const imgSrc = ref('')
    const imgLoaded = ref(false)
    const natW = ref(0)
    const natH = ref(0)

    // ===== 皮肤参数：blur 独立存储；几何（scale/offset）由绿框状态实时导出 =====
    const blurParam = ref(0)
    const iconColor = ref('rgb(77, 175, 124)')
    const fontColor = ref('rgb(33, 33, 33)')
    const blurSlider = computed({
      get: () => blurParamToSlider(blurParam.value),
      set: (v) => {
        blurParam.value = blurSliderToParam(v)
      },
    })

    const { primary_color_ref, initMainColor, destroyMainColor } = useMainColor()
    const { font_color_ref, initFontColor, destroyFontColor } = useFontColor()
    const destroyPickers = () => {
      destroyMainColor()
      destroyFontColor()
    }

    // ===== 编辑模式 =====
    let dataPath = ''
    const editingTheme = ref(null)
    const editingFileName = ref('')
    // 用户选择的原图绝对路径（编辑且未换图时指向主题目录内的旧图，保存时不重复复制）
    let sourceFile = ''
    // 载入已保存皮肤时，图片 onload 后按参数恢复绿框位置
    let pendingRestore = false
    let pendingParams = null

    // ===== 预览区（画布）与视口（绿色选框，窗口比例，可拖动/缩放） =====
    const areaW = ref(0)
    const areaH = ref(0)
    const winAspect = ref((window.innerWidth || 16) / (window.innerHeight || 9))
    // 图片 contain 布局（完整显示、不变形）
    const dispW = ref(0)
    const dispH = ref(0)
    const imgX = ref(0)
    const imgY = ref(0)
    // 绿色选框（预览区坐标；w/h 锁定窗口宽高比）
    const frame = ref({ x: 0, y: 0, w: 0, h: 0 })
    const handles = ['tl', 'tr', 'bl', 'br']
    const MIN_CROP = 60

    const measureArea = () => {
      const area = areaRef.value
      if (!area) return
      areaW.value = area.clientWidth
      areaH.value = area.clientHeight
    }

    const fitImage = () => {
      const img = imgRef.value
      if (!img || !areaW.value || !img.naturalWidth) return
      const scale = Math.min(areaW.value / img.naturalWidth, areaH.value / img.naturalHeight) || 1
      dispW.value = img.naturalWidth * scale
      dispH.value = img.naturalHeight * scale
      imgX.value = (areaW.value - dispW.value) / 2
      imgY.value = (areaH.value - dispH.value) / 2
    }

    // 初始选框：图片内最大窗口比例矩形，居中
    const initCropBox = () => {
      const aspect = winAspect.value || 16 / 9
      let w = dispW.value
      let h = w / aspect
      if (h > dispH.value) {
        h = dispH.value
        w = h * aspect
      }
      frame.value = {
        x: imgX.value + (dispW.value - w) / 2,
        y: imgY.value + (dispH.value - h) / 2,
        w,
        h,
      }
    }

    const frameStyle = computed(() => {
      const f = frame.value
      return {
        left: f.x + 'px',
        top: f.y + 'px',
        width: f.w + 'px',
        height: f.h + 'px',
      }
    })

    // ===== 图片样式：contain + GPU 实时模糊（模糊半径按视口宽换算） =====
    const imgStyle = computed(() => {
      const f = frame.value
      if (!imgLoaded.value || !f.w) return { visibility: 'hidden' }
      const blurPx = blurParam.value * f.w
      const pad = blurPx * 2
      const longEdge = Math.max(dispW.value, dispH.value)
      const blurZoom = blurPx > 0.2 ? (longEdge + pad * 2) / longEdge : 1
      return {
        width: dispW.value + 'px',
        height: dispH.value + 'px',
        left: imgX.value + 'px',
        top: imgY.value + 'px',
        filter: blurPx > 0.2 ? `blur(${blurPx.toFixed(2)}px)` : 'none',
        // blur 边缘半透明补偿：以中心等比放大，把透明边缘推出视口外
        transform: blurZoom > 1 ? `scale(${blurZoom.toFixed(4)})` : 'none',
      }
    })

    // ===== 绿框几何 → 图片归一化选区（保存 / 实时预览共用） =====
    const frameToParams = () => {
      const f = frame.value
      if (!f.w || !f.h || !dispW.value || !dispH.value) return null
      return clampSkinParams({
        selX: (f.x - imgX.value) / dispW.value,
        selY: (f.y - imgY.value) / dispH.value,
        selW: f.w / dispW.value,
        selH: f.h / dispH.value,
        blur: blurParam.value,
      })
    }

    // 已保存参数 → 恢复绿框位置（编辑模式）
    const restoreFrame = (p) => {
      if (!dispW.value || !dispH.value) return
      frame.value = {
        x: imgX.value + p.selX * dispW.value,
        y: imgY.value + p.selY * dispH.value,
        w: p.selW * dispW.value,
        h: p.selH * dispH.value,
      }
    }

    const handleImgLoad = (event) => {
      natW.value = event.target?.naturalWidth || 0
      natH.value = event.target?.naturalHeight || 0
      imgLoaded.value = true
      measureArea()
      fitImage()
      if (pendingRestore) {
        pendingRestore = false
        restoreFrame(pendingParams || defaultSkinParams())
        pendingParams = null
      } else {
        initCropBox()
      }
    }

    // ===== 选框交互：拖动移动，四角等比缩放（对角锚点，限制在图片内） =====
    const drag = { down: false, mode: 'move', sx: 0, sy: 0, box: null, anchorX: 0, anchorY: 0 }

    const startDrag = (mode, event) => {
      if (!imgLoaded.value) return
      event.preventDefault()
      const f = frame.value
      drag.down = true
      drag.mode = mode
      drag.sx = event.clientX
      drag.sy = event.clientY
      drag.box = { ...f }
      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragUp)
    }

    const handleBoxDown = (event) => {
      startDrag('move', event)
    }

    const handleHandleDown = (mode, event) => {
      startDrag(mode, event)
    }

    const handleDragMove = (event) => {
      if (!drag.down) return
      const dx = event.clientX - drag.sx
      const dy = event.clientY - drag.sy
      const b = drag.box
      if (drag.mode === 'move') {
        const x = Math.min(Math.max(imgX.value, b.x + dx), imgX.value + dispW.value - b.w)
        const y = Math.min(Math.max(imgY.value, b.y + dy), imgY.value + dispH.value - b.h)
        frame.value = { ...b, x, y }
        return
      }
      // 自由缩放：角=改相邻两边，边=只改该边；对侧边为锚点，两轴独立 clamp
      const mode = drag.mode
      let { x, y, w, h } = b
      if (mode.includes('l')) {
        // 左边：x 跟随鼠标，右边（锚点）不动；宽 ≥ MIN_CROP 且左边不越图片左界
        x = Math.min(Math.max(b.x + dx, imgX.value), b.x + b.w - MIN_CROP)
        w = b.w - (x - b.x)
      } else if (mode.includes('r')) {
        // 右边：只改宽，左边（锚点）不动；右边不越图片右界
        w = Math.min(Math.max(b.w + dx, MIN_CROP), imgX.value + dispW.value - b.x)
      }
      if (mode.includes('t')) {
        y = Math.min(Math.max(b.y + dy, imgY.value), b.y + b.h - MIN_CROP)
        h = b.h - (y - b.y)
      } else if (mode.includes('b')) {
        h = Math.min(Math.max(b.h + dy, MIN_CROP), imgY.value + dispH.value - b.y)
      }
      frame.value = { x, y, w, h }
    }

    const handleDragUp = () => {
      if (!drag.down) return
      drag.down = false
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragUp)
    }

    const handleWindowResize = () => {
      winAspect.value = (window.innerWidth || 16) / (window.innerHeight || 9)
      if (!imgLoaded.value) {
        measureArea()
        return
      }
      // 窗口变化：重排图片与选框（构图重置为居中）
      measureArea()
      fitImage()
      initCropBox()
    }

    // ===== 选图 =====
    const selectImage = async() => {
      const result = await showSelectDialog({
        title: window.i18n.t('custom_skin_pick_image'),
        properties: ['openFile'],
        filters: [
          {
            name: 'Image File',
            extensions: [
              'jpg', 'jpeg', 'jfif', 'pjpeg',
              'pjp', 'png', 'apng', 'avif', 'gif', 'svg',
              'webp', 'bmp'],
          },
        ],
      })
      if (result.canceled || !result.filePaths[0]) return
      sourceFile = result.filePaths[0]
      imgLoaded.value = false
      imgSrc.value = encodePath(sourceFile)
    }

    // ===== 实时预览 =====
    // 1) 构图/模糊：由绿框几何导出参数写入 skinLivePreview，渲染层即时绘制主界面背景
    // 2) 颜色：pickr 回调频率低，直接以「当前主题全量变量 + 临时 themeColors」重注入
    const updateLivePreview = () => {
      if (!imgLoaded.value) return
      const p = frameToParams()
      if (!p) return
      skinLivePreview.img = imgSrc.value
      skinLivePreview.params = p
    }
    const currentThemeId = () => {
      return appSetting['theme.id'] === 'auto'
        ? (themeShouldUseDarkColors.value ? appSetting['theme.darkId'] : appSetting['theme.lightId'])
        : appSetting['theme.id']
    }
    const applyLiveColors = () => {
      const theme = findTheme(themeInfo, currentThemeId())
      if (!theme) return
      const colors = buildThemeColors(theme, dataPath || themeInfo.dataPath)
      Object.assign(colors, createThemeColors(iconColor.value, fontColor.value, false, false))
      window.setTheme(colors)
    }
    const revertPreview = () => {
      skinLivePreview.params = null
      skinLivePreview.img = ''
      applyTheme(appSetting['theme.id'], appSetting['theme.lightId'], appSetting['theme.darkId'], dataPath)
    }

    // ===== 完成制作：序列化配置（原图 + 参数 JSON）并应用 =====
    const handleFinish = () => {
      if (!imgLoaded.value || !sourceFile) return
      const finalParams = frameToParams()
      if (!finalParams) return
      const existing = editingTheme.value

      void (async() => {
        const dir = themeInfo.dataPath || dataPath
        await checkAndCreateDir(dir)

        // 原图入库：仅在更换了图片时复制（编辑未换图则继续引用旧文件）
        const oldFile = editingFileName.value
        const oldPath = oldFile ? joinPath(dir, oldFile) : ''
        const isSameFile = oldPath && sourceFile.replaceAll('/', '\\').toLowerCase() === oldPath.replaceAll('/', '\\').toLowerCase()
        let fileName = oldFile
        if (!isSameFile) {
          const ext = extname(sourceFile) || '.jpg'
          fileName = `skin_${Date.now()}${ext}`
          await copyFile(sourceFile, joinPath(dir, fileName))
          if (oldFile && oldFile !== fileName) {
            void removeFile(oldPath).catch(() => {})
          }
        }

        getThemes(({ themes }) => {
          const theme = existing ? copyTheme(existing) : copyTheme(themes[0])
          if (!existing) {
            theme.id = 'user_skin_' + Date.now()
            theme.name = window.i18n.t('custom_skin_title')
            theme.isCustom = true
            theme.isDark = false
            theme.isDarkFont = false
            themeInfo.userThemes.push(theme)
          }
          theme.config.themeColors = createThemeColors(iconColor.value, fontColor.value, false, false)
          theme.config.extInfo['--background-image'] = fileName
          theme.config.extInfo['--background-image-position'] = 'center'
          theme.config.extInfo['--background-image-size'] = 'auto'
          theme.config.extInfo['--color-nav-font'] = 'var(--color-primary)'
          // 参数化配置：下次启动由渲染层按参数重新注入原图，模糊/构图随时可再编辑
          theme.config.extInfo.skinParams = stringifySkinParams(finalParams)

          void (async() => {
            await saveTheme(theme)
            const idx = themeInfo.userThemes.findIndex(u => u.id === theme.id)
            if (idx > -1) themeInfo.userThemes.splice(idx, 1, theme)
            skinLivePreview.params = null
            skinLivePreview.img = ''
            applyTheme(theme.id, appSetting['theme.lightId'], appSetting['theme.darkId'], themeInfo.dataPath)
            updateSetting({ 'theme.id': theme.id })
            emit('submit')
            emit('update:modelValue', false)
          })()
        })
      })()
    }

    const handleCancel = () => {
      emit('update:modelValue', false)
    }

    const initPickers = () => {
      initMainColor(iconColor.value, (color) => {
        iconColor.value = color
        applyLiveColors()
      })
      initFontColor(fontColor.value, (color) => {
        fontColor.value = color
        applyLiveColors()
      })
    }

    // ===== 打开 / 关闭 =====
    watch(() => props.modelValue, (val) => {
      if (val) {
        getThemes((info) => {
          dataPath = info.dataPath
          // 编辑模式：载入皮肤主题的原图与渲染参数
          const skin = props.skinId ? findTheme(themeInfo, props.skinId) : null
          editingTheme.value = skin ?? null
          editingFileName.value = skin && skin.config.extInfo['--background-image'] !== 'none'
            ? skin.config.extInfo['--background-image']
            : ''
          if (skin) {
            iconColor.value = skin.config.themeColors['--color-primary']
            fontColor.value = skin.config.themeColors['--color-1000'] ?? 'rgb(33, 33, 33)'
            const restored = parseSkinParams(skin.config.extInfo.skinParams)
            pendingRestore = true
            pendingParams = restored
            blurParam.value = restored?.blur ?? 0
            sourceFile = editingFileName.value
              ? joinPath(dataPath, editingFileName.value)
              : ''
            imgLoaded.value = false
            // 注意：不能直接用 buildBgUrl（返回带 url() 包装的 CSS 值）
            imgSrc.value = editingFileName.value
              ? `file:///${encodePath(sourceFile.replaceAll('\\', '/'))}`
              : ''
          } else {
            editingFileName.value = ''
            sourceFile = ''
            blurParam.value = 0
          }
          void nextTick(() => {
            measureArea()
            initPickers()
          })
        })
      } else {
        destroyPickers()
        editingTheme.value = null
        editingFileName.value = ''
        // 预览过则还原为当前已保存的主题
        if (skinLivePreview.params) revertPreview()
      }
    })

    // 构图/模糊变化 → 实时预览（响应式，无防抖）
    watch(frame, updateLivePreview, { deep: true })
    watch(blurParam, updateLivePreview)
    watch(imgLoaded, updateLivePreview)

    onMounted(() => {
      window.addEventListener('resize', handleWindowResize)
    })

    onBeforeUnmount(() => {
      destroyPickers()
      window.removeEventListener('resize', handleWindowResize)
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragUp)
      if (skinLivePreview.params) revertPreview()
    })

    return {
      areaRef,
      imgRef,
      imgSrc,
      imgLoaded,
      imgStyle,
      frameStyle,
      handles,
      blurSlider,
      selectImage,
      handleImgLoad,
      handleBoxDown,
      handleHandleDown,
      handleFinish,
      handleCancel,

      primary_color_ref,
      font_color_ref,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

// 截图复刻：视口边框与完成按钮的固定绿色（不随主题色变化）
@skin-green: #3faf7c;
@skin-green-btn: #2ad17e;

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
.panel {
  position: relative;
  width: 740px;
  max-width: 94%;
  display: flex;
  flex-flow: column nowrap;
  background-color: var(--qm-card, #fff);
  border-radius: var(--qm-radius-sm, 8px);
  box-shadow: var(--qm-shadow-3, 0 12px 32px rgba(0, 0, 0, 0.2));
  overflow: hidden;
}
.header {
  flex: none;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 22px 22px 0 30px;
}
.titleWrap {
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-start;
}
.title {
  font-size: var(--qm-fs-md, 14px);
  line-height: 20px;
  font-weight: var(--qm-fw-medium, 500);
  color: var(--color-primary);
}
.titleLine {
  width: 24px;
  height: 4px;
  border-radius: var(--qm-radius-2xs, 4px);
  background-color: var(--color-primary);
  margin-top: var(--qm-sp-2, 6px);
}
.closeBtn {
  flex: none;
  width: 28px;
  height: 28px;
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #999;
  cursor: pointer;
  transition: color @transition-fast, background-color @transition-fast;

  &:hover {
    color: #555;
    background-color: rgba(0, 0, 0, 0.05);
  }
}

// 画布：绿框（视口）之外的部分是工作区，衬灰色
.previewArea {
  position: relative;
  height: 415px;
  margin: 10px 14px 0;
  background-color: rgb(216, 216, 216);
  overflow: hidden;
  user-select: none;
}
.empty {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: var(--qm-sp-4, 10px);
  color: rgb(120, 120, 120);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;

  .emptyIcon {
    width: 28px;
    height: 28px;
  }
  &:hover {
    color: var(--color-primary);
  }
}
.img {
  position: absolute;
  display: block;
  max-width: none;
  max-height: none;
  transform-origin: center center;
  will-change: transform, filter;
}
// 视口选框（最终主界面范围，窗口比例）：拖动移动，四角圆点等比缩放
.cropFrame {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid @skin-green;
  box-shadow: 0 0 0 3000px rgba(0, 0, 0, 0.06);
  cursor: move;
}
.handle {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: @skin-green;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.65);
}
// 四条边线的缩放热区（细条覆盖边线，光标提示）
.edge_t {
  position: absolute;
  left: 0;
  right: 0;
  top: -3px;
  height: 7px;
  cursor: ns-resize;
}
.edge_b {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 7px;
  cursor: ns-resize;
}
.edge_l {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -3px;
  width: 7px;
  cursor: ew-resize;
}
.edge_r {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -3px;
  width: 7px;
  cursor: ew-resize;
}
.handle_tl {
  left: -4px;
  top: -4px;
  cursor: nwse-resize;
}
.handle_tr {
  right: -4px;
  top: -4px;
  cursor: nesw-resize;
}
.handle_bl {
  left: -4px;
  bottom: -4px;
  cursor: nesw-resize;
}
.handle_br {
  right: -4px;
  bottom: -4px;
  cursor: nwse-resize;
}

.footer {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--qm-sp-5, 12px);
  padding: 14px 24px 16px 30px;
}
.footerLeft {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 9px;
}
.label {
  flex: none;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-2);
}
.colorDot {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: var(--qm-radius-2xs, 4px);
  background-color: var(--pcr-color);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}
.blurSlider {
  flex: 0 1 150px;
}
.footerRight {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
}
.btnGhost {
  border: none;
  border-radius: var(--qm-radius-2xs, 4px);
  padding: 8px 18px;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-2, #333);
  background-color: #f0f0f0;
  cursor: pointer;
  transition: background-color @transition-fast;

  &:hover {
    background-color: #e4e4e4;
  }
  &:active {
    background-color: #dadada;
  }
}
.btnFinish {
  border: none;
  border-radius: var(--qm-radius-2xs, 4px);
  padding: 8px 18px;
  font-size: var(--qm-fs-sm, 13px);
  color: #fff;
  background-color: @skin-green-btn;
  cursor: pointer;
  transition: background-color @transition-fast;

  &:hover {
    background-color: #26be72;
  }
  &:active {
    background-color: #21ad67;
  }
}
</style>
