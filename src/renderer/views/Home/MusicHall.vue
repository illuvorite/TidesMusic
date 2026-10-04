<template>
  <div
    ref="pageRef"
    :class="[$style.page, { [$style.pageFill]: tab === 'square' }]"
    class="qm-scroll"
    :style="tab === 'square' ? { overflow: 'hidden' } : null"
  >
    <header :class="$style.head">
      <div :class="$style.titleRow">
        <h1 :class="$style.title">乐馆</h1>
        <SourceTabs :model-value="source" @change="handleSourceChange" />
      </div>
      <nav :class="$style.tabs">
        <button v-for="item in tabs" :key="item.id" type="button" :class="[$style.tab, { [$style.tabActive]: tab === item.id }]" @click="handleTabClick(item.id)">{{ item.label }}</button>
      </nav>
    </header>

    <!-- ============ 歌手 ============ -->
    <section v-if="tab === 'singer'" :class="$style.singerPane">
      <div :class="$style.filterRow">
        <button
          v-for="item in singerAreaList" :key="item.id" type="button"
          :class="[$style.pill, { [$style.pillActive]: singerArea === item.id }]"
          @click="handleSingerArea(item.id)"
        >{{ item.label }}</button>
      </div>

      <div :class="$style.filterRow">
        <button
          v-for="item in singerSexList" :key="item.id" type="button"
          :class="[$style.pill, { [$style.pillActive]: singerSex === item.id }]"
          @click="handleSingerSex(item.id)"
        >{{ item.label }}</button>
        <div :class="$style.filterMore">
          <button type="button" :class="$style.moreFilter" @click.stop="showLetterMenu = !showLetterMenu">
            {{ singerIndexLabel }}
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="M6 9.5l6 5.5 6-5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div v-if="showLetterMenu" :class="[$style.letterMenu, { [$style.letterMenuOpen]: showLetterMenu }]">
            <button
              v-for="item in singerIndexList" :key="item.id" type="button"
              :class="[$style.letterMenuItem, { [$style.letterMenuItemActive]: singerIndex === item.id }]"
              @click="handleSingerIndex(item.id)"
            >{{ item.label }}</button>
          </div>
        </div>
      </div>

      <div :class="$style.letterRow">
        <button
          v-for="item in singerIndexList" :key="item.id" type="button"
          :class="[$style.letter, { [$style.letterActive]: singerIndex === item.id }]"
          @click="handleSingerIndex(item.id)"
        >{{ item.label }}</button>
      </div>

      <div v-if="singers.length" :class="$style.singerGrid">
        <div v-for="item in singers" :key="item.id" :class="$style.singerCard" :title="item.name" @click="openSinger(item)">
          <div :class="$style.singerAvatar">
            <img v-if="item.img && !brokenCovers[item.id]" :src="item.img" alt="" loading="lazy" @error="brokenCovers[item.id] = true">
            <span v-else :class="$style.singerAvatarEmpty"><svg-icon name="music" /></span>
          </div>
          <p :class="$style.singerName">{{ item.name }}</p>
        </div>
        <template v-if="singerLoading">
          <div v-for="n in 4" :key="`skeleton-${n}`" :class="$style.singerCard">
            <div :class="[$style.singerAvatar, $style.singerSkeleton]" />
            <p :class="$style.singerName">&nbsp;</p>
          </div>
        </template>
      </div>

      <div v-else-if="singerLoading" :class="$style.singerGrid">
        <div v-for="n in 8" :key="`skeleton-${n}`" :class="$style.singerCard">
          <div :class="[$style.singerAvatar, $style.singerSkeleton]" />
          <p :class="$style.singerName">&nbsp;</p>
        </div>
      </div>

      <div v-else :class="$style.tip">
        <p>{{ singerTip }}</p>
        <button v-if="singerSupported" type="button" :class="$style.btnGhost" @click="loadSingers(true)">重新获取</button>
      </div>

      <div v-if="singers.length && singerLoading" :class="$style.loadingMore">加载中…</div>
      <div v-else-if="singers.length && !singerHasMore" :class="$style.loadingMore">没有更多了</div>
    </section>

    <template v-else-if="tab === 'featured'">
      <section v-if="banners.length" :class="$style.banner" @mouseenter="paused = true" @mouseleave="paused = false">
        <div :class="$style.bannerTrack" :style="{ transform: `translateX(-${bannerIndex * 100}%)` }">
          <div v-for="item in banners" :key="item.id" :class="$style.bannerSlide" @click="openPlaylist(item)">
            <img :src="item.img" alt="" loading="lazy">
            <span :class="$style.bannerMask" />
            <span :class="$style.bannerName" :title="item.name">{{ item.name }}</span>
          </div>
        </div>
        <div :class="$style.bannerDots">
          <i v-for="(item, index) in banners" :key="index" :class="{ [$style.dotActive]: index === bannerIndex }" @click.stop="bannerIndex = index" />
        </div>
      </section>

      <section v-for="sec in sections" :key="sec.key" :class="$style.block">
        <div :class="$style.blockHead">
          <h2 :class="$style.blockTitle">{{ sec.title }}<span v-if="sec.sub" :class="$style.blockSub">{{ sec.sub }}</span></h2>
          <button type="button" :class="$style.more" @click="goSquare(sec.sortId)">
            更多
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
        </div>
        <div :class="$style.row">
          <div v-for="item in sec.list" :key="item.id" :class="$style.card" @click="openPlaylist(item)">
            <div :class="$style.cardCover">
              <img v-if="item.img" :src="item.img" alt="" loading="lazy">
              <span v-else class="row-cover-empty"><svg-icon name="music" /></span>
              <span v-if="item.play_count" :class="$style.cardPlay">{{ item.play_count }}</span>
            </div>
            <p :class="$style.cardName" :title="item.name">{{ item.name }}</p>
            <p :class="$style.cardAuthor">{{ item.author || '—' }}</p>
          </div>
        </div>
      </section>
      <div v-if="!sections.length" :class="$style.tip">{{ loading ? '加载中…' : '该平台暂时没有取到歌单' }}</div>
    </template>

    <div v-else-if="tab === 'boards'" :class="$style.boards">
      <div v-for="board in boards" :key="board.id" :class="$style.board" @click="openBoard(board)">
        <div :class="$style.boardCover">
          <img v-if="board.img" :src="board.img" alt="" loading="lazy">
          <span v-else class="row-cover-empty"><svg-icon name="music" /></span>
        </div>
        <div :class="$style.boardInfo">
          <p :class="$style.boardName">{{ board.name }}</p>
          <p v-for="(song, index) in board.songs" :key="index" :class="$style.boardSong">
            <i>{{ index + 1 }}</i>
            <span :title="`${song.name} - ${song.singer}`">{{ song.name }}<template v-if="song.singer"> - {{ song.singer }}</template></span>
          </p>
        </div>
      </div>
      <div v-if="!boards.length" :class="$style.tip">{{ loading ? '加载中…' : '该平台暂时没有取到榜单' }}</div>
    </div>

    <!-- ============ 分类歌单（内嵌歌单广场：标签筛选 + 排序 + 歌单网格 + 分页） ============ -->
    <section v-else-if="tab === 'square'" :class="$style.squarePane">
      <div :class="$style.squareBar">
        <tag-list
          :source="source" :tag-id="squareTagId" :sort-id="squareSortId" inline
          @change="handleSquareTagChange"
        />
        <sort-tab
          :source="source" :tag-id="squareTagId" :sort-id="squareSortId" inline
          @change="handleSquareSortChange"
        />
        <base-btn :class="$style.importBtn" outline min @click="visibleImport = true">打开歌单</base-btn>
      </div>
      <div :class="$style.squareBody">
        <song-list :list-info="squareListInfo" @toggle-page="handleSquarePage" />
      </div>
      <open-list-modal v-model="visibleImport" :source-list="sourceList" />
    </section>

    <!-- 听书 / 数字专辑 / 音质专区 / 边听边玩 / 视频 / 频道：暂无内容源 -->
    <div v-else :class="$style.squareTip">
      <p>「{{ activeTabLabel }}」频道暂未接入</p>
      <button type="button" :class="$style.btnGhost" @click="handleTabClick('featured')">回到精选</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from '@common/utils/vueTools'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import SourceTabs from '@renderer/components/common/SourceTabs.vue'
