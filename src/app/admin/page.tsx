import { prisma } from "@/lib/prisma";
import { getEmailsConCuenta } from "@/data/admin-users";
import { C, fechaLarga } from "@/lib/theme";
import { InviteButton } from "./invite-button";

export default async function AdminPage() {
  const [ultimaImportacion, clientes, emailsConCuenta] = await Promise.all([
    prisma.importBatch.findFirst({ orderBy: { importadoEn: "desc" } }),
    prisma.client.findMany({ orderBy: { nombre: "asc" } }),
    getEmailsConCuenta(),
  ]);

  return (
    <main className="px-5 md:px-8 py-6" style={{ maxWidth: 1160, margin: "0 auto" }}>
      <div className="rounded-2xl p-5 mb-5" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
        <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 16, color: C.ink, fontWeight: 600, marginBottom: 10 }}>
          Ultima actualizacion
        </h2>
        {ultimaImportacion ? (
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.9 }}>
            <div>
              <strong style={{ color: C.ink }}>{fechaLarga(ultimaImportacion.importadoEn)}</strong>{" "}
              {ultimaImportacion.importadoEn.toLocaleTimeString("es-AR")}
            </div>
            <div>Archivo: {ultimaImportacion.archivoNombre}</div>
            <div>Importado por: {ultimaImportacion.importadoPorEmail}</div>
            <div>
              Estado:{" "}
              <span
                style={{
                  fontWeight: 600,
                  color: ultimaImportacion.estado === "ok" ? C.pos : C.neg,
                  textTransform: "uppercase",
                  fontSize: 11.5,
                }}
              >
                {ultimaImportacion.estado === "ok" ? "OK" : "Error"}
              </span>{" "}
              · {ultimaImportacion.filasProcesadas} filas procesadas
            </div>
          </div>
        ) : (
          <p style={{ color: C.muted, fontSize: 13.5 }}>
            Todavia no se importo ningun Excel.
          </p>
        )}
      </div>

      <div className="rounded-2xl p-5" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
        <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 16, color: C.ink, fontWeight: 600, marginBottom: 10 }}>
          Clientes ({clientes.length})
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: C.muted, textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <th style={{ padding: "8px 6px" }}>ID</th>
                <th style={{ padding: "8px 6px" }}>Nombre</th>
                <th style={{ padding: "8px 6px" }}>Email</th>
                <th style={{ padding: "8px 6px" }}>Activo</th>
                <th style={{ padding: "8px 6px" }}>Cuenta</th>
                <th style={{ padding: "8px 6px" }} />
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const tieneCuenta = emailsConCuenta.has(c.email.toLowerCase());
                return (
                  <tr key={c.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: "10px 6px", color: C.muted }}>{c.clienteId}</td>
                    <td style={{ padding: "10px 6px", color: C.ink, fontWeight: 600 }}>{c.nombre}</td>
                    <td style={{ padding: "10px 6px", color: C.muted }}>{c.email}</td>
                    <td style={{ padding: "10px 6px" }}>
                      <span style={{ color: c.activo ? C.pos : C.neg, fontWeight: 600, fontSize: 12 }}>
                        {c.activo ? "Si" : "No"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <span style={{ color: tieneCuenta ? C.pos : C.muted, fontSize: 12 }}>
                        {tieneCuenta ? "Vinculada" : "Sin invitar"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>
                      {!tieneCuenta && <InviteButton email={c.email} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
