# Cloudflare Gateway

Cloudflare Gateway is a powerful and lightweight tool designed to store, visualize, and replay HTTP requests (webhooks). Built on top of the Cloudflare ecosystem, it leverages high-performance services to provide a scalable solution for debugging and monitoring asynchronous communications.

## 🚀 Features

- **Webhook Storage**: Captures and stores incoming HTTP requests and responses.
- **Message Replay**: Easily retry and replay messages directly from the dashboard.
- **Admin Panel**: A modern UI built with React Router 7 to visualize logs and manage messages.
- **Asynchronous Processing**: Uses Cloudflare Queues for reliable, background processing of tasks.
- **Persistent Storage**: Utilizes Cloudflare D1 for metadata and R2 for large content storage.
- **Automated Cleanup**: Includes a scheduled task (Cron) to purge old data based on configurable retention policies.
- **Security**: Protected routes via Admin Token authentication.

## 🛠 Tech Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQL)
- **Object Storage**: Cloudflare R2
- **Messaging**: Cloudflare Queues
- **Frontend**: React Router 7, React 19, Tailwind CSS
- **Build Tool**: Vite
- **Testing**: Vitest & Playwright

## 📥 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (latest LTS recommended)
- [pnpm](https://pnpm.io/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create the local database:
   ```bash
   npx wrangler d1 create cfgateway --location=enam
   ```
4. Initialize the local database schema:
   ```bash
   npx wrangler d1 execute cfgateway --local --file=./schema.sql
   ```
5. To use a remote database (production):
   ```bash
   npx wrangler d1 execute cfgateway --remote --file=./schema.sql
   ```

### Local Development

Run the development server:
```bash
pnpm run dev
```

### Deployment

Deploy to Cloudflare Workers:
```bash
pnpm run deploy
```

## ⚙️ Configuration

Environment variables and bindings are managed in `wrangler.jsonc`:

- `ADMIN_TOKEN`: Security token for accessing the panel.
- `MAX_AGE_DAYS`: Retention period for messages (default: 30 days).

## 📄 License

This project is licensed under the FSL-1.1-MIT License - see the [LICENSE](LICENSE) file for details.
