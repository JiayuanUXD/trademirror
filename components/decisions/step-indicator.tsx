type Props = {
  steps: string[];
  current: number; // 0-indexed
};

export function StepIndicator({ steps, current }: Props) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;

        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  backgroundColor: isDone
                    ? "var(--brand-green)"
                    : isActive
                    ? "var(--brand-blue)"
                    : "var(--surface-overlay)",
                  color: isDone || isActive ? "#fff" : "var(--muted-foreground)",
                }}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                className="text-[10px] whitespace-nowrap"
                style={{
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="h-px w-8 mb-4 mx-1"
                style={{
                  backgroundColor: isDone
                    ? "var(--brand-green)"
                    : "var(--border-subtle)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
