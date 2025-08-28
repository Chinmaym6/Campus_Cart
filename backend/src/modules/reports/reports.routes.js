import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as C from "./reports.controller.js";
import { validate, zod as z } from "../../middleware/validate.js";
import { contentGuard } from "../../middleware/contentGuard.js";

// schemas
const createSchema = z.object({
  body: z.object({
    target_type: z.enum(["item","user","roommate_post","message"]),
    target_id: z.coerce.number().int().positive(),
    reason: z.string().min(3).max(200),
    details: z.string().max(2000).optional()
  })
});

const resolveSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() })
});

const router = Router();

// user creates report
router.post("/",
  requireAuth,
  validate(createSchema),
  contentGuard(["reason", "details"]),
  C.createReport
);

// list my reports
router.get("/mine", requireAuth, C.listMyReports);

// admin/moderator endpoints (restrict in the future via role)
router.get("/", requireAuth, C.listAllReports);
router.patch("/:id/resolve", requireAuth, validate(resolveSchema), C.resolveReport);

export default router;
