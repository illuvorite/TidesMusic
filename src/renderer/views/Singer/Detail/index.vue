<template>
  <div :class="[$style.page, 'qm-scroll', { [$style.pageSongs]: tab === 'songs' }]">
    <!-- ============ 歌手头部 ============ -->
    <!-- 歌曲页签下向下滚动列表时，头部与页签整体收起，列表全屏（瀑布式滚动） -->
    <header :class="[$style.header, $style.collapsible, { [$style.collapsibleHidden]: headHidden }]">
      <div :class="$style.avatar">
        <img v-if="singer.img && !imgBroken" :src="singer.img" alt="" @error="imgBroken = true">
        <span v-else :class="$style.avatarEmpty"><svg-icon name="music" /></span>
      </div>

      <div :class="$style.info">
        <h1 :class="$style.name" :title="singer.name">{{ singer.name || '歌手' }}</h1>
        <p :class="$style.meta">
          <span :class="$style.metaTag">{{ sourceName }}</span>
          <span v-if="songTotal">歌曲 {{ songTotal }}</span>
          <span v-if="albumTotal">专辑 {{ albumTotal }}</span>
        </p>
        <div :class="$style.actions">
          <button type="button" :class="$style.btnPrimary" :disabled="!hotSongs.length" @click="playFrom(hotSongs, 0)">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
            </svg>
            播放热门歌曲
          </button>
          <button v-if="singer.id" type="button" :class="$style.btnGhost" @click="openInSearch">
            在搜索中查看
          </button>
        </div>
      </div>
    </header>

    <!-- ============ 页签 ============ -->
    <nav :class="[$style.tabs, $style.collapsible, { [$style.collapsibleHidden]: headHidden }]">
      <button
        v-for="item in tabs" :key="item.id" type="button"
        :class="[$style.tab, { [$style.tabActive]: tab === item.id }]"
        @click="tab = item.id"
      >
        {{ item.label }}
        <span v-if="item.count" :class="$style.tabCount">{{ item.count }}</span>
      </button>
    </nav>

    <!-- ============ 精选 ============ -->
    <section v-if="tab === 'featured'" :class="$style.pane">
      <div v-if="albums.length" :class="$style.block">
        <h2 :class="$style.blockTitle">最新专辑</h2>
        <div :class="$style.albumRow">
          <div v-for="item in albums.slice(0, 2)" :key="item.id" :class="$style.albumCard" :title="item.info.name">
            <div :class="$style.albumCover">
              <img v-if="item.info.img && !brokenAlbumCovers.has(item.id)" :src="item.info.img" alt="" loading="lazy" @error="markAlbumCoverBroken(item.id)">
              <span v-else :class="$style.albumCoverEmpty"><svg-icon name="music" /></span>
            </div>
            <div :class="$style.albumInfo">
              <p :class="$style.albumDate">{{ item.publishDate || '发行日期未知' }}</p>
              <p :class="$style.albumName">{{ item.info.name }}</p>
            </div>
          </div>
        </div>
      </div>

      <div :class="$style.block">
        <div :class="$style.blockHeader">
          <h2 :class="$style.blockTitle">热门歌曲</h2>
          <button v-if="songTotal > HOT_LIMIT" type="button" :class="$style.moreLink" @click="tab = 'songs'">
            更多
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="M9 4.8 15.8 12 9 19.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
        <div :class="$style.listWrap">
          <!-- key 必须与「歌曲」页签的列表区分：否则 Vue 会复用同一个列表实例，虚拟列表不会重新渲染 -->
          <material-online-list
            ref="hotListRef"
            :key="`hot-${singer.id}`"
            :page="1" :limit="HOT_LIMIT" :total="Math.min(songTotal || hotSongs.length, HOT_LIMIT)"
            :list="hotSongs" :no-item="featuredNoItem"
            @play-list="(index) => playFrom(hotSongs, index)"
          />
        </div>
      </div>
    </section>

    <!-- ============ 歌曲 ============ -->
    <section v-else-if="tab === 'songs'" :class="[$style.pane, $style.paneSongs]">
      <div ref="listWrapRef" :class="[$style.listWrap, $style.listWrapFull]">
        <material-online-list
          ref="songsListRef"
          :key="`songs-${singer.id}`"
          :page="songPage" :limit="SONG_LIMIT" :total="songTotal"
          :list="songs" :no-item="songsNoItem"
          @play-list="(index) => playFrom(songs, index)"
        />
      </div>
    </section>

    <!-- ============ 专辑 ============ -->
    <section v-else-if="tab === 'albums'" :class="$style.pane">
      <div v-if="allAlbums.length" :class="$style.albumGrid">
        <div v-for="item in allAlbums" :key="item.id" :class="$style.albumGridItem" :title="item.info.name">
          <div :class="$style.albumCover">
            <img v-if="item.info.img && !brokenAlbumCovers.has(item.id)" :src="item.info.img" alt="" loading="lazy" @error="markAlbumCoverBroken(item.id)">
            <span v-else :class="$style.albumCoverEmpty"><svg-icon name="music" /></span>
          </div>
          <p :class="$style.albumGridName">{{ item.info.name }}</p>
          <p :class="$style.albumGridDate">{{ item.publishDate || '' }}</p>
        </div>
      </div>
      <p v-else :class="$style.tip">{{ albumsNoItem }}</p>
      <div v-if="albumTotal > ALBUM_LIMIT" :class="$style.pagination">
        <material-pagination :count="albumTotal" :limit="ALBUM_LIMIT" :page="albumPage" @btn-click="handleAlbumPage" />
      </div>
    </section>

    <!-- ============ 详情 ============ -->
    <section v-else :class="$style.pane">
      <div :class="$style.block">
        <h2 :class="$style.blockTitle">歌手信息</h2>
        <ul :class="$style.detailList">
          <li><span>歌手</span>{{ singer.name || '—' }}</li>
          <li><span>来源</span>{{ sourceName }}</li>
          <li v-if="songTotal"><span>歌曲数</span>{{ songTotal }}</li>
          <li v-if="albumTotal"><span>专辑数</span>{{ albumTotal }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import musicSdk from '@renderer/utils/musicSdk'
import { getSourceName } from '@renderer/utils/personalRecommend'
import { toNewMusicInfo } from '@common/utils/tools'
import { setTempList } from '@renderer/store/list/action'
import { playList } from '@renderer/core/player/action'
import { LIST_IDS } from '@common/constants'
import MaterialOnlineList from '@renderer/components/material/OnlineList/index.vue'
import MaterialPagination from '@renderer/components/material/Pagination.vue'

const t = useI18n()


const HOT_LIMIT = 10
const SONG_LIMIT = 50
const ALBUM_LIMIT = 12

const route = useRoute()
const router = useRouter()

const tab = ref('featured')
const imgBroken = ref(false)
// 专辑封面裂图兜底：原先只判断 item.info.img 是否存在，图片 404 后会留一块空白。
// 用 Set 记录已损坏的专辑 id，坏图时改走占位分支。
// 注意：本文件是 <script setup>（非 TS），不要写类型标注。
const brokenAlbumCovers = ref(new Set())
const markAlbumCoverBroken = (id) => {
  brokenAlbumCovers.value.add(id)
}
const hotListRef = ref(null)
const songsListRef = ref(null)
const listWrapRef = ref(null)
// 歌曲页签：向下滚动列表时收起头部与页签（瀑布式全屏滚动）
const headHidden = ref(false)
let songsScrollEl = null

// 歌手基本信息：优先取路由 query（从歌手列表点进来时已带上），避免额外接口依赖
const singer = ref({ id: '', name: '', img: '' })
const source = ref('tx')

const hotSongs = ref([])
const songs = ref([])
const albums = ref([])
const allAlbums = ref([])

const songTotal = ref(0)
const albumTotal = ref(0)
const songPage = ref(1)
const albumPage = ref(1)
// 歌曲页签是否还有下一页（滚动追加用）
const hasMore = ref(false)

const loading = ref(false)
const failed = ref(false)
const songsLoading = ref(false)
const albumsLoading = ref(false)

let featuredSeq = 0
let songsSeq = 0

const tabs = computed(() => ([
  { id: 'featured', label: t('common__featured') },
  { id: 'songs', label: t('singer__tab_songs'), count: songTotal.value || 0 },
  { id: 'albums', label: t('singer__tab_albums'), count: albumTotal.value || 0 },
  { id: 'detail', label: t('singer__tab_detail') },
]))

const sourceName = computed(() => getSourceName(source.value) || source.value)
const sdk = computed(() => musicSdk[source.value]?.singer)
const supported = computed(() => typeof sdk.value?.getSongList === 'function')

const featuredNoItem = computed(() => {
  if (hotSongs.value.length) return ''
  if (loading.value) return '加载中…'
  if (failed.value) return '数据获取失败，请稍后重试'
  if (!supported.value) return `当前音源（${sourceName.value}）暂不支持歌手主页`
  return '暂无歌曲'
})
const songsNoItem = computed(() => {
  if (songs.value.length) return ''
  if (songsLoading.value) return '加载中…'
  if (failed.value) return '数据获取失败，请稍后重试'
  if (!supported.value) return `当前音源（${sourceName.value}）暂不支持歌手主页`
  return '暂无歌曲'
})
const albumsNoItem = computed(() => {
  if (allAlbums.value.length) return ''
  if (albumsLoading.value) return '加载中…'
  return '暂无专辑'
})

// 读取路由参数（歌手 id / 名称 / 头像 / 音源）
const applyQuery = (query) => {
  singer.value = {
    id: query.id ? String(query.id) : '',
    name: query.name ? String(query.name) : '',
    img: query.img ? String(query.img) : '',
  }
  source.value = query.source ? String(query.source) : 'tx'
  imgBroken.value = false
}

// 精选页签：热门歌曲（前 10 首）+ 歌曲总数
async function loadFeatured() {
  if (!supported.value) {
    hotSongs.value = []
    songTotal.value = 0
    return
  }
  const requestId = ++featuredSeq
  loading.value = true
  failed.value = false
  try {
    const result = await sdk.value.getSongList(singer.value.id, 1, HOT_LIMIT).catch(() => null)
    if (requestId !== featuredSeq) return
    if (!result) {
      failed.value = true
      hotSongs.value = []
      return
    }
    songTotal.value = result.total ?? 0
    // 歌手模块返回的是 SDK 旧结构（albumName / songmid / types，没有 meta），
    // 必须先归一化成 MusicInfoOnline 再交给 material-online-list ——
    // 否则行模板读 item.meta.albumName 会抛 TypeError，整棵视图渲染失败（表现为整页空白）。
    // markRaw：避免列表被转成响应式代理，播放/收藏等流程会把歌曲对象传给 IPC，代理对象无法序列化
    hotSongs.value = markRaw((result.list ?? []).map(toNewMusicInfo))
  } finally {
    if (requestId === featuredSeq) loading.value = false
  }
}

// 歌曲页签：每页 50 条，滚到底部自动追加下一页（瀑布滚动，不再用分页）
async function loadSongs(page = 1, append = false) {
  if (!supported.value) {
    songs.value = []
    hasMore.value = false
    return
  }
  const requestId = ++songsSeq
  songsLoading.value = true
  failed.value = false
  try {
    const result = await sdk.value.getSongList(singer.value.id, page, SONG_LIMIT).catch(() => null)
    if (requestId !== songsSeq) return
    if (!result) {
      if (!append) songs.value = []
      failed.value = true
      return
    }
    const list = markRaw((result.list ?? []).map(toNewMusicInfo))
    const total = result.total ?? 0
    songTotal.value = total
    songs.value = append ? markRaw([...songs.value, ...list]) : list
    songPage.value = page
    hasMore.value = list.length > 0 && songs.value.length < total
  } finally {
    if (requestId === songsSeq) songsLoading.value = false
  }
}

async function loadAlbums(page = 1) {
  if (typeof sdk.value?.getAlbumList !== 'function') {
    albums.value = []
    allAlbums.value = []
    albumTotal.value = 0
    return
  }
  albumsLoading.value = true
  try {
    const result = await sdk.value.getAlbumList(singer.value.id, page, ALBUM_LIMIT).catch(() => null)
    if (!result) return
    albumTotal.value = result.total ?? 0
    allAlbums.value = markRaw([...(result.list ?? [])])
    if (page === 1) albums.value = allAlbums.value
    albumPage.value = page
  } finally {
    albumsLoading.value = false
  }
}

const handleAlbumPage = (page) => {
  if (page === albumPage.value) return
  void loadAlbums(page)
}

// 播放：与歌单详情一致，使用临时列表 + 播放器
const playFrom = async(list, index = 0) => {
  if (!list?.length) return
  const listId = `singer__${source.value}__${singer.value.id}`
  await setTempList(listId, [...list])
  playList(LIST_IDS.TEMP, index)
}

const openInSearch = () => {
  void router.push({ path: '/search', query: { text: singer.value.name, source: source.value } }).catch(() => {})
}

// ---- 歌曲页签：滚动列表时收起头部（头部 → 全屏瀑布滚动）----
const handleSongsScroll = () => {
  if (!songsScrollEl) return
  const top = songsScrollEl.scrollTop
  // 用两个阈值避免临界点反复抖动
  if (top > 48) headHidden.value = true
  else if (top < 16) headHidden.value = false
  // 距离底部 320px 内自动追加下一页（瀑布滚动）
  if (
    hasMore.value &&
    !songsLoading.value &&
    songsScrollEl.scrollHeight - top - songsScrollEl.clientHeight < 320
  ) {
    void loadSongs(songPage.value + 1, true)
  }
}

const unbindSongsScroll = () => {
  if (!songsScrollEl) return
  songsScrollEl.removeEventListener('scroll', handleSongsScroll)
  songsScrollEl = null
}

const bindSongsScroll = (retry = 0) => {
  unbindSongsScroll()
  // 滚动容器由 material-online-list → VirtualizedList 渲染，挂载完成后再取；未就绪则重试
  window.setTimeout(() => {
    const content = songsListRef.value?.dom_listContent
    const el = content ? content.querySelector('.scroll') : null
    if (!el) {
      if (retry < 6) bindSongsScroll(retry + 1)
      return
    }
    songsScrollEl = el
    el.addEventListener('scroll', handleSongsScroll, { passive: true })
    handleSongsScroll()
  }, 120)
}

watch(tab, (value) => {
  if (value === 'songs') {
    bindSongsScroll()
  } else {
    unbindSongsScroll()
    headHidden.value = false
  }
})


const loadAll = () => {
  void loadFeatured()
  void loadSongs(1)
  void loadAlbums(1)
}

watch(() => route.query, (query) => {
  if (route.name !== 'SingerDetail') return
  applyQuery(query)
  tab.value = 'featured'
  loadAll()
})

onMounted(() => {
  applyQuery(route.query)
  loadAll()
})

onBeforeUnmount(() => {
  unbindSongsScroll()
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.page {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: var(--qm-content-pad-top) var(--qm-content-pad-right) 24px var(--qm-content-pad-left);
  background-color: var(--qm-surface);
}

// 歌曲页签：页面本身不滚动，改由列表内部滚动，才能配合「滚动收起头部」
.pageSongs {
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
  padding-bottom: 0;
}

// 可收起区域（歌手头部 / 页签）
.collapsible {
  flex: none;
  max-height: 280px;
  overflow: hidden;
  transition: max-height .3s ease, opacity .22s ease, margin .3s ease, padding .3s ease;
}

// 双类选择器提高优先级：否则会被 .tabs 自身的 margin 简写（同为单类、定义在后）覆盖，收起时仍留下 24/16px 外边距
.collapsible.collapsibleHidden {
  max-height: 0;
  opacity: 0;
  margin: 0;
  padding-top: 0;
  padding-bottom: 0;
  pointer-events: none;
}

// ---------- 歌手头部 ----------
.header {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-9, 24px);
}

.avatar {
  flex: none;
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--qm-hover);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.avatarEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--qm-text-5);

  :global(.svg-icon) { width: 40px; height: 40px; fill: currentColor; }
}

