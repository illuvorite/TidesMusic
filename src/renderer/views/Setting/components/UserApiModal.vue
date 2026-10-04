<template lang="pug">
material-modal(:show="modelValue" bg-close teleport="#root" max-width="620px" min-width="320px" max-height="88%" @close="handleClose")
  main(:class="$style.main")
    //- 头部：图标徽章 + 标题 + 数量
    header(:class="$style.head")
      span(:class="$style.headIcon")
        svg(v-once viewBox="0 0 24 24" aria-hidden="true")
          path(d="M10.5 3.5a2 2 0 1 1 4 0V5h2.5A1.5 1.5 0 0 1 18.5 6.5V9h-1.5a2 2 0 1 0 0 4h1.5v2.5a1.5 1.5 0 0 1-1.5 1.5H14.5v-1.5a2 2 0 1 0-4 0V17H8A1.5 1.5 0 0 1 6.5 15.5V13H5a2 2 0 1 1 0-4h1.5V6.5A1.5 1.5 0 0 1 8 5h2.5V3.5z" fill="currentColor")
      div(:class="$style.headText")
        h2(:class="$style.title") {{ $t('user_api__title') }}
      span(v-if="apiList.length" :class="$style.count") {{ apiList.length }}

    //- 音源列表（可滚动区域）
    ul(v-if="apiList.length" :class="$style.list")
      li(v-for="(api, index) in apiList" :key="api.id" :class="[$style.item, {[$style.active]: appSetting['common.apiSource'] == api.id}]" :style="{ animationDelay: `${Math.min(index, 8) * 35}ms` }")
        span(:class="$style.accent" aria-hidden="true")
        div(:class="$style.info")
          div(:class="$style.titleRow")
            h3(:class="$style.name") {{ api.name }}
            span(v-if="api.version" :class="$style.version") {{ /^\d/.test(api.version) ? `v${api.version}` : api.version }}
            span(v-if="api.author" :class="$style.author") {{ api.author }}
          p(v-if="api.description" :class="$style.desc") {{ api.description }}
          div(:class="$style.itemActions")
            base-checkbox(:id="`user_api_${api.id}`" v-model="api.allowShowUpdateAlert" :class="$style.checkbox" :label="$t('user_api__allow_show_update_alert')" @change="handleChangeAllowUpdateAlert(api, $event)")
        button(:class="$style.remove" type="button" :aria-label="$t('user_api__btn_remove')" :title="$t('user_api__btn_remove')" @click.stop="handleRemove(index)")
          svg(v-once version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" viewBox="0 0 212.982 212.982" space="preserve")
            use(xlink:href="#icon-delete")

    //- 空态
    div(v-else :class="$style.empty")
      svg(v-once :class="$style.emptyIcon" viewBox="0 0 24 24" aria-hidden="true")
        circle(cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 3")
        path(d="M12 8.5v7M8.5 12h7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round")
      span(:class="$style.emptyText") {{ $t('user_api__noitem') }}

    //- 说明区
    section(:class="$style.note")
      p(:class="$style.noteLine")
        span {{ $t('user_api__readme') }}
        button(:class="$style.link" type="button" aria-label="https://lxmusic.toside.cn/desktop/custom-source" @click="handleOpenUrl('https://lyswhut.github.io/lx-music-doc/desktop/custom-source')")
          | FAQ
          svg(v-once :class="$style.linkIcon" viewBox="0 0 24 24" aria-hidden="true")
            path(d="M14 4h6v6M20 4l-8.5 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round")
            path(d="M18 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round")
      p(:class="$style.noteLine") {{ $t('user_api__note') }}

    //- 底部操作
    footer(:class="$style.footer")
      base-btn(:class="$style.footerBtn" @click="isShowOnlineImportModal = true") {{ $t('user_api__btn_import_online') }}
      base-btn(:class="[$style.footerBtn, $style.footerBtnGhost]" @click="handleImport") {{ $t('user_api__btn_import') }}
      //- base-btn(:class="$style.footerBtn" @click="handleExport") {{ $t('user_api__btn_export') }}
    UserApiOnlineImportModal(v-model:show="isShowOnlineImportModal" @import="importUserApi")
</template>

<script>
import { importUserApi, removeUserApi, showSelectDialog, setAllowShowUserApiUpdateAlert } from '@renderer/utils/ipc'
import { readFile } from '@common/utils/nodejs'
import { openUrl } from '@common/utils/electron'
import apiSourceInfo from '@renderer/utils/musicSdk/api-source-info'
import { userApi } from '@renderer/store'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { computed, ref } from '@common/utils/vueTools'
import { dialog } from '@renderer/plugins/Dialog'

import UserApiOnlineImportModal from './UserApiOnlineImportModal.vue'

export default {
  components: {
    UserApiOnlineImportModal,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup() {
    const isShowOnlineImportModal = ref(false)
    const apiList = computed(() => userApi.list)

    return {
      userApi,
      apiList,
      appSetting,
      isShowOnlineImportModal,
    }
  },
  methods: {
    async importUserApi(script) {
      return importUserApi(script).then(({ apiList }) => {
        userApi.list = apiList
      }).catch((err) => {
        void dialog(this.$t('user_api_import__failed', { message: err.message }))
      })
    },
    handleImport() {
      if (this.userApi.list.length > 20) {
        this.$dialog({
          message: this.$t('user_api__max_tip'),
          confirmButtonText: this.$t('ok'),
        })
        return
      }
      void showSelectDialog({
        title: this.$t('user_api__import_file'),
        properties: ['openFile'],
        filters: [
          { name: 'LX API File', extensions: ['js'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      }).then(async result => {
        if (result.canceled) return
        return readFile(result.filePaths[0]).then(async data => {
          return this.importUserApi(data.toString())
        })
      })
    },
    handleExport() {

    },
    async handleRemove(index) {
      const api = this.apiList[index]
      if (!api) return
      if (appSetting['common.apiSource'] == api.id) {
        let backApi = apiSourceInfo.find(api => !api.disabled)
        if (!backApi) backApi = userApi.list[0]
        updateSetting({ 'common.apiSource': backApi?.id ?? '' })
      }
      userApi.list = await removeUserApi([api.id])
    },
    handleClose() {
      this.$emit('update:modelValue', false)
    },
    handleOpenUrl(url) {
      void openUrl(url)
    },
    handleChangeAllowUpdateAlert(api, enable) {
      void setAllowShowUserApiUpdateAlert(api.id, enable)
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

// ============================================================
//  自定义源管理弹窗
//  结构：头部（固定） / 列表（弹性滚动） / 说明 / 底部操作（固定）
//  这样无论音源多少，弹窗高度都受控，说明与按钮不会再被内容顶掉或互相覆盖
// ============================================================
.main {
  display: flex;
  flex-flow: column nowrap;
  width: 560px;
  max-width: min(92vw, 560px);
  min-width: 300px;
  min-height: 240px;
  // 留出上下呼吸空间，避免弹窗顶满窗口
  max-height: min(78vh, 720px);
  box-sizing: border-box;
  color: var(--qm-text-1);
  user-select: none;
}

// -------- 头部 --------
.head {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  padding: 18px 20px 14px;
}

.headIcon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--qm-radius-card);
  background-color: var(--qm-primary-soft);
  color: var(--qm-primary);
  transition: background-color var(--qm-t-fast);

  svg {
    width: 17px;
    height: 17px;
  }
}

.headText {
  flex: auto;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: var(--qm-fs-xl, 16px);
  font-weight: var(--qm-fw-semibold, 600);
  line-height: 1.3;
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.count {
  flex: none;
  min-width: 22px;
  height: 20px;
  padding: 0 7px;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--qm-radius-chip);
  background-color: var(--qm-field);
  color: var(--qm-text-3);
  font-size: var(--qm-font-badge);
  font-weight: var(--qm-fw-semibold, 600);
  font-variant-numeric: tabular-nums;
}

// -------- 列表 --------
.list {
  flex: 1 1 auto;
  min-height: 96px;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0;
  padding: 2px 12px 14px;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-3, 8px);
  scrollbar-gutter: stable;
  // 底部渐隐：列表被裁切时给出「还有内容」的视觉暗示，避免卡片被拦腰切断的突兀感
  mask-image: linear-gradient(to bottom, #000 calc(100% - 18px), transparent 100%);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: var(--qm-line-2);
    border-radius: var(--qm-radius-chip);
  }
}

.item {
  position: relative;
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: flex-start;
  gap: var(--qm-sp-4, 10px);
  padding: 12px 10px 12px 14px;
  border: 1px solid var(--qm-line-1);
  border-radius: var(--qm-radius-card);
  background-color: var(--qm-card);
  overflow: hidden;
  // 注意：fill-mode 必须用 backwards —— 用 both/forwards 会让关键帧里的 transform
  // 在动画结束后持续生效，从而覆盖 hover 的上浮与按压反馈
  animation: itemIn 240ms var(--qm-t-base) backwards;
  transition: border-color var(--qm-t-fast), background-color var(--qm-t-fast), box-shadow var(--qm-t-fast), transform var(--qm-t-fast);

  &:hover {
    border-color: var(--qm-primary-border);
    box-shadow: var(--qm-shadow-1);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0) scale(0.995);
  }

  &.active {
    border-color: var(--qm-primary-border);
    background-color: var(--qm-primary-soft);

    .accent {
      transform: scaleY(1);
    }
  }

  @keyframes itemIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

// 左侧强调条：仅在当前使用的音源上出现
.accent {
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background-color: var(--qm-primary);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform var(--qm-t-base);
}

.info {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
}

.titleRow {
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  min-width: 0;
}

.name {
  margin: 0;
  font-size: var(--qm-fs-md, 14px);
  font-weight: var(--qm-fw-semibold, 600);
  line-height: 1.4;
  color: var(--qm-text-1);
  word-break: break-all;
}

.version,
.author {
  flex: none;
  padding: 1px 7px;
  border-radius: var(--qm-radius-chip);
  font-size: var(--qm-font-badge);
  line-height: 1.5;
  white-space: nowrap;
}

.version {
  background-color: var(--qm-primary-soft);
  color: var(--qm-primary);
}

.author {
  background-color: var(--qm-field);
  color: var(--qm-text-3);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desc {
  margin: 6px 0 0;
  font-size: var(--qm-font-aux);
  line-height: 1.6;
  color: var(--qm-text-3);
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.itemActions {
  margin-top: var(--qm-sp-3, 8px);
}

.checkbox {
  font-size: var(--qm-font-aux);
  color: var(--qm-text-2);
  opacity: 1;
}

.remove {
  flex: none;
  // 与标题行视觉居中对齐（卡片为 flex-start 对齐，这里做 2px 光学修正）
  margin-top: -2px;
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--qm-radius-sm, 8px);
  background-color: transparent;
  color: var(--qm-text-4);
  cursor: pointer;
  outline: none;
  transition: background-color var(--qm-t-fast), border-color var(--qm-t-fast), color var(--qm-t-fast), transform var(--qm-t-fast);

  svg {
    width: 12px;
    height: 12px;
    fill: currentColor;
  }

  &:hover {
    background-color: color-mix(in srgb, var(--color-danger) 12%, transparent);
    border-color: color-mix(in srgb, var(--color-danger) 32%, transparent);
    color: var(--color-danger);
  }
  &:active {
    transform: scale(0.92);
  }
  // 键盘可达性：仅在键盘聚焦时显示焦点环，鼠标点击不出现
  &:focus-visible {
    color: var(--color-danger);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-danger) 35%, transparent);
  }
}

// -------- 空态 --------
.empty {
  flex: 1 1 auto;
  min-height: 140px;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  gap: var(--qm-sp-4, 10px);
  padding: 24px 20px;
}

.emptyIcon {
  width: 40px;
  height: 40px;
  color: var(--qm-text-5);
}

.emptyText {
  font-size: var(--qm-font-meta);
  color: var(--qm-text-4);
  text-align: center;
  line-height: 1.6;
}

// -------- 说明区 --------
.note {
  flex: none;
  margin: 0 20px 14px;
  padding: 10px 12px;
  border-radius: var(--qm-radius-card);
  background-color: var(--qm-field);
  color: var(--qm-text-3);
  font-size: var(--qm-font-aux);
  line-height: 1.6;

  p + p {
    margin-top: var(--qm-sp-2, 6px);
  }
}

.noteLine {
  margin: 0;
  word-break: break-all;
}

.link {
  display: inline-flex;
  align-items: center;
  gap: var(--qm-sp-0, 2px);
  margin-left: var(--qm-sp-2, 6px);
  padding: 0;
  border: 0;
  background: none;
  color: var(--qm-primary);
  font-size: inherit;
  font-weight: var(--qm-fw-semibold, 600);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--qm-t-fast);

  &:hover {
    color: var(--qm-primary-hover);
  }
  &:focus-visible {
    outline: 2px solid var(--qm-primary);
    outline-offset: 2px;
    border-radius: var(--qm-radius-2xs, 4px);
  }
}

// 键盘聚焦时的统一焦点环（按钮类元素）
.footerBtn:focus-visible {
  box-shadow: 0 0 0 2px var(--qm-card), 0 0 0 4px var(--qm-primary);
}

.linkIcon {
  width: 11px;
  height: 11px;
}

// -------- 底部操作 --------
.footer {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  gap: var(--qm-sp-5, 12px);
  padding: 14px 20px 18px;
  border-top: 1px solid var(--qm-line-1);
}

// base-btn 自带背景/圆角/内边距，这里按设计稿统一覆盖（沿用项目已有的 !important 覆盖写法）
// 主按钮使用实心品牌色 + 反白文字：base-btn 默认的「浅底 + 浅色字」对比度不足
.footerBtn {
  flex: 1 1 0;
  min-width: 0;
  height: 38px;
  line-height: 38px;
  padding: 0 12px !important;
  border-radius: var(--qm-radius-btn) !important;
  font-size: var(--qm-font-title-md);
  background-color: var(--qm-primary) !important;
  color: var(--qm-text-invert) !important;
  .mixin-ellipsis-1();

  &:hover:not([disabled]) {
    background-color: var(--qm-primary-hover) !important;
  }
  &:active:not([disabled]) {
    background-color: var(--qm-primary-active) !important;
  }
}

// 次要按钮：中性面 + 文字色，与主按钮形成层次
.footerBtnGhost {
  background-color: var(--qm-field) !important;
  color: var(--qm-text-2) !important;

  &:hover:not([disabled]) {
    background-color: var(--qm-hover-strong) !important;
  }
  &:active:not([disabled]) {
    background-color: var(--qm-field) !important;
  }
}

// -------- 窄屏适配（移动端 / 小窗） --------
@media (max-width: 640px) {
  .main {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    max-height: 86vh;
  }

  .head {
    padding: 14px 16px 12px;
  }

  .list {
    padding: 2px 10px 12px;
  }

  .note {
    margin: 0 16px 12px;
  }

  .footer {
    padding: 12px 16px 14px;
  }
}

// 矮窗口（笔记本小窗 / 分屏）：压缩非内容区高度，把空间让给音源列表
@media (max-height: 640px) {
  .head {
    padding: 12px 18px 10px;
  }

  .note {
    margin-bottom: var(--qm-sp-4, 10px);
    padding: 8px 12px;
  }

  .footer {
    padding: 10px 18px 12px;
  }
}
</style>
