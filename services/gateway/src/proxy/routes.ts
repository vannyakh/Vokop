import { gatewayConfig } from '../config.js';

export type ProxyRoute = {
  /** Public API prefix, e.g. `/api/v1/auth` */
  publicPath: string;
  /** Upstream service base URL */
  target: string;
  /** Upstream path prefix, e.g. `/auth` (empty = strip `publicPath` only) */
  servicePath: string;
};

/**
 * Gateway → service route table.
 * Keep public paths aligned with `@vokop/api` `routes` (`packages/api/src/routes.ts`).
 * Add a row here when a new public API prefix is introduced.
 */
export function getProxyRoutes(): ProxyRoute[] {
  const { videoToolsUrl, authServiceUrl } = gatewayConfig;

  return [
    // video-tools — media pipeline
    { publicPath: '/api/v1/video', target: videoToolsUrl, servicePath: '' },
    { publicPath: '/api/v1/media', target: videoToolsUrl, servicePath: '/media' },
    { publicPath: '/api/v1/stock', target: videoToolsUrl, servicePath: '/stock' },
    { publicPath: '/api/v1/presets', target: videoToolsUrl, servicePath: '/presets' },
    { publicPath: '/api/v1/assets', target: videoToolsUrl, servicePath: '/assets' },
    { publicPath: '/api/v1/export', target: videoToolsUrl, servicePath: '' },
    { publicPath: '/api/v1/ai', target: videoToolsUrl, servicePath: '/ai' },
    // auth — users, studio projects (id/title/status/editorState)
    { publicPath: '/api/v1/auth', target: authServiceUrl, servicePath: '/auth' },
    { publicPath: '/api/v1/admin', target: authServiceUrl, servicePath: '/admin' },
    { publicPath: '/api/v1/projects', target: authServiceUrl, servicePath: '/projects' },
  ];
}
