/**
 * camelCase / PascalCase → kebab-case.
 * Adapted from Omniclip `s/tools/dashify.ts`.
 */
export function dashify(camel: string): string {
  return camel.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase();
}
