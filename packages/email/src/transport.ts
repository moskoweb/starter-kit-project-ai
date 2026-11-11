import nodemailer from "nodemailer";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const TIMEOUT_MS = 10_000;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Email configuration error: ${name} is required`);
  return value;
}

function headerValue(name: string, value: string): string {
  if (!value.trim() || /[\r\n]/.test(value)) {
    throw new Error(`Invalid email ${name}`);
  }
  return value;
}


export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const recipient = headerValue("recipient", to);
  if (/[,;<>\s]/.test(recipient) || recipient.indexOf("@") <= 0 || recipient.indexOf("@") !== recipient.lastIndexOf("@")) {
    throw new Error("Invalid email recipient");
  }
  const title = headerValue("subject", subject);
  const from = headerValue("sender", requiredEnv("EMAIL_FROM"));
  const provider = process.env.EMAIL_PROVIDER;

  if (provider === "smtp") {
    const host = requiredEnv("SMTP_HOST");
    const port = Number(requiredEnv("SMTP_PORT"));
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("Email configuration error: SMTP_PORT must be a valid port");
    }
    const secure = requiredEnv("SMTP_SECURE");
    if (secure !== "true" && secure !== "false") {
      throw new Error("Email configuration error: SMTP_SECURE must be true or false");
    }
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD;
    if ((user && (pass === undefined || pass.length === 0)) || (!user && pass !== undefined && pass.length > 0)) {
      throw new Error("Email configuration error: SMTP_USER and SMTP_PASSWORD must be configured together");
    }
    const transport = nodemailer.createTransport({
      host, port, secure: secure === "true",
      ...(user && pass ? { auth: { user, pass } } : {}),
      connectionTimeout: TIMEOUT_MS, greetingTimeout: TIMEOUT_MS, socketTimeout: TIMEOUT_MS,
    });
    try {
      const result = await transport.sendMail({ from, to: recipient, subject: title, html, ...(text === undefined ? {} : { text }) });
      if (result.rejected.length > 0 || !result.accepted.some((address) => address.toLowerCase() === recipient.toLowerCase())) {
        throw new Error("Email delivery failed");
      }
    } catch {
      throw new Error("Email delivery failed");
    } finally {
      transport.close();
    }
    return;
  }

  if (provider === "resend") {
    const apiKey = requiredEnv("RESEND_API_KEY");
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: recipient, subject: title, html, ...(text === undefined ? {} : { text }) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new Error("Email delivery failed");
    }
    if (!response.ok) throw new Error("Email delivery failed");
    return;
  }

  throw new Error("Email configuration error: EMAIL_PROVIDER must be smtp or resend");
}
