# TODO 执行清单（QQ 音乐风格复刻）

> 状态标记：`[ ]` 未开始 / `[~]` 进行中 / `[x]` 已完成
> 每完成一项：编译通过 → 截图验收 → 勾选并把结论写进本文件「验收记录」。

---

## ① 设计底座

- [x] 在 `assets/styles/index.less` 注入 `--qm-*` token（色板 / 字号 / 间距 / 阴影 / 圆角 / 动效）
- [x] 新增 `--qm-*` 别名映射到现有 `--home-*`（外壳、面板），避免两套变量并存
- [x] 通用滚动条样式（4px `#D3D3D3`）抽成全局 `.qm-scroll`
- [x] 通用 mixin：`assets/styles/qq.less`（卡片面/抬升/标签/按钮/占位/骨架）
- [x] 歌曲表 mixin：`assets/styles/qq-list.less`（吸顶表头 / 行 / 序号 / 时长 / 操作 / 歌名标签）
- [x] `SongCard` 歌单卡组件（封面 + 播量角标 + hover 播放钮 + 两行标题）
- [ ] `Chip` 标签、`EmptyState` 空态、`Skeleton` 骨架（按页面需要就地抽）
- [ ] 组件走查页（临时路由）验证全部状态

## ② 首页·推荐

- [x] 顶部页签（推荐 / 歌单广场 / 排行榜 / 我的喜欢 / 下载管理，下划线跟随）
- [x] 焦点推荐卡（模糊封面底 + 132 封面 + 每日推荐标签 + 标题/播放量 + 播放全部/查看歌单）
- [x] 推荐歌单区块（`common-song-card` 网格，1080 下 5 列，播量角标 + hover 播放钮）
- [x] 榜单入口区块（`getBoardsList` 真实数据，6 张榜单卡，点击进 `/leaderboard?source=&boardId=`）
- [x] 首屏骨架屏 + 加载失败重试 + 空态
- [ ] 卡片右键菜单（统一到阶段 ⑧ 的通用菜单）

## ③ 歌单详情

- [x] 头部（封面 137 + 标题 22 粗 + 作者/共 N 首/播放量 + 简介两行截断可展开）
- [x] 操作条（播放全部主按钮 / 收藏歌单描边按钮 / 展开简介 / 返回）
- [x] 歌曲表（全局 `.thead` + `.list-item` 改为 QQ 规范：吸顶 36px 表头、44px 行高、hover 高亮、播放行绿底绿字+左侧绿条）
- [x] 音质标签改 QQ 风格小描边标签（SQ 绿描边 / 高品金描边 / 来源灰描边）
- [x] 双击播放、右键菜单（沿用 `material-online-list` 既有能力，菜单视觉统一留阶段 ⑧）
- [x] 收藏歌单：沿用 `addSongListDetail` 写入本地自建列表（无需新表）
- [ ] 分页器视觉（`material-pagination`）统一到 QQ 风格 —— 挪到阶段 ⑧

## ④ 搜索

- [x] 搜索历史（QQ 标签样式 + 清空按钮，沿用本地存储）
- [x] 热搜榜重做（两列序号榜，前 3 名红色高亮，取当前音源热搜）
- [ ] 联想下拉（键盘 ↑↓ + 回车）
- [x] 结果页：单曲走 QQ 歌曲表（全局样式），歌单结果改为 QQ 网格卡片
- [ ] 结果分栏扩展（歌手 / 专辑）——依赖音源接口，暂缓
- [ ] 人工验证：自动化输入无法触发搜索框回车提交（SendKeys 限制），需人工点搜索框验证
- [ ] 人工验证：`material-popup-btn` 弹层靠 mouseenter 触发，自动化悬停无法唤起（主播放栏音质按钮同样如此），需人工悬停/点击确认
- [ ] 分页与空态

## ⑤ 歌单广场 + 排行榜

- [x] 标签筛选（分类/排序浮层改白卡+阴影，标签改 QQ 药丸）
- [x] 歌单网格（QQ 卡片 5 列）+ 分页器改 QQ 圆形按钮（全局 material-pagination）
- [x] 排行榜左榜单 / 右单曲表布局（左栏列表 + 右侧 QQ 歌曲表，已截图确认）
- [x] 榜单切换（左栏点击切换，激活项绿字）与播放入口（沿用既有双击/菜单）

## ⑤ 备注

- 期间修掉一个自造构建错误：`views/Search/index.vue` 的 `<script>`（非 TS）里写了 `as typeof` → 改用普通写法；同时避开 `promise-function-async` 与 `no-confusing-void-expression` 两条 ESLint 规则。

## ⑥ 播放器全屏页 + 队列 / 音质

- [x] 全屏页整体版式（深色画布 + 大封面 + QQ 黑胶唱片纹路 + 歌词 + 底部控制条，已截图确认）
- [x] 歌词滚动（沿用既有 LyricPlayer：当前行放大、点击跳转、渐变遮罩）
- [x] 控制条（模式 / 上下一首 / 播放 / 进度 / 音量，沿用既有 PlayBar，深色画布下变量自动反色）
- [x] 正在播放队列弹层（新增 `PlayDetail/components/PlayQueue.vue`：右侧深色玻璃抽屉 + 当前行绿字绿底 + 打开自动滚到当前行 + 点击切歌）
- [~] 音质选择 / 音效入口（音质文字按钮已进播放页底部工具行，标签与主播放栏一致，菜单项同源；弹层展开待人工验证）
- [x] `Esc` 退出与动画（Esc 优先关评论面板再退页；进入改 `slideInUp`、退出 `slideOutDown`）

## ⑩ 首页按用户原稿还原（2026-09-16，替代原 ② 方案）

- 结构：Hi Desire 今日为你推荐（大卡跨2列 + 每日30首/刷歌模式/百万收藏小卡）+ 你的私藏歌单（5列 + 会员条）；顶部页签按要求去掉。
- 入口迁移：页签去掉后，`/home/music-hall`（侧栏第二个「发现/乐馆」块）改为直接渲染歌单广场；**排行榜暂时没有界面入口**，需要时再加。

- [x] 我喜欢 / 最近播放 / 试听列表页统一版式（复用全局 QQ 歌曲表，当前播放行绿字绿底；侧栏选中项绿色高亮）
- [x] 自建歌单详情（重命名 / 排序 / 复制 / 导入 / 导出 / 同步 / 删除菜单与拖拽排序均已具备，菜单视觉留阶段 ⑧ 统一）
- [x] 下载管理页（页签：所有任务/正在下载/已暂停/出错/下载完成 + QQ 表头 + 统一空态，已截图确认）
- [ ] 列表计数与侧栏一致（响应式承接层）
- [x] 播放失败自动换源（新增 `core/player/autoSwitchSource.ts`：取不到 URL 时按 name+singer 跨源搜索，命中即写入 `meta.toggleMusicInfo` 后重试，复用 SDK 换源逻辑；成功时状态栏提示「已自动切换到其它音源：<源>」。`core/player/action.ts` 与 `PlaybackController.ts` 两条失败路径都已接入，同一首歌只试一次；新增设置项 `player.autoSwitchSource`（默认关）+ 三语言文案 + 播放设置页开关 + `persistKeys` 持久化）

## ⑧ 设置页 + 通用弹层

- [x] 设置页左侧锚点导航 + 右侧分组表单视觉统一（左导航 16 项 + 激活项绿底绿字；右侧每组白卡承载、标题深色粗体）
- [x] 设置项分组（16 组）：基础 / 播放 / 播放详情 / 桌面歌词 / 搜索 / 列表 / 下载 / 快捷 / 数据同步 / 开放 API / 网络 / 强迫症 / 备份与恢复 / 其他 / 软件更新 / 关于（共 16 组）
- [~] 菜单 / Toast / Modal / 滑块统一到 `--qm-*`（已完成：`base/Menu.vue` 改白卡 `--qm-card` + `--qm-shadow-2` + hover `--qm-hover`（去掉绿色文字）；`material/Modal.vue` 改 12px 圆角 + `--qm-shadow-3` + 白底；`Setting/index.vue` 分组改白卡、标题改深色粗体、左导航激活改 `--qm-primary`。Toast / 滑块沿用既有 token，待人工目测确认）
- [x] 新增设置项：`player.autoSwitchSource`（播放设置页开关，默认关）；默认音源沿用侧栏音源切换菜单

## ⑨ 响应式与回归

- [~] 1000 / 1280 / 1600 三档宽度走查（列数、截断、溢出）——已走查 1114×718 与 1920×1040（应用内最大化）：侧栏固定 214、主面板自适应、设置页白卡与首页网格均无溢出/截断。**注意：不要用 MoveWindow 改这个窗口的尺寸**（会把高度写成 32767 且无法还原，只能重启应用）；小窗档位（920/1020）建议用设置页「窗口尺寸」手动确认
- [ ] 全屏模式走查（需人工按全屏快捷键；自动化无按键通道）
- [ ] 深色主题下外壳保持浅色的兜底确认（需人工切主题）
- [~] 全路径手动回归（首页 → 歌单 → 搜索 → 播放 → 我的 → 设置）——已走查：首页推荐、我的喜欢、自建歌单详情、本地和下载、设置（基本/播放）、播放详情页 + 播放队列抽屉 + 音质按钮；搜索与榜单沿用前序阶段结论
- [x] 清理临时文件与调试代码（源码无 debug 残留；辅助脚本都在 `%TEMP%` 不进仓库；顺手把 dev-server 的 `overlay` 关掉，避免 HMR 瞬时错误盖住界面）

## ⑪ 乐馆 · 歌手页（2026-09-21，按参考图复刻）

- 页签栏对齐参考图 10 项：精选 / 听书 / 排行 / 歌手 / 分类歌单 / 数字专辑 / 音质专区 / 边听边玩 / 视频 / 频道；标题与页签由单行改两行（平台切换移到标题行右侧），页签间距 32px。
- 歌手页三级筛选：地区（全部/内地/港台/欧美/日本/韩国）、性别（全部/男/女/组合）、首字母（全部/A-Z/#，一行铺开）；右上角「全部 ∨」为字母快捷下拉（28 项，选中后按钮显示当前字母，点击页面其它地方收起）。
- 圆形头像网格：150px 圆头像 + 居中歌名，`auto-fill minmax(176px,1fr)` 自适应列数；滚动到底自动加载下一页，加载中显示骨架，到底显示「没有更多了」。
- 点击歌手跳转搜索页（`/search?text=歌手名&source=当前音源`）。
- 数据源（新增）：`tx/singer.js#getSingerList`（`Music.SingerListServer.get_singer_list`，80 条/页、返回 total、area/sex/index 值映射、头像统一升级为 300x300 https）与 `wy/singer.js#getSingerList`（`/api/artist/list`，30 条/页、`more` 判续页）；两源在各自 `index.js` 中导出 `singer`。不支持的音源给出「切换音源」提示，失败给出重试按钮。
- 听书 / 数字专辑 / 音质专区 / 边听边玩 / 视频 / 频道暂未接入：保留页签入口，内容区显示占位 + 「回到精选」。

