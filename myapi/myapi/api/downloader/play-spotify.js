import axios from "axios"
import { CookieJar } from "tough-cookie"
import { wrapper } from "axios-cookiejar-support"

/* =======================
   Config
======================= */
const BASE = "https://spotmate.online"
const UA =
  "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/137 Mobile Safari/537.36"

const client_id = "3ac7d9b75ec644cb9ae627ee5db358e6"
const client_secret = "462c7edd060548f3b181dbf8d8c673dc"

/* =======================
   Axios + Cookie
======================= */
const jar = new CookieJar()
const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    headers: {
      "user-agent": UA,
      accept: "*/*",
    },
  })
)

/* =======================
   Spotify Token
======================= */
let access_token = ""
let token_expiry = 0

async function getSpotifyToken() {
  if (access_token && Date.now() < token_expiry) return access_token

  const basic = Buffer.from(
    `${client_id}:${client_secret}`
  ).toString("base64")

  const { data } = await axios.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  )

  access_token = data.access_token
  token_expiry = Date.now() + data.expires_in * 1000
  return access_token
}

/* =======================
   Spotify Search
======================= */
async function searchSpotify(query) {
  const token = await getSpotifyToken()

  const { data } = await axios.get(
    "https://api.spotify.com/v1/search",
    {
      params: {
        q: query,
        type: "track",
        limit: 1,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return data.tracks.items[0] || null
}

/* =======================
   XSRF
======================= */
async function getXsrf() {
  await client.get(`${BASE}/en1`)
  const cookies = await jar.getCookies(BASE)
  const xsrf = cookies.find(c => c.key === "XSRF-TOKEN")
  if (!xsrf) throw new Error("XSRF token tidak ditemukan")
  return decodeURIComponent(xsrf.value)
}

/* =======================
   Convert Spotify
======================= */
async function convertSpotify(url) {
  const xsrf = await getXsrf()

  const { data: t } = await client.post(
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
  )

  const { data: d } = await client.post(
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
  )

  return {
    metadata: {
      id: t.id,
      title: t.name,
      artist: t.artists.map(a => a.name).join(", "),
      duration: `${Math.floor(t.duration_ms / 60000)}:${String(
        Math.floor((t.duration_ms % 60000) / 1000)
      ).padStart(2, "0")}`,
      explicit: t.explicit,
      cover: t.album.images?.[0]?.url || null,
      url: t.external_urls.spotify,
    },
    dlink: d.url,
  }
}

/* =======================
   Main Fetch
======================= */
async function spotifyFetch(input) {
  if (!input) throw new Error("Query wajib diisi")

  if (/^https?:\/\/open\.spotify\.com\/track\//i.test(input)) {
    return convertSpotify(input)
  }

  const track = await searchSpotify(input)
  if (!track) throw new Error("Lagu tidak ditemukan")

  return convertSpotify(track.external_urls.spotify)
}

/* =======================
   API Endpoint
======================= */
export default {
  name: "Play - Spotify",
  description: "Search, convert & download Spotify",
  category: "Downloader",
  methods: ["GET"],
  params: ["q"],
  paramsSchema: {
    q: {
      type: "string",
      required: true,
      description: "query lagu atau link Spotify",
    },
  },

  async run(req, res) {
    try {
      const { q } = req.query
      if (!q) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?q= wajib diisi",
        })
      }

      const result = await spotifyFetch(q)

      return res.status(200).json({
        status: true,
        result,
      })
    } catch (err) {
      return res.status(500).json({
        status: false,
        error: err.message || "Gagal memproses Spotify",
      })
    }
  },
}