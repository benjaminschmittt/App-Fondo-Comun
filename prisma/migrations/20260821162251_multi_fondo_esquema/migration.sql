-- Fase 3, Etapa 1: esquema multi-fondo.
--
-- Aditiva, no borra ni renombra nada: agrega la tabla "funds" y una
-- columna fund_id (NOT NULL) a fund_nav/fund_snapshot/positions/
-- client_movements, con TODO lo existente migrado a un fondo default
-- sembrado aca mismo. La UI todavia no expone seleccion de fondo — el
-- dashboard sigue mostrando "el" fondo (el default) exactamente igual
-- que antes de esta migracion.

-- ============================================================
-- 1. Tabla funds + fondo default
-- ============================================================

CREATE TABLE "funds" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- Id fijo (no generado) para poder referenciarlo en el resto de esta
-- misma migracion sin necesitar PL/pgSQL.
INSERT INTO "funds" ("id", "nombre", "descripcion")
VALUES (
    '5759ee00-fcec-40ca-89ee-21e3dc550298',
    'Fondo Principal',
    'Fondo sembrado automaticamente al migrar el esquema a multi-fondo. Contiene todos los datos que existian antes de esta migracion.'
);

-- ============================================================
-- 2. client_funds (cliente <-> fondo, many-to-many)
-- ============================================================

CREATE TABLE "client_funds" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_funds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_funds_client_id_fund_id_key" ON "client_funds"("client_id", "fund_id");

ALTER TABLE "client_funds" ADD CONSTRAINT "client_funds_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_funds" ADD CONSTRAINT "client_funds_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada cliente existente queda vinculado al fondo default.
INSERT INTO "client_funds" ("id", "client_id", "fund_id")
SELECT gen_random_uuid(), "id", '5759ee00-fcec-40ca-89ee-21e3dc550298' FROM "clients";

-- ============================================================
-- 3. fund_nav: agregar fund_id
-- ============================================================

ALTER TABLE "fund_nav" ADD COLUMN "fund_id" UUID;
UPDATE "fund_nav" SET "fund_id" = '5759ee00-fcec-40ca-89ee-21e3dc550298';
ALTER TABLE "fund_nav" ALTER COLUMN "fund_id" SET NOT NULL;

DROP INDEX "fund_nav_fecha_key";
CREATE UNIQUE INDEX "fund_nav_fund_id_fecha_key" ON "fund_nav"("fund_id", "fecha");

ALTER TABLE "fund_nav" ADD CONSTRAINT "fund_nav_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 4. fund_snapshot: agregar fund_id
-- ============================================================

ALTER TABLE "fund_snapshot" ADD COLUMN "fund_id" UUID;
UPDATE "fund_snapshot" SET "fund_id" = '5759ee00-fcec-40ca-89ee-21e3dc550298';
ALTER TABLE "fund_snapshot" ALTER COLUMN "fund_id" SET NOT NULL;

DROP INDEX "fund_snapshot_fecha_key";
CREATE UNIQUE INDEX "fund_snapshot_fund_id_fecha_key" ON "fund_snapshot"("fund_id", "fecha");

ALTER TABLE "fund_snapshot" ADD CONSTRAINT "fund_snapshot_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 5. positions: agregar fund_id
-- ============================================================

ALTER TABLE "positions" ADD COLUMN "fund_id" UUID;
UPDATE "positions" SET "fund_id" = '5759ee00-fcec-40ca-89ee-21e3dc550298';
ALTER TABLE "positions" ALTER COLUMN "fund_id" SET NOT NULL;

DROP INDEX "positions_fecha_idx";
DROP INDEX "positions_fecha_ticker_key";
CREATE INDEX "positions_fund_id_fecha_idx" ON "positions"("fund_id", "fecha");
CREATE UNIQUE INDEX "positions_fund_id_fecha_ticker_key" ON "positions"("fund_id", "fecha", "ticker");

ALTER TABLE "positions" ADD CONSTRAINT "positions_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 6. client_movements: agregar fund_id
-- ============================================================

ALTER TABLE "client_movements" ADD COLUMN "fund_id" UUID;
UPDATE "client_movements" SET "fund_id" = '5759ee00-fcec-40ca-89ee-21e3dc550298';
ALTER TABLE "client_movements" ALTER COLUMN "fund_id" SET NOT NULL;

CREATE INDEX "client_movements_fund_id_fecha_idx" ON "client_movements"("fund_id", "fecha");

ALTER TABLE "client_movements" ADD CONSTRAINT "client_movements_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 7. RLS
-- ============================================================
-- funds y client_funds: mismo patron que el resto — RLS activo, sin
-- politicas para "authenticated" todavia (nadie las consulta desde el
-- cliente hasta que exista UI multi-fondo). fund_nav/fund_snapshot/
-- positions ya tenian politicas "USING (true)" para authenticated y
-- siguen funcionando igual (agregar una columna no las invalida).

ALTER TABLE "funds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_funds" ENABLE ROW LEVEL SECURITY;
