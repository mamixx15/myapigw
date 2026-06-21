import { createCanvas, registerFont } from "canvas";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { execFileSync } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

export default {
  name: "Maker - Brat Animated",
  description: "Generate animated video from text (typewriter style)",
  category: "Maker",
  methods: ["GET"],
  params: ["text"],
  paramsSchema: {
    text: {
      type: "string",
      required: false,
      description: "Teks yang akan dianimasikan",
    },
  },

  async run(req, res) {
    try {
      const text = req.query.text || "hallo 😊";
      const width = 500;
      const height = 500;
      const padding = 25;

      // ✅ Register font utama
      const FONT_NAME = "Arial";
      const FONT_FILE = "arial.ttf";
      const fontPath = path.join(process.cwd(), "src", "services", "canvas", "font", FONT_FILE);

      if (fs.existsSync(fontPath)) {
        registerFont(fontPath, { family: FONT_NAME });
      } else {
        console.warn(`⚠️ Font file not found at: ${fontPath}. Using fallback font.`);
      }

      // ✅ Tambahkan font emoji (NotoColorEmoji)
      const emojiFontPath = path.join(process.cwd(), "src", "services", "canvas", "font", "NotoColorEmoji.ttf");
      if (fs.existsSync(emojiFontPath)) {
        registerFont(emojiFontPath, { family: "NotoColorEmoji" });
      } else {
        console.warn("⚠️ Emoji font (NotoColorEmoji.ttf) tidak ditemukan, emoji mungkin tidak tampil.");
      }

      // 📂 Temp folder untuk frame
      const tempDir = path.join("/tmp", "files");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const sessionId = crypto.randomBytes(6).toString("hex");
      const frameDir = path.join(tempDir, `frames_${sessionId}`);
      fs.mkdirSync(frameDir, { recursive: true });

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      const totalFrames = text.length;

      for (let i = 0; i < totalFrames; i++) {
        // background putih
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "black";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        let fontSize = 150;
        let lines;
        const partialText = text.substring(0, i + 1);

        do {
          ctx.font = `${fontSize}px "${FONT_NAME}", "NotoColorEmoji"`;
          const lineHeight = fontSize * 1.2;
          const maxWidth = width - padding * 2;
          const words = partialText.split(" ");
          let currentLine = "";
          lines = [];

          for (const word of words) {
            const testLine = currentLine + word + " ";
            const metrics = ctx.measureText(testLine);
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
        for (let j = 0; j < lines.length; j++) {
          ctx.fillText(lines[j], padding, padding + j * lineHeight);
        }

        const framePath = path.join(frameDir, `frame_${String(i + 1).padStart(3, "0")}.png`);
        fs.writeFileSync(framePath, canvas.toBuffer("image/png"));
      }

      // 🎥 Gabungkan frame jadi video
      const videoFile = path.join(tempDir, `video_${crypto.randomBytes(6).toString("hex")}.mp4`);

      try {
        execFileSync(ffmpegInstaller.path, [
          "-y",
          "-framerate", "6",
          "-pattern_type", "glob",
          "-i", `${frameDir}/frame_*.png`,
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          videoFile,
        ]);
      } catch (err) {
        console.error("FFmpeg Error:", err.message);
        return res.status(500).json({
          success: false,
          error: "Gagal membuat video animasi",
          details: err.message,
        });
      }

      // URL hasil
      const domain = `${req.protocol}://${req.get("host")}`;
      const fileUrl = `${domain}/files/${path.basename(videoFile)}`;

      // auto hapus
      setTimeout(() => {
        try {
          if (fs.existsSync(videoFile)) fs.unlinkSync(videoFile);
          fs.rmSync(frameDir, { recursive: true, force: true });
        } catch {}
      }, 10 * 60 * 1000);

      res.json({
        statusCode: 200,
        results: {
          url: fileUrl,
          filename: path.basename(videoFile),
          mimetype: "video/mp4",
          frames: totalFrames,
        },
        text,
        message: "🎬 Animated text video created successfully!",
      });
    } catch (err) {
      console.error("Maker animation error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Gagal membuat animasi teks",
      });
    }
  },
};
