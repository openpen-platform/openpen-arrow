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

## Install

Requires OpenPen 1.0.0 or later.

Install from the plugin catalog, then restart OpenPen:

```bash
npx openpen-cli plugin install @openpen/arrow
```

To install a build from source instead, see [Build](#build) and
[Install a local build](#install-a-local-build) below.

## Usage

1. Click the **Arrow** button in the control bar's tools group to switch to the
   arrow tool.
2. Press at the point where the arrow should start, drag, and release where the
   arrowhead should be. The arrowhead is drawn at the release point.
3. Hold **Shift** while dragging to snap the line to the nearest 45° angle.

The arrow uses the current stroke color and line width; the head size scales
with the line width. A very short drag is discarded and leaves no arrow behind.

Arrows are stored with the head style and double-headed choice that were active
when they were drawn, so changing the settings later does not alter arrows
that are already on the canvas.

## Settings

Open OpenPen's settings and choose the **Arrow** panel.

| Setting | Values | Default | Description |
| --- | --- | --- | --- |
| **Head style** | `solid`, `open`, `hollow` | `solid` | `solid` is a filled triangle, `open` is a chevron, `hollow` is an outlined triangle |
| **Double-headed** | on, off | off | Add an arrowhead to both ends of the line |

## Build

```bash
openpen-build           # bundle the plugin into dist/
openpen-build --watch   # rebuild on change during development
openpen-build --check   # validate the manifest and bundle without writing
```

### Install a local build

Build the plugin, then add the directory to OpenPen and restart it:

```bash
openpen-build
npx openpen-cli plugin add .
```

## License

MIT
