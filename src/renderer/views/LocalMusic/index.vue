<template>
  <div :class="$style.page">
    <!-- 头部：标题 + 统计 + 操作 -->
    <header :class="$style.header">
      <h1 :class="$style.title">
        <svg-icon name="music-note-list" :class="$style.titleIcon" />
        {{ $t('local_library') }}
      </h1>
      <span :class="$style.meta">{{ $t('local_library__music_count', { num: localMusicList.length }) }}</span>
      <span :class="$style.meta">{{ scannedAtText }}</span>

      <div :class="$style.actions">
        <button type="button" :class="$style.btnGhost" :disabled="scanning" @click="handleAddDir">
          {{ $t('local_library__add_dir') }}
        </button>
        <button
          type="button"
          :class="$style.btnPrimary"
          :disabled="scanning || !localLibraryDirs.length"
          @click="handleScan"
        >
          {{ scanning ? $t('local_library__scanning') : $t('local_library__rescan') }}
        </button>
      </div>
    </header>

    <!-- 扫描进度 -->
    <div v-if="scanning" :class="$style.progress">
      <div :class="$style.progressBar">
        <span :class="$style.progressFill" :style="{ width: progressWidth }" />
      </div>
      <span :class="$style.progressText">{{ progressText }}</span>
    </div>

    <!-- 检测到目录变动：只提示，不静默重扫（重扫是重活，且会整批替换正在看的列表） -->
    <div v-else-if="localLibraryDirty" :class="$style.dirtyTip">
      <svg-icon name="refresh" :class="$style.dirtyIcon" />
      <span :class="$style.dirtyText">{{ $t('local_library__dirty_tip') }}</span>
      <button type="button" :class="$style.dirtyBtn" @click="handleScan">
        {{ $t('local_library__rescan') }}
      </button>
    </div>

    <!-- 已注册目录 -->
    <section v-if="localLibraryDirs.length" :class="$style.dirs">
      <div :class="$style.dirsHead">
        <span :class="$style.dirsTitle">{{ $t('local_library__dirs_title') }}</span>
        <span :class="$style.dirsCount">{{ localLibraryDirs.length }}</span>
      </div>
      <ul :class="$style.dirList">
        <li v-for="dir in localLibraryDirs" :key="dir" :class="$style.dirItem">
          <svg-icon name="lucide-list-ordered" :class="$style.dirIcon" />
          <span :class="$style.dirPath" :title="dir">{{ dir }}</span>
          <button
            type="button"
            :class="$style.dirAction"
            :title="$t('local_library__show_in_folder')"
            :aria-label="$t('local_library__show_in_folder')"
            @click="showInFolder(dir)"
          >
            <svg-icon name="share" />
          </button>
          <button
            type="button"
            :class="$style.dirAction"
            :title="$t('local_library__remove_dir')"
            :aria-label="$t('local_library__remove_dir')"
            @click="removeLocalLibraryDir(dir)"
          >
            <svg-icon name="plus" :class="$style.dirRemoveIcon" />
          </button>
        </li>
      </ul>
    </section>

    <!-- 视图切换 -->
    <nav v-if="localMusicList.length" :class="$style.tabs">
      <button
        v-for="item in viewTabs" :key="item.id" type="button"
        :class="[$style.tab, { [$style.tabActive]: view === item.id }]"
        @click="view = item.id"
      >
        {{ item.label }}
        <span v-if="item.id !== 'songs'" :class="$style.tabCount">{{ groupCount(item.id) }}</span>
      </button>
    </nav>

    <!-- 内容 -->
    <div :class="$style.body">
      <!-- 未添加目录 -->
      <common-empty-state
        v-if="!localLibraryDirs.length"
        icon="music-note-list"
        :title="$t('local_library__empty_title')"
        :description="$t('local_library__empty_desc')"
        :action-text="$t('local_library__add_dir')"
        @action="handleAddDir"
      />
      <!-- 已添加目录但还没有结果 -->
      <common-empty-state
        v-else-if="!localMusicList.length"
        icon="music-note-list"
        :title="$t('local_library__empty_title')"
        :description="$t('local_library__empty_desc')"
        :action-text="$t('local_library__rescan')"
        @action="handleScan"
      />

      <!-- 歌曲：复用统一在线列表（虚拟滚动 / 右键菜单 / 统一表头） -->
      <material-online-list
        v-else-if="view === 'songs'"
        :page="1"
        :limit="localMusicList.length"
        :total="localMusicList.length"
        :list="localMusicList"
        :active-index="playingIndex"
        @play-list="playFrom"
      />

      <!-- 歌手 / 专辑 / 文件夹：分组折叠 -->
      <div v-else class="qm-scroll" :class="$style.groups">
        <div v-for="group in groupList" :key="group.key" :class="$style.group">
          <button type="button" :class="$style.groupHead" @click="toggleGroup(group.key)">
            <svg
              :class="[$style.groupArrow, { [$style.groupArrowOpen]: openedGroups.has(group.key) }]"
              viewBox="0 0 24 24" aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <!-- 分组封面取该组第一首的封面；没有就退回音符占位 -->
            <span :class="$style.groupCover">
              <img
                v-if="getCoverUrl(group.songs[0])"
                :class="$style.groupCoverImg"
                :src="getCoverUrl(group.songs[0])"
                alt=""
                loading="lazy"
              >
              <svg-icon v-else name="music-note-list" :class="$style.groupCoverFallback" />
            </span>
            <span :class="$style.groupName" :title="group.name">{{ group.name }}</span>
            <span :class="$style.groupCount">{{ $t('local_library__music_count', { num: group.songs.length }) }}</span>
            <span :class="$style.groupPlay" :title="$t('list__play')" @click.stop="playGroup(group)">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
              </svg>
            </span>
          </button>

          <ul v-show="openedGroups.has(group.key)" :class="$style.songList">
            <li
              v-for="(song, index) in group.songs" :key="song.id"
              :class="[$style.songItem, { [$style.songActive]: isPlaying(song) }]"
              @dblclick="playGroup(group, index)"
            >
              <span :class="$style.songIndex">{{ index + 1 }}</span>
              <span :class="$style.songName" :title="song.name">{{ song.name }}</span>
              <span :class="$style.songSinger" :title="song.singer">{{ song.singer || '—' }}</span>
              <span :class="$style.songTime">{{ song.interval || '--:--' }}</span>
              <button
                type="button"
                :class="[$style.songAction, { [$style.songActionActive]: isOverridden(song) }]"
                :title="isOverridden(song) ? $t('local_library__edited') : $t('local_library__edit_info')"
                :aria-label="$t('local_library__edit_info')"
                @click.stop="handleEditSong(song)"
              >
                <svg-icon name="edit" />
              </button>
              <button
                type="button"
                :class="$style.songAction"
                :title="$t('local_library__show_in_folder')"
                :aria-label="$t('local_library__show_in_folder')"
                @click.stop="showInFolder(song.meta?.filePath)"
              >
                <svg-icon name="share" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from '@common/utils/vueTools'
