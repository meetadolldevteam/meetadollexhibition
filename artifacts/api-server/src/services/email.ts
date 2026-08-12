import { logger } from "../lib/logger";

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_placeholder")) {
    return null;
  }
  const { Resend } = require("resend");
  return new Resend(key) as import("resend").Resend;
}

const FROM_EMAIL = process.env.FROM_EMAIL ?? "Meetadoll Exhibition <noreply@meetadollexhibition.com>";
const ORGANIZER_WHATSAPP = "https://wa.me/2349063604449";
const TERMS_URL = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/terms` : "https://www.meetadollexhibition.com/terms";
const PRIVACY_URL = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/privacy` : "https://www.meetadollexhibition.com/privacy";

interface ConfirmationEmailData {
  to: string;
  vendorName: string;
  reservationId: string;
  stallNumber: string | number;
  stallPackage: string;
  amountPaid: number;
  exhibitionName: string;
  venue: string;
  date: string;
  organizerContact: string;
  ticketPDF?: Buffer | null;
}

function buildConfirmationHtml(data: ConfirmationEmailData): string {
  const {
    vendorName,
    reservationId,
    stallNumber,
    stallPackage,
    amountPaid,
    exhibitionName,
    venue,
    date,
  } = data;

  const packageLabel = stallPackage.toLowerCase() === "vip" ? "VIP" : "Standard";
  const formattedDate = (() => {
    try {
      return new Date(date).toLocaleDateString("en-NG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return date;
    }
  })();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reservation Confirmed: ${exhibitionName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#166534 0%,#15803d 50%,#16a34a 100%);padding:36px 40px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.7);font-family:Arial,sans-serif;">Organised by</p>
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;font-family:Georgia,serif;">MEETADOLL</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;">EXHIBITION</p>
            </td>
          </tr>

          <!-- Confirmed Badge -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;">
                <tr>
                  <td style="background-color:#dcfce7;border:2px solid #16a34a;border-radius:50px;padding:10px 28px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#166534;letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,sans-serif;">&#10003;&nbsp;&nbsp;Payment Confirmed</p>
                  </td>
                </tr>
              </table>
              <h2 style="margin:20px 0 6px;font-size:22px;font-weight:700;color:#111827;font-family:Arial,sans-serif;">Your Stall is Confirmed!</h2>
              <p style="margin:0;font-size:15px;color:#6b7280;font-family:Arial,sans-serif;">Dear <strong style="color:#111827;">${vendorName}</strong>, your reservation for <strong style="color:#166534;">${exhibitionName}</strong> is locked in. See you there!</p>
            </td>
          </tr>

          <!-- Reservation Card -->
          <tr>
            <td style="padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="background-color:#16a34a;padding:12px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;">Reservation Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;width:45%;">
                          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,sans-serif;">Reservation ID</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:13px;font-weight:700;color:#111827;font-family:Arial,monospace;">${reservationId}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,sans-serif;">Vendor Name</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:13px;font-weight:600;color:#111827;font-family:Arial,sans-serif;">${vendorName}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,sans-serif;">Stall Number</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:13px;font-weight:700;color:#166534;font-family:Arial,sans-serif;">Stall #${stallNumber}&nbsp;&nbsp;<span style="background-color:#16a34a;color:#ffffff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.05em;">${packageLabel}</span></p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,sans-serif;">Exhibition</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:13px;font-weight:600;color:#111827;font-family:Arial,sans-serif;">${exhibitionName}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,sans-serif;">Venue</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:13px;color:#111827;font-family:Arial,sans-serif;">${venue}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,sans-serif;">Date</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:13px;font-weight:600;color:#111827;font-family:Arial,sans-serif;">${formattedDate}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,sans-serif;">Amount Paid</p>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #d1fae5;">
                          <p style="margin:0;font-size:15px;font-weight:800;color:#166534;font-family:Arial,sans-serif;">&#8358;${amountPaid.toLocaleString("en-NG")}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 0;">
                          <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,sans-serif;">Payment Status</p>
                        </td>
                        <td style="padding:8px 0;">
                          <p style="margin:0;display:inline-block;background-color:#dcfce7;color:#166534;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;letter-spacing:0.1em;text-transform:uppercase;font-family:Arial,sans-serif;">CONFIRMED</p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Check-in Instructions -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fefce8;border:1px solid #fde68a;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.08em;font-family:Arial,sans-serif;">&#9200;&nbsp;Check-in Instructions</p>
                    <ul style="margin:0;padding:0 0 0 18px;color:#78350f;font-family:Arial,sans-serif;">
                      <li style="font-size:13px;margin-bottom:6px;line-height:1.5;">Vendor set-up begins at <strong>8:00 AM</strong> on the first day. Please arrive early to arrange your stall before the exhibition opens at <strong>10:00 AM</strong>.</li>
                      <li style="font-size:13px;margin-bottom:6px;line-height:1.5;">Bring a <strong>printed or digital copy</strong> of this confirmation email.</li>
                      <li style="font-size:13px;margin-bottom:6px;line-height:1.5;">Present your <strong>Reservation ID</strong> and a valid government-issued ID at the vendor check-in desk.</li>
                      <li style="font-size:13px;line-height:1.5;">Look for the <strong>Meetadoll staff</strong> in branded vests at the entrance. They will direct you to your assigned stall.</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WhatsApp Contact -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <p style="margin:0 0 14px 0;font-size:14px;color:#374151;font-family:Arial,sans-serif;">Have questions? Chat with the organizers directly:</p>
              <a href="${ORGANIZER_WHATSAPP}" target="_blank" style="display:inline-block;background-color:#25D366;color:#ffffff;font-size:14px;font-weight:700;padding:13px 30px;border-radius:50px;text-decoration:none;letter-spacing:0.03em;font-family:Arial,sans-serif;">
                &#128172;&nbsp;&nbsp;WhatsApp the Organizer
              </a>
              <p style="margin:12px 0 0 0;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">08120201518 &nbsp;|&nbsp; info@meetadoll.com</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;background-color:#f9fafb;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">
                <a href="${TERMS_URL}" style="color:#16a34a;text-decoration:none;font-weight:600;">Terms &amp; Conditions</a>
                &nbsp;&nbsp;&#183;&nbsp;&nbsp;
                <a href="${PRIVACY_URL}" style="color:#16a34a;text-decoration:none;font-weight:600;">Privacy Policy</a>
              </p>
              <p style="margin:0;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">
                &copy; ${new Date().getFullYear()} Meetadoll Exhibition. All rights reserved.<br />
                This email was sent because you made a reservation on the Meetadoll platform.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendConfirmationEmail(data: ConfirmationEmailData): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn({ reservationId: data.reservationId }, "RESEND_API_KEY not configured — skipping confirmation email");
    return;
  }

  try {
    const attachments = data.ticketPDF
      ? [{ filename: "meetadoll-stall-ticket.pdf", content: data.ticketPDF }]
      : [];

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `✅ Stall Confirmed: ${data.exhibitionName} (Stall #${data.stallNumber})`,
      html: buildConfirmationHtml(data),
      attachments,
    } as Parameters<typeof resend.emails.send>[0]);
    logger.info({ reservationId: data.reservationId, to: data.to, hasTicket: !!data.ticketPDF }, "Confirmation email sent");
  } catch (err) {
    logger.error({ err, reservationId: data.reservationId }, "Failed to send confirmation email");
    throw err;
  }
}

