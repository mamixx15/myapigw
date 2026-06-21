import axios from "axios";

function cleanNull(obj) {
  if (Array.isArray(obj)) return obj.map(cleanNull);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, cleanNull(v)])
    );
  }
  return obj;
}

function parseMedia(mediaUrls = []) {
  let video = null;
  let audio = null;

  for (const m of mediaUrls) {
    if (m.type === "video" && !video) video = m.url;
    if (m.type === "audio" && !audio) audio = m.url;
  }

  return { video, audio };
}

export default {
  name: "Downloader - Douyin",
  description: "Download video Douyin/TikTok China tanpa watermark",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: {
      type: "string",
      required: true,
      description: "URL video Douyin",
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

      const { data } = await axios.post(
        "https://snapvideotools.com/id/api/snap",
        { text: url },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      );

      if (!data?.data) {
        return res.status(404).json({
          success: false,
          message: "Gagal mengambil data dari SnapVideoTools",
        });
      }

      const d = data.data;

      const result = cleanNull({
        url: d.orignalUrl,
        title: d.title,
        cover: d.cover,
        platform: d.platformName,
        media: parseMedia(d.mediaUrls),
      });

      return res.status(200).json({
        success: true,
        source: "snapvideotools.com",
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