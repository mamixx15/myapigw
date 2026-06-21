import axios from "axios";

export default {
  name: "Tools - ShortURL",
  description: "Shorten any long URL",
  category: "Tools",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: { type: "string", required: true },
  },

  async run(req, res) {
    try {
      const url = req.query.url || req.body.url;

      if (!url) {
        return res.status(400).json({
          error: 'Parameter "url" diperlukan',
        });
      }

      const tiny = await axios.get(
        "https://tinyurl.com/api-create.php?url=" +
          encodeURIComponent(url)
      );

      return res.status(200).json({
        status: true,
        original: url,
        results: {
          tinyurl: tiny.data.toString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        error: err.message || "Gagal memendekkan URL",
      });
    }
  },
};