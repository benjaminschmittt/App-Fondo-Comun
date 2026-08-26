// Watcher local: mira un archivo Excel en disco y, apenas cambia, lo
// sube a /api/importar-auto para que la app quede al dia sola, sin
// entrar al panel admin a subirlo a mano. Ver el plan de "Auto-sync del
// Excel" y la seccion correspondiente del README para el setup.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import chokidar from "chokidar";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const FILE_PATH = process.env.AUTO_IMPORT_FILE_PATH;
const URL = process.env.AUTO_IMPORT_URL;
const SECRET = process.env.AUTO_IMPORT_SECRET;

if (!FILE_PATH || !URL || !SECRET) {
  console.error(
    "Faltan variables en .env.local: AUTO_IMPORT_FILE_PATH, AUTO_IMPORT_URL, AUTO_IMPORT_SECRET"
  );
  process.exit(1);
}

let subiendo = false;

async function subir() {
  if (subiendo) return;
  subiendo = true;
  const hora = new Date().toLocaleTimeString("es-AR");
  try {
    const buffer = readFileSync(FILE_PATH);
    console.log(`[${hora}] Cambio detectado, subiendo ${basename(FILE_PATH)}...`);

    const res = await fetch(URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SECRET}`,
        "X-File-Name": basename(FILE_PATH),
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      console.error(`  Respuesta inesperada del servidor (status ${res.status}).`);
      return;
    }

    if (data.ok) {
      const r = data.resumen;
      console.log(
        `  OK — ${r.clientes} clientes, ${r.movimientos} movimientos, ${r.posiciones} posiciones, ${r.historicoCuotaparte} valuaciones.`
      );
    } else {
      console.error(`  ERROR de importación:`, data.errors ?? data.error);
    }
  } catch (e) {
    console.error(`  No se pudo subir el archivo:`, e instanceof Error ? e.message : e);
  } finally {
    subiendo = false;
  }
}

console.log(`Mirando cambios en ${FILE_PATH}...`);
console.log(`Destino: ${URL}`);

// awaitWriteFinish evita disparar mientras Excel/OneDrive todavia estan
// escribiendo el archivo. Se escuchan "change" y "add" porque OneDrive a
// veces reemplaza el archivo entero al sincronizar en vez de escribirlo
// in situ, y eso puede verse como un alta nueva en vez de un cambio.
chokidar
  .watch(FILE_PATH, {
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
  })
  .on("change", subir)
  .on("add", subir)
  .on("error", (err) => console.error("Error del watcher:", err));
