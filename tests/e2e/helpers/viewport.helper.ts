import type { Page } from '@playwright/test'

export function isMobileViewport(page: Page): boolean {
  const viewport = page.viewportSize()
  return !!viewport && viewport.width < 640
}
