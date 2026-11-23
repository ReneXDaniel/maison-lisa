import "server-only";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mailOutbox } from "@/db/schema";
import { env } from "./env";
import { brand } from "@/config/brand";
import { serverTranslator } from "./i18n-server";

/**
 * Transactional email. Every mail is recorded in mail_outbox (useful for
 * support and, in development, for the /dev/mailbox viewer). With
 * MAIL_TRANSPORT=smtp it is also delivered.
 *
 * Privacy rule: message notifications NEVER include chat content.
 */
export type MailTemplate =
  | "verifyEmail"
  | "resetPassword"
  | "changeEmail"
  | "emailChanged"
  | "newMessage"
  | "adminNewMessage"
  | "offerReceived"
  | "orderConfirmation"
  | "refundUpdate"
  | "requestUpdate"
  | "deliveryReady"
  | "subscribeConfirm"
  | "adminNewOrder"
  | "adminNewRequest"
  | "accountDeleted";

type Vars = Record<string, string | number>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(opts: { heading: string; paragraphs: string[]; cta?: { label: string; href: string }; footer: string }) {
  const p = opts.paragraphs.map((t) => `<p style="margin:0 0 16px;line-height:1.65;font-size:15px;color:#383734">${esc(t)}</p>`).join("");
  const cta = opts.cta
    ? `<p style="margin:28px 0 8px"><a href="${esc(opts.cta.href)}" style="display:inline-block;background:#2C1F18;color:#E2D5C3;text-decoration:none;padding:14px 28px;font-size:13px;letter-spacing:2px;text-transform:uppercase">${esc(opts.cta.label)}</a></p>
       <p style="margin:12px 0 0;font-size:12px;color:#5F4F43;word-break:break-all">${esc(opts.cta.href)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#E2D5C3;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E2D5C3;padding:40px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#F6F1EA;border:1px solid #C9B299">
<tr><td style="padding:36px 40px 12px;text-align:center;font-family:Georgia,serif;letter-spacing:6px;font-size:20px;color:#2C1F18">${esc(brand.name)}</td></tr>
<tr><td style="padding:0 40px"><div style="height:1px;background:#C9B299"></div></td></tr>
<tr><td style="padding:28px 40px 36px">
<h1 style="margin:0 0 20px;font-family:Georgia,serif;font-weight:normal;font-size:26px;color:#2C1F18">${esc(opts.heading)}</h1>
${p}${cta}
</td></tr>
<tr><td style="padding:20px 40px;background:#2C1F18;color:#C9B299;font-size:11px;line-height:1.6;text-align:center">${esc(opts.footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function smtp() {
  const e = env();
  transporter ??= nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT ?? 587,
    secure: e.SMTP_SECURE === "true",
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export async function sendMail(to: string, template: MailTemplate, locale: string, vars: Vars = {}, link?: string) {
  const t = await serverTranslator(locale, "email");
  const v = { brand: brand.name, creator: brand.creatorName, ...vars };
  const subject = t(`${template}.subject`, v);
  const heading = t(`${template}.heading`, v);
  const body = t(`${template}.body`, v)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const cta = link ? { label: t(`${template}.cta`, v), href: link } : undefined;
  const footer = t("footer", v);
  const html = layout({ heading, paragraphs: body, cta, footer });
  const text = [heading, "", ...body, ...(cta ? ["", `${cta.label}: ${cta.href}`] : []), "", footer].join("\n");

  const [row] = await db.insert(mailOutbox).values({ to, subject, html, text, template }).returning({ id: mailOutbox.id });
  if (env().MAIL_TRANSPORT !== "smtp") return;
  try {
    await smtp().sendMail({ from: env().MAIL_FROM, to, subject, html, text });
    await db.update(mailOutbox).set({ sentAt: new Date() }).where(eq(mailOutbox.id, row!.id));
  } catch (err) {
    console.error("[mail] delivery failed", template, err);
    await db.update(mailOutbox).set({ error: String(err).slice(0, 500) }).where(eq(mailOutbox.id, row!.id));
  }
}

export const absoluteUrl = (path: string) => new URL(path, env().APP_URL).toString();
