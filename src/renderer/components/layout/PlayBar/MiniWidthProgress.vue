<template>
  <div :class="[$style.player, { [$style.fullMode]: variant === 'full' }]">
    <!-- 左：封面 + 信息 + 快捷操作 -->
    <div :class="$style.left">
      <div :class="$style.cover" :aria-label="$t('player__pic_tip')" @contextmenu="handleToMusicLocation" @click="showPlayerDetail">
        <img v-if="musicInfo.pic" :src="musicInfo.pic" decoding="async" @error="imgError">
        <div v-else :class="$style.coverEmpty">
          <svg-icon name="music" />
        </div>
      </div>
      <div :class="$style.info">
        <div :class="$style.title" :title="title">{{ title || '未在播放' }}</div>
        <div :class="$style.artist" :title="musicInfo.singer">{{ musicInfo.singer || '—' }}</div>
      </div>
      <button :class="[$style.iconBtn, { [$style.liked]: isLiked }]" :aria-label="isLiked ? '取消喜欢' : '喜欢'" :title="isLiked ? '取消喜欢' : '喜欢'" @click="toggleLove">
        <svg-icon :name="isLiked ? 'heart' : 'heart-outline'" />
      </button>
      <button :class="$style.iconBtn" :aria-label="$t('list__comment')" :title="$t('list__comment')" @click="showComments">
        <svg-icon name="comment" />
      </button>
      <material-popup-btn ref="moreBtnRef">
        <button :class="$style.iconBtn" :aria-label="'更多'">
          <svg-icon name="more-h" />
        </button>
        <template #content>
          <div :class="$style.moreMenu">
            <button :class="$style.menuItem" @click="handleMoreAction('copyName')">复制歌曲名</button>
            <button :class="$style.menuItem" @click="handleMoreAction('copyInfo')">复制歌曲信息</button>
            <button :class="$style.menuItem" @click="handleMoreAction('goLocation')">跳转到所在列表</button>
            <button :class="$style.menuItem" @click="handleMoreAction('addTo')">添加到歌单</button>
          </div>
        </template>
      </material-popup-btn>
    </div>

    <!-- 中：进度 + 控制 -->
    <div :class="$style.center">
      <div :class="$style.controls">
        <material-popup-btn ref="modeBtnRef" :class="$style.modeBtnWrap">
          <button :class="$style.iconBtn" :aria-label="playModeName" :title="playModeName">
            <svg-icon :name="playModeIcon" />
          </button>
          <template #content>
            <div :class="$style.popupMenu">
              <button
                v-for="opt in playModeOptions" :key="opt.mode"
                :class="[$style.menuItem, { [$style.menuItemActive]: appSetting['player.togglePlayMethod'] == opt.mode }]"
                @click="selectPlayMode(opt.mode)"
              >
                <svg-icon :name="opt.icon" :class="$style.menuIcon" />
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </template>
        </material-popup-btn>
        <button :class="$style.iconBtn" :aria-label="$t('player__prev')" :title="$t('player__prev')" @click="playPrev()">
          <svg-icon name="prev" />
        </button>
        <button :class="[$style.iconBtn, $style.playBtn]" :aria-label="isPlay ? '暂停' : '播放'" :title="isPlay ? '暂停' : '播放'" @click="togglePlay">
          <svg-icon :name="isPlay ? 'pause' : 'play'" />
        </button>
        <button :class="$style.iconBtn" :aria-label="$t('player__next')" :title="$t('player__next')" @click="playNext()">
          <svg-icon name="next" />
        </button>
      </div>
      <div v-if="variant !== 'full'" :class="[$style.progress, { [$style.progressWide]: variant === 'middle' }]">
        <span :class="$style.time">{{ nowPlayTimeStr }}</span>
        <common-progress-bar
          v-if="!isShowPlayerDetail"
          :class-name="$style.progressBar"
          :progress="progress"
          :handle-transition-end="handleTransitionEnd"
          :is-active-transition="isActiveTransition"
          :emit-playback-progress="true"
        />
        <span :class="$style.time">{{ maxPlayTimeStr }}</span>
      </div>
    </div>

    <!-- 右：辅助操作 -->
    <div :class="$style.right">
      <!-- full：进度条已移到播放栏底部通栏，时间合并显示在这里 -->
      <span v-if="variant === 'full'" :class="$style.timeInline">{{ nowPlayTimeStr }} / {{ maxPlayTimeStr }}</span>
      <material-popup-btn>
        <button :class="$style.iconBtn" :aria-label="isMute ? '取消静音' : '音量'" :title="isMute ? '取消静音' : `音量：${volumePercent}%`">
          <svg-icon :name="volumeIcon" />
        </button>
        <template #content>
          <div :class="$style.volumePanel">
            <div :class="$style.volumeInfo">
              <button :class="$style.muteBtn" :title="isMute ? '取消静音' : '静音'" @click.stop="toggleMute">
                <svg-icon :name="volumeIcon" />
              </button>
              <span :class="$style.volumeText">{{ isMute ? '已静音' : `${volumePercent}%` }}</span>
            </div>
            <div :class="$style.volumeSliderWrap" @wheel.stop="handleVolumeWheel">
              <common-progress-bar
                :class-name="$style.volumeBar" :progress="volumeProgress" @change="handleUpdateVolume"
              />
            </div>
            <div :class="$style.volumeStep">
              <button :class="$style.stepBtn" :title="$t('player__volume_down')" @click.stop="stepVolume(-1)">−</button>
              <button :class="$style.stepBtn" :title="$t('player__volume_up')" @click.stop="stepVolume(1)">+</button>
            </div>
          </div>
        </template>
      </material-popup-btn>
      <material-popup-btn ref="qualityBtnRef">
        <button :class="[$style.textBtn, $style.qualityBtn]" :aria-label="$t('player__quality_label', { quality: qualityLabel })" :title="$t('player__quality_label', { quality: qualityLabel })">
          {{ qualityLabel }}
        </button>
        <template #content>
          <div :class="$style.popupMenu">
            <button
              v-for="opt in qualityOptions" :key="opt.value"
              :class="[$style.menuItem, { [$style.menuItemActive]: appSetting['player.playQuality'] == opt.value }]"
              @click="selectQuality(opt.value)"
            >
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </template>
      </material-popup-btn>
      <common-sound-effect-btn :class="$style.soundEffectBtn" teleport="#root" />
      <button :class="[$style.iconBtn, { [$style.active]: isDesktopLyricOn }]" :aria-label="$t('player__desktop_lyric_on')" :title="isDesktopLyricOn ? $t('player__desktop_lyric_on') : $t('player__desktop_lyric_off')" @click="toggleLyric">
        <svg-icon name="lyrics" />
      </button>
      <material-popup-btn ref="playlistBtnRef" @mouseenter="refreshPlayQueue">
        <button :class="$style.iconBtn" :aria-label="$t('player__play_queue')" :title="$t('player__play_queue')">
          <svg-icon name="list-lines" />
        </button>
        <template #content>
          <div :class="$style.playlistPopup">
            <div :class="$style.playlistPopupHeader">
              <span :class="$style.playlistPopupTitle">播放队列</span>
              <button
                :class="$style.playlistTool" :aria-label="$t('player__clear_play_later')" :title="$t('player__clear_play_later')"
                @click.stop="handleClearQueue"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                  <path d="M6 7h12M10 7V5h4v2M8 7l.8 12h6.4L16 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
            <div :class="$style.playlistPopupMeta">共 {{ playQueue.length }} 首歌曲</div>
            <div v-if="playQueue.length" :class="$style.playlistPopupList">
              <div
                v-for="(item, index) in playQueue"
                :key="`${item.listId}::${item.musicInfo.id}::${index}`"
                :class="[$style.playlistPopupItem, { [$style.playlistPopupItemActive]: isCurrentPlaying(item, index) }]"
                :title="`${item.musicInfo.name} - ${item.musicInfo.singer}`"
                @click="handlePlayFromQueue(item)"
              >
                <span :class="$style.playlistPopupCover">
                  <img v-if="getCoverUrl(item.musicInfo)" :src="getCoverUrl(item.musicInfo)" alt="" loading="lazy">
                  <span v-else :class="$style.playlistPopupCoverEmpty">
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path d="M12 3v10.5a3 3 0 1 1-2-2.8V5.2l7-1.5v8.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                  <span :class="$style.playlistPopupPlay" @click.stop="handlePlayFromQueue(item)">
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.4v13.2l11-6.6z" fill="currentColor" /></svg>
                  </span>
                </span>
                <span :class="$style.playlistPopupInfo">
                  <span :class="$style.playlistPopupName">
                    <span :class="$style.playlistPopupNameText">{{ item.musicInfo.name }}</span>
                    <em v-if="getQualityTag(item.musicInfo)" class="badge" :class="getQualityTag(item.musicInfo).cls">{{ getQualityTag(item.musicInfo).label }}</em>
                  </span>
                  <span :class="$style.playlistPopupSinger" :title="item.musicInfo.singer">{{ item.musicInfo.singer }}</span>
                </span>
                <span :class="$style.playlistPopupActions">
                  <button
                    :class="[$style.playlistAction, { [$style.playlistActionLiked]: isLoved(item.musicInfo) }]"
                    :aria-label="$t('list__collect')" :title="isLoved(item.musicInfo) ? $t('player__love_remove') : $t('player__love_add')"
                    @click.stop="toggleItemLove(item.musicInfo)"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path
                        d="M12 20.5s-7.2-4.4-9.6-9.1A5.4 5.4 0 0 1 12 5.6a5.4 5.4 0 0 1 9.6 5.8c-2.4 4.7-9.6 9.1-9.6 9.1z"
                        :fill="isLoved(item.musicInfo) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button :class="$style.playlistAction" :aria-label="$t('list__add_to')" :title="$t('list__add_to')" @click.stop="handleShowMusicAdd(item.musicInfo)">
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6" />
                      <path d="M12 8.6v6.8M8.6 12h6.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                    </svg>
                  </button>
                  <button :class="$style.playlistAction" :aria-label="$t('player__remove_from_queue')" :title="$t('player__remove_from_queue')" @click.stop="handleRemoveFromQueue(index)">
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path d="M6 12h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  </button>
                </span>
              </div>
            </div>
            <div v-else :class="$style.playlistPopupEmpty">暂无播放歌曲</div>
          </div>
        </template>
      </material-popup-btn>
    </div>
    <!-- full：贴播放栏底部的通栏进度条 -->
    <div v-if="variant === 'full'" :class="$style.progressFull">
      <common-progress-bar
        v-if="!isShowPlayerDetail"
        :class-name="$style.progressBarFull"
        :progress="progress"
        :handle-transition-end="handleTransitionEnd"
        :is-active-transition="isActiveTransition"
        :emit-playback-progress="true"
      />
    </div>
    <common-list-add-modal v-model:show="isShowAddMusicTo" :music-info="addMusicInfo || playMusicInfo.musicInfo" />
  </div>
