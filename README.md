# 🏛️ Comuna Araure Tricentenaria — Sistema de Censo Comunal

Sistema web completo para realizar censos en la Comuna Araure Tricentenaria.

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js** v18+ (recomendado v20+): [Descargar](https://nodejs.org/)

### Instalación y Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar base de datos (genera Prisma Client + crea DB + seed)
npx prisma generate
npx prisma db push
node prisma/run-seed.js

# 3. Iniciar servidor de desarrollo
npm run dev
```

Abre **http://localhost:3000** en tu navegador.

### 📋 Credenciales de Prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| **Administrador** | `admin@comuna.com` | `admin123` |
| **Jefe de Calle** | `jefe@comuna.com` | `jefe123` |

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Autenticación | NextAuth.js (JWT + Credentials) |
| Base de datos | SQLite + Prisma ORM |
| Estilos | Tailwind CSS |
| Gráficos | Chart.js + react-chartjs-2 |
| Iconos | react-icons (Feather) |
| Notificaciones | react-hot-toast |

---

## 📁 Estructura del Proyecto

```
├── prisma/
│   ├── schema.prisma       # Esquema de base de datos
│   ├── seed.ts             # Datos iniciales
│   └── run-seed.js         # Helper para ejecutar seed
├── src/
│   ├── app/
│   │   ├── api/            # API Routes (backend)
│   │   │   ├── auth/       # NextAuth endpoints
│   │   │   ├── calles/     # CRUD calles
│   │   │   ├── comunidades/# CRUD comunidades
│   │   │   ├── estadisticas/# Reportes estadísticos
│   │   │   ├── familias/   # CRUD familias + miembros
│   │   │   └── users/      # Gestión de usuarios
│   │   ├── dashboard/      # Páginas de Admin
│   │   │   ├── page.tsx    # Dashboard principal
│   │   │   ├── calles/     # Gestión de calles
│   │   │   ├── comunidades/# Gestión de comunidades
│   │   │   ├── familias/   # Lista de familias
│   │   │   ├── jefes-calle/# Gestión de jefes
│   │   │   └── reportes/   # Reportes estadísticos
│   │   ├── login/          # Página de login
│   │   └── mi-calle/       # Páginas de Jefe de Calle
│   │       ├── page.tsx    # Dashboard del jefe
│   │       ├── censar/     # Formulario de censo
│   │       └── familias/   # Mis familias
│   ├── components/         # Componentes compartidos
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── DashboardLayout.tsx
│   ├── lib/                # Utilidades
│   │   ├── prisma.ts       # Cliente Prisma (singleton)
│   │   ├── auth.ts         # Config NextAuth
│   │   └── types.ts        # Tipos TypeScript
│   └── middleware.ts       # Protección de rutas
└── .env                    # Variables de entorno
```

---

## 👤 Roles y Permisos

### Administrador
- ✅ Dashboard con estadísticas globales y gráficos
- ✅ Gestionar Comunidades (crear, editar, eliminar)
- ✅ Gestionar Calles (crear, editar, asignar jefes)
- ✅ Gestionar Jefes de Calle (crear usuarios, asignar)
- ✅ Ver todas las familias censadas
- ✅ Reportes estadísticos filtrados por comunidad

### Jefe de Calle
- ✅ Dashboard con estadísticas de sus calles
- ✅ Censar nuevas familias (formulario completo)
- ✅ Ver familias de sus calles asignadas
- ❌ No puede gestionar comunidades ni otros usuarios

---

## 📊 Datos del Censo

El formulario de censo captura:

**Vivienda:** Dirección, tipo, tenencia, observaciones  
**Jefe de Familia:** Nombre, cédula, teléfono, ocupación, fecha de nacimiento, género  
**Miembros:** Nombre, cédula, fecha de nacimiento, género, parentesco, escolaridad, salud, ocupación, pensionado, discapacidad

---

## 🔧 Comandos Útiles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npx prisma studio    # Explorador visual de la DB
```
