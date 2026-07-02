import type { Team, TournamentBases, TournamentEvent } from "@/lib/types";
import { Card, SectionHeader } from "@/components/ui";
import { BasesArticle } from "@/features/bases/components/BasesArticle";

export function DelegateNotices({
  event,
  team,
  bases
}: {
  event: TournamentEvent;
  team: Team;
  bases: TournamentBases | null;
}) {
  return (
    <div className="space-y-6">
      <BasesArticle event={event} bases={bases} />
      <Card className="p-5">
        <SectionHeader title="Avisos importantes" description="Comunicados, observaciones, cambios de horario y sanciones." />
        <div className="mt-4 grid gap-3">
          <div className="rounded-md border border-brand-towerMid/25 bg-white p-4 text-sm font-semibold text-brand-muted shadow-insetLine">
            Observaciones de inscripcion para {team.name}: sin observaciones vigentes.
          </div>
          <div className="rounded-md border border-brand-towerMid/25 bg-white p-4 text-sm font-semibold text-brand-muted shadow-insetLine">
            Cambios de horario: se notificaran aqui cuando administracion actualice el fixture.
          </div>
        </div>
      </Card>
    </div>
  );
}
