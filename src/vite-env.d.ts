/// <reference types="vite/client" />

declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

declare const __IS_DEV__: boolean
