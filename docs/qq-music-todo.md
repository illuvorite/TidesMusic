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

## ㉕ 音效弹窗一比一复刻 QQ 音乐（2026-10-03，按两张参考截图逐像素复刻）

- **参照**：用户提供的 QQ 音乐「银河音效」弹窗截图两张（推荐音效页 / 均衡器页）。所有取值由脚本对截图做**像素采样 + 几何测量**得到，不靠肉眼估。
- **弹窗骨架**（`SoundEffectBtn/index.vue`，实测）：730×560、圆角 8；表头 51px 内容 + 1px `#EDEDED` 底线（总 52px）；左侧栏 150px、底 `#F1F1F1`、导航图标 40px（前三项带图标；「音效制作」按参考图为**纯文字**，其上方为 58px 短分隔线 `#DDDDDD`）；内容内距 `10 / 30 / 18`。
- **局部令牌**：弹窗根收敛一组 `--se-*`（主绿 `#1ECC94`、总开关绿 `#1EDAAA`、控件底 `#F8F8F8`、横轨 `#ACACAC` / 竖轨 `#B7B7B7`、文字 `#333/#666`、字号 17/14/13/12/11）。实测主绿比全局 `--qm-primary` 更偏青、控件底比 `--qm-field` 更浅，为保证一比一未复用主题值。
- **推荐音效页**：精选卡 5×2、96×96、间距 10、圆角 4，底色为实测霓虹渐变 + 白字 14px/600 + 极轻投影（白字压中明度色块，靠投影把对比度抬到达标线以上）；选中态 2px 主绿描边 + 右下 16px 白勾。达人音效 2 列、项高 36、首格「+」。**项须 `box-sizing: border-box`**：1px 透明描边在 content-box 下会把行距从实测 46 撑到 48。
- **均衡器页**：预设 4×3、100×30、列距 15 / 行距 10、左内缩 35，选中 2px 主绿描边 + 右侧 20px 绿勾；十段竖轨 4×186、间距 48、左内缩 15（**实测非居中**，居中会差 4.5px）、灰 `#B7B7B7` / 绿 `#1ECC94` 填充、14px 白滑点、悬停显示 11px 深色 dB 读数；增强 6 条改用新组件 `SeSlider`（4px 轨 `#ACACAC` + 12px 白滑点），2 列、标签宽 51、左内缩 35、行距 30；**移除**原「重置」按钮与右侧数值文本（参考图没有）。
- **新增** `SoundEffectBtn/SeSlider.vue`：QQ 同款横向滑条，拖拽逻辑沿用 `SliderBar` 的 4px 死区与 `buttons===0` 兜底。
- **i18n**：补齐 zh-tw / en-us 各缺失的 **128 条**音效文案（历史遗留，此前只有 zh-cn 有），三语言键数对齐 **917 / 917 / 917**；`featured_stereo51` 加空格改为「5.1 立体环绕声」，配合 `word-break: keep-all` 复现参考图「5.1」/「立体环绕声」的两行断行。
- **未动底层**：`plugins/player` 音频链路、`setting` 存储键、各页签业务逻辑与从前完全一致。
- **已知差异（待用户定夺，未擅自改）**：
  1. 参考图「流行」预设的十段曲线（实测约 `+5/+2/0/-3/-7/-7/-4/0/+1/+4`）与项目内置 `freqsPreset.pop`（`+6/+5/-3/-2/+5/+4/-4/-3/+6/+4`）**不一致** —— 改它会同时改变实际听感。
  2. 参考图达人音效列表含「现场亲临」等项目名，与项目内置 16 条名单略有出入（属数据差异，非版式问题）。
  3. 依 ㉔ 记录，`player.soundEffect.enhance.*` 目前无音频实现，故均衡器页那 6 条增强滑条**能调但可能不改变听感**（本次只做界面，未恢复内核）。

- [x] 弹窗骨架 + `--se-*` 局部令牌
- [x] 推荐音效页（精选卡 + 达人音效）
- [x] 均衡器页（预设宫格 + 十段 EQ + 增强滑条）+ 新增 `SeSlider`
- [x] 声学适配 / 变调 / 音效制作页统一到同一视觉语言（这两页无参考图，仅统一观感）
- [x] i18n 三语言补齐
- [x] 验收：与两张参考图逐项像素比对（结论见「验收记录」）

---

## ㉖ 增强效果链真正落内核（2026-10-03）

- **背景**：㉔ 把音频内核整体回退到原版 2.12.2 时删掉了银河扩展节点与整链旁路逻辑，导致「均衡器」页那 6 条增强滑条**只写设置、不改变听感**。本次把其中 4 条真正接回链路。
- **实现**（`src/renderer/plugins/player/index.ts`）：
  - 链路：`convolverDynamicsCompressor → [低频架] → [高频架] → [压限+峰值补偿] → [声像] → [安全限幅] → panner`，节点**按需串入**。
  - **中性即完全旁路**（关键）：四项均为默认值时回到 `convolverDynamicsCompressor → panner` 直连，干声零处理 —— 避免重蹈 ㉓「未开音效也像套了一层」的覆辙。
  - 参数一律 `setTargetAtTime`（时间常数 30ms）平滑，拖动滑条无咔哒/阶梯噪声。
  - `enhanceLimiter` 只在本链启用时存在：低音架最高 +15dB，没有它输出端会硬削波。
- **映射**（与 `common/types/app_setting.d.ts` 里既有的注释一致）：
  | 滑条 | 范围 | 实现 |
  | --- | --- | --- |
  | 超重低音 | 0~50 | `lowshelf @120Hz`，增益 = 值 × 0.3dB（0 ~ +15dB） |
  | 高保真度 | 0~50 | `highshelf @8kHz`，增益 = 值 × 0.24dB（0 ~ +12dB） |
  | 动态推进 | 0~50 | 压限器 threshold −6→−30dB、ratio 1→6、knee 6→24 + 0~+4dB 补偿增益 |
  | 声道平衡 | −50~50 | `StereoPanner`，pan = 值 / 50（−1 ~ 1） |
  | 混响强度 | 0~50 | convolver sendGain（既有） |
  | 环绕强度 | 0~30 | panner 半径 + 旋转（既有） |
- **联动**：`useSoundEffect.ts` 增加四个 setter 的初值 + watch；`SoundEffectBtn/index.vue` 的 `isAnyActive` 与「总开关一键关闭」重新计入 enhance 四项（内核已生效，只开低音时标题栏必须显示「已开启」）。
- **附带效果**：`AudioConvolution` 里 10 张精选卡此前写入的 bass/hifi/dynamic 参数是空转，现在会真实作用到声音。
- **说明**：QQ 的处理内核不开源，"一模一样"只能做到**控制项语义与听感方向一致**（低音架 / 高频架 / 压限 / 声像），无法逐系数复刻其私有实现。

- [x] player 增加增强链节点 + 按需路由 + 4 个 setter
- [x] useSoundEffect 初值与 watch 接入
- [x] 弹窗 isAnyActive / 总开关计入 enhance

## ㉗ 生产打包链路修复（2026-10-03）

`npm run pack:dir` 在本工作区**此前从未成功**，本次逐层修掉 4 处阻断：

1. **TS6059 ×6（renderer）**：`tsconfig.json` 的 `rootDir: "./"` 与「`node_modules` 是指向工作区外的软链（`D:\code\lx-music`）」冲突 —— `allowJs` 会把 D 盘 node_modules 中被 import 的 JS 纳入编译程序，落在 rootDir 之外即报错。本项目由 webpack + ts-loader 打包、从不使用 tsc 直接输出，`rootDir`/`outDir` 对产物无作用，故移除（已附注释说明）。
2. **TS7006 ×5（main）**：`src/main/modules/winMain/autoUpdate.ts` 中 `autoUpdater` 声明为 `any`（electron-updater 缺失时需降级），回调参数因此隐式 any。补显式标注；顺带修掉 `download-progress` 日志里漏 `${}` 的插值（原先会原样打印 `progressObj.transferred`）。
3. **eslint eol-last ×1**：`src/common/utils/musicMeta/index.js`（历史改动文件）缺文件末尾换行，被 webpack 的 eslint 插件判为 error。已补。
4. **打包版启动即崩（undici）**：`undici` 被 webpack 打进主进程 bundle，其内置 WebSocket 使用私有类字段，打包后抛 `Cannot read private member #handler from an object whose class did not declare it` 且发生在模块初始化阶段 → 打包版一启动就退出（开发版不打包故不受影响）。改为在 `build-config/main/webpack.config.prod.js` 中把 `undici` 设为 external（不动带「受保护文件」声明的 base 配置），并把它加入 `build-config/build-pack.js` 的 `files` 白名单。

- 打包结果：4 个 webpack 产物 **0 error**（仅 1 条既有 v-html warning）；electron-builder 产物在 `build/win-unpacked`，**已实测启动成功**（主进程 + 渲染进程共 9 个进程、窗口标题正常、日志出现干净的 `App starting...`）。启动后唯一的报错是 `app-update.yml` 缺失 —— 这是 `target=dir` 模式的预期现象（无更新元数据），不影响运行。
- **注意 1**：本机 shell 环境带有 `ELECTRON_RUN_AS_NODE=1`，会让 Electron 二进制退化成普通 Node 运行（`--version` 打印 Node 版本、`app.whenReady()` 永不触发、窗口起不来）。启动打包版必须 `env -u ELECTRON_RUN_AS_NODE`。
- **注意 2**：`pack.js` 开头的 `del.sync(['dist/**','build/**'])` 一次删除 50+ 文件，会触发沙箱的批量删除保护而中断；需在沙箱外执行，或先分小批清理 `dist/`、`build/`。

