import { NextRequest, NextResponse } from "next/server";
import { getReviews, getReviewByWeekStart, createReview } from "@/lib/db/queries/reviews";
import { getWeekStart, getWeekEnd } from "@/lib/week";
import dayjs from "dayjs";

export async function GET() {
  try {
    const list = await getReviews();
    return NextResponse.json(list);
  } catch (err) {
    console.error("[GET /api/reviews]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST with no body → get-or-create the current week's review
export async function POST(_req: NextRequest) {
  try {
    const weekStart = getWeekStart(dayjs()).valueOf();
    const weekEnd = getWeekEnd(dayjs()).valueOf();

    const existing = await getReviewByWeekStart(weekStart);
    if (existing) return NextResponse.json(existing);

    const review = await createReview(weekStart, weekEnd);
    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reviews]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
