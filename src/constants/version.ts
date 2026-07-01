import pkg from '../../package.json';

export const APP_VERSION = pkg.version;

export function formatAppVersion(version = APP_VERSION): string {
  return version.startsWith('v') ? version : `v${version}`;
}