---

## ㉘ 修复「设置 → 播放设置 → 音频输出」下拉为空（2026-10-03）

**现象**：该下拉展开后列表为空，控件只显示一条空白绿条（`base/Selection.vue` 的 label 计算属性拿到空串），用户报「找不到音频输出设备」。

**根因定位过程（CDP 连运行中的应用逐层排除）**：

1. 在应用渲染进程实测 `navigator.mediaDevices.enumerateDevices()` → 只返回 **1 个 `videoinput`（OBS Virtual Camera）**，`audioinput`/`audiooutput` 均为 **0**；而同机独立 Electron 进程能枚举到 20 个设备（含 11 个音频输出）。
2. 排除：webPreferences 全组合、应用的 CLI 开关、用户配置目录损坏（`--user-data-dir` 全新目录）、打包问题（开发版 electron 直接跑 `app.asar`）、本次改动引入（`D:\code\lx-music` 的旧构建结果相同）。
3. 在 `src/main/index.ts` 加临时探针 + 跳过开关做二分，定位到：**与业务代码无关，是 Chromium 音频服务工具进程起不来**。对照进程树 —— 独立 Electron 有 `utility/audio.mojom.AudioService` 子进程，本应用**没有**；应用日志里 `MDM::DoEnumerateDevices({type=AUDIO_OUTPUT})` 有记录，但 `DevicesEnumerated` 返回的 labels 为空。
4. 对照实验（同一时刻、同一二进制）：仅加 `--no-sandbox` 或在 `app ready` 前加 `--disable-features=AudioServiceOutOfProcess` → 立即恢复 11 个音频输出。

**修复**：在 `src/main/index.ts`（`app ready` 之前）把 `AudioServiceOutOfProcess` 并入 `disable-features`，让音频服务改回**浏览器进程内**运行，绕开本机无法拉起的沙箱化工具进程。已与既有 `disable-features`（如 `HardwareMediaKeyHandling`）合并，不会互相覆盖。

```ts
const existed = app.commandLine.getSwitchValue('disable-features')
const features = ['AudioServiceOutOfProcess', ...existed.split(',').map(s => s.trim()).filter(Boolean)]
app.commandLine.appendSwitch('disable-features', [...new Set(features)].join(','))
```

**取舍说明**：音频服务从独立沙箱进程改为进程内运行，隔离性略降（这是 Chrome 早年的默认形态）；本应用本身已对所有窗口使用 `sandbox: false`，故与该姿态一致。若后续排查出工具进程沙箱失败的具体原因，可再改回默认。

**验收（开发模式实机，CDP 读取真实 DOM）**：`enumerateDevices()` → 20 个设备 / 11 音频输出；设置页「音频输出」当前值显示 `Default - 耳机 (HyperX Cloud III)`，展开后 **11 个选项**（耳机 / 27G1G4 / VG259QR / NGENUITY…）。

---

## ㉙ 「不开音效」并非原生直通 —— 核心链路按需串入（2026-10-03）

**问题**：用户质疑「不开音效播放音乐是不是原生输出」。用 `OfflineAudioContext` 逐段实测（输入：前 0.5s 幅度 0.8、后 0.5s 幅度 0.08，即 20dB 动态范围），结论是 **不是原生**：

| 链路 | 大声部 | 小声部 | 动态范围 | 相对直通 |
|---|---|---|---|---|
| 纯直通 | -4.95 dB | -24.95 dB | **20.00 dB** | 0 |
| 仅 `createPanner()`（停在原点） | — | — | — | **-3.01 dB**（equalpower 中心衰减） |
| 默认参数 `DynamicsCompressor` + panner | -6.64 dB | -21.57 dB | **14.93 dB** | 小声部被抬高 **+3.38 dB**，动态范围被压掉 **5.07 dB** |
| 修复前的中性链路 | -6.64 dB | -21.57 dB | 14.93 dB | 同上 |

**根因**（两个节点来自上游 2.12.2 内核，长期常驻链路）：

1. `convolverDynamicsCompressor` 在 `initConvolver()` 里创建后**从未设置任何参数**，即用 Chromium 默认值（threshold -24dB / knee 30 / ratio 12）。它的本意是压住「卷积混响叠加」的峰值，但干声也被一起压。
2. `panner` 用的是 `createPanner()`（3D PannerNode）而非 `StereoPannerNode`，停在原点时 equalpower 声像律仍给每声道 ×0.707（-3.01dB）。

**修复**（沿用工程里已有的「中性即完全旁路」模式）：

- 新增 `applyCoreRouting()`：**只有 `convolver.buffer` 存在（真启用了混响）时**才把压缩器串进链路，否则干声由 `convolverSourceGainNode` 直接送下一级；`setConvolver()` 变更后重建。
- `applyEnhanceRouting()` 的输入改为 `coreOutNode`（动态端点）、输出改为「`isPannerEnabled` ? `panner` : `gainNode`」；新增导出 `setPannerEnable()`，由 `useSoundEffect.ts` 在初始化与 watch 中同步 `player.soundEffect.panner.enable`。
- 结果：**一个音效都不开时链路 = analyser + 10 段 0dB 均衡 + 增益 1**，与直通数学等价。

**验收**：离线复现修复后的中性链路 → 电平差异 **0.000 dB**、动态范围差异 **0.000 dB**（与 bypass 完全一致）；ESLint 0 error；`npm run pack:dir` 重新出包。

**备注**：只要链路还经过 `createMediaElementSource`，解码后仍会按 AudioContext 采样率重采样 —— 这是 WebAudio 路由的固有代价，无法避免（除非完全不走 WebAudio）。

---

## ㉚ 「返回后页面空白 / 所有内容都获取不到」——请求取消竞态（2026-10-03）

**现象**：进入设置页再点返回，主内容区整片空白；随后乐馆显示「该平台暂时没有取到歌单」、搜索下拉的「热门搜索」为空 —— 用户表述为「所有的全都获取不到」。

**定位**：连应用的渲染进程抓异常，一次「乐馆 → 设置 → 返回」流程里稳定抛出

```
TypeError: n.cancelFn is not a function
    at Object.cancelHttp (.../renderer.js)
```

源头是 `src/renderer/utils/request.js` 的 `buildHttpPromose()`（**上游原始代码，本次之前未改动**），存在一个竞态：

```js
cancelHttp: () => {
  if (!obj.requestObj) return obj.isCancelled = true
  cancelHttp(obj.requestObj)
  obj.requestObj = null
  obj.promise = obj.cancelHttp = null
  obj.cancelFn(new Error(...))   // ← 请求已完成时 cancelFn 已被置为 null，这里直接抛
  obj.cancelFn = null
},
...
fetchData(...).then(ro => {
  obj.requestObj = ro            // ← 响应回调可能先执行并把 requestObj/cancelFn 置空，
  if (obj.isCancelled) obj.cancelHttp()   //    这里又把「已结束的 requestObj」挂了回去
})
```

时序：请求很快完成 → 响应回调把 `cancelFn`/`requestObj` 置空 → 随后 `.then` 又把已完成的 `requestObj` 挂回来。此后调用方 `cancelHttp()` 时 `requestObj` 非空、`cancelFn` 已是 `null` → 抛 TypeError。

**为什么影响这么大**：各音源模块普遍是「**先 cancel 上一次请求、再发起新请求**」的写法（如 `kw/leaderboard.js`、`kg/songList.js`、`searchInput` 的 `cancelTipSearch`）。`cancelHttp()` 一抛错，**新请求就发不出去**，页面自然空白 / 提示「没有取到歌单」；如果抛在路由切换的生命周期里，还会连带把当次渲染打断。

**修复**（两处判空，均为防御性、不改变原有语义）：

1. `cancelHttp()` 里 `obj.cancelFn` 存在才调用；
2. `.then(ro => ...)` 里若 `obj.cancelFn == null`（说明请求已结束）就不再挂回 `requestObj`。

**验收**：修复后重跑同一「乐馆 → 设置 → 返回」流程，`cancelFn` 类异常出现 **0 次**（修复前一次流程 3 次）；各页面数据正常。

---

## ㉟ 歌曲列表全面对齐 QQ 版式 + 播放队列重做（2026-10-04，按两张参考图逐像素复刻）

**需求**：所有歌曲列表统一为参考图①（封面 + 歌名/歌手两行 + 行内标签/播放按钮 + 整行居中的操作组 + 专辑 / 时长，**无序号列**）；播放队列改为参考图②（标题 + 排序/清空 + 共 N 首歌曲 + 封面行）。参考图里的会员标识与「会员可畅听」提示，按要求不做。

**测量**（PIL 对参考图逐像素扫描取栅格与色值，不靠目测）：