import { isPlay, playInfo } from '@renderer/store/player/state'
import { playList } from '@renderer/core/player'
import { setTempList } from '@renderer/store/list/action'
import { LIST_IDS } from '@common/constants'
import { openDirInExplorer } from '@renderer/utils/ipc'
import { getCoverUrl } from '@renderer/utils/compositions/useCoverLoader'
import { showLocalMusicEdit } from '@renderer/store/localLibraryModal'
import {
  localLibraryDirs,
  localMusicList,
  localMusicOverrides,
  localLibraryScanning,
  localLibraryScannedAt,
  localLibraryProgress,
  localLibraryLoaded,
  localLibraryDirty,
  loadLocalLibrary,
  loadLocalCovers,
  addLocalLibraryDir,
  removeLocalLibraryDir,
  scanLocalLibrary,
} from '@renderer/store/localLibrary'

const scanning = localLibraryScanning
const view = ref('songs')
const openedGroups = reactive(new Set())

const viewTabs = computed(() => ([
  { id: 'songs', label: window.i18n.t('local_library__tab_songs') },
  { id: 'singers', label: window.i18n.t('local_library__tab_singers') },
  { id: 'albums', label: window.i18n.t('local_library__tab_albums') },
  { id: 'folders', label: window.i18n.t('local_library__tab_folders') },
]))