import musicSdk from '@renderer/utils/musicSdk'
import { getAvailableSources, getInitialSource, getSourceName, saveSource } from '@renderer/utils/personalRecommend'
import TagList from '@renderer/views/songList/List/components/TagList.vue'
import SortTab from '@renderer/views/songList/List/components/SortTab.vue'
import SongList from '@renderer/views/songList/List/components/SongList.vue'
import OpenListModal from '@renderer/views/songList/List/components/OpenListModal.vue'

const router = useRouter()
// 页签顺序对齐参考图：精选 / 听书 / 排行 / 歌手 / 分类歌单 / 数字专辑 / 音质专区 / 边听边玩 / 视频 / 频道
// （听书、数字专辑、音质专区、边听边玩、视频、频道暂无内容源，仅保留入口）
const tabs = [
  { id: 'featured', label: '精选' },
  { id: 'audiobook', label: '听书' },
  { id: 'boards', label: '排行' },
  { id: 'singer', label: '歌手' },
  { id: 'square', label: '分类歌单' },
  { id: 'album', label: '数字专辑' },
  { id: 'hires', label: '音质专区' },
  { id: 'game', label: '边听边玩' },
  { id: 'video', label: '视频' },
  { id: 'channel', label: '频道' },
]
// 页签与路由 query 双向同步：切换页签时写入 ?tab=xxx，
// 这样顶部工具栏的「后退/前进」能回到具体的页签（否则重新挂载只会回到默认的精选页）
const route = useRoute()
const TAB_IDS = tabs.map(item => item.id)
const resolveTab = value => (TAB_IDS.includes(value) ? value : 'featured')
const tab = ref(resolveTab(route.query.tab))
const handleTabClick = (id) => {
  if (tab.value === id) return
  tab.value = id
  void router.push({ path: '/home/music-hall', query: { tab: id } }).catch(() => {})
}
const activeTabLabel = computed(() => tabs.find(item => item.id === tab.value)?.label ?? '该')
const source = ref(getInitialSource())
const loading = ref(false)
const banners = ref([])
const bannerIndex = ref(0)
const paused = ref(false)
const boards = ref([])
const officialList = ref([])
const newList = ref([])
const hotList = ref([])
const officialSortId = ref('')
const newSortId = ref('')
const hotSortId = ref('')

