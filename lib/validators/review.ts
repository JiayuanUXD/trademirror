import { z } from "zod";

export const patchReviewSchema = z.object({
  bestThing: z.string().max(100).optional(),
  worstThing: z.string().max(100).optional(),
  doOver: z.string().max(100).optional(),
  disciplineItems: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
        autoSuggested: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
      })
    )
    .optional(),
  complete: z.boolean().optional(),
});

export const completeReviewSchema = z.object({
  bestThing: z.string().min(1, "请填写本周最对的事").max(100),
  worstThing: z.string().min(1, "请填写本周最错的事").max(100),
  doOver: z.string().min(1, "请填写如果重来会怎么做").max(100),
  disciplineItems: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
      autoSuggested: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    })
  ).length(7, "7项纪律分都必须评分"),
});

export type PatchReviewData = z.infer<typeof patchReviewSchema>;
