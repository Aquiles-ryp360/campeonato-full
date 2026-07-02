"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui";

export function TermsIdentityLookupModal({
  open,
  onAccept,
  onClose
}: {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-panel">
        <div className="sticky top-0 flex items-center justify-between border-b border-ink/10 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Uso de datos para inscripción y autollenado</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md text-ink/55 hover:bg-mist hover:text-ink"
            aria-label="Cerrar términos"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm leading-6 text-ink/72">
          <section>
            <h3 className="font-bold text-ink">Finalidad</h3>
            <p>
              Los datos se usarán únicamente para registrar participantes, validar identidad
              básica, evitar duplicidad de jugadores, organizar equipos, fixture y gestión
              administrativa del campeonato.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-ink">Datos tratados</h3>
            <p>
              Nombres, apellidos, DNI, código de matrícula o referencia, escuela profesional,
              condición docente, dedicación, semestre declarado manualmente y datos de contacto
              si el formulario los solicita.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-ink">Fuente</h3>
            <p>
              Los datos pueden ser ingresados manualmente por el delegado o autocompletados
              mediante consultas individuales a fuentes públicas o servicios configurados,
              como el portal de trámites de la UNA Puno, la plana docente pública o un proveedor
              de consulta DNI.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-ink">Límites</h3>
            <p>
              No se solicitarán contraseñas. No se accederá a intranet, campus, correos
              institucionales ni cuentas privadas. No se realizarán búsquedas masivas ni
              generación de bases de datos externas.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-ink">Responsabilidad del delegado</h3>
            <p>
              El delegado declara que cuenta con autorización de los integrantes de su equipo
              para registrarlos y que verificará que los datos autocompletados sean correctos
              antes de enviarlos.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-ink">Conservación</h3>
            <p>
              Los datos se conservarán mientras dure la organización del campeonato y el
              tiempo necesario para control interno, reclamos o historial administrativo del
              torneo.
            </p>
          </section>
          <section>
            <h3 className="font-bold text-ink">Corrección</h3>
            <p>
              Si un dato autocompletado es incorrecto, el delegado puede corregirlo
              manualmente antes de guardar.
            </p>
          </section>
        </div>

        <div className="sticky bottom-0 flex justify-end border-t border-ink/10 bg-white px-5 py-4">
          <Button type="button" onClick={onAccept}>
            Acepto y continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
