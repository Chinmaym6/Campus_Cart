import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as controller from "./notifications.controller.js";

const r = Router();
r.get("/recent", requireAuth, controller.recent);

export default r;
