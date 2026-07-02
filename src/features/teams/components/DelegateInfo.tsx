import type { Team } from "@/lib/types";

export function DelegateInfo({
  team,
  publicContact = true
}: {
  team: Team;
  publicContact?: boolean;
}) {
  return (
    <div className="rounded-md border border-brand-towerMid/25 bg-white p-4 text-sm shadow-insetLine">
      <p className="text-xs font-black uppercase text-brand-muted">Delegado</p>
      <p className="mt-1 font-bold text-ink">{team.delegateName}</p>
      {publicContact ? (
        <div className="mt-2 space-y-1 font-semibold text-brand-muted">
          <p>{team.delegatePhone}</p>
          <p className="break-all">{team.delegateEmail}</p>
        </div>
      ) : null}
    </div>
  );
}
