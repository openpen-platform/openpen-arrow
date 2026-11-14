import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@openpen/module-api/host', () => ({
  emit: () => {},
  on: () => () => {},
}))

import type { ModuleSetupContext, Stroke, StrokeStyle } from '@openpen/module-api'
import { z } from '@openpen/module-api'
import arrowModule from '../src/index'
import { renderArrowStroke } from '../src/arrow-tool'
import { clampDoubleHeaded, clampHeadStyle } from '../src/head-style'

const STYLE: StrokeStyle = { color: '#00ff00', lineWidth: 4, lineCap: 'round', lineJoin: 'round' }

function fakeCtx(initial: Record<string, unknown>) {
  let current: Record<string, unknown> = { ...initial }
  const listeners: Array<(s: unknown) => void> = []
  const ctx = {
    getSettings: () => current,
    onSettingsChange: (cb: (s: unknown) => void) => {
      listeners.push(cb)
      return () => {}
    },
    onDispose: () => {},
    push(next: Record<string, unknown>) {
      current = { ...current, ...next }
      for (const l of listeners) l(current)
    },
  }
  return ctx as unknown as ModuleSetupContext & { push: typeof ctx.push }
}

function draw(): Stroke {
  const tool = arrowModule.contributes.tools![0]
  const canvas = {} as CanvasRenderingContext2D
  tool.onPointerDown(canvas, { x: 0, y: 0 }, STYLE)
  return tool.onPointerUp(canvas, { x: 120, y: 0 }, {}) as Stroke
}

describe('head style / double-headed applied to the next arrow (AC#1, logic only)', () => {
  afterEach(() => {
    arrowModule.setup?.(fakeCtx({}))
  })

  it('the next arrow uses the head style and direction chosen in the panel', () => {
    const ctx = fakeCtx({})
    arrowModule.setup?.(ctx)
    ctx.push({ headStyle: 'hollow', doubleHeaded: true })
    const s = draw()
    expect(s.headStyle).toBe('hollow')
    expect(s.doubleHeaded).toBe(true)
  })

  it('switching back applies immediately too (open, single-headed)', () => {
    const ctx = fakeCtx({ headStyle: 'hollow', doubleHeaded: true })
    arrowModule.setup?.(ctx)
    ctx.push({ headStyle: 'open', doubleHeaded: false })
    const s = draw()
    expect(s.headStyle).toBe('open')
    expect(s.doubleHeaded).toBe(false)
  })
})

