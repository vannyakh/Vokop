# Vokop — Agent Guide

Video editing studio monorepo (CapCut-style UI + FFmpeg backend + AI translation).

## Quick start

```bash
pnpm db:up && pnpm dev
```

## Project rules (`.cursor/rules/`)

| Rule | Scope |
|------|-------|
| `vokop-project.mdc` | Always — purpose, layout, commands |
| `monorepo-services.mdc` | `services/`, `packages/` |
| `studio-frontend.mdc` | `apps/web/` |
| `button-interactions.mdc` | Button hover/cursor standards |

## Project skill

Read `.cursor/skills/vokop/SKILL.md` when implementing features across UI, API, or video processing. Details in `reference.md`.

## Stack

React 19 · Vite · Zustand · Konva · Express · FFmpeg · MongoDB · Redis · pnpm workspaces · Zod
