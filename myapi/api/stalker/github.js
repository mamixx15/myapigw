import axios from "axios";

export default {
  name: "GitHub Stalker",
  description: "Ambil informasi lengkap profil GitHub secara publik.",
  category: "stalker",
  methods: ["GET"],
  params: ["user"],
  paramsSchema: {
    user: { type: "string", required: true, minLength: 1, maxLength: 255 },
  },

  async run(req, res) {
    try {
      const { user } = req.query;

      if (!user)
        return res
          .status(400)
          .json({ status: false, error: 'Parameter "user" wajib diisi' });

      const { data } = await axios.get(`https://api.github.com/users/${user}`);

      const hasil = {
        username: data.login || null,
        nickname: data.name || null,
        bio: data.bio || null,
        id: data.id || null,
        nodeId: data.node_id || null,
        profile_pic: data.avatar_url || null,
        url: data.html_url || null,
        type: data.type || null,
        admin: data.site_admin || false,
        company: data.company || null,
        blog: data.blog || null,
        location: data.location || null,
        email: data.email || null,
        public_repo: data.public_repos || 0,
        public_gists: data.public_gists || 0,
        followers: data.followers || 0,
        following: data.following || 0,
        created_at: data.created_at || null,
        updated_at: data.updated_at || null,
      };

      return res.status(200).json({
        status: true,
        source: "api.github.com",
        result: hasil,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        error: error.response?.data?.message || error.message || "Internal Server Error",
      });
    }
  },
};