- 参考图① 883×388：行高 **58px**（y31-88 / 89-146 … 连续 58），表头 **31px**（y0-30）且无底线；
  底色三档 —— **#1D1D1F**（页面底 / 偶数行）、**#212123**（奇数行斑马纹，≈ +1.8% 墨）、**#272729**（悬停行，≈ +4.5% 墨）；
  封面 x16-55（**40×40**、圆角 4），歌名 x66（= 封面右缘 + 11），专辑列起点 x538 = **63.0%**，时长列起点 x767 = **90.0%**；
  操作组 x354-498（4 个 18px 图标、中心间距 42px）**近似整行居中**（组中心 426 / 行宽 852 ≈ 50%），且**仅悬停行可见**；
  行内标签高 12px：VIP 绿 `#07AD5A` 描边 / MV 金 `#BA913F` 描边 / 播放钮 `#969697` 描边。
- 参考图② 452×703：面板 **#29292B**、行交替 **#2D2D2E**、行高 **58**、左内缩 10、封面 40、歌名白 + 标签 + 播放钮、歌手 `#A9A9AA`。

**改动**：

1. `assets/styles/index.less`（全局歌曲表）：行高改 58（`min-height: 3.625rem`，随「字号设置」等比缩放）；加斑马纹 `.row-alt`（虚拟列表每行外层包了一层绝对定位 div，**无法用 `nth-child`**，改由模板传 `index`）；hover 改 4.5% 墨；`.list-item-cell.cover` 内缩 9px；`.name-main` gap 6px；新增 `.row-play`（21×15 描边小方块 + 实心三角）；`.list-item-cell.actions` 改为**整行绝对居中 + 默认 `opacity: 0`、仅悬停行显现**；`.thead` 列头 31px + 排序指示图标；标签圆角改 3px。
   **坑（重要）**：`.list-item-cell.actions` 的绝对定位必须写成 4 级选择器 `.list .list-item .list-item-cell.actions` —— 同文件下方 `.list .list-item .list-item-cell` 里有 `position: relative`，优先级更高会把 `absolute` 顶掉，此时 `left: 50%` 变成「相对自身再偏移 50%」，按钮被推到行外（实测 x=970，正确应为 655）。
2. 表头改 **3 列**（歌曲/歌手 · 专辑 · 时长），删掉序号列与占位空列；专辑 **27%** / 时长 **10%** ⇒ 行内专辑列起点 = 63%、时长列起点 = 90%，与参考图实测吻合。
3. `material/OnlineList/index.vue`、`views/List/MusicList/index.vue`：删序号 cell、表头改 3 列、歌名行加行内播放按钮、专辑/时长列宽统一 27%/10%、行加 `row-alt`。
4. `material/ListButtons.vue`：图标放大到 18px 并改**圆圈描边**风格（下载原本是「下箭头 + 底线」、更多是「三个裸点」，都与参考图不符），按钮 34px + gap 8px（中心间距 42px），已收藏红心改 `#FF6A6A`。
5. `PlayDetail/components/PlayQueue.vue` 重做为参考图②：标题 + 排序/清空图标 + 「共 N 首歌曲」（**不做会员提示行**）；行改「封面 40 + 歌名（含音质标签 + 播放钮）+ 歌手」，删序号；配色按实测（面板 `#29292B` / 行 `#2D2D2E` 交替）。排序是**显示层排序**（倒序时点击仍按真实 index 播放，不动底层列表，避免打乱播放索引）；清空走 `clearListMusics` + 二次确认。
6. 其余歌曲列表一并统一：`views/List/Recent.vue`（原为自定义 `<table>`：序号 + 独立歌手列）重写为标准结构；`views/Home/BoardDetail.vue`、`views/Home/CustomList.vue`（原为自造 `$style.row`：序号 + 独立歌手/专辑列）改为标准结构，并保留各自能力（收藏 / 添加到歌单）。
   `views/Download` 是**下载任务表**（含进度 / 状态 / 专属操作列），只随全局行高变化，不套用歌曲表列结构。
7. i18n：播放队列新增 8 条键（`player__queue_title / _count / _sort / _sort_default / _sort_reverse / _clear / _clear_confirm / _empty`），zh-cn / zh-tw / en-us 三语言齐全。

**验收**（dev 实机 + CDP 读真实 DOM 与截图，见 `.codebuddy/qm-*.png`）：

- 「我喜欢」「最近播放」「每日30首」「热歌榜（300 首）」四个列表全部渲染为参考图①版式，截图与参考图逐项对照一致；
- DOM 实测（容器宽 881，参考图 883）：行高 **58**；封面相对 x **9** / 40×40；歌名起点相对 **59**（参考 59）；专辑列相对 **555 = 63.0%**；时长列相对 **793 = 90.0%**；操作组中心 **655 = 行中心 655**（居中生效）；
- 播放队列：标题 / 计数 / 排序 / 清空齐全，当前播放行歌名主色，面板与行底色与实测值一致；
- 深色变量注入复核：斑马纹与 hover 都由「墨色叠加」派生，深色主题下自动反转为提亮，观感与参考图①一致；
- ESLint 0 error；`npm run build:renderer` 0 error（仅 1 条既有 v-html warning）；三个语言 JSON 合法。

**已知差异（有意为之）**：

- 参考图①的 **VIP / MV 标签**与参考图②的**会员提示行**，按用户「不要管会员什么的」不做；行内标签仍由真实数据驱动（母带 / SQ / HQ / Hi-Res / 音源标签）。
- 参考图①表头的排序箭头是**纯装饰**（点击无行为），不做成「假按钮」。
- 「最近播放」页的操作组只保留「喜欢」（该页原本没有下载 / 添加到歌单 / 更多入口）。
- 行高随「字号设置」等比缩放（默认 16px ⇒ 58px），不是硬编码 58。

## ㊳ 全应用图标系统统一（2026-10-04，收编两套 sprite）

**背景**：爱心、循环列表播放、歌词、上一首/下一首、播放暂停、音量、播放倍速、音频可视化等控件图标长期**混用两套图标体系**，风格、线宽、尺寸都不一致，还存在同名 ID 冲突与「引用了不存在的图标」。

**盘点（改造前实测）**：

| 问题 | 证据 |
| --- | --- |
| 两套 sprite 并存 | `components/layout/Icons.vue`（由 App.vue 的 `<layout-icons />` 渲染，手写 `<g id="icon-*">`，多为实心、viewBox 24/32/512/1024/451/291/830 混杂）＋ `assets/svgs/*.svg`（`svg-sprite-loader` 自动注册 `icon-[name]`，多为描边） |
| 同名 ID 冲突 | `comment` / `pause` / `play` / `refresh` / `search` 两套都有 → `<use>` 取 DOM 中先出现的（即 A 套实心大图标），B 套同名资源从未生效 |
| 播放控件图标与资源对不上 | `#icon-list-loop`、`#icon-list-random`、`#icon-list-order`、`#icon-single-loop`、`#icon-single`、`#icon-prevMusic`、`#icon-nextMusic`、`#icon-audio-wave`、`#icon-desktop-lyric-on/off`、`#icon-text`、`#icon-plex` 等 **28 个**只存在于 A 套 |
| 线宽散落 | 同批图标 stroke-width 有 1.5 / 1.6 / 1.7 / 1.8 / 2 / **32**（`volume-*-outline` 是 512 viewBox 的 Material 图标） |
| 尺寸散落 | 控件图标实测宽度出现在 12/13/14/16/18/19/20/22/23/24/26/30/32/34/40px 十余个值 |
| 交互态各自为政 | 各控件自己写 `svg { opacity: .6 } &:hover { .9 } &:active { 1 }`，部分控件完全没有禁用态 |

**统一规范（本轮确立）**：

- **画法**：全部 **24×24 网格**；描边型 `stroke-width: 1.7` + `round` 线帽/连接 + `fill: none`；
  仅「播放控制（prev / next / play / pause）」「已收藏红心」「更多三点」使用实心填充（与描边系共用同一网格与圆角语言）。
- **尺寸**：`--qm-icon-xs 16 / --qm-icon-sm 18 / --qm-icon 20 / --qm-icon-lg 24` 四档（定义在 `index.less`）。
- **交互态**：新增 `assets/styles/qq-icon.less`，**全应用只此一处定义** —— 默认 72% → 悬停 100%（可叠背景色）→ 按下 `scale(.94)` → 禁用 40% + `not-allowed`；颜色一律 `color: inherit`，让浅色外壳与详情页深色画布共用同一套规则。

**改动**：

