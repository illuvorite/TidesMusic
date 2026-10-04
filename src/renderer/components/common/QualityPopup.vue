<template>
  <!--
    音质弹窗内容（对齐参考图：白卡 / 无分隔线 / 选中项为浅主色胶囊 + 主色文字）
    只负责菜单本身，触发按钮与关闭时机由使用方决定（播放栏 / 播放详情页各有一套按钮样式）
  -->
  <div class="qm-menu" :class="$style.menu">
    <button
      v-for="opt in qualityOptions"
      :key="opt.value"
      type="button"
      class="qm-menu-item"
      :class="{ 'qm-menu-item--active': appSetting['player.playQuality'] == opt.value }"
      :aria-label="opt.label"
      @click="select(opt.value)"
    >
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { updateSetting, appSetting } from '@renderer/store/setting'

const emit = defineEmits(['select'])

// 与主播放栏、播放详情页共用同一份口径
const QUALITY_LABEL = {
  '128k': '标准',
  '320k': '较高',
  flac: '极高',
  flac24bit: '无损',
}
const qualityOptions = ['128k', '320k', 'flac', 'flac24bit'].map(v => ({ value: v, label: QUALITY_LABEL[v] }))

const select = (value) => {
  emit('select', value)
  if (appSetting['player.playQuality'] === value) return
  updateSetting({ 'player.playQuality': value })
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.menu {
  min-width: 118px;
}
</style>
