import { AlertTriangle } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui";
import { RefereeLiveMatch } from "@/features/referee/components/RefereeLiveMatch";
import { getRefereeLiveMatchData } from "@/lib/queries/referee";

export const dynamic = "force-dynamic";

export default async function RefereeLiveMatchPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const data = await getRefereeLiveMatchData(id);
    return <RefereeLiveMatch data={data} />;
  } catch (error) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-coral/10 text-red-800">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <SectionHeader
            title="No se pudo abrir el partido"
            description={error instanceof Error ? error.message : "Verifica que el partido este asignado a tu correo."}
          />
        </div>
      </Card>
    );
  }
}
