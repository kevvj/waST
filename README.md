# waST

Bot de WhatsApp que convierte imágenes, GIF y videos en stickers. Puede quitar el fondo con IA y poner un texto sobre el sticker.

## Comandos

Envía una imagen, GIF o video con uno de estos textos, o responde a uno que ya esté en el chat:

| Comando | Qué hace |
|---|---|
| `!s` o `sticker` | Lo convierte en sticker |
| `!sinfondo` | Quita el fondo con IA y hace el sticker |
| `!texto Hola` | Sticker con un texto abajo (máx. 40 caracteres) |
| `!sinfondo Hola` | Sin fondo y con texto |
| `!ayuda` | Lista los comandos |

Los videos se convierten aunque no lleven comando, se recortan a 6 segundos y se vuelven stickers animados.

## Cómo funciona

- **Imágenes**: `sharp` las ajusta a 512x512 con fondo transparente y baja la calidad del WebP hasta que pese menos de 100 KB (límite de WhatsApp).
- **Videos y GIF**: `ffmpeg` (incluido con `ffmpeg-static`) genera un WebP animado y reduce FPS y calidad hasta quedar bajo 500 KB.
- **Quitar fondo**: modelo de segmentación ONNX de `@imgly/background-removal-node`, ejecutado en local (no se envían imágenes a ningún servicio). La primera vez tarda más porque carga el modelo.
- **Sesión**: `LocalAuth` la guarda en `.wwebjs_auth/`, así que el QR solo se escanea una vez.
- Cada mensaje usa su propia carpeta temporal, así que varias conversiones a la vez no se pisan.

## Tecnologías

Node.js 20+, whatsapp-web.js, sharp, ffmpeg, ONNX Runtime (IA en local).

## Uso

```bash
git clone https://github.com/kevvj/waST
cd waST
npm install
npm start
```

Escanea el QR que aparece en la terminal desde WhatsApp (Dispositivos vinculados).

## Pruebas

```bash
npm test              # comandos, imagen → sticker y video → sticker animado
TEST_IA=1 npm test    # además, quitar el fondo con IA (carga el modelo)
```

## Estructura

```
index.js            conexión con WhatsApp y manejo de mensajes
src/commands.js     interpretación de comandos
src/stickers.js     conversión de imágenes y videos
test/               pruebas con node:test
```

## Licencia

AGPL-3.0, porque la librería de quitar fondos (`@imgly/background-removal-node`) usa esa licencia.
