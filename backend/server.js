const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = path.resolve(__dirname, "..");
const WEB_DIR = path.join(ROOT, "web");
const DATA_DIR = path.join(WEB_DIR, "data");
const UPLOAD_DIR = path.join(ROOT, "web", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(WEB_DIR));

function readJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

app.get("/api/pages", (_req, res) => {
  const pages = readJson("pages.json");
  if (!pages) {
    return res.status(404).json({ error: "pages.json not found. Run: npm run build:data" });
  }
  res.json(pages);
});

app.get("/api/graph", (_req, res) => {
  const graph = readJson("graph.json");
  if (!graph) {
    return res.status(404).json({ error: "graph.json not found. Run: npm run build:data" });
  }
  res.json(graph);
});

app.post("/api/author/save", (req, res) => {
  const payload = req.body;
  if (!payload || !payload.pages || !payload.graph) {
    return res.status(400).json({ error: "Expected { pages, graph } payload." });
  }

  const outPath = path.join(DATA_DIR, "authored-story.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf-8");
  res.json({ ok: true, file: "web/data/authored-story.json" });
});

app.post("/api/upload/pdf", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing PDF file." });
  }

  // PDF parsing is done client-side in the authoring tool with PDF.js.
  res.json({
    ok: true,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    message: "PDF uploaded. Use Authoring import tools to extract text into story nodes.",
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(WEB_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`CYOA web server running on http://localhost:${PORT}`);
});