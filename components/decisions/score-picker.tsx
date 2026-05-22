"use client";

type Props = {
  label: string;
  subLabel?: string;
  value: number;
  onChange: (v: number) => void;
  lowLabel?: string;
  highLabel?: string;
};

export function ScorePicker({
  label,
  subLabel,
  value,
  onChange,
  lowLabel = "低",
  highLabel = "高",
}: Props) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {label}
        </p>
        {subLabel && (
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {subLabel}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] w-4 shrink-0" style={{ color: "var(--muted-foreground)" }}>
          {lowLabel}
        </span>
        <div className="flex gap-1 flex-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const isSelected = n === value;
            const color =
              n <= 3
                ? "var(--brand-green)"
                : n <= 6
                ? "var(--brand-warning)"
                : "var(--brand-red)";

            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className="flex-1 h-8 rounded text-xs font-medium transition-all active:scale-[0.85] hover:scale-105"
                style={{
                  backgroundColor: isSelected ? color : "var(--surface-overlay)",
                  color: isSelected ? "#fff" : "var(--muted-foreground)",
                  border: `1px solid ${isSelected ? color : "var(--border-subtle)"}`,
                  boxShadow: isSelected ? `0 0 12px ${color}40` : "none"
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] w-4 shrink-0 text-right" style={{ color: "var(--muted-foreground)" }}>
          {highLabel}
        </span>
      </div>
    </div>
  );
}
