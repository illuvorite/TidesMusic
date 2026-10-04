<template>
  <material-modal :show="show" :bg-close="bgClose" :teleport="teleport" @close="handleClose">
    <main :class="$style.main">
      <h2>{{ info.name }}<br>{{ info.singer }}</h2>
      <base-btn v-for="quality in qualitys" :key="quality.type" :class="$style.btn" @click="handleClick(quality.type)">
        {{ getTypeName(quality.type) }}{{ quality.size && ` - ${quality.size.toUpperCase()}` }}
      </base-btn>
    </main>
  </material-modal>
</template>

<script>
import { qualityList } from '@renderer/store'
import { createDownloadTasks } from '@renderer/store/download/action'

export default {
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    musicInfo: {
      type: [Object, null],
      required: true,
    },
    listId: {
      type: String,
      default: '',
    },
    bgClose: {
      type: Boolean,
      default: true,
    },
    teleport: {
      type: String,
      default: '#root',
    },
  },
  emits: ['update:show'],
  setup() {
    return {
      qualityList,
    }
  },
  computed: {
    info() {
      return this.musicInfo || {}
    },
    sourceQualityList() {
      return this.qualityList[this.musicInfo.source] || []
    },
    qualitys() {
      return this.info.meta?.qualitys?.filter(quality => this.checkSource(quality.type)) || []
    },
  },
  methods: {
    handleClick(quality) {
      void createDownloadTasks([this.musicInfo], quality, this.listId)
      this.handleClose()
    },
    handleClose() {
      this.$emit('update:show', false)
    },
    getTypeName(quality) {
      switch (quality) {
        case 'flac24bit':
          return this.$t('download__lossless') + ' FLAC Hires'
        case 'flac':
        case 'ape':
        case 'wav':
          return this.$t('download__lossless') + ' ' + quality.toUpperCase()
        case '320k':
          return this.$t('download__high_quality') + ' ' + quality.toUpperCase()
        case '192k':
        case '128k':
          return this.$t('download__normal') + ' ' + quality.toUpperCase()
      }
    },
    checkSource(quality) {
      return this.sourceQualityList.includes(quality)
    },
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.main {
  padding: var(--qm-sp-6, 15px);
  max-width: 400px;
  min-width: 200px;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  h2 {
    font-size: var(--qm-fs-sm, 13px);
    color: var(--qm-text-2);
    line-height: 1.3;
    text-align: center;
    margin-bottom: var(--qm-sp-6, 15px);
  }
}

.btn {
  display: block;
  margin-bottom: var(--qm-sp-6, 15px);
  &:last-child {
    margin-bottom: 0;
  }
}

</style>
