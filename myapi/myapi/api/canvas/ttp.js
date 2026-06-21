import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export default {
  name: "Text to Image (White BG, Black Stroke)",
  description: "Create white background image with text using LemonMilk font",
  category: "Canvas",
  methods: ["GET"],
  params: ["text"],
  paramsSchema: {
    text: { type: "string", required: true, minLength: 1 },
  },

  async run(req, res) {
    try {
      const text = req.method === "GET" ? req.query.text : req.body.text;
      if (!text)
        return res.status(400).json({ error: 'Parameter "text" is required' });

      console.log(`🖋 Generating image with text: "${text}"`);

      // 🧩 Gunakan folder font di src/services/canvas/font
      const fontPath = path.join(
        process.cwd(),
        "src",
        "services",
        "canvas",
        "font",
        "LEMONMILK-Bold.otf"
      );

      if (!fs.existsSync(fontPath))
        return res.status(500).json({ error: "Font not found" });

      GlobalFonts.registerFromPath(fontPath, "LEMONMILK");

      // 🖼 Ukuran canvas
      const size = 400;
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext("2d");

      // 🔲 Latar belakang putih
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // ✍️ Gaya teks
      ctx.font = "bold 42px LEMONMILK";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;

      const x = size / 2;
      const y = size / 2;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);

      const buffer = canvas.toBuffer("image/png");

      // 🗂 Simpan ke folder sementara (/tmp, aman di Vercel)
      const uploadDir = path.join("/tmp", "files");
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });

      const fileName = crypto.randomBytes(16).toString("hex") + ".png";
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, buffer);

      const fileUrl = `${req.protocol}://${req.get("host")}/files/${fileName}`;

      // 🕓 Auto hapus setelah 5 menit
      setTimeout(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, 5 * 60 * 1000);

      res.json({
        results: { url: fileUrl, filename: fileName, mimetype: "image/png" },
        text,
        message: "✅ Text image created successfully!",
      });
    } catch (err) {
      console.error("❌ Text image error:", err);
      res.status(500).json({ error: err.message });
    }
  },
};