export async function sendOtpEmail(
  to: string,
  code: string,
  type: "registration" | "login" | "password_reset"
): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn({ to }, "RESEND_API_KEY not configured — skipping OTP email");
    return;
  }

  const purpose =
    type === "registration" ? "verify your email" :
    type === "password_reset" ? "reset your password" :
    "confirm your login";
  const subject =
    type === "registration"
      ? "Your Meetadoll Exhibition verification code"
      : type === "password_reset"
      ? "Reset your Meetadoll Exhibition password"
      : "Your Meetadoll Exhibition login code";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#166534 0%,#15803d 50%,#16a34a 100%);padding:36px 40px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.7);font-family:Arial,sans-serif;">Organised by</p>
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;font-family:Georgia,serif;">MEETADOLL</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,sans-serif;">EXHIBITION</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:16px;color:#374151;font-family:Arial,sans-serif;">Use the code below to ${purpose}:</p>

              <!-- OTP Code Box -->
              <div style="display:inline-block;margin:24px 0;">
                <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;">
                  <tr>
                    <td style="background-color:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:20px 40px;text-align:center;">
                      <p style="margin:0;font-size:40px;font-weight:900;letter-spacing:0.25em;color:#166534;font-family:'Courier New',monospace;">${code}</p>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin:0 0 6px 0;font-size:14px;color:#6b7280;font-family:Arial,sans-serif;">This code expires in <strong style="color:#374151;">10 minutes</strong>.</p>
              <p style="margin:0;font-size:13px;color:#9ca3af;font-family:Arial,sans-serif;">If you did not request this code, you can safely ignore this email.</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;background-color:#f9fafb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;">
                &copy; ${new Date().getFullYear()} Meetadoll Exhibition. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    logger.info({ to, type }, "OTP email sent");
  } catch (err) {
    logger.error({ err, to }, "Failed to send OTP email");
    throw err;
  }
}

