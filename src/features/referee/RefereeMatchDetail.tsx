"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, Send } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";

type MatchPayload = {
  match: {
    id: string;
    status: string;
    event_id: string;
    home_team_id: string | null;
    away_team_id: string | null;
    scheduled_at: string;
    home_score: number | null;
    away_score: number | null;
  };
  players: Array<{ id: string; team_id: string; first_name: string; last_name: string }>;
};

export function RefereeMatchDetail({ matchId }: { matchId: string }) {
  const [data, setData] = useState<MatchPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [sets, setSets] = useState([{ setNumber: 1, homePoints: 0, awayPoints: 0 }]);

  useEffect(() => {
    fetch(`/api/referee/matches/${matchId}`)
      .then((response) => response.json())
      .then((payload) => setData(payload.ok ? { match: payload.match, players: payload.players } : null))
      .catch(() => setData(null));
  }, [matchId]);

  async function start() {
    setBusy(true);
    const response = await fetch(`/api/referee/matches/${matchId}/start`, { method: "POST" });
    setBusy(false);
    if (!response.ok) {
      toast.error("No se pudo iniciar el partido.");
      return;
    }
    toast.success("Partido iniciado.");
    setData((current) => current ? { ...current, match: { ...current.match, status: "in_progress" } } : current);
  }

  async function submit(formData: FormData) {
    setBusy(true);
    const homeScore = Number(formData.get("homeScore") ?? 0);
    const awayScore = Number(formData.get("awayScore") ?? 0);
    const goalPlayerId = String(formData.get("goalPlayerId") ?? "");
    const cardPlayerId = String(formData.get("cardPlayerId") ?? "");
    const events = [
      goalPlayerId ? { eventType: "goal", playerId: goalPlayerId, minute: Number(formData.get("goalMinute") ?? 0) } : null,
      cardPlayerId ? { eventType: formData.get("cardType") === "red_card" ? "red_card" : "yellow_card", playerId: cardPlayerId, minute: Number(formData.get("cardMinute") ?? 0) } : null
    ].filter(Boolean);
    const response = await fetch(`/api/referee/matches/${matchId}/submit-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeScore,
        awayScore,
        events,
        sets,
        observations: String(formData.get("observations") ?? "")
      })
    });
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok || !payload?.ok) {
      toast.error(payload?.error ?? "No se pudo enviar el resultado.");
      return;
    }
    toast.success("Resultado enviado.");
    setData((current) => current ? { ...current, match: { ...current.match, status: payload.status } } : current);
  }

  if (!data) {
    return <Card className="p-5"><p className="text-sm text-ink/55">Cargando partido...</p></Card>;
  }

  return (
    <Card className="p-5">
      <SectionHeader
        title="Detalle de partido"
        description={`${new Date(data.match.scheduled_at).toLocaleString("es-PE")} · Estado ${data.match.status}`}
        action={
          <Button variant="secondary" disabled={busy || data.match.status !== "scheduled"} onClick={() => void start()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Iniciar
          </Button>
        }
      />
      <form action={submit} className="mt-5 grid gap-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Goles local">
            <input name="homeScore" type="number" min={0} className={inputClass} defaultValue={data.match.home_score ?? 0} />
          </Field>
          <Field label="Goles visitante">
            <input name="awayScore" type="number" min={0} className={inputClass} defaultValue={data.match.away_score ?? 0} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Goleador">
            <select name="goalPlayerId" className={inputClass}>
              <option value="">Sin goleador</option>
              {data.players.map((player) => (
                <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>
              ))}
            </select>
          </Field>
          <Field label="Minuto gol">
            <input name="goalMinute" type="number" min={0} className={inputClass} />
          </Field>
          <Field label="Tarjeta">
            <select name="cardType" className={inputClass}>
              <option value="yellow_card">Amarilla</option>
              <option value="red_card">Roja</option>
            </select>
          </Field>
          <Field label="Jugador tarjeta">
            <select name="cardPlayerId" className={inputClass}>
              <option value="">Sin tarjeta</option>
              {data.players.map((player) => (
                <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="rounded-md border border-ink/10 p-4">
          <p className="text-sm font-bold text-ink">Sets de voley</p>
          <div className="mt-3 grid gap-3">
            {sets.map((set, index) => (
              <div key={set.setNumber} className="grid gap-3 md:grid-cols-3">
                <Field label={`Set ${set.setNumber} local`}>
                  <input type="number" min={0} className={inputClass} value={set.homePoints} onChange={(event) => setSets((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, homePoints: Number(event.target.value) } : item))} />
                </Field>
                <Field label={`Set ${set.setNumber} visita`}>
                  <input type="number" min={0} className={inputClass} value={set.awayPoints} onChange={(event) => setSets((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, awayPoints: Number(event.target.value) } : item))} />
                </Field>
                <Button type="button" variant="secondary" onClick={() => setSets((current) => current.filter((_, currentIndex) => currentIndex !== index))}>Quitar</Button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => setSets((current) => [...current, { setNumber: current.length + 1, homePoints: 0, awayPoints: 0 }])}>Agregar set</Button>
          </div>
        </div>
        <Field label="Observaciones e incidencias">
          <textarea name="observations" className={inputClass} rows={4} />
        </Field>
        <Button disabled={busy || data.match.status === "validated" || data.match.status === "submitted"}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar resultado
        </Button>
      </form>
    </Card>
  );
}
