<template>
  <div :class="$style.page">
    <!-- 头部：封面拼贴 + 标题 + 操作 -->
    <header :class="$style.head">
      <div :class="$style.covers">
        <img v-for="(pic, index) in covers" :key="index" :src="pic" alt="">
        <span v-if="!covers.length" :class="$style.coverEmpty">
          <svg-icon name="music" />
        </span>
      </div>

      <div :class="$style.info">
        <h1 :class="$style.title">{{ meta.title }}</h1>
        <p :class="$style.subtitle">{{ meta.subtitle }}</p>
        <p :class="$style.metaLine">
          <span>{{ list.length }} 首</span>
          <span>{{ meta.note }}</span>
        </p>

        <!-- 音乐平台切换：切换后列表按所选平台音源重新生成 -->
        <SourceTabs :model-value="source" @change="handleSourceChange" />
        <div :class="$style.actions">
          <button type="button" :class="$style.btnPrimary" :disabled="loading || !list.length" @click="playFrom(0)">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
            </svg>
            播放全部
          </button>
          <button type="button" :class="$style.btnGhost" :disabled="loading" @click="reload(true)">
            {{ loading ? '生成中…' : '换一批' }}
          </button>
          <button type="button" :class="$style.btnText" @click="handleBack">返回</button>
        </div>
      </div>
    </header>

    <!-- 列表 -->
    <div :class="$style.body" class="qm-scroll">
      <div v-if="loading && !list.length" :class="$style.tip">正在根据你的听歌风格生成推荐…</div>
      <div v-else-if="!list.length" :class="$style.tip">
        <p>暂时没有找到合适的歌曲，检查音源设置后再试试</p>
        <button type="button" :class="$style.btnGhost" @click="reload(true)">重新生成</button>
      </div>
      <ul v-else :class="$style.list">
        <li
          v-for="(item, index) in list" :key="item.id"
          :class="[$style.row, { [$style.rowActive]: isPlayingItem(item) }]"
          @dblclick="playFrom(index)"
        >
          <span :class="$style.num">{{ index + 1 }}</span>
          <span :class="$style.nameCell">
            <span :class="$style.name" :title="item.name">{{ item.name }}</span>
            <em v-if="qualityTag(item)" :class="$style.tag">{{ qualityTag(item) }}</em>
          </span>
          <span :class="$style.singer" :title="item.singer">{{ item.singer }}</span>
          <span :class="$style.album" :title="item.meta?.albumName">{{ item.meta?.albumName || '—' }}</span>
          <span :class="$style.time">{{ item.interval || '--:--' }}</span>
          <span :class="$style.rowBtns">
            <button type="button" :aria-label="$t('play')" :title="$t('play')" @click.stop="playFrom(index)">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M8 5.4v13.2l11-6.6z" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              :aria-label="isLoved(item) ? '取消收藏' : '收藏'"
              :title="isLoved(item) ? '取消收藏' : '收藏到我喜欢的音乐'"
              @click.stop="likeIt(item)"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path d="M12 20.5s-7.2-4.4-9.6-9.1A5.4 5.4 0 0 1 12 5.6a5.4 5.4 0 0 1 9.6 5.8c-2.4 4.7-9.6 9.1-9.6 9.1z" :fill="isLoved(item) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
              </svg>
            </button>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, markRawList } from '@common/utils/vueTools'
import { useRoute, useRouter } from '@common/utils/vueRouter'
import { LIST_IDS } from '@common/constants'
import { playList } from '@renderer/core/player/action'
import { setTempList } from '@renderer/store/list/action'
import useLovedList from '@renderer/utils/compositions/useLovedList'
import { playMusicInfo, isPlay } from '@renderer/store/player/state'
import SourceTabs from '@renderer/components/common/SourceTabs.vue'
import {
  buildMillionFallback,
  getAvailableSources,
  getDaily30,
  getInitialSource,
  getListenStyle,
  getMillionCollection,
  getSourceName,
  loadStyleData,
  saveSource,
} from '@renderer/utils/personalRecommend'

const route = useRoute()
const router = useRouter()

// 收藏状态：与播放栏 / 列表 / 榜单共用同一份全局状态（按「歌名 + 歌手」去重）
const { isLoved, toggleLove, loadLoved } = useLovedList()
void loadLoved()

