/* node payload.js : cuts the converted pages into what is sent to Webflow's HTML builder.
   A class is sent once, with the page that first uses it, then reused by name.
   Writes out/payload/<nn>-<name>.html and .css, the code of every embed, and plan.json (what each page needs after the push). */
const fs = require('fs'), path = require('path'), cheerio = require('cheerio');
const M = require('./maps.js');
const OUT = path.join(__dirname, 'out'), P = path.join(OUT, 'payload');
fs.rmSync(P, { recursive: true, force: true }); fs.mkdirSync(P, { recursive: true });
const dom = JSON.parse(fs.readFileSync(path.join(OUT, 'dom.json'), 'utf8'));
const nat = JSON.parse(fs.readFileSync(path.join(OUT, 'native.json'), 'utf8'));
const rules = new Map(nat.map(r => [r.sel + '|' + r.bp, r.decls]));
const order = nat.filter(r => !r.bp).map(r => r.sel), src = c => { const i = order.indexOf('.' + c); return i < 0 ? 1e9 : i; };
const SVGIN = new Set(['path', 'g', 'use', 'rect', 'defs', 'clippath', 'circle', 'text', 'line', 'polyline']);
const STATE = /^(on|open|in|gl|drag|ok|bad|over|lock|nx|w-[\w-]+)$/;
const defined = new Map(), wrong = [], plan = {};
const mini = h => h.replace(/>\s*\n\s*</g, '><').replace(/\n\s*/g, ' ').trim();
let seq = 0;

function fragment(name, html, page) {
  const $ = cheerio.load(html, { decodeEntities: false }, false);
  const info = plan[page] = plan[page] || { fragments: [], embeds: [], lists: [], buttons: 0, dom: 0, shared: [], newTab: 0 };
  /* embeds leave a holder behind; the code goes to its own file */
  $('[data-embed]').each((i, el) => { const id = $(el).attr('data-embed'), w = $(el).children('.w-embed'); fs.writeFileSync(path.join(P, 'embed-' + id + '.html'), mini(w.html())); info.embeds.push(id); w.remove(); });
  for (const [pg, sel, comp] of M.SHARED) if (pg === page) $(sel).each((i, el) => { info.shared.push(comp); $(el).replaceWith('<div data-shared="' + comp + '"></div>'); });
  /* a collection list leaves its three classes on a stand-in and one item's content in a file of its own */
  $('.w-dyn-list').each((i, el) => { const item = $(el).find('.w-dyn-item').first(), id = $(el).attr('class').split(' ')[0];
    info.lists.push({ id, item: fragmentRaw(page + '-' + id + '-item', item.html(), page) });
    item.empty().siblings().remove(); $(el).attr('data-list', id); });
  $('.w-embed').remove();
  return fragmentRaw(name, $.html(), page);
}
function fragmentRaw(name, html, page) {
  const $ = cheerio.load(html, { decodeEntities: false }, false), info = plan[page];
  $('[class]').each((i, el) => { const c = $(el).attr('class').split(/\s+/).filter(x => !/^w-/.test(x)).join(' '); c ? $(el).attr('class', c) : $(el).removeAttr('class'); });
  $('[role=list],[role=listitem]').removeAttr('role');
  $('img').each((i, el) => { $(el).removeAttr('src').removeAttr('loading').removeAttr('width').removeAttr('height'); });
  info.newTab += $('a[target]').length; info.dom += $('figure,figcaption,dl,dt,dd,canvas,svg,ol,li,em').length;
  $('button,form,label,input').each((i, el) => { info.buttons++; $(el).attr('data-el', el.name); el.name = el.tagName = 'output'; });
  const need = [], css = [], bps = { 991: [], 767: [], 479: [] }, n = String(++seq).padStart(2, '0');
  $('[class]').each((i, el) => {
    if (SVGIN.has(el.name.toLowerCase())) return;
    const list = $(el).attr('class').split(/\s+/).filter(c => c && !STATE.test(c));
    const plain = list.filter(c => !/^is-/.test(c)), combos = list.filter(c => /^is-/.test(c));
    for (const c of plain) if (!defined.has(c) && !need.includes(c)) need.push(c);
    for (const k of combos) { const base = plain.find(c => rules.has('.' + c + '.' + k + '|0')) || plain[0], sel = base ? base + '.' + k : k; /* a state class on its own, such as is-locked on a list item */ if (!defined.has(sel) && !need.includes(sel)) need.push(sel); }
  });
  /* utilities first, then components in the stylesheet's own order: Webflow writes classes in the order they were made */
  const rank = c => c.includes('.') ? 2 : c.includes('_') ? 1 : 0;
  need.sort((a, b) => rank(a) - rank(b) || src(a) - src(b));
  for (const c of need) { defined.set(c, defined.size); const sel = '.' + c;
    css.push(sel + '{' + (rules.get(sel + '|0') || []).map(([p, v]) => p + ':' + v.replace(/\s*!important/, '')).join(';') + '}');
    for (const bp of [991, 767, 479]) { const r = rules.get(sel + '|' + bp); if (r) bps[bp].push(sel + '{' + r.map(d => d.join(':')).join(';') + '}'); } }
  /* two classes of one element setting the same property: the later-made one wins in Webflow, the later-written one in the source */
  $('[class]').each((i, el) => { const plain = $(el).attr('class').split(/\s+/).filter(c => c && !STATE.test(c) && !/^is-/.test(c));
    for (let a = 0; a < plain.length; a++) for (let b = a + 1; b < plain.length; b++) { const A = new Map(rules.get('.' + plain[a] + '|0') || []), B = rules.get('.' + plain[b] + '|0') || [];
      const hit = B.filter(([p, v]) => A.has(p) && A.get(p) !== v).map(d => d[0]); if (!hit.length) continue;
      const want = src(plain[a]) > src(plain[b]) ? plain[a] : plain[b], got = defined.get(plain[a]) > defined.get(plain[b]) ? plain[a] : plain[b];
      if (want !== got) wrong.push(name + ': ' + want + ' should beat ' + got + ' on ' + hit.join(',')); } });
  const cssText = css.join('') + [991, 767, 479].filter(bp => bps[bp].length).map(bp => `@media screen and (max-width: ${bp}px){${bps[bp].join('')}}`).join('');
  const out = mini($.html()), file = n + '-' + name;
  fs.writeFileSync(path.join(P, file + '.html'), out); fs.writeFileSync(path.join(P, file + '.css'), cssText);
  info.fragments.push({ file, html: out.length, css: cssText.length, classes: need.length });
  return file;
}

