# 🏛️ Araure Tricentenaria — Sistema de Censo Comunal

Sistema web completo para el registro y gestión del censo comunal de la **Escuela Araure Tricentenaria**, con módulos de demografía, salud, reportes estadísticos y control de acceso por roles.

> 🌐 **Producción:** [https://araure-tricentenaria.vercel.app](https://araure-tricentenaria.vercel.app)

---

## 🚀 Inicio Rápido

### Requisitos
- **Node.js** v18+ (recomendado v20+): [Descargar](https://nodejs.org/)
- Una base de datos **PostgreSQL** — se recomienda [Supabase](https://supabase.com) (gratuito)

### Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (ver SETUP.md)
cp .env.example .env
# → edita .env con tus credenciales

# 3. Crear tablas, generar cliente Prisma y cargar datos iniciales
npm run setup

# 4. Iniciar servidor de desarrollo
npm run dev
```

Abre **http://localhost:3000** en tu navegador.

---

## 📋 Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Administrador** | `admin@comuna.com` | `admin123` |
| **Jefe de Comunidad** | `maria.gonzalez@comuna.com` | `jefe123` |
| **Jefe de Calle** | `juan.perez@comuna.com` | `jefe123` |

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | **Next.js 14** (App Router) |
| Autenticación | **NextAuth.js v4** (JWT + Credentials) |
| Base de datos | **PostgreSQL** vía [Supabase](https://supabase.com) |
| ORM | **Prisma v5** |
| Estilos | **Tailwind CSS v3** |
| Validación | **Zod** |
| Gráficos | **Chart.js** + `react-chartjs-2` |
| Fetching | **SWR** |
| Iconos | **react-icons** (Feather Icons) |
| Notificaciones | **react-hot-toast** |
| Exportación | **jsPDF** + **html2canvas** |
| Email | **Resend** (opcional) |

---

## 📁 Estructura del Proyecto

```
├── prisma/
│   ├── schema.prisma           # Esquema de base de datos (PostgreSQL)
│   └── seed.ts                 # Datos iniciales (usuarios, comunidades, calles)
├── src/
│   ├── app/
│   │   ├── api/                # API Routes (backend serverless)
│   │   │   ├── auth/           # NextAuth endpoints
│   │   │   ├── calles/         # CRUD calles
│   │   │   ├── comunidades/    # CRUD comunidades
│   │   │   ├── demografia/     # Reportes demográficos (pirámide poblacional)
│   │   │   ├── enfermedades/   # Catálogo de enfermedades (solo Admin)
│   │   │   ├── estadisticas/   # Estadísticas globales del censo
│   │   │   ├── export/         # Exportación de datos en CSV
│   │   │   ├── familias/       # CRUD familias + personas + salud (normalizado)
│   │   │   │   └── aprobacion/ # Flujo de aprobación de censos
│   │   │   ├── health/         # Health check de la aplicación
│   │   │   ├── locales-comerciales/ # CRUD locales comerciales
│   │   │   ├── medicamentos/   # Catálogo de medicamentos (solo Admin)
│   │   │   ├── salud/          # CRUD registros de salud + reportes BI
│   │   │   │   └── reportes/   # Reportes BI: enfermedades, demanda de medicamentos
│   │   │   └── users/          # Gestión de usuarios
│   │   ├── dashboard/          # Páginas del panel de Admin y Jefe de Comunidad
│   │   │   ├── page.tsx        # Dashboard principal con estadísticas y gráficos
│   │   │   ├── aprobaciones/   # Flujo de aprobación de familias censadas
│   │   │   ├── calles/         # Gestión de calles
│   │   │   ├── comunidades/    # Gestión de comunidades
│   │   │   ├── familias/       # Lista completa de familias (con desactivar/eliminar)
│   │   │   ├── jefes-calle/    # Gestión de usuarios (Jefes de Calle y Comunidad)
│   │   │   ├── reportes/       # Reportes consolidados: Censo, Demografía y Salud
│   │   │   └── salud/
│   │   │       ├── enfermedades/ # Catálogo de enfermedades (CRUD)
│   │   │       └── medicamentos/ # Catálogo de medicamentos (CRUD)
│   │   ├── login/              # Página de autenticación
│   │   └── mi-calle/           # Panel del Jefe de Calle
│   │       ├── page.tsx        # Dashboard personal con estadísticas de sus calles
│   │       ├── censar/         # Formulario de censo completo (2 pasos + salud integrada)
│   │       └── familias/       # Lista de familias de sus calles asignadas
│   ├── components/
│   │   ├── DashboardLayout.tsx # Layout general con sidebar + header
│   │   ├── Header.tsx          # Barra superior con menú de usuario
│   │   └── Sidebar.tsx         # Navegación lateral adaptada por rol
│   ├── lib/
│   │   ├── api.ts              # Helper fetch autenticado
│   │   ├── auth.ts             # Configuración NextAuth (authOptions)
│   │   ├── email.ts            # Servicio de notificaciones via Resend
│   │   ├── familia-list-scope.ts # Construcción de filtros WHERE según rol
│   │   ├── prisma.ts           # Singleton del cliente Prisma
│   │   ├── rate-limit-auth.ts  # Rate limiting en login
│   │   ├── swr-fetcher.ts      # Fetcher global de SWR
│   │   ├── types.ts            # Tipos TypeScript globales
│   │   └── validations/        # Esquemas Zod de validación (familia, persona, salud)
│   └── middleware.ts           # Protección de rutas por sesión y rol
└── .env                        # Variables de entorno (no se sube al repo)
```

---

## 👤 Roles y Permisos

### 🛡️ Administrador (`ADMIN`)
- Panel completo con estadísticas globales y gráficos de toda la comuna
- **Gestión de Usuarios**: crear, editar y activar/desactivar Jefes de Calle y Comunidad
- **Gestión de Comunidades y Calles**: CRUD completo
- **Familias Censadas**: ver, editar, desactivar y **eliminar permanentemente** (solo Admin)
- **Aprobaciones**: aprobar o rechazar censos enviados por los jefes de calle
- **Catálogos de Salud**: gestionar enfermedades y medicamentos del sistema
- **Reportes consolidados** (3 pestañas): Censo General, Demografía y Salud BI
- **Notificaciones por email** cuando se registran o modifican familias

### 🏘️ Jefe de Comunidad (`JEFE_COMUNIDAD`)
- Dashboard con estadísticas de su comunidad asignada
- Visualización de calles y familias de su comunidad
- **Desactivar** familias (sin eliminación permanente)
- Acceso a reportes filtrados por su comunidad

### 📋 Jefe de Calle (`JEFE_CALLE`)
- Dashboard personal con estadísticas de sus calles asignadas
- **Censar familias**: formulario de 2 pasos con datos de vivienda, grupo familiar y subformularios de salud integrados para cada miembro
- **Mis Familias**: ver, editar y desactivar familias de sus calles
- Editar censos existentes

---

## 📊 Datos del Censo

El formulario de censo captura información estructurada en módulos:

### Vivienda
- Dirección, número de casa, tipo (Casa/Apartamento/Rancho…)
- Tenencia (Propia/Alquilada/Prestada…)
- Material de construcción, número de habitaciones y baños
- Observaciones

### Servicios Básicos
- Agua, Electricidad, Gas, Internet, Aseo Urbano, Telefonía

### Jefe de Familia
- Datos personales completos: nombre, cédula, nacionalidad, fecha de nacimiento, género, estado civil
- Contacto: teléfono, email
- Ocupación, lugar de trabajo, escolaridad
- Condición: pensionado, discapacidad (tipo), embarazada, lactancia
- Registro electoral: es votante, vota en la Escuela Tricentenaria, centro de votación
- **Subformulario de Salud**: diagnósticos con enfermedad, medicamento, dosis, frecuencia, cantidad/mes, severidad

### Miembros del Hogar
- Mismos campos que el jefe (adaptados: parentesco en lugar de contacto)
- **Subformulario de Salud** individual para cada miembro

### Programas Sociales y Economía
- Carnet de la Patria (con código), Recibe CLAP
- Ingreso familiar estimado, otros beneficios sociales

---

## 🗄️ Modelo de Datos

```
User          → Roles: ADMIN | JEFE_COMUNIDAD | JEFE_CALLE
Comunidad     → N Calles
Calle         → N Familias, N LocalesComerciales, 1 JefeCalle
Familia       → 1 Vivienda, N Personas, 1 ProgramaSocial
               Estado: PENDIENTE | APROBADA | RECHAZADA, activo: Boolean
Vivienda      → N ServiciosVivienda (AGUA | ELECTRICIDAD | GAS | INTERNET | ASEO | TELEFONO)
Persona       → (esJefe o miembro), N RegistrosSalud
RegistroSalud → 1 Enfermedad, 1? Medicamento
Enfermedad    → Catálogo con tipo y descripción
Medicamento   → Catálogo con principio activo, presentación, unidad
LocalComercial → activo: Boolean
```

---

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/familias` | CRUD de familias (con salud y personas). DELETE solo Admin |
| GET/PUT | `/api/familias/aprobacion` | Aprobar/rechazar censos |
| GET | `/api/familias/aprobacion/count` | Contador de censos pendientes |
| GET | `/api/estadisticas` | Estadísticas globales del censo |
| GET | `/api/demografia` | Reportes demográficos con pirámide poblacional |
| GET/POST/PUT/DELETE | `/api/salud` | CRUD de registros de salud. DELETE solo Admin |
| GET | `/api/salud/reportes` | BI de salud: enfermedades top, demanda de medicamentos |
| GET/POST/PUT/DELETE | `/api/enfermedades` | Catálogo de enfermedades. C/U/D solo Admin |
| GET/POST/PUT/DELETE | `/api/medicamentos` | Catálogo de medicamentos. C/U/D solo Admin |
| GET/POST/PUT/DELETE | `/api/comunidades` | CRUD comunidades |
| GET/POST/PUT/DELETE | `/api/calles` | CRUD calles |
| GET/POST/PUT/DELETE | `/api/locales-comerciales` | CRUD locales comerciales. DELETE solo Admin |
| GET/POST/PUT/DELETE | `/api/users` | Gestión de usuarios |
| GET | `/api/export/familias` | Exportación en CSV |
| GET | `/api/health` | Health check de la aplicación |

---

## 🔧 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo en http://0.0.0.0:3000
npm run build        # Build de producción (ejecuta prisma generate + next build)
npm run start        # Inicia el servidor en modo producción
npm run public       # Expone el servidor en red local (start-public.js)

npm run db:generate  # Genera el cliente Prisma
npm run db:push      # Sincroniza el esquema con la base de datos
npm run db:seed      # Carga los datos iniciales de prueba
npm run db:studio    # Abre Prisma Studio (explorador visual de la DB)

npm run setup        # Todo en uno: generate + push + seed
npm run lint         # Lint del código
```

---

## 📬 Notificaciones por Email (opcional)

El sistema envía notificaciones al administrador cuando se registran o modifican familias. Requiere configurar las variables `RESEND_API_KEY` y `ADMIN_EMAIL` en el archivo `.env`.

Si no se configuran, el sistema opera normalmente y los correos se simulan en la consola del servidor.

---

## 🚢 Deploy

Ver [SETUP.md](./SETUP.md) para instrucciones completas de configuración con Supabase y despliegue en Vercel.
