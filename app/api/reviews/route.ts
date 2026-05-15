import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getReviews, getReviewByWeekStart, createReview } from "@/lib/db/queries/reviews";
import { getWeekStart, getWeekEnd } from "@/lib/week";
import dayjs from "dayjs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const list = await getReviews(userId);
    return NextResponse.json(list);
  } catch (err) {
    console.error("[GET /api/reviews]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const weekStart = getWeekStart(dayjs()).valueOf();
    const weekEnd = getWeekEnd(dayjs()).valueOf();

    const existing = await getReviewByWeekStart(weekStart, userId);
    if (existing) return NextResponse.json(existing);

    const review = await createReview(weekStart, weekEnd, userId);
    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reviews]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
