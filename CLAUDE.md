@AGENTS.md

# Portal de Clientes — Fondo Privado

## Qué es esto

App web para un fondo de inversión privado. Cada cliente entra con usuario y
contraseña y ve **solo su propia información** (cuotapartes, valor de su
inversión, evolución histórica, posiciones del fondo). El administrador
mantiene todo actualizado subiendo un Excel — la app nunca lo lee en vivo,
lo valida y lo vuelca a una base de datos real en una transacción.

Ver el diseño completo y las decisiones de arquitectura en
[`docs/portal-clientes-fondo-documento-tecnico.md`](docs/portal-clientes-fondo-documento-tecnico.md).
Instrucciones de setup/deploy/troubleshooting en [`README.md`](README.md) —
léelo antes de tocar el flujo de deploy, tiene varias gotchas ya resueltas.
El roadmap completo de Fase 3 y del rediseño visual (auditoría, etapas,
decisiones) vive en `C:\Users\benja\.claude\plans\cosmic-wishing-cerf.md` —
léelo antes de asumir qué sigue o de reabrir una decisión ya tomada.

## Stack

Next.js 16 (App Router) + Supabase (Postgres + Auth) + Prisma 7 + Recharts +
Zod + ExcelJS + Vitest + **shadcn/ui sobre Tailwind v4**. Todo en un solo
proyecto, desplegado en Vercel.

## Estado actual (ver fecha del ultimo commit para saber si sigue vigente)

- **En producción:** https://app-fondo-comun-weld.vercel.app — funcionando.
- **Datos:** son de PRUEBA — 3 clientes de ejemplo (Juan Perez, Maria
  Gonzalez, Carlos Diaz) del archivo `docs/fondo-archivo-madre-ejemplo.xlsx`,
  mas 10 clientes ficticios (`CLI-T01`..`CLI-T10`, emails `@prueba-carga.test`)
  agregados para probar carga/concurrencia y el modulo de comisiones — todos
  vinculados al mismo "Fondo Principal". El fondo real todavia no tiene
  numeros reales cargados. **A Maria Gonzalez (CLI-0002) ya se le aplico un
  cobro de comision de performance real** (a proposito, queda como ejemplo
  vivo para demos — ver Fase 3 Etapa 6 mas abajo): su valor de inversion
  correcto es ~$214.653 (no ~$224.753, que era el valor pre-cobro).
- **Repo:** https://github.com/benjaminschmittt/App-Fondo-Comun (rama `main`,
  deploy automatico a Vercel en cada push).
- **Credenciales de prueba:**
  - Admin: `benjaminschmittt@gmail.com` / `Fondo1787171927Aa!`
  - Cliente: `juan@ejemplo.com` / `Cliente1787172213Aa!`
  - Segundo admin: `martin.schleicher@gmail.com` — cuenta creada con
    `app_metadata.mfaExempt: true` (ver Fase 3 Etapa 3 mas abajo), invitado
    por email, pendiente de que complete su primer login y ponga contraseña.
- **SMTP:** todavia usa el servicio de email por defecto de Supabase (muy
  limitado, ~2-4 emails/hora). El usuario creo una cuenta en Resend pero
  decidio no verificar un dominio todavia, asi que sigue pendiente — no
  asumas que esta resuelto sin preguntar.
- **Backups de Supabase:** nunca confirmados por el usuario. No asumir que
  estan resueltos antes de sugerir operar con dinero real.

## Qué está hecho

- **Fase 1 (MVP):** login, recuperación de contraseña, dashboard del
  cliente, panel admin (subir Excel, listar clientes, invitar), importador
  transaccional con validación fila por fila, RLS verificado en vivo,
  deploy con CI/CD.
- **Fase 2:** rendimiento del fondo (TWR: mensual/trimestral/acumulado,
  `rendimientoFondo()` en `src/lib/calculos.ts`) + rentabilidad anualizada
  por cliente (TIR/money-weighted por bisección, `tirAnualizada()`).