// 取不到数据的区块直接不显示（不要回退成其它池子，否则两个区块会出现完全相同的内容）
const sections = computed(() => ([
  { key: 'official', title: '官方歌单', sub: '官方精选订阅歌单', sortId: officialSortId.value, list: officialList.value },
  { key: 'new', title: '新歌首发', sub: '', sortId: newSortId.value, list: newList.value },
  { key: 'hot', title: '热门歌单', sub: '', sortId: hotSortId.value, list: hotList.value },
]).filter(sec => sec.list.length))

const shuffle = (list) => {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// tx 的 getList 内部会 cancelHttp 掉上一个未完成的请求：与页面其它模块（榜单 / 分类歌单）
// 并发时可能被取消，因此单页请求失败后延迟重试几次
async function fetchSquarePage(sdk, sortId, tagId, page, retry = 0) {
  const result = await sdk.getList(sortId, tagId, page).catch(() => null)
  if (result || retry >= 2) return result
  await new Promise(resolve => { setTimeout(resolve, 300 * (retry + 1)) })
  return fetchSquarePage(sdk, sortId, tagId, page, retry + 1)
}

// 取一个排序（或分类）下 2 页歌单并打乱：每次进入乐馆内容都不同。
// 注意必须串行请求：tx.songList.getList 内部会 cancelHttp 掉上一个未完成的请求，
// 并发调用会导致除最后一个之外全部被取消（表现为分区内容为空、多分区内容重复）
async function fetchPlaylistPool(sdk, sortId, tagId = '') {
  const list = []
  for (const page of [1, 2]) {
    const result = await fetchSquarePage(sdk, sortId, tagId, page)
    list.push(...(result?.list ?? []).filter(item => item?.id && item.name))
  }
  return shuffle(list)
}

async function loadFeatured() {
  loading.value = true
  try {
    const sdk = musicSdk[source.value]?.songList
    if (!sdk?.getList) return
    const sortList = sdk.sortList ?? []
    newSortId.value = (sortList.find(item => (item.name ?? '').includes('新')) ?? sortList[0])?.id ?? ''
    hotSortId.value = (sortList.find(item => (item.name ?? '').includes('热')) ?? sortList[0])?.id ?? ''
    officialSortId.value = newSortId.value

    // 「官方歌单」用分类里的官方歌单分类（tx 为 3317，接口实测有数据）：
    // 此前它和「热门歌单」用同一个排序，导致两个区块内容完全一样
    let officialTagId = ''
    if (typeof sdk.getTag === 'function') {
      // 注意：不能只写 `tagGroups?.flatMap(...)`。若 getTag resolve 的是**非数组**对象
      // （部分平台 getTag 的返回结构与预期不符），`?.` 只保护了 tagGroups 本身，
      // 后面的 .flatMap 仍会抛 `flatMap is not a function`，把整个乐馆的加载流程打断。
      const tagGroups = await sdk.getTag().catch(() => null)
      const groupList = Array.isArray(tagGroups) ? tagGroups : []
      const tag = groupList
        .flatMap(group => (Array.isArray(group?.list) ? group.list : []))
        .find(item => (item?.name ?? '').includes('官方'))
      officialTagId = tag?.id ? String(tag.id) : ''
    }
    if (!officialTagId && source.value === 'tx') officialTagId = '3317'

    // 串行拉取（见 fetchPlaylistPool 注释：并发会被 getList 内部互相取消）
    const official = await fetchPlaylistPool(sdk, officialSortId.value, officialTagId)
    const fresh = await fetchPlaylistPool(sdk, newSortId.value)
    const hot = await fetchPlaylistPool(sdk, hotSortId.value)
    officialList.value = official.slice(0, 10)
    newList.value = fresh.slice(0, 10)
    hotList.value = hot.slice(0, 10)
    // banner 从两个池子里随机取：此前按播放量取 Top5，导致每次进来都是同一批歌单
    banners.value = shuffle([...official, ...hot]).slice(0, 5)
    bannerIndex.value = 0
  } finally {
    loading.value = false
  }
}

/** 排行榜：榜单封面 + 前 3 首歌（仿 QQ 乐馆「排行」） */
async function loadBoards() {
  loading.value = true
  try {
    const sdk = musicSdk[source.value]
    if (!sdk?.leaderboard?.getBoards) {
      boards.value = []
      return
    }
    const result = await sdk.leaderboard.getBoards().catch(() => null)
    const list = (result?.list ?? []).filter(board => board?.id).slice(0, 8)
    boards.value = list.map(board => ({ ...board, songs: [] }))
    await Promise.all(list.map(async(board, index) => {
      // tx 的 getList 第三参是 retryNum（传 3 会直接拒绝），所以只传页码
      const res = await sdk.leaderboard.getList(board.bangid || board.id, 1).catch(() => null)
      const songs = (res?.list ?? []).slice(0, 3).map(item => ({
        name: item.name ?? item.songName ?? '',
        singer: item.singer ?? '',
        img: item.img ?? '',
      }))
      boards.value[index] = {
        ...boards.value[index],
        img: board.img || songs[0]?.img || '',
        songs,
      }
    }))
  } finally {
    loading.value = false
  }
}

// ------- 歌手（乐馆 - 歌手页） -------
const pageRef = ref(null)
const singerAreaList = [
  { id: 'all', label: '全部' },
  { id: 'mainland', label: '内地' },
  { id: 'hktw', label: '港台' },
  { id: 'western', label: '欧美' },
  { id: 'japan', label: '日本' },
  { id: 'korea', label: '韩国' },
]
const singerSexList = [
  { id: 'all', label: '全部' },
  { id: 'male', label: '男' },
  { id: 'female', label: '女' },
  { id: 'group', label: '组合' },
]
const singerIndexList = [
  { id: 'all', label: '全部' },
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => ({ id: letter, label: letter })),
  { id: '#', label: '#' },
]

