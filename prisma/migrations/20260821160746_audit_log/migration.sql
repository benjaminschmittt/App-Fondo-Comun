-- Tabla de auditoria de acciones admin (mas alla de import_batches, que ya
-- audita las importaciones de Excel). Solo el backend (rol "postgres",
-- table owner, exento de RLS) escribe y lee esta tabla.

CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_email" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "entidad_id" TEXT,
    "detalle" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_log_creado_en_idx" ON "audit_log"("creado_en");
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- RLS: igual patron que import_batches. Sin politicas para "authenticated"
-- -> nadie que use la anon/authenticated key puede leer ni escribir aca.
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
