/**
  @ Base: https://pindown.cc/
  @ Author: Shannz
  @ Note: Pinterest Video/Image/GIF Downloader (API Module)
*/

import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";

const CONFIG = {
  BASE_URL: "https://pindown.cc",
  ENDPOINTS: {
    HOME: "/en/",
    DOWNLOAD: "/en/download"
  },
  HEADERS: {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1",
    Origin: "https://pindown.cc",
    Referer: "https://pindown.cc/en/",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Dest": "document",
    Priority: "u=0, i"
  }
};

const cleanText = (str) =>
  str ? str.replace(/\s+/g, " ").trim() : "";

async function pindownDownload(pinUrl) {
  if (!pinUrl) throw new Error("URL Pinterest tidak boleh kosong");

  const homeRes = await axios.get(
    CONFIG.BASE_URL + CONFIG.ENDPOINTS.HOME,
    { headers: CONFIG.HEADERS }
  );

  const cookies = homeRes.headers["set-cookie"];
  const sessionCookie = cookies ? cookies.join("; ") : "";

  const $home = cheerio.load(homeRes.data);
  const csrfToken = $home('input[name="csrf_token"]').val();
  if (!csrfToken) throw new Error("Gagal mendapatkan CSRF Token");

  const postData = qs.stringify({
    csrf_token: csrfToken,
    url: pinUrl
  });

  const downloadRes = await axios.post(
    CONFIG.BASE_URL + CONFIG.ENDPOINTS.DOWNLOAD,
    postData,
    {
      headers: {
        ...CONFIG.HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: sessionCookie,
        Referer: CONFIG.BASE_URL + CONFIG.ENDPOINTS.HOME
      }
    }
  );

  const $ = cheerio.load(downloadRes.data);

  const alertError = $(".alert-danger").text();
  if (alertError) throw new Error(cleanText(alertError));

  const box = $(".square-box");
  if (!box.length) throw new Error("Konten tidak ditemukan atau URL tidak valid");

  const title = cleanText(box.find(".font-weight-bold").text());
  const duration = cleanText(box.find(".text-muted").text()) || null;
  const thumbnail = box.find(".square-box-img img").attr("src");

  const medias = [];
  box.find(".square-box-btn a").each((_, el) => {
    const url = $(el).attr("href");
    const text = cleanText($(el).text());

    let type = "unknown";
    if (text.includes("Video")) type = "video";
    else if (text.includes("Image")) type = "image";
    else if (text.includes("GIF")) type = "gif";

    let ext = "jpg";
    if (url.includes(".mp4")) ext = "mp4";
    else if (url.includes(".gif")) ext = "gif";
    else if (url.includes(".png")) ext = "png";

    medias.push({
      type,
      extension: ext,
      quality: text.replace("Download ", ""),
      url
    });
  });

  return {
    title,
    duration,
    thumbnail,
    medias
  };
}

export default {
  name: "Tools - Pindown",
  description: "Pinterest Video/Image/GIF Downloader",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: { type: "string", required: true }
  },

  async run(req, res) {
    try {
      const url = req.query.url || req.body.url;
      if (!url)
        return res
          .status(400)
          .json({ status: false, error: 'Parameter "url" diperlukan' });

      const result = await pindownDownload(url);

      return res.status(200).json({
        status: true,
        result,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        error: err.message || "Gagal mengambil data Pinterest"
      });
    }
  }
};