import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";
import { getFondoData, getDefaultFundId } from "./fondo";
import { calcularInversion } from "./inversion";
import { registrarAuditoria } from "./audit";
import { generarReportePDF } from "@/lib/pdf/reporte-cliente";

// Genera el reporte de UN cliente elegido por el admin. Reusa el mismo
// calculo que getMiInversion() (via calcularInversion) — nunca un
// numero distinto al que el propio cliente vería en su dashboard.
export async function generarReporteClienteAdmin(clientId: string): Promise<{
  nombre: string;
  clienteId: string;
  pdf: Buffer;
}> {
  const user = await requireAdmin();

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error("Cliente no encontrado.");

  const fondo = await getFondoData();
  const data = await calcularInversion(client, fondo);
  const pdf = await generarReportePDF(data, new Date());

  await registrarAuditoria({
    actorId: user.id,
    actorEmail: user.email ?? "",
    accion: "generar_reporte_cliente",
    entidad: "client",
    entidadId: client.id,
    detalle: { nombre: client.nombre, generadoPor: "admin" },
  });

  return { nombre: client.nombre, clienteId: client.clienteId, pdf };
}

// Genera el reporte de TODOS los clientes activos vinculados al fondo
// default, uno por uno (secuencial: son PDFs, no vale la pena paralelizar
// y saturar la conexion a la base para un fondo con pocos clientes).
export async function generarReportesTodosLosClientes(): Promise<
  { nombre: string; clienteId: string; pdf: Buffer }[]
> {
  const user = await requireAdmin();
  const fundId = await getDefaultFundId();
  const fondo = await getFondoData();

  const clientFunds = await prisma.clientFund.findMany({
    where: { fundId },
    select: { clientId: true },
  });
  const clients = await prisma.client.findMany({
    where: { id: { in: clientFunds.map((cf) => cf.clientId) }, activo: true },
    orderBy: { nombre: "asc" },
  });

  const generadoEn = new Date();
  const resultados: { nombre: string; clienteId: string; pdf: Buffer }[] = [];

  for (const client of clients) {
    const data = await calcularInversion(client, fondo);
    const pdf = await generarReportePDF(data, generadoEn);
    resultados.push({ nombre: client.nombre, clienteId: client.clienteId, pdf });
  }

  await registrarAuditoria({
    actorId: user.id,
    actorEmail: user.email ?? "",
    accion: "generar_reportes_masivo",
    entidad: "fund",
    entidadId: fundId,
    detalle: { clientes: resultados.length },
  });

  return resultados;
}

// Fecha del ultimo reporte generado por cliente (para la columna del
// listado admin) — se resuelve consultando audit_log filtrado por tipo
// de accion, sin tabla propia (tal como se diseño en la Etapa 2).
export async function ultimosReportesGenerados(clientIds: string[]): Promise<Map<string, Date>> {
  await requireAdmin();
  if (clientIds.length === 0) return new Map();

  const rows = await prisma.auditLog.findMany({
    where: { accion: "generar_reporte_cliente", entidadId: { in: clientIds } },
    orderBy: { creadoEn: "desc" },
    select: { entidadId: true, creadoEn: true },
  });

  const map = new Map<string, Date>();
  for (const row of rows) {
    if (row.entidadId && !map.has(row.entidadId)) {
      map.set(row.entidadId, row.creadoEn);
    }
  }
  return map;
}
