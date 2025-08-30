import * as service from "./items.service.js";

export async function list(req, res, next) {
  try {
    const viewerId = req.user.id;
    const data = await service.list({ viewerId, query: req.query });
    res.json({ items: data });
  } catch (e) { next(e); }
}

export async function getById(req, res, next) {
  try {
    const id = req.params.id;
    const item = await service.getById({ viewerId: req.user?.id, id });
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json({ item });
  } catch (e) { next(e); }
}

export async function listSaved(req, res, next) {
  try {
    const viewerId = req.user.id;
    const data = await service.listSaved({ viewerId, query: req.query });
    res.json({ items: data });
  } catch (e) { next(e); }
}


export async function create(req, res, next) {
  try {
    const sellerId = req.user.id;
    const files = req.files || [];
    const item = await service.create({ sellerId, body: req.body, files });
    res.status(201).json({ item });
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const sellerId = req.user.id;
    const id = Number(req.params.id);
    const item = await service.update({ sellerId, id, body: req.body });
    res.json({ item });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const sellerId = req.user.id;
    const id = Number(req.params.id);
    await service.remove({ sellerId, id });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function saveItem(req, res, next) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    await service.saveItem({ userId, id });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function unsaveItem(req, res, next) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    await service.unsaveItem({ userId, id });
    res.json({ ok: true });
  } catch (e) { next(e); }
}
