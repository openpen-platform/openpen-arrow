// @vitest-environment jsdom
/**
 * The control-bar popover (ArrowToolButton) carries the arrow's line width,
 * head style and double-headed switch. The dropdown shell needs the host to
 * open its popover, so its slots are rendered inline; everything inside the
 * panel is the real uikit (AppPopoverPanel / AppPopoverRow / AppSegmented /
 * AppToggle / AppSlider).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { clearModuleContext, setModuleContext, type ModuleSetupContext } from '@openpen/module-api'

vi.mock('@openpen/module-api/host', () => ({
  emit: () => {},
  on: () => () => {},
  getSlotEntries: () => [],
}))

import ArrowToolButton from '../src/ArrowToolButton.vue'
import { MODULE_ID } from '../src/module-id'

// jsdom has no ResizeObserver; the uikit slider (reka-ui) constructs one on mount.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= ResizeObserverStub

const shell = { template: '<div><slot name="main-content" /><slot name="popover-content" /></div>' }

function makeCtx(saved: Record<string, unknown>) {
  const updateSettings = vi.fn(async () => {})
  let push: (s: Record<string, unknown>) => void = () => {}
  const ctx = {
    moduleId: MODULE_ID,
    locale: 'en',
    getSettings: () => saved,
    updateSettings,
    onSettingsChange: (cb: (s: Record<string, unknown>) => void) => {
      push = cb
      return () => {}
    },
    t: (key: string) => key,
  } as unknown as ModuleSetupContext
  return { ctx, updateSettings, pushSettings: (s: Record<string, unknown>) => push(s) }
}

const activeHead = (w: ReturnType<typeof mount>) =>
  w
    .findAll('[data-testid^="arrow-head-style-"]')
    .filter((b) => b.classes().includes('active'))
    .map((b) => b.attributes('data-testid'))

describe('arrow control-bar panel: line style', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => clearModuleContext(MODULE_ID))

  const lineStyleButtons = (w: ReturnType<typeof mount>) => w.findAll('[data-testid^="arrow-line-style-"]')

  it('has a three-way line style choice after the head style, using only uikit', async () => {
    const { ctx } = makeCtx({})
    setModuleContext(MODULE_ID, ctx)
    const w = mount(ArrowToolButton, { attachTo: document.body, global: { stubs: { AppButtonDropdown: shell } } })
    await nextTick()
    expect(lineStyleButtons(w).map((b) => b.attributes('data-testid'))).toEqual([
      'arrow-line-style-solid',
      'arrow-line-style-dashed',
      'arrow-line-style-dotted',
    ])
    expect(w.text()).toContain('options.lineStyle')
    // icon-only options: the label is the accessible name
    expect(lineStyleButtons(w).map((b) => b.attributes('aria-label'))).toEqual([
      'options.lineStyles.solid',
      'options.lineStyles.dashed',
      'options.lineStyles.dotted',
    ])
    const html = w.html()
    expect(html.indexOf('arrow-line-width-slider')).toBeLessThan(html.indexOf('arrow-head-style-solid'))
    expect(html.indexOf('arrow-head-style-solid')).toBeLessThan(html.indexOf('arrow-line-style-solid'))
    expect(html).not.toContain('<style')
  })

  it('picking a line style writes the plugin settings; a bad saved value shows as solid and re-syncs', async () => {
    const { ctx, updateSettings, pushSettings } = makeCtx({ lineStyle: 'wavy' })
    setModuleContext(MODULE_ID, ctx)
    const w = mount(ArrowToolButton, { attachTo: document.body, global: { stubs: { AppButtonDropdown: shell } } })
    await nextTick()
    const active = () =>
      lineStyleButtons(w)
        .filter((b) => b.classes().includes('active'))
        .map((b) => b.attributes('data-testid'))
    expect(active()).toEqual(['arrow-line-style-solid'])
    await w.find('[data-testid="arrow-line-style-dashed"]').trigger('click')
    expect(updateSettings).toHaveBeenCalledWith({ lineStyle: 'dashed' })
    pushSettings({ lineStyle: 'dotted' })
    await nextTick()
    expect(active()).toEqual(['arrow-line-style-dotted'])
    pushSettings({ lineStyle: 7 })
    await nextTick()
    expect(active()).toEqual(['arrow-line-style-solid'])
  })
})

describe('arrow control-bar panel: head style and double-headed', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => clearModuleContext(MODULE_ID))

  it('has a line width slider, three head styles and a double-headed switch, no <style> of its own', async () => {
    const { ctx } = makeCtx({})
    setModuleContext(MODULE_ID, ctx)
    const w = mount(ArrowToolButton, { attachTo: document.body, global: { stubs: { AppButtonDropdown: shell } } })
    await nextTick()
    expect(w.find('[data-testid="arrow-line-width-slider"]').exists()).toBe(true)
    expect(w.findAll('[data-testid^="arrow-head-style-"]').map((b) => b.attributes('data-testid'))).toEqual([
      'arrow-head-style-solid',
      'arrow-head-style-open',
      'arrow-head-style-hollow',
    ])
    expect(w.find('[data-testid="arrow-double-headed-toggle"]').attributes('role')).toBe('switch')
    // strings come from the plugin's locale keys
    expect(w.text()).toContain('options.headStyle')
    expect(w.text()).toContain('options.doubleHeaded')
    expect(w.find('[data-testid="arrow-head-style-hollow"]').attributes('aria-label')).toBe('options.headStyles.hollow')
  })

  it('picking a head style or flipping the switch writes the plugin settings', async () => {
    const { ctx, updateSettings } = makeCtx({ headStyle: 'solid', doubleHeaded: false })
    setModuleContext(MODULE_ID, ctx)
    const w = mount(ArrowToolButton, { attachTo: document.body, global: { stubs: { AppButtonDropdown: shell } } })
    await nextTick()
    await w.find('[data-testid="arrow-head-style-open"]').trigger('click')
    expect(updateSettings).toHaveBeenCalledWith({ headStyle: 'open' })
    await w.find('[data-testid="arrow-double-headed-toggle"]').trigger('click')
    expect(updateSettings).toHaveBeenCalledWith({ doubleHeaded: true })
  })

  it('a bad saved value shows as solid / off, and a later push re-syncs the panel', async () => {
    const { ctx, pushSettings } = makeCtx({ headStyle: 'triangle', doubleHeaded: 'yes' })
    setModuleContext(MODULE_ID, ctx)
    const w = mount(ArrowToolButton, { attachTo: document.body, global: { stubs: { AppButtonDropdown: shell } } })
    await nextTick()
    expect(activeHead(w)).toEqual(['arrow-head-style-solid'])
    const toggle = () => w.find('[data-testid="arrow-double-headed-toggle"]')
    expect(toggle().attributes('aria-checked')).toBe('false')
    pushSettings({ headStyle: 'hollow', doubleHeaded: true })
    await nextTick()
    expect(activeHead(w)).toEqual(['arrow-head-style-hollow'])
    expect(toggle().attributes('aria-checked')).toBe('true')
    pushSettings({ headStyle: 5, doubleHeaded: 'yes' })
    await nextTick()
    expect(activeHead(w)).toEqual(['arrow-head-style-solid'])
    expect(toggle().attributes('aria-checked')).toBe('false')
  })
})
