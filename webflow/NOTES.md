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

## How the build works

1. `node build.js` converts the prototype (`/home/claude/alvoco2` in the working session, also in `src/`)
   using `maps.js`: class names become Client-First names, the stylesheet is split in two, the script
   gets the new names and Webflow's URLs.
   - `out/native.json` / `out/native.css`: single class rules. These live in Webflow classes.
   - `site/alvoco.css`: everything else (states, pseudo elements, hovers, odd breakpoints), plus a
     low-priority copy of the class rules (`html :where(.x)`) that only matters when Webflow drops a property.
   - `site/alvoco.js`: the site script. Served by jsDelivr at a full commit hash.
2. `node payload.js` cuts the page into fragments for the HTML builder (`out/payload/`). A class is sent
   once, utilities before component classes, so the component class comes later in Webflow's CSS.
3. `out/home.html` mirrors Webflow's output (its base CSS, the class CSS, the variables, link classes).
   It is compared pixel by pixel with the prototype (0 px difference at 1440, 1100, 1024, 768, 600, 390)
   and run with motion on. The test scripts are not in the repo.
4. Breakpoints were moved to Webflow's: 900 to 991, 760 and 700 to 767, 560 and 520 to 479.

## State of the Webflow site (21 Nov, 08h30)

Home page, inside `page-wrapper`:
- `Global / Styles` (component 4cbafe6e-f5fd-1fca-093e-a5f13f798749): three embeds. The stylesheet import
  for the canvas (full commit hash), the logo sprite (`#alv-mark`, `#alv-word`), the loader and transition.
- `Global / Nav` (9d2f73c9-a0e8-c368-d369-1d4e9dd2e6d2): skip link, bar, menu.
- `main-wrapper` (645d3b54-56af-4a60-b8f3-d41ac0a08f3a): hero, picture, manifesto, trail, night, year,
  rostos, memory, join.
- `Global / Footer` (5aae2b57-b054-cbfb-9ec7-63ad594b9431).
- `Global / Drawer` (bde0a990-e010-dee4-8ccd-de2d66f1e2d4): the membership form, as an embed.

The faces strip is a collection list on Rostos (wrapper 3a6950dc-3bf6-f0a9-99cb-00f8b277a5e4): name,
nickname, quote and portrait bound, `data-slug` and `data-idade` bound as attributes. The script sets the
link from the slug.

Variables: collections Base, Theme, Typography, Layout, Sizes. The class styles name them
(`var(--_base---green--500)`), and `site/alvoco.css` points its short tokens at them.

Site custom code: head (boot script, fonts, stylesheet) and footer (GSAP, Lenis, `site/alvoco.js`,
`window.ALV_ENDPOINT`).

## Not done yet

- Nothing is published. The real Webflow render has not been seen: only the local mirror was tested.
- Photos are not in the asset library (bridge picture, nine portraits).
- The year list on the home page is static. It should become a collection list on Agenda.
- Sort the faces list by `ordem` (the API call failed twice with a conflict).
- The collection list's empty state still says "No items found."
- Links are plain URLs (`/sobre`). Once the pages exist, switch them to page links and remove the raw
  `href` attribute the builder left on each link.
- Link the main utility classes to the variables with the style tool, so the Style panel shows them.
- Other pages: sobre, rostos (list and template), caminhada, agenda, contactos, em-memoria, documentos,
  privacidade, cookies, 404. Their classes still have the prototype's names in `site/`.
- When `site/alvoco.css` changes: update the hash in the head code, the footer code and the first embed
  of `Global / Styles`.