const singerArea = ref('all')
const singerSex = ref('all')
const singerIndex = ref('all')
const singers = ref([])
const singerLoading = ref(false)
const singerHasMore = ref(false)
const singerFailed = ref(false)
const singerPage = ref(1)
const showLetterMenu = ref(false)
const brokenCovers = reactive({})

let singerRequestSeq = 0

const singerSupported = computed(() => !!musicSdk[source.value]?.singer?.getSingerList)
const singerIndexLabel = computed(() => singerIndexList.find(item => item.id === singerIndex.value)?.label ?? '全部')
const singerTip = computed(() => {
  if (!singerSupported.value) return `当前音源（${getSourceName(source.value)}）暂不支持歌手列表，可在上方切换音源`
  if (singerFailed.value) return '歌手列表获取失败，请稍后重试'
  return '没有取到歌手数据'
})

async function loadSingers(reset = false) {
  if (singerLoading.value && !reset) return
  const sdk = musicSdk[source.value]?.singer
  if (!sdk?.getSingerList) {
    singers.value = []
    singerHasMore.value = false
    return
  }
  // 记录请求序号：筛选条件切换后，旧请求的结果直接丢弃，避免列表串数据
  const requestId = ++singerRequestSeq
  singerLoading.value = true
  singerFailed.value = false
  try {
    const page = reset ? 1 : singerPage.value
    const result = await sdk.getSingerList({
      area: singerArea.value,
      sex: singerSex.value,
      index: singerIndex.value,
      page,
    }).catch(() => null)
    if (requestId !== singerRequestSeq) return
    if (!result) {
      if (reset) singers.value = []
      singerHasMore.value = false
      singerFailed.value = true
      return
    }
    const list = (result.list ?? []).filter(item => item.id && item.name)
    singers.value = reset ? list : [...singers.value, ...list]
    singerPage.value = page + 1
    singerHasMore.value = !!result.hasMore
  } finally {
    if (requestId === singerRequestSeq) singerLoading.value = false
  }
}

