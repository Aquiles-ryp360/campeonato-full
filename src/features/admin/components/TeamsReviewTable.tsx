"use client";

import { Mail } from "lucide-react";
import type { CompetitionData } from "@/lib/data-mappers";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { teamStatusLabel } from "@/lib/utils";

export function TeamsReviewTable({ data }: { data: CompetitionData }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink/10 p-5">
        <SectionHeader
          title="Inscripciones"
          description="Equipos, delegado, pago, codigo y estado de revision en una sola vista."
          action={<Badge tone="blue">{data.teams.length} equipos</Badge>}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-mist text-left text-xs uppercase text-ink/55">
            <tr>
              <th className="px-5 py-3">Equipo</th>
              <th className="px-3 py-3">Campeonato</th>
              <th className="px-3 py-3">Delegado</th>
              <th className="px-3 py-3">Pago</th>
              <th className="px-3 py-3">Jugadores</th>
              <th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/8">
            {data.teams.map((team) => {
              const event = data.events.find((item) => item.id === team.eventId);
              const playerCount = data.players.filter((player) => player.teamId === team.id).length;
              return (
                <tr key={team.id}>
                  <td className="px-5 py-4">
                    <p className="font-bold text-ink">{team.name}</p>
                    <Badge tone={team.status === "approved" ? "green" : "amber"}>
                      {teamStatusLabel(team.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-ink">{event?.name ?? "Sin campeonato"}</p>
                    <p className="mt-1 text-xs text-ink/55">{event?.category}</p>
                  </td>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-ink">{team.delegateName}</p>
                    <p className="text-xs text-ink/60">{team.delegateEmail}</p>
                    <p className="text-xs text-ink/60">{team.delegatePhone}</p>
                  </td>
                  <td className="px-3 py-4">
                    <p className="font-bold uppercase text-ink">{team.paymentMethod}</p>
                    <p className="text-xs text-ink/55">{team.registrationCode}</p>
                  </td>
                  <td className="px-3 py-4">{playerCount}</td>
                  <td className="px-5 py-4">
                    <Button href={`mailto:${team.delegateEmail}`} variant="secondary">
                      <Mail className="h-4 w-4" />
                      Escribir
                    </Button>
                  </td>
                </tr>
              );
            })}
            {data.teams.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-ink/55">
                  Todavia no hay inscripciones.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
