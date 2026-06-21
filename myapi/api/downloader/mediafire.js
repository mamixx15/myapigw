import axios from "axios";
import * as cheerio from "cheerio";
import { lookup } from "mime-types";

export default {
  name: "Downloader - MediaFire",
  description: "Ambil informasi dan link download dari MediaFire",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: { type: "string", required: true },
  },

  async run(req, res) {
    try {
      const url = req.query.url;
      if (!url)
        return res
          .status(400)
          .json({ status: false, error: 'Parameter "url" diperlukan' });

      if (!url.includes("mediafire.com"))
        return res
          .status(400)
          .json({ status: false, error: "URL bukan dari MediaFire" });

      // 🔹 Ambil halaman MediaFire via proxy (bypass Cloudflare)
      const { data } = await axios.get(
        `https://api.nekolabs.web.id/px?url=${encodeURIComponent(url)}`
      );

      const $ = cheerio.load(data.result.content);
      const raw = $("div.dl-info");

      // 🔹 Ambil metadata file
      const filename =
        $(".dl-btn-label").attr("title") ||
        raw.find("div.intro div.filename").text().trim() ||
        null;

      if (!filename) throw new Error("Gagal menemukan nama file");

      const ext = filename.split(".").pop() || "";
      const mimetype = lookup(ext.toLowerCase()) || "application/octet-stream";

      const filesize = raw.find("ul.details li:nth-child(1) span").text().trim();
      const uploaded = raw.find("ul.details li:nth-child(2) span").text().trim();

      // 🔹 Ambil direct download link
      const downloadUrl = $("a#downloadButton").attr("href");
      if (!downloadUrl) throw new Error("File tidak ditemukan atau sudah dihapus");

      // 🔹 Kirim hasil JSON
      return res.status(200).json({
        status: true,
        filename,
        filesize,
        mimetype,
        uploaded,
        download_url: downloadUrl,
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        error: err.message || "Gagal memproses link MediaFire",
      });
    }
  },
};
