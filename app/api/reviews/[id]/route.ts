import { NextRequest, NextResponse } from "next/server";
import { patchReviewSchema, completeReviewSchema } from "@/lib/validators/review";
import { getReviewById, updateReview } from "@/lib/db/queries/reviews";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const review = await getReviewById(id);
    if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(review);
  } catch (err) {
    console.error("[GET /api/reviews/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = patchReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;

    // If completing, run stricter validation
    if (data.complete) {
      const existing = await getReviewById(id);
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const fullData = {
        bestThing: data.bestThing ?? existing.bestThing,
        worstThing: data.worstThing ?? existing.worstThing,
        doOver: data.doOver ?? existing.doOver,
        disciplineItems: data.disciplineItems ?? existing.disciplineItems,
      };

      const complete = completeReviewSchema.safeParse(fullData);
      if (!complete.success) {
        return NextResponse.json({ error: "三问必须全部填写后才能完成复盘", issues: complete.error.issues }, { status: 422 });
      }
    }

    const review = await updateReview(id, data);
    return NextResponse.json(review);
  } catch (err) {
    console.error("[PATCH /api/reviews/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
