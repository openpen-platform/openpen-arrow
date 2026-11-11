import { afterEach, describe, expect, it, vi } from 'vitest'

// The shortcut handler talks to the host event bus; stub it so the module can
// be exercised without a running host registry.
const emitSpy = vi.fn()
vi.mock('@openpen/module-api/host', () => ({
  emit: (...args: unknown[]) => emitSpy(...args),
  on: () => () => {},
}))

import type { ModuleSetupContext, Stroke, StrokeStyle } from '@openpen/module-api'
import { z } from '@openpen/module-api'
import arrowModule from '../src/index'
import {
  ARROW_LINE_WIDTH_DEFAULT,
  ARROW_LINE_WIDTH_MAX,
  ARROW_LINE_WIDTH_MIN,
  clampArrowLineWidth,
} from '../src/line-width'

const GLOBAL_STYLE: StrokeStyle = {
  color: '#ff0000',
  lineWidth: 4,
  lineCap: 'round',
  lineJoin: 'round',
}

/** Minimal setup() context backed by an in-memory settings object. */
function fakeCtx(initial: Record<string, unknown>) {
  let current = { headStyle: 'solid', doubleHeaded: false, ...initial }
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

/** Draw one arrow with the contributed tool; returns the committed stroke. */
function drawWithContributedTool(style: StrokeStyle): Stroke {
  const tool = arrowModule.contributes.tools![0]
  const canvas = {} as CanvasRenderingContext2D
  tool.onPointerDown(canvas, { x: 0, y: 0 }, style)
  return tool.onPointerUp(canvas, { x: 120, y: 0 }, {}) as Stroke
}

describe('clampArrowLineWidth — AC#4 range 1..20', () => {
  it('passes in-range widths through unchanged', () => {
    expect(clampArrowLineWidth(10)).toBe(10)
    expect(clampArrowLineWidth(ARROW_LINE_WIDTH_MIN)).toBe(1)
    expect(clampArrowLineWidth(ARROW_LINE_WIDTH_MAX)).toBe(20)
  })

  it('clamps out-of-range and non-finite widths into 1..20', () => {
    expect(clampArrowLineWidth(0)).toBe(1)
    expect(clampArrowLineWidth(-3)).toBe(1)
    expect(clampArrowLineWidth(25)).toBe(20)
    expect(clampArrowLineWidth(Number.NaN)).toBe(ARROW_LINE_WIDTH_DEFAULT)
  })
})

describe('arrow line width — independent of the global width (AC#2, AC#3)', () => {
  afterEach(() => {
    arrowModule.setup?.(fakeCtx({ lineWidth: ARROW_LINE_WIDTH_DEFAULT }))
  })

  it('draws with the arrow width 10 while the global width stays 4', () => {
    const ctx = fakeCtx({ lineWidth: 4 })
    arrowModule.setup?.(ctx)
    ctx.push({ lineWidth: 10 })
    const stroke = drawWithContributedTool(GLOBAL_STYLE)
    expect(stroke.style.lineWidth).toBe(10)
    expect(stroke.style.color).toBe('#ff0000') // colour still follows global
  })

  it('never mutates the global stroke style handed in by the host', () => {
    const ctx = fakeCtx({ lineWidth: 15 })
    arrowModule.setup?.(ctx)
    const hostStyle = { ...GLOBAL_STYLE }
    drawWithContributedTool(hostStyle)
    expect(hostStyle).toEqual(GLOBAL_STYLE)
  })
})

describe('arrow line width — persistence (AC#5)', () => {
  it('schema defaults lineWidth to 4 and keeps a saved value', () => {
    const schema = arrowModule.settingsSchema as z.ZodTypeAny
    expect(schema.parse({}).lineWidth).toBe(ARROW_LINE_WIDTH_DEFAULT)
    expect(schema.parse({ lineWidth: 10 }).lineWidth).toBe(10)
  })

  it('applies the saved width at setup, clamping an out-of-range saved value', () => {
    arrowModule.setup?.(fakeCtx({ lineWidth: 99 }))
    expect(drawWithContributedTool(GLOBAL_STYLE).style.lineWidth).toBe(20)
    arrowModule.setup?.(fakeCtx({ lineWidth: 12 }))
    expect(drawWithContributedTool(GLOBAL_STYLE).style.lineWidth).toBe(12)
  })
})

describe('arrow shortcut (AC#12–16)', () => {
  it('contributes a user-customisable drawing-scope shortcut with a label', () => {
    const shortcuts = arrowModule.contributes.shortcuts!
    expect(shortcuts).toHaveLength(1)
    const s = shortcuts[0]
    expect(s.id).toBe('activate-arrow')
    expect(s.scope).toBe('drawing')
    expect(s.keys).toBe('CommandOrControl+Alt+A')
    expect(s.userCustomizable).toBe(true)
    expect(s.label).toBeTruthy()
  })

  it('switches to the arrow tool on the event bus and over IPC', () => {
    const setActiveTool = vi.fn()
    vi.stubGlobal('window', { openPenApi: { setActiveTool } })
    try {
      arrowModule.contributes.shortcuts![0].handler()
      expect(emitSpy).toHaveBeenCalledWith('tool-changed', { tool: 'arrow' })
      expect(setActiveTool).toHaveBeenCalledWith({ tool: 'arrow' })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