- [x] 页签栏 10 项 + 两行版式
- [x] 歌手页三级筛选 + 字母下拉 + 点击外部收起
- [x] 头像网格 + 滚动加载 + 点击进搜索
- [x] 验收：内地 → 王靖雯不胖/薛之谦/时代少年团；Z → 周予天/周思涵/Zebra；滚动加载 80 → 160；点击周杰伦 → 搜索页；下拉外部点击关闭（截图 `.codebuddy/mh-singer.png`）

## ⑫ 分类歌单改为内嵌歌单广场 + 侧栏调整（2026-09-21）

- 侧栏删除「已购音乐」入口（`Aside/index.vue` 的 `mainNav`）；歌单广场仍可从乐馆精选页各分区的「更多」进入。
- 乐馆「分类歌单」标签页直接内嵌歌单广场的完整功能（复用 `/songList/list` 同源组件，第二版方案，替换首版的「分类胶囊」实现）：
  - 顶栏：「默认 ∨」标签下拉（`TagList`）+「最热 / 最新」排序（`SortTab`）+「打开歌单」（`OpenListModal`）。
  - 主体：`SongList` 组件（5 列卡片网格 + 分页器），卡片＝封面 + 播放量角标 + 标题两行 + 作者。
  - 该页内部自带滚动（`SongList` 的滚动容器），外层 `.page` 在 square 时改为 `overflow: hidden` + flex 列布局（`.pageFill`），避免双滚动条。
  - `TagList` / `SortTab` 新增 `inline` 模式：不写路由、改为 `emit('change')`，供内嵌复用；歌单广场页行为不变。
- **修复既有 Vue 陷阱**：`TagList#sortId` 与 `BoardList#boardId` 原声明为 `type: [String, undefined]` —— `undefined` 不是构造函数，prop 更新时 `assertType` 抛 `Right-hand side of 'instanceof' is not an object`，打断组件更新并使整棵子树补丁错乱（表现为切 tab 后内容不再更新、浮层打不开）。两处均改为 `type: String, default: undefined`。

- [x] 侧栏删除「已购音乐」
- [x] 分类歌单 = 内嵌歌单广场（标签 / 排序 / 网格 / 分页 / 打开歌单）
- [x] 修复 `type: [String, undefined]` 引发的更新中断
- [x] 验收：标签浮层 89 项；选「古风」列表更新且按钮文字同步；翻到第 2 页；打开歌单弹窗可开；各 tab 来回切换无报错无错乱（截图 `.codebuddy/mh-square3.png`、`.codebuddy/mh-tagpopup.png`）

## ⑬ 搜索框下拉改为「热门搜索 + 搜索历史」两列面板（2026-09-21，按参考图复刻）

- `material/SearchInput.vue` 新增可选两列面板：输入为空且聚焦时展示，左「热门搜索」、右「搜索历史」；输入文字后自动切回原联想列表（面板与列表互斥渲染，避免重叠）。
  - 尺寸对齐参考图：与搜索框左边缘对齐、顶部间隙 4px、宽 520px、左列 296px + 1px 分隔线 + 右列自适应；行高 32px、列表独立滚动（面板最高 420px）。
  - 行内容：热搜＝名称 + 右对齐热度（≥1 万取整「万」）；历史＝名称，列头右侧「清空」。
  - 新增 i18n 键 `search__history_title`（搜索历史）、`search__clear`（清空），三语言齐全。
- `layout/Toolbar/SearchInput.vue`：聚焦为空时提供热搜与历史数据；热搜优先取 SDK 的 `hotSearch.getListWithHot()`（带热度），无此方法的音源回退到 `store/hotSearch.getList()`（纯词条）；「清空」调用 `clearHistoryList()`。
- `musicSdk/tx/hotSearch.js`：抽出 `getRawList()`，新增 `getListWithHot()`（`{name, hot}`，hot 取接口 `score`）与 `filterListWithHot()`；原 `getList()` 行为不变。

- [x] 两列面板（结构/尺寸/对齐对齐参考图）
- [x] 输入→联想、清空→面板、失焦→收起 的状态切换
- [x] QQ 音乐热搜带热度数字（183.6 万 → 184万，与参考图一致）；其它音源仅词条
- [x] 验收：面板左边缘与搜索框同为 x=358、顶部间隙 4px；热搜 10 项 / 历史 8 项；「清空」按钮存在（未点击，避免清掉用户历史）；截图 `.codebuddy/mh-searchpanel.png`

## ⑭ 搜索源切换菜单 + 全源热搜热度 + 联想修复（2026-09-21，按参考图复刻）

- 搜索框左侧新增**搜索源徽标按钮**（点击弹出源菜单，对齐参考图）：菜单项＝圆形色块徽标＋名称，选中项主色高亮；聚合搜索 / 酷我音乐 / 酷狗音乐 / QQ音乐 / 网易音乐 / 咪咕音乐；点击页面其它地方收起。
  - 无各家 logo 资源，用「色块 + 字符」表达：聚(绿) / K(橙,酷我) / K(蓝,酷狗) / Q(蓝,QQ) / W(红,网易) / M(橙红,咪咕)；原放大镜按钮按参考图移除。
  - 切换逻辑：`source`（搜索结果源）与 `temp_source`（联想/热搜源）一起切换；选「聚合搜索」只改搜索源、不动联想源；切换后重新拉取该源热搜。
- **全音源热搜热度**（`getListWithHot()`，面板左侧数字）：
  | 音源 | 字段 | 结果 |
  | --- | --- | --- |
  | QQ音乐 | `vec_hotkey[].score` | 184万 ✓ |
  | 酷我 | `tagvalue[].popularity` | 654万 ✓ |
  | 网易 | `itemList[].score` | 13万 ✓ |
  | 咪咕 | `hotwordList[].note` | 295万 ✓ |
  | 酷狗 | —— | 公开接口无热度字段（hot_tab / hot / msearch 均无），保持不显示数字 |
- **修复联想（实时提示）全链路**：`music[source].tipSearch` 只有 kw 启用，其余音源全部被注释 → 输入即抛 `Cannot read properties of undefined (reading 'search')`。
  - `Toolbar/SearchInput` 增加缺失兜底（无 tipSearch 的音源静默收起列表）；启用 **tx**（smartbox_new 接口实测可用）、**kg**（searchtip.kugou.com）、**wy**（weapi suggest）；mg 接口已失效（返回 HTML）保持不启用。
  - 实测联想：tx 4 条（晴天 - 周杰伦）/ kg 10 条 / wy 4 条（屋顶 - 周杰伦、温岚、吴宗宪）/ mg 0 条静默降级，均无报错。

- [x] 搜索源菜单（徽标 + 菜单 + 选中态 + 外部点击收起）
- [x] 四家音源热搜带热度、酷狗保持纯词条
- [x] 联想接口修复与补齐（tx/kg/wy 启用，mg 静默降级）
- [x] 验收：源菜单 6 项切换正常、徽标同步；面板热度逐源核对；搜索（回车/点热搜/点联想/翻页/换源）全流程正常

## ⑮ 搜索页空态精简（2026-09-21）

- 搜索页无关键词时的空态原来展示「热门搜索」两列序号榜 + 「历史搜索」标签云 —— 这两块与顶部搜索框下拉面板（⑬）完全重复，按用户要求移除。
- `Search/components/BlankView.vue` 重写为只保留居中欢迎提示（搜索图标 + 「搜我所想~~😉」），组件 props 保持 `visible` / `source` 兼容父组件。
- 同步移除设置页「显示热门搜索 / 显示搜索历史」两个开关（`Setting/components/SettingSearch.vue`），该分组只剩「启动时自动聚焦搜索框」。
- `search.isShowHotSearch` / `search.isShowHistorySearch` 字段与默认值保留（避免设置文件迁移与类型连锁改动），现已无渲染方引用。
- 验收：搜索页空态 DOM 仅剩欢迎提示（热搜/历史节点消失）；设置页搜索分组开关数 3 → 1；搜索框下拉的热搜与历史不受影响。

## ⑯ 搜索源徽标改用平台官方图标（2026-09-21）

- 原实现为「品牌色圆底 + 首字母」（聚合=聚 / 酷我=K / 酷狗=K / QQ=Q / 网易=W / 咪咕=M），原因是项目内没有各平台 logo 资源。
- 现改为显示**各平台官方图标**，资源落在 `src/renderer/assets/images/music-source/`：
  - `tx.svg` — QQ 音乐官方矢量图标（`i.y.qq.com/n2/m/` 移动端 logo.svg：黄圆 + 绿音符，与 y.qq.com favicon 一致）
  - `kw.png` / `kg.png` — 从酷我、酷狗官网横版 logo 中裁出的方形图标（各 128×128）
  - `wy.png` — 网易云 apple-touch-icon（64→128）
  - `mg.png` — 咪咕官网 favicon（64→128）
- 实现方式：`material/SearchInput.vue` 的 `SOURCE_BADGE` 增加 `icon` 字段并 import 资源，模板用 `<img>` 铺满圆形徽标（`object-fit: cover`）；**保留色块 + 字符作为回退**，`@error` 时记录到 `brokenIcons` 自动降级，资源缺失也不会出现破图。
- 「聚合搜索」不是具体平台，仍用绿色「聚」色块。
- 图标依赖 webpack 的 `asset` 规则：小于 10KB 内联为 data URL（tx.svg、mg.png 内联），其余输出到 `imgs/`。
- 验收：源菜单 6 项图标全部加载（img 尺寸 58/128），搜索框左侧徽标同步显示当前源图标（截图 `.codebuddy/mh-srcicons.png`）。

> 图标版权归各平台所有，此处仅用于标识搜索时请求的音源服务。

## ⑰ 乐馆页签进路由 + 前进/后退逻辑与图标修复（2026-09-21）

