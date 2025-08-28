import * as S from "./offers.service.js";

export async function createOffer(req, res, next) {
  try {
    const buyerId = req.user.id;
    const { item_id, amount_cents, message } = req.body || {};
    const offer = await S.createOffer({ buyerId, itemId: Number(item_id), amountCents: Number(amount_cents), message });
    res.status(201).json({ offer });
  } catch (e) { next(e); }
}

export async function listOffersForItem(req, res, next) {
  try {
    const sellerId = req.user.id;
    const itemId = Number(req.params.itemId);
    const offers = await S.listOffersForItem({ sellerId, itemId });
    res.json({ offers });
  } catch (e) { next(e); }
}

export async function listMyOffers(req, res, next) {
  try {
    const buyerId = req.user.id;
    const offers = await S.listMyOffers({ buyerId });
    res.json({ offers });
  } catch (e) { next(e); }
}

export async function acceptOffer(req, res, next) {
  try {
    const sellerId = req.user.id;
    const offerId = Number(req.params.offerId);
    const result = await S.acceptOffer({ sellerId, offerId });
    res.json(result); // { offer, transaction }
  } catch (e) { next(e); }
}

export async function rejectOffer(req, res, next) {
  try {
    const sellerId = req.user.id;
    const offerId = Number(req.params.offerId);
    await S.rejectOffer({ sellerId, offerId });
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function withdrawOffer(req, res, next) {
  try {
    const buyerId = req.user.id;
    const offerId = Number(req.params.offerId);
    await S.withdrawOffer({ buyerId, offerId });
    res.status(204).end();
  } catch (e) { next(e); }
}
