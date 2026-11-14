<script setup lang="ts">
/*
 * ArrowToolButton — arrow tool button + caret + options popover.
 *
 * Same pattern as the host's shape and eraser buttons: an `AppButtonDropdown`
 * whose main button activates the tool and whose caret opens a popover with
 * the tool's adjustments. Popover lifecycle (mutual exclusion with other
 * popovers, outside-click, placement, vertical bars) is handled by the
 * dropdown's inner AppPopover.
 *
 * The popover writes the arrow line width, line style, head style and
 * double-headed choice to this plugin's settings; setup() in every window (control bar and
 * overlays) picks the change up through onSettingsChange, so the next arrow is
 * drawn with the new choice immediately. Saved values are clamped on read.
 */
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ACTIVE_TOOL_KEY,
  MODAL_MANAGER_KEY,
  SNAP_EDGE_KEY,
  useModuleContext,
} from '@openpen/module-api'
import {
  AppButtonDropdown,
  AppPopoverPanel,
  AppPopoverRow,
  AppSegmented,
  AppSlider,
  AppToggle,
} from '@openpen/module-api/uikit'
import { MODULE_ID } from './module-id'
import { activateArrowTool } from './activate'
import {
  ARROW_LINE_WIDTH_DEFAULT,
  ARROW_LINE_WIDTH_MAX,
  ARROW_LINE_WIDTH_MIN,
  clampArrowLineWidth,
} from './line-width'
import {
  clampDoubleHeaded,
  clampHeadStyle,
  HEAD_STYLE_DEFAULT,
  HEAD_STYLES,
} from './head-style'
import { clampLineStyle, LINE_STYLE_DEFAULT, LINE_STYLES, type LineStyle } from './line-style'
import type { HeadStyle } from './arrow-geometry'

interface ArrowSettings {
  lineWidth?: number
  lineStyle?: unknown
  headStyle?: unknown
  doubleHeaded?: unknown
}

const POPOVER_ID = 'openpen-arrow-options'

