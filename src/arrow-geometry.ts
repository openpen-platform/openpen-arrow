/**
 * Pure arrowhead geometry — no canvas, no DOM. Kept side-effect free so the
 * barb math can be unit-tested in isolation.
 */
import type { Point } from '@openpen/module-api'

/** Head style variants. `solid` = filled triangle, `open` = V chevron, `hollow` = outlined triangle. */
export type HeadStyle = 'solid' | 'open' | 'hollow'

/** Half-angle between the shaft and each barb. 30° is the common arrowhead spread. */
export const BARB_SPREAD = Math.PI / 6

/** Below this shaft length (px) an arrow is treated as a zero-length click and discarded. */
export const MIN_ARROW_LENGTH = 3

/**
 * Head length in px, scaled to line width and clamped to a sane visible range.
 * Mirrors the Annotate convention (head scales with stroke) and the 3–5× band.
 */
export function arrowHeadLen(lineWidth: number): number {
  return Math.min(Math.max(lineWidth * 4, 10), 28)
}

/** Euclidean distance between two points. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** The two barb endpoints for a head pointing from `from` toward `tip`. */
export interface BarbPoints {
  /** The arrow tip (apex). */
  tip: Point
  /** First barb endpoint (tip rotated by `-spread`). */
  b1: Point
  /** Second barb endpoint (tip rotated by `+spread`). */
  b2: Point
}

/**
 * Compute the two barb endpoints for an arrowhead at `tip`, where the shaft
 * arrives from `from`. `headLen` is the barb length; `spread` the half-angle.
 */
export function arrowBarbs(
  from: Point,
  tip: Point,
  headLen: number,
  spread: number = BARB_SPREAD,
): BarbPoints {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x)
  return {
    tip: { x: tip.x, y: tip.y },
    b1: {
      x: tip.x - headLen * Math.cos(angle - spread),
      y: tip.y - headLen * Math.sin(angle - spread),
    },
    b2: {
      x: tip.x - headLen * Math.cos(angle + spread),
      y: tip.y - headLen * Math.sin(angle + spread),
    },
  }
}

/**
 * Whether the shaft survives head insets without reversing. When the combined
 * inset (both ends for a double head, one end for a single inset head) meets or
 * exceeds the shaft length, the inset points cross and drawing the shaft would
 * paint a backwards segment — callers MUST skip the shaft and draw heads only.
 *
 * `inset` is the per-end inset (0 for an open head that is not inset).
 */
export function shaftSurvivesInset(
  shaftLen: number,
  inset: number,
  doubleHeaded: boolean,
): boolean {
  const totalInset = doubleHeaded ? inset * 2 : inset
  return totalInset < shaftLen
}

/**
 * Pull a point in from `tip` toward `from` by `inset` px along the shaft.
 * Used to shorten the shaft so it does not poke through a filled head; for a
 * double-headed arrow both ends are inset.
 */
export function insetAlong(from: Point, tip: Point, inset: number): Point {
  const len = distance(from, tip)
  if (len === 0) return { x: tip.x, y: tip.y }
  const t = Math.max(0, len - inset) / len
  return {
    x: from.x + (tip.x - from.x) * t,
    y: from.y + (tip.y - from.y) * t,
  }
}
