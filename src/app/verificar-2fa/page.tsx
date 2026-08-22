import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/data/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Verificación en dos pasos" };

export default async function Verificar2FAPage() {
  const user = await requireUser();
  if (user.app_metadata?.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.currentLevel === aal.nextLevel) {
    // Ya esta al nivel que corresponde (aal2, o no tiene 2FA todavia).
    redirect("/admin");
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (!factors || factors.totp.length === 0) {
    redirect("/configurar-2fa");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="fade-up w-full max-w-105">
        <Card>
          <CardHeader>
            <h1 className="font-heading text-xl text-ink">
              Verificación en dos pasos
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresá el código de tu app autenticadora para continuar.
            </p>
          </CardHeader>
          <CardContent>
            <VerifyForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