export async function sendWelcomeEmail(data: {
  to: string;
  vendorName: string;
  businessName: string;
  businessCategory: string;
  instagramUsername: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn({ to: data.to }, "RESEND_API_KEY not configured — skipping welcome email");
    return;
  }
  const { to, vendorName, businessName, businessCategory, instagramUsername } = data;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Welcome to Meetadoll Exhibition</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#8B0000 0%,#a01010 100%);padding:36px 40px;text-align:center;">
          <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:0.05em;font-family:Georgia,serif;">MEETADOLL</h1>
          <p style="margin:4px 0 0 0;font-size:13px;color:rgba(255,255,255,0.85);letter-spacing:0.15em;text-transform:uppercase;">EXHIBITION</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h2 style="margin:0 0 16px;font-size:22px;color:#111827;">Welcome, ${vendorName}!</h2>
          <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.6;">You have successfully registered as a vendor for the <strong>Meetadoll Exhibition — 5th Edition: The Homecoming</strong>. We are thrilled to have you.</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fdf2f2;border:1px solid #fecaca;border-radius:10px;margin:20px 0;">
            <tr><td style="background:#8B0000;padding:10px 20px;border-radius:10px 10px 0 0;">
              <p style="margin:0;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.15em;text-transform:uppercase;">Your Business Details</p>
            </td></tr>
            <tr><td style="padding:18px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:7px 0;border-bottom:1px solid #fee2e2;width:45%;"><p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Business Name</p></td><td style="padding:7px 0;border-bottom:1px solid #fee2e2;"><p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${businessName}</p></td></tr>
                <tr><td style="padding:7px 0;border-bottom:1px solid #fee2e2;"><p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Category</p></td><td style="padding:7px 0;border-bottom:1px solid #fee2e2;"><p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${businessCategory}</p></td></tr>
                <tr><td style="padding:7px 0;"><p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Instagram</p></td><td style="padding:7px 0;"><p style="margin:0;font-size:13px;font-weight:600;color:#111827;">@${instagramUsername.replace(/^@/, "")}</p></td></tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:14px 0;font-size:14px;color:#374151;line-height:1.6;">Your next step is to <strong>pick and hold a stall</strong> from your vendor dashboard, then complete your payment to lock it in.</p>
          <p style="margin:0;font-size:13px;color:#6b7280;">Questions? Reach us on WhatsApp: <a href="https://wa.me/2348120201518" style="color:#8B0000;">08120201518</a></p>
        </td></tr>
        <tr><td style="padding:20px 40px;text-align:center;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">&copy; ${new Date().getFullYear()} Meetadoll Exhibition. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject: "Welcome to Meetadoll Exhibition — Registration Confirmed", html });
    logger.info({ to }, "Welcome email sent");
  } catch (err) {
    logger.error({ err, to }, "Failed to send welcome email");
  }
}

