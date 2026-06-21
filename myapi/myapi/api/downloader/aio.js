import axios from "axios";

async function downr(url) {
  if (!url || !url.startsWith("https://"))
    throw new Error("Invalid url.");

  const { headers } = await axios.get(
    "https://downr.org/.netlify/functions/analytics",
    {
      headers: {
        referer: "https://downr.org/",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 15; SM-F958) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",
      },
    }
  );

  const { data } = await axios.post(
    "https://downr.org/.netlify/functions/download",
    { url },
    {
      headers: {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        cookie: headers["set-cookie"]?.join("; ") || "",
        origin: "https://downr.org",
        referer: "https://downr.org/",
        "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 15; SM-F958) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",
      },
    }
  );

  return data;
}

export default {
  name: "AIO Downloader",
  description: "All In One Downloader Using Url",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: {
      type: "string",
      required: true,
      description: "URL media (Instagram / TikTok / dll)",
    },
  },

  async run(req, res) {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'url' wajib diisi.",
        });
      }

      const result = await downr(url);

      return res.status(200).json({
        success: true,
        source: "downr.org",
        result,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  },
};