import type { Locator } from '@playwright/test'

/**
 * Types a secret into an input without writing it into the test report.
 *
 * Playwright names every typing step after the text it types (`Fill "<value>"`,
 * and the same for type, insertText and pressSequentially), and the HTML report
 * keeps step names even with tracing off. CI uploads that report from a public
 * repo, so `fill(password)` published the test accounts' passwords. An evaluate
 * step is named just "Evaluate".
 *
 * The native value setter plus an `input` event is what React's controlled
 * inputs listen for; assigning `.value` alone would be ignored on submit.
 */
export async function fillSecret(
  locator: Locator,
  value: string,
  options?: { timeout?: number },
): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout: options?.timeout })
  await locator.evaluate(
    (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      if (!(el instanceof HTMLInputElement) || !setter) {
        throw new Error('fillSecret needs an <input> element')
      }
      el.focus()
      setter.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    },
    value,
    options,
  )
}
