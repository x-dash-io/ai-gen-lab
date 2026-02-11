import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserSubscription } from "@/lib/subscriptions";
import { withErrorHandler } from "@/app/api/error-handler";

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ subscription: null });
  }

  const subscription = await getUserSubscription(session.user.id);

  return NextResponse.json({ subscription });
});
