import { z } from "zod";

export const createHoldingSchema = z.object({
  stockCode: z
    .string()
    .min(1, "请输入股票代码")
    .max(6)
    .regex(/^\d+$/, "只能包含数字"),
  stockName: z.string().min(1, "请输入股票名称").max(10),
  stockMarket: z.enum(["SH", "SZ", "BJ"], { error: "请选择市场" }),
  status: z.enum(["HOLDING", "WATCHING", "CLOSED"], { error: "请选择状态" }),
  costPrice: z.number({ error: "请输入成本价" }).positive("成本价必须大于0"),
  shares: z
    .number({ error: "请输入持股数量" })
    .int()
    .positive()
    .multipleOf(100, "持股数量为100的整数倍"),
  sector: z.string().max(20).optional(),
  initialReason: z.string().max(100).optional(),
});

export const logicReasonSchema = z.object({
  id: z.string(),
  content: z.string().min(1).max(100),
  hasData: z.boolean(),
  isVerifiable: z.boolean(),
});

export const prerequisiteSchema = z.object({
  id: z.string(),
  content: z.string().min(1).max(100),
  checked: z.boolean(),
});

export const exitConditionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "PRICE_BELOW",
    "EARNINGS_BELOW",
    "TECH_BREAK",
    "TRAILING_STOP",
    "CUSTOM",
  ]),
  description: z.string().min(1).max(100),
  threshold: z.number().optional(),
  triggered: z.boolean(),
});

export const patchHoldingSchema = z.object({
  status: z.enum(["HOLDING", "WATCHING", "CLOSED"]).optional(),
  currentPrice: z.number().positive().optional(),
  shares: z.number().int().positive().optional(),
  costPrice: z.number().positive().optional(),
  sector: z.string().max(20).optional(),
  moat: z.string().max(500).optional(),
  keyFinancials: z.string().optional(),
  reasons: z.array(logicReasonSchema).optional(),
  prerequisites: z.array(prerequisiteSchema).optional(),
  exitConditions: z.array(exitConditionSchema).optional(),
});

export type CreateHoldingData = z.infer<typeof createHoldingSchema>;
export type PatchHoldingData = z.infer<typeof patchHoldingSchema>;
