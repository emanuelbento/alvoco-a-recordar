/* node payload.js : cuts the converted page into the fragments sent to Webflow's HTML builder.
   Each fragment gets the class rules it introduces (a class is sent once, then reused by name).
   Writes out/payload/<nn>-<name>.html and .css, plus the code of the three embeds. */
const fs = require('fs'), path = require('path'), cheerio = require('cheerio');
const OUT = path.join(__dirname, 'out'), P = path.join(OUT, 'payload');
fs.rmSync(P, { recursive: true, force: true }); fs.mkdirSync(P, { recursive: true });
const dom = JSON.parse(fs.readFileSync(path.join(OUT, 'dom.json'), 'utf8')).home;
const nat = JSON.parse(fs.readFileSync(path.join(OUT, 'native.json'), 'utf8'));
const rules = new Map(nat.map(r => [r.sel + '|' + r.bp, r.decls]));
const SVGIN = new Set(['path', 'g', 'use', 'rect', 'defs', 'clippath', 'circle', 'text', 'line', 'polyline']);
const STATE = /^(on|open|in|gl|drag|ok|bad|over|lock|nx)$/;
const defined = new Set(), conflicts = [];
const mini = h => h.replace(/>\s*\n\s*</g, '><').replace(/\n\s*/g, ' ').trim();
const SWAP = { button: 'button', form: 'form', label: 'label', input: 'input', canvas: 'canvas' };

function fragment(name, html, { keepCanvas = true } = {}) {
  const $ = cheerio.load(html, { decodeEntities: false }, false);
  $('.w-dyn-list').each((i, el) => $(el).removeClass('w-dyn-list').empty());
  $('img').each((i, el) => { $(el).removeAttr('src').removeAttr('loading').removeAttr('width').removeAttr('height'); });
  $('button,form,label,input').each((i, el) => { $(el).attr('data-el', el.name); el.name = el.tagName = 'output'; });
  const css = []; const bps = { 991: [], 767: [], 479: [] };
  const emit = sel => { const base = (rules.get(sel + '|0') || []).map(([p, v]) => [p, v.replace(/\s*!important/, '')]); css.push(sel + '{' + base.map(d => d.join(':')).join(';') + '}');
    for (const bp of [991, 767, 479]) { const r = rules.get(sel + '|' + bp); if (r) bps[bp].push(sel + '{' + r.map(d => d.join(':')).join(';') + '}'); } };
  $('[class]').each((i, el) => {
    if (SVGIN.has(el.name.toLowerCase())) return;
    const list = $(el).attr('class').split(/\s+/).filter(c => c && !STATE.test(c));
    const plain = list.filter(c => !/^is-/.test(c)), combos = list.filter(c => /^is-/.test(c));
    /* utilities first: Webflow writes classes in the order they were made, and the component class must win */
    for (const c of [...plain.filter(c => !c.includes('_')), ...plain.filter(c => c.includes('_'))]) if (!defined.has(c)) { defined.add(c); emit('.' + c); }
    for (const k of combos) { const base = plain.find(c => rules.has('.' + c + '.' + k + '|0')) || plain[0]; const sel = '.' + base + '.' + k; if (!defined.has(sel)) { defined.add(sel); emit(sel); } }
    // two classes of one element setting the same property: the order Webflow writes them decides
    for (let a = 0; a < plain.length; a++) for (let b = a + 1; b < plain.length; b++) { const A = new Map(rules.get('.' + plain[a] + '|0') || []), B = rules.get('.' + plain[b] + '|0') || [];
      const hit = B.filter(([p, v]) => A.has(p) && A.get(p) !== v).map(d => d[0]); if (hit.length) conflicts.push(name + ': ' + plain[a] + ' / ' + plain[b] + ' -> ' + hit.join(',')); }
  });
  const cssText = css.join('') + [991, 767, 479].filter(bp => bps[bp].length).map(bp => `@media screen and (max-width: ${bp}px){${bps[bp].join('')}}`).join('');
  const out = mini($.html());
  const n = String(fs.readdirSync(P).filter(f => f.endsWith('.html')).length + 1).padStart(2, '0');
  fs.writeFileSync(path.join(P, n + '-' + name + '.html'), out); fs.writeFileSync(path.join(P, n + '-' + name + '.css'), cssText);
  console.log(n, name.padEnd(12), 'html', String(out.length).padStart(6), 'css', String(cssText.length).padStart(6));
}

const { parts, sprite } = dom;
fragment('shell', '<div class="page-wrapper"><main class="main-wrapper" id="main" data-page="home" data-tema="claro"></main></div>');
fragment('nav', parts.skip + parts.nav);
fragment('menu', parts.menu);
const $m = cheerio.load(parts.main, { decodeEntities: false }, false);
const names = ['hero', 'picture', 'manifesto', 'trail', 'night', 'year', 'rostos', 'memory', 'join'];
$m('main').children().each((i, el) => fragment(names[i] || 'section' + i, $m.html(el)));
fragment('footer', parts.footer);
/* embeds: written as they are, they keep their own markup */
const embed = (name, code) => { fs.writeFileSync(path.join(P, 'embed-' + name + '.html'), code); console.log('embed', name.padEnd(9), code.length); };
embed('styles', '<style>@import url("https://cdn.jsdelivr.net/gh/emanuelbento/alvoco-a-recordar@__SHA__/site/alvoco.css");</style>');
embed('sprite', sprite);
embed('drawer', mini(parts.drawer));
embed('overlays', mini(parts.transition + parts.loader));
console.log('classes defined', defined.size);
console.log(conflicts.length ? 'SAME PROPERTY ON TWO CLASSES:\n' + [...new Set(conflicts)].join('\n') : 'no property conflicts');
