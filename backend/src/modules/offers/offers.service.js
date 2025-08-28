import * as R from "./offers.repo.js";

export async function createOffer({ buyerId, itemId, amountCents, message }) {
  if (!itemId || !Number.isFinite(amountCents) || amountCents <= 0) {
    const e = new Error("item_id and positive amount_cents are required"); e.status = 400; throw e;
  }
  const item = await R.getItemForOffer(itemId);
  if (!item) { const e = new Error("Item not found"); e.status = 404; throw e; }
  if (item.seller_id === buyerId) { const e = new Error("Cannot offer on your own item"); e.status = 400; throw e; }
  if (item.status !== "active") { const e = new Error("Offers only allowed on active items"); e.status = 400; throw e; }
  if (!item.is_negotiable) { const e = new Error("Item is not negotiable"); e.status = 400; throw e; }

  return R.createOffer({ itemId, buyerId, amountCents, message });
}

export async function listOffersForItem({ sellerId, itemId }) {
  const item = await R.getItemForOffer(itemId);
  if (!item) { const e = new Error("Item not found"); e.status = 404; throw e; }
  if (item.seller_id !== sellerId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  return R.listOffersForItem(itemId);
}

export async function listMyOffers({ buyerId }) {
  return R.listOffersByBuyer(buyerId);
}

export async function acceptOffer({ sellerId, offerId }) {
  // atomically: check ownership + pending, accept, reject others, reserve item, create transaction
  return R.acceptOfferTx({ sellerId, offerId });
}

export async function rejectOffer({ sellerId, offerId }) {
  const offer = await R.getOfferForAction(offerId);
  if (!offer) { const e = new Error("Offer not found"); e.status = 404; throw e; }
  if (offer.seller_id !== sellerId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  if (offer.status !== "pending") { const e = new Error("Only pending offers can be rejected"); e.status = 400; throw e; }
  await R.setOfferStatus(offerId, "rejected");
}

export async function withdrawOffer({ buyerId, offerId }) {
  const offer = await R.getOfferForAction(offerId);
  if (!offer) { const e = new Error("Offer not found"); e.status = 404; throw e; }
  if (offer.buyer_id !== buyerId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  if (offer.status !== "pending") { const e = new Error("Only pending offers can be withdrawn"); e.status = 400; throw e; }
  await R.setOfferStatus(offerId, "withdrawn");
}
