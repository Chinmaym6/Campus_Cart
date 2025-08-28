import * as S from "./roommate.service.js";
import { getViewerId } from "../../middleware/auth.js";
import { logSearch } from "../../utils/searchLog.js";

export async function createPost(req, res, next) {
  try {
    const post = await S.createPost(req.user.id, req.body || {});
    res.status(201).json({ post });
  } catch (e) { next(e); }
}

export async function updatePost(req, res, next) {
  try {
    const post = await S.updatePost(req.user.id, Number(req.params.id), req.body || {});
    res.json({ post });
  } catch (e) { next(e); }
}

export async function deletePost(req, res, next) {
  try {
    await S.deletePost(req.user.id, Number(req.params.id));
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function searchPosts(req, res, next) {
  try {
    const viewerId = getViewerId(req);
    const result = await S.searchPosts(req.query || {});

    // 🔎 log viewer roommate searches when meaningful
    if (viewerId && (req.query.q || req.query.housing || req.query.gender)) {
      await logSearch(viewerId, req.query.q || "roommate-search", {
        housing: req.query.housing ?? null,
        gender: req.query.gender ?? null,
        lat: req.query.lat ?? null,
        lon: req.query.lon ?? null,
        radiusKm: req.query.radiusKm ?? null,
        sort: req.query.sort ?? "newest"
      });
    }

    res.json(result); // { posts, page, pageSize, total }
  } catch (e) { next(e); }
}

export async function getPostById(req, res, next) {
  try {
    const post = await S.getPostById(Number(req.params.id));
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ post });
  } catch (e) { next(e); }
}

export async function getCompatibilityForPost(req, res, next) {
  try {
    const result = await S.getCompatibilityForPost({
      viewerId: req.user.id,
      postId: Number(req.params.id)
    });
    res.json(result); // { score_percent, breakdown, cached }
  } catch (e) { next(e); }
}

export async function listTopMatchesForMe(req, res, next) {
  try {
    const viewerId = req.user.id;
    const min = Number(req.query.minScore || 60);
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));
    const result = await S.listTopMatchesForMe({ viewerId, min, page, pageSize });
    res.json(result);
  } catch (e) { next(e); }
}
