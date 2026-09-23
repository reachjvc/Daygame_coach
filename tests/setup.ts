import '@testing-library/jest-dom/vitest'

/**
 * WHAT JSDOM DOES NOT HAVE, AND EVERY RADIX COMPONENT ASSUMES.
 *
 * `ResizeObserver` is a browser API jsdom has never implemented. Radix's
 * Slider (and its Popover, Select and Tooltip, through `useSize`) measures its
 * own thumb with one on mount, so a test that renders any of them dies with
 * `ReferenceError: ResizeObserver is not defined` — a message that looks like a
 * broken import rather than a missing browser.
 *
 * The stub observes nothing, which is exactly right for a layout with no
 * layout: jsdom reports every element as 0×0 either way. It exists so the
 * component mounts and can be asserted on. What it CANNOT tell you is whether
 * the thing is the right size on a real screen — that is what the browser
 * suite's touch-target measurements are for.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
