<template>
  <div :class="$style.view">
    <!--
      这里**不用** <transition mode="out-in">。

      原因（踩过的坑，勿改回）：
      设置页是 App 层的 `<layout-setting v-if="isSettingOpen">` 全屏覆盖层，关闭时整棵子树被销毁。
      out-in 要求「离场动画完全结束后才进场」，一旦销毁动作打断离场流程，router-view 提供的
      `Component` 会永久变成 undefined —— 组件被移除且不再挂载，表现为
      「从列表页进设置再返回 → 主内容区永久空白」（hash 已回退但内容为空；
      侧栏数字仍正常，因为那是 DOM 里已有的计数，不依赖路由组件）。

      去掉 transition 后：离场实例立即被 Vue 移除，不再出现多个页面
      position:absolute 叠在一起（旧实例 opacity 也是 1，会同时可见）的问题。
      路由切换的淡入淡出改由各页面自身的 CSS 承担（见文末 transition 样式，已无对应类）。
    -->
    <router-view v-slot="{ Component, route }">
      <component
        :is="Component"
        :key="routeKey + '|' + (route?.fullPath ?? '')"
        class="view-container"
      />
    </router-view>
  </div>
</template>

<script setup>
import { routeReloadKey } from '@renderer/store/navigation'

// 路由变化（fullPath）或刷新按钮（routeReloadKey 自增）都会得到新的 key，
// 强制重新挂载当前路由组件。
const routeKey = routeReloadKey
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.view {
  position: relative;
  z-index: 1;
  // 普通页面撑满主视图；全屏覆盖页（设置页，带 data-fullcover 属性）保持自己的 fixed 定位
  // 用属性选择器而非类名：CSS Modules 会把 :not(.类名) 里的类名也哈希化导致排除失效
  > :global(.view-container:not([data-fullcover])) {
    position: absolute !important;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
  }
}
</style>
