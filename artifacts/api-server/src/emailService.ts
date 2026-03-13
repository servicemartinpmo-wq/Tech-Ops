import nodemailer from "nodemailer";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getTransport() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  return null;
}

export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean; error?: string }> {
  const transporter = getTransport();

  if (!transporter) {
    console.log(`[Email] No SMTP configured — would have sent to ${payload.to}: ${payload.subject}`);
    return { sent: false, error: "SMTP not configured" };
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
      from: `"Tech-Ops by Martin PMO" <${from}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text || payload.html.replace(/<[^>]*>/g, ""),
      html: payload.html,
    });
    console.log(`[Email] Sent to ${payload.to}: ${payload.subject}`);
    return { sent: true };
  } catch (err: unknown) {
    const msg = (err as Error).message;
    console.error(`[Email] Failed to send to ${payload.to}:`, msg);
    return { sent: false, error: msg };
  }
}

export function buildCriticalCaseEmail(caseTitle: string, priority: string, caseId: number, userEmail: string): EmailPayload {
  const priorityLabel = priority.toUpperCase();
  const priorityColor = priority === "critical" ? "#ef4444" : "#f97316";
  const appDomain = process.env.REPLIT_DOMAINS?.split(",")[0] || "your-app.replit.app";
  const caseUrl = `https://${appDomain}/cases/${caseId}`;

  return {
    to: userEmail,
    subject: `[${priorityLabel}] New Issue Submitted: ${caseTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 32px auto; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
    <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 28px 32px;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #fff;">Tech-Ops by Martin PMO</h1>
      <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.8);">Support, Engineered.</p>
    </div>
    <div style="padding: 32px;">
      <div style="background: ${priorityColor}1a; border: 1px solid ${priorityColor}33; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
        <span style="display: inline-block; background: ${priorityColor}; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px; letter-spacing: 0.5px;">${priorityLabel}</span>
        <span style="margin-left: 12px; font-size: 13px; color: #94a3b8;">New issue has been submitted and queued for Apphia Engine analysis.</span>
      </div>
      <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #f1f5f9;">${caseTitle}</h2>
      <p style="margin: 0 0 24px; font-size: 13px; color: #64748b;">Case #${caseId} · Submitted just now</p>
      <a href="${caseUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #6366f1); color: #fff; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">View Case in Dashboard →</a>
    </div>
    <div style="padding: 16px 32px; border-top: 1px solid #334155;">
      <p style="margin: 0; font-size: 11px; color: #475569;">This notification was sent because a ${priority} priority case was submitted on your account. You are receiving this because you have critical case notifications enabled.</p>
    </div>
  </div>
</body>
</html>`,
  };
}
