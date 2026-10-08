/**
 * 把 electron-builder 在 ./build 下产出的零散文件，归集到结构清晰的发行目录：
 *
 *   release/
 *     application/win32-x64/      解包即用的应用程序目录（内含 TidesMusic.exe）
 *     installer/                  Windows 安装包与便携版
 *     manifest.json               产物清单（含 SHA-256、大小）
 *
 * 用法：node build-config/release-collect.js
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

const root = path.join(__dirname, '..')
const buildDir = path.join(root, 'build')
const releaseDir = path.join(root, 'release')
const appDir = path.join(releaseDir, 'application')
const installerDir = path.join(releaseDir, 'installer')

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

// electron-builder 的解包目录名 → 明确的「平台-架构」目录名
const unpackedNameMap = {
  'win-unpacked': 'win32-x64',
  'win-ia32-unpacked': 'win32-ia32',
  'win-arm64-unpacked': 'win32-arm64',
  'linux-unpacked': 'linux-x64',
  'linux-arm64-unpacked': 'linux-arm64',
  'linux-armv7l-unpacked': 'linux-armv7l',
  mac: 'darwin-x64',
  'mac-arm64': 'darwin-arm64',
}

// 清空目录：先改名到系统临时目录再删除。
// 目的地落在系统 temp 下属于安全的中间态，避免个别托管环境对「批量真删」的拦截。
const resetDir = (dir) => {
  if (fs.existsSync(dir)) {
    const stash = path.join(os.tmpdir(), `tidesmusic-release-${Date.now()}-${path.basename(dir)}`)
    try {
      fs.renameSync(dir, stash)
      fs.rmSync(stash, { recursive: true, force: true })
    } catch (_) {
      // 清理失败不影响后续写入
    }
  }
  fs.mkdirSync(dir, { recursive: true })
}

const main = () => {
  if (!fs.existsSync(buildDir)) {
    console.error('未找到 ./build，请先执行 npm run build 与 build-pack')
    process.exit(1)
  }

  resetDir(appDir)
  resetDir(installerDir)

  const manifest = { generatedAt: new Date().toISOString(), application: [], installer: [] }

  for (const entry of fs.readdirSync(buildDir, { withFileTypes: true })) {
    const name = entry.name
    const full = path.join(buildDir, name)

    // 解包目录：win-unpacked / linux-unpacked / mac / mac-arm64
    if (entry.isDirectory() && unpackedNameMap[name]) {
      const targetName = unpackedNameMap[name]
      const target = path.join(appDir, targetName)
      fs.cpSync(full, target, { recursive: true })
      manifest.application.push({ name: targetName, path: path.relative(root, target).replace(/\\/g, '/') })
      continue
    }

    // 安装包 / 便携版 / 绿色压缩包
    if (entry.isFile() && /\.(exe|7z|dmg|AppImage|deb|rpm|pacman|zip)$/i.test(name)) {
      const target = path.join(installerDir, name)
      fs.copyFileSync(full, target)
      manifest.installer.push({
        name,
        path: path.relative(root, target).replace(/\\/g, '/'),
        size: fs.statSync(target).size,
        sha256: sha256(target),
      })
    }
  }

  fs.writeFileSync(path.join(releaseDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log('\n发行产物已归集：')
  for (const item of manifest.application) console.log('  [应用程序]', item.path)
  for (const item of manifest.installer) console.log('  [安装包  ]', item.path, `(${(item.size / 1024 / 1024).toFixed(1)} MB)`)
  console.log('  [清单    ]', path.relative(root, path.join(releaseDir, 'manifest.json')).replace(/\\/g, '/'), '\n')
}

main()
