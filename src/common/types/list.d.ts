declare namespace LX {
  namespace List {
    interface UserListInfo {
      id: string
      name: string
      // list: LX.Music.MusicInfo[]
      source?: LX.OnlineSource
      sourceListId?: string
      // position?: number
      locationUpdateTime: number | null
    }

    interface MyDefaultListInfo {
      id: 'default'
      name: 'list__name_default'
      // name: '试听列表'
      // list: LX.Music.MusicInfo[]
    }

    interface MyLoveListInfo {
      id: 'love'
      name: 'list__name_love'
      // name: '我的收藏'
      // list: LX.Music.MusicInfo[]
    }

    /** 最近播放列表（替代已下线的「试听列表」defaultList） */
    interface MyRecentListInfo {
      id: 'recent'
      name: 'list__name_recent'
      // list: LX.Music.MusicInfo[]
    }

    interface MyTempListInfo {
      id: 'temp'
      // 与 defaultList / loveList 一致：存 i18n 键，渲染处统一翻译
      name: 'list__name_temp'
      // list: LX.Music.MusicInfo[]
      // TODO: save default lists info
      meta: {
        id?: string
      }
    }

    type MyListInfo = MyDefaultListInfo | MyLoveListInfo | MyRecentListInfo | UserListInfo

    interface MyAllList {
      defaultList: MyDefaultListInfo
      loveList: MyLoveListInfo
      recentList: MyRecentListInfo
      userList: UserListInfo[]
      tempList: MyTempListInfo
    }


    type SearchHistoryList = string[]
    type ListPositionInfo = Record<string, number>
    type ListUpdateInfo = Record<string, {
      updateTime: number
      isAutoUpdate: boolean
    }>

    type ListSaveType = 'myList' | 'downloadList'
    type ListSaveInfo = {
      type: 'myList'
      data: Partial<MyAllList>
    } | {
      type: 'downloadList'
      data: LX.Download.ListItem[]
    }


    type ListActionDataOverwrite = MakeOptional<LX.List.ListDataFull, 'tempList' | 'recentList' | 'defaultList'>
    interface ListActionAdd {
      position: number
      listInfos: UserListInfo[]
    }
    type ListActionRemove = string[]
    type ListActionUpdate = UserListInfo[]
    interface ListActionUpdatePosition {
      /**
       * 列表id
       */
      ids: string[]
      /**
       * 位置
       */
      position: number
    }

    interface ListActionMusicAdd {
      id: string
      musicInfos: LX.Music.MusicInfo[]
      addMusicLocationType: LX.AddMusicLocationType
    }

    interface ListActionMusicMove {
      fromId: string
      toId: string
      musicInfos: LX.Music.MusicInfo[]
      addMusicLocationType: LX.AddMusicLocationType
    }

    interface ListActionCheckMusicExistList {
      listId: string
      musicInfoId: string
    }

    interface ListActionMusicRemove {
      listId: string
      ids: string[]
    }

    type ListActionMusicUpdate = Array<{
      id: string
      musicInfo: LX.Music.MusicInfo
    }>

    interface ListActionMusicUpdatePosition {
      listId: string
      position: number
      ids: string[]
    }

    interface ListActionMusicOverwrite {
      listId: string
      musicInfos: LX.Music.MusicInfo[]
    }

    type ListActionMusicClear = string[]

    interface MyDefaultListInfoFull extends MyDefaultListInfo {
      list: LX.Music.MusicInfo[]
    }
    interface MyLoveListInfoFull extends MyLoveListInfo {
      list: LX.Music.MusicInfo[]
    }
    interface MyRecentListInfoFull extends MyRecentListInfo {
      list: LX.Music.MusicInfo[]
    }
    interface UserListInfoFull extends UserListInfo {
      list: LX.Music.MusicInfo[]
    }
    interface MyTempListInfoFull extends MyTempListInfo {
      list: LX.Music.MusicInfo[]
    }

    interface ListDataFull {
      /** 历史遗留：老版本的「试听列表」。仅作兼容读取，新代码不应写入。 */
      defaultList?: LX.Music.MusicInfo[]
      loveList: LX.Music.MusicInfo[]
      /** 历史遗留：已下线的「最近播放」列表（现由播放历史 playHistoryList 承载）。仅作兼容读取。 */
      recentList?: LX.Music.MusicInfo[]
      userList: UserListInfoFull[]
      tempList: LX.Music.MusicInfo[]
    }
  }
}
