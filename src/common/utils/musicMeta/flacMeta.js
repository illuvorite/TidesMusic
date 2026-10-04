const fs = require('fs')
const fsPromises = fs.promises
const path = require('path')
const getImgSize = require('image-size')
const download = require('./downloader')

const FlacProcessor = require('./flac-metadata/index')

const extReg = /^(\.(?:jpe?g|png)).*$/
const vendor = 'reference libFLAC 1.2.1 20070917'

const writeMeta = async(filePath, meta, picPath) => {
  const comments = Object.keys(meta).map(key => `${key.toUpperCase()}=${meta[key] || ''}`)
  const data = {
    vorbis: {
      vendor,
      comments,
    },
  }
  if (picPath) {
    const apicData = await fsPromises.readFile(picPath)
    let imgSize = getImgSize(apicData)
    let mime_type
    let bitsPerPixel
    if (apicData[0] == 0xff && apicData[1] == 0xd8 && apicData[2] == 0xff) {
      mime_type = 'image/jpeg'
      bitsPerPixel = 24
    } else {
      mime_type = 'image/png'
      bitsPerPixel = 32
    }
    data.picture = {
      pictureType: 3,
      mimeType: mime_type,
      description: '',
      width: imgSize.width,
      height: imgSize.height,
      bitsPerPixel,
      colors: 0,
      pictureData: apicData,
    }
  }

  const reader = fs.createReadStream(filePath)
  const tempPath = filePath + '.lxmtemp'
  const writer = fs.createWriteStream(tempPath)
  const flacProcessor = new FlacProcessor()
  flacProcessor.writeMeta(data)

  return new Promise((resolve, reject) => {
    let settled = false
    const fail = (err) => {
      if (settled) return
      settled = true
      fs.unlink(tempPath, () => {})
      reject(err)
    }
    // 任一环节出错都必须 reject，否则调用方的 await 会永久挂起
    reader.on('error', fail)
    writer.on('error', fail)
    flacProcessor.on('error', fail)

    writer.on('finish', () => {
      if (settled) return
      settled = true
      // 直接 rename 覆盖原文件（POSIX rename 与 Windows MoveFileEx 均为原子替换）。
      // 旧实现先 unlink 再 rename，两步之间崩溃会导致原歌曲永久丢失。
      fs.rename(tempPath, filePath, err => {
        if (err) {
          fs.unlink(tempPath, () => {})
          reject(err)
          return
        }
        resolve()
      })
    })

    reader.pipe(flacProcessor).pipe(writer)
  })
}

module.exports = (filePath, meta, proxy) => {
  if (!meta.APIC) return writeMeta(filePath, meta)
  let picUrl = meta.APIC
  delete meta.APIC
  if (!/^http/.test(picUrl)) {
    return writeMeta(filePath, meta)
  }
  let ext = path.extname(picUrl)
  let picPath = filePath.replace(/\.flac$/, '') + (ext ? ext.replace(extReg, '$1') : '.jpg')

  if (picUrl.includes('music.126.net')) picUrl += `${picUrl.includes('?') ? '&' : '?'}param=500y500`
  return download(picUrl, picPath, proxy).then(success => {
    if (!success) return writeMeta(filePath, meta)
    return writeMeta(filePath, meta, picPath).finally(() => {
      fs.unlink(picPath, err => {
        if (err) console.log(err.message)
      })
    })
  })
}

