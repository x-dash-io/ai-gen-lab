import { NextRequest, NextResponse } from "next/server";
import { getCertificate } from "@/lib/certificates";
import { generateCertificatePDFBytes } from "@/lib/certificate-pdf";
import { logger } from "@/lib/logger";
import { certificateDownloadSchema, validateRequestBody } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const { certificateId } = await params;

    // Validate input
    const validation = validateRequestBody(certificateDownloadSchema, { certificateId });
    if (!validation.success) {
      return validation.response;
    }

    // Get certificate details
    const certificate = await getCertificate(certificateId);

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateCertificatePDFBytes({
      recipientName: certificate.User.name || "Student",
      courseName: certificate.Course?.title,
      pathName: certificate.LearningPath?.title,
      issuedAt: certificate.issuedAt,
      certificateId: certificate.certificateId,
      type: certificate.type,
    });

    // Validate PDF buffer before sending
    if (!pdfBuffer || pdfBuffer.length === 0) {
      logger.error("Generated PDF buffer is empty", { certificateId });
      return NextResponse.json(
        { error: "Failed to generate certificate PDF" },
        { status: 500 }
      );
    }

    // Return PDF as downloadable file
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${certificateId}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    logger.error("Error downloading certificate:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate PDF" },
      { status: 500 }
    );
  }
}