// ---------- 统计信息 ----------
const scannedAtText = computed(() => {
  if (scanning.value) return window.i18n.t('local_library__scanning')
  if (!localLibraryScannedAt.value) return window.i18n.t('local_library__never_scanned')
  const d = new Date(localLibraryScannedAt.value)
  const pad = n => String(n).padStart(2, '0')
  return window.i18n.t('local_library__scanned_at', {
    time: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
  })
})

// 收集阶段拿不到总数（total=0），此时不显示百分比，避免进度条来回跳
const progressWidth = computed(() => {
  const { done, total } = localLibraryProgress
  if (!total) return '0%'
  return `${Math.min(100, Math.round((done / total) * 100))}%`
})
const progressText = computed(() => {
  const { stage, done, total } = localLibraryProgress
  if (stage === 'collect') return window.i18n.t('local_library__scanning')
  return window.i18n.t('local_library__progress', { done, total })
})

// ---------- 分组 ----------
/** 取文件所在目录 */
const dirOfPath = (filePath) => {
  const normalized = (filePath ?? '').replace(/\\/g, '/')
  const index = normalized.lastIndexOf('/')
  return index > 0 ? normalized.slice(0, index) : normalized
}

/**
 * 三种分组一次性算好。
 *
 * 之所以不按当前 view 只算一种：页签上的角标要显示「各自的分组数」，
 * 若按当前视图算，三个角标会同时渲染同一个数字（曾经就是这样）。
 * 依赖只有 localMusicList，所以切换页签不会触发重算。
 */
const groupedAll = computed(() => {
  const unknown = window.i18n.t('local_library__unknown')
  const build = (keyOf) => {
    const map = new Map()
    for (const song of localMusicList) {
      const key = keyOf(song)
      let group = map.get(key)
      if (!group) {
        group = { key, name: key, songs: [] }
        map.set(key, group)
      }
      group.songs.push(song)
    }
    // 歌曲多的分组排前面
    return [...map.values()].sort((a, b) => b.songs.length - a.songs.length)
  }

  return {
    singers: build(song => (song.singer || '').trim() || unknown),
    albums: build(song => (song.meta?.albumName || '').trim() || unknown),
    folders: build(song => dirOfPath(song.meta?.filePath) || unknown),
  }
})

const groupList = computed(() => groupedAll.value[view.value] ?? [])

/** 页签角标：各视图自己的分组数 */
const groupCount = (id) => groupedAll.value[id]?.length ?? 0

const toggleGroup = (key) => {
  if (openedGroups.has(key)) openedGroups.delete(key)
  else openedGroups.add(key)
}

// ---------- 播放 ----------
const playingIndex = computed(() => {
  if (!isPlay.value) return -1
  const id = playInfo.playInfo?.id
  if (!id) return -1
  return localMusicList.findIndex(item => item.id === id)
})

const isPlaying = (song) => isPlay.value && playInfo.playInfo?.id === song.id

// 本地歌曲的 id 就是文件路径，可直接作为队列来源
const playFrom = async(index) => {
  if (!localMusicList.length) return
  await setTempList('local_library', [...localMusicList])
  playList(LIST_IDS.TEMP, index)
}

const playGroup = async(group, index = 0) => {
  if (!group?.songs.length) return
  await setTempList(`local_library_${group.key}`, [...group.songs])
  playList(LIST_IDS.TEMP, index)
}

// ---------- 操作 ----------
const handleAddDir = () => {
  void addLocalLibraryDir(true)
}

const handleScan = () => {
  void scanLocalLibrary()
}

const showInFolder = (filePath) => {
  if (filePath) void openDirInExplorer(filePath)
}

/** 该歌曲是否被应用内元数据覆盖过（用于行内标记） */
const isOverridden = (song) => song?.id != null && song.id in localMusicOverrides

const handleEditSong = (song) => {
  if (song) showLocalMusicEdit(song)
}

// ---------- 封面 ----------
/**
 * 封面是懒加载的：本地歌曲的封面要读文件（可能还要解析内嵌图），
 * 上千首歌一次性读完会明显拖慢。这里只给「当前视图实际会渲染的那部分」排队，
 * 由 store 里的队列按 4 并发逐个补齐，用户滚动时封面陆续出现。
 */
