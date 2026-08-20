"use client";

import { useState, useTransition } from "react";
import { invitarCliente } from "./actions";
import { C } from "@/lib/theme";

export function InviteButton({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return <span style={{ color: C.pos, fontSize: 12 }}>Invitacion enviada</span>;
  }

  return (
    <div>
      <button
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await invitarCliente(email);
            if (result.ok) {
              setDone(true);
            } else {
              setError(result.error);
            }
          });
        }}
        disabled={pending}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: C.navy,
          border: `1px solid ${C.navy}`,
          borderRadius: 6,
          padding: "4px 10px",
          background: "#fff",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Enviando..." : "Invitar"}
      </button>
      {error && <div style={{ color: C.neg, fontSize: 11, marginTop: 4 }}>{error}</div>}
    </div>
  );
}
