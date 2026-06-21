import crypto from "crypto";
import { extname, basename } from "path";

const AGENT =
  "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36";

const SALT =
  "hackers_become_a_little_stinkier_every_time_they_hack";

const PROMPT =
  "Ubah warna kulit orang pada foto menjadi lebih gelap/tan eksotis dengan hasil realistis, pertahankan detail wajah, pencahayaan alami, tekstur kulit tetap natural, tanpa mengubah bentuk wajah, rambut, pakaian, dan background. Hasil high quality, smooth shading, realistic skin tone, cinematic lighting";

const md5 = (s) =>
  crypto.createHash("md5").update(s).digest("hex");

const reverse = (s) =>
  s.split("").reverse().join("");

const generateRandomIP = () =>
  Array.from({ length: 4 }, () =>
    1 + Math.floor(Math.random() * 254)
  ).join(".");

const mime = (ext) =>
  ({
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  }[ext.toLowerCase()] || "application/octet-stream");

function genKEY() {
  const r = String(Math.floor(Math.random() * 1e11));
  const h1 = reverse(md5(AGENT + r + SALT));
  const h2 = reverse(md5(AGENT + h1));
  const h3 = reverse(md5(AGENT + h2));

  return `tryit-${r}-${h3}`;
}

export default {
  name: "Maker - ToHitam",
  description: "Mengubah warna kulit pada foto menjadi lebih gelap/tan realistis",
  category: "Maker",
  methods: ["GET"],
  params: ["url"],

  paramsSchema: {
    url: {
      type: "string",
      required: true,
      description: "URL gambar",
    },
  },

  async run(req, res) {
    try {
      const url = req.query.url?.trim();

      if (!url) {
        return res.status(400).json({
          success: false,
          message:
            "Parameter 'url' wajib diisi. Contoh: ?url=https://example.com/image.jpg",
        });
      }

      console.log(`🖤 Processing ToHitam: ${url}`);

      // ambil gambar
      const imgRes = await fetch(url);

      if (!imgRes.ok) {
        return res.status(400).json({
          success: false,
          message: "Gagal mengambil gambar dari URL",
        });
      }

      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let lastError = "Request gagal";

      for (let i = 0; i < 6; i++) {
        try {
          const form = new FormData();

          form.append(
            "image",
            new Blob([buffer], {
              type: mime(extname(new URL(url).pathname)),
            }),
            basename(new URL(url).pathname || "image.jpg")
          );

          form.append("text", PROMPT);
          form.append("image_generator_version", "standard");

          const response = await fetch(
            "https://api.deepai.org/api/image-editor",
            {
              method: "POST",
              headers: {
                accept: "*/*",
                origin: "https://deepai.org",
                referer: "https://deepai.org/",
                "user-agent": AGENT,
                "api-key": genKEY(),
                "x-forwarded-for": generateRandomIP(),
              },
              body: form,
            }
          );

          const json = await response.json().catch(() => null);

          if (json?.output_url) {
            const result = await fetch(json.output_url);
            const resultBuffer = Buffer.from(
              await result.arrayBuffer()
            );

            res.writeHead(200, {
              "Content-Type": "image/jpeg",
              "Content-Length": resultBuffer.length,
            });

            return res.end(resultBuffer);
          }

          lastError = json?.status || `HTTP ${response.status}`;
        } catch (e) {
          lastError = e.message;
        }
      }

      return res.status(500).json({
        success: false,
        error: lastError,
      });
    } catch (err) {
      console.error("[ToHitam API Error]", err);

      res.status(500).json({
        success: false,
        error: err.message || "Terjadi kesalahan",
      });
    }
  },
};