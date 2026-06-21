import axios from "axios";

export default {
  name: "Downloader - Facebook",
  description: "Download video Facebook (HD / SD) tanpa watermark",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: {
      type: "string",
      required: true,
      description: "URL video Facebook yang ingin diunduh",
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

      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
      };

      const html = (await axios.get(url, { headers })).data;

      const hd =
        html.match(/"browser_native_hd_url":"(.*?)"/)?.[1]?.replace(/\\\//g, "/") ||
        null;

      const sd =
        html.match(/"browser_native_sd_url":"(.*?)"/)?.[1]?.replace(/\\\//g, "/") ||
        null;

      if (!hd && !sd) {
        return res.status(404).json({
          success: false,
          message: "Gagal menemukan link video HD/SD. URL mungkin privat.",
        });
      }

      const result = {
        hd,
        sd,
        best_quality: hd || sd,
      };

      return res.status(200).json({
        success: true,
        source: "facebook.com",
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
