import WebSocket from "ws";
import axios from "axios";

export default {
  name: "Copilot - Think-Deeper (reasoning)",
  description: "Chat via Copilot using reasoning model (think-deeper)",
  category: "AI",
  methods: ["GET"],
  params: ["q"],
  paramsSchema: { q: { type: "string", required: true } },

  async run(req, res) {
    try {
      const q = req.method === "GET" ? req.query.q : req.body.q;
      if (!q)
        return res
          .status(400)
          .json({ status: false, error: 'Parameter "q" diperlukan' });

      const headers = {
        origin: "https://copilot.microsoft.com",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
      };

      // 🔹 Buat percakapan baru
      const convRes = await axios.post(
        "https://copilot.microsoft.com/c/api/conversations",
        null,
        { headers }
      );

      const conversationId = convRes.data?.id;
      if (!conversationId)
        return res
          .status(500)
          .json({ status: false, error: "Gagal membuat conversation" });

      const wsUrl = `wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1`;
      const ws = new WebSocket(wsUrl, { headers });

      const response = { text: "", citations: [] };

      ws.on("open", () => {
        // Kirim opsi awal
        ws.send(
          JSON.stringify({
            event: "setOptions",
            supportedFeatures: ["partial-generated-images"],
            supportedCards: [
              "weather",
              "local",
              "image",
              "sports",
              "video",
              "ads",
              "safetyHelpline",
              "quiz",
              "finance",
              "recipe",
            ],
            ads: {
              supportedTypes: [
                "text",
                "product",
                "multimedia",
                "tourActivity",
                "propertyPromotion",
              ],
            },
          })
        );

        // Kirim pesan user
        ws.send(
          JSON.stringify({
            event: "send",
            mode: "reasoning", // Think-Deeper model
            conversationId,
            content: [{ type: "text", text: q }],
            context: {},
          })
        );
      });

      ws.on("message", (chunk) => {
        try {
          const parsed = JSON.parse(chunk.toString());

          switch (parsed.event) {
            case "appendText":
              response.text += parsed.text || "";
              break;

            case "citation":
              response.citations.push({
                title: parsed.title,
                icon: parsed.iconUrl,
                url: parsed.url,
              });
              break;

            case "done":
              res.status(200).json({
                status: true,
                model: "think-deeper",
                results: response,
              });
              ws.close();
              break;

            case "error":
              res.status(500).json({
                status: false,
                error: parsed.message,
              });
              ws.close();
              break;
          }
        } catch (err) {
          res.status(500).json({ status: false, error: err.message });
          ws.close();
        }
      });

      ws.on("error", (err) => {
        res.status(500).json({ status: false, error: err.message });
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message,
        detail: error.response?.data || null,
      });
    }
  },
};
