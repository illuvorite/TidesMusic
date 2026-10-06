<template>
  <material-modal :show="show" :bg-close="bgClose" :teleport="teleport" @close="handleClose">
    <main :class="$style.main" data-download-modal-body>
      <!-- 歌曲信息：封面 + 歌名/歌手（QQ 音乐版式：左对齐两行） -->
      <header :class="$style.head">
        <span :class="$style.cover">
          <img v-if="info.meta?.picUrl" :src="info.meta.picUrl" alt="">
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.5a3 3 0 1 1-2-2.8V5.2l7-1.5v8.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </span>
        <span :class="$style.meta">
          <b :class="$style.name" :title="info.name">{{ info.name }}</b>
          <span :class="$style.singer" :title="info.singer">{{ info.singer }}</span>
        </span>
      </header>

      <!-- 音质选项：轻量列表行，hover 才出底色 -->
      <ul :class="$style.list">
        <li v-for="quality in qualitys" :key="quality.type">
          <button type="button" :class="$style.item" @click="handleClick(quality.type)">
            <span :class="$style.itemLabel">{{ getTypeName(quality.type) }}</span>
            <span v-if="quality.size" :class="$style.itemSize">{{ formatSize(quality.size) }}</span>
          </button>
        </li>
      </ul>
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
    // 字节数 → 人类可读（原来直接拼在文字后显示原始数字，这里换算成 MB/KB）
    formatSize(size) {
      const n = Number(size)
      if (!Number.isFinite(n) || n <= 0) return ''
      if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
      if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`
      return `${n} B`
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
  position: relative;
  width: 300px;
  max-width: calc(100vw - 48px);
  // 顶部留出关闭按钮的空间
  padding: 16px 14px 12px;
}

// material-modal 的 .header 会硬占 22px 高度只放关闭按钮，
// 在这个小弹窗里表现为顶部一条空白带；按钮本身也偏小（20px 钮 + 15px 图标）。
//
// ⚠️ Modal 的关闭条与本组件的歌曲信息区**都是 <header>**，光看标签名区分不了
// （.head）。两者都是弹窗主体的子级，若只按header 匹配会把歌曲信息区
// 也 absolute 掉。关闭条的判定特征：下一个兄弟就是主体 [data-download-modal-body]。
:global(header:has(+ [data-download-modal-body])) {
  position: absolute;
  top: 4px;
  right: 4px;
  height: auto;
  margin: 0;
  // ⚠️ 必须提层：关闭条在 DOM 里排在弹窗主体 <main> **之前**，两者同为定位元素
  // 且 z-index 均为 auto 时，后绘制的 main 会盖住按钮，表现为「X 点不动」。
  z-index: 2;

  button {
    width: 28px;
    height: 28px;
    margin: 0;

    svg {
      width: 20px;
      height: 20px;
    }
  }
}

// ------- 歌曲信息（QQ 音乐：左封面 + 右歌名/歌手两行）-------
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  // 右侧留出关闭按钮的落位，避免长歌名被按钮压住
  padding: 0 30px 12px 0;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--qm-line-1, rgba(0, 0, 0, .06));
}

.cover {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--qm-radius-2xs, 4px);
  overflow: hidden;
  background-color: rgba(0, 0, 0, .05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qm-text-4, #999);

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
  svg { width: 20px; height: 20px; }
}

.meta {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 2px;
}

.name {
  font-size: var(--qm-fs-sm, 13px);
  font-weight: 500;
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.singer {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3);
  .mixin-ellipsis-1();
}

// ------- 音质列表（轻量行，非厚重灰块按钮）-------
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--qm-radius-sm, 8px);
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background-color @transition-fast, color @transition-fast;

  &:hover {
    background-color: var(--qm-hover, rgba(0, 0, 0, .05));
    .itemLabel { color: var(--qm-primary, #31c27c); }
  }
  &:active { background-color: var(--qm-hover-strong, rgba(0, 0, 0, .08)); }
}

.itemLabel {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-1);
  transition: color @transition-fast;
}

.itemSize {
  flex: none;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4, #999);
  font-variant-numeric: tabular-nums;
}

</style>
