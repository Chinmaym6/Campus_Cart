import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as C from "./roommate.controller.js";

const router = Router();

// CRUD for my roommate post
router.post("/posts", requireAuth, C.createPost);
router.patch("/posts/:id", requireAuth, C.updatePost);
router.delete("/posts/:id", requireAuth, C.deletePost);

// Public browse + details
router.get("/posts", C.searchPosts);
router.get("/posts/:id", C.getPostById);

// Compatibility
router.get("/posts/:id/compatibility", requireAuth, C.getCompatibilityForPost);
router.get("/me/matches/top", requireAuth, C.listTopMatchesForMe);

export default router;
