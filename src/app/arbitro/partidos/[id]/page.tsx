import { RefereeMatchDetail } from "@/features/referee/RefereeMatchDetail";

export default async function RefereeMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RefereeMatchDetail matchId={id} />;
}
