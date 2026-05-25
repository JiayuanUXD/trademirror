import { z } from "zod";
import {
  RATIONAL_BASIS,
  IRRATIONAL_BASIS,
  type DecisionBasis,
} from "@/types/decision";

const ALL_BASIS = [...RATIONAL_BASIS, ...IRRATIONAL_BASIS] as const;

export const step1Schema = z.object({
  stockCode: z
    .string()
    .min(1, "请输入股票代码")
    .max(6, "股票代码最多6位")
    .regex(/^\d+$/, "股票代码只能包含数字"),
  stockName: z.string().min(1, "请输入股票名称").max(10, "股票名称最多10字"),
  stockMarket: z.enum(["SH", "SZ", "BJ"], { error: "请选择市场" }),
  action: z.enum(["BUY", "ADD", "SELL", "REDUCE", "CLEAR"], {
    error: "请选择操作方向",
  }),
  price: z
    .number({ error: "请输入价格" })
    .positive("价格必须大于0")
    .max(10000, "价格异常，请检查"),
  quantity: z
    .number({ error: "请输入数量" })
    .int("数量必须为整数")
    .positive("数量必须大于0")
    .multipleOf(100, "A股最小买卖单位为100股"),
  reason: z
    .string()
    .min(1, "请填写理由")
    .max(30, "理由最多30字"),
  tradedAt: z.number().optional(),
});

export const step2Schema = z.object({
  basis: z
    .array(z.enum(ALL_BASIS as [DecisionBasis, ...DecisionBasis[]]))
    .min(1, "至少选择一个决策依据"),
  calmScore: z
    .number()
    .min(1)
    .max(10),
  confidenceScore: z
    .number()
    .min(1)
    .max(10),
  fomoScore: z
    .number()
    .min(1)
    .max(10),
});

export const step3Schema = z.object({
  stopLossPrice: z
    .number({ error: "请填写止损价" })
    .min(0, "止损价不能为负数"),
  systemAlignment: z.enum(["ALIGN", "PARTIAL", "NOT_ALIGN"], {
    error: "请选择符合度",
  }),
});

export const createDecisionSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema);

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type CreateDecisionData = z.infer<typeof createDecisionSchema>;
