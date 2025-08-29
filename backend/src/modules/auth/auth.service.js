import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";                    // <-- REQUIRED
import { config } from "../../config/index.js";
import * as repo from "./auth.repo.js";
import { sendMail } from "../../utils/mailer.js"; // <-- REQUIRED


const RegisterSchema = z.object({
  first_name: z.string().min(1, "First name required"),
  last_name: z.string().min(1, "Last name required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 chars"),
  phone_number: z.string().optional().or(z.literal(""))
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 chars")
});

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, { expiresIn: "7d" });
}

function buildVerifyUrl(token) {
  return `${config.clientBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

function buildResetUrl(token) {
  // needs CLIENT_BASE_URL in .env (fallback to localhost:3000)
  const base = config.clientBaseUrl || "http://localhost:3000";
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

function resetEmailTemplate({ first_name, url }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Reset your password</h2>
      <p>Hi ${first_name || "there"},</p>
      <p>We received a request to reset your password for <b>Campus Cart</b>. Click the button below to set a new one.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${url}" style="background:#0b74de;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;display:inline-block">
          Set a new password
        </a>
      </p>
      <p>If you didn’t request this, you can ignore this email. This link will expire in 24 hours.</p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${url}">${url}</a></p>
    </div>
  `;
}

function verifyEmailTemplate({ first_name, url }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>Verify your email</h2>
      <p>Hi ${first_name || "there"},</p>
      <p>Thanks for joining <b>Campus Cart</b>! Please click the button below to verify your email address.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${url}" style="background:#0b74de;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;display:inline-block">
          Verify Email
        </a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${url}">${url}</a></p>
      <hr/>
      <p style="color:#555">If you didn't sign up, you can ignore this email.</p>
    </div>
  `;
}

export async function register(payload) {
  const { first_name, last_name, email, password, phone_number } = RegisterSchema.parse(payload);

  // Optional domain gating
  if (!config.allowAnyEmails) {
    const domain = (email.split("@")[1] || "").toLowerCase().trim();
    if (!domain || !domain.includes(".")) {
      const e = new Error("University email required");
      e.status = 400; throw e;
    }
  }

  const existing = await repo.findByEmail(email);
  if (existing) {
    const e = new Error("Email already registered");
    e.status = 409; throw e;
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await repo.createUser({
    first_name, last_name, email, password_hash: hash, phone_number: phone_number || null
  });

  // Generate a cryptographically strong token (UUID is ok too)
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  await repo.createVerificationToken({ user_id: user.id, token, expires_at: expiresAt });

  // Send email
  const url = buildVerifyUrl(token);
  await sendMail({
    to: user.email,
    subject: "Verify your email - Campus Cart",
    html: verifyEmailTemplate({ first_name: user.first_name, url }),
    text: `Verify your email: ${url}`
  });

  // Do NOT log user in yet; block until verified
  return {
    message: "Registration successful. Please check your email to verify your account."
  };
}

export async function verifyEmail(token) {
  if (!token) { const e = new Error("Missing token"); e.status = 400; throw e; }

  // First: try strict valid token (unused & not expired)
  const row = await repo.findToken(token); // your existing strict finder
  if (row) {
    await repo.markTokenUsed(row.id);
    const user = await repo.markUserVerified(row.user_id);
    return { user: { id: user.id, email: user.email, is_verified: user.is_verified } };
  }

  // Fallback: token may have been used already but user is verified; treat as success
  const maybeUsed = await repo.findTokenAnyState(token); // NEW helper below
  if (maybeUsed) {
    const user = await repo.findById(maybeUsed.user_id);
    if (user?.is_verified) {
      return { user: { id: user.id, email: user.email, is_verified: user.is_verified } };
    }
  }

  const e = new Error("Invalid or expired token");
  e.status = 400;
  throw e;
}

export async function login(payload) {
  const { email, password } = LoginSchema.parse(payload);
  const user = await repo.findByEmail(email);
  if (!user) { const e = new Error("Invalid credentials"); e.status = 401; throw e; }

  if (!user.is_verified) {
    const e = new Error("Email not verified");
    e.status = 403; throw e;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) { const e = new Error("Invalid credentials"); e.status = 401; throw e; }

  return {
    user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email },
    token: sign(user)
  };
}

const ForgotSchema = z.object({
  email: z.string().email("Invalid email")
});

const ResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Password must be at least 6 chars"),
  confirm_password: z.string().min(6)
}).refine(d => d.password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"]
});

export async function forgotPassword(payload) {
  const { email } = ForgotSchema.parse(payload);

  try {
    const user = await repo.findByEmail(email);
    if (user) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
      await repo.createPasswordResetToken({ user_id: user.id, token, expires_at: expiresAt });

      const url = buildResetUrl(token);
      await sendMail({
        to: user.email,
        subject: "Reset your password - Campus Cart",
        html: resetEmailTemplate({ first_name: user.first_name, url }),
        text: `Reset your password: ${url}`
      });
    }
  } catch (err) {
    // Log the real reason to your server console
    console.error("forgotPassword error:", err);
    // Intentionally DO NOT throw to the client (prevents email enumeration)
  }

  return { message: "If that email exists, we’ve sent a password reset link." };
}

export async function validateResetToken(token) {
  if (!token) { const e = new Error("Missing token"); e.status = 400; throw e; }
  const row = await repo.findPasswordResetToken(token);
  if (!row) { const e = new Error("Invalid or expired token"); e.status = 400; throw e; }
  return { ok: true };
}

export async function resetPassword(payload) {
  const { token, password } = ResetSchema.parse(payload);

  const row = await repo.findPasswordResetToken(token);
  if (!row) { const e = new Error("Invalid or expired token"); e.status = 400; throw e; }

  const hash = await bcrypt.hash(password, 10);
  await repo.updateUserPassword(row.user_id, hash);
  await repo.markPasswordResetTokenUsed(row.id);

  return { message: "Password updated successfully" };
}


export async function me(authHeader) {
  const token = (authHeader || "").startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) { const e = new Error("Unauthorized"); e.status = 401; throw e; }
  const payload = jwt.verify(token, config.jwtSecret);
  const user = await repo.findById(payload.id);
  if (!user) { const e = new Error("Unauthorized"); e.status = 401; throw e; }
  return { user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email } };
}
