const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const { parseCommand, HELP } = require('./src/commands')
const { imageToSticker, videoToSticker } = require('./src/stickers')

const STICKER_META = { stickerAuthor: 'waST', stickerName: 'waST bot' }

// LocalAuth guarda la sesión en .wwebjs_auth: solo hay que escanear el QR la primera vez.
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox'] },
})

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true })
  console.log('Escanea este QR con WhatsApp para conectar el bot.')
})

client.on('ready', () => console.log('Bot listo y conectado a WhatsApp.'))
client.on('disconnected', (reason) => console.log('Desconectado:', reason))

const isVideo = (mime) => mime.startsWith('video/') || mime === 'image/gif'
const isImage = (mime) => mime.startsWith('image/')

// Busca el archivo: el del propio mensaje o el del mensaje al que responde.
async function getMediaMessage(message) {
  if (message.hasMedia) return message
  if (message.hasQuotedMsg) {
    const quoted = await message.getQuotedMessage()
    if (quoted.hasMedia) return quoted
  }
  return null
}

client.on('message', async (message) => {
  const command = parseCommand(message.body)

  if (command?.action === 'help') return message.reply(HELP)

  const mediaMsg = await getMediaMessage(message)
  if (!mediaMsg) {
    if (command) await message.reply('Envía o responde a una imagen o video con ese comando. Escribe *!ayuda* para ver los comandos.')
    return
  }

  const media = await mediaMsg.downloadMedia()
  if (!media) return message.reply('No pude descargar el archivo. Intenta enviarlo de nuevo.')

  const mime = media.mimetype || ''
  // Como en la versión anterior: los videos se convierten siempre; las imágenes solo con un comando.
  const options = command ?? (isVideo(mime) ? { action: 'sticker', removeBg: false, text: '' } : null)
  if (!options) return

  const started = Date.now()
  try {
    const input = Buffer.from(media.data, 'base64')
    let webp
    if (isVideo(mime)) {
      if (options.removeBg) await message.reply('Quitar el fondo solo funciona con imágenes; hago el sticker normal.')
      webp = await videoToSticker(input, options)
    } else if (isImage(mime)) {
      if (options.removeBg) await message.reply('Quitando el fondo con IA...')
      webp = await imageToSticker(input, options)
    } else {
      return message.reply('Ese tipo de archivo no se puede convertir en sticker.')
    }

    const sticker = new MessageMedia('image/webp', webp.toString('base64'), 'sticker.webp')
    await message.reply(sticker, undefined, { sendMediaAsSticker: true, ...STICKER_META })
    console.log(`Sticker enviado (${mime}, ${(webp.length / 1024).toFixed(0)} KB, ${Date.now() - started} ms)`)
  } catch (err) {
    console.error('Error al crear el sticker:', err)
    await message.reply('Hubo un problema al crear el sticker. Prueba con otro archivo.')
  }
})

client.initialize()
