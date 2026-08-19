import path from "node:path";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js carga ".env.local" automaticamente; hacemos lo mismo aca
// para que la CLI de Prisma use las mismas variables que la app.
config({ path: path.join(import.meta.dirname, ".env.local") });

// La CLI de Prisma (migrate, studio, etc.) usa la conexion DIRECTA
// (puerto 5432, sin pgbouncer). La app en runtime usa DATABASE_URL
// (pooled) desde src/lib/prisma.ts, no desde este archivo.
export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(import.meta.dirname, "prisma", "migrations"),
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
