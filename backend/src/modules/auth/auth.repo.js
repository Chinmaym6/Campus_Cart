import { db } from "../../loaders/database.js";
import { hashToken } from "../../utils/tokens.js";

// Users
export async function findUserByEmail(email) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}
export async function findUserById(id) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}
export async function findUniversityByDomain(domain) {
  const { rows } = await db.query(
    `SELECT id, name, domain FROM campus_cart.universities WHERE domain = $1`,
    [domain]
  );
  return rows[0] || null;
}
export async function createUser(p) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.users
      (first_name,last_name,email,university_id,password_hash,phone_number,status)
     VALUES ($1,$2,$3,$4,$5,$6,'pending_verification')
     RETURNING *`,
    [p.first_name, p.last_name, p.email, p.university_id, p.password_hash, p.phone_number]
  );
  return rows[0];
}
export async function markEmailVerified(userId) {
  await db.query(
    `UPDATE campus_cart.users
     SET email_verified_at = now(), status='active', updated_at=now()
     WHERE id=$1`,
    [userId]
  );
}
export async function updatePassword(userId, hash) {
  await db.query(
    `UPDATE campus_cart.users
     SET password_hash=$2, updated_at=now()
     WHERE id=$1`,
    [userId, hash]
  );
}

// Email verification tokens
export async function createEmailVerifyToken(userId, tokenPlain) {
  await db.query(
    `INSERT INTO campus_cart.email_verification_tokens (user_id, token, expires_at)
     VALUES ($1, $2, now() + interval '24 hours')`,
    [userId, tokenPlain]
  );
}
export async function consumeEmailVerifyToken(tokenPlain) {
  const { rows } = await db.query(
    `UPDATE campus_cart.email_verification_tokens
     SET used_at = now()
     WHERE token = $1
       AND used_at IS NULL
       AND expires_at > now()
     RETURNING *`,
    [tokenPlain]
  );
  return rows[0] || null;
}

// Refresh tokens (hashed)
export async function saveRefreshToken(userId, tokenPlain) {
  const tokenHash = hashToken(tokenPlain);
  await db.query(
    `INSERT INTO campus_cart.auth_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '30 days')`,
    [userId, tokenHash]
  );
}
export async function findUserIdByRefresh(tokenPlain) {
  const tokenHash = hashToken(tokenPlain);
  const { rows } = await db.query(
    `SELECT user_id FROM campus_cart.auth_tokens
     WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0]?.user_id || null;
}
export async function revokeRefreshToken(tokenPlain) {
  const tokenHash = hashToken(tokenPlain);
  await db.query(
    `UPDATE campus_cart.auth_tokens
     SET revoked_at = now()
     WHERE token_hash=$1`,
    [tokenHash]
  );
}

// Password reset tokens
export async function createPasswordResetToken(userId, tokenPlain) {
  await db.query(
    `INSERT INTO campus_cart.password_reset_tokens (user_id, token, expires_at)
     VALUES ($1,$2, now() + interval '1 hour')`,
    [userId, tokenPlain]
  );
}
export async function consumePasswordResetToken(tokenPlain) {
  const { rows } = await db.query(
    `UPDATE campus_cart.password_reset_tokens
     SET used_at = now()
     WHERE token = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING *`,
    [tokenPlain]
  );
  return rows[0] || null;
}
