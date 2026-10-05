<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <!-- 结果类型：下划线页签 -->
      <nav :class="$style.typeTabs">
        <button
          v-for="item in searchTypes" :key="item.id"
          type="button"
          :class="[$style.typeTab, searchType === item.id && $style.typeTabActive]"
          @click="handleTypeChange(item.id)"
        >{{ item.label }}</button>
      </nav>
      <!-- 音源：右侧标签 -->
      <div :class="$style.sourceTabs">
        <button
          v-for="item in sources" :key="item.id"
          type="button"
          :class="[$style.sourceTab, source === item.id && $style.sourceTabActive]"
          @click="handleSourceChange(item.id)"
        >{{ item.label }}</button>
      </div>
    </div>
    <div :class="$style.main">
      <song-list-list v-if="searchType == 'songlist'" v-show="searchText" :page="page" :source-id="source" />
      <media-list v-else-if="searchType == 'album' || searchType == 'singer'" v-show="searchText" :type="searchType" :page="page" :source-id="source" />
      <music-list v-else v-show="searchText" :page="page" :source-id="source" />
      <blank-view :visible="!searchText" :source="source" />
    </div>
  </div>
</template>

<script>
import { useRoute, useRouter } from '@common/utils/vueRouter'
import { searchText } from '@renderer/store/search/state'
import { getSearchSetting, setSearchSetting } from '@renderer/utils/data'
import { sources as _sources } from '@renderer/store/search/music'

import MusicList from './MusicList/index.vue'
import SongListList from './SongListList/index.vue'
import MediaList from './MediaList/index.vue'
import BlankView from './components/BlankView.vue'
import { computed, ref, watch } from '@common/utils/vueTools'
import { getSourceName } from '@renderer/utils/personalRecommend'
import { getHistoryList } from '@renderer/store/search/action'

const source = ref('kw')
const searchType = ref(null)
const page = ref(1)

