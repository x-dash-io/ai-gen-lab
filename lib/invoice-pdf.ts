/**
 * Invoice PDF generation using pdf-lib
 * Generates professional-looking invoices matching the web design
 */

import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import { uploadToCloudinary } from "./cloudinary";

interface InvoiceData {
  invoiceNumber: string;
  purchaseDate: Date;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  transactionId?: string;
  items: Array<{
    id: string;
    title: string;
    description?: string | null;
    amountCents: number;
    currency: string;
  }>;
  totalAmount: number;
  currency: string;
}

// Helper function to wrap text
function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Helper to format currency
function formatCurrency(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  const symbol = currency.toUpperCase() === "USD" ? "$" : currency.toUpperCase();
  return `${symbol}${amount}`;
}

/**
 * Generate an invoice PDF and upload to Cloudinary
 * Returns the URL of the uploaded PDF
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
  // Create a new PDF document (A4 portrait)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 portrait

  // Load fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  // Colors matching the web design
  const primaryBlue = rgb(0.22, 0.47, 0.91); // Primary color
  const darkBlue = rgb(0.15, 0.35, 0.75); // Darker shade
  const white = rgb(1, 1, 1);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const mediumGray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.6, 0.6, 0.6);
  const veryLightGray = rgb(0.95, 0.95, 0.95);
  const greenSuccess = rgb(0.13, 0.54, 0.13); // Green for success badge
  const lightGreen = rgb(0.9, 0.97, 0.9); // Light green background

  // ===== HEADER SECTION WITH GRADIENT EFFECT =====
  const headerHeight = 140;
  
  // Draw gradient-like header (simulate with multiple rectangles)
  const gradientSteps = 20;
  for (let i = 0; i < gradientSteps; i++) {
    const stepHeight = headerHeight / gradientSteps;
    const colorIntensity = 1 - (i / gradientSteps) * 0.15;
    page.drawRectangle({
      x: 0,
      y: height - (i + 1) * stepHeight,
      width: width,
      height: stepHeight,
      color: rgb(
        primaryBlue.red * colorIntensity,
        primaryBlue.green * colorIntensity,
        primaryBlue.blue * colorIntensity
      ),
    });
  }

  // Decorative circles (pattern overlay)
  page.drawCircle({
    x: 80,
    y: height - 70,
    size: 60,
    color: rgb(1, 1, 1),
    opacity: 0.08,
  });
  
  page.drawCircle({
    x: width - 100,
    y: height - 100,
    size: 90,
    color: rgb(1, 1, 1),
    opacity: 0.08,
  });

  // Company branding with icon placeholder
  const brandingY = height - 50;
  
  // Sparkles icon placeholder (small square)
  page.drawRectangle({
    x: 40,
    y: brandingY - 5,
    width: 24,
    height: 24,
    color: rgb(1, 1, 1),
    opacity: 0.2,
  });

  page.drawText("AI Genius Lab", {
    x: 75,
    y: brandingY,
    size: 22,
    font: helveticaBoldFont,
    color: white,
  });

  page.drawText("Premium Learning Platform", {
    x: 75,
    y: brandingY - 18,
    size: 10,
    font: helveticaFont,
    color: rgb(1, 1, 1),
    opacity: 0.7,
  });

  // Invoice badge and number (right side)
  const invoiceX = width - 180;
  
  // Invoice badge background
  page.drawRectangle({
    x: invoiceX,
    y: brandingY + 10,
    width: 140,
    height: 24,
    color: rgb(1, 1, 1),
    opacity: 0.2,
  });

  page.drawText("INVOICE", {
    x: invoiceX + 45,
    y: brandingY + 16,
    size: 11,
    font: helveticaBoldFont,
    color: white,
  });

  page.drawText(data.invoiceNumber, {
    x: invoiceX + 10,
    y: brandingY - 15,
    size: 18,
    font: helveticaBoldFont,
    color: white,
  });

  const dateStr = data.purchaseDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  page.drawText(dateStr, {
    x: invoiceX + 10,
    y: brandingY - 35,
    size: 9,
    font: helveticaFont,
    color: rgb(1, 1, 1),
    opacity: 0.7,
  });

  // ===== SUCCESS BADGE =====
  const badgeY = height - headerHeight - 50;
  
  page.drawRectangle({
    x: width / 2 - 90,
    y: badgeY,
    width: 180,
    height: 28,
    color: lightGreen,
  });

  // Checkmark icon placeholder
  page.drawCircle({
    x: width / 2 - 60,
    y: badgeY + 14,
    size: 8,
    color: greenSuccess,
  });

  page.drawText("Payment Confirmed", {
    x: width / 2 - 45,
    y: badgeY + 9,
    size: 11,
    font: helveticaBoldFont,
    color: greenSuccess,
  });

  // ===== BILLING & PAYMENT INFO SECTION =====
  const infoY = badgeY - 60;
  const columnWidth = (width - 100) / 2;

  // Bill To section
  page.drawText("BILLED TO", {
    x: 50,
    y: infoY + 30,
    size: 9,
    font: helveticaBoldFont,
    color: mediumGray,
  });

  page.drawRectangle({
    x: 50,
    y: infoY - 50,
    width: columnWidth - 20,
    height: 70,
    color: veryLightGray,
  });

  page.drawText(data.customerName, {
    x: 60,
    y: infoY - 10,
    size: 13,
    font: helveticaBoldFont,
    color: darkGray,
  });

  page.drawText(data.customerEmail, {
    x: 60,
    y: infoY - 30,
    size: 9,
    font: helveticaFont,
    color: lightGray,
  });

  // Payment Info section
  const paymentX = width / 2 + 10;
  
  page.drawText("PAYMENT INFORMATION", {
    x: paymentX,
    y: infoY + 30,
    size: 9,
    font: helveticaBoldFont,
    color: mediumGray,
  });

  page.drawRectangle({
    x: paymentX,
    y: infoY - 50,
    width: columnWidth - 20,
    height: 70,
    color: veryLightGray,
  });

  page.drawText("Method:", {
    x: paymentX + 10,
    y: infoY - 10,
    size: 9,
    font: helveticaFont,
    color: lightGray,
  });

  page.drawText(data.paymentMethod, {
    x: paymentX + 120,
    y: infoY - 10,
    size: 9,
    font: helveticaBoldFont,
    color: darkGray,
  });

  if (data.transactionId) {
    page.drawText("Transaction:", {
      x: paymentX + 10,
      y: infoY - 28,
      size: 8,
      font: helveticaFont,
      color: lightGray,
    });

    const txId = data.transactionId.length > 20 
      ? data.transactionId.substring(0, 20) + '...' 
      : data.transactionId;
    
    page.drawText(txId, {
      x: paymentX + 10,
      y: infoY - 40,
      size: 7,
      font: helveticaFont,
      color: mediumGray,
    });
  }

  // ===== ITEMS TABLE =====
  const tableY = infoY - 100;
  
  page.drawText("PURCHASED ITEMS", {
    x: 50,
    y: tableY + 20,
    size: 9,
    font: helveticaBoldFont,
    color: mediumGray,
  });

  // Table header
  page.drawRectangle({
    x: 50,
    y: tableY - 10,
    width: width - 100,
    height: 30,
    color: veryLightGray,
  });

  page.drawText("Course", {
    x: 60,
    y: tableY + 5,
    size: 9,
    font: helveticaBoldFont,
    color: mediumGray,
  });

  page.drawText("Amount", {
    x: width - 120,
    y: tableY + 5,
    size: 9,
    font: helveticaBoldFont,
    color: mediumGray,
  });

  // Table items
  let currentY = tableY - 30;
  const rowHeight = 60;

  data.items.forEach((item, index) => {
    // Alternating row background
    if (index % 2 === 0) {
      page.drawRectangle({
        x: 50,
        y: currentY - rowHeight + 10,
        width: width - 100,
        height: rowHeight,
        color: rgb(0.98, 0.98, 0.98),
      });
    }

    // Course icon placeholder
    page.drawRectangle({
      x: 60,
      y: currentY - 25,
      width: 30,
      height: 30,
      color: rgb(0.9, 0.93, 0.98),
    });

    // Course title
    const titleLines = wrapText(item.title, 320, helveticaBoldFont, 11);
    titleLines.slice(0, 2).forEach((line, lineIndex) => {
      page.drawText(line, {
        x: 100,
        y: currentY - 10 - (lineIndex * 14),
        size: 11,
        font: helveticaBoldFont,
        color: darkGray,
      });
    });

    // Course ID
    const courseId = item.id.slice(-8).toUpperCase();
    page.drawText(`#${courseId}`, {
      x: 100,
      y: currentY - 40,
      size: 7,
      font: helveticaFont,
      color: lightGray,
    });

    // Amount
    page.drawText(formatCurrency(item.amountCents, item.currency), {
      x: width - 120,
      y: currentY - 20,
      size: 13,
      font: helveticaBoldFont,
      color: darkGray,
    });

    currentY -= rowHeight;
  });

  // ===== TOTALS SECTION =====
  const totalsY = currentY - 20;
  const totalsX = width - 250;

  page.drawRectangle({
    x: totalsX,
    y: totalsY - 80,
    width: 200,
    height: 90,
    color: veryLightGray,
  });

  // Subtotal
  page.drawText("Subtotal:", {
    x: totalsX + 15,
    y: totalsY - 20,
    size: 9,
    font: helveticaFont,
    color: lightGray,
  });

  page.drawText(formatCurrency(data.totalAmount, data.currency), {
    x: totalsX + 130,
    y: totalsY - 20,
    size: 9,
    font: helveticaBoldFont,
    color: darkGray,
  });

  // Tax
  page.drawText("Tax:", {
    x: totalsX + 15,
    y: totalsY - 40,
    size: 9,
    font: helveticaFont,
    color: lightGray,
  });

  page.drawText(formatCurrency(0, data.currency), {
    x: totalsX + 130,
    y: totalsY - 40,
    size: 9,
    font: helveticaBoldFont,
    color: darkGray,
  });

  // Divider line
  page.drawLine({
    start: { x: totalsX + 15, y: totalsY - 50 },
    end: { x: totalsX + 185, y: totalsY - 50 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Total
  page.drawText("Total Paid:", {
    x: totalsX + 15,
    y: totalsY - 70,
    size: 11,
    font: helveticaBoldFont,
    color: darkGray,
  });

  page.drawText(formatCurrency(data.totalAmount, data.currency), {
    x: totalsX + 110,
    y: totalsY - 70,
    size: 16,
    font: helveticaBoldFont,
    color: primaryBlue,
  });

  // ===== TERMS & CONDITIONS =====
  const termsY = totalsY - 130;
  
  page.drawRectangle({
    x: 50,
    y: termsY - 50,
    width: width - 100,
    height: 60,
    color: veryLightGray,
    borderColor: rgb(0.85, 0.85, 0.85),
    borderWidth: 1,
  });

  page.drawText("Terms & Conditions:", {
    x: 60,
    y: termsY - 15,
    size: 9,
    font: helveticaBoldFont,
    color: darkGray,
  });

  const { invoiceConfig } = await import("./config");
  const termsText = invoiceConfig.terms;
  const termsLines = wrapText(termsText, width - 140, helveticaFont, 7);

  termsLines.forEach((line, index) => {
    page.drawText(line, {
      x: 60,
      y: termsY - 30 - (index * 9),
      size: 7,
      font: helveticaFont,
      color: lightGray,
    });
  });

  // ===== FOOTER =====
  const footerY = 50;
  
  page.drawText(invoiceConfig.footer, {
    x: width / 2 - 180,
    y: footerY + 15,
    size: 7,
    font: helveticaFont,
    color: lightGray,
  });

  page.drawText("Thank you for your purchase!", {
    x: width / 2 - 70,
    y: footerY,
    size: 8,
    font: helveticaBoldFont,
    color: mediumGray,
  });

  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();

  // Upload to Cloudinary
  const { secureUrl } = await uploadToCloudinary(Buffer.from(pdfBytes), {
    folder: "invoices",
    resourceType: "raw",
    publicId: `invoice-${data.invoiceNumber}`,
  });

  return secureUrl;
}
