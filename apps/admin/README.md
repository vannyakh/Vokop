# Vokop Admin

Standalone admin console at **http://localhost:3001**.

## Dev

```bash
pnpm dev          # all services including admin
pnpm dev:admin    # admin only
```

## Stack

- **UI shell** — local components in `apps/admin/src/components` + `shell/`
- **Shared UI** — `@vokop/ui` (studio primitives, `@vokop/ui/shadcn`, `@vokop/ui/antd`, styles)
- **API / auth** — `@vokop/api`, `@vokop/shared`

## Structure

```
apps/admin/src/
  shell/           AdminShell, RouterNavBridge
  components/      Sidebar, Topbar, Tabbar, layout, demo pages
  context/         Theme, tabs, settings, session
  config/          Nav presets + shell config
  pages/           Vokop platform pages (users, RBAC, menus)
  features/auth/   Login + API hooks
```

## Env

See root `.env.example` — `WEB_PORT`, `ADMIN_PORT`, `GATEWAY_PORT`, `AUTH_PORT`, `VITE_ADMIN_APP_URL`, `VITE_WEB_APP_URL`.
