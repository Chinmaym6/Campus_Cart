import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as C from "./offers.controller.js";

const router = Router();

// Buyer creates an offer
router.post("/", requireAuth, C.createOffer);

// Seller lists offers for own item
router.get("/items/:itemId", requireAuth, C.listOffersForItem);

// Buyer lists their own offers
router.get("/mine", requireAuth, C.listMyOffers);

// Seller actions
router.post("/:offerId/accept", requireAuth, C.acceptOffer);
router.post("/:offerId/reject", requireAuth, C.rejectOffer);

// Buyer action
router.post("/:offerId/withdraw", requireAuth, C.withdrawOffer);

export default router;
