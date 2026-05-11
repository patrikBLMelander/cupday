/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL for the cup API (e.g. `http://localhost:8080/api`). When set,
   * the frontend talks to the real backend and skips the MSW worker. When
   * unset, the frontend falls back to MSW intercepting `${origin}/api`.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
