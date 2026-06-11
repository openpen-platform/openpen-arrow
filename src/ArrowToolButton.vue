<script setup lang="ts">
import { computed, inject } from 'vue'
import { ACTIVE_TOOL_KEY, useModuleContext } from '@openpen/module-api'
import { AppButton } from '@openpen/module-api/uikit'
import { MODULE_ID } from './module-id'

const ctx = useModuleContext(MODULE_ID)
const label = computed(() => ctx.t('tool'))

const activeTool = inject(ACTIVE_TOOL_KEY)
const isActive = computed(() => activeTool?.value === 'arrow')

function activate() {
  window.openPenApi?.setActiveTool({ tool: 'arrow' })
}
</script>

<template>
  <AppButton
    :active="isActive"
    :tooltip="label"
    :aria-label="label"
    data-testid="controlbar-arrow-btn"
    @click="activate"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="19" x2="19" y2="5" />
      <polyline points="10 5 19 5 19 14" />
    </svg>
  </AppButton>
</template>
