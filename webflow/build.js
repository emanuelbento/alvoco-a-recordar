/* node build.js : converts the prototype and writes site/ and out/ (see convert.js) */
const fs = require('fs'), path = require('path');
const C = require('./convert.js'), { SRC, OUT, SITE, M } = C;
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

/* rules the Webflow structure needs on top of the prototype's (old names, converted with the rest).
   html:not(.js) also describes the Webflow Designer canvas, where the script never runs: text rests in its final state there.
   The Designer pads every childless element to 75px so it can be clicked. The lines, dots and lamps of this site are childless
   on purpose, so the wf-design-mode rule gives them their real size back. A bare new Div Block keeps Webflow's placeholder. */
const EXTRA = `
.page-wrapper{}
.main-wrapper{}
.global-styles{}
.svg-sprite{position:absolute;width:0;height:0;overflow:hidden}
.rs-list{}
.lk{display:inline}
.rs-i{flex:none;width:clamp(272px,38vw,600px);scroll-snap-align:start}
.rs-c{width:100%}
.embed-contents{display:contents}
[data-embed]>.w-embed{display:contents}
html:not(.js) .tr-t{opacity:1;transform:none}
html:not(.js) .page-wrapper:has(.main-wrapper[data-tema=claro]) .nav_bar{color:var(--w);background:rgb(12 21 16 / .4);box-shadow:inset 0 -1px 0 rgb(246 248 243 / .12)}
html:not(.js) .page-wrapper:has(.main-wrapper[data-tema=claro]) .nav_component .site-logo{color:var(--w)}
html:not(.js) .page-wrapper:has(.main-wrapper[data-tema=claro]) .nav_component .button{background:var(--w);color:var(--v-dd)}
html:not(.js) .page-wrapper:has(.main-wrapper[data-tema=claro]) .nav_burger{background:rgb(246 248 243 / .16)}
html.wf-design-mode .wf-empty[class*="_"],html.wf-design-mode :is(i,b,s,span,em,button,canvas).wf-empty{padding-right:0;padding-bottom:0;box-shadow:none;outline-style:none!important}
.ag-i:not([data-dia]) .ag-dt::after,.ag-i[data-dia=""] .ag-dt::after{content:"Data a anunciar";color:rgb(246 248 243 / .56)}
.agenda_link[data-pagina=""],.agenda_link:not([data-pagina]){display:none}
.agenda_link-label{display:inline}
.agenda_date-label{}
.agenda_collection{}
.home-year_collection{}
.fog.is-first{top:58%}
.fog.is-second{top:65%;left:-35%}
.rec-i{}
.shelf-l{}
.ap-n{}
.ap-c{}
.rnx-l{}
.rnx-ls{}
.rnx-it:not(:first-child){display:none}
.tr-b[data-i="0"]{--i:0}.tr-b[data-i="1"]{--i:1}.tr-b[data-i="2"]{--i:2}.tr-b[data-i="3"]{--i:3}.tr-b[data-i="4"]{--i:4}
`;
Object.assign(M.G, { 'rs-i': 'home-rostos_item', 'rs-list': 'home-rostos_list', 'shelf-l': 'rostos-library_list' });

/* Webflow ships tag defaults the design never had. They are returned to the browser's own here. */
const RESET = `@import url("https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap");
html{height:auto}
body{min-height:0}
h1,h2,h3,h4,h5,h6{font-size:revert;line-height:revert;font-weight:revert;margin:revert}
p{margin:revert}
blockquote{margin:revert;padding:revert;border-left:revert;font-size:revert;line-height:revert}
figure{margin:revert}
figcaption{margin-top:revert;text-align:revert}
ul,ol{margin:revert;padding-left:revert}
label{display:revert;margin-bottom:revert;font-weight:revert}
img{vertical-align:revert;display:revert}
.w-embed::before,.w-embed::after{content:none}`;

