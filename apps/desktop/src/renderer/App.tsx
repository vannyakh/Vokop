/**
 * Desktop renderer App shell.
 *
 * Renders the same CapCut-style editor UI as apps/web.
 * Components are imported from the shared web app features via @web/* alias,
 * which is resolved to apps/web/src/ in electron.vite.config.ts.
 *
 * The key difference: all API calls go through useBackend() (LocalBackend / IPC)
 * instead of direct fetch calls — ensured by swapping the BackendProvider.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import the same page components as apps/web
// These are path-aliased so the renderer shares the actual web source files.
// @web resolves to apps/web/src in electron.vite.config.ts
import { lazy, Suspense } from 'react';

const UploadPage = lazy(() => import('@web/pages/UploadPage'));
const StudioPage = lazy(() => import('@web/pages/StudioPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white/40 text-sm">Loading…</div>}>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/studio/:projectId" element={<StudioPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
