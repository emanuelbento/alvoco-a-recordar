/* Turns the prototype (build output, stylesheet and script) into what the Webflow site uses:
   site/alvoco.css   everything Webflow cannot hold in a class (states, pseudo elements, hovers),
                     plus a low-priority copy of the class styles as a safety net
   site/alvoco.js    the script, with the new class names and Webflow's URLs
   out/native.css    the class styles as Webflow stores them (used for the local test page)
   out/native.json   the same, structured, for building the pages
   out/<page>.html   a local page that mirrors how Webflow renders, for testing */
const fs = require('fs'), path = require('path'), postcss = require('postcss'), cheerio = require('cheerio');
const M = require('./maps.js');
const SRC = process.env.SRC || '/home/claude/alvoco2';
const OUT = path.join(__dirname, 'out'), SITE = path.join(__dirname, '..', 'site');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(SITE, { recursive: true });
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byLen = l => [...l].sort((a, b) => b[0].length - a[0].length);
const RAW = byLen(M.RAW), ADD = byLen(M.ADD.map(([s, c]) => [s, '.' + c]));
const unknown = new Set();

/* ---------- selectors ---------- */
const mapClass = (name, seen) => { for (const [o, ctx, n] of M.CTX) if (o === name && seen.includes(ctx)) return n; return M.G[name] ?? name; };
const splitTop = (s, ch = ',') => { const out = []; let d = 0, cur = ''; for (const c of s) { if (c === '(' || c === '[') d++; if (c === ')' || c === ']') d--; if (c === ch && !d) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); };
let docs = [];
const setDocs = d => { docs = d; };
/* an ancestor is only dropped when that does not change which elements the rule reaches */
function simplify(sel) {
  const m = sel.match(/^((?:\.[\w-]+(?:\s*>\s*|\s+))+)(\.([\w-]+)((?:::?[\w-]+(?:\([^)]*\))?)*))$/);
  if (!m) return sel;
  const anc = m[1].trim().split(/\s*>\s*|\s+/).map(a => a.slice(1)), leaf = m[3];
  if (!(leaf.includes('_') || M.UNIQUE.has(leaf))) return sel;
  if (anc.some(a => M.THEME.test(a))) return sel;
  let full = 0, alone = 0;
  for (const $ of docs) { full += $(m[1] + '.' + leaf).length; alone += $('.' + leaf).length; }
  return full > 0 && full === alone ? m[2] : sel;
}
function tx(selText, { keep = false } = {}) {
  return [...new Set(splitTop(selText).map(sel => {
    for (const [from, to] of RAW) sel = sel.replace(new RegExp(esc(from) + '(?![\\w-])', 'g'), to);
    for (const [from, to] of ADD) sel = sel.replace(new RegExp(esc(from) + '(?![\\w-])', 'g'), to);
    const seen = [];
    sel = sel.replace(/\.(-?[_a-zA-Z][\w-]*)/g, (m0, name) => { const n = mapClass(name, seen); seen.push(name); return '.' + n; });
    return keep ? sel : simplify(sel);
  }))].join(',');
}
const isNative = sel => /^\.[\w-]+(\.is-[\w-]+)*$/.test(sel);

