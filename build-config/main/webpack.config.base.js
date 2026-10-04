// ============================================================
// 同步自 lx-music-desktop-2.12.2 的配置；
// 此外本仓库在 externals 中加入了 `electron: 'commonjs2 electron'`
// 以确保 webpack 5 把 `import { app } from 'electron'` 编译为直接
// `require('electron')` 而非内联 stub（webpack 5 默认 target=electron-main
// 不会把 electron 自动 externalize）。
// ============================================================
const path = require('path')
const ESLintPlugin = require('eslint-webpack-plugin')
const { NormalModuleReplacementPlugin } = require('webpack')

const isDev = process.env.NODE_ENV === 'development'

module.exports = {
  target: 'electron-main',
  output: {
    filename: '[name].js',
    library: {
      type: 'commonjs2',
    },
    path: path.join(__dirname, '../../dist'),
  },
  externals: {
    'electron-is-dev': 'electron-is-dev',
    'font-list': 'font-list',
    'better-sqlite3': 'better-sqlite3',
    'electron-font-manager': 'electron-font-manager',
    bufferutil: 'bufferutil',
    'utf-8-validate': 'utf-8-validate',
    // Electron 主进程入口必须把 electron 模块外部化（Electron runtime 注入），
    // 否则 webpack 5 会把 `import { app } from 'electron'` 编译成对 undefined 访问，
    // 启动即崩 (TypeError: Cannot read properties of undefined (reading 'app'))。
    electron: 'commonjs2 electron',
    'qrc_decode.node': isDev ? path.join(__dirname, '../../build/Release/qrc_decode.node') : path.join('../build/Release/qrc_decode.node'),
  },
  resolve: {
    alias: {
      '@main': path.join(__dirname, '../../src/main'),
      '@renderer': path.join(__dirname, '../../src/renderer'),
      '@lyric': path.join(__dirname, '../../src/renderer-lyric'),
      '@common': path.join(__dirname, '../../src/common'),
    },
    extensions: ['.tsx', '.ts', '.js', '.mjs', '.json', '.node'],
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        use: 'node-loader',
      },
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            appendTsSuffixTo: [/\.vue$/],
          },
        },
        parser: {
          worker: [
            '*audioContext.audioWorklet.addModule()',
            '...',
          ],
        },
      },
    ],
  },
  plugins: [
    new ESLintPlugin(),
    ...(isDev ? [new NormalModuleReplacementPlugin(/^electron$/, path.join(__dirname, 'mock/electron.js'))] : []),
  ],
}
