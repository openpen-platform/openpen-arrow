/**
 * Arrow head style choices. Kept apart from the geometry so the settings
 * schema, the control-bar popover and the tool all share one definition and
 * one clamp rule (an unknown saved value falls back to `solid`).
 */
import type { HeadStyle } from './arrow-geometry'

export const HEAD_STYLES: readonly HeadStyle[] = ['solid', 'open', 'hollow']
export const HEAD_STYLE_DEFAULT: HeadStyle = 'solid'

/** Return `value` when it is one of the known head styles, otherwise the default. */
export function clampHeadStyle(value: unknown): HeadStyle {
  return (HEAD_STYLES as readonly unknown[]).includes(value)
    ? (value as HeadStyle)
    : HEAD_STYLE_DEFAULT
}

/** Coerce a saved `doubleHeaded` value to a boolean; anything but `true` is off. */
export function clampDoubleHeaded(value: unknown): boolean {
  return value === true
}
