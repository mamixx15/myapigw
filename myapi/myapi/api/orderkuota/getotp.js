import { OrderKuota } from "../../src/services/class/orderkuota.js";

export default {
  name: "OrderKuota Get OTP",
  description: "Ambil OTP untuk login",
  category: "OrderKuota",
  methods: ["GET"],
  params: ["username", "password"],
  paramsSchema: {
    username: { type: "string", required: true, minLength: 1 },
    password: { type: "string", required: true, minLength: 1 },
  },

  async run(req, res) {
    try {
      const { username, password } = req.query;

      if (!username || !password)
        return res.status(400).json({ status: false, error: "Missing username/password" });

      const ok = new OrderKuota();
      const login = await ok.loginRequest(username, password);

      return res.json({ status: true, result: login.results });
    } catch (e) {
      return res.status(500).json({ status: false, error: e.message });
    }
  }
};
