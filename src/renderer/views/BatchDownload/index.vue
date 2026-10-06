<template>
  <div :class="$style.page">
    <!-- 顶部操作条：下载按钮 + 保存目录 + 退出 -->
    <header :class="$style.bar">
      <button type="button" :class="$style.dlBtn" :disabled="!selected.length" @click="handleDownload">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path d="M12 3v12m0 0l-4.5-4.5m4.5 4.5l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 20h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        下载
      </button>
      <span :class="$style.path">
        下载到：<span :class="$style.pathText" :title="savePath">{{ savePath }}</span>
        <button type="button" :class="$style.changeBtn" @click="handleChangeDir">更改目录</button>
      </span>
      <span :class="$style.spacer" />
      <button type="button" :class="$style.exitBtn" @click="close">退出批量下载</button>
    </header>

    <!-- 优先下载：音质单选（QQ 音乐版式） -->
    <div :class="$style.qualityBar">
      <span :class="$style.qLabel">优先下载</span>
      <label v-for="q in qualityOptions" :key="q.type" :class="$style.qItem">
        <input
          type="radio" name="batch-quality" :value="q.type"
          :checked="priorityQuality === q.type" @change="priorityQuality = q.type"
        >
        <span :class="$style.qText">{{ q.label }}</span>
        <span v-if="q.badge" :class="$style.qBadge">{{ q.badge }}</span>
      </label>
    </div>

    <!-- 统计 + 表头 -->
    <div :class="$style.thead">
      <span :class="$style.thCheck">
        <button
          type="button" class="row-check" :class="{ checked: isAllChecked }"
          :aria-label="isAllChecked ? '取消全选' : '全选'" :aria-pressed="isAllChecked"
          @click="toggleAll"
        >
          <svg v-if="isAllChecked" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <span :class="$style.summary">
          已选{{ selected.length }}首，
          <template v-if="totalSize > 0">包含{{ formatSize(totalSize) }}首付费量</template>
        </span>
      </span>
      <span :class="$style.thAlbum">专辑</span>
      <span :class="$style.thSize">大小</span>
    </div>

    <!-- 歌曲列表 -->
    <div ref="dom_scroll" :class="$style.list" class="scroll">
      <div
        v-for="(item, index) in list" :key="item.id ?? index"
        :class="[$style.row, { 'row-alt': index % 2 === 1, [$style.rowChecked]: checkedSet.has(item.id) }]"
        @click="toggleItem(item)"
      >
        <span :class="$style.cellCheck">
          <button
            type="button" class="row-check" :class="{ checked: checkedSet.has(item.id) }"
            :aria-label="checkedSet.has(item.id) ? '取消选择' : '选择'"
            :aria-pressed="checkedSet.has(item.id)"
            @click.stop="toggleItem(item)"
          >
            <svg v-if="checkedSet.has(item.id)" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </span>
        <span :class="$style.cellCover">
          <img v-if="getCoverUrl(item)" :src="getCoverUrl(item)" alt="" loading="lazy">
          <span v-else :class="$style.coverEmpty">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.5a3 3 0 1 1-2-2.8V5.2l7-1.5v8.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </span>
        </span>
        <span :class="$style.cellName">
          <span :class="$style.nameMain">
            <span :class="$style.name" :title="item.name">{{ item.name }}</span>
            <span v-if="item.meta?._qualitys" :class="$style.badge">付费</span>
          </span>
          <span :class="$style.nameSub" :title="item.singer">{{ item.singer }}</span>
        </span>
        <span :class="$style.cellAlbum" :title="item.meta?.albumName">{{ item.meta?.albumName || '—' }}</span>
        <span :class="$style.cellSize">{{ formatSize(itemSize(item)) }}/标准</span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from '@common/utils/vueTools'
