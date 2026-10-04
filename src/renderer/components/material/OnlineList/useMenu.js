import { computed, ref, reactive, nextTick } from '@common/utils/vueTools'
import musicSdk from '@renderer/utils/musicSdk'
import { useI18n } from '@renderer/plugins/i18n'
import { hasDislike } from '@renderer/core/dislikeList'
import useLovedList from '@renderer/utils/compositions/useLovedList'
import useListTargetMenu from '@renderer/utils/compositions/useListTargetMenu'

export default ({
  props,
  assertApiSupport,
  emit,

  handleShowDownloadModal,
  handlePlayMusic,
  handlePlayMusicLater,
  handleSearch,
  handleShowMusicAddModal,
  handleOpenMusicDetail,
  handleDislikeMusic,
}) => {
  const itemMenuControl = reactive({
    play: true,
    addTo: true,
    playLater: true,
    download: true,
    search: true,
    sourceDetail: true,
    dislike: true,
  })
  const t = useI18n()
  const menuLocation = reactive({ x: 0, y: 0 })
  const isShowItemMenu = ref(false)

  // 我喜欢（全局共享的收藏状态）与「添加到」二级菜单
  const { isLoved, loadLoved, toggleLove } = useLovedList()
  loadLoved()
  const { buildSubmenu, handleTargetAction } = useListTargetMenu()
  const currentMusicInfo = ref(null)

  // 菜单结构对齐 QQ 音乐右键菜单（见 docs/qq-music-todo ㊸）：
  // [播放 / 下一首播放] — [我喜欢 / 添加到 / 下载 / 搜索 / 歌曲详情 / 不喜欢]
  const menus = computed(() => {
    const info = currentMusicInfo.value
    const loved = isLoved(info)
    return [
      {
        name: t('list__play'),
        action: 'play',
        icon: 'play-o',
        disabled: !itemMenuControl.play,
      },
      {
        name: t('list__play_later'),
        action: 'playLater',
        icon: 'play-next',
        disabled: !itemMenuControl.playLater,
      },
      { divider: true, key: 'd-play' },
      {
        name: t('list__love_it'),
        action: 'love',
        icon: loved ? 'heart' : 'heart-outline',
        iconActive: loved,
      },
      {
        name: t('list__add_to'),
        action: 'addTo',
        icon: 'square-plus',
        disabled: !itemMenuControl.addTo,
        submenu: buildSubmenu('add', info),
      },
      {
        name: t('list__download'),
        action: 'download',
        icon: 'download',
        disabled: !itemMenuControl.download,
      },
      {
        name: t('list__search'),
        action: 'search',
        icon: 'search',
        disabled: !itemMenuControl.search,
      },
      {
        name: t('list__source_detail'),
        action: 'sourceDetail',
        icon: 'information-slab-circle-outline',
        disabled: !itemMenuControl.sourceDetail,
      },
      {
        name: t('list__dislike'),
        action: 'dislike',
        icon: 'heart-slash',
        disabled: !itemMenuControl.dislike,
      },
    ]
  })

  const showMenu = (event, musicInfo) => {
    currentMusicInfo.value = musicInfo
    itemMenuControl.sourceDetail = !!musicSdk[musicInfo.source]?.getMusicDetailPageUrl
    // this.listMenu.itemMenuControl.play =
    //   this.listMenu.itemMenuControl.playLater =
    itemMenuControl.download = assertApiSupport(musicInfo.source)

    itemMenuControl.dislike = !hasDislike(musicInfo)

    if (props.checkApiSource) {
      itemMenuControl.playLater =
      itemMenuControl.play =
        itemMenuControl.download
    }

    menuLocation.x = event.pageX
    menuLocation.y = event.pageY

    if (isShowItemMenu.value) return
    emit('show-menu')
    nextTick(() => {
      isShowItemMenu.value = true
    })
  }

  const hideMenu = () => {
    isShowItemMenu.value = false
  }

  const menuClick = (action, index) => {
    // console.log(action)
    hideMenu()
    if (!action) return
    // 「添加到 / 移动到」二级菜单的目标列表
    if (handleTargetAction(action.action, currentMusicInfo.value)) return

    switch (action.action) {
      case 'love':
        toggleLove(currentMusicInfo.value)
        break
      case 'download':
        handleShowDownloadModal(index)
        break
      case 'play':
        handlePlayMusic(index)
        break
      case 'playLater':
        handlePlayMusicLater(index)
        break
      case 'search':
        handleSearch(index)
        break
      case 'addTo':
        handleShowMusicAddModal(index)
        break
      case 'sourceDetail':
        handleOpenMusicDetail(index)
        break
      case 'dislike':
        handleDislikeMusic(index)
        break
    }
  }

  return {
    menus,
    menuLocation,
    isShowItemMenu,
    showMenu,
    menuClick,
  }
}
