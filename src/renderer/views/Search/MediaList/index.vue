<template>
  <div :class="$style.container">
    <div v-if="sourceUnsupported" :class="$style.empty">
      <p :class="$style.tip">{{ $t('search__media_source_tip') }}</p>
      <button type="button" :class="$style.btn" @click="switchToWy">切换到网易云音乐</button>
    </div>
    <div v-else-if="listInfo.loading" :class="$style.empty">{{ $t('list__loading') }}</div>
    <div v-else-if="!list.length" :class="$style.empty">
      {{ listInfo.noItemLabel || $t('no_item') }}
    </div>
    <template v-else>
      <div :class="type == 'album' ? $style.albumGrid : $style.singerGrid" class="qm-scroll">
        <div
          v-for="item in list"
          :key="`${item.source}-${item.id}`"
          :class="$style.card"
          :title="item.name"
          @click="handleClick(item)"
        >
          <div :class="[$style.cover, type == 'singer' ? $style.coverCircle : '']">
            <img v-if="item.img && !brokenCovers.has(coverKey(item))" :src="item.img" :class="$style.coverImg" loading="lazy" @error="markCoverBroken(item)" />
            <span v-else :class="$style.coverFallback">{{ coverInitial(item) }}</span>
          </div>
          <p :class="$style.name">{{ item.name }}</p>
          <p v-if="type == 'album'" :class="$style.meta">
            {{ item.artist }}
            <template v-if="item.publishDate">· {{ formatDate(item.publishDate) }}</template>
          </p>
          <p v-else :class="$style.meta">{{ item.albumSize }} 张专辑 · {{ item.musicSize }} 首歌曲</p>
        </div>
      </div>
      <pagination
        v-if="allPage > 1"
        :page="listInfo.page"
        :page-count="allPage"
        @toggle-page="togglePage"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from '@common/utils/vueTools'
import { searchMedia, albumListInfo, singerListInfo, type MediaSearchType } from '@renderer/store/search/media'
import { searchText } from '@renderer/store/search/state'
import { addHistoryWord } from '@renderer/store/search/action'
import { useRouter, useRoute } from '@common/utils/vueRouter'
import Pagination from '@renderer/components/material/Pagination.vue'

interface Props {
  type: MediaSearchType
  /** 当前搜索源；专辑/歌手仅网易云提供，别的源提示换源 */
  sourceId?: string
  page?: number
}

const props = defineProps<Props>()
const router = useRouter()
const route = useRoute()

const listInfo = computed(() => props.type == 'album' ? albumListInfo : singerListInfo)
const list = computed<any[]>(() => listInfo.value.list as any[])
const sourceUnsupported = computed(() => props.sourceId != null && props.sourceId != 'wy')

const allPage = computed(() => {
  if (!listInfo.value.total || !listInfo.value.limit) return 0
  return Math.ceil(listInfo.value.total / listInfo.value.limit)
})

const switchToWy = () => {
  void router.replace({
    path: route.path,
    query: { ...route.query, source: 'wy', page: 1 },
  })
}

// 专辑点击进歌单详情页（网易专辑与歌单详情结构一致），歌手点击进歌手主页
const handleClick = (item: any) => {
  if (props.type == 'singer') {
    void router.push({
      path: '/singer/detail',
      query: {
        id: item.id,
        name: item.name,
        img: item.img,
        source: item.source,
      },
    })
    return
  }
  void router.push({
    path: '/songlist/detail',
    query: {
      id: item.id,
      source: item.source,
      type: 'album',
    },
  })
}

const formatDate = (time: number) => {
  if (!time) return ''
  const d = new Date(time)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 裂图兜底：原先只把 <img> 隐藏（display:none），但首字占位的渲染条件是 v-if="item.img"，
// 图片存在时占位不渲染 → 加载失败后封面变成一整块空白。
// 改为记录「已损坏的封面 key」，让模板在坏图时改走占位分支。
const brokenCovers = ref<Set<string>>(new Set())
const coverKey = (item: any) => `${item?.source ?? ''}-${item?.id ?? ''}`
const coverInitial = (item: any) => (typeof item?.name === 'string' && item.name ? item.name.slice(0, 1) : '♪')

const markCoverBroken = (item: any) => {
  brokenCovers.value.add(coverKey(item))
}

const doSearch = (page: number) => {
  if (sourceUnsupported.value) return
  const text = searchText.value
  if (text.length) void addHistoryWord(text)
  void searchMedia(props.type, text, page)
}

watch(() => [props.type, props.sourceId, props.page, searchText.value], () => {
  doSearch(props.page ?? 1)
}, { immediate: true })

const togglePage = (page: number) => {
  void router.replace({
    path: route.path,
    query: { ...route.query, page },
  })
}
</script>

<style lang="less" module>
.container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 5px;
}
.albumGrid,
.singerGrid {
  flex: auto;
  overflow-y: auto;
  min-height: 0;
  padding: var(--qm-s5) 0 var(--qm-s7);
  display: grid;
  gap: var(--qm-s6);
}
.albumGrid {
  grid-template-columns: repeat(auto-fill, minmax(142px, 1fr));
}
.singerGrid {
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}
.card {
  cursor: pointer;
  min-width: 0;
}
.cover {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--qm-radius-card, 10px);
  background-color: var(--qm-hover);
  overflow: hidden;
}
.coverCircle {
  border-radius: 50%;
}
.coverImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.coverFallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--qm-fs-lg, 16px);
  color: var(--qm-text-4);
}
.name {
  margin-top: var(--qm-s3);
  font-size: var(--qm-fs-sm);
  color: var(--qm-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta {
  margin-top: 2px;
  font-size: var(--qm-font-meta, 12px);
  color: var(--qm-text-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card:hover .name {
  color: var(--qm-primary);
}
.loading,
.empty {
  flex: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--qm-s5, 12px);
  color: var(--qm-text-4);
  font-size: var(--qm-fs-sm);
  padding: 0 var(--qm-s7, 16px);
  text-align: center;
}
.tip {
  max-width: 420px;
  line-height: 1.7;
}
.btn {
  cursor: pointer;
  padding: 6px 18px;
  border: none;
  border-radius: var(--qm-radius-chip, 999px);
  background-color: var(--qm-primary);
  color: var(--qm-text-invert);
  font-size: var(--qm-fs-sm);
  &:hover {
    filter: brightness(1.08);
  }
}
</style>
