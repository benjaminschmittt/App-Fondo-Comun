import type { Metadata } from "next";
import { requireUser } from "@/data/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ActualizarPasswordPage() {
  await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="fade-up w-full max-w-105">
        <Card>
          <CardHeader>
            <h1 className="font-heading text-xl text-ink">
              Elegi tu nueva contraseña
            </h1>
            <p className="text-sm text-muted-foreground">
              Minimo 8 caracteres.
            </p>
          </CardHeader>
          <CardContent>
            <UpdatePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