/* ---------- script ---------- */
const PATCHES = [
  [`if (!b.querySelector('i')) b.insertAdjacentHTML('beforeend', '<i aria-hidden="true"></i>');`, `if (!b.querySelector('.button_dot')) b.insertAdjacentHTML('beforeend', '<span class="button_dot" aria-hidden="true"></span>');`],
  [`const html = document.documentElement;`, `const html = document.documentElement;\nconst BASE = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '');`],
  [`const fileOf = u => u.pathname.split('/').pop();`, `const fileOf = u => u.pathname.replace(/^\\/+|\\/+$/g, '').split('/')[0];`],
  [`const cur = { '': './', 'index.html': './', 'rosto.html': 'rostos.html' }[file] ?? file;`, `const cur = '/' + ({ rosto: 'rostos' }[file] ?? file);`],
  [/const NAMES = \{[^\n]*\};/, `const NAMES = { '': 'Início', sobre: 'Sobre nós', rostos: 'Rostos', rosto: 'Rostos', caminhada: 'Caminhada', agenda: 'Agenda', contactos: 'Contactos', 'em-memoria': 'Em memória', documentos: 'Documentos', privacidade: 'Privacidade', cookies: 'Cookies' };`],
  [`if (same && file !== 'rosto.html') {`, `if (same) {`],
  [`document.title = d.title || document.title;`, `document.title = d.title || document.title;\n  const wfp = d.documentElement.getAttribute('data-wf-page'); if (wfp) html.setAttribute('data-wf-page', wfp);`],
  [`fetch('assets/cp.json')`, `fetch(BASE + 'cp.json')`],
  [`loadScript('assets/hero3d.js')`, `loadScript(BASE + 'hero3d.js')`],
  [`classList.remove('pend')`, `classList.remove('is-pending')`, 2],
  [`let ro = null, rzT = 0, lastH = 0;`, `let ro = null, rzT = 0, lastH = 0, bodyCls = '';`],
  [`document.body.className = m.dataset.cls || '';`, `if (bodyCls) document.body.classList.remove(bodyCls); bodyCls = m.dataset.cls || ''; if (bodyCls) document.body.classList.add(bodyCls);`],
  [`$('.tt', nx).insertAdjacentHTML('beforeend', '<span class="tag now">A seguir</span>');`, `$('.home-year_title-wrap', nx).insertAdjacentHTML('beforeend', '<span class="tag is-now">A seguir</span>');`],
  /* the faces strip is a Webflow collection list: the cards are already in the page */
  [/  row\.innerHTML = ROSTOS\.map\(r => \{[\s\S]*?\}\)\.join\(''\);\n/, `  $$('.rs-c', row).forEach(c => { const ne = $('.home-rostos_name', c), re = $('.home-rostos_role', c), n = ne.textContent.trim(), a = re.textContent.trim(), age = c.dataset.idade, tw = /^Gémea/.test(a);
    c.dataset.pt = first(n); if (c.dataset.slug) c.setAttribute('href', '/rosto/' + c.dataset.slug); c.draggable = false; const im = $('img', c); if (im) im.draggable = false;
    re.classList.remove('w-dyn-bind-empty');
    if (a && !tw) { ne.textContent = a; re.textContent = n + (age ? ', ' + age : ''); } else re.textContent = a ? a + (age ? ', ' + age : '') : 'Alvoco das Várzeas'; });
  if (!$('.rs-c', row)) return;\n`],
  /* the library and the single face are Webflow collection pages: the script completes what the CMS cannot bind */
  [`const sh = $('.shelf', m); sh.innerHTML = ROSTOS.map(recHTML).join('');\n  $('.lib-n', m).textContent = ROSTOS.length + ' rostos';`,
   `const sh = $('.shelf', m), recs = $$('.rec', sh);
  recs.forEach(c => { const ne = $('.rostos-library_name', c), ae = $('.rostos-library_alias', c), n = ne.textContent.trim(), a = ae.textContent.trim(), age = c.dataset.idade, im = $('img', c);
    c.dataset.pt = first(n); if (c.dataset.slug) c.setAttribute('href', '/rosto/' + c.dataset.slug);
    if (im) { c.dataset.img = im.currentSrc || im.src; if (!im.alt) im.alt = 'Retrato de ' + n; }
    ae.classList.remove('w-dyn-bind-empty'); ae.textContent = a ? a + (age ? ', ' + age : '') : c.dataset.escrito ? 'Alvoco das Várzeas' : 'Registo por escrever'; });
  $('.lib-n', m).textContent = recs.length + ' rostos';`],
  [/function rosto\(m\)\{[\s\S]*?\n\}\n/, `function rosto(m){
  const slug = decodeURIComponent(location.pathname.replace(/\\/+$/, '').split('/').pop());
  const n = $('.rosto_title', m).textContent.trim(), f = first(n); document.title = n + ', Rostos Alvocenses';
  const fill = (e, t) => { e.classList.remove('w-dyn-bind-empty'); e.textContent = t; };
  const al = $('.rosto_header-alias', m), alias = [al.textContent.trim(), al.dataset.idade ? al.dataset.idade + ' à data do registo' : ''].filter(Boolean).join(', ');
  if (alias) fill(al, alias); else al.remove();
  fill($('.rosto_caption-name', m), n + ', Alvoco das Várzeas');
  const cr = $('.rosto_caption-credit', m); if (!cr.textContent.trim()) fill(cr, 'Fotografia de Emanuel Bento');
  const im = $('.rosto_image-wrap img', m); if (im && !im.alt) im.alt = 'Retrato de ' + n;
  const ld = $('.rosto_lede', m), col = $('.rosto_column', m), q = $('.rosto_quote', m);
  if (!ld.textContent.trim()) { fill(ld, 'O registo de ' + f + ' ainda está por escrever.'); col.classList.remove('w-dyn-bind-empty');
    col.innerHTML = '<p>Conheces a história de ' + f + '? Uma alcunha, um ofício, uma casa, uma tarde que ficou. Conta-nos e ajudas a completar este registo.</p><p><a class="button is-outline" href="/contactos#memoria">Contar uma memória</a></p>'; }
  if (!q.textContent.trim()) q.remove();
  /* the collection list holds every face: only the one after this page stays */
  const its = $$('.rosto-next_item', m), at = its.findIndex(x => $('.rosto-next_component', x).dataset.slug === slug), nx = its[(at + 1) % its.length];
  its.forEach(x => { if (x !== nx) x.remove(); });
  if (nx) { const a = $('.rosto-next_component', nx); a.setAttribute('href', '/rosto/' + a.dataset.slug); a.dataset.pt = first($('.rosto-next_title', a).textContent.trim()); }
  dots(m);
  if (!RM && nx) gsap.fromTo($('.rosto-next_image img', nx), { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: nx, start: 'top bottom', end: 'bottom bottom', scrub: true } });
}
`],
  /* the agenda is a collection list: month and day come as data-mes (1 to 12) and data-dia, the label without the year */
  [`const nx = its.find(i => +i.dataset.mo > mo) || its[0];`, `const nx = its.find(i => +i.dataset.mes - 1 > mo) || its[0];`],
  [`const all = $$('.ag-i', m), ord = [...all.filter(i => +i.dataset.mo > mo), ...all.filter(i => +i.dataset.mo <= mo)];`,
   `const mth = i => +i.dataset.mes - 1, all = $$('.ag-i', m), ord = [...all.filter(i => mth(i) > mo), ...all.filter(i => mth(i) <= mo)];`],
  [`ord.forEach(i => { const y = +i.dataset.mo > mo ? yr : yr + 1, sp = $('.ag-dt span', i); i.dataset.y = y; sp.textContent = sp.textContent.replace(/ de \\d{4}$/, '') + ' de ' + y; ls.appendChild(i); });`,
   `ord.forEach(i => { const y = mth(i) > mo ? yr : yr + 1, sp = $('.agenda_date-label', i), a = $('.agenda_link', i); i.dataset.y = y; sp.textContent = sp.textContent.replace(/ de \\d{4}$/, '') + ' de ' + y; ls.appendChild(i);
    if (a) a.dataset.pagina ? a.setAttribute('href', a.dataset.pagina) : a.remove(); });`],
  [`if (nx.dataset.day) { const d = Math.ceil((new Date(+nx.dataset.y, +nx.dataset.mo, +nx.dataset.day) - now) / 864e5);`,
   `if (nx.dataset.dia) { const d = Math.ceil((new Date(+nx.dataset.y, mth(nx), +nx.dataset.dia) - now) / 864e5);`],
  [`$('.ag-nx-d', m).textContent = $('.ag-dt span', nx).textContent + '. ' + left + '.';`,
   `$('.ag-nx-d', m).textContent = $('.agenda_date-label', nx).textContent + '. ' + left + '.';`],
  /* the faces now live in the CMS: the copy the prototype carried goes */
  [/const ROSTOS = \[[\s\S]*?\n\];\n/, ''],
  [/const recHTML = [^\n]*\n/, ''],
  [/const img = s => [^\n]*\n/, ''],
  [/const sub = r => [^\n]*\n/, ''],
  /* the loader's logo is drawn from the sprite, so the paths exist once in the page */
  [/function loader\(ready\)\{\n/, `function loader(ready){\n  { const mk = $('#alv-mark'), wd = $('#alv-word'); if (mk && wd) { $('.ld-line').innerHTML = $('.ld-solid').innerHTML = mk.innerHTML; $('.ld-word').innerHTML = wd.innerHTML; } }\n`],
];
/* script first needs the same docs: see below */
let js, changed; const runJs = () => { ({ js, changed } = C.convertJs(read('assets/app.js'), PATCHES)); fs.writeFileSync(path.join(SITE, 'alvoco.js'), js); };
// = C.convertJs(read('assets/app.js'), PATCHES);
for (const f of ['hero3d.js', 'cp.json']) fs.copyFileSync(path.join(SRC, 'assets', f), path.join(SITE, f));
fs.mkdirSync(path.join(SITE, 'fonts'), { recursive: true });
for (const f of fs.readdirSync(path.join(SRC, 'assets/fonts'))) fs.copyFileSync(path.join(SRC, 'assets/fonts', f), path.join(SITE, 'fonts', f));

/* ---------- the faces strip, as the collection list renders it ---------- */
const ROSTOS = new Function('return ' + read('assets/app.js').match(/const ROSTOS = (\[[\s\S]*?\n\]);/)[1])();
const stripItems = ROSTOS.map(r => `<div role="listitem" class="home-rostos_item w-dyn-item"><a class="home-rostos_card" href="/rostos" data-slug="${r.s}"${r.age ? ` data-idade="${r.age}"` : ''}><div class="home-rostos_image-wrap image-wrapper"><img class="home-rostos_image image-cover" src="/alvoco2/assets/img/${r.s}.webp" alt="Retrato de ${r.n}" loading="lazy" width="1600" height="1067">${r.quote ? `<p class="home-rostos_quote">${r.quote}</p>` : ''}</div><div class="home-rostos_meta"><div class="home-rostos_name">${r.n}</div><div class="home-rostos_role${r.a ? '' : ' w-dyn-bind-empty'}">${r.a || ''}</div></div></a></div>`).join('');

/* ---------- the two collection pages, written as the CMS renders them (old names, converted with the rest) ---------- */
const recItem = r => `<div class="rec-i"><a class="rec" href="rosto.html#${r.s}" data-slug="${r.s}"${r.age ? ` data-idade="${r.age}"` : ''}${r.lede ? ` data-escrito="${r.lede.replace(/"/g, '&quot;')}"` : ''}><div class="ph"><img src="assets/img/${r.s}.webp" alt="Retrato de ${r.n}" loading="lazy" width="1600" height="1067"></div><div class="rec-m"><b>${r.n}</b><div class="al">${r.a || ''}</div></div></a></div>`;
const rostoMain = r => `
<section class="ah w">
  <div class="ah-m" data-r="fade"><span>Rostos Alvocenses</span><a class="ul" href="rostos.html">Voltar a todos os rostos</a></div>
  <h1 class="d1" data-r="lines">${r.n}</h1><div class="alc" data-r="fade"${r.age ? ` data-idade="${r.age}"` : ''}>${r.a || ''}</div>
</section>
<section class="ap w"><figure><div class="ph" data-r="img"><img src="assets/img/${r.s}.webp" alt="Retrato de ${r.n}" width="1600" height="1067"></div><figcaption><div class="ap-n">${r.n}</div><div class="ap-c">${r.credit || ''}</div></figcaption></figure></section>
<section class="ab w sec"><div class="g">
  <p class="ab-l big" data-r="words">${r.lede || ''}</p><div class="col prose" data-r="fade">${(r.body || []).map(p => `<p>${p}</p>`).join('')}</div><blockquote class="q" data-r="lines">${r.quote || ''}</blockquote>
  <p class="cr" data-r="fade">Rostos Alvocenses é uma série de Emanuel Bento, iniciada em 2018 e continuada com a Associação Alvôco a Recordar.</p>
</div></section>
<div class="rnx-l"><div class="rnx-ls">${ROSTOS.map(x => `<div class="rnx-it"><a class="rnx" href="rosto.html#${x.s}" data-slug="${x.s}" data-tema="claro"><div class="rnx-i" aria-hidden="true"><img src="assets/img/${x.s}.webp" alt="" loading="lazy"></div><div class="rnx-t w"><span class="lb">A seguir</span><div class="d1">${x.n}</div></div></a></div>`).join('')}</div></div>
`;
const SOURCE = {
  rostos: h => h.replace('<div class="shelf"></div>', '<div class="shelf">' + ROSTOS.map(recItem).join('') + '</div>'),
  rosto: h => h.replace('<div id="artigo"></div>', rostoMain(ROSTOS[0])),
};
const dyn = ($, list, item) => { $(item).addClass('w-dyn-item').attr('role', 'listitem'); $(list).addClass('w-dyn-items').attr('role', 'list'); };

