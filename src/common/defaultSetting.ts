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
  // 「均衡器」页的自定义曲线（JSON 数组，10 段）。手动拖过滑杆后自动留存，
  // 供宫格里的「自定义」回填 —— 否则切到某个预设后，用户自己调的那条就找不回来了。
  // 存整体快照而不是复用 10 个 hz* 键：那是「当前生效值」，两者语义不同。
  'player.soundEffect.biquadFilter.customEq': '',
  'player.soundEffect.panner.speed': 25,
  'player.soundEffect.panner.enable': false,
  // 环绕强度（0~100 百分比）：满量程 = 旋转半径 3（见 audioEffects.ts 的 ENHANCE_SURROUND_MAX_RADIUS）
  'player.soundEffect.panner.soundR': 15,
  'player.soundEffect.pitchShifter.playbackRate': 1,
  // ===== 「均衡器」页底部 6 条增强滑条（全部 0~100 百分比，声道平衡为 -100~100）=====
  // 量程与「滑条值 → dB / 增益」的换算统一定义在 plugins/player/audioEffects.ts，
  // 这里与面板的 min/max 都从那里取，避免两边各写一套。
  // 超重低音：低频架 90Hz + 并联谐波支路，满量程 +7dB
  'player.soundEffect.enhance.bass': 0,
  // 高保真度：高频架 10kHz，满量程 +7.5dB
  'player.soundEffect.enhance.hifi': 0,
  // 动态推进：满量程 −22dB / 3.5:1 / 补偿 +2.5dB（0 = ratio 1，严格透明）
  'player.soundEffect.enhance.dynamic': 0,
  // 声道平衡：-100 全左 ~ +100 全右（0 = 居中）
  'player.soundEffect.enhance.balance': 0,
  // 混响模式：off / small / medium / large（运行时生成 IR，与 convolution.fileName 互斥）
  'player.soundEffect.reverbMode': 'off',

  // ===== 银河音效 2.0：预设 × 强度 =====
  // 关闭时整条银河链不参与音频路径（完全沿用原有增强链），保证向后兼容
  'player.soundEffect.galaxy.enable': false,
  // 当前 FX 预设 id（对应 galaxy/fxPresets 的 64 个预设；空 = 未选）
  'player.soundEffect.galaxy.fxPresetId': '',
  // EQ 层来源：'' = 用 FX 预设自带曲线 / 'off' = 全平 / 'custom' = 手动十段 / 其它 = EQ 预设 id
  'player.soundEffect.galaxy.eqPresetId': '',
  // 强度 0~100：同一预设 × 不同强度 = 数百种听感，无需存多套参数
  'player.soundEffect.galaxy.intensity': 100,
  // 智能音效：对当前播放素材做一次测量，把修正量作为**叠加层**盖在预设之上。
  // 与预设正交，因此重新检测不会破坏用户选的预设；强度缩放不作用于它。
  'player.soundEffect.galaxy.smart.enable': false,
  // 叠加层本身（JSON 字符串）：{ eq[10], bassGainDb, compressorThresholdDb, stereoWidth, measuredAt, reasons }
  // 存字符串而不是拆成十几个键，是因为它是一次测量的整体快照，拆开会出现「改了一半」的中间态
  'player.soundEffect.galaxy.smart.overlay': '',
  // 音效制作：用户自建通用音效链。优先级高于 FX 预设与增强滑条（见 galaxy/bridge.ts），
  // 因此开启它不会破坏已有的预设选择——关掉就原样回来。
  'player.soundEffect.galaxy.userChain.enable': false,
  // 用户链数据（JSON 字符串）：{ name, items: [{ uid, fxId, params }] }
  // 与 smart.overlay 同理：整体存字符串，避免出现「改了一半」的中间态。
  'player.soundEffect.galaxy.userChain.data': '',

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

