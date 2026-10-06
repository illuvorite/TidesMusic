import { ref, watch, computed, onBeforeUnmount } from '@common/utils/vueTools'
import { playMusicInfo, playInfo } from '@renderer/store/player/state'
import { getListMusics } from '@renderer/store/list/action'
import { recentList, tempList, tempListMeta } from '@renderer/store/list/state'
import { appSetting } from '@renderer/store/setting'
import { playHistoryList, loadPlayHistory } from '@renderer/store/playHistory'


export default ({ props, onLoadedList }) => {
  const rightClickSelectedIndex = ref(-1)
  const selectedIndex = ref(-1)
  const dom_listContent = ref(null)
  const listRef = ref(null)

  const excludeListIds = computed(() => ([props.listId]))


  const list = ref([])

  /**
   * 「最近播放」的数据源是播放历史（store/playHistory.ts），不是列表库里的 recentList。
   *
   * 列表库侧只有读取方、**没有任何写入方**（历史由每次播放时的 recordPlayHistory 负责，
   * 它落库并维护去重置顶与条数上限），所以读 recentList 会永远是空列表 ——
   * 这正是「播了歌但最近播放显示 0 首」的原因。playHistory.ts 的设计注释里也写明
   * 它是「供最近播放页消费」的。
   */
  const isRecentList = computed(() => props.listId === recentList.id)

  const loadList = (id) => {
    if (id === recentList.id) {
      // 历史是异步落库的，先确保已载入（并发调用共用同一次请求）。
      // 必须保持异步：onLoadedList 内部用到的 restoreScroll 在 setup 后段才声明，
      // 而 immediate watcher 是同步触发的，同步调用会踩 TDZ。
      return loadPlayHistory().then(() => {
        if (id != props.listId) return
        list.value = [...playHistoryList]
        onLoadedList()
      })
    }
    return getListMusics(id).then(l => {
      list.value = [...l]
      if (id != props.listId) return
      onLoadedList()
    })
  }

  watch(() => props.listId, id => {
    loadList(id)
  }, {
    immediate: true,
  })

  // 播放历史变化时（新歌置顶 / 删除 / 清空）同步列表，否则停在本页播放新歌后列表不会更新
  watch(playHistoryList, () => {
    if (!isRecentList.value) return
    list.value = [...playHistoryList]
  })

  // 从「最近播放」播放时，实际播的是灌进临时列表的那份历史（见 usePlay），
  // 所以 playMusicInfo.listId 是 TEMP 而不是 recent；用 tempListMeta.id 认回自己，
  // 否则正在播放的那一行不会高亮。
  const isRecentPlaying = computed(() => (
    isRecentList.value &&
    playMusicInfo.listId === tempList.id &&
    tempListMeta.id === recentList.id
  ))

  const playerInfo = computed(() => {
    if (isRecentPlaying.value) {
      // 播放会把这歌置顶、整张历史行序随之变化，用 TEMP 里的索引去对应行号会高亮错行，
      // 所以按 id 反查当前行号。
      const id = playMusicInfo.musicInfo?.id
      const index = id == null ? -1 : list.value.findIndex(m => m.id == id)
      return { isPlayList: index >= 0, playIndex: index }
    }
    return {
      isPlayList: playMusicInfo.listId == props.listId,
      playIndex: playInfo.playIndex,
    }
  })

  const setSelectedIndex = index => {
    selectedIndex.value = index
  }

  const isShowSource = computed(() => appSetting['list.isShowSource'])

  const handleMyListUpdate = (ids) => {
    if (!ids.includes(props.listId)) return
    // 最近播放的数据源是播放历史，与列表库无关：列表库里的 recent 恒为空，
    // 照抄过来会把已经渲染出来的历史清空（数据覆盖/清空时会推到 'recent' 这个 id）。
    if (isRecentList.value) return
    getListMusics(props.listId).then(l => {
      list.value = [...l]
    })
  }

  window.app_event.on('myListUpdate', handleMyListUpdate)

  onBeforeUnmount(() => {
    window.app_event.off('myListUpdate', handleMyListUpdate)
  })

  return {
    rightClickSelectedIndex,
    selectedIndex,
    dom_listContent,
    listRef,
    list,
    playerInfo,
    setSelectedIndex,
    isShowSource,
    excludeListIds,
  }
}
