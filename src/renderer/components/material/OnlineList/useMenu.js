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
  handleShowMusicComment,
  handleEditLocalMusicInfo,
  handleSetMusicQuality,
  handleDislikeMusic,
}) => {
  const itemMenuControl = reactive({
    play: true,
    addTo: true,
    playLater: true,
    download: true,
    search: true,
    sourceDetail: true,
    comment: true,
    dislike: true,
    editInfo: false,
    setQuality: false,
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
        name: t('list__comment'),
        action: 'comment',
        disabled: !itemMenuControl.comment,
      },
      {
        name: t('local_library__edit_info'),
        action: 'editInfo',
        hide: !itemMenuControl.editInfo,
      },
      {
        name: t('player__quality_override'),
        action: 'setQuality',
        hide: !itemMenuControl.setQuality,
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
    // 评论仅在线音源且该音源实现了 comment 接口时可用（本地歌曲与部分音源无评论）
    itemMenuControl.comment = musicInfo.source != 'local' && !!musicSdk[musicInfo.source]?.comment
    // 编辑歌曲信息仅本地歌曲可用：在线歌曲的名称/歌手来自音源接口，改了无处保存
    itemMenuControl.editInfo = musicInfo.source == 'local'
    // 指定音质仅在线歌曲可用（本地歌曲直接读文件，没有档位概念），
    // 且需要该歌曲确实提供 _qualitys 信息才有得选
    itemMenuControl.setQuality = musicInfo.source != 'local' && !!musicInfo.meta?._qualitys
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
      case 'comment':
        handleShowMusicComment(index)
        break
      case 'editInfo':
        handleEditLocalMusicInfo(index)
        break
      case 'setQuality':
        handleSetMusicQuality(index)
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