.info {
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-4, 10px);
}

.name {
  margin: 0;
  font-size: 30px;
  font-weight: var(--qm-fw-bold, 700);
  line-height: 1.2;
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.meta {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-7, 16px);
  margin: 0;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-3);
}

.metaTag {
  padding: 1px 8px;
  border-radius: var(--qm-radius-chip);
  background-color: var(--qm-primary-soft);
  color: var(--qm-primary);
  font-size: var(--qm-fs-xs, 12px);
}

.actions {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  margin-top: var(--qm-sp-2, 6px);
}

.btnPrimary {
  display: inline-flex;
  align-items: center;
  gap: var(--qm-sp-1, 4px);
  height: 32px;
  padding: 0 18px;
  border: 0;
  border-radius: var(--qm-radius-chip);
  background-color: var(--qm-primary);
  color: var(--qm-text-invert);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), opacity var(--qm-t-fast);

  &:hover:not(:disabled) { background-color: var(--qm-primary-hover); }
  &:disabled { opacity: 0.5; cursor: default; }
}

.btnGhost {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--qm-line-1, rgba(0, 0, 0, .1));
  border-radius: var(--qm-radius-chip);
  background: transparent;
  color: var(--qm-text-2);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  transition: color var(--qm-t-fast), border-color var(--qm-t-fast);

  &:hover {
    color: var(--qm-primary);
    border-color: var(--qm-primary);
  }
}

