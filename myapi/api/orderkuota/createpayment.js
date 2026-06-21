import { OrderKuota, createQRIS } from "../../src/services/class/orderkuota.js";

export default {
  name: "OrderKuota Create Payment",
  description: "Buat QRIS pembayaran",
  category: "OrderKuota",
  methods: ["GET"],
  params: ["username", "token", "amount"],
  paramsSchema: {
    username: { type: "string", required: true, minLength: 1 },
    token: { type: "string", required: true, minLength: 1 },
    amount: { type: "string", required: true, minLength: 1 },
  },

  async run(req, res) {
    try {
      const { username, token, amount } = req.query;

      if (!username || !token || !amount)
        return res.json({ status: false, error: "Missing parameters" });

      const ok = new OrderKuota(username, token);
      const qrcodeResp = await ok.generateQr(amount);

      if (!qrcodeResp.qris_data)
        return res.status(400).json({ status: false, error: "QRIS generation failed", raw: qrcodeResp });

      const result = await createQRIS(amount, qrcodeResp.qris_data);

      return res.json({ status: true, result });
    } catch (e) {
      return res.status(500).json({ status: false, error: e.message });
    }
  }
};
