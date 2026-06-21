import axios from "axios";
import { Buffer } from "buffer";

class GitHubUrlParser {
  constructor(options = {}) {
    this.headers = {
      "User-Agent": options.userAgent || "github-data-fetcher",
      ...(options.token && { Authorization: `token ${options.token}` }),
    };
  }

  parseUrl(url) {
    const patterns = {
      repo: /https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/)?$/,
      file: /https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/,
      raw: /https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/,
      gist: /https?:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)/,
    };

    for (const [type, regex] of Object.entries(patterns)) {
      const match = url.match(regex);
      if (match) return { type, match };
    }

    throw new Error(
      "URL tidak valid. Format yang didukung: repo, file, raw, atau gist URL GitHub"
    );
  }

  async getRepoData(user, repo) {
    const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
    const { data } = await axios.get(apiUrl, {
      headers: this.headers,
      timeout: 30000,
    });

    const {
      default_branch,
      description,
      stargazers_count,
      forks_count,
      topics,
    } = data;

    return {
      type: "repository",
      owner: user,
      repo,
      description,
      default_branch,
      stars: stargazers_count,
      forks: forks_count,
      topics,
      download_url: `https://github.com/${user}/${repo}/archive/refs/heads/${default_branch}.zip`,
      clone_url: `https://github.com/${user}/${repo}.git`,
      api_url: apiUrl,
    };
  }

  async getFileData(user, repo, branch, path) {
    const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/${path}?ref=${branch}`;
    const { data } = await axios.get(apiUrl, {
      headers: this.headers,
      timeout: 30000,
    });

    return {
      type: "file",
      owner: user,
      repo,
      branch,
      path,
      name: data.name,
      size: data.size,
      raw_url: data.download_url,
      content: Buffer.from(data.content, "base64").toString(),
      sha: data.sha,
      api_url: apiUrl,
    };
  }

  async getGistData(user, gistId) {
    const apiUrl = `https://api.github.com/gists/${gistId}`;
    const { data } = await axios.get(apiUrl, {
      headers: this.headers,
      timeout: 30000,
    });

    const files = Object.entries(data.files).map(([filename, file]) => ({
      name: filename,
      language: file.language,
      raw_url: file.raw_url,
      size: file.size,
      content: file.content,
    }));

    return {
      type: "gist",
      owner: user,
      gist_id: gistId,
      description: data.description,
      files,
      created_at: data.created_at,
      updated_at: data.updated_at,
      comments: data.comments,
      api_url: apiUrl,
    };
  }

  async getData(url) {
    const { type, match } = this.parseUrl(url);
    switch (type) {
      case "repo":
        return await this.getRepoData(match[1], match[2]);
      case "file":
        return await this.getFileData(match[1], match[2], match[3], match[4]);
      case "gist":
        return await this.getGistData(match[1], match[2]);
      default:
        throw new Error("Format URL tidak didukung");
    }
  }
}

export default {
  name: "GitHub Downloader",
  description: "Fetch data from GitHub URLs (repositories, files, gists)",
  category: "Downloader",
  methods: ["GET"],
  params: ["url"],
  paramsSchema: {
    url: { type: "string", required: true, minLength: 1 },
  },

  async run(req, res) {
    try {
      const url = req.query.url;

      if (!url || typeof url !== "string" || url.trim().length === 0) {
        return res
          .status(400)
          .json({ error: 'Parameter "url" harus diisi dan berupa string' });
      }

      const parser = new GitHubUrlParser();
      const data = await parser.getData(url.trim());

      return res.status(200).json({
        status: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(error.message.includes("not found") ? 404 : 500).json({
        status: false,
        error: error.message,
        code: error.message.includes("not found") ? 404 : 500,
      });
    }
  },
};
