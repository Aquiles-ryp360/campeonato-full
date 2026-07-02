"use client";

import { useEffect, useMemo, useState } from "react";
import { Clipboard, KeyRound, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  registration_fee: number | string;
  registration_open_until: string;
};

type CodeRow = {
  id: string;
  event_id: string;
  code: string;
  method: "yape" | "plin";
  amount: number | string;
  status: "available" | "used" | "revoked";
  used_by_team_id: string | null;
  created_at: string;
};

type CodesPayload = {
  ok: true;
  events: EventRow[];
  codes: CodeRow[];
};

const statusLabels: Record<CodeRow["status"], string> = {
  available: "Disponible",
  used: "Usado",
  revoked: "Anulado"
};

export function RegistrationCodesPanel() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [method, setMethod] = useState<"yape" | "plin">("yape");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const eventById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const selectedEvent = eventById.get(eventId);
  const visibleCodes = useMemo(
    () => codes.filter((code) => code.event_id === eventId),
    [codes, eventId]
  );
  const availableCodes = visibleCodes.filter((code) => code.status === "available");

  useEffect(() => {
    void loadCodes();
  }, []);

  async function loadCodes() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/registration-codes");
      const payload = (await response.json().catch(() => null)) as
        | (CodesPayload & { error?: string })
        | null;

      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error ?? "No se pudieron cargar los codigos.");
        return;
      }

      setEvents(payload.events);
      setCodes(payload.codes);
      setEventId((current) => current || payload.events[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }

  async function createCodes() {
    if (!eventId) {
      toast.error("Selecciona un campeonato.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/registration-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, method, count })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; codes?: CodeRow[] }
        | null;

      if (!response.ok || !payload?.ok) {
        toast.error(payload?.error ?? "No se pudieron crear los codigos.");
        return;
      }

      toast.success(`${payload.codes?.length ?? count} codigos creados.`);
      await loadCodes();
    } finally {
      setBusy(false);
    }
  }

  async function copyAvailableCodes() {
    const text = availableCodes.map((code) => code.code).join("\n");
    if (!text) return;

    await navigator.clipboard.writeText(text);
    toast.success("Codigos disponibles copiados.");
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <SectionHeader
        eyebrow="Admin"
        title="Codigos de inscripcion"
        description="Genera lotes de codigos de un solo uso para las inscripciones."
        action={<Badge tone="blue">{availableCodes.length} disponibles</Badge>}
      />

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_140px_120px_auto] md:items-end">
          <Field label="Campeonato">
            <select
              className={inputClass}
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              disabled={loading || events.length === 0}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Metodo">
            <select
              className={inputClass}
              value={method}
              onChange={(event) => setMethod(event.target.value as "yape" | "plin")}
            >
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
            </select>
          </Field>
          <Field label="Cantidad">
            <input
              className={inputClass}
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(event) => setCount(Math.min(Math.max(Number(event.target.value) || 1, 1), 100))}
            />
          </Field>
          <Button onClick={() => void createCodes()} disabled={busy || events.length === 0}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear
          </Button>
        </div>
        {selectedEvent ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink/65">
            <KeyRound className="h-4 w-4" />
            <span>{selectedEvent.slug}</span>
            <span>{formatMoney(Number(selectedEvent.registration_fee))}</span>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-ink/10 p-5">
          <SectionHeader
            title="Lista de codigos"
            action={
              <Button
                variant="secondary"
                onClick={() => void copyAvailableCodes()}
                disabled={availableCodes.length === 0}
              >
                <Clipboard className="h-4 w-4" />
                Copiar disponibles
              </Button>
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-mist text-left text-xs uppercase text-ink/55">
              <tr>
                <th className="px-5 py-3">Codigo</th>
                <th className="px-3 py-3">Campeonato</th>
                <th className="px-3 py-3">Metodo</th>
                <th className="px-3 py-3">Monto</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {visibleCodes.map((code) => {
                const event = eventById.get(code.event_id);

                return (
                  <tr key={code.id}>
                    <td className="px-5 py-4 font-bold text-ink">{code.code}</td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-ink">{event?.name ?? "Campeonato"}</p>
                      <p className="text-xs text-ink/55">{event?.slug}</p>
                    </td>
                    <td className="px-3 py-4 uppercase text-ink/70">{code.method}</td>
                    <td className="px-3 py-4">{formatMoney(Number(code.amount))}</td>
                    <td className="px-5 py-4">
                      <Badge tone={code.status === "available" ? "green" : code.status === "used" ? "amber" : "red"}>
                        {statusLabels[code.status]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {visibleCodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink/55">
                    {loading ? "Cargando codigos..." : "Todavia no hay codigos para este campeonato."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
