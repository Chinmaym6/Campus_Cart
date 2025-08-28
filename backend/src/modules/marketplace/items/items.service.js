import * as R from "./items.repo.js";
import { storage } from "../../../config/storage.js";

const isNum = (v)=>Number.isFinite(Number(v)) ? Number(v) : null;
const toBool = (v, d)=>{
  if (v===undefined) return d;
  if (typeof v==="boolean") return v;
  const s=String(v).toLowerCase();
  if (["true","1","yes"].includes(s)) return true;
  if (["false","0","no"].includes(s)) return false;
  return d;
};

export async function createItem({ sellerId, body, files }) {
  const payload = {
    title: body.title?.trim(),
    description: body.description?.trim() || null,
    condition: body.condition || "good",
    price_cents: isNum(body.price_cents),
    is_negotiable: toBool(body.is_negotiable, true),
    category_id: isNum(body.category_id),
    isbn: body.isbn?.trim() || null,
    brand: body.brand?.trim() || null,
    model: body.model?.trim() || null,
    latitude: body.latitude ? Number(body.latitude) : null,
    longitude: body.longitude ? Number(body.longitude) : null,
  };
  if (!payload.title || !payload.category_id || payload.price_cents==null) {
    const e = new Error("title, category_id, price_cents are required"); e.status=400; throw e;
  }
  const item = await R.createItem(sellerId, payload);

  if (files?.length) {
    const photos = [];
    for (let i=0;i<files.length;i++) {
      const saved = await storage.save(files[i], "items");
      photos.push(await R.addPhoto(item.id, saved.path, i));
    }
    item.photos = photos;
  } else item.photos = [];

  return item;
}

export async function getItemById({ id, viewerId }) {
  const item = await R.getItemById(id, viewerId);
  if (!item) return null;
  item.photos = await R.getItemPhotos(id);
  return item;
}

export async function searchItems(q) {
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(q.pageSize) || 20));

  const filters = {
    q: q.q?.trim() || null,
    categoryId: q.categoryId ? Number(q.categoryId) : null,
    status: q.status || "active",
    minPrice: q.minPrice ? Number(q.minPrice) : null,
    maxPrice: q.maxPrice ? Number(q.maxPrice) : null,
    lat: q.lat ? Number(q.lat) : null,
    lon: q.lon ? Number(q.lon) : null,
    radiusKm: q.radiusKm ? Number(q.radiusKm) : null,
    sort: q.sort || "newest",
  };

  const { rows, total } = await R.searchItems(filters, { page, pageSize });
  const ids = rows.map(r => r.id);
  const photosMap = await R.getFirstPhotosMap(ids);
  const savedMap = q.viewerId ? await R.getSavedMap(q.viewerId, ids) : {};
  const items = rows.map(r => ({
    ...r,
    cover_photo: photosMap[r.id] || null,
    is_saved: !!savedMap[r.id]
  }));
  return { items, page, pageSize, total };
}

export async function updateItem({ id, sellerId, body, files }) {
  const item = await R.getItemByIdBasic(id);
  if (!item) { const e = new Error("Item not found"); e.status=404; throw e; }
  if (item.seller_id !== Number(sellerId)) { const e = new Error("Forbidden"); e.status=403; throw e; }

  const patch = {
    title: body.title?.trim(),
    description: body.description?.trim(),
    condition: body.condition,
    price_cents: body.price_cents!==undefined ? Number(body.price_cents) : undefined,
    is_negotiable: body.is_negotiable!==undefined ? toBool(body.is_negotiable, true) : undefined,
    category_id: body.category_id!==undefined ? Number(body.category_id) : undefined,
    isbn: body.isbn?.trim(),
    brand: body.brand?.trim(),
    model: body.model?.trim(),
    status: body.status,
    latitude: body.latitude!==undefined ? Number(body.latitude) : undefined,
    longitude: body.longitude!==undefined ? Number(body.longitude) : undefined,
  };

  const updated = await R.updateItem(id, patch);

  if (files?.length) {
    const existingCount = (await R.getItemPhotos(id)).length;
    for (let i=0;i<files.length;i++) {
      const saved = await storage.save(files[i], "items");
      await R.addPhoto(id, saved.path, existingCount + i);
    }
  }
  updated.photos = await R.getItemPhotos(id);
  return updated;
}

export async function deleteItem({ id, sellerId }) {
  const item = await R.getItemByIdBasic(id);
  if (!item) { const e=new Error("Item not found"); e.status=404; throw e; }
  if (item.seller_id !== Number(sellerId)) { const e=new Error("Forbidden"); e.status=403; throw e; }
  await R.softDeleteItem(id);
}

export async function saveItem({ userId, itemId }) {
  await R.saveItem(userId, itemId);
}
export async function unsaveItem({ userId, itemId }) {
  await R.unsaveItem(userId, itemId);
}
