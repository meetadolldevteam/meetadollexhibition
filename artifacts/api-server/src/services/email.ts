import { logger } from "../lib/logger";

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_placeholder")) {
    return null;
  }
  const { Resend } = require("resend");
  return new Resend(key) as import("resend").Resend;
}

const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@meetadoll.com";
const ORGANIZER_WHATSAPP = "https://wa.me/2349063604449";
const TERMS_URL = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/terms` : "https://meetadoll.com/terms";
const PRIVACY_URL = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/privacy` : "https://meetadoll.com/privacy";

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
              <p style="margin:12px 0 0 0;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">+234 906 360 4449 &nbsp;|&nbsp; info@meetadoll.com</p>
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
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `✅ Stall Confirmed: ${data.exhibitionName} (Stall #${data.stallNumber})`,
      html: buildConfirmationHtml(data),
    });
    logger.info({ reservationId: data.reservationId, to: data.to }, "Confirmation email sent");
  } catch (err) {
    logger.error({ err, reservationId: data.reservationId }, "Failed to send confirmation email");
    throw err;
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
