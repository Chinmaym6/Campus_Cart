import * as S from "./items.service.js";
import { getViewerId } from "../../../middleware/auth.js";
import { logSearch } from "../../../utils/searchLog.js";

export async function createItem(req, res, next) {
  try {
    const sellerId = req.user.id;
    const body = req.body || {};
    const files = req.files || [];
    const item = await S.createItem({ sellerId, body, files });
    res.status(201).json({ item });
  } catch (e) { next(e); }
}

export async function getItemById(req, res, next) {
  try {
    const viewerId = getViewerId(req);
    const item = await S.getItemById({ id: Number(req.params.id), viewerId });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ item });
  } catch (e) { next(e); }
}

export async function searchItems(req, res, next) {
  try {
    const viewerId = getViewerId(req);
    const q = { ...req.query, viewerId };
    const result = await S.searchItems(q);

    // 🔎 log viewer searches (only if we can identify the viewer)
    if (viewerId && (q.q || q.categoryId)) {
      await logSearch(viewerId, q.q || "items-search", {
        categoryId: q.categoryId ?? null,
        minPrice: q.minPrice ?? null,
        maxPrice: q.maxPrice ?? null,
        lat: q.lat ?? null,
        lon: q.lon ?? null,
        radiusKm: q.radiusKm ?? null,
        sort: q.sort ?? "newest"
      });
    }

    res.json(result);
  } catch (e) { next(e); }
}

export async function updateItem(req, res, next) {
  try {
    const sellerId = req.user.id;
    const id = Number(req.params.id);
    const body = req.body || {};
    const files = req.files || [];
    const item = await S.updateItem({ id, sellerId, body, files });
    res.json({ item });
  } catch (e) { next(e); }
}

export async function deleteItem(req, res, next) {
  try {
    const sellerId = req.user.id;
    const id = Number(req.params.id);
    await S.deleteItem({ id, sellerId });
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function saveItem(req, res, next) {
  try {
    await S.saveItem({ userId: req.user.id, itemId: Number(req.params.id) });
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function unsaveItem(req, res, next) {
  try {
    await S.unsaveItem({ userId: req.user.id, itemId: Number(req.params.id) });
    res.status(204).end();
  } catch (e) { next(e); }
}
