import nodemailer from "nodemailer";

export type EmailStatus = "sent" | "mocked" | "failed" | "skipped";

function isMock(): boolean {
  return process.env.EMAIL_MOCK === "true" || !process.env.SMTP_USER;
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailStatus> {
  if (isMock()) {
    console.log(`[email mock] to=${params.to} subject="${params.subject}"`);
    return "mocked";
  }
  try {
    await getTransport().sendMail({
      from: `"Sistem Kepanitiaan HMIF" <${process.env.SMTP_USER}>`,
      ...params,
    });
    return "sent";
  } catch (e) {
    console.error("send email failed:", e);
    return "failed";
  }
}

export async function sendAccountEmail(params: {
  to: string;
  name: string;
  username: string;
  temporaryPassword: string;
  eventName: string;
}): Promise<EmailStatus> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const subject = `Akun panitia ${params.eventName} — Sistem Kepanitiaan HMIF`;
  const html = `
    <p>Halo ${params.name},</p>
    <p>Kamu terdaftar sebagai panitia <strong>${params.eventName}</strong>.
    Berikut akun untuk masuk ke Sistem Kepanitiaan HMIF:</p>
    <p>
      Username: <strong>${params.username}</strong><br/>
      Password sementara: <strong>${params.temporaryPassword}</strong>
    </p>
    <p>Masuk di <a href="${appUrl}/login">${appUrl}/login</a> —
    kamu akan diminta mengganti password saat login pertama.</p>
    <p>— Sistem Kepanitiaan HMIF</p>`;

  if (isMock()) {
    console.log(
      `[email mock] to=${params.to} username=${params.username} pw=${params.temporaryPassword}`,
    );
    return "mocked";
  }

  try {
    await getTransport().sendMail({
      from: `"Sistem Kepanitiaan HMIF" <${process.env.SMTP_USER}>`,
      to: params.to,
      subject,
      html,
    });
    return "sent";
  } catch (e) {
    console.error("send email failed:", e);
    return "failed";
  }
}