- **Fase 3, Etapa 0:** 24 tests Vitest (`src/lib/calculos.test.ts`,
  `src/lib/excel/validate.test.ts`), tabla `audit_log` +
  `src/data/audit.ts`, ya aplicado a `invitarCliente`.
- **Fase 3, Etapa 1:** esquema multi-fondo (`Fund`, `ClientFund`, `fund_id`
  en `FundNav`/`FundSnapshot`/`Position`/`ClientMovement`). Migración
  aditiva, todo lo existente migrado a un "Fondo Principal" sembrado
  automáticamente. **La UI todavía NO expone selección de fondo** — el
  dashboard resuelve el fondo default por consulta
  (`getDefaultFundId()` en `src/data/fondo.ts`), nunca un id hardcodeado.
- **Rediseño Visual (V0→V6): completo.** shadcn/ui instalado (componentes
  propios en `src/components/ui/`), tokens reales de Tailwind en
  `globals.css` + espejados en `src/lib/theme.ts` (`CHART_COLORS` y
  formatters — el objeto de color `C` que existía ahí se eliminó, quedó sin
  uso cuando todas las pantallas migraron a clases de Tailwind).
  **Paleta pivotada a mitad de rediseño:** ya no es navy/dorado — es
  **azul noche `#0F172A` + petróleo `#0F766E`** (sin dorado), decidido tras
  revisar referencias reales de wealth management (Addepar, J.P. Morgan
  Private Bank). Los nombres de variable (`--navy`, `--gold` en
  `globals.css`) quedaron como legado del sistema anterior — sus VALORES
  son los nuevos, no te confundas si ves `bg-navy`/`text-gold` en el código.
  Tipografía unificada a Inter (Fraunces descartada).
  Componentes base nuevos en `src/components/`: `MetricCard`, `SectionCard`,
  `DataTable`, `ChartCard`, `StatusBadge`, `EmptyState`, `UploadCard`
  (drag-and-drop), `AdminShell` (sidebar real, `admin-sidebar.tsx`) y
  `ClientTopbar` — reemplazan el `app-header.tsx` viejo (borrado) y las
  cards/tablas caseras duplicadas por pantalla. Login, recuperar,
  actualizar-password, 404, error, spinner, dashboard del cliente y panel
  admin (listado + import Excel) ya están reescritos sobre estos
  componentes. Verificado número por número contra los valores de antes del
  rediseño — ningún cálculo cambió.
- **Fase 3, Etapa 3:** 2FA obligatorio para admin (Supabase Auth MFA/TOTP
  nativo, sin servicio externo). `requireAdmin()` en `src/data/auth.ts`
  chequea el Authenticator Assurance Level: sin factor → `/configurar-2fa`,
  con factor pero sesión sin elevar → `/verificar-2fa`. **Solo admin —
  el login de cliente no tiene 2FA.** La cuenta admin real quedó sin
  ningún factor enrolado a propósito (se probó y se limpió el factor de
  prueba) — el primer login real después de deployar esto va a pedir
  enrolar de cero, con el celular del usuario. Vía de escape si pierde el
  celular: borrar el factor desde el dashboard de Supabase (Authentication
  → Users → el usuario → MFA) o con `supabase.auth.admin.mfa.deleteFactor`
  usando el `service_role`. **Extensión:** `proxy.ts` respeta
  `user.app_metadata?.mfaExempt === true` para eximir cuentas admin
  puntuales del chequeo de AAL (pedido explícito del usuario para la cuenta
  de Martín — nunca un email hardcodeado en el código, es un flag por
  cuenta, seteable solo con la `service_role` key). Usar con criterio.
- **Documentos del fondo:** el admin sube PDFs de respaldo de la cuenta de
  inversión (banco/broker) en `/admin/documentos`; los clientes del mismo
  fondo los ven y descargan en su dashboard vía URL firmada (bucket privado
  `fund-documents` en Supabase Storage, sin políticas RLS de storage —
  toda subida/descarga pasa por el servidor con la `service_role` key). Tabla
  `fund_documents` (solo metadata). No es a nivel cliente, es a nivel fondo.
