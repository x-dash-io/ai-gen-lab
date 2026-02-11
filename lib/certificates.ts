"use server";

import { prisma } from "@/lib/prisma";
import { requireCustomer, hasCourseAccess, hasPurchasedCourse } from "@/lib/access";
import { hasEnrolledInLearningPath } from "./learning-paths";
import { getUserSubscription } from "@/lib/subscriptions";
import { sendCertificateEmail } from "./email";
import { logger } from "@/lib/logger";

/**
 * Generate a unique certificate ID
 */
function generateCertificateId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `CERT-${timestamp}-${random}`.toUpperCase();
}

/**
 * Check if user has completed a course (all lessons completed)
 */
export async function hasCompletedCourse(userId: string, courseId: string): Promise<boolean> {
  // Get all lessons in the course
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        include: {
          lessons: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) {
    logger.warn(`Course not found for completion check: courseId=${courseId}`);
    return false;
  }

  const lessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
  if (lessonIds.length === 0) {
    logger.warn(`No lessons found in course: courseId=${courseId}`);
    return false;
  }

  // Get progress for all lessons
  const progressRecords = await prisma.progress.findMany({
    where: {
      userId,
      lessonId: { in: lessonIds },
    },
  });

  // Check if all lessons are completed
  const completedLessons = progressRecords.filter((p) => p.completedAt != null).length;
  const isCompleted = completedLessons === lessonIds.length;

  logger.info(`Course completion check: userId=${userId}, courseId=${courseId}, totalLessons=${lessonIds.length}, completedLessons=${completedLessons}, isCompleted=${isCompleted}`);

  return isCompleted;
}

/**
 * Check if user has completed a learning path (all courses completed)
 */
