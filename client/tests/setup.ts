// Vitest setup — runs once before every test file.
// Extends expect() with @testing-library/jest-dom matchers
// (toBeInTheDocument, toHaveAttribute, toHaveClass, etc.).

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom doesn't implement matchMedia. Polyfill with a no-match stub so any
// breakpoint-sensing code (Dialog's mobile vs desktop variant, useReducedMotion)
// falls through to the desktop / no-match branch in unit tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    // Cast: the mock object doesn't structurally satisfy MediaQueryList's DOM-level event listener types.
  })) as typeof window.matchMedia
}

// jsdom doesn't implement ResizeObserver. Stub it so components that observe
// element size (e.g. WizardDialog's height animation) render in unit tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    // Cast: three no-op methods don't structurally satisfy the real ResizeObserver constructor's type.
  } as unknown as typeof ResizeObserver
}

// Unmount any components rendered by the previous test so state doesn't leak.
afterEach(() => {
  cleanup()
})