- **问题**：顶部工具栏的「后退」总是回到乐馆「精选」，即使上一页在「歌手」或「分类歌单」。
- **根因**：乐馆页签（精选/听书/排行/歌手/分类歌单/…）只是组件内的 `ref`，切换时**不写进路由** —— 历史栈里始终只有 `/home/music-hall` 一条，返回后组件重新挂载，页签回落到默认的 `featured`。
- **修复**：
  - `views/Home/MusicHall.vue`：页签与路由 query 双向同步 —— 点击页签执行 `router.push({ path: '/home/music-hall', query: { tab } })`，并 `watch(() => route.query.tab)` 反向同步；`resolveTab()` 校验取值（非法值回落 `featured`）。
  - `components/layout/Toolbar/index.vue`：历史栈 `recordRoute` 改为「按钮导航标志位 + 一律追加」策略 —— 后退/前进发起的导航只移动指针，用户主动导航则截断前进记录后追加（栈上限 100）。原实现用 `indexOf` 判断「是否已在栈中」，会把**用户主动切回访问过的页签**误判为回退（前进按钮随即跳到意外位置）。
  - 三个导航按钮图标重画：后退/前进改为 `stroke-width: 2` 的圆头 chevron；刷新改为标准单圈循环箭头（原先是 4 段 path 拼接，缩到 20px 后糊成一团）。
- **验收**：乐馆→歌手→点歌手进搜索→**后退回到 `?tab=singer` 且页签仍是「歌手」**→前进回到搜索；直接改 URL 到 `?tab=video` 页签同步为「视频」；禁用态正确（栈首：后退可用 / 前进禁用）。截图 `.codebuddy/mh-nav2.png`、图标放大图 `.codebuddy/nav-icons-zoom.png`。

## ⑱ 歌手主页（2026-09-22，按参考图复刻）

- **背景**：此前在乐馆「歌手」页点击歌手会跳到搜索页，不符合预期；改为进入歌手主页。
- **新增页面** `views/Singer/Detail/index.vue`（路由 `/singer/detail?id=&name=&img=&source=`），复刻 QQ 音乐歌手页：
  - 头部：圆形头像（140px）+ 歌手名（30px）+ 音源标签/歌曲数/专辑数 + 「播放热门歌曲」「在搜索中查看」
  - 页签：精选 / 歌曲（计数）/ 专辑（计数）/ 详情（绿色下划线，切换重置滚动）
  - 精选 = 最新专辑（2 张横排卡片，含发行日期）+ 热门歌曲（前 10，表格式列表，可「更多」跳歌曲页签）
  - 歌曲 = 完整歌曲列表（50/页，分页）；专辑 = 专辑网格（12/页，含发行日期）；详情 = 歌手信息表
  - 列表复用 `material-online-list`、分页复用 `material-pagination`，与搜索结果/歌单页样式一致
- **数据源**（`utils/musicSdk/tx/singer.js`）：
  - 修掉 `filterSongList` 漏 `return` 的老 bug，并统一用 `toNewMusicInfo` 转成 `MusicInfoOnline`（列表组件与播放器需要 `id` / `meta`）；
  - `getSongList(id, page, limit)` 改为 `begin=(page-1)*limit` 并回传 1-based 页码；`filterAlbumList` 增加 `publishDate`；
  - 歌手基本信息（名字/头像）从路由 query 带入 —— 歌手详情接口（`GetSingerDetail`）匿名调用返回 `104400`，外文名/国籍/职业/粉丝数等字段拿不到，故未展示。
- **踩坑**：
  - 列表必须 `markRaw` 包裹，否则歌曲对象变成响应式代理，播放流程传给 IPC 会抛 "An object could not be cloned"（点播放没反应即此因）；
  - `noItem` 文案有数据时要返回空串，否则 `material-online-list` 会用 `v-show="!noItem"` 藏掉整个列表；
  - 两个页签里的列表要加不同 `:key`，避免 Vue 复用同一实例导致虚拟列表不刷新。
- **验收**：歌手页完整渲染（周杰伦：歌曲 1012 / 专辑 43、最新专辑「太阳之子」「恒星不忘」、热门歌曲 10 行）；页签切换正常（歌曲 50/页、专辑 12 项、详情信息）；点击播放后播放栏显示「晴天 - 周杰伦」；截图 `.codebuddy/mh-singerpage.png`。
- **修正（透明度）**：专辑卡片原先用 `--qm-card`（不透明主色），在自定义皮肤下是一块白底，与「皮肤透明度」设置无关；改为 `--qm-hover`（主色 7% 半透明，hover 用 `--qm-hover-strong`），与乐馆榜单卡片一致。`--qm-card` 只用于弹层（下拉/菜单），不要用在内容卡片上。
- **歌曲页签瀑布滚动（2026-09-22）**：两件事——① 向下滚动时歌手头部与页签整体收起（`max-height: 280px → 0` + `opacity`），列表 347 → 517px 占满可视区，滚回顶部（< 16px）自动展开；② **滚到底自动加载下一页**（距底部 320px 触发），分页控件隐藏，一页 50 条持续追加。
  - 实现：歌曲页签下**页面本身不滚动**（`.pageSongs` = flex column + `overflow: hidden`），滚动交给列表内部的 `VirtualizedList`；通过 `material-online-list` 暴露的 `dom_list_content` 找到 `.scroll` 元素绑定 `scroll`（元素未挂载时最多重试 6 次），切走页签与卸载时解绑。
  - 注意：无限滚动要求列表**不重建**，故列表 `:key` 只绑定歌手（**不要含 `songPage`**，否则每次翻页重建会丢失滚动位置）；精选与歌曲两个列表使用**各自独立的请求序号**，避免并发时互相取消。
  - **列头处理（最终）**：列表自带列头是 `position: sticky; top: 0`，滚动时会盖在歌曲上；即使 `opacity: 0` 也仍占 37px 高度。歌曲页签本身是沉浸式全屏列表、列名意义不大，最终直接 `display: none`（用 `.listWrapFull :global(.thead)` 静态规则，与隐藏分页同一写法，实测生效）。
  - **列表上方空白修正**：用户反馈滚动后列表上方仍留 ~60px 空白。原因是 ①`.tabs` 的 `margin: 24px 0 16px` 在样式表中定义在 `.collapsibleHidden`（同为单类选择器）**之后**，按后者胜的规则把 `margin: 0` 覆盖掉了（`max-height: 0` 生效、外边距却还在）；② 列头占位 37px。前者改用**双类选择器** `.collapsible.collapsibleHidden` 提权修复，后者同上述 `display: none`。修复后面板顶部 118 → 78px（= 工具栏底 59 + 页面 padding 18），列表铺满，与「试听列表」观感一致。

## ⑲ 乐馆精选页内容重复修正（2026-09-22）

- **问题 1：Banner 永远是同一批歌单** —— 原先取 `[...official, ...hot]` 按播放量排序后的 Top5，内容固定不变。改为 `shuffle([...official, ...hot]).slice(0, 5)`，每次进入随机。
- **问题 2：「官方歌单」与「热门歌单」内容完全一样（连顺序都相同）** —— 两个原因叠加：
  - `tx.songList.sortList` 只有「最热(5)」「最新(2)」两项，`officialSortId` 取 `sortList[0]`（= 最热），与 `hotSortId` 撞车；
  - 更隐蔽的是 **`tx.songList.getList` 内部会 `cancelHttp()` 取消上一个未完成的请求**，而原实现用 `Promise.all` **并发**发起 6 个请求 → 只有最后一个（热门）成功，官方歌单失败后回退到 `hotList`，两个区块就成了同一份数据。
  - 修复：①「官方歌单」改用分类中的官方歌单分类 `tagId=3317`（`getTag()` 动态查找，取不到时用已知 id 兜底；接口实测该分类有 949 个歌单）；② `fetchPlaylistPool` 内部分页改为**串行 `for await`**，三个池子之间也改为串行；③ 去掉「取不到就回退 hotList」的 fallback —— 空分区直接不显示，避免再次出现重复内容。
  - 验证：三个区块各 10 条，官方与热门**零重叠**，banner 内容每次不同。

## ⑳ 分类歌单数据陈旧修正（2026-09-22）

- **问题**：用户反馈乐馆「分类歌单」总是同一批歌单（都是 2020–2023 年的）。
- **根因**：默认走 `PlayListPlazaServer` 的「全部」广场接口（`id=10000000`），该接口匿名返回的数据很陈旧 —— 实测 `order=5`（最热）是 2020–2023 年的歌单，`order=2`（最新）反而更旧（2018–2020）。而按分类走 `PlayListCategoryServer`（`get_category_content`）返回的是**按更新时间排序的新数据**，实测有当天（2026-09-22）更新的歌单。
- **修复**：
  - 默认分类由「全部」改为活跃分类「流行」（tx `tagId=3152`）：乐馆内嵌页用 `DEFAULT_SQUARE_TAG` 常量（`MusicHall.vue`），独立分类歌单页在站点无记录时兜底（`songList/List/index.vue`）；换源时同样重置为该源的默认分类。
  - 顺带修三处「请求被互相取消」的问题（tx 的 `getList` / `getTag` 内部会 `cancelHttp()` 掉自己上一个未完成请求，页面内精选/榜单/分类并发时会互 cancel）：
    - `loadSquare` 与 `fetchPlaylistPool` 增加失败重试（抽取 `fetchSquarePage`）；
    - `TagList` 的标签加载增加失败重试 —— 原先首次进入必失败，导致分类下拉为空、触发按钮退化成显示 id（如「3152」）。
- **验收**：默认分类显示「流行」、下拉 8 个标签分组、列表 36 条 / 共 999 张，内容为当天更新的歌单；切换分类/排序/翻页正常。

## ㉑ 分页控件视觉重做（2026-09-22）

- 原样式：所有页码/箭头都是 30px 的**圆形**按钮（`border-radius: 50%`），数字 12px、字重 400、颜色 `--qm-text-2`，箭头用 sprite 里 451 viewBox 的实心箭头（缩到 1em 后发糊），首页/末页跳转按钮与翻页箭头样式完全相同（一排看过去分不清）。
- 现样式（`components/material/Pagination.vue`）：
  - 统一 **32px 圆角方块**（`--qm-radius-card` 10px），间距 4px，数字 13px / 字重 500 / `tabular-nums` 等宽。
  - **当前页**：主题色实心 + 白字 + 同色投影（`color-mix`，不支持时回退灰色阴影）。
  - **数字页**：浅底方块（`--qm-hover`），hover 转浅主题色。
  - **上一页 / 下一页**：浅主题色底 + 主题色图标（主操作）；**禁用态**收回主题色底、降为浅灰并降低不透明度。
  - **首页 / 末页跳转**：弱化为无底纯图标（避免与相邻翻页箭头混淆）。
  - 图标全部换成自绘 24 viewBox、`stroke-width: 2` 的圆头 chevron（单箭头翻页 / 双箭头跳转），不再依赖 sprite。
- 该组件被乐馆分类歌单、歌单详情、搜索（歌曲/歌单）、榜单、歌手详情、评论区分页复用，样式统一生效（已抽查搜索歌单页，颜色与尺寸一致）。
- 验收：乐馆分类歌单页分页（第 1 页）—— 禁用态上一页 / 绿色当前页 / 7 个浅底数字 / 无底跳末页 / 浅绿下一页。截图 `.codebuddy/mh-pagination.png`、放大图 `.codebuddy/pager-zoom.png`。

