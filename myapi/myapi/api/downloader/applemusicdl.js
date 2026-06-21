import axios from "axios";
import qs from "qs";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import { exec } from "child_process";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const BASE = "https://aaplmusicdownloader.com";
const UA =
  "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/137 Mobile Safari/537.36";

// === TEMP DIR ===
const uploadDir = path.join("/tmp", "files");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const jar = new CookieJar();
const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    timeout: 30000,
    headers: {
      "user-agent": UA,
      accept: "*/*",
    },
  })
);

function cleanNull(obj) {
  if (Array.isArray(obj)) return obj.map(cleanNull);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, cleanNull(v)])
    );
  }
  return obj;
}

async function getAppleMeta(url) {
  const { data } = await axios.get(url, { headers: { "user-agent": UA } });
  const $ = cheerio.load(data);
  const json = $('script[type="application/ld+json"]').first().html();
  if (!json) throw new Error("META_NOT_FOUND");

  const meta = JSON.parse(json);
  return {
    song: meta.name,
    artist: meta.byArtist?.name || meta.byArtist?.[0]?.name || null,
    album: meta.inAlbum?.name || meta.name,
    thumb: Array.isArray(meta.image) ? meta.image[0] : meta.image,
  };
}

async function preflight() {
  await client.get(BASE, {
    headers: { "user-agent": UA, accept: "text/html" },
  });
}

async function download(url, out) {
  const res = await axios.get(url, { responseType: "stream" });
  const w = fs.createWriteStream(out);
  res.data.pipe(w);
  return new Promise((r, j) => {
    w.on("finish", r);
    w.on("error", j);
  });
}

function toMp3(input, output) {
  return new Promise((r, j) => {
    exec(
      `ffmpeg -y -i "${input}" -vn -ab 320k -ar 44100 "${output}"`,
      (e) => (e ? j(e) : r())
    );
  });
}

async function uploadUguu(filePath) {
  const form = new FormData();
  form.append("files[]", fs.createReadStream(filePath));

  const { data } = await axios.post("https://uguu.se/upload.php", form, {
    headers: {
      ...form.getHeaders(),
      "user-agent": UA,
      accept: "application/json",
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: (s) => s < 500,
  });

  if (!data?.files?.[0]?.url) throw new Error("UGUU_UPLOAD_FAILED");
  return data.files[0].url;
}

async function aapl(url) {
  await preflight();
  const meta = await getAppleMeta(url);

  const r1 = await client.post(
    `${BASE}/api/composer/swd.php`,
    qs.stringify({
      song_name: meta.song,
      artist_name: meta.artist,
      url,
      token: "none",
      zip_download: false,
      quality: "320",
    }),
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        accept: "application/json, text/javascript, */*; q=0.01",
        origin: BASE,
        referer: `${BASE}/`,
        "x-requested-with": "XMLHttpRequest",
      },
    }
  );

  if (r1.data?.status !== "success")
    throw new Error("FAILED_GET_LINK");

  const dlink = r1.data.dlink;
  const safe = meta.song.replace(/[^\w\s-]/g, "").trim() || Date.now().toString();

  const m4aPath = path.join(uploadDir, `${safe}.m4a`);
  const mp3Path = path.join(uploadDir, `${safe}.mp3`);

  await download(dlink, m4aPath);
  await toMp3(m4aPath, mp3Path);
  fs.unlinkSync(m4aPath);

  const uguu = await uploadUguu(mp3Path);
  fs.unlinkSync(mp3Path);

  return cleanNull({
    status: true,
    title: meta.song,
    artist: meta.artist,
    album: meta.album,
    format: "mp3",
    download: uguu,
    thumbnail: meta.thumb,
  });
}

export default {
  name: "Downloader - Apple Music",
  description: "Download Apple Music ke MP3 via aaplmusicdownloader.com",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: {
      type: "string",
      required: true,
      description: "URL Apple Music",
    },
  },

  async run(req, res) {
    try {
      const { url } = req.query;

      if (!url || !url.startsWith("http")) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'url' wajib diisi & valid.",
        });
      }

      const result = await aapl(url);

      return res.status(200).json({
        success: true,
        source: "aaplmusicdownloader.com",
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