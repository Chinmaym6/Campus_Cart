import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as controller from "./roommate.controller.js";

const r = Router();

r.get("/matches", requireAuth, controller.matches);

export default r;