// ---------- 页签 ----------
.tabs {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 34px;
  margin: var(--qm-sp-9, 24px) 0 var(--qm-sp-7, 16px);
  border-bottom: 1px solid var(--qm-line-1, rgba(0, 0, 0, .06));
}

.tab {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 0 0 12px;
  border: 0;
  background: none;
  font-size: var(--qm-fs-md, 14px);
  color: var(--qm-text-3);
  cursor: pointer;
  transition: color var(--qm-t-fast);

  &:hover { color: var(--qm-text-1); }
}

.tabCount {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
}

.tabActive {
  color: var(--qm-text-1);
  font-weight: var(--qm-fw-semibold, 600);

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -1px;
    width: 26px;
    height: 3px;
    margin-left: -13px;
    border-radius: 2px;
    background-color: var(--qm-primary);
  }

  .tabCount { color: var(--qm-primary); }
}

// ---------- 内容 ----------
.pane { padding-bottom: var(--qm-sp-9, 24px); }

.block {
  + .block { margin-top: var(--qm-sp-10, 28px); }
}

.blockHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qm-sp-4, 10px);
}

.blockTitle {
  margin: 0 0 var(--qm-sp-5, 12px);
  font-size: var(--qm-fs-lg, 17px);
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
}

.moreLink {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-bottom: var(--qm-sp-5, 12px);
  padding: 0;
  border: 0;
  background: none;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-4);
  cursor: pointer;
  transition: color var(--qm-t-fast);

  &:hover { color: var(--qm-primary); }
  svg { display: block; }
}