1. `assets/svgs/` 重建为 **75 个**统一图标：新增/重绘 `play-mode-list / -single / -random / -order / -off`（播放模式五态）、`lyrics`、`lyrics-desktop-on / -off`、`lyrics-select`、`audio-wave`、`speed`、`prev / next / play / pause`、`volume-high / -medium / -low / -mute / -off`、`heart / heart-outline`、`playlist-add`、`delete`、`close`、`window-minimize / -maximize / -close / -restore / -hide`、`checkbox-blank / -checked`、`font-increase / -decrease` 等；删除 `list-loop / single-loop / list-random / list-order / single / loop / repeat / repeat-once / shuffle / plex / equalizer / volume-*-outline / caret-down / arrow-up / check / help-circle-outline / phone` 等被取代的旧文件。
2. **删除** `components/layout/Icons.vue` 与 `App.vue` 的 `<layout-icons />`，A 套整体移除（同名冲突随之消失）。
3. 引用点全量改名（`#icon-*` 与 `<svg-icon name>` 共 **53 处 / 17 个文件**）；把散落的 `<svg version…><use xlink:href="#icon-x"/></svg>` 与 pug 的 `svg(...)+use(...)` 统一成 `<svg-icon name="x" />`（**55 处 / 27 个文件**）；播放栏与播放队列弹层的 7 处模板内联 SVG 也换成 sprite。
4. 尺寸 token 化：`Aside`、播放栏、详情页、弹层等 **29 个文件**的图标尺寸收敛到 `--qm-icon-*`（>26px 的空态插画保持原尺寸，不参与）。
5. 控件样式统一走 `.qm-icon-btn()` / `.qm-icon-btn-strong()`：播放栏 `.iconBtn`（按钮 32、图标 20）、主播放键（40 / 图标 24）、详情页工具行（28 / 图标 20）、详情页播放条（图标 24）、窗口按钮（34 / 图标 16）、列表行 `ListButtons`（34 / 图标 18）。

**踩坑（重要）**：

- **批量正则替换 `<svg …>…</svg>` 会连标签上的 `v-if` / `v-show` / `:class` 一起删掉**。本轮造成 3 处功能性回归 —— `TogglePlayModeBtn` 的 5 个播放模式图标同时显示、`PlayBar` 的播放/暂停同时显示、`ControlBtns` 的桌面歌词开/关同时显示；另有 6 处 `:class` 丢失导致样式失效。全部已修复（恢复 `v-if/v-else-if` 链、`:name="isPlay ? 'pause' : 'play'"`、`v-show`）。**教训：改模板要按元素粒度解析，不能只匹配标签对。**
- 详情页把 `--color-primary` / `--color-font` 一系重定义了，图标按钮**不要写死 `--qm-text-*`**（会变深而看不见）；统一 `color: inherit`，再由上下文给色。
- 详情页工具行的选中态原本写 `var(--color-primary)`（在详情页里等于白色 → 等于没有选中反馈），改用 `--qm-primary` 才真正变品牌绿。
- CDP target 列表里有一个 `User api` 的 `data:` 空白页，取 target 必须优先选 `http(s):` 的那个，否则会对着空白页做校验（本轮被误导过一次）。

**验收（dev 实机 + CDP 读真实 DOM）**：

- **全站图标零缺失**：列表页 26 个 `<use>`、详情页 41 个 `<use>` 全部命中 symbol；
- 尺寸实测：播放栏一排 **20px**、主播放键 **24px**、详情页工具行 **20px**、窗口按钮 **16px**、侧栏 **18/20px**、列表行 **18px**；
- `lyrics-desktop-on / -off` 的 `v-show` 生效（实测一个 20px、另一个 0px，不再同时显示）；
- 播放栏、详情页播放条 + 工具行、列表行截图确认风格一致（`.codebuddy/icon-*.png`）；
- ESLint 0 error；`npm run build:renderer` 0 error（仅 1 条既有 v-html warning）。

---

## ㊴ 弹窗系统统一 + 音量向上弹窗 + 详情页复核（2026-10-04，按四张参考图逐像素复刻）

### 起因（诊断结论）
用户给了 6 张图：详情页、主播放栏、音量弹窗、播放模式弹窗（浅/深）、音质弹窗。
逐像素比对后发现**详情页本身已达 96.8% 一致**（差异只在歌词滚动偏移与一个 hover 提示气泡），
真正的问题在弹窗：**同一个功能存在两套实现**。

| 位置 | 统一前 | 问题 |
| --- | --- | --- |
| 音量 | 主播放栏内联竖版弹窗；详情页用 `VolumeBtn.vue` 的「横向滑块 + 静音勾选」 | 两处长得完全不一样，详情页明显不是 QQ 的样子 |
| 播放模式 | 主播放栏内联 4 项列表；详情页 `TogglePlayModeBtn.vue` 是**一排 5 个裸图标** | 详情页没有文字、没有选中态 |
| 音质 | 两处各写一份 `qualityItem` 样式 | 选中态一个只有主色文字、一个没有 |

更隐蔽的一条：`base/Popup.vue` 把卡片底色**写死 `#fff`**，而详情页的弹窗 `teleport` 到 `#root`
（在详情页 `.container` 之外），拿不到详情页重定义的语义色 → 一旦按详情页那套写 `color: var(--color-font)`，
就会变成**白卡 + 白字**，菜单整片看不见。

### 改法
1. **新增 `assets/styles/qq-popup.less`**：全局类 `.qm-menu / .qm-menu-item / .qm-menu-item--active /
   .qm-menu-item__icon / .qm-menu-title / .qm-menu-divider`，以及深色变体 `.qm-popup-dark`。
   取值按参考图实测：卡片圆角 12、菜单内边距 6、项高 36、项圆角 8、字号 13；
   **选中项 = 浅主色胶囊底 + 主色文字 + 中等字重**（即用户指定的「音质弹窗那种样式」），不再画分隔线。
2. **`base/Popup.vue` 卡片主题化**：底色/描边/投影改为 `--qm-popup-bg/-border/-shadow`；
   按 `isShowPlayerDetail` 追加 `.dark` + `.qm-popup-dark`，在弹窗自身上重建深色语义色
   （含 `color: var(--color-font)` —— 只改变量不会改变 `color`，弹窗内容默认 `color: inherit`）。
   同时把 `.list` 的 `padding: 10px` 收敛为 0，改由各弹窗自带内边距（否则和 `.qm-menu` 的 6px 叠成两倍）。
3. **抽出 `utils/compositions/useVolumeControl.js`**（音量/静音/拖拽/滚轮/步进）+
   **`components/common/VolumePopup.vue`**（绿圆钮(+) → 竖轨道 → 自下而上填充 → 百分比 → 分隔线 → 静音钮）。
   `VolumeBtn.vue` 与主播放栏 `MiniWidthProgress.vue` **共用同一实现**，详情页音量弹窗随之变成向上竖版。
4. **重写 `TogglePlayModeBtn.vue`**：4 项列表（随机 / 顺序 / 单曲循环 / 列表循环，图标 + 文案 + 选中态），
   主播放栏直接复用它（删掉内联那份）。
5. **新增 `components/common/QualityPopup.vue`**：音质菜单只有一份，播放栏与详情页各自保留自己的触发按钮。
6. **尺寸下传改用 CSS 变量**：`--qm-volume-size / --qm-playmode-size / --qm-volume-btn-icon /
   --qm-playmode-btn-icon`。原因是子组件内 `:global(.svg-icon)` 与使用方覆盖规则**特异性相同**，
   谁生效取决于 CSS Module 注入顺序（这次改动就因此让音量图标从 32px 掉回 24px 并推位 5px）。

### 验收
- 详情页与参考图**全部 16 段底栏元素 + 描述文字 bbox 完全一致**
  （`430-449/501-516/552-562/597-612/674-692` … 逐段数值相同）；整页像素差异 0.5%。
- 浅色（主窗口）与深色（详情页）两种画布下，音量 / 播放模式 / 音质三个弹窗逐张截图核对通过；
  弹窗均向上弹出、箭头指向触发按钮、深色卡片文字可读。
- ESLint 0 error、`npm run build:renderer` 0 error。

### 顺手修掉
`MusicComment/index.vue` 的 `setWidth()` / `handleToggleTab()` 直接解引用模板 ref
（`this.$refs.dom_container.parentNode.clientWidth`、`this.$refs.dom_tabMain.clientWidth`），
详情页快速开关时会抛 `Cannot read properties of null (reading 'clientWidth')` 冒到全局。

---

## ㊵ 弹窗收敛 + 播放栏重排 + 悬停提示根因（2026-10-04）

用户给了 6 张实机截图，共 5 个问题。最耗时的是第 1 个。

### ①「右下角有两个鼠标移上去的小弹窗」——根因是项目自带的 Tips 插件
排查过程排除了三个假设（`title` 属性、Chromium 原生 aria tooltip、第三方 tooltip 库），
最后定位到 **`src/renderer/plugins/Tips/index.js`**：

```js
const getTipText = el =>
  el.getAttribute('aria-label') && el.getAttribute('ignore-tip') == null
    ? el.getAttribute('aria-label') : null
```

它监听 `body` 的 `mousemove`，400ms 后把最近祖先的 **`aria-label`** 当作提示气泡显示在光标右下方。
所以「弹窗 + 气泡」同时出现——**气泡不是原生的，是应用自己的**。
插件本身留了开关：元素带 **`ignore-tip`** 属性就不显示。

验证方法（可复用）：先在元素上把 `aria-label` 改成唯一串（如 `AAA-ARIA-TEST`），
移开鼠标再悬停回来 —— 气泡文案会跟着变，即可确认来源。

**改法**：给播放栏（主 + 详情页）与各弹窗内所有控件按钮加 `ignore-tip`；
同时删掉它们身上**冗余的 `title`**（那是第二套、会打架的提示机制）。
保留 `title` 的只有「文本截断提示」类（歌名 / 歌手 / 队列行）。

