<template>
  <div :class="$style.home" class="qm-scroll">
    <!-- ============ 第一区块：今日为你推荐 ============ -->
    <section :class="$style.section">
      <div :class="$style.headRow">
        <h2 :class="$style.headTitle">Hi Desire <span :class="$style.headTitle2">今日为你推荐</span></h2>
        <button type="button" :class="$style.headLink" @click="go('/list/recent')">
          查看你的听歌报告
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <!-- 音乐平台切换：切换后歌单 / 每日30首 / 刷歌 / 百万收藏 / 电台全部跟随更新 -->
      <div :class="$style.sourceRow">
        <SourceTabs :model-value="source" @change="handleSourceChange" />
        <span :class="$style.sourceTip">切换平台后，下方推荐内容会按所选平台重新生成</span>
        <button type="button" :class="$style.refreshBtn" :disabled="refreshing" @click="refreshAll()">
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path d="M4 12a8 8 0 1 1 2.3 5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M4 18v-4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ refreshing ? '刷新中…' : '刷新推荐' }}
        </button>
      </div>

      <div :class="$style.grid">
        <!-- 每日 30 首：按听歌风格真实生成的大卡 -->
        <div :class="[$style.card, $style.span2]" @click="openDailyPage()">
          <div :class="$style.hero">
            <div :class="$style.heroText">
              <h3 :class="$style.heroTitle">每日30首</h3>
              <p :class="$style.heroSub">根据你的听歌风格<br />为你挑出 30 首歌曲</p>
              <button type="button" :class="$style.heroPlay" :aria-label="$t('play')" @click.stop="playDaily()">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
                </svg>
              </button>
            </div>
            <div :class="$style.heroCoverWrap">
              <img v-if="heroCover" :class="$style.heroCover" :src="heroCover" alt="" />
              <div v-else :class="[$style.heroCover, $style.coverEmpty]">
                <svg-icon name="music" :class="$style.coverEmptyIcon" />
              </div>
              <span :class="$style.heroTag"><i :class="$style.heroTagIcon">日</i>每日更新</span>
            </div>
          </div>
          <p :class="$style.name">每日30首</p>
          <p :class="[$style.meta, $style.metaAccent]">
            {{ hasStyle ? `根据你常听的歌手生成 · ${dailyList.length} 首` : '暂无听歌记录 · 先为你推荐平台热歌' }}
          </p>
        </div>

        <!-- 三个功能卡：全部是可点击的真实功能 -->
        <div
          v-for="item in miniCards" :key="item.key"
          :class="$style.card"
          @click="item.onOpen()"
        >
          <div :class="$style.cover">
            <div v-if="item.pics.length" :class="$style.collage">
              <img v-for="(pic, index) in item.pics" :key="index" :src="pic" alt="" />
            </div>
            <div v-else :class="[$style.collage, $style.coverEmpty]">
              <svg-icon name="music" :class="$style.coverEmptyIcon" />
            </div>
            <span :class="$style.funcChip">
              <svg-icon :name="item.icon" :class="$style.funcIcon" />
            </span>
            <span v-if="item.busy" :class="$style.busyMask">生成中…</span>
          </div>
          <p :class="$style.name">{{ item.name }}</p>
          <p :class="$style.meta">{{ item.meta }}</p>
        </div>
      </div>
    </section>

    <!-- ============ 第二区块：听「X」也会喜欢（相似歌曲） ============ -->
    <section v-if="similarSeed" :class="$style.section">
      <div :class="$style.headRow">
        <h2 :class="$style.headTitle">
          听「{{ similarSeed.name }}」也会喜欢
          <button
            type="button" :class="[$style.likeBtn, { [$style.liked]: isSeedLiked }]"
            :aria-label="$t('common__collect_song')" :title="$t('common__collect_song')" @click="toggleSeedLike()"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M12 20.5s-7.2-4.4-9.6-9.1A5.4 5.4 0 0 1 12 5.6a5.4 5.4 0 0 1 9.6 5.8c-2.4 4.7-9.6 9.1-9.6 9.1z"
                :fill="isSeedLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"
              />
            </svg>
          </button>
          <button type="button" :class="$style.roundPlay" :aria-label="$t('common__play_all')" :title="$t('common__play_all')" @click="playSimilar()">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
            </svg>
          </button>
        </h2>
        <button type="button" :class="$style.headLink" :disabled="similarLoading" @click="loadSimilar()">
          {{ similarLoading ? '生成中…' : '换一批' }}
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="M4 12a8 8 0 1 1 2.3 5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div v-if="similarList.length" :class="$style.songGrid">
        <div
          v-for="item in similarList" :key="item.id"
          :class="[$style.songItem, { [$style.songItemActive]: isPlayingItem(item) }]"
          @dblclick="playSimilar(item)"
        >
          <div :class="$style.songCover">
            <img
              v-if="item.meta?.picUrl && !brokenCovers[coverKey(item.id, item.meta.picUrl)]"
              :src="item.meta.picUrl" alt="" @error="markCoverBroken(item.id, item.meta.picUrl)"
            />
            <span v-else :class="$style.songCoverEmpty"><svg-icon name="music" /></span>
          </div>
          <div :class="$style.songInfo">
            <p :class="$style.songName" :title="item.name">
              <span :class="$style.songNameText">{{ item.name }}</span>
              <em v-if="qualityTag(item)" :class="$style.tag">{{ qualityTag(item) }}</em>
            </p>
            <p :class="$style.songSinger">
              <button type="button" :class="$style.miniPlay" :aria-label="$t('play')" :title="$t('play')" @click.stop="playSimilar(item)">
                <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
                  <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
                </svg>
              </button>
              <span :class="$style.songSingerText" :title="item.singer">{{ item.singer }}</span>
            </p>
          </div>
        </div>
      </div>

      <div v-else :class="$style.emptyBox">
        <p>{{ similarLoading ? '正在生成相似歌曲…' : '还没有足够的数据，先随便听几首歌吧' }}</p>
      </div>
    </section>

    <!-- ============ 第三区块：每日随机推荐歌单（所选平台的真实歌单） ============ -->
    <section :class="$style.section">
      <div :class="$style.headRow">
        <h2 :class="$style.headTitle">随机推荐宝藏歌单</h2>
        <div :class="$style.headActions">
          <button type="button" :class="$style.headLink" :disabled="playlistsLoading" @click="reshufflePlaylists()">
            {{ playlistsLoading ? '获取中…' : '换一批' }}
          </button>
          <button type="button" :class="$style.headLink" @click="go('/home/music-hall')">
            {{ sourceLabel }}更多歌单
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="playlists.length" :class="$style.grid">
        <div
          v-for="item in playlists" :key="`${item.source}_${item.id}`"
          :class="$style.card"
          @click="openPlaylist(item)"
        >
          <div :class="$style.cover">
            <img
              v-if="item.img && !brokenCovers[coverKey(item.id, item.img)]"
              :class="$style.coverImg" :src="item.img" alt="" @error="markCoverBroken(item.id, item.img)"
            />
            <div v-else :class="[$style.coverImg, $style.coverEmpty]">
              <svg-icon name="music" :class="$style.coverEmptyIcon" />
            </div>
            <span :class="$style.playBadge">{{ item.play_count || '歌单' }}</span>
          </div>
          <p :class="$style.name" :title="item.name">{{ item.name }}</p>
          <p :class="$style.meta">{{ item.author || '平台推荐' }}<template v-if="item.total"> · {{ item.total }} 首</template></p>
        </div>
      </div>

      <div v-else :class="$style.emptyBox">
        <p>{{ playlistsLoading ? '正在获取歌单…' : '该平台暂时没有取到歌单' }}</p>
        <button v-if="!playlistsLoading" type="button" :class="$style.retryBtn" @click="loadPlaylists()">重新获取</button>
      </div>
    </section>

    <!-- ============ 第三区块：你的私藏歌单（真实用户歌单） ============ -->
    <section :class="$style.section">
      <div :class="$style.headRow">
        <h2 :class="$style.headTitle">你的私藏歌单</h2>
        <button type="button" :class="$style.headLink" @click="go('/home/music-hall')">
          去乐馆发现歌单
          <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <div v-if="privateLists.length" :class="$style.grid">
        <div
          v-for="item in privateLists" :key="item.id"
          :class="$style.card"
          @click="openPrivateList(item)"
        >
          <div :class="$style.cover">
            <img
              v-if="item.cover && !brokenCovers[coverKey(item.id, item.cover)]"
              :class="$style.coverImg" :src="item.cover" alt="" @error="markCoverBroken(item.id, item.cover)"
            />
            <div v-else :class="[$style.coverImg, $style.coverEmpty]">
              <svg-icon name="music" :class="$style.coverEmptyIcon" />
            </div>
            <span v-if="item.count" :class="$style.playBadge">
              <svg viewBox="0 0 24 24" width="9" height="9" aria-hidden="true">
                <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
              </svg>
              {{ item.count }}
            </span>
          </div>
          <p :class="$style.name">{{ item.name }}</p>
          <p :class="$style.meta">{{ item.label }}</p>
        </div>
      </div>

      <div v-else :class="$style.emptyBox">
        <p>还没有自己的歌单，喜欢的歌与收藏的歌单都会出现在这里</p>
        <button type="button" :class="$style.retryBtn" @click="go('/home/music-hall')">去乐馆逛逛</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, markRawList } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { useRouter } from '@common/utils/vueRouter'
