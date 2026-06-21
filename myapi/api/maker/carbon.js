/**
  @ Base: https://carbon.now.sh/
  @ Author: Shannz
  @ Note: Beautify your code with carbon with many styles.
**/

import mql from "@microlink/mql";

const CARBON_CONFIG = {
  bg: "rgba(226,233,239,1)",
  t: "dracula-pro",
  wt: "none",
  l: "auto",
  ds: "false",
  dsyoff: "20px",
  dsblur: "68px",
  wc: "true",
  wa: "true",
  pv: "56px",
  ph: "56px",
  ln: "true",
  fl: "1",
  fm: "Fira Code",
  fs: "14px",
  lh: "152%",
  si: "false",
  es: "2x",
  wm: "false",
};

async function carbon(codeSnippet) {
  if (!codeSnippet) throw new Error("Code snippet is required");

  const params = new URLSearchParams(CARBON_CONFIG);
  params.append("code", codeSnippet);

  const targetUrl = `https://carbon.now.sh/?${params.toString()}`;

  const { data } = await mql(targetUrl, {
    screenshot: {
      element: ".export-container",
      optimizeForSpeed: true,
    },
    viewport: { width: 1024, height: 768 },
    waitFor: 3000,
    meta: false,
  });

  if (!data?.screenshot?.url)
    throw new Error("Screenshot URL not found");

  return {
    image: data.screenshot.url,
    font: CARBON_CONFIG.fm,
    theme: CARBON_CONFIG.t,
  };
}

export default {
  name: "Tools - Carbon",
  description: "Beautify code snippet using Carbon (image output)",
  category: "Maker",
  methods: ["GET"],
  params: ["code"],
  paramsSchema: {
    code: {
      type: "string",
      required: true,
      description: "Kode yang ingin diubah menjadi gambar Carbon",
    },
  },

  async run(req, res) {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Parameter 'code' wajib diisi.",
        });
      }

      const result = await carbon(code);

      return res.status(200).json({
        success: true,
        source: "carbon.now.sh",
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