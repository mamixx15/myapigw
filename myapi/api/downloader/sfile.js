import * as cheerio from "cheerio";
import axios from "axios";

export default {
  name: "Downloader - Sfile",
  description: "Download file dari Sfile.mobi dengan metadata lengkap",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: {
      type: "string",
      required: true,
      description: "URL file dari Sfile.mobi",
    },
  },

  async run(req, res) {
    try {
      const { url, buffer } = req.query;

      if (!url || !url.startsWith("http")) {
        return res.status(400).json({
          success: false,
          message: "URL tidak valid atau kosong! Gunakan ?url=https://sfile.mobi/xxxx",
        });
      }

      // === helper utils ===
      const createHeaders = (referer) => ({
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        "sec-ch-ua":
          '"Not/A)Brand";v="8", "Chromium";v="137", "Google Chrome";v="137"',
        dnt: "1",
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        Referer: referer,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      });

      const extractCookies = (headers) =>
        headers["set-cookie"]
          ?.map((cookie) => cookie.split(";")[0])
          .join("; ") || "";

      const extractMetadata = ($) => {
        const metadata = {};
        $(".file-content")
          .eq(0)
          .each((_, element) => {
            const $el = $(element);
            metadata.file_name = $el.find("img").attr("alt");
            metadata.mimetype = $el
              .find(".list")
              .eq(0)
              .text()
              .trim()
              .split("-")[1]
              ?.trim();
            metadata.author_name = $el.find(".list").eq(1).find("a").text().trim();
            metadata.upload_date = $el
              .find(".list")
              .eq(2)
              .text()
              .trim()
              .split(":")[1]
              ?.trim();
            metadata.download_count = $el
              .find(".list")
              .eq(3)
              .text()
              .trim()
              .split(":")[1]
              ?.trim();
          });
        return metadata;
      };

      const makeRequest = async (url, options) => {
        try {
          return await axios.get(url, options);
        } catch (err) {
          if (err.response) return err.response;
          throw new Error(`Request gagal: ${err.message}`);
        }
      };

      // === process start ===
      let headers = createHeaders(url);
      const initialResponse = await makeRequest(url, { headers });

      const cookies = extractCookies(initialResponse.headers);
      headers["Cookie"] = cookies;

      let $ = cheerio.load(initialResponse.data);
      const metadata = extractMetadata($);

      const downloadUrl = $("#download").attr("href");
      if (!downloadUrl)
        return res.status(404).json({
          success: false,
          message: "Gagal menemukan URL unduhan dari halaman utama.",
        });

      headers["Referer"] = downloadUrl;
      const processResponse = await makeRequest(downloadUrl, { headers });

      const html = processResponse.data;
      $ = cheerio.load(html);

      const scripts = $("script")
        .map((_, el) => $(el).html())
        .get()
        .join("\n");

      const finalUrlRegex =
        /https:\\\/\\\/download\d+\.sfile\.mobi\\\/downloadfile\\\/\d+\\\/\d+\\\/[a-z0-9]+\\\/[^\s'"]+\.[a-z0-9]+(\?[^"']+)?/gi;
      const matches = scripts.match(finalUrlRegex);

      if (!matches?.length)
        return res.status(404).json({
          success: false,
          message: "Link unduhan final tidak ditemukan di script halaman.",
        });

      const finalUrl = matches[0].replace(/\\\//g, "/");

      // jika buffer=true maka kirim sebagai base64
      if (buffer === "true") {
        const fileResponse = await makeRequest(finalUrl, {
          headers,
          responseType: "arraybuffer",
        });
        const fileBuffer = Buffer.from(fileResponse.data).toString("base64");

        return res.status(200).json({
          success: true,
          source: "sfile.mobi",
          metadata,
          result: {
            type: "base64",
            file: fileBuffer,
            filename: metadata.file_name,
          },
        });
      }

      // jika hanya link saja
      return res.status(200).json({
        success: true,
        source: "sfile.mobi",
        metadata,
        result: {
          type: "url",
          download_url: finalUrl,
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  },
};