- **Fase 3, Etapa 6 (comisión de performance / marca de agua): completa**,
  no solo diseñada — schema (`ManagerAccount`, `ClientHighWaterMark`,
  `FeePeriod`, `PerformanceFeeCalculation`, `ShareTransfer`), módulo de
  cálculo puro con 15 tests (`src/lib/comisiones.ts`), capa de datos
  (`src/data/comisiones.ts`) y pantallas admin (`/admin/comisiones`:
  crear período → calcular → aprobar/excluir por cliente → confirmar y
  aplicar, con diálogo de confirmación propio, nunca `confirm()` nativo —
  ver Gotchas). El cobro se paga en cuotapartes, nunca en efectivo, y
  **nunca pasa por `ClientMovement`** (viven en `ShareTransfer`, separado a
  propósito para no corromper `aportesNetos()`/`tirAnualizada()`). Probado
  de punta a punta contra la base real (crear→calcular→aprobar→aplicar→
  idempotencia) y verificado a nivel RLS con roles simulados por SQL.
  **Importante:** `calcularInversion()` en `src/data/inversion.ts` (usada
  por el dashboard del cliente Y por los reportes PDF) resta las
  cuotapartes transferidas por fee — si algún cálculo nuevo de "cuotapartes
  actuales de un cliente" no pasa por ahí o por
  `cuotapartesTransferidasHasta()` en `src/lib/comisiones.ts`, va a mostrar
  el valor de ANTES del cobro (bug real que ya se encontró y corrigió una
  vez, no lo reintroduzcas).
- **Fase 3, Etapa 2 (reportes PDF):** botón "Descargar reporte" en el
  dashboard del cliente (`GET /dashboard/reporte`) y generación individual
  o masiva (ZIP con `jszip`) desde `/admin`, con columna "Último reporte"
  leída de `audit_log` (sin tabla propia). `src/lib/pdf/reporte-cliente.tsx`
  con `@react-pdf/renderer`, reusa `calcularInversion()` — nunca recalcula
  aparte. **v1 es un solo reporte con el historial completo**, no hay
  todavía selector mensual/trimestral/anual (quedó pendiente si se quiere).

## Qué falta (ver el plan para el detalle etapa por etapa)

El rediseño visual (V0→V6), la Etapa 2 (reportes PDF), la Etapa 3 (2FA) y
la Etapa 6 (comisión de performance) ya terminaron. Sigue: Etapa 4 (panel
admin sin depender del Excel — **ver "Etapa 4 intentada y revertida"
abajo antes de reabrirla**) → Etapa 5 (notificaciones por email, bloqueada
por el dominio de Resend) → Etapa 7 (integración con broker, solo
evaluación) → Etapa 8 (app mobile — **ya decidido: PWA**, no nativa).

**Etapa 4 intentada y revertida (2026-08-24):** se implementó un panel
manual (`/admin/clientes|movimientos|posiciones|valuaciones|auditoria`,
CRUD fila por fila) y se probó en producción (creación de cliente y
edición de posición reales, ambas quedaron bien auditadas). Se revirtió
(`git revert`, no `reset`, porque ya estaba pusheado) por una razón de
diseño, no un bug: el importador de Excel hace **reemplazo total** de los
movimientos de un cliente en un fondo cada vez que se reimporta un archivo
que lo menciona (`src/lib/excel/import.ts` — borra todos sus
`ClientMovement` y los recarga solo con lo que trae ese archivo). Un
movimiento cargado a mano por el panel manual **desaparece sin aviso** la
próxima vez que se sube un Excel que toque a ese mismo cliente — las dos
vías de escritura no son compatibles tal como está armado el importador
hoy. Si se retoma esta etapa, hay que resolver esa reconciliación primero
(ej.: que el importador NO borre movimientos que no vinieron de un Excel,
marcándolos con su origen; o aceptar que el panel manual solo cubra
clientes/auditoría, secciones que no compiten con el importador). El
cliente de prueba que quedó cargado en producción de esta prueba
(`CLI-T99`, `test.claude.etapa4@prueba-carga.test`) no se borró — sigue en
la tabla `clients`, sin cuenta de login (nunca se invitó).

