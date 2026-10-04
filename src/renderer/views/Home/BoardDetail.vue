<template>
  <div :class="$style.page">
    <!-- 头部：大封面 + 榜单名 + 更新时间 + 操作（仿 QQ 乐馆榜单详情） -->
    <header :class="$style.head">
      <div :class="$style.cover">
        <img v-if="cover" :src="cover" alt="">
        <span v-else :class="$style.coverEmpty"><svg-icon name="music" /></span>
      </div>

      <div :class="$style.info">
        <h1 :class="$style.title">{{ boardName }}</h1>
        <p :class="$style.metaLine">
          <span>更新时间：{{ today }}</span>
          <span>{{ getSourceName(source) }}</span>
          <span v-if="list.length">{{ list.length }} 首</span>
        </p>

        <div :class="$style.actions">
          <button type="button" :class="$style.btnPrimary" :disabled="loading || !list.length" @click="playFrom(0)">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
            </svg>
            全部播放
          </button>
          <button type="button" :class="$style.btnGhost" @click="handleBack">返回</button>
        </div>
      </div>
    </header>

    <!-- 歌曲列表：序号 + 缩略图 + 歌名 / 歌手 / 专辑 / 时长 -->
    <div ref="bodyRef" :class="$style.body" class="qm-scroll" @scroll.passive="handleScroll">
      <common-empty-state v-if="loading && !list.length" variant="loading" />
      <common-empty-state
        v-else-if="loadError"
        variant="error"
        :title="$t('common__board_load_failed')"
        :description="$t('common__board_detail_error_desc')"
        :action-text="$t('common__retry')"
        @action="load(true)"
      />
      <common-empty-state
        v-else-if="!list.length"
        icon="music-note-list"
        :title="$t('common__board_empty')"
        :description="$t('common__board_detail_empty_desc')"
        :action-text="$t('common__retry')"
        @action="load(true)"
      />
      <template v-else>
        <div :class="$style.thead">
          <span :class="$style.theadNum">歌曲</span>
          <span :class="$style.theadCol" style="width: 20%;">歌手</span>
          <span :class="$style.theadCol" style="width: 24%;">专辑</span>
          <span :class="$style.theadCol" style="width: 56px; text-align: right;">时长</span>
        </div>
        <ul :class="$style.list">
          <li
            v-for="(item, index) in visibleList" :key="item.id"
            :class="[$style.row, { [$style.rowActive]: isPlayingItem(item) }]"
            @dblclick="playFrom(index)"
          >
            <span :class="$style.num">{{ pad2(index + 1) }}</span>
            <span :class="$style.thumb">
              <img v-if="getCover(item)" :src="getCover(item)" alt="" loading="lazy">
              <span v-else :class="$style.thumbEmpty"><svg-icon name="music" /></span>
            </span>
            <button
              type="button"
              :class="[$style.love, { [$style.loveActive]: isLoved(item) }]"
              :title="isLoved(item) ? '取消收藏' : '收藏到我喜欢的音乐'"
              @click.stop="toggleItemLove(item)"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path d="M12 20.5s-7.2-4.4-9.6-9.1A5.4 5.4 0 0 1 12 5.6a5.4 5.4 0 0 1 9.6 5.8c-2.4 4.7-9.6 9.1-9.6 9.1z" :fill="isLoved(item) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
              </svg>
            </button>
            <span :class="$style.nameCell">
              <span :class="$style.name" :title="item.name">{{ item.name }}</span>
              <em v-if="qualityTag(item)" :class="$style.tag">{{ qualityTag(item) }}</em>
              <span :class="$style.rowBtns">
                <button type="button" :aria-label="$t('play')" :title="$t('play')" @click.stop="playFrom(index)">
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
                  </svg>
                </button>
                <button type="button" :aria-label="$t('list__add_to')" :title="$t('list__add_to')" @click.stop="showAdd(item)">
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </button>
              </span>
            </span>
            <span :class="$style.singer" :title="item.singer">{{ item.singer }}</span>
            <span :class="$style.album" :title="item.meta?.albumName">{{ item.meta?.albumName || '—' }}</span>
            <span :class="$style.time">{{ item.interval || '--:--' }}</span>
          </li>
        </ul>

        <!-- 增量渲染footer：接口一次最多返回 300 首，全量渲染会明显卡顿，
             改为滚动到底部再追加一屏（对标主流平台的榜单滚动加载） -->
        <p v-if="visibleList.length < list.length" :class="$style.moreTip">向下滚动加载更多…</p>
        <p v-else :class="$style.moreTip">没有更多了</p>
      </template>
    </div>

    <common-list-add-modal v-model:show="isShowAdd" :music-info="addMusicInfo" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, markRawList } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import { LIST_IDS } from '@common/constants'
