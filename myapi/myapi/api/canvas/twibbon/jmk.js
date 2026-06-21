import multer from "multer";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// gunakan penyimpanan sementara di /tmp (bukan process.cwd())
const upload = multer({ storage: multer.memoryStorage() });
const uploadDir = path.join("/tmp", "files");

// pastikan folder /tmp/files ada
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default {
  name: "Tribun JMK48",
  description: "Create JMK 2025 twibbon with circular frame",
  category: "Canvas",
  methods: ["POST"],
  params: ["file"],
  paramsSchema: {
    file: { type: "file", required: true },
  },

  async run(req, res) {
    try {
      // handle file upload
      await new Promise((resolve, reject) => {
        upload.single("file")(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (!req.file)
        return res.status(400).json({ success: false, error: "No file uploaded" });

      const allowedMimes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedMimes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
        });
      }

      // load frame lokal
      const framePath = path.join(process.cwd(), "src", "services", "canvas", "tribunJMK.jpg");
      if (!fs.existsSync(framePath)) {
        return res.status(500).json({
          success: false,
          error: "Frame image not found. Please ensure tribunJMK.jpg exists in src/services/canvas/",
        });
      }

      const [frameImg, userImg] = await Promise.all([
        loadImage(fs.readFileSync(framePath)),
        loadImage(req.file.buffer),
      ]);

      // buat canvas ukuran sama dengan frame
      const canvas = createCanvas(frameImg.width, frameImg.height);
      const ctx = canvas.getContext("2d");

      // posisi dan ukuran lingkaran
      const centerX = canvas.width / 2;
      const centerY = Math.round(canvas.height * 0.5);
      const radius = Math.round(canvas.width * 0.4);

      // potong jadi lingkaran
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // gambar foto user
      ctx.drawImage(userImg, centerX - radius, centerY - radius, radius * 2, radius * 2);
      ctx.restore();

      // gambar frame overlay
      ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

      // simpan ke buffer
      const buffer = canvas.toBuffer("image/png");

      // simpan di /tmp
      const randomName = `tribunjmk_${crypto.randomBytes(8).toString("hex")}.png`;
      const filePath = path.join(uploadDir, randomName);
      fs.writeFileSync(filePath, buffer);

      // buat URL publik
      const fileUrl = `${req.protocol}://${req.get("host")}/files/${randomName}`;

      // auto hapus 5 menit kemudian
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error("Error deleting file:", err);
          }
        }
      }, 5 * 60 * 1000);

      // kirim response
      res.json({
        success: true,
        results: {
          url: fileUrl,
          filename: randomName,
          mimetype: "image/png",
          size: buffer.length,
        },
        dimensions: {
          width: canvas.width,
          height: canvas.height,
        },
        message: "JMK48 Twibbon created successfully!",
      });
    } catch (err) {
      console.error("Image processing error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Image processing failed",
      });
    }
  },
};
