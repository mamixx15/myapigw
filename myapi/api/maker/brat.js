import { createCanvas, registerFont } from "canvas";
import path from "path";
import fs from "fs"; // ✅ tambahkan ini!

export default {
  name: "Maker - Brat",
  description: "Generate image from text with dynamic font size and word wrapping",
  category: "Maker",
  methods: ["GET"],
  params: ["text"],
  paramsSchema: {
    text: { type: "string", required: false, description: "Teks yang akan ditulis ke gambar" },
  },

  async run(req, res) {
    try {
      const text = req.query.text || "hallo 😎🔥";

      const width = 500;
      const height = 500;
      const padding = 25;

      // ✅ Font utama
      const FONT_NAME = "Arial";
      const FONT_FILE = "arial.ttf";
      const fontPath = path.join(process.cwd(), "src", "services", "canvas", "font", FONT_FILE);

      if (fs.existsSync(fontPath)) {
        registerFont(fontPath, { family: FONT_NAME });
      } else {
        console.warn(`⚠️ Font file not found at: ${fontPath}. Using fallback font.`);
      }

      // ✅ Font emoji (biar emoji tampil)
      const EMOJI_FONT_FILE = "NotoColorEmoji.ttf";
      const emojiFontPath = path.join(process.cwd(), "src", "services", "canvas", "font", EMOJI_FONT_FILE);

      if (fs.existsSync(emojiFontPath)) {
        registerFont(emojiFontPath, { family: "NotoColorEmoji" });
      } else {
        console.warn("⚠️ Emoji font (NotoColorEmoji.ttf) tidak ditemukan. Emoji mungkin tidak muncul.");
      }

      const canvas = createCanvas(width, height);
      const context = canvas.getContext("2d");

      context.fillStyle = "white";
      context.fillRect(0, 0, width, height);

      context.fillStyle = "black";
      context.textAlign = "left";
      context.textBaseline = "top";

      // 🔠 Font dinamis + emoji support
      let fontSize = 150;
      let lines;

      do {
        context.font = `${fontSize}px "${FONT_NAME}", "NotoColorEmoji"`;
        const lineHeight = fontSize * 1.2;
        const maxWidth = width - padding * 2;
        const words = text.split(" ");
        let currentLine = "";
        lines = [];

        for (const word of words) {
          const testLine = currentLine + word + " ";
          const metrics = context.measureText(testLine);
          if (metrics.width > maxWidth && currentLine.length > 0) {
            lines.push(currentLine.trim());
            currentLine = word + " ";
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine.trim());

        const totalTextHeight = lines.length * lineHeight;
        if (totalTextHeight > height - padding * 2) fontSize -= 5;
        else break;
      } while (fontSize > 10);

      const lineHeight = fontSize * 1.2;
      for (let i = 0; i < lines.length; i++) {
        context.fillText(lines[i], padding, padding + i * lineHeight);
      }

      const buffer = canvas.toBuffer("image/png");
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": buffer.length,
      });
      res.end(buffer);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message || "Gagal membuat gambar",
      });
    }
  },
};
