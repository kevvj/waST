const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { exec } = require('child_process');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');

const client = new Client();

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

        // Si es un video
        if (media.mimetype.startsWith('video/mp4')) {
            try {
                console.log('📹 Video recibido. Guardando archivo...');

                // Guardar el video temporalmente
                const videoPath = path.join(__dirname, 'temp_video.mp4');
                fs.writeFileSync(videoPath, Buffer.from(media.data, 'base64'));

                // Ruta de salida del sticker
                const stickerPath = path.join(__dirname, 'temp_sticker.webp');

                // Verificar las dimensiones del video usando ffprobe
                ffprobe(videoPath, { path: ffprobeStatic.path }, async (err, info) => {
                    if (err) {
                        console.error("❌ Error al obtener información del video:", err);
                        return message.reply("❌ Hubo un problema al analizar el video.");
                    }

                    const { width, height } = info.streams[0];
                    console.log(`📏 Dimensiones del video: ${width}x${height}`);

                    // Función para convertir el video a sticker con calidad ajustable
                    const convertToSticker = (quality, callback) => {
                        exec(`ffmpeg -y -i "${videoPath}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease, pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0, format=rgba" -loop 0 -an -q:v ${quality} "${stickerPath}"`, (error, stdout, stderr) => {
                            
                            callback(error, stdout, stderr);
                        });
                    };

                    // Función recursiva para reducir la calidad del sticker si es demasiado grande
                    const reduceStickerSize = async (quality) => {
                        convertToSticker(quality, async (error, stdout, stderr) => {
                            if (error) {
                                console.error(`❌ Error en FFmpeg: ${stderr}`);
                                return message.reply("❌ Hubo un problema al convertir el video.");
                            }

                            const stickerSize = fs.statSync(stickerPath).size;
                            console.log(`📏 Tamaño del sticker después de reducir la calidad a ${quality}:`, stickerSize);

                            if (stickerSize <= 1000000) {
                                const sticker = MessageMedia.fromFilePath(stickerPath);
                                await message.reply(sticker, undefined, { sendMediaAsSticker: true });
                                console.log('✅ Sticker enviado exitosamente');
                                // Limpiar archivos temporales
                                fs.unlinkSync(videoPath);
                                fs.unlinkSync(stickerPath);
                            } else if (quality > 10) {
                                console.log('🔧 Intentando reducir la calidad aún más...');
                                reduceStickerSize(quality - 5);
                            } else {
                                console.error("❌ El sticker sigue siendo demasiado grande.");
                                return message.reply("❌ El tamaño del sticker es demasiado grande incluso después de intentar reducir la calidad.");
                            }
                        });
                    };

                    // Asegurarse de que las dimensiones no sean demasiado grandes para FFmpeg
                    if (width > 512 || height > 512) {
                        console.log('🔧 Ajustando dimensiones del video...');
                        convertToSticker(75, async (error, stdout, stderr) => {
                            if (error) {
                                console.error(`❌ Error en FFmpeg: ${stderr}`);
                                return message.reply("❌ Hubo un problema al convertir el video.");
                            }

                            console.log('✅ Conversión completada. Verificando sticker...');

                            // Verificar si el sticker es válido
                            if (fs.existsSync(stickerPath) && fs.statSync(stickerPath).size > 0) {
                                const stickerSize = fs.statSync(stickerPath).size;
                                console.log('📏 Tamaño del sticker:', stickerSize);

                                // Intentar reducir el tamaño del sticker si es demasiado grande
                                if (stickerSize > 1000000) {
                                    console.log('🔧 El sticker es demasiado grande. Intentando reducir el tamaño...');
                                    reduceStickerSize(70);
                                } else {
                                    const sticker = MessageMedia.fromFilePath(stickerPath);
                                    await message.reply(sticker, undefined, { sendMediaAsSticker: true });
                                    console.log('✅ Sticker enviado exitosamente');
                                    
                                    fs.unlinkSync(videoPath);
                                    fs.unlinkSync(stickerPath);
                                }
                            } else {
                                console.error("❌ El sticker no es válido.");
                                return message.reply("❌ Hubo un problema con el sticker.");
                            }
                        });
                    } else {
                        console.log('🔧 Video dentro de las dimensiones correctas, procesando directamente...');
                        convertToSticker(75, async (error, stdout, stderr) => {
                            if (error) {
                                console.error(`❌ Error en FFmpeg: ${stderr}`);
                                return message.reply("❌ Hubo un problema al convertir el video.");
                            }

                            console.log('✅ Conversión completada. Verificando sticker...');

                            // Verificar si el sticker es válido
                            if (fs.existsSync(stickerPath) && fs.statSync(stickerPath).size > 0) {
                                const stickerSize = fs.statSync(stickerPath).size;
                                console.log('📏 Tamaño del sticker:', stickerSize);

                                // Intentar reducir el tamaño del sticker si es demasiado grande
                                if (stickerSize > 1000000) {
                                    console.log('🔧 El sticker es demasiado grande. Intentando reducir el tamaño...');
                                    reduceStickerSize(70);
                                } else {
                                    const sticker = MessageMedia.fromFilePath(stickerPath);
                                    await message.reply(sticker, undefined, { sendMediaAsSticker: true });
                                    console.log('✅ Sticker enviado exitosamente');
                                    // Limpiar archivos temporales
                                    fs.unlinkSync(videoPath);
                                    fs.unlinkSync(stickerPath);
                                }
                            } else {
                                console.error("❌ El sticker no es válido.");
                                return message.reply("❌ Hubo un problema con el sticker.");
                            }
                        });
                    }
                });

            } catch (err) {
                console.error("❌ Error al manejar el archivo de video:", err);
                // Limpiar archivos temporales en caso de error
                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath);
            }
        } else if (media.mimetype.startsWith('image/') && message.body.toLowerCase().includes('sticker')) {
            try {
                console.log('🖼️ Imagen recibida. Guardando archivo...');

                // Guardar la imagen temporalmente
                const imagePath = path.join(__dirname, 'temp_image.png');
                fs.writeFileSync(imagePath, Buffer.from(media.data, 'base64'));

                // Ruta de salida del sticker
                const stickerPath = path.join(__dirname, 'temp_sticker.webp');

                // Convertir la imagen a sticker
                exec(`ffmpeg -y -i "${imagePath}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease, pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0, format=rgba" -loop 0 -an -q:v 75 "${stickerPath}"`, async (error, stdout, stderr) => {
                    if (error) {
                        console.error(`❌ Error en FFmpeg: ${stderr}`);
                        return message.reply("❌ Hubo un problema al convertir la imagen.");
                    }

                    const sticker = MessageMedia.fromFilePath(stickerPath);
                    await message.reply(sticker, undefined, { sendMediaAsSticker: true });
                    console.log('✅ Sticker enviado exitosamente');
                    // Limpiar archivos temporales
                    fs.unlinkSync(imagePath);
                    fs.unlinkSync(stickerPath);
                });

            } catch (err) {
                console.error("❌ Error al manejar el archivo de imagen:", err);
                // Limpiar archivos temporales en caso de error
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath);
            }
        } else {
            console.log('⚠️ El archivo recibido no es un video MP4 ni una imagen con la palabra "sticker".');
        }
    }
});

client.initialize();
