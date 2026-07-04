import type { Express } from 'express';
import { createServiceProxy } from './createProxy.js';
import { getProxyRoutes } from './routes.js';

export function registerProxies(app: Express): void {
  for (const route of getProxyRoutes()) {
    app.use(createServiceProxy(route));
  }
}

export function logProxyRoutes(): void {
  for (const route of getProxyRoutes()) {
    const upstream = `${route.target}${route.servicePath || '/'}`;
    console.log(`[gateway] ${route.publicPath} -> ${upstream}`);
  }
}