import { toNewMusicInfo } from '@common/utils/tools'
import musicSdk from '@renderer/utils/musicSdk'
import { playList } from '@renderer/core/player/action'
import { setTempList } from '@renderer/store/list/action'
import { playMusicInfo, isPlay } from '@renderer/store/player/state'
import { getInitialSource, getSourceName } from '@renderer/utils/personalRecommend'
import useLovedList from '@renderer/utils/compositions/useLovedList'

const t = useI18n()


const { isLoved, loadLoved, toggleLove } = useLovedList()
void loadLoved()
const toggleItemLove = async(item) => { await toggleLove(item) }

// 「添加到歌单」弹窗
const isShowAdd = ref(false)
const addMusicInfo = ref(null)
const showAdd = (item) => {
  addMusicInfo.value = item
  isShowAdd.value = true
}

const route = useRoute()
const router = useRouter()

const source = ref((() => {
  const query = route.query.source
  return typeof query === 'string' && query ? query : getInitialSource()
})())
const boardId = ref(typeof route.query.boardId === 'string' ? route.query.boardId : '')
const boardName = ref(typeof route.query.name === 'string' && route.query.name ? route.query.name : t('common__board_default_name'))
const cover = ref(typeof route.query.img === 'string' ? route.query.img : '')

const list = ref([])
const loading = ref(false)
// 榜单接口一次返回全部歌曲（tx 最多 300 首），不是服务端分页；
// 全量塞进普通 <ul> 会明显卡顿，因此做客户端增量渲染。
const PAGE_STEP = 60
const visibleCount = ref(PAGE_STEP)
const visibleList = computed(() => list.value.slice(0, visibleCount.value))
const loadError = ref(false)
const bodyRef = ref(null)

const handleScroll = () => {
  const el = bodyRef.value
  if (!el) return
  // 距底部 320px 内再追加一屏
  if (el.scrollHeight - el.scrollTop - el.clientHeight > 320) return
  if (visibleCount.value >= list.value.length) return
  visibleCount.value = Math.min(visibleCount.value + PAGE_STEP, list.value.length)
}

const today = computed(() => {
  const date = new Date()
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
})

const pad2 = (num) => String(num).padStart(2, '0')

const getCover = (item) => item.meta?.picUrl || ''

async function load(isRetry = false) {
  if (!boardId.value) return
  if (loading.value && !isRetry) return
  loading.value = true
  // 重试时重置失败标记与分页位置，避免旧的错误态残留
  loadError.value = false
  if (isRetry) {
    list.value = []
    visibleCount.value = PAGE_STEP
  }
  try {
    const sdk = musicSdk[source.value]
    if (!sdk?.leaderboard?.getList) {
      loadError.value = true
      return
    }
    const res = await sdk.leaderboard.getList(boardId.value, 1).catch(() => null)
    if (!res) {
      loadError.value = true
      return
    }
    // 接口返回的是扁平结构（img/albumName），统一转成标准 MusicInfoOnline（meta.picUrl 等）
    const songs = (res?.list ?? []).map(item => toNewMusicInfo(item)).filter(item => item.source !== 'local')
    list.value = markRawList(songs)
    visibleCount.value = PAGE_STEP
    // 卡片没传封面时用榜首歌曲封面兜底
    if (!cover.value) cover.value = songs[0]?.meta?.picUrl || ''
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function playFrom(index) {
  if (!list.value.length) return
  await setTempList('home_board', [...list.value])
  playList(LIST_IDS.TEMP, index)
}

const isPlayingItem = (item) => isPlay.value && playMusicInfo.musicInfo?.id === item.id

const qualityTag = (item) => {
  const qualitys = item.meta?._qualitys ?? {}
  if (qualitys.flac24bit) return 'Hi-Res'
  if (qualitys.flac || qualitys.ape || qualitys.wav) return '无损'
  if (qualitys['320k']) return '320K'
  return ''
}

const handleBack = () => {
  void router.push('/home').catch(() => {})
}

onMounted(() => { void load() })
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq.less';

.page {
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  background-color: var(--qm-surface);
}

// ------- 头部 -------
.head {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-s5);
  padding: var(--qm-s6) var(--qm-content-pad-right) var(--qm-s5) var(--qm-content-pad-left);
}

.cover {
  flex: none;
  position: relative;
  width: 132px;
  height: 132px;
  border-radius: var(--qm-radius-card);
  overflow: hidden;
  background-color: rgba(0, 0, 0, .04);
  box-shadow: var(--qm-shadow-2);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.coverEmpty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qm-text-5);

  :global(.svg-icon) { width: 30px; height: 30px; fill: currentColor; }
}