export async function hasCompletedLearningPath(userId: string, pathId: string): Promise<boolean> {
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      courses: {
        include: {
          Course: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!path || path.courses.length === 0) {
    return false;
  }

  // Check if all courses are completed
  for (const pathCourse of path.courses) {
    const completed = await hasCompletedCourse(userId, pathCourse.courseId);
    if (!completed) {
      return false;
    }
  }

  return true;
}

/**
 * Generate certificate for course completion (user-initiated)
 * Uses transaction to prevent race conditions
 */
export async function generateCourseCertificate(courseId: string) {
  const user = await requireCustomer();

  // Verify access (either purchase OR subscription)
  const hasAccess = await hasCourseAccess(user.id, user.role, courseId);
  if (!hasAccess) {
    throw new Error("Course access required");
  }

  // Verify certificate inclusion
  const purchased = await hasPurchasedCourse(user.id, courseId);
  if (!purchased) {
    const subscription = await getUserSubscription(user.id);
    if (!subscription || subscription.plan.tier === "starter") {
      throw new Error(
        "Your current subscription does not include certificates. Upgrade to Professional to earn certificates."
      );
    }
  }

  // Verify course completion
  const completed = await hasCompletedCourse(user.id, courseId);
  if (!completed) {
    throw new Error("Course not completed");
  }

  return await generateCourseCertificateForUser(user.id, courseId);
}

/**
 * Generate certificate for course completion for any user (admin/sync function)
 * Uses transaction to prevent race conditions
 */
export async function generateCourseCertificateForUser(userId: string, courseId: string) {
  // Verify access (either purchase OR subscription)
  const hasAccess = await hasCourseAccess(userId, "customer", courseId);
  if (!hasAccess) {
    throw new Error("Course access required");
  }

  // Verify certificate inclusion
  const purchased = await hasPurchasedCourse(userId, courseId);
  if (!purchased) {
    const subscription = await getUserSubscription(userId);
    if (!subscription || subscription.plan.tier === "starter") {
      throw new Error(
        "User's current subscription does not include certificates. Upgrade to Pro to earn certificates."
      );
    }
  }

  // Verify course completion
  const completed = await hasCompletedCourse(userId, courseId);
  if (!completed) {
    throw new Error("Course not completed");
  }

  // Use transaction to prevent race condition (check-then-create)
  const certificate = await prisma.$transaction(async (tx) => {
    // Check if certificate already exists within transaction
    const existing = await tx.certificate.findFirst({
      where: {
        userId: userId,
        courseId,
        type: "course",
      },
      include: {
        Course: {
          select: {
            title: true,
            description: true,
          },
        },
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Generate certificate within same transaction
    const certificateId = generateCertificateId();
    const newCert = await tx.certificate.create({
      data: {
        id: `cert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: userId,
        courseId,
        type: "course",
        certificateId,
      },
      include: {
        Course: {
          select: {
            title: true,
            description: true,
          },
        },
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Log certificate issuance within transaction
    await tx.activityLog.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: userId,
        type: "certificate_earned",
        metadata: {
          certificateId: newCert.certificateId,
          type: "course",
          courseId,
          courseTitle: newCert.Course?.title,
        },
      },
    });

    return newCert;
  });

  // PDF is now generated on-demand during download, no need to store URL
  // This ensures all certificates work consistently
  try {
    // Send certificate email without PDF URL (user will download from API)
    if (certificate.User.email) {
      await sendCertificateEmail(
        certificate.User.email,
        certificate.User.name || "Student",
        certificate.Course?.title || "Course",
        certificate.certificateId,
        null // No PDF URL - user downloads from API
      );
    }
  } catch (error) {
    console.error("Failed to send certificate email:", error);
    // Don't fail the certificate generation if email fails
  }

  return certificate;
}

/**
 * Generate certificate for learning path completion
 * Uses transaction to prevent race conditions
 */
export async function generatePathCertificate(pathId: string) {
  const user = await requireCustomer();

  // Verify user has enrolled in the path (all courses purchased or Elite sub)
  const enrolled = await hasEnrolledInLearningPath(user.id, pathId);
  if (!enrolled) {
    throw new Error("Learning path access required");
  }

  // Verify certificate inclusion
  // For Learning Paths, only Elite subscribers or full-path buyers get certificates
  const pathCourses = await prisma.learningPathCourse.findMany({
    where: { learningPathId: pathId },
    select: { courseId: true }
  });
  const purchases = await prisma.purchase.count({
    where: {
      userId: user.id,
      status: "paid",
      courseId: { in: pathCourses.map(pc => pc.courseId) }
    }
  });

  const isFullPurchase = purchases === pathCourses.length;

  if (!isFullPurchase) {
    const subscription = await getUserSubscription(user.id);
    if (!subscription || subscription.plan.tier !== "founder") {
      throw new Error(
        "Your current subscription does not include Learning Path certificates. Upgrade to Founder to earn them."
      );
    }
  }

  // Verify path completion
  const completed = await hasCompletedLearningPath(user.id, pathId);
  if (!completed) {
    throw new Error("Learning path not completed");
  }

  // Use transaction to prevent race condition (check-then-create)
  const certificate = await prisma.$transaction(async (tx) => {
    // Check if certificate already exists within transaction
    const existing = await tx.certificate.findFirst({
      where: {
        userId: user.id,
        pathId,
        type: "learning_path",
      },
      include: {
        LearningPath: {
          select: {
            title: true,
            description: true,
          },
        },
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Get path details for metadata
    const path = await tx.learningPath.findUnique({
      where: { id: pathId },
      include: {
        courses: {
          include: {
            Course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Generate certificate within same transaction
    const certificateId = generateCertificateId();
    const newCert = await tx.certificate.create({
      data: {
        id: `cert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: user.id,
        pathId,
        type: "learning_path",
        certificateId,
        metadata: path ? {
          courseCount: path.courses.length,
          courses: path.courses.map((pc) => ({
            courseId: pc.Course.id,
            title: pc.Course.title,
          })),
        } : undefined,
      },
      include: {
        LearningPath: {
          select: {
            title: true,
            description: true,
          },
        },
        User: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Log certificate issuance within transaction
    await tx.activityLog.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: user.id,
        type: "certificate_earned",
        metadata: {
          certificateId: newCert.certificateId,
          type: "learning_path",
          pathId,
          pathTitle: newCert.LearningPath?.title,
        },
      },
    });

    return newCert;
  });

  // PDF is now generated on-demand during download, no need to store URL
  // This ensures all certificates work consistently
  try {
    // Send certificate email without PDF URL (user will download from API)
    if (certificate.User.email) {
      await sendCertificateEmail(
        certificate.User.email,
        certificate.User.name || "Student",
        certificate.LearningPath?.title || "Learning Path",
        certificate.certificateId,
        null // No PDF URL - user downloads from API
      );
    }
  } catch (error) {
    console.error("Failed to send certificate email:", error);
    // Don't fail the certificate generation if email fails
  }

  return certificate;
}

/**
 * Get user's certificates
 */
export async function getUserCertificates(userId: string) {
  const user = await requireCustomer();

  if (user.id !== userId) {
    throw new Error("FORBIDDEN: You can only view your own certificates");
  }

  return prisma.certificate.findMany({
    where: { userId },
    include: {
      Course: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      LearningPath: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });
}

/**
 * Verify a certificate (public endpoint)
 */
export async function verifyCertificate(certificateId: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      User: {
        select: {
          name: true,
          email: true,
        },
      },
      Course: {
        select: {
          title: true,
          description: true,
        },
      },
      LearningPath: {
        select: {
          title: true,
          description: true,
        },
      },
    },
  });

  if (!certificate) {
    return {
      valid: false,
      error: "Certificate not found",
    };
  }

  if (certificate.expiresAt && certificate.expiresAt < new Date()) {
    return {
      valid: false,
      error: "Certificate has expired",
    };
  }

  return {
    valid: true,
    certificate: {
      type: certificate.type,
      studentName: certificate.User.name,
      courseName: certificate.Course?.title,
      pathName: certificate.LearningPath?.title,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      certificateId: certificate.certificateId,
    },
  };
}

/**
 * Get a single certificate by its database ID or its public certificate ID
 */
export async function getCertificate(idOrCertificateId: string) {
  // Validate input
  if (!idOrCertificateId || typeof idOrCertificateId !== 'string') {
    console.warn(`[getCertificate] Invalid idOrCertificateId provided:`, idOrCertificateId);
    return null;
  }

  return prisma.certificate.findFirst({
    where: {
      OR: [
        { id: idOrCertificateId },
        { certificateId: idOrCertificateId },
      ],
    },
    include: {
      User: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
      Course: {
        select: {
          id: true,
          title: true,
          description: true,
          slug: true,
        },
      },
      LearningPath: {
        select: {
          id: true,
          title: true,
          description: true,
          slug: true,
        },
      },
    },
  });
}

/**
 * Generate a learning path completion certificate
 */
export async function generateLearningPathCertificate(userId: string, pathId: string) {
  const user = await requireCustomer();
  if (user.id !== userId) {
    throw new Error("FORBIDDEN: You can only generate certificates for yourself");
  }

  // Verify user has access and completed the path
  const subscription = await getUserSubscription(userId);
  if (!subscription || subscription.plan.tier !== "founder") {
    throw new Error("You need a Founder subscription to generate learning path certificates");
  }

  const hasAccess = await hasEnrolledInLearningPath(userId, pathId);
  if (!hasAccess) {
    throw new Error("You do not have access to this learning path");
  }

  // Get the learning path
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      courses: {
        include: {
          Course: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  if (!path) {
    throw new Error("Learning path not found");
  }

  // Check if all courses are completed
  const courseIds = path.courses.map(pc => pc.Course.id);
  if (courseIds.length === 0) {
    throw new Error("Learning path has no courses");
  }

  // For each course, check if all lessons are completed
  let allCoursesCompleted = true;
  for (const courseId of courseIds) {
    const isCompleted = await hasCompletedCourse(userId, courseId);
    if (!isCompleted) {
      allCoursesCompleted = false;
      break;
    }
  }

  if (!allCoursesCompleted) {
    throw new Error("You must complete all courses in this learning path to generate a certificate");
  }

  // Check if certificate already exists
  const existingCertificate = await prisma.certificate.findFirst({
    where: {
      userId,
      pathId,
      type: "learning_path",
    },
  });

  if (existingCertificate) {
    return existingCertificate;
  }

  // Generate certificate
  const certificateId = generateCertificateId();
  const issuedAt = new Date();

  // PDF is now generated on-demand during download, no need to store URL
  // This ensures all certificates work consistently
  const certificate = await prisma.certificate.create({
    data: {
      id: `cert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      userId,
      pathId,
      type: "learning_path",
      certificateId,
      issuedAt,
      // No pdfUrl - generated on-demand
      metadata: {
        courses: courseIds,
        completedAt: issuedAt.toISOString(),
      },
    },
    include: {
      User: {
        select: {
          name: true,
          email: true,
        },
      },
      LearningPath: {
        select: {
          title: true,
        },
      },
    },
  });

  // Send email notification
  if (user.email) {
    await sendCertificateEmail(
      user.email,
      user.name || "Student",
      path.title,
      certificate.certificateId,
      null // No PDF URL - user downloads from API
    );
  }

  return certificate;
}

/**
 * Check if user has completed a learning path (certificate version)
 */
export async function hasCompletedLearningPathForCertificate(userId: string, pathId: string): Promise<boolean> {
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      courses: {
        select: {
          courseId: true,
        },
      },
    },
  });

  if (!path || path.courses.length === 0) {
    return false;
  }

  const courseIds = path.courses.map(pc => pc.courseId);

  // Check if all courses are completed
  for (const courseId of courseIds) {
    const isCompleted = await hasCompletedCourse(userId, courseId);
    if (!isCompleted) {
      return false;
    }
  }

  return true;
}
