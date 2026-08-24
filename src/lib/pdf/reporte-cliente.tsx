import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { money, pct, numero, fechaLarga } from "@/lib/theme";
import type { MiInversion } from "@/data/inversion";

// Colores tomados directo de src/app/globals.css (misma paleta que el
// dashboard) — react-pdf no puede leer variables CSS, asi que quedan
// como constantes acá. Si la paleta cambia en globals.css, hay que
// actualizar esto a mano tambien.
const COLORS = {
  navy: "#0f172a",
  petroleo: "#0f766e",
  ink: "#111827",
  muted: "#6b7280",
  border: "#e5e7eb",
  cardBg: "#f8fafc",
  pos: "#15803d",
  neg: "#b91c1c",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: COLORS.ink },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.navy,
    borderBottomStyle: "solid",
  },
  brand: { fontSize: 15, fontFamily: "Helvetica-Bold", color: COLORS.navy },
  brandSub: { fontSize: 8, color: COLORS.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
  metaRight: { alignItems: "flex-end" },
  metaLabel: { fontSize: 8, color: COLORS.muted },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 20,
  },
  summaryGrid: { flexDirection: "row" },
  summaryCard: {
    flex: 1,
    padding: 10,
    marginRight: 10,
    backgroundColor: COLORS.cardBg,
    borderRadius: 4,
  },
  summaryCardLast: { marginRight: 0 },
  summaryLabel: { fontSize: 7, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLORS.navy, marginTop: 4 },
  summarySub: { fontSize: 8, marginTop: 2, color: COLORS.muted },
  table: { marginTop: 4 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    borderBottomStyle: "solid",
    paddingVertical: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.navy,
    borderBottomStyle: "solid",
    paddingBottom: 6,
    marginBottom: 2,
  },
  th: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: COLORS.muted, textTransform: "uppercase" },
  td: { fontSize: 9 },
  colFecha: { width: "25%" },
  colTipo: { width: "25%" },
  colMonto: { width: "25%", textAlign: "right" },
  colCuotapartes: { width: "25%", textAlign: "right" },
  emptyRow: { fontSize: 9, color: COLORS.muted, paddingVertical: 8 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 70,
    fontSize: 7,
    color: COLORS.muted,
    lineHeight: 1.4,
  },
  footerPage: { position: "absolute", bottom: 30, right: 40, fontSize: 7, color: COLORS.muted },
});

// Genera el PDF del estado de cuenta reusando EXACTAMENTE el objeto que
// ya arma getMiInversion() para el dashboard — nunca recalcula nada por
// separado, para que los numeros del PDF y los del dashboard no puedan
// divergir. Ver diseño de la Etapa 2.
export async function generarReportePDF(data: MiInversion, generadoEn: Date): Promise<Buffer> {
  const { mensual, trimestral, acumulado } = data.fondo.rendimiento;

  const doc = (
    <Document title={`Estado de cuenta - ${data.nombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Fondo Privado</Text>
            <Text style={styles.brandSub}>Estado de cuenta</Text>
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLabel}>Cliente</Text>
            <Text style={styles.metaValue}>{data.nombre}</Text>
            <Text style={[styles.metaLabel, { marginTop: 6 }]}>Generado el</Text>
            <Text style={styles.metaValue}>{fechaLarga(generadoEn)}</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Valor de tu inversión</Text>
            <Text style={styles.summaryValue}>{money(data.valorActual)}</Text>
            <Text style={[styles.summarySub, { color: data.resultado >= 0 ? COLORS.pos : COLORS.neg }]}>
              {(data.resultado >= 0 ? "+" : "") + money(data.resultado)} ({pct(data.resultadoPct)})
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Cuotapartes</Text>
            <Text style={styles.summaryValue}>{numero(data.cuotapartes)}</Text>
            <Text style={styles.summarySub}>sobre {numero(data.fondo.cuotapartesTotales, 0)} totales</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Aportes netos</Text>
            <Text style={styles.summaryValue}>{money(data.aportesNetos)}</Text>
            <Text style={styles.summarySub}>capital invertido</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardLast]}>
            <Text style={styles.summaryLabel}>Rentabilidad anualizada (TIR)</Text>
            <Text style={styles.summaryValue}>
              {data.rentabilidadAnualizada != null ? pct(data.rentabilidadAnualizada) : "—"}
            </Text>
            <Text style={styles.summarySub}>desde tu primer aporte</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rendimiento del fondo (TWR)</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Mensual</Text>
            <Text style={styles.summaryValue}>{mensual != null ? pct(mensual) : "—"}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Trimestral</Text>
            <Text style={styles.summaryValue}>{trimestral != null ? pct(trimestral) : "—"}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardLast]}>
            <Text style={styles.summaryLabel}>Acumulado</Text>
            <Text style={styles.summaryValue}>{acumulado != null ? pct(acumulado) : "—"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Tus movimientos</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colFecha]}>Fecha</Text>
            <Text style={[styles.th, styles.colTipo]}>Tipo</Text>
            <Text style={[styles.th, styles.colMonto]}>Monto</Text>
            <Text style={[styles.th, styles.colCuotapartes]}>Cuotapartes</Text>
          </View>
          {data.movimientos.length === 0 ? (
            <Text style={styles.emptyRow}>Todavía no registrás aportes ni retiros.</Text>
          ) : (
            data.movimientos.map((m, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.td, styles.colFecha]}>{fechaLarga(m.fecha)}</Text>
                <Text style={[styles.td, styles.colTipo, { textTransform: "capitalize" }]}>{m.tipo}</Text>
                <Text style={[styles.td, styles.colMonto]}>{money(m.monto)}</Text>
                <Text style={[styles.td, styles.colCuotapartes]}>{numero(m.cuotapartes)}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer} fixed>
          El rendimiento del fondo es Time-Weighted Return (TWR): no lo afectan tus aportes/retiros. Tu
          rentabilidad anualizada (TIR) sí considera cuándo aportaste cada peso. Ninguno constituye
          asesoramiento financiero. Documento generado automáticamente, de uso informativo.
        </Text>
        <Text
          style={styles.footerPage}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
