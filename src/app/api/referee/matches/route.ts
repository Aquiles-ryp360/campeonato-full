import { NextResponse } from "next/server";
import { getRefereeDashboardData } from "@/lib/queries/referee";
import { ServerAccessError, getRouteUser } from "@/lib/server-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await getRouteUser();
    const data = await getRefereeDashboardData();

    return NextResponse.json({
      count: data.matches.length,
      ...data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No autorizado";
    const status = error instanceof ServerAccessError ? error.status : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
