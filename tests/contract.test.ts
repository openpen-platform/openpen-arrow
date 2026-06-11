import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from '@openpen/module-api'
import arrowModule, { MODULE_ID } from '../src/index'

const SRC_DIR = join(__dirname, '..', 'src')

describe('defineModule contract — identity & ids', () => {
  it('id matches the @openpen/arrow scoped format', () => {
    expect(arrowModule.id).toBe('@openpen/arrow')
    expect(arrowModule.id).toMatch(/^@[a-z0-9-]+\/[a-z0-9-]+$/)
  })

  it('exported MODULE_ID is consistent with the module id', () => {
    expect(MODULE_ID).toBe(arrowModule.id)
  })

  it('declares a semver version', () => {
    expect(arrowModule.version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('defineModule contract — tool three-piece set (tools + cursors + controlBar)', () => {
  it('contributes a single arrow tool with a render-stroke renderer', () => {
    const tools = arrowModule.contributes.tools
    expect(tools).toHaveLength(1)
    expect(tools![0].id).toBe('arrow')
    // Custom renderStroke is mandatory — host polyline has no arrowheads.
    expect(typeof tools![0].renderStroke).toBe('function')
    // Pointer handlers wired from the factory.
    expect(typeof tools![0].onPointerDown).toBe('function')
    expect(typeof tools![0].onPointerUp).toBe('function')
    expect(tools![0].needsPreviewRedraw).toBe(true)
  })

  it('contributes a matching cursor with the same id', () => {
    const cursors = arrowModule.contributes.cursors
    expect(cursors).toHaveLength(1)
    expect(cursors![0].id).toBe('arrow')
  })

  it('contributes a control-bar entry whose defaultGroup is "tools"', () => {
    const bar = arrowModule.contributes.controlBar
    expect(bar).toHaveLength(1)
    expect(bar![0].id).toBe('arrow')
    // defaultGroup belongs on the control-bar entry, NOT on the tool.
    expect(bar![0].defaultGroup).toBe('tools')
    expect((arrowModule.contributes.tools![0] as Record<string, unknown>).defaultGroup).toBeUndefined()
    expect(bar![0].component).toBeTruthy()
  })

  it('contributes a settings panel', () => {
    const panels = arrowModule.contributes.settingsPanels
    expect(panels).toHaveLength(1)
    expect(panels![0].id).toBe('arrow-settings')
    expect(panels![0].component).toBeTruthy()
  })

  it('provides locales for all four languages', () => {
    const locales = arrowModule.contributes.locales!
    expect(Object.keys(locales).sort()).toEqual(['en', 'ja', 'zh-Hans', 'zh-Hant'])
  })
})

describe('defineModule contract — settingsSchema', () => {
  it('is a zod object', () => {
    expect(arrowModule.settingsSchema).toBeInstanceOf(z.ZodObject)
  })

  it('parses an empty object to the documented defaults (headStyle solid, doubleHeaded false)', () => {
    const parsed = (arrowModule.settingsSchema as z.ZodTypeAny).parse({})
    expect(parsed).toEqual({ headStyle: 'solid', doubleHeaded: false })
  })

  it('accepts each valid head style and rejects an unknown one', () => {
    const schema = arrowModule.settingsSchema as z.ZodTypeAny
    for (const headStyle of ['solid', 'open', 'hollow']) {
      expect(schema.parse({ headStyle }).headStyle).toBe(headStyle)
    }
    expect(() => schema.parse({ headStyle: 'triangle' })).toThrow()
  })

  it('rejects a non-boolean doubleHeaded', () => {
    expect(() => (arrowModule.settingsSchema as z.ZodTypeAny).parse({ doubleHeaded: 'yes' })).toThrow()
  })
})

describe('import-boundary — no host-internal or vue-i18n imports in src/', () => {
  function allSrcFiles(dir: string): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) out.push(...allSrcFiles(full))
      else if (/\.(ts|vue|js)$/.test(entry.name)) out.push(full)
    }
    return out
  }

  const files = allSrcFiles(SRC_DIR)

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('never imports @openpen/module-api/host/registry', () => {
    for (const f of files) {
      expect(readFileSync(f, 'utf8')).not.toContain('@openpen/module-api/host/registry')
    }
  })

  it('never imports vue-i18n', () => {
    for (const f of files) {
      expect(readFileSync(f, 'utf8')).not.toContain('vue-i18n')
    }
  })
})