const handleSingerArea = (id) => {
  if (singerArea.value === id) return
  singerArea.value = id
  void loadSingers(true)
}

const handleSingerSex = (id) => {
  if (singerSex.value === id) return
  singerSex.value = id
  void loadSingers(true)
}

const handleSingerIndex = (id) => {
  showLetterMenu.value = false
  if (singerIndex.value === id) return
  singerIndex.value = id
  void loadSingers(true)
}

// 点击歌手进入歌手主页（不再是跳到搜索页）
const openSinger = (item) => {
  void router.push({
    path: '/singer/detail',
    query: { id: item.id, name: item.name, img: item.img, source: source.value },
  }).catch(() => {})
}

// ------- 分类歌单（乐馆内嵌歌单广场：标签筛选 + 排序 + 网格 + 分页） -------
// tx 的「全部」广场接口（PlayListPlazaServer id=10000000）匿名返回的数据很旧（多为 2020 年前后），
// 默认落到「流行」分类（PlayListCategoryServer，按更新时间返回，每天都有新歌单）
const DEFAULT_SQUARE_TAG = { tx: '3152' }
const squareTagId = ref(DEFAULT_SQUARE_TAG[source.value] ?? '')
const squareSortId = ref('')
const squareLoading = ref(false)
const visibleImport = ref(false)
const squareListInfo = reactive({
  list: [],
  total: 0,
  page: 1,
  limit: 36,
  key: null,
  noItemLabel: '',
  source: source.value,
  tagId: '',
  sortId: '',
})

let squareRequestSeq = 0

const sourceList = computed(() => getAvailableSources().map(id => ({ id, name: getSourceName(id) })))

async function loadSquare(page = 1) {
  const sdk = musicSdk[source.value]?.songList
  if (!sdk?.getList) {
    squareListInfo.list = []
    squareListInfo.total = 0
    squareListInfo.noItemLabel = `当前音源（${getSourceName(source.value)}）暂不支持分类歌单，可在上方切换音源`
    return
  }
  // 排序项由 SortTab 在挂载 / 换源后自动选中并 emit，未就绪前先不请求
  if (!squareSortId.value) return
  const requestId = ++squareRequestSeq
  squareLoading.value = true
  squareListInfo.noItemLabel = '加载中…'
  try {
    // 失败重试：与页面其它模块（精选/榜单）并发时请求可能被互相取消
    const result = await fetchSquarePage(sdk, squareSortId.value, squareTagId.value, page)
    if (requestId !== squareRequestSeq) return
    if (!result) {
      squareListInfo.list = []
      squareListInfo.total = 0
      squareListInfo.noItemLabel = '歌单获取失败，请稍后重试'
      return
    }
    const list = (result.list ?? []).filter(item => item.id && item.name)
    squareListInfo.list = list
    squareListInfo.total = result.total ?? 0
    squareListInfo.limit = result.limit ?? 36
    squareListInfo.page = page
    squareListInfo.key = `${source.value}__${squareSortId.value}__${squareTagId.value}__${page}`
    squareListInfo.source = source.value
    squareListInfo.tagId = squareTagId.value
    squareListInfo.sortId = squareSortId.value
    squareListInfo.noItemLabel = list.length ? '' : '没有取到歌单数据'
  } finally {
    if (requestId === squareRequestSeq) squareLoading.value = false
  }
}

