/**
 * @name Tools - Screenshot Web
 * @description Ambil screenshot dari website menggunakan ScreenshotMachine
 * @author wolep
 * @update 7 November 2025
 * @base https://www.screenshotmachine.com/
 * @limit 100 screenshot / bulan
 */

import axios from "axios";

export default {
  name: "Tools - ScreenshotWeb",
  description: "Ambil screenshot dari situs web",
  category: "Tools",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: { type: "string", required: true },
  },

  async run(req, res) {
    const BASE = "https://www.screenshotmachine.com";
    const HEADERS = { "content-encoding": "zstd" };

    try {
      const url = req.query.url || req.body.url;
      if (!url)
        return res
          .status(400)
          .json({ status: false, error: 'Parameter "url" diperlukan' });

      // 🔹 ambil cookie dulu
      const cookieRes = await axios.get(BASE, { headers: HEADERS });
      const rawCookies = cookieRes.headers["set-cookie"];
      if (!rawCookies)
        throw new Error("Gagal mendapatkan cookie dari ScreenshotMachine");
      const cookie = rawCookies.map((c) => c.split(";")[0]).join("; ");

      // 🔹 kirim request screenshot
      const captureRes = await axios.post(
        BASE + "/capture.php",
        `url=${encodeURIComponent(url)}&device=desktop&cacheLimit=0`,
        {
          headers: {
            cookie,
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            ...HEADERS,
          },
        }
      );

      if (captureRes.status !== 200)
        throw new Error("Gagal melakukan request screenshot");

      const data = captureRes.data;
      if (!data || data.status !== "success" || !data.link)
        throw new Error("Gagal memproses screenshot (response tidak valid)");

      // 🔹 ambil file buffer hasil screenshot
      const imageUrl = `${BASE}/${data.link}`;
      const imgRes = await axios.get(imageUrl, {
        headers: { cookie },
        responseType: "arraybuffer",
      });

      if (imgRes.status !== 200)
        throw new Error("Gagal mengambil hasil screenshot");

      // 🔹 kirim hasil langsung ke user (image/jpeg)
      res.setHeader("Content-Type", "image/jpeg");
      res.status(200).send(imgRes.data);
    } catch (err) {
      return res.status(500).json({
        status: false,
        error: err.message || "Gagal mengambil screenshot web",
      });
    }
  },
};
