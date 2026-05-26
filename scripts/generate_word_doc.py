import os

def generate_doc():
    content = """
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset="utf-8">
        <title>Documentación Araure Tricentenaria</title>
        <style>
            body { font-family: 'Calibri', sans-serif; line-height: 1.6; color: #333; }
            h1 { color: #2c3e50; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; }
            h2 { color: #34495e; margin-top: 30px; border-bottom: 1px solid #eee; }
            h3 { color: #7f8c8d; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f2f2f2; }
            code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: 'Courier New', monospace; }
            pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; border: 1px solid #ddd; white-space: pre-wrap; }
            .badge { background: #e8f4fd; color: #2b6cb0; padding: 2px 8px; border-radius: 12px; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <h1>🏛️ Documentación del Proyecto: Sistema de Censo Comunal Araure Tricentenaria</h1>
        
        <h2>1. Introducción</h2>
        <p>El <strong>Sistema de Censo Comunal Araure Tricentenaria</strong> es una plataforma web integral diseñada para facilitar la recolección, gestión y análisis de datos demográficos y socioeconómicos dentro de la comunidad. El sistema permite a los Jefes de Calle realizar censos de manera digital y a los Administradores visualizar estadísticas en tiempo real para la toma de decisiones.</p>

        <h2>2. Tecnologías Utilizadas</h2>
        <p>El proyecto está construido con un stack moderno y eficiente:</p>
        <ul>
            <li><strong>Frontend/Backend:</strong> Next.js 14 (App Router)</li>
            <li><strong>Lenguaje:</strong> TypeScript</li>
            <li><strong>Base de Datos:</strong> SQLite (desarrollo/local) con Prisma ORM</li>
            <li><strong>Autenticación:</strong> NextAuth.js</li>
            <li><strong>Estilos:</strong> Tailwind CSS</li>
            <li><strong>Gráficos:</strong> Chart.js</li>
            <li><strong>Iconografía:</strong> React Icons (Feather)</li>
        </ul>

        <h2>3. Requisitos del Sistema</h2>
        <ul>
            <li><strong>Node.js:</strong> Versión 18.x o superior.</li>
            <li><strong>NPM:</strong> Gestor de paquetes incluido con Node.js.</li>
            <li><strong>Navegador:</strong> Chrome, Firefox o Edge (versiones recientes).</li>
        </ul>

        <h2>4. Guía de Instalación</h2>
        <h3>4.1. Clonar e Instalar Dependencias</h3>
        <pre>npm install</pre>

        <h3>4.2. Configuración de Base de Datos</h3>
        <ol>
            <li>Generar el cliente de Prisma: <br><code>npx prisma generate</code></li>
            <li>Sincronizar el esquema con la base de datos: <br><code>npx prisma db push</code></li>
            <li>(Opcional) Poblar la base de datos con datos de prueba: <br><code>node prisma/run-seed.js</code></li>
        </ol>

        <h3>4.3. Variables de Envorno</h3>
        <pre>
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="su_secreto_aqui"
NEXTAUTH_URL="http://localhost:3000"
        </pre>

        <h2>5. Manual de Usuario</h2>
        <h3>5.1. Roles de Usuario</h3>
        <table>
            <tr>
                <th>Rol</th>
                <th>Descripción</th>
            </tr>
            <tr>
                <td><strong>Administrador</strong></td>
                <td>Acceso total al sistema, gestión de comunidades, calles y usuarios.</td>
            </tr>
            <tr>
                <td><strong>Jefe de Calle</strong></td>
                <td>Acceso limitado a las calles asignadas para realizar el censo.</td>
            </tr>
        </table>

        <h3>5.2. Funciones del Administrador</h3>
        <ul>
            <li><strong>Dashboard:</strong> Visualización de gráficos estadísticos (género, edad, escolaridad, salud).</li>
            <li><strong>Gestión de Comunidades:</strong> Crear, editar y eliminar sectores de la comuna.</li>
            <li><strong>Gestión de Calles:</strong> Organizar las calles y asignarles un Jefe de Calle.</li>
            <li><strong>Gestión de Usuarios:</strong> Creación de cuentas para los Jefes de Calle.</li>
            <li><strong>Reportes:</strong> Exportación de datos y vistas detalladas de todas las familias.</li>
        </ul>

        <h3>5.3. Funciones del Jefe de Calle</h3>
        <ul>
            <li><strong>Censar Familia:</strong> Formulario detallado para registrar una nueva vivienda y sus habitantes.</li>
            <li><strong>Mis Familias:</strong> Lista de familias registradas en su calle con opción de ver detalles.</li>
            <li><strong>Dashboard Personal:</strong> Estadísticas específicas de su zona de trabajo.</li>
        </ul>

        <h2>6. Estructura de Datos del Censo</h2>
        <p>El censo recopila información dividida en tres niveles:</p>
        <ol>
            <li><strong>Vivienda:</strong> Dirección, tipo de casa, condición de tenencia.</li>
            <li><strong>Jefe de Familia:</strong> Datos personales básicos y contacto.</li>
            <li><strong>Miembros del Hogar:</strong> Cédula, parentesco, escolaridad, situación laboral, salud (discapacidades, pensiones).</li>
        </ol>

        <h2>7. Comandos de Mantenimiento</h2>
        <ul>
            <li><code>npm run dev</code>: Iniciar el servidor en modo desarrollo.</li>
            <li><code>npm run build</code>: Compilar el proyecto para producción.</li>
            <li><code>npx prisma studio</code>: Abrir el explorador visual de la base de datos.</li>
        </ul>

        <hr>
        <p><em>Documentación generada automáticamente el 12 de mayo de 2026.</em></p>
    </body>
    </html>
    """
    
    output_path = "DOCUMENTACION.doc"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"Archivo {output_path} generado con éxito.")

if __name__ == "__main__":
    generate_doc()
