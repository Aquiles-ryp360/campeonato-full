"use client";

import { useMemo, useState } from "react";
import { AudioLines, CheckCircle2, FileAudio, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { ParsedAudioResult, TournamentEvent } from "@/lib/types";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "./ui";

const parsedAudioExample: ParsedAudioResult = {
  eventId: "",
  matchId: "",
  confidence: 0.91,
  rawTranscript:
    "Gano Russkaya contra 8vo Semestre dos a uno. Goles de Ivan Quispe al minuto 12 y Marco Flores al 31. Para 8vo marco Diego Mamani al 18. Hubo amarilla para Russkaya en el minuto 25.",
  homeTeamName: "Russkaya",
  awayTeamName: "8vo Semestre",
  homeScore: 2,
  awayScore: 1,
  goals: [
    { teamName: "Russkaya", playerName: "Ivan Quispe", minute: 12 },
    { teamName: "8vo Semestre", playerName: "Diego Mamani", minute: 18 },
    { teamName: "Russkaya", playerName: "Marco Flores", minute: 31 }
  ],
  cards: [{ teamName: "Russkaya", type: "yellow", minute: 25 }],
  notes: "Resultado listo para revision. El modelo no encontro nombre del jugador amonestado."
};

export function AudioReview({ events }: { events: TournamentEvent[] }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? parsedAudioExample.eventId);
  const [transcript, setTranscript] = useState(parsedAudioExample.rawTranscript);
  const [parsed, setParsed] = useState(parsedAudioExample);

  const event = useMemo(
    () => events.find((current) => current.id === eventId),
    [eventId, events]
  );

  function simulateAiParse() {
    setParsed({ ...parsedAudioExample, eventId });
    setTranscript(parsedAudioExample.rawTranscript);
    toast.success("Audio transcrito y ordenado para revision.");
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <SectionHeader
        eyebrow="Audio IA"
        title="Cargar resultado por audio"
        description="El encargado manda audio, la IA transcribe, ordena datos y el admin confirma antes de publicar."
      />

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1fr]">
        <Card className="p-5">
          <SectionHeader title="Entrada" description="En produccion se subira un audio real o nota de voz." />
          <div className="mt-5 space-y-4">
            <Field label="Evento">
              <select
                className={inputClass}
                value={eventId}
                onChange={(changeEvent) => setEventId(changeEvent.target.value)}
                disabled={events.length === 0}
              >
                {events.length > 0 ? events.map((current) => (
                  <option key={current.id} value={current.id}>
                    {current.name}
                  </option>
                )) : (
                  <option value="">Sin eventos en Supabase</option>
                )}
              </select>
            </Field>
            <div className="rounded-md border border-dashed border-ink/20 bg-mist p-6 text-center">
              <FileAudio className="mx-auto h-8 w-8 text-field" />
              <p className="mt-3 text-sm font-semibold text-ink">Audio del resultado</p>
              <p className="mt-1 text-xs text-ink/55">MP3, WAV o nota de voz de WhatsApp</p>
              <Button type="button" variant="secondary" className="mt-4" onClick={simulateAiParse}>
                <Wand2 className="h-4 w-4" />
                Simular analisis IA
              </Button>
            </div>
            <Field label="Transcripcion">
              <textarea
                className={`${inputClass} min-h-44 resize-y`}
                value={transcript}
                onChange={(changeEvent) => setTranscript(changeEvent.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            title="Revision antes de publicar"
            description="Nada entra a la tabla hasta que el admin confirme."
            action={<Badge tone="green">{Math.round(parsed.confidence * 100)}% confianza</Badge>}
          />

          <div className="mt-5 rounded-lg border border-ink/10 bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-ink/55">
              <AudioLines className="h-4 w-4" />
              {event?.name ?? "Evento"}
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <p className="text-lg font-bold">{parsed.homeTeamName}</p>
              <div className="rounded-md bg-ink px-4 py-2 text-lg font-bold text-white">
                {parsed.homeScore} - {parsed.awayScore}
              </div>
              <p className="text-right text-lg font-bold">{parsed.awayTeamName}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-ink/10 bg-white p-4">
              <p className="font-bold text-ink">Goles</p>
              <div className="mt-3 space-y-2">
                {parsed.goals.map((goal, index) => (
                  <div key={`${goal.teamName}-${index}`} className="text-sm text-ink/70">
                    <span className="font-semibold text-ink">{goal.teamName}</span>
                    {goal.playerName ? ` · ${goal.playerName}` : ""}
                    {goal.minute ? ` · ${goal.minute}'` : ""}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-ink/10 bg-white p-4">
              <p className="font-bold text-ink">Tarjetas / notas</p>
              <div className="mt-3 space-y-2">
                {parsed.cards.map((card, index) => (
                  <div key={`${card.type}-${index}`} className="text-sm text-ink/70">
                    <span className="font-semibold uppercase text-ink">{card.type}</span>
                    {card.teamName ? ` · ${card.teamName}` : ""}
                    {card.minute ? ` · ${card.minute}'` : ""}
                  </div>
                ))}
                <p className="text-sm text-ink/60">{parsed.notes}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-md bg-mist p-4">
            <pre className="overflow-x-auto text-xs leading-5 text-ink/72">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={() => toast.success("Resultado publicado en fixture y tabla")}>
              <CheckCircle2 className="h-4 w-4" />
              Publicar resultado
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
