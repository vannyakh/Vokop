/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ADMIN_APP_URL?: string;
  /** Set to `1` to enable the OpenCut WASM GPU compositor preview scaffold. */
  readonly VITE_WASM_COMPOSITOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface FontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob(): Promise<Blob>;
}

interface Window {
  queryLocalFonts?: () => Promise<FontData[]>;
}