const handleSquareTagChange = (id) => {
  squareTagId.value = id
  void loadSquare(1)
}

const handleSquareSortChange = (id) => {
  squareSortId.value = id
  void loadSquare(1)
}

const handleSquarePage = (page) => {
  void loadSquare(page)
}

// 滚动到底部附近时加载下一页（分类歌单页走分页器，不参与此逻辑）
function handleScroll() {
  const el = pageRef.value
  if (!el || tab.value !== 'singer') return
  if (el.scrollHeight - el.scrollTop - el.clientHeight > 260) return
  if (singerLoading.value || !singerHasMore.value) return
  void loadSingers()
}

function reload() {
  bannerIndex.value = 0
  boards.value = []
  void loadFeatured()
  void loadBoards()
}

const handleSourceChange = (id) => {
  source.value = id
  saveSource(id)
  reload()
  if (tab.value === 'singer') {
    singers.value = []
    void loadSingers(true)
  } else if (tab.value === 'square') {
    // 换源后重置筛选；SortTab 会随 source 变化重新选中默认排序并 emit，从而触发加载
    squareTagId.value = DEFAULT_SQUARE_TAG[id] ?? ''
    squareSortId.value = ''
    squareListInfo.list = []
    squareListInfo.noItemLabel = '加载中…'
  }
}

// 路由 query 变化（工具栏前进/后退等）时同步页签
watch(() => route.query.tab, (value) => {
  const next = resolveTab(value)
  if (next !== tab.value) tab.value = next
})

watch(tab, (value) => {
  showLetterMenu.value = false
  if (pageRef.value) pageRef.value.scrollTop = 0
  if (value === 'singer' && !singers.value.length) void loadSingers(true)
  if (value === 'square' && !squareListInfo.list.length) void loadSquare(1)
})

const openPlaylist = (item) => {
  void router.push({
    path: '/songList/detail',
    query: { source: item.source || source.value, id: item.id, picUrl: item.img ?? '', fromName: 'MusicHall' },
  }).catch(() => {})
}

const openBoard = (board) => {
  void router.push({
    path: '/home/board',
    query: { source: source.value, boardId: board.bangid || board.id, name: board.name, img: board.img || '' },
  }).catch(() => {})
}

const goSquare = (sortId) => {
  void router.push({ path: '/songList/list', query: { source: source.value, tagId: '', sortId } }).catch(() => {})
}

// 点击页面其它地方时收起字母下拉（下拉按钮自身已 stop 冒泡）
const handleDocumentClick = () => {
  showLetterMenu.value = false
}

let timer = null
onMounted(() => {
  reload()
  pageRef.value?.addEventListener('scroll', handleScroll, { passive: true })
  document.addEventListener('click', handleDocumentClick)
  timer = setInterval(() => {
    if (paused.value || banners.value.length < 2) return
    bannerIndex.value = (bannerIndex.value + 1) % banners.value.length
  }, 5000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  pageRef.value?.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/qq.less';

.page {
  height: 100%;
  overflow-y: auto;
  background-color: var(--qm-surface);
}

.head {
  padding: 20px var(--qm-content-pad-right) 14px var(--qm-content-pad-left);
}

.titleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qm-sp-9, 24px);
  min-height: 36px;
}

.title {
  margin: 0;
  font-size: 26px;
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
}

.tabs {
  display: flex;
  align-items: center;
  gap: 32px;
  margin-top: 18px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.tab {
  position: relative;
  flex: none;
  padding: 4px 0;
  border: 0;
  background: none;
  font-size: var(--qm-fs-md, 14px);
  white-space: nowrap;
  color: var(--qm-text-3);
  cursor: pointer;
  transition: color var(--qm-t-fast);
  &:hover { color: var(--qm-text-1); }
}

.tabActive {
  color: var(--qm-text-1);
  font-weight: var(--qm-fw-semibold, 600);
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -4px;
    width: 18px;
    height: 3px;
    border-radius: var(--qm-radius-2xs, 4px);
    background-color: var(--qm-primary);
    transform: translateX(-50%);
  }
}

// ---- 歌手（乐馆 - 歌手页） ----
.singerPane {
  padding: 10px var(--qm-content-pad-right) 26px var(--qm-content-pad-left);
}

.filterRow {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-8, 20px);
  margin-bottom: 14px;
}

