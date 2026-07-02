import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ScheduleConflict } from "@/lib/domain/conflict-detector";

export function ConflictBadge({ conflicts }: { conflicts: ScheduleConflict[] }) {
  if (conflicts.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-600/20 bg-green-600/10 px-2 py-1 text-xs font-bold text-green-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Sin conflicto
      </span>
    );
  }

  const hasError = conflicts.some((conflict) => conflict.severity === "error");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold ${
        hasError
          ? "border-coral/25 bg-coral/10 text-red-800"
          : "border-brand-yellow/70 bg-brand-yellow/25 text-brand-navy"
      }`}
      title={conflicts.map((conflict) => conflict.message).join(" ")}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      {conflicts.length} alerta{conflicts.length === 1 ? "" : "s"}
    </span>
  );
}