## ㉒ 播放栏三种进度条样式统一（2026-09-22）

- **问题**：设置里的「播放栏进度条样式」（迷你/中等/全宽）此前由**三个独立组件**实现 —— 「迷你」是新版 QQ 风格播放栏（`MiniWidthProgress.vue`），而「中等」「全宽」还是旧版 LX 布局（封面 | 信息 | 时间 | 控制按钮组 | 播放键，sprite 实心图标），三者的控件组成、图标风格、间距完全不一致。
- **修复**：`MiniWidthProgress.vue` 改造为唯一实现，新增 `variant` prop（`mini` / `middle` / `full`），三种模式共用同一套控件区（封面+信息+喜欢/评论/更多、循环/上一曲/播放/下一曲、音量/音质/音效/桌面歌词/播放队列），仅进度条摆放不同：
  - `mini`：进度条较短（限宽 560px），位于播放控制区下方，时间在两端；
  - `middle`：进度条占满中间控制区（不限宽），时间在两端；
  - `full`：进度条贴播放栏底部通栏（`absolute`，宽 100%），时间合并为 `00:00 / 04:29` 显示在右侧辅助区开头。
- `PlayBar/index.vue` 直接按设置渲染该组件并传 `variant`；删除旧组件 `MiddleWidthProgress.vue`、`FullWidthProgress.vue`、`ControlBtns.vue`、`PlayProgress.vue`（已确认全项目无残留引用）。
- 验收：三种模式逐一实测 —— 控件区完全一致；mini 进度条居中于控制区下方、full 进度条 0→1114px 通栏贴底且右区显示 `00:00 / 04:29`、无残留旧进度条；播放队列/音量/音质等弹窗不受影响。

## ㉓ 未开音效仍有「套了一层音效」感修复（2026-09-22）

- **问题**：用户反馈未开启任何音效，但声音像被处理过（闷、有空间感/染色）；第一轮只做节点级修正后仍能听出。
- **根因**（`plugins/player/index.ts`）：应用启动即建立 WebAudio 链路接管音频输出，干声**永远**流经整条效果链 —— HRTF 环绕 panner（常驻+原点病态位置）、混响总线压限器（-3dB/2:1 持续轻压）、EQ、shelf、makeup gain、限幅器等十余个节点逐个串着，每个都可能引入微小染色，叠加后就是「套了一层音效」。
- **修复（整链旁路）**：新增 `applyRouting()` / `setEffectActive()` ——
  - **未开任何音效**：`analyser → destination` 直连（analyser 仅采样不染色，频谱可视化仍可用），**EQ/低音/高保真/混响/环绕/升降调整段从链路断开，干声零处理**；
  - **开启任一音效**（环绕 / 混响 / 升降调≠1 / EQ 任一频段 / 低音 / 高保真 / 动态 / 声道平衡）：`analyser → 完整效果链 → destination`，实时切换。
  - `useSoundEffect.ts` 用 `hasActiveEffect` computed 汇总全部音效设置驱动路由；pitch worklet 的播放/暂停重连逻辑（`connectNode`）改为走 `applyRouting()`，避免曾挂载过升降调后破坏旁路状态。
  - 保留前两轮修复：panner 动态插拔（效果链内也只在开环绕时经过）、动态推进 0 时压限器恒等直通。
- **验证**：反复开关低音增强 / EQ 频段 / 3D 环绕各两次，路由切换无任何报错、设置复原；编译 `compiled successfully`；排除双 audio 元素叠加（预加载 audio 为 muted 且立即暂停）。

## ㉔ 音频播放内核移植回原版 2.12.2（2026-09-22）

- **背景**：用户多轮反馈未开音效时声音仍像被套了一层音效，节点级修正（panner 插拔、压限器直通、整链旁路）均未彻底解决。按用户要求，把 `D:\code\lx-music-desktop-2.12.2` 的音频播放实现**整体移植**回来，回到经过大量用户验证的原版听感。
- **移植内容**：
  - `plugins/player/index.ts` ← 原版全文。链路回到 `source → analyser → EQ×10 → [(convolverSource & convolver) → compressor] → panner(默认 equalpower) → gain → destination`；删除银河扩展节点（bassShelf / hiFiShelf / stereoBalance / masterLimiter）与效果链旁路逻辑（applyRouting / setEffectActive）。
  - `core/useApp/usePlayer/useSoundEffect.ts` ← 原版全文（EQ 经 `getBiquadFilter` 直接写 gain；保留 IR 加载失败的干声降级保护）。
  - 删除导出：`setBassBoost` / `setHiFiBoost` / `setDynamicBoost` / `setStereoBalance` / `setEffectActive` / `setEqGain` / `setEqBoostDb`。
  - **保留 `playDjEffect`**（DJ 节奏音效：点按才触发的 WebAudio 合成音，串在主输出增益节点上，不改变干声路径）——音效面板「音效制作 → DJ 音效」继续可用。
  - `SoundEffectBtn/index.vue`：`isAnyActive` 与一键关闭逻辑中移除 enhance 相关判断/复位。
  - 设置项 `player.soundEffect.enhance.*` 保留在存储与类型中但已无实现（残留无害）。
- **验证**：dev 重启后 4 个模块全部 `compiled successfully`；播放歌曲、播放栏、音效面板（推荐音效/均衡器/音效制作）全部正常，运行全程零 JS 错误。
- **注意**：音效面板不再有「超重低音/高保真/动态推进/声道平衡」滑条（随内核删除）；若将来需要，必须在原版链路基础上重新设计，避免再次引入常驻染色节点。

## ㉕ 搜索「专辑 / 歌手」结果类型（2026-10-01）

- **背景**：搜索页此前只有「歌曲 / 歌单」两个结果类型，而 QQ 音乐、网易云都有「单曲 / 歌单 / 专辑 / 歌手 / MV / 歌词」多栏。底层虽有 `album.js`（kg/kw/mg），但只支持**按 id 取详情**，不含**按关键词搜索**；且 `album.js` 没有被各源 `index.js` 引用，等于完全没接上界面。
- **接口实测**（先验后写，网易云 `/api/search/get/web` 明文接口）：
  | type | 含义 | 结果 |
  | --- | --- | --- |
  | 1 | 单曲 | 200，出数据 |
  | 10 | 专辑 | 200，出数据 |
  | 100 | 歌手 | 200，出数据（`artistCount` 同步返回） |
- **实现**：
  - 新增 `utils/musicSdk/wy/mediaSearch.js`：`searchAlbum()` / `searchSinger()`，走 `eapiRequest('/api/search/get/web')`，含 3 次失败重试、封面统一升级为 `400y400`、发布时间的秒/毫秒兼容（`< 1e11` 视为秒）。该目录是 `.js`，因此用 JSDoc 而非 TS 语法声明类型。
  - `wy/index.js` 导出 `mediaSearch`。
  - 新增 `store/search/media.ts`：专辑/歌手两份响应式列表状态 + `searchMedia()`，带 `key` 去重、并发丢弃（`info.key != key` 即回退）、结果 `markRaw`（否则播放链路 IPC 会抛 "An object could not be cloned"）。
  - 新增 `views/Search/MediaList/index.vue`：专辑走方形封面网格、歌手走圆形头像网格（复用歌手页观感），复用全局 `material/Pagination` 分页；封面加载失败自动降级为「首字」占位，不出破图。
  - 搜索页页签由 2 个扩为 4 个：`search__type_album` / `search__type_singer`，三语言文案齐全。
- **音源限制的处理**：专辑/歌手搜索目前**只有网易云有可用接口**，其余音源无对应能力。因此在组件内按 `sourceId` 判断，非 `wy` 时显示引导文案 + 「切换到网易云音乐」按钮（`search__media_source_tip`），而不是给一个空列表或报错。
- **顺带修掉**：仓库根目录散落着一个 2.2MB 的 `renderer.js`（webpack 误输出位置，构建产物却未被 `.gitignore` 覆盖）。已删除并补 `/renderer.js` 忽略规则。
- **验证**：`tsc --noEmit` 无 src 侧错误；`eslint` 全绿；`npm run build:renderer` 编译通过（仅既有 `SoundEffectBtn` 的 `v-html` 警告）；三语言 JSON 解析通过。

## ㉖ 任意列表可看单曲评论（2026-10-01）

- **背景**：评论能力其实**早就写好了** —— `comment.js` 五个音源齐备、`MusicComment` 面板有热门/最新双页签 + 分页 + 逐条回复，但它**只挂在播放全屏页**（`layout/PlayDetail`），也就是说只有「正在播放的那首歌」能看评论。QQ 音乐 / 网易云在歌单、搜索结果、排行榜等任意列表里都能对单曲看评论。
- **实现**：
  - 新增 `store/player/commentModal.ts`：全局评论弹层状态 + `showMusicComment()` / `hideMusicComment()`。
  - 新增 `components/common/MusicCommentModal.vue`：复用现成的 `MusicComment` 面板，外面套一层居中弹层（`--qm-*` token、点遮罩/点关闭/点面板内评论区的刷新均已接好），挂在 `App.vue` 顶层（与 `layout-setting` 同级），因此**任何页面**都能唤起。
  - `OnlineList/useMenu.js` 新增「歌曲评论」菜单项，显隐条件 `source != 'local' && !!musicSdk[source]?.comment`（本地歌曲与无 comment 实现的音源自动置灰）；`useMusicActions.js` 新增 `handleShowMusicComment()`。
  - i18n 新增 `list__comment`，三语言齐全。
- **注意**：面板内 `MusicComment` 原先用 `setWidth()` 按 `parentNode.clientWidth * 0.5` 定宽（因为它原本并排在播放页右侧），在弹层里用 `:global(.comment)` 覆写为 `width: 100%`，避免宽度被算成半屏。

## ㉗ 乐馆专题页签接真实数据（2026-10-01）

- **背景**：乐馆 10 个页签里有 6 个是**纯占位**（听书 / 数字专辑 / 音质专区 / 边听边玩 / 视频 / 频道），点进去只有一句「频道暂未接入」和一个「回到精选」按钮。
- **先验后写**：完全按 `tx/leaderboard.js` 里 `regExps` 的真实正则与请求体复现接口，逐个验证哪些榜真能出数据：

  | 榜 | bangid | 结果 |
  | --- | --- | --- |
  | 影视金曲榜 | 29 | code=0，**100 首**（首条「她 - 刘宇宁」） |
  | 综艺新歌榜 | 64 | 可用 |
  | 动漫音乐榜 | 72 | code=0，**100 首**（首条「过海 - 王赫野,黄龄」） |
  | 游戏音乐榜 | 73 | code=0，**110 首** |
  | 热歌榜（对照） | 26 | code=0，300 首（说明复现方式正确） |
  | **有声榜** | **75** | **period 不在榜单页 → 不可用** |

