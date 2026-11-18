import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * THE DOM PROJECT SHARES ONE JSDOM ACROSS FILES, SO EACH TEST LEAVES IT EMPTY.
 *
 * Files in it use no module mocks, fake clocks or stubbed globals (vitest.config.ts
 * sorts them). It unmounts what Testing Library rendered and clears what
 * a test may leave in the page itself, so the next file starts from a blank browser.
 */
afterEach(() => {
  // Testing Library registers its own cleanup once, when it is first imported;
  // a later file in the same worker reuses that import and gets none.
  cleanup()
  document.documentElement.removeAttribute('style')
  document.documentElement.removeAttribute('class')
  window.localStorage.clear()
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
})
