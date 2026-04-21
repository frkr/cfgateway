# Cloudflare Gateway

Cloudflare Gateway é uma ferramenta poderosa e leve projetada para armazenar, visualizar e reenviar (replay) requisições HTTP (webhooks). Construído sobre o ecossistema Cloudflare, ele utiliza serviços de alta performance para fornecer uma solução escalável para depuração e monitoramento de comunicações assíncronas.

## 🚀 Funcionalidades

- **Armazenamento de Webhooks**: Captura e armazena requisições e respostas HTTP recebidas.
- **Replay de Mensagens**: Reenvie mensagens facilmente diretamente do painel de controle.
- **Painel Administrativo**: Uma interface moderna construída com React Router 7 para visualizar logs e gerenciar mensagens.
- **Processamento Assíncrono**: Utiliza Cloudflare Queues para processamento de tarefas em segundo plano de forma confiável.
- **Armazenamento Persistente**: Utiliza Cloudflare D1 para metadados e R2 para armazenamento de grandes conteúdos.
- **Limpeza Automática**: Inclui uma tarefa agendada (Cron) para remover dados antigos com base em políticas de retenção configuráveis.
- **Segurança**: Rotas protegidas via autenticação por Admin Token.

## 🛠 Tecnologias

- **Runtime**: Cloudflare Workers
- **Banco de Dados**: Cloudflare D1 (SQL)
- **Armazenamento de Objetos**: Cloudflare R2
- **Mensageria**: Cloudflare Queues
- **Frontend**: React Router 7, React 19, Tailwind CSS
- **Build Tool**: Vite
- **Testes**: Vitest & Playwright

## 📥 Primeiros Passos

### Pré-requisitos

- [Node.js](https://nodejs.org/) (recomendado última versão LTS)
- [pnpm](https://pnpm.io/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Instalação

1. Clone o repositório.
2. Instale as dependências:
   ```bash
   pnpm install
   ```
3. Inicialize o banco de dados local:
   ```bash
   pnpm wrangler d1 execute cfgateway --local --file=./path/to/schema.sql
   ```

### Desenvolvimento Local

Execute o servidor de desenvolvimento:
```bash
pnpm run dev
```

### Deploy

Faça o deploy para o Cloudflare Workers:
```bash
pnpm run deploy
```

## ⚙️ Configuração

As variáveis de ambiente e bindings são gerenciados no arquivo `wrangler.jsonc`:

- `ADMIN_TOKEN`: Token de segurança para acessar o painel.
- `MAX_AGE_DAYS`: Período de retenção das mensagens (padrão: 30 dias).

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.
