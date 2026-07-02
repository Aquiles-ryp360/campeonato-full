import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdminUser, ServerAccessError } from "@/lib/server-access";

export const runtime = "nodejs";

const uploadDir = "uploads/championship-assets";
const maxAssetSize = 4 * 1024 * 1024;
const allowedImageTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"]
]);

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("Selecciona una imagen para subir.", 400);
    }

    if (file.size > maxAssetSize) {
      return jsonError("La imagen no puede superar 4 MB.", 400);
    }

    const extension = allowedImageTypes.get(file.type);
    if (!extension) {
      return jsonError("Solo se permiten imagenes PNG, JPG o WebP.", 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${crypto.randomUUID()}-${slugify(file.name)}${extension}`;
    const targetDir = path.join(process.cwd(), "public", uploadDir);
    const targetPath = path.join(targetDir, filename);

    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, bytes);

    return NextResponse.json({ url: `/${uploadDir}/${filename}` });
  } catch (error) {
    if (error instanceof ServerAccessError) {
      return jsonError(error.message, error.status);
    }

    console.error("Championship asset upload failed", error);
    return jsonError("No se pudo subir la imagen.", 500);
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function slugify(value: string) {
  const name = value.replace(/\.[a-z0-9]+$/i, "");
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "asset";
}
