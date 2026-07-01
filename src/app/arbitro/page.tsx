import { RefereeMatchList } from "@/features/referee/components/RefereeMatchList";
import { getRefereeDashboardData } from "@/lib/queries/referee";

export const dynamic = "force-dynamic";

export default async function RefereePage() {
  const data = await getRefereeDashboardData();
  return <RefereeMatchList data={data} />;
}
