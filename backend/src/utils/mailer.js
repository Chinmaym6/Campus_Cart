import nodemailer from "nodemailer";
import { config } from "../config/index.js";

let transporter;

export async function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: false,
    auth: { user: config.mail.user, pass: config.mail.pass }
  });
  await transporter.verify();
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const tx = await getTransporter();
  const from = `"Campus Cart" <${config.mail.user}>`;
  return tx.sendMail({ from, to, subject, html, text });
}
