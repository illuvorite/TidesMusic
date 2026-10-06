<template>
  <!-- 参数化自定义皮肤背景图层：位于 #container 之下，按「原图 + 参数」GPU 渲染 -->
  <skin-background />
  <div id="container" class="view-container">
    <div id="top">
      <layout-aside id="left" :key="asideKey" @add-list="onAddList" />
      <div id="right">
        <layout-toolbar id="toolbar" />
        <div id="body">
          <layout-view id="view" />
        </div>
      </div>
    </div>
    <layout-play-bar id="player" />
    <layout-sync-mode-modal />
    <layout-sync-auth-code-modal />
    <layout-play-detail />

    <!-- 全屏设置页：在应用顶层渲染为覆盖层，天然盖住侧栏/工具栏/播放栏（路由 /setting） -->
    <layout-setting v-if="isSettingOpen" />

    <!-- 全局歌曲评论弹层：任意列表右键「歌曲评论」都能唤起（对标 QQ/网易云的单曲评论） -->
    <common-music-comment-modal />

    <!-- 全局本地歌曲信息编辑弹层（右键「编辑歌曲信息」，仅本地歌曲可用） -->
    <common-local-music-info-modal />

    <!-- 全局单曲指定音质弹层（右键「指定音质」，仅在线歌曲可用） -->
    <common-music-quality-modal />

    <!-- 歌单回收站弹层 -->
    <common-list-trash-modal />

  </div>
</template>

<script setup>
import { computed } from '@common/utils/vueTools'
import { useRoute } from '@common/utils/vueRouter'
import useApp from '@renderer/core/useApp'
import LayoutSetting from '@renderer/views/Setting/index.vue'
import SkinBackground from '@renderer/components/layout/SkinBackground.vue'
import CommonMusicCommentModal from '@renderer/components/common/MusicCommentModal.vue'
import CommonLocalMusicInfoModal from '@renderer/components/common/LocalMusicInfoModal.vue'
import CommonMusicQualityModal from '@renderer/components/common/MusicQualityModal.vue'
import CommonListTrashModal from '@renderer/components/common/ListTrashModal.vue'

useApp()

const route = useRoute()
// 设置页打开标记（App 顶层渲染全屏设置覆盖层）
const isSettingOpen = computed(() => route.name === 'Setting')

const asideKey = 'aside-v3'

// 左侧边栏"+"新建歌单：仅在侧边栏内嵌输入框（不跳转）
const onAddList = () => {
  // 不做任何跳转；Aside 自己管理新建 UI
}
</script>


<style lang="less">
@import './assets/styles/index.less';
@import './assets/styles/layout.less';
@import './assets/styles/home-tokens.less';

html {
  height: 100vh;
}
html, body {
  box-sizing: border-box;
}

body {
  user-select: none;
  height: 100%;
  // 不透明兜底：主题的面板可为半透明（让背景图透出），此处避免透视到窗口透明层
  background-color: var(--color-primary-light-1000, #F5F5F5);
  // 全局字体抗锯齿
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
#root {
  height: 100%;
  position: relative;
  overflow: hidden;
  color: var(--color-font);
  background: var(--background-image) var(--background-image-position) no-repeat;
  background-size: var(--background-image-size);
  transition: background-color @transition-normal;
  // 不透明兜底（关键）：透明窗口模式下 html/body 是透明的，壁纸与壳色
  // （--color-app-background 部分主题自带透明度，如蓝田生玉的 alpha-700）
  // 之下必须垫一层不透明底色，否则无壁纸主题会直接透视到桌面。
  // 取主题的主面板色（各主题均为不透明值）；有壁纸时被壁纸完全覆盖，不影响观感。
  background-color: var(--color-main-background, #F5F5F5);
  box-sizing: border-box;
}

.disableAnimation * {
  transition: none !important;
  animation: none !important;
}

.transparent {
  background: transparent;
}
.disableTransparent {
  background-color: var(--color-content-background);
  #body {
    border: 1Px solid var(--color-primary-light-500);
  }
  #right {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
}
.fullscreen {
  background-color: var(--qm-surface);
  #right {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
}

// ============================================================
//  外壳骨架（满铺版）
//  窗口底 #F0F0F0 → 左侧侧栏（通高）+ 右侧主面板；播放栏通栏占据整个底部。
//  主面板 / 播放栏与窗口边缘之间不留任何缝隙（原先按设计稿留的 11px 壳缝隙已去掉），
//  因此圆角也一并取消——铺满时圆角只会在四角露出壳底色，看起来仍是"没铺满"。
// ============================================================
#container {
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  box-sizing: border-box;
  padding: 0;
  background-color: var(--qm-shell);
}

#top {
  flex: auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-flow: row nowrap;
  // 侧栏绝对定位通高，这里只为主面板让出水平空间
  padding-left: @width-home-sidebar;
}

#left {
  position: absolute;
  top: 0;
  left: 0;
  // 侧栏到播放栏上方为止（播放栏通栏占据整个底部）
  height: calc(100% - @height-player);
  width: @width-home-sidebar;
  flex: none;
  // 注意：不要在这里写 background-color——ID 选择器会压过 Aside 组件内
  // .aside 的面板材质（--qm-surface 皮肤透明度）
}
#right {
  flex: auto;
  display: flex;
  flex-flow: column nowrap;
  transition: background-color @transition-normal;
  background-color: var(--qm-surface);
  // 满铺：不留圆角与右侧缝隙，直接与侧栏 / 播放栏相接
  border-radius: 0;
  overflow: hidden;
  min-width: 0;
  margin-right: 0;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.015);
}
#toolbar, #player {
  flex: none;
}
#player {
  position: relative;
  z-index: 2;
  // 满铺：紧贴主面板，不再留 11px 缝隙
  margin-top: 0;
  border-radius: 0;
  background-color: var(--qm-surface);
  overflow: hidden;
  // 必须显式取消自身的毛玻璃：播放栏根元素（组件根）自带 backdrop-filter，
  // 而下面的 `> *` 只覆盖子元素、漏掉了元素自身，导致播放栏呈「磨砂实心」，
  // 与主面板的半透明材质对不上，表现为「调皮肤透明度时播放栏不跟着变」。
  -webkit-backdrop-filter: none;
  backdrop-filter: none;

  // 播放栏内部实现保持不变，仅让它的底与主面板同一材质
  > * {
    background-color: transparent;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    border-top: 0;
  }
}

#body {
  flex: auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-flow: column nowrap;
}
#view {
  position: relative;
  flex: auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.view-container {
  transition: opacity @transition-normal;
}

// 注意：设置页打开时严禁给 #view 提升 z-index！
// #view 一旦有了 z-index 就成为层叠上下文，teleport 到 #view 的弹窗
// （material-modal，容器 z-index:99，如「添加主题」）会被困在其中，
// 整体被设置覆盖层（fixed + z-index:60，DOM 靠后）压在下面。
// 设置覆盖层自身层级已足够盖住工具栏/侧栏/播放栏，无需额外提升 #view。


#root.show-modal > .view-container {
  opacity: .9;
}
#view.show-modal > .view-container {
  opacity: .2;
}

</style>
