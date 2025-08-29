import { db } from "../../loaders/database.js";

export async function findByEmail(email) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.users WHERE email = $1`,
    [email]
  );
  return rows[0];
}

export async function findById(id) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.users WHERE id = $1`,
    [id]
  );
  return rows[0];
}

export async function createUser({ first_name, last_name, email, password_hash, phone_number }) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.users
      (first_name, last_name, email, password_hash, phone_number, status, is_verified)
     VALUES ($1, $2, $3, $4, $5, 'pending_verification', false)
     RETURNING *`,
    [first_name, last_name, email, password_hash, phone_number || null]
  );
  return rows[0];
}

export async function createVerificationToken({ user_id, token, expires_at }) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.email_verification_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [user_id, token, expires_at]
  );
  return rows[0];
}

export async function findToken(token) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.email_verification_tokens
     WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [token]
  );
  return rows[0];
}

export async function markTokenUsed(id) {
  await db.query(
    `UPDATE campus_cart.email_verification_tokens
     SET used_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

export async function markUserVerified(user_id) {
  const { rows } = await db.query(
    `UPDATE campus_cart.users
     SET is_verified = true,
         email_verified_at = NOW(),
         status = 'active',
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [user_id]
  );
  return rows[0];
}

export async function createPasswordResetToken({ user_id, token, expires_at }) {
  const { rows } = await db.query(
    `INSERT INTO campus_cart.password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [user_id, token, expires_at]
  );
  return rows[0];
}

export async function findPasswordResetToken(token) {
  const { rows } = await db.query(
    `SELECT * FROM campus_cart.password_reset_tokens
     WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [token]
  );
  return rows[0];
}

export async function markPasswordResetTokenUsed(id) {
  await db.query(
    `UPDATE campus_cart.password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [id]
  );
}

export async function updateUserPassword(user_id, password_hash) {
  const { rows } = await db.query(
    `UPDATE campus_cart.users
     SET password_hash = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [user_id, password_hash]
  );
  return rows[0];
}
