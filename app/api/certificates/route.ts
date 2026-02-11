import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/access";
import { getUserCertificates } from "@/lib/certificates";
import { withErrorHandler } from "@/app/api/error-handler";
import { headers } from "next/headers";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Force dynamic rendering
  await headers();

  const user = await requireUser();
  const certificates = await getUserCertificates(user.id);

  return NextResponse.json({ certificates });
});
