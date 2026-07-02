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

interface ConfirmationEmailData {
  to: string;
  vendorName: string;
  reservationId: string;
  stallNumber: string;
  amountPaid: number;
  exhibitionName: string;
  venue: string;
  date: string;
  organizerContact: string;
}

export async function sendConfirmationEmail(data: ConfirmationEmailData): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn({ reservationId: data.reservationId }, "RESEND_API_KEY not configured — skipping confirmation email");
    return;
  }

  const { to, vendorName, reservationId, stallNumber, amountPaid, exhibitionName, venue, date, organizerContact } = data;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Reservation Confirmed — ${exhibitionName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reservation Confirmed!</h2>
          <p>Dear ${vendorName},</p>
          <p>Your stall reservation for <strong>${exhibitionName}</strong> has been confirmed.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reservation ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${reservationId}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Stall Number</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${stallNumber}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount Paid</strong></td><td style="padding: 8px; border: 1px solid #ddd;">₦${amountPaid.toLocaleString()}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Exhibition</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${exhibitionName}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Venue</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${venue}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${date}</td></tr>
          </table>
          <h3>Check-in Instructions</h3>
          <p>Please arrive at least 30 minutes before the exhibition opens. Bring a printed or digital copy of this confirmation email and a valid ID. Proceed to the vendor check-in desk and present your Reservation ID.</p>
          <p>For any questions, please contact the organizer: <strong>${organizerContact}</strong></p>
          <p>We look forward to seeing you!</p>
          <p>— The Meetadoll Team</p>
        </div>
      `,
    });
    logger.info({ reservationId, to }, "Confirmation email sent");
  } catch (err) {
    logger.error({ err, reservationId }, "Failed to send confirmation email");
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
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Dear ${vendorName},</p>
          ${message.replace(/\n/g, "<br>")}
          <p>— The Meetadoll Team</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({ err, to }, "Failed to send announcement email");
  }
}