</template>

<script>
import { computed, ref, watch } from '@common/utils/vueTools'
import { useI18n } from '@renderer/plugins/i18n'
import { useRouter } from '@common/utils/vueRouter'
import { clipboardWriteText } from '@common/utils/electron'
import { appSetting, updateSetting, saveVolumeIsMute } from '@renderer/store/setting'
import {
  isShowPlayerDetail,
  musicInfo,
  isPlay,
  playInfo,
  playMusicInfo,
  tempPlayList,
} from '@renderer/store/player/state'
import {
  togglePlay,
  playNext,
  playPrev,
  playListById,
} from '@renderer/core/player'
import {
  setShowPlayerDetail,
  setMusicInfo,
  setShowPlayComment,
  removeTempPlayList,
  clearTempPlayeList,
} from '@renderer/store/player/action'
import useLovedList from '@renderer/utils/compositions/useLovedList'
import { getCoverUrl } from '@renderer/utils/compositions/useCoverLoader'
import { loveList, allMusicList } from '@renderer/store/list/state'

import { formatMusicName } from '@renderer/utils'
import { LIST_IDS } from '@common/constants'
import usePlayProgress from '@renderer/utils/compositions/usePlayProgress'
import useNextTogglePlay from '@renderer/utils/compositions/useNextTogglePlay'
import useToggleDesktopLyric from '@renderer/utils/compositions/useToggleDesktopLyric'
import { volume, isMute, setMute, setVolume } from '@renderer/store/player/volume'
import { setVolume as setPlayerVolume, setMute as setPlayerMute } from '@renderer/plugins/player'

