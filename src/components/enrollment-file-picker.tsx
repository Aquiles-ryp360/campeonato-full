"use client";

import { Upload } from "lucide-react";

export function EnrollmentFilePicker({
  id,
  fileName,
  disabled = false,
  onFileChange
}: {
  id: string;
  fileName: string;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
}) {
  return (
    <div>
      <input
        id={id}
        className="sr-only"
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        disabled={disabled}
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className={`flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-brand-towerMid/35 px-3 py-2 text-sm font-bold transition ${
          fileName
            ? "bg-brand-electric/10 text-brand-electric hover:bg-brand-electric/15"
            : "bg-white text-ink hover:bg-brand-wash"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <Upload className="h-4 w-4 shrink-0" />
        <span className="truncate">{fileName || "Subir ficha de matrícula (opcional)"}</span>
      </label>
    </div>
  );
}
