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
- Documentos is static markup; its CMS collection exists, empty, and is not bound. The Agenda and Documentos template pages are empty and cannot be set to draft through the API.
- 404 page: not built (utility pages are not exposed by the API).
- SEO title of the rosto template is static; bind it to the name in the page settings.
- DOM elements created by the builder (figure, figcaption, dl, dt, dd, i, b, mark, canvas, svg) keep a duplicate raw `class` attribute next to their Webflow class. Harmless, untidy.
- Links are URL links with a raw `href` attribute, not page links.
- Class values use the Webflow variable names as text; they resolve, but are not linked in the variables panel.
- Published to webflow.io on 21 Nov (see below); the render still has to be looked at.

## Agenda on the CMS (21 Nov 2026, 11h40)

- The agenda page list and the home "O ano em Alvoco" list are collection lists on Agenda, sorted by `mes` then `dia`: agenda wrapper `6093fc37-a31d-9187-d006-cdef92f7f117` (page agenda), home wrapper `f6ece956-28a0-5a30-3d31-67ab6f89835d`.
- A collection list must be connected to its collection (`source`) before anything can be added inside its item.
- A class is created by a CSS rule in the builder call even when no element in that call uses it (`.agenda_collection{}`), so it can be applied afterwards with `set_style`.
- Item attributes: `data-mes` (1 to 12) and `data-dia` on the item; `data-pagina` on the link, bound to the Link field `ligacao`, which accepts a path such as `/caminhada`. New field `texto-da-ligacao` holds the words of the link.
- Without the script (and on the Designer canvas) the list is already right: "Data a anunciar" is written by CSS when `data-dia` is empty and the link hides when `data-pagina` is empty. The script only adds the year, reorders from today and marks the next date.

## Published to webflow.io (21 Nov 2026, 11h44)

- First publish, staging subdomain only: https://alvoco-a-recordar-website.webflow.io . The Agenda (7) and Rostos (9) items were set ready to publish first. Emanuel's go-ahead: "faz de tudo", in reply to the question about publishing to webflow.io.
- Site code and the Global / Styles embed point at commit 5894076abe0919dc034098b88040244898169e8e.
- The site's primary locale is still English (`en`) and the API cannot change it. The head boot script sets `lang="pt-PT"` until Site settings > Localization says Portuguese (Portugal).
- The real render is still unseen from the build machine: webflow.io is not reachable from it and the browser extension on Emanuel's Mac was not answering.

### Photographs, ready to upload
Folder `/mnt/user-data/outputs/alvoco-fotos` (ephemeral machine): `alvoco-ponte`, `alvoco-aldeia`, `alvoco-colcurinho`, `alvoco-almoco`, `alvoco-rua`, `alvoco-noite`, and `rosto-<slug>` for the nine faces (.webp). Route that works: the Webflow Designer open in Emanuel's Chrome with the Claude extension, files sent to the Assets panel input. Upload hosts are not reachable from the build machine and the Designer upload-by-URL needs a public address, which the portraits must not have.

Where each one goes:
- home `picture_image` `1c44a443-b9c0-5260-d4fe-2a2ffe5b6edd`: ponte
- sobre (page 6b015db4d6724bf363054538): `b0470b43-771b-c85b-4536-c190aa4fd09f` aldeia, `...d0af` colcurinho, `...d0be` rosto-conceicao-pimentel, `...d0cd` almoco, `...d0d9` rua, `...d0e5` rosto-acacio-mendes, `...d0f1` noite
- caminhada (page 6b015db7daa395a66cdf292a): `9cf8367d-33a9-2394-c371-01286e5a17e6` colcurinho
- Rostos items, field `retrato` (collection 6b00eff9b5fc0855c0fa78cc): tia-maria `6b00f034416487a70d3a3eb2`, conceicao-pimentel `...3eb4`, jose-lobo `...3eb6`, nascimento-andrade `...3eb8`, irene-tavares `...3eba`, soledade-tavares `...3ebc`, acacio-mendes `...3ebe`, maria-ferreira `...3ec0`, judite-lobo `...3ec2`
- Agenda items (collection 6b00eff963329174511ab335): `6b00f034da73ffacfbf6b5ca` to `...b5d6`, even last byte.

## Photographs in Webflow Assets (23 Nov 2026)

Uploaded through the Designer in Emanuel's Chrome (Assets panel file input, `file_upload` from `/home/claude/alvoco-fotos`; the `/mnt/user-data/outputs` path is refused). Hosted at `https://s3.amazonaws.com/webflow-prod-assets/6b00dcb2fdb9505a07c51afc/<id>_<name>.webp`.

| asset | id |
| --- | --- |
| alvoco-ponte | 6b0458ddad7c6d2f6570d6ac |
| alvoco-aldeia | 6b0458e7d254a344af33aa2a |
| alvoco-colcurinho | 6b0458e77e8d4763e09ef3a6 |
| alvoco-almoco | 6b0458e73cb38f4d6341c383 |
| alvoco-rua | 6b0458e75fe696f6e2e60729 |
| alvoco-noite | 6b0458e74dc8ad98231bbc6f |
| rosto-tia-maria | 6b0458e7c0ba52d0ce1df987 |
| rosto-conceicao-pimentel | 6b0458e7a5218d0beaba8ce0 |
| rosto-jose-lobo | 6b0458e79c2ccce7a53b753f |
| rosto-nascimento-andrade | 6b0458e7ebd97f58e40987b9 |
| rosto-irene-tavares | 6b0458e75d79e31b069a33ee |
| rosto-soledade-tavares | 6b0458ec44407300c290b999 |
| rosto-acacio-mendes | 6b0458e7a9148441f3611d63 |
| rosto-maria-ferreira | 6b0458e7671c6f475db6dcf5 |
| rosto-judite-lobo | 6b0458e7ebd97f58e40987ea |

