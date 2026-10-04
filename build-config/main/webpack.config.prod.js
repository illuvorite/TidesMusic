const path = require('path')
const { merge } = require('webpack-merge')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const baseConfig = require('./webpack.config.base')

// const { dependencies } = require('../../package.json')

// const buildConfig = require('../webpack-build-config')


module.exports = merge(baseConfig, {
  mode: 'production',
  devtool: false,
  externals: {
    // undici 是纯 Node 侧的 HTTP 栈（无运行时依赖），不应打进主进程 bundle：
    // 它内置的 WebSocket 用私有类字段，被 webpack 打包后会出现
    // "Cannot read private member #handler from an object whose class did not declare it"，
    // 该异常在模块初始化阶段抛出，会导致打包版启动即崩（开发版不打包故不受影响）。
    // 改为运行时从 node_modules 加载；已同步加入 build-pack.js 的 files 白名单。
    undici: 'undici',
  },
  entry: {
    main: path.join(__dirname, '../../src/main/index.ts'),
    // 关键：让 webpack 同步打包 dbService worker（主进程 + worker 共享同一份编译链）
    'dbService.worker': path.join(__dirname, '../../src/main/worker/dbService/index.ts'),
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(__dirname, '../../src/main/modules/userApi/renderer/user-api.html'),
          to: path.join(__dirname, '../../dist/userApi/renderer/user-api.html'),
        },
        {
          // 主题背景图：与 dist/renderer/index.html 同目录，保证内置主题的
          // `url(./theme_images/xxx)` 相对路径在生产环境可解析
          from: path.join(__dirname, '../../src/common/theme/images/*').replace(/\\/g, '/'),
          to: path.join(__dirname, '../../dist/renderer/theme_images/[name][ext]'),
        },
      ],
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    }),
  ],
  performance: {
    maxEntrypointSize: 1024 * 1024 * 10,
    maxAssetSize: 1024 * 1024 * 20,
  },
  optimization: {
    minimize: false,
    // 关闭模块拼接（作用域提升）：拼接会让 undici 等库内部的 #private 字段类
    // 在跨模块作用域下 brand check 失败（"Cannot read private member #handler"），
    // 导致打包后的应用启动即崩溃
    concatenateModules: false,
  },
})
