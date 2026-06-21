/**
  @ Base: https://www.amoyshare.com/online-video-download-2/
  @ Author: Shannz
  @ Note: All in one platform downloader.
**/

import axios from "axios";
import crypto from "crypto";

const config = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: "https://www.amoyshare.com/",
    Origin: "https://www.amoyshare.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    Priority: "u=1, i",
  },
};

const amoyshare = {
  generateHeader() {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    const dateStr = `${yyyy}${mm}${dd}`;
    const constant = "786638952";
    const randomVal = 1000 + Math.round(8999 * Math.random());

    const key = `${dateStr}${constant}${randomVal}`;
    const hashInput = `${dateStr}${randomVal}${constant}`;

    const signature = crypto
      .createHash("md5")
      .update(hashInput)
      .digest("hex");

    return `${key}-${signature}`;
  },

  async request(url, params = {}) {
    const headers = {
      ...config.headers,
      amoyshare: this.generateHeader(),
    };

    const { data } = await axios.get(url, {
      params,
      headers,
    });

    return data;
  },

  async download(videoUrl) {
    const endpoint =
      "https://line.1010diy.com/web/free-mp3-finder/urlParse";

    return this.request(endpoint, {
      url: videoUrl,
      phonydata: "false",
    });
  },
};

export default {
  name: "AIO DownloaderV2",
  description: "All-in-One DownloaderV2",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: {
      type: "string",
      required: true,
      description: "URL video (TikTok, YouTube, Instagram, dll)",
    },
  },

  async run(req, res) {
    try {
      const { url } = req.query;

      if (!url || !url.startsWith("http")) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'url' wajib diisi & harus valid.",
        });
      }

      const result = await amoyshare.download(url);

      return res.status(200).json({
        success: true,
        source: "amoyshare.com",
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