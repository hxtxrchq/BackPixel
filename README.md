# PixelBros Backend

Backend modular para autenticacion y sesiones del intranet.

## Stack
- Node.js + TypeScript
- Express
- Prisma ORM (PostgreSQL)
- JWT access token + refresh token en cookie httpOnly

## 1) Configuracion
1. Copia `.env.example` a `.env`
2. Ajusta `DATABASE_URL`, secretos JWT y `FRONTEND_ORIGINS`
3. En produccion usa `REFRESH_COOKIE_SECURE=true` y `REFRESH_COOKIE_SAMESITE=none` porque el front y el backend van en dominios distintos

### Supabase cloud (Prisma)
- Usa la cadena de conexion PostgreSQL de Supabase (`DATABASE_URL`).
- La `publishable key` no reemplaza el `DATABASE_URL` para Prisma.
- Recomendado: URL del pooler con `pgbouncer=true&connection_limit=1`.

## 2) Base de datos
```bash
npm run db:migrate
npm run db:seed
```

Para crear usuarios iniciales sin guardar credenciales en `.env`, usa variables temporales al ejecutar seed.

PowerShell (ejemplo):
```powershell
$env:SEED_ADMIN_EMAIL="proyectos@pixelbros.pe"
$env:SEED_ADMIN_PASSWORD="<PASSWORD_SEGURO>"
$env:SEED_ADMIN_NAME="Erika"
npm run db:seed
Remove-Item Env:SEED_ADMIN_EMAIL, Env:SEED_ADMIN_PASSWORD, Env:SEED_ADMIN_NAME
```

## 3) Desarrollo
```bash
npm run dev
```

API base: `http://localhost:4000/api/v1`

## 4) Despliegue en Droplet

1. Clona el repo en tu droplet:
```bash
cd /home/user/pixelbros
git clone <backend-repo-url> backend
cd backend
```

2. Instala dependencias y genera Prisma:
```bash
npm install
npm run db:generate
```

3. Crea el archivo `.env` (NO subes esto a GitHub):
```bash
cp .env.example .env
nano .env
```

Rellena con valores de producción:
```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/pixelbros_db
DIRECT_URL=postgresql://user:pass@host:6543/pixelbros_db
JWT_ACCESS_SECRET=<genera-32-caracteres-seguros>
JWT_REFRESH_SECRET=<genera-32-caracteres-seguros>
REFRESH_COOKIE_SECURE=true
REFRESH_COOKIE_SAMESITE=none
FRONTEND_ORIGINS=https://pixelbros.pe,https://www.pixelbros.pe
```

4. Compila TypeScript:
```bash
npm run build
```

5. Sincroniza DB e inicia:
```bash
npm run db:sync
npm start
# O usa PM2: pm2 start dist/server.js --name "pixelbros-backend"
```

Para despliegue en dominio final, el frontend debe apuntar a `https://backendpixel.chiqo.site/api/v1` mediante `VITE_API_URL`.

Si el frontend vive en `pixelbros.pe` y el backend en `backendpixel.chiqo.site`, las cookies de refresh deben salir con `SameSite=None` y `Secure=true` para que el navegador las envie en las peticiones con `credentials: 'include'`.

## Endpoints de auth
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Usuario admin inicial
El admin inicial se crea por seed solo si envias las variables temporales `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` y `SEED_ADMIN_NAME` al momento de ejecutar el comando.
No se guardan credenciales por defecto en archivos del proyecto.

## Script recomendado para admin unico
Si deseas garantizar un solo administrador global, mantén la creacion solo por `prisma/seed.ts` y deshabilita cualquier endpoint de registro publico.

## Opcion de base de datos gratuita
- Opcion 1: Supabase Postgres (facil, integra auth/db, pero plan free puede pausar).
- Opcion 2: Neon Postgres (serverless y simple para Prisma, muy estable en free tier).
- Opcion 3: Railway (si tienes creditos/promocion activa).

Para tu caso recomiendo Neon + Prisma para evitar friccion y mantener PostgreSQL estandar.
