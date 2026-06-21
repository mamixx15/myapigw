import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const BASE = "https://spotmate.online";
const UA =
  "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/137 Mobile Safari/537.36";

const jar = new CookieJar();
const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    headers: {
      "user-agent": UA,
      accept: "*/*",
    },
  })
);

async function getXsrf() {
  await client.get(`${BASE}/en1`);
  const cookies = await jar.getCookies(BASE);
  const xsrf = cookies.find((c) => c.key === "XSRF-TOKEN");
  if (!xsrf) throw new Error("XSRF-TOKEN not found");
  return decodeURIComponent(xsrf.value);
}

async function convertSpotify(url) {
  const xsrf = await getXsrf();

  const trackRes = await client.post(
    `${BASE}/getTrackData`,
    { spotify_url: url },
    {
      headers: {
        "content-type": "application/json",
        "x-xsrf-token": xsrf,
        origin: BASE,
        referer: `${BASE}/en1`,
      },
    }
  );

  const convertRes = await client.post(
    `${BASE}/convert`,
    { urls: url },
    {
      headers: {
        "content-type": "application/json",
        "x-xsrf-token": xsrf,
        origin: BASE,
        referer: `${BASE}/en1`,
      },
    }
  );

  const t = trackRes.data;
  const d = convertRes.data;

  return {
    id: t.id,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    duration: `${Math.floor(t.duration_ms / 60000)}:${String(
      Math.floor((t.duration_ms % 60000) / 1000)
    ).padStart(2, "0")}`,
    explicit: t.explicit,
    thumbnail: t.album.images?.[0]?.url || null,
    spotify_url: t.external_urls.spotify,
    download_url: d.url,
  };
}

export default {
  name: "Downloader - Spotify",
  description: "Download lagu Spotify via Spotmate",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: {
      type: "string",
      required: true,
      description: "URL track Spotify",
    },
  },

  async run(req, res) {
    try {
      const { url } = req.query;

      if (!url || !url.startsWith("http")) {
        return res.status(400).json({
          success: false,
          message: "URL Spotify tidak valid! Gunakan ?url=",
        });
      }

      const result = await convertSpotify(url);

      return res.status(200).json({
        success: true,
        source: "spotmate.online",
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