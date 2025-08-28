import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as C from "./chat.controller.js";
import { upload } from "../../middleware/upload.js";

const router = Router();

// Start/find a 1:1 conversation
router.post("/conversations", requireAuth, C.startConversation);

// List my conversations (with last message + unread count)
router.get("/conversations", requireAuth, C.listMyConversations);

// Get messages in a conversation
router.get("/conversations/:id/messages", requireAuth, C.listMessages);

// Send a message (REST fallback; Socket.IO is preferred)
router.post("/conversations/:id/messages", requireAuth, upload.single("attachment"), C.sendMessage);

// Mark read
router.patch("/conversations/:id/read", requireAuth, C.markRead);

export default router;
