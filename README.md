# Vokop

Video editing studio with a simple pnpm monorepo: React UI, API gateway, and server-side video tools.

## Structure

```
apps/web              React + Vite frontend (port 3000)
services/gateway      API gateway — routes /api/v1/* (port 4000)
services/video-tools  FFmpeg video processing (port 4001)
packages/shared       Config, constants, types, and preferences provider
packages/api          API schemas, routes, and typed client
packages/ui           Shared React UI components
packages/db           MongoDB + Redis connections
docker-compose.yml    MongoDB and Redis containers
```

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for MongoDB and Redis)
- [ffmpeg](https://ffmpeg.org/) (for server-side filmstrip/probe; client fallbacks work without it)

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env with your API keys

pnpm db:up        # start MongoDB + Redis
```

## Development

Start databases, then run all services:

```bash
pnpm db:up
pnpm dev
```

Or run services individually:

```bash
pnpm dev:web       # UI at http://localhost:3000
pnpm dev:gateway   # Gateway at http://localhost:4000
pnpm dev:video     # Video tools at http://localhost:4001
```

The web app proxies `/api` to the gateway during development.

## API routes

| Route | Service | Description |
|-------|---------|-------------|
| `GET /api/v1/health` | gateway | Gateway + database health |
| `POST /api/v1/video/session` | video-tools | Upload once — returns sessionId + probe |
| `POST /api/v1/video/session/:id/jobs/filmstrip` | video-tools | Async filmstrip job (poll job for progress) |
| `GET /api/v1/video/jobs/:jobId` | video-tools | Job status, progress, partial thumbnails |
| `GET /api/v1/video/editor/catalog` | video-tools | All tool presets (CapCut-style) |
| `POST /api/v1/video/editor/apply` | video-tools | Apply filter/transition/caption preset |
| `POST /api/v1/video/editor/preview` | video-tools | Server preview frame with filter |
| `POST /api/v1/video/filmstrip` | video-tools | Timeline thumbnails (legacy) |

## Build

```bash
pnpm build        # build all packages
pnpm build:web    # build frontend only
```

## Database

```bash
pnpm db:up        # start MongoDB (27017) + Redis (6379)
pnpm db:down      # stop containers
pnpm db:logs      # view container logs
```

Default credentials (dev only): `vokop` / `vokop`

## Cursor / AI development

- **AGENTS.md** — quick entry for AI agents
- **`.cursor/rules/`** — project, monorepo, studio, and UI conventions
- **`.cursor/skills/vokop/`** — detailed Vokop development skill + reference

## Adding services

1. Create a folder under `services/your-service`
2. Add workspace dependencies as needed
3. Register routes in `services/gateway/src/index.ts`
4. Add a `dev:your-service` script in the root `package.json`
