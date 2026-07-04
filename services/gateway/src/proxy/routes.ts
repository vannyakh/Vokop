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
 *
 * | Service        | Responsibility                          |
 * |----------------|-----------------------------------------|
 * | auth           | Account, sessions, JWT                  |
 * | studio         | Studio projects (CRUD + soft-delete)    |
 * | admin-service  | Admin RBAC, menus, users management     |
 * | video-tools    | Media pipeline, presets, assets, export |
 * | ai-content     | Agent, LLM, ASR, subtitles, clip assist |
 */
export function getProxyRoutes(): ProxyRoute[] {
  const {
    videoToolsUrl,
    authServiceUrl,
    studioServiceUrl,
    adminServiceUrl,
    aiContentUrl,
  } = gatewayConfig;

  return [
    // auth — account & security only
    { publicPath: '/api/v1/auth', target: authServiceUrl, servicePath: '/auth' },

    // studio — project library
    { publicPath: '/api/v1/projects', target: studioServiceUrl, servicePath: '/projects' },

    // admin-service — console RBAC
    { publicPath: '/api/v1/admin', target: adminServiceUrl, servicePath: '/admin' },

    // video-tools — media pipeline
    { publicPath: '/api/v1/video', target: videoToolsUrl, servicePath: '' },
    { publicPath: '/api/v1/media', target: videoToolsUrl, servicePath: '/media' },
    { publicPath: '/api/v1/stock', target: videoToolsUrl, servicePath: '/stock' },
    { publicPath: '/api/v1/presets', target: videoToolsUrl, servicePath: '/presets' },
    { publicPath: '/api/v1/assets', target: videoToolsUrl, servicePath: '/assets' },
    { publicPath: '/api/v1/export', target: videoToolsUrl, servicePath: '' },

    // ai-content — agent + LLM + FunClip-style generate-content
    { publicPath: '/api/v1/ai', target: aiContentUrl, servicePath: '/ai' },
  ];
}
