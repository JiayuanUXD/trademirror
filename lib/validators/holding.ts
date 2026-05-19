import { z } from "zod";

export const createHoldingSchema = z.object({
  stockCode: z
    .string()
    .min(1, "请输入股票代码")
    .max(6)
    .regex(/^\d+$/, "只能包含数字"),
  stockName: z.string().min(1, "请输入股票名称").max(10),
  stockMarket: z.enum(["SH", "SZ", "BJ"], { error: "请选择市场" }),
  /** WATCHING = 观察中（无持仓）; HOLDING/CLOSED are derived from decisions at read time */
  status: z.enum(["HOLDING", "WATCHING", "CLOSED"], { error: "请选择状态" }).default("WATCHING"),
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
  /** Only WATCHING can be meaningfully set; HOLDING/CLOSED are derived from decisions */
  status: z.enum(["HOLDING", "WATCHING", "CLOSED"]).optional(),
  currentPrice: z.number().positive().nullable().optional(),
  sector: z.string().max(20).optional(),
  moat: z.string().max(500).optional(),
  keyFinancials: z.string().optional(),
  reasons: z.array(logicReasonSchema).optional(),
  prerequisites: z.array(prerequisiteSchema).optional(),
  exitConditions: z.array(exitConditionSchema).optional(),
});

export type CreateHoldingData = z.infer<typeof createHoldingSchema>;
export type PatchHoldingData = z.infer<typeof patchHoldingSchema>;
