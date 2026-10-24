import type { Team, TournamentBases, TournamentEvent } from "@/lib/types";
import type { Announcement } from "@/lib/server/announcements";
import { formatDateTime } from "@/lib/utils";
import { Card, SectionHeader } from "@/components/ui";
import { BasesArticle } from "@/features/bases/components/BasesArticle";

export function DelegateNotices({
  event,
  team,
  bases,
  announcements = []
}: {
  event: TournamentEvent;
  team: Team;
  bases: TournamentBases | null;
  announcements?: Announcement[];
}) {
  const eventAnnouncements = announcements.filter(
    (item) => !item.eventId || item.eventId === event.id
  );

  return (
    <div className="space-y-6">
      <BasesArticle event={event} bases={bases} />
      <Card className="p-5">
        <SectionHeader title="Avisos importantes" description="Comunicados, observaciones, cambios de horario y sanciones." />
        <div className="mt-4 grid gap-3">
          {eventAnnouncements.map((item) => (
            <article
              key={item.id}
              className="rounded-md border border-brand-electric/25 bg-brand-electric/5 p-4 shadow-insetLine"
            >
              <p className="text-xs font-bold uppercase text-brand-electric">{formatDateTime(item.createdAt)}</p>
              <p className="mt-1 font-black text-ink">{item.title}</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-brand-muted">{item.body}</p>
            </article>
          ))}
          <div className="rounded-md border border-brand-towerMid/25 bg-white p-4 text-sm font-semibold text-brand-muted shadow-insetLine">
            Observaciones de inscripción para {team.name}: sin observaciones vigentes.
          </div>
          <div className="rounded-md border border-brand-towerMid/25 bg-white p-4 text-sm font-semibold text-brand-muted shadow-insetLine">
            Cambios de horario: se notificarán aquí cuando la organización actualice el fixture.
          </div>
        </div>
      </Card>
    </div>
  );
}
