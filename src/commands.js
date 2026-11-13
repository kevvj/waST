// Interpreta el texto que acompaña a una imagen o video (o la respuesta a un mensaje citado).

const MAX_TEXT = 40

const HELP = [
  '*waST – comandos*',
  '',
  'Envía una imagen, GIF o video con uno de estos textos (o responde a uno con el comando):',
  '',
  '*!s* o *sticker* – lo convierte en sticker',
  '*!sinfondo* – quita el fondo con IA y hace el sticker',
  '*!texto Hola* – sticker con un texto abajo',
  '*!sinfondo Hola* – sin fondo y con texto',
  '*!ayuda* – muestra este mensaje',
  '',
  'Los videos se recortan a 6 segundos.',
].join('\n')

/**
 * Devuelve { action, removeBg, text } o null si el mensaje no es para el bot.
 * action: 'help' | 'sticker'
 */
function parseCommand(body = '') {
  const raw = body.trim()
  const lower = raw.toLowerCase()

  if (lower === '!ayuda' || lower === '!help') return { action: 'help' }

  const match = raw.match(/^!(s|sticker|sinfondo|texto)\b\s*(.*)$/is)
  if (match) {
    const cmd = match[1].toLowerCase()
    const text = cleanText(match[2])
    if (cmd === 'texto' && !text) return { action: 'sticker', removeBg: false, text: '' }
    return { action: 'sticker', removeBg: cmd === 'sinfondo', text: cmd === 's' || cmd === 'sticker' ? '' : text }
  }

  // Compatibilidad con la versión anterior: basta con que el texto diga "sticker".
  if (/\bsticker\b/i.test(raw)) return { action: 'sticker', removeBg: false, text: '' }

  return null
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT)
}

module.exports = { parseCommand, HELP, MAX_TEXT }