import { LIST_IDS } from '@common/constants'
import { playList } from '@renderer/core/player/action'
import { addListMusics, removeListMusics, setTempList } from '@renderer/store/list/action'
import { getListMusics } from '@renderer/store/list/listManage'
import { allMusicList, loveList, userLists } from '@renderer/store/list/state'
import { isPlay, playMusicInfo } from '@renderer/store/player/state'
import { setShowPlayerDetail } from '@renderer/store/player/action'
import { setTogglePlayMode } from '@renderer/store/setting'
import SourceTabs from '@renderer/components/common/SourceTabs.vue'
import {
  buildBrushQueue,
  buildMillionFallback,
  buildRadioQueue,
  buildSimilarSongs,
  getDaily30,
  getInitialSource,
  getListenStyle,
  getMillionCollection,
  getPlatformPlaylists,
  getSimilarSeed,
  getSourceName,
  loadStyleData,
  saveSource,
} from '@renderer/utils/personalRecommend'

const t = useI18n()

const router = useRouter()

const go = (to) => {
  void router.push(to).catch(() => {})
}

const source = ref(getInitialSource())
const sourceLabel = computed(() => getSourceName(source.value))
const hasStyle = ref(true)

// ------- 推荐数据（真实生成，非歌单占位） -------
const dailyList = ref([])
const million = ref(null)
const brushQueue = ref([])
const radioSeed = ref('')
const radioQueue = ref([])
const playlists = ref([])
const playlistsLoading = ref(false)
const refreshing = ref(false)

