import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://music.apple.com/id/search?term=";

async function searchAppleMusic(term) {
  if (!term) throw new Error("Search term required");

  const url = `${BASE_URL}${encodeURIComponent(term)}`;

  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      accept: "text/html",
    },
  });

  const $ = cheerio.load(html);
  const results = [];

  $("li.grid-item").each((_, li) => {
    const el = $(li);

    const link = el.find("a.click-action").attr("href");
    const title = el
      .find(
        '[data-testid="top-search-result-title"] .top-search-lockup__primary__title'
      )
      .text()
      .trim();
    const subtitle = el
      .find('[data-testid="top-search-result-subtitle"]')
      .text()
      .trim();
    const imgSrc =
      el
        .find('picture source[type="image/jpeg"]')
        .first()
        .attr("srcset")
        ?.split(" ")[0] || null;

    if (title && link) {
      results.push({
        title,
        subtitle,
        link,
        image: imgSrc,
      });
    }
  });

  return results;
}

export default {
  name: "Search - Apple Music",
  description: "Cari lagu / album / artist di Apple Music",
  category: "Search",
  methods: ["GET"],
  params: ["q"],
  paramsSchema: {
    q: {
      type: "string",
      required: true,
      description: "Keyword pencarian Apple Music",
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

      const data = await searchAppleMusic(q);

      return res.status(200).json({
        success: true,
        total: data.length,
        result: data,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  },
};