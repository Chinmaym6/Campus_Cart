import * as R from "./notifications.repo.js";

export async function listNotifications(req, res, next) {
  try {
    const { page = 1, pageSize = 20, unreadOnly } = req.query;
    const result = await R.listNotifications(req.user.id, {
      page: Number(page), pageSize: Number(pageSize),
      unreadOnly: String(unreadOnly).toLowerCase() === "true"
    });
    res.json(result);
  } catch (e) { next(e); }
}

export async function markRead(req, res, next) {
  try {
    await R.markRead(req.user.id, Number(req.params.id));
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function markAllRead(req, res, next) {
  try {
    await R.markAllRead(req.user.id);
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function getSettings(req, res, next) {
  try {
    const settings = await R.getSettings(req.user.id);
    res.json({ settings });
  } catch (e) { next(e); }
}

export async function updateSettings(req, res, next) {
  try {
    const settings = await R.updateSettings(req.user.id, req.body || {});
    res.json({ settings });
  } catch (e) { next(e); }
}
