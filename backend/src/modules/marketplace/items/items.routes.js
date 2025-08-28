import { Router } from "express";
import { requireAuth } from "../../../middleware/auth.js";
import { upload } from "../../../middleware/upload.js";
import * as C from "./items.controller.js";
import { validate, zod as z } from "../../../middleware/validate.js";
import { contentGuard } from "../../../middleware/contentGuard.js";

const createItemSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(140),
    description: z.string().max(3000).optional(),
    condition: z.enum(["new","like_new","good","fair","poor"]),
    price_cents: z.coerce.number().int().nonnegative(),
    is_negotiable: z.coerce.boolean().optional(),
    category_id: z.coerce.number().int().positive(),
    isbn: z.string().max(32).optional(),
    brand: z.string().max(64).optional(),
    model: z.string().max(64).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional()
  })
});

const router = Router();

router.post("/",
  requireAuth,
  upload.array("photos", 8),
  validate(createItemSchema),
  contentGuard(["title","description"]),
  C.createItem
);

router.get("/", C.searchItems);
router.get("/:id", C.getItemById);
router.patch("/:id", requireAuth, upload.array("photos", 8), C.updateItem);
router.delete("/:id", requireAuth, C.deleteItem);
router.post("/:id/save", requireAuth, C.saveItem);
router.delete("/:id/save", requireAuth, C.unsaveItem);

export default router;