const PLAY_QUALITY_LIST = ['128k', '320k', 'flac', 'flac24bit']

export default {
  name: 'CorePlayBar',
  props: {
    // 进度条样式（设置项 common.playBarProgressStyle）：
    //   mini   —— 进度条较短，位于播放控制区下方（默认）
    //   middle —— 进度条较宽，占满中间控制区
    //   full   —— 进度条贴播放栏底部通栏，时间合并显示在右侧
    // 三种模式的控件区完全一致，仅进度条的摆放不同
    variant: {
      type: String,
      default: 'mini',
    },
  },
  setup() {
    const t = useI18n()

    const router = useRouter()
    const isLiked = ref(false)
    const isDesktopLyricOn = ref(appSetting['desktopLyric.enable'] || false)
    const moreBtnRef = ref(null)
    const modeBtnRef = ref(null)
    const qualityBtnRef = ref(null)
    const playlistBtnRef = ref(null)
    const isShowAddMusicTo = ref(false)
    const playQueue = ref([])
    // 喜欢状态（按歌名+歌手去重，跨平台同曲不会重复收藏）
    const queueLoved = useLovedList()
    void queueLoved.loadLoved()

    const {
      nowPlayTimeStr,
      maxPlayTimeStr,
      progress,
      isActiveTransition,
      handleTransitionEnd,
    } = usePlayProgress()

    // 喜欢状态：按歌名+歌手判断（跨平台同曲视为已收藏）
    const refreshLiked = () => {
      const info = playMusicInfo.musicInfo
      if (!info) {
        isLiked.value = false
        return
      }
      isLiked.value = queueLoved.isLoved('progress' in info ? info.metadata.musicInfo : info)
    }
    watch(() => playMusicInfo.musicInfo, refreshLiked, { immediate: true })
    watch(() => allMusicList.get(loveList.id)?.length, refreshLiked)
    watch(() => [queueLoved.lovedIds.size, queueLoved.lovedKeys.size], refreshLiked)

    const title = computed(() => {
      return musicInfo.name
        ? formatMusicName(appSetting['download.fileName'], musicInfo.name, musicInfo.singer)
        : ''
    })

    const qualityLabel = computed(() => {
      return t('player__quality_' + appSetting['player.playQuality'])
    })

    const showPlayerDetail = () => {
      if (!musicInfo.id) return
      setShowPlayerDetail(true)
    }
    const handleToMusicLocation = () => {
      // 跳转到当前歌曲所在列表，并定位到该歌曲
      const listId = playMusicInfo.listId
      if (!listId || listId == LIST_IDS.DOWNLOAD || !playMusicInfo.musicInfo) {
        void router.push({ path: '/list' }).catch(() => {})
        return
      }
      if (playInfo.playIndex == -1) {
        void router.push({ path: '/list', query: { id: listId } }).catch(() => {})
        return
      }
      void router.push({
        path: '/list',
        query: { id: listId, scrollIndex: playInfo.playIndex },
      }).catch(() => {})
    }
    const handleCopy = (text) => {
      clipboardWriteText(text)
    }
    const imgError = () => { setMusicInfo({ pic: null }) }

    // ===== 喜欢 / 收藏（按歌名+歌手去重） =====
    const toggleLove = async() => {
      if (!playMusicInfo.musicInfo) return
      const info = 'progress' in playMusicInfo.musicInfo
        ? playMusicInfo.musicInfo.metadata.musicInfo
        : playMusicInfo.musicInfo
      await queueLoved.toggleLove(info)
      refreshLiked()
    }

    // ===== 播放队列（QQ 版式：行内收藏 / 添加 / 移除） =====
    const isLoved = (info) => queueLoved.isLoved(info)
    const toggleItemLove = async(info) => { await queueLoved.toggleLove(info) }
    const addMusicInfo = ref(null)
    const handleShowMusicAdd = (info) => {
      addMusicInfo.value = info
      isShowAddMusicTo.value = true
    }
    const handleClearQueue = () => {
      clearTempPlayeList()
      refreshPlayQueue()
    }

    // ===== 评论 =====
    const showComments = () => {
      if (!musicInfo.id) return
      // 评论面板在 PlayDetail 内，必须先打开详情页，再显示评论
      if (!isShowPlayerDetail.value) setShowPlayerDetail(true)
      setShowPlayComment(true)
    }

    // ===== 更多菜单 =====
    const handleMoreAction = (action) => {
      moreBtnRef.value?.hide()
      if (!musicInfo.id) return
      switch (action) {
        case 'copyName':
          handleCopy(musicInfo.name)
          break
        case 'copyInfo':
          handleCopy(`${musicInfo.name} - ${musicInfo.singer}`)
          break
        case 'goLocation':
          handleToMusicLocation()
          break
        case 'addTo':
          isShowAddMusicTo.value = true
          break
      }
    }

    // ===== 循环 / 随机 / 单曲 =====
    const {
      nextTogglePlayName,
      toggleNextPlayMode,
    } = useNextTogglePlay()
    const playModeIcon = computed(() => {
      switch (appSetting['player.togglePlayMethod']) {
        case 'random': return 'shuffle'
        case 'singleLoop': return 'repeat-once'
        case 'list': return 'list-ordered'
        case 'none': return 'play-circle-outline'
        default: return 'repeat' // listLoop
      }
    })
    const playModeName = nextTogglePlayName

    // ===== 桌面歌词 =====
    const { toggleDesktopLyric } = useToggleDesktopLyric()
    const toggleLyric = () => {
      toggleDesktopLyric()
      isDesktopLyricOn.value = appSetting['desktopLyric.enable']
    }
    watch(() => appSetting['desktopLyric.enable'], (val) => {
      isDesktopLyricOn.value = val
    })

    // ===== 音效（音频可视化开关）=====
    // 改用 <common-sound-effect-btn> 组件，内置按钮 + 弹窗逻辑，
    // 这里不再需要 toggleEffects。

    // ===== 播放队列 / 当前列表 =====
    // 1) 如果当前是"稍后播放"队列，列出 tempPlayList
    // 2) 否则列出当前播放歌曲所在列表的所有歌曲
    const refreshPlayQueue = () => {
      if (playMusicInfo.isTempPlay) {
        playQueue.value = tempPlayList.map(item => ({
          listId: item.listId,
          musicInfo: 'progress' in item.musicInfo ? item.musicInfo.metadata.musicInfo : item.musicInfo,
          isTempPlay: true,
        }))
        return
      }
      const listId = playMusicInfo.listId ?? LIST_IDS.DEFAULT
      const list = allMusicList.get(listId) ?? []
      playQueue.value = list.map(m => ({ listId, musicInfo: m, isTempPlay: false }))
    }
    const isCurrentPlaying = (item, index) => {
      if (playMusicInfo.isTempPlay) {
        return item.listId === playMusicInfo.listId && item.musicInfo.id === playMusicInfo.musicInfo?.id
      }
      return !playMusicInfo.isTempPlay && index === playInfo.playIndex
    }
    const handlePlayFromQueue = (item) => {
      playlistBtnRef.value?.hide()
      if (item.isTempPlay) {
        // 从 tempPlayList 找到 index 然后用 playList 播放
        const idx = tempPlayList.findIndex(t => t.musicInfo.id === item.musicInfo.id && t.listId === item.listId)
        if (idx >= 0) playList(item.listId, idx)
        else playListById(item.listId, item.musicInfo.id)
      } else {
        playListById(item.listId, item.musicInfo.id)
      }
    }
    const handleRemoveFromQueue = (index) => {
      if (!playMusicInfo.isTempPlay) {
        // 来自列表的歌曲不能从队列中移除（保留列表完整性）
        playlistBtnRef.value?.hide()
        return
      }
      removeTempPlayList(index)
      refreshPlayQueue()
    }
    const formatDuration = (interval) => {
      if (!interval || isNaN(Number(interval))) return '--:--'
      const sec = Math.floor(Number(interval) / 1000)
      const m = Math.floor(sec / 60)
      const s = sec % 60
      return `${m}:${s.toString().padStart(2, '0')}`
    }

    // ===== 播放模式（选项式） =====
    // 档位/模式文案走 i18n：语言切换后要跟着变，所以放 computed 而不是模块常量
    const playModeOptions = computed(() => [
      { mode: 'listLoop', label: t('player__play_toggle_mode_list_loop'), icon: 'repeat' },
      { mode: 'random', label: t('player__play_toggle_mode_random'), icon: 'shuffle' },
      { mode: 'list', label: t('player__play_toggle_mode_list'), icon: 'list-ordered' },
      { mode: 'singleLoop', label: t('player__play_toggle_mode_single_loop'), icon: 'repeat-once' },
      { mode: 'none', label: t('player__play_toggle_mode_off'), icon: 'play-circle-outline' },
    ])
    const selectPlayMode = (mode) => {
      modeBtnRef.value?.hide()
      if (appSetting['player.togglePlayMethod'] === mode) return
      toggleNextPlayMode(mode)
    }

    // ===== 音质（选项式） =====
    const qualityOptions = computed(() => PLAY_QUALITY_LIST.map(v => ({ value: v, label: t('player__quality_' + v) })))
    const selectQuality = (value) => {
      qualityBtnRef.value?.hide()
      if (appSetting['player.playQuality'] === value) return
      updateSetting({ 'player.playQuality': value })
    }

    // ===== 音量 / 静音 =====
    const toggleMute = () => {
      saveVolumeIsMute(!isMute.value)
      setMute(!isMute.value)
      setPlayerMute(!isMute.value)
    }
    const volumeIcon = computed(() => {
      if (isMute.value) return 'volume-mute-outline'
      if (volume.value == 0) return 'volume-off-outline'
      if (volume.value < 0.3) return 'volume-low-outline'
      if (volume.value < 0.7) return 'volume-medium-outline'
      return 'volume-high-outline'
    })
    const volumeProgress = computed(() => volume.value)
    const volumePercent = computed(() => Math.round(volume.value * 100))
    const handleUpdateVolume = (val) => {
      setVolume(val)
      setPlayerVolume(val)
    }
    const stepVolume = (direction) => {
      const next = Math.min(1, Math.max(0, Math.round((volume.value + direction * 0.05) * 100) / 100))
      handleUpdateVolume(next)
    }
    const handleVolumeWheel = (event) => {
      handleUpdateVolume(Math.round(volume.value * 100 + (-event.deltaY / 100 * 2)) / 100)
    }

    // 音质角标：_qualitys 可能整体缺失（本地导入歌曲、换源缓存、旧版本歌单的脏数据），
    // 必须走可选链读取；否则模板直接取属性会抛 TypeError，导致播放队列渲染失败。
    const getQualityTag = (musicInfo) => {
      const qualitys = musicInfo?.meta?._qualitys
      if (!qualitys) return null
      if (qualitys.flac24bit) return { label: t('player__quality_master'), cls: 'badge-theme-secondary' }
      if (qualitys.ape || qualitys.flac || qualitys.wav) return { label: 'SQ', cls: 'badge-theme-primary' }
      if (qualitys['320k']) return { label: 'HQ', cls: 'badge-theme-secondary' }
      return null
    }

    return {
      appSetting,
      musicInfo,
      isShowPlayerDetail,
      isPlay,
      playMusicInfo,
      title,
      showPlayerDetail,
      handleToMusicLocation,
      imgError,
      getQualityTag,
      togglePlay,
      playNext,
      playPrev,
      handleCopy,
      toggleLove,
      isLiked,
      showComments,
      moreBtnRef,
      handleMoreAction,
      isShowAddMusicTo,
      addMusicInfo,
      isLoved,
      toggleItemLove,
      handleShowMusicAdd,
      handleClearQueue,
      getCoverUrl,
      modeBtnRef,
      playModeIcon,
      playModeName,
      playModeOptions,
      selectPlayMode,
      qualityBtnRef,
      qualityLabel,
      qualityOptions,
      selectQuality,
      toggleLyric,
      isDesktopLyricOn,
      playlistBtnRef,
      playQueue,
      refreshPlayQueue,
      isCurrentPlaying,
      handlePlayFromQueue,
      handleRemoveFromQueue,
      formatDuration,
      toggleMute,
      volume,
      isMute,
      volumeIcon,
      volumeProgress,
      volumePercent,
      handleUpdateVolume,
      stepVolume,
      handleVolumeWheel,
      nowPlayTimeStr,
      maxPlayTimeStr,
      progress,
      isActiveTransition,
      handleTransitionEnd,
    }
  },
}
</script>


