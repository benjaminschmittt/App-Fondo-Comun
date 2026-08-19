import { requireUser } from "@/data/auth";
import { C } from "@/lib/theme";
import { UpdatePasswordForm } from "./update-password-form";

export default async function ActualizarPasswordPage() {
  await requireUser();

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: C.surface }}>
      <div className="w-full" style={{ maxWidth: 420 }}>
        <div className="rounded-2xl p-7" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
          <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 22, color: C.ink, marginBottom: 6 }}>
            Elegi tu nueva contraseña
          </h1>
          <p style={{ color: C.muted, fontSize: 13.5, marginBottom: 20 }}>
            Minimo 8 caracteres.
          </p>
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
