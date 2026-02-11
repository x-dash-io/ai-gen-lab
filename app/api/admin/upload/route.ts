import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/access";
import { uploadToCloudinary, getResourceTypeFromFile } from "@/lib/cloudinary";
import { rateLimits } from "@/lib/rate-limit";
import { withErrorHandler } from "@/app/api/error-handler";
import { AppError } from "@/lib/errors";

// File size limits (in bytes) - much more generous for videos and large files


// Allowed MIME types - expanded to cover more formats
const ALLOWED_MIME_TYPES = {
  video: [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
    "video/avi",
    "video/mov",
    "video/wmv",
    "video/flv",
    "video/mkv",
  ],
  audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/mp4",
    "audio/m4a",
    "audio/flac",
    "audio/wma",
  ],
  pdf: ["application/pdf"],
  file: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "text/plain",
    "text/csv",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
};

const MAX_FILE_SIZES = {
  video: 5 * 1024 * 1024 * 1024, // 5 GB
  audio: 500 * 1024 * 1024, // 500 MB
  pdf: 500 * 1024 * 1024, // 500 MB
  file: 2 * 1024 * 1024 * 1024, // 2 GB
  image: 10 * 1024 * 1024, // 10 MB
};

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Require admin role
  await requireRole("admin");

  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitResult = await rateLimits.upload(ip);
  if (!rateLimitResult.allowed) {
    throw AppError.rateLimited();
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const contentType = formData.get("contentType") as
    | "video"
    | "audio"
    | "pdf"
    | "file"
    | "image"
    | null;
  const folder = (formData.get("folder") as string) || "synapze-content";

  if (!file) {
    throw AppError.badRequest("No file provided");
  }

  if (!contentType) {
    throw AppError.badRequest("Content type is required");
  }

  // Validate file size
  const maxSize = MAX_FILE_SIZES[contentType];
  if (file.size > maxSize) {
    throw AppError.badRequest(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
  }

  // Validate MIME type
  const allowedMimeTypes = ALLOWED_MIME_TYPES[contentType];
  if (!allowedMimeTypes.includes(file.type)) {
    throw AppError.badRequest(`File type ${file.type} is not allowed for ${contentType} content`);
  }

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determine resource type - ensure PDFs and documents are uploaded as raw
  const resourceType = getResourceTypeFromFile(file.name, file.type);

  // Use a clean version of the filename as publicId to preserve extension for raw files
  const cleanFileName = file.name.replace(/[^\w.-]/g, '_');
  const publicId = `${Date.now()}-${cleanFileName}`;

  // Upload to Cloudinary - remove restrictive allowedFormats that cause issues
  const result = await uploadToCloudinary(buffer, {
    folder,
    resourceType,
    publicId,
    // allowedFormats removed to prevent upload failures
  });

  return NextResponse.json({
    success: true,
    publicId: result.publicId,
    secureUrl: result.secureUrl,
  });
});