<style lang="less" module>
@import '@renderer/assets/styles/layout.less';
@import '@renderer/assets/styles/home-tokens.less';

.player {
  position: relative;
  height: @height-player;
  box-sizing: border-box;
  display: grid;
  // 新外壳下播放栏与主面板同宽（更窄），这里放宽三档最小宽度，
  // 避免左侧歌曲信息被挤成 0 宽
  grid-template-columns: minmax(250px, 1.15fr) minmax(300px, 1.15fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--qm-sp-7, 16px);
  padding: 0 18px;
  background-color: var(--qm-card);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border-top: 1px solid var(--qm-line-1);
  user-select: none;
  contain: layout style;
  -webkit-app-region: no-drag;
  * { box-sizing: border-box; }
}

// full：进度条贴底通栏，内容略微上移给进度条让位
.fullMode {
  padding-bottom: 4px;
}

/* ========== 左：封面 + 信息 + 快捷 ========== */
.left {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  min-width: 0;
}

.cover {
  width: 50px;
  height: 50px;
  flex: none;
  border-radius: var(--qm-radius-card);
  overflow: hidden;
  background: var(--qm-hover, rgba(0,0,0,0.05));
  cursor: pointer;
  box-shadow:
    0 2px 8px rgba(0,0,0,0.10),
    inset 0 1px 0 rgba(255,255,255,0.06);
  transition: transform @transition-fast, box-shadow @transition-fast;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover {
    transform: translateY(-1px) scale(1.03);
    box-shadow:
      0 6px 16px rgba(0,0,0,0.16),
      inset 0 1px 0 rgba(255,255,255,0.06);
  }
  &:active { transform: translateY(0) scale(0.98); }
  img { width: 100%; height: 100%; object-fit: cover; }
}

