import baLogo from "ba-logo";

export default {
  name: "Maker - BaLogo",
  description: "Generate logo keren dari teks menggunakan ba-logo",
  category: "Maker",
  methods: ["GET"],
  params: ["text"],
  paramsSchema: {
    text: { type: "string", required: true, description: "Teks yang akan dijadikan logo" },
  },

  async run(req, res) {
    try {
      const text = req.query.text?.trim();
      if (!text) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'text' wajib diisi, contoh: ?text=mif",
        });
      }

      // 🕐 status sementara
      console.log(`🧩 Membuat logo untuk teks: ${text}`);

      // buat logo via ba-logo
      const image = await baLogo(text);
      const buffer = await image.toBuffer();

      // kirim hasil dalam bentuk gambar PNG
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": buffer.length,
      });
      res.end(buffer);
    } catch (err) {
      console.error("[ba-logo API Error]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Ups! Gagal membuat logo.",
      });
    }
  },
};
