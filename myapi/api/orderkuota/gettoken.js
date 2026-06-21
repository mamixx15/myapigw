import { OrderKuota } from "../../src/services/class/orderkuota.js";

export default {
  name: "OrderKuota Get Token",
  description: "Ambil token login menggunakan OTP",
  category: "OrderKuota",
  methods: ["GET"],
  params: ["username", "otp"],
  paramsSchema: {
    username: { type: "string", required: true, minLength: 1 },
    otp: { type: "string", required: true, minLength: 1 },
  },

  async run(req, res) {
    try {
      const { username, otp } = req.query;

      if (!username || !otp)
        return res.json({ status: false, error: "Missing username/otp" });

      const ok = new OrderKuota();
      const login = await ok.getAuthToken(username, otp);

      return res.json({ status: true, result: login.results });
    } catch (e) {
      return res.status(500).json({ status: false, error: e.message });
    }
  }
};