.coverEmpty {
  width: 100%;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  :global(.svg-icon) { width: 22px; height: 22px; fill: currentColor; }
}

.info {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column;
  gap: var(--qm-sp-0, 2px);
  line-height: 1.4;
}

.title {
  font-size: var(--qm-fs-sm, 13px);
  color: var(--qm-text-2);
  font-weight: var(--qm-fw-semibold, 600);
  .mixin-ellipsis-1();
}

.artist {
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4, rgba(0,0,0,0.55));
  .mixin-ellipsis-1();
}

.iconBtn {
  width: 30px;
  height: 30px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: var(--qm-radius-sm, 8px);
  color: var(--qm-text-4, rgba(0,0,0,0.55));
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast, transform @transition-fast, box-shadow @transition-fast;
  &:hover {
    background-color: var(--qm-hover, rgba(0,0,0,0.06));
    color: var(--qm-text-2);
  }
  &:active { transform: scale(0.92); }
  :global(.svg-icon) { width: 16px; height: 16px; fill: currentColor; transition: transform @transition-fast; }

  // 已收藏：心形变红（liked 类加在按钮上，颜色由 svg 的 currentColor 继承）
  &.liked { color: var(--color-danger); }
}

.playBtn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  box-shadow:
    0 4px 12px rgba(0,0,0,0.18),
    inset 0 1px 0 rgba(255,255,255,0.20);
  &:hover {
    background: var(--color-primary-dark-100, var(--color-primary));
    color: #fff;
    transform: translateY(-1px) scale(1.04);
    box-shadow:
      0 6px 16px rgba(0,0,0,0.22),
      inset 0 1px 0 rgba(255,255,255,0.20);
  }
  &:active { transform: scale(0.95); }
  :global(.svg-icon) { width: 18px; height: 18px; fill: currentColor; }
}

