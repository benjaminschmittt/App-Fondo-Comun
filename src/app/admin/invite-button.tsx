"use client";

import { useState, useTransition } from "react";
import { invitarCliente } from "./actions";
import { Button } from "@/components/ui/button";

export function InviteButton({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return <span className="text-xs font-medium text-pos">Invitación enviada</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await invitarCliente(email);
            if (result.ok) setDone(true);
            else setError(result.error);
          });
        }}
      >
        {pending ? "Enviando..." : "Invitar"}
      </Button>
      {error && <span className="text-[11px] text-neg">{error}</span>}
    </div>
  );
}
