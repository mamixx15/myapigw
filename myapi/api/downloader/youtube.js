import { exec } from "child_process";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { promisify } from "util";

const execAsync = promisify(exec);

export default {
  name: "YouTube Downloader",
  description: "Download YouTube audio/video lalu upload ke uguu.se",
  category: "Downloader",
  methods: ["GET"],
  params: ["url", "type"],
  paramsSchema: {
    url: {
      type: "string",
      required: true,
      minLength: 1,
    },
    type: {
      type: "string",
      required: true,
      enum: ["audio", "video"],
    },
  },

  async run(req, res) {
    let finalPath = null;

    try {
      const { url, type } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          code: 400,
          error: 'Parameter "url" wajib diisi',
        });
      }

      if (!type || !["audio", "video"].includes(type)) {
        return res.status(400).json({
          status: false,
          code: 400,
          error: 'Parameter "type" harus "audio" atau "video"',
        });
      }

      // upload ke /tmp/files
      const uploadDir = path.join("/tmp", "files");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = Date.now().toString();

      const outputTemplate = path.join(
        uploadDir,
        `${filename}.%(ext)s`
      );

      // info video
      const infoCommand =
        `python3 -m yt_dlp ` +
        `--dump-single-json ` +
        `--no-playlist "${url}"`;

      const { stdout: infoStdout } =
        await execAsync(infoCommand);

      const info = JSON.parse(infoStdout);

      let command;

      if (type === "audio") {
        command =
          `python3 -m yt_dlp ` +
          `-x --audio-format mp3 ` +
          `--audio-quality 0 ` +
          `--embed-thumbnail ` +
          `--embed-metadata ` +
          `--no-playlist ` +
          `-o "${outputTemplate}" "${url}"`;
      } else {
        command =
          `python3 -m yt_dlp ` +
          `-f "best[ext=mp4]/best" ` +
          `--no-playlist ` +
          `-o "${outputTemplate}" "${url}"`;
      }

      const { stdout, stderr } =
        await execAsync(command);

      console.log(stdout);
      console.log(stderr);

      const files = fs.readdirSync(uploadDir);

      const downloadedFile = files.find(
        (v) =>
          v.startsWith(filename) &&
          (
            v.endsWith(".mp3") ||
            v.endsWith(".mp4") ||
            v.endsWith(".mkv") ||
            v.endsWith(".webm")
          )
      );

      if (!downloadedFile) {
        return res.status(500).json({
          status: false,
          code: 500,
          error: "File gagal dibuat",
        });
      }

      finalPath = path.join(uploadDir, downloadedFile);

      const stats = fs.statSync(finalPath);

      // upload ke uguu
      const form = new FormData();

      form.append(
        "files[]",
        fs.createReadStream(finalPath)
      );

      const upload = await axios.post(
        "https://uguu.se/upload.php",
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      if (!upload.data?.files?.[0]?.url) {
        return res.status(500).json({
          status: false,
          code: 500,
          error: "Upload uguu gagal",
        });
      }

      const uploaded = upload.data.files[0];

      // hapus file tmp
      if (fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
      }

      return res.status(200).json({
        status: true,
        code: 200,
        type,
        result: {
          title: info.title,
          channel: info.uploader,
          duration: info.duration_string,
          views: info.view_count,
          upload_date: info.upload_date,
          thumbnail: info.thumbnail,
          description:
            info.description?.slice(0, 200) || null,

          filename: downloadedFile,

          mimetype:
            type === "audio"
              ? "audio/mpeg"
              : "video/mp4",

          size: `${(
            stats.size /
            1024 /
            1024
          ).toFixed(2)} MB`,

          download: uploaded.url,
        },
      });

    } catch (error) {
      console.log(error);

      // hapus file jika error
      if (finalPath && fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
      }

      return res.status(500).json({
        status: false,
        code: 500,
        error:
          error?.response?.data ||
          error?.stderr ||
          error.message,
      });
    }
  },
};