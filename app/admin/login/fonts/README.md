# Login lettering

The display fonts are bundled with the login page through `next/font/local`.
Visitors do not request them from Google Fonts at runtime.

- `KleeOne.ttf`: Klee One, weight 600, a Google Fonts text subset covering
  `あなたねえ教えてよお誰なのまた、ここで。今日もいい一曲を`.
  Source: https://fonts.google.com/specimen/Klee+One
  License: `KleeOne-OFL.txt`.
- `Caveat.ttf`: Caveat, weight 400, a Google Fonts text subset of Latin
  letters, numbers and punctuation used for the English annotations/signature.
  Source: https://fonts.google.com/specimen/Caveat
  License: `Caveat-OFL.txt`.

When changing the Japanese display copy, update the subset so every new glyph
is included. Functional login labels and verification messages retain the
regular UI fonts and Chinese wording.
