import * as service from "./offers.service.js";

export async function create(req, res, next) {
  try {
    const offer = await service.create({
      buyerId: req.user.id,
      body: req.body
    });
    res.status(201).json({ offer });
  } catch (e) { next(e); }
}

export async function accept(req, res, next) {
  try {
    const result = await service.accept({
      offerId: Number(req.params.id),
      sellerId: req.user.id
    });
    res.json(result);
  } catch (e) { next(e); }
}

export async function reject(req, res, next) {
  try {
    const result = await service.reject({
      offerId: Number(req.params.id),
      sellerId: req.user.id
    });
    res.json(result);
  } catch (e) { next(e); }
}

export async function withdraw(req, res, next) {
  try {
    const result = await service.withdraw({
      offerId: Number(req.params.id),
      buyerId: req.user.id
    });
    res.json(result);
  } catch (e) { next(e); }
}

export async function listMine(req, res, next) {
  try {
    const role = (req.query.role || "buyer").toLowerCase(); // buyer|seller
    const list = await service.listMine({ userId: req.user.id, role, query: req.query });
    res.json({ offers: list });
  } catch (e) { next(e); }
}

export async function listForItem(req, res, next) {
  try {
    const offers = await service.listForItem({
      sellerId: req.user.id,
      itemId: Number(req.params.itemId),
      query: req.query
    });
    res.json({ offers });
  } catch (e) { next(e); }
}
