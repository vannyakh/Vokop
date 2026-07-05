<div align="center">

# VOKOP

**Browser video studio — CapCut-style editing with AI translation, voiceover & smart tools**

<br />

[![Studio](https://img.shields.io/badge/Studio-CapCut--style-000000?style=for-the-badge&labelColor=1a1a1a)](http://localhost:3000)
[![AI](https://img.shields.io/badge/AI-Translate_·_TTS_·_Captions-e8a33d?style=for-the-badge&labelColor=14100a)](README.md#ai--smart-tools)
[![Timeline](https://img.shields.io/badge/Timeline-Multi--track-2d2d2d?style=for-the-badge&labelColor=111111)](README.md#core-editing)
[![Export](https://img.shields.io/badge/Export-FFmpeg_render-384d3c?style=for-the-badge&labelColor=1a2420)](README.md#core-editing)

<br />

[![Node](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspaces-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_·_local-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-cache-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-video_tools-007808?style=flat-square&logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)

<br />

Upload · trim · caption · translate · export

</div>

---

## ![Label](https://img.shields.io/badge/USE_CASES-What_you_can_build-e8a33d?style=flat-square) What you can use it for

| Label | Description |
|-------|-------------|
| **`SOCIAL`** | Short-form video — 9:16, 1:1, 16:9 |
| **`TRANSLATE`** | Transcribe, translate, AI voiceover |
| **`EDIT`** | Trim, split, filters, transitions, stickers |
| **`TEMPLATES`** | Preset projects — swap your media |
| **`ADMIN`** | Users, roles, studio admin console |

---

## ![Label](https://img.shields.io/badge/CORE-Core_editing-111111?style=flat-square) Core editing

| Area | Features |
|------|----------|
| **`TIMELINE`** | Multi-track video, audio, text, image, sticker · trim, split, drag, snap · auto new track on overlap |
| **`CANVAS`** | Real-time preview · move, resize, rotate overlays |
| **`MEDIA`** | Upload video/audio/image · filmstrip · audio waveforms |
| **`TEXT`** | Templates, effects, captions with word timing |
| **`VISUAL`** | Filters, transitions, backgrounds, aspect ratios |
| **`AUDIO`** | Multi-track audio · volume/fade · extract/detach from video |
| **`PROJECTS`** | Cloud save · recent list · trash & restore |
| **`EXPORT`** | Render timeline to video file |

---

## ![Label](https://img.shields.io/badge/AI-Smart_tools-e8a33d?style=flat-square&labelColor=14100a) AI & smart tools

Optional providers: **302.AI** · Gemini · OpenAI · Claude

| Tool | Use |
|------|-----|
| **`TRANSCRIBE`** | Speech-to-text, subtitle segments |
| **`TRANSLATE`** | Translate transcript or on-screen text |
| **`VOICE`** | TTS voiceover from script |
| **`CAPTIONS`** | Auto captions pipeline |
| **`TEXT`** | Rewrite titles, hooks, descriptions |
| **`IMAGE`** | Analyze uploaded images |
| **`CLIPS`** | AI-assisted clip selection |
| **`BEATS`** | Beat detection for auto-cut |

---

## ![Label](https://img.shields.io/badge/STUDIO-Tools_rail-2d2d2d?style=flat-square) Studio tools

<div align="center">

`Media` · `Text` · `Audio` · `Voice` · `Captions` · `Effects` · `Transitions` · `Filters` · AI clip

<br />

[![Project bar](https://img.shields.io/badge/Project_bar-switch_·_status_·_FPS_monitor-555555?style=flat-square)](README.md)

</div>

---

## ![Label](https://img.shields.io/badge/START-Quick_start-339933?style=flat-square) Quick start

**Prerequisites:** Node.js 20+ · pnpm · Docker (MongoDB + Redis) · ffmpeg (recommended)

```bash
pnpm install
cp .env.example .env   # add API keys as needed

pnpm db:up
pnpm dev               # studio :3000 · admin :3001 · API :4000
```

```bash
pnpm dev:web           # studio + API only
pnpm build             # production build
pnpm stop              # free dev ports
```

<div align="center">

[![Studio](https://img.shields.io/badge/Open-Studio_localhost:3000-e8a33d?style=for-the-badge&labelColor=14100a)](http://localhost:3000)
[![Admin](https://img.shields.io/badge/Open-Admin_localhost:3001-555555?style=for-the-badge&labelColor=222222)](http://localhost:3001)

</div>

---

## ![Label](https://img.shields.io/badge/CONFIG-Environment-3178C6?style=flat-square) Configuration

Copy `.env.example` to `.env` and set keys for the features you need (AI providers, database URLs, etc.). Defaults work for local development with Docker.

---

## ![Label](https://img.shields.io/badge/DEV-For_developers-111111?style=flat-square) For developers

See **[AGENTS.md](./AGENTS.md)** and **`.cursor/skills/vokop/`** for architecture, conventions, and feature roadmap.

<div align="center">

<br />

**Vokop** — edit fast, publish anywhere.

</div>