export async function sendAdminNotificationEmail(data: {
  vendorName: string;
  email: string;
  businessName: string;
  businessCategory: string;
  businessPhone: string;
  instagramUsername: string;
  registeredAt: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn("RESEND_API_KEY not configured — skipping admin notification email");
    return;
  }
  const { vendorName, email, businessName, businessCategory, businessPhone, instagramUsername, registeredAt } = data;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>New Vendor Registration</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#111827;padding:24px 40px;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.2em;">Meetadoll Admin Alert</p>
          <h1 style="margin:6px 0 0;font-size:20px;color:#fff;font-weight:700;">New Vendor Registration</h1>
        </td></tr>
        <tr><td style="padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Full Name</span><p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111827;">${vendorName}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Email</span><p style="margin:4px 0 0;font-size:14px;color:#111827;">${email}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Business Name</span><p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111827;">${businessName}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Business Category</span><p style="margin:4px 0 0;font-size:14px;color:#111827;">${businessCategory}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Business Phone</span><p style="margin:4px 0 0;font-size:14px;color:#111827;">${businessPhone}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Instagram</span><p style="margin:4px 0 0;font-size:14px;color:#111827;">@${instagramUsername.replace(/^@/, "")}</p></td></tr>
            <tr><td style="padding:14px 20px;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Registered At</span><p style="margin:4px 0 0;font-size:14px;color:#111827;">${registeredAt}</p></td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Meetadoll Exhibition — Automated Notification</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: "meetadolll@gmail.com",
      subject: `New Vendor Registration - ${businessName}`,
      html,
    });
    logger.info({ businessName }, "Admin notification email sent");
  } catch (err) {
    logger.error({ err }, "Failed to send admin notification email");
  }
}

export async function sendPaymentAdminNotificationEmail(data: {
  vendorName: string;
  email: string;
  businessName: string;
  stallNumber: string;
  stallCategory: string;
  stallPackage: string;
  amountPaid: number;
  transactionReference: string;
  reservationId: string;
  exhibitionName: string;
  paidAt: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn("RESEND_API_KEY not configured — skipping payment admin notification email");
    return;
  }
  const {
    vendorName, email, businessName, stallNumber, stallCategory,
    stallPackage, amountPaid, transactionReference, reservationId,
    exhibitionName, paidAt,
  } = data;
  const formattedAmount = `₦${amountPaid.toLocaleString("en-NG")}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Payment Confirmed</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:#111827;padding:24px 40px;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.2em;">Meetadoll Admin Alert</p>
          <h1 style="margin:6px 0 0;font-size:20px;color:#fff;font-weight:700;">💳 Payment Confirmed</h1>
        </td></tr>
        <tr><td style="padding:20px 40px 8px;">
          <p style="margin:0;font-size:13px;color:#374151;">A vendor has successfully completed payment for a stall.</p>
        </td></tr>
        <tr><td style="padding:8px 40px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Vendor Name</span><p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111827;">${vendorName}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Email</span><p style="margin:4px 0 0;font-size:14px;color:#111827;">${email}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Business Name</span><p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111827;">${businessName}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Exhibition</span><p style="margin:4px 0 0;font-size:14px;color:#111827;">${exhibitionName}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Stall Number</span><p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#111827;">#${stallNumber}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Category / Package</span><p style="margin:4px 0 0;font-size:14px;color:#111827;">${stallCategory} — ${stallPackage}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Amount Paid</span><p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#16a34a;">${formattedAmount}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Transaction Ref</span><p style="margin:4px 0 0;font-size:12px;font-family:monospace;color:#111827;">${transactionReference}</p></td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Reservation ID</span><p style="margin:4px 0 0;font-size:12px;font-family:monospace;color:#111827;">${reservationId}</p></td></tr>
            <tr><td style="padding:14px 20px;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Paid At</span><p style="margin:4px 0 0;font-size:14px;color:#111827;">${paidAt}</p></td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Meetadoll Exhibition — Automated Payment Alert</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: "meetadolll@gmail.com",
      subject: `💳 Payment Confirmed — Stall #${stallNumber} | ${vendorName} | ${formattedAmount}`,
      html,
    });
    logger.info({ reservationId, stallNumber, amountPaid }, "Payment admin notification email sent");
  } catch (err) {
    logger.error({ err }, "Failed to send payment admin notification email");
  }
}

export async function sendAnnouncementEmail(to: string, vendorName: string, subject: string, message: string): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn({ to }, "RESEND_API_KEY not configured — skipping announcement email");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;">
          <p style="color:#374151;">Dear ${vendorName},</p>
          ${message.replace(/\n/g, "<br>")}
          <p style="color:#374151;">The Meetadoll Team</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({ err, to }, "Failed to send announcement email");
  }
}
