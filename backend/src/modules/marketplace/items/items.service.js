// backend/src/modules/marketplace/items/items.service.js
import { z } from "zod";
import * as repo from "./items.repo.js";

const emptyToUndef = (v) => (v === "" || v === null || v === undefined ? undefined : v);

/* ---------- LIST / SAVED ---------- */

const ListQuerySchema = z.object({
  q: z.preprocess(emptyToUndef, z.string().optional()),
  category_id: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).optional()),
  min_price: z.preprocess(emptyToUndef, z.coerce.number().int().nonnegative().optional()),
  max_price: z.preprocess(emptyToUndef, z.coerce.number().int().nonnegative().optional()),
  condition: z.preprocess(
    emptyToUndef,
    z.enum(["new","like_new","good","fair","poor"]).optional()
  ),
  within_km: z.preprocess(emptyToUndef, z.coerce.number().positive().max(200).optional()),
  sort: z.preprocess(emptyToUndef, z.enum(["new","price_asc","price_desc","distance"]).default("new")),
  page: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).default(1)),
  page_size: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(50).default(20)),
});

export async function list({ viewerId, query }) {
  const q = ListQuerySchema.parse(query || {});
  return repo.search({ viewerId, ...q });
}

export async function listSaved({ viewerId, query }) {
  const SavedQ = z.object({
    limit: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(20).default(4)),
  });
  const q = SavedQ.parse(query || {});
  return repo.getSavedItems({ viewerId, limit: q.limit });
}

/* ---------- CREATE ---------- */

const CreateSchema = z.object({
  title: z.string().min(3),
  description: z.preprocess(emptyToUndef, z.string().optional()),
  category_id: z.preprocess(emptyToUndef, z.coerce.number().int().min(1)),
  condition: z.enum(["new","like_new","good","fair","poor"]),
  price_cents: z.coerce.number().int().nonnegative(),
  is_negotiable: z.preprocess(emptyToUndef, z.coerce.boolean().default(true)),
  latitude: z.preprocess(emptyToUndef, z.coerce.number().optional()),
  longitude: z.preprocess(emptyToUndef, z.coerce.number().optional()),
});

export async function create({ sellerId, body, files }) {
  const payload = CreateSchema.parse(body);
  const item = await repo.createItem({ sellerId, ...payload });
  if (files?.length) {
    await repo.addPhotos(item.id, files.map(f => f.filename));
  }
  return repo.getItemDetails({ viewerId: sellerId, id: item.id });
}

/* ---------- UPDATE / DELETE ---------- */

const UpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  category_id: z.coerce.number().int().min(1).optional(),
  condition: z.enum(["new","like_new","good","fair","poor"]).optional(),
  price_cents: z.coerce.number().int().nonnegative().optional(),
  is_negotiable: z.coerce.boolean().optional(),
  status: z.enum(["draft","active","reserved","sold","deleted"]).optional(),
});

export async function update({ sellerId, id, body }) {
  const existing = await repo.getItemById(id);
  if (!existing) { const e = new Error("Not found"); e.status = 404; throw e; }
  if (existing.seller_id !== sellerId) { const e = new Error("Forbidden"); e.status = 403; throw e; }

  const patch = UpdateSchema.parse(body);
  if (patch.price_cents != null && patch.price_cents !== existing.price_cents) {
    await repo.recordPriceChange({ item_id: id, old_price: existing.price_cents, new_price: patch.price_cents });
  }
  await repo.updateItem(id, patch);
  return repo.getItemDetails({ viewerId: sellerId, id });
}

export async function remove({ sellerId, id }) {
  const existing = await repo.getItemById(id);
  if (!existing) { const e = new Error("Not found"); e.status = 404; throw e; }
  if (existing.seller_id !== sellerId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  await repo.updateItem(id, { status: "deleted" });
}

/* ---------- DETAILS ---------- */

export async function getById({ viewerId, id }) {
  const IdSchema = z.object({ id: z.coerce.number().int().min(1) });
  const { id: itemId } = IdSchema.parse({ id });
  return repo.getItemDetails({ viewerId, id: itemId });
}

/* ---------- SAVE / UNSAVE ---------- */

export async function saveItem({ userId, id }) {
  await repo.saveItem({ userId, item_id: Number(id) });
}
export async function unsaveItem({ userId, id }) {
  await repo.unsaveItem({ userId, item_id: Number(id) });
}
