<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useModuleContext } from '@openpen/module-api'
import { AppSegmented, AppToggle } from '@openpen/module-api/uikit'
import { MODULE_ID } from './module-id'
import type { HeadStyle } from './arrow-geometry'

interface ArrowSettings {
  headStyle: HeadStyle
  doubleHeaded: boolean
}

const ctx = useModuleContext(MODULE_ID)

const headStyle = ref<HeadStyle>('solid')
const doubleHeaded = ref(false)
let unsub: (() => void) | null = null

onMounted(() => {
  const s = ctx.getSettings<ArrowSettings>()
  headStyle.value = s.headStyle ?? 'solid'
  doubleHeaded.value = s.doubleHeaded ?? false
  unsub = ctx.onSettingsChange<ArrowSettings>((next) => {
    headStyle.value = next.headStyle
    doubleHeaded.value = next.doubleHeaded
  })
})

onUnmounted(() => unsub?.())

const headStyleLabel = computed(() => ctx.t('settings.headStyleLabel'))
const doubleHeadedLabel = computed(() => ctx.t('settings.doubleHeaded'))
const headStyleOptions = computed(() => [
  { value: 'solid', label: ctx.t('settings.headStyle.solid') },
  { value: 'open', label: ctx.t('settings.headStyle.open') },
  { value: 'hollow', label: ctx.t('settings.headStyle.hollow') },
])

async function setHeadStyle(value: string) {
  headStyle.value = value as HeadStyle
  await ctx.updateSettings<ArrowSettings>({ headStyle: value as HeadStyle })
}

async function setDoubleHeaded(value: boolean) {
  doubleHeaded.value = value
  await ctx.updateSettings<ArrowSettings>({ doubleHeaded: value })
}
</script>

<template>
  <div class="arrow-settings">
    <div class="arrow-row">
      <div class="arrow-row-label">{{ headStyleLabel }}</div>
      <AppSegmented
        :model-value="headStyle"
        :options="headStyleOptions"
        @update:model-value="setHeadStyle"
      />
    </div>
    <div class="arrow-row">
      <div class="arrow-row-label">{{ doubleHeadedLabel }}</div>
      <AppToggle
        :model-value="doubleHeaded"
        :aria-label="doubleHeadedLabel"
        @update:model-value="setDoubleHeaded"
      />
    </div>
  </div>
</template>

<style scoped>
.arrow-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.arrow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.arrow-row-label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--openpen-color-text-primary);
}
</style>