.pill {
  flex: none;
  height: 30px;
  padding: 0 17px;
  border: 0;
  border-radius: var(--qm-radius-chip);
  background-color: var(--qm-hover);
  color: var(--qm-text-2);
  font-size: var(--qm-fs-sm, 13px);
  line-height: 30px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);

  &:hover {
    background-color: var(--qm-hover-strong);
    color: var(--qm-text-1);
  }
}

.pillActive {
  background-color: var(--qm-primary);
  color: var(--qm-text-invert);
  font-weight: var(--qm-fw-medium, 500);

  &:hover {
    background-color: var(--qm-primary-hover);
    color: var(--qm-text-invert);
  }
}

.filterMore {
  position: relative;
  flex: none;
  margin-left: auto;
}

.moreFilter {
  display: inline-flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-1, 4px);
  padding: 0;
  border: 0;
  background: none;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-4);
  cursor: pointer;
  transition: color var(--qm-t-fast);

  svg { flex: none; }
  &:hover { color: var(--qm-text-1); }
}

.letterMenu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 6;
  display: grid;
  grid-template-columns: repeat(7, 28px);
  gap: var(--qm-sp-0, 2px);
  padding: var(--qm-sp-3, 8px);
  border-radius: var(--qm-radius-md, 10px);
  background-color: var(--qm-card);
  box-shadow: var(--qm-shadow-2);
}

.letterMenuItem {
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--qm-radius-xs, 6px);
  background: transparent;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);

  &:hover {
    background-color: var(--qm-hover);
    color: var(--qm-text-1);
  }
}

.letterMenuItemActive {
  color: var(--qm-primary);
  font-weight: var(--qm-fw-semibold, 600);
}

.letterRow {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 26px;
}

.letter {
  padding: 2px 1px;
  border: 0;
  background: none;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-4);
  cursor: pointer;
  transition: color var(--qm-t-fast);

  &:hover { color: var(--qm-primary); }
}

.letterActive {
  color: var(--qm-primary);
  font-weight: var(--qm-fw-semibold, 600);
}

.singerGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
  gap: 30px var(--qm-sp-9, 24px);
}

.singerCard {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  min-width: 0;
  cursor: pointer;
}

.singerAvatar {
  position: relative;
  width: 150px;
  max-width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--qm-hover);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--qm-t-slow);
  }
}

.singerCard:hover .singerAvatar img { transform: scale(1.06); }

.singerAvatarEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--qm-text-5);

  :global(.svg-icon) {
    width: 32px;
    height: 32px;
    fill: currentColor;
  }
}

.singerSkeleton { .qm-skeleton(); }

.singerName {
  margin: 14px 0 0;
  max-width: 100%;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-1);
  text-align: center;
  .mixin-ellipsis-1();
}

.singerCard:hover .singerName { color: var(--qm-primary); }

// ---- 分类歌单（乐馆内嵌歌单广场） ----
// 该页内部自带滚动（SongList 组件），外层页面不再滚动
.pageFill {
  display: flex;
  flex-flow: column nowrap;
}

.squarePane {
  flex: auto;
  min-height: 0;
  display: flex;
  flex-flow: column nowrap;
}

// 顶栏：标签下拉 + 排序切换 + 打开歌单（对齐歌单广场页）
.squareBar {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  padding: 6px var(--qm-content-pad-right) 2px var(--qm-content-pad-left);
}

.importBtn {
  margin-left: auto;
  color: var(--qm-text-2);
  font-size: var(--qm-fs-xs, 12px);
  background: none !important;
  transition: color var(--qm-t-fast);

  &:hover { color: var(--qm-primary); }
}

.squareBody {
  position: relative;
  flex: auto;
  min-height: 0;
}

.loadingMore {
  padding: 22px 0 4px;
  text-align: center;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
}

.banner {
  position: relative;
  margin: 10px var(--qm-content-pad-right) 28px var(--qm-content-pad-left);
  border-radius: var(--qm-radius-lg, 12px);
  overflow: hidden;
}

.bannerTrack { display: flex; transition: transform 500ms var(--qm-ease); }

.bannerSlide {
  position: relative;
  flex: none;
  width: 100%;
  aspect-ratio: 1080 / 340;
  cursor: pointer;
  background-color: var(--qm-field);
  img { display: block; width: 100%; height: 100%; object-fit: cover; }
}

.bannerMask { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.25), transparent 40%); }

