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
 * The popover writes the arrow line width to this plugin's settings; setup()
 * in every window (control bar and overlays) picks the change up through
 * onSettingsChange, so the overlay draws with the new width immediately.
 */
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ACTIVE_TOOL_KEY,
  MODAL_MANAGER_KEY,
  SNAP_EDGE_KEY,
  useModuleContext,
} from '@openpen/module-api'
import { AppButtonDropdown, AppSlider } from '@openpen/module-api/uikit'
import { MODULE_ID } from './module-id'
import { activateArrowTool } from './activate'
import {
  ARROW_LINE_WIDTH_DEFAULT,
  ARROW_LINE_WIDTH_MAX,
  ARROW_LINE_WIDTH_MIN,
  clampArrowLineWidth,
} from './line-width'

const POPOVER_ID = 'openpen-arrow-options'

const ctx = useModuleContext(MODULE_ID)
const label = computed(() => ctx.t('tool'))
const optionsLabel = computed(() => ctx.t('options.label'))
const lineWidthLabel = computed(() => ctx.t('options.lineWidth'))

const activeTool = inject(ACTIVE_TOOL_KEY)
const snapEdge = inject(SNAP_EDGE_KEY)
const modalManager = inject(MODAL_MANAGER_KEY)
const isActive = computed(() => activeTool?.value === 'arrow')

// Anchor coordinates go stale when the bar snaps to another edge.
watch(() => snapEdge?.value, () => { modalManager?.close(POPOVER_ID) })

const lineWidth = ref(ARROW_LINE_WIDTH_DEFAULT)
let unsub: (() => void) | null = null

onMounted(() => {
  const s = ctx.getSettings<{ lineWidth?: number }>()
  lineWidth.value = clampArrowLineWidth(s.lineWidth ?? ARROW_LINE_WIDTH_DEFAULT)
  unsub = ctx.onSettingsChange<{ lineWidth?: number }>((next) => {
    lineWidth.value = clampArrowLineWidth(next.lineWidth ?? ARROW_LINE_WIDTH_DEFAULT)
  })
})
onUnmounted(() => unsub?.())

async function setLineWidth(value: number) {
  const next = clampArrowLineWidth(Number(value))
  lineWidth.value = next
  await ctx.updateSettings<{ lineWidth: number }>({ lineWidth: next })
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
      <div class="arrow-popover" data-testid="controlbar-arrow-popover">
        <div class="arrow-popover-head">
          <span class="arrow-popover-title">{{ lineWidthLabel }}</span>
          <span class="arrow-popover-value" data-testid="arrow-line-width-value">{{ lineWidth }}px</span>
        </div>
        <AppSlider
          :model-value="lineWidth"
          :min="ARROW_LINE_WIDTH_MIN"
          :max="ARROW_LINE_WIDTH_MAX"
          :step="1"
          track-height="8px"
          track-radius="4px"
          thumb-width="24px"
          thumb-height="16px"
          thumb-radius="8px"
          :aria-label="lineWidthLabel"
          data-testid="arrow-line-width-slider"
          @update:model-value="setLineWidth"
        />
        <div class="arrow-popover-scale" aria-hidden="true">
          <span>{{ ARROW_LINE_WIDTH_MIN }}px</span>
          <span>{{ ARROW_LINE_WIDTH_DEFAULT }}px</span>
          <span>{{ ARROW_LINE_WIDTH_MAX }}px</span>
        </div>
      </div>
    </template>
  </AppButtonDropdown>
</template>

<style scoped>
/*
 * Popover layout mirrors the host's stroke-width popup. The host keeps its
 * popover styles in a global stylesheet plugins cannot import, so this is a
 * local copy built on the public --openpen-* tokens. Scoped styles still
 * apply: the slot content is rendered by this component even though the
 * popover teleports it.
 *
 * One column in both bar orientations, so vertical bars need no variant;
 * AppPopover places it beside the bar.
 *
 * min-width gives AppSlider (width: 100%) a reference width; 180px matches
 * the host popup's usable floor.
 */
.arrow-popover {
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.arrow-popover-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.arrow-popover-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--openpen-color-text-muted);
}

.arrow-popover-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--openpen-color-text-primary);
}

.arrow-popover-scale {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--openpen-color-text-muted);
  padding: 0 2px;
}
</style>
