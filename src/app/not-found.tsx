import { SearchX } from "lucide-react";
import { PublicShell } from "@/components/shell";
import { Button, Card, SectionHeader } from "@/components/ui";

export default function NotFound() {
  return (
    <PublicShell>
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand-yellow/25 text-brand-navy">
            <SearchX className="h-5 w-5" />
          </div>
          <SectionHeader
            title="Pagina no encontrada"
            description="La ruta no existe o el campeonato ya no esta disponible."
            action={<Button href="/">Volver al inicio</Button>}
          />
        </div>
      </Card>
    </PublicShell>
  );
}
