// Conversión de imágenes y videos a stickers WebP de 512x512.

const fs = require('fs/promises')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const sharp = require('sharp')
const ffmpegPath = require('ffmpeg-static')

const run = promisify(execFile)

const SIZE = 512
const MAX_STATIC = 100 * 1024 // límite de WhatsApp para stickers estáticos
const MAX_ANIMATED = 500 * 1024 // límite de WhatsApp para stickers animados
const MAX_SECONDS = 6
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

let removeBackgroundFn = null
async function removeBackground(buffer) {
  if (!removeBackgroundFn) {
    // Se carga solo cuando se usa: el modelo de IA tarda en iniciar.
    removeBackgroundFn = require('@imgly/background-removal-node').removeBackground
  }
  const png = await sharp(buffer).png().toBuffer()
  const blob = await removeBackgroundFn(new Blob([png], { type: 'image/png' }), { model: 'small', output: { format: 'image/png' } })
  return Buffer.from(await blob.arrayBuffer())
}

function escapeXml(text) {
  return text.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])
}

// Texto blanco con borde negro en la parte de abajo, como los stickers clásicos.
function captionSvg(text) {
  const fontSize = text.length > 22 ? 40 : text.length > 14 ? 52 : 64
  return Buffer.from(`<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <text x="50%" y="${SIZE - 28}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold"
    font-size="${fontSize}" fill="white" stroke="black" stroke-width="${Math.round(fontSize / 8)}" paint-order="stroke">${escapeXml(text)}</text>
</svg>`)
}

/** Imagen (cualquier formato que lea sharp) → WebP estático de 512x512 con fondo transparente. */
async function imageToSticker(input, { removeBg = false, text = '' } = {}) {
  let buffer = removeBg ? await removeBackground(input) : input

  let img = sharp(buffer).rotate().resize(SIZE, SIZE, { fit: 'contain', background: TRANSPARENT }).ensureAlpha()
  if (text) img = sharp(await img.png().toBuffer()).composite([{ input: captionSvg(text) }])

  const base = await img.png().toBuffer()
  for (const quality of [90, 75, 60, 45, 30]) {
    const out = await sharp(base).webp({ quality, alphaQuality: 80 }).toBuffer()
    if (out.length <= MAX_STATIC) return out
  }
  return sharp(base).resize(384, 384).extend({ top: 64, bottom: 64, left: 64, right: 64, background: TRANSPARENT }).webp({ quality: 30 }).toBuffer()
}

/** Video o GIF → WebP animado de 512x512, máximo 6 s, reduciendo calidad hasta que pese menos de 500 KB. */
async function videoToSticker(input, { text = '' } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wast-'))
  try {
    const src = path.join(dir, 'entrada')
    const out = path.join(dir, 'sticker.webp')
    await fs.writeFile(src, input)

    let caption = ''
    if (text) {
      const capPath = path.join(dir, 'texto.png')
      await sharp(captionSvg(text)).png().toFile(capPath)
      caption = capPath
    }

    for (const [fps, quality] of [[15, 70], [12, 55], [10, 40], [8, 30], [8, 20]]) {
      const scale = `fps=${fps},scale=${SIZE}:${SIZE}:force_original_aspect_ratio=decrease,pad=${SIZE}:${SIZE}:(ow-iw)/2:(oh-ih)/2:color=black@0,format=rgba`
      const args = ['-y', '-t', String(MAX_SECONDS), '-i', src]
      if (caption) args.push('-i', caption, '-filter_complex', `[0:v]${scale}[v];[v][1:v]overlay=0:0`)
      else args.push('-vf', scale)
      args.push('-t', String(MAX_SECONDS), '-vcodec', 'libwebp', '-loop', '0', '-an', '-q:v', String(quality), '-compression_level', '4', out)

      await run(ffmpegPath, args, { maxBuffer: 10 * 1024 * 1024 })
      const data = await fs.readFile(out)
      if (data.length <= MAX_ANIMATED) return data
    }
    throw new Error('El sticker sigue pesando demasiado incluso con la calidad mínima.')
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

module.exports = { imageToSticker, videoToSticker, captionSvg, SIZE, MAX_STATIC, MAX_ANIMATED, MAX_SECONDS }
