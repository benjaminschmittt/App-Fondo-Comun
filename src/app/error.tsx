"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="fade-up max-w-95 text-center">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border-[1.5px] border-neg bg-card">
          <span className="text-2xl text-neg">!</span>
        </div>
        <h1 className="mb-2 font-heading text-xl text-ink">
          Algo salió mal
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Ocurrió un error inesperado. Podés intentar de nuevo.
          {error.digest && (
            <>
              <br />
              <span className="text-xs text-muted-foreground">
                Referencia: {error.digest}
              </span>
            </>
          )}
        </p>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
