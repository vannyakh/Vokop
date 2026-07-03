/**
 * BackendContext — provides an IBackend instance to the entire renderer tree.
 *
 * Usage:
 *   // In main.tsx, wrap with:
 *   <BackendProvider backend={new LocalBackend()}>…</BackendProvider>
 *
 *   // In any component:
 *   const backend = useBackend();
 *   const projects = await backend.listProjects();
 */

import React, { createContext, useContext } from 'react';
import type { IBackend } from './types.js';

const BackendContext = createContext<IBackend | null>(null);

export function BackendProvider({
  backend,
  children,
}: {
  backend: IBackend;
  children: React.ReactNode;
}) {
  return (
    <BackendContext.Provider value={backend}>
      {children}
    </BackendContext.Provider>
  );
}

export function useBackend(): IBackend {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error('useBackend must be used inside <BackendProvider>');
  return ctx;
}

/** Detect whether we are running inside Electron. */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && 'electronApi' in window;
}
