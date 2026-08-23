-- Comision de performance con marca de agua (high-water mark). Solo
-- tablas nuevas: cero cambios a tablas existentes. El DDL de abajo salio
-- de "prisma migrate diff" contra la base real (no a mano), asi que el
-- SQL generado por Prisma coincide con este archivo. Ver el diseño
-- financiero completo (metodologia, casos especiales, ejemplos
-- numericos) en la conversacion de diseño de este modulo.

-- CreateEnum
CREATE TYPE "FeePeriodStatus" AS ENUM ('draft', 'calculated', 'applied', 'cancelled');

-- CreateEnum
CREATE TYPE "FeeCalculationStatus" AS ENUM ('draft', 'approved', 'skipped', 'applied');

-- CreateEnum
CREATE TYPE "ShareTransferType" AS ENUM ('performance_fee');

-- CreateTable
CREATE TABLE "manager_accounts" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT 'Gestor del fondo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_high_water_marks" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "high_water_mark_value" DECIMAL(18,2) NOT NULL,
    "high_water_mark_date" DATE NOT NULL,
    "high_water_mark_nav" DECIMAL(18,6) NOT NULL,
    "shares_at_hwm" DECIMAL(18,6) NOT NULL,
    "last_fee_period_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_high_water_marks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_periods" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "fee_rate" DECIMAL(5,4) NOT NULL,
    "status" "FeePeriodStatus" NOT NULL DEFAULT 'draft',
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "fee_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_fee_calculations" (
    "id" UUID NOT NULL,
    "fee_period_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "status" "FeeCalculationStatus" NOT NULL DEFAULT 'draft',
    "client_shares_before" DECIMAL(18,6) NOT NULL,
    "current_value" DECIMAL(18,2) NOT NULL,
    "previous_high_water_mark" DECIMAL(18,2) NOT NULL,
    "adjusted_high_water_mark" DECIMAL(18,2) NOT NULL,
    "gain_above_hwm" DECIMAL(18,2) NOT NULL,
    "fee_rate" DECIMAL(5,4) NOT NULL,
    "fee_amount" DECIMAL(18,2) NOT NULL,
    "nav_per_share" DECIMAL(18,6) NOT NULL,
    "shares_to_transfer" DECIMAL(18,6) NOT NULL,
    "client_shares_after" DECIMAL(18,6) NOT NULL,
    "manager_shares_before" DECIMAL(18,6) NOT NULL,
    "manager_shares_after" DECIMAL(18,6) NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "applied_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "performance_fee_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_transfers" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "manager_account_id" UUID NOT NULL,
    "shares" DECIMAL(18,6) NOT NULL,
    "nav_per_share" DECIMAL(18,6) NOT NULL,
    "money_equivalent" DECIMAL(18,2) NOT NULL,
    "transfer_type" "ShareTransferType" NOT NULL DEFAULT 'performance_fee',
    "fee_calculation_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manager_accounts_fund_id_key" ON "manager_accounts"("fund_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_high_water_marks_client_id_fund_id_key" ON "client_high_water_marks"("client_id", "fund_id");

-- CreateIndex
CREATE UNIQUE INDEX "performance_fee_calculations_fee_period_id_client_id_key" ON "performance_fee_calculations"("fee_period_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_transfers_fee_calculation_id_key" ON "share_transfers"("fee_calculation_id");

-- CreateIndex
CREATE INDEX "share_transfers_client_id_created_at_idx" ON "share_transfers"("client_id", "created_at");

-- CreateIndex
CREATE INDEX "share_transfers_fund_id_created_at_idx" ON "share_transfers"("fund_id", "created_at");

-- AddForeignKey
ALTER TABLE "manager_accounts" ADD CONSTRAINT "manager_accounts_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_high_water_marks" ADD CONSTRAINT "client_high_water_marks_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_high_water_marks" ADD CONSTRAINT "client_high_water_marks_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_high_water_marks" ADD CONSTRAINT "client_high_water_marks_last_fee_period_id_fkey" FOREIGN KEY ("last_fee_period_id") REFERENCES "fee_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_periods" ADD CONSTRAINT "fee_periods_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_fee_calculations" ADD CONSTRAINT "performance_fee_calculations_fee_period_id_fkey" FOREIGN KEY ("fee_period_id") REFERENCES "fee_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_fee_calculations" ADD CONSTRAINT "performance_fee_calculations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_fee_calculations" ADD CONSTRAINT "performance_fee_calculations_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_transfers" ADD CONSTRAINT "share_transfers_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_transfers" ADD CONSTRAINT "share_transfers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_transfers" ADD CONSTRAINT "share_transfers_manager_account_id_fkey" FOREIGN KEY ("manager_account_id") REFERENCES "manager_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_transfers" ADD CONSTRAINT "share_transfers_fee_calculation_id_fkey" FOREIGN KEY ("fee_calculation_id") REFERENCES "performance_fee_calculations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- Seed: cuenta del gestor para el fondo default (el mismo que resuelve
-- getDefaultFundId() — primero activo, mas antiguo). Sin esto, el
-- primer periodo de comision que se cree no tendria a donde transferir
-- las cuotapartes cobradas.
-- ============================================================
INSERT INTO "manager_accounts" ("id", "fund_id", "nombre")
SELECT gen_random_uuid(), "id", 'Gestor del fondo'
FROM "funds"
WHERE "activo" = true
ORDER BY "created_at" ASC
LIMIT 1;

-- ============================================================
-- RLS: defensa en profundidad, mismo patron que el resto del proyecto.
-- ============================================================

-- manager_accounts, client_high_water_marks, fee_periods y
-- performance_fee_calculations son trabajo interno del admin (borradores
-- de calculo, marca de agua, cuenta del gestor) — el cliente NUNCA debe
-- verlos. Sin politicas para "authenticated" -> la anon/authenticated
-- key no puede leerlos (mismo patron que audit_log/import_batches).
ALTER TABLE "manager_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_high_water_marks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fee_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "performance_fee_calculations" ENABLE ROW LEVEL SECURITY;

-- share_transfers: unica tabla de este modulo que el cliente SI puede
-- leer (para mostrar sus cobros de fee en el dashboard) — misma politica
-- que client_movements_select_own.
ALTER TABLE "share_transfers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_transfers_select_own" ON "share_transfers"
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM "clients"
      WHERE lower(email) = lower((auth.jwt() ->> 'email'))
    )
  );