/* ---------- stylesheet ---------- */
const REMAP = { 900: 991, 899: 991, 760: 767, 700: 767, 560: 479, 520: 479 };
const media = p => p.replace(/max-width:\s*(\d+)px/g, (m, n) => 'max-width:' + (REMAP[n] || n) + 'px');
const bpOf = p => { const m = p.match(/^\(max-width:(991|767|479)px\)$/); return m ? +m[1] : 0; };
const two = v => { const p = splitTop(v, ' '); return [p[0], p[1] ?? p[0]]; };
function nativeDecls(decls) {
  const out = [];
  for (const [p, v] of decls) {
    if (p.startsWith('--') || p.startsWith('-webkit-') || p.startsWith('-moz-')) continue;
    if (p === 'font' && /^(inherit|initial|unset)$/.test(v)) { for (const q of ['font-family', 'font-size', 'font-weight', 'line-height']) out.push([q, v]); continue; }
    if (p === 'font') { const t = splitTop(v.replace(/\s*\/\s*/, '/'), ' '); let i = 0;
      if (/^(\d{3}|bold|normal)$/.test(t[0])) out.push(['font-weight', t[i++]]);
      const sz = t[i++]; let d = 0, cut = -1; for (let k = 0; k < sz.length; k++) { if (sz[k] === '(') d++; if (sz[k] === ')') d--; if (sz[k] === '/' && !d) cut = k; }
      out.push(['font-size', cut < 0 ? sz : sz.slice(0, cut)]); if (cut >= 0) out.push(['line-height', sz.slice(cut + 1)]);
      out.push(['font-family', t.slice(i).join(' ')]); continue; }
    if (p === 'padding-block') { const [a, b] = two(v); out.push(['padding-top', a], ['padding-bottom', b]); continue; }
    if (p === 'padding-inline') { const [a, b] = two(v); out.push(['padding-left', a], ['padding-right', b]); continue; }
    if (p === 'margin-inline') { const [a, b] = two(v); out.push(['margin-left', a], ['margin-right', b]); continue; }
    if (p === 'margin-block') { const [a, b] = two(v); out.push(['margin-top', a], ['margin-bottom', b]); continue; }
    if (p === 'border-block') { out.push(['border-top', v], ['border-bottom', v]); continue; }
    if (p === 'place-items') { const [a, b] = two(v); out.push(['align-items', a], ['justify-items', b]); continue; }
    if (p === 'gap') { const [a, b] = two(v); out.push(['row-gap', a], ['column-gap', b]); continue; }
    if (p === 'background') { if (v === 'none' || v === 'transparent') { out.push(['background-color', 'transparent']); continue; }
      if (/^(linear|radial|conic)-gradient\(/.test(v) && splitTop(v, ' ').length === 1 && splitTop(v).length === 1) { out.push(['background-image', v]); continue; }
      if (splitTop(v, ' ').length === 1 && !/url\(|gradient\(/.test(v)) { out.push(['background-color', v]); continue; } }
    out.push([p, v]);
  }
  return out;
}
const extSel = new Set();
const native = new Map(); // "sel|bp" -> Map(prop -> value), insertion ordered
const nativeAdd = (sel, bp, decls) => { const k = sel + '|' + bp; if (!native.has(k)) native.set(k, new Map()); const m = native.get(k); for (const [p, v] of nativeDecls(decls)) { m.delete(p); m.set(p, v); } };
const declText = decls => decls.map(([p, v]) => p + ':' + v).join(';');
function convertCss(css) {
  const root = postcss.parse(css), ext = [];
  const doRule = (rule, mq) => {
    const decls = []; rule.walkDecls(d => { decls.push([d.prop, d.value + (d.important ? '!important' : '')]); });
    if (rule.selector.trim() === ':root') return ':root{' + declText(mq ? decls : decls.map(([p, v]) => [p, M.ALIAS[p] ? 'var(' + M.ALIAS[p] + ',' + v + ')' : v])) + '}';
    const sels = splitTop(tx(rule.selector)), nat = [], other = [], bp = mq ? bpOf(mq) : 0;
    /* a class with a rule at a width Webflow has no breakpoint for keeps its narrower rules beside it, in order */
    if (mq && !bp && /max-width/.test(mq)) sels.filter(isNative).forEach(x => extSel.add(x));
    for (const s of sels) (isNative(s) && (!mq || (bp && !extSel.has(s))) ? nat : other).push(s);
    let o = '';
    if (nat.length) { nat.forEach(s => nativeAdd(s, bp, decls)); o += nat.map(s => 'html :where(' + s + ')').join(',') + '{' + declText(decls) + '}'; }
    if (other.length) o += (o ? '\n' : '') + other.join(',') + '{' + declText(decls) + '}';
    return o;
  };
  root.each(n => {
    if (n.type === 'comment') return;
    if (n.type === 'rule') return void ext.push(doRule(n, ''));
    if (n.type === 'atrule' && n.name === 'media') { const mq = media(n.params), inner = [];
      n.each(r => { if (r.type === 'rule') inner.push(doRule(r, mq)); else if (r.type !== 'comment') inner.push(r.toString()); });
      return void ext.push('@media ' + mq + '{\n' + inner.join('\n') + '\n}'); }
    if (n.type === 'atrule' && /keyframes/.test(n.name)) { let t = n.toString(); return void ext.push(t.replace(/\s+/g, ' ')); }
    ext.push(n.toString().replace(/\s+/g, ' '));
  });
  return ext.join('\n');
}

/* ---------- script ---------- */
function convertJs(js, patches) {
  for (const [from, to, n = 1] of patches) {
    const parts = typeof from === 'string' ? js.split(from) : js.split(from);
    const hits = typeof from === 'string' ? parts.length - 1 : (js.match(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags + 'g')) || []).length;
    if (hits !== n) throw new Error('patch expected ' + n + ' match(es), found ' + hits + ': ' + String(from).slice(0, 70));
    js = typeof from === 'string' ? parts.join(to) : js.replace(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags + 'g'), () => to);
  }
  const changed = [];
  const looksSel = s => /(^|[\s,>+~(])\.[A-Za-z]/.test(s) && /^[\s\w.#>,:+~*()\[\]="'-]+$/.test(s) && !/[\/@]/.test(s);
  const cls = v => v.split(/\s+/).filter(Boolean).map(c => M.G[c] ?? c).join(' ');
  js = js.replace(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g, (m0, a, b, c) => {
    const q = m0[0], s = a ?? b ?? c;
    if (s.includes('<')) { const r = s.replace(/class="([^"$]*)"/g, (x, v) => 'class="' + cls(v) + '"'); if (r !== s) changed.push(s.slice(0, 40)); return q + r + q; }
    if (!looksSel(s)) return m0;
    const r = tx(s, { keep: true }).replace(/,/g, ', '); if (r !== s) changed.push(s + ' -> ' + r);
    return q + r + q;
  });
  return { js, changed };
}

/* ---------- markup ---------- */
function convertHtml(html, page) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const orig = new Map(), adds = new Map();
  $('[class]').each((i, el) => orig.set(el, ($(el).attr('class') || '').split(/\s+/).filter(Boolean)));
  for (const [sel, c] of M.ADD) $(sel).each((i, el) => { if (!adds.has(el)) adds.set(el, []); adds.get(el).push(c); });
  const all = new Set([...orig.keys(), ...adds.keys()]);
  for (const el of all) {
    const seen = []; for (let p = el; p && p.type === 'tag'; p = p.parent) seen.push(...(orig.get(p) || []));
    let list = (orig.get(el) || []).map(c => { const n = mapClass(c, seen); if (n === c && !(c in M.G) && !/^(on|open|in|gl|drag|ok|bad|over|lock|nx|js|app)$/.test(c) && !c.includes('_')) unknown.add(c); return n; });
    list = [...new Set([...list, ...(adds.get(el) || [])])];
    const rank = c => /^is-/.test(c) ? 2 : c.includes('_') ? 0 : 1;
    list = list.map((c, i) => [c, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
    $(el).attr('class', list.join(' '));
    for (const c of list) if (M.TAGS[c]) el.tagName = el.name = M.TAGS[c];
  }
  $('[style]').each((i, el) => { const m = ($(el).attr('style') || '').match(/^--i:(\d+)$/); if (m) { $(el).removeAttr('style').attr('data-i', m[1]); } });
  $('[data-cls]').each((i, el) => $(el).attr('data-cls', M.G[$(el).attr('data-cls')] ?? $(el).attr('data-cls')));
  $('a[href]').each((i, el) => { const h = $(el).attr('href'); if (/^(https?:|mailto:|tel:|#)/.test(h)) return; const [f, hash] = h.split('#');
    if (f === 'rosto.html') return void $(el).attr('href', '/rosto/' + (hash || ''));
    if (f in M.HREF) $(el).attr('href', M.HREF[f] + (hash ? '#' + hash : '')); });
  // logos: one sprite, referenced everywhere
  let sprite = '';
  const lh = $('svg[xmlns][fill="currentColor"]');
  if (lh.length) { const gs = lh.first().children('g'), mini = s => s.replace(/\s*\n\s*/g, '').replace(/>\s+</g, '><');
    sprite = '<svg class="svg-sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs><g id="alv-mark">' + mini($(gs[0]).html()) + '</g><g id="alv-word">' + mini($(gs[1]).html()) + '</g></defs></svg>'; }
  lh.each((i, el) => { $(el).removeAttr('xmlns').removeAttr('focusable').attr('aria-hidden', 'true').html('<use href="#alv-mark"></use><use href="#alv-word"></use>'); });
  $('svg').filter((i, el) => $(el).attr('viewBox') === '0 0 268 298' || $(el).attr('viewbox') === '0 0 268 298').each((i, el) => { $(el).html('<use href="#alv-mark"></use>'); });
  $('.loader_line,.loader_solid,.loader_word').each((i, el) => { $(el).empty(); });
  return { $, sprite };
}

module.exports = { setDocs, tx, convertCss, convertJs, convertHtml, native, nativeDecls, unknown, isNative, splitTop, SRC, OUT, SITE, M };
