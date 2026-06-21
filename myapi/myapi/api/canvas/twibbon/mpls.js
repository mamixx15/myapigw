import multer from "multer";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const upload = multer({ storage: multer.memoryStorage() });

// Folder simpan sementara — aman di Vercel
const uploadDir = path.join("/tmp", "files");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default {
  name: "MPLS Twibbon Maker",
  description: "Create MPLS 2025 twibbon with circular frame",
  category: "Canvas",
  methods: ["POST"],
  params: ["file"],
  paramsSchema: {
    file: { type: "file", required: true },
  },

  async run(req, res) {
    try {
      // Handle upload
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

      // Pastikan frame ada
      const framePath = path.join(process.cwd(), "src", "services", "canvas", "tribunMPLS.jpg");
      if (!fs.existsSync(framePath)) {
        return res.status(500).json({
          success: false,
          error: "Frame image not found. Ensure tribunMPLS.jpg exists in src/services/canvas/",
        });
      }

      // Load frame & foto user
      const [frameImg, userImg] = await Promise.all([
        loadImage(fs.readFileSync(framePath)),
        loadImage(req.file.buffer),
      ]);

      const canvas = createCanvas(frameImg.width, frameImg.height);
const ctx = canvas.getContext("2d");

// 🧭 Posisi lebih ke atas biar pas dengan lingkaran frame
const circleX = canvas.width / 2;
const circleY = canvas.height / 2 - 110; // ⬆️ Naik 60px dari tengah
const radius = Math.min(canvas.width, canvas.height) * 0.35;

// Crop foto biar tetap square
const aspect = userImg.width / userImg.height;
let srcX, srcY, srcW, srcH;
if (aspect > 1) {
  srcH = userImg.height;
  srcW = userImg.height;
  srcX = (userImg.width - srcW) / 2;
  srcY = 0;
} else {
  srcW = userImg.width;
  srcH = userImg.width;
  srcX = 0;
  srcY = (userImg.height - srcH) / 2;
}

// 🔵 Gambar foto user ke lingkaran
ctx.save();
ctx.beginPath();
ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
ctx.closePath();
ctx.clip();

ctx.drawImage(
  userImg,
  srcX,
  srcY,
  srcW,
  srcH,
  circleX - radius,
  circleY - radius,
  radius * 2,
  radius * 2
);
ctx.restore();

// 🟡 Tambahkan frame overlay
ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

      // Hasilkan buffer
      const buffer = canvas.toBuffer("image/png");

      // Simpan ke /tmp
      const randomName = `mpls_${crypto.randomBytes(8).toString("hex")}.png`;
      const filePath = path.join(uploadDir, randomName);
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `${req.protocol}://${req.get("host")}/files/${randomName}`;

      // Hapus otomatis setelah 5 menit
      setTimeout(() => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, 5 * 60 * 1000);

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
        message: "📸 Twibbon MPLS 2025 created successfully!",
      });
    } catch (err) {
      console.error("MPLS Twibbon processing error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Twibbon processing failed",
      });
    }
  },
};
