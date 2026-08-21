import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-105">
        <Card>
          <CardHeader>
            <h1 className="font-heading text-xl text-ink">
              Recuperar contraseña
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tu email y te enviamos un link para elegir una nueva
              contraseña.
            </p>
          </CardHeader>
          <CardContent>
            <RecoverForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
