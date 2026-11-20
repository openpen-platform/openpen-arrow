import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Stroke, StrokeStyle } from '@openpen/module-api'
import { callMcpTool } from '@openpen/module-api/testing'

const PEN_COLOR = '#123456'
const commitStroke = vi.fn()

vi.mock('@openpen/module-api/host', () => ({
  commitStroke: (stroke: Stroke) => commitStroke(stroke),
  emit: vi.fn(),
  on: vi.fn(() => () => {}),
  useStrokeStyle: () => ({ color: { value: PEN_COLOR }, lineWidth: { value: 4 } }),
}))

const { default: arrowModule } = await import('../src/index')

const drawTool = () => {
  const tool = arrowModule.contributes.mcpTools?.find((t) => t.name === 'draw')
  if (!tool) throw new Error('arrow module contributes no draw MCP tool')
  return tool
}

/** Screenshot pixels → canvas points on a 2x display with a 50 px menu bar. */
const toCanvas = (p: { x: number; y: number }) => ({ x: p.x / 2, y: (p.y - 50) / 2 })

beforeEach(() => commitStroke.mockClear())

describe('MCP draw tool — AC #1: draws an arrow from start to end in screenshot coordinates', () => {
  it('commits the same arrow stroke a manual drag between the converted points makes', async () => {
    const result = await callMcpTool(drawTool(), { x1: 100, y1: 250, x2: 700, y2: 650 }, { toCanvas })

    expect(result.isError).toBeUndefined()
    expect(commitStroke).toHaveBeenCalledTimes(1)
    const drawn = commitStroke.mock.calls[0][0] as Stroke
    expect(drawn.points).toEqual([{ x: 50, y: 100 }, { x: 350, y: 300 }])
    expect(result.structuredContent).toMatchObject({ id: drawn.id })

    // Manual drag with the host's current pen style over the same canvas points.
    const manualTool = arrowModule.contributes.tools![0]
    const hostStyle: StrokeStyle = { color: PEN_COLOR, lineWidth: 9, lineCap: 'round', lineJoin: 'round' }
    const canvas = {} as CanvasRenderingContext2D
    manualTool.onPointerDown!(canvas, { x: 50, y: 100 }, hostStyle)
    const manual = manualTool.onPointerUp!(canvas, { x: 350, y: 300 }, {}) as Stroke
    expect({ ...drawn, id: 'x' }).toEqual({ ...manual, id: 'x' })
  })

  it('rejects an arrow too short to draw and commits nothing', async () => {
    const result = await callMcpTool(drawTool(), { x1: 300, y1: 300, x2: 301, y2: 301 }, { toCanvas })

    expect(result.isError).toBe(true)
    expect(result.errorKind).toBe('invalid_params')
    expect(commitStroke).not.toHaveBeenCalled()
  })
})

describe('MCP draw tool — AC #3: listed annotations name the arrow plugin as the source', () => {
  it('draws with the arrow canvas tool id, which the host maps to @openpen/arrow', async () => {
    await callMcpTool(drawTool(), { x1: 0, y1: 50, x2: 200, y2: 250 }, { toCanvas })

    const drawn = commitStroke.mock.calls[0][0] as Stroke
    // The host lists a stroke's source as the module that contributes the
    // canvas tool whose id equals `stroke.tool`.
    const ownTool = arrowModule.contributes.tools!.find((t) => t.id === drawn.tool)
    expect(ownTool).toBeDefined()
    expect(arrowModule.id).toBe('@openpen/arrow')
  })
})
