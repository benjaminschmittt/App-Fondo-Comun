-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('aporte', 'retiro');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('ok', 'error');

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_nav" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "valor_cuotaparte" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "fund_nav_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_snapshot" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "valor_total_fondo" DECIMAL(18,2) NOT NULL,
    "cuotapartes_totales" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "fund_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "ticker" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo_instrumento" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "cantidad" DECIMAL(18,4) NOT NULL,
    "precio" DECIMAL(18,4) NOT NULL,
    "valor_mercado" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_movements" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "MovementType" NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "client_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "archivo_nombre" TEXT NOT NULL,
    "importado_por_id" UUID NOT NULL,
    "importado_por_email" TEXT NOT NULL,
    "importado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filas_procesadas" INTEGER NOT NULL,
    "estado" "ImportStatus" NOT NULL,
    "detalle" JSONB,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_cliente_id_key" ON "clients"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fund_nav_fecha_key" ON "fund_nav"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "fund_snapshot_fecha_key" ON "fund_snapshot"("fecha");

-- CreateIndex
CREATE INDEX "positions_fecha_idx" ON "positions"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "positions_fecha_ticker_key" ON "positions"("fecha", "ticker");

-- CreateIndex
CREATE INDEX "client_movements_client_id_fecha_idx" ON "client_movements"("client_id", "fecha");

-- AddForeignKey
ALTER TABLE "client_movements" ADD CONSTRAINT "client_movements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
