import * as S from "./auth.service.js";

export async function register(req, res, next) {
  try {
    const result = await S.register(req.body);
    res.status(201).json(result); // { user, accessToken, refreshToken }
  } catch (e) { next(e); }
}

export async function login(req, res, next) {
  try {
    const result = await S.login(req.body.email, req.body.password);
    res.json(result); // { user, accessToken, refreshToken }
  } catch (e) { next(e); }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.body?.refresh_token || req.headers["x-refresh-token"];
    const result = await S.refresh(refreshToken);
    res.json(result); // { accessToken }
  } catch (e) { next(e); }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.body?.refresh_token || req.headers["x-refresh-token"];
    await S.logout(refreshToken);
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function verifyEmail(req, res, next) {
  try {
    const token = req.query.token;
    await S.verifyEmail(token);
    res.json({ message: "Email verified. You can close this window." });
  } catch (e) { next(e); }
}

export async function resendVerification(req, res, next) {
  try {
    await S.resendVerification(req.body.email);
    res.json({ message: "Verification email sent" });
  } catch (e) { next(e); }
}

export async function forgotPassword(req, res, next) {
  try {
    await S.forgotPassword(req.body.email);
    res.json({ message: "Reset email sent" });
  } catch (e) { next(e); }
}

export async function resetPassword(req, res, next) {
  try {
    await S.resetPassword(req.body.token, req.body.password);
    res.json({ message: "Password has been reset" });
  } catch (e) { next(e); }
}

export async function me(req, res, next) {
  try {
    const profile = await S.getMe(req.user.id);
    res.json({ user: profile });
  } catch (e) { next(e); }
}
