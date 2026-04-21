# Cloudflare Gateway

Cloudflare Gateway es una herramienta potente y ligera diseñada para almacenar, visualizar y reenviar (replay) solicitudes HTTP (webhooks). Construido sobre el ecosistema de Cloudflare, aprovecha servicios de alto rendimiento para proporcionar una solución escalable para la depuración y el monitoreo de comunicaciones asíncronas.

## 🚀 Características

- **Almacenamiento de Webhooks**: Captura y almacena solicitudes y respuestas HTTP entrantes.
- **Reenvío de Mensajes**: Reintente y reenvíe mensajes fácilmente directamente desde el panel de control.
- **Panel de Administración**: Una interfaz de usuario moderna construida con React Router 7 para visualizar registros y gestionar mensajes.
- **Procesamiento Asíncrono**: Utiliza Cloudflare Queues para el procesamiento confiable de tareas en segundo plano.
- **Almacenamiento Persistente**: Utiliza Cloudflare D1 para metadatos y R2 para el almacenamiento de contenido de gran tamaño.
- **Limpieza Automática**: Incluye una tarea programada (Cron) para purgar datos antiguos basados en políticas de retención configurables.
- **Seguridad**: Rutas protegidas mediante autenticación por Token de Administrador.

## 🛠 Tecnologías

- **Runtime**: Cloudflare Workers
- **Base de Datos**: Cloudflare D1 (SQL)
- **Almacenamiento de Objetos**: Cloudflare R2
- **Mensajería**: Cloudflare Queues
- **Frontend**: React Router 7, React 19, Tailwind CSS
- **Herramienta de Construcción**: Vite
- **Pruebas**: Vitest y Playwright

## 📥 Primeros Pasos

### Requisitos Previos

- [Node.js](https://nodejs.org/) (se recomienda la última versión LTS)
- [pnpm](https://pnpm.io/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Instalación

1. Clone el repositorio.
2. Instale las dependencias:
   ```bash
   pnpm install
   ```
3. Cree la base de datos local:
   ```bash
   npx wrangler d1 create cfgateway --location=enam
   ```
4. Inicialice el esquema de la base de datos local:
   ```bash
   npx wrangler d1 execute cfgateway --local --file=./schema.sql
   ```
5. Para usar una base de datos remota (producción):
   ```bash
   npx wrangler d1 execute cfgateway --remote --file=./schema.sql
   ```

### Desarrollo Local

Ejecute el servidor de desarrollo:
```bash
pnpm run dev
```

### Despliegue

Despliegue en Cloudflare Workers:
```bash
pnpm run deploy
```

## ⚙️ Configuración

Las variables de entorno y los bindings se gestionan en `wrangler.jsonc`:

- `ADMIN_TOKEN`: Token de seguridad para acceder al panel.
- `MAX_AGE_DAYS`: Período de retención de mensajes (por defecto: 30 días).

## 📄 Licencia

Este proyecto está bajo la Licencia FSL-1.1-MIT - vea el archivo [LICENSE](LICENSE) para más detalles.
