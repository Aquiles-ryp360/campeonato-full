"use client";

import { useState } from "react";
import { identityConsentTextVersion } from "@/lib/identity/identity-lookup";
import { TermsIdentityLookupModal } from "./TermsIdentityLookupModal";

export function IdentityConsentBlock({
  accepted,
  onAcceptedChange,
  disabled = false
}: {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  disabled?: boolean;
}) {
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <div className="rounded-md border border-field/20 bg-field/5 px-3 py-2">
      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-2 font-semibold text-ink sm:items-center">
          <input
            className="mt-0.5 h-4 w-4 rounded border-ink/20 text-field focus:ring-field sm:mt-0"
            type="checkbox"
            checked={accepted}
            disabled={disabled}
            onChange={(event) => onAcceptedChange(event.target.checked)}
          />
          <span>Autorizo el uso de datos para inscripción y autollenado del campeonato.</span>
        </label>
        <button
          type="button"
          className="text-left text-xs font-bold text-field hover:text-field/80 sm:text-right"
          onClick={() => setTermsOpen(true)}
        >
          Ver términos
        </button>
        <input type="hidden" name="dataConsentTextVersion" value={identityConsentTextVersion} />
      </div>

      <TermsIdentityLookupModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => {
          onAcceptedChange(true);
          setTermsOpen(false);
        }}
      />
    </div>
  );
}
