import nodemailer from "nodemailer";
import { config } from "../config/index.js";

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure, // true for 465, false for 587
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });

  return transporter;
}

export async function verifyMailer() {
  try {
    await getTransporter().verify();
    console.log("[mailer] transporter verified ✅");
  } catch (e) {
    console.error("[mailer] verify failed:", e.message);
  }
}

/**
 * Send a plain or HTML email
 * @param {string|string[]} to
 * @param {string} subject
 * @param {string} text
 * @param {string} [html]
 */
export async function sendEmail(to, subject, text, html) {
  try {
    const info = await getTransporter().sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html: html || undefined
    });
    console.log(`[mailer] sent ${info.messageId} → ${to}`);
    return info;
  } catch (e) {
    console.error("[mailer] send failed:", e.message);
    // swallow errors in prod paths that shouldn't crash the API
    return null;
  }
}

/**
 * Simple templated email helper (optional)
 */
export async function sendTemplate(to, subject, { title, lines = [], ctaText, ctaUrl }) {
  const text = [
    title || subject || "Notification",
    "",
    ...lines,
    ctaUrl ? `\nAction: ${ctaText || "Open"} → ${ctaUrl}` : ""
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;padding:20px">
      ${title ? `<h2>${title}</h2>` : ""}
      ${lines.map(p => `<p>${p}</p>`).join("")}
      ${ctaUrl ? `<p><a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">${ctaText || "Open"}</a></p>` : ""}
      <p style="color:#6b7280;font-size:12px">— Campus Cart</p>
    </div>
  `;
  return sendEmail(to, subject, text, html);
}
