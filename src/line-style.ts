/**
 * Arrow line style choices (shaft only; the heads are always drawn solid).
 * One definition and one clamp rule shared by the settings schema, the
 * control-bar panel and the tool: an unknown saved value falls back to `solid`.
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted'

export const LINE_STYLES: readonly LineStyle[] = ['solid', 'dashed', 'dotted']
export const LINE_STYLE_DEFAULT: LineStyle = 'solid'

/** Return `value` when it is one of the known line styles, otherwise the default. */
export function clampLineStyle(value: unknown): LineStyle {
  return (LINE_STYLES as readonly unknown[]).includes(value)
    ? (value as LineStyle)
    : LINE_STYLE_DEFAULT
}

export interface ShaftDash {
  /** Dash pattern for `setLineDash`; empty means a continuous line. */
  pattern: number[]
  /** Cap that makes the pattern read correctly (round caps turn zero-length dashes into dots). */
  cap: CanvasLineCap | null
}

/** Dash pattern scaled to the line width so thin and thick arrows look alike. */
export function shaftDash(lineStyle: LineStyle, lineWidth: number): ShaftDash {
  const w = Math.max(lineWidth, 1)
  if (lineStyle === 'dashed') return { pattern: [w * 3, w * 2], cap: 'butt' }
  if (lineStyle === 'dotted') return { pattern: [0, w * 2], cap: 'round' }
  return { pattern: [], cap: null }
}
