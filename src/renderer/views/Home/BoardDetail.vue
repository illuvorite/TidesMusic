<template>
  <div :class="$style.page">
    <!-- 头部：大封面 + 榜单名 + 更新时间 + 操作（仿 QQ 乐馆榜单详情）；下滑列表时收起 -->
    <header :class="[$style.head, { [$style.headCollapsed]: isHeadCollapsed }]">
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
          <button type="button" :class="$style.btnGhost" :disabled="loading || !list.length" @click="loveAll">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M12 20s-7-4.6-7-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7 3c0 4.8-7 9.4-7 9.4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            全部收藏
          </button>
          <button type="button" :class="$style.btnGhost" @click="handleBack">返回</button>
        </div>
      </div>
    </header>

    <!--
      歌曲列表：与在线歌单详情 / 歌手主页 / 搜索共用 material-online-list，
      一次性获得 封面 · 歌名/歌手两行 · 音质角标 · 下载/更多 · 右键菜单 · 批量选择 · 虚拟列表，
      不再各页面各写一份行模板。排行榜额外通过 show-index 保留「曲序」列。
    -->
    <div :class="$style.body">
      <!-- 取数失败单独成态：统一列表组件只接受纯文案空态，承载不了「重试」按钮 -->
      <div v-if="loadError" :class="$style.tip">
        <p>榜单加载失败，检查音源设置后重试</p>
        <div :class="$style.tipActions">
          <button type="button" :class="$style.btnGhost" @click="handleRetry">重试</button>
          <button type="button" :class="$style.btnGhost" @click="handleBack">返回乐馆</button>
        </div>
      </div>
      <material-online-list
        v-else
        show-index
        :page="1"
        :limit="limit"
        :total="list.length"
        :list="list"
        :no-item="noItemLabel"
        :active-index="activeIndex"
        @play-list="playFrom"
        @scroll="handleHeadScroll"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, markRawList, watch } from '@common/utils/vueTools'
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
import useHeadCollapse from '@renderer/utils/compositions/useHeadCollapse'

const t = useI18n()

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
// 取数失败标记：区分「加载失败（可重试）」与「接口正常但确实没数据」
const loadError = ref(false)

// 乐馆榜单接口一次返回全部歌曲（tx 最多 300 首），没有服务端分页，
// 因此把 limit 设成总数让分页控件不渲染（Pagination 仅在 maxPage > 1 时出现）。
// max(…, 1) 是必要的兜底：空列表时 limit 为 0 会让 maxPage 变成 Infinity，反而露出版分页。
const limit = computed(() => Math.max(list.value.length, 1))

// 列表内的空态文案（加载中 / 取不到数据）。有数据时传空串关闭空态。
const noItemLabel = computed(() => {
  if (loading.value) return '正在加载榜单…'
  if (!list.value.length) return '暂时没有取到榜单歌曲'
  return ''
})

// 当前播放行高亮：只要正在播放的歌出现在本榜单里就高亮（与首页其它列表一致）
const activeIndex = computed(() => {
  if (!isPlay.value) return -1
  const id = playMusicInfo.musicInfo?.id
  if (!id) return -1
  return list.value.findIndex(item => item.id === id)
})

const { isLoved, loadLoved, toggleLove } = useLovedList()
void loadLoved()

// 页头滚动收起，滚动信号由 material-online-list 转发（它自带滚动容器，scroll 不冒泡）
const { isHeadCollapsed, handleHeadScroll } = useHeadCollapse()

// 「全部收藏」：跳过已收藏的，避免重复 IPC
const loveAll = () => {
  if (!list.value.length) return
  for (const item of list.value) {
    if (!isLoved(item)) void toggleLove(item)
  }
}

const today = computed(() => {
  const date = new Date()
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
})

async function load(isRetry = false) {
  if (!boardId.value) return
  if (loading.value && !isRetry) return
  loading.value = true
  // 注意：loading 的复位必须落在 finally 内。历史上这里是 try 外的裸语句，
  // 一旦前面抛异常就会让 loading 永远停在 true，页面卡死在「正在加载榜单…」。
  try {
    loadError.value = false
    // 重试时先清空，避免旧的错误态与数据残留
    if (isRetry) list.value = []
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
    // 卡片没传封面时用榜首歌曲封面兜底
    if (!cover.value) cover.value = songs[0]?.meta?.picUrl || ''
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

const handleRetry = () => { void load(true) }

// 榜单是一次性浏览内容，播放队列走 TEMP 列表（与在线歌单详情同一套做法）
async function playFrom(index) {
  if (!list.value.length) return
  await setTempList('home_board', [...list.value])
  playList(LIST_IDS.TEMP, index)
}

const handleBack = () => {
  void router.push('/home').catch(() => {})
}

// 页面的全部状态都派生自 query，而同一路由仅 query 变化时组件会被复用
// （onMounted 不再触发），因此这里跟随 query 变化重新取数
watch(() => [route.query.source, route.query.boardId], () => {
  const query = route.query
  source.value = typeof query.source === 'string' && query.source ? query.source : getInitialSource()
  boardId.value = typeof query.boardId === 'string' ? query.boardId : ''
  boardName.value = typeof query.name === 'string' && query.name ? query.name : t('common__board_default_name')
  cover.value = typeof query.img === 'string' ? query.img : ''
  void load(true)
})

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
  overflow: hidden;
  max-height: 280px;
  transition: max-height .3s ease, opacity .22s ease, padding .3s ease;
}

.headCollapsed {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.cover {
  flex: none;
  position: relative;
  // 参考图实测 170×170
  width: 170px;
  height: 170px;
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
  // 参考图实测字高 31px（30px 字号）
  font-size: 30px;
  font-weight: var(--qm-fw-bold, 700);
  line-height: 1.05;
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

// ------- 列表容器 -------
// 不给本层加 padding / overflow：material-online-list 内部是绝对定位铺满的虚拟列表，
// 滚动由它自己负责（与在线歌单详情页的 .list 容器一致）。
.body {
  flex: auto;
  min-height: 0;
  height: 100%;
  position: relative;
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

.tipActions {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-s3);
}
</style>
