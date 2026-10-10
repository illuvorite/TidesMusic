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

// 清空目录：先改名到**同盘**的临时位置再删除。
//
// ⚠️ 不能用 os.tmpdir()：本仓库在 D:，而系统 temp 通常落在 C:，
// fs.renameSync 跨盘会抛 EXDEV；异常被下面的 catch 吞掉后旧目录原样留下 ——
// 表现为 release/installer 里同时堆着历代版本的安装包（2026-10-10 实际踩到，
// 一度让发布脚本把 v2.12.2 的产物也当成待上传附件）。
// 改成同盘 stash 才能稳定搬走。删除失败不影响后续写入，只会留下一个 .stash-* 目录。
const resetDir = (dir) => {
  if (fs.existsSync(dir)) {
    const stash = path.join(path.dirname(dir), `.stash-${Date.now()}-${path.basename(dir)}`)
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
