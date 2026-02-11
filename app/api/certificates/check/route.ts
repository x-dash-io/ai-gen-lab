import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/access";
import { checkAndGenerateCertificate } from "@/lib/certificate-service";
import { logger } from "@/lib/logger";
import { certificateCheckSchema, validateRequestBody } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCustomer();
    const body = await request.json();
    
    // Validate input
    const validation = validateRequestBody(certificateCheckSchema, body);
    if (!validation.success) {
      return validation.response;
    }
    
    const { courseId } = validation.data;

    // Use centralized certificate service
    const result = await checkAndGenerateCertificate(user.id, courseId);
    
    return NextResponse.json(result);

  } catch (error) {
    logger.error("Certificate check failed", { error });
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to check certificate" 
      },
      { status: 500 }
    );
  }
}
