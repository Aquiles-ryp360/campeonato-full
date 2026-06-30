"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Field, SectionHeader, inputClass } from "@/components/ui";

type RefereeRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  active: boolean;
  match_referees?: Array<{ match_id: string }>;
};

export function RefereesAdminPanel() {
  const [referees, setReferees] = useState<RefereeRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const response = await fetch("/api/admin/referees");
    const payload = (await response.json().catch(() => null)) as { ok: true; referees: RefereeRow[] } | null;
    setReferees(payload?.ok ? payload.referees : []);
  }

  async function create(formData: FormData) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/referees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? "")
        })
      });
      if (!response.ok) throw new Error();
      toast.success("Arbitro creado.");
      await load();
    } catch {
      toast.error("No se pudo crear el arbitro.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(referee: RefereeRow) {
    await patch(referee.id, { active: !referee.active });
  }

  async function remove(referee: RefereeRow) {
    const response = await fetch(`/api/admin/referees/${referee.id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !payload?.ok) toast.error(payload?.error ?? "No se pudo eliminar.");
    await load();
  }

  async function patch(id: string, body: unknown) {
    const response = await fetch(`/api/admin/referees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) toast.error("No se pudo actualizar el arbitro.");
    await load();
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionHeader title="Arbitros" description="Crea arbitros, asocialos a Supabase Auth y controla su estado." />
        <form action={create} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
          <Field label="Nombre">
            <input name="fullName" className={inputClass} required />
          </Field>
          <Field label="Email">
            <input name="email" type="email" className={inputClass} required />
          </Field>
          <Field label="Telefono">
            <input name="phone" className={inputClass} />
          </Field>
          <Button disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear
          </Button>
        </form>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-mist text-left text-xs uppercase text-ink/55">
              <tr>
                <th className="px-5 py-3">Arbitro</th>
                <th className="px-3 py-3">Contacto</th>
                <th className="px-3 py-3">Partidos</th>
                <th className="px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {referees.map((referee) => (
                <tr key={referee.id}>
                  <td className="px-5 py-4">
                    <p className="font-bold text-ink">{referee.full_name}</p>
                    <Badge tone={referee.active ? "green" : "red"}>{referee.active ? "activo" : "inactivo"}</Badge>
                  </td>
                  <td className="px-3 py-4">
                    <p>{referee.email}</p>
                    <p className="text-xs text-ink/55">{referee.phone}</p>
                  </td>
                  <td className="px-3 py-4">{referee.match_referees?.length ?? 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => void toggle(referee)}>
                        <Power className="h-4 w-4" />
                        {referee.active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button variant="secondary" onClick={() => void remove(referee)}>
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