// 「听「X」也会喜欢」
const similarSeed = ref(null)
const similarList = ref([])
const similarLoading = ref(false)
const isSeedLiked = ref(false)

// 封面加载失败兜底（避免出现裂图/空白）；按「id + 图片地址」记录，换源/换歌单后会自动重试
const brokenCovers = reactive({})
const coverKey = (id, url) => `${id}__${url}`
const markCoverBroken = (id, url) => { brokenCovers[coverKey(id, url)] = true }

const brushBusy = ref(false)
const radioBusy = ref(false)

const heroCover = computed(() => dailyList.value[0]?.meta?.picUrl ?? '')

// 取列表里的前几张封面拼成 2×2 缩略图
const pickCovers = (list, offset = 0) => {
  const pics = []
  for (let i = offset; i < list.length && pics.length < 4; i++) {
    const pic = list[i]?.meta?.picUrl
    if (pic) pics.push(pic)
  }
  return pics
}

const millionPics = computed(() => {
  const info = million.value
  if (!info) return []
  const pics = info.img ? [info.img] : []
  return [...pics, ...pickCovers(info.list, 0)].slice(0, 4)
})

const miniCards = computed(() => [
  {
    key: 'brush',
    name: '刷歌模式',
    icon: 'play-mode-random',
    meta: brushBusy.value
      ? '正在生成队列…'
      : `沉浸式随机连播 · ${brushQueue.value.length || dailyList.value.length} 首`,
    pics: pickCovers(brushQueue.value.length ? brushQueue.value : dailyList.value),
    busy: brushBusy.value,
    onOpen: () => { void startBrush() },
  },
  {
    key: 'million',
    name: t('home__million_collect'),
    icon: 'crown',
    meta: million.value
      ? `${million.value.kind === 'playlist' ? million.value.name : t('home__board_hits_mix')} · ${t('home__songs_count', { num: million.value.list.length })}`
      : '平台百万收藏歌曲',
    pics: millionPics.value,
    busy: false,
    onOpen: () => { openRecommendPage('million') },
  },
  {
    key: 'radio',
    name: t('home__radio'),
    icon: 'headphones',
    meta: radioBusy.value
      ? '正在调频…'
      : radioSeed.value ? `主播歌手：${radioSeed.value} · ${radioQueue.value.length} 首` : '按你的口味连续播放',
    pics: pickCovers(radioQueue.value.length ? radioQueue.value : dailyList.value),
    busy: radioBusy.value,
    onOpen: () => { void startRadio() },
  },
])