const type = computed(() => (route.query.type === 'million' ? 'million' : 'daily'))
const list = ref([])
const loading = ref(false)
const hasStyle = ref(true)
const source = ref((() => {
  const query = route.query.source
  if (typeof query === 'string' && getAvailableSources().includes(query)) return query
  return getInitialSource()
})())

const covers = computed(() => list.value.slice(0, 4).map(item => item.meta?.picUrl).filter(Boolean))

const millionInfo = ref(null)

const meta = computed(() => {
  if (type.value === 'million') {
    const info = millionInfo.value
    const fromPlaylist = info?.kind === 'playlist'
    return {
      title: '百万收藏',
      subtitle: fromPlaylist
        ? `来自${getSourceName(source.value)}的真实百万收藏歌单：${info.name}`
        : `该平台暂无可用的百万收藏歌单，已用${getSourceName(source.value)}榜单热歌聚合`,
      note: fromPlaylist
        ? (info.play_count ? `歌单播放量 ${info.play_count}` : '平台真实歌单')
        : '榜单实时数据',
    }
  }
  return {
    title: '每日30首',
    note: '每天 0 点更新',
    subtitle: hasStyle.value
      ? '根据你的听歌风格，为你挑选的 30 首歌曲'
      : '还没有足够的听歌记录，先为你推荐平台热歌',
  }
})

async function load(force = false) {
  if (loading.value) return
  loading.value = true
  try {
    await loadStyleData()
    hasStyle.value = getListenStyle().hasData
    const src = source.value
    let songs = []
    if (type.value === 'million') {
      // 优先使用平台真实的「百万收藏」歌单
      const collection = (await getMillionCollection(src, 50).catch(() => null)) ??
        (await buildMillionFallback(src, 50).catch(() => null))
      millionInfo.value = collection
      songs = collection?.list ?? []
    } else {
      songs = await getDaily30(src, force).catch(() => [])
    }
    list.value = markRawList(songs)
  } finally {
    loading.value = false
  }
}

const reload = (force = false) => { void load(force) }

/** 切换音乐平台：列表按新平台音源重新生成 */
async function handleSourceChange(id) {
  if (id === source.value) return
  source.value = id
  saveSource(id)
  list.value = []
  void router.replace({ path: route.path, query: { ...route.query, source: id } }).catch(() => {})
  await load()
}

async function playFrom(index) {
  if (!list.value.length) return
  const listId = type.value === 'million' ? 'home_million' : 'home_daily30'
  await setTempList(listId, [...list.value])
  playList(LIST_IDS.TEMP, index)
}

// 收藏：原实现直接 addListMusics，既不判断是否已收藏、也不能取消，
// 连点会重复入库。改用全局共享的 useLovedList（按「歌名 + 歌手」去重，
// 与播放栏 / 列表 / 榜单的爱心状态实时同步）。
async function likeIt(item) {
  await toggleLove(item)
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
watch(() => route.query.type, () => { list.value = []; void load() })
watch(() => route.query.source, (value) => {
  if (typeof value !== 'string' || value === source.value) return
  void handleSourceChange(value)
})
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

.covers {
  flex: none;
  position: relative;
  width: 132px;
  height: 132px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: var(--qm-sp-0, 2px);
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

  // 只有一张封面时铺满
  img:only-child {
    grid-column: span 2;
    grid-row: span 2;
  }
}

.coverEmpty {
  grid-column: span 2;
  grid-row: span 2;
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
  gap: var(--qm-sp-2, 6px);
}

.title {
  margin: 0;
  font-size: var(--qm-font-title-xl);
  font-weight: var(--qm-fw-bold, 700);
  line-height: 30px;
  color: var(--qm-text-1);
}

.subtitle {
  margin: 0;
  font-size: var(--qm-font-aux);
  line-height: 18px;
  color: var(--qm-text-3);
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
}

.btnGhost {
  .qm-btn-ghost();
}

.btnText {
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--qm-text-3);
  font-size: var(--qm-font-meta);
  cursor: pointer;
  transition: color var(--qm-t-fast);

  &:hover { color: var(--qm-primary); }
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
  border: 1px solid var(--qm-primary-border);
  border-radius: var(--qm-radius-2xs, 4px);
  font-size: var(--qm-font-badge);
  font-style: normal;
  line-height: 14px;
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
