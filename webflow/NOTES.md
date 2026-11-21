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