// ------- 我的歌单（我喜欢 + 自建/收藏的歌单） -------
const privateLists = ref([])

async function loadPrivateLists() {
  const ids = [loveList.id, ...userLists.map(item => item.id)].slice(0, 10)
  // 原实现逐个 await（10 次串行读取），首屏要等完最后一本才渲染；
  // 这些歌单之间互不依赖，改为并发读取，并保持输出顺序与 ids 一致。
  const lists = await Promise.all(ids.map(async id => {
    const musics = await getListMusics(id).catch(() => [])
    const userInfo = userLists.find(item => item.id === id)
    const isLove = id === loveList.id
    return {
      id,
      name: isLove ? t('home__my_love') : (userInfo?.name ?? t('home__created_list')),
      label: isLove ? '收藏的歌曲' : (userInfo?.sourceListId ? '收藏的歌单' : '自建歌单'),
      cover: musics[0]?.meta?.picUrl ?? '',
      count: musics.length,
    }
  }))
  privateLists.value = lists
}

const openPrivateList = (item) => {
  void router.push({ path: '/list', query: { id: item.id } }).catch(() => {})
}

// ------- 平台数据（随所选音源变化） -------
const openRecommendPage = (type) => {
  void router.push({ path: '/home/recommend', query: { type, source: source.value } }).catch(() => {})
}
const openDailyPage = () => { openRecommendPage('daily') }

const openPlaylist = (item) => {
  void router.push({
    path: '/songList/detail',
    query: { source: item.source, id: item.id, picUrl: item.img ?? '', fromName: 'HomeAlias' },
  }).catch(() => {})
}

async function loadDaily() {
  dailyList.value = markRawList(await getDaily30(source.value).catch(() => []))
}

async function loadMillion() {
  const result = await getMillionCollection(source.value, 50).catch(() => null)
  million.value = result ?? await buildMillionFallback(source.value, 50).catch(() => null)
}

/** 刷歌 / 电台的队列直接用已生成的推荐池派生：刷新即变、点击秒播 */
function loadQueues() {
  const pool = [...dailyList.value, ...similarList.value]
  brushQueue.value = buildBrushQueue(pool, 60)
  const radio = buildRadioQueue(pool)
  radioSeed.value = radio.seedName
  radioQueue.value = radio.list
}

async function loadPlaylists(seedText) {
  if (playlistsLoading.value) return
  playlistsLoading.value = true
  try {
    playlists.value = await getPlatformPlaylists(source.value, 6, seedText).catch(() => [])
  } finally {
    playlistsLoading.value = false
  }
}

// 「换一批」：用新的随机种子重排（每天/每次打开也会自动变）
const reshufflePlaylists = () => { void loadPlaylists(`reshuffle__${Date.now()}`) }

async function loadSimilar() {
  if (similarLoading.value) return
  similarLoading.value = true
  try {
    await loadStyleData()
    const seed = getSimilarSeed()
    similarSeed.value = seed
    if (!seed) {
      similarList.value = []
      return
    }
    const seedId = seed.music?.id ?? ''
    isSeedLiked.value = !!seedId && (allMusicList.get(loveList.id) ?? []).some(item => item.id === seedId)
    similarList.value = markRawList(await buildSimilarSongs(source.value, seed, 9).catch(() => []))
  } finally {
    similarLoading.value = false
  }
}

async function toggleSeedLike() {
  const music = similarSeed.value?.music
  if (!music?.id) return
  if (isSeedLiked.value) {
    await removeListMusics({ listId: loveList.id, ids: [music.id] })
    isSeedLiked.value = false
  } else {
    await addListMusics(loveList.id, [music])
    isSeedLiked.value = true
  }
}

const isPlayingItem = (item) => isPlay.value && playMusicInfo.musicInfo?.id === item.id

