/**
 * MCP tool `draw` (listed to agents as `openpen.arrow__draw`): draws one arrow
 * between two points given in screenshot pixels.
 *
 * The arrow is built by `buildArrowStroke`, the same function the pointer tool
 * uses, from the host's current pen colour and the user's arrow settings, so
 * an agent's arrow looks like one the user would drag at that moment. Each
 * optional parameter overrides one of those settings for this arrow only.
 * The stroke keeps the `arrow` tool id, so it is drawn by `renderArrowStroke`
 * and `openpen__list_annotations` lists this plugin as its source.
 */
import { defineMcpTool, InvalidParamsError, z } from '@openpen/module-api'
import type { StrokeColor, StrokeStyle } from '@openpen/module-api'
import { commitStroke } from '@openpen/module-api/host'
import { buildArrowStroke, type ArrowToolOptions } from './arrow-tool'
import { MIN_ARROW_LENGTH } from './arrow-geometry'
import { HEAD_STYLES } from './head-style'
import { ARROW_LINE_WIDTH_MAX, ARROW_LINE_WIDTH_MIN } from './line-width'
import { LINE_STYLES } from './line-style'

export interface ArrowDrawToolOptions extends Required<ArrowToolOptions> {
  /** Returns the host's current pen colour at draw time. */
  penColor: () => StrokeColor
}

const coordinate = (axis: 'X' | 'Y', end: 'Start' | 'End') =>
  z
    .number()
    .min(0)
    .describe(
      `${end} ${axis} in screenshot pixels of the display, from the ${axis === 'X' ? 'left' : 'top'} edge.` +
        (end === 'End' ? ' The arrowhead is drawn at the end point.' : ''),
    )

const inputSchema = z.object({
  x1: coordinate('X', 'Start'),
  y1: coordinate('Y', 'Start'),
  x2: coordinate('X', 'End'),
  y2: coordinate('Y', 'End'),
  color: z
    .string()
    .optional()
    .describe('CSS colour such as "#ff3b30" or "red". Defaults to the current pen colour.'),
  lineWidth: z
    .number()
    .int()
    .min(ARROW_LINE_WIDTH_MIN)
    .max(ARROW_LINE_WIDTH_MAX)
    .optional()
    .describe(
      `Line width, ${ARROW_LINE_WIDTH_MIN} to ${ARROW_LINE_WIDTH_MAX}; the arrowhead grows with it. Defaults to the user's arrow width.`,
    ),
  headStyle: z
    .enum(HEAD_STYLES as [string, ...string[]])
    .optional()
    .describe('"solid" (filled triangle), "open" (two strokes) or "hollow" (outlined triangle). Defaults to the user\'s choice.'),
  doubleHeaded: z
    .boolean()
    .optional()
    .describe('true puts a head on both ends. Defaults to the user\'s choice.'),
  lineStyle: z
    .enum(LINE_STYLES as [string, ...string[]])
    .optional()
    .describe('Shaft style: "solid", "dashed" or "dotted"; heads stay solid. Defaults to the user\'s choice.'),
})

const DESCRIPTION =
  'Draws one straight arrow on the screen from a start point to an end point, with the arrowhead at the end. ' +
  'Suits pointing at a button, a value or a region, or showing a direction or a flow between two places. ' +
  'Draws a single straight arrow per call: no curves, no text label, and the start and end must be at least a few pixels apart. ' +
  'The arrow stays until the user or another call removes it, and undo removes it like a hand-drawn one. ' +
  'Coordinates are pixels of the display screenshot, origin at its top-left corner. ' +
  'Colour, width, head style, double heads and line style default to what the user set for the arrow tool and the current pen colour; each optional parameter overrides one of them for this arrow only. ' +
  'The result is the new annotation id.'

function isCssColor(value: string): boolean {
  // The overlay has CSS; outside a browser (unit tests) the canvas would never see it.
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return value.trim() !== ''
  return CSS.supports('color', value)
}

export function createArrowDrawTool(opts: ArrowDrawToolOptions) {
  return defineMcpTool({
    name: 'draw',
    title: 'mcp.drawTitle',
    description: DESCRIPTION,
    inputSchema,
    annotations: { readOnly: false, destructive: false, idempotent: false, openWorld: false },
    handler(args, ctx) {
      if (args.color !== undefined && !isCssColor(args.color)) {
        throw new InvalidParamsError(
          `color "${args.color}" is not a CSS colour.`,
          'Resend with a colour such as "#ff3b30", "rgb(255,59,48)" or "red", or omit color to use the current pen colour.',
        )
      }
      const start = ctx.toCanvas({ x: args.x1, y: args.y1 })
      const end = ctx.toCanvas({ x: args.x2, y: args.y2 })
      // Same style object the canvas hands the pointer tool for a manual stroke.
      const style: StrokeStyle = {
        color: args.color ?? opts.penColor(),
        lineWidth: args.lineWidth ?? opts.lineWidth(),
        lineCap: 'round',
        lineJoin: 'round',
      }
      const stroke = buildArrowStroke(start, end, style, {
        headStyle: () => (args.headStyle as ReturnType<typeof opts.headStyle>) ?? opts.headStyle(),
        doubleHeaded: () => args.doubleHeaded ?? opts.doubleHeaded(),
        lineStyle: () => (args.lineStyle as ReturnType<typeof opts.lineStyle>) ?? opts.lineStyle(),
      })
      if (!stroke) {
        throw new InvalidParamsError(
          `The start and end points are too close together for an arrow (under ${MIN_ARROW_LENGTH} canvas points apart).`,
          'Resend with the end point further from the start point.',
        )
      }
      commitStroke(stroke)
      return { id: stroke.id, displayId: ctx.displayId }
    },
  })
}

/** Usage guide returned by `openpen__get_guide({ plugin: '@openpen/arrow' })`. */
export const ARROW_MCP_GUIDE = [
  'The arrow plugin draws straight arrows with the same look as the Arrow tool in the control bar.',
  '',
  'One call to draw makes one arrow. Take a screenshot first and read both points off it: the start is where the arrow comes from, the end is what it points at, and the head is drawn at the end. To point at something without covering it, end the arrow a little outside its edge.',
  '',
  'Leave the style parameters out to match the arrows the user draws by hand; set color or lineWidth only when the arrow must stand out from the background or from other annotations.',
  '',
  'Each arrow is an annotation like any other: openpen__list_annotations lists it with kind "arrow" and source "@openpen/arrow", openpen__delete_annotation removes it by the id draw returned, and undo removes the last one.',
].join('\n')