## First look at the real render (23 Nov 2026)

- https://alvoco-a-recordar-website.webflow.io renders like the prototype at 1920: hero 3D, trail, night, CMS year list with the "A seguir" tag, faces strip, memory, join, footer. jsDelivr serves the files, fonts load, no console errors.
- Bug found: the HTML builder drops `<use>` inside `<svg>`, so every logo drawn from the sprite outside an embed was empty (nav, menu, footer mark, member card front and back, memorial placeholder). Fixed by adding DOM elements with tag `use` and attribute `href` (`#alv-mark`, `#alv-word`) through the element builder. They also render on the Designer canvas.
- Bug found on /caminhada only: a very large fragment can leave inline spans behind as literal `##INLINEn##` tokens (the title highlight, the four caption kickers, the progress label, the three ticks). Every other page was checked for the token and is clean. Rebuilt with small fragments: title `4564ec81-35d5-e64c-74ed-a03fc3680e86`, captions `592c20ae-0872-6c63-e001-35eb1c0a3351`, progress `f3af0da9-6dbc-8108-c0cb-2ef545686f13`. Rule for next time: keep fragments with inline spans small and read the text back after a push.
- The face page title was the static SEO title on every face. The script now writes `<name>, Rostos Alvocenses`. Binding the SEO title to the Name field in the template's page settings is still better for link previews and is left for the Designer.

## The Designer canvas against the site (23 Nov 2026)

The canvas runs no script and loads the stylesheet through the Global / Styles embed. Three things made it differ from the published site. All three are fixed and every page now has the same height on the canvas (1040 by 733) as the script-less build: home 8813, sobre 9053, rostos 2672, caminhada 7594, agenda 3082, contactos 2642, em-memoria 3005, documentos 2133.

1. Nav theme. The script picks the nav colours from the section under it. Without it the nav sat in its light-page colours over the dark heroes. `html:not(.js) .page-wrapper:has(.main-wrapper[data-tema=claro])` now gives the resting state.
2. Childless elements. The Designer adds `.wf-empty{padding-right:75px;padding-bottom:75px}` to every element without children so it can be clicked. The timeline line became a 75px bar, each dot a 75px disc. The stylesheet answers with `html.wf-design-mode .wf-empty[class*="_"]` and the same for `i, b, s, span, em, button, canvas`: anything carrying one of the site's own classes keeps its real size. A new Div Block with no class still gets Webflow's placeholder, so building in the Designer is not affected.
3. Grids without tracks. A class with `display:grid` and no template is drawn by the Designer as its default two columns by two rows (it injects a `[data-wf-id]` rule per instance, with 75px minimum for empty tracks). The published CSS has no such rule, so the site showed one column and the canvas two. Ten classes now carry `grid-template-columns:auto; grid-template-rows:auto`, which is what the browser does anyway: home-night_text, home-memory_label, member-card_back, about-board_intro, memory-details_right, memory-details_photo, rostos-library_meta, walk-info_intro, contact_item, documents_title. `build.js` adds the pair to any native grid class without a template, so `out/native.json` matches Webflow.

What the canvas cannot show, by nature: anything the script computes (the "A seguir" tag and the year on agenda dates, the composed alias on face cards, counters, the 3D hero, pinned scenes in motion). The canvas shows the resting layout.

The canvas document is the iframe `#site-iframe-next`, same origin as the Designer, so it can be measured from the page with the browser extension. `?pageId=<id>` in the Designer address opens a page directly.

## Phone width (23 Nov 2026)

The Chrome window on Emanuel's Mac does not resize below its current size from the extension. The check was done with same-origin iframes 390px wide inside a page of the published site: media queries follow the iframe. All eleven pages: no horizontal overflow, menu overlay and membership drawer open and fit, caminhada scene and agenda timeline hold. Still missing: a real touch device (hover hints, momentum scroll, the weight of the 3D hero).

## 404 page (23 Nov 2026)

- Utility page id `6b04621c9378aa2492fa5b79` (not in `list_pages`, found by opening it from the Pages panel; the API accepts the id). Webflow's default block was replaced by the site shell: `page-wrapper` `7b03130e-b4f4-2672-d45c-e06c0380d391` with Global / Styles, Global / Nav, `main` (`data-page="erro"`), Global / Footer, Global / Drawer.
- Content uses the page header classes of the other pages. One new native class, made in Webflow only and not part of the prototype build: `error_actions` (`grid-column:1/span 6; grid-row:1; display:flex; flex-wrap:wrap; gap 12px`, and `grid-column:1/-1; grid-row:auto` at 991).
- Title "Página não encontrada, Alvôco a Recordar".
- On the staging subdomain the page answers at `/404`, but a wrong address still shows Webflow's own generic page. To check again once the site has a plan and a domain.

## State at the end of 23 Nov 2026

- Published to webflow.io only. Site head, footer and the Global / Styles embed point at commit b22f647a49c9234de57fea7b79a7b07048e6b412.
- Seen in the real browser at 1920 and at 390: home, sobre, rostos, a face page, caminhada, agenda, contactos, em-memoria, documentos, privacidade, cookies, 404. No console errors.
- Site language is still English in Site settings > Localization (the head script corrects `lang`). Left for Emanuel.
