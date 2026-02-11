import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthorizedLessonContent } from "@/lib/lessons";
import { checkCloudinaryResourceExists } from "@/lib/cloudinary";

/**
 * Proxy endpoint for content delivery with per-request validation
 * This ensures that even if a signed URL is shared, access is validated on each request
 * 
 * Security features:
 * 1. Per-request authentication check
 * 2. User must have purchased the course
 * 3. Signed URLs expire in 10 minutes
 * 4. URLs are generated fresh on each request (user-specific)
 */
import { withErrorHandler } from "@/app/api/error-handler";
import { AppError } from "@/lib/errors";

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) => {
  const { lessonId } = await params;

  // Validate session
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw AppError.unauthorized();
  }

  // Validate access and get lesson content (this checks purchase status)
  const { lesson, signedUrl, downloadUrl, publicId } = await getAuthorizedLessonContent(lessonId);

  console.log(`[Content API] lessonId: ${lessonId}, contentType: ${lesson.contentType}, hasSignedUrl: ${!!signedUrl}`);

  // Check for download intent
  const { searchParams } = request.nextUrl;
  const isDownload = searchParams.get("download") === "true";

  const targetUrl = (isDownload && downloadUrl) ? downloadUrl : signedUrl;

  if (!targetUrl) {
    if (isDownload && !downloadUrl) {
      return NextResponse.json({ error: "Download not allowed" }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: "Content not available",
        message: "This lesson content has not been uploaded yet. Please contact support if this issue persists."
      },
      { status: 404 }
    );
  }

  // For link type, redirect directly (no proxy needed)
  if (lesson.contentType === "link") {
    return NextResponse.redirect(targetUrl);
  }

  // Stream media through this endpoint to control inline vs download behavior
  const upstreamResponse = await fetch(targetUrl, {
    headers: {
      ...(request.headers.get("range")
        ? { Range: request.headers.get("range") as string }
        : {}),
    },
  });

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return NextResponse.json(
      { error: "Content not available" },
      { status: upstreamResponse.status || 502 }
    );
  }

  const headers = new Headers(upstreamResponse.headers);
  let filename = (publicId || "content").split("/").pop() || "content";

  // Ensure filename has appropriate extension based on contentType
  const extensionMap: Record<string, string> = {
    video: ".mp4",
    audio: ".mp3",
    pdf: ".pdf",
  };

  const expectedExt = extensionMap[lesson.contentType];
  if (expectedExt && !filename.toLowerCase().endsWith(expectedExt)) {
    filename += expectedExt;
  }

  const dispositionType = isDownload ? "attachment" : "inline";

  headers.set(
    "Content-Disposition",
    `${dispositionType}; filename=\"${encodeURIComponent(filename)}\"`
  );
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
});
