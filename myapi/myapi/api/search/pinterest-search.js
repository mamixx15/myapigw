import axios from "axios";

export default {
  name: "Pinterest Search",
  description: "Cari gambar Pinterest berdasarkan kata kunci",
  category: "Search",
  methods: ["GET"],
  params: ["q", "limit"],
  paramsSchema: {
    q: { type: "string", required: true, minLength: 1 },
    limit: { type: "number", required: false },
  },

  async run(req, res) {
    try {
      const query = req.method === "GET" ? req.query.q : req.body.q;
      const limit = parseInt(req.method === "GET" ? req.query.limit : req.body.limit) || 10;

      if (!query) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "q" diperlukan',
        });
      }

      // 1. Ambil cookie awal (CSRF + session)
      const init = await axios.get("https://id.pinterest.com/", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        },
      });

      const cookies = init.headers["set-cookie"] || [];
      const csrf = cookies.find((c) => c.startsWith("csrftoken="));
      const sess = cookies.find((c) => c.startsWith("_pinterest_sess="));

      if (!csrf || !sess) {
        return res.status(500).json({
          status: false,
          error: "Gagal mendapatkan CSRF / Session Cookie",
        });
      }

      const csrftoken = csrf.split(";")[0].split("=")[1];
      const cookieHeader = `${csrf.split(";")[0]}; ${sess.split(";")[0]}`;

      // 2. Fetch data pinterest
      let results = [];
      let bookmark = null;
      let keepFetching = true;

      while (keepFetching && results.length < limit) {
        const body = {
          options: {
            query,
            scope: "pins",
            bookmarks: bookmark ? [bookmark] : [],
          },
          context: {},
        };

        const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`;
        const formEncoded = `source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(
          JSON.stringify(body)
        )}`;

        const resp = await axios.post(
          "https://id.pinterest.com/resource/BaseSearchResource/get/",
          formEncoded,
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "X-CSRFToken": csrftoken,
              "X-Requested-With": "XMLHttpRequest",
              "X-Pinterest-Source-Url": sourceUrl,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
              Cookie: cookieHeader,
            },
          }
        );

        const json = resp.data;
        const data = json?.resource_response?.data?.results || [];
        bookmark = json?.resource_response?.bookmark;

        data.forEach((pin) => {
          const obj = {
            id: pin.id,
            description: pin.description || pin.grid_description || null,
            link: pin.link || `https://www.pinterest.com/pin/${pin.id}/`,
            images: {
              small: pin.images?.["236x"]?.url || null,
              medium: pin.images?.["474x"]?.url || null,
              large: pin.images?.["736x"]?.url || null,
              original: pin.images?.orig?.url || null,
            },
            pinner: pin.pinner
              ? {
                  name: pin.pinner.username || null,
                  avatar: pin.pinner.image_small_url || null,
                }
              : null,
            stats: {
              repin: pin.repin_count || 0,
              like: pin.like_count || 0,
            },
          };

          results.push(obj);
        });

        if (!bookmark || data.length === 0) keepFetching = false;
      }

      return res.status(200).json({
  status: true,
  total: Math.min(results.length, limit),
  results: results.slice(0, limit),
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
