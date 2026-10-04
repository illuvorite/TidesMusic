const path = require('path')
const mp3Meta = require('./mp3Meta')
const flacMeta = require('./flacMeta')

exports.setMeta = (filePath, meta, proxy) => {
  // 扩展名统一转小写，否则 .MP3 / .FLAC 会被静默跳过
  switch (path.extname(filePath).toLowerCase()) {
    case '.mp3':
      return mp3Meta(filePath, meta, proxy)
    case '.flac':
      return flacMeta(filePath, meta, proxy)
  }
}
