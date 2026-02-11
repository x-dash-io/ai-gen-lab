import { NextRequest, NextResponse } from "next/server";
import {
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "@/lib/admin/categories";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if this is a toggle status request
    if (body.action === "toggle-status") {
      const category = await toggleCategoryStatus(id);
      return NextResponse.json({ category });
    }

    // Otherwise, update category
    const { name, slug, description, icon, color, isActive } = body;

    const category = await updateCategory(id, {
      name,
      slug,
      description,
      icon,
      color,
      isActive,
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Error updating category:", error);

    if (error instanceof Error) {
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (error.message === "SLUG_EXISTS") {
        return NextResponse.json(
          { error: "A category with this slug already exists" },
          { status: 409 }
        );
      }
      if (error.message === "NOT_FOUND") {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteCategory(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting category:", error);

    if (error instanceof Error) {
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (error.message === "NOT_FOUND") {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