// 最新专辑：横排卡片
.albumRow {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--qm-sp-6, 14px);
}

.albumCard {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: var(--qm-sp-4, 10px);
  border-radius: var(--qm-radius-card);
  // 半透明底：跟随皮肤透明度。--qm-card 是不透明主色（用于弹层），内容卡片不要用
  background-color: var(--qm-hover);
  cursor: pointer;
  transition: background-color var(--qm-t-fast);

  &:hover { background-color: var(--qm-hover-strong); }
}

.albumCover {
  flex: none;
  width: 64px;
  height: 64px;
  border-radius: var(--qm-radius-sm, 8px);
  overflow: hidden;
  background-color: var(--qm-hover);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.albumCoverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--qm-text-5);

  :global(.svg-icon) { width: var(--qm-icon); height: var(--qm-icon); fill: currentColor; }
}

.albumInfo { min-width: 0; }

.albumDate {
  margin: 0 0 6px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
}

.albumName {
  margin: 0;
  font-size: var(--qm-fs-md, 14px);
  font-weight: var(--qm-fw-medium, 500);
  color: var(--qm-text-1);
  .mixin-ellipsis-1();

  .albumCard:hover & { color: var(--qm-primary); }
}

// 歌曲列表（精选热门歌曲用固定高度；歌曲页签用 listWrapFull 占满剩余空间）
.listWrap {
  height: 520px;
  overflow: hidden;
  position: relative;
}

