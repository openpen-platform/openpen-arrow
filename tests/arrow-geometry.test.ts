import { describe, expect, it } from 'vitest'
import {
  arrowBarbs,
  arrowHeadLen,
  BARB_SPREAD,
  distance,
  insetAlong,
  MIN_ARROW_LENGTH,
  shaftSurvivesInset,
} from '../src/arrow-geometry'

const COS30 = Math.cos(Math.PI / 6) // ≈ 0.8660254
const SIN30 = Math.sin(Math.PI / 6) // = 0.5

describe('arrowHeadLen — clamp(lineWidth*4, 10, 28)', () => {
  it('clamps to the 10px floor below the lower knee (lineWidth=1 → 4 → 10)', () => {
    expect(arrowHeadLen(1)).toBe(10)
  })

  it('clamps zero / negative widths to the 10px floor', () => {
    expect(arrowHeadLen(0)).toBe(10)
    expect(arrowHeadLen(-5)).toBe(10)
  })

  it('scales linearly inside the band (lineWidth=3 → 12)', () => {
    expect(arrowHeadLen(3)).toBe(12)
  })

  it('hits the 28px ceiling exactly at lineWidth=7 (7*4 = 28)', () => {
    expect(arrowHeadLen(7)).toBe(28)
  })

  it('clamps to the 28px ceiling for very large widths', () => {
    expect(arrowHeadLen(1000)).toBe(28)
  })

  it('passes through a representative mid-band value (lineWidth=5 → 20)', () => {
    expect(arrowHeadLen(5)).toBe(20)
  })
})

