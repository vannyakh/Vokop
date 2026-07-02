---
name: vokop
description: >-
  Develop the Vokop video editing monorepo — React studio UI, API gateway,
  FFmpeg video-tools service, editor presets, sessions/jobs. Use when working
  on Vokop, video timeline, canvas editor, translation/voiceover, filters,
  transitions, monorepo packages, or backend video processing.
---

# Vokop Development

## What Vokop is

Browser-based video studio (CapCut-like): timeline editing, canvas overlays, AI translation/voiceover, server-side FFmpeg for filmstrip/probe, and editor presets for filters/transitions/captions/audio mix.

## Architecture (read before large changes)

```
Browser (apps/web)
  → /api proxy → gateway :4000
    → video-tools :4001 (FFmpeg, sessions, jobs, editor)
    → MongoDB + Redis (packages/db, docker-compose)
```

Shared contracts: `@vokop/api` (Zod + client), `@vokop/shared` (types/constants), `@vokop/ui` (components).

## Common tasks

### Run locally

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm dev
```

Requires Docker (Mongo/Redis) and ffmpeg for full server-side video features.

### Add an API endpoint

1. Schema in `packages/api/src/schemas/`
2. Route in `packages/api/src/routes.ts`
3. Client method in `packages/api/src/client.ts`
4. Handler in `services/video-tools/src/`
5. Gateway already proxies `/api/v1/video/*`

### Add an editor preset (filter, transition, etc.)

1. Add preset in `packages/shared/src/constants/editor.ts` with `cssFilter` + `ffmpegFilter` when visual
2. Catalog auto-includes via `getEditorCatalog()`
3. UI picks it up through `useEditorCatalog()` — no hardcoded chip lists in components

### Add a studio UI tool panel

1. Extend `StudioToolId` in `packages/shared/src/types/studio.ts` if new tool
2. Add rail entry in `StudioToolsDock.tsx`
3. Use `EditorPresetGrid` + `useEditorActions()` for preset-based tools
4. Store applied state in `useAppStore` → `projectEditor`

## Do not

- Duplicate types/constants already in `@vokop/shared` or `@vokop/api`
- Put React providers in `@vokop/shared` main export (use `@vokop/shared/providers`)
- Re-upload full video per operation — use video session + sessionId
- Add button transform hover effects

## Reference

For API route table, env vars, and package map, see [reference.md](reference.md).
