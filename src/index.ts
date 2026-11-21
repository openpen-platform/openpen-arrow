/**
 * @openpen/arrow — straight-line tool with arrowheads.
 *
 * Contributes:
 *   - The arrow `Tool` to `canvas.tools` (custom `renderStroke` draws the
 *     shaft + barbs; the host fallback polyline has no arrowheads).
 *   - A crosshair cursor for `ui.cursors`.
 *   - A tool button in the control bar 'tools' group, with a caret that opens
 *     an options popover (line width, line style, head style, double-headed), same
 *     pattern as the host's shape and eraser buttons. There is no settings
 *     window panel: every arrow option lives in that popover.
 *   - A drawing-scope shortcut that switches to the arrow tool.
 *   - The MCP tool `draw` (`openpen.arrow__draw` for agents) and its usage
 *     guide: an agent draws the same arrow stroke a manual drag would make.
 *
 * The arrow line width is the plugin's own setting (1–20, default 4), not the
 * host's global width: the tool swaps it into a copy of the host style when a
 * stroke starts, so the global slider and other tools are untouched.
 *
 * Line style / head style / double-headed are config (not in-progress stroke state), so they
 * live in a module-scoped holder hydrated from settings in setup(); the tool
 * factory reads them at draw time via accessor closures. In-progress stroke
 * state stays inside the tool factory's own closure.
 */
import { defineModule, z } from '@openpen/module-api'
export { MODULE_ID } from './module-id'
import { MODULE_ID } from './module-id'
import { activateArrowTool } from './activate'
import { createArrowTool, renderArrowStroke } from './arrow-tool'
import { ARROW_MCP_GUIDE, createArrowDrawTool } from './mcp-draw-tool'
import { currentPenColor, trackPenColor } from './pen-color'
import { ARROW_LINE_WIDTH_DEFAULT, clampArrowLineWidth } from './line-width'
import ArrowToolButton from './ArrowToolButton.vue'
import {
  clampDoubleHeaded,
  clampHeadStyle,
  HEAD_STYLE_DEFAULT,
} from './head-style'
import { clampLineStyle, LINE_STYLE_DEFAULT, type LineStyle } from './line-style'
import type { HeadStyle } from './arrow-geometry'
import en from './locales/en.json'
import zhHant from './locales/zh-Hant.json'
import zhHans from './locales/zh-Hans.json'
import ja from './locales/ja.json'

// Deliberately loose: an out-of-range saved value is clamped on read (see
// `apply` below and the control-bar popover) instead of failing validation and
// discarding the whole settings object.
const settingsSchema = z.object({
  headStyle: z.unknown().default(HEAD_STYLE_DEFAULT),
  doubleHeaded: z.unknown().default(false),
  lineStyle: z.unknown().default(LINE_STYLE_DEFAULT),
  lineWidth: z.number().default(ARROW_LINE_WIDTH_DEFAULT),
})
type ArrowSettings = z.infer<typeof settingsSchema>

const liveSettings: {
  headStyle: HeadStyle
  doubleHeaded: boolean
  lineStyle: LineStyle
  lineWidth: number
} = {
  headStyle: HEAD_STYLE_DEFAULT,
  doubleHeaded: false,
  lineStyle: LINE_STYLE_DEFAULT,
  lineWidth: ARROW_LINE_WIDTH_DEFAULT,
}

const liveOptions = {
  headStyle: () => liveSettings.headStyle,
  doubleHeaded: () => liveSettings.doubleHeaded,
  lineStyle: () => liveSettings.lineStyle,
  lineWidth: () => liveSettings.lineWidth,
}

const arrowTool = createArrowTool(liveOptions)
const drawTool = createArrowDrawTool({ ...liveOptions, penColor: currentPenColor })


const ARROW_CURSOR = {
  svg:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">' +
    '<path d="M 4 20 L 20 4" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M 12 4 L 20 4 L 20 12" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M 4 20 L 20 4" stroke="#111111" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M 12 4 L 20 4 L 20 12" stroke="#111111" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>',
  hotspot: { x: 4, y: 20 },
  fallback: 'crosshair',
}

export default defineModule({
  id: MODULE_ID,
  version: '1.2.0',
  settingsSchema,
  mcpGuide: ARROW_MCP_GUIDE,

  setup(ctx) {
    ctx.onDispose(trackPenColor())
    const apply = (s: ArrowSettings) => {
      liveSettings.headStyle = clampHeadStyle(s.headStyle)
      liveSettings.doubleHeaded = clampDoubleHeaded(s.doubleHeaded)
      liveSettings.lineStyle = clampLineStyle(s.lineStyle)
      liveSettings.lineWidth = clampArrowLineWidth(s.lineWidth ?? ARROW_LINE_WIDTH_DEFAULT)
    }
    apply(ctx.getSettings<ArrowSettings>())
    const stop = ctx.onSettingsChange<ArrowSettings>(apply)
    ctx.onDispose(stop)
  },

  contributes: {
    tools: [
      {
        id: 'arrow',
        label: {
          en: 'Arrow',
          'zh-Hant': '箭頭',
          'zh-Hans': '箭头',
          ja: '矢印',
        },
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>',
        ...arrowTool,
        renderStroke: renderArrowStroke,
      },
    ],
    cursors: [
      {
        id: 'arrow',
        cursor: ARROW_CURSOR,
      },
    ],
    controlBar: [
      {
        id: 'arrow',
        component: ArrowToolButton,
        defaultGroup: 'tools',
        groupHint: { separator: 'auto' },
      },
    ],
    shortcuts: [
      {
        id: 'activate-arrow',
        // Host convention: CommandOrControl + modifier + letter. A = Arrow;
        // Alt instead of Shift because CommandOrControl+Shift+A is the host's
        // drawing-mode toggle. Users can rebind it in Settings → Shortcuts.
        keys: 'CommandOrControl+Alt+A',
        scope: 'drawing',
        label: {
          en: 'Switch to Arrow',
          'zh-Hant': '切換到箭頭',
          'zh-Hans': '切换到箭头',
          ja: '矢印に切り替え',
        },
        userCustomizable: true,
        handler: activateArrowTool,
      },
    ],
    mcpTools: [drawTool],
    locales: {
      en,
      'zh-Hant': zhHant,
      'zh-Hans': zhHans,
      ja,
    },
  },
})
