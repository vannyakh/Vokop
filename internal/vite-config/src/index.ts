import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import { getMonorepoEnvDir } from '@vokop/node-utils';

export interface ReactAppViteOptions {
  /** Directory containing the app's vite.config.ts (usually import.meta.url dirname). */
  dirname: string;
  /** Env var for dev port (e.g. WEB_PORT, ADMIN_PORT). Takes precedence over `defaultPort`. */
  portEnvKey?: string;
  /** Fallback port when env is unset. */
  defaultPort?: number;
  /** Extra Vite `define` entries — values are read from loaded env by key. */
  defineEnv?: Record<string, string>;
  optimizeDeps?: UserConfig['optimizeDeps'];
  /** Extra Vite plugins appended after React/Tailwind. */
  plugins?: UserConfig['plugins'];
  /** Extra headers for the Vite dev server (e.g. COOP/COEP for ffmpeg.wasm). */
  serverHeaders?: Record<string, string>;
  /** Proxy /api to gateway. Default true. */
  proxyApi?: boolean;
}

function resolvePort(env: Record<string, string>, portEnvKey?: string, defaultPort?: number): number {
  if (portEnvKey && env[portEnvKey]) {
    return Number(env[portEnvKey]);
  }
  return defaultPort ?? 5173;
}

function resolveGatewayTarget(env: Record<string, string>): string {
  if (env.VITE_API_URL) return env.VITE_API_URL;
  const port = env.GATEWAY_PORT ?? '4000';
  return `http://localhost:${port}`;
}

export function createReactAppViteConfig(options: ReactAppViteOptions) {
  const {
    dirname,
    portEnvKey,
    defaultPort,
    defineEnv,
    optimizeDeps,
    plugins = [],
    serverHeaders,
    proxyApi = true,
  } = options;

  return defineConfig(({ mode }) => {
    const envDir = getMonorepoEnvDir(dirname);
    const env = loadEnv(mode, envDir, '');
    const resolvedPort = resolvePort(env, portEnvKey, defaultPort);

    const define: Record<string, string> = {};
    if (defineEnv) {
      for (const [defineKey, envKey] of Object.entries(defineEnv)) {
        define[defineKey] = JSON.stringify(env[envKey] ?? '');
      }
    }

    return {
      envDir,
      plugins: [react(), tailwindcss(), ...plugins],
      define: Object.keys(define).length > 0 ? define : undefined,
      resolve: {
        alias: {
          '@': path.resolve(dirname, 'src'),
        },
      },
      optimizeDeps,
      server: {
        port: resolvedPort,
        strictPort: true,
        host: '0.0.0.0',
        hmr: process.env.DISABLE_HMR !== 'true',
        headers: serverHeaders,
        proxy: proxyApi
          ? {
              '/api': {
                target: resolveGatewayTarget(env),
                changeOrigin: true,
              },
            }
          : undefined,
      },
    } satisfies UserConfig;
  });
}
