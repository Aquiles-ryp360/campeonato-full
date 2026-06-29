"use client";

import { Upload } from "lucide-react";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";

export function BasesUploadForm() {
  return (
    <Card className="p-5">
      <SectionHeader title="Bases oficiales" description="Sube PDF o pega texto manual. La extraccion automatica queda preparada." />
      <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <Field label="PDF oficial">
          <input className={inputClass} type="file" accept="application/pdf" />
        </Field>
        <Field label="Texto estructurado">
          <textarea
            className={`${inputClass} min-h-32 resize-y`}
            placeholder="Participantes, sistema de competencia, sanciones..."
          />
        </Field>
      </div>
      <div className="mt-5 flex justify-end">
        <Button>
          <Upload className="h-4 w-4" />
          Publicar bases
        </Button>
      </div>
    </Card>
  );
}
