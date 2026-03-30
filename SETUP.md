# 🚀 Guía de Configuración - Comuna Araure Tricentenaria

## Paso 1: Crear Base de Datos en Supabase (GRATIS)

1. Ve a **https://supabase.com** y crea una cuenta (gratis)
2. Crea un **nuevo proyecto** (pon el nombre que quieras, ej: "censo-araure")
3. **Apunta tu contraseña** — la necesitarás en el siguiente paso
4. Espera a que el proyecto se cree (~2 minutos)
5. Ve a **Settings** → **Database** → **Connection String** → **URI**
6. Copia la URL y reemplaza `[YOUR-PASSWORD]` con tu contraseña

## Paso 2: Configurar el Archivo .env

Abre el archivo `.env` en la raíz del proyecto y reemplaza las URLs:

```env
DATABASE_URL="postgresql://postgres.[TU-REF]:tu-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[TU-REF]:tu-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

> ⚠️ La URL de `DATABASE_URL` usa el puerto **6543** (con pgbouncer)
> ⚠️ La URL de `DIRECT_URL` usa el puerto **5432** (conexión directa)

## Paso 3: Instalar y Configurar

```bash
# Instalar dependencias
npm install

# Generar el cliente de Prisma
npx prisma generate

# Crear las tablas en Supabase
npx prisma db push

# Cargar datos de prueba
npm run db:seed
```

## Paso 4: Ejecutar

```bash
npm run dev
```

La app estará en **http://localhost:3000**

## Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@comuna.com | admin123 |
| Jefe Comunidad | maria.gonzalez@comuna.com | jefe123 |
| Jefe de Calle | juan.perez@comuna.com | jefe123 |

## Deploy en Vercel (GRATIS)

1. Sube el proyecto a GitHub
2. Ve a **https://vercel.com** y conecta tu repo
3. Agrega las variables de entorno (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
4. Deploy!
