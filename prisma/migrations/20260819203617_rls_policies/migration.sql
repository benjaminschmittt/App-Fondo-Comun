-- Row Level Security: defensa en profundidad.
--
-- El backend (Prisma via connection pooler, rol "postgres") NO esta sujeto
-- a estas politicas: es el "table owner" y Postgres exime a los owners de
-- RLS por defecto. La autorizacion real vive en src/data/auth.ts (server-side,
-- resuelve el cliente desde la sesion). Estas politicas son una segunda capa:
-- si alguna vez se hace una consulta directa desde el navegador usando la
-- anon/authenticated key de Supabase, la base de datos fisicamente no
-- devuelve filas de otro cliente ni permite escrituras.

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fund_nav" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fund_snapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;

-- clients: un usuario autenticado solo puede ver su propia fila
-- (vinculacion por email, igual que en src/data/auth.ts).
CREATE POLICY "clients_select_own" ON "clients"
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower((auth.jwt() ->> 'email')));

-- client_movements: solo los movimientos del cliente vinculado al usuario.
CREATE POLICY "client_movements_select_own" ON "client_movements"
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM "clients"
      WHERE lower(email) = lower((auth.jwt() ->> 'email'))
    )
  );

-- Datos a nivel fondo: iguales para todos los clientes autenticados
-- (no son privados entre clientes, si requieren estar logueado).
CREATE POLICY "fund_nav_select_authenticated" ON "fund_nav"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "fund_snapshot_select_authenticated" ON "fund_snapshot"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "positions_select_authenticated" ON "positions"
  FOR SELECT
  TO authenticated
  USING (true);

-- import_batches: sin politicas para "authenticated" -> nadie que use la
-- anon/authenticated key puede leerlo. Solo el backend (rol "postgres",
-- exento de RLS) escribe y lee esta tabla de auditoria.
