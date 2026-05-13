import type { DangerSignal, DecisionBasis, SystemAlignment } from "@/types/decision";
import { IRRATIONAL_BASIS } from "@/types/decision";

type SignalInput = {
  fomoScore: number;
  calmScore: number;
  systemAlignment: SystemAlignment;
  basis: DecisionBasis[];
};

export function calcDangerSignals(input: SignalInput): DangerSignal[] {
  const signals: DangerSignal[] = [];

  if (input.fomoScore >= 7) signals.push("FOMO过高");
  if (input.calmScore <= 4) signals.push("心态不稳");
  if (input.systemAlignment === "NOT_ALIGN") signals.push("不符合体系");

  const hasIrrational = input.basis.some((b) =>
    (IRRATIONAL_BASIS as readonly string[]).includes(b)
  );
  if (hasIrrational) signals.push("非理性决策依据");

  return signals;
}