const qualityTag = (item) => {
  const qualitys = item.meta?._qualitys ?? {}
  if (qualitys.flac24bit) return 'Hi-Res'
  if (qualitys.flac || qualitys.ape || qualitys.wav) return '无损'
  if (qualitys['320k']) return '320K'
  return ''
}

async function playSimilar(item) {
  let songs = similarList.value
  if (!songs.length) return
  let index = 0
  if (item) {
    index = songs.findIndex(song => song.id === item.id)
    if (index < 0) index = 0
  }
  await setTempList('home_similar', [...songs])
  playList(LIST_IDS.TEMP, index)
}

/** 一键刷新：每日30首 / 相似歌曲 / 百万收藏 / 随机歌单 全部重新生成 */
async function refreshAll() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    dailyList.value = []
    million.value = null
    brushQueue.value = []
    radioQueue.value = []
    radioSeed.value = ''
    similarList.value = []
    dailyList.value = markRawList(await getDaily30(source.value, true).catch(() => []))
    await Promise.all([
      loadSimilar(),
      loadMillion(),
      loadPlaylists(`refresh__${Date.now()}`),
    ])
    loadQueues()
  } finally {
    refreshing.value = false
  }
}

/** 切换音乐平台：歌单 / 每日30首 / 刷歌 / 百万收藏 / 电台 全部按新平台重新生成 */
async function handleSourceChange(id) {
  if (id === source.value) return
  source.value = id
  saveSource(id)
  dailyList.value = []
  million.value = null
  playlists.value = []
  radioSeed.value = ''
  brushQueue.value = []
  radioQueue.value = []
  similarList.value = []
  similarSeed.value = null
  void loadStyleData().then(() => {
    hasStyle.value = getListenStyle().hasData
  })
  await Promise.all([loadDaily(), loadMillion(), loadPlaylists(), loadSimilar(), loadPrivateLists()])
  loadQueues()
}

// ------- 播放 -------
async function playQueue(listId, songs, mode) {
  if (!songs.length) return false
  if (mode) setTogglePlayMode(mode)
  await setTempList(listId, [...songs])
  playList(LIST_IDS.TEMP, 0)
  setShowPlayerDetail(true)
  return true
}

async function playDaily() {
  let songs = dailyList.value
  if (!songs.length) {
    songs = markRawList(await getDaily30(source.value).catch(() => []))
    dailyList.value = songs
  }
  if (!songs.length) return
  await playQueue('home_daily30', songs)
}

async function startBrush() {
  if (brushBusy.value) return
  let songs = brushQueue.value
  if (songs.length < 10) {
    // 首次进入或数据不足时现场生成
    brushBusy.value = true
    try {
      await Promise.all([loadDaily(), loadSimilar()])
      loadQueues()
      songs = brushQueue.value
    } finally {
      brushBusy.value = false
    }
  }
  if (!songs.length) return
  await playQueue('home_brush', songs, 'random')
}

async function startRadio() {
  if (radioBusy.value) return
  let songs = radioQueue.value
  if (songs.length < 10) {
    radioBusy.value = true
    try {
      await Promise.all([loadDaily(), loadSimilar()])
      loadQueues()
      songs = radioQueue.value
    } finally {
      radioBusy.value = false
    }
  }
  if (!songs.length) return
  await playQueue('home_radio', songs, 'listLoop')
}

onMounted(async() => {
  void loadStyleData().then(() => {
    hasStyle.value = getListenStyle().hasData
  })
  await Promise.all([loadDaily(), loadSimilar()])
  loadQueues()
  void loadMillion()
  void loadPlaylists()
  await loadPrivateLists()
})
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

// ============================================================
//  首页（Hi xxx 今日为你推荐 + 你的私藏歌单）
//  栅格：5 列 × 136px，间距 24px；首块大卡跨 2 列
// ============================================================
.home {
  height: 100%;
  padding: 20px 23px 24px;
  box-sizing: border-box;
  overflow-y: auto;
}

.section + .section {
  margin-top: 40px;
}

.headRow {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  margin-bottom: var(--qm-sp-7, 16px);
}

.headTitle {
  margin: 0;
  font-size: 17px;
  font-weight: var(--qm-fw-bold, 700);
  color: var(--qm-text-1);
  letter-spacing: .2px;
}
.headTitle2 {
  font-weight: var(--qm-fw-bold, 700);
}

.headLink {
  display: inline-flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-1, 4px);
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-5);
  transition: color @transition-fast;

  svg { flex: none; }
  &:hover { color: var(--qm-primary); }
}

