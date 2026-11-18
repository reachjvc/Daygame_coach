import { afterEach } from 'vitest'

/**
 * THE DOM PROJECT SHARES ONE JSDOM ACROSS FILES, SO EACH TEST LEAVES IT EMPTY.
 *
 * Files in it use no module mocks, fake clocks or stubbed globals (vitest.config.ts
 * sorts them). Testing Library already unmounts after each test; this clears what
 * a test may leave in the page itself, so the next file starts from a blank browser.
 */
afterEach(() => {
  document.body.innerHTML = ''
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
