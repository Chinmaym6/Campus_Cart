import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import categoriesRoutes from "./modules/marketplace/categories/categories.routes.js";
import itemsRoutes from "./modules/marketplace/items/items.routes.js";
import roommateRoutes from "./modules/roommate/roommate.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";

const r = Router();
r.use("/auth", authRoutes);
r.use("/users", usersRoutes);
r.use("/categories", categoriesRoutes);
r.use("/items", itemsRoutes);
r.use("/roommate", roommateRoutes);
r.use("/notifications", notificationsRoutes);
export default r;
