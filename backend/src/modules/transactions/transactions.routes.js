import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as C from "./transactions.controller.js";

const router = Router();

router.get("/:id", requireAuth, C.getTransaction);
router.patch("/:id/complete", requireAuth, C.completeTransaction);
router.patch("/:id/cancel", requireAuth, C.cancelTransaction);

export default router;