- **关键发现（决定了实现方案）**：`getPeriods()` 从 `c.y.qq.com/node/pc/wk_v15/top.html` 用正则解析 period，而该页**只含 29 个榜，不含有声榜(75)**。于是 `getPeriods(75)` 返回 `undefined`，`getList(75)` 会重试 3 次后 reject。**所以「听书」不能走榜单这条路** —— 这是平台未开放，不是代码问题。
- **实现**：
  - 新增 `views/Home/components/TopicBoards.vue`：通用专题榜组件，加载各 bangid 的榜单并渲染成与「排行」页一致的榜单卡片（封面 + 榜名 + 前 3 首），点击进已有的 `/home/board` 榜单详情页。
  - 逐个 `await` + 各自 `catch`（**不用 `Promise.all`**）：单个榜失败不影响其余榜渲染；全部失败才显示「加载失败 + 重试」。
  - `MusicHall.vue` 新增 `topicBoardsMap`：`video → [影视金曲榜, 综艺新歌榜]`、`game → [动漫音乐榜, 游戏音乐榜]`。
  - 非 tx 音源（`leaderboard.getList` 不可用）→ 提示「该音源暂未提供，请切换到 QQ 音乐」而非空白。
- **无公开内容源的 4 个页签**：不再只写「暂未接入」，改为给出**具体原因 + 替代入口**：
  | 页签 | 原因 | 替代入口 |
  | --- | --- | --- |
  | 听书 | 有声榜未在公开榜单接口开放 | 改看分类歌单 |
  | 数字专辑 | 需购买/授权，无公开内容源 | 改看分类歌单 |
  | 音质专区 | 需会员鉴权后才能拉取 | 改看排行 |
  | 频道 | 运营位聚合，无公开接口 | 回到精选 |
- **踩坑**：新组件一开始用 `<script setup lang="ts">`，构建报 **TS7053** —— `musicSdk` 是按 `LX.OnlineSource` 建的受限索引类型，用 `string` 索引会报错。项目里 `MusicHall.vue` / `BoardDetail.vue` 都用**不带 `lang="ts"`** 的 `<script setup>` 正是为此。改为一致写法后构建通过。**注意 `tsc --noEmit` 查不出 .vue 里的这类错误，只有 webpack 构建才会暴露。**

---

## ㉘ 全面审查后的「止血」修复（2026-10-01）

背景：对全量源码做了一次审查（报告落盘 `docs/project-audit-2026-10-01.html`，UI 层 173 条问题：P0=0 / P1=39 / P2=110 / P3=24）。
经确认**不做**：MV/视频、播客/听书、云盘、数字专辑、社交关系链、一起听（受「无账号 + 无服务端内容源」架构限制）。
本轮只做「用户能直接感知的不完整」与「功能性失效」，全部改动经 `build:renderer` 编译通过（0 error）。

### ① 深色主题白底白字（功能性失效）
- 根因说明：`--qm-card` 实际是 `var(--color-main-background)`，**会跟随主题**（如 `black` 主题为 `rgba(19,19,19,.9)`），
  而 `--qm-text-*` 派生自主题字体色阶 —— 两者本身是配套的。**真正的问题只是少数地方写死了 `#fff`**，
  深色主题下形成「白底 + 浅字」。
- 修复：`base/Menu.vue:96`、`base/Popup.vue:122`、`material/SearchInput.vue:653`（联想下拉）、`layout/Aside/index.vue:1185`（更新面板）四处 `#fff` → `var(--qm-card)`；
  `Aside` 更新面板内的 `rgba(0,0,0,.02/.03/.04/.06)` 硬编码中性色 → `--qm-hover` / `--qm-line-1`。
- `Toolbar/index.vue`：导航按钮 `rgb(110,110,110)` / `rgb(180,180,180)` → `--qm-text-3` / `--qm-text-5`；
  两个绿色入口的 SVG `stroke="#C9C9C9"` → `currentColor`（配 `opacity`），`#fff` → `--qm-text-invert`。

### ② 健壮性：空值保护与裂图兜底
- **音质角标空值保护**（原为 `item.meta._qualitys.flac24bit`，脏数据会整表渲染报错）：
  新增 `getQualityTag()` 帮助函数（走可选链、返回 `{label, cls}` 或 `null`），三处替换：
  `material/OnlineList/index.vue`（两段重复模板）、`views/List/MusicList/index.vue`（两段）、
  `components/layout/PlayBar/MiniWidthProgress.vue`（播放队列）。
- **裂图兜底逻辑写反**：`views/Search/MediaList/index.vue` 原先 `@error` 只把 `<img>` 隐藏，
  而首字占位的渲染条件是 `v-if="item.img"` → 图片存在时占位不渲染，加载失败后封面变空白。
  改为用 `brokenCovers` Set 记录损坏 key，坏图时改走占位分支（`coverInitial()` 对空名字兜底为 `♪`）。
- **专辑封面完全无兜底**：`views/Singer/Detail/index.vue` 精选「最新专辑」与「专辑」页签两处 `<img>` 补 `@error`，
  同样用 `brokenAlbumCovers` Set 控制。
- 顺带修掉该文件 `getAlbumList(..., page === 1 ? ALBUM_LIMIT : ALBUM_LIMIT)` 的三元两侧同值无效代码。

### ③ 半成品入口清理
- **乐馆 4 个无内容源页签整体移除**（听书 / 数字专辑 / 音质专区 / 频道）：页签由 10 项减为 6 项
  （精选 / 排行 / 歌手 / 分类歌单 / 边听边玩 / 视频），**全部有真实内容源**。
  `resolveTab()` 会把旧链接里的这些取值回落到「精选」；同时删除已无引用的
  `UNSUPPORTED_TAB_DESC` / `UNSUPPORTED_TAB_FALLBACK` / `tabLabel` / `activeTabLabel` 与 `.squareTip*` 样式。
- **主题中心「桌面装扮」整段移除**：该分区三个页签（动态桌面 / 歌词气泡 / 歌词特效）**没有任何 `@click`**，
  内容区只有一句「敬请期待」。已删除顶部入口按钮、`<template v-else>` 区块、`section` 状态与
  `.titleSub` / `.desktopEmpty` 样式，页面只剩「主题」一个分区。
- **最近播放占位页删除**：`views/Home/Recent.vue` 整页只有「即将上线」且用旧 token。
  路由 `/home/recent` 改为 `redirect: '/list/recent'`，同一功能不再有两个入口两种实现。

### ④ 死代码清理（均为 git 跟踪文件，可按需 `git checkout` 恢复）
- 删除 `components/layout/HomeSidebar/**`（`index.vue` 526 行 + `useHomeSidebarMenu.ts`）：
  已全局注册但**无任何模板引用**，App.vue 用的是 `layout-aside`，属两套侧栏并存。
- 侧栏「自建歌单 | 收藏歌单」语义矛盾修复：原实现两个标题挂在**同一个合并列表**上。
  新增 `playlistEntries` 计算属性，按 `userLists` 是否带 `source` 真实分组渲染，
  并保留每项在扁平列表中的原始下标（重命名 / 右键菜单仍按扁平下标定位，行为不变）。
  `data-aside-section-header` 只挂在第一组标题上，`＋` 弹层定位逻辑不受影响。

### ⑤ 三态体系与缺失分页
- **新增公共组件 `components/common/EmptyState.vue`**（注册名 `<common-empty-state>`）：
  一个组件承载「加载中 / 空数据 / 失败可重试」三态，内置旋转指示器（尊重 `prefers-reduced-motion`）、
  图标圆底、主文案 + 说明 + 操作按钮、`compact` 紧凑模式。用于取代此前散落的 8 套实现。
- **榜单详情 `views/Home/BoardDetail.vue`**：
  - 补失败态 + 重试（原错误态只有一个「返回乐馆」按钮）；
  - 补**增量渲染**：接口（tx 榜单）一次返回最多 300 首且 `page` 恒为 1，**没有服务端分页**，
    原先 300 行塞进普通 `<ul>` 会明显卡顿。改为滚动到底部再追加 60 首，底部显示「向下滚动加载更多… / 没有更多了」。
- **排行榜左栏 `views/Leaderboard/BoardList/index.vue`**：补三态。
  顺带修掉一个潜在崩溃：`getBoardsList()` 内部 `musicSdk[source]?.leaderboard.getBoards()` 只在
  `musicSdk[source]` 上做了可选链，音源存在但无 `leaderboard` 实现时会直接抛错 —— 统一用 try/catch 兜住。
  该文件同时完成 token 迁移（`--color-primary*` → `--qm-*`）。
- **乐馆精选 / 排行**：原来的「加载中… / 该平台暂时没有取到歌单」纯文字，改为 `common-empty-state`
  并给出「重新获取」按钮（回到与歌手页一致的口径）。

### ⑥ 功能层 bug
- **「最近播放」双击无法播放（P0 级）**：`views/List/Recent.vue` 调用
  `playListById(LIST_IDS.DEFAULT, idx)`，把**下标**传给了签名为 `(listId, id)` 的函数，
  内部 `getList(listId).find(m => m.id == id)` 永远匹配不到 → 返回前就 return，点了没反应。
  改为「把去重后的最近播放列表 `setTempList('recent_play', …)` 设为播放队列，再 `playList(LIST_IDS.TEMP, idx)`」，
  与其它列表页一致。
- **首页「喜欢」重复添加**：`views/Home/CustomList.vue` 原先直接 `addListMusics`，不判断是否已收藏、
  不能取消、连点会重复入库。改用全局共享的 `useLovedList()`（按「歌名 + 歌手」去重，
  与播放栏 / 列表 / 榜单爱心状态实时同步），按钮图标随收藏态变化。
- **首页私藏歌单串行阻塞**：`views/Home/index.vue` 的 `loadPrivateLists()` 由 10 次串行 `await`
  改为 `Promise.all` 并发（歌单之间互不依赖），输出顺序保持与 ids 一致。

### ⑦ 响应式与 token 收敛（本轮范围内）
- 新增 token `--qm-tile-bg` / `--qm-tile-bg-active`（侧栏快捷块填充，由「墨色」透明度派生，深浅主题自适应），
  取代 `--home-tile-bg*`；删除 `index.less` 中该别名的**两处重复定义**（原第 381/382 与 559/560 行）。
- `Toolbar/index.vue` 中 `--home-*` 全部清零；`Aside/index.vue` 中 `--home-*` 由 34 处降为 0。
- `Leaderboard/index.vue` 的 `.lists` 补 `min-width: 168px`：原先 `width: 14.8%` 无下限，
  1000px 窗口下只剩约 148px，榜单名被压成一列。
