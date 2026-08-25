"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/data/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria } from "@/data/audit";
import { crearCliente, editarCliente, type SimpleResult } from "@/data/clientes";

export type InviteResult = { ok: true } | { ok: false; error: string };

export async function invitarCliente(email: string): Promise<InviteResult> {
  const adminUser = await requireAdmin();

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/actualizar-password`,
  });

  if (error) {
    // Devolvemos el error en vez de tirarlo: Next.js oculta el mensaje real
    // de las excepciones de Server Actions en produccion (por seguridad),
    // asi que un throw no sirve para mostrarle al admin la causa concreta.
    return { ok: false, error: `${error.status ?? "?"} ${error.message}` };
  }

  await registrarAuditoria({
    actorId: adminUser.id,
    actorEmail: adminUser.email ?? "",
    accion: "invitar_cliente",
    entidad: "client",
    detalle: { email },
  });

  revalidatePath("/admin");
  return { ok: true };
}

function parseClienteForm(formData: FormData) {
  return {
    clienteId: formData.get("clienteId"),
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    activo: formData.get("activo") === "on",
  };
}

export async function crearClienteAction(formData: FormData): Promise<SimpleResult> {
  const result = await crearCliente(parseClienteForm(formData));
  if (!result.ok) return result;

  if (formData.get("invitar") === "on") {
    const email = formData.get("email");
    if (typeof email === "string") {
      const invite = await invitarCliente(email);
      if (!invite.ok) {
        revalidatePath("/admin");
        return { ok: false, error: `Cliente creado, pero no se pudo invitar: ${invite.error}` };
      }
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function editarClienteAction(id: string, formData: FormData): Promise<SimpleResult> {
  const result = await editarCliente(id, parseClienteForm(formData));
  if (result.ok) revalidatePath("/admin");
  return result;
}
