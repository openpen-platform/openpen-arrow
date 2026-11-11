/**
 * Arrow-specific line width. Same 1–20 range and default 4 as the host's
 * global stroke-width slider, but stored in this plugin's own settings so
 * changing it never moves the global slider or any other tool's width.
 */
export const ARROW_LINE_WIDTH_MIN = 1
export const ARROW_LINE_WIDTH_MAX = 20
export const ARROW_LINE_WIDTH_DEFAULT = 4

/** Round to an integer and clamp into 1..20; non-finite input falls back to the default. */
export function clampArrowLineWidth(value: number): number {
  if (!Number.isFinite(value)) return ARROW_LINE_WIDTH_DEFAULT
  return Math.min(ARROW_LINE_WIDTH_MAX, Math.max(ARROW_LINE_WIDTH_MIN, Math.round(value)))
}
