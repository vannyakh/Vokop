# Vokop — Agent Guide

Video editing studio monorepo (CapCut-style UI + FFmpeg backend + AI translation/content).

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

## External references

| Project | Role |
|---------|------|
| [Omniclip](https://github.com/omni-media/omniclip) | Editor frontend **core** patterns (timeline/clips). Keep own UI/UX. |
| [FunClip](https://github.com/modelscope/FunClip) | **AI content** service design (`services/ai-content`). No Gradio UI. |

## Stack

React 19 · Vite · Zustand · Konva · Express · FFmpeg · MongoDB · Redis · pnpm workspaces · Zod · react-i18next
