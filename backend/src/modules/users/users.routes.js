import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as controller from "./users.controller.js";

const r = Router();

r.post("/location", requireAuth, controller.setMyLocation);
r.get("/me/stats", requireAuth, controller.myStats);
export default r;
