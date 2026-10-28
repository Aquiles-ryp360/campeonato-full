"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton({ className, label = "Imprimir" }: { className?: string; label?: string }) {
  return (
    <Button variant="secondary" className={className} onClick={() => window.print()}>
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}

// Abre el dialogo de impresion al cargar (ahi se elige "Guardar como PDF").
export function AutoPrint() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
