import * as R from "./auth.repo.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { randomToken, hashToken, signAccessToken } from "../../utils/tokens.js";
import { sendEmail } from "../../utils/mailer.js";
import { verificationEmail, resetPasswordEmail } from "../../utils/emailTemplates.js";

function sanitizeUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

export async function register(body) {
  const email = body.email.toLowerCase().trim();
  const exists = await R.findUserByEmail(email);
  if (exists) { const e = new Error("Email already registered"); e.status = 409; throw e; }

  // enforce campus domain
  const domain = email.split("@")[1];
  const uni = await R.findUniversityByDomain(domain);
  if (!uni) { const e = new Error("Email must be a valid university domain"); e.status = 400; throw e; }

  const pwHash = await hashPassword(body.password);
  const user = await R.createUser({
    first_name: body.first_name.trim(),
    last_name: body.last_name.trim(),
    email,
    password_hash: pwHash,
    phone_number: body.phone_number || null,
    university_id: uni.id
  });

  // create + email verification token
  const token = randomToken(24);
  await R.createEmailVerifyToken(user.id, token);
  const { subject, text, html } = verificationEmail({ token });
  await sendEmail(user.email, subject, text, html);

  const accessToken = signAccessToken(user.id);
  const refreshPlain = randomToken(24);
  await R.saveRefreshToken(user.id, refreshPlain);
  return { user: sanitizeUser(user), accessToken, refreshToken: refreshPlain };
}

export async function login(email, password) {
  const user = await R.findUserByEmail((email || "").toLowerCase().trim());
  if (!user) { const e = new Error("Invalid credentials"); e.status = 401; throw e; }

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) { const e = new Error("Invalid credentials"); e.status = 401; throw e; }
  if (user.status === "banned" || user.status === "suspended") {
    const e = new Error("Account not active"); e.status = 403; throw e;
  }

  const accessToken = signAccessToken(user.id);
  const refreshPlain = randomToken(24);
  await R.saveRefreshToken(user.id, refreshPlain);
  return { user: sanitizeUser(user), accessToken, refreshToken: refreshPlain };
}

export async function refresh(refreshTokenPlain) {
  if (!refreshTokenPlain) { const e = new Error("Refresh token required"); e.status = 400; throw e; }
  const userId = await R.findUserIdByRefresh(refreshTokenPlain);
  if (!userId) { const e = new Error("Invalid refresh token"); e.status = 401; throw e; }
  const accessToken = signAccessToken(userId);
  return { accessToken };
}

export async function logout(refreshTokenPlain) {
  if (!refreshTokenPlain) return;
  await R.revokeRefreshToken(refreshTokenPlain);
}

export async function verifyEmail(tokenPlain) {
  if (!tokenPlain) { const e = new Error("Token required"); e.status = 400; throw e; }
  const token = await R.consumeEmailVerifyToken(tokenPlain);
  if (!token) { const e = new Error("Invalid or expired token"); e.status = 400; throw e; }
  await R.markEmailVerified(token.user_id);
}

export async function resendVerification(email) {
  const user = await R.findUserByEmail((email || "").toLowerCase().trim());
  if (!user) return; // silent
  if (user.email_verified_at) return;

  const token = randomToken(24);
  await R.createEmailVerifyToken(user.id, token);
  const { subject, text, html } = verificationEmail({ token });
  await sendEmail(user.email, subject, text, html);
}

export async function forgotPassword(email) {
  const user = await R.findUserByEmail((email || "").toLowerCase().trim());
  if (!user) return;
  const token = randomToken(24);
  await R.createPasswordResetToken(user.id, token);
  const { subject, text, html } = resetPasswordEmail({ token });
  await sendEmail(user.email, subject, text, html);
}

export async function resetPassword(tokenPlain, newPassword) {
  const pr = await R.consumePasswordResetToken(tokenPlain);
  if (!pr) { const e = new Error("Invalid or expired token"); e.status = 400; throw e; }
  const hash = await hashPassword(newPassword);
  await R.updatePassword(pr.user_id, hash);
}

export async function getMe(userId) {
  const user = await R.findUserById(userId);
  return sanitizeUser(user);
}
