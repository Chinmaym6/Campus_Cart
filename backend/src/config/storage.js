import fs from "fs";
import path from "path";
import { config } from "./index.js";

export function saveLocal(file) {
  // multer already stores under /uploads, return path
  return file.path;
}

export function deleteLocal(filePath) {
  const p = path.resolve(filePath);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  return true;
}

export const storageConfig = { uploadsDir: config.uploadsDir };