const EAGER_COVER_LIMIT = 300
watch([
  () => localMusicList.length,
  () => localLibraryScannedAt.value,
  view,
], () => {
  const targets = view.value === 'songs'
    ? localMusicList.slice(0, EAGER_COVER_LIMIT)
    // 分组视图只需要每组代表的那一首的封面
    : groupList.value.slice(0, EAGER_COVER_LIMIT).map(group => group.songs[0])
  loadLocalCovers(targets.filter(Boolean))
}, { immediate: true })

onMounted(() => {
  // 页面可能被直接刷新进来，这里兜底读一次
  if (!localLibraryLoaded.value) void loadLocalLibrary()
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.page {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
  background-color: var(--qm-surface);
}

.header {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: 20px var(--qm-content-pad-right, 24px) 12px var(--qm-content-pad-left, 24px);
}

.title {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  margin: 0;
  font-size: var(--qm-fs-3xl, 20px);
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
}

.titleIcon {
  width: 20px;
  height: 20px;
  color: var(--qm-primary);
  fill: currentColor;
}

.meta {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
  font-variant-numeric: tabular-nums;
}

.actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
}

.btnPrimary,
.btnGhost {
  padding: 6px 18px;
  border-radius: var(--qm-radius-chip, 999px);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast), border-color var(--qm-t-fast), opacity var(--qm-t-fast);

  &:disabled {
    opacity: .5;
    cursor: default;
  }
}

.btnPrimary {
  border: 1px solid var(--qm-primary);
  background-color: var(--qm-primary);
  color: var(--qm-text-invert);

  &:hover:not(:disabled) { background-color: var(--qm-primary-hover); border-color: var(--qm-primary-hover); }
}

.btnGhost {
  border: 1px solid var(--qm-primary-border);
  background-color: var(--qm-primary-soft);
  color: var(--qm-primary);

  &:hover:not(:disabled) { background-color: var(--qm-primary-soft-hover); }
}

// ---------- 扫描进度 ----------
.progress {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  padding: 0 var(--qm-content-pad-right, 24px) 12px var(--qm-content-pad-left, 24px);
}

.progressBar {
  flex: auto;
  height: 4px;
  border-radius: var(--qm-radius-chip, 999px);
  background-color: var(--qm-hover-strong);
  overflow: hidden;
}

.progressFill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background-color: var(--qm-primary);
  transition: width var(--qm-t-base);
}

.progressText {
  flex: none;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3);
  font-variant-numeric: tabular-nums;
}

// ---------- 检测到目录变动 ----------
.dirtyTip {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  margin: 0 var(--qm-content-pad-right, 24px) 12px var(--qm-content-pad-left, 24px);
  padding: 8px 12px;
  border-radius: var(--qm-radius-card, 10px);
  background-color: var(--qm-primary-soft);
}

.dirtyIcon {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--qm-primary);
  fill: currentColor;
}

.dirtyText {
  flex: auto;
  min-width: 0;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-2);
}

.dirtyBtn {
  flex: none;
  padding: 3px 12px;
  border: 1px solid var(--qm-primary-border);
  border-radius: var(--qm-radius-chip, 999px);
  background-color: transparent;
  color: var(--qm-primary);
  font-size: var(--qm-fs-xs, 12px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast);

  &:hover { background-color: var(--qm-primary-soft-hover); }
}

// ---------- 目录列表 ----------
.dirs {
  flex: none;
  margin: 0 var(--qm-content-pad-right, 24px) 12px var(--qm-content-pad-left, 24px);
  padding: 12px 14px;
  border-radius: var(--qm-radius-card, 10px);
  background-color: var(--qm-hover);
}

.dirsHead {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  margin-bottom: var(--qm-sp-3, 8px);
}

.dirsTitle {
  font-size: var(--qm-fs-xs, 12px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--qm-text-3);
}

.dirsCount {
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-5);
}

.dirList {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-flow: column nowrap;
  gap: 2px;
}

.dirItem {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  height: 26px;
  padding: 0 4px;
  border-radius: var(--qm-radius-xs, 6px);

  &:hover { background-color: var(--qm-hover-strong); }
}

.dirIcon {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--qm-text-4);
  fill: currentColor;
}

