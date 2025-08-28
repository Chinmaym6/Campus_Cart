import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");

// policy
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXT  = new Set([".jpg", ".jpeg", ".png", ".webp"]);

if (!fs.existsSync(UPLOADS_ROOT)) {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
}

function sniffMime(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg"; // JPEG
  const pngSig = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
  if (pngSig.every((b,i)=>buffer[i]===b)) return "image/png";        // PNG
  const riff = buffer.slice(0,4).toString("ascii");
  const webp = buffer.slice(8,12).toString("ascii");
  if (riff==="RIFF" && webp==="WEBP") return "image/webp";           // WEBP
  return null;
}
const badReq = (m)=>Object.assign(new Error(m),{status:400});

export const storage = {
  async save(file, subdir = "") {
    if (!file?.buffer) throw badReq("No file provided");
    const size = typeof file.size === "number" ? file.size : file.buffer.length;
    if (size > MAX_FILE_SIZE) throw badReq("File too large (max 5MB)");

    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXT.has(ext)) throw badReq("Invalid file extension");
    if (!ALLOWED_MIME.has(file.mimetype)) throw badReq("Invalid MIME type");

    const sniffed = sniffMime(file.buffer);
    if (!sniffed || !ALLOWED_MIME.has(sniffed)) throw badReq("Invalid image data");

    const safeSub = subdir.replace(/(\.\.[/\\])+/, "");
    const dir = path.join(UPLOADS_ROOT, safeSub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const absPath = path.join(dir, filename);
    await fs.promises.writeFile(absPath, file.buffer, { flag: "wx" });

    const relPath = `/${safeSub}/${filename}`.replace(/\/+/g, "/");
    return { path: relPath, fullPath: absPath, url: this.url(relPath) };
  },

  async remove(relPath) {
    if (!relPath) return;
    const abs = path.join(UPLOADS_ROOT, relPath);
    try { await fs.promises.unlink(abs); } catch {}
  },

  url(relPath) {
    return `/uploads${relPath.startsWith("/") ? "" : "/"}${relPath}`;
  }
};
