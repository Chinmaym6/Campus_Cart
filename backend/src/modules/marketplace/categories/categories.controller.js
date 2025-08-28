import * as R from "./categories.repo.js";
export async function listCategories(req, res, next) {
  try {
    const categories = await R.listCategories();
    res.json({ categories });
  } catch (e) { next(e); }
}
