"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const Schema = z
  .object({
    password: z.string().min(8, { error: "Minimo 8 caracteres." }),
    confirmar: z.string(),
  })
  .refine((data) => data.password === data.confirmar, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmar"],
  });

export type UpdatePasswordState = { error?: string } | undefined;

export async function actualizarPassword(
  _prevState: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const parsed = Schema.safeParse({
    password: formData.get("password"),
    confirmar: formData.get("confirmar"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "No se pudo actualizar la contraseña. Pedi un nuevo link." };
  }

  redirect("/dashboard");
}