import { useRouter } from '@common/utils/vueRouter'
import { appSetting, updateSetting } from '@renderer/store/setting'
import { qualityList } from '@renderer/store'
import { createDownloadTasks } from '@renderer/store/download/action'
import { showSelectDialog } from '@renderer/utils/ipc'
import { getCoverUrl } from '@renderer/utils/compositions/useCoverLoader'
import { batchDownloadList, clearBatchDownloadList } from '@renderer/store/batchDownload'

// 与 QQ 音乐「优先下载」一致：由高到低
const QUALITY_OPTIONS = [
  { type: '128k', label: '标准音质' },
  { type: '320k', label: 'HQ高音质' },
  { type: 'flac', label: 'SQ无损品质', badge: '💎' },
  { type: 'flac24bit', label: 'Hi-Res无损品质', badge: '💎' },
  { type: 'hires', label: '臻品全景声' },
  { type: 'master', label: '臻品母带' },
  { type: 'dolby', label: '杜比全景声' },
]

export default {
  name: 'BatchDownload',
  // 独立路由页面（#/batch-download），点「下载」后进入，不是常驻面板
  setup() {
    const router = useRouter()
    const priorityQuality = ref('128k')
    const selectedIds = ref(new Set())
    const savePath = ref(appSetting['download.savePath'] ?? '')

    const list = computed(() => batchDownloadList.value)

    // 进入页面默认全选
    watch(list, (l) => {
      selectedIds.value = new Set(l.map(i => i.id))
    }, { immediate: true })

    // 只列出当前音源实际支持的档位
    const qualityOptions = computed(() => {
      const supported = qualityList.value[list.value[0]?.source] ?? []
      const opts = QUALITY_OPTIONS.filter(q => supported.includes(q.type))
      return opts.length ? opts : QUALITY_OPTIONS.slice(0, 2)
    })

    const checkedSet = computed(() => selectedIds.value)
    const selected = computed(() => list.value.filter(i => selectedIds.value.has(i.id)))
    const isAllChecked = computed(() => list.value.length > 0 && selectedIds.value.size === list.value.length)
    // 汇总「已选歌曲在标准音质下的体积」
    const totalSize = computed(() => selected.value.reduce((sum, i) => sum + (iSize(i) || 0), 0))

    const iSize = (item) => {
      const q = item?.meta?.qualitys?.find(x => x.type === '128k') ?? item?.meta?.qualitys?.[0]
      return Number(q?.size) || 0
    }
    const itemSize = iSize

    const formatSize = (size) => {
      const n = Number(size)
      if (!Number.isFinite(n) || n <= 0) return '0B'
      if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)}M`
      if (n >= 1024) return `${(n / 1024).toFixed(0)}K`
      return `${n}B`
    }

    const toggleItem = (item) => {
      const next = new Set(selectedIds.value)
      if (next.has(item.id)) next.delete(item.id)
      else next.add(item.id)
      selectedIds.value = next
    }
    const toggleAll = () => {
      selectedIds.value = isAllChecked.value
        ? new Set()
        : new Set(list.value.map(i => i.id))
    }

    // 退出批量下载：清空待下载列表并返回来源页
    const close = () => {
      clearBatchDownloadList()
      if (window.history.state?.back) {
        router.back()
        return
      }
      router.replace({ name: 'Home' }).catch(() => {})
    }

    const handleChangeDir = async() => {
      const { canceled, filePaths } = await showSelectDialog({
        title: window.i18n.t('setting__download_save_path'),
        defaultPath: savePath.value,
        properties: ['openDirectory', 'createDirectory'],
      })
      if (canceled || !filePaths?.length) return
      savePath.value = filePaths[0]
      updateSetting({ 'download.savePath': filePaths[0] })
    }

    const handleDownload = () => {
      if (!selected.value.length) return
      void createDownloadTasks([...selected.value], priorityQuality.value)
      close()
    }

    return {
      list,
      priorityQuality,
      qualityOptions,
      selectedIds,
      checkedSet,
      selected,
      isAllChecked,
      totalSize,
      savePath,
      getCoverUrl,
      itemSize,
      formatSize,
      toggleItem,
      toggleAll,
      close,
      handleChangeDir,
      handleDownload,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.page {
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  background-color: var(--qm-surface);
  overflow: hidden;
}

// ------- 顶部操作条 -------
.bar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 24px;
}

.dlBtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--qm-radius-pill, 15px);
  background-color: var(--qm-hover, rgba(0, 0, 0, .06));
  color: var(--qm-text-1);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast, .15s);

  svg { fill: currentColor; }
  &:hover:not(:disabled) { background-color: var(--qm-hover-strong, rgba(0, 0, 0, .1)); }
  &:disabled { opacity: .4; cursor: not-allowed; }
}

.path {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-3);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.pathText {
  color: var(--qm-text-2);
  max-width: 320px;
  .mixin-ellipsis-1();
}

.changeBtn {
  border: 0;
  background: none;
  padding: 0;
  color: var(--qm-primary, #31c27c);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  &:hover { text-decoration: underline; }
}

.spacer { flex: auto; }

.exitBtn {
  height: 30px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--qm-radius-pill, 15px);
  background-color: var(--qm-hover, rgba(0, 0, 0, .06));
  color: var(--qm-text-1);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  &:hover { background-color: var(--qm-hover-strong, rgba(0, 0, 0, .1)); }
}

// ------- 优先下载音质 -------
.qualityBar {
  flex: none;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 20px;
  padding: 10px 24px 12px;
}

.qLabel {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-3);
}

.qItem {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-2);

  input { accent-color: var(--qm-primary, #31c27c); cursor: pointer; }
}

.qText { transition: color var(--qm-t-fast, .15s); }
.qItem:hover .qText { color: var(--qm-primary, #31c27c); }

.qBadge { font-size: 11px; }

// ------- 表头 -------
.thead {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0;
  height: 38px;
  padding: 0 24px;
  border-bottom: 1px solid var(--qm-line-1, rgba(0, 0, 0, .06));
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3);
}

.thCheck {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary { font-size: var(--qm-fs-xs, 12px); color: var(--qm-text-3); }

.thAlbum { flex: 0 0 30%; padding-left: 12px; }
.thSize { flex: 0 0 110px; text-align: right; }

// ------- 歌曲行 -------
.list {
  flex: auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 24px;
}

.row {
  display: flex;
  align-items: center;
  height: 58px;
  cursor: pointer;
  transition: background-color var(--qm-t-fast, .15s);

  &:hover { background-color: var(--qm-hover, rgba(0, 0, 0, .04)); }
  &.row-alt { background-color: color-mix(in srgb, var(--color-1000) 1.8%, transparent); }
}

.rowChecked {
  background-color: color-mix(in srgb, var(--color-1000) 3%, transparent);
}

.cellCheck {
  flex: none;
  width: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cellCover {
  flex: none;
  width: 50px;
  padding: 0 10px 0 4px;
  img { width: 40px; height: 40px; object-fit: cover; border-radius: var(--qm-radius-2xs, 4px); display: block; }
}

.coverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--qm-radius-2xs, 4px);
  background-color: rgba(0, 0, 0, .05);
  color: var(--qm-text-4, #999);
  svg { width: 20px; height: 20px; }
}

.cellName {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 2px;
}

.nameMain {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.name {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.badge {
  flex: none;
  padding: 0 4px;
  border-radius: 2px;
  border: 1px solid var(--qm-primary, #31c27c);
  color: var(--qm-primary, #31c27c);
  font-size: 10px;
  line-height: 14px;
}

.nameSub {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3);
  .mixin-ellipsis-1();
}

.cellAlbum {
  flex: 0 0 30%;
  padding-left: 12px;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-3);
  .mixin-ellipsis-1();
}

.cellSize {
  flex: 0 0 110px;
  text-align: right;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-2);
  font-variant-numeric: tabular-nums;
}
</style>