- `Toolbar/index.vue`：绿色入口文案与跳转目标对齐（原标注「免费音源」实跳歌单广场，现改标「歌单广场」）。

### 待人工验证
- 深色主题（设置 → 主题 → 「黑灯瞎火」）下：右键菜单、联想下拉、侧栏更新面板、播放队列的底/字对比度。
- 「最近播放」双击播放（本次修的是 P0，务必实测一次）与首页「喜欢」的二次点击取消。
- 榜单详情滚动到底部的增量加载；排行榜左栏在不可用音源下的失败态与重试。

---

## ㉙ 设计 token 全量收敛（2026-10-01，第二阶段）

目标：让全项目只剩**一套**设计 token。前提是先解决「同一份样式在深浅两种画布下要表现相反」的结构问题。

### 1. 先打通 PlayDetail 的「两层语义」（关键前置）
- **问题**：项目里并存两套写法 —— 老的 `--color-*` 与新的 `--qm-*`。播放详情页是深色画布，
  它只在根节点**局部覆写**了 `--color-font` / `--color-content-background` / `--color-primary` 等旧变量，
  **没有覆写 `--qm-*`**。
- **后果**：浅色主题（默认）下，深色画布内任何使用 `--qm-text-*` 的组件都会拿到主应用的深色文字
  → 深底配深字不可读。这既是存量 bug，也是收敛迁移的最大地雷。
- **修复**：在 `PlayDetail/index.vue` 的根节点补一段 `--qm-*` 镜像覆写
  （`--qm-text-1..5` / `--qm-card` / `--qm-surface` / `--qm-hover(-strong)` / `--qm-line-1/2` /
  `--qm-tile-bg(-active)` / `--qm-field` / `--qm-primary-soft(-hover)` / `--qm-primary-border` / `--qm-text-active`），
  全部切到白系低透明。**两层一起覆写后，组件无论用新旧哪种写法、渲染在哪一层，表现都一致。**

### 2. 删除 `--home-*` 别名体系
- 迁移最后 11 处使用（`App.vue` ×8、`material/SearchInput.vue` ×2、`Setting/index.vue` ×1）。
- 删除 `index.less` 中该别名的**两处定义块**（原「设计稿固定值」块与「别名指向 --qm-*」块，共 29 行）。
  这是此前「旧写法一直能跑」的根源，删掉后旧写法彻底失效。
- 结果：全项目 `--home-*` **归零**。

### 3. 全局收敛旧语义 token（64 个文件 / 258 处）
按「语义等价」映射批量替换（脚本执行，逐个文件核对）：

| 旧写法 | 新 token |
| --- | --- |
| `--color-font` | `--qm-text-2` |
| `--color-font-label` | `--qm-text-4` |
| `--color-surface-base` | `--qm-surface` |
| `--color-content-background` | `--qm-surface` |
| `--color-main-background` | `--qm-card` |
| `--color-border-subtle` / `--color-divider` | `--qm-line-1` |
| `--color-border` / `--color-border-strong` | `--qm-line-2` |
| `--color-accent` | `--qm-primary` |
| `--color-accent-soft` | `--qm-primary-soft` |
| `--color-button-background(-hover)` | `--qm-hover` |
| `--color-button-background-active` | `--qm-hover-strong` |
| `--color-button-font` | `--qm-text-3` |
| `--color-primary-background(-hover)` | `--qm-hover` |
| `--color-primary-background-active` | `--qm-hover-strong` |
| `--color-primary-font` | `--qm-primary` |
| `--color-primary-font-hover` | `--qm-primary-hover` |
| `--color-primary-font-active` | `--qm-primary-active` |

- **排除项**（必须保留）：`assets/styles/index.less`（token 定义处）、
  `components/layout/PlayDetail/index.vue`（旧变量兼容层）、
  含 `extInfo` 的行（主题自身的变量定义，如 `SettingBasic` / `ThemeSelectorModal` 的主题预览）。
- 顺带清理替换后产生的自引用 fallback `var(--X, var(--X))` 共 13 处。

### 4. 修正「伪装成 token 的硬编码」（36 处）
一批 `var(--qm-xxx, 硬编码)` 引用的**名字并不存在**，因为有 fallback 所以界面看起来正常，
实际等于写死的值、永远不跟随 token 调整。已按真实 token 修正：

| 错误名字 | 使用数 | 修正为 | 真实值 |
| --- | --- | --- | --- |
| `--qm-radius-lg` | 12 | `--qm-radius-panel` | 12px |
| `--qm-radius-md` | 19 | `--qm-radius-card` | 10px |
| `--qm-font-sm` | 3 | `--qm-fs-sm` | 13px |
| `--qm-border` | 1 | `--qm-line-1` | — |
| `--qm-text-3-selected` | 1 | `--qm-text-active` | — |

### 5. 其它
- `index.less` 中 `--color-label` 是**引用但从未定义**的变量（`.tip` 的颜色一直无效），已改为 `--qm-text-4`。
- `SoundEffectBtn/AdvancedDsp.vue`：品牌色 fallback `#07c556`（非本项目品牌绿）→ `--qm-primary`；
  开关的 `color: #fff` → `--qm-text-invert`；`rgba(7,197,86,.35)` → `--qm-primary-border`。
- 新增自检脚本（不进仓库）：扫描全部 `.vue/.less`，比对「使用中的 CSS 变量」与「已定义的变量」，
  当前**未定义引用 = 0**（仅剩运行期由 JS 注入的 `--pcr-color` / `--line-gap` / `--playdetail-lrc-font-size`
  与主题预览用的 `--color-primary-theme*`，属预期）。

### 现状与结论
- `--home-*`：**0 处**（别名体系已删除）。
- 132 个 `.vue` 中 29 个未出现 `--qm-*`，但**其中 13 个是纯布局**（无任何颜色声明），
  14 个是 `Setting/components/*` 的 pug 结构组件（样式全由父级与 `components/base/*` 承担）。
  真正有颜色却未接入的：**0 个**。
- 保留的 `--color-*` 均为**合法用途**：`--color-primary` 品牌色、`--color-*` 色阶
  （`--color-1000` / `--color-450` / `--color-primary-alpha-*`）、`--color-danger` 等语义色、
  以及 `PlayDetail` 的兼容层。
- 编译：`build:renderer` **0 error**，仅剩既有的 `SoundEffectBtn` `v-html` 警告。

### 待人工验证
- 切换到「黑灯瞎火」深色主题，逐个走查：右键菜单 / 联想下拉 / 各弹窗 / 侧栏 / 设置页 / 播放队列。
- 播放详情页（深色画布）在**浅色主题**下：歌词、控制条、队列抽屉、评论面板的文字是否都可读
  （本轮改动直接影响此处，务必实测）。

---

## ㉚ 播放历史持久化（2026-10-01，第三阶段·功能补齐）

### 背景：为什么必须做
「最近播放」此前读的是播放器内存里的 `playedList`，存在两个问题：

1. **只在「随机播放」模式下写入** —— 见 `core/player/action.ts`：
   `if (appSetting['player.togglePlayMethod'] == 'random' && !playMusicInfo.isTempPlay) addPlayedList(...)`。
   也就是说**默认的列表循环模式下，「最近播放」永远是空的**（这是个存量 bug）。
2. **重启即丢**（纯内存 `shallowReactive`），且切换列表时会被 `clearPlayedList()` 清掉。

同时，`personalRecommend.ts` 的「听歌风格」分析与相似歌种子选取也读 `playedList`，
所以推荐长期「吃不饱」—— 历史不持久化会连带拖累每日推荐的质量。

### 实现

**数据层**
- `tables.ts` 新增 `play_history`（`id` / `musicInfo`(JSON) / `playedAt` / `playCount`，主键 `id`）
  与索引 `index_play_history`；`DB_VERSION` 2 → 3；`Tables` 联合类型同步补两个名字。
  - 为什么不拆列存歌名/歌手：`musicInfo` 整体以 JSON 存储，避免元数据结构演进时反复改 schema。
- 新增 `modules/play_history/{statements,dbHelper,index}.ts`：查询（倒序 + 分页）、
  **upsert 写入**、按 id 删除、清空、计数、超限淘汰。
  - 写入用 `INSERT ... ON CONFLICT("id") DO UPDATE`，重复播放时**在原值上累加 `playCount`**；
    不能用 `INSERT OR REPLACE`（先删后插会把 `playCount` 重置为 1，也让索引无谓抖动）。
  - 淘汰用 `LIMIT -1 OFFSET ?` 反选出需要删除的旧记录。
- 在 `modules/index.ts` 与 `dbService/index.ts` 中导出。

**顺带修掉一个迁移隐患**：`migrate.ts` 原来是 `switch (version)`，只处理「当前所处版本」那一段，
并在结尾直接写入 `DB_VERSION`。于是 **v1 用户升级时会直接跳到最新版本号，中间的迁移段被整段跳过**
—— 新增 v2 段后，老用户会缺少要建的表，进而被 `verifyDB` 判为校验失败、触发「数据库表结构校验失败」
弹窗并把库备份走。现改为**依次补跑所有比当前版本新的迁移段**，每个迁移段用 `ensureExists()` 幂等建表。

**IPC 链路**
- `ipcNames.ts` 新增 5 个通道（get / add / remove / clear / count）。
- 主进程处理端**新建** `rendererEvent/playHistory.ts` 并在 `rendererEvent/index.ts` 注册。
  - 没有并入 `music.ts`：该文件带「受保护文件」标记（与 2.12.2 同步），新增功能另开文件避免动它。
- `renderer/utils/ipc.ts` 新增 5 个封装。
- 类型：`LX.DBService.PlayHistoryInfo`（主进程）与 `LX.Music.PlayHistoryInfo`（渲染层，同形）。

**渲染层**
- 新增 `store/playHistory.ts`：`playHistoryList`（最新在前，已去重）+ `loadPlayHistory()`
  （并发调用共用同一次请求）+ `recordPlayHistory()` + 删除 / 清空；上限 `PLAY_HISTORY_MAX = 1000`。
  - `markRaw` 包裹后再放进响应式列表，否则对象被代理化后传给 IPC 会抛
    "An object could not be cloned"（这是本项目踩过的坑）。
  - `musicInfo` 序列化时先 `toRaw`。
- **记录时机**：`core/player/action.ts` 的 `handlePlay()` 中调用 `recordPlayHistory(musicInfo)`。
  选这里是因为它是「开始播放某首歌」的唯一入口（`playList` / `playListById` / `handlePlayNext` 都汇聚到这里），
  且它**在 `restorePlayInfo` 分支处已提前 return**，所以启动时恢复上次播放不会被误记。
