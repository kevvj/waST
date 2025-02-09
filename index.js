const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: "/usr/bin/google-chrome-stable",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu"
        ],
    }
});

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("Bot conectado y listo para usar!");
});

client.on("message", async (message) => {
    if (message.hasMedia && message.body.toLowerCase() === "sticker") {
        const media = await message.downloadMedia();
        client.sendMessage(message.from, media, { sendMediaAsSticker: true });
    }
});

client.initialize();

// 🔹 Servidor Express para mantener Replit activo
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot activo 🚀"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en el puerto ${PORT}`));