describe('distance — Euclidean', () => {
  it('returns 0 for identical points', () => {
    expect(distance({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0)
  })

  it('computes the classic 3-4-5 triangle hypotenuse', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('is symmetric', () => {
    const a = { x: -2, y: 7 }
    const b = { x: 9, y: -1 }
    expect(distance(a, b)).toBeCloseTo(distance(b, a), 12)
  })
})

describe('arrowBarbs — directional geometry (headLen=10, spread=30°)', () => {
  const headLen = 10

  it('keeps the tip unchanged', () => {
    const { tip } = arrowBarbs({ x: 0, y: 0 }, { x: 50, y: 13 }, headLen)
    expect(tip).toEqual({ x: 50, y: 13 })
  })

  // Horizontal rightward: angle = 0.
  // b = tip - 10*(cos(∓30°), sin(∓30°)) = tip - (8.66, ∓5)
  it('points right (→): barbs trail left-and-up / left-and-down behind the tip', () => {
    const { b1, b2 } = arrowBarbs({ x: 0, y: 0 }, { x: 40, y: 0 }, headLen)
    // b1 uses angle-spread = -30°: x = 40 - 10*cos(-30) = 40-8.66; y = 0 - 10*sin(-30) = +5
    expect(b1.x).toBeCloseTo(40 - 10 * COS30, 6)
    expect(b1.y).toBeCloseTo(5, 6)
    // b2 uses angle+spread = +30°: y = 0 - 10*sin(30) = -5
    expect(b2.x).toBeCloseTo(40 - 10 * COS30, 6)
    expect(b2.y).toBeCloseTo(-5, 6)
  })

  // Horizontal leftward: angle = π. cos(π∓30°) = -cos(∓30°); barbs trail to the right of tip.
  it('points left (←): barbs trail to the right of the tip', () => {
    const { b1, b2 } = arrowBarbs({ x: 40, y: 0 }, { x: 0, y: 0 }, headLen)
    // x = 0 - 10*cos(π∓30) = 0 + 10*cos(30) = +8.66
    expect(b1.x).toBeCloseTo(10 * COS30, 6)
    expect(b2.x).toBeCloseTo(10 * COS30, 6)
    // b1 y = 0 - 10*sin(π-30) = -10*sin(150°) = -5 ; b2 y = -10*sin(π+30) = -10*(-0.5) = +5
    expect(b1.y).toBeCloseTo(-5, 6)
    expect(b2.y).toBeCloseTo(5, 6)
  })

  // Vertical downward: angle = +π/2 (canvas y grows downward).
  it('points down (↓): barbs trail upward (smaller y) and split left/right', () => {
    const { b1, b2 } = arrowBarbs({ x: 0, y: 0 }, { x: 0, y: 40 }, headLen)
    // b1: angle-spread = 60°. x = 0 - 10*cos(60) = -5 ; y = 40 - 10*sin(60) = 40-8.66
    expect(b1.x).toBeCloseTo(-5, 6)
    expect(b1.y).toBeCloseTo(40 - 10 * COS30, 6)
    // b2: angle+spread = 120°. x = 0 - 10*cos(120) = +5 ; y = 40 - 10*sin(120) = 40-8.66
    expect(b2.x).toBeCloseTo(5, 6)
    expect(b2.y).toBeCloseTo(40 - 10 * COS30, 6)
  })

  // Vertical upward: angle = -π/2.
  it('points up (↑): barbs trail downward (larger y) and split left/right', () => {
    const { b1, b2 } = arrowBarbs({ x: 0, y: 40 }, { x: 0, y: 0 }, headLen)
    // b1: angle-spread = -120°. x = 0 - 10*cos(-120) = +5 ; y = 0 - 10*sin(-120) = +8.66
    expect(b1.x).toBeCloseTo(5, 6)
    expect(b1.y).toBeCloseTo(10 * COS30, 6)
    // b2: angle+spread = -60°. x = 0 - 10*cos(-60) = -5 ; y = 0 - 10*sin(-60) = +8.66
    expect(b2.x).toBeCloseTo(-5, 6)
    expect(b2.y).toBeCloseTo(10 * COS30, 6)
  })

  // 45° down-right: angle = π/4. Use headLen 12 to exercise a non-10 value.
  it('points 45° down-right: barbs sit symmetric about the shaft axis', () => {
    const hl = 12
    const { b1, b2 } = arrowBarbs({ x: 0, y: 0 }, { x: 30, y: 30 }, hl)
    // angle-spread = 15°, angle+spread = 75°.
    expect(b1.x).toBeCloseTo(30 - hl * Math.cos(Math.PI / 12), 6)
    expect(b1.y).toBeCloseTo(30 - hl * Math.sin(Math.PI / 12), 6)
    expect(b2.x).toBeCloseTo(30 - hl * Math.cos((5 * Math.PI) / 12), 6)
    expect(b2.y).toBeCloseTo(30 - hl * Math.sin((5 * Math.PI) / 12), 6)
  })

  // Reverse direction: tip to the lower-left of `from` (angle in third quadrant).
  it('points to lower-left (tip below-left of from)', () => {
    const { b1, b2 } = arrowBarbs({ x: 50, y: 10 }, { x: 10, y: 50 }, headLen)
    const angle = Math.atan2(50 - 10, 10 - 50) // atan2(40, -40) = 135°
    expect(b1.x).toBeCloseTo(10 - headLen * Math.cos(angle - Math.PI / 6), 6)
    expect(b1.y).toBeCloseTo(50 - headLen * Math.sin(angle - Math.PI / 6), 6)
    expect(b2.x).toBeCloseTo(10 - headLen * Math.cos(angle + Math.PI / 6), 6)
    expect(b2.y).toBeCloseTo(50 - headLen * Math.sin(angle + Math.PI / 6), 6)
  })

  it('places both barbs at distance headLen from the tip', () => {
    const tip = { x: 17, y: -23 }
    const { b1, b2 } = arrowBarbs({ x: -4, y: 8 }, tip, headLen)
    expect(distance(tip, b1)).toBeCloseTo(headLen, 6)
    expect(distance(tip, b2)).toBeCloseTo(headLen, 6)
  })

  it('keeps the two barbs symmetric about the from→tip axis', () => {
    // The shaft midline bisects the barb pair: the midpoint of b1,b2 lies on
    // the line through from→tip, and b1,b2 are mirror images across it.
    const from = { x: 5, y: 5 }
    const tip = { x: 65, y: 25 }
    const { b1, b2 } = arrowBarbs(from, tip, headLen)
    const mid = { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 }
    // Cross product of (tip-from) and (mid-from) must be ~0 → mid is collinear.
    const cross =
      (tip.x - from.x) * (mid.y - from.y) - (tip.y - from.y) * (mid.x - from.x)
    expect(cross).toBeCloseTo(0, 6)
    // Each barb equidistant from the axis line ⇒ equal distance from tip already
    // asserted; confirm the pair is mirrored: their distances to the midpoint match.
    expect(distance(b1, mid)).toBeCloseTo(distance(b2, mid), 6)
  })

  it('uses the BARB_SPREAD default (30°) when spread omitted', () => {
    expect(BARB_SPREAD).toBeCloseTo(Math.PI / 6, 12)
    const omitted = arrowBarbs({ x: 0, y: 0 }, { x: 40, y: 0 }, headLen)
    const explicit = arrowBarbs({ x: 0, y: 0 }, { x: 40, y: 0 }, headLen, Math.PI / 6)
    expect(omitted).toEqual(explicit)
  })
})

describe('insetAlong — shorten a segment from the tip back toward from', () => {
  it('pulls the endpoint inward by exactly `inset` px along the shaft', () => {
    // Horizontal segment length 100, inset 30 → endpoint at x=70.
    const p = insetAlong({ x: 0, y: 0 }, { x: 100, y: 0 }, 30)
    expect(p.x).toBeCloseTo(70, 6)
    expect(p.y).toBeCloseTo(0, 6)
  })

  it('keeps the inset point on the original line, between from and tip', () => {
    const from = { x: 10, y: 20 }
    const tip = { x: 110, y: 95 } // length 125 (75-100-125 triangle)
    const p = insetAlong(from, tip, 25)
    // Collinearity: cross product of (tip-from) and (p-from) ~ 0.
    const cross =
      (tip.x - from.x) * (p.y - from.y) - (tip.y - from.y) * (p.x - from.x)
    expect(cross).toBeCloseTo(0, 6)
    // The shortened endpoint is `inset` closer to from than tip was.
    expect(distance(from, p)).toBeCloseTo(distance(from, tip) - 25, 6)
  })

  it('preserves direction: the inset point lies between from and tip, not past from', () => {
    const from = { x: 0, y: 0 }
    const tip = { x: 0, y: 50 }
    const p = insetAlong(from, tip, 10)
    expect(p.y).toBeCloseTo(40, 6)
    expect(p.y).toBeGreaterThan(0) // not flipped past `from`
  })

  it('clamps to `from` when inset exceeds the segment length (never overshoots)', () => {
    const from = { x: 4, y: 4 }
    const tip = { x: 4, y: 14 } // length 10
    const p = insetAlong(from, tip, 999)
    expect(p.x).toBeCloseTo(4, 6)
    expect(p.y).toBeCloseTo(4, 6) // pinned at `from`, not beyond
  })

  it('returns the tip unchanged for a zero-length segment (no NaN from /0)', () => {
    const p = insetAlong({ x: 7, y: 7 }, { x: 7, y: 7 }, 5)
    expect(p).toEqual({ x: 7, y: 7 })
  })
})

describe('shaftSurvivesInset — guards the reversed-shaft case', () => {
  it('survives when a single inset is shorter than the shaft', () => {
    expect(shaftSurvivesInset(100, 24, false)).toBe(true)
  })

  it('fails when a single inset meets or exceeds the shaft (head dominates)', () => {
    expect(shaftSurvivesInset(20, 24, false)).toBe(false)
    expect(shaftSurvivesInset(24, 24, false)).toBe(false) // exactly equal → no shaft
  })

  it('counts both ends for a double-headed arrow', () => {
    // 2×24 = 48 inset vs 40 shaft → would reverse → no shaft.
    expect(shaftSurvivesInset(40, 24, true)).toBe(false)
    // 2×24 = 48 vs 52 shaft → survives.
    expect(shaftSurvivesInset(52, 24, true)).toBe(true)
    // Exactly 2×inset → no shaft.
    expect(shaftSurvivesInset(48, 24, true)).toBe(false)
  })

  it('an open head (inset 0) always survives for any positive shaft', () => {
    expect(shaftSurvivesInset(1, 0, false)).toBe(true)
    expect(shaftSurvivesInset(1, 0, true)).toBe(true)
  })
})

describe('MIN_ARROW_LENGTH constant', () => {
  it('is the 3px discard threshold from the design (§5.1)', () => {
    expect(MIN_ARROW_LENGTH).toBe(3)
  })
})
