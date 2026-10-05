import type { I18n } from '../../lang/i18n'

declare global {

  declare namespace LX {
    type AddMusicLocationType = 'top' | 'bottom'

    interface AppSetting {
      version: string

      /**
       * 窗口大小id（预设尺寸，未自定义时使用）
       */
      'common.windowSizeId': number

      /**
       * 用户拖拽后的实际窗口宽度
       */
      'common.windowWidth': number

      /**
       * 用户拖拽后的实际窗口高度
       */
      'common.windowHeight': number

      /**
       * 窗口大小id
       */
      'common.fontSize': number

      /**
       * 是否以全屏启动
       */
      'common.startInFullscreen': boolean

      /**
       * 语言id
       */
      'common.langId': I18n['locale'] | null

      /**
       * api id
       */
      'common.apiSource': string

      /**
       * 音源名称类型，原名、别名
       */
      'common.sourceNameType': 'alias' | 'real'

      /**
       * 显示的字体
       */
      'common.font': string

      /**
       * 是否启用动画
       */
      'common.isShowAnimation': boolean

      /**
       * 是否启用随机弹窗动画
       */
      'common.randomAnimate': boolean

      /**
       * 是否同意软件协议
       */
      'common.isAgreePact': boolean

      /**
       * 控制按钮位置，左边、右边
       */
      'common.controlBtnPosition': 'left' | 'right'

      /**
       * 播放栏进度条样式
       */
      'common.playBarProgressStyle': 'mini' | 'full' | 'middle'

      /**
       * 启用透明窗口
       */
      'common.transparentWindow': boolean

      /**
       * 尝试自动更新
       */
      'common.tryAutoUpdate': boolean

      /**
       * 更新版本后是否显示变更日志
       */
      'common.showChangeLog': boolean

      /**
       * 启动时自动播放歌曲
       */
      'player.startupAutoPlay': boolean

      /**
       * 切歌模式
       */
      'player.togglePlayMethod': 'listLoop' | 'random' | 'list' | 'singleLoop' | 'none'

      /**
       * 优先播放的音质
       */
      'player.playQuality': LX.Quality

      /**
       * 是否显示任务栏进度条
       */
      'player.isShowTaskProgess': boolean


      /**
       * 是否将歌词显示在状态栏
       */
      'player.isShowStatusBarLyric': boolean

      /**
       * 音量大小
       */
      'player.volume': number

      /**
       * 播放歌曲时是否阻止电脑休眠
       */
      'player.powerSaveBlocker': boolean

      /**
       * 是否静音
       */
      'player.isMute': boolean

      /**
       * 播放速率
       */
      'player.playbackRate': number

      /**
       * 是否自动调整音频的音高以补偿对播放速率设置所做的更改
       */
      'player.preservesPitch': boolean

      /**
       * 使用设备能处理的最大声道数输出音频
       */
      'player.isMaxOutputChannelCount': boolean

      /**
       * 音频输出设备id
       */
      'player.mediaDeviceId': string

      /**
       * 是否在音频输出设备更改时暂停播放
       */
      'player.isMediaDeviceRemovedStopPlay': boolean

      /**
       * 是否显示歌词翻译
       */
      'player.isShowLyricTranslation': boolean

      /**
       * 是否显示歌词罗马音
       */
      'player.isShowLyricRoma': boolean

      /**
       * 是否调换翻译歌词与罗马音歌词位置
       */
      'player.isSwapLyricTranslationAndRoma': boolean

      /**
       * 是否将歌词从简体转换为繁体
       */
      'player.isS2t': boolean

      /**
       * 是否播放卡拉OK歌词
       */
      'player.isPlayLxlrc': boolean

      /**
       * 启动软件时是否恢复上次播放进度
       */
      'player.isSavePlayTime': boolean

      /**
       * 是否启用音频可视化
       */
      'player.audioVisualization': boolean

      /**
       * 定时暂停播放-是否等待歌曲播放完毕再暂停
       */
      'player.waitPlayEndStop': boolean

      /**
       * 定时暂停播放-倒计时时间
       */
      'player.waitPlayEndStopTime': string

      /**
       * 音效总开关（关闭时整条音效链物理旁路，素音直出）
       */
      'player.soundEffect.enable': boolean

      /**
       * 环境音效文件名
       */
      'player.soundEffect.convolution.fileName': string | null

      /**
       * 环境音效原始输出增益
       */
      'player.soundEffect.convolution.mainGain': number

      /**
       * 环境音效输出增益
       */
      'player.soundEffect.convolution.sendGain': number

      /**
       * 均衡器 31hz 值
       */
      'player.soundEffect.biquadFilter.hz31': number

      /**
       * 均衡器 62hz 值
       */
      'player.soundEffect.biquadFilter.hz62': number

      /**
       * 均衡器 125hz 值
       */
      'player.soundEffect.biquadFilter.hz125': number

      /**
       * 均衡器 250hz 值
       */
      'player.soundEffect.biquadFilter.hz250': number

      /**
       * 均衡器 500hz 值
       */
      'player.soundEffect.biquadFilter.hz500': number

      /**
       * 均衡器 1000hz 值
       */
      'player.soundEffect.biquadFilter.hz1000': number

      /**
       * 均衡器 2000hz 值
       */
      'player.soundEffect.biquadFilter.hz2000': number

      /**
       * 均衡器 4000hz 值
       */
      'player.soundEffect.biquadFilter.hz4000': number

      /**
       * 均衡器 8000hz 值
       */
      'player.soundEffect.biquadFilter.hz8000': number

      /**
       * 均衡器 16000hz 值
       */
      'player.soundEffect.biquadFilter.hz16000': number

      /**
       * 「均衡器」页的**自定义曲线**（JSON 字符串，10 段增益）。
       * 手动拖过任意滑杆后自动保存，点宫格里的「自定义」可回填。
       * 空字符串 = 还没手动调过，此时点「自定义」不做任何修改。
       */
      'player.soundEffect.biquadFilter.customEq': string

      /**
       * 3D立体环绕速度
       */
      'player.soundEffect.panner.speed': number

      /**
       * 3D立体环绕开关（环绕节点按需串入链路，中性时完全旁路）
       */
      'player.soundEffect.panner.enable': boolean

      /**
       * 3D立体环绕半径
       */
      'player.soundEffect.panner.soundR': number

      /**
       * 升降声调
       */
      'player.soundEffect.pitchShifter.playbackRate': number

      // ===== 「均衡器」页底部 6 条增强滑条（按需插入，全中性时完全旁路）=====
      //
      //  量程统一 **0~100（百分比）**，声道平衡为 -100~+100。
      //  所有满量程与「滑条值 → dB / 增益」的换算只定义在
      //  `src/renderer/plugins/player/audioEffects.ts` 一处，UI 的 min/max 也取自那里。
      //
      //  历史坑：这里曾同时存在两套等价设置（enhance.* 与 soundEffect.hifi/bass/...），
      //  文档写 0~100 而实现是 0~50，引擎又是第三套「x dB/点」——
      //  三处互不相同，滑条拉满也听不出应有的效果。重复的那套已删除。

      /**
       * 超重低音（0~100 → 低频架 90Hz 满量程 +7dB，并混入最多 0.4 的谐波）
       * 谐波支路让耳机/小喇叭也能听出下潜，而不是靠把低频抬到轰头。
       */
      'player.soundEffect.enhance.bass': number

      /**
       * 高保真度（0~100 → 高频架 10kHz 满量程 +7.5dB）
       * 取 10kHz 而非 8kHz：避开齿音刺耳区，做「空气感」而不是「更亮更吵」。
       */
      'player.soundEffect.enhance.hifi': number

      /**
       * 动态推进（0~100 → −8~−22dB / 1:1~3.5:1 / 补偿 0~+2.5dB，0 时严格透明）
       */
      'player.soundEffect.enhance.dynamic': number

      /**
       * 声道平衡（-100 全左 ~ +100 全右，0 = 居中）
       */
      'player.soundEffect.enhance.balance': number

      /**
       * 混响模式：off / small / medium / large（运行时生成 IR）
       */
      'player.soundEffect.reverbMode': string

      /**
       * 银河音效 2.0 总开关：关闭时银河链不参与音频路径
       */
      'player.soundEffect.galaxy.enable': boolean

      /**
       * 当前 FX 预设 id（galaxy/fxPresets 的 64 个预设之一；空字符串 = 未选）
       */
      'player.soundEffect.galaxy.fxPresetId': string

      /**
       * EQ 层来源：
       * '' = 使用 FX 预设自带曲线 / 'off' = 全平 / 'custom' = 手动十段 / 其它 = EQ 预设 id
       */
      'player.soundEffect.galaxy.eqPresetId': string

      /**
       * 强度 0~100
       */
      'player.soundEffect.galaxy.intensity': number

      /**
       * 智能音效总开关：开启后把「智能音效」检测出的修正量叠加到当前预设之上。
       * 叠加层与预设正交，且**不受强度缩放影响**（强度缩放的是预设染色，不是修正量）。
       */
      'player.soundEffect.galaxy.smart.enable': boolean

      /**
       * 智能音效的补偿叠加层，JSON 字符串：
       * `{ eq: number[10], bassGainDb, compressorThresholdDb, stereoWidth, measuredAt, reasons }`
       * 空字符串 = 尚无检测结果。解析失败一律退化为「无叠加」，不影响音频链。
       */
      'player.soundEffect.galaxy.smart.overlay': string

      /**
       * 「音效制作」通用音效链总开关。
       * 优先级：用户链 > FX 预设 > 均衡器页 4 条增强滑条 > 中性（见 galaxy/bridge.ts）。
       * 高优先级只**遮蔽**低优先级，不改动对方设置，因此关掉它之后原有的预设选择原样回来。
       */
      'player.soundEffect.galaxy.userChain.enable': boolean

      /**
       * 通用音效链数据，JSON 字符串：`{ name, items: [{ uid, fxId, params }] }`。
       * 由 galaxy/userChain.ts 编译成 GalaxyDSPConfig；解析失败一律退化为「无链」。
       */
      'player.soundEffect.galaxy.userChain.data': string

      /**
       * 是否启用音频加载失败时自动切歌
       */
      'player.autoSkipOnError': boolean

      /**
       * 是否启用音频加载失败时自动切换到其它音源播放
       */
      'player.autoSwitchSource': boolean

      /**
       * 点击相同列表内的歌曲切歌时是否清空已播放列表（随机模式下列表内所有歌曲会重新参与随机）
       */
      'player.isAutoCleanPlayedList': boolean

      /**
       * 播放详情页-是否缩放当前播放的歌词行
       */
      'playDetail.isZoomActiveLrc': boolean

      /**
       * 播放详情页-是否允许通过歌词调整播放进度
       */
      'playDetail.isShowLyricProgressSetting': boolean

      /**
       * 播放详情页-歌词字体大小
       */
      'playDetail.style.fontSize': number

      /**
       * 播放详情页-歌词对齐方式
       */
      'playDetail.style.align': 'center' | 'left' | 'right'

      /**
       * 播放详情页-是否延迟桌面歌词滚动
       */
      'playDetail.isDelayScroll': boolean


      /**
       * 是否启用桌面歌词
       */
      'desktopLyric.enable': boolean

      /**
       * 是否锁定桌面歌词
       */
      'desktopLyric.isLock': boolean

      /**
       * 是在置顶桌面
       */
      'desktopLyric.isAlwaysOnTop': boolean

      /**
       * 是否自动刷新歌词置顶
       */
      'desktopLyric.isAlwaysOnTopLoop': boolean

      /**
       * 是否将歌词进程显示在任务栏
       */
      'desktopLyric.isShowTaskbar': boolean

      /**
       * 是否启用音频可视化
       */
      'desktopLyric.audioVisualization': boolean

      /**
       * 是否在全屏时隐藏歌词
       */
      'desktopLyric.fullscreenHide': boolean

      /**
       * 是否在暂停时隐藏歌词
       */
      'desktopLyric.pauseHide': boolean

      /**
       * 桌面歌词窗口宽度
       */
      'desktopLyric.width': number

      /**
       * 桌面歌词窗口高度
       */
      'desktopLyric.height': number

      /**
       * 桌面歌词窗口x坐标
       */
      'desktopLyric.x': number | null

      /**
       * 桌面歌词窗口y坐标
       */
      'desktopLyric.y': number | null

      /**
       * 是否允许桌面歌词窗口拖出主屏幕之外
       */
      'desktopLyric.isLockScreen': boolean

      /**
       * 是否延迟桌面歌词滚动
       */
      'desktopLyric.isDelayScroll': boolean

      /**
       * 歌词滚动位置
       */
      'desktopLyric.scrollAlign': 'top' | 'center'

      /**
       * 是否在鼠标划过桌面歌词窗口时降低歌词透明度
       */
      'desktopLyric.isHoverHide': boolean

      /**
       * 歌词方向
       */
      'desktopLyric.direction': 'horizontal' | 'vertical'

      /**
       * 歌词对齐方式
       */
      'desktopLyric.style.align': 'center' | 'left' | 'right'

      /**
       * 桌面歌词字体
       */
      'desktopLyric.style.font': string

      /**
       * 桌面歌词字体大小
       */
      'desktopLyric.style.fontSize': number

      /**
       * 歌词间距大小
       */
      'desktopLyric.style.lineGap': number

      /**
       * 桌面歌词未播放字体颜色
       */
      'desktopLyric.style.lyricUnplayColor': string

      /**
       * 桌面歌词已播放字体颜色
       */
      'desktopLyric.style.lyricPlayedColor': string

      /**
       * 桌面歌词字体阴影颜色
       */
      'desktopLyric.style.lyricShadowColor': string

      /**
       * 桌面歌词加粗字体
       */
      // 'desktopLyric.style.fontWeight': boolean

      /**
       * 桌面歌词字体透明度
       */
      'desktopLyric.style.opacity': number

      /**
       * 桌面歌词是否允许换行
       */
      'desktopLyric.style.ellipsis': boolean

      /**
       * 是否缩放当前正在播放的桌面歌词
       */
      'desktopLyric.style.isZoomActiveLrc': boolean

      /**
       * 是否加粗逐字歌词字体
       */
      'desktopLyric.style.isFontWeightFont': boolean

      /**
       * 是否加粗逐行歌词字体
       */
      'desktopLyric.style.isFontWeightLine': boolean

      /**
       * 是否加粗翻译、罗马音字体
       */
      'desktopLyric.style.isFontWeightExtended': boolean

      /**
       * 是否启用双击列表里的歌曲时自动切换到当前列表播放（仅对歌单、排行榜有效）
       */
      'list.isClickPlayList': boolean

      /**
       * 是否显示歌曲来源（仅对我的列表有效）
       */
      'list.isShowSource': boolean

      /**
       * 是否自动恢复列表滚动位置（仅对我的列表有效）
       */
      'list.isSaveScrollLocation': boolean

      /**
       * 添加歌曲到我的列表时的方式
       */
      'list.addMusicLocationType': LX.AddMusicLocationType

      /**
       * 是否显示列表操作按钮列
       */
      'list.actionButtonsVisible': boolean

      /**
       * 是否启用下载功能
       */
      'download.enable': boolean

      /**
       * 按列表名分组保存
       */
      'download.isSavePathGroupByListName': boolean

      /**
       * 下载路径
       */
      'download.savePath': string

      /**
       * 文件命名方式
       */
      'download.fileName': '歌名 - 歌手' | '歌手 - 歌名' | '歌名'

      /**
       * 最大并发下载数
       */
      'download.maxDownloadNum': number

      /**
       * 存在同名文件时跳过下载
       */
      'download.skipExistFile': boolean

      /**
       * 是否下载lrc文件
       */
      'download.isDownloadLrc': boolean

      /**
       * 是否在下载 lx 歌词
       */
      'download.isDownloadLxLrc': boolean

      /**
       * 是否下载翻译歌词文件
       */
      'download.isDownloadTLrc': boolean

      /**
       * 是否下载罗马音歌词文件
       */
      'download.isDownloadRLrc': boolean

      /**
       * 保存lrc时的文本编码格式
       */
      'download.lrcFormat': 'utf8' | 'gbk'

      /**
       * 是否在音频文件中嵌入歌曲封面
       */
      'download.isEmbedPic': boolean

      /**
       * 是否在音频文件中嵌入 lx 歌词
       */
      'download.isEmbedLyricLx': boolean

      /**
       * 是否在音频文件中嵌入歌词
       */
      'download.isEmbedLyric': boolean

      /**
       * 是否在音频文件中嵌入翻译歌词
       */
      'download.isEmbedLyricT': boolean

      /**
       * 是否在音频文件中嵌入罗马音歌词
       */
      'download.isEmbedLyricR': boolean

      /**
       * 歌曲源不可用时，是否启用换源下载
       */
      'download.isUseOtherSource': boolean

      /**
       * 主题id
       */
      'theme.id': string

      /**
       * 亮色主题id
       */
      'theme.lightId': string

      /**
       * 暗色主题id
       */
      'theme.darkId': string

      /**
       * 皮肤透明度（%），用于面板/表面背景的 color-mix
       */
      'theme.skinOpacity': number

      /**
       * 是否显示热门搜索
       */
      'search.isShowHotSearch': boolean

      /**
       * 是否显示搜索历史
       */
      'search.isShowHistorySearch': boolean

      /**
       * 软件启动时是否自动聚焦搜索框
       */
      'search.isFocusSearchBox': boolean

      /**
       * 是否启用代理
       */
      'network.proxy.enable': boolean

      /**
       * 代理服务器地址
       */
      'network.proxy.host': string

      /**
       * 代理服务器端口号
       */
      'network.proxy.port': string

      /**
       * 是否启用托盘
       */
      'tray.enable': boolean

      /**
       * 是否关闭时是否最小化到托盘
       */
      // 'tray.isToTray': boolean

      /**
       * 托盘主题id
       */
      'tray.themeId': number

      /**
       * 同步服务模式
       */
      'sync.mode': 'server' | 'client'

      /**
       * 是否启用同步服务
       */
      'sync.enable': boolean

      /**
       * 同步服务端口号
       */
      'sync.server.port': '23332' | string

      /**
       * 最大备份快照数
       */
      'sync.server.maxSsnapshotNum': number

      /**
       * 同步服务地址
       */
      'sync.client.host': string


      /**
       * 是否启用开放API服务
       */
      'openAPI.enable': boolean

      /**
       * API服务端口号
       */
      'openAPI.port': '23330' | string

      /**
       * 是否绑定到局域网
       */
      'openAPI.bindLan': boolean

      /**
       * 是否在离开搜索界面时自动清空搜索框
       */
      'odc.isAutoClearSearchInput': boolean

      /**
       * 是否在离开搜索界面时自动清空搜索结果列表
       */
      'odc.isAutoClearSearchList': boolean

      /**
       * 是否监听本地曲库目录、在文件变动时提示重新扫描
       */
      'local.libraryWatch': boolean

      /**
       * 是否记录播放历史（关闭后不再写入，「最近播放」与个性化推荐会停止更新）
       */
      'player.isSavePlayHistory': boolean

      /**
       * 播放历史保留条数上限，超出后淘汰最旧的记录
       */
      'player.playHistoryMax': number
    }
  }

}
