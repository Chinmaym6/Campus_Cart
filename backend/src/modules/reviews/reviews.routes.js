import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as C from "./reviews.controller.js";

const router = Router();

router.post("/", requireAuth, C.createReview);
router.get("/user/:userId", C.listReviewsForUser);

export default router;
