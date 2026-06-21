import multer from "multer";
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
  name: "File Upload",
  description: "Endpoint for uploading files (auto delete after 3 hour)",
  category: "Tools",
  methods: ["POST"],
  params: ["file"],
  paramsSchema: {
    file: { type: "file", required: true },
  },

  async run(req, res) {
    try {
      await new Promise((resolve, reject) => {
        upload.single("file")(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });
      }

      // buat nama file acak
      const randomName =
        crypto.randomBytes(16).toString("hex") +
        path.extname(req.file.originalname);

      // simpan file di /tmp/files
      const filePath = path.join(uploadDir, randomName);
      fs.writeFileSync(filePath, req.file.buffer);

      const fileUrl = `${req.protocol}://${req.get("host")}/files/${randomName}`;

      // auto hapus setelah 5 menit
      setTimeout(() => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}, 3 * 60 * 60 * 1000); // otomatis hapus setelah 3 jam

      res.json({
        success: true,
        url: fileUrl,
        filename: randomName,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message || "Upload failed",
      });
    }
  },
};
