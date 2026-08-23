-- Documentos de respaldo (PDFs de la cuenta de inversion en el
-- banco/broker) a nivel fondo. El admin sube, todos los clientes de ese
-- fondo ven/descargan. El archivo vive en Supabase Storage (bucket
-- privado "fund-documents"); esta tabla es solo metadata.

CREATE TABLE "fund_documents" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "tamanio_bytes" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "subido_por_id" UUID NOT NULL,
    "subido_por_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fund_documents_fund_id_created_at_idx" ON "fund_documents"("fund_id", "created_at");

ALTER TABLE "fund_documents" ADD CONSTRAINT "fund_documents_fund_id_fkey"
    FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: solo el backend (rol "postgres", exento) escribe/borra. Los
-- clientes autenticados solo pueden leer metadata de documentos de un
-- fondo al que pertenecen (via client_funds, poblado en cada import de
-- Excel que tenga movimientos de ese cliente en ese fondo — ver
-- src/lib/excel/import.ts).
ALTER TABLE "fund_documents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fund_documents_select_own_fund" ON "fund_documents"
  FOR SELECT
  TO authenticated
  USING (
    fund_id IN (
      SELECT cf.fund_id FROM "client_funds" cf
      JOIN "clients" c ON c.id = cf.client_id
      WHERE lower(c.email) = lower((auth.jwt() ->> 'email'))
    )
  );

-- Bucket privado en Supabase Storage para los archivos. Sin politicas de
-- storage.objects a proposito: tanto la subida (admin) como la descarga
-- (URL firmada) se hacen siempre desde el servidor con la service_role
-- key, que bypassea RLS de storage. Nadie accede al archivo con la
-- anon/authenticated key directamente.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fund-documents', 'fund-documents', false, 15728640, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
