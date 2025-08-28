import * as S from "./transactions.service.js";

export async function getTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const tx = await S.getTransaction({ id, userId });
    res.json({ transaction: tx });
  } catch (e) { next(e); }
}

export async function completeTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const { met_at, location_note } = req.body || {};
    const tx = await S.completeTransaction({ id, userId, metAt: met_at, locationNote: location_note });
    res.json({ transaction: tx });
  } catch (e) { next(e); }
}

export async function cancelTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const tx = await S.cancelTransaction({ id, userId });
    res.json({ transaction: tx });
  } catch (e) { next(e); }
}
