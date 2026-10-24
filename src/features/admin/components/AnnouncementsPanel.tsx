"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Megaphone, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, EmptyState, Field, SectionHeader, inputClass } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

type EventRow = { id: string; name: string };

type AnnouncementRow = {
  id: string;
  event_id: string | null;
  title: string;
  body: string;
  created_at: string;
};

type Payload =
  | { ok: true; events: EventRow[]; announcements: AnnouncementRow[] }
  | { ok: false; error: string };

export function AnnouncementsPanel() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);

  const eventNames = useMemo(() => new Map(events.map((event) => [event.id, event.name])), [events]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/announcements");
      const payload = (await response.json().catch(() => null)) as Payload | null;
      if (!payload || !payload.ok) {
        setLoadError(payload && !payload.ok ? payload.error : "No se pudieron cargar los avisos.");
        return;
      }
      setLoadError("");
      setEvents(payload.events);
      setAnnouncements(payload.announcements);
    } finally {
      setLoading(false);
    }
  }

  async function publish(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: eventId || null, title, body })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; announcement: AnnouncementRow }
        | { ok: false; error: string }
        | null;

      if (!payload || !payload.ok) {
        toast.error(payload && !payload.ok ? payload.error : "No se pudo publicar el aviso.");
        return;
      }

      setAnnouncements((current) => [payload.announcement, ...current]);
      setTitle("");
      setBody("");
      toast.success("Aviso publicado para los delegados.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar este aviso? Los delegados dejarán de verlo.")) return;
    const response = await fetch(`/api/admin/announcements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("No se pudo eliminar el aviso.");
      return;
    }
    setAnnouncements((current) => current.filter((item) => item.id !== id));
    toast.success("Aviso eliminado.");
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <Card className="p-5">
        <SectionHeader
          eyebrow="Comunicados"
          title="Avisos para delegados"
          description="Cambios de horario, recordatorios o sorteos. Solo los ven los equipos inscritos en su panel."
        />
        {loadError ? (
          <p className="mt-4 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-semibold text-red-800">
            {loadError}
          </p>
        ) : (
          <form className="mt-5 grid gap-4" onSubmit={publish}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Campeonato">
                <select
                  className={inputClass}
                  value={eventId}
                  onChange={(changeEvent) => setEventId(changeEvent.target.value)}
                >
                  <option value="">Todos los campeonatos</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Título">
                <input
                  className={inputClass}
                  value={title}
                  onChange={(changeEvent) => setTitle(changeEvent.target.value)}
                  placeholder="Ej. Cambio de horario del sábado"
                  maxLength={120}
                />
              </Field>
            </div>
            <Field label="Mensaje">
              <textarea
                className={`${inputClass} min-h-28`}
                value={body}
                onChange={(changeEvent) => setBody(changeEvent.target.value)}
                placeholder="Escribe el aviso para los delegados."
                maxLength={2000}
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy || loading}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publicar aviso
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card className="p-5">
        <SectionHeader title="Publicados" />
        <div className="mt-4 grid gap-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-brand-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando avisos...
            </p>
          ) : announcements.length === 0 ? (
            <EmptyState icon={Megaphone} title="Sin avisos" description="Los avisos que publiques aparecerán aquí." />
          ) : (
            announcements.map((item) => (
              <article
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-md border border-brand-towerMid/25 bg-white p-4 shadow-insetLine"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-brand-electric">
                    {item.event_id ? eventNames.get(item.event_id) ?? "Campeonato" : "Todos"} ·{" "}
                    {formatDateTime(item.created_at)}
                  </p>
                  <p className="mt-1 font-black text-ink">{item.title}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-brand-muted">{item.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(item.id)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-brand-muted hover:bg-red-50 hover:text-red-700"
                  aria-label={`Eliminar aviso ${item.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
