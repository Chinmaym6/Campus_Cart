
import * as service from "./users.service.js";
import * as repo from "./users.repo.js";

export async function setMyLocation(req, res, next) {
  try {
    const userId = req.user?.id;  // comes from requireAuth
    const location = await service.setMyLocation(userId, req.body);
    res.json({ ok: true, location });
  } catch (e) { next(e); }
}
export async function me(req, res) {
  const { id, email } = req.user;
  res.json({ user: { id, email } });
}

export async function myStats(req, res, next) {
  try {
    const userId = req.user.id;
    const data = await repo.getMyStats(userId);
    res.json({ stats: data });
  } catch (e) { next(e); }
}
