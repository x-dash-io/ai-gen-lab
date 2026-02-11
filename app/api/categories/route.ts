import { NextResponse } from "next/server";
import { getActiveCategoriesWithCount } from "@/lib/categories";
import { withErrorHandler } from "../error-handler";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const categories = await getActiveCategoriesWithCount();
  return NextResponse.json({ categories });
});