describe('head style / double-headed clamp and persistence (AC#4)', () => {
  it('clampHeadStyle keeps known values and falls back to solid otherwise', () => {
    expect(clampHeadStyle('open')).toBe('open')
    expect(clampHeadStyle('hollow')).toBe('hollow')
    expect(clampHeadStyle('triangle')).toBe('solid')
    expect(clampHeadStyle(undefined)).toBe('solid')
  })

  it('clampDoubleHeaded accepts only true', () => {
    expect(clampDoubleHeaded(true)).toBe(true)
    expect(clampDoubleHeaded('yes')).toBe(false)
    expect(clampDoubleHeaded(undefined)).toBe(false)
  })

  it('a saved out-of-range head style does not fail the whole settings schema', () => {
    const schema = arrowModule.settingsSchema as z.ZodTypeAny
    const parsed = schema.parse({ headStyle: 'triangle', doubleHeaded: 'yes', lineWidth: 7 })
    expect(parsed.lineWidth).toBe(7)
    expect(parsed.headStyle).toBe('triangle')
    expect(parsed.doubleHeaded).toBe('yes')
  })

  it('a non-string saved head style (number, null) does not discard the other settings either', () => {
    const schema = arrowModule.settingsSchema as z.ZodTypeAny
    expect(schema.parse({ headStyle: 5, lineWidth: 7 }).lineWidth).toBe(7)
    expect(schema.parse({ headStyle: null, lineWidth: 9 }).lineWidth).toBe(9)
  })

  it('a bad value pushed while running is clamped before the next arrow', () => {
    const ctx = fakeCtx({ headStyle: 'open', doubleHeaded: true })
    arrowModule.setup?.(ctx)
    ctx.push({ headStyle: 'triangle', doubleHeaded: 'yes' })
    const s = draw()
    expect(s.headStyle).toBe('solid')
    expect(s.doubleHeaded).toBe(false)
  })

  it('history replay clamps a bad stored head style to the solid look', () => {
    const calls: string[] = []
    const c = new Proxy({}, { get: (_t, k) => (typeof k === 'string' && k.length ? (() => { calls.push(k) }) : undefined), set: () => true }) as unknown as CanvasRenderingContext2D
    const base = { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], style: STYLE, doubleHeaded: false }
    renderArrowStroke(c, { ...base, headStyle: 'triangle' } as unknown as Stroke)
    const bad = calls.slice()
    calls.length = 0
    renderArrowStroke(c, { ...base, headStyle: 'solid' } as unknown as Stroke)
    expect(bad).toEqual(calls)
    calls.length = 0
    renderArrowStroke(c, { ...base, headStyle: 'hollow' } as unknown as Stroke)
    expect(bad, 'a real hollow head must differ, so the comparison is meaningful').not.toEqual(calls)
  })

  it('history replay does not draw a second head for a non-true double-headed value ("yes")', () => {
    const calls: string[] = []
    const c = new Proxy({}, { get: (_t, k) => (typeof k === 'string' && k.length ? (() => { calls.push(k) }) : undefined), set: () => true }) as unknown as CanvasRenderingContext2D
    const base = { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], style: STYLE, headStyle: 'solid' }
    renderArrowStroke(c, { ...base, doubleHeaded: 'yes' } as unknown as Stroke)
    const bad = calls.length
    calls.length = 0
    renderArrowStroke(c, { ...base, doubleHeaded: false } as unknown as Stroke)
    const single = calls.length
    calls.length = 0
    renderArrowStroke(c, { ...base, doubleHeaded: true } as unknown as Stroke)
    expect(bad).toBe(single)
    expect(calls.length, 'a real double head draws more').toBeGreaterThan(single)
  })

  it('applies the saved head style at setup and falls back to solid for a bad saved value', () => {
    arrowModule.setup?.(fakeCtx({ headStyle: 'open', doubleHeaded: true }))
    const kept = draw()
    expect(kept.headStyle).toBe('open')
    expect(kept.doubleHeaded).toBe(true)
    arrowModule.setup?.(fakeCtx({ headStyle: 'triangle', doubleHeaded: 'yes' }))
    const clamped = draw()
    expect(clamped.headStyle).toBe('solid')
    expect(clamped.doubleHeaded).toBe(false)
  })
})

describe('head style and double-headed are not in the settings window', () => {
  it('contributes no Arrow settings panel (they live in the control-bar popover)', () => {
    expect(arrowModule.contributes.settingsPanels ?? []).toHaveLength(0)
  })

  it('the old settings-window strings are gone from every locale', () => {
    for (const lang of ['en', 'zh-Hant', 'zh-Hans', 'ja']) {
      const locale = (arrowModule.contributes.locales as Record<string, Record<string, unknown>>)[lang]
      expect(locale.settings, `${lang}: settings.*`).toBeUndefined()
    }
  })
})

describe('locale strings for the head options (AC#3, keys only)', () => {
  const NEW_KEYS = [
    'options.label',
    'options.lineWidth',
    'options.headStyle',
    'options.headStyles.solid',
    'options.headStyles.open',
    'options.headStyles.hollow',
    'options.doubleHeaded',
  ]
  const lookup = (obj: unknown, path: string): unknown =>
    path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj)

  it.each(['en', 'zh-Hant', 'zh-Hans', 'ja'])('%s has every new string, non-empty', (lang) => {
    const locale = (arrowModule.contributes.locales as Record<string, unknown>)[lang]
    for (const key of NEW_KEYS) {
      const v = lookup(locale, key)
      expect(typeof v === 'string' && v.length > 0, `${lang}:${key}`).toBe(true)
    }
  })
})
