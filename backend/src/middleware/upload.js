// backend/src/middleware/upload.js
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const UPLOADS_DIR = path.join(ROOT, "uploads");

// backend/src/middleware/upload.js
filename: (_req, file, cb) => {
  const ext = path.extname(file.originalname || "");
  const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
  cb(null, name);
}

// ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 8
  }
});

export default upload;
