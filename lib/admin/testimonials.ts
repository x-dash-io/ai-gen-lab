import { prisma, withRetry } from "@/lib/prisma";

export async function getAllTestimonials() {
    return withRetry(async () => {
        return prisma.testimonial.findMany({
            orderBy: { createdAt: "desc" },
        });
    });
}

export async function getTestimonialById(id: string) {
    return withRetry(async () => {
        return prisma.testimonial.findUnique({
            where: { id },
        });
    });
}
