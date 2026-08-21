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
- **Rediseño Visual, Etapa V0:** shadcn/ui instalado (componentes propios en
  `src/components/ui/`), paleta navy/dorado sistematizada como tokens reales
  de Tailwind en `globals.css` (antes vivía suelta en `src/lib/theme.ts`,
  usada solo inline). **Ninguna pantalla fue tocada todavía** — eso es
  V1-V4, en curso.

## Qué falta (ver el plan para el detalle etapa por etapa)

En orden: Rediseño Visual V1→V4 (login/errores, navegación, dashboard
cliente, panel admin) → Fase 3 Etapa 2 (Reportes PDF, con
`@react-pdf/renderer`) → Etapa 3 (2FA, Supabase Auth MFA nativo) → Etapa 4
(panel admin sin depender del Excel) → Etapa 5 (notificaciones por email,
bloqueada por el dominio de Resend) → Etapa 6 (marca de agua/HWM, **solo
diseño con ejemplos numéricos antes de programar nada**) → Etapa 7
(integración con broker, solo evaluación) → Etapa 8 (app mobile — **ya
decidido: PWA**, no nativa).

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
