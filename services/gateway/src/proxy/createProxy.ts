import { createProxyMiddleware, type RequestHandler } from 'http-proxy-middleware';
import type { ProxyRoute } from './routes.js';

/**
 * Build a proxy that matches the full public path (pathFilter) and rewrites
 * to the upstream service path. Avoid `app.use('/api/v1/auth', proxy)` —
 * Express strips the mount path and breaks pathRewrite.
 */
export function createServiceProxy(route: ProxyRoute): RequestHandler {
  const { publicPath, target, servicePath } = route;

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathFilter: (pathname) =>
      pathname === publicPath || pathname.startsWith(`${publicPath}/`),
    pathRewrite: {
      [`^${publicPath}`]: servicePath,
    },
  });
}
