<template>
  <material-search-input
    v-model="searchText"
    :list="tipList"
    :visible-list="visibleList"
    panel
    :hot-list="hotList"
    :history-list="historyList"
    :source-list="sourceOptions"
    :source="currentSource"
    @event="handleEvent"
    @change-source="handleChangeSource"
  />
</template>

<script>
import music from '@renderer/utils/musicSdk'
import { debounce } from '@common/utils'
import {
  computed,
  ref,
  watch,
  nextTick,
} from '@common/utils/vueTools'
import { useRouter, useRoute } from '@common/utils/vueRouter'
import { appSetting } from '@renderer/store/setting'
import { historyList, searchText as _searchText } from '@renderer/store/search/state'
import { getHistoryList, setSearchText, clearHistoryList } from '@renderer/store/search/action'
import { getList as getHotSearchList } from '@renderer/store/hotSearch'
import { getSearchSetting, setSearchSetting } from '@renderer/utils/data'
import { getAvailableSources, getSourceName } from '@renderer/utils/personalRecommend'

export default {
  setup() {
    const searchText = ref('')
    const visibleList = ref(false)
    const tipList = ref([])
    // 热门搜索（输入为空时下拉左栏展示）
    const hotList = ref([])
    let isFocused = false
    let prevTempSearchSource = ''

    const route = useRoute()
    const router = useRouter()

    // 搜索源：聚合搜索 + 已在设置里启用的音源
    const sourceOptions = computed(() => [
      { id: 'all', name: window.i18n.t('source_all') },
      ...getAvailableSources().map(id => ({ id, name: getSourceName(id) })),
    ])
    const currentSource = ref('all')

    const initSearchSource = async() => {
      const { source } = await getSearchSetting()
      currentSource.value = source ?? 'all'
    }
    void initSearchSource()

    // 切换搜索源：搜索结果源与联想/热搜源一起切换（聚合搜索不改变联想源）
    // 先同步更新本地状态再异步落盘，交互即时且避免 await 后再改共享变量
    const handleChangeSource = (id) => {
      const nextTipSource = id === 'all' ? prevTempSearchSource : id
      if (id !== 'all') {
        prevTempSearchSource = nextTipSource
        tipList.value = []
      }
      currentSource.value = id
      void setSearchSetting({ source: id, temp_source: nextTipSource })
      if (id !== 'all') void loadHotSearch()
    }

    // 热搜优先取带热度的接口（QQ 音乐返回 score），其余音源回退到通用热搜词
    const loadHotSearch = async() => {
      try {
        const { temp_source } = await getSearchSetting()
        prevTempSearchSource ||= temp_source
        const sdk = music[prevTempSearchSource]?.hotSearch
        if (sdk?.getListWithHot) {
          const { list } = await sdk.getListWithHot()
          hotList.value = (list ?? []).slice(0, 10)
          return
        }
        const list = await getHotSearchList(prevTempSearchSource)
        hotList.value = (list ?? []).slice(0, 10).map(name => ({ name }))
      } catch (_) {
        hotList.value = []
      }
    }
    void loadHotSearch()

    watch(() => route.name, (newValue, oldValue) => {
      if (oldValue == 'Search' && newValue != 'SongListDetail') {
        setTimeout(() => {
          if (appSetting['odc.isAutoClearSearchInput'] && searchText.value) searchText.value = ''
          if (appSetting['odc.isAutoClearSearchList']) setSearchText('')
        })
      }
    })

    watch(_searchText, (newValue, oldValue) => {
      searchText.value = newValue
      if (newValue !== searchText.value) searchText.value = newValue
    })
    // 输入框为空时，下拉里展示搜索历史
    const showHistory = () => {
      tipList.value = historyList.slice(0, 8)
    }

    watch(searchText, () => {
      if (!searchText.value) {
        showHistory()
        return
      }
      handleTipSearch()
    })

    void getHistoryList().then(showHistory)


    const tipSearch = debounce(async() => {
      const { temp_source } = await getSearchSetting()
      prevTempSearchSource ||= temp_source
      const sdk = music[prevTempSearchSource]
      // 部分音源未接入联想接口（如 kg/wy/mg），此时静默收起列表，避免报错
      if (!sdk?.tipSearch) {
        tipList.value = []
        return
      }
      if (searchText.value === '') {
        tipList.value = []
        sdk.tipSearch.cancelTipSearch()
        return
      }
      sdk.tipSearch.search(searchText.value).then(list => {
        tipList.value = list
      }).catch(() => {})
    }, 50)

    const handleTipSearch = () => {
      if (!visibleList.value && isFocused) visibleList.value = true
      tipSearch()
    }

    const handleSearch = () => {
      visibleList.value &&= false
      if (!searchText.value && route.path != '/search') {
        setSearchText('')
        return
      }
      setTimeout(() => {
        router.push({
          path: '/search',
          query: {
            text: searchText.value,
          },
        }).catch(_ => _)
      }, searchText.value ? 200 : 0)
    }

    const handleEvent = ({ action, data }) => {
      switch (action) {
        case 'focus':
          isFocused = true
          visibleList.value ||= true
          if (searchText.value) handleTipSearch()
          break
        case 'blur':
          isFocused = false
          setTimeout(() => {
            visibleList.value &&= false
          }, 50)
          break
        case 'submit':
          handleSearch()
          break
        case 'listClick':
          searchText.value = tipList.value[data]
          void nextTick(handleSearch)
          break
        case 'clearHistory':
          clearHistoryList()
          break
      }
    }

    return {
      searchText,
      visibleList,
      tipList,
      hotList,
      historyList,
      sourceOptions,
      currentSource,
      handleEvent,
      handleChangeSource,
    }
  },
}

</script>