export default {
  components: {
    MusicList,
    SongListList,
    MediaList,
    BlankView,
  },
  setup() {
    const route = useRoute()
    const router = useRouter()

    /**
     * 把路由 query 同步到页面状态（音源 / 结果类型 / 页码 / 关键词）。
     *
     * ⚠️ 这里刻意**不用** beforeRouteEnter / beforeRouteUpdate（原实现就是那么写的，
     * 也正是「只有第一次搜索能用」的根因）：
     *   1. View.vue 的 <router-view> 用的是 v-slot 插槽写法，vue-router 拿不到
     *      实际渲染出来的组件实例，不会写入 record.instances，于是
     *      beforeRouteUpdate 永远进不了候选队列（vue-router 里那句
     *      `if (guardType !== 'beforeRouteEnter' && !record.instances[name]) continue`）；
     *   2. View.vue 又给路由组件加了 `:key="routeKey + fullPath"`，query 变化时组件是
     *      「重建」而不是「复用」，而记录对象本身没变 → 也不在 enteringRecords 里，
     *      所以 beforeRouteEnter 同样不会触发。
     *   结果：只有「从别的页面第一次进入 /search」时守卫才会跑（那次是真正的进入），
     *   之后在搜索页里换关键词 / 换音源 / 翻页，query 变了却没有任何人同步 ——
     *   搜索框、音源、页码全部停在第一次的值，表现为「搜第二次就没反应」「切平台无效」。
     *
     * 改成在 setup 里 watch 路由 query：与渲染方式完全解耦，且组件重建后依然生效。
     */
    const applyQuery = async(query) => {
      let _source = query.source
      let _type = query.type
      const _page = query.page

      if (_source == null || _type == null) {
        let setting = { source: 'all', type: 'music' }
        try {
          setting = await Promise.race([
            getSearchSetting(),
            new Promise(resolve => {
              setTimeout(() => { resolve(setting) }, 1200)
            }),
          ])
        } catch (err) {
          console.warn('getSearchSetting failed:', err)
        }
        _source ??= setting.source
        _type ??= setting.type

        // 把补出来的参数写回 URL（replace 不留历史），watch 会带着完整参数再进来一次
        void router.replace({
          path: route.path,
          query: { ...query, source: _source, type: _type, page: _page },
        })
      }

      source.value = _source
      searchType.value = _type

      if (_page) page.value = parseInt(_page)

      if (query.text != null) {
        searchText.value = query.text
        if (!_page) page.value = 1
      }
      void setSearchSetting({ source: _source, type: _type })
    }

    // 依赖只取真正影响搜索的四个 query 参数：任何一个变化才重新同步，
    // 避免路由对象其它字段变动（如 hash/state）造成多余的设置写回。
    watch(
      () => [route.query.source, route.query.type, route.query.page, route.query.text],
      () => { void applyQuery(route.query) },
      { immediate: true },
    )

    // 进入搜索页即拉取搜索历史（供空态与搜索框下拉展示）
    void getHistoryList()

    const sources = _sources.map(id => {
      return {
        id,
        // sourceNames 在渲染进程里没有数据，这里用 SDK 里的音源名（含「全部」）
        label: id === 'all' ? window.i18n.t('all') : getSourceName(id),
      }
    })
    const handleSourceChange = (id) => {
      void router.replace({
        path: route.path,
        query: {
          ...route.query,
          source: id,
          page: 1,
        },
      })
    }

    const searchTypes = computed(() => {
      return [
        { label: window.i18n.t('search__type_music'), id: 'music' },
        { label: window.i18n.t('search__type_songlist'), id: 'songlist' },
        { label: window.i18n.t('search__type_album'), id: 'album' },
        { label: window.i18n.t('search__type_singer'), id: 'singer' },
      ]
    })
    const handleTypeChange = (type) => {
      void router.replace({
        path: route.path,
        query: {
          ...route.query,
          type,
          page: 1,
        },
      })
    }


    return {
      sources,
      source,
      handleSourceChange,
      searchTypes,
      searchType,
      handleTypeChange,
      page,
      searchText,
    }
  },
}


</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.container {
  display: flex;
  flex-flow: column nowrap;
  height: 100%;
  background: var(--qm-surface);
}

.header {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--qm-s4);
  height: 46px;
  padding: 0 var(--qm-content-pad-right) 0 var(--qm-content-pad-left);
  border-bottom: 1px solid var(--qm-line-1);
  background-color: var(--qm-surface);
}

// ------- 结果类型页签 -------
.typeTabs {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-s6);
  height: 100%;
}

.typeTab {
  position: relative;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--qm-text-3);
  font-size: var(--qm-font-body);
  cursor: pointer;
  transition: color var(--qm-t-fast);

  &:hover { color: var(--qm-text-1); }

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 0;
    height: 2px;
    border-radius: var(--qm-radius-2xs, 4px);
    background-color: var(--qm-primary);
    transform: translateX(-50%);
    transition: width var(--qm-t-base);
  }
}

.typeTabActive {
  color: var(--qm-text-1);
  font-weight: var(--qm-fw-semibold, 600);

  &::after { width: 22px; }
}

// ------- 音源标签 -------
.sourceTabs {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-s2);
}

.sourceTab {
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--qm-radius-chip);
  background: transparent;
  color: var(--qm-text-3);
  font-size: var(--qm-font-aux);
  cursor: pointer;
  transition: background-color var(--qm-t-fast), color var(--qm-t-fast);

  &:hover { background-color: var(--qm-hover); color: var(--qm-text-1); }
}

.sourceTabActive {
  background-color: var(--qm-primary-soft);
  color: var(--qm-primary);
  font-weight: var(--qm-fw-semibold, 600);

  &:hover { background-color: var(--qm-primary-soft-hover); color: var(--qm-primary); }
}

.main {
  position: relative;
  flex: auto;
  min-height: 0;
}
</style>
