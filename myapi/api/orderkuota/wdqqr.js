import { OrderKuota } from "../../src/services/class/orderkuota.js";

export default {
  name: "OrderKuota Withdraw QR",
  description: "Withdraw saldo QRIS",
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
      const wd = await ok.withdrawalQris(amount);

      return res.json({ status: true, result: wd });
    } catch (e) {
      return res.status(500).json({ status: false, error: e.message });
    }
  }
};