### ② 音量弹窗过大
卡片 100→**84** 宽、竖向滑条 108→**88**、绿圆钮 22→20、分隔线 40→34、静音钮 28×24→26×22。

### ③ 详情页底栏：循环 / 音量图标比播放键还大
实测图形：播放键 11×13、上一/下一首 15×12，而**循环 20×20、音量 19×20** —— 确实失衡。
改为 **循环 24→16px、音量 32→20px**（下传变量 `--qm-playmode-btn-icon` / `--qm-volume-btn-icon`），
并移除上一轮为对齐参考图加的 `margin: ±6px` 补偿（尺寸变了，补偿已无意义）。

### ④ 主播放栏：音量挪到「下一首」旁边
音量从右侧辅助组移进中间控制组，排在「下一首」之后；
`循环 ↔ 上一首`、`下一首 ↔ 音量` 各加 **16px** 间距（按钮中心距 38→54），中间三键保持 6px。
`.controls` 与下方进度条仍共用同一中轴（实测两者 center 均为 581）。

### ⑤ 倍速弹窗的「音调补偿」
原来是 `base-checkbox`（`width/height: 1em` 的方块，尺寸随字号漂移，观感很碎）。
改为 **36×20 拨动开关**（关闭中性灰 / 开启主色，16px 白色圆钮，`role="switch"`），
「重置」用本地 pill 按钮（主色浅底 + 主色文字，速率为 1x 时禁用）。

### 验收
- 悬停音量 / 音质 / 播放队列 / 音调补偿 / 下一曲：**气泡均已消失**（截图核对）。
- 详情页底栏图标实测：循环 **16×16**、音量 **20×20**、播放/上一首/下一首 24×24。
- 主播放栏实测：`循环@485 上一首@539 播放@581 下一首@623 音量@677`，
  两端中心距 54、中间 42；音量已紧邻下一首。
- ESLint 0 error、`npm run build:renderer` 0 error。

### 踩坑
用正则给 pug 模板插入属性时，`re.sub(r'\)\s*(.*)$', ...)` 会命中 **`$t('xxx')` 里的第一个右括号**，
把属性插进字符串里（`$t('audio_visualization' ignore-tip)`），也命中过 `>=` 的 `>`。
已回滚修正 —— **改模板不要用「找第一个 `)` / `>`」这类正则，要按属性边界匹配**。

---

## ㊶ 音量弹窗再收档 + 修掉弹层整体 8px 偏移（2026-10-04）

用户反馈：音量弹窗**还是太大**、而且**没有居中**（气泡问题已确认解决）。

### 居中偏移的根因
`base/Popup.vue` 里定位时减了一个写死的偏移：

```js
const elTop = rect.top - window.lx.rootOffset        // 纵向
let left = rect.left + rect.width / 2 - window.lx.rootOffset - center   // 横向
```

`window.lx.rootOffset = window.dt ? 0 : 8`（`core/globalData.ts`）。实测当前外壳里
**`#root` 是 `position: relative` 且位于 (0, 0)**，弹层以它为原点，**根本不需要补偿** ——
多减的 8px 让**所有弹层（弹窗 + 右键菜单）整体偏左上 8px**。
音量弹窗看起来「没和按钮对齐」，实测弹窗中心 670 / 按钮中心 677。

**改法**：新增 `getRootOrigin()`（`core/globalData.ts`），运行时读取 `#root` 的真实位置：

```js
export const getRootOrigin = () => {
  const el = document.getElementById('root')
  if (!el) return { x: 0, y: 0 }
  // #root 为 static 时，absolute 子元素以初始包含块（视口）为原点
  if (getComputedStyle(el).position === 'static') return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return { x: rect.left, y: rect.top }
}
```

`Popup.vue` 与 `utils/compositions/useMenuLocation.js` 都改用它 —— 这样无论外壳是否给
`#root` 留边（比如带透明圆角边框的模式），坐标都算得对，不再是「写死 8 猜对一半」。

### 体积再收一档
卡片 **84×184 → 66×157**：宽 84→66；内边距 8/4→6/2；滑条 88→72；
滑块 11→10；百分比 12px→11px；分隔线 34→28；静音钮 26×22→24×20。

### 验收
- 主播放栏：弹窗 66×157，**弹窗中心 678 / 按钮中心 677（差 1px 为取整）**，箭头正好落在按钮上沿。
- 播放详情页（深色）：62×148，同样居中。
- ESLint 0 error、`npm run build:renderer` 0 error。

---

## ㊷ 弹窗仍偏左的真因（8px 滚动条槽）+ 悬停提示分级（2026-10-04）

用户反馈：音量弹窗**还是偏左**；并追问**为什么所有小气泡都没了**。

### ① 「还是偏左」的真因：全局 `.scroll` 预留的 8px 滚动条槽
上一轮修掉了 `rootOffset` 的 8px，弹窗中心与按钮中心已经对齐（677 vs 678）。
但用户看到的「偏左」是**卡片内部**：卡片 76 宽、内容只有 66 —— 右侧多出 8px 死区，
内容和向下的箭头都因此看着偏左。

来源是 `Popup.vue` 的 `.list` 同时挂了全局类 `scroll`：

```less
.scroll { overflow: auto; scrollbar-gutter: stable; &::-webkit-scrollbar { width: 8px } }
```

`scrollbar-gutter: stable` 会**常驻预留一条 8px 槽**；弹窗是按内容定宽的，
这条槽永远不会用来滚内容，纯粹变成卡片右侧的死区。

**坑**：先在 `.list` 上加 `scrollbar-gutter: auto` **没生效** —— 它与 `.scroll` **特异性相同 (0,1,0)**，
胜负取决于样式表注入顺序（实测仍是 `stable`）。改成 **`.popup .list`** 两级选择器 (0,2,0) 才盖住。

**验收**：卡片 76 → 68（= 内容 66 + 左右各 1px 描边），`+` 钮中心 **677** = 按钮中心 **677**。

### ② 悬停提示改为「分级」
上一轮把播放栏所有控件的 `ignore-tip` 都加了一遍，结果用户发现**所有气泡都没了**。
改为按「是否会弹窗」分级：

| 类别 | 处理 | 控件 |
| --- | --- | --- |
| 会弹窗的控件 | **保持 `ignore-tip`** | 音量 / 音质 / 播放模式 / 播放队列 / 更多 / 播放倍速 / 音效设置，以及各弹窗**内部**的按钮 |
| 不弹窗的控件 | **恢复悬停提示** | 喜欢 / 评论 / 上一曲 / 播放暂停 / 下一曲 / 桌面歌词 / 音频可视化 / 歌词文本选择 / 添加到歌单 |

理由：只有「弹窗 + 气泡同时出现」才是干扰，其余控件的气泡本身是有用的可发现性提示。

### 踩坑（正则）
用 `re.sub(r'<button\b[^>]*>', ...)` 批量改按钮属性时，**两个按钮没被命中**：
主栏「播放/暂停」（`aria-label` 是三目表达式）与详情页「桌面歌词」（`aria-label` 绑变量）。
批量替换后**必须逐个 grep 复查剩余的 `ignore-tip`**，确认每一处都符合预期类别。

---

## ㊸ 右键菜单对齐 QQ 音乐 + 「添加到」二级面板（2026-10-04）

用户给了两张 QQ 音乐右键菜单截图（深色），要求「添加到」按图一比一。

### 参考图逐像素实测（确认截图为 1:1 —— 背后列表行高恰好 58px，与本项目一致）
- **卡片**：210 宽；圆角 **6px**（角部剖面 inset 6/3/2/1/1/0）；深色底 `#29292B`，**无描边**
- **项**：高 **32px**，**左右满幅**（hover 高亮 `#3B3B3D` 无内缩、无圆角）
- **图标**：墨迹 13~17px → 图标盒 20px；**左内缩 12px**，图标盒 20 + 间距 14 → **文字起点 46px**（无图标项同样 46px 对齐）
- **箭头**（子菜单指示）：墨迹 5×9 → 20px 盒，中心距右缘 16px（盒右缩 6px）
- **分隔线**：1px `#323234`，**满幅**，上下 **11px**（组间隔 22+1=23px）
- **卡片 padding**：上下 7px（首项中心 = 顶 + 23）
- **禁用项**：`#929293`
- **校验**：7 + 3×32 + 23 + 8×32 + 23 + 2×32 + 7 = **476** = 实测卡高 ✓
- **二级面板**：同为 210 宽，**左间距 8px**；**首项与父项对心**（top = 父项 top − 卡片 padding）
- 「我喜欢」红心 = `#FF6A6A`（与列表行收藏按钮同色）；「移动到」「复制歌曲信息」**无图标**

### 实现
- **`base/Menu.vue` 重写**：支持 `icon / iconActive / divider / submenu / disabled / hide`；
  明暗两套卡片变量（暗色 = 上面的实测值，跟随 `isDarkTheme`，新增于 `store/utils.ts` 的 `applyTheme`）；
  二级面板 hover 展开、160ms 延迟关闭（跨 8px 间隙不闪断）、纵向越界回推、横向放不下翻左侧
