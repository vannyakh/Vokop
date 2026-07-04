/** Dev listen ports — keep unique across apps/services. */
export const DEV_PORTS = {
  web: 3000,
  admin: 3001,
  gateway: 4000,
  videoTools: 4001,
  auth: 4002,
  studio: 4003,
  adminService: 4004,
} as const;

export type DevPortKey = keyof typeof DEV_PORTS;

/** All dev server ports (for `pnpm stop` and tooling). */
export const DEV_PORT_LIST: number[] = [
  DEV_PORTS.web,
  DEV_PORTS.admin,
  DEV_PORTS.gateway,
  DEV_PORTS.videoTools,
  DEV_PORTS.auth,
  DEV_PORTS.studio,
  DEV_PORTS.adminService,
];

export function devOrigin(port: number, host = 'localhost'): string {
  return `http://${host}:${port}`;
}

export const DEFAULT_DEV_URLS = {
  web: devOrigin(DEV_PORTS.web),
  admin: devOrigin(DEV_PORTS.admin),
  gateway: devOrigin(DEV_PORTS.gateway),
  videoTools: devOrigin(DEV_PORTS.videoTools),
  auth: devOrigin(DEV_PORTS.auth),
  studio: devOrigin(DEV_PORTS.studio),
  adminService: devOrigin(DEV_PORTS.adminService),
} as const;