/* ========== 中：控制 + 进度 ========== */
.center {
  display: flex;
  flex-flow: column;
  align-items: center;
  gap: var(--qm-sp-1, 4px);
  min-width: 0;
}

.controls {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-2, 6px);
}

.progress {
  width: 100%;
  max-width: 560px;
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-4, rgba(0,0,0,0.55));
  font-variant-numeric: tabular-nums;
}

.time { flex: none; min-width: 36px; text-align: center; }

.progressBar {
  flex: auto;
  height: 3px;
  border-radius: var(--qm-radius-chip, 999px);
  background: var(--qm-hover, rgba(0,0,0,0.08));
  cursor: pointer;
  transition: height @transition-fast;
  &:hover { height: 5px; }
}

// middle：进度条占满中间控制区，比 mini 更长
.progressWide {
  max-width: none;
}

// full：时间合并显示在右侧
.timeInline {
  flex: none;
  margin-right: var(--qm-sp-1, 4px);
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-4, rgba(0,0,0,0.55));
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

// full：贴播放栏底部的通栏进度条
.progressFull {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
}

.progressBarFull {
  width: 100%;
  height: 3px;
  background: var(--qm-hover, rgba(0,0,0,0.08));
  cursor: pointer;
  transition: height @transition-fast;
  &:hover { height: 5px; }
}

