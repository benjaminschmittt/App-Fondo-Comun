# Portal de Clientes — Fondo Privado

App web para que los clientes de un fondo de inversion privado vean su
inversion (cuotapartes, valor actual, evolucion historica, posiciones del
fondo), con un panel admin para actualizar todo subiendo un Excel.

Ver el diseño completo en [`docs/portal-clientes-fondo-documento-tecnico.md`](docs/portal-clientes-fondo-documento-tecnico.md).

## Stack

- **Next.js 16** (App Router, TypeScript) — frontend y backend en un solo proyecto.
- **Supabase** — Postgres administrado + Auth (login, recuperacion de contraseña, invitaciones).
- **Prisma 7** — schema, migraciones y acceso a datos tipado (via `@prisma/adapter-pg`).
- **ExcelJS** — lectura del Excel de carga (se eligio sobre el paquete `xlsx` de npm por CVEs sin parchear en esa dependencia).
- **Recharts** — graficos.
- **Zod** — validacion de cada fila del Excel.

## Estructura

```
src/
  app/            rutas (login, dashboard, admin, recuperacion de password)
  components/      componentes compartidos (header)
  data/           Data Access Layer — SIEMPRE resuelve el cliente desde
                  la sesion, nunca desde un parametro del navegador
  lib/
    excel/        parseo, validacion (zod) e importacion transaccional del Excel
    supabase/     clientes de Supabase (browser, server, admin)
    prisma.ts     singleton de Prisma Client
    calculos.ts   calculos financieros puros (cuotapartes, evolucion, etc.)
  proxy.ts        primera linea de defensa: redirige rutas privadas sin sesion
prisma/
  schema.prisma   modelo de datos
  migrations/     historial de migraciones (incluye las politicas de RLS)
docs/
  portal-clientes-fondo-documento-tecnico.md   diseño y decisiones de arquitectura
  fondo-archivo-madre-ejemplo.xlsx              Excel de ejemplo con la estructura esperada
  portal-fondo-prototipo.jsx                    prototipo visual original (referencia de diseño)
```

## Correr localmente

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto de Supabase

En [supabase.com](https://supabase.com), creá un proyecto nuevo (el plan free alcanza).

### 3. Completar `.env.local`

Copiá `.env.example` a `.env.local` y completá:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — en **Project Settings → Data API / API Keys**.
- `DATABASE_URL` — connection string del **Transaction pooler** (puerto 6543), desde el boton **Connect** del dashboard.
- `DIRECT_URL` — connection string del **Session pooler** (puerto 5432). Prisma la necesita para migraciones porque el transaction pooler no soporta prepared statements.

> Si tu red no soporta IPv6, la conexion "directa" clasica (`db.<ref>.supabase.co:5432`) no va a andar — por eso usamos los poolers para ambas variables.

### 4. Aplicar las migraciones

```bash
npx prisma migrate deploy
```

**Importante:** usá `migrate deploy`, no `migrate dev`, para la migracion que agrega las
politicas de Row Level Security (usa `auth.jwt()`, una funcion que solo existe en la
base de datos real de Supabase, no en la shadow database que usa `migrate dev` para
validar). Para agregar migraciones nuevas en el futuro:

```bash
npx prisma migrate dev --create-only --name algun_cambio   # genera el .sql, no lo aplica
# revisar/editar prisma/migrations/<fecha>_algun_cambio/migration.sql si hace falta
npx prisma migrate deploy                                   # aplica sin pasar por la shadow db
```

### 5. Crear el primer usuario admin

No hay UI para esto (a proposito: es una accion sensible). Corré un curl usando la
`service_role` key:

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"TU_EMAIL","password":"UNA_CONTRASEÑA_TEMPORAL","email_confirm":true,"app_metadata":{"role":"admin"}}'
```

El rol vive en `app_metadata` (no lo puede modificar el usuario, solo la `service_role`
key) — ver `src/data/auth.ts`.

### 6. Correr la app

```bash
npm run dev
```

Entrá a `http://localhost:3000/login` con el usuario admin. Desde **Panel Administrador
→ Importar Excel** subís `docs/fondo-archivo-madre-ejemplo.xlsx` para probar el flujo
completo con datos de ejemplo, y desde **Clientes** invitás a los clientes reales
(les manda un email con un link para elegir su contraseña).

## El Excel de carga

Estructura esperada (ver `docs/fondo-archivo-madre-ejemplo.xlsx` y la seccion 5 del
documento tecnico): hojas `valor_cuotaparte`, `posiciones`, `fondo`, `clientes`,
`movimientos`, cada una una tabla plana con encabezados en la fila 1.

