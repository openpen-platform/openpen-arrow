import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@openpen/module-api/host', () => ({
  emit: () => {},
  on: () => () => {},
}))

import type { ModuleSetupContext, Stroke, StrokeStyle } from '@openpen/module-api'
import { z } from '@openpen/module-api'
import arrowModule from '../src/index'
import { renderArrowStroke } from '../src/arrow-tool'
import { clampLineStyle, LINE_STYLES, shaftDash } from '../src/line-style'

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

/** Records each stroke/fill together with the dash and cap active at that moment. */
function recordingCtx() {
  const events: string[] = []
  let dash: number[] = []
  const c = {
    lineCap: 'butt',
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    fill: () => events.push(`fill dash=${JSON.stringify(dash)}`),
    stroke() {
      events.push(`stroke dash=${JSON.stringify(dash)} cap=${this.lineCap}`)
    },
    setLineDash: (d: number[]) => {
      dash = d
    },
  }
  return { c: c as unknown as CanvasRenderingContext2D, events }
}

const stroke = (lineStyle: unknown, headStyle = 'solid'): Stroke =>
  ({
    id: 'a',
    tool: 'arrow',
    points: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ],
    style: STYLE,
    headStyle,
    doubleHeaded: false,
    lineStyle,
  }) as unknown as Stroke

describe('line style choices and clamp', () => {
  it('offers solid, dashed and dotted, in that order', () => {
    expect([...LINE_STYLES]).toEqual(['solid', 'dashed', 'dotted'])
  })

  it('keeps known values and falls back to solid otherwise', () => {
    expect(clampLineStyle('dashed')).toBe('dashed')
    expect(clampLineStyle('dotted')).toBe('dotted')
    expect(clampLineStyle('wavy')).toBe('solid')
    expect(clampLineStyle(undefined)).toBe('solid')
    expect(clampLineStyle(3)).toBe('solid')
  })

  it('dash pattern scales with the line width; solid has none', () => {
    expect(shaftDash('solid', 4).pattern).toEqual([])
    expect(shaftDash('dashed', 4).pattern).toEqual([12, 8])
    expect(shaftDash('dashed', 8).pattern).toEqual([24, 16])
    expect(shaftDash('dotted', 4)).toEqual({ pattern: [0, 8], cap: 'round' })
  })
})

describe('line style applied to the next arrow', () => {
  afterEach(() => {
    arrowModule.setup?.(fakeCtx({}))
  })

  it('the next arrow uses the line style chosen in the panel and stores it', () => {
    const ctx = fakeCtx({})
    arrowModule.setup?.(ctx)
    expect(draw().lineStyle).toBe('solid')
    ctx.push({ lineStyle: 'dashed' })
    expect(draw().lineStyle).toBe('dashed')
    ctx.push({ lineStyle: 'dotted' })
    expect(draw().lineStyle).toBe('dotted')
  })

  it('the saved line style is read when the app starts', () => {
    arrowModule.setup?.(fakeCtx({ lineStyle: 'dotted' }))
    expect(draw().lineStyle).toBe('dotted')
  })

  it('a bad saved or pushed value is clamped to solid and does not drop the other settings', () => {
    const schema = arrowModule.settingsSchema as z.ZodTypeAny
    expect(schema.parse({ lineStyle: 'wavy', lineWidth: 7 }).lineWidth).toBe(7)
    expect(schema.parse({ lineWidth: 7 }).lineStyle).toBe('solid')
    const ctx = fakeCtx({ lineStyle: 'dashed' })
    arrowModule.setup?.(ctx)
    ctx.push({ lineStyle: 5 })
    expect(draw().lineStyle).toBe('solid')
  })
})

describe('line style drawing', () => {
  it('solid draws a continuous shaft', () => {
    const { c, events } = recordingCtx()
    renderArrowStroke(c, stroke('solid'))
    expect(events[0]).toBe('stroke dash=[] cap=round')
  })

  it('dashed draws the shaft with a dash pattern and butt caps', () => {
    const { c, events } = recordingCtx()
    renderArrowStroke(c, stroke('dashed'))
    expect(events[0]).toBe('stroke dash=[12,8] cap=butt')
  })

  it('dotted draws the shaft with zero-length dashes and round caps', () => {
    const { c, events } = recordingCtx()
    renderArrowStroke(c, stroke('dotted'))
    expect(events[0]).toBe('stroke dash=[0,8] cap=round')
  })

  it('the head stays a solid filled shape for every line style', () => {
    for (const ls of ['solid', 'dashed', 'dotted']) {
      const { c, events } = recordingCtx()
      renderArrowStroke(c, stroke(ls))
      expect(events[1]).toBe('fill dash=[]')
    }
  })

  it('open and hollow heads are stroked without the dash pattern', () => {
    for (const hs of ['open', 'hollow']) {
      const { c, events } = recordingCtx()
      renderArrowStroke(c, stroke('dashed', hs))
      expect(events[0]).toBe('stroke dash=[12,8] cap=butt')
      expect(events[1]).toBe('stroke dash=[] cap=round')
    }
  })

  it('an unknown stored line style replays as solid, and an old arrow without one too', () => {
    const a = recordingCtx()
    renderArrowStroke(a.c, stroke('wavy'))
    const b = recordingCtx()
    renderArrowStroke(b.c, stroke(undefined))
    expect(a.events).toEqual(['stroke dash=[] cap=round', 'fill dash=[]'])
    expect(b.events).toEqual(a.events)
  })
})

describe('line style strings (four languages)', () => {
  const read = (lang: string) =>
    JSON.parse(readFileSync(join(__dirname, '..', 'src', 'locales', `${lang}.json`), 'utf8'))

  it('every language has the label and the three choices, all different', () => {
    for (const lang of ['en', 'zh-Hant', 'zh-Hans', 'ja']) {
      const d = read(lang)
      expect(typeof d.options.lineStyle).toBe('string')
      expect(d.options.lineStyle.length).toBeGreaterThan(0)
      expect(Object.keys(d.options.lineStyles)).toEqual(['solid', 'dashed', 'dotted'])
      expect(new Set(Object.values(d.options.lineStyles)).size).toBe(3)
    }
  })
})
