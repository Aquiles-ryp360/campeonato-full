import { BookOpen, CalendarDays, ShieldCheck } from "lucide-react";
import type { TournamentBases, TournamentEvent } from "@/lib/types";
import { Card, Metric } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export function BasesStatusCard({
  event,
  bases
}: {
  event: TournamentEvent;
  bases: TournamentBases | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Metric label="Campeonato" value={event.name} icon={ShieldCheck} />
      <Metric
        label="Vigencia"
        value={bases ? formatDateTime(bases.startDate) : "Por definir"}
        icon={CalendarDays}
        tone="amber"
      />
      <Metric
        label="Estado"
        value={bases?.published ? "Publicado" : "Borrador"}
        icon={BookOpen}
        tone={bases?.published ? "green" : "blue"}
      />
    </div>
  );
}

export function BasesEmptyState() {
  return (
    <Card className="p-6 text-sm text-ink/55">
      Todavia no hay bases oficiales cargadas. El administrador podra subir un PDF o pegar el
      texto estructurado desde el panel.
    </Card>
  );
}
