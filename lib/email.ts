import nodemailer from "nodemailer";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type EmailProvider = "resend" | "smtp" | "not_configured";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

type EmailConfig = {
  provider: EmailProvider;
  providerLabel: string;
  resendApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
};

function stripHtml(html: string) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function clean(v: any) {
  return String(v || "").trim();
}

async function readEmailSettings() {
  try {
    const s = createSupabaseServiceClient();
    const { data } = await s.from("club_settings").select("*").eq("id", "default").maybeSingle();
    return data || {};
  } catch {
    return {};
  }
}

export async function resolveEmailConfig(): Promise<EmailConfig> {
  const settings: any = await readEmailSettings();
  const requestedProvider = clean(settings.email_provider || process.env.EMAIL_PROVIDER).toLowerCase();
  const smtpHost = clean(settings.smtp_host || process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST || (requestedProvider.includes("smtp") || requestedProvider.includes("brevo") ? "smtp-relay.brevo.com" : ""));
  const smtpUser = clean(settings.smtp_user || process.env.SMTP_USER || process.env.BREVO_SMTP_LOGIN || process.env.BREVO_SMTP_USER);
  const smtpPass = clean(settings.smtp_pass || process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP_PASSWORD);
  const smtpPort = Number(settings.smtp_port || process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT || 587);
  const smtpSecureRaw = String(settings.smtp_secure ?? process.env.SMTP_SECURE ?? "false").toLowerCase();
  const smtpSecure = smtpSecureRaw === "true" || smtpSecureRaw === "1" || smtpPort === 465;
  const resendApiKey = clean(settings.resend_api_key || process.env.RESEND_API_KEY);
  const fromEmail = clean(settings.club_from_email || settings.notice_from_email || process.env.CLUB_FROM_EMAIL || process.env.SMTP_FROM_EMAIL);
  const fromName = clean(settings.club_from_name || settings.notice_sender_name || process.env.CLUB_FROM_NAME || process.env.NOTICE_SENDER_NAME) || "Auckland Knights Chess Club";
  const replyTo = clean(settings.club_reply_to_email || settings.notice_reply_to_email || process.env.CLUB_REPLY_TO_EMAIL || process.env.NOTICE_REPLY_TO_EMAIL);

  let provider: EmailProvider = "not_configured";
  if ((requestedProvider === "resend" || requestedProvider === "resend_api") && resendApiKey && fromEmail) provider = "resend";
  else if (["smtp", "brevo", "brevo_smtp", "custom_smtp"].includes(requestedProvider) && smtpHost && smtpUser && smtpPass && fromEmail) provider = "smtp";
  else if (requestedProvider === "disabled" || requestedProvider === "none") provider = "not_configured";
  else if (smtpHost && smtpUser && smtpPass && fromEmail) provider = "smtp";
  else if (resendApiKey && fromEmail) provider = "resend";

  return {
    provider,
    providerLabel: provider === "smtp" ? "SMTP / Brevo SMTP" : provider === "resend" ? "Resend API" : "Not configured",
    resendApiKey,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    fromEmail,
    fromName,
    replyTo,
  };
}

function fromAddress(config: EmailConfig) {
  if (!config.fromEmail) return "";
  return `"${config.fromName.replace(/"/g, "'")}" <${config.fromEmail}>`;
}

export async function getEmailProviderStatus() {
  const config = await resolveEmailConfig();
  const missing: string[] = [];
  if (!config.fromEmail) missing.push("From email");
  if (config.provider === "not_configured") {
    if (!config.resendApiKey && !(config.smtpHost && config.smtpUser && config.smtpPass)) missing.push("Resend API key or SMTP settings");
  }
  return {
    configured: config.provider !== "not_configured",
    provider: config.provider,
    providerLabel: config.providerLabel,
    fromEmail: config.fromEmail,
    replyTo: config.replyTo,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpSecure: config.smtpSecure,
    missing,
  };
}

async function sendWithResend(config: EmailConfig, { to, subject, html, text, replyTo }: SendEmailInput) {
  const from = fromAddress(config);
  if (!config.resendApiKey || !from) throw new Error("Resend is not configured. Add RESEND_API_KEY or configure Resend API in Club Settings.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text: text || stripHtml(html),
      reply_to: replyTo || config.replyTo || undefined,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return { ok: true, provider: "resend" as const };
}

async function sendWithSmtp(config: EmailConfig, { to, subject, html, text, replyTo }: SendEmailInput) {
  const from = fromAddress(config);
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass || !from) {
    throw new Error("SMTP/Brevo is not configured. Add SMTP Host, Port, Username, Password and From Email in Club Settings.");
  }
  const transporter = nodemailer.createTransport({
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  await transporter.sendMail({
    from,
    to: Array.isArray(to) ? to.join(",") : to,
    subject,
    html,
    text: text || stripHtml(html),
    replyTo: replyTo || config.replyTo || undefined,
  });
  return { ok: true, provider: "smtp" as const };
}

export async function sendEmail(input: SendEmailInput) {
  const config = await resolveEmailConfig();
  const status = await getEmailProviderStatus();
  if (!status.configured) throw new Error(`Email provider is not configured. Missing: ${status.missing.join(", ") || "email settings"}.`);
  if (config.provider === "smtp") return sendWithSmtp(config, input);
  if (config.provider === "resend") return sendWithResend(config, input);
  throw new Error("Email provider is not configured.");
}

export async function verifyEmailProvider() {
  const status = await getEmailProviderStatus();
  const config = await resolveEmailConfig();
  if (!status.configured) {
    return { ok: false, status, error: `Email provider is not configured. Missing: ${status.missing.join(", ") || "email settings"}.` };
  }
  if (config.provider === "smtp") {
    try {
      const transporter = nodemailer.createTransport({
        connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: { user: config.smtpUser, pass: config.smtpPass },
      });
      await transporter.verify();
      return { ok: true, status, message: "SMTP connection verified successfully." };
    } catch (e: any) {
      return { ok: false, status, error: e?.message || "SMTP verification failed." };
    }
  }
  return { ok: true, status, message: "Resend configuration detected. Use Send Test Email to verify delivery." };
}
