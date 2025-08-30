import * as service from "./notifications.service.js";

export async function recent(req, res, next) {
  try {
    const viewerId = req.user.id;
    const { limit } = req.query;
    const data = await service.recent({ viewerId, limit });
    res.json({ notifications: data });
  } catch (e) { next(e); }
}