.info {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-start;
  gap: var(--qm-sp-3, 8px);
}

.title {
  margin: 0;
  font-size: var(--qm-font-title-xl);
  font-weight: var(--qm-fw-bold, 700);
  line-height: 32px;
  color: var(--qm-text-1);
}

.metaLine {
  margin: 0;
  display: flex;
  flex-flow: row nowrap;
  gap: var(--qm-s4);
  font-size: var(--qm-font-meta);
  color: var(--qm-text-4);
}

.actions {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-s3);
  margin-top: var(--qm-s2);
}

.btnPrimary {
  .qm-btn-primary();
  display: inline-flex;
  align-items: center;
  gap: var(--qm-sp-2, 6px);

  svg { display: block; }
  &:disabled { opacity: .5; cursor: not-allowed; }
}

.btnGhost {
  .qm-btn-ghost();
}

// ------- 列表 -------
.body {
  flex: auto;
  min-height: 0;
  overflow: auto;
  padding: 0 var(--qm-content-pad-right) var(--qm-s6) var(--qm-content-pad-left);
}

.tip {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: var(--qm-s3);
  padding: 60px 0;
  font-size: var(--qm-font-meta);
  color: var(--qm-text-4);

  p { margin: 0; }
}

// 增量渲染的底部提示（加载更多 / 没有更多了）
.moreTip {
  margin: 0;
  padding: 18px 0 26px;
  text-align: center;
  font-size: var(--qm-font-aux, 12px);
  color: var(--qm-text-5);
}

.thead {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  height: 34px;
  padding: 0 var(--qm-s3);
  font-size: var(--qm-font-meta);
  color: var(--qm-text-5);
}

.theadNum {
  flex: none;
  width: calc(40px + 44px + 8px + 24px + 8px); // 序号 + 缩略图 + 心形 + 间距
  padding-left: var(--qm-sp-2, 6px);
}

.theadCol {
  flex: none;
  padding-right: var(--qm-s3);
}

.list {
  display: flex;
  flex-flow: column nowrap;
}

.row {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  height: var(--qm-row-h);
  padding: 0 var(--qm-s3);
  border-radius: var(--qm-radius-btn);
  font-size: var(--qm-font-meta);
  color: var(--qm-text-2);
  cursor: default;
  transition: background-color var(--qm-t-fast);

  &:hover {
    background-color: var(--qm-hover);

    .rowBtns { opacity: 1; }
    .time { display: none; }
  }

  &.rowActive .name { color: var(--qm-primary); }
}

.num {
  flex: none;
  width: 40px;
  text-align: center;
  color: var(--qm-text-4);
  font-variant-numeric: tabular-nums;
}

.thumb {
  flex: none;
  width: 44px;
  height: 44px;
  margin-right: var(--qm-sp-3, 8px);
  border-radius: var(--qm-radius-xs, 6px);
  overflow: hidden;
  background-color: rgba(0, 0, 0, .05);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.thumbEmpty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qm-text-5);

  :global(.svg-icon) { width: 16px; height: 16px; fill: currentColor; }
}

// 行内收藏心形（常显，仿 QQ）
.love {
  flex: none;
  width: 24px;
  height: 32px;
  margin-right: var(--qm-sp-3, 8px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--qm-text-5);
  cursor: pointer;
  transition: color var(--qm-t-fast), transform var(--qm-t-fast);

  &:hover { color: #ec4141; transform: scale(1.1); }
  &.loveActive { color: #ec4141; }
}

.nameCell {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-s2);
}

.name {
  min-width: 0;
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.tag {
  flex: none;
  padding: 1px 5px;
  border-radius: var(--qm-radius-2xs, 4px);
  font-size: var(--qm-font-badge);
  font-style: normal;
  line-height: 14px;
  background-color: var(--qm-primary-soft);
  color: var(--qm-primary);
}

.singer,
.album {
  flex: none;
  width: 20%;
  min-width: 0;
  padding-right: var(--qm-s3);
  color: var(--qm-text-3);
  .mixin-ellipsis-1();
}

.album { width: 24%; color: var(--qm-text-4); }

.time {
  flex: none;
  width: 56px;
  text-align: right;
  color: var(--qm-text-4);
  font-variant-numeric: tabular-nums;
}

.rowBtns {
  flex: none;
  width: 64px;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--qm-sp-0, 2px);
  opacity: 0;
  transition: opacity var(--qm-t-fast);

  button {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--qm-text-3);
    cursor: pointer;
    transition: color var(--qm-t-fast), background-color var(--qm-t-fast);

    svg { fill: currentColor; }

    &:hover {
      background-color: var(--qm-primary-soft);
      color: var(--qm-primary);
    }
  }
}
</style>
