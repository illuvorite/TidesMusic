// ============================================================
// 受保护文件：该文件已与 lx-music-desktop-2.12.2 同步，
// 包含修复音源切换卡在"初始化中"的关键逻辑。
// 未经授权不得修改。若需变更，请先移除本注释并联系相关负责人。
// ============================================================
process.env.NODE_ENV = 'development'

const chalk = require('chalk')
const electron = require('electron')
const path = require('path')
// const { say } = require('cfonts')
const { spawn } = require('child_process')
const net = require('net')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpackHotMiddleware = require('webpack-hot-middleware')

const mainConfig = require('./main/webpack.config.dev')
const rendererConfig = require('./renderer/webpack.config.dev')
const rendererLyricConfig = require('./renderer-lyric/webpack.config.dev')
const rendererScriptConfig = require('./renderer-scripts/webpack.config.dev')
const { Arch } = require('electron-builder')
const replaceLib = require('./build-before-pack')
const treeKill = require('tree-kill')
const { debounce } = require('./utils')

let electronProcess = null
let hotMiddlewareRenderer
let hotMiddlewareRendererLyric


function startRenderer() {
  return new Promise((resolve, reject) => {
    // rendererConfig.entry.renderer = [path.join(__dirname, 'dev-client')].concat(rendererConfig.entry.renderer)
    // rendererConfig.mode = 'development'
    const compiler = webpack(rendererConfig)
    hotMiddlewareRenderer = webpackHotMiddleware(compiler, {
      log: false,
      heartbeat: 2500,
    })

    compiler.hooks.compilation.tap('compilation', compilation => {
      // console.log(Object.keys(compilation.hooks))
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync('html-webpack-plugin-after-emit', (data, cb) => {
        hotMiddlewareRenderer.publish({ action: 'reload' })
        cb()
      })
    })

    // compiler.hooks.done.tap('done', stats => {
    //   // logStats('Renderer', 'Compile done')
    //   // logStats('Renderer', stats)
    // })

    const server = new WebpackDevServer({
      port: 9080,
      hot: true,
      historyApiFallback: true,
      static: {
        directory: path.join(__dirname, '../src/common/theme/images'),
        publicPath: '/theme_images',
      },
      client: {
        logging: 'warn',
        // 关闭运行时报错浮层：HMR 热替换瞬间的报错会盖住整个界面，干扰开发调试
        overlay: false,
      },
      setupMiddlewares(middlewares, devServer) {
        devServer.app.use(hotMiddlewareRenderer)
        setImmediate(() => {
          devServer.middleware.waitUntilValid(resolve)
        })

        return middlewares
      },
    }, compiler)

    server.start()
  })
}

function startRendererLyric() {
  return new Promise((resolve, reject) => {
    // rendererConfig.entry.renderer = [path.join(__dirname, 'dev-client')].concat(rendererConfig.entry.renderer)
    // rendererConfig.mode = 'development'
    const compiler = webpack(rendererLyricConfig)
    hotMiddlewareRendererLyric = webpackHotMiddleware(compiler, {
      log: false,
      heartbeat: 2500,
    })

    compiler.hooks.compilation.tap('compilation', compilation => {
      // console.log(Object.keys(compilation.hooks))
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync('html-webpack-plugin-after-emit', (data, cb) => {
        hotMiddlewareRendererLyric.publish({ action: 'reload' })
        cb()
      })
    })

    // compiler.hooks.done.tap('done', stats => {
    //   // logStats('Renderer', 'Compile done')
    //   // logStats('Renderer', stats)
    // })

    const server = new WebpackDevServer({
      port: 9081,
      hot: true,
      historyApiFallback: true,
      // static: {
      //   directory: path.join(__dirname, '../'),
      // },
      client: {
        logging: 'warn',
        // 关闭运行时报错浮层：HMR 热替换瞬间的报错会盖住整个界面，干扰开发调试
        overlay: false,
      },
      setupMiddlewares(middlewares, devServer) {
        devServer.app.use(hotMiddlewareRenderer)
        setImmediate(() => {
          devServer.middleware.waitUntilValid(resolve)
        })
        return middlewares
      },
    }, compiler)

    server.start()
  })
}

function startRendererScripts() {
  return new Promise((resolve, reject) => {
    // mainConfig.entry.main = [path.join(__dirname, '../src/main/index.dev.js')].concat(mainConfig.entry.main)
    // mainConfig.mode = 'development'
    const compiler = webpack(rendererScriptConfig)

    compiler.watch({}, (err, stats) => {
      if (err) {
        console.log(err)
        return
      }
      resolve()
    })
  })
}

