import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import FileMeta from "../models/FileMeta.js";

const router = Router();
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const base = path.parse(file.originalname).name.replace(/[^\w\-]+/g, "_");
    const ext = path.extname(file.originalname) || ".mp4";
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isMp4 =
      file.mimetype === "video/mp4" ||
      path.extname(file.originalname).toLowerCase() === ".mp4";
    if (!isMp4) return cb(new Error("Only MP4 files are allowed."));
    cb(null, true);
  },
}).single("file");

router.post("/upload", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const { file } = req;
    if (!file) return res.status(400).json({ error: "No file uploaded." });

    
    if (file.size < 2 * 1024 * 1024)
      return res.status(400).json({ error: "File must be at least 10 MB." });

    try {
      if (process.env.MONGO_URI) {
        await FileMeta.create({
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        });
      }
    } catch (_) {}

    res.json({
      filename: file.filename,
      url: `/video/${encodeURIComponent(file.filename)}`,
      size: file.size,
    });
  });
});

router.get("/list", async (_req, res) => {
  if (process.env.MONGO_URI) {
    const files = await FileMeta.find().sort({ createdAt: -1 }).lean();
    return res.json(files);
  }
  const files = fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => f.toLowerCase().endsWith(".mp4"))
    .map((f) => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, f));
      return { filename: f, size: stat.size, createdAt: stat.mtime };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(files);
});

router.delete("/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "Not found" });

  try {
    fs.unlinkSync(filePath);
    if (process.env.MONGO_URI) {
      await FileMeta.deleteOne({ filename });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Delete failed" });
  }
});

router.get("/stream/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.sendStatus(404);

  const stat = fs.statSync(filePath);
  const total = stat.size;
  const mimeType = mime.lookup(filePath) || "video/mp4";

  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, {
      "Content-Length": total,
      "Content-Type": mimeType,
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
  const chunkSize = end - start + 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${total}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": mimeType,
  });
  fs.createReadStream(filePath, { start, end }).pipe(res);
});

export default router;
