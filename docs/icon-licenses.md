# 第三方图标许可声明

`src/renderer/assets/svgs/` 下的图标分两批来源：本项目原有绘制（无第三方声明），
以及从下列开源图标集引入的图标。引入时统一做了改造：文件名加来源前缀
（`tabler-` / `lucide-`）、`stroke-width` 统一为 `1.7` 以对齐项目现有描边图标、
剥离上游的 `class` 属性与包围盒 `<path>`。

按 ISC / MIT 的要求，此处保留原始版权与许可声明。

---

## Tabler Icons（133 个，文件名前缀 `tabler-`）

- 来源：<https://github.com/tabler/tabler-icons>
- 取用目录：`@tabler/icons/icons/outline`
- 许可：MIT

```
MIT License

Copyright (c) 2020-present Paweł Kuna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Lucide（89 个，文件名前缀 `lucide-`）

- 来源：<https://github.com/lucide-icons/lucide>
- 取用目录：`lucide-static/icons`
- 许可：ISC

```
ISC License

Copyright (c) Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

> Lucide 中继承自 Feather 项目的那部分图标由 Cole Bemis 以 MIT 发布；
> 本次引入的音频类图标不涉及该子集。

---

## 命名冲突与前缀

`svg-sprite-loader` 以 `icon-[name]` 生成 symbol id，同名会**静默覆盖**
（后引入的赢）。两套图标集与项目原有图标存在重名 —— `album`、`headphones`、
`music`、`playlist-add`、`volume-off` —— 因此一律加来源前缀规避。
前缀同时承担溯源作用：看文件名即可知道原始出处。

新增图标沿用 `<svg-icon name="tabler-vinyl" />` 的调用方式，无需改任何配置
（`src/renderer/plugins/SvgIcon/index.js` 用 `require.context` 自动注册）。

---

## 替换清单（语义错位修正）

以下位置原先用的图标与功能不符，已换成本文件开头两个图标集中的对应图形。
**原图标文件保留未删**（`arrow-left-circle-outline` / `hexagon-outline` /
`tshirt` / `gamepad`），只是不再被引用 —— 上一轮图标重构删图时漏改了引用，
导致 22 处 `<use xlink:href="#icon-...">` 静默渲染为空；保留文件可避免同类事故。

| 位置 | 原图标 | 换成 | 原因 |
| --- | --- | --- | --- |
| 侧栏底部 · 设置 | `hexagon-outline` | `lucide-settings` | 纯六边形不表意 |
| 侧栏底部 · 主题装扮 | `tshirt` | `lucide-palette` | T 恤与主题无关 |
| 侧栏底部 · 更新日志 | `gamepad` | `lucide-file-text` | 手柄与更新日志无关 |
| 侧栏底部 · 折叠/展开 | `arrow-left-circle-outline` | `lucide-panel-left-close` / `lucide-panel-left-open` | 改为跟随折叠状态切换方向 |
| 设置页 · 数据同步 | `loop`（文件已缺失） | `lucide-refresh-cw` | 补回失效引用 |
| 设置页 · 网络设置 | `plex`（文件已缺失） | `tabler-wifi` | 补回失效引用 |
| 侧栏 · 排行榜 | `plex`（文件已缺失） | `lucide-trophy` | 补回失效引用 |
| 本地音乐 · 目录列表 | `list-ordered`（文件已缺失） | `lucide-list-ordered` | 补回失效引用 |
| 侧栏 · 我的歌单 | `phone`（文件已缺失） | `tabler-phone` | 补回失效引用（语义仍偏，待后续调整） |
| 各设置页 · `?` 提示 | `help-circle-outline`（文件已缺失） | `lucide-circle-help` | 补回 16 处失效引用 |

「文件已缺失」指上一轮图标重构删除后**引用未同步**，在界面上表现为空白。