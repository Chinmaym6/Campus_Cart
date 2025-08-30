import * as service from "./categories.service.js";

export async function list(req, res, next) {
  try {
    res.json({ categories: await service.list() });
  } catch (e) { next(e); }
}