/* ========== 右：辅助操作 ========== */
.right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--qm-sp-2, 6px);
  min-width: 0;
}

.textBtn {
  height: 28px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid var(--qm-line-2);
  border-radius: var(--qm-radius-chip, 999px);
  color: var(--qm-text-2);
  font-size: var(--qm-fs-2xs, 11px);
  font-weight: var(--qm-fw-semibold, 600);
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast, border-color @transition-fast, transform @transition-fast;
  &:hover { background-color: var(--qm-primary-soft); color: var(--qm-primary); border-color: var(--qm-primary); }
  &:active { transform: scale(0.96); }
}

.qualityBtn {
  letter-spacing: 0.5px;
}

/* ========== 音量面板 ========== */
.volumePanel {
  width: 200px;
  padding: 10px 12px 6px;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-3, 8px);
  font-size: var(--qm-fs-xs, 12px);
}

.volumeInfo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--qm-text-4, rgba(0,0,0,0.55));
}

.muteBtn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  border-radius: var(--qm-radius-xs, 6px);
  color: var(--qm-text-2);
  cursor: pointer;
  &:hover { background-color: var(--qm-hover, rgba(0,0,0,0.06)); }
  :global(.svg-icon) { width: 16px; height: 16px; fill: currentColor; }
}

.volumeText {
  font-variant-numeric: tabular-nums;
  font-size: var(--qm-fs-xs, 12px);
}

.volumeSliderWrap {
  padding: 6px 0;
}

.volumeBar {
  height: 6px;
  border-radius: var(--qm-radius-chip, 999px);
  background: var(--qm-hover, rgba(0,0,0,0.08));
  cursor: pointer;
  transition: height @transition-fast;
  &:hover { height: 8px; }
}

.volumeStep {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qm-sp-2, 6px);
}

.stepBtn {
  flex: 1;
  height: 24px;
  background: transparent;
  border: 1px solid var(--qm-line-2);
  border-radius: var(--qm-radius-xs, 6px);
  font-size: var(--qm-fs-md, 14px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--qm-text-2);
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast, border-color @transition-fast, transform @transition-fast;
  &:hover { background-color: var(--qm-primary-soft); border-color: var(--qm-primary); color: var(--qm-primary); }
  &:active { transform: scale(0.95); }
}

/* ========== 弹出菜单（播放模式 / 音质） ========== */
.popupMenu {
  display: flex;
  flex-flow: column nowrap;
  min-width: 140px;
  padding: 4px 0;
  font-size: var(--qm-fs-xs, 12px);
  // 外层面板（Popup.vue）已经是白卡，这里不要再画一层，否则会出现双重白边
}

.modeBtnWrap {
  display: inline-flex;
  align-items: center;
}

