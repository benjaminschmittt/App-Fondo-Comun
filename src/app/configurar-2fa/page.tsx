import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/data/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EnrollForm } from "./enroll-form";

export const metadata: Metadata = { title: "Configurar verificación en dos pasos" };

export default async function Configurar2FAPage() {
  const user = await requireUser();
  if (user.app_metadata?.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Si ya tiene un factor verificado, no hace falta enrolar de nuevo.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors && factors.totp.length > 0) {
    redirect("/admin");
  }

  // Cada visita a esta pagina llama a enroll(), que crea un factor nuevo
  // sin verificar — sin esto, recargar la pagina (o abandonarla a mitad
  // de camino) va dejando factores huerfanos acumulados. Se borra
  // cualquier pendiente antes de crear uno nuevo, para que como mucho
  // haya un solo factor sin verificar a la vez.
  if (factors) {
    const pendientes = factors.all.filter((f) => f.factor_type === "totp");
    await Promise.all(
      pendientes.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id }))
    );
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Fondo Privado",
  });

  if (error || !data) {
    // No hay forma de continuar sin esto — mostramos el error crudo,
    // es una pantalla de admin, no cara al cliente.
    throw new Error(`No se pudo iniciar el enrolamiento de 2FA: ${error?.message}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="fade-up w-full max-w-105">
        <Card>
          <CardHeader>
            <h1 className="font-heading text-xl text-ink">
              Configurá la verificación en dos pasos
            </h1>
            <p className="text-sm text-muted-foreground">
              Es obligatoria para cuentas de administrador. Escaneá el código con
              Google Authenticator, Authy o una app similar, y confirmá con el código
              de 6 dígitos.
            </p>
          </CardHeader>
          <CardContent>
            <EnrollForm
              factorId={data.id}
              qrCode={data.totp.qr_code}
              secret={data.totp.secret}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
