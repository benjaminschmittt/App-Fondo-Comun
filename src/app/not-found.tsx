import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="fade-up max-w-95 text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border-[1.5px] border-gold bg-card">
          <span className="font-heading text-2xl font-semibold text-navy">
            F
          </span>
        </div>
        <h1 className="mb-2 font-heading text-xl text-ink">
          Página no encontrada
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          La página que buscás no existe o se movió.
        </p>
        <Button asChild>
          <Link href="/dashboard">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
