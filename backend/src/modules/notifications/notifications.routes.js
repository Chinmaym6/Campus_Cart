import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as C from "./notifications.controller.js";
import { sendEmail } from "../../utils/mailer.js";


const router = Router();

router.get("/", requireAuth, C.listNotifications);
router.patch("/:id/read", requireAuth, C.markRead);
router.patch("/read-all", requireAuth, C.markAllRead);
router.get("/settings", requireAuth, C.getSettings);
router.put("/settings", requireAuth, C.updateSettings);
router.post("/_test-mail", async (req, res) => {
  const to = req.body?.to || process.env.SMTP_USER;
  await sendEmail(to, "Campus Cart test email", "It works! 🚀", "<p>It works! 🚀</p>");
  res.json({ ok: true });
});

export default router;