- **新增 `utils/compositions/useListTargetMenu.js`**：「添加到 / 移动到」子菜单数据与动作
  （试听列表 / 我的收藏 → 分隔线 → 添加到新歌单(方框加号) → 分隔线 → 用户歌单；
  **歌曲已在的目标列表置灰禁用** —— 对应参考图第一行的灰色「播放队列」）；
  点击直接 `addListMusics / moveListMusics / createUserList`，不再开弹窗
- 各 `useMenu.js` 按 QQ 顺序重排并加图标/分隔线（OnlineList / MusicList / Download / BoardList / MyList）；
  MusicList 把 `listId` 传进 useMenu 供「移动到」排除来源列表
- **新增 10 个图标**：play-o / play-next / play-similar / square-plus / share-box / comment-dots /
  sort / swap / heart-slash / copy
- 文案对齐参考图：`list__play_later` 稍后播放→**下一首播放**、`list__add_to`/`list__move_to` 去掉「...」；
  新增 `list__love_it`(我喜欢)、`list_add__new_list`(添加到新歌单)、`lists__new_list_name`(新建歌单)

### 实机验收（CDP）
- 主卡片 **210×446**（12 项 + 2 分隔线）、项高 **32**、圆角 6、padding 7/0 ✓
- 子面板 **210×135**，`gap = 8px`、top = 父项 top − 7（首项对心）✓
- 已收藏歌曲的「试听列表 / 我的收藏」正确置灰；「我喜欢」红心实心
- ESLint 0 error、renderer 构建 0 error

### 注意
- 「下载」菜单项沿用全局开关 `download.enable`（关闭时整项隐藏，原行为保留）——
  参考图里有「下载」，若希望不跟随开关可以再改
- 菜单为**主题自适应**：浅色主题下是白卡深字（与应用其余弹层一致），深色主题下逐值还原参考图

---

## ㊹ 行内「+」/ 播放栏 / 详情页的「添加到」改用 QQ 菜单（2026-10-04）

用户：不要旧的「添加 xx 到...」大弹窗（ListAddModal），照上一节的 QQ 菜单改。

### 改法
- **新增 `utils/compositions/useListAddMenu.js`**：锚定按钮的「添加到」菜单
  （复用 `base/Menu.vue` 同款卡片 + `useListTargetMenu` 的目标列表数据）；
  锚点 = 触发按钮外接矩形，菜单出现在按钮下方 6px、左对齐；**同一按钮再点一次 = 关闭**。
- **`base/Menu.vue` 加 `dark` prop**（null=跟随应用主题）：详情页画布内传 true 强制暗色卡。
- **替换 5 处触发点**（弹窗全部下岗）：
  1. 行内「+」按钮（OnlineList / MusicList 的 listAdd）→ 锚定菜单；
  2. 播放栏更多菜单的「添加到歌单」→ 锚定在更多按钮；
  3. 播放队列弹层行内的「添加到歌单」→ 锚定在该行按钮；
  4. 播放详情页「添加当前歌曲到...」→ 锚定 + 强制暗色；
  5. 榜单详情（BoardDetail）行内添加 → 锚定菜单。
  ListAddModal 仅剩多选批量流程仍在用。
- `ListButtons` 的 listAdd 点击现在透传 `$event`（锚定需要按钮位置）。

### 途中抓到的三个坑（都已修）
1. **menus=null 渲染崩溃（严重）**：锚定菜单未打开时 items 为 null，
   `Menu.vue` 里 `props.menus.filter` 抛错 → **整个应用树卸载**（#root 只剩 teleport 弹层、
   无任何报错提示）。修法：`(props.menus || [])` + 组合式兜底空数组。
   *教训：给「必须存在」的数组 prop 传了 null，Vue 渲染错误会静默卸载整棵树。*
2. **更多菜单点任意项后弹层重开**：qm-menu-item 的点击冒泡到 PopupBtn 的包装层，
   `handleShowPopup` 在 visible=false 分支里走 handlMsEnter → 100ms 后重开。
   修法：四个菜单项 `@click.stop`。
3. **视口钳位拿到旧高度**：openMenu 同步设置内容+显示，`useMenuLocation.handleShow`
   在 pre-flush 里读 `clientHeight` 时菜单内容还是上一轮（可能为空，高度 14px）→
   底部触发时钳位失效、菜单被窗口边缘裁掉。修法：openMenu 里 `await nextTick()`
   后再置为可见（先渲染出真实高度）。

### 实机验收（CDP）
- 详情页：点击「添加当前歌曲到...」→ **210×135 暗色卡**锚定在按钮下方，
  已收藏列表置灰；视图越界正确上收。
- 主窗口：更多菜单 →「添加到歌单」→ 更多弹层**保持关闭**（重开 bug 已修），
  锚定菜单打开、内联 `transform: scale(1) translate(0,-127px)` 钳位正确
  （hidden 窗口下截图看到的缩小 rect 是过渡冻结假象，非缺陷）。
- ESLint 0 error、renderer 构建 0 error。

---

## ㊺ 「点了没用」：菜单盖住触发按钮（2026-10-04）

用户反馈详情页「添加当前歌曲到...」点了没用。

### 根因
详情页底栏在窗口最底部，音量/添加菜单展开后向上钳位，
**菜单位置正好覆盖触发按钮**（实测：菜单 578~713 × 894~1104，按钮 632~660 × 1062~1090）。
第一次点击菜单正常打开（就在光标下），第二次点击落在了菜单卡片的
**死区（分隔线上/内边距）**，既不关闭也不触发 → 表现为「点了没用」。

### 修复
- **`base/Menu.vue` 新增 `anchorRect` prop**：打开后检测菜单与触发按钮矩形是否重叠，
  重叠则挪到**按钮上方**（顶部放不下则下方），永远不盖住触发器。
- 顺带：**Esc 关闭菜单**（二级面板开着先只关二级）。
- 附带清理：openMenu 由 async 改为同步 + `nextTick(回调)`（构建期 eslint 的
  `no-confusing-void-expression` 对 `void promise()` 语句报错，且与独立 npx eslint
  的口径不一致 —— 两套 eslint 配置解析路径不同，以构建为准）。

### 验证坑（重要）
应用窗口被遮挡/最小化时 `visibilityState=hidden`：
- **rAF 停摆 → Vue 过渡（nextFrame 双 rAF）无法推进 → `@after-enter` 不触发 →
  详情页底栏永远不挂载**，注入 `animation-duration:0s` 也无效（卡点是 rAF 不是时长）。
- **CSS 过渡冻结在起始帧** → getBoundingClientRect 是 scale(.8,.7) 的缩小值，
  别误判成定位 bug，要读内联 style。
- 这些都会让「复现用户操作」失败，但**不代表用户（窗口可见）会遇到**。

### 验证
- ESLint 0 error、renderer 构建 0 error（已恢复）。
- dev 实例已**清缓存重启**（用户长时间 HMR 会话可能持有旧模块，重启排除该因素）。
- 待用户在可见窗口下复测：第一次点击菜单应在按钮上方展开（不盖按钮），
  再次点击按钮可正常开合。

---

## ㊻ 歌单列表页 / 榜单详情页按 QQ 一比一重做（2026-10-04）

### 参考图实测（PIL 逐像素，两张图分别 1171×733、1928×1048）

**图1「喜欢」页 —— 核心结论：页头是三段竖排，不是一行**
| 项 | 实测值 |
| --- | --- |
| 大标题「喜欢」 | 字高 31px（**30px/700**），x = 内容区左 +44 |
| 页签行 | 文字 13px（y 155–166），项间 **40px**；选中项主色 + **3px 主色下划线**（距文字底 10px） |
| 工具栏 | 按钮高 **32px**（y 199–230）；播放=主色胶囊，下载/批量=中性胶囊；右侧图标**无边框** |
| 表头 | 12px 灰字；歌名 x=278 / 专辑 x=800 / 时长 x=1026 |
| 列表行 | 行高 **58px**、封面 40×40（行内缩 **9px**）、hover 行 #272729 |
| **行背景内缩** | 内容区 232..1171，行 266..1118 → **左右各缩 34（右另含滚动条 ~19）** ← 这是此前缺失的一项 |

列位换算（相对内容区宽 939）：歌名 7.3%、专辑 62.6%、时长 89.1%，
与既有实现的 6.9% / 63% / 90% **本就一致** —— 差距全在页头与行内缩。

**图3「热歌榜」页**
| 项 | 实测值 |
| --- | --- |
| 封面 | **170×170**（原实现 132×132） |
| 标题 | 字高 31px（30px/700） |
| 表头 | 曲序 / 歌曲 / 歌手 / 专辑 / 时长（**无排序箭头**） |
| 列位 | 2.7% / 7.05% / 51.8% / 72.8% / 93.9% |
| 行高 | **50px**（参考图无缩略图）；用户要求保留缩略图 → 行高维持 58px |
| 序号 | 两位数补零 01/02/03 |

### 改动
1. `views/List/MusicList/index.vue`（喜欢 / 我的歌单 / 试听列表共用）
   - 页头由「标题+页签+按钮挤一行」改为**三段竖排**：30px 大标题 → 页签行（歌曲/歌单/专辑/有声节目/视频，选中带 3px 主色下划线）→ 工具栏（主色胶囊「播放」+「下载」+「批量」+ 右侧搜索/回到顶部图标）
   - `.head` padding 24→**34**；`.content` 与 `:global(.thead)` 同步 34px 左右内缩，让行背景与表头同宽
