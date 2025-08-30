import * as service from "./roommate.service.js";

export async function matches(req, res, next) {
  try {
    const viewerId = req.user.id;
    const { limit } = req.query;
    const data = await service.getMatches({ viewerId, limit });
    res.json({ matches: data });
  } catch (e) { next(e); }
}