function startMain() {
  let firstRun = true
  let lastHash = null
  return new Promise((resolve, reject) => {
    // mainConfig.entry.main = [path.join(__dirname, '../src/main/index.dev.js')].concat(mainConfig.entry.main)
    // mainConfig.mode = 'development'
    // 重启 electron 前留足端口释放时间：--inspect=5858 若仍被上一个实例占用，
    // 新实例会 EADDRINUSE 直接退出（表现为 dev 启动几秒后整体消失）
    const runElectronDelay = debounce(startElectron, 1500)
    const compiler = webpack(mainConfig)

    compiler.hooks.watchRun.tapAsync('watch-run', (compilation, done) => {
      hotMiddlewareRenderer.publish({ action: 'compiling' })
      hotMiddlewareRendererLyric.publish({ action: 'compiling' })
      done()
    })

    compiler.watch({}, (err, stats) => {
      if (err) {
        console.log(err)
        reject(err)
        return
      }

      // logStats('Main', stats)
      // 编译产物没变化时不要重启：watch 在冷启动时可能多回调一次，
      // 白白 kill 掉刚起来的实例（表现为 dev 启动几秒后应用消失）。
      // 但实例已经不在（崩溃/被外部杀掉）时必须拉起，否则 dev 会一直空转。
      const hash = stats?.hash ?? null
      if (firstRun) {
        firstRun = false
        lastHash = hash
        resolve()
        return
      }
      if (hash && hash === lastHash && electronProcess) return
      lastHash = hash

      // 重启前必须等旧实例真正退出：它的 --inspect=5858 还占着端口时，
      // 新实例会 EADDRINUSE 直接退出（表现为 dev 启动几秒后整体消失）
      const restarting = !!electronProcess
      if (restarting) {
        const oldProcess = electronProcess
        electronProcess = null
        oldProcess.removeAllListeners()
        oldProcess.once('exit', () => runElectronDelay())
        treeKill(oldProcess.pid, () => runElectronDelay())
      }
      if (!restarting) runElectronDelay()
    })
  })
}

const INSPECT_PORT = 5858

// 等待调试端口释放：上一个实例刚被 kill 时端口可能还没释放，
// 此时启动新实例会因 EADDRINUSE 直接退出，进而把整个 dev 带崩
const waitPortFree = (port, timeout = 10000) => new Promise(resolve => {
  const start = Date.now()
  const check = () => {
    const server = net.createServer()
    server.once('error', () => {
      if (Date.now() - start > timeout) return resolve(false)
      setTimeout(check, 300)
    })
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  }
  check()
})

const startElectron = async() => {
  if (!await waitPortFree(INSPECT_PORT)) {
    console.log(chalk.yellow(`port ${INSPECT_PORT} is busy, skip start electron`))
    return
  }
  let args = [
    `--inspect=${INSPECT_PORT}`,
    // 'NODE_ENV=development',
    path.join(__dirname, '../dist/main.js'),
  ]

  // detect yarn or npm and process commandline args accordingly
  const npmExecPath = process.env.npm_execpath || ''
  if (npmExecPath.endsWith('yarn.js')) {
    args = args.concat(process.argv.slice(3))
  } else if (npmExecPath.endsWith('npm-cli.js')) {
    args = args.concat(process.argv.slice(2))
  }

  // 部分开发环境（CI / 容器宿主 / 沙箱 shell）会预设 ELECTRON_RUN_AS_NODE=1。
  // 此时 electron.exe 会退化为纯 Node 运行：require('electron') 只返回 exe 路径字符串，
  // 主进程读 app 立即崩（Cannot read properties of undefined (reading 'requestSingleInstanceLock')）。
  // dev 场景必然要真实 Electron 运行时，这里显式剔除该变量。
  const electronEnv = { ...process.env }
  delete electronEnv.ELECTRON_RUN_AS_NODE

  electronProcess = spawn(electron, args, { env: electronEnv })

  electronProcess.stdout.on('data', data => {
    electronLog(data, 'blue')
  })
  electronProcess.stderr.on('data', data => {
    electronLog(data, 'red')
  })

  // 打印退出码/signal：Electron 异常退出（如 STATUS_BREAKPOINT -2147483645）时
  // 之前是静默 process.exit()，只能看到 dev 整体消失，无法判断是谁退的。
  electronProcess.on('close', (code, signal) => {
    console.log(chalk.yellow(`[dev] electron exited (code=${code}, signal=${signal})`))
    process.exit(code ?? 0)
  })
}

const logs = [
  'Manifest version 2 is deprecated, and support will be removed in 2023',
  '"Extension server error: Operation failed: Permission denied", source: devtools://devtools/bundled',

  // https://github.com/electron/electron/issues/32133
  '"Electron sandbox_bundle.js script failed to run"',
  '"TypeError: object null is not iterable (cannot read property Symbol(Symbol.iterator))",',
]
function electronLog(data, color) {
  let log = data.toString()
  if (/[0-9A-z]+/.test(log)) {
    // 抑制某些无关的报错日志
    if (color == 'red' && typeof log === 'string' && logs.some(l => log.includes(l))) return

    console.log(chalk[color](log))
  }
}

function init() {
  const Spinnies = require('spinnies')
  const spinners = new Spinnies({ color: 'blue' })
  spinners.add('main', { text: 'main compiling' })
  spinners.add('renderer', { text: 'renderer compiling' })
  spinners.add('renderer-lyric', { text: 'renderer-lyric compiling' })
  spinners.add('renderer-scripts', { text: 'renderer-scripts compiling' })
  function handleSuccess(name) {
    spinners.succeed(name, { text: name + ' compile success!' })
  }
  function handleFail(name) {
    spinners.fail(name, { text: name + ' compile fail!' })
  }
  replaceLib({ electronPlatformName: process.platform, arch: Arch[process.arch] })

  Promise.all([
    startRenderer().then(() => handleSuccess('renderer')).catch((err) => {
      console.error(err.message)
      return handleFail('renderer')
    }),
    startRendererLyric().then(() => handleSuccess('renderer-lyric')).catch((err) => {
      console.error(err.message)
      return handleFail('renderer-lyric')
    }),
    startRendererScripts().then(() => handleSuccess('renderer-scripts')).catch((err) => {
      console.error(err.message)
      return handleFail('renderer-scripts')
    }),
    startMain().then(() => handleSuccess('main')).catch(() => handleFail('main')),
  ]).then(startElectron).catch(err => {
    console.error(err)
  })
}

init()
