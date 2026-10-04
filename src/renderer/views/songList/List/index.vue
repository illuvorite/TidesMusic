<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <div :class="$style.left">
        <tag-list :source="source" :tag-id="tagId" :sort-id="sortId" />
        <sort-tab :source="source" :tag-id="tagId" :sort-id="sortId" />
      </div>
      <base-btn :class="$style.btn" outline min @click="visibleOpenSongListModal = true">{{ $t('songlist__import_input_show_btn') }}</base-btn>
      <base-selection :model-value="source" :class="$style.select" :list="sourceList" item-key="id" item-name="name" @update:model-value="handleToggleSource" />
    </div>
    <list-view :source="source" :tag-id="tagId" :sort-id="sortId" :page="page" />
    <open-list-modal v-model="visibleOpenSongListModal" :source-list="sourceList" />
  </div>
</template>

<script lang="ts">
import { computed, ref } from '@common/utils/vueTools'
import { getSongListSetting, setSongListSetting } from '@renderer/utils/data'
import TagList from './components/TagList.vue'
import SortTab from './components/SortTab.vue'
import OpenListModal from './components/OpenListModal.vue'
import ListView from './ListView.vue'
import { sources, listInfo, isVisibleListDetail } from '@renderer/store/songList/state'
import { sourceNames } from '@renderer/store'
import { useRoute, useRouter } from '@common/utils/vueRouter'

const source = ref<LX.OnlineSource>('kw')
const tagId = ref<string>('')
const sortId = ref<string>('')
const page = ref<number>(1)

// 各音源的默认分类：tx 的「全部」广场接口（PlayListPlazaServer id=10000000）匿名数据很旧
// （多为 2020 年前后），默认落到「流行」分类（PlayListCategoryServer 按更新时间返回，每天有新歌单）
const DEFAULT_TAG_BY_SOURCE: Record<string, string> = { tx: '3152' }


interface Query {
  source?: string
  tagId?: string
  sortId?: string
  page?: string
}

const verifyQueryParams = async function(this: any, to: { query: Query, path: string }, from: any, next: (route?: { path: string, query: Query }) => void) {
  let _source = to.query.source
  let _tagId = to.query.tagId
  let _sortId = to.query.sortId
  let _page: string | undefined = to.query.page

  if (isVisibleListDetail.value) {
    next({ path: '/songList/detail', query: {} })
    return
  } else if (_source == null) {
    if (listInfo.key) {
      _source = listInfo.source
      _tagId = listInfo.tagId
      _sortId = listInfo.sortId
      _page = listInfo.page.toString()
    } else {
      const setting = await getSongListSetting()
      _source = setting.source
      // 站点默认（无记录）时落到该音源的活跃分类，避免一进来总是同一批老歌单
      _tagId = setting.tagId || DEFAULT_TAG_BY_SOURCE[setting.source] || ''
      _sortId = setting.sortId
      _page = '1'
    }

    next({
      path: to.path,
      query: { ...to.query, source: _source, tagId: _tagId, sortId: _sortId, page: _page },
    })
    return
  }
  next()
  source.value = _source as LX.OnlineSource
  tagId.value = _tagId ?? ''
  sortId.value = _sortId ?? ''
  page.value = _page ? parseInt(_page) : 1
  void setSongListSetting({ source: _source, tagId: _tagId, sortId: _sortId })
}


export default {
  components: {
    TagList,
    SortTab,
    ListView,
    OpenListModal,
  },
  beforeRouteEnter: verifyQueryParams,
  beforeRouteUpdate: verifyQueryParams,
  setup() {
    const visibleOpenSongListModal = ref(false)

    const sourceList = computed(() => {
      return sources.map(s => ({ id: s, name: sourceNames.value[s] }))
    })
    const router = useRouter()
    const route = useRoute()
    const handleToggleSource = (id: LX.OnlineSource) => {
      if (id == source.value) return
      void router.replace({
        path: route.path,
        query: {
          source: id,
          tagId: '',
        },
      })
    }

    return {
      source,
      tagId,
      sortId,
      page,
      sourceList,
      handleToggleSource,
      visibleOpenSongListModal,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  position: relative;
  background-color: var(--qm-surface);
}
.header {
  flex: none;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  height: 46px;
  padding: 0 var(--qm-content-pad-right) 0 var(--qm-content-pad-left);
  gap: var(--qm-sp-3, 8px);
  background-color: var(--qm-surface);
  border-bottom: 1px solid var(--qm-line-1);
}
.left {
  flex: auto;
  display: flex;
  flex-flow: row nowrap;
}

.btn {
  color: var(--qm-text-2);
  font-size: var(--qm-font-meta);
  transition: color var(--qm-t-fast);
  background: none !important;
  &:hover {
    color: var(--qm-primary);
  }
}


.select {
  font-size: var(--qm-fs-xs, 12px);
  width: auto;
  flex: none;
  padding: 0 5px;

  &:hover {
    :global(.icon) {
      opacity: 1;
    }
  }


  :global {
    .label-content {
      background-color: transparent !important;
      transition: color @transition-fast;
      color: var(--qm-text-2);
      // line-height: 38px;
      // height: 38px;
      border-radius: 0;
      &:hover {
        // background: none !important;
        color: var(--qm-primary-hover);
        .icon {
          opacity: 1;
          // color: var(--qm-primary-hover);
        }
      }
    }
    // .label {
    //   color: var(--qm-text-2) !important;
    // }
    .icon {
      svg {
        width: .8em;
      }
      // opacity: .6;
      // transition: color @transition-fast;
      // color: var(--qm-text-4);
    }

    .selection-list {
      max-height: 500px;
      box-shadow: 0 1px 4px 0 rgba(0,0,0,.2);
      li {
        // background-color: var(--qm-card);
        text-align: center;
        line-height: 38px;
        font-size: var(--qm-fs-sm, 13px);
        &:hover {
          background-color: var(--qm-hover);
        }
        &:active {
          background-color: var(--qm-hover-strong);
        }
      }
    }
  }
}

</style>