.bannerName {
  position: absolute;
  left: 24px;
  bottom: 16px;
  max-width: 70%;
  font-size: var(--qm-fs-3xl, 20px);
  font-weight: var(--qm-fw-semibold, 600);
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,.4);
  .mixin-ellipsis-1();
}

.bannerDots {
  position: absolute;
  right: 18px;
  bottom: 14px;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-2, 6px);

  i { width: 6px; height: 6px; border-radius: var(--qm-radius-2xs, 4px); background-color: rgba(255,255,255,.55); cursor: pointer; transition: width var(--qm-t-fast), background-color var(--qm-t-fast); }
}

.dotActive { width: 16px !important; background-color: #fff !important; }

.block { margin: 0 var(--qm-content-pad-right) 34px var(--qm-content-pad-left); }

.blockHead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }

.blockTitle {
  margin: 0;
  font-size: 19px;
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
}

.blockSub { margin-left: 10px; font-size: var(--qm-fs-xs, 12px); font-weight: var(--qm-fw-regular, 400); color: var(--qm-text-4); }

.more {
  display: inline-flex;
  align-items: center;
  gap: var(--qm-sp-0, 2px);
  padding: 0;
  border: 0;
  background: none;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
  cursor: pointer;
  transition: color var(--qm-t-fast);
  &:hover { color: var(--qm-primary); }
}

.row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - 4 * 16px) / 5);
  gap: var(--qm-sp-7, 16px);
  overflow-x: auto;
  padding-bottom: var(--qm-sp-2, 6px);
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.card { min-width: 0; cursor: pointer; }

.cardCover {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: var(--qm-radius-cover);
  overflow: hidden;
  background-color: rgba(0,0,0,.04);
  img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform var(--qm-t-slow); }
}

.card:hover .cardCover img { transform: scale(1.05); }

.cardPlay {
  position: absolute;
  right: 6px;
  bottom: 6px;
  font-size: var(--qm-fs-2xs, 11px);
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,.5);
  font-variant-numeric: tabular-nums;
}

.cardName {
  margin: 8px 0 0;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-1);
  .mixin-ellipsis-2();
}

.cardAuthor { margin: 4px 0 0; font-size: var(--qm-fs-xs, 12px); color: var(--qm-text-4); .mixin-ellipsis-1(); }

.boards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 4px var(--qm-content-pad-right) 30px var(--qm-content-pad-left);
}

// 仿 QQ 乐馆「排行」卡片：左封面 + 右榜单名 + 前 3 首
.board {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: var(--qm-sp-4, 10px);
  border-radius: var(--qm-radius-lg, 12px);
  background-color: var(--qm-hover);
  color: var(--qm-text-1);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), box-shadow var(--qm-t-fast), transform var(--qm-t-fast);

  &:hover {
    background-color: var(--qm-card);
    box-shadow: var(--qm-shadow-1);
    transform: translateY(-1px);
  }
}

.boardCover {
  flex: none;
  width: 104px;
  aspect-ratio: 1 / 1;
  border-radius: var(--qm-radius-sm, 8px);
  overflow: hidden;
  background-color: rgba(0, 0, 0, .06);

  img { display: block; width: 100%; height: 100%; object-fit: cover; }
}

.boardInfo {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 5px;
  padding-right: var(--qm-sp-1, 4px);
}

.boardName {
  margin: 0 0 2px;
  font-size: var(--qm-fs-lg, 15px);
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.boardSong {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  margin: 0;
  min-width: 0;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-3);

  i {
    flex: none;
    width: 12px;
    font-style: normal;
    color: var(--qm-text-5);
    font-variant-numeric: tabular-nums;
  }

  span { min-width: 0; .mixin-ellipsis-1(); }
}

.tip {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: var(--qm-sp-7, 16px);
  padding: 40px 0;
  text-align: center;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-4);

  p { margin: 0; }
}

.squareTip {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: 60px 0;
  p { margin: 0; font-size: var(--qm-fs-sm, 13px); color: var(--qm-text-4); }
}

.btnGhost {
  padding: 6px 18px;
  border: 1px solid var(--qm-primary-border);
  border-radius: var(--qm-radius-btn);
  background-color: var(--qm-primary-soft);
  color: var(--qm-primary);
  font-size: var(--qm-fs-sm, 13px);
  cursor: pointer;
  &:hover { background-color: var(--qm-primary-soft-hover); }
}
</style>
