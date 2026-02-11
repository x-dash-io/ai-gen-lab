/**
 * Certificate PDF generation using pdf-lib
 * Generates professional-looking certificates for course and learning path completion
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { uploadToCloudinary } from "./cloudinary";
import fs from "fs";
import path from "path";

interface CertificateData {
  certificateId: string;
  recipientName: string;
  courseName?: string;
  pathName?: string;
  issuedAt: Date;
  type: "course" | "learning_path";
}

/**
 * Generate a certificate PDF and upload to Cloudinary
 * Returns the URL of the uploaded PDF
 */
export async function generateCertificatePDF(
  data: CertificateData
): Promise<string> {
  // Create a new PDF document (landscape A4)
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([842, 595]); // A4 landscape

  // Load fonts
  const greatVibesPath = path.join(process.cwd(), "public", "fonts", "GreatVibes-Regular.ttf");
  const greatVibesBytes = fs.readFileSync(greatVibesPath);
  const greatVibesFont = await pdfDoc.embedFont(greatVibesBytes);
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();

  // Colors
  const primaryColor = rgb(0.15, 0.38, 0.92); // Blue
  const goldColor = rgb(0.83, 0.68, 0.21); // Gold
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.6, 0.6, 0.6);

  // Draw decorative border
  const borderMargin = 30;
  const borderWidth = 3;

  // Outer border
  page.drawRectangle({
    x: borderMargin,
    y: borderMargin,
    width: width - 2 * borderMargin,
    height: height - 2 * borderMargin,
    borderColor: goldColor,
    borderWidth: borderWidth,
  });

  // Inner border
  page.drawRectangle({
    x: borderMargin + 10,
    y: borderMargin + 10,
    width: width - 2 * (borderMargin + 10),
    height: height - 2 * (borderMargin + 10),
    borderColor: primaryColor,
    borderWidth: 1,
  });

  // Draw corner decorations
  const corners = [
    { x: borderMargin + 5, y: height - borderMargin - 5 },
    { x: width - borderMargin - 5, y: height - borderMargin - 5 },
    { x: borderMargin + 5, y: borderMargin + 5 },
    { x: width - borderMargin - 5, y: borderMargin + 5 },
  ];

  corners.forEach((corner) => {
    page.drawCircle({
      x: corner.x,
      y: corner.y,
      size: 8,
      color: goldColor,
    });
  });

  // --- LOGO: CENTER TOP ---
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const logoImageBytes = fs.readFileSync(logoPath);

    let logoImage;
    if (logoPath.endsWith(".png")) {
      logoImage = await pdfDoc.embedPng(logoImageBytes);
    } else {
      logoImage = await pdfDoc.embedJpg(logoImageBytes);
    }

    const logoDims = logoImage.scale(0.5); // Large scale for center top

    page.drawImage(logoImage, {
      x: (width - logoDims.width) / 2, // Centered
      y: height - borderMargin - 10 - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });

  } catch (error) {
    console.warn("Failed to load certificate logo:", error);
  }

  // --- HEADER: CENTER TOP ---
  const headerText = "CERTIFICATE";
  const subHeaderText = "OF COMPLETION";

  const headerFontSize = 40;
  const subHeaderFontSize = 12;

  const headerWidth = timesRomanBoldFont.widthOfTextAtSize(headerText, headerFontSize);
  const subHeaderWidth = timesRomanFont.widthOfTextAtSize(subHeaderText, subHeaderFontSize);

  // Draw Header
  page.drawText(headerText, {
    x: (width - headerWidth) / 2,
    y: height - 210, // Moved down 30px to avoid overlap
    size: headerFontSize,
    font: timesRomanBoldFont,
    color: primaryColor,
  });

  // Draw SubHeader
  page.drawText(subHeaderText, {
    x: (width - subHeaderWidth) / 2,
    y: height - 230,
    size: subHeaderFontSize,
    font: timesRomanFont,
    color: darkGray,
  });

  // --- BODY: CENTER ---

  // "This is to certify that"
  const certifyText = "This is to certify that";
  const certifyFontSize = 14;
  const certifyWidth = timesRomanFont.widthOfTextAtSize(certifyText, certifyFontSize);

  page.drawText(certifyText, {
    x: (width - certifyWidth) / 2,
    y: height - 260,
    size: certifyFontSize,
    font: timesRomanFont,
    color: darkGray,
  });

  // RECIPIENT NAME
  const nameFontSize = 42;
  const nameWidth = greatVibesFont.widthOfTextAtSize(data.recipientName, nameFontSize);

  page.drawText(data.recipientName, {
    x: (width - nameWidth) / 2,
    y: height - 310,
    size: nameFontSize,
    font: greatVibesFont,
    color: darkGray,
  });

  // Underline Name
  page.drawLine({
    start: { x: width / 2 - 150, y: height - 325 },
    end: { x: width / 2 + 150, y: height - 325 },
    thickness: 1,
    color: lightGray,
  });

  // "has successfully completed the"
  const completedText = "has successfully completed the";
  const courseTypeText = data.type === "course" ? "Course" : "Learning Path";

  const completedFontSize = 12;
  const fullCompletedText = `${completedText} ${courseTypeText}`;
  const completedWidth = timesRomanFont.widthOfTextAtSize(fullCompletedText, completedFontSize);

  page.drawText(fullCompletedText, {
    x: (width - completedWidth) / 2,
    y: height - 340,
    size: completedFontSize,
    font: timesRomanFont,
    color: darkGray,
  });

  // COURSE NAME
  const itemName = data.courseName || data.pathName || "Unknown";
  const itemFontSize = 24;
  const itemWidth = timesRomanBoldFont.widthOfTextAtSize(itemName, itemFontSize);

  // Handle long names
  let adjustedItemFontSize = itemFontSize;
  let adjustedItemWidth = itemWidth;
  while (adjustedItemWidth > width - 150 && adjustedItemFontSize > 14) {
    adjustedItemFontSize -= 2;
    adjustedItemWidth = timesRomanBoldFont.widthOfTextAtSize(itemName, adjustedItemFontSize);
  }

  page.drawText(itemName, {
    x: (width - adjustedItemWidth) / 2,
    y: height - 370,
    size: adjustedItemFontSize,
    font: timesRomanBoldFont,
    color: primaryColor,
  });

  // --- FOOTER: BOTTOM ---

  const footerBaseY = 100;

  // Center: Date and Badge
  // Date
  const dateStr = data.issuedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const dateText = `Date: ${dateStr}`;
  const dateFontSize = 10;
  const dateWidth = helveticaFont.widthOfTextAtSize(dateText, dateFontSize);

  page.drawText(dateText, {
    x: (width - dateWidth) / 2,
    y: footerBaseY + 40,
    size: dateFontSize,
    font: helveticaFont,
    color: darkGray,
  });

  // Certified Badge Image
  try {
    const badgePath = path.join(process.cwd(), "public", "certified.jpg");
    const badgeImageBytes = fs.readFileSync(badgePath);
    const badgeImage = await pdfDoc.embedPng(badgeImageBytes);

    const badgeSize = 60; // Good size for the badge
    const badgeDims = badgeImage.scale(badgeSize / badgeImage.width);

    page.drawImage(badgeImage, {
      x: width / 2 - badgeDims.width / 2,
      y: footerBaseY - badgeDims.height / 2,
      width: badgeDims.width,
      height: badgeDims.height,
    });
  } catch (error) {
    console.warn("Failed to load certified badge:", error);
    // Fallback to gold circle if image fails
    const badgeRadius = 25;
    page.drawCircle({
      x: width / 2,
      y: footerBaseY,
      size: badgeRadius,
      color: goldColor,
      opacity: 0.8,
    });
  }

  // Left Signature
  const leftSigName = "Program Director";
  const leftSigTitle = "AI Genius Lab";

  const leftSigX = width * 0.25;

  // Line
  page.drawLine({
    start: { x: leftSigX - 60, y: footerBaseY },
    end: { x: leftSigX + 60, y: footerBaseY },
    thickness: 1,
    color: darkGray,
  });

  const leftNameWidth = timesRomanBoldFont.widthOfTextAtSize(leftSigName, 12);
  page.drawText(leftSigName, {
    x: leftSigX - leftNameWidth / 2,
    y: footerBaseY - 15,
    size: 12,
    font: timesRomanBoldFont,
    color: darkGray,
  });

  const leftTitleWidth = helveticaFont.widthOfTextAtSize(leftSigTitle, 8);
  page.drawText(leftSigTitle, {
    x: leftSigX - leftTitleWidth / 2,
    y: footerBaseY - 25,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });


  // Right Signature
  const rightSigName = "Course Instructor";
  const rightSigTitle = "Authorized Signature";

  const rightSigX = width * 0.75;

  // Line
  page.drawLine({
    start: { x: rightSigX - 60, y: footerBaseY },
    end: { x: rightSigX + 60, y: footerBaseY },
    thickness: 1,
    color: darkGray,
  });

  const rightNameWidth = timesRomanBoldFont.widthOfTextAtSize(rightSigName, 12);
  page.drawText(rightSigName, {
    x: rightSigX - rightNameWidth / 2,
    y: footerBaseY - 15,
    size: 12,
    font: timesRomanBoldFont,
    color: darkGray,
  });

  const rightTitleWidth = helveticaFont.widthOfTextAtSize(rightSigTitle, 8);
  page.drawText(rightSigTitle, {
    x: rightSigX - rightTitleWidth / 2,
    y: footerBaseY - 25,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });

  // Certificate ID (Bottom Center)
  const certIdText = `Certificate ID: ${data.certificateId}`;
  const certIdFontSize = 8;
  const certIdWidth = helveticaFont.widthOfTextAtSize(certIdText, certIdFontSize);

  page.drawText(certIdText, {
    x: (width - certIdWidth) / 2,
    y: borderMargin + 10,
    size: certIdFontSize,
    font: helveticaFont,
    color: lightGray,
  });

  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();

  // Upload to Cloudinary
  const { secureUrl } = await uploadToCloudinary(Buffer.from(pdfBytes), {
    folder: "certificates",
    resourceType: "raw",
    publicId: `certificate-${data.certificateId}.pdf`,
  });

  return secureUrl;
}