.listWrapFull {
  flex: auto;
  min-height: 0;
  height: auto;
  // 瀑布滚动：隐藏分页（滚到底自动追加下一页）
  :global([class*='pagination']) { display: none; }
  // 列头（sticky）直接不显示：歌曲页签是沉浸式全屏列表，列名意义不大，
  // 留着即使透明也会占 37px，滚动时还会盖在歌曲上
  :global(.thead) { display: none; }
}

// 歌曲页签面板：撑满剩余高度
.paneSongs {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
  padding-bottom: 0;
}

// 专辑网格
.albumGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--qm-sp-8, 20px) var(--qm-sp-6, 14px);
}

.albumGridItem { min-width: 0; cursor: pointer; }

.albumGridItem .albumCover {
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  border-radius: var(--qm-radius-card);

  img { transition: transform var(--qm-t-slow); }
}

.albumGridItem:hover .albumCover img { transform: scale(1.05); }

.albumGridName {
  margin: 10px 0 2px;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-1);
  .mixin-ellipsis-1();

  .albumGridItem:hover & { color: var(--qm-primary); }
}

.albumGridDate {
  margin: 0;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
}

// 详情
.detailList {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-2);

  li {
    display: flex;
    flex-flow: row nowrap;
    gap: var(--qm-sp-7, 16px);
    padding: 10px 0;
    border-bottom: 1px solid var(--qm-line-1, rgba(0, 0, 0, .05));

    span {
      flex: none;
      width: 80px;
      color: var(--qm-text-4);
    }
  }
}

.tip {
  padding: 40px 0;
  text-align: center;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-4);
}

.pagination {
  padding: var(--qm-sp-8, 20px) 0 var(--qm-sp-4, 10px);
  text-align: center;
}
</style>
