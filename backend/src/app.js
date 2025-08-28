import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { config } from "./config/index.js";
import { apiLimiter, authLimiter } from "./config/rateLimit.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

// routes
import authRoutes from "./modules/auth/auth.routes.js";
import itemsRoutes from "./modules/marketplace/items/items.routes.js";
import categoriesRoutes from "./modules/marketplace/categories/categories.routes.js";
import roommateRoutes from "./modules/roommate/roommate.routes.js";
import offersRoutes from "./modules/offers/offers.routes.js";
import transactionsRoutes from "./modules/transactions/transactions.routes.js";
import reviewsRoutes from "./modules/reviews/reviews.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";

const app = express();

// security + basics
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/uploads", express.static("uploads")); // images

// health
app.get("/", (_req, res) => res.json({ status: "Campus Cart API running 🚀" }));

// rate limits
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter); // stricter on auth

// mount routes
app.use("/api/auth", authRoutes);
app.use("/api/marketplace/items", itemsRoutes);
app.use("/api/marketplace/categories", categoriesRoutes);
app.use("/api/roommate", roommateRoutes);
app.use("/api/marketplace/offers", offersRoutes);
app.use("/api/marketplace/transactions", transactionsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/reports", reportsRoutes);

// 404 + error
app.use(notFound);
app.use(errorHandler);

export default app;
