import axios from "axios";

async function getTurnstileToken() {
  try {
    const { data } = await axios.get(
      "https://anabot.my.id/api/tools/bypass",
      {
        params: {
          url: "https://bypass.city",
          siteKey: "0x4AAAAAAAGzw6rXeQWJ_y2P",
          type: "turnstile-min",
          apikey: "freeApikey"
        },
        timeout: 10000
      }
    );

    if (data?.success) {
      return data.data.result.token;
    }
    return null;
  } catch {
    return null;
  }
}

async function bypassUrl(url, token) {
  try {
    const { data, status } = await axios.post(
      "https://api2.bypass.city/bypass",
      { url },
      {
        headers: {
          "Content-Type": "application/json",
          "x-captcha-provider": "TURNSTILE",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137.0.0.0 Mobile Safari/537.36",
          token,
          Origin: "https://bypass.city",
          Referer: "https://bypass.city/"
        },
        timeout: 10000
      }
    );

    if (status === 201) return data.data;
    return null;
  } catch {
    return null;
  }
}

export default {
  name: "Tools - BypassURL",
  description: "Bypass shortlink using bypass.city",
  category: "Tools",
  methods: ["GET", "POST"],
  params: ["url"],
  paramsSchema: {
    url: { type: "string", required: true }
  },

  async run(req, res) {
    try {
      let url = req.query.url || req.body.url;
      if (!url)
        return res
          .status(400)
          .json({ status: false, error: 'Parameter "url" diperlukan' });

      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      const token = await getTurnstileToken();
      if (!token)
        return res
          .status(500)
          .json({ status: false, error: "Gagal mendapatkan token" });

      const result = await bypassUrl(url, token);
      if (!result)
        return res
          .status(500)
          .json({ status: false, error: "Gagal bypass URL" });

      return res.status(200).json({
        status: true,
        original: url,
        result,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        error: err.message || "Internal Server Error"
      });
    }
  }
};