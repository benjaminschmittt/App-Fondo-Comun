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

## Stack

Next.js 16 (App Router) + Supabase (Postgres + Auth) + Prisma 7 + Recharts +
Zod + ExcelJS. Todo en un solo proyecto, desplegado en Vercel.

## Estado actual (ver fecha del ultimo commit para saber si sigue vigente)

- **En producción:** https://app-fondo-comun-weld.vercel.app — funcionando,
  probado de punta a punta (login, dashboard, panel admin, import de Excel,
  RLS verificado contra la base real).
- **Datos:** son de PRUEBA — 3 clientes de ejemplo (Juan Perez, Maria
  Gonzalez, Carlos Diaz) del archivo `docs/fondo-archivo-madre-ejemplo.xlsx`.
  El fondo real todavia no tiene numeros reales cargados.
- **Repo:** https://github.com/benjaminschmittt/App-Fondo-Comun (rama `main`,
  deploy automatico a Vercel en cada push).
- **Credenciales de prueba:**
  - Admin: `benjaminschmittt@gmail.com` / `Fondo1787171927Aa!`
  - Cliente: `juan@ejemplo.com` / `Cliente1787172213Aa!`
- **SMTP:** todavia usa el servicio de email por defecto de Supabase (muy
  limitado, ~2-4 emails/hora). El usuario creo una cuenta en Resend pero
  decidio no verificar un dominio todavia, asi que sigue pendiente — no
  asumas que esta resuelto sin preguntar.

## Reglas de seguridad del proyecto (no romper esto)

1. **El client_id/cliente SIEMPRE se resuelve desde la sesion**, nunca de un
   parametro que venga del navegador (URL, body, query). Ver
   `src/data/auth.ts` — `getCurrentClient()` matchea por email de la sesion
   autenticada de Supabase, verificado con `supabase.auth.getUser()` (no
   `getSession()`, que no revalida contra el servidor).
2. Toda funcion de `src/data/*.ts` y toda Server Action en `src/app/**/actions.ts`
   vuelve a verificar sesion/rol por su cuenta al principio — `proxy.ts` es
   solo la primera linea de defensa, no la unica (asi lo recomienda la
   documentacion de Next.js 16 sobre Data Access Layer).
3. Row Level Security esta activo en todas las tablas
   (`prisma/migrations/*_rls_policies`) como segunda capa. Verificado
   activamente contra la base real: un cliente logueado que pide todo sin
   filtrar solo recibe lo suyo, e insertar un movimiento falso da 403.
4. El Excel importado SIEMPRE se valida y se recalculan los valores
   derivados (cuotapartes, valor de mercado) en el codigo — nunca se confia
   en una formula del Excel. Ver `src/lib/excel/`.
5. **NUNCA** commitear `.env.local` ni pegar secretos en el codigo. Las
   variables de entorno reales estan en Vercel (ver seccion de gotchas en
   el README sobre por que cargarlas por CLI y no por la web).

## Gotchas ya resueltos (no los reintroduzcas)

- `src/app/page.tsx` y `requireClient()` en `src/data/auth.ts` miran el rol
  ANTES de redirigir a `/dashboard` — hubo un bug real en produccion donde
  un admin sin cliente vinculado quedaba en loop infinito `/login` ↔
  `/dashboard`. Si tocas estos redirects, probalos con la cuenta admin
  ademas de la de cliente.
- `package.json` corre `prisma generate && next build` (no solo `next build`)
  porque el postinstall automatico de Prisma se bloquea en Vercel.
- Las migraciones con `auth.jwt()` (las de RLS) rompen `prisma migrate dev`
  por la shadow database — usar `migrate dev --create-only` + `migrate deploy`.
- `getFondoData()` en `src/data/fondo.ts` usa `unstable_cache` (no el nuevo
  `'use cache'` — requeriria activar `cacheComponents` en toda la app,
  cambio mas grande de lo que vale la pena por ahora). Se invalida con
  `updateTag()` (no `revalidateTag` de un solo argumento, deprecado en
  Next 16) apenas se importa un Excel nuevo. Nunca cachear datos privados
  de un cliente especifico (su inversion, sus movimientos).
- La funcion corre en la region `pdx1` (Oregon, ver `vercel.json`) a
  proposito, porque la base de Supabase esta en `us-west-2` — no cambiarla
  sin motivo, agrega latencia cruzando el pais.
- Package `xlsx` de npm tiene CVEs sin parchear — se usa `exceljs` en su
  lugar. No lo cambies de vuelta sin resolver eso.

## Lo que falta (Fase 2, fuera de alcance del MVP a proposito)

Reportes PDF, 2FA, panel admin con edicion por formularios (reemplazando el
Excel), calculo de rentabilidad con flujos (TWR — hoy es rentabilidad
simple), notificaciones automaticas por email, multiples fondos,
integracion con broker, marca de agua, app mobile nativa. Nada de esto esta
empezado — confirmar con el usuario antes de arrancar cualquiera, no es
parte del acuerdo original.