Detalle menor pendiente de Etapa 6: no hay tests automatizados (Vitest)
para las funciones que ESCRIBEN en la base (`calcularPeriodo`/
`aplicarPeriodo` en `src/data/comisiones.ts`) — se verificaron a mano
contra la base real una vez y funcionan, pero no hay una suite que corra
sola para detectar una regresión futura. Es la misma política que ya usa
el proyecto para RLS (verificación manual, no automática), no un olvido.

Fuera del roadmap de Fase 3, pendiente para lanzar con un cliente real:
dominio propio (pausado, el usuario lo retoma más tarde) y el dominio de
Resend para desbloquear SMTP real (Etapa 5).

## Reglas de seguridad del proyecto (no romper esto)

1. **El client_id/cliente SIEMPRE se resuelve desde la sesion**, nunca de un
   parametro que venga del navegador (URL, body, query). Ver
   `src/data/auth.ts` — `getCurrentClient()` matchea por email de la sesion
   autenticada de Supabase, verificado con `supabase.auth.getUser()` (no
   `getSession()`, que no revalida contra el servidor). Lo mismo aplica al
   fondo desde Etapa 1: `getDefaultFundId()` se resuelve por consulta,
   **nunca hardcodear un id de fondo en el codigo**.
2. Toda funcion de `src/data/*.ts` y toda Server Action en `src/app/**/actions.ts`
   vuelve a verificar sesion/rol por su cuenta al principio — `proxy.ts` es
   solo la primera linea de defensa, no la unica.
3. Row Level Security esta activo en todas las tablas como segunda capa.
   Verificado activamente contra la base real: un cliente logueado que pide
   todo sin filtrar solo recibe lo suyo, e insertar un movimiento falso da
   403. Solo hay politicas de SELECT — ningun INSERT/UPDATE/DELETE directo
   con la key `authenticated` funciona; todo write-path nuevo tiene que
   seguir pasando por Prisma (rol `postgres`, exento de RLS).
4. El Excel importado SIEMPRE se valida y se recalculan los valores
   derivados (cuotapartes, valor de mercado) en el codigo — nunca se confia
   en una formula del Excel. Ver `src/lib/excel/`.
5. **NUNCA** commitear `.env.local` ni pegar secretos en el codigo.
6. Todo calculo financiero nuevo (o modificado) necesita tests en
   `src/lib/calculos.test.ts` o equivalente — no es opcional, lo pidio el
   usuario explicitamente para Fase 3.

## Gotchas ya resueltos (no los reintroduzcas)

- `src/app/page.tsx` y `requireClient()` en `src/data/auth.ts` miran el rol
  ANTES de redirigir a `/dashboard` — hubo un bug real en produccion donde
  un admin sin cliente vinculado quedaba en loop infinito `/login` ↔
  `/dashboard`. Si tocas estos redirects, probalos con la cuenta admin
  ademas de la de cliente.
- `package.json` corre `prisma generate && next build` (no solo `next build`)
  porque el postinstall automatico de Prisma se bloquea en Vercel.
- **El shadow database de `prisma migrate dev` esta roto de forma
  PERMANENTE para este proyecto** (la migracion de RLS usa `auth.jwt()`,
  que no existe fuera de la base real de Supabase — y el shadow db
  reproduce TODO el historial de migraciones, asi que cualquier `migrate
  dev` posterior falla tambien, para siempre). Toda migracion nueva se
  escribe el `.sql` A MANO (ver `prisma/migrations/*_audit_log` y
  `*_multi_fondo_esquema` como ejemplos de formato/convenciones de
  nombres), y se aplica con `prisma migrate deploy` directo.
