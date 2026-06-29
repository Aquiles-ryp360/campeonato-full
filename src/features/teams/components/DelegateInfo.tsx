import type { Team } from "@/lib/types";

export function DelegateInfo({
  team,
  publicContact = true
}: {
  team: Team;
  publicContact?: boolean;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-4 text-sm">
      <p className="text-xs font-bold uppercase text-ink/45">Delegado</p>
      <p className="mt-1 font-bold text-ink">{team.delegateName}</p>
      {publicContact ? (
        <div className="mt-2 space-y-1 text-ink/65">
          <p>{team.delegatePhone}</p>
          <p className="break-all">{team.delegateEmail}</p>
        </div>
      ) : null}
    </div>
  );
}
