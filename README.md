<h1 align="center">LX Music 桌面版（Fork）</h1>

<p align="center">基于落雪音乐助手（LX Music Desktop）二次开发。</p>

<p align="center">原项目：https://github.com/lyswhut/lx-music-desktop</p>

## 关于本项目

本项目是基于 [lyswhut/lx-music-desktop](https://github.com/lyswhut/lx-music-desktop) 的二次开发版本，遵循 Apache License 2.0。原项目由原作者开发与维护，本仓库仅在原项目基础上进行二次开发与个性化定制。

- 项目地址：https://github.com/illuvorite/lx-music
- 原项目地址：https://github.com/lyswhut/lx-music-desktop

## 技术栈

- Electron 40（Electron 40.9.2）
- Vue 3.3
- Webpack 5
- LESS
- TypeScript

构建脚本全部位于 `build-config/` 目录。

已支持的平台：

- Linux
- macOS
- Windows 7 及以上

## 用户界面

<p><img width="100%" src="./doc/images/app.png" alt="lx-music desktop UI"></p>

## 贡献代码

本项目欢迎 PR，但为了 PR 能顺利合并，需要注意以下几点：

- 对于添加新功能的 PR，建议在提交 PR 前先创建 Issue 进行说明，以确认该功能是否确实需要。
- 对于修复 bug 的 PR，请提供修复前后的说明及重现方式。
- 对于其他类型的 PR，则适当附上说明。

贡献代码步骤：

1. 参照下方「源码使用方法」设置开发环境；
2. 克隆本仓库代码并切换至 `dev` 分支进行开发；
3. 提交 PR 至 `dev` 分支。

## 源码使用方法

本节说明本项目的依赖安装、开发启动与构建打包方式，命令行示例均在仓库根目录执行。

### 环境要求

| 项目 | 要求 |
| --- | --- |
| Node.js | `>= 22`（`package.json` 的 `engines` 字段） |
| 包管理器 | 推荐 **pnpm**（仓库带 `pnpm-workspace.yaml`，脚本按 `pnpm <script>` 书写），npm / yarn 也可 |
| C++ 生成工具 | 仅 Windows 编译原生模块时需要（Visual Studio 生成工具）；Linux 需要 `build-essential`，macOS 需要 Xcode CLT |

### 安装依赖

```bash
pnpm install
```

安装过程中的几个注意点：

- **Electron 二进制需手动触发下载**：`pnpm-workspace.yaml` 的 `allowBuilds` 关闭了 `electron` 的安装脚本，安装完依赖后需执行一次

  ```bash
  node node_modules/electron/install.js
  ```

  国内网络可加速：`$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"`（Windows PowerShell），
  对应 npm 配置键也可写作 `.npmrc` 中的 `electron_mirror=...`。

- **原生模块**：
  - `better-sqlite3` 会优先使用预编译产物（Electron ABI 与 `node_modules/better-sqlite3/build/Release/better_sqlite3.node` 对应），无需本地编译。
  - `qrc_decode` 不需要自行编译，`build-config/lib/` 内置了各平台/架构的 `.node` 预编译文件，dev 与 pack 前会由 `build-config/build-before-pack.js` 自动拷贝到 `build/Release/qrc_decode.node`。
  - `bufferutil` / `utf-8-validate` 是 `ws` 的可选性能依赖，缺少 C++ 生成工具时 `node-gyp` 报错可忽略，不影响启动；如不想看到该报错，安装 Visual Studio 生成工具后重新 `pnpm install` 即可。

### 启动开发环境

```bash
pnpm dev
```

等价于 `node --max-http-header-size=200000 build-config/runner-dev.js`，它会：

1. 并行启动 4 个 webpack 编译任务：
   - `main`（主进程，输出到 `dist/main.js`）
   - `renderer`（渲染进程，webpack-dev-server 端口 **9080**）
   - `renderer-lyric`（桌面歌词窗口，端口 **9081**）
   - `renderer-scripts`（用户脚本 / preload 等）
2. 将预编译的 `qrc_decode.node` 拷入 `build/Release/`；
3. 全部编译完成后自动拉起 Electron，加载 `dist/main.js`，主进程调试端口 `5858`（可用 chrome://inspect 连接）；
4. 修改代码自动生效：渲染进程走 HMR，主进程改动会 `tree-kill` 旧进程并自动重启 Electron。

首次编译约需 1~3 分钟（renderer 产物约 20 MB）。关闭应用时在终端 `Ctrl + C` 即可。

### 构建产物

```bash
pnpm build              # 全量构建，清空 dist/、build/ 后重新编译 4 个目标
pnpm build:main         # 只构建主进程
pnpm build:renderer     # 只构建渲染进程
pnpm build:renderer-lyric     # 只构建桌面歌词窗口
pnpm build:renderer-scripts   # 只构建用户脚本 / preload
```

说明：

- `pnpm build` 即 `node build-config/pack.js`，它同时编译 4 个目标，但**不**做安装包打包。
- 单独构建子目标（如 `pnpm build:main`）会通过 `build-config/setenv.js NODE_ENV=production -- webpack --config ...` 执行，不会清空 `dist/`。
- 主题数据为构建产物：修改 `src/common/theme/createThemes.js` 后需执行 `pnpm build:theme` 重新生成 `src/common/theme/index.json`。

### 打包安装包

打包前会先执行 `pnpm build`，产物输出到 `build/` 目录。

```bash
pnpm pack               # Windows x64 安装包（setup）
pnpm pack:win           # Windows 全架构 setup + 7z 绿色版
pnpm pack:win:setup:x64     # Windows x64 安装包
pnpm pack:win:portable      # Windows 便携版
pnpm pack:win:7z            # Windows 绿色版（7z）
pnpm pack:win7:setup:x64    # Windows 7 专用安装包
pnpm pack:linux         # deb / AppImage / rpm / pacman
pnpm pack:mac           # dmg（x64 + arm64）
pnpm pack:dir           # 仅输出免安装目录，适合快速验证打包结果
```

可选架构参数通过 `build-config/build-pack.js` 传入，例如：

```bash
node build-config/build-pack.js target=win arch=x64 type=setup
```

### 其他常用命令

```bash
pnpm lint         # ESLint 检查 src 目录
pnpm lint:fix     # ESLint 自动修复
```

### 常见问题

- **端口 9080 / 9081 被占用**：修改 `build-config/runner-dev.js` 中两个 `WebpackDevServer` 的 `port`。
- **`Electron failed to install correctly`**：Electron 二进制缺失，执行 `node node_modules/electron/install.js`。
- **`Could not find any Visual Studio installation to use`**：Windows 缺少 C++ 生成工具，仅影响 `bufferutil` 等可选原生模块，可忽略；需彻底解决请安装 Visual Studio 生成工具。
- **webpack 报 `Failed to load plugin 'import' / '@typescript-eslint'`**：`eslint-config-standard(-with-typescript)` 的 peer 依赖缺失，执行
  `pnpm add -D eslint-plugin-import eslint-plugin-n eslint-plugin-promise @typescript-eslint/eslint-plugin@^6 @typescript-eslint/parser@^6` 即可消除，不影响应用运行（当前仓库已内置）。
- **修改主题后样式不生效**：主题色阶是预生成的，需运行 `pnpm build:theme`。

## 数据存储目录

默认情况下，软件的数据存储在：

- Linux：`$XDG_CONFIG_HOME/lx-music-desktop` 或 `~/.config/lx-music-desktop`
- macOS：`~/Library/Application Support/lx-music-desktop`
- Windows：`%APPDATA%/lx-music-desktop`

在 Windows 平台上，若程序文件夹中存在 `portable` 文件夹，则自动使用此文件夹作为数据存储文件夹（适用于 v1.17.0 及以上版本）。

## 项目协议

本项目基于 [Apache License 2.0](https://github.com/illuvorite/lx-music/blob/master/LICENSE) 许可证发行，以下协议是对于 Apache License 2.0 的补充，如有冲突，以以下协议为准。

---

*词语约定：本协议中的"本项目"指基于落雪音乐助手（LX Music Desktop）二次开发的桌面版项目；"原项目"指原 [lyswhut/lx-music-desktop](https://github.com/lyswhut/lx-music-desktop) 项目；"使用者"指签署本协议的使用者；"官方音乐平台"指对本项目内置的包括酷我、酷狗、咪咕等音乐源的官方平台统称；"版权数据"指包括但不限于图像、音频、名字等在内的他人拥有所属版权的数据。*

### 一、数据来源

1.1 本项目的各官方平台在线数据来源原理是从其公开服务器中拉取数据（与未登录状态在官方平台 APP 获取的数据相同），经过对数据简单地筛选与合并后进行展示，因此本项目不对数据的合法性、准确性负责。

1.2 本项目本身没有获取某个音频数据的能力，本项目使用的在线音频数据来源来自软件设置内"自定义源"设置所选择的"源"返回的在线链接。例如播放某首歌，本项目所做的只是将希望播放的歌曲名、艺术家等信息传递给"源"，若"源"返回了一个链接，则本项目将认为这就是该歌曲的音频数据而进行使用，至于这是不是正确的音频数据本项目无法校验其准确性，所以使用本项目的过程中可能会出现希望播放的音频与实际播放的音频不对应或者无法播放的问题。

1.3 本项目的非官方平台数据（例如"我的列表"内列表）来自使用者本地系统或者使用者连接的同步服务，本项目不对这些数据的合法性、准确性负责。

### 二、版权数据

2.1 使用本项目的过程中可能会产生版权数据。对于这些版权数据，本项目不拥有它们的所有权。为了避免侵权，使用者务必在 **24 小时内** 清除使用本项目的过程中所产生的版权数据。

### 三、音乐平台别名

3.1 本项目内的官方音乐平台别名为本项目内对官方音乐平台的一个称呼，不包含恶意。如果官方音乐平台觉得不妥，可联系本项目更改或移除。

### 四、资源使用

4.1 本项目内使用的部分包括但不限于字体、图片等资源来源于互联网。如果出现侵权可联系本项目移除。

### 五、免责声明

5.1 由于使用本项目产生的包括由于本协议或由于使用或无法使用本项目而引起的任何性质的任何直接、间接、特殊、偶然或结果性损害（包括但不限于因商誉损失、停工、计算机故障或故障引起的损害赔偿，或任何及所有其他商业损害或损失）由使用者负责。

### 六、使用限制

6.1 本项目完全免费，且开源发布于 GitHub 面向全世界人用作对技术的学习交流。本项目不对项目内的技术可能存在违反当地法律法规的行为作保证。

6.2 **禁止在违反当地法律法规的情况下使用本项目。** 对于使用者在明知或不知当地法律法规不允许的情况下使用本项目所造成的任何违法违规行为由使用者承担，本项目不承担由此造成的任何直接、间接、特殊、偶然或结果性责任。

### 七、版权保护

7.1 音乐平台不易，请尊重版权，支持正版。

### 八、非商业性质

8.1 本项目仅用于对技术可行性的探索及研究，不接受任何商业（包括但不限于广告等）合作及捐赠。

### 九、接受协议

9.1 若你使用了本项目，即代表你接受本协议。