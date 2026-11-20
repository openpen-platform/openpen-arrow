/**
 * The host's current pen colour as this window's canvas sees it.
 *
 * A manual stroke takes its colour from the canvas's own style mirror, which
 * follows two sources: `stroke-style-changed` on this window's event bus
 * (seeded from settings at boot) and the cross-window style broadcast (the
 * control-bar colour picker lives in another window). `useStrokeStyle()` only
 * follows the first, so in the overlay it misses picker changes. This mirror
 * follows both, so an arrow an agent draws gets the colour a manual arrow
 * would get at that moment.
 */
import { on, useStrokeStyle } from '@openpen/module-api/host'
import type { StrokeColor } from '@openpen/module-api'

let latest: StrokeColor | null = null

function accept(color: unknown): void {
  if (typeof color === 'string' || (typeof color === 'object' && color !== null)) {
    latest = color as StrokeColor
  }
}

/** Start following the pen colour; returns the unsubscribe function. */
export function trackPenColor(): () => void {
  latest = null
  const offBus = on('stroke-style-changed', (payload) => {
    accept((payload as { color?: unknown } | null)?.color)
  })
  // Not every window has the preload bridge (unit tests run without a window).
  const api = typeof window === 'undefined' ? undefined : window.openPenApi
  const offIpc = api?.onStrokeStyleChanged?.((style) => accept(style?.color))
  return () => {
    offBus()
    offIpc?.()
  }
}

/** The current pen colour: the last one seen, else the host's initial value. */
export function currentPenColor(): StrokeColor {
  return latest ?? useStrokeStyle().color.value
}
