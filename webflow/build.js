/* node build.js : converts the prototype and writes site/ and out/ (see convert.js) */
const fs = require('fs'), path = require('path');
const C = require('./convert.js'), { SRC, OUT, SITE, M } = C;
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

/* rules the Webflow structure needs on top of the prototype's (old names, converted with the rest) */
const EXTRA = `
.page-wrapper{}
.main-wrapper{}
.global-styles{}
.svg-sprite{position:absolute;width:0;height:0;overflow:hidden}
.rs-list{}
.rs-i{flex:none;width:clamp(272px,38vw,600px);scroll-snap-align:start}
.rs-c{width:100%}
.tr-b[data-i="0"]{--i:0}.tr-b[data-i="1"]{--i:1}.tr-b[data-i="2"]{--i:2}.tr-b[data-i="3"]{--i:3}.tr-b[data-i="4"]{--i:4}
`;
Object.assign(M.G, { 'rs-i': 'home-rostos_item', 'rs-list': 'home-rostos_list' });

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

/* ---------- pages ---------- */
const pages = { home: 'index.html' };
const dom = {}, docs = [], later = [];
for (const [name, file] of Object.entries(pages)) {
  const { $, sprite } = C.convertHtml(read(file), name);
  $('img[src^="assets/"]').each((i, el) => $(el).attr('src', '/alvoco2/' + $(el).attr('src')));
  const row = $('.home-rostos_row');
  if (row.length) { row.addClass('w-dyn-items').attr('role', 'list').html(stripItems); row.wrap('<div class="home-rostos_list w-dyn-list"></div>'); }
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
const ext = C.convertCss(read('assets/app.css') + EXTRA);
const head = '/* Alvôco a Recordar. Generated by webflow/build.js from the prototype: edit the source, not this file. */\n';
fs.writeFileSync(path.join(SITE, 'alvoco.css'), head + RESET + '\n' + ext + '\n');

runJs(); later.forEach(f => f());
fs.writeFileSync(path.join(OUT, 'dom.json'), JSON.stringify(dom));
/* ---------- native class styles ---------- */
/* class styles point at the Webflow variables by name, so the builder links them */
const bind = v => v.replace(/var\((--[\w-]+)\)/g, (m, n) => M.ALIAS[n] && n !== '--nav' ? 'var(' + M.ALIAS[n] + ')' : m); // --nav changes on phones, so it stays the page's own token
const nat = [...C.native].map(([k, m]) => { const [sel, bp] = k.split('|'); const th = (!+bp && M.THEMED[sel]) || {};
  return { sel, bp: +bp, decls: [...m].map(([p, v]) => [p, th[p] ? 'var(' + th[p] + ')' : bind(v)]) }; });
fs.writeFileSync(path.join(OUT, 'native.json'), JSON.stringify(nat));
const block = bp => nat.filter(r => r.bp === bp).map(r => r.sel + '{' + r.decls.map(d => d.join(':')).join(';') + '}').join('\n');
fs.writeFileSync(path.join(OUT, 'native.css'), block(0) + [991, 767, 479].map(bp => `\n@media screen and (max-width: ${bp}px){\n${block(bp)}\n}`).join(''));

console.log('native rules', nat.length, '| script literals changed', changed.length, '| css', (fs.statSync(path.join(SITE, 'alvoco.css')).size / 1024).toFixed(1) + 'KB');
if (process.argv.includes('-v')) console.log(changed.join('\n'));
console.log('classes left as they were:', [...C.unknown].sort().join(' ') || 'none');