.menuItem {
  display: flex;
  align-items: center;
  gap: var(--qm-sp-3, 8px);
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  padding: 8px 12px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-2);
  cursor: pointer;
  transition: background-color @transition-fast;
  &:hover { background-color: var(--qm-hover, rgba(0,0,0,0.06)); }
  &:active { background-color: var(--qm-hover, rgba(0,0,0,0.08)); }
}

.menuItemActive {
  color: var(--qm-primary);
  font-weight: var(--qm-fw-semibold, 600);
  background-color: var(--qm-primary-soft);
}

.menuIcon {
  width: 14px;
  height: 14px;
  flex: none;
  fill: currentColor;
}

/* ========== 音效按钮（包装 common-sound-effect-btn） ========== */
.soundEffectBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--qm-radius-sm, 8px);
  color: var(--qm-text-4, rgba(0,0,0,0.55));
  cursor: pointer;
  transition: background-color @transition-fast, color @transition-fast, transform @transition-fast;
  &:hover {
    background-color: var(--qm-hover, rgba(0,0,0,0.06));
    color: var(--qm-text-2);
  }
  &:active { transform: scale(0.92); }
  :global(.svg-icon) {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
}

/* ========== 更多菜单 ========== */
.moreMenu {
  display: flex;
  flex-flow: column nowrap;
  min-width: 140px;
  padding: 4px 0;
  font-size: var(--qm-fs-xs, 12px);
}

/* ========== 播放队列弹窗（向上，仿 QQ 音乐） ========== */
.playlistPopup {
  display: flex;
  flex-flow: column nowrap;
  width: 360px;
  max-height: 420px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-2);
}

.playlistPopupHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 4px;
}

.playlistPopupTitle {
  font-size: var(--qm-fs-lg, 15px);
  font-weight: var(--qm-fw-semibold, 600);
  color: var(--qm-text-1);
  letter-spacing: .3px;
}

.playlistTool {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--qm-text-3);
  cursor: pointer;
  transition: color @transition-fast, background-color @transition-fast;

  svg { fill: none; }
  &:hover { color: var(--qm-primary); background-color: var(--qm-primary-soft); }
}

.playlistPopupMeta {
  padding: 0 14px 8px;
  font-size: var(--qm-fs-xs, 12px);
  color: var(--qm-text-4);
}

.playlistPopupList {
  flex: auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 6px 8px;
}

.playlistPopupItem {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-4, 10px);
  height: 54px;
  padding: 0 8px;
  border-radius: var(--qm-radius-sm, 8px);
  cursor: pointer;
  transition: background-color @transition-fast;
  color: var(--qm-text-2);

  &:hover {
    background-color: var(--qm-hover);
    .playlistPopupPlay { opacity: 1; }
    .playlistPopupActions { opacity: 1; }
  }
}

.playlistPopupItemActive {
  background-color: var(--qm-primary-soft);

  .playlistPopupNameText { color: var(--qm-primary); font-weight: var(--qm-fw-semibold, 600); }
}

.playlistPopupCover {
  position: relative;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--qm-radius-xs, 6px);
  overflow: hidden;
  background-color: rgba(0, 0, 0, .05);

  img { display: block; width: 100%; height: 100%; object-fit: cover; }
}

.playlistPopupCoverEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--qm-text-5);
}

.playlistPopupPlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background-color: rgba(0, 0, 0, .42);
  opacity: 0;
  transition: opacity @transition-fast;

  svg { fill: currentColor; }
}

.playlistPopupInfo {
  flex: auto;
  min-width: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: var(--qm-sp-1, 4px);
}

.playlistPopupName {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: var(--qm-fs-sm, 13px);
}

.playlistPopupNameText {
  min-width: 0;
  color: var(--qm-text-1);
  .mixin-ellipsis-1();
}

.playlistPopupSinger {
  font-size: var(--qm-fs-2xs, 11px);
  color: var(--qm-text-4);
  .mixin-ellipsis-1();
}

.playlistPopupActions {
  flex: none;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: var(--qm-sp-0, 2px);
  opacity: 0;
  transition: opacity @transition-fast;
}

.playlistAction {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--qm-text-3);
  cursor: pointer;
  transition: color @transition-fast, background-color @transition-fast;

  svg { fill: currentColor; }
  &:hover { color: var(--qm-primary); background-color: var(--qm-primary-soft); }
}

.playlistActionLiked {
  color: #f0484b;

  &:hover { color: #f0484b; background-color: rgba(240, 72, 75, .1); }
}

.playlistPopupEmpty {
  padding: 40px 12px;
  text-align: center;
  color: var(--qm-text-4, rgba(0,0,0,0.45));
  font-size: var(--qm-fs-xs, 12px);
}
</style>
