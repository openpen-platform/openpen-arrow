# @openpen/arrow

A straight-line drawing tool with arrowheads for [OpenPen](https://github.com/openpen-platform/openpen).

Draw a line and it gets an arrowhead. Choose between solid, open, or hollow
heads, optionally put a head on both ends, and hold **Shift** while dragging to
snap the line to the nearest 45°.

## Features

- Solid (filled), open (chevron), and hollow (outlined) arrowheads
- Optional double-ended arrows
- Head size scales with the stroke width
- Shift-to-snap at 45° increments, matching the built-in line tool

## Settings

| Setting | Description |
| --- | --- |
| **Head style** | `solid` filled triangle, `open` chevron, or `hollow` outlined triangle |
| **Double-headed** | Add an arrowhead to both ends of the line |

## Build

```bash
openpen-build           # bundle the plugin into dist/
openpen-build --watch   # rebuild on change during development
openpen-build --check   # validate the manifest and bundle without writing
```

## Install

Pack the built plugin and add it to OpenPen:

```bash
openpen pack                          # produce openpen-arrow-<version>.zip
openpen-cli plugin add openpen-arrow-<version>.zip
```

## License

MIT