// ---- 平台切换行 ----
.sourceRow {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  margin: -4px 0 18px;
}
.sourceTip {
  flex: auto;
  min-width: 0;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-5);
  .mixin-ellipsis-1();
}

.refreshBtn {
  flex: none;
  display: inline-flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--qm-primary-border);
  border-radius: var(--qm-radius-panel);
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-primary);
  background-color: var(--qm-primary-soft);
  cursor: pointer;
  transition: background-color @transition-fast, transform @transition-fast;

  svg { display: block; fill: none; }
  &:hover { background-color: var(--qm-primary-soft-hover); }
  &:active { transform: scale(.97); }
  &:disabled { opacity: .6; cursor: default; }
}

.headActions {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-7, 16px);
  flex: none;
}

// ---- 听「X」也会喜欢 ----
.likeBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-left: var(--qm-sp-2, 6px);
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--qm-text-4);
  background: transparent;
  cursor: pointer;
  vertical-align: -3px;
  transition: color @transition-fast, transform @transition-fast;

  &:hover { color: #f0484b; transform: scale(1.08); }
  &.liked { color: #f0484b; }
}

.roundPlay {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-left: var(--qm-sp-4, 10px);
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background-color: var(--qm-primary);
  cursor: pointer;
  vertical-align: -6px;
  transition: background-color @transition-fast, transform @transition-fast;

  svg { fill: currentColor; margin-left: 2px; }

  &:hover { background-color: var(--qm-primary-hover); }
  &:active { transform: scale(.92); }
}

.songGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 32px;
}

.songItem {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-5, 12px);
  padding: 6px 8px;
  border-radius: var(--qm-radius-card);
  cursor: default;
  transition: background-color @transition-fast;

  &:hover {
    background-color: var(--qm-hover);
    .miniPlay { opacity: 1; }
  }
}

.songItemActive .songNameText { color: var(--qm-primary); }

.songCover {
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: var(--qm-radius-cover);
  overflow: hidden;
  background-color: var(--qm-tile-bg);

  img { display: block; width: 100%; height: 100%; object-fit: cover; }
}

.songCoverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--qm-text-5);

  :global(.svg-icon) { width: var(--qm-icon); height: var(--qm-icon); fill: currentColor; }
}

.songInfo {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 5px;
}

.songName {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  margin: 0;
  min-width: 0;
}

.songNameText {
  min-width: 0;
  font-size: var(--qm-fs-md, 14px);
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.tag {
  flex: none;
  padding: 1px 4px;
  border: 1px solid #e8c88a;
  border-radius: var(--qm-radius-2xs, 4px);
  font-size: 10px;
  font-style: normal;
  line-height: 13px;
  color: #c99228;
  background-color: #fffaf0;
}

.songSinger {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
  margin: 0;
  min-width: 0;
}

.miniPlay {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid var(--qm-line-2);
  border-radius: 50%;
  color: var(--qm-text-3);
  background: transparent;
  cursor: pointer;
  opacity: .75;
  transition: color @transition-fast, border-color @transition-fast, opacity @transition-fast;

  svg { fill: currentColor; }

  &:hover { color: var(--qm-primary); border-color: var(--qm-primary); opacity: 1; }
}

.songSingerText {
  min-width: 0;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
  .mixin-ellipsis-1();
}

// ---- 栅格 ----
// 固定 136px 列 + 24px 间距（与设计稿一致，宽度不够时自动换行）
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 136px);
  gap: var(--qm-sp-9, 24px);
}

.card {
  min-width: 0;
  cursor: pointer;
}
.span2 {
  grid-column: span 2;
}

// ---- 封面 ----
.cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--qm-radius-cover);
  overflow: hidden;
  background-color: var(--qm-tile-bg);
}
.coverImg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform @transition-slow;
}
.card:hover .coverImg { transform: scale(1.04); }

// 2×2 封面拼贴（功能卡）
.collage {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: var(--qm-sp-0, 2px);
  width: 100%;
  height: 100%;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  img:only-child {
    grid-column: span 2;
    grid-row: span 2;
  }
}

.coverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qm-text-5);
}
.coverEmptyIcon {
  width: 26%;
  height: 26%;
  fill: currentColor;
}
.collage.coverEmpty .coverEmptyIcon {
  width: 34px;
  height: 34px;
}

