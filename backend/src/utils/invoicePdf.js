import PDFDocument from "pdfkit";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatIndian(n) {
  const abs = Math.abs(Math.round(Number(n) || 0));
  const s = abs.toString();
  if (s.length <= 3) return s;
  let result = s.slice(-3);
  let rem = s.slice(0, -3);
  while (rem.length > 2) { result = rem.slice(-2) + "," + result; rem = rem.slice(0, -2); }
  if (rem) result = rem + "," + result;
  return result;
}

function amountToWords(amount) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const toW = (n) => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toW(n % 100) : "");
  };
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "Zero Rupees only";
  const cr = Math.floor(n / 10000000);
  const lk = Math.floor((n % 10000000) / 100000);
  const th = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  let w = "";
  if (cr) w += toW(cr) + " Crore ";
  if (lk) w += toW(lk) + " Lakh ";
  if (th) w += toW(th) + " Thousand ";
  if (rest) w += toW(rest);
  return "Rupees " + w.trim() + " only";
}

export async function genInvoiceNumber(orgDoc) {
  orgDoc.invoiceCounter = (orgDoc.invoiceCounter || 0) + 1;
  await orgDoc.save({ validateBeforeSave: false });
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${orgDoc.invoicePrefix || "INV"}-${ym}-${String(orgDoc.invoiceCounter).padStart(4, "0")}`;
}

// ── PDF Renderer ──────────────────────────────────────────────────────────────
export function buildPDF(doc, invoice, org) {
  const C = {
    primary:    "#4F46E5",
    dark:       "#111827",
    mid:        "#374151",
    gray:       "#6B7280",
    lightGray:  "#9CA3AF",
    border:     "#D1D5DB",
    bg:         "#F9FAFB",
    white:      "#FFFFFF",
    green:      "#16A34A",
    greenBg:    "#DCFCE7",
    red:        "#DC2626",
    amber:      "#D97706",
    tableBorder:"#E5E7EB",
    tableHdr:   "#F3F4F6",
  };
  const sym = org.currencySymbol || "₹";
  const PW = 595, PH = 842, M = 40, W = PW - M * 2;  // W = 515
  const MID = M + Math.floor(W / 2);                   // 297

  const money = (n) => `${sym}${formatIndian(n)}`;
  const fmt = (d) => !d ? "—" : new Date(d).toLocaleDateString("en-IN",
    { day: "numeric", month: "long", year: "numeric" });

  // ── Logo + Store header ───────────────────────────────────────────────────
  const LOGO_R = 22, LOGO_CX = M + LOGO_R, LOGO_CY = 48;
  const initials = (org.storeName || org.name || "ST").slice(0, 2).toUpperCase();
  doc.circle(LOGO_CX, LOGO_CY, LOGO_R).fill(C.primary);
  doc.fillColor(C.white).fontSize(12).font("Helvetica-Bold")
     .text(initials, M, LOGO_CY - 7, { width: LOGO_R * 2, align: "center", lineBreak: false });

  const iX = M + LOGO_R * 2 + 10;  // store info column x = 94
  let ly = LOGO_CY - 20;            // start aligned with top of logo
  doc.fillColor(C.dark).fontSize(14).font("Helvetica-Bold")
     .text(org.storeName || org.name || "", iX, ly, { lineBreak: false });
  ly += 17;
  if (org.slug) {
    doc.fillColor(C.gray).fontSize(8).font("Helvetica")
       .text(`${org.slug}.stockkart.in`, iX, ly, { lineBreak: false });
    ly += 11;
  }
  const a = org.address || {};
  const aLine1 = [a.street].filter(Boolean).join("");
  const aLine2 = [a.city, a.state, a.zip].filter(Boolean).join(", ");
  if (aLine1) { doc.fillColor(C.gray).fontSize(8).font("Helvetica").text(aLine1, iX, ly, { lineBreak: false }); ly += 11; }
  if (aLine2) { doc.text(aLine2, iX, ly, { lineBreak: false }); ly += 11; }
  if (org.phone) { doc.text(`Phone: ${org.phone}`, iX, ly, { lineBreak: false }); ly += 11; }
  if (org.email) { doc.text(`Email: ${org.email}`, iX, ly, { lineBreak: false }); ly += 11; }
  if (org.gstin) {
    doc.fillColor(C.mid).fontSize(8).font("Helvetica-Bold")
       .text(`GSTIN: ${org.gstin}`, iX, ly, { lineBreak: false }); ly += 11;
  }

  // ── TAX INVOICE title + meta (right column) ───────────────────────────────
  const rX = 340; // right column x
  doc.fillColor(C.dark).fontSize(24).font("Helvetica-Bold")
     .text("TAX INVOICE", rX, 26, { width: M + W - rX, align: "right", lineBreak: false });

  const mLX = rX, mVX = rX + 88;
  let my = 66;
  const metaRow = (lbl, val) => {
    doc.fillColor(C.gray).fontSize(8).font("Helvetica")
       .text(lbl, mLX, my, { width: 84, lineBreak: false });
    doc.fillColor(C.dark).fontSize(8).font("Helvetica-Bold")
       .text(val || "—", mVX, my, { width: M + W - mVX, lineBreak: false });
    my += 13;
  };
  metaRow("Invoice No", invoice.invoiceNumber);
  metaRow("Date", fmt(invoice.date));
  metaRow("Due", invoice.dueDate ? fmt(invoice.dueDate) : (invoice.status === "paid" ? "Paid in full" : "On Receipt"));
  const pos = invoice.placeOfSupply || a.state || "";
  if (pos) metaRow("Place of supply", pos);

  // ── Divider ───────────────────────────────────────────────────────────────
  let y = Math.max(ly, my) + 8;
  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.75).strokeColor(C.border).stroke();
  y += 14;

  // ── BILLED TO (left) / PAYMENT (right) ────────────────────────────────────
  const billY0 = y;

  // Left: BILLED TO
  let bY = billY0;
  doc.fillColor(C.gray).fontSize(7).font("Helvetica-Bold")
     .text("BILLED TO", M, bY, { lineBreak: false });
  bY += 11;
  doc.fillColor(C.dark).fontSize(10).font("Helvetica-Bold")
     .text(invoice.customerName || "Walk-in Customer", M, bY, { width: MID - M - 10, lineBreak: false });
  bY += 14;
  doc.fillColor(C.mid).fontSize(8).font("Helvetica");
  if (invoice.customerAddress) {
    // wrap address
    doc.text(invoice.customerAddress, M, bY, { width: MID - M - 10 });
    bY = doc.y + 2;
  }
  if (invoice.customerPhone) { doc.text(`Phone: ${invoice.customerPhone}`, M, bY, { lineBreak: false }); bY += 11; }
  if (invoice.customerGstin) {
    doc.fillColor(C.mid).font("Helvetica-Bold")
       .text(`GSTIN: ${invoice.customerGstin}`, M, bY, { lineBreak: false }); bY += 11;
  }

  // Right: PAYMENT
  let pY = billY0;
  doc.fillColor(C.gray).fontSize(7).font("Helvetica-Bold")
     .text("PAYMENT", MID + 10, pY, { lineBreak: false });
  pY += 11;

  const pmLabel = { cash: "Cash", upi: "UPI", card: "Card / Netbanking", bank: "Bank Transfer", credit: "Credit", other: "Other" };
  const pmRow = (lbl, val) => {
    doc.fillColor(C.gray).fontSize(8).font("Helvetica")
       .text(lbl, MID + 10, pY, { width: 60, lineBreak: false });
    doc.fillColor(C.mid).font("Helvetica")
       .text(val, MID + 72, pY, { width: M + W - MID - 72, lineBreak: false });
    pY += 12;
  };
  pmRow("Method:", pmLabel[invoice.paymentMethod] || invoice.paymentMethod || "—");
  if (invoice.paymentReference) pmRow("Reference:", invoice.paymentReference);

  // Payment status badge
  const stColors = { paid: [C.green, C.greenBg], unpaid: [C.red, "#FEE2E2"], partial: [C.amber, "#FEF3C7"], cancelled: [C.gray, C.bg] };
  const [stText, stBg] = stColors[invoice.status] || [C.gray, C.bg];
  const badge = (invoice.status || "unpaid").toUpperCase();
  pY += 2;
  doc.roundedRect(MID + 10, pY, badge.length * 6 + 14, 16, 3).fill(stBg);
  doc.fillColor(stText).fontSize(7.5).font("Helvetica-Bold")
     .text(badge, MID + 10, pY + 4.5, { width: badge.length * 6 + 14, align: "center", lineBreak: false });
  pY += 22;

  y = Math.max(bY, pY) + 14;

  // ── Items table ───────────────────────────────────────────────────────────
  // Column left edges (absolute x)
  const COL = {
    sno:  M,        // 40   w=20
    desc: M + 20,   // 60   w=195
    hsn:  M + 215,  // 255  w=58
    qty:  M + 273,  // 313  w=40
    rate: M + 313,  // 353  w=70
    gst:  M + 383,  // 423  w=45
    amt:  M + 428,  // 468  w=87  → right edge=555 ✓
  };
  const ROW_H = 20, HDR_H = 20;

  // Table header
  doc.rect(M, y, W, HDR_H).fill(C.tableHdr);
  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(C.tableBorder).stroke();
  doc.moveTo(M, y + HDR_H).lineTo(M + W, y + HDR_H).lineWidth(0.5).strokeColor(C.tableBorder).stroke();

  const hdrCell = (txt, x, w, align = "left") => {
    doc.fillColor(C.dark).fontSize(7.5).font("Helvetica-Bold")
       .text(txt, x + 3, y + 6.5, { width: w - 6, align, lineBreak: false });
  };
  hdrCell("#",           COL.sno,  20);
  hdrCell("DESCRIPTION", COL.desc, 195);
  hdrCell("HSN",         COL.hsn,  58,  "center");
  hdrCell("QTY",         COL.qty,  40,  "right");
  hdrCell("RATE",        COL.rate, 70,  "right");
  hdrCell("GST",         COL.gst,  45,  "right");
  hdrCell("AMOUNT",      COL.amt,  87,  "right");
  y += HDR_H;

  // Item rows
  invoice.items.forEach((item, i) => {
    const rowBg = i % 2 === 0 ? C.white : C.bg;
    doc.rect(M, y, W, ROW_H).fill(rowBg);
    doc.moveTo(M, y + ROW_H).lineTo(M + W, y + ROW_H).lineWidth(0.3).strokeColor(C.tableBorder).stroke();

    doc.fillColor(C.gray).fontSize(8).font("Helvetica")
       .text(String(i + 1), COL.sno + 3, y + 6.5, { width: 14, align: "center", lineBreak: false });

    // Name + SKU
    doc.fillColor(C.dark).fontSize(8).font("Helvetica")
       .text((item.name || "").slice(0, 40), COL.desc + 3, y + 4, { width: 189, lineBreak: false });
    if (item.sku) {
      doc.fillColor(C.lightGray).fontSize(6.5).font("Helvetica")
         .text(`SKU ${item.sku}`, COL.desc + 3, y + 13, { width: 189, lineBreak: false });
    }

    doc.fillColor(C.mid).fontSize(8).font("Helvetica")
       .text(item.hsn || "—", COL.hsn + 3, y + 6.5, { width: 52, align: "center", lineBreak: false });
    doc.text(String(item.qty) + (item.unit ? ` ${item.unit}` : ""), COL.qty + 3, y + 6.5, { width: 34, align: "right", lineBreak: false });
    doc.text(money(item.price || 0), COL.rate + 3, y + 6.5, { width: 64, align: "right", lineBreak: false });
    doc.text(`${item.taxPercent || 0}%`, COL.gst + 3, y + 6.5, { width: 39, align: "right", lineBreak: false });
    doc.fillColor(C.dark).font("Helvetica")
       .text(money(item.lineTotal || 0), COL.amt + 3, y + 6.5, { width: 81, align: "right", lineBreak: false });

    y += ROW_H;
  });

  // Table bottom border
  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.75).strokeColor(C.border).stroke();
  y += 16;

  // ── Totals (right-aligned) ────────────────────────────────────────────────
  const tW = 220, tX = M + W - tW;
  const totRow = (lbl, val, bold = false, neg = false) => {
    doc.fillColor(bold ? C.dark : C.mid).fontSize(bold ? 9 : 8)
       .font(bold ? "Helvetica-Bold" : "Helvetica")
       .text(lbl, tX, y, { width: tW - 80, align: "right", lineBreak: false });
    doc.fillColor(bold ? C.dark : C.mid).fontSize(bold ? 9 : 8)
       .font(bold ? "Helvetica-Bold" : "Helvetica")
       .text(`${neg ? "−" : ""}${money(val)}`, tX + tW - 78, y, { width: 78, align: "right", lineBreak: false });
    y += bold ? 16 : 13;
  };

  totRow("Subtotal", invoice.subtotal || 0);
  if ((invoice.discount || 0) > 0) totRow("Discount", invoice.discount, false, true);
  if ((invoice.deliveryCharge || 0) > 0) totRow("Delivery Charge", invoice.deliveryCharge);

  // CGST / SGST breakdown per tax rate
  const taxBreakdown = {};
  (invoice.items || []).forEach(item => {
    const r = item.taxPercent || 0;
    if (r > 0) {
      if (!taxBreakdown[r]) taxBreakdown[r] = 0;
      taxBreakdown[r] += (item.taxAmount || 0);
    }
  });
  const rates = Object.keys(taxBreakdown).map(Number).sort((a, b) => a - b);
  if (rates.length > 0) {
    rates.forEach(rate => {
      const halfRate = rate / 2;
      const halfTax = taxBreakdown[rate] / 2;
      totRow(`CGST (${halfRate}%)`, halfTax);
      totRow(`SGST (${halfRate}%)`, halfTax);
    });
  } else if ((invoice.taxTotal || 0) > 0) {
    // fallback if item-level tax data missing
    totRow("CGST", invoice.taxTotal / 2);
    totRow("SGST", invoice.taxTotal / 2);
  }

  // Total row (with top separator)
  doc.moveTo(tX, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(C.border).stroke();
  y += 4;
  doc.rect(tX, y, tW, 22).fill(C.bg);
  doc.fillColor(C.dark).fontSize(10).font("Helvetica-Bold")
     .text("Total", tX, y + 6.5, { width: tW - 80, align: "right", lineBreak: false });
  doc.text(money(invoice.grandTotal || 0), tX + tW - 78, y + 6.5, { width: 78, align: "right", lineBreak: false });
  y += 28;

  // ── Amount in words ───────────────────────────────────────────────────────
  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.3).strokeColor(C.border).stroke();
  y += 8;
  doc.fillColor(C.mid).fontSize(8).font("Helvetica-Oblique")
     .text(`Amount in words: ${amountToWords(invoice.grandTotal || 0)}.`, M, y, { width: W });
  y = doc.y + 16;

  // ── Terms & Conditions + Authorised Signatory ─────────────────────────────
  const defaultTerms = "- Goods once sold cannot be returned without original invoice within 7 days.\n- All disputes subject to local jurisdiction.\n- E. & O.E.";
  const termsText = invoice.terms || defaultTerms;

  // Draw terms on left, signatory on right
  const tcY = Math.min(y, PH - 140);  // ensure it fits on page
  doc.fillColor(C.gray).fontSize(7.5).font("Helvetica-Bold")
     .text("Terms & conditions", M, tcY, { lineBreak: false });
  doc.fillColor(C.gray).fontSize(7.5).font("Helvetica")
     .text(termsText, M, tcY + 12, { width: MID - M - 10 });

  // Signatory (right column)
  const sigY = PH - 90;
  doc.moveTo(MID + 60, sigY).lineTo(M + W, sigY).lineWidth(0.5).strokeColor(C.border).stroke();
  doc.fillColor(C.gray).fontSize(8).font("Helvetica")
     .text("Authorised signatory", MID + 10, sigY + 6, { width: M + W - MID - 10, align: "center", lineBreak: false });
  doc.fillColor(C.mid).fontSize(8).font("Helvetica-Bold")
     .text(`For ${org.storeName || org.name || ""}`, MID + 10, sigY + 18, { width: M + W - MID - 10, align: "center", lineBreak: false });

  // ── Footer ────────────────────────────────────────────────────────────────
  const footY = PH - 30;
  doc.moveTo(M, footY - 8).lineTo(M + W, footY - 8).lineWidth(0.3).strokeColor(C.border).stroke();
  doc.fillColor(C.lightGray).fontSize(7.5).font("Helvetica")
     .text(`Generated by StockKart · stockkart.in · Thank you for your business!`, M, footY - 2, { width: W, align: "center", lineBreak: false });
}

export function createPDFStream(res, invoice, org, disposition = "inline") {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${disposition}; filename="${invoice.invoiceNumber}.pdf"`);
  const doc = new PDFDocument({ margin: 40, size: "A4", info: { Title: invoice.invoiceNumber, Author: org.name || org.storeName } });
  doc.pipe(res);
  buildPDF(doc, invoice, org);
  doc.end();
}
