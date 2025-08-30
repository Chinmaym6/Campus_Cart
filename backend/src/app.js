import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import router from "./routes.js";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import path from "path";
import { fileURLToPath } from "url";
import { apiLimiter } from "./config/rateLimit.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(requestLogger);
app.use("/api", apiLimiter());

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"))); 
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(
  "/api",
  rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true }),
  router
);

// IMPORTANT: errorHandler must be LAST and imported ONLY here
app.use(errorHandler);

export default app;
