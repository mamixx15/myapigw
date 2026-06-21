import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

export default {
  name: "Animated Text Video",
  description: "Generate anime maid holding paper with typewriter text animation",
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

      const baseImagePath = path.join(
        process.cwd(),
        "src",
        "services",
        "canvas",
        "brat_nime.jpg"
      );
      const fontPath = path.join(
        process.cwd(),
        "src",
        "services",
        "canvas",
        "font",
        "LEMONMILK-Bold.otf"
      );

      if (!fs.existsSync(baseImagePath))
        return res.status(500).json({ error: "Base image not found" });
      if (!fs.existsSync(fontPath))
        return res.status(500).json({ error: "Font not found" });

      GlobalFonts.registerFromPath(fontPath, "LEMONMILK");

      // Temp folder di /tmp
      const tempDir = path.join("/tmp", "files");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const sessionId = crypto.randomBytes(6).toString("hex");
      const frameDir = path.join(tempDir, `frames_${sessionId}`);
      fs.mkdirSync(frameDir, { recursive: true });

      const baseImage = await loadImage(fs.readFileSync(baseImagePath));
      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext("2d");

      const totalFrames = text.length;
      for (let i = 0; i < totalFrames; i++) {
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
        ctx.font = `bold ${Math.floor(canvas.height * 0.05)}px LEMONMILK`;
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const partialText = text.substring(0, i + 1);
        ctx.strokeText(partialText, canvas.width / 2, canvas.height / 2 + canvas.height * 0.14);
        ctx.fillText(partialText, canvas.width / 2, canvas.height / 2 + canvas.height * 0.14);
        
        const framePath = path.join(
          frameDir,
          `frame_${String(i + 1).padStart(3, "0")}.png`
        );
        fs.writeFileSync(framePath, canvas.toBuffer("image/png"));
      }

      // Buat video
      const videoFile = path.join(tempDir, `video_${crypto.randomBytes(6).toString("hex")}.mp4`);
      try {
        execFileSync(ffmpegInstaller.path, [
          "-y",
          "-framerate", "6", // 6 fps biar halus
          "-pattern_type", "glob",
          "-i", `${frameDir}/frame_*.png`,
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          videoFile,
        ]);
      } catch (err) {
        console.error("FFmpeg Error:", err.message);
        return res.status(500).json({
          statusCode: 500,
          error: "Failed to create animated video",
          details: err.message,
        });
      }

      const domain = `${req.protocol}://${req.get("host")}`;
      const fileUrl = `${domain}/files/${path.basename(videoFile)}`;

      // Hapus setelah 5 menit
      setTimeout(() => {
        try {
          if (fs.existsSync(videoFile)) fs.unlinkSync(videoFile);
          fs.rmSync(frameDir, { recursive: true, force: true });
        } catch {}
      }, 5 * 60 * 1000);

      res.json({
        statusCode: 200,
        results: {
          url: fileUrl,
          filename: path.basename(videoFile),
          mimetype: "video/mp4",
          frames: totalFrames,
        },
        text,
        message: "Animated video created successfully!",
      });

    } catch (err) {
      console.error("Video generation error:", err);
      res.status(500).json({
        statusCode: 500,
        error: "Failed to create animated video",
        details: err.message,
      });
    }
  },
};