- `views/List/Recent.vue`：数据源由 `playedList` 换成 `playHistoryList`；
  补首屏加载态；空态与加载态统一走 `common-empty-state`；清空按钮改调 `clearPlayHistoryAction()`。
- `components/layout/Aside/index.vue`：侧栏「最近播放」计数改用 `playHistoryList.length`（历史本身已去重）。
- `utils/personalRecommend.ts`：风格权重分析与相似歌种子改读持久化历史
  （`playHistoryList` 是「最新在前」，权重与倒序取种的偏移已相应调整）。

### 验证
- 用 Node 内置 `node:sqlite`（SQLite 3.51.2）实测了这批 SQL（临时脚本，已删除）：
  - `play_history` / `index_play_history` 建表语句经 `verifyDB` 的归一化比较后**完全一致**（不会被判校验失败）；
  - upsert 连播三次 `playCount = 3`、`playedAt` 刷新为最新；
  - 淘汰后恰好保留最新 N 条；`LIMIT ? OFFSET ?` 倒序分页正确。
  - **迁移路径 4/4 通过**：老库 v1（缺 dislike_list）→ 3、老库 v2 → 3、已是 v3 不动、v2 且已存在该表（幂等）；
    迁移后的新表可正常写入。
- 编译：`main` 与 `renderer` 均 **0 error**（仅剩既有的 `SoundEffectBtn` `v-html` 警告）。

### 待人工验证
- 默认（列表循环）模式下播几首歌 → 侧栏「最近播放」出现计数 → 重启应用 → 历史仍在（**本轮核心修复点**）。
- 「最近播放」双击播放、右键菜单、清空（两步确认）。
- 若你的库是旧版本，首次启动应无「数据库表结构校验失败」弹窗。

### 未做（后续可补）
- 播放历史**纳入数据同步**（`sync` 模块目前只同步 list 与 dislike）与**备份/恢复**（`allData_v2`）。
- 「历史条数上限 / 是否记录历史」的设置项（当前上限为常量 1000，不提供开关）。

---

## ㉛ 本地曲库扫描（2026-10-01，第三阶段·功能补齐）

### 背景
主流平台的「本地音乐」是「注册目录 → 扫描 → 形成曲库」，本项目此前只有「手动把文件逐个导入某个歌单」。
这是与主流平台差距最大的一块。

### 实现（未动数据库 schema）
存储走主进程已有的通用 JSON data store（`DATA_KEYS.localLibrary`），**不新增表**：
存的是本机绝对路径，属「机器本地」数据，不参与同步，也不需要为它做数据库迁移。

链路：
`worker/main/localLibrary.ts`（递归遍历 + 元数据解析）→ `store/localLibrary.ts`（状态 + 持久化）
→ `views/LocalMusic/index.vue`（歌曲/歌手/专辑/文件夹四视图）→ 路由 `/local` + 侧栏「本地音乐」

### 关键设计点
- **扫描放在渲染进程的 worker 里**（与 `createLocalMusicInfos` 同一个 worker）。
  递归遍历 + 逐文件解析元数据是重活，放主线程会卡界面；worker 有 Node 集成，可直接用 `fs`。
- **遍历的防御性约束**：跳过隐藏项、符号链接（可成环，也会指向别处造成重复）、
  黑名单目录（`node_modules` / `$recycle.bin` / `System Volume Information` 等）、空目录、
  以及无权限目录（`readdir` 抛错即跳过该层，不中断整体）。
  深度上限 `MAX_DEPTH = 12`，避免用户误选整个盘符时把扫描变成「全盘遍历」。
- **解析串行**、不并发：`music-metadata` 读文件是 IO 密集，串行可避免大曲库时文件句柄被瞬间打满。
- **进度节流**：每 20 个文件上报一次（+ 最后一次），避免每个文件都 `postMessage`。
  收集阶段拿不到总数（`total = 0`），此时不显示百分比，避免进度条来回跳。
- **`markRaw` / `toRaw`**：歌曲对象进响应式容器前 `markRaw`，否则回传 IPC 会抛
  "An object could not be cloned"。
- `loadLocalLibrary()` 只读缓存结果，**不在启动时扫描**（文件系统扫描很慢）。

### 顺手修的两个问题
1. **页签角标显示错误的数字**：`groupList` 是按当前 `view` 计算的，而三个角标都渲染
   `groupList.length` → 切到「歌曲」页签时，歌手/专辑/文件夹三个角标显示的是同一个（文件夹的）分组数。
   已改为一次性算好三种分组，各页签取各自的分组数。
2. **5 个「被引用但未定义」的 i18n 键**：`all`（搜索页音源页签，**用户可见**，页面上直接显示字面量 `all`）、
   `play`（`SongCard` 的 aria-label）、`forward` / `refresh`（工具栏）、`music_source`（搜索框音源徽标）。
   i18n 的缺失键回退是「返回键名本身」，所以这类问题构建不报错、只在界面上露出键名。已补齐三语。

### 验证方式
把 `localLibrary.ts` 里的真实常量与 `collectAudioFiles` 用 TypeScript 编译器剥掉类型标注后，
在 plain Node 下跑，并对**真实创建**的目录树做断言（**17/17 通过**）：
扩展名大小写（`.FLAC`）、非音频排除、隐藏目录、黑名单目录、
名字近似的目录（`node_modules2` 不被误杀）、「名字带扩展名的目录」（`dir.wav/`）不被误判为音频、
超过 `MAX_DEPTH` 的文件被丢弃、不存在的目录 / 空目录不抛错、软链接成环不重复且不无限递归。

另写了全项目 i18n 键自检脚本（比对 `$t('key')` 与语言文件后取差集）——建议以后常跑。

### 待人工验证
- 添加一个真实音乐文件夹 → 扫描 → 四个视图（歌曲/歌手/专辑/文件夹）内容正确。
- 扫描中界面不卡（worker 生效）、进度条正常。
- 移除扫描目录时，该目录下的歌曲随之消失。
- 重启后曲库仍在（读缓存，不重新扫描）。

### 未做
- **本地封面**：`createLocalMusicInfo` 返回 `picUrl: ''`，不读取内嵌封面 → 列表显示占位图。
  留到「元数据 / 封面编辑」阶段一起做。
- **目录实时监听**（`fs.watch`）：当前需手动点「重新扫描」。
- 扫描结果未纳入备份 / 恢复（`allData_v2`）。

---

## ㉜ 功能补齐收尾 + i18n 全量收敛（2026-10-01，第三阶段·功能补齐）

一次做完剩余的功能缺口与文案国际化。**crossfade 明确跳过**（音频链曾因染色问题整体回退到 2.12.2，动它需要单独评估）。

### ① 本地音乐：内嵌封面 + 元数据编辑
- **封面懒加载**：本地歌曲没有在线音源，`useCoverLoader` 对它们会直接返回。新增 store 侧的
  封面队列（并发上限 4、去重、失败不重试），复用 worker 已有的 `getMusicFilePic`
  （同名图片优先 → 内嵌封面 → 大图落临时文件/小图转 data URL），结果写进公共封面缓存，
  列表组件的 `getCoverUrl` 便能读到。只给当前视图会渲染的部分排队（上限 300），避免上千首一次性读完。
- **元数据编辑（应用内覆盖）**：右键「编辑歌曲信息」可改歌曲名/歌手/专辑。
  **刻意不写回音频文件标签** —— 那需要为 mp3/flac/m4a/ogg 各引一套写标签依赖。
  存储上把「扫描到的原始元数据」与「用户覆盖」**分开存**，展示列表由两者合成，
  这样重新扫描既能拿到文件的新元数据、又不丢用户改过的字段。被覆盖过的歌曲在行内有标记。

### ② 本地音乐：目录实时监听
worker 侧 `fs.watch`：Windows/macOS 走 `recursive`，Linux（不支持 recursive，会同步抛
`ERR_FEATURE_UNAVAILABLE_ON_PLATFORM`）退化为「遍历子目录逐个监听」（上限 500 个目录）。
只关心音频文件变动；变更合并 3 秒后上报。**检测到变化不自动重扫**（重扫是重活，
且会整批替换正在看的列表），在本地音乐页显示一条「检测到变化 → 重新扫描」的提示条。
设置项 `local.libraryWatch`（设置 → 其他）。

### ③ 播放历史：设置项 + 纳入备份
- `player.isSavePlayHistory`（记录开关）：关闭后不再记录，但**已有记录保留**。
- `player.playHistoryMax`（条数上限）：调小时自动修剪超出的记录。
  `PLAY_HISTORY_MAX` 常量改为 `getPlayHistoryMax()`，所有用到处跟着走。
- 备份（`allData_v2`）带上 `playHistory` 原始行，恢复时**整批替换**（不是合并 —— 恢复的语义是回到备份那一刻）。
  旧备份没有该字段则跳过。新增批量写入 IPC `add_play_history_multiple`（一次事务，避免逐条 IPC）。

### ④ 单曲指定音质
- 存储：按**歌曲 id** 存覆盖表（`DATA_KEYS.musicQualityOverrides`），不写进歌单数据 ——
  同一首歌会出现在多个列表，按 id 存一份全局生效。
- 解析：`OnlineMusicStrategy.getMusicUrl` 的音质优先级改为
  「显式传入 > 单曲指定 > 全局默认」。
- 入口：右键「指定音质」弹层，**只列出这首歌实际提供的档位**（`meta._qualitys`），
  避免选到源不支持的档位导致播放失败；可选「跟随全局设置」取消覆盖。
- 本地歌曲不开放（直接读文件，没有档位概念）。

### ⑤ 歌单回收站
- 删除歌单前先做快照（歌单元信息 + 歌曲列表），存 `DATA_KEYS.listTrash`，上限 20 份。
- 入口在侧栏底部（垃圾桶图标）的弹层：还原 / 彻底删除 / 清空。
- 还原用**全新的歌单 id** 重建（沿用原 id 可能与用户新建的同 id 歌单互相覆盖）。
- 还原逻辑放 UI 层而非 store：还原要调 list 模块，而删除链路也引用本 store，会成环。
- **踩到的坑**：若回收站尚未从磁盘读入就写入快照，内存是空数组，会把已有快照整个覆盖掉。
  已改为写入前强制 `await loadListTrash()`。

### ⑥ 交互补齐
- **Esc 关弹层**：新增统一的弹层栈 `utils/modalStack.ts`，键盘事件从栈顶向下问，谁先接谁处理。
  各弹层（编辑信息/指定音质/回收站）注册自己，避免「漏绑一个就关不掉」。
  没有弹层时行为不变（退出全屏 / 清空输入框）。