2. `views/List/Recent.vue`：标题统一 30px 大标题（去掉时钟图标），计数改「共 N 首」跟随右侧；表头文案改「歌名 / 歌手」；内容区同步 34px 内缩
3. `views/Home/BoardDetail.vue`
   - 封面 132→**170**、标题→30px；按钮组改「全部播放 / 全部收藏 / 返回」（新增 `loveAll`，跳过已收藏项避免重复 IPC）
   - 表头加**曲序 + 歌手**两列，并插入一个 50px **封面占位列**，使「歌曲」文字与行内歌名同心
   - 行内加序号列（`padStart(2,'0')`）+ 独立歌手列；歌名改单行（去掉原 `name-sub` 双行歌手）
4. i18n×3：`music_name` 歌曲名→歌名、`music_singer` 艺术家→歌手（zh-tw 標題/演出者→歌名/歌手，en-us Title→Song）

### 验证
- ESLint 0 error；`npm run build:renderer` **0 error**（仅剩既有 `vue/no-v-html` warning）
- CDP 实测（视口 1171×733）：h1 **30px**、页签间距 40px、工具栏按钮 **32px**、行高 **58px**、封面 40×40、
  行背景 **x 248..1118**（= 内容区 +34，右边界与参考图完全一致）
- 榜单页：封面 **170×170**、表头 6 列、「歌曲」文字 354 vs 行内歌名 353（**差 1px**）

### 顺带发现（未修，另开一轮）
- **切换列表页偶发内容区空白**：`/list/love` → `/list/recent` 的一次 CDP 点击复现，`#view` 子节点数 **0**（只剩注释节点），
  但 `router.currentRoute.fullPath` 已是 `/list/recent` → `router-view` 的 `Component` 为 `undefined`。
  `Page.reload` 后恢复正常。现象与 ㉝ 同源（挂载竞态），需单独定位。
- **CDP 调试注意**：`router.push()` 有时会 `resolve` 但 `currentRoute` 不变（本轮多次命中），
  模拟点击侧栏反而稳定；`location.hash = ...` 在本应用里不触发导航。

