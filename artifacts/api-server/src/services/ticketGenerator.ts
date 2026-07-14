import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import path from "node:path";
import fs from "node:fs";
import { logger } from "../lib/logger";

const MAROON = "#8B0000";
const BLACK = "#000000";
const WHITE = "#ffffff";
const FAINT_GREY = "#f3f4f6";
const LABEL_GREY = "#6b7280";
const TEXT_DARK = "#111111";
const GRID_BORDER = "#e5e7eb";

function getLogoBuffer(): Buffer | null {
  try {
    const logoPath = path.join(__dirname, "meetadoll-logo.png");
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath);
    }
    const srcPath = path.join(__dirname, "../assets/meetadoll-logo.png");
    if (fs.existsSync(srcPath)) {
      return fs.readFileSync(srcPath);
    }
    return null;
  } catch {
    return null;
  }
}

function formatPrice(price: number): string {
  return `\u20A6${price.toLocaleString("en-NG")}`;
}

export interface TicketData {
  vendorName: string;
  stallNumber: string | number;
  category: string;
  tier: string;
  price: number;
  venue: string;
  date: string;
  code: string;
  checkin: string;
}

export async function generateTicketPDF(reservation: TicketData): Promise<Buffer> {
  const W = 600;
  const H = 550;
  const B = 4;

  const headerH = 170;
  const titleH = 66;
  const stallH = 60;
  const detailsH = 90;
  const tearH = 14;
  const stubH = H - B - headerH - titleH - stallH - detailsH - tearH - B;

  const colW = (W - B * 2) / 2;
  const gridRowH = detailsH / 3;

  const qrData = reservation.code;
  const qrBuffer = await QRCode.toBuffer(qrData, {
    width: 90,
    margin: 1,
    color: { dark: BLACK, light: FAINT_GREY },
  });

  const logoBuffer = getLogoBuffer();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = B;

    // ── Section 1: Black header with logo ────────────────────────────────────
    doc.rect(B, y, W - B * 2, headerH).fill(BLACK);

    if (logoBuffer) {
      const logoSize = 150;
      const logoX = (W - logoSize) / 2;
      const logoY = y + (headerH - logoSize) / 2;
      doc.image(logoBuffer, logoX, logoY, { width: logoSize, height: logoSize });
    } else {
      doc
        .fillColor(WHITE)
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("MEETADOLL EXHIBITION", B, y + (headerH - 22) / 2, {
          width: W - B * 2,
          align: "center",
        });
    }

    y += headerH;

    // ── Section 2: Title (VENDOR STALL PASS + vendor name) ───────────────────
    doc.rect(B, y, W - B * 2, titleH).fill(WHITE);

    doc
      .fillColor(MAROON)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("VENDOR STALL PASS", B, y + 10, {
        width: W - B * 2,
        align: "center",
        characterSpacing: 3,
      });

    const vendorFontSize = reservation.vendorName.length > 22 ? 20 : 26;
    doc
      .fillColor(TEXT_DARK)
      .fontSize(vendorFontSize)
      .font("Helvetica-Oblique")
      .text(reservation.vendorName, B, y + 24, {
        width: W - B * 2,
        align: "center",
      });

    y += titleH;

    // ── Section 3: Stall number ───────────────────────────────────────────────
    doc.rect(B, y, W - B * 2, stallH).fill("#fafafa");

    doc
      .fillColor(MAROON)
      .fontSize(50)
      .font("Helvetica-Bold")
      .text(`V${reservation.stallNumber}`, B, y + 6, {
        width: W - B * 2,
        align: "center",
      });

    y += stallH;

    // ── Section 4: Details grid ───────────────────────────────────────────────
    doc.rect(B, y, W - B * 2, detailsH).fill(WHITE);

    const rows: [string, string, string, string][] = [
      ["Date", reservation.date, "Check-in", reservation.checkin],
      ["Category", reservation.category, "Tier", reservation.tier],
      ["Stall Fee", formatPrice(reservation.price), "Venue", reservation.venue],
    ];

    rows.forEach(([leftLabel, leftVal, rightLabel, rightVal], i) => {
      const ry = y + i * gridRowH;

      if (i > 0) {
        doc
          .moveTo(B, ry)
          .lineTo(W - B, ry)
          .lineWidth(0.5)
          .strokeColor(GRID_BORDER)
          .stroke();
      }

      doc
        .fillColor(LABEL_GREY)
        .fontSize(7)
        .font("Helvetica")
        .text(leftLabel.toUpperCase(), B + 16, ry + 7, {
          width: colW - 20,
          characterSpacing: 0.5,
          lineBreak: false,
        });
      doc
        .fillColor(TEXT_DARK)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(leftVal, B + 16, ry + 18, { width: colW - 20, lineBreak: false });

      doc
        .fillColor(LABEL_GREY)
        .fontSize(7)
        .font("Helvetica")
        .text(rightLabel.toUpperCase(), B + colW + 10, ry + 7, {
          width: colW - 20,
          characterSpacing: 0.5,
          lineBreak: false,
        });
      doc
        .fillColor(TEXT_DARK)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(rightVal, B + colW + 10, ry + 18, { width: colW - 20, lineBreak: false });
    });

    y += detailsH;

    // ── Tear line ─────────────────────────────────────────────────────────────
    doc.rect(B, y, W - B * 2, tearH).fill(FAINT_GREY);

    doc
      .moveTo(B + 18, y + tearH / 2)
      .lineTo(W - B - 18, y + tearH / 2)
      .dash(4, { space: 4 })
      .lineWidth(0.75)
      .strokeColor("#9ca3af")
      .stroke();
    doc.undash();

    doc.circle(0, y + tearH / 2, tearH / 2 + 1).fill(WHITE);
    doc.circle(W, y + tearH / 2, tearH / 2 + 1).fill(WHITE);

    y += tearH;

    // ── Bottom stub ───────────────────────────────────────────────────────────
    doc.rect(B, y, W - B * 2, stubH).fill(FAINT_GREY);

    doc
      .fillColor(LABEL_GREY)
      .fontSize(7)
      .font("Helvetica-Bold")
      .text("TICKET STUB", B, y + 10, {
        width: W - B * 2,
        align: "center",
        characterSpacing: 2,
      });

    const qrSize = 72;
    const qrX = (W - qrSize) / 2;
    const qrY = y + 24;
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    doc
      .fillColor("#374151")
      .fontSize(8)
      .font("Helvetica")
      .text(reservation.code, B, qrY + qrSize + 6, {
        width: W - B * 2,
        align: "center",
      });

    doc
      .fillColor("#9ca3af")
      .fontSize(7)
      .font("Helvetica")
      .text("meetadollexhibition.com", B, qrY + qrSize + 20, {
        width: W - B * 2,
        align: "center",
        lineBreak: false,
      });

    // ── Outer maroon border drawn last so it sits on top of all sections ──────
    doc
      .rect(B / 2, B / 2, W - B, H - B)
      .lineWidth(B)
      .strokeColor(MAROON)
      .stroke();

    doc.end();
  });
}

export async function safeGenerateTicketPDF(reservation: TicketData): Promise<Buffer | null> {
  try {
    return await generateTicketPDF(reservation);
  } catch (err) {
    logger.error({ err }, "Failed to generate ticket PDF");
    return null;
  }
}
