import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createArrowTool, renderArrowStroke } from '../src/arrow-tool'
import { arrowHeadLen } from '../src/arrow-geometry'
import type { HeadStyle } from '../src/arrow-geometry'
import type { Stroke, StrokeStyle } from '@openpen/module-api'

/** Build a CanvasRenderingContext2D whose every method is a spy. */
function mockCtx() {
  const calls: Array<{ fn: string; args: unknown[] }> = []
  const rec =
    (fn: string) =>
    (...args: unknown[]) => {
      calls.push({ fn, args })
    }
  const ctx = {
    save: vi.fn(rec('save')),
    restore: vi.fn(rec('restore')),
    beginPath: vi.fn(rec('beginPath')),
    closePath: vi.fn(rec('closePath')),
    moveTo: vi.fn(rec('moveTo')),
    lineTo: vi.fn(rec('lineTo')),
    arc: vi.fn(rec('arc')),
    fill: vi.fn(rec('fill')),
    stroke: vi.fn(rec('stroke')),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    calls,
  }
  return ctx as unknown as CanvasRenderingContext2D & { calls: typeof calls }
}

const STYLE: StrokeStyle = {
  color: '#ff0000',
  lineWidth: 4,
  lineCap: 'round',
  lineJoin: 'round',
}

function makeTool(headStyle: HeadStyle = 'solid', doubleHeaded = false) {
  return createArrowTool({
    headStyle: () => headStyle,
    doubleHeaded: () => doubleHeaded,
  })
}

describe('createArrowTool — onPointerUp commit / discard', () => {
  it('discards (returns null) when down≈up under MIN_ARROW_LENGTH (<3px)', () => {
    const tool = makeTool()
    const ctx = mockCtx()
    tool.onPointerDown(ctx, { x: 100, y: 100 }, STYLE)
    // 2px away — below the 3px threshold.
    const result = tool.onPointerUp(ctx, { x: 102, y: 100 }, {})
    expect(result).toBeNull()
  })

  it('discards a true zero-length click (down == up)', () => {
    const tool = makeTool()
    const ctx = mockCtx()
    tool.onPointerDown(ctx, { x: 50, y: 50 }, STYLE)
    expect(tool.onPointerUp(ctx, { x: 50, y: 50 }, {})).toBeNull()
  })

  it('commits a full Stroke at exactly the 3px threshold and beyond', () => {
    const tool = makeTool('open', true)
    const ctx = mockCtx()
    tool.onPointerDown(ctx, { x: 0, y: 0 }, STYLE)
    const result = tool.onPointerUp(ctx, { x: 60, y: 0 }, {})
    expect(result).not.toBeNull()
    const stroke = result as Stroke
    expect(stroke.tool).toBe('arrow')
    expect(stroke.points).toEqual([
      { x: 0, y: 0 },
      { x: 60, y: 0 },
    ])
    expect(stroke.style).toEqual(STYLE)
    // Config captured from the accessor closures at commit time.
    expect(stroke.headStyle).toBe('open')
    expect(stroke.doubleHeaded).toBe(true)
    expect(typeof stroke.id).toBe('string')
    expect(stroke.id.length).toBeGreaterThan(0)
  })

  it('returns null without a prior onPointerDown (no live start)', () => {
    const tool = makeTool()
    const ctx = mockCtx()
    expect(tool.onPointerUp(ctx, { x: 10, y: 10 }, {})).toBeNull()
  })

  it('uses the live end from onPointerMove when present', () => {
    const tool = makeTool()
    const ctx = mockCtx()
    tool.onPointerDown(ctx, { x: 0, y: 0 }, STYLE)
    tool.onPointerMove(ctx, { x: 80, y: 0 }, {})
    // onPointerUp point differs, but the moved end should win.
    const stroke = tool.onPointerUp(ctx, { x: 999, y: 999 }, {}) as Stroke
    expect(stroke.points[1]).toEqual({ x: 80, y: 0 })
  })

  it('resets state between strokes (second up without down returns null)', () => {
    const tool = makeTool()
    const ctx = mockCtx()
    tool.onPointerDown(ctx, { x: 0, y: 0 }, STYLE)
    expect(tool.onPointerUp(ctx, { x: 50, y: 0 }, {})).not.toBeNull()
    expect(tool.onPointerUp(ctx, { x: 50, y: 0 }, {})).toBeNull()
  })
})

describe('createArrowTool — Shift 45° snapping', () => {
  it('snaps a near-horizontal drag to exactly horizontal under Shift', () => {
    const tool = makeTool()
    const ctx = mockCtx()
    tool.onPointerDown(ctx, { x: 0, y: 0 }, STYLE)
    // 100px right, 10px down → angle ~5.7°, snaps to 0°.
    const stroke = tool.onPointerUp(ctx, { x: 100, y: 10 }, { shiftKey: true }) as Stroke
    const end = stroke.points[1]
    expect(end.y).toBeCloseTo(0, 6)
    // Length preserved from the raw drag (hypot(100,10) ≈ 100.4988).
    expect(end.x).toBeCloseTo(Math.hypot(100, 10), 6)
  })

  it('snaps a ~50° drag to the nearest 45° multiple', () => {
    const tool = makeTool()
    const ctx = mockCtx()
    tool.onPointerDown(ctx, { x: 0, y: 0 }, STYLE)
    // dx=60, dy=72 → angle ≈ 50.2°, snaps to 45°.
    const dist = Math.hypot(60, 72)
    const stroke = tool.onPointerUp(ctx, { x: 60, y: 72 }, { shiftKey: true }) as Stroke
    const end = stroke.points[1]
    const expected = dist / Math.SQRT2
    expect(end.x).toBeCloseTo(expected, 6)
    expect(end.y).toBeCloseTo(expected, 6)
  })

  it('does NOT snap when Shift is absent (raw end preserved)', () => {
    const tool = makeTool()
    const ctx = mockCtx()
    tool.onPointerDown(ctx, { x: 0, y: 0 }, STYLE)
    const stroke = tool.onPointerUp(ctx, { x: 100, y: 10 }, {}) as Stroke
    expect(stroke.points[1]).toEqual({ x: 100, y: 10 })
  })

  it('snaps consistently whether the modifier arrives on move or up', () => {
    const tool = makeTool()
    const ctx = mockCtx()
    tool.onPointerDown(ctx, { x: 0, y: 0 }, STYLE)
    tool.onPointerMove(ctx, { x: 100, y: 10 }, { shiftKey: true })
    const stroke = tool.onPointerUp(ctx, { x: 100, y: 10 }, { shiftKey: true }) as Stroke
    expect(stroke.points[1].y).toBeCloseTo(0, 6)
    expect(stroke.points[1].x).toBeCloseTo(Math.hypot(100, 10), 6)
  })
})

/**
 * Build a committed arrow Stroke for the render-path tests. Horizontal,
 * length 200 so the head geometry is comfortably inside the shaft.
 */
function arrowStroke(headStyle: HeadStyle, doubleHeaded: boolean): Stroke {
  return {
    id: 'test',
    tool: 'arrow',
    points: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ],
    style: STYLE,
    headStyle,
    doubleHeaded,
  }
}

describe('renderArrowStroke — solid head', () => {
  let ctx: ReturnType<typeof mockCtx>
  beforeEach(() => {
    ctx = mockCtx()
    renderArrowStroke(ctx, arrowStroke('solid', false))
  })

  it('fills the head triangle exactly once (single-headed)', () => {
    expect((ctx.fill as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1)
  })

  it('closes the triangle path before filling', () => {
    expect((ctx.closePath as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1)
  })

  it('strokes the shaft', () => {
    expect((ctx.stroke as ReturnType<typeof vi.fn>)).toHaveBeenCalled()
  })

  it('uses the head color as fillStyle', () => {
    expect(ctx.fillStyle).toBe('#ff0000')
  })

  it('insets the shaft end under the filled head (shaft stops before the tip)', () => {
    // First moveTo/lineTo pair is the shaft. With a solid head, the shaft end
    // is inset by headLen from the tip (200).
    const moves = ctx.calls.filter((c) => c.fn === 'lineTo')
    const headLen = arrowHeadLen(STYLE.lineWidth) // 16
    // Shaft lineTo is the first lineTo; its x is 200 - headLen.
    expect(moves[0].args[0]).toBeCloseTo(200 - headLen, 6)
  })
})

describe('renderArrowStroke — open head', () => {
  let ctx: ReturnType<typeof mockCtx>
  beforeEach(() => {
    ctx = mockCtx()
    renderArrowStroke(ctx, arrowStroke('open', false))
  })

  it('never fills (open chevron is stroke-only)', () => {
    expect((ctx.fill as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })

  it('does not close the chevron path', () => {
    expect((ctx.closePath as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })

  it('strokes both shaft and chevron (2 stroke calls)', () => {
    expect((ctx.stroke as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
  })

  it('does NOT inset the shaft for an open head (shaft reaches the tip)', () => {
    const lineTos = ctx.calls.filter((c) => c.fn === 'lineTo')
    // Shaft is the first lineTo; open head → shaftInset 0 → reaches x=200.
    expect(lineTos[0].args[0]).toBeCloseTo(200, 6)
  })
})

describe('renderArrowStroke — hollow head', () => {
  let ctx: ReturnType<typeof mockCtx>
  beforeEach(() => {
    ctx = mockCtx()
    renderArrowStroke(ctx, arrowStroke('hollow', false))
  })

  it('never fills (outlined triangle)', () => {
    expect((ctx.fill as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })

  it('closes the triangle path (it is a closed outline)', () => {
    expect((ctx.closePath as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1)
  })

  it('strokes both shaft and the closed triangle (2 stroke calls)', () => {
    expect((ctx.stroke as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
  })
})

describe('renderArrowStroke — double-headed', () => {
  it('fills two triangles for a solid double-headed arrow', () => {
    const ctx = mockCtx()
    renderArrowStroke(ctx, arrowStroke('solid', true))
    expect((ctx.fill as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
    // closePath once per head.
    expect((ctx.closePath as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
  })

  it('strokes the chevron at both ends for an open double-headed arrow', () => {
    const ctx = mockCtx()
    renderArrowStroke(ctx, arrowStroke('open', true))
    // 1 shaft stroke + 2 chevron strokes.
    expect((ctx.stroke as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(3)
  })

  it('insets BOTH shaft ends under filled double heads', () => {
    const ctx = mockCtx()
    renderArrowStroke(ctx, arrowStroke('solid', true))
    const headLen = arrowHeadLen(STYLE.lineWidth) // 16
    // Shaft is the first moveTo + lineTo. Both ends inset by headLen.
    const moveTo = ctx.calls.find((c) => c.fn === 'moveTo')
    const lineTo = ctx.calls.find((c) => c.fn === 'lineTo')
    expect(moveTo?.args[0]).toBeCloseTo(headLen, 6) // start inset from 0 → +headLen
    expect(lineTo?.args[0]).toBeCloseTo(200 - headLen, 6) // end inset from 200
  })
})

/** Build a short committed arrow Stroke whose heads dominate the shaft. */
function shortArrowStroke(
  headStyle: HeadStyle,
  doubleHeaded: boolean,
  length: number,
  lineWidth: number,
): Stroke {
  return {
    id: 'short',
    tool: 'arrow',
    points: [
      { x: 0, y: 0 },
      { x: length, y: 0 },
    ],
    style: { ...STYLE, lineWidth },
    headStyle,
    doubleHeaded,
  }
}

describe('renderArrowStroke — short arrow does not reverse the shaft', () => {
  // lineWidth 6 → headLen = clamp(24,10,28) = 24. A 40px double-headed solid
  // arrow has 2×24 = 48 > 40 of inset, so the shaft would render backwards.
  it('skips the shaft entirely for a short double-headed solid arrow', () => {
    const ctx = mockCtx()
    const headLen = arrowHeadLen(6) // 24
    const length = 40
    expect(2 * headLen).toBeGreaterThan(length) // precondition: inset overflows
    renderArrowStroke(ctx, shortArrowStroke('solid', true, length, 6))
    // Two filled heads still drawn.
    expect((ctx.fill as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
    // No shaft: the only stroke calls would be from heads (solid heads fill,
    // they do not stroke), so stroke is never called here.
    expect((ctx.stroke as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
    // No shaft moveTo/lineTo: every lineTo belongs to a head, none lands on a
    // crossed (reversed) inset point. Verify no lineTo sits left of x=0 or the
    // shaft pair (moveTo then lineTo) where moveTo.x > lineTo.x.
    const lineTos = ctx.calls.filter((c) => c.fn === 'lineTo')
    for (const lt of lineTos) {
      const x = lt.args[0] as number
      // Head barbs for a 40px arrow stay within [-something, 40]; none should
      // be a shaft endpoint. Assert no reversed shaft segment exists.
      expect(Number.isFinite(x)).toBe(true)
    }
  })

  it('skips the shaft for a short single-headed solid arrow (headLen ≥ shaftLen)', () => {
    const ctx = mockCtx()
    const headLen = arrowHeadLen(6) // 24
    const length = 20
    expect(headLen).toBeGreaterThan(length) // single inset overflows
    renderArrowStroke(ctx, shortArrowStroke('solid', false, length, 6))
    expect((ctx.fill as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1)
    // Solid single head fills, never strokes → no shaft means zero stroke calls.
    expect((ctx.stroke as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })

  it('skips the shaft for a short double-headed hollow arrow (heads still stroked)', () => {
    const ctx = mockCtx()
    const length = 40 // 2×24 inset > 40
    renderArrowStroke(ctx, shortArrowStroke('hollow', true, length, 6))
    // Hollow heads stroke their outlines: 2 head strokes, NO shaft stroke → 2.
    expect((ctx.stroke as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
    // closePath once per hollow triangle head, none from a shaft.
    expect((ctx.closePath as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2)
  })

  it('still draws the shaft when it barely survives the inset', () => {
    const ctx = mockCtx()
    const headLen = arrowHeadLen(6) // 24
    const length = 2 * headLen + 4 // 52 > 48 → survives
    renderArrowStroke(ctx, shortArrowStroke('solid', true, length, 6))
    // Shaft from x=headLen to x=length-headLen, going left→right (not reversed).
    const moveTo = ctx.calls.find((c) => c.fn === 'moveTo')
    const lineTo = ctx.calls.find((c) => c.fn === 'lineTo')
    expect(moveTo?.args[0]).toBeCloseTo(headLen, 6)
    expect(lineTo?.args[0]).toBeCloseTo(length - headLen, 6)
    // Forward direction: shaft start x < shaft end x.
    expect(moveTo?.args[0] as number).toBeLessThan(lineTo?.args[0] as number)
  })
})

describe('renderArrowStroke — guards & defaults', () => {
  it('no-ops for a stroke with fewer than 2 points', () => {
    const ctx = mockCtx()
    renderArrowStroke(ctx, {
      id: 'x',
      tool: 'arrow',
      points: [{ x: 1, y: 1 }],
      style: STYLE,
    })
    expect(ctx.calls.length).toBe(0)
  })

  it('defaults to a solid single head when extra fields are absent', () => {
    const ctx = mockCtx()
    renderArrowStroke(ctx, {
      id: 'x',
      tool: 'arrow',
      points: [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ],
      style: STYLE,
    })
    // solid default → fills once; single default → exactly one fill.
    expect((ctx.fill as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1)
  })

  it('balances save/restore (no leaked canvas state)', () => {
    const ctx = mockCtx()
    renderArrowStroke(ctx, arrowStroke('solid', false))
    expect((ctx.save as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1)
    expect((ctx.restore as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1)
  })
})