- **El tool de Bash de este entorno no tiene salida a los puertos de
  Postgres** (5432/6543) — cualquier comando de Prisma que necesite
  conectarse a la base (`migrate deploy`, etc.) hay que correrlo por
  **PowerShell**, no por Bash. `npx prisma generate` si funciona por Bash
  (no necesita red, solo lee el schema).
- `getFondoData()` en `src/data/fondo.ts` usa `unstable_cache` (no el nuevo
  `'use cache'` — requeriria activar `cacheComponents` en toda la app).
  Se invalida con `updateTag()` (no `revalidateTag` de un solo argumento,
  deprecado en Next 16) apenas se importa un Excel nuevo. Nunca cachear
  datos privados de un cliente especifico.
- La funcion corre en la region `pdx1` (Oregon, ver `vercel.json`) porque
  la base de Supabase esta en `us-west-2` — no cambiarla sin motivo.
- Package `xlsx` de npm tiene CVEs sin parchear — se usa `exceljs`.
- shadcn/ui: el CLI (`npx shadcn@latest`) agrega solo, sin preguntar,
  fuentes/paquetes que no pediste (ej. metio la fuente Geist en
  `layout.tsx` al inicializar) — revisar el diff despues de correr
  `shadcn add` o `shadcn init`, no asumir que solo tocó lo esperado.
- **El servidor de dev (Turbopack) queda con el Prisma Client viejo en
  memoria despues de cualquier cambio de schema** — aunque corras
  `prisma generate`, el proceso YA corriendo no lo recoge (error tipico:
  `Cannot read properties of undefined (reading 'findMany')`). Hay que
  matar TODOS los procesos `node.exe` y borrar `.next/` antes de levantar
  de nuevo — un restart del proceso solo (sin matar todo + borrar `.next`)
  a veces no alcanza.
- **La primera vez que Turbopack compila una ruta que importa una
  dependencia pesada (ej. `@react-pdf/renderer`) puede tardar 10-22
  segundos**, y mientras tanto OTRAS rutas del mismo server pueden
  responder lento o quedarse mostrando el skeleton de carga — no es un
  bug, es el costo de compilacion en frio (una sola vez por dependencia
  nueva, no pasa en produccion). Si una pagina queda "trabada" despues de
  instalar un paquete nuevo, esperar mas antes de asumir que algo se rompio.
- **Los scripts de test standalone (`npx tsx algo.mts`) no pueden importar
  nada que transitivamente traiga `@react-pdf/renderer`** (falla con
  `ERR_PACKAGE_PATH_NOT_EXPORTED` en `@react-pdf/hyphenate` — tsx hace
  interop CJS/ESM distinto a como lo hace Turbopack, que si funciona).
  Tampoco pueden llamar `getFondoData()` (usa `unstable_cache` de
  `next/cache`, necesita el runtime real de Next). Para probar logica que
  depende de estas cosas desde un script, reimplementa la consulta en
  linea (ver ejemplos ya descartados en el historial de commits) o probalo
  contra el servidor de dev real.
- **Para probar Server Actions/data functions que llaman `requireAdmin()`/
  `requireClient()` desde un script** (no se puede simular una sesion real
  de Next sin cookies): hacer una copia de seguridad de
  `src/data/auth.ts`, reemplazarlo temporalmente por un stub que devuelva
  un usuario fijo, correr el script, y restaurar el archivo original
  apenas termine (`git diff --stat src/data/auth.ts` tiene que dar vacio
  al final). Mismo truco para `server-only` si hace falta
  (`node_modules/server-only/index.js` tira siempre — reemplazarlo por
  `module.exports = {}` temporalmente).
- Para conexiones a la base desde un script standalone (no la app),
  `DATABASE_URL` (pooled, 6543) a veces no es alcanzable — usar
  `DIRECT_URL` (5432) en su lugar, seteando `$env:DATABASE_URL` a ese
  valor antes de correr el script por PowerShell.
