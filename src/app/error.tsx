"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { PublicShell } from "@/components/shell";
import { Button, Card, SectionHeader } from "@/components/ui";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PublicShell>
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-coral/10 text-red-800">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <SectionHeader
            title="Algo salio mal"
            description="No se pudo completar la carga de esta vista."
            action={
              <Button type="button" onClick={reset}>
                Reintentar
              </Button>
            }
          />
        </div>
      </Card>
    </PublicShell>
  );
}
