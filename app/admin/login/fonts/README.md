# Login lettering

Fonts are bundled through `next/font/local`; visitors do not request Google
Fonts at runtime.

- `NotoSansJP-Black.ttf`: Noto Sans JP, weight 900, Google Fonts text subset
  covering `あなた誰なの`, used for the hollow display headings.
  Source: https://fonts.google.com/specimen/Noto+Sans+JP
  License: `NotoSansJP-OFL.txt`.
- `KleeOne.ttf`: Klee One, weight 600, Google Fonts text subset covering
  `あなたねえ教えてよお誰なのまた、ここで。今日もいい一曲を`.
  Source: https://fonts.google.com/specimen/Klee+One
  License: `KleeOne-OFL.txt`.
- `Caveat.ttf`: Caveat, weight 400, retained from the earlier letter design.
  Source: https://fonts.google.com/specimen/Caveat
  License: `Caveat-OFL.txt`.

When changing Japanese display copy, update the appropriate subset to include
all new glyphs. Functional login labels and verification messages use regular
UI fonts and English wording.
