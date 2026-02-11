import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/access";
import { uploadToCloudinary, getResourceTypeFromFile } from "@/lib/cloudinary";
import { withErrorHandler } from "@/app/api/error-handler";
import { AppError } from "@/lib/errors";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Require admin role
  await requireRole("admin");

  const body = await request.json();
  const { url, contentType, folder } = body;

  if (!url) {
    throw AppError.badRequest("URL is required");
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw AppError.badRequest("Invalid URL");
  }

  // Validate content type
  if (!["video", "audio", "pdf", "file"].includes(contentType)) {
    throw AppError.badRequest("Invalid content type");
  }

  // Fetch the file from URL
  const response = await fetch(url);
  if (!response.ok) {
    throw AppError.badRequest(`Failed to fetch file from URL: ${response.statusText}`);
  }

  // Get content type from response
  const mimeType = response.headers.get("content-type") || "";
  const contentLength = response.headers.get("content-length");

  // Validate file size (if available)
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxSize = contentType === "video" ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
    if (size > maxSize) {
      throw AppError.badRequest("File size exceeds maximum allowed size");
    }
  }

  // Get filename from URL or content-disposition header
  const contentDisposition = response.headers.get("content-disposition");
  let filename = url.split("/").pop() || "uploaded-file";
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/i);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  // Determine resource type
  const resourceType = getResourceTypeFromFile(filename, mimeType);

  // Upload to Cloudinary
  const result = await uploadToCloudinary(url, {
    folder: folder || "synapze-content",
    resourceType,
  });

  return NextResponse.json({
    success: true,
    publicId: result.publicId,
    secureUrl: result.secureUrl,
  });
});