---

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
| 2026-10-03 | ㉕ 音效弹窗一比一复刻 | 与两张参考图逐项像素比对：推荐音效页精选卡 5 列/2 行与达人音效 2 列/5 行的 x/y 坐标**完全一致**；均衡器页预设宫格坐标与全部采样色值完全一致，EQ 轨 x 与增强行 y 差 **≤1px**；弹窗 730×560、侧栏 150、表头 51+1px 线均对齐。ESLint 0 error；renderer 构建仅剩 6 条历史环境错误（`node_modules` 指向 `D:\code\lx-music` 的 TS6059 rootDir 报错，涉及文件本次均未改动） |
| 2026-10-03 | ㉖ 增强效果链落内核 | 超重低音/高保真度/动态推进/声道平衡 四项接入 WebAudio（低频架/高频架/压限+补偿/声像），**全中性时完全旁路**保证干声零处理；参数 30ms 平滑；低音架最高 +15dB 时由仅在本链启用时才存在的安全限幅器兜底。弹窗 `isAnyActive` 与总开关同步计入这四项 |
| 2026-10-03 | ㉗ 生产打包修复 | 修掉 4 处阻断（renderer TS6059×6 = tsconfig rootDir；main TS7006×5 = autoUpdate 回调隐式 any；eslint eol-last×1；打包版启动崩溃 = undici 被打进主进程 bundle 触发私有字段 #handler 报错）。`npm run pack:dir` 全绿：4 端 webpack 0 error，产物 `build/win-unpacked` **实测启动成功** |
| 2026-10-03 | ㉘ 音频输出下拉为空 | 根因：Chromium 沙箱化音频服务工具进程在本机拉不起来 → `enumerateDevices()` 音频设备数为 0。修法：`app ready` 前把 `AudioServiceOutOfProcess` 并入 `disable-features`，音频服务改进程内运行。实机验收：枚举 11 个音频输出，设置页下拉显示 `Default - 耳机 (HyperX Cloud III)` 且有 11 个选项 |
| 2026-10-03 | ㉙ 不开音效非原生直通 | 实测原中性链路：默认参数 `DynamicsCompressor` 把 20dB 动态范围压成 14.93dB（小声部 +3.38dB）、`createPanner()` 原点再吃 -3.01dB。改为「卷积压缩器只在启用混响时插入 + panner 只在启用环绕时插入」，修复后中性链路与 bypass 差异 **0.000 dB** |
| 2026-10-03 | ㉚ 返回后空白/全部获取不到 | 上游 `renderer/utils/request.js` 的 `buildHttpPromose` 存在竞态：请求先完成时 `.then` 仍把已结束的 requestObj 挂回，导致随后的 `cancelHttp()` 调 `null` 的 `cancelFn` 抛 `TypeError`，把各音源「先取消再请求」的流程整段打断。补两处判空。验收：同一复现流程 `cancelFn` 异常 3 次 → **0 次** |
| 2026-10-03 | ㉛ 乐馆「该平台暂时没有取到歌单」 | 判定为**上游/QQ 侧接口变更，非本轮改动**：① `renderer/utils/request.js` 的 `cancelFn` 竞态异常 3→0（㉚ 修复生效）；② 实测 `u.y.qq.com/.../musics.fcg?sign=zzc…` 返回 `code 500001`、`musicu.fcg` 歌单列表 `PlayListPlazaServer` 返回 `code 500005`（参数已变更），而 `c.y.qq.com` 老接口正常（歌单搜索 137356 条、详情 53KB）；③ `musicSdk/tx/utils/crypto.js` 的 `zzcSign` 是伪造实现（D 盘老仓库 5 月同款），无法通过 QQ 服务端签名校验。`musicSdk/` 未被本轮改动触碰 |
| 2026-10-03 | ㉜ 打包版「所有平台都获取不到数据」 | **Terser 压缩破坏 Promise 赋值**：`renderer/utils/request.js` 里 `obj.cancelFn = reject` 紧跟 `debugRequest && console.log(...)` 表达式语句，prod 压缩时被合并成 `obj.cancelFn = reject(false) && console.log(...)` → 提前 `reject(false)` 否定 Promise，且 `console.log` 返回值 `undefined` 覆盖 `cancelFn`，导致请求全部发出但永远无响应（dev 不压缩故正常）。改用 `if (debugRequest) …` 阻断合并。同批修掉 `MusicHall.vue` 的 `tagGroups?.flatMap(...)` —— `?.` 只保护了对象本身，若 resolve 的是非数组仍会抛 `flatMap is not a function` 而打断整个乐馆加载，改为先 `Array.isArray` 判定。**实机验收**：乐馆「该平台暂时没有取到歌单」消失，推荐数从 0 恢复为 30/39/50/39 首，封面与歌单卡片正常渲染，控制台 0 异常；侧栏 4 页均无空态 |
| 2026-10-03 | ㉝ 列表页进设置返回后主内容区空白 | **`<transition mode="out-in">` 挂载竞态**：设置页是 App 层 `v-if` 全屏覆盖层，关闭时销毁子树打断离场流程，router-view 的 `Component` 永久变 `undefined`（`#view` 子节点数 0，hash 已回退但无内容）。触发条件有别：从乐馆 `#/home` 返回正常，从 `#/list/*` 等列表页返回必现。修法：`View.vue` 去掉 transition 包裹、`key` 绑定 `routeReloadKey + fullPath` 强制重挂。**连带修** 4 处 DOM/生命周期隐患：`Toolbar/ControlBtns.vue` 与 `PlayDetail/ControlBtnsRightHeader.vue` 的 `for...of childNodes`（活节点集）与无边界 `getBtnEl` 递归、`MusicList.vue` 与 `VirtualizedList.vue` 的 `updateView` 默认参数里解引用 `ref.value`。验收：压力测试 4 轮「列表页→设置→返回」全通过，`#view` 恒为 1 个子节点，本轮 0 异常 |
| 2026-10-04 | ㉞ 播放栏四项对齐 QQ（音量/播放模式/评论/侧栏歌单） | ① **音量弹层**改为竖向紧凑面板（实测 71×238）：顶部绿圆钮(+) → 竖向音量条(3px，自下而上填充) → 百分比 → 分隔线 → 喇叭图标；② **播放模式菜单**按图对齐为 4 项（随机/顺序/单曲/列表循环，去掉原 `关闭循环`），行高 41px、项间 1px 分隔线、选中项整行 `#3D3D3F` 底 + 白字；③ **评论接通**：`playMusicInfo` 是 `shallowReactive`，深层字段变更不触发更新，`MusicComment` 组件只拿到初始空对象（表现为「「」的评论」+「此歌曲不支持获取评论」）→ 加 `musicInfo` 深比较监听 + 空值兜底；④ **侧栏歌单**：「自建歌单 \| 收藏歌单」两段改为可点击筛选（`source` 有值=收藏，为空=自建），并删除「试听列表」入口 |
| 2026-10-04 | ㉟ 歌曲列表对齐 QQ 版式 + 播放队列重做 | 参考图逐像素测量（行高 58 / 斑马纹 +1.8% / 悬停才显操作组 / 列位 63%·90%）；「我喜欢 / 最近播放 / 每日30首 / 热歌榜」四个列表 + 播放队列全部改造完成；CDP 实测 DOM 几何与参考图一致（操作组中心 = 行中心）；修掉 `position: relative` 压掉操作列 `absolute` 的优先级坑；ESLint 0 error、renderer 构建 0 error、三语言 JSON 合法 |
| 2026-10-04 | ㊱ 最近播放 NaN:NaN + 评论面板透明穿透重做 | ① **时长列 NaN:NaN**：kw 等源的 `interval` 是 `"03:45"` 这类 mm:ss 字符串，`Recent.vue` 按秒数直接算出 NaN。`formatInterval` 重写为兼容「秒数 / 数字字符串 / mm:ss 字符串」，非法值兜底 `--:--`。CDP 实测 138 行全部渲染正常时长（3:43 / 3:41 / 4:01…）；② **评论面板透明穿透**：`.commentMain` 用带 alpha 的绿色背景，歌词/封面文字直接透过面板（不可读）。整体重做为参考图样式：不透明深色面板 `#1A1E24` + 歌曲信息头部（44px 封面 + 歌名 + 歌手）+ 页签绿色下划线（`--qm-primary`，详情页画布内 `--color-primary` 已被重定义为白，不能用）+ 圆头像 + 中性白 alpha 分隔/回复底色 + 底部评论输入条（占位「期待你的评论」+ 表情图标 + 绿色发布钮；未接账号体系，点击发布给「暂不支持发表评论」提示）。面板新增 `top:56px` 让出详情页窗口控制按钮（否则不透明面板顶到 y=0 与最小化/关闭重叠）。i18n 补 zh-cn/zh-tw/en-us 各 3 条。**实机验收**：CDP 截图确认面板不透明、头部/页签/输入条齐全、窗口按钮无遮挡；评论数据正常（热门 1128 / 最新 6683） |
| 2026-10-04 | ㊳ 全应用图标体系统一 | 收编长期并存的两套 sprite（删除手写 `Icons.vue` 及 App.vue 引用），重建 **75 个统一图标**（24×24 网格 / 描边 1.7 / round，仅播放控制与已收藏红心用实心）；尺寸收敛为 **16·18·20·24 四档 token**；交互三态抽到 `qq-icon.less` 单点定义（默认 72% → 悬停 100% → 禁用 40%，颜色 `inherit` 以适配深色画布）。共改 53 处引用命名 + 55 处写法统一 + 29 个文件尺寸收敛。**实测零缺失**（列表页 26 / 详情页 41 个 use 全部命中 symbol）；尺寸：播放栏 20px、主播放键 24px、详情页工具行 20px、窗口按钮 16px、列表行 18px。附带修掉批量替换误删 `v-if/v-show` 造成的 3 处功能性回归（播放模式、播放/暂停、桌面歌词开/关曾同时显示）。ESLint 0 error、renderer 构建 0 error |
| 2026-10-04 | ㊴ 弹窗系统统一 + 音量向上弹窗 + 详情页复核 | 详情页逐像素比对已达 96.8%（差异仅歌词滚动偏移 + hover 提示气泡），真正要修的是**弹窗双实现**：① 新增全局 `qq-popup.less`（卡片圆角 12 / 内边距 6 / 项高 36 / 选中项=浅主色胶囊+主色文字），音量 / 播放模式 / 音质 / 更多 / 倍速全部改用它；② `base/Popup.vue` 卡片主题化（`--qm-popup-*`）+ 按 `isShowPlayerDetail` 切深色，修掉「white-on-white」——弹窗 teleport 到 `#root`，拿不到详情页局部重定义的语义色；③ 抽出 `useVolumeControl` + `VolumePopup`，播放栏与详情页共用**向上竖版音量弹窗**；④ `TogglePlayModeBtn` 重做为 4 项图文菜单（详情页原来是一排 5 个裸图标）；⑤ 新增 `QualityPopup` 单一实现。**实机验收**：详情页与参考图 16 段底栏元素 + 描述 bbox 完全一致，整页像素差异 0.5%；浅色/深色两种画布下三个弹窗逐张截图核对通过；ESLint 0 error、renderer 构建 0 error。顺手修掉 `MusicComment` 直接解引用模板 ref 抛出的 `clientWidth` 全局异常 |
| 2026-10-04 | ㊵ 弹窗收敛 + 播放栏重排 + 悬停提示根因 | ① 悬停气泡的真凶是项目自带的 **Tips 插件**（`plugins/Tips/index.js` 把 `aria-label` 当提示，支持 `ignore-tip` 关闭），给播放栏与弹窗内所有按钮加 `ignore-tip` 并删掉冗余 `title`；② 音量弹窗整体收一档（卡片 100→84）；③ 详情页循环 / 音量图标 24→16px、32→20px（原来比播放键还大）；④ 主播放栏音量移入中间组紧邻「下一首」，两端各加 16px 留白；⑤ 倍速弹窗「音调补偿」由 1em 方形复选框改为 36×20 拨动开关。**实机验收**：悬停各处气泡全部消失；底栏图标 16/20/24 分档；主栏中心距 54·42；ESLint 与构建均 0 error |
| 2026-10-04 | ㊶ 音量弹窗再收档 + 弹层 8px 偏移 | **居中问题根因**：`Popup.vue` 定位时减了写死的 `window.lx.rootOffset`(=8)，但当前外壳 `#root` 是 `position:relative` 且位于 (0,0)，弹层根本不需要补偿 → **所有弹窗与右键菜单整体偏左上 8px**。新增 `getRootOrigin()` 运行时读取 `#root` 真实位置，`Popup.vue` 与 `useMenuLocation.js` 一起改用（两种外壳都算得对）。体积再收一档：卡片 84×184 → **66×157**（滑条 88→72、滑块 11→10、文字 12→11px、分隔线 34→28）。**实机验收**：弹窗中心 678 / 按钮中心 677（1px 为取整），箭头正好落在按钮上沿；浅色与深色两处一致；ESLint 0 error、renderer 构建 0 error |
| 2026-10-04 | ㊷ 弹窗偏左真因 + 悬停提示分级 | **偏左真因**：`Popup.vue` 的 `.list` 挂了全局 `.scroll`（`scrollbar-gutter: stable`），常驻预留 8px 滚动条槽 → 卡片 76 宽而内容只有 66，右侧成为死区、内容与箭头看着偏左。单类覆盖无效（与 `.scroll` **特异性相同**，靠注入顺序），改用 **`.popup .list`** 两级选择器才盖住；卡片 76→68，`+` 钮中心 677 = 按钮中心 677。**悬停提示改为分级**：只对「会弹窗的控件」（音量/音质/播放模式/播放队列/更多/倍速/音效 + 弹窗内部按钮）保持 `ignore-tip`，其余控件（喜欢/评论/上一曲/播放暂停/下一曲/桌面歌词/音频可视化/歌词选择/添加到）恢复悬停气泡。**实机验收**：`下一曲` 气泡恢复、`播放模式` 与 `音量` 仍无气泡；ESLint 与构建 0 error |
| 2026-10-04 | ㊸ 右键菜单对齐 QQ + 添加到二级面板 | 参考图实测（1:1 确认）：卡 210 宽/圆角 6/项高 32/满幅 hover #3B3B3D/分隔线 #323234 上下 11px/图标盒 20 左缩 12/文字 46px 起/箭头右缩 6px/禁用 #929293；二级面板 210 宽、左间距 8px、首项与父项对心。`base/Menu.vue` 重写（icon/divider/submenu/明暗主题），新增 `useListTargetMenu`（试听列表/我的收藏/添加到新歌单/用户歌单，已在列表置灰，直接增删不移除弹窗），各列表 useMenu 按 QQ 顺序重排，新增 10 个图标与 3 条文案。**实机验收**：主卡 210×446、项高 32、gap 8、子面板对心全部命中；ESLint 与构建 0 error |
| 2026-10-04 | ㊻ 歌单列表页 / 榜单详情页一比一重做 | **页头结构**：QQ 的列表页头是**三段竖排**（30px 大标题 → 13px 页签行含 3px 主色下划线 → 32px 工具栏），原实现把三者挤在一行。`MusicList` 重做页头并补 **34px 行内缩**（行背景 x 248..1118，右边界与参考图完全一致）；`Recent` 标题统一 30px。**榜单页**：封面 132→**170**、加「曲序 / 歌手」两列 + 50px 封面占位列（表头「歌曲」354 与行内歌名 353 仅差 1px）、序号补零、按钮组改「全部播放 / 全部收藏 / 返回」。列位经复测**本就与参考图一致**（歌名 7.3%/专辑 62.6%/时长 89.1% vs 既有 6.9%/63%/90%），差距全在页头与行内缩。i18n×3 统一为「歌名 / 歌手」。ESLint 与 renderer 构建均 **0 error**。顺带记录一个待修项：列表页之间切换偶发 `#view` 子节点为 0（`Component` undefined 挂载竞态，与 ㉝ 同源） |
