import type { KiritApi } from './index'

declare global {
  interface Window {
    kirit: KiritApi
  }
}

export {}
