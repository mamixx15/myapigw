import axios from "axios";
import FormData from "form-data";

export default {
  name: "TikTok Search",
  description: "Cari video TikTok berdasarkan kata kunci",
  category: "Search",
  methods: ["GET"],
  params: ["q"],
  paramsSchema: {
    q: { type: "string", required: true, minLength: 1, description: "Kata kunci pencarian TikTok" },
  },

  async run(req, res) {
    try {
      const query = req.method === "GET" ? req.query.q : req.body.q;

      if (!query) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "q" diperlukan',
        });
      }

      // 🧠 Siapkan form data
      const form = new FormData();
      form.append("keywords", query);
      form.append("count", 15);
      form.append("cursor", 0);
      form.append("web", 1);
      form.append("hd", 1);

      // 🔥 Request ke tikwm.com
      const response = await axios.post("https://tikwm.com/api/feed/search", form, {
        headers: form.getHeaders(),
        timeout: 10000,
      });

      const data = response.data;
      if (!data || !data.data || !data.data.videos) {
        return res.status(500).json({
          status: false,
          error: "Gagal mengambil data dari TikWM",
        });
      }

      const baseURL = "https://tikwm.com";
      const results = data.data.videos.map((video) => ({
        id: video.id,
        title: video.title,
        author: video.author.nickname,
        play: baseURL + video.play,
        wmplay: baseURL + video.wmplay,
        music: baseURL + video.music,
        cover: baseURL + video.cover,
        avatar: baseURL + video.avatar,
        duration: video.duration,
        region: video.region,
        created_at: video.create_time,
      }));

      return res.status(200).json({
        status: true,
        results,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        error: error.message,
        detail: error.response?.data || null,
      });
    }
  },
};
