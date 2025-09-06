import * as service from "./items.service.js";

export async function list(req, res, next) {
  try {
    const items = await service.list({ viewerId: req.user?.id, query: req.query });
    res.json({ items });
  } catch (e) { next(e); }
}

export async function listSaved(req, res, next) {
  try {
    const items = await service.listSaved({ viewerId: req.user.id, query: req.query });
    res.json({ items });
  } catch (e) { next(e); }
}

export async function getById(req, res, next) {
  try {
    const item = await service.getById({ viewerId: req.user?.id, id: req.params.id });
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json({ item });
  } catch (e) { next(e); }
}

export async function create(req, res, next) {
  try {
    const item = await service.create({ sellerId: req.user.id, body: req.body, files: req.files });
    res.status(201).json({ item });
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const item = await service.update({ sellerId: req.user.id, id: Number(req.params.id), body: req.body });
    res.json({ item });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    await service.remove({ sellerId: req.user.id, id: Number(req.params.id) });
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function save(req, res, next) {
  try {
    await service.saveItem({ userId: req.user.id, id: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function unsave(req, res, next) {
  try {
    await service.unsaveItem({ userId: req.user.id, id: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function listMine(req, res, next) {
  try {
    const items = await service.listMine({
      sellerId: req.user.id,
      query: req.query
    });
    res.json({ items });
  } catch (e) { next(e); }
}