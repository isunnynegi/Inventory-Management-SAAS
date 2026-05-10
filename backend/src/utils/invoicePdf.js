import PDFDocument from "pdfkit";
import Organization from "../modules/organization/organization.model.js";

export async function genInvoiceNumber(orgDoc) {
  orgDoc.invoiceCounter = (orgDoc.invoiceCounter || 0) + 1;
  await orgDoc.save({ validateBeforeSave: false });
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${orgDoc.invoicePrefix || "INV"}-${ym}-${String(orgDoc.invoiceCounter).padStart(4, "0")}`;
}

export function buildPDF(doc, invoice, org) {
  const C = {
    primary: "#4F46E5", primaryDark: "#3730A3", primaryLight: "#EEF2FF",
    dark: "#111827", mid: "#374151", gray: "#6B7280",
    light: "#F9FAFB", border: "#E5E7EB", white: "#FFFFFF",
    green: "#10B981", red: "#EF4444", amber: "#F59E0B",
  };
  const sym = org.currencySymbol || "₹";
  const PW = 595, M = 40, W = PW - M * 2;
  const MID = M + Math.floor(W / 2), HALF = Math.floor(W / 2), ROW_H = 18;
  const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const money = (n) => `${sym}${(Number(n) || 0).toFixed(2)}`;

  // Top accent bar
  doc.rect(0, 0, PW, 5).fill(C.primary);

  // Header
  let y = 18;
  doc.fillColor(C.primary).fontSize(18).font("Helvetica-Bold")
     .text(org.storeName || org.name || "Business", M, y, { width: HALF - 10, lineBreak: false });
  doc.fillColor(C.dark).fontSize(11).font("Helvetica-Bold")
     .text("TAX INVOICE", MID + 10, y, { width: HALF - 10, align: "right", lineBreak: false });
  y += 22;

  doc.fillColor(C.gray).fontSize(7.5).font("Helvetica");
  const addrParts = [org.address?.street, org.address?.city, org.address?.state, org.address?.zip].filter(Boolean);
  if (addrParts.length) { doc.text(addrParts.join(", "), M, y, { width: HALF - 10, lineBreak: false }); y += 11; }
  if (org.phone)  { doc.text(`Ph: ${org.phone}`,    M, y, { lineBreak: false }); y += 11; }
  if (org.email)  { doc.text(`Email: ${org.email}`, M, y, { lineBreak: false }); y += 11; }
  if (org.gstin)  { doc.text(`GSTIN: ${org.gstin}`, M, y, { lineBreak: false }); y += 11; }

  const metaStartY = 40, lX = MID + 10, vX = MID + 80;
  const metaRow = (label, value, ry) => {
    doc.fillColor(C.gray).fontSize(7.5).font("Helvetica-Bold").text(label, lX, ry, { width: 65, lineBreak: false });
    doc.fillColor(C.dark).font("Helvetica").text(value, vX, ry, { width: HALF - 50, lineBreak: false });
  };
  metaRow("Invoice No :", invoice.invoiceNumber, metaStartY);
  metaRow("Date       :", fmt(invoice.date), metaStartY + 12);
  metaRow("Due Date   :", invoice.dueDate ? fmt(invoice.dueDate) : "On Receipt", metaStartY + 24);
  metaRow("Pay Method :", invoice.paymentMethod
    ? invoice.paymentMethod.charAt(0).toUpperCase() + invoice.paymentMethod.slice(1)
    : "—", metaStartY + 36);
  y = Math.max(y, metaStartY + 52) + 6;

  // Divider
  doc.rect(M, y, W, 2).fill(C.primary);
  y += 10;

  // Info box
  const BOX_H = 82;
  doc.rect(M, y, W, BOX_H).fill(C.light);
  doc.rect(M, y, W, BOX_H).lineWidth(0.5).stroke(C.border);

  doc.fillColor(C.primary).fontSize(7).font("Helvetica-Bold").text("BILL TO", M + 8, y + 7, { lineBreak: false });
  doc.fillColor(C.dark).fontSize(9).font("Helvetica-Bold")
     .text(invoice.customerName || "Walk-in Customer", M + 8, y + 17, { width: HALF - 18, lineBreak: false });
  doc.fillColor(C.mid).fontSize(7.5).font("Helvetica");
  let cy = y + 30;
  if (invoice.customerPhone)   { doc.text(`Ph: ${invoice.customerPhone}`,  M + 8, cy, { width: HALF - 18, lineBreak: false }); cy += 11; }
  if (invoice.customerAddress) { doc.text(invoice.customerAddress,          M + 8, cy, { width: HALF - 18, lineBreak: false }); cy += 11; }

  doc.moveTo(MID, y + 8).lineTo(MID, y + BOX_H - 8).lineWidth(0.5).strokeColor(C.border).stroke();

  doc.fillColor(C.primary).fontSize(7).font("Helvetica-Bold").text("PAYMENT DETAILS", MID + 10, y + 7, { lineBreak: false });
  const pLX = MID + 10, pVX = MID + 75;
  let py = y + 19;
  const pRow = (lbl, val) => {
    doc.fillColor(C.gray).fontSize(7.5).font("Helvetica-Bold").text(lbl, pLX, py, { width: 60, lineBreak: false });
    doc.fillColor(C.dark).font("Helvetica").text(val, pVX, py, { width: HALF - 45, lineBreak: false });
    py += 12;
  };
  pRow("Paid :", money(invoice.amountPaid));
  pRow("Balance :", money(Math.max(0, invoice.grandTotal - (invoice.amountPaid || 0))));

  const stC = { paid: C.green, unpaid: C.red, partial: C.amber, cancelled: C.gray };
  doc.rect(pLX, py + 2, 48, 14).fill(stC[invoice.status] || C.gray);
  doc.fillColor(C.white).fontSize(7).font("Helvetica-Bold")
     .text((invoice.status || "UNPAID").toUpperCase(), pLX, py + 5.5, { width: 48, align: "center", lineBreak: false });

  y += BOX_H + 12;

  // Items table
  const cSno = M, cItem = M + 20, cQty = M + 300, cRate = M + 355, cTaxP = M + 405, cTaxA = M + 445, cTotal = M + 515;
  doc.rect(M, y, W, ROW_H).fill(C.primary);
  doc.fillColor(C.white).fontSize(7.5).font("Helvetica-Bold");
  doc.text("#",             cSno,  y + 5.5, { width: 18, align: "center", lineBreak: false });
  doc.text("Item Description", cItem, y + 5.5, { width: 275, lineBreak: false });
  doc.text("Qty",           cQty,  y + 5.5, { width: 50, align: "right", lineBreak: false });
  doc.text(`Rate(${sym})`,  cRate, y + 5.5, { width: 45, align: "right", lineBreak: false });
  doc.text("Tax%",          cTaxP, y + 5.5, { width: 35, align: "right", lineBreak: false });
  doc.text(`Tax(${sym})`,   cTaxA, y + 5.5, { width: 40, align: "right", lineBreak: false });
  doc.text(`Total(${sym})`, cTotal - 35, y + 5.5, { width: 35, align: "right", lineBreak: false });
  y += ROW_H;

  doc.fontSize(8).font("Helvetica");
  invoice.items.forEach((item, i) => {
    doc.rect(M, y, W, ROW_H).fill(i % 2 === 0 ? C.white : C.light);
    doc.fillColor(C.dark);
    doc.text(String(i + 1), cSno, y + 5, { width: 18, align: "center", lineBreak: false });
    const label = `${item.name}${item.unit ? ` (${item.unit})` : ""}`;
    doc.text(label.substring(0, 46), cItem, y + 5, { width: 275, lineBreak: false });
    doc.text(String(item.qty), cQty, y + 5, { width: 50, align: "right", lineBreak: false });
    doc.text((item.price || 0).toFixed(2), cRate, y + 5, { width: 45, align: "right", lineBreak: false });
    doc.text(`${item.taxPercent || 0}%`, cTaxP, y + 5, { width: 35, align: "right", lineBreak: false });
    doc.text((item.taxAmount || 0).toFixed(2), cTaxA, y + 5, { width: 40, align: "right", lineBreak: false });
    doc.text(item.lineTotal.toFixed(2), cTotal - 35, y + 5, { width: 35, align: "right", lineBreak: false });
    y += ROW_H;
  });

  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(C.border).stroke();
  y += 12;

  // Totals
  const tW = 210, tX = M + W - tW, tLblX = tX, tValX = tX + 120, tValW = tW - 122;
  const totRow = (label, value, isBold = false, isNeg = false) => {
    doc.fillColor(C.gray).fontSize(8).font(isBold ? "Helvetica-Bold" : "Helvetica")
       .text(label, tLblX, y, { width: 116, align: "right", lineBreak: false });
    doc.fillColor(isBold ? C.dark : C.mid).font(isBold ? "Helvetica-Bold" : "Helvetica")
       .text(`${isNeg ? "−" : ""}${money(value)}`, tValX, y, { width: tValW, align: "right", lineBreak: false });
    y += 13;
  };
  totRow("Subtotal", invoice.subtotal || 0);
  if ((invoice.discount || 0) > 0) totRow("Discount", invoice.discount, false, true);
  if ((invoice.deliveryCharge || 0) > 0) totRow("Delivery Charge", invoice.deliveryCharge);
  if ((invoice.taxTotal || 0) > 0) totRow("Tax (GST)", invoice.taxTotal);

  doc.rect(tX - 8, y, tW + 8, 22).fill(C.primary);
  doc.fillColor(C.white).fontSize(9.5).font("Helvetica-Bold");
  doc.text("Grand Total", tLblX - 8, y + 6, { width: 116 + 8, align: "right", lineBreak: false });
  doc.text(money(invoice.grandTotal), tValX, y + 6, { width: tValW, align: "right", lineBreak: false });
  y += 30;

  // Footer
  const footY = 800;
  doc.moveTo(M, footY).lineTo(M + W, footY).lineWidth(0.5).strokeColor(C.border).stroke();
  doc.fillColor(C.gray).fontSize(7.5).font("Helvetica");
  const note = invoice.notes ? `Note: ${invoice.notes}` : "Thank you for your business!";
  doc.text(note, M, footY + 8, { width: W / 2, lineBreak: false });
  if (invoice.terms) doc.text(`Terms & Conditions: ${invoice.terms}`, M, footY + 20, { width: W });
  doc.fillColor(C.gray).text("This is a computer generated invoice.", M + W / 2, footY + 8, { width: W / 2, align: "right", lineBreak: false });
}

export function createPDFStream(res, invoice, org, disposition = "inline") {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename="${invoice.invoiceNumber}.pdf"`);
  const doc = new PDFDocument({ margin: 40, size: "A4", info: { Title: invoice.invoiceNumber, Author: org.name || org.storeName } });
  doc.pipe(res);
  buildPDF(doc, invoice, org);
  doc.end();
}