const ctx = useModuleContext(MODULE_ID)
const label = computed(() => ctx.t('tool'))
const optionsLabel = computed(() => ctx.t('options.label'))
const lineWidthLabel = computed(() => ctx.t('options.lineWidth'))
const lineStyleLabel = computed(() => ctx.t('options.lineStyle'))
const headStyleLabel = computed(() => ctx.t('options.headStyle'))
const doubleHeadedLabel = computed(() => ctx.t('options.doubleHeaded'))
// Preview icons for the segmented options (currentColor follows the segment).
const svg = (inner: string) =>
  `<svg width="28" height="14" viewBox="0 0 28 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
const HEAD_ICONS: Record<HeadStyle, string> = {
  solid: svg('<line x1="2" y1="7" x2="14" y2="7"/><path d="M26 7 L14 2 L14 12 Z" fill="currentColor"/>'),
  open: svg('<line x1="2" y1="7" x2="25" y2="7"/><polyline points="18,2 25,7 18,12"/>'),
  hollow: svg('<line x1="2" y1="7" x2="14" y2="7"/><path d="M26 7 L14 2 L14 12 Z"/>'),
}
const LINE_ICONS: Record<LineStyle, string> = {
  solid: svg('<line x1="2" y1="7" x2="26" y2="7"/>'),
  dashed: svg('<line x1="2" y1="7" x2="26" y2="7" stroke-dasharray="5 3.5"/>'),
  dotted: svg('<line x1="3" y1="7" x2="26" y2="7" stroke-width="2.6" stroke-dasharray="0.1 5"/>'),
}
const lineStyleOptions = computed(() =>
  LINE_STYLES.map((value) => ({
    value,
    label: ctx.t(`options.lineStyles.${value}`),
    icon: LINE_ICONS[value],
    iconOnly: true,
    testid: `arrow-line-style-${value}`,
  })),
)
const headStyleOptions = computed(() =>
  HEAD_STYLES.map((value) => ({
    value,
    label: ctx.t(`options.headStyles.${value}`),
    icon: HEAD_ICONS[value],
    iconOnly: true,
    testid: `arrow-head-style-${value}`,
  })),
)

const activeTool = inject(ACTIVE_TOOL_KEY)
const snapEdge = inject(SNAP_EDGE_KEY)
const modalManager = inject(MODAL_MANAGER_KEY)
const isActive = computed(() => activeTool?.value === 'arrow')

// Anchor coordinates go stale when the bar snaps to another edge.
watch(() => snapEdge?.value, () => { modalManager?.close(POPOVER_ID) })

const lineWidth = ref(ARROW_LINE_WIDTH_DEFAULT)
const lineStyle = ref<LineStyle>(LINE_STYLE_DEFAULT)
const headStyle = ref<HeadStyle>(HEAD_STYLE_DEFAULT)
const doubleHeaded = ref(false)
let unsub: (() => void) | null = null

function load(s: ArrowSettings) {
  lineWidth.value = clampArrowLineWidth(s.lineWidth ?? ARROW_LINE_WIDTH_DEFAULT)
  lineStyle.value = clampLineStyle(s.lineStyle)
  headStyle.value = clampHeadStyle(s.headStyle)
  doubleHeaded.value = clampDoubleHeaded(s.doubleHeaded)
}

onMounted(() => {
  load(ctx.getSettings<ArrowSettings>())
  unsub = ctx.onSettingsChange<ArrowSettings>(load)
})
onUnmounted(() => unsub?.())

async function setLineWidth(value: number) {
  const next = clampArrowLineWidth(Number(value))
  lineWidth.value = next
  await ctx.updateSettings<ArrowSettings>({ lineWidth: next })
}

async function setLineStyle(value: string) {
  const next = clampLineStyle(value)
  lineStyle.value = next
  await ctx.updateSettings<ArrowSettings>({ lineStyle: next })
}

async function setHeadStyle(value: string) {
  const next = clampHeadStyle(value)
  headStyle.value = next
  await ctx.updateSettings<ArrowSettings>({ headStyle: next })
}

async function setDoubleHeaded(value: boolean) {
  doubleHeaded.value = value
  await ctx.updateSettings<ArrowSettings>({ doubleHeaded: value })
}

/** Opening the options also selects the tool, like the host's shape caret. */
function activateIfNeeded() {
  if (!isActive.value) activateArrowTool()
}
</script>

<template>
  <AppButtonDropdown
    :popover-id="POPOVER_ID"
    popover-placement="auto"
    :active="isActive"
    :main-tooltip="label"
    :main-aria-label="label"
    :caret-aria-label="optionsLabel"
    main-testid="controlbar-arrow-btn"
    caret-testid="controlbar-arrow-caret"
    @main-click="activateArrowTool"
    @caret-click="activateIfNeeded"
  >
    <template #main-content>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="19" x2="19" y2="5" />
        <polyline points="10 5 19 5 19 14" />
      </svg>
    </template>
    <template #popover-content>
      <AppPopoverPanel :title="optionsLabel" data-testid="controlbar-arrow-popover">
        <AppPopoverRow :label="lineWidthLabel">
          <AppSlider
            :model-value="lineWidth"
            :min="ARROW_LINE_WIDTH_MIN"
            :max="ARROW_LINE_WIDTH_MAX"
            :step="1"
            :value-label="`${lineWidth}px`"
            :ariaLabel="lineWidthLabel"
            data-testid="arrow-line-width-slider"
            @update:model-value="setLineWidth"
          />
        </AppPopoverRow>
        <AppPopoverRow :label="headStyleLabel">
          <AppSegmented
            :model-value="headStyle"
            :options="headStyleOptions"
            :ariaLabel="headStyleLabel"
            data-testid="arrow-head-style"
            @update:model-value="setHeadStyle"
          />
        </AppPopoverRow>
        <AppPopoverRow :label="lineStyleLabel">
          <AppSegmented
            :model-value="lineStyle"
            :options="lineStyleOptions"
            :ariaLabel="lineStyleLabel"
            data-testid="arrow-line-style"
            @update:model-value="setLineStyle"
          />
        </AppPopoverRow>
        <AppPopoverRow :label="doubleHeadedLabel">
          <AppToggle
            :model-value="doubleHeaded"
            :aria-label="doubleHeadedLabel"
            testid="arrow-double-headed-toggle"
            @update:model-value="setDoubleHeaded"
          />
        </AppPopoverRow>
      </AppPopoverPanel>
    </template>
  </AppButtonDropdown>
</template>
