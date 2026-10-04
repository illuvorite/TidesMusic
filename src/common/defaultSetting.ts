import path from 'node:path'
import os from 'node:os'

const isMac = process.platform == 'darwin'
const isWin = process.platform == 'win32'

const defaultSetting: LX.AppSetting = {
  version: '2.1.0',

  'common.windowSizeId': 3,
  'common.windowWidth': 0,
  'common.windowHeight': 0,
  'common.fontSize': 16,
  'common.startInFullscreen': false,
  'common.langId': null,
  'common.apiSource': 'temp',
  'common.sourceNameType': 'alias',
  'common.font': '',
  'common.isShowAnimation': true,
  'common.randomAnimate': true,
  'common.isAgreePact': false,
  'common.controlBtnPosition': isMac ? 'left' : 'right',
  'common.playBarProgressStyle': 'mini',
  'common.transparentWindow': !isMac,
  'common.tryAutoUpdate': true,
  'common.showChangeLog': true,

  'player.startupAutoPlay': false,
  'player.togglePlayMethod': 'listLoop',
  'player.playQuality': '128k',
  'player.isShowTaskProgess': true,
  'player.isShowStatusBarLyric': false,
  'player.volume': 1,
  'player.powerSaveBlocker': true,
  'player.isMute': false,
  'player.playbackRate': 1,
  'player.preservesPitch': true,
  'player.isMaxOutputChannelCount': false,
  'player.mediaDeviceId': 'default',
  'player.isMediaDeviceRemovedStopPlay': false,
  'player.isShowLyricTranslation': false,
  'player.isShowLyricRoma': false,
  'player.isSwapLyricTranslationAndRoma': false,
  'player.isS2t': false,
  'player.isPlayLxlrc': !isMac,
  'player.isSavePlayTime': false,
  'player.audioVisualization': false,
  'player.waitPlayEndStop': true,
  'player.waitPlayEndStopTime': '',
  'player.autoSkipOnError': true,
  'player.autoSwitchSource': false,
  'player.isAutoCleanPlayedList': false,
  'player.isSavePlayHistory': true,
  'player.playHistoryMax': 1000,
  // 音效总开关（关闭时整条音效链物理旁路，素音直出；各音效设置保留）
  'player.soundEffect.enable': true,
  'player.soundEffect.convolution.fileName': '',
  'player.soundEffect.convolution.mainGain': 10,
  'player.soundEffect.convolution.sendGain': 0,
  'player.soundEffect.biquadFilter.hz31': 0,
  'player.soundEffect.biquadFilter.hz62': 0,
  'player.soundEffect.biquadFilter.hz125': 0,
  'player.soundEffect.biquadFilter.hz250': 0,
  'player.soundEffect.biquadFilter.hz500': 0,
  'player.soundEffect.biquadFilter.hz1000': 0,
  'player.soundEffect.biquadFilter.hz2000': 0,
  'player.soundEffect.biquadFilter.hz4000': 0,
  'player.soundEffect.biquadFilter.hz8000': 0,
  'player.soundEffect.biquadFilter.hz16000': 0,
  'player.soundEffect.panner.speed': 25,
  'player.soundEffect.pitchShifter.playbackRate': 1,
  // ===== 面板底部的 6 个连续音效参数（每一项都对应真实音频节点）=====
  // 高保真度：highshelf 8kHz，0~100 → 0~+9dB
  'player.soundEffect.hifi': 0,
  // 混响强度：卷积混响湿声，0~100 → wet 0~0.8
  'player.soundEffect.reverb': 0,
  // 环绕强度：3D 环绕旋转半径，0~100 → soundR 0~30（> 0 即启用）
  'player.soundEffect.surroundStrength': 0,
  // 超重低音：lowshelf 200Hz，0~100 → 0~+12dB
  'player.soundEffect.bass': 0,
  // 动态推进：DynamicsCompressor 压缩强度，0~100（0 = 透明旁路）
  'player.soundEffect.dynamic': 0,
  // 声道平衡：-50 全左 ~ 50 全右（0 = 居中）
  'player.soundEffect.balance': 0,
  // 混响模式：off / small / medium / large（运行时生成 IR，与 convolution.fileName 互斥）
  'player.soundEffect.reverbMode': 'off',

  'playDetail.isZoomActiveLrc': false,
  'playDetail.isShowLyricProgressSetting': false,
  'playDetail.style.fontSize': 140,
  'playDetail.style.align': 'center',
  'playDetail.isDelayScroll': true,

  'desktopLyric.enable': false,
  'desktopLyric.isLock': false,
  'desktopLyric.isAlwaysOnTop': false,
  'desktopLyric.isAlwaysOnTopLoop': false,
  'desktopLyric.isShowTaskbar': false,
  'desktopLyric.audioVisualization': false,
  'desktopLyric.fullscreenHide': true,
  'desktopLyric.pauseHide': true,
  'desktopLyric.width': 450,
  'desktopLyric.height': 300,
  'desktopLyric.x': null,
  'desktopLyric.y': null,
  'desktopLyric.isLockScreen': isWin,
  'desktopLyric.isDelayScroll': true,
  'desktopLyric.scrollAlign': 'center',
  'desktopLyric.isHoverHide': false,
  'desktopLyric.direction': 'horizontal',
  'desktopLyric.style.align': 'center',
  'desktopLyric.style.font': '',
  'desktopLyric.style.fontSize': 20,
  'desktopLyric.style.lineGap': 15,
  'desktopLyric.style.lyricUnplayColor': 'rgba(255, 255, 255, 1)',
  'desktopLyric.style.lyricPlayedColor': 'rgba(7, 197, 86, 1)',
  'desktopLyric.style.lyricShadowColor': 'rgba(0, 0, 0, 0.18)',
  // 'desktopLyric.style.fontWeight': false,
  'desktopLyric.style.opacity': 95,
  'desktopLyric.style.ellipsis': false,
  'desktopLyric.style.isZoomActiveLrc': false,
  'desktopLyric.style.isFontWeightFont': true,
  'desktopLyric.style.isFontWeightLine': true,
  'desktopLyric.style.isFontWeightExtended': true,

  'list.isClickPlayList': false,
  'list.isShowSource': true,
  'list.isSaveScrollLocation': true,
  'list.addMusicLocationType': 'top',
  'list.actionButtonsVisible': false,

  'download.enable': false,
  'download.isSavePathGroupByListName': false,
  'download.savePath': path.join(os.homedir(), 'Desktop'),
  'download.fileName': '歌名 - 歌手',
  'download.maxDownloadNum': 3,
  'download.skipExistFile': true,
  'download.isDownloadLrc': false,
  'download.isDownloadLxLrc': true,
  'download.isDownloadTLrc': false,
  'download.isDownloadRLrc': false,
  'download.lrcFormat': 'utf8',
  'download.isEmbedPic': true,
  'download.isEmbedLyric': false,
  'download.isEmbedLyricLx': true,
  'download.isEmbedLyricT': false,
  'download.isEmbedLyricR': false,
  'download.isUseOtherSource': false,

  'search.isShowHotSearch': true,
  'search.isShowHistorySearch': true,
  'search.isFocusSearchBox': false,

  'network.proxy.enable': false,
  'network.proxy.host': '',
  'network.proxy.port': '',

  'tray.enable': false,
  // 'tray.isToTray': false,
  'tray.themeId': 0,

  'sync.mode': 'server',
  'sync.enable': false,
  'sync.server.port': '23332',
  'sync.server.maxSsnapshotNum': 5,
  'sync.client.host': '',

  'openAPI.enable': false,
  'openAPI.port': '23330',
  'openAPI.bindLan': false,

  // 'theme.id': 'blue_plus',
  'theme.id': 'green',
  'theme.lightId': 'green',
  'theme.darkId': 'black',
  'theme.skinOpacity': 82,

  'odc.isAutoClearSearchInput': false,
  'odc.isAutoClearSearchList': false,

  'local.libraryWatch': true,

}


// 使用新年皮肤
if (new Date().getMonth() < 2) {
  defaultSetting['theme.id'] = 'happy_new_year'
  defaultSetting['desktopLyric.style.lyricPlayedColor'] = 'rgba(255, 57, 71, 1)'
}


export default defaultSetting

