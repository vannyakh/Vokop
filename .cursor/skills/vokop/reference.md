# Vokop Reference

## Ports

| Service | Port |
|---------|------|
| Web (Vite) | 3000 |
| Gateway | 4000 |
| Video-tools | 4001 |
| MongoDB | 27017 |
| Redis | 6379 |

## Key API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/health` | Gateway health |
| POST | `/api/v1/video/session` | Upload video → sessionId + probe |
| POST | `/api/v1/video/session/:id/jobs/filmstrip` | Async filmstrip with progress |
| GET | `/api/v1/video/jobs/:jobId` | Job status + partial thumbnails |
| GET | `/api/v1/video/editor/catalog` | All editor tool presets |
| POST | `/api/v1/video/editor/apply` | Apply preset to session |
| POST | `/api/v1/video/editor/preview` | Server filter preview frame |

Legacy (re-uploads file): `POST /api/v1/video/probe`, `POST /api/v1/video/filmstrip`

## Package responsibilities

| Package | Contains |
|---------|----------|
| `@vokop/shared` | `config/`, `constants/` (editor, i18n, aspect ratios), `types/`, `providers/` |
| `@vokop/api` | Zod schemas, `ApiClient`, `routes` |
| `@vokop/ui` | `Button`, `Select`, `Slider`, `Label`, `IconButton`, `Badge`, `cn()` |
| `@vokop/db` | `connectDatabases`, Redis/Mongo helpers, graceful shutdown |

## Web app entry points

| File | Role |
|------|------|
| `apps/web/src/main.tsx` | App bootstrap + ThemeProvider |
| `apps/web/src/routes/AppRouter.tsx` | Routes (`/`, `/studio`) |
| `apps/web/src/features/project/store/useAppStore.ts` | Global project state |
| `apps/web/src/features/studio/components/StudioWorkspace.tsx` | Main editor shell |
| `apps/web/src/lib/api/client.ts` | Browser API singleton |

## Environment variables

```
MONGODB_URI, REDIS_URL
GATEWAY_PORT, VIDEO_TOOLS_URL, WEB_ORIGIN
VIDEO_TOOLS_PORT, MAX_UPLOAD_MB, SESSION_TTL_SEC, MAX_FFMPEG_JOBS
GEMINI_API_KEY, VITE_PIXABAY_API_KEY, VITE_GIPHY_API_KEY
VITE_API_URL  # optional; dev uses Vite proxy
```

## Studio tool → implementation map

| Tool | UI | Server | Store key |
|------|-----|--------|-----------|
| Media | Pixabay, local upload, aspect ratio | session upload | aspectRatio |
| Text | TextTemplatesPanel, CanvasElementPanel | — | canvasElements |
| Audio | Waveform, mix presets | editor/apply | originalVolume, voiceVolume |
| Voice | Gemini TTS, speakers | — | audioBase64, speakerVoices |
| Captions | Caption style presets | editor/apply | projectEditor.captionStyle |
| Effects | Effect presets + stickers | editor/preview | — |
| Transitions | Per-clip presets | editor/apply | projectEditor.clipEdits |
| Filters | Color presets | editor/preview | projectEditor.videoFilterId |
