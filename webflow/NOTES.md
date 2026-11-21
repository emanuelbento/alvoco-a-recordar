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

## Pages in Webflow (21 Nov 2026)

Created as copies of a clean shell (page-wrapper with the four global components and an empty main `645d3b54-56af-4a60-b8f3-d41ac0a08f3a`, same element id on every page).

| page | id |
| --- | --- |
| cookies (the shell) | 6b015d8c97274b9818a96e2d |
| sobre | 6b015db4d6724bf363054538 |
| rostos | 6b015db6b95357623bf91141 |
| caminhada | 6b015db7daa395a66cdf292a |
| agenda | 6b015db990ec1aa2704ca59a |
| contactos | 6b015dbc17a30df16fda2140 |
| em-memoria | 6b015dbd8bbfb5a396aa5d06 |
| documentos | 6b015dbeb95357623bf915cd |
| privacidade | 6b015dbfb95357623bf9166e |
| rosto (CMS template) | 6b00eff9b5fc0855c0fa78d2 |

Component `Section / Join`: 9714e5df-c836-5c4d-8535-5d683d5f3a01 (home and sobre).
Site code (head, footer) and the Global / Styles embed point at commit 2f5bfe874ef2540147ca85903f505c7259b1c409, the last one that changed `site/`.

## State after building every page (21 Nov 2026, morning)

Every page of the prototype exists in Webflow, built by `payload.js` fragments pasted into the HTML builder.

- The builder wants ONE root element per action. Each page was sent as a whole `<main class="main-wrapper">` placed after the shell's empty main, which was then removed, so the main element id differs per page:
  sobre `b0470b43-771b-c85b-4536-c190aa4fd16e`, rostos `ef9cff68-fd4a-8897-1098-851884628636`, caminhada `9cf8367d-33a9-2394-c371-01286e5a17f7`, agenda `13cf2837-54f4-b8cc-999b-34d5dcdd05d9`, contactos `6153a2e4-b111-7ea8-1263-daa25aafd5a4`, em-memoria `de7afc5f-5c86-e12b-bf56-e37ec503a40c`, documentos `a10dceea-d4ac-a68f-30d7-2b18f8557f9f`, privacidade `51aa4123-3d3f-e193-c485-b851a180e4d0`, cookies `26b5e7d5-2c9a-76d7-b03d-4a35f76f4308`, rosto template `00880ea6-3949-7efb-1897-4a62c6074d9f` (page-wrapper `...4da0`).
- Collection lists (all on the Rostos collection, sorted by `ordem` ascending; the sort setting is `[{"fieldSlug":"ordem","direction":"ascending"}]` and now applies without conflict):
  home strip `3a6950dc-3bf6-f0a9-99cb-00f8b277a5e4`, library `0d8653a9-6b56-33cb-c8d7-19a1b415fe39` (page rostos), next face `68120a35-0d27-fcc2-1a5a-a7b42b38291a` (rosto template). A new CMSCollection gets consecutive ids: wrapper, list (+1), item (+2), empty state (+3).
- Rosto template bindings: title and caption name = Name, alias = Alcunha (+ `data-idade` = Idade), portrait = Retrato, caption credit = Credito, lede = Texto de abertura, RichText (key `richText`) = Texto, Blockquote (key `text`) = Citacao. The script fills what the CMS cannot (suffixes, fallbacks, the unwritten-face call, which face comes next).
- Embeds (holder `div[data-embed]` with class `embed-contents`, the HtmlEmbed inside it; `[data-embed]>.w-embed{display:contents}` keeps them out of the layout): walk-land (caminhada), contact-map and contact-form (contactos), privacy-table, cookies-table. The country outline in the contact map is simplified in `build.js` (Douglas-Peucker, 0.9 units): 10 KB to 4.7 KB with no visible change.
- `Section / Join` is a component shared by home and sobre.
- Buttons outside embeds were sent as `<output data-el="button">`, then `set_tag` button and the helper attributes removed (rostos toggle, contactos copy and member buttons).
- External links: `target` is dropped by the builder, set afterwards with the `link` setting (`open_in_new_tab`).
- Images lose custom attributes in the builder: `data-px` was set again on the sobre and caminhada photographs.

### Differences from the prototype, on purpose
- Agenda: in the prototype the next date inherited the rules of the "next face" block (both used the class `nx`), which left a 480 px hole after the first item and hid its dot. The two are now separate classes, so the list keeps its rhythm.

### Still open
- No photograph is in Webflow Assets and no CMS item is published: every image element is empty. The upload hosts are not reachable from the build machine.
- Agenda (page and home list) and Documentos are static markup; their CMS collections exist but are not bound. Their two template pages are empty and cannot be set to draft through the API.
- 404 page: not built (utility pages are not exposed by the API).
- SEO title of the rosto template is static; bind it to the name in the page settings.
- DOM elements created by the builder (figure, figcaption, dl, dt, dd, i, b, mark, canvas, svg) keep a duplicate raw `class` attribute next to their Webflow class. Harmless, untidy.
- Links are URL links with a raw `href` attribute, not page links.
- Class values use the Webflow variable names as text; they resolve, but are not linked in the variables panel.
- Nothing has been published, so the real Webflow render has never been seen. Publishing needs Emanuel's go-ahead.