// 功能图标角标
.funcChip {
  position: absolute;
  left: 6px;
  bottom: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  background-color: rgba(0, 0, 0, .42);
  backdrop-filter: blur(4px);
}
.funcIcon {
  width: 13px;
  height: 13px;
  fill: currentColor;
}

// 生成中遮罩
.busyMask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--qm-fs-xs, 12px);
  color: #fff;
  background-color: rgba(0, 0, 0, .5);
}

// 播放量 / 歌曲数角标
.playBadge {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: inline-flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 3px;
  height: 18px;
  padding: 0 6px;
  border-radius: var(--qm-radius-card);
  font-size: var(--qm-fs-2xs, 11px);
  line-height: 1;
  color: #fff;
  background-color: var(--qm-primary);

  svg { fill: currentColor; }
}

// ---- 文案 ----
.name {
  margin: 10px 0 0;
  font-size: var(--qm-fs-sm, 13px);
  line-height: 19px;
  color: var(--qm-text-2);
  .mixin-ellipsis-2();
}
.meta {
  margin: 3px 0 0;
  font-size: var(--qm-fs-xs, 12px);
  line-height: 18px;
  color: var(--qm-text-4);
  .mixin-ellipsis-2();
}
// 大卡下方的那行绿色文案
.metaAccent {
  color: var(--qm-primary);
}

// ---- 每日推荐大卡 ----
.hero {
  position: relative;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  aspect-ratio: 296 / 136;
  padding: 0 22px;
  box-sizing: border-box;
  border-radius: var(--qm-radius-card);
  overflow: hidden;
  background: linear-gradient(155deg, #CFD8F3 0%, #BCC7EC 45%, #AEB9E5 100%);

  &::after {
    content: '';
    position: absolute;
    inset: auto auto -18px -18px;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, .34), transparent 70%);
  }
}
.heroText {
  position: relative;
  z-index: 1;
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-start;
  min-width: 0;
}
.heroTitle {
  margin: 0;
  font-size: var(--qm-fs-4xl, 22px);
  font-weight: var(--qm-fw-bold, 700);
  color: #fff;
  text-shadow: 0 1px 3px rgba(40, 48, 92, .28);
}
.heroSub {
  margin: 8px 0 0;
  font-size: var(--qm-fs-sm, 13px);
  line-height: 20px;
  color: rgba(255, 255, 255, .92);
  text-shadow: 0 1px 2px rgba(40, 48, 92, .22);
}
.heroPlay {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-top: 14px;
  padding: 0;
  border: none;
  border-radius: 50%;
  color: #111;
  background-color: var(--qm-primary);
  cursor: pointer;
  transition: transform @transition-fast, background-color @transition-fast;

  svg { fill: currentColor; margin-left: 2px; }
  &:hover { background-color: var(--qm-primary-hover); }
  &:active { transform: scale(.92); }
}

.heroCoverWrap {
  position: relative;
  flex: none;
  width: 106px;
  height: 106px;
  margin-right: var(--qm-sp-2, 6px);

  // 封面右下方露出的深色卡片
  &::after {
    content: '';
    position: absolute;
    right: -10px;
    bottom: -7px;
    width: 92px;
    height: 92px;
    border-radius: var(--qm-radius-card);
    background-color: #23252B;
    box-shadow: 0 8px 20px rgba(24, 28, 48, .28);
  }
}
.heroCover {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: var(--qm-radius-card);
  object-fit: cover;
  box-shadow: 0 10px 24px rgba(24, 28, 48, .22);
}
.heroTag {
  position: absolute;
  z-index: 2;
  right: 6px;
  bottom: 6px;
  display: inline-flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-1, 4px);
  font-size: var(--qm-fs-2xs, 11px);
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, .45);
}
.heroTagIcon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: var(--qm-radius-2xs, 4px);
  font-size: 9px;
  font-style: normal;
  color: var(--qm-primary);
  background-color: #fff;
}

// ---- 空态 ----
.emptyBox {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  padding: 28px 0;
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-4);

  p { margin: 0; }
}
.retryBtn {
  padding: 5px 16px;
  border: 1px solid var(--qm-primary-border);
  border-radius: var(--qm-radius-btn);
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-primary);
  background-color: var(--qm-primary-soft);
  cursor: pointer;
  transition: background-color @transition-fast;

  &:hover { background-color: var(--qm-primary-soft-hover); }
}
</style>
