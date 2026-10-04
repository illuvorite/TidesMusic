# 更新日志

本项目是基于 [lyswhut/lx-music-desktop](https://github.com/lyswhut/lx-music-desktop) 的二次开发版本。

> 原项目更新日志：[lyswhut/lx-music-desktop CHANGELOG](https://github.com/lyswhut/lx-music-desktop/blob/master/CHANGELOG.md)。
> 本项目的同步基线为原项目 v2.12.2。本日志仅记录基于该基线的二次开发变更。

---

## 二次开发记录

### 未发布

- 新增「本地音乐」视图与本地音乐 worker，支持本地歌曲导入与管理
- 新增「搜索 → 视频/电台」媒体列表视图
- 新增播放历史模块（主线程 dbService、worker、store、Modal）
- 新增音质覆盖（qualityOverride / localLibraryModal / listTrash 等状态）
- 重构「音效」按钮：拆分为 EqPanel / PitchPanel / AdvancedPanel / PresetTiles / ui 子组件
- 调整主题、搜索框、列表与设置面板 UI
- 新增常用 Modal：EmptyState / ListTrash / LocalMusicInfo / MusicComment / MusicQuality
- 清理已删除的 HomeSidebar 与 Home/Recent 视图
- .gitignore 增补 AI 工作目录与一次性审计报告
- 移除原作者展示与官方更新信息，仅保留"基于落雪音乐的二次开发"声明

---

## 基线版本

本仓库基线同步自原项目 v2.12.2，更早的版本历史请查阅原项目 CHANGELOG。