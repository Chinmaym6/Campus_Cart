import { z } from "zod";
import * as repo from "./offers.repo.js";
import * as itemsRepo from "../marketplace/items/items.repo.js";
import * as txRepo from "../transactions/transactions.repo.js";
import { createNotification } from "../../utils/notify.js";

const CreateOfferSchema = z.object({
  item_id: z.coerce.number().int().positive(),
  amount_cents: z.coerce.number().int().min(0),
  message: z.string().max(2000).optional()
});

export async function create({ buyerId, body }) {
  const { item_id, amount_cents, message } = CreateOfferSchema.parse(body);

  const item = await itemsRepo.findByIdRaw(item_id);
  if (!item) { const e = new Error("Item not found"); e.status = 404; throw e; }
  if (item.seller_id === buyerId) { const e = new Error("Cannot offer on your own item"); e.status = 400; throw e; }
  if (item.status !== "active") { const e = new Error("Item is not available"); e.status = 400; throw e; }

  // Optionally: only one pending offer per buyer per item
  const existing = await repo.findPendingByBuyerAndItem({ buyerId, itemId: item_id });
  if (existing) { const e = new Error("You already have a pending offer for this item"); e.status = 409; throw e; }

  const offer = await repo.create({ item_id, buyer_id: buyerId, amount_cents, message });

  // Notify seller
  await createNotification(item.seller_id, "system", "New offer received", `₹${(amount_cents/100).toFixed(2)} for ${item.title}`, { itemId: item_id, offerId: offer.id });

  return offer;
}

export async function accept({ offerId, sellerId }) {
  const offer = await repo.findById(offerId);
  if (!offer) { const e = new Error("Offer not found"); e.status = 404; throw e; }

  const item = await itemsRepo.findByIdRaw(offer.item_id);
  if (!item) { const e = new Error("Item not found"); e.status = 404; throw e; }
  if (item.seller_id !== sellerId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  if (offer.status !== "pending") { const e = new Error("Offer is not pending"); e.status = 400; throw e; }
  if (item.status !== "active" && item.status !== "reserved") {
    const e = new Error("Item is not available"); e.status = 400; throw e;
  }

  // Accept this offer; reject other pending offers; reserve item
  await repo.accept(offerId);
  await repo.rejectOthersPending({ itemId: offer.item_id, exceptOfferId: offerId });
  await itemsRepo.updateStatus(offer.item_id, "reserved");

  // Create transaction (pending)
  const tx = await txRepo.create({
    item_id: offer.item_id,
    seller_id: sellerId,
    buyer_id: offer.buyer_id,
    agreed_price_cents: offer.amount_cents
  });

  // Notify buyer
  await createNotification(offer.buyer_id, "system", "Offer accepted", `Seller accepted your offer for ${item.title}`, { itemId: item.id, transactionId: tx.id });

  return { ok: true, transaction: tx };
}

export async function reject({ offerId, sellerId }) {
  const offer = await repo.findById(offerId);
  if (!offer) { const e = new Error("Offer not found"); e.status = 404; throw e; }
  const item = await itemsRepo.findByIdRaw(offer.item_id);
  if (!item) { const e = new Error("Item not found"); e.status = 404; throw e; }
  if (item.seller_id !== sellerId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  if (offer.status !== "pending") { const e = new Error("Offer is not pending"); e.status = 400; throw e; }

  await repo.reject(offerId);

  await createNotification(offer.buyer_id, "system", "Offer rejected", `Seller rejected your offer for ${item.title}`, { itemId: item.id, offerId });

  return { ok: true };
}

export async function withdraw({ offerId, buyerId }) {
  const offer = await repo.findById(offerId);
  if (!offer) { const e = new Error("Offer not found"); e.status = 404; throw e; }
  if (offer.buyer_id !== buyerId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  if (offer.status !== "pending") { const e = new Error("Offer is not pending"); e.status = 400; throw e; }

  await repo.withdraw(offerId);

  const item = await itemsRepo.findByIdRaw(offer.item_id);
  if (item) {
    await createNotification(item.seller_id, "system", "Offer withdrawn", `Buyer withdrew their offer for ${item.title}`, { itemId: item.id, offerId });
  }

  return { ok: true };
}

export async function listMine({ userId, role, query }) {
  const limit = Math.min(Number(query.limit || 50), 100);
  const offset = Number(query.offset || 0);
  if (role === "seller") {
    return repo.listForSeller({ sellerId: userId, limit, offset });
  }
  // default buyer
  return repo.listForBuyer({ buyerId: userId, limit, offset });
}

export async function listForItem({ sellerId, itemId, query }) {
  const item = await itemsRepo.findByIdRaw(itemId);
  if (!item) { const e = new Error("Item not found"); e.status = 404; throw e; }
  if (item.seller_id !== sellerId) { const e = new Error("Forbidden"); e.status = 403; throw e; }

  const limit = Math.min(Number(query.limit || 50), 100);
  const offset = Number(query.offset || 0);
  return repo.listForItem({ itemId, limit, offset });
}
