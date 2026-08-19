"use client";

import { useActionState } from "react";
import { subirExcel, type UploadState } from "./actions";
import { C } from "@/lib/theme";

const initialState: UploadState = undefined;

export function UploadForm() {
  const [state, formAction, pending] = useActionState(subirExcel, initialState);

  return (
    <div>
      <form action={formAction}>
        <div className="mb-4">
          <label style={{ fontSize: 12, fontWeight: 600, color: C.ink, display: "block", marginBottom: 6 }}>
            Archivo Excel (.xlsx)
          </label>
          <input type="file" name="archivo" accept=".xlsx" required style={{ fontSize: 13.5 }} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg"
          style={{
            background: C.navy,
            color: "#fff",
            padding: "10px 20px",
            fontWeight: 600,
            fontSize: 14,
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Procesando..." : "Importar"}
        </button>
      </form>

      {state && !state.ok && (
        <div className="mt-5">
          <div
            className="rounded-lg px-4 py-3 mb-3"
            style={{ background: "#fef2f2", color: C.neg, fontSize: 13.5, fontWeight: 600 }}
          >
            Se encontraron {state.errors.length} error(es). No se modifico la base de datos.
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: C.muted, textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>
                  <th style={{ padding: "6px" }}>Hoja</th>
                  <th style={{ padding: "6px" }}>Fila</th>
                  <th style={{ padding: "6px" }}>Columna</th>
                  <th style={{ padding: "6px" }}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {state.errors.map((e, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td style={{ padding: "6px" }}>{e.hoja}</td>
                    <td style={{ padding: "6px" }}>{e.fila || "-"}</td>
                    <td style={{ padding: "6px" }}>{e.columna ?? "-"}</td>
                    <td style={{ padding: "6px" }}>{e.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state?.ok && (
        <div className="rounded-lg px-4 py-3 mt-5" style={{ background: "#ecfdf5", color: C.pos, fontSize: 13.5 }}>
          Importacion exitosa: {state.resumen.clientes} clientes, {state.resumen.historicoCuotaparte} fechas de
          cuotaparte, {state.resumen.posiciones} posiciones, {state.resumen.movimientos} movimientos.
        </div>
      )}
    </div>
  );
}
