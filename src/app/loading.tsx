import { PublicShell } from "@/components/shell";
import { Card, LoadingSkeleton, SectionHeader } from "@/components/ui";

export default function Loading() {
  return (
    <PublicShell>
      <Card className="p-5">
        <SectionHeader title="Cargando campeonato" description="Preparando datos actualizados." />
        <div className="mt-5">
          <LoadingSkeleton rows={4} />
        </div>
      </Card>
    </PublicShell>
  );
}
