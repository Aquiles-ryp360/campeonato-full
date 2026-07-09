"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";

export function DelegateRosterDownloadButton({
  teamId,
  teamName,
  label = "Descargar mi equipo",
  disabled = false
}: {
  teamId: string;
  teamName: string;
  label?: string;
  disabled?: boolean;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function downloadRoster() {
    if (isDownloading || disabled) return;

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/delegate/teams/${encodeURIComponent(teamId)}/roster`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast.error(payload?.error ?? "No se pudo descargar el plantel.");
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download =
        fileNameFromDisposition(response.headers.get("content-disposition")) ??
        `plantel-${slugify(teamName) || "equipo"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Plantel descargado.");
    } catch {
      toast.error("No se pudo descargar el plantel.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Button variant="highlight" onClick={() => void downloadRoster()} disabled={disabled || isDownloading}>
      {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {isDownloading ? "Descargando..." : label}
    </Button>
  );
}

function fileNameFromDisposition(value: string | null) {
  if (!value) return null;

  const quoted = /filename="([^"]+)"/i.exec(value);
  if (quoted?.[1]) return quoted[1];

  const plain = /filename=([^;]+)/i.exec(value);
  return plain?.[1]?.trim() ?? null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
