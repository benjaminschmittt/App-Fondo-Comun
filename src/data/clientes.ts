import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { registrarAuditoria } from "./audit";

export type SimpleResult = { ok: true } | { ok: false; error: string };

const ClienteInput = z.object({
  clienteId: z.string({ error: "El ID de cliente es obligatorio." }).trim().min(1, { error: "El ID de cliente es obligatorio." }),
  nombre: z.string({ error: "El nombre es obligatorio." }).trim().min(1, { error: "El nombre es obligatorio." }),
  email: z.email({ error: "Ingresá un email válido." }).trim(),
  activo: z.boolean(),
});

// Solo crea el registro en la base — no crea la cuenta de login. Invitar
// (crear el auth user) sigue siendo un paso aparte con invitarCliente()
// (src/app/admin/actions.ts), que la Server Action de alta puede encadenar
// si el admin tildó "invitar también".
export async function crearCliente(input: unknown): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const parsed = ClienteInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const cliente = await prisma.client.create({ data: parsed.data });
    await registrarAuditoria({
      actorId: admin.id,
      actorEmail: admin.email ?? "",
      accion: "crear_cliente",
      entidad: "client",
      entidadId: cliente.id,
      detalle: parsed.data,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe un cliente con ese ID o ese email." };
    }
    return { ok: false, error: "No se pudo crear el cliente." };
  }
}

// Sin baja/delete a propósito — mismo criterio que Fund.activo: se
// desactiva, nunca se borra (evita lidiar con cascadas de movimientos,
// marcas de agua y cálculos de comisión ya asociados al cliente).
export async function editarCliente(id: string, input: unknown): Promise<SimpleResult> {
  const admin = await requireAdmin();
  const parsed = ClienteInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const antes = await prisma.client.findUnique({ where: { id } });
  if (!antes) return { ok: false, error: "El cliente no existe." };

  try {
    await prisma.client.update({ where: { id }, data: parsed.data });
    await registrarAuditoria({
      actorId: admin.id,
      actorEmail: admin.email ?? "",
      accion: "editar_cliente",
      entidad: "client",
      entidadId: id,
      detalle: {
        antes: { clienteId: antes.clienteId, nombre: antes.nombre, email: antes.email, activo: antes.activo },
        despues: parsed.data,
      },
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ya existe otro cliente con ese ID o ese email." };
    }
    return { ok: false, error: "No se pudo editar el cliente." };
  }
}
