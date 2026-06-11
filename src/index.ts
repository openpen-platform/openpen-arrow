/**
 * @openpen/arrow — straight-line tool with arrowheads.
 *
 * Contributes:
 *   - The arrow `Tool` to `canvas.tools` (custom `renderStroke` draws the
 *     shaft + barbs; the host fallback polyline has no arrowheads).
 *   - A crosshair cursor for `ui.cursors`.
 *   - A tool button in the control bar 'tools' group.
 *   - A settings panel (head style + double-headed) for `ui.settings.panels`.
 *
 * Head style / double-headed are config (not in-progress stroke state), so they
 * live in a module-scoped holder hydrated from settings in setup(); the tool
 * factory reads them at draw time via accessor closures. In-progress stroke
 * state stays inside the tool factory's own closure.
 */
import { defineModule, z } from '@openpen/module-api'
export { MODULE_ID } from './module-id'
import { MODULE_ID } from './module-id'
import { createArrowTool, renderArrowStroke } from './arrow-tool'
import ArrowToolButton from './ArrowToolButton.vue'
import ArrowSettingsPanel from './ArrowSettingsPanel.vue'
import en from './locales/en.json'
import zhHant from './locales/zh-Hant.json'
import zhHans from './locales/zh-Hans.json'
import ja from './locales/ja.json'

const settingsSchema = z.object({
  headStyle: z.enum(['solid', 'open', 'hollow']).default('solid'),
  doubleHeaded: z.boolean().default(false),
})
type ArrowSettings = z.infer<typeof settingsSchema>

const liveSettings: ArrowSettings = { headStyle: 'solid', doubleHeaded: false }

const arrowTool = createArrowTool({
  headStyle: () => liveSettings.headStyle,
  doubleHeaded: () => liveSettings.doubleHeaded,
})

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
  version: '1.0.0',
  settingsSchema,

  setup(ctx) {
    const apply = (s: ArrowSettings) => {
      liveSettings.headStyle = s.headStyle
      liveSettings.doubleHeaded = s.doubleHeaded
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
    settingsPanels: [
      {
        id: 'arrow-settings',
        label: {
          en: 'Arrow',
          'zh-Hant': '箭頭',
          'zh-Hans': '箭头',
          ja: '矢印',
        },
        component: ArrowSettingsPanel,
      },
    ],
    locales: {
      en,
      'zh-Hant': zhHant,
      'zh-Hans': zhHans,
      ja,
    },
  },
})
