import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ScheduleConflict } from "@/lib/domain/conflict-detector";

export function ConflictBadge({ conflicts }: { conflicts: ScheduleConflict[] }) {
  if (conflicts.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-field/15 bg-field/10 px-2 py-1 text-xs font-semibold text-field">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Sin conflicto
      </span>
    );
  }

  const hasError = conflicts.some((conflict) => conflict.severity === "error");

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
        hasError
          ? "border-coral/25 bg-coral/10 text-red-800"
          : "border-amber-400/25 bg-amber-100 text-amber-900"
      }`}
      title={conflicts.map((conflict) => conflict.message).join(" ")}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      {conflicts.length} alerta{conflicts.length === 1 ? "" : "s"}
    </span>
  );
}
