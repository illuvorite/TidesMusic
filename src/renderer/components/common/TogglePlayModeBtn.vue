<template>
  <material-popup-btn ref="popupRef" :class="$style.wrap">
    <button
      :class="$style.btn"
      :aria-label="nextTogglePlayName"
     ignore-tip
>
      <svg-icon :name="currentIcon" />
    </button>
    <template #content>
      <!--
        播放模式弹窗：4 项（对齐参考图，顺序为 随机 / 顺序 / 单曲循环 / 列表循环）
        选中样式采用参考图「音质弹窗」的浅主色胶囊 + 主色文字
      -->
      <div class="qm-menu" :class="$style.menu">
        <button
          v-for="opt in playModeOptions"
          :key="opt.mode"
          type="button"
          class="qm-menu-item"
          :class="{ 'qm-menu-item--active': appSetting['player.togglePlayMethod'] === opt.mode }"
          :aria-label="opt.label"
          ignore-tip
         @click="selectMode(opt.mode)"
>
          <svg-icon class="qm-menu-item__icon" :name="opt.icon" />
          <span>{{ opt.label }}</span>
        </button>
      </div>
    </template>
  </material-popup-btn>
</template>

<script setup>
import { computed, ref } from '@common/utils/vueTools'
import { appSetting } from '@renderer/store/setting'
import useNextTogglePlay from '@renderer/utils/compositions/useNextTogglePlay'

// 与主播放栏、详情页保持同一套顺序与图标
const playModeOptions = [
  { mode: 'random', label: '随机播放', icon: 'play-mode-random' },
  { mode: 'list', label: '顺序播放', icon: 'play-mode-order' },
  { mode: 'singleLoop', label: '单曲循环', icon: 'play-mode-single' },
  { mode: 'listLoop', label: '列表循环', icon: 'play-mode-list' },
]

const { nextTogglePlayName, toggleNextPlayMode } = useNextTogglePlay()

const popupRef = ref(null)

// 按钮图标反映当前生效的模式
const currentIcon = computed(() => {
  switch (appSetting['player.togglePlayMethod']) {
    case 'random': return 'play-mode-random'
    case 'singleLoop': return 'play-mode-single'
    case 'list': return 'play-mode-order'
    case 'none': return 'play-mode-off'
    default: return 'play-mode-list' // listLoop
  }
})

const selectMode = (mode) => {
  popupRef.value?.hide()
  if (appSetting['player.togglePlayMethod'] === mode) return
  toggleNextPlayMode(mode)
}

defineExpose({
  hide() { popupRef.value?.hide() },
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq-icon.less';

.wrap {
  flex: none;
}

// 尺寸由使用方通过 --qm-playmode-size 控制（播放栏 32 / 详情页底栏 20）
.btn {
  .qm-icon-btn-strong();

  position: relative;
  width: var(--qm-playmode-size, 32px);
  height: var(--qm-playmode-size, 32px);
  border-radius: var(--qm-radius-sm, 8px);

  &:hover:not(:disabled) { background-color: var(--qm-hover); }

  // 图标尺寸单独用变量下传：组件内的规则与使用方的覆盖规则
  // 特异性相同，胜负由 CSS Module 注入顺序决定（换文件顺序就回退）
  :global(.svg-icon) { width: var(--qm-playmode-btn-icon, var(--qm-icon)); height: var(--qm-playmode-btn-icon, var(--qm-icon)); }
}

.menu {
  min-width: 132px;
}
</style>
