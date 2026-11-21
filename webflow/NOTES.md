# Webflow build notes

Site `6b00dcb2fdb9505a07c51afc`, Home page `6b00dcb4fdb9505a07c51aff`,
body element `{component: 6b00dcb4fdb9505a07c51aff, element: 6b00dcb4fdb9505a07c51b04}`.

## What the HTML builder does (tested 21 Nov)

- Media queries must be written exactly `@media screen and (max-width: 991px)` (also 767, 479).
- Only single class selectors, combos (`.a.is-b`) and `:hover` style states. No descendant
  selectors, no `::before` / `::after` (the call is refused).
- A class is only created when the CSS has a rule for it. An empty rule (`.x{}`) is enough.
  Classes that already exist are reused without a rule.
- Shorthands are expanded (padding, margin, inset, border-radius). `font:` stays a single custom
  property, so write font-family / font-size / font-weight / line-height separately.
- Custom properties (`--x`) are dropped. `var(--x)` values are kept as text.
- `border:0` was dropped. clamp(), aspect-ratio, backdrop-filter, grid, text-wrap are kept.
- `<a>` becomes a Link (href, aria and rel kept, `target` dropped).
- `<button>` becomes a Link. For a real button write `<output …>`, which becomes a custom
  element, then `set_tag` to `button` and remove the raw `class` attribute.
- Unknown hyphenated tags are unwrapped (children kept, element lost).
- svg, path, dl, dt, dd, figcaption, fieldset, legend, i, b become custom elements and keep
  `class` as a raw attribute (plus the Webflow class when a rule exists).
- `<form>`, `<input>`, `<select>`, `<label>` become native Webflow form elements and the
  markup is rearranged (checkbox wrappers, select options lost).
- `<img>`: only linked when the `src` is already in the asset library. `loading` and data
  attributes are dropped.
- data and aria attributes on blocks, links and spans are kept.

## More findings (21 Nov, second pass)

- `!important` is refused. Leave it to the site stylesheet.
- `var(--name)` is kept as text. The builder says it looks names up in a "variable registry", but the
  variables' own CSS names (`--_base---green--500`) are not found there, so nothing is linked. The text
  still reads the Webflow variable when the page runs. Linking for the Style panel is done afterwards
  with the style tool (`variable_as_value`).
- An `<img>` without `src` is accepted and becomes an empty Image element.
- `<canvas>` is accepted.

## Home page element ids (component 6b00dcb4fdb9505a07c51aff)

page-wrapper 645d3b54-56af-4a60-b8f3-d41ac0a08f3b · main-wrapper 645d3b54-56af-4a60-b8f3-d41ac0a08f3a
skip link 1a54449a-0293-be83-a3a5-d995ad683bc9 · nav 0963233f-eeda-6592-7a64-06d255057ab8 · menu 81b0868d-9e95-2eb3-001c-7694bca0075c
hero b9d474d7-486d-b222-1316-c6333abd2d8e · picture 1c44a443-b9c0-5260-d4fe-2a2ffe5b6ee5 · manifesto 8431b27a-f5ac-206d-c0be-9415f2dfd085
trail 87cac608-f8ab-68db-2883-03695edc079c · night b43c988a-f8d5-7975-970b-ceb9ab4c1c70 · year 1416041e-fed4-5e43-baf5-80adf5441901
rostos 9f459858-b08b-4a9f-7e95-158b8ecc47bf · memory d95ea35c-9033-f686-0f48-9543fb2a0f48
