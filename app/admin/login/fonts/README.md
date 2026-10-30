# Login lettering

Fonts are bundled through `next/font/local`; visitors do not request Google
Fonts at runtime.

- `NotoSansJP-Black.ttf`: Yuria Outline JP, derived from the Noto Sans JP weight-900 text subset
  covering `あなた誰なの`. Overlapping contours are unioned with FontTools
  `removeOverlaps` / skia-pathops before CSS outlines are drawn. This removes
  interior seams where strokes intersect. Advance widths are unchanged.
  The internal family name is Yuria Outline JP; the original OFL is retained.
  Source: https://fonts.google.com/specimen/Noto+Sans+JP
  License: `NotoSansJP-OFL.txt`.
- `KleeOne.ttf`: Klee One, weight 600, Google Fonts text subset covering
  `あなたねえ教えてよぉ誰なのまた、ここで。今日もいい一曲を`.
  Source: https://fonts.google.com/specimen/Klee+One
  License: `KleeOne-OFL.txt`.
- `Caveat.ttf`: Caveat, weight 400, retained from the earlier letter design.
  Source: https://fonts.google.com/specimen/Caveat
  License: `Caveat-OFL.txt`.

When changing Japanese display copy, update the appropriate subset to include
all new glyphs. Functional login labels and verification messages use regular
UI fonts and English wording.
