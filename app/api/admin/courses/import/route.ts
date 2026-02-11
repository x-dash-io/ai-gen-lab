import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/app/api/error-handler";
import { AppError } from "@/lib/errors";
import Papa from "papaparse";

type CsvCourseRow = {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  category?: string;
  priceCents?: string;
  inventory?: string;
  isPublished?: string;
};

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNullableInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  await requireRole("admin");

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    throw AppError.badRequest("No file provided");
  }

  const text = await file.text();

  return new Promise<Response>((resolve, reject) => {
    Papa.parse<CsvCourseRow>(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const coursesData = results.data;
          const createdCourses: string[] = [];
          const errors: Array<{ row: CsvCourseRow; error: string }> = [];

          for (const row of coursesData) {
            try {
              const {
                id,
                slug,
                title,
                description,
                category,
                priceCents,
                inventory,
                isPublished,
              } = row;

              if (!id || !slug || !title) {
                errors.push({
                  row,
                  error: "Missing required fields (id, slug, title)",
                });
                continue;
              }

              const course = await prisma.course.upsert({
                where: { id },
                update: {
                  slug,
                  title,
                  description: description || null,
                  category: category || null,
                  priceCents: parseInteger(priceCents, 0),
                  inventory: parseNullableInteger(inventory),
                  isPublished: parseBoolean(isPublished),
                  updatedAt: new Date(),
                },
                create: {
                  id,
                  slug,
                  title,
                  description: description || null,
                  category: category || null,
                  priceCents: parseInteger(priceCents, 0),
                  inventory: parseNullableInteger(inventory),
                  isPublished: parseBoolean(isPublished),
                  updatedAt: new Date(),
                },
              });

              createdCourses.push(course.id);
            } catch (err: unknown) {
              errors.push({
                row,
                error: err instanceof Error ? err.message : "Unknown error",
              });
            }
          }

          resolve(
            NextResponse.json({
              success: true,
              importedCount: createdCourses.length,
              errors,
            })
          );
        } catch (error) {
          reject(error);
        }
      },
      error: (parseError: Error) => {
        reject(AppError.badRequest(`CSV parsing error: ${parseError.message}`));
      },
    });
  });
});