- **列表键盘导航**：列表容器 `tabindex=0` 可聚焦，↑↓ 移动光标行（虚拟列表按 `itemHeight`
  换算滚动位置保持可见）、Enter 播放、Home/End 跳首尾、Esc 取消。
  光标行独立于「勾选选中」与「播放中高亮」。
- **歌单卡右键菜单**：歌单广场的卡片此前只有左键进详情，现补右键（打开详情 / 收藏歌单，
  收藏复用详情页的 `addSongListDetail`，含重复确认）。

### ⑦ i18n 硬编码收敛
写了扫描脚本（只看标签属性与字符串字面量，排除注释），找出约 92 处 UI 硬编码中文，全部收敛：
侧栏（导航标签/新建歌单/更新面板/页脚）、工具条（正在播放/歌单广场）、
播放栏（评论/切歌/音量/播放队列/播放模式/音质档位名）、首页与乐馆（板块名/页签/地区/性别/空态描述）、
歌手页页签、更新弹层等。**刻意不翻**：音源的榜单名/歌单名（来自平台的数据，是专有名词）。
先反查语言文件里值相同的既有键（`recent_play`/`default_list`/`source_all`/`player__prev` 等）再新增，
最终新增约 90 个键 × 3 语言。
发现 `BaseStore` 的 `persistKeys` 是**死选项**（声明并解构了但从未使用）——设置实际全靠
`onStateChange → saveSetting` 持久化；按惯例仍把新设置键登记进去。

### 验证
main + renderer 两个构建目标 **0 error**；i18n 键自检通过（剩余 7 条为动态拼接键的已知误报）；
硬编码扫描复扫后 UI 文案清零。

### 待人工验证
- 本地音乐：封面陆续出现、编辑歌曲信息后重扫不丢、目录变化出现提示条。
- 播放历史：关闭开关后不再新增记录；调小上限后旧记录被修剪；导出备份 → 恢复后「最近播放」一致。
- 单曲指定音质：右键指定后播放的是该档位；选「跟随全局」后恢复。
- 回收站：删除歌单 → 回收站出现 → 还原后歌曲完整；彻底删除有二次确认。
- 键盘：列表聚焦后 ↑↓/Enter；Esc 依次关闭弹层。



## 验收记录

| 日期 | 阶段 | 结论 |
| --- | --- | --- |
| 2026-09-15 | 外壳 / 侧栏 / 工具栏 / 首页（前序需求） | 已按参考图复刻并通过像素比对；计数与通栏播放栏已修正 |
| 2026-09-15 | 文档 | 设计规范 / 实施计划 / 本清单 落盘 |
| 2026-09-16 | ⑥ 播放器全屏页 | 黑胶唱片 + 队列抽屉 + Esc/入场动画 + 音质入口完成；修掉「弹层被播放页 z-index 盖住」根因 |
| 2026-09-16 | ⑦ 我的音乐 | 各页版式为 QQ 歌曲表；空态抽成全局 `.qm-empty`；新增「播放失败自动换源」完整实现（含设置项/三语文案/持久化） |
| 2026-09-16 | ⑧ 设置 + 弹层 | 设置页分组白卡化 + 左导航绿色激活；右键菜单 / Modal 统一到 `--qm-*` |
| 2026-09-16 | ⑨ 回归 | 1114×718 与 1920×1040 走查通过；记录「不可用 MoveWindow 改窗口尺寸」的坑；dev overlay 关闭 |
| 2026-09-21 | ⑪ 乐馆·歌手页 | 页签 10 项两行版式 + 三级筛选 + 字母下拉 + 圆形头像网格；筛选/字母/滚动加载/跳搜索/下拉收起全通过；tx（80/页）与 wy（30/页）双源实测出数据 |
| 2026-09-21 | ⑫ 分类歌单 + 侧栏 | 分类歌单内嵌歌单广场（标签下拉 89 项 / 排序 / 5 列网格 / 分页 / 打开歌单）全通过；侧栏「已购音乐」已移除；顺带修掉 `type: [String, undefined]` 导致的更新中断 |
| 2026-09-21 | ⑬ 搜索下拉面板 | 「热门搜索 + 搜索历史」两列面板对齐参考图；输入/清空/失焦状态切换正常；tx 热搜带热度值（184万 等） |
| 2026-09-21 | ⑭ 搜索源菜单 + 热度 + 联想 | 搜索源徽标菜单（6 源切换）通过；tx/kw/wy/mg 热搜热度逐源核对；联想修复后 tx/kg/wy 可用（mg 静默降级）；搜索全流程正常 |
| 2026-09-21 | ⑮ 搜索页空态精简 | 空态只剩欢迎提示（热搜榜/历史云已移除，内容统一在搜索框下拉）；设置页搜索分组开关 3 → 1 |
| 2026-09-21 | ⑯ 搜索源官方图标 | 6 项徽标：各平台官方图标（5 个）+ 聚合色块；图标加载失败自动回退色块字符；搜索框徽标同步 |
| 2026-09-21 | ⑰ 页签进路由 + 前进后退 | 乐馆页签写入 `?tab=`；后退回到歌手/分类歌单而非精选；历史栈误判修复；三按钮图标重画 |
| 2026-09-22 | ⑱ 歌手主页 | 点击歌手进入歌手页（不再跳搜索）；精选/歌曲/专辑/详情四页签；歌曲与专辑接口实测可用；播放链路打通 |
| 2026-09-22 | ⑲ 乐馆精选页内容修正 | 三个分区（推荐/官方歌单/热门歌单）各 10 条且零重叠；banner 随机；分区为空/重复问题修复 |
| 2026-09-22 | ⑳ 分类歌单数据陈旧 | 默认分类改「流行」（广场接口数据停在 2020–2023，分类接口按更新时间返回）；标签与歌单请求取消加重试 |
| 2026-09-22 | ㉑ 分页控件视觉重做 | 32px 圆角方块 + 主题色当前页 + 浅底数字 + 弱化跳转图标；各复用页面统一生效 |
| 2026-10-01 | ㉕ 搜索专辑/歌手 | 新增「专辑 / 歌手」两个结果类型（接口先验后写：wy type=10/100 实测 200 出数据）；方形/圆形双网格 + 分页；非 wy 源给换源引导；三语言文案齐全；构建通过 |
| 2026-10-01 | ㉗ 乐馆专题页签接真实数据 | 「视频」「边听边玩」由占位页改为真实榜单（影视金曲 100 首 / 综艺新歌、动漫 100 首 / 游戏 110 首，均实测 code=0）；新增 `TopicBoards.vue`；其余 4 个无公开源页签改为「说明原因 + 替代入口」 |
| 2026-10-01 | ㉖ 任意列表看评论 | 「歌曲评论」进单曲右键菜单 + 全局评论弹层（复用原 `MusicComment` 面板），播放页之外也能看热门/最新评论；本地与无 comment 音源自动置灰 |
| 2026-10-01 | ㉘ 审查后「止血」修复 | 深色主题硬编码白底 4 处修复；音质角标空值保护 3 文件；裂图兜底反逻辑修复 2 文件；乐馆 4 个无源页签 + 主题中心「桌面装扮」+ 最近播放占位页整体移除；删除未引用的 HomeSidebar（526 行）；侧栏歌单真实分组；新增 `common-empty-state` 三态组件；榜单详情增量渲染 + 重试；排行榜左栏三态；修复「最近播放」双击不播放（P0，下标误当 id 传入 `playListById`）；首页「喜欢」判重与取消；首页私藏歌单改并发。`build:renderer` 0 error 通过 |
| 2026-10-01 | ㉙ 设计 token 全量收敛 | 先给 PlayDetail 补 `--qm-*` 镜像覆写（打通新旧两层语义，修掉「浅色主题下深色画布内组件深底深字」的存量问题）；删除 `--home-*` 别名体系（迁移最后 11 处 + 删除 index.less 两处定义块），全项目 `--home-*` 归零；按语义等价映射全局收敛旧 token 64 文件 / 258 处；清理自引用 fallback 13 处；修正「引用不存在 token 名」36 处（`--qm-radius-lg/md`、`--qm-font-sm` 等，此前靠 fallback 伪装成 token）；修 `--color-label` 未定义引用；`AdvancedDsp` 品牌色修正。自检脚本确认「未定义 CSS 变量引用 = 0」。`build:renderer` 0 error |
| 2026-10-01 | ㉚ 播放历史持久化 | 新增 `play_history` 表（DB_VERSION 2→3）与 upsert/淘汰/清空 SQL、独立 IPC 处理端 `rendererEvent/playHistory.ts`、`store/playHistory.ts`；记录点挂在 `handlePlay()`（覆盖所有播放模式，此前 playedList 只在随机会写入 → 默认模式下「最近播放」恒空）；最近播放页与侧栏计数、个性化推荐输入均切到持久化历史；顺带修复 `migrate.ts` 的 `switch` 会跳过中间迁移段（会把老用户库判为校验失败）的隐患。用 node:sqlite 实测 SQL 与迁移路径 4/4 通过；main + renderer 构建 0 error |
| 2026-10-01 | ㉛ 本地曲库扫描 | 新增「注册目录 → 扫描 → 曲库」完整链路（`worker/main/localLibrary.ts` 递归遍历+元数据解析、`store/localLibrary.ts`、`views/LocalMusic/index.vue` 歌曲/歌手/专辑/文件夹四视图、路由 `/local` + 侧栏入口）；存储走通用 data store（`DATA_KEYS.localLibrary`），不新增表、无迁移风险。遍历内置防成环/黑名单/深度上限/无权限跳过等约束，解析串行+进度节流。顺带修复：页签角标三处显示同一数字；补齐 5 个「被引用但未定义」的 i18n 键（含搜索页音源页签显示字面量 `all` 的可见 bug）。真实目录树算法实测 17/17 通过；main + renderer 构建 0 error |
| 2026-10-01 | ㉜ 功能补齐收尾 + i18n 收敛 | 本地音乐封面懒加载（并发 4 队列，复用 getMusicFilePic）+ 元数据应用内覆盖（重扫不丢）；目录实时监听（Linux 退化逐目录监听，检测到变化仅提示不自动重扫）；播放历史设置项（记录开关/条数上限）并纳入 allData_v2 备份恢复（新增批量写入 IPC）；单曲指定音质（按歌曲 id 存覆盖表，策略层优先级：显式传入 > 单曲 > 全局，弹层只列实际支持的档位）；歌单回收站（删除前快照、上限 20 份、侧栏入口弹层可还原/彻底删除）；交互补齐（统一弹层栈支持 Esc 关最上层、列表键盘 ↑↓/Enter/Home/End 导航、歌单卡右键菜单）；i18n 硬编码收敛约 92 处 UI 文案（先反查既有键再新增约 90 键 × 3 语）。main + renderer 0 error |
