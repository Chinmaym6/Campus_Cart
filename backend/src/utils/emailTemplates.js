import { config } from "../config/index.js";

export function verificationEmail({ token }) {
  const url = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const title = "Verify your Campus Cart email";
  const lines = [
    "Welcome to Campus Cart! Confirm your university email to activate your account.",
    `Verification link: ${url}`,
  ];
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;padding:20px">
      <h2>${title}</h2>
      <p>Welcome to Campus Cart! Confirm your university email to activate your account.</p>
      <p><a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Verify Email</a></p>
      <p>If the button doesn't work, open this link: <br><a href="${url}">${url}</a></p>
      <p style="color:#6b7280;font-size:12px">— Campus Cart</p>
    </div>`;
  return { subject: "Verify your email", text: lines.join("\n"), html };
}

export function resetPasswordEmail({ token }) {
  const url = `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const title = "Reset your Campus Cart password";
  const lines = [
    "We received a request to reset your password.",
    `Reset link: ${url}`,
    "If you didn't request this, you can safely ignore this email."
  ];
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;padding:20px">
      <h2>${title}</h2>
      <p>We received a request to reset your password.</p>
      <p><a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Reset Password</a></p>
      <p>If the button doesn't work, open this link: <br><a href="${url}">${url}</a></p>
      <p style="color:#6b7280;font-size:12px">— Campus Cart</p>
    </div>`;
  return { subject: "Reset your password", text: lines.join("\n"), html };
}