/* ---------- pages ---------- */
const pages = M.PAGES;
const dom = {}, docs = [], later = [];
for (const [name, file] of Object.entries(pages)) {
  const src = read(file), made = SOURCE[name] ? SOURCE[name](src) : src;
  if (SOURCE[name] && made === src) throw new Error('nothing to fill in ' + file);
  const { $, sprite } = C.convertHtml(made, name);
  const tag = (el, t) => { el.name = el.tagName = t; };
  if (name === 'home') { const ul = $('.home-year_list'); ul.children().each((i, li) => { const $li = $(li); $li.attr('data-mes', +$li.attr('data-mo') + 1).removeAttr('data-mo'); tag(li, 'div');
      $li.find('.home-year_date,.home-year_title,.home-year_description').each((j, e) => tag(e, 'div')); });
    tag(ul[0], 'div'); dyn($, '.home-year_list', '.home-year_item'); ul.wrap('<div class="home-year_collection w-dyn-list"></div>'); }
  if (name === 'agenda') { const ol = $('.agenda_list'); ol.children().each((i, li) => { const $li = $(li); $li.attr('data-mes', +$li.attr('data-mo') + 1).removeAttr('data-mo').attr('data-dia', $li.attr('data-day') || '').removeAttr('data-day'); tag(li, 'div');
      const dt = $li.find('.agenda_date'), label = dt.find('span').text().replace(/ de \d{4}$/, ''); dt.replaceWith('<div class="agenda_date"><div class="agenda_date-label">' + label + '</div></div>');
      const a = $li.find('a'), page = a.attr('href') || '', text = a.text(); a.remove();
      $li.find('.agenda_text').append('<a class="text-style-link agenda_link" href="/agenda" data-pagina="' + page + '"><div class="agenda_link-label">' + text + '</div></a>'); });
    tag(ol[0], 'div'); dyn($, '.agenda_list', '.agenda_item'); ol.wrap('<div class="agenda_collection w-dyn-list"></div>'); }
  if (name === 'rostos') { dyn($, '.rostos-library_shelf', '.rostos-library_item'); $('.rostos-library_shelf').wrap('<div class="rostos-library_list w-dyn-list"></div>'); }
  if (name === 'rosto') { dyn($, '.rosto-next_items', '.rosto-next_item'); $('.rosto-next_list').addClass('w-dyn-list'); $('.rosto_column').addClass('w-richtext'); }
  $('.rostos-library_alias,.rosto_header-alias,.rosto_caption-credit').each((i, el) => { if (!$(el).text().trim()) $(el).addClass('w-dyn-bind-empty'); });
  $('img[src^="assets/"]').each((i, el) => $(el).attr('src', '/alvoco2/' + $(el).attr('src')));
  const row = $('.home-rostos_row');
  if (row.length) { row.addClass('w-dyn-items').attr('role', 'list').html(stripItems); row.wrap('<div class="home-rostos_list w-dyn-list"></div>'); }
  for (const [sel, id, mode] of M.EMBEDS[name] || []) { const el = $(sel); if (el.length !== 1) throw new Error('embed ' + id + ': ' + el.length + ' matches');
    if (mode === 'inner') { el.parent().attr('data-embed', id); el.wrap('<div class="w-embed"></div>'); } else el.wrap('<div class="embed-contents" data-embed="' + id + '"><div class="w-embed"></div></div>'); }
  /* the outline of the country was traced at far more points than its size on screen can show */
  $('.contact-map_outline').each((i, el) => { const pts = $(el).attr('d').replace(/Z\s*$/, '').split(/[ML]/).filter(Boolean).map(t => t.trim().split(/[ ,]+/).map(Number));
    const dist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; if (!l) return Math.hypot(p[0] - a[0], p[1] - a[1]); const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
    const rdp = (a, e) => { if (a.length < 3) return a; let m = 0, k = 0; for (let j = 1; j < a.length - 1; j++) { const d = dist(a[j], a[0], a[a.length - 1]); if (d > m) { m = d; k = j; } } return m > e ? [...rdp(a.slice(0, k + 1), e).slice(0, -1), ...rdp(a.slice(k), e)] : [a[0], a[a.length - 1]]; };
    const out = rdp(pts, 0.9), f = n => String(Math.round(n * 10) / 10);
    $(el).attr('d', 'M' + out.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z'); });
  /* inline positions become combo classes: Webflow has no inline styles */
  $('.walk-scene_fog[style]').each((i, el) => { $(el).addClass({ 'top:58%': 'is-first', 'top:65%;left:-35%': 'is-second' }[$(el).attr('style')] || 'is-unknown').removeAttr('style'); });
  if ($('main [style]').length) throw new Error(name + ': inline style left: ' + $.html($('main [style]').first()).slice(0, 120));
  $('main').addClass('main-wrapper');
  docs.push($);
  later.push(() => {
  const pick = s => { const e = $(s).first(); const h = $.html(e); e.remove(); return h; };
  const parts = { skip: pick('.skip-link'), nav: pick('.nav_component'), menu: pick('.menu_component'), transition: pick('.transition_component'),
    drawer: pick('.drawer_component'), loader: pick('.loader_component'), main: pick('main'), footer: pick('.footer_component') };
  dom[name] = { parts, sprite, title: $('title').text() };
  const $b = require('cheerio').load(`<div class="page-wrapper"><div class="global-styles w-embed">${sprite}</div>${parts.skip}${parts.nav}${parts.menu}${parts.main}${parts.footer}<div class="w-embed">${parts.drawer}</div><div class="w-embed">${parts.transition}${parts.loader}</div></div>`, { decodeEntities: false }, false);
  $b('a').addClass('w-inline-block');
  const body = $b.html();
  fs.writeFileSync(path.join(OUT, name + '.html'), `<!doctype html><html lang="pt-PT" data-wf-page="x"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${dom[name].title}</title>
<script>(function(){var d=document.documentElement;d.classList.add('js');try{if(!sessionStorage.getItem('alv-seen')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('ld-on');}catch(e){}})()</script>
<link rel="stylesheet" href="/wfbase/normalize.css"><link rel="stylesheet" href="/wfbase/webflow.css">
<style>:root{${Object.entries(M.WFVARS).map(([k, v]) => k + ":" + v).join(";")}}</style>\n<link rel="stylesheet" href="/alvoco-a-recordar/webflow/out/native.css" id="native"><script>if(/nonative/.test(location.search))document.getElementById('native').remove()</script>
<link rel="stylesheet" href="/alvoco-a-recordar/site/alvoco.css"></head><body>${body}
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/CustomEase.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/DrawSVGPlugin.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/MotionPathPlugin.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/Flip.min.js"></script><script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>
<script src="/alvoco-a-recordar/site/alvoco.js"></script></body></html>`);
  });
}
C.setDocs(docs);

/* ---------- stylesheet ---------- */
/* "nx" is also the agenda's state for the next date: the block at the foot of a face gets its own name */
const ext = C.convertCss(read('assets/app.css').replace(/^\.nx(?=[{\s-])/gm, '.rnx') + EXTRA);
const head = '/* Alvôco a Recordar. Generated by webflow/build.js from the prototype: edit the source, not this file. */\n';
fs.writeFileSync(path.join(SITE, 'alvoco.css'), head + RESET + '\n' + ext + '\n');

runJs(); later.forEach(f => f());
fs.writeFileSync(path.join(OUT, 'dom.json'), JSON.stringify(dom));
/* ---------- native class styles ---------- */
/* class styles point at the Webflow variables by name, so the builder links them */
const bind = v => v.replace(/var\((--[\w-]+)\)/g, (m, n) => M.ALIAS[n] && n !== '--nav' ? 'var(' + M.ALIAS[n] + ')' : m); // --nav changes on phones, so it stays the page's own token
const nat = [...C.native].map(([k, m]) => { const [sel, bp] = k.split('|'); const th = (!+bp && M.THEMED[sel]) || {};
  return { sel, bp: +bp, decls: [...m].map(([p, v]) => [p, th[p] ? 'var(' + th[p] + ')' : bind(v)]) }; });
/* A grid class that names no tracks is drawn as Webflow's default two by two on the Designer canvas, never on the published site.
   One auto column and one auto row say what the browser does anyway, so the canvas, the style panel and the site agree. */
const tracked = new Set(nat.filter(r => r.decls.some(([p]) => /^grid-template/.test(p))).map(r => r.sel));
nat.forEach(r => { if (!r.bp && !tracked.has(r.sel) && r.decls.some(([p, v]) => p === 'display' && /grid/.test(v))) r.decls.push(['grid-template-columns', 'auto'], ['grid-template-rows', 'auto']); });
fs.writeFileSync(path.join(OUT, 'native.json'), JSON.stringify(nat));
const block = bp => nat.filter(r => r.bp === bp).map(r => r.sel + '{' + r.decls.map(d => d.join(':')).join(';') + '}').join('\n');
fs.writeFileSync(path.join(OUT, 'native.css'), block(0) + [991, 767, 479].map(bp => `\n@media screen and (max-width: ${bp}px){\n${block(bp)}\n}`).join(''));

console.log('native rules', nat.length, '| script literals changed', changed.length, '| css', (fs.statSync(path.join(SITE, 'alvoco.css')).size / 1024).toFixed(1) + 'KB');
if (process.argv.includes('-v')) console.log(changed.join('\n'));
console.log('classes left as they were:', [...C.unknown].sort().join(' ') || 'none');
