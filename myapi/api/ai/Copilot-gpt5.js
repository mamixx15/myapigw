import WebSocket from "ws";
import axios from "axios";

export default {
  name: "Copilot - GPT-5 (smart)",
  description: "Chat via Copilot using GPT-5 / smart model",
  category: "AI",
  methods: ["GET"],
  params: ["q"],
  paramsSchema: { q: { type: "string", required: true } },

  async run(req, res) {
    try {
      const q = req.method === "GET" ? req.query.q : req.body.q;
      if (!q) return res.status(400).json({ error: 'Parameter "q" diperlukan' });

      const headers = {
        origin: "https://copilot.microsoft.com",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
      };

      const convRes = await axios.post("https://copilot.microsoft.com/c/api/conversations", null, { headers });
      const conversationId = convRes.data?.id;
      if (!conversationId) return res.status(500).json({ error: "Gagal membuat conversation" });

      const wsUrl = `wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1`;
      const ws = new WebSocket(wsUrl, { headers });

      const result = { text: "", citations: [] };

      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            event: "setOptions",
            supportedFeatures: ["partial-generated-images"],
            supportedCards: ["weather", "local", "image", "sports", "video", "ads", "safetyHelpline", "quiz", "finance", "recipe"],
            ads: { supportedTypes: ["text", "product", "multimedia", "tourActivity", "propertyPromotion"] },
          })
        );

        ws.send(
          JSON.stringify({
            event: "send",
            mode: "smart", // gpt-5 / smart
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
              result.text += parsed.text || "";
              break;
            case "citation":
              result.citations.push({ title: parsed.title, icon: parsed.iconUrl, url: parsed.url });
              break;
            case "done":
              ws.close();
              return res.status(200).json({ status: true, model: "gpt-5", response: result });
            case "error":
              ws.close();
              return res.status(500).json({ status: false, error: parsed.message || "Copilot error" });
          }
        } catch (err) {}
      });

      ws.on("error", (err) => {
        return res.status(500).json({ status: false, error: err.message || "WebSocket error" });
      });

      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.terminate();
          return res.status(504).json({ status: false, error: "Copilot timeout" });
        }
      }, 60_000);
    } catch (err) {
      return res.status(500).json({ status: false, error: err.message, detail: err.response?.data || null });
    }
  },
};
