"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";

export function DeleteChampionshipButton({
  id,
  name
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Borrar "${name}"?\n\nSe eliminaran equipos, jugadores, partidos, codigos y bases asociadas.`
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/admin/championships?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo borrar el campeonato.");
      }

      toast.success("Campeonato borrado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo borrar el campeonato.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button variant="danger" className="w-full" onClick={handleDelete} disabled={deleting}>
      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {deleting ? "Borrando" : "Borrar"}
    </Button>
  );
}
