import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  enrollmentBucketName,
  validateEnrollmentFileMeta
} from "@/lib/domain/registration-rules";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export class EnrollmentFileError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

export type UploadedEnrollmentFile = {
  dbPath: string;
  storagePath: string;
};

export async function uploadEnrollmentFile(
  supabase: AdminClient,
  {
    eventId,
    teamId,
    file,
    label
  }: {
    eventId: string;
    teamId: string;
    file: File;
    label: string;
  }
): Promise<UploadedEnrollmentFile> {
  const fileError = validateEnrollmentFileMeta({ type: file.type, size: file.size });
  if (fileError) {
    throw new EnrollmentFileError(fileError, 400);
  }

  const extension = extensionFromFile(file);
  const safeLabel = slugify(label) || "jugador";
  const storagePath = `${eventId}/${teamId}/${Date.now()}-${crypto.randomUUID()}-${safeLabel}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(enrollmentBucketName).upload(storagePath, bytes, {
    contentType: file.type,
    upsert: false
  });

  if (error) {
    throw new EnrollmentFileError("No se pudo subir la ficha de matricula.", 500);
  }

  return {
    dbPath: `${enrollmentBucketName}/${storagePath}`,
    storagePath
  };
}

export async function removeEnrollmentFiles(
  supabase: AdminClient,
  files: UploadedEnrollmentFile[]
) {
  const storagePaths = files.map((file) => file.storagePath);
  if (storagePaths.length === 0) return;

  await supabase.storage.from(enrollmentBucketName).remove(storagePaths);
}

function extensionFromFile(file: File) {
  const byName = file.name.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
  if (byName && [".pdf", ".jpg", ".jpeg", ".png"].includes(byName)) return byName;
  if (file.type === "application/pdf") return ".pdf";
  if (file.type === "image/png") return ".png";
  return ".jpg";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
