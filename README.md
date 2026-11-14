# @openpen/arrow

A straight-line drawing tool with arrowheads for [OpenPen](https://github.com/openpen-platform/openpen).

Draw a line and it gets an arrowhead. Choose between solid, open, or hollow
heads, optionally put a head on both ends, and hold **Shift** while dragging to
snap the line to the nearest 45°.

## Features

- Solid (filled), open (chevron), and hollow (outlined) arrowheads
- Optional double-ended arrows
- Its own line width (1–20 px), set from the control bar without moving the
  global stroke-width slider
- Solid, dashed or dotted line style (the arrowhead always stays solid)
- Head style and double-headed set from the same control-bar panel
- Head size scales with the line width
- A keyboard shortcut to switch to the arrow tool
- Shift-to-snap at 45° increments, matching the built-in line tool

## Install

Requires OpenPen 1.6.0 or later.

Install from the plugin catalog, then restart OpenPen:

```bash
npx openpen-cli plugin install @openpen/arrow
```

To install a build from source instead, see [Build](#build) and
[Install a local build](#install-a-local-build) below.

## Usage

1. Click the **Arrow** button in the control bar's tools group, or press
   **Ctrl+Alt+A** (**⌘⌥A** on macOS) while drawing mode is on, to switch to the
   arrow tool. The shortcut is not available on Linux Wayland sessions; use the
   button there.
2. Press at the point where the arrow should start, drag, and release where the
   arrowhead should be. The arrowhead is drawn at the release point.
3. Hold **Shift** while dragging to snap the line to the nearest 45° angle.

To change the arrow's options, click the small caret next to the **Arrow**
button. The panel that opens has the **Line width** slider, the **Line style**
choice (solid, dashed or dotted), the **Head style** choice (solid, open or
hollow) and the **Double-headed** switch. They apply to
the next arrow you draw right away. The line width applies only to arrows: the
global stroke-width slider and the other tools keep their own width. All
options are kept across restarts.

The arrow uses the current stroke color; the head size scales with the arrow's
line width. A very short drag is discarded and leaves no arrow behind.

Arrows are stored with the line style, head style and double-headed choice that were active
when they were drawn, so changing the options later does not alter arrows
that are already on the canvas.

## Settings

All four options are set in the control-bar panel described above; OpenPen's
settings window has no Arrow page.

| Option | Values | Default | Description |
| --- | --- | --- | --- |
| **Line width** | 1–20 px | 4 px | Width of the arrow's line; the head size scales with it |
| **Line style** | `solid`, `dashed`, `dotted` | `solid` | Style of the arrow's line; dash and dot spacing scale with the line width, and the arrowhead is always drawn solid |
| **Head style** | `solid`, `open`, `hollow` | `solid` | `solid` is a filled triangle, `open` is a chevron, `hollow` is an outlined triangle |
| **Double-headed** | on, off | off | Add an arrowhead to both ends of the line |

A saved value outside these ranges is corrected to the nearest allowed value
(or the default) when OpenPen starts.

The shortcut can be rebound under **Settings → Shortcuts**.

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
