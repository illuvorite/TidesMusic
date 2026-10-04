import { computed, ref, reactive, nextTick } from '@common/utils/vueTools'
import musicSdk from '@renderer/utils/musicSdk'
import { useI18n } from '@renderer/plugins/i18n'
import { hasDislike } from '@renderer/core/dislikeList'

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

  const menus = computed(() => {
    return [
      {
        name: t('list__play'),
        action: 'play',
        disabled: !itemMenuControl.play,
      },
      {
        name: t('list__download'),
        action: 'download',
        disabled: !itemMenuControl.download,
      },
      {
        name: t('list__play_later'),
        action: 'playLater',
        disabled: !itemMenuControl.playLater,
      },
      {
        name: t('list__search'),
        action: 'search',
        disabled: !itemMenuControl.search,
      },
      {
        name: t('list__add_to'),
        action: 'addTo',
        disabled: !itemMenuControl.addTo,
      },
      {
        name: t('list__source_detail'),
        action: 'sourceDetail',
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
        disabled: !itemMenuControl.dislike,
      },
    ]
  })

  const showMenu = (event, musicInfo) => {
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

    switch (action.action) {
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
