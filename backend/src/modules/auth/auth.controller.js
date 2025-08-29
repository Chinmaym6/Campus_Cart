import * as service from "./auth.service.js";

export async function register(req, res, next) {
  try {
    const data = await service.register(req.body);
    res.status(201).json(data);
  } catch (e) { next(e); }
}

export async function login(req, res, next) {
  try {
    const data = await service.login(req.body);
    res.json(data);
  } catch (e) { next(e); }
}

export async function me(req, res, next) {
  try {
    const data = await service.me(req.headers.authorization);
    res.json(data);
  } catch (e) { next(e); }
}

export async function verifyEmail(req, res, next) {
  try {
    const token = req.query.token;
    const data = await service.verifyEmail(token); // updates DB if needed; idempotent
    res.json({ ok: true, ...data });
  } catch (e) { next(e); }
}

export async function forgotPassword(req, res, next) {
  try {
    const data = await service.forgotPassword(req.body);
    res.json(data);
  } catch (e) { next(e); }
}

export async function validateResetToken(req, res, next) {
  try {
    const token = req.query.token;
    const data = await service.validateResetToken(token);
    res.json(data);
  } catch (e) { next(e); }
}

export async function resetPassword(req, res, next) {
  try {
    const data = await service.resetPassword(req.body);
    res.json(data);
  } catch (e) { next(e); }
}