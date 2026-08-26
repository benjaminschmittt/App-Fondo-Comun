import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { importExcel } from "@/lib/excel/import";
import { FONDO_DATA_TAG } from "@/data/fondo";

// Endpoint sin sesion de Supabase a proposito: lo llama un script local
// (scripts/watch-excel.mjs), no un navegador logueado. Excepcion
// deliberada a la Regla de seguridad #2 del proyecto (toda Server
// Action/data function reverifica sesion) — la proteccion acá es un
// secreto compartido, no un rol de usuario.
function secretoValido(recibido: string | null): boolean {
  const esperado = process.env.AUTO_IMPORT_SECRET;
  if (!esperado || !recibido) return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const recibido = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!secretoValido(recibido)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const actorId = process.env.AUTO_IMPORT_ACTOR_ID;
  const actorEmail = process.env.AUTO_IMPORT_ACTOR_EMAIL;
  if (!actorId || !actorEmail) {
    return NextResponse.json(
      { ok: false, error: "Falta configurar AUTO_IMPORT_ACTOR_ID/AUTO_IMPORT_ACTOR_EMAIL en el servidor." },
      { status: 500 }
    );
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ ok: false, error: "Archivo vacío." }, { status: 400 });
  }

  const archivoNombre = request.headers.get("x-file-name") ?? "auto-sync.xlsx";

  const result = await importExcel(buffer, {
    archivoNombre: `auto-sync: ${archivoNombre}`,
    importadoPorId: actorId,
    importadoPorEmail: actorEmail,
  });

  if (result.ok) {
    // revalidateTag, no updateTag: updateTag solo funciona dentro de una
    // Server Action (este es un Route Handler, llamado por un script
    // externo sin sesion de navegador) — ver error real encontrado al
    // verificar: "updateTag can only be called from within a Server Action".
    // { expire: 0 } para que se invalide de inmediato, no en el proximo
    // ciclo eventual (comportamiento por defecto de revalidateTag).
    revalidateTag(FONDO_DATA_TAG, { expire: 0 });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
