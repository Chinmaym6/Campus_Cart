
import * as service from "./users.service.js";

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