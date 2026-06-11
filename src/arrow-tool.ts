/**
 * Arrow tool — a straight line with arrowhead(s). Shift snaps to 45° using the
 * same angle resolver as the built-in line tool. The finished stroke carries
 * `headStyle` / `doubleHeaded` as extra Stroke state so `renderArrowStroke`
 * can redraw the heads on history replay (the host fallback polyline has no
 * arrowheads, so a custom renderer is mandatory here).
 */
import { resolveStrokeColor } from '@openpen/module-api'
import type { Point, PointerModifiers, Stroke, StrokeStyle, Tool } from '@openpen/module-api'
import {
  arrowBarbs,
  arrowHeadLen,
  distance,
  insetAlong,
  MIN_ARROW_LENGTH,
  shaftSurvivesInset,
  type HeadStyle,
} from './arrow-geometry'

export interface ArrowToolOptions {
  /** Returns the current head style at draw time. */
  headStyle: () => HeadStyle
  /** Returns whether both ends get a head at draw time. */
  doubleHeaded: () => boolean
}

/** Snap `point` to 45° multiples around `start` while Shift is held. */
function resolveEnd(start: Point, point: Point, shiftKey: boolean): Point {
  if (!shiftKey) return { ...point }
  const dx = point.x - start.x
  const dy = point.y - start.y
  if (dx === 0 && dy === 0) return { ...point }
  const angle = Math.atan2(dy, dx)
  const snap = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
  const dist = Math.hypot(dx, dy)
  return { x: start.x + Math.cos(snap) * dist, y: start.y + Math.sin(snap) * dist }
}

/** Draw one arrowhead (filled / open / hollow) pointing from `from` to `tip`. */
function drawHead(
  ctx: CanvasRenderingContext2D,
  from: Point,
  tip: Point,
  headLen: number,
  headStyle: HeadStyle,
  color: string,
): void {
  const { b1, b2 } = arrowBarbs(from, tip, headLen)
  if (headStyle === 'open') {
    ctx.beginPath()
    ctx.moveTo(b1.x, b1.y)
    ctx.lineTo(tip.x, tip.y)
    ctx.lineTo(b2.x, b2.y)
    ctx.stroke()
    return
  }
  ctx.beginPath()
  ctx.moveTo(tip.x, tip.y)
  ctx.lineTo(b1.x, b1.y)
  ctx.lineTo(b2.x, b2.y)
  ctx.closePath()
  if (headStyle === 'hollow') {
    ctx.stroke()
  } else {
    ctx.fillStyle = color
    ctx.fill()
  }
}

/**
 * Render a finished arrow line + head(s). Shared by the live preview and the
 * history-replay renderer so both paths look identical.
 */
function paintArrow(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  style: StrokeStyle,
  headStyle: HeadStyle,
  doubleHeaded: boolean,
): void {
  const color = resolveStrokeColor(style.color)
  const headLen = arrowHeadLen(style.lineWidth)

  // Inset shaft ends under filled heads so the line does not poke through.
  const shaftInset = headStyle === 'open' ? 0 : headLen
  const shaftLen = distance(start, end)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = style.lineWidth
  ctx.lineCap = style.lineCap
  ctx.lineJoin = style.lineJoin

  // When the heads consume the whole shaft, the inset points cross and the
  // shaft would render reversed. Draw heads only in that case.
  if (shaftSurvivesInset(shaftLen, shaftInset, doubleHeaded)) {
    const shaftEnd = insetAlong(start, end, shaftInset)
    const shaftStart = doubleHeaded ? insetAlong(end, start, shaftInset) : { ...start }
    ctx.beginPath()
    ctx.moveTo(shaftStart.x, shaftStart.y)
    ctx.lineTo(shaftEnd.x, shaftEnd.y)
    ctx.stroke()
  }

  drawHead(ctx, start, end, headLen, headStyle, color)
  if (doubleHeaded) drawHead(ctx, end, start, headLen, headStyle, color)

  ctx.restore()
}

export function createArrowTool(opts: ArrowToolOptions): Tool {
  let start: Point | null = null
  let end: Point | null = null
  let style: StrokeStyle | null = null

  return {
    needsPreviewRedraw: true,

    onPointerDown(_ctx, point, s) {
      start = { ...point }
      end = null
      style = { ...s }
    },

    onPointerMove(ctx, point, modifiers: PointerModifiers = {}) {
      if (!start || !style) return
      end = resolveEnd(start, point, modifiers.shiftKey === true)
      if (distance(start, end) < MIN_ARROW_LENGTH) return
      paintArrow(ctx, start, end, style, opts.headStyle(), opts.doubleHeaded())
    },

    onPointerUp(_ctx, point, modifiers: PointerModifiers = {}): Stroke | null {
      if (!start || !style) return null
      const finalEnd = end ?? resolveEnd(start, point, modifiers.shiftKey === true)
      const result: Stroke | null =
        distance(start, finalEnd) < MIN_ARROW_LENGTH
          ? null
          : {
              id: crypto.randomUUID(),
              tool: 'arrow',
              points: [{ ...start }, { ...finalEnd }],
              style: { ...style },
              headStyle: opts.headStyle(),
              doubleHeaded: opts.doubleHeaded(),
            }
      start = null
      end = null
      style = null
      return result
    },
  }
}

/**
 * History-replay renderer. Reads `headStyle` / `doubleHeaded` back from the
 * Stroke's extra-state index signature (TypeScript cannot infer them).
 */
export function renderArrowStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
): void {
  if (stroke.points.length < 2) return
  const start = stroke.points[0]
  const end = stroke.points[stroke.points.length - 1]
  const headStyle = (stroke.headStyle as HeadStyle | undefined) ?? 'solid'
  const doubleHeaded = (stroke.doubleHeaded as boolean | undefined) ?? false
  paintArrow(ctx, start, end, stroke.style, headStyle, doubleHeaded)
}
