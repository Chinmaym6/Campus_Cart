import * as S from "./chat.service.js";

export async function startConversation(req, res, next) {
  try {
    const otherUserId = Number(req.body.other_user_id);
    const conv = await S.startConversation(req.user.id, otherUserId);
    res.status(201).json({ conversation: conv });
  } catch (e) { next(e); }
}

export async function listMyConversations(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = await S.listMyConversations(req.user.id, Number(page), Number(pageSize));
    res.json(result);
  } catch (e) { next(e); }
}

export async function listMessages(req, res, next) {
  try {
    const convId = Number(req.params.id);
    const { page = 1, pageSize = 50 } = req.query;
    const result = await S.listMessages(req.user.id, convId, Number(page), Number(pageSize));
    res.json(result);
  } catch (e) { next(e); }
}

export async function sendMessage(req, res, next) {
  try {
    const convId = Number(req.params.id);
    const body = req.body?.body || "";
    const file = req.file || null;
    const msg = await S.sendMessage(req.user.id, convId, body, file);
    res.status(201).json({ message: msg });
  } catch (e) { next(e); }
}

export async function markRead(req, res, next) {
  try {
    const convId = Number(req.params.id);
    await S.markRead(req.user.id, convId);
    res.status(204).end();
  } catch (e) { next(e); }
}
