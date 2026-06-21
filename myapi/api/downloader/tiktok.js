import crypto from "crypto";
import axios from "axios";

const k = {
  enc: "GJvE5RZIxrl9SuNrAtgsvCfWha3M7NGC",
  dec: "H3quWdWoHLX5bZSlyCYAnvDFara25FIu",
};

function cryptoProc(type, data) {
  const key = Buffer.from(k[type]);
  const iv = Buffer.from(k[type].slice(0, 16));

  const cipher =
    type === "enc"
      ? crypto.createCipheriv("aes-256-cbc", key, iv)
      : crypto.createDecipheriv("aes-256-cbc", key, iv);

  let result =
    type === "enc"
      ? cipher.update(data, "utf8", "base64")
      : cipher.update(data, "base64", "utf8");

  result += cipher.final(type === "enc" ? "base64" : "utf8");
  return result;
}

async function tiktokDl(url) {
  if (!/tiktok\.com/.test(url)) throw new Error("Invalid TikTok URL");

  const { data } = await axios.post(
    "https://savetik.app/requests",
    {
      bdata: cryptoProc("enc", url),
    },
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Android 16; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0",
        "Content-Type": "application/json",
      },
    }
  );

  if (!data || data.status !== "success") {
    throw new Error("Fetch failed");
  }

  return {
    author: data.username,
    thumbnail: data.thumbnailUrl,
    video: cryptoProc("dec", data.data),
    audio: data.mp3,
  };
}

export default {
  name: "Downloader - TikTok",
  description: "Download video TikTok tanpa watermark",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: {
      type: "string",
      required: true,
      description: "URL video TikTok",
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

      const result = await tiktokDl(url);

      return res.status(200).json({
        success: true,
        source: "savetik.app",
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