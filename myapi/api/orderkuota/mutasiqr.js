import { OrderKuota } from "../../src/services/class/orderkuota.js";

export default {
  name: "OrderKuota Mutasi QR",
  description: "Cek mutasi QRIS",
  category: "OrderKuota",
  methods: ["GET"],
  params: ["username", "token"],
  paramsSchema: {
    username: { type: "string", required: true, minLength: 1 },
    token: { type: "string", required: true, minLength: 1 },
  },

  async run(req, res) {
    try {
      const { username, token } = req.query;

      if (!username || !token)
        return res.json({ status: false, error: "Missing username/token" });

      const ok = new OrderKuota(username, token);
      const data = await ok.getTransactionQris();

      return res.json({ status: true, result: data.qris_history?.results });
    } catch (e) {
      return res.status(500).json({ status: false, error: e.message });
    }
  }
};
