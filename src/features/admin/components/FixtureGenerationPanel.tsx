"use client";

import { useMemo } from "react";
import { Wand2 } from "lucide-react";
import type { CompetitionData } from "@/lib/data-mappers";
import { generateDaySlots } from "@/lib/domain/schedule-generator";
import { detectScheduleConflicts } from "@/lib/domain/conflict-detector";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { DaySchedule } from "@/features/fixture/components/DaySchedule";

export function FixtureGenerationPanel({ data }: { data: CompetitionData }) {
  const slots = useMemo(
    () =>
      generateDaySlots({
        eventDate: data.matches[0]?.scheduledAt ?? new Date().toISOString(),
        startTime: "09:00",
        endTime: "18:00",
        matchDurationMinutes: 40,
        breakMinutes: 10,
        venues: data.venues
      }),
    [data.matches, data.venues]
  );
  const conflicts = detectScheduleConflicts({
    matches: data.matches,
    teams: data.teams,
    players: data.players,
    events: data.events
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader
          title="Generar fixture"
          description="Panel preparado para generar slots por cancha, revisar conflictos y publicar."
          action={<Badge tone={conflicts.length > 0 ? "amber" : "green"}>{conflicts.length} conflictos</Badge>}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button>
            <Wand2 className="h-4 w-4" />
            Generar automatico
          </Button>
          <span className="text-sm text-ink/60">{slots.length} slots disponibles en la configuracion actual.</span>
        </div>
      </Card>
      <DaySchedule
        events={data.events}
        teams={data.teams}
        players={data.players}
        matches={data.matches}
        venues={data.venues}
      />
    </div>
  );
}
