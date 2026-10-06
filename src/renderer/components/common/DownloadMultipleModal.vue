<template>
  <material-modal :show="show" :bg-close="bgClose" :teleport="teleport" @close="handleClose">
    <main :class="$style.main">
      <h2 :class="$style.title">{{ $t('download__multiple_tip', { len: list.length }) }}<br>{{ $t('download__multiple_tip2') }}</h2>
      <!-- 音质选项：与单曲下载弹窗同一套轻量列表样式 -->
      <ul :class="$style.list">
        <li v-for="q in QUALITYS" :key="q">
          <button type="button" :class="$style.item" @click="handleClick(q)">
            <span :class="$style.itemLabel">{{ getTypeName(q) }}</span>
          </button>
        </li>
      </ul>
    </main>
  </material-modal>
</template>

<script>
import { createDownloadTasks } from '@renderer/store/download/action'

export default {
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    bgClose: {
      type: Boolean,
      default: true,
    },
    listId: {
      type: String,
      default: '',
    },
    list: {
      type: Array,
      default() {
        return []
      },
    },
    teleport: {
      type: String,
      default: '#root',
    },
  },
  emits: ['update:show', 'confirm'],
  setup() {
    return { QUALITYS: ['128k', '320k', 'flac', 'flac24bit'] }
  },
  methods: {
    getTypeName(quality) {
      switch (quality) {
        case 'flac24bit':
          return this.$t('download__lossless') + ' FLAC Hires'
        case 'flac':
          return this.$t('download__lossless') + ' FLAC'
        case '320k':
          return this.$t('download__high_quality') + ' 320K'
        default:
          return this.$t('download__normal') + ' 128K'
      }
    },
    handleClick(quality) {
      void createDownloadTasks(this.list.filter(item => item.source != 'local'), quality, this.listId)
      this.handleClose()
      this.$emit('confirm')
    },
    handleClose() {
      this.$emit('update:show', false)
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  width: 280px;
  max-width: calc(100vw - 48px);
  padding: 16px 14px 14px;
}

.title {
  margin: 0 0 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--qm-line-1, rgba(0, 0, 0, .06));
  font-size: var(--qm-fs-sm, 13px);
  font-weight: 500;
  line-height: 1.5;
  color: var(--qm-text-1);
  text-align: left;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  width: 100%;
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--qm-radius-sm, 8px);
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background-color var(--qm-t-fast, .15s), color var(--qm-t-fast, .15s);

  &:hover {
    background-color: var(--qm-hover, rgba(0, 0, 0, .05));
    .itemLabel { color: var(--qm-primary, #31c27c); }
  }
  &:active { background-color: var(--qm-hover-strong, rgba(0, 0, 0, .08)); }
}

.itemLabel {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-1);
  transition: color var(--qm-t-fast, .15s);
}

</style>
