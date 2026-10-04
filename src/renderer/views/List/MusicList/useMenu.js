import { computed, ref, shallowReactive, reactive, nextTick } from '@common/utils/vueTools'
import musicSdk from '@renderer/utils/musicSdk'
import { useI18n } from '@renderer/plugins/i18n'
import { hasDislike } from '@renderer/core/dislikeList'
import useLovedList from '@renderer/utils/compositions/useLovedList'
import useListTargetMenu from '@renderer/utils/compositions/useListTargetMenu'

export default ({
  assertApiSupport,
  emit,
  listId = null,

  handleShowDownloadModal,
  handlePlayMusic,
  handlePlayMusicLater,
  handleSearch,
  handleShowMusicToggleModal,
  handleShowMusicAddModal,
  handleShowMusicMoveModal,
  handleShowSortModal,
  handleOpenMusicDetail,
  handleCopyName,
  handleDislikeMusic,
  handleRemoveMusic,
}) => {
  const itemMenuControl = reactive({
    play: true,
    playLater: true,
    copyName: true,
    addTo: true,
    moveTo: true,
    sort: true,
    toggleSource: true,
    download: true,
    search: true,
    dislike: true,
    remove: true,
    sourceDetail: true,
  })
  const t = useI18n()
  const menuLocation = shallowReactive({ x: 0, y: 0 })
  const isShowItemMenu = ref(false)

  // 我喜欢（全局共享的收藏状态）与「添加到 / 移动到」二级菜单
  const { isLoved, loadLoved, toggleLove } = useLovedList()
  loadLoved()
  const { buildSubmenu, handleTargetAction } = useListTargetMenu()
  const currentMusicInfo = ref(null)

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
        name: t('list__move_to'),
        action: 'moveTo',
        disabled: !itemMenuControl.moveTo,
        submenu: buildSubmenu('move', info, listId),
      },
      {
        name: t('list__download'),
        action: 'download',
        icon: 'download',
        disabled: !itemMenuControl.download,
      },
      {
        name: t('list__sort'),
        action: 'sort',
        icon: 'sort',
        disabled: !itemMenuControl.sort,
      },
      {
        name: t('list__toggle_source'),
        action: 'toggleSource',
        icon: 'swap',
        disabled: !itemMenuControl.toggleSource,
      },
      {
        name: t('list__source_detail'),
        action: 'sourceDetail',
        icon: 'information-slab-circle-outline',
        disabled: !itemMenuControl.sourceDetail,
      },
      {
        name: t('list__search'),
        action: 'search',
        icon: 'search',
        disabled: !itemMenuControl.search,
      },
      {
        name: t('list__dislike'),
        action: 'dislike',
        icon: 'heart-slash',
        disabled: !itemMenuControl.dislike,
      },
      { divider: true, key: 'd-remove' },
      {
        name: t('list__remove'),
        action: 'remove',
        icon: 'delete',
        disabled: !itemMenuControl.remove,
      },
      {
        name: t('list__copy_name'),
        action: 'copyName',
        disabled: !itemMenuControl.copyName,
      },
    ]
  })

  const showMenu = (event, musicInfo) => {
    currentMusicInfo.value = musicInfo
    itemMenuControl.sourceDetail = !!musicSdk[musicInfo.source]?.getMusicDetailPageUrl
    // itemMenuControl.play =
    //   itemMenuControl.playLater =
    itemMenuControl.download = assertApiSupport(musicInfo.source) && musicInfo.source != 'local'

    itemMenuControl.dislike = !hasDislike(musicInfo)

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
    if (handleTargetAction(action.action, currentMusicInfo.value, listId)) return

    switch (action.action) {
      case 'love':
        toggleLove(currentMusicInfo.value)
        break
      case 'play':
        handlePlayMusic(index)
        break
      case 'playLater':
        handlePlayMusicLater(index)
        break
      case 'copyName':
        handleCopyName(index)
        break
      case 'addTo':
        handleShowMusicAddModal(index)
        break
      case 'moveTo':
        handleShowMusicMoveModal(index)
        break
      case 'sort':
        handleShowSortModal(index)
        break
      case 'toggleSource':
        handleShowMusicToggleModal(index)
        break
      case 'download':
        handleShowDownloadModal(index)
        break
      case 'search':
        handleSearch(index)
        break
      case 'dislike':
        handleDislikeMusic(index)
        break
      case 'remove':
        handleRemoveMusic(index)
        break
      case 'sourceDetail':
        handleOpenMusicDetail(index)
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