.dirPath {
  flex: auto;
  min-width: 0;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-2);
  .mixin-ellipsis-1();
}

.dirAction {
  flex: none;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--qm-radius-xs, 6px);
  background: transparent;
  color: var(--qm-text-4);
  cursor: pointer;

  &:hover { background-color: var(--qm-hover); color: var(--qm-text-1); }
  :global(.svg-icon) { width: 13px; height: 13px; }
}

// 复用 plus 图标当删除：旋转 45° 即成为「×」，避免为一次操作新增图标资源
.dirRemoveIcon {
  transform: rotate(45deg);
  transform-origin: center;
}

// ---------- 页签 ----------
.tabs {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-6, 24px);
  padding: 0 var(--qm-content-pad-right, 24px) 0 var(--qm-content-pad-left, 24px);
  border-bottom: 1px solid var(--qm-line-1);
}

.tab {
  position: relative;
  padding: 8px 0;
  border: 0;
  background: transparent;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-3);
  cursor: pointer;
  transition: color var(--qm-t-fast);

  &:hover { color: var(--qm-text-1); }
}

.tabActive {
  color: var(--qm-primary);
  font-weight: var(--qm-fw-medium, 500);

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background-color: var(--qm-primary);
  }
}

.tabCount {
  margin-left: 4px;
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-5);
}

.body {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
}

// ---------- 分组 ----------
.groups {
  flex: auto;
  min-height: 0;
  overflow-y: auto;
  padding: 8px var(--qm-content-pad-right, 24px) 24px var(--qm-content-pad-left, 24px);
}

.group {
  border-bottom: 1px solid var(--qm-line-1);
}

.groupHead {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  height: 48px;
  padding: 0 6px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;

  &:hover { background-color: var(--qm-hover); }
}

// 分组封面（取该组第一首）
.groupCover {
  flex: none;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--qm-radius-xs, 6px);
  overflow: hidden;
  background-color: var(--qm-hover-strong);
}

.groupCoverImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.groupCoverFallback {
  width: 14px;
  height: 14px;
  color: var(--qm-text-5);
  fill: currentColor;
}

.groupArrow {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--qm-text-4);
  transition: transform var(--qm-t-fast);
}

.groupArrowOpen {
  transform: rotate(90deg);
}

.groupName {
  flex: auto;
  min-width: 0;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.groupCount {
  flex: none;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
  font-variant-numeric: tabular-nums;
}

.groupPlay {
  flex: none;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--qm-text-3);
  opacity: 0;
  transition: opacity var(--qm-t-fast), color var(--qm-t-fast), background-color var(--qm-t-fast);

  .groupHead:hover & { opacity: 1; }
  &:hover { background-color: var(--qm-primary-soft); color: var(--qm-primary); }
}

.songList {
  margin: 0 0 6px;
  padding: 0;
  list-style: none;
}

.songItem {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  height: 34px;
  padding: 0 6px 0 30px;
  border-radius: var(--qm-radius-xs, 6px);
  font-size: var(--qm-fs-sm, 13px);

  &:hover { background-color: var(--qm-hover); }
}

.songActive {
  .songName { color: var(--qm-text-active); }
}

.songIndex {
  flex: none;
  width: 24px;
  text-align: right;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-5);
  font-variant-numeric: tabular-nums;
}

.songName {
  flex: 3;
  min-width: 0;
  color: var(--qm-text-2);
  .mixin-ellipsis-1();
}

.songSinger {
  flex: 2;
  min-width: 0;
  color: var(--qm-text-4);
  .mixin-ellipsis-1();
}

.songTime {
  flex: none;
  width: 52px;
  text-align: right;
  color: var(--qm-text-4);
  font-variant-numeric: tabular-nums;
}

.songAction {
  flex: none;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--qm-radius-xs, 6px);
  background: transparent;
  color: var(--qm-text-4);
  cursor: pointer;
  opacity: 0;

  .songItem:hover & { opacity: 1; }
  &:hover { color: var(--qm-primary); }
  :global(.svg-icon) { width: 13px; height: 13px; }
}

// 该歌曲的元数据被应用内覆盖过：按钮常显并着色，扫列表时能看出哪些是改过的
.songActionActive {
  opacity: 1;
  color: var(--qm-primary);
}
</style>
