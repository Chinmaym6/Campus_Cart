import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as ctrl from "./offers.controller.js";

const router = Router();

// Create an offer
router.post("/", requireAuth, ctrl.create);

// Seller: accept / reject
router.post("/:id/accept", requireAuth, ctrl.accept);
router.post("/:id/reject", requireAuth, ctrl.reject);

// Buyer: withdraw
router.post("/:id/withdraw", requireAuth, ctrl.withdraw);

// List my offers (role=buyer|seller)
router.get("/mine", requireAuth, ctrl.listMine);

// Seller: offers for a specific item you own
router.get("/item/:itemId", requireAuth, ctrl.listForItem);

export default router;