/* home, as it was sent: shell, navigation, one fragment per section, footer */
{ const { parts } = dom.home;
  fragment('shell', '<div class="page-wrapper"><main class="main-wrapper" id="main" data-page="home" data-tema="claro"></main></div>', 'home');
  fragment('nav', parts.skip + parts.nav, 'home'); fragment('menu', parts.menu, 'home');
  const $m = cheerio.load(parts.main, { decodeEntities: false }, false), names = ['hero', 'picture', 'manifesto', 'trail', 'night', 'year', 'rostos', 'memory', 'join'];
  $m('main').children().each((i, el) => fragment(names[i] || 'section' + i, $m.html(el), 'home'));
  fragment('footer', parts.footer, 'home'); }
const homeClasses = defined.size;
/* every other page: the content of its main in one piece */
for (const page of Object.keys(M.PAGES).filter(p => p !== 'home')) {
  const $m = cheerio.load(dom[page].parts.main, { decodeEntities: false }, false), main = $m('main');
  fragment(page, main.html(), page);
  plan[page].main = { 'data-page': main.attr('data-page'), 'data-tema': main.attr('data-tema') || '', 'data-cls': main.attr('data-cls') || undefined };
  plan[page].title = dom[page].title;
}
const embed = (name, code) => fs.writeFileSync(path.join(P, 'embed-' + name + '.html'), code);
embed('styles', '<style>@import url("https://cdn.jsdelivr.net/gh/emanuelbento/alvoco-a-recordar@__SHA__/site/alvoco.css");</style>');
embed('sprite', dom.home.sprite); embed('drawer', mini(dom.home.parts.drawer)); embed('overlays', mini(dom.home.parts.transition + dom.home.parts.loader));
fs.writeFileSync(path.join(P, 'plan.json'), JSON.stringify(plan, null, 1));
for (const [pg, i] of Object.entries(plan)) if (pg !== 'home') console.log(pg.padEnd(12), i.fragments.map(f => f.file + ' html ' + f.html + ' css ' + f.css + ' cls ' + f.classes).join(' | '), '| embeds', i.embeds.join(',') || '-', '| lists', i.lists.map(l => l.id).join(',') || '-', '| buttons', i.buttons, '| dom', i.dom, '| shared', i.shared.join(',') || '-', '| newtab', i.newTab);
console.log('classes: home', homeClasses, 'all', defined.size);
console.log(wrong.length ? 'WRONG WINNER:\n' + [...new Set(wrong)].join('\n') : 'class order agrees with the stylesheet everywhere');
