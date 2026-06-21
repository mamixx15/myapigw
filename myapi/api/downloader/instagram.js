import axios from "axios";
import * as cheerio from "cheerio";

export default {
  name: "Downloader - Instagram",
  description: "Download video atau foto Instagram tanpa watermark",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: {
      type: "string",
      required: true,
      description: "URL postingan Instagram yang ingin diunduh",
    },
  },

  async run(req, res) {
    try {
      const { url } = req.query;

      if (!url || !url.startsWith("http")) {
        return res.status(400).json({
          success: false,
          message: "URL tidak valid atau kosong! Gunakan ?url=",
        });
      }

      const encoded = encodeURIComponent(url);
      const response = await axios.get(
        `https://igram.website/content.php?url=${encoded}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 10; Termux) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          },
        }
      );

      const json = response.data;
      if (!json.html)
        return res.status(404).json({
          success: false,
          message: "Gagal mendapatkan data. HTML kosong atau URL tidak valid.",
        });

      const $ = cheerio.load(json.html);
      const thumb = $("img.w-100").attr("src");
      const caption = $("p.text-sm").text().trim();
      const download = $('a:contains("Download HD")').attr("href");
      const user = json.username || "unknown";

      const result = {
        user,
        thumbnail: thumb,
        caption,
        download_url: download,
      };

      return res.status(200).json({
        success: true,
        source: "igram.website",
        result,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.response?.data || err.message,
      });
    }
  },
};
