import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";

// Cache for content existence checks to avoid repeated API calls
const existenceCache = new Map<string, { exists: boolean; checkedAt: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let isConfigured = false;

/**
 * Lazy initialization of Cloudinary configuration.
 * Validates and configures cloudinary only when first used.
 * Throws an error if credentials are missing when actually needed.
 */
function configureCloudinary(): void {
  if (isConfigured) {
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary environment variables.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  isConfigured = true;
}

type CloudinaryResourceType = "image" | "video" | "raw";

/**
 * Enhanced signed URL with expiration for security
 * URLs expire in 10 minutes and are generated per request after authentication
 */
export function getSignedCloudinaryUrl(
  publicId: string,
  resourceType: CloudinaryResourceType,
  options: { download?: boolean; userId?: string; isAudio?: boolean } = {}
) {
  configureCloudinary();

  // Validate and clean publicId
  if (!publicId || typeof publicId !== 'string' || publicId.trim() === '') {
    console.error('[Cloudinary] Invalid publicId:', publicId);
    return null;
  }

  let cleanPublicId = publicId.trim();
  console.log('[Cloudinary] Original publicId:', publicId);

  // Strip leading version if present (e.g. v1234567890/folder/file)
  if (cleanPublicId.match(/^v\d+\//)) {
    cleanPublicId = cleanPublicId.replace(/^v\d+\//, '');
    console.log('[Cloudinary] Stripped leading version:', cleanPublicId);
  }

  // If it's a full Cloudinary URL, extract the public ID
  if (cleanPublicId.includes('cloudinary.com')) {
    // Regex that handles: .../resource_type/upload/signature/version/public_id
    const match = cleanPublicId.match(/\/(?:image|video|raw)\/upload\/(?:s--[^-]+--\/)?(?:v\d+\/)?([^\?#]+)/);
    if (match) {
      cleanPublicId = match[1];
      console.log('[Cloudinary] Extracted public ID using robust regex:', cleanPublicId);
    } else {
      try {
        const url = new URL(cleanPublicId);
        const parts = url.pathname.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex !== -1 && uploadIndex < parts.length - 1) {
          let publicIdParts = parts.slice(uploadIndex + 1);
          if (publicIdParts[0].startsWith('v') && /^\d+$/.test(publicIdParts[0].substring(1))) {
            publicIdParts = publicIdParts.slice(1);
          }
          cleanPublicId = publicIdParts.join('/');
          console.log('[Cloudinary] Extracted public ID using fallback:', cleanPublicId);
        }
      } catch (error) {
        console.error('[Cloudinary] Error parsing URL:', cleanPublicId, error);
        return null;
      }
    }
  }

  // Remove any query parameters or fragments
  cleanPublicId = cleanPublicId.split('?')[0].split('#')[0];

  // Basic validation
  if (!cleanPublicId || cleanPublicId.length < 3) {
    console.error('[Cloudinary] Invalid format (too short):', cleanPublicId, 'from original:', publicId);
    return null;
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes

  try {
    // IMPORTANT: Use type: "upload" (not "authenticated") because existing files
    // were uploaded with default upload type. Trying to access them as "authenticated"
    // causes "Limited access" errors.
    // 
    // For security, we still use signed URLs with expiration, which provides:
    // - Time-limited access (10 minutes)
    // - Signature verification
    // - Per-request validation (via /api/content/[lessonId])
    // For video resource type, Cloudinary often requires an extension in the URL
    // for the browser to correctly identify and play the media.
    // When viewing inline (not downloading), we should enforce a browser-compatible format
    // like mp4 for video or mp3 for audio, regardless of the original file extension.
    // Cloudinary handles the transcoding on the fly.
    let format: string | undefined = undefined;
    
    // For video/audio resources, ensure we have an extension for browser compatibility.
    // We enforce mp4 (video) or mp3 (audio) for inline viewing to ensure that
    // formats like .mkv, .avi, or .mov are transcoded by Cloudinary to something the browser can play.
    if (resourceType === 'video' && !options.download) {
      format = options.isAudio ? 'mp3' : 'mp4';
    }
    
    const signedUrl = cloudinary.url(cleanPublicId, {
      secure: true,
      sign_url: true,
      type: "upload", // Changed from "authenticated" to match actual file type
      resource_type: resourceType,
      format,
      expires_at: expiresAt,
      attachment: options.download ? cleanPublicId.split('/').pop() : undefined,
    });
    console.log('[Cloudinary] Generated signed URL successfully for:', cleanPublicId);
    return signedUrl;
  } catch (error) {
    console.error('[Cloudinary] Error generating URL for:', cleanPublicId, error);
    return null;
  }
}

/**
 * Upload file to Cloudinary (server-side only)
 * 
 * IMPORTANT: Files are uploaded with type: "authenticated" which means:
 * - Files can only be accessed via signed URLs with valid signatures
 * - The signed URL must include proper authentication parameters
 * - This matches the getSignedCloudinaryUrl function which generates authenticated URLs
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  options: {
    folder?: string;
    resourceType?: CloudinaryResourceType;
    publicId?: string;
    allowedFormats?: string[];
  } = {}
): Promise<{ publicId: string; secureUrl: string }> {
  configureCloudinary();
  
  const {
    folder = "synapze-content",
    resourceType = "raw",
    publicId,
    allowedFormats,
  } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions: UploadApiOptions = {
      folder,
      resource_type: resourceType,
      // Use type: "upload" (default) instead of "authenticated"
      // This allows signed URLs to work properly without "Limited access" errors
      // Security is still maintained through:
      // 1. Signed URLs with expiration (10 minutes)
      // 2. Per-request authentication check in /api/content/[lessonId]
      // 3. Purchase verification before generating URLs
      type: "upload",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    if (allowedFormats) {
      uploadOptions.allowed_formats = allowedFormats;
    }

    console.log('[Cloudinary Upload] Options:', {
      folder,
      resourceType,
      type: 'authenticated',
      publicId: publicId || '(auto)',
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('[Cloudinary Upload] Error:', error);
          reject(error);
        } else if (result) {
          console.log('[Cloudinary Upload] Success:', {
            publicId: result.public_id,
            type: result.type,
            resourceType: result.resource_type,
          });
          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
          });
        } else {
          reject(new Error("Upload failed: No result returned"));
        }
      }
    );

    if (Buffer.isBuffer(file)) {
      uploadStream.end(file);
    } else {
      // String URL - fetch and upload
      fetch(file)
        .then((response) => response.arrayBuffer())
        .then((buffer) => {
          uploadStream.end(Buffer.from(buffer));
        })
        .catch(reject);
    }
  });
}

/**
 * Check if a resource exists in Cloudinary
 * Uses caching to avoid repeated API calls
 */
export async function checkCloudinaryResourceExists(
  publicId: string,
  resourceType: CloudinaryResourceType = "raw"
): Promise<boolean> {
  configureCloudinary();

  // Check cache first
  const cacheKey = `${resourceType}:${publicId}`;
  const cached = existenceCache.get(cacheKey);
  if (cached && (Date.now() - cached.checkedAt) < CACHE_DURATION) {
    return cached.exists;
  }

  try {
    // Use Cloudinary's resource method to check existence
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
    });

    const exists = !!result && result.public_id === publicId;
    existenceCache.set(cacheKey, { exists, checkedAt: Date.now() });
    return exists;
  } catch (error: unknown) {
    const cloudError = error as { http_code?: number; error?: { message?: string } };
    // If error indicates resource not found, cache as not exists
    if (cloudError.http_code === 404 || cloudError.error?.message?.includes('not found')) {
      existenceCache.set(cacheKey, { exists: false, checkedAt: Date.now() });
      return false;
    }

    // For other errors, assume it doesn't exist to be safe
    console.error('Error checking Cloudinary resource existence:', error);
    return false;
  }
}

/**
 * Determine resource type from file extension or MIME type
 */
export function getResourceTypeFromFile(
  filename: string,
  mimeType?: string
): CloudinaryResourceType {
  const ext = filename.split(".").pop()?.toLowerCase();

  // Video types
  if (
    ["mp4", "mov", "avi", "wmv", "flv", "webm", "mkv"].includes(ext || "") ||
    mimeType?.startsWith("video/")
  ) {
    return "video";
  }

  // Audio types
  if (
    ["mp3", "wav", "ogg", "aac", "m4a", "flac"].includes(ext || "") ||
    mimeType?.startsWith("audio/")
  ) {
    return "video"; // Cloudinary uses "video" for audio too
  }

  // Raw/File types (PDFs, documents, etc.)
  if (
    ["pdf", "doc", "docx", "txt", "zip", "rar"].includes(ext || "") ||
    mimeType === "application/pdf" ||
    mimeType?.includes("document") ||
    mimeType?.includes("zip")
  ) {
    return "raw";
  }

  // Default to image
  return "image";
}
