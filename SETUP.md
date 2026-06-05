# 🚀 Guía de Configuración — Araure Tricentenaria

Esta guía cubre la instalación completa del proyecto desde cero: base de datos en Supabase, variables de entorno, seed y despliegue en Vercel.

---

## Paso 1: Crear Base de Datos en Supabase

1. Ve a **https://supabase.com** y crea una cuenta (plan gratuito suficiente)
2. Crea un **nuevo proyecto** (ej: `censo-araure`)
3. **Guarda tu contraseña** del proyecto — la necesitarás enseguida
4. Espera ~2 minutos a que el proyecto esté listo
5. Ve a **Settings → Database → Connection String → URI**
6. Copia la `Transaction` URL (puerto 6543) y la `Direct Connection` URL (puerto 5432)

---

## Paso 2: Configurar Variables de Entorno

Crea (o edita) el archivo `.env` en la raíz del proyecto:

```env
# ─── Base de Datos ────────────────────────────────────────────
# URL con PgBouncer (para Prisma en producción / Vercel)
DATABASE_URL="postgresql://postgres.[TU-REF]:[TU-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# URL directa (para migraciones y Prisma Studio)
DIRECT_URL="postgresql://postgres.[TU-REF]:[TU-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# ─── Autenticación ────────────────────────────────────────────
# Generar con: openssl rand -base64 32
NEXTAUTH_SECRET="tu-secreto-muy-largo-aqui"
NEXTAUTH_URL="http://localhost:3000"

# ─── Email (opcional) ─────────────────────────────────────────
# Notificaciones al admin cuando se registran familias
# Crear cuenta gratuita en https://resend.com
RESEND_API_KEY=""
ADMIN_EMAIL="tu-email@ejemplo.com"
```

> ⚠️ `DATABASE_URL` usa el puerto **6543** (pooler con PgBouncer)  
> ⚠️ `DIRECT_URL` usa el puerto **5432** (conexión directa para migraciones)

---

## Paso 3: Instalar y Configurar

```bash
# Instalar dependencias
npm install

# Opción A — Todo en un solo comando:
npm run setup
# Equivale a: prisma generate + prisma db push + npm run db:seed

# Opción B — Paso a paso:
npx prisma generate    # Genera el cliente Prisma
npx prisma db push     # Crea las tablas en Supabase
npm run db:seed        # Carga usuarios y datos de prueba
```

---

## Paso 4: Ejecutar en Desarrollo

```bash
npm run dev
```

La app estará en **http://localhost:3000**

Para acceso desde otros dispositivos en la red local:

```bash
npm run public
```

---

## Credenciales de Prueba (tras el seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | `admin@comuna.com` | `admin123` |
| Jefe de Comunidad | `maria.gonzalez@comuna.com` | `jefe123` |
| Jefe de Calle | `juan.perez@comuna.com` | `jefe123` |

---

## Explorar la Base de Datos

```bash
npm run db:studio
# Abre Prisma Studio en http://localhost:5555
```

---

## Deploy en Vercel

### 1. Subir a GitHub

```bash
git add .
git commit -m "deploy inicial"
git push origin main
```

### 2. Conectar en Vercel

1. Ve a **https://vercel.com** → New Project → importa tu repositorio de GitHub
2. En **Environment Variables**, agrega:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | URL de Supabase con pgbouncer (puerto 6543) |
| `DIRECT_URL` | URL directa de Supabase (puerto 5432) |
| `NEXTAUTH_SECRET` | Cadena aleatoria larga (32+ chars) |
| `NEXTAUTH_URL` | `https://TU-PROYECTO.vercel.app` |
| `RESEND_API_KEY` | (Opcional) Tu API key de Resend |
| `ADMIN_EMAIL` | (Opcional) Email del administrador |

3. Haz clic en **Deploy**

> El comando de build (`prisma generate && next build`) está configurado en `package.json` y Vercel lo ejecuta automáticamente.

### 3. Post-deploy: cargar datos iniciales

Tras el primer deploy, ejecuta el seed **una sola vez** desde tu máquina local apuntando a la DB de producción:

```bash
# Asegúrate de que DIRECT_URL apunta a Supabase producción
npm run db:seed
```

---

## Comandos de Referencia

```bash
npm run dev          # Desarrollo en http://0.0.0.0:3000
npm run build        # Build de producción
npm run start        # Inicia servidor de producción
npm run public       # Expone en red local

npm run db:generate  # Genera cliente Prisma
npm run db:push      # Sincroniza esquema → Supabase
npm run db:seed      # Carga datos iniciales
npm run db:studio    # Abre Prisma Studio
npm run setup        # generate + push + seed (todo en uno)
```

---

## Estructura de Variables de Entorno

```env
DATABASE_URL=       # Obligatorio — URL de Supabase con pgbouncer
DIRECT_URL=         # Obligatorio — URL directa de Supabase
NEXTAUTH_SECRET=    # Obligatorio — clave secreta aleatoria
NEXTAUTH_URL=       # Obligatorio — URL pública de la app
RESEND_API_KEY=     # Opcional — notificaciones por email
ADMIN_EMAIL=        # Opcional — destinatario de notificaciones
```
