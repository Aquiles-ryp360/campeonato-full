"use client";

import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Ayuda contextual: aparece al mantener presionado (celular) o al dejar el
// mouse encima un momento (PC). El boton "i" la abre con un toque o teclado.
export function HoldHint({
  title,
  description,
  illustration,
  children,
  className
}: {
  title: string;
  description: React.ReactNode;
  illustration?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByHold = useRef(false);
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && wrapper.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  useEffect(() => () => cancel(), []);

  function start(delay: number) {
    cancel();
    timer.current = setTimeout(() => {
      openedByHold.current = true;
      setOpen(true);
    }, delay);
  }

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  return (
    <span
      ref={wrapper}
      className={cn("relative inline-flex items-center gap-1.5", className)}
      onPointerEnter={(event) => event.pointerType === "mouse" && start(600)}
      onPointerLeave={(event) => {
        cancel();
        if (event.pointerType === "mouse") setOpen(false);
      }}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") return;
        openedByHold.current = false;
        start(450);
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => {
        // Evita el menu del navegador al mantener presionado en el celular.
        if (openedByHold.current || timer.current) event.preventDefault();
      }}
      onClickCapture={(event) => {
        // Soltar despues de mantener presionado no debe seleccionar la opcion.
        if (openedByHold.current) {
          event.preventDefault();
          event.stopPropagation();
          openedByHold.current = false;
        }
      }}
    >
      {children}
      <button
        type="button"
        aria-label={`Ver ejemplo: ${title}`}
        aria-expanded={open}
        className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full text-brand-muted transition hover:bg-brand-electric/10 hover:text-brand-electric"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <span
          role="dialog"
          aria-label={title}
          className="fixed inset-x-4 bottom-4 z-50 block rounded-lg border border-brand-towerMid/30 bg-white p-4 text-left shadow-panel sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[22rem]"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <span className="flex items-start justify-between gap-3">
            <span className="text-sm font-black text-brand-navy">{title}</span>
            <button
              type="button"
              aria-label="Cerrar"
              className="text-brand-muted hover:text-ink"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </span>
          {illustration ? (
            <span className="mt-3 block rounded-md border border-brand-towerMid/20 bg-brand-wash/60 p-2">
              {illustration}
            </span>
          ) : null}
          <span className="mt-3 block text-xs font-semibold leading-5 text-brand-muted">{description}</span>
          <span className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-brand-muted/70">
            Imagen referencial
          </span>
        </span>
      ) : null}
    </span>
  );
}
