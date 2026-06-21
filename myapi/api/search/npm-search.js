import axios from "axios";

async function fetchJson(url) {
  const { data } = await axios.get(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/137 Mobile Safari/537.36",
      accept: "application/json",
    },
  });
  return data;
}

async function searchNpm(q) {
  if (!q) throw new Error("Query kosong");

  const data = await fetchJson(
    `https://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(q)}`
  );

  return data.objects.slice(0, 20).map((i) => ({
    title: `${i.package.name}@^${i.package.version}`,
    download: i.downloads,
    author: i.package.publisher?.username || null,
    update: i.package.date,
    links: i.package.links,
  }));
}

export default {
  name: "Search - NPM",
  description: "Cari package di npm registry",
  category: "Search",
  methods: ["GET"],
  params: ["q"],
  paramsSchema: {
    q: {
      type: "string",
      required: true,
      description: "Keyword pencarian package npm",
    },
  },

  async run(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'q' wajib diisi.",
        });
      }

      const result = await searchNpm(q);

      return res.status(200).json({
        success: true,
        source: "npmjs.com",
        total: result.length,
        result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};