import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { requireAdminUser, ServerAccessError } from "@/lib/server-access";
import { enrollmentBucketName } from "@/lib/domain/registration-rules";

export const runtime = "nodejs";

// Abre la ficha de matricula (bucket privado) con una URL firmada de corta duracion.
export async function GET(request: Request) {
  try {
    const admin = createSupabaseAdminClient();
    await requireAdminUser(admin);

    const path = new URL(request.url).searchParams.get("path") ?? "";
    const prefix = `${enrollmentBucketName}/`;
    if (!path.startsWith(prefix) || path.includes("..")) {
      return NextResponse.json({ error: "Ficha no valida." }, { status: 400 });
    }

    const { data, error } = await admin.storage
      .from(enrollmentBucketName)
      .createSignedUrl(path.slice(prefix.length), 300);
    if (error || !data) {
      return NextResponse.json({ error: "No se encontro la ficha." }, { status: 404 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    const status = error instanceof ServerAccessError ? error.status : 500;
    return NextResponse.json({ error: "No se pudo abrir la ficha." }, { status });
  }
}
