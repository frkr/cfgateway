# This project is about Cloudflare Gateway. Will store HTTP requests and responses in a database and could make replay messages.

> Este arquivo 'AGENTS.md' é a fonte de verdade absoluta para agentes de IA

- Eu vou escrever muitas coisas em português do Brasil porque é minha lingua nativa, mas toda documentação que esteja fora do AGENTS.md, por favor deixe assim:
  - README.md - Em inglês
  - README.pt-br.md - Em português do Brasil
  - README.es.md - Em espanhol
- Os nomes dos arquivos "README" são um exemplo como toda documentação deve ser feita em arquivos Markdown (Gráficos em Mermaid JS) e traduzidas nessas línguas usando esse formato de arquivo.
- wrangler.jsonc - tem os recursos e variáveis de ambiente desse projeto conectado na Cloudflare.
- Variáveis de ambiente da Cloudflare (bindings) devem estar em MAIÚSCULO e os nomes dos recursos (bucket/queue) em minúsculo. Exemplo: (Queue) foi renomeada para `mqcfgateway` (Binding: `MQCFGATEWAY`).
- Entrypoint de todas as request: "src/front/api/mainroute.ts"
- Todas as Rotas do React Router: "src/front/routes.ts"
- Todas as rotas do React Router tem um arquivo de inicialização aqui: "src/front/routes"
- O Arquivo de inicialização "src/front/routes" deve conter apenas um facade para referenciar funcoes externas. Use o exemplo "mainroute.ts" e o "panel.tsx" para entender como fazer.
- Os modulos do backend devem ficar em "src/front/.server" use de exemplo o Panel: "src/front/.server/panel"
- Os modulos para a Message Queue devem ficar em "src/mq", use o "mqstore" como exemplo

# Cloudflare Workers - Agents Section

> AGENTS! Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.
> AGENTS! Leave this section always on the final of the file.

## Docs

- https://developers.cloudflare.com/workers/
- MCP: `https://docs.mcp.cloudflare.com/mcp`

For all limits and quotas, retrieve from the product's `/platform/limits/` page. eg. `/workers/platform/limits`

## Commands

| Command                                               | Purpose                   |
|-------------------------------------------------------|---------------------------|
| `npx wrangler dev`                                    | Local development         |
| `npx wrangler deploy`                                 | Deploy to Cloudflare      |
| `npx wrangler types`                                  | Generate TypeScript types |
| `npx wrangler r2 bucket create cfgateway`             | Create R2 bucket          |
| `npx wrangler queues create mqcfgateway`              | Create Queue              |
| `npx wrangler queues create mqcfgateway-dlq`          | Create Dead Letter Queue  |
| `npx wrangler d1 execute <database> --remote --command="ALTER TABLE <table> ADD COLUMN <column> <type>"` | Add column to D1 table |
| `npx wrangler d1 create new-database --location=enam` | Create D1 Database        |

Run `wrangler types` after changing bindings in wrangler.jsonc.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:
`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`

## Environment Variables

Do not hand-write your Env interface. Run wrangler types to generate a type definition file that matches your actual Wrangler configuration. This catches mismatches between your config and code at compile time instead of at deploy time.

Re-run wrangler types whenever you add or rename a binding.

```shell
pnpm wrangler types
```
