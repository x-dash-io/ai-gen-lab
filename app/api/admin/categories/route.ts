import { NextRequest, NextResponse } from "next/server";
import { getAllCategories, createCategory } from "@/lib/admin/categories";
import { withErrorHandler } from "../../error-handler";
import { AppError } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const categories = await getAllCategories();
  return NextResponse.json({ categories });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { name, slug, description, icon, color, isActive } = body;

  if (!name) {
    throw AppError.badRequest("Name is required");
  }

  try {
    const category = await createCategory({
      name,
      slug,
      description,
      icon,
      color,
      isActive,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SLUG_EXISTS") {
      throw AppError.conflict("A category with this slug already exists");
    }
    throw error;
  }
});
