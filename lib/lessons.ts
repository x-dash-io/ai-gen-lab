"use server";

import { prisma, withRetry } from "@/lib/prisma";
import { hasCourseAccess, requireUser } from "@/lib/access";
import { getSignedCloudinaryUrl } from "@/lib/cloudinary";

function resolveResourceType(contentType: string) {
  if (contentType === "video" || contentType === "audio") {
    return "video";
  }

  if (contentType === "pdf" || contentType === "file") {
    return "raw";
  }

  return "image";
}

function buildLessonUrl(lesson: {
  contentType: string;
  contentUrl: string | null;
  allowDownload: boolean;
}, userId?: string, forceDownload: boolean = false) {
  if (!lesson.contentUrl) {
    return null;
  }

  // If it's a link type OR an external URL (YouTube/Vimeo), return as is
  const isExternal = lesson.contentUrl.startsWith('http') && 
    !lesson.contentUrl.includes('cloudinary.com');

  if (lesson.contentType === "link" || isExternal) {
    return lesson.contentUrl;
  }

  const resourceType = resolveResourceType(lesson.contentType);

  // Only enable download flag if allowed AND requested (forceDownload)
  // This ensures the view URL (forceDownload=false) doesn't have attachment disposition
  const shouldDownload = lesson.allowDownload && forceDownload;

  return getSignedCloudinaryUrl(lesson.contentUrl, resourceType, {
    download: shouldDownload,
    userId, // Add user ID for enhanced security
    isAudio: lesson.contentType === "audio",
  });
}

export async function requireLessonAccess(lessonId: string) {
  const user = await requireUser();

  const lesson = await withRetry(async () => {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        Section: {
          select: {
            courseId: true,
            Course: { select: { slug: true } },
          },
        },
      },
    });
  });

  if (!lesson) {
    throw new Error("NOT_FOUND");
  }

  const hasAccess = await hasCourseAccess(
    user.id,
    user.role,
    lesson.Section.courseId
  );

  if (!hasAccess) {
    throw new Error("FORBIDDEN");
  }

  return {
    lessonId: lesson.id,
    courseSlug: lesson.Section.Course.slug,
    userId: user.id,
  };
}

export async function getAuthorizedLessonContent(lessonId: string) {
  const user = await requireUser();

  const lesson = await withRetry(async () => {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        Section: {
          include: {
            Course: true,
          },
        },
        contents: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    });
  });

  if (!lesson) {
    throw new Error("NOT_FOUND");
  }

  const hasAccess = await hasCourseAccess(
    user.id,
    user.role,
    lesson.Section.courseId
  );

  if (!hasAccess) {
    throw new Error("FORBIDDEN");
  }

  // Get content type from the first content item, or default to 'video'
  const firstContent = lesson.contents[0];

  // Check if there's old contentUrl in the lesson table (migration issue)
  const legacyLesson = lesson as typeof lesson & { contentUrl?: string | null; contentType?: string | null };
  const oldContentUrl = legacyLesson.contentUrl;
  const oldContentType = legacyLesson.contentType;

  const contentType = firstContent?.contentType || oldContentType || 'video';
  let contentUrl = firstContent?.contentUrl || oldContentUrl || null;

  console.log('[Lesson Content] Lesson:', lesson.id, lesson.title);
  console.log('[Lesson Content] Content type:', contentType);
  console.log('[Lesson Content] Raw content URL from DB:', contentUrl);

  // If no content URL is found, return null to show "content not available" message
  if (!contentUrl) {
    console.log('[Lesson Content] No content URL found - returning null');
    return {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        contentType,
        durationSeconds: lesson.durationSeconds,
        allowDownload: lesson.allowDownload,
      },
      courseSlug: lesson.Section.Course.slug,
      publicId: null,
      signedUrl: null,
      contentMetadata: null,
    };
  }

  // Strip leading version if present (e.g. v1234567890/folder/file)
  if (contentUrl && contentUrl.match(/^v\d+\//)) {
    contentUrl = contentUrl.replace(/^v\d+\//, '');
  }

  // Clean up contentUrl if it's a full Cloudinary URL - extract just the public ID
  if (contentUrl && contentUrl.includes('cloudinary.com')) {
    // Use a robust regex to extract public ID from Cloudinary URL
    // It looks for /upload/, skips signature and optional version, and captures everything until query params
    const match = contentUrl.match(/\/(?:image|video|raw)\/upload\/(?:s--[^-]+--\/)?(?:v\d+\/)?([^\?#]+)/);
    if (match) {
      contentUrl = match[1];
    } else {
      // Fallback: try to extract it from the path parts if regex fails
      try {
        const url = new URL(contentUrl);
        const parts = url.pathname.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex !== -1 && uploadIndex < parts.length - 1) {
          let publicIdParts = parts.slice(uploadIndex + 1);
          // Remove version if present
          if (publicIdParts[0].startsWith('v') && /^\d+$/.test(publicIdParts[0].substring(1))) {
            publicIdParts = publicIdParts.slice(1);
          }
          contentUrl = publicIdParts.join('/');
        }
      } catch {
        console.error('Failed to parse Cloudinary URL:', contentUrl);
      }
    }
  }

  // Generate view URL (streaming/inline)
  const signedUrl = buildLessonUrl({
    contentType,
    contentUrl,
    allowDownload: lesson.allowDownload,
  }, user.id, false);

  // Generate download URL (attachment) if allowed
  const downloadUrl = lesson.allowDownload ? buildLessonUrl({
    contentType,
    contentUrl,
    allowDownload: lesson.allowDownload,
  }, user.id, true) : null;

  console.log('[Lesson Content] Generated publicId/cleanUrl:', contentUrl);
  console.log('[Lesson Content] Generated signedUrl:', signedUrl ? 'SUCCESS' : 'FAILED');

  return {
    lesson: {
      id: lesson.id,
      title: lesson.title,
      contentType,
      durationSeconds: lesson.durationSeconds,
      allowDownload: lesson.allowDownload,
    },
    courseSlug: lesson.Section.Course.slug,
    publicId: contentUrl, // Return the original public ID for existence checking
    signedUrl,
    downloadUrl,
    contentMetadata: firstContent ? {
      title: firstContent.title,
      description: firstContent.description,
    } : null,
  };
}