/**
 * Generate a certificate PDF and return the bytes directly
 * Used for direct download without uploading to Cloudinary
 */
export async function generateCertificatePDFBytes(
  data: CertificateData
): Promise<Buffer> {
  // Create a new PDF document (landscape A4)
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([842, 595]); // A4 landscape

  // Load fonts
  const greatVibesPath = path.join(process.cwd(), "public", "fonts", "GreatVibes-Regular.ttf");
  const greatVibesBytes = fs.readFileSync(greatVibesPath);
  const greatVibesFont = await pdfDoc.embedFont(greatVibesBytes);
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();

  // Colors
  const primaryColor = rgb(0.15, 0.38, 0.92); // Blue
  const goldColor = rgb(0.83, 0.68, 0.21); // Gold
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.6, 0.6, 0.6);

  // Draw decorative border
  const borderMargin = 30;
  const borderWidth = 3;

  // Outer border
  page.drawRectangle({
    x: borderMargin,
    y: borderMargin,
    width: width - 2 * borderMargin,
    height: height - 2 * borderMargin,
    borderColor: goldColor,
    borderWidth: borderWidth,
  });

  // Inner border
  page.drawRectangle({
    x: borderMargin + 10,
    y: borderMargin + 10,
    width: width - 2 * (borderMargin + 10),
    height: height - 2 * (borderMargin + 10),
    borderColor: primaryColor,
    borderWidth: 1,
  });

  // Corner decorations
  const corners = [
    { x: borderMargin + 5, y: height - borderMargin - 5 },
    { x: width - borderMargin - 5, y: height - borderMargin - 5 },
    { x: borderMargin + 5, y: borderMargin + 5 },
    { x: width - borderMargin - 5, y: borderMargin + 5 },
  ];

  corners.forEach((corner) => {
    page.drawCircle({
      x: corner.x,
      y: corner.y,
      size: 8,
      color: goldColor,
    });
  });

  // --- LOGO: CENTER TOP ---
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const logoImageBytes = fs.readFileSync(logoPath);

    let logoImage;
    if (logoPath.endsWith(".png")) {
      logoImage = await pdfDoc.embedPng(logoImageBytes);
    } else {
      logoImage = await pdfDoc.embedJpg(logoImageBytes);
    }

    const logoDims = logoImage.scale(0.5); // Large scale for center top

    page.drawImage(logoImage, {
      x: (width - logoDims.width) / 2, // Centered
      y: height - borderMargin - 10 - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });

  } catch (error) {
    console.warn("Failed to load certificate logo:", error);
  }

  // --- HEADER: CENTER TOP ---
  const headerText = "CERTIFICATE";
  const subHeaderText = "OF COMPLETION";

  const headerFontSize = 40;
  const subHeaderFontSize = 12;

  const headerWidth = timesRomanBoldFont.widthOfTextAtSize(headerText, headerFontSize);
  const subHeaderWidth = timesRomanFont.widthOfTextAtSize(subHeaderText, subHeaderFontSize);

  // Draw Header
  page.drawText(headerText, {
    x: (width - headerWidth) / 2,
    y: height - 210, // Moved down 30px to avoid overlap
    size: headerFontSize,
    font: timesRomanBoldFont,
    color: primaryColor,
  });

  // Draw SubHeader
  page.drawText(subHeaderText, {
    x: (width - subHeaderWidth) / 2,
    y: height - 230,
    size: subHeaderFontSize,
    font: timesRomanFont,
    color: darkGray,
  });

  // --- BODY: CENTER ---

  // "This is to certify that"
  const certifyText = "This is to certify that";
  const certifyFontSize = 14;
  const certifyWidth = timesRomanFont.widthOfTextAtSize(certifyText, certifyFontSize);

  page.drawText(certifyText, {
    x: (width - certifyWidth) / 2,
    y: height - 260,
    size: certifyFontSize,
    font: timesRomanFont,
    color: darkGray,
  });

  // RECIPIENT NAME
  const nameFontSize = 42;
  const nameWidth = greatVibesFont.widthOfTextAtSize(data.recipientName, nameFontSize);

  page.drawText(data.recipientName, {
    x: (width - nameWidth) / 2,
    y: height - 310,
    size: nameFontSize,
    font: greatVibesFont,
    color: darkGray,
  });

  // Underline Name
  page.drawLine({
    start: { x: width / 2 - 150, y: height - 325 },
    end: { x: width / 2 + 150, y: height - 325 },
    thickness: 1,
    color: lightGray,
  });

  // "has successfully completed the"
  const completedText = "has successfully completed the";
  const courseTypeText = data.type === "course" ? "Course" : "Learning Path";

  const completedFontSize = 12;
  const fullCompletedText = `${completedText} ${courseTypeText}`;
  const completedWidth = timesRomanFont.widthOfTextAtSize(fullCompletedText, completedFontSize);

  page.drawText(fullCompletedText, {
    x: (width - completedWidth) / 2,
    y: height - 340,
    size: completedFontSize,
    font: timesRomanFont,
    color: darkGray,
  });

  // COURSE NAME
  const itemName = data.courseName || data.pathName || "Unknown";
  const itemFontSize = 24;
  const itemWidth = timesRomanBoldFont.widthOfTextAtSize(itemName, itemFontSize);

  // Handle long names
  let adjustedItemFontSize = itemFontSize;
  let adjustedItemWidth = itemWidth;
  while (adjustedItemWidth > width - 150 && adjustedItemFontSize > 14) {
    adjustedItemFontSize -= 2;
    adjustedItemWidth = timesRomanBoldFont.widthOfTextAtSize(itemName, adjustedItemFontSize);
  }

  page.drawText(itemName, {
    x: (width - adjustedItemWidth) / 2,
    y: height - 370,
    size: adjustedItemFontSize,
    font: timesRomanBoldFont,
    color: primaryColor,
  });

  // --- FOOTER: BOTTOM ---

  const footerBaseY = 100;

  // Center: Date and Badge
  // Date
  const dateStr = data.issuedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const dateText = `Date: ${dateStr}`;
  const dateFontSize = 10;
  const dateWidth = helveticaFont.widthOfTextAtSize(dateText, dateFontSize);

  page.drawText(dateText, {
    x: (width - dateWidth) / 2,
    y: footerBaseY + 40,
    size: dateFontSize,
    font: helveticaFont,
    color: darkGray,
  });

  // Certified Badge Image
  try {
    const badgePath = path.join(process.cwd(), "public", "certified.jpg");
    const badgeImageBytes = fs.readFileSync(badgePath);
    const badgeImage = await pdfDoc.embedPng(badgeImageBytes);

    const badgeSize = 60; // Good size for the badge
    const badgeDims = badgeImage.scale(badgeSize / badgeImage.width);

    page.drawImage(badgeImage, {
      x: width / 2 - badgeDims.width / 2,
      y: footerBaseY - badgeDims.height / 2,
      width: badgeDims.width,
      height: badgeDims.height,
    });
  } catch (error) {
    console.warn("Failed to load certified badge:", error);
    // Fallback to gold circle if image fails
    const badgeRadius = 25;
    page.drawCircle({
      x: width / 2,
      y: footerBaseY,
      size: badgeRadius,
      color: goldColor,
      opacity: 0.8,
    });
  }

  // Left Signature
  const leftSigName = "Program Director";
  const leftSigTitle = "AI Genius Lab";

  const leftSigX = width * 0.25;

  // Line
  page.drawLine({
    start: { x: leftSigX - 60, y: footerBaseY },
    end: { x: leftSigX + 60, y: footerBaseY },
    thickness: 1,
    color: darkGray,
  });

  const leftNameWidth = timesRomanBoldFont.widthOfTextAtSize(leftSigName, 12);
  page.drawText(leftSigName, {
    x: leftSigX - leftNameWidth / 2,
    y: footerBaseY - 15,
    size: 12,
    font: timesRomanBoldFont,
    color: darkGray,
  });

  const leftTitleWidth = helveticaFont.widthOfTextAtSize(leftSigTitle, 8);
  page.drawText(leftSigTitle, {
    x: leftSigX - leftTitleWidth / 2,
    y: footerBaseY - 25,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });


  // Right Signature
  const rightSigName = "Course Instructor";
  const rightSigTitle = "Authorized Signature";

  const rightSigX = width * 0.75;

  // Line
  page.drawLine({
    start: { x: rightSigX - 60, y: footerBaseY },
    end: { x: rightSigX + 60, y: footerBaseY },
    thickness: 1,
    color: darkGray,
  });

  const rightNameWidth = timesRomanBoldFont.widthOfTextAtSize(rightSigName, 12);
  page.drawText(rightSigName, {
    x: rightSigX - rightNameWidth / 2,
    y: footerBaseY - 15,
    size: 12,
    font: timesRomanBoldFont,
    color: darkGray,
  });

  const rightTitleWidth = helveticaFont.widthOfTextAtSize(rightSigTitle, 8);
  page.drawText(rightSigTitle, {
    x: rightSigX - rightTitleWidth / 2,
    y: footerBaseY - 25,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });

  // Certificate ID (Bottom Center)
  const certIdText = `Certificate ID: ${data.certificateId}`;
  const certIdFontSize = 8;
  const certIdWidth = helveticaFont.widthOfTextAtSize(certIdText, certIdFontSize);

  page.drawText(certIdText, {
    x: (width - certIdWidth) / 2,
    y: borderMargin + 10,
    size: certIdFontSize,
    font: helveticaFont,
    color: lightGray,
  });

  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