El importador (`src/lib/excel/`) valida todo (tipos, fechas, duplicados, referencias
entre hojas, y que los totales declarados coincidan con la suma de posiciones) **antes**
de tocar la base de datos. Si algo esta mal, no se importa nada y se muestra un reporte
fila por fila. Los valores derivables (cuotapartes de cada cliente, valor de su
inversion, valor de mercado de cada posicion) se recalculan siempre en el codigo — el
Excel nunca los declara directamente, para evitar que una formula desactualizada
contamine los datos.

## Seguridad

- El frontend nunca decide que puede ver un usuario. Toda autorizacion se resuelve en
  el servidor a partir de la sesion (`src/data/auth.ts`), nunca de un parametro que
  mande el navegador.
- `proxy.ts` es la primera linea de defensa (redirige rutas privadas sin sesion), pero
  cada funcion del Data Access Layer vuelve a verificar la sesion por su cuenta — asi
  lo recomienda Next.js 16 (ver el aviso en `AGENTS.md` sobre no confiar solo en Proxy).
- Row Level Security esta activo en todas las tablas (`prisma/migrations/..._rls_policies`)
  como segunda capa: aunque hubiera un bug en el codigo, la base de datos fisicamente no
  devuelve filas de otro cliente a una consulta hecha con la `anon`/`authenticated` key.
- Las contraseñas las maneja Supabase Auth (hasheadas), nunca pasan por nuestro codigo
  ni aparecen en el Excel.
- Cada importacion queda auditada en `import_batches` (quien, cuando, cuantas filas,
  resultado).

## Deploy

1. **Base de datos:** ya esta en Supabase, no hay que hacer nada extra ahi.
2. **Vercel:** conectá el repo en [vercel.com/new](https://vercel.com/new). Framework preset "Next.js" (autodetectado).
3. **Variables de entorno en Vercel** (Project Settings → Environment Variables), las mismas de `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`, `DIRECT_URL`
   - `NEXT_PUBLIC_SITE_URL` — la URL publica de produccion (ej. `https://tu-dominio.com`), la usan los emails de invitacion/recuperacion de contraseña.
4. En **Supabase → Authentication → URL Configuration**, agregá la URL de produccion a
   "Redirect URLs" (necesario para que los links de invitacion/recuperacion funcionen).
5. Deploy. Las migraciones NO corren automaticamente en Vercel — corré
   `npx prisma migrate deploy` desde tu maquina (con `DIRECT_URL` apuntando a
   produccion) cada vez que agregues una migracion nueva, antes o despues del deploy.

### Cargar variables de entorno: mejor por CLI que por la web

La UI de Vercel para variables "Sensitive" tiene un problema real: **una vez guardado
un valor, nunca se te vuelve a mostrar** (ni en la web ni con `vercel env pull`), ni
siquiera para editarlo — el campo aparece con un placeholder de ejemplo en gris que es
facil confundir con el valor real. Si algo se pega mal (un paste que corta a la mitad,
o cae en el campo equivocado), no hay forma de notarlo desde la UI hasta que algo falla
en produccion.

Mas confiable: cargarlas por CLI, leyendo directo desde `.env.local` (sin tipear nada
a mano):

```bash
npx vercel login
npx vercel link                  # vincula esta carpeta al proyecto de Vercel

# por cada variable y por cada ambiente (production, preview, development):
printf '%s' "https://tu-proyecto.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production

npx vercel deploy --prod         # redeploy con las variables nuevas
```

### Build falla en Vercel pero funciona local: `prisma generate`

Si el build de Vercel falla sin encontrar el cliente de Prisma (`src/generated/prisma`),
es porque el `postinstall` automatico de Prisma quedo bloqueado por el mecanismo
`allow-scripts` de npm durante `npm install`. Por eso `package.json` corre
`prisma generate` explicitamente como parte del script de `build` (no depende del
postinstall automatico). Si en el futuro cambia el generator o el output path del
schema, este es el primer lugar para revisar.

### Emails (invitaciones, recuperar contraseña)

Por defecto Supabase manda estos emails con un servicio de prueba muy limitado (unos
pocos emails por hora) — anda bien para probar, no para invitar a varios clientes
reales. Antes de usar la app en serio, configurá un SMTP propio en **Supabase →
Authentication → Emails → SMTP Settings** (Resend, SendGrid, Postmark, etc.).

### Backups

Verificá en **Supabase → Project Settings → Backups** que nivel de backup automatico
incluye tu plan actual — en el plan free puede ser limitado o no incluir point-in-time
recovery. Antes de operar con dinero real, vale la pena confirmar esto y evaluar
upgradear el plan si hace falta.

## Fase 2 (fuera del alcance del MVP)

Ver la seccion 11 del documento tecnico: reportes en PDF, 2FA, calculo de rentabilidad
con flujos (TWR), multiples fondos, panel admin con edicion por formularios en vez de
Excel, notificaciones por email.
