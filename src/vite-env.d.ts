/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_SAME_ORIGIN_API?: string;
  readonly VITE_APP_DOWNLOAD_URL?: string;
  readonly VITE_APP_UPDATE_URL?: string;
  readonly VITE_APP_SHARE_URL?: string;
  readonly VITE_PLAY_STORE_URL?: string;
  readonly VITE_PUBLIC_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}