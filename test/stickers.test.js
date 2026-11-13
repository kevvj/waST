const { test } = require('node:test')
const assert = require('node:assert')
const path = require('path')
const os = require('os')
const fs = require('fs/promises')
const { execFile } = require('child_process')
const { promisify } = require('util')
const sharp = require('sharp')
const ffmpegPath = require('ffmpeg-static')
const { parseCommand } = require('../src/commands')
const { imageToSticker, videoToSticker, SIZE, MAX_STATIC, MAX_ANIMATED } = require('../src/stickers')

test('parseCommand', () => {
  assert.deepStrictEqual(parseCommand('!ayuda'), { action: 'help' })
  assert.deepStrictEqual(parseCommand('!s'), { action: 'sticker', removeBg: false, text: '' })
  assert.deepStrictEqual(parseCommand('hazme un sticker'), { action: 'sticker', removeBg: false, text: '' })
  assert.deepStrictEqual(parseCommand('!sinfondo'), { action: 'sticker', removeBg: true, text: '' })
  assert.deepStrictEqual(parseCommand('!texto  Hola   mundo '), { action: 'sticker', removeBg: false, text: 'Hola mundo' })
  assert.deepStrictEqual(parseCommand('!sinfondo jaja'), { action: 'sticker', removeBg: true, text: 'jaja' })
  assert.strictEqual(parseCommand('hola'), null)
  assert.strictEqual(parseCommand(''), null)
  assert.strictEqual(parseCommand('!texto ' + 'a'.repeat(100)).text.length, 40)
})

async function photo() {
  // Imagen con ruido (pesa más que un color plano) para probar la reducción de calidad.
  const w = 1200, h = 800
  const raw = Buffer.alloc(w * h * 3)
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919) % 256
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).jpeg().toBuffer()
}

test('imagen → sticker 512x512 dentro del límite', async () => {
  const webp = await imageToSticker(await photo(), { text: 'Hola <mundo> & "amigos"' })
  const meta = await sharp(webp).metadata()
  assert.strictEqual(meta.format, 'webp')
  assert.strictEqual(meta.width, SIZE)
  assert.strictEqual(meta.height, SIZE)
  assert.ok(meta.hasAlpha)
  assert.ok(webp.length <= MAX_STATIC, `pesa ${webp.length} B`)
})

test('video → sticker animado de máximo 6 s', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wast-test-'))
  const mp4 = path.join(dir, 'v.mp4')
  await promisify(execFile)(ffmpegPath, ['-y', '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=30', '-t', '10', '-pix_fmt', 'yuv420p', mp4])
  const webp = await videoToSticker(await fs.readFile(mp4), { text: 'jaja' })
  await fs.rm(dir, { recursive: true, force: true })

  const meta = await sharp(webp, { animated: true }).metadata()
  assert.strictEqual(meta.format, 'webp')
  assert.strictEqual(meta.width, SIZE)
  assert.strictEqual(meta.pageHeight, SIZE)
  assert.ok(meta.pages > 1, 'debe ser animado')
  const seconds = meta.delay.reduce((a, b) => a + b, 0) / 1000
  assert.ok(seconds <= 6.2, `dura ${seconds} s`)
  assert.ok(webp.length <= MAX_ANIMATED, `pesa ${webp.length} B`)
})

test('quitar fondo con IA', { skip: !process.env.TEST_IA && 'TEST_IA=1 para probarlo (descarga el modelo)' }, async () => {
  // Círculo rojo sobre fondo blanco: tras quitar el fondo, la esquina debe quedar transparente.
  const svg = `<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="600" fill="white"/><circle cx="300" cy="300" r="200" fill="red"/></svg>`
  const webp = await imageToSticker(await sharp(Buffer.from(svg)).png().toBuffer(), { removeBg: true })
  const { data } = await sharp(webp).raw().toBuffer({ resolveWithObject: true })
  const alphaCorner = data[3]
  const alphaCenter = data[(256 * SIZE + 256) * 4 + 3]
  assert.ok(alphaCorner < 30, `esquina alfa ${alphaCorner}`)
  assert.ok(alphaCenter > 200, `centro alfa ${alphaCenter}`)
})
