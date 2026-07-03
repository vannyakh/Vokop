# Vokop

Video editing studio with a simple pnpm monorepo: React UI, API gateway, and server-side video tools.

## Structure

```
apps/web              React + Vite studio (port 3000 — WEB_PORT)
apps/admin            React + Vite admin (port 3001 — ADMIN_PORT)
services/gateway      API gateway — routes /api/v1/* (port 4000)
services/video-tools  FFmpeg video processing (port 4001)
services/auth         Auth + RBAC API (port 4002)
packages/shared       Config, constants, types, DEV_PORTS registry
packages/api          API schemas, routes, and typed client
packages/ui           Shared React UI components
packages/db           MongoDB + Redis connections
docker-compose.yml    MongoDB and Redis containers
```

Default ports are defined once in `packages/shared/src/config/ports.ts`. Override any port in `.env`.

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

Uses [Turborepo](https://turbo.build) for parallel dev servers and cached builds/lint across the monorepo.

Start databases, then run the full stack (web + admin + gateway + auth + video-tools):

```bash
pnpm db:up
pnpm dev
```

Filtered dev stacks (each starts the API backend the app needs):

```bash
pnpm dev:web        # studio UI + gateway + auth + video-tools
pnpm dev:admin      # admin UI + gateway + auth
pnpm dev:services   # gateway + auth + video-tools only
```

Individual services:

```bash
pnpm dev:gateway    # Gateway at http://localhost:4000
pnpm dev:video      # Video tools at http://localhost:4001
pnpm dev:auth       # Auth at http://localhost:4002
```

Port map (override in `.env`):

| Variable | Default | Service |
|----------|---------|---------|
| `WEB_PORT` | 3000 | Studio app |
| `ADMIN_PORT` | 3001 | Admin app |
| `GATEWAY_PORT` | 4000 | API gateway |
| `VIDEO_TOOLS_PORT` | 4001 | Video tools |
| `AUTH_PORT` | 4002 | Auth service |

The web app proxies `/api` to the gateway during development.

## Build & lint

```bash
pnpm build          # cached parallel builds (apps + services)
pnpm build:web      # frontend only
pnpm build:admin    # admin app only
pnpm build:services # gateway, auth, video-tools
pnpm lint           # cached parallel typecheck across packages
pnpm clean          # remove dist folders
```

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
4. Add a `dev:your-service` script in the root `package.json` (via `turbo run dev --filter=@vokop/your-service`)
