<template>
  <!-- 参数化自定义皮肤 · 背景图层（渲染层）
       按「原图 + scale/offset/blur」参数在 GPU 上绘制背景；
       制作弹窗打开时优先渲染实时预览参数，实现毫秒级所见即所得 -->
  <div v-if="!!skin?.img" :class="$style.layer" aria-hidden="true">
    <img
      :src="skin.img"
      :class="$style.img"
      :style="imgStyle"
      draggable="false"
      alt=""
      @load="handleImgLoad"
      @dragstart.prevent
    >
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from '@common/utils/vueTools'
import { themeId, themeInfo, themeShouldUseDarkColors, skinLivePreview } from '@renderer/store'
import { appSetting } from '@renderer/store/setting'
import { findTheme } from '@renderer/store/utils'
import { computeSkinLayout, parseSkinParams } from '@common/utils/skinParams'
import { encodePath } from '@common/utils/common'
import { joinPath } from '@common/utils/nodejs'

// ===== 当前生效主题（含 auto 亮/暗解析） =====
const activeTheme = computed(() => {
  const id = themeId.value === 'auto'
    ? (themeShouldUseDarkColors.value ? appSetting['theme.darkId'] : appSetting['theme.lightId'])
    : themeId.value
  if (!id) return undefined
  return findTheme(themeInfo, id)
})

// ===== 皮肤数据源：实时预览优先，否则读当前已保存的主题参数 =====
const themeImgUrl = (fileName) => {
  if (!fileName || fileName === 'none' || !themeInfo.dataPath) return ''
  return `file:///${encodePath(joinPath(themeInfo.dataPath, fileName).replaceAll('\\', '/'))}`
}

const skin = computed(() => {
  // 制作弹窗实时预览（拖动/缩放/模糊即时生效）
  if (skinLivePreview.params && skinLivePreview.img) {
    return { img: skinLivePreview.img, params: skinLivePreview.params }
  }
  const theme = activeTheme.value
  const raw = theme?.config?.extInfo?.skinParams
  if (!raw) return null
  const params = parseSkinParams(raw)
  const img = themeImgUrl(theme?.config?.extInfo?.['--background-image'])
  if (!params || !img) return null
  return { img, params }
})

// ===== 窗口尺寸（视口） =====
const winW = ref(window.innerWidth || 1)
const winH = ref(window.innerHeight || 1)
const handleResize = () => {
  winW.value = window.innerWidth || 1
  winH.value = window.innerHeight || 1
}
onMounted(() => {
  window.addEventListener('resize', handleResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

// ===== 图片自然尺寸（选区等比换算用） =====
const natW = ref(0)
const natH = ref(0)
const handleImgLoad = (event) => {
  natW.value = event.target?.naturalWidth || 0
  natH.value = event.target?.naturalHeight || 0
}
watch(() => skin.value?.img, () => {
  natW.value = 0
  natH.value = 0
})

// ===== 参数 → 像素布局（选区 cover 视口、等比缩放不拉伸，与弹窗共用同一纯函数） =====
const imgStyle = computed(() => {
  const data = skin.value
  if (!data || !natW.value || !natH.value) return { visibility: 'hidden' }
  const layout = computeSkinLayout(data.params, winW.value, winH.value, natW.value, natH.value)
  return {
    width: layout.width + 'px',
    height: layout.height + 'px',
    left: layout.left + 'px',
    top: layout.top + 'px',
    filter: layout.blurPx > 0.2 ? `blur(${layout.blurPx.toFixed(2)}px)` : 'none',
    // blur 会让图层边缘出现半透明渐变：以中心等比放大，把透明边缘推出视口外
    transform: layout.blurZoom > 1 ? `scale(${layout.blurZoom.toFixed(4)})` : 'none',
  }
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
  // 模糊边缘 / 图片加载间隙的兜底底色（与 #root 兜底一致）
  background-color: var(--color-main-background, #F5F5F5);
}
.img {
  position: absolute;
  max-width: none;
  max-height: none;
  user-select: none;
  // 定位/模糊走合成器，拖动滑块时毫秒级响应
  will-change: transform, filter;
  transform-origin: center center;
}
</style>
