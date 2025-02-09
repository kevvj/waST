const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

const client = new Client({
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

// Generar el QR para conectarse
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea este QR para conectar el bot.');
});

// Cuando el cliente esté listo
client.on('ready', () => {
    console.log('¡Bot listo y conectado a WhatsApp!');
});

// Detecta mensajes entrantes
client.on('message', async (message) => {
    if (message.hasMedia) {
        const media = await message.downloadMedia();
        
        if (message.body.toLowerCase().includes('sticker')) { // Si el mensaje contiene la palabra 'sticker'
            const image = media.data;
            const imagePath = path.join(__dirname, 'sticker.jpg');

            // Guardar la imagen recibida
            fs.writeFileSync(imagePath, image, 'base64');

            // Crear el sticker
            const sticker = MessageMedia.fromFilePath(imagePath);
            await message.reply(sticker, undefined, { sendMediaAsSticker: true });

            // Eliminar la imagen después de convertirla en sticker
            fs.unlinkSync(imagePath);
        }
    }
});

// Iniciar la conexión
client.initialize();
