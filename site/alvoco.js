/* =========================================================
   Alvôco a Recordar, v8
   Every page is a real HTML file. A link fetches the next page
   while a panel covers the screen, swaps <main> underneath it,
   prepares that page and only then lifts the panel. Nothing is
   revealed before the panel starts to leave (see `gate`).
   Sections that hold the screen use CSS sticky, never a GSAP
   pin, so scroll positions never depend on measured spacers.
   ========================================================= */
(() => {
const first = n => n.split(' ')[0];
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const store = k => ({ get(n){ try { return window[k].getItem(n) } catch(e){ return null } }, set(n,v){ try { window[k].setItem(n,v) } catch(e){} }, del(n){ try { window[k].removeItem(n) } catch(e){} } });
const ss = store('sessionStorage'), ls = store('localStorage');
const wait = ms => new Promise(r => setTimeout(r, ms));
const html = document.documentElement;
const BASE = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
if (!window.gsap) { html.classList.remove('js', 'ld-on'); return; }

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, DrawSVGPlugin, MotionPathPlugin, Flip);
CustomEase.create('osmo', '0.625, 0.05, 0, 1');
CustomEase.create('out', '0.16, 1, 0.3, 1');
CustomEase.create('io', '0.76, 0, 0.24, 1');
gsap.defaults({ ease: 'osmo', duration: .9 });
ScrollTrigger.config({ ignoreMobileResize: true });
let lenis = null;
if (window.Lenis && !RM) {
  lenis = new Lenis({ lerp: .1, wheelMultiplier: .95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const stop = () => lenis && lenis.stop();
const start = () => lenis && lenis.start();
const dots = (scope = document) => $$('.button', scope).forEach(b => { if (!b.querySelector('.button_dot')) b.insertAdjacentHTML('beforeend', '<span class="button_dot" aria-hidden="true"></span>');
  if (b.querySelector('.btn-tx')) return; const tn = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!tn) return;
  const w = document.createElement('span'), s = document.createElement('span'); w.className = 'btn-tx'; s.textContent = tn.textContent.trim(); w.appendChild(s); tn.replaceWith(w); });
const smooth = pts => { let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; }
  return d; };

/* everything a page sets up registers its teardown here */
let cleanups = [];
const on = (t, e, f, o) => { t.addEventListener(e, f, o); cleanups.push(() => t.removeEventListener(e, f, o)); };
const every = (f, ms) => { const id = setInterval(f, ms); cleanups.push(() => clearInterval(id)); };
const unmount = () => { cleanups.forEach(f => { try { f(); } catch(e){} }); cleanups = []; ScrollTrigger.getAll().forEach(t => t.kill(true)); };

/* the gate: reveals wait here until the cover starts to leave */
let gate = Promise.resolve(), openGate = () => {};
const newGate = () => { gate = new Promise(r => { openGate = r; }); };
/* what is already on screen when the page arrives is revealed with the cover; the rest waits for the scroll */
const when = (el, fn, at = 'top 90%') => { const r = el.getBoundingClientRect();
  if (scrollY < 4 && r.top < innerHeight - 2 && r.bottom > 0) { gate.then(fn); return; }
  ScrollTrigger.create({ trigger: el, start: at, once: true, onEnter: () => gate.then(fn) }); };

/* ---------- nav ---------- */
const nav = $('.nav_component');
function navInit(base){
  const zones = $$('main [data-tema], .footer_component');
  const upd = () => { const m = nav.getBoundingClientRect().top + 30; let t = base;
    for (const z of zones) { const r = z.getBoundingClientRect(); if (r.top <= m && r.bottom >= m) t = z.dataset.tema; }
    if (nav.dataset.tema !== t) nav.dataset.tema = t; };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: upd, onRefresh: upd }); upd();
}
const fileOf = u => u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
function setCurrent(file){
  const cur = '/' + ({ rosto: 'rostos' }[file] ?? file);
  $$('.nav_link').forEach(a => a.getAttribute('href') === cur ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
}

/* ---------- menu ---------- */
function menuInit(){
  const m = $('.menu_component'); if (!m) return;
  const its = $$('li :where(.line-mask)>*', m);
  let open = false;
  const show = () => { open = true; document.body.classList.add('lock'); stop();
    gsap.timeline().set(m, { visibility: 'visible' }).fromTo(m, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .8, ease: 'io' })
      .fromTo(its, { yPercent: 112 }, { yPercent: 0, stagger: .05, duration: .9, ease: 'out' }, .25);
    setTimeout(() => $('.button-close', m).focus(), 60); };
  const hide = fast => { if (!open) return; open = false; document.body.classList.remove('lock'); if (!fast) start();
    gsap.timeline().to(m, { clipPath: 'inset(0% 0% 100% 0%)', duration: fast ? .01 : .7, ease: 'io' }).set(m, { visibility: 'hidden' }); };
  $('.nav_burger').addEventListener('click', show);
  $('.button-close', m).addEventListener('click', () => hide());
  m.addEventListener('click', e => { if (e.target.closest('a,[data-socio]')) hide(true); });
  addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
}

/* ---------- page transitions ---------- */
const pt = $('.transition_component'), pa = $('.transition_wipe'), pb = $('.transition_cover'), pc = $('.transition_content'), pn = $('.transition_name');
function cover(name){ return new Promise(res => {
  pn.textContent = name; pt.classList.add('on'); stop();
  if (RM) { gsap.set([pa, pb], { yPercent: 0 }); gsap.set(pc, { autoAlpha: 1, y: 0 }); return res(); }
  gsap.timeline({ onComplete: res })
    .fromTo(pa, { yPercent: 101 }, { yPercent: 0, duration: .62, ease: 'io' }, 0)
    .fromTo(pb, { yPercent: 101 }, { yPercent: 0, duration: .62, ease: 'io' }, .1)
    .fromTo(pc, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .5, ease: 'out' }, .34);
}); }
function uncover(){ return new Promise(res => {
  const end = () => { pt.classList.remove('on'); gsap.set([pa, pb], { yPercent: 101 }); start(); res(); };
  if (RM) { openGate(); return end(); }
  gsap.set(pa, { yPercent: -101 });
  gsap.timeline({ onComplete: end })
    .to(pc, { autoAlpha: 0, y: -30, duration: .32, ease: 'power2.in' }, 0)
    .to(pb, { yPercent: -101, duration: .78, ease: 'io' }, .14)
    .add(openGate, .42);
}); }
const NAMES = { '': 'Início', sobre: 'Sobre nós', rostos: 'Rostos', rosto: 'Rostos', caminhada: 'Caminhada', agenda: 'Agenda', contactos: 'Contactos', 'em-memoria': 'Em memória', documentos: 'Documentos', privacidade: 'Privacidade', cookies: 'Cookies' };
const cache = new Map();
const fetchPage = href => { const k = href.split('#')[0];
  if (!cache.has(k)) cache.set(k, fetch(k, { credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(t => { const d = new DOMParser().parseFromString(t, 'text/html'); if (!d.querySelector('main')) throw new Error('no main'); return d; })
    .catch(e => { cache.delete(k); throw e; }));
  return cache.get(k); };
let busy = false;
async function go(href, push = true, label){
  if (busy) return; busy = true;
  const url = new URL(href, location.href);
  const doc = fetchPage(url.href).catch(() => null);
  await cover(label || NAMES[fileOf(url)] || '');
  const d = await doc;
  if (!d) { location.href = url.href; return; }
  if (push) history.pushState({}, '', url.href);
  unmount();
  $('main').replaceWith(document.importNode(d.querySelector('main'), true));
  document.title = d.title || document.title;
  const wfp = d.documentElement.getAttribute('data-wf-page'); if (wfp) html.setAttribute('data-wf-page', wfp);
  scrollTo(0, 0); lenis && lenis.scrollTo(0, { immediate: true, force: true });
  newGate();
  const ready = mount(false);
  await Promise.race([ready || Promise.resolve(), wait(900)]);
  await uncover();
  busy = false;
  if (location.hash === '#socio') openDrawer();
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
  const url = new URL(a.getAttribute('href'), location.href);
  if (url.origin !== location.origin) return;
  const file = fileOf(url);
  if (!(file in NAMES)) return;
  const same = url.pathname === location.pathname;
  if (same) {
    e.preventDefault();
    const t = url.hash && document.getElementById(url.hash.slice(1));
    if (t) lenis ? lenis.scrollTo(t, { offset: -96, duration: 1.3 }) : t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
    else if (!url.hash) lenis ? lenis.scrollTo(0, { duration: 1.3 }) : scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
    else { history.replaceState({}, '', url.href); dispatchEvent(new HashChangeEvent('hashchange')); }
    return;
  }
  e.preventDefault(); go(url.href, true, a.dataset.pt);
});
document.addEventListener('pointerover', e => { const a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target === '_blank') return;
  const u = new URL(a.getAttribute('href'), location.href); if (u.origin === location.origin && fileOf(u) in NAMES && u.pathname !== location.pathname) fetchPage(u.href).catch(() => {}); });
addEventListener('popstate', () => go(location.href, false));
addEventListener('pageshow', e => { if (e.persisted) { pt.classList.remove('on'); gsap.set([pa, pb], { yPercent: 101 }); start(); busy = false; } });

/* ---------- reveals ---------- */
function reveal(scope){
  $$('[data-r]', scope).forEach(el => {
    const k = el.dataset.r;
    if (RM) { el.style.visibility = 'visible'; return; }
    if (k === 'lines') {
      el.style.visibility = 'visible';
      const sp = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'sl', autoSplit: true, onSplit(self) {
        const tw = gsap.from(self.lines, { yPercent: 114, duration: 1.25, stagger: .085, ease: 'out', paused: !el._in }); el._tw = tw; return tw; } });
      cleanups.push(() => sp.revert());
      when(el, () => { el._in = 1; el._tw && el._tw.play(); });
    } else if (k === 'words') {
      const sp = SplitText.create(el, { type: 'words', wordsClass: 'wd' }); cleanups.push(() => sp.revert());
      el.style.visibility = 'visible';
      gsap.to(sp.words, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 86%', end: 'bottom 72%', scrub: .4 } });
    } else if (k === 'img') {
      const im = $('img', el);
      gsap.set(el, { visibility: 'visible', clipPath: 'inset(100% 0% 0% 0%)' });
      when(el, () => { gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'io', clearProps: 'clipPath' }); im && gsap.from(im, { scale: 1.22, duration: 2.1, ease: 'out' }); }, 'top 96%');
    } else if (k === 'list') {
      const its = [...el.children]; gsap.set(el, { visibility: 'visible' }); gsap.set(its, { opacity: 0, y: 26 });
      when(el, () => gsap.to(its, { opacity: 1, y: 0, duration: .95, stagger: .07, ease: 'out', clearProps: 'transform' }));
    } else {
      gsap.set(el, { autoAlpha: 0, y: 22 });
      when(el, () => gsap.to(el, { autoAlpha: 1, y: 0, duration: 1.05, ease: 'out', clearProps: 'transform' }));
    }
  });
  if (!RM) $$('[data-px]', scope).forEach(el => gsap.fromTo(el, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
}

/* ---------- footer: a ridge, and a lantern that climbs it as the page ends ---------- */
const RIDGE = [[0,.74],[.07,.62],[.15,.78],[.24,.86],[.33,.7],[.42,.52],[.5,.44],[.58,.27],[.66,.1],[.715,.05],[.78,.2],[.86,.4],[.93,.36],[1,.5]];
function footer(){
  const box = $('.footer_ridge'); if (!box) return;
  const svg = $('svg', box), r0 = $('.footer_ridge-base', box), r1 = $('.footer_ridge-light', box), lamp = $('.footer_lamp', box);
  let f = .72;
  const build = () => { const w = box.clientWidth, h = box.clientHeight; if (!w) return; svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const d = smooth(RIDGE.map(([x, y]) => [x * w, y * h])); r0.setAttribute('d', d); r1.setAttribute('d', d);
    const L = r1.getTotalLength(); for (let i = 0; i <= 240; i++) if (r1.getPointAtLength(L * i / 240).x >= .715 * w) { f = i / 240; break; } };
  build();
  if (RM) { lamp.style.display = 'none'; r1.style.display = 'none'; return; }
  gsap.set(lamp, { clearProps: 'all' });
  const tl = gsap.timeline({ defaults: { ease: 'none', duration: 1 } })
    .fromTo(r1, { drawSVG: '0% 0%' }, { drawSVG: () => `0% ${f * 100}%` }, 0)
    .to(lamp, { motionPath: { path: r1, align: r1, alignOrigin: [.5, .5], start: 0, end: f } }, 0);
  ScrollTrigger.create({ trigger: '.footer_component', start: 'top 85%', end: 'bottom bottom', scrub: .6, animation: tl, invalidateOnRefresh: true, onRefreshInit: build });
}
(() => { const ck = $('.footer_clock'); if (!ck) return; const f = () => { try { ck.textContent = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' }).format(new Date()); } catch(e){} }; f(); setInterval(f, 15000); })();

/* ---------- small helpers ---------- */
const fol = (() => { if (!FINE) return null; const b = document.createElement('div'); b.className = 'fol'; b.setAttribute('aria-hidden', 'true'); document.body.appendChild(b); return b; })();
function follower(list, active = () => true){
  if (!list || !fol) return;
  const xT = gsap.quickTo(fol, 'x', { duration: .6, ease: 'power3' }), yT = gsap.quickTo(fol, 'y', { duration: .6, ease: 'power3' });
  let cur = null, shown = false;
  const hide = () => { if (!shown) return; shown = false; cur = null; gsap.to(fol, { scale: 0, autoAlpha: 0, duration: .4, overwrite: true }); };
  const show = (e, it) => { if (!active()) return hide(); const src = it.dataset.img;
    let im = [...fol.children].find(i => i.dataset.src === src); if (!im) { im = new Image(); im.src = src; im.alt = ''; im.dataset.src = src; }
    if (!shown) { shown = true; gsap.set(fol, { x: e.clientX + 32, y: e.clientY - fol.offsetHeight / 2 }); gsap.to(fol, { scale: 1, autoAlpha: 1, duration: .5, ease: 'out', overwrite: true }); }
    if (cur === im) return; cur = im; fol.appendChild(im); gsap.fromTo(im, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .7, ease: 'out' }); };
  on(list, 'pointermove', e => { if (!shown) return; xT(Math.min(e.clientX + 32, innerWidth - fol.offsetWidth - 16)); yT(e.clientY - fol.offsetHeight / 2); });
  on(list, 'pointerleave', hide);
  on(window, 'scroll', () => { if (shown && !list.matches(':hover')) hide(); }, { passive: true });
  $$('[data-img]', list).forEach(it => on(it, 'pointerenter', e => show(e, it)));
  cleanups.push(() => { gsap.killTweensOf(fol); gsap.set(fol, { scale: 0, autoAlpha: 0 }); });
}
function stars(cv, count, full){
  if (!cv) return;
  const ctx = cv.getContext('2d'); let w, h, pts = [], vis = false, raf;
  const size = () => { const d = Math.min(devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight; if (!w) return; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.round(count * Math.max(.5, Math.min(1.4, w * h / 1e6)));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h * (full ? 1 : .7), r: Math.random() * 1.1 + .25, p: Math.random() * 6.3, s: .35 + Math.random() * 1.3 })); };
  const draw = t => { ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#f4f1e4'; for (const s of pts) { ctx.globalAlpha = .25 + .75 * (.5 + .5 * Math.sin(t / 1000 * s.s + s.p)); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); } if (vis && !RM) raf = requestAnimationFrame(draw); };
  size(); let lw = w; on(window, 'resize', () => { if (cv.clientWidth !== lw) { lw = cv.clientWidth; size(); draw(0); } });
  const io = new IntersectionObserver(([en]) => { vis = en.isIntersecting; cancelAnimationFrame(raf); if (vis) raf = requestAnimationFrame(draw); }); io.observe(cv);
  cleanups.push(() => { io.disconnect(); cancelAnimationFrame(raf); vis = false; });
  draw(0);
}

/* ---------- member card ---------- */
function cardInit(wrap, persistent){
  if (!wrap || wrap.dataset.d) return; wrap.dataset.d = 1;
  const c = $('.member-card_card', wrap), f = $('.member-card_front', wrap); let fl = false, idle = null;
  const rx = gsap.quickTo(c, 'rotationX', { duration: .8, ease: 'power3' }), ry = gsap.quickTo(c, 'rotationY', { duration: .8, ease: 'power3' });
  if (FINE && !RM) {
    wrap.addEventListener('pointermove', e => { const r = wrap.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      rx(-y * 14); ry(x * 20 + (fl ? 180 : 0)); f.style.setProperty('--sh', (x * 120) + '%'); });
    wrap.addEventListener('pointerleave', () => { rx(0); ry(fl ? 180 : 0); });
  } else if (!RM) {
    const o = { v: 0 }; idle = gsap.to(o, { v: 1, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: () => { if (fl) return; gsap.set(c, { rotationY: -7 + o.v * 14, rotationX: 3 - o.v * 6 }); f.style.setProperty('--sh', (-70 + o.v * 140) + '%'); } });
    if (!persistent) cleanups.push(() => idle.kill());
  }
  const flip = () => { fl = !fl; gsap.to(c, { rotationY: fl ? 180 : 0, rotationX: 0, duration: 1.1 }); };
  c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0'); c.setAttribute('aria-label', 'Virar o cartão');
  c.addEventListener('click', flip); c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
}

/* ---------- forms ---------- */
const RULES = {
  req: v => v.trim() ? '' : 'Falta preencher este campo.',
  email: v => !v.trim() ? 'Falta o email.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Este email não parece completo.',
  tel: v => !v.trim() ? 'Falta o telemóvel.' : v.replace(/\D/g, '').length >= 9 ? '' : 'O número precisa de pelo menos 9 dígitos.',
  cp: (v, f) => { if (!v.trim()) return 'Falta o código postal.'; const p = (f.querySelector('[name=pais]') || {}).value; return p && p !== 'Portugal' ? '' : /^\d{4}-\d{3}$/.test(v.trim()) ? '' : 'Usa o formato 0000-000.'; },
  nif: v => !v.trim() || /^\d{9}$/.test(v.replace(/\s/g, '')) ? '' : 'O NIF tem 9 dígitos.'
};
function dobCheck(fs){
  const g = n => fs.querySelector(`[name=${n}]`).value.trim(), d = +g('dia'), mo = +g('mes'), y = +g('ano'); let msg = '';
  if (!g('dia') && !g('mes') && !g('ano')) msg = 'Falta a data de nascimento.';
  else { const dt = new Date(y, mo - 1, d); if (!(g('ano').length === 4 && y > 1900 && dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d && dt < new Date())) msg = 'Confirma a data: dia, mês e ano.'; }
  $('.form_field-error', fs).textContent = msg; fs.classList.toggle('bad', !!msg); fs.classList.toggle('ok', !msg); return !msg;
}
function validate(fl, form){
  if (fl.matches('[data-dob]')) return dobCheck(fl);
  const i = $('input,textarea,select', fl), e = $('.form_field-error', fl); if (!i || !e || !i.dataset.v) return true;
  const msg = (RULES[i.dataset.v] || RULES.req)(i.value, form);
  e.textContent = msg; fl.classList.toggle('bad', !!msg); fl.classList.toggle('ok', !msg && !!i.value.trim()); i.setAttribute('aria-invalid', !!msg); return !msg;
}
/* postal code → locality, from the public CTT table shipped with the site */
let CP = null, cpP = null;
const cpLoad = () => cpP || (cpP = fetch(BASE + 'cp.json').then(r => r.json()).then(d => (CP = d)).catch(() => null));
const cpFind = v => { const m = /^(\d{4})-(\d{3})$/.exec(v); if (!m || !CP) return ''; const e = CP.c[m[1]]; if (e == null) return ''; if (typeof e === 'number') return CP.n[e];
  let r = ''; for (let i = 0; i < e.length; i += 2) if (e[i] <= +m[2]) r = CP.n[e[i + 1]]; return r || CP.n[e[1]]; };
function liveForm(form){
  $$('.form_field', form).forEach(fl => {
    if (fl.matches('[data-dob]')) { const ins = $$('input', fl);
      ins.forEach((i, k) => { i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, ''); if (i.value.length >= i.maxLength && ins[k + 1]) ins[k + 1].focus(); if (fl.classList.contains('bad') || (k === 2 && i.value.length === 4)) dobCheck(fl); });
        i.addEventListener('keydown', e => { if (e.key === 'Backspace' && !i.value && ins[k - 1]) ins[k - 1].focus(); }); });
      ins[2].addEventListener('blur', () => { if (ins.some(i => i.value)) dobCheck(fl); });
      return; }
    const i = $('input,textarea,select', fl); if (!i || !i.dataset.v) return;
    i.addEventListener('blur', () => validate(fl, form));
    i.addEventListener('input', () => { if (fl.classList.contains('bad') || fl.classList.contains('ok')) validate(fl, form); });
    if (i.dataset.v === 'cp') { const loc = form.querySelector('[name=localidade]'), hn = loc && $('.form_field-hint', loc.closest('.form_field'));
      i.addEventListener('focus', cpLoad, { once: true });
      i.addEventListener('input', () => { const p = (form.querySelector('[name=pais]') || {}).value; if (p && p !== 'Portugal') return;
        const d = i.value.replace(/\D/g, '').slice(0, 7); i.value = d.length > 4 ? d.slice(0, 4) + '-' + d.slice(4) : d;
        if (d.length === 7 && loc) cpLoad().then(() => { const l = cpFind(i.value); if (!l) return; loc.value = l; validate(loc.closest('.form_field'), form); validate(fl, form);
          if (hn) hn.textContent = 'Preenchemos a localidade pelo código postal. Se não for esta, corrige.'; loc.dispatchEvent(new Event('input', { bubbles: true })); }); }); }
  });
}
function dropzone(scope){
  const dz = $('.form_dropzone', scope); if (!dz) return;
  const inp = $('input', dz), th = $('.form_thumbs', scope);
  const show = fs => [...fs].filter(f => f.type.startsWith('image/')).slice(0, 12).forEach((f, i) => { const fg = document.createElement('figure'); fg.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`; th.appendChild(fg);
    gsap.fromTo(fg, { y: -30, rotation: gsap.utils.random(-18, 18), opacity: 0 }, { y: 0, rotation: gsap.utils.random(-4, 4), opacity: 1, duration: .8, ease: 'out', delay: i * .05 }); });
  ['dragenter', 'dragover'].forEach(v => dz.addEventListener(v, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(v => dz.addEventListener(v, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => show(e.dataTransfer.files)); inp.addEventListener('change', () => show(inp.files));
}

/* ---------- sócio drawer (outside <main>, survives navigation) ---------- */
const KEY = 'alv-socio';
const draft = add => { let d = {}; try { d = JSON.parse(ss.get(KEY) || '{}'); } catch(e){} if (add) { Object.assign(d, add); ss.set(KEY, JSON.stringify(d)); } return d; };
let openDrawer = () => {};
function drawer(){
  const dw = $('.drawer_component'); if (!dw) return;
  const p = $('.drawer_panel', dw), bg = $('.drawer_backdrop', dw), f = $('#socio', dw), body = $('.drawer_body', dw);
  const steps = $$('.drawer_step', f), side = $$('.drawer_steps li', dw), bar = $('.drawer_progress i', dw), lab = $('.drawer_header .drawer_step-count', dw), back = $('.drawer_back', dw), next = $('.drawer_next', dw), done = $('.drawer_done', dw), foot = $('.drawer_footer', dw);
  let cur = 0, last = null, isOpen = false;
  liveForm(f); $$('.member-card_wrap', dw).forEach(c => cardInit(c, true));
  const names = $$('.member-card_name', dw);
  const full = () => [f.nome.value.trim(), f.apelido.value.trim()].filter(Boolean).join(' ');
  const load = () => { const d = draft(); Object.entries(d).forEach(([k, v]) => $$(`[name="${k}"]`, f).forEach(el => { if (el.type === 'checkbox' || el.type === 'radio') el.checked = [].concat(v).includes(el.value); else el.value = v; })); };
  const save = () => { const d = {}; new FormData(f).forEach((v, k) => { d[k] = v; }); ss.set(KEY, JSON.stringify(d)); return d; };
  const setCard = () => { const n = full() || 'O teu nome'; names.forEach(el => { el.textContent = n; }); };
  f.addEventListener('input', () => { save(); setCard(); }); f.addEventListener('change', save);
  const esc = s => String(s).replace(/</g, '&lt;');
  const review = () => { const d = save(), rows = [
      ['Nome', full(), 0], ['Nascimento', d.dia && d.mes && d.ano ? `${d.dia.padStart(2, '0')}/${d.mes.padStart(2, '0')}/${d.ano}` : '', 0], ['Natural de', d.natural, 0],
      ['Email', d.email, 1], ['Telemóvel', d.telemovel, 1], ['Morada', [d.morada, [d.cp, d.localidade].filter(Boolean).join(' '), d.pais !== 'Portugal' ? d.pais : ''].filter(Boolean).join(', '), 1]];
    $('.drawer_review', f).innerHTML = rows.filter(r => r[1] && String(r[1]).trim()).map(([a, b, s]) => `<div><dt>${a}</dt><dd>${esc(b)}</dd><button type="button" data-go="${s}">Editar</button></div>`).join(''); };
  const ui = () => { bar.style.transform = `scaleX(${(cur + 1) / steps.length})`;
    lab.textContent = `Passo ${cur + 1} de ${steps.length}`; back.hidden = cur === 0;
    side.forEach((li, i) => { li.classList.toggle('on', i === cur); li.classList.toggle('ok', i < cur); });
    (next.querySelector('.btn-tx span') || next.firstChild).textContent = cur === steps.length - 1 ? 'Enviar pedido' : 'Continuar'; if (cur === steps.length - 1) review(); };
  const check = st => { let ok = true;
    $$('.form_field', st).forEach(fl => { if (!validate(fl, f)) ok = false; });
    $$('[data-must]', st).forEach(c => { const e = $('.form_group-error', c.closest('.form_required')); e.textContent = c.checked ? '' : 'É preciso aceitar para continuar.'; if (!c.checked) ok = false; });
    if (!ok) { const b = $('.bad input', st) || $$('[data-must]', st).find(c => !c.checked); if (b) { b.focus({ preventScroll: true }); (b.closest('.form_field, .form_required') || b).scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' }); } }
    return ok; };
  const step = i => { if (i === cur) return; const a = steps[cur], b = steps[i], dir = i > cur ? 1 : -1;
    const sw = () => { a.classList.remove('on'); b.classList.add('on'); cur = i; ui(); body.scrollTop = 0; if (!RM) gsap.fromTo(b, { opacity: 0, x: 36 * dir }, { opacity: 1, x: 0, duration: .6, ease: 'out', clearProps: 'transform' }); $('h2', b).focus({ preventScroll: true }); };
    RM ? sw() : gsap.to(a, { opacity: 0, x: -36 * dir, duration: .28, ease: 'power2.in', onComplete: sw }); };
  f.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) step(+b.dataset.go); });
  // n is the member number the endpoint assigned. Without an endpoint (prototype) the number follows by email.
  const finish = (d, n) => { f.hidden = true; foot.hidden = true; done.hidden = false; $('.drawer_progress', dw).hidden = true; lab.textContent = 'Pedido enviado'; side.forEach(li => { li.classList.remove('on'); li.classList.add('ok'); });
    $('.drawer_done-name', done).textContent = d.nome.trim(); $('.drawer_done-mail', done).textContent = d.email || ''; body.scrollTop = 0;
    if (n) { const c = $('.drawer_done-card .member-card_number-value', done); if (c) { c.textContent = String(n).padStart(4, '0'); $$('.drawer_done-card .is-pending', done).forEach(x => x.classList.remove('is-pending')); c.classList.remove('is-pending'); } $('.drawer_done-text', done).textContent = 'És o sócio n.º ' + n + '. O número é teu e não muda.'; }
    ss.del(KEY); if (!RM) gsap.from($$('.drawer_done>*', dw), { y: 24, opacity: 0, stagger: .08, duration: .9, ease: 'out' }); $('h2', done).focus({ preventScroll: true }); };
  next.addEventListener('click', () => { if (!check(steps[cur])) return; if (cur < steps.length - 1) return step(cur + 1);
    const d = save(), url = window.ALV_ENDPOINT; if (!url) return finish(d);
    const keep = next.innerHTML; next.disabled = true; next.textContent = 'A registar';
    // text/plain keeps this a simple request: the Apps Script web app cannot answer a CORS preflight
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ tipo: 'socio' }, Object.fromEntries(new FormData(f)))) })
      .then(r => r.json()).then(r => { if (!r.ok) throw new Error(r.erro || ''); finish(d, r.numero); })
      .catch(er => { lab.textContent = er.message || 'Não foi possível registar. Tenta de novo.'; })
      .finally(() => { next.disabled = false; next.innerHTML = keep; }); });
  back.addEventListener('click', () => cur > 0 && step(cur - 1));
  f.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !/checkbox|radio/.test(e.target.type)) { e.preventDefault(); next.click(); } });
  f.addEventListener('submit', e => e.preventDefault());
  openDrawer = () => { if (isOpen) return; isOpen = true; last = document.activeElement; load(); setCard(); ui();
    dw.classList.add('open'); dw.setAttribute('aria-hidden', 'false'); document.body.classList.add('lock'); stop();
    if (!RM) { gsap.to(bg, { opacity: 1, duration: .6, ease: 'out' }); gsap.fromTo(p, { x: 0, xPercent: 102 }, { xPercent: 0, duration: .85, ease: 'io' });
      gsap.from($$('.drawer_step.on > *, .drawer_side > *', dw), { x: 40, opacity: 0, stagger: .045, duration: .8, ease: 'out', delay: .35, clearProps: 'transform,opacity' }); }
    else bg.style.opacity = 1;
    if (FINE) setTimeout(() => (f.hidden ? $('.button-close', dw) : $('input', steps[cur]) || $('.button-close', dw)).focus({ preventScroll: true }), 500); };
  const close = () => { if (!isOpen) return; isOpen = false;
    const end = () => { dw.classList.remove('open'); dw.setAttribute('aria-hidden', 'true'); document.body.classList.remove('lock'); start(); gsap.set(p, { clearProps: 'transform' }); last && last.focus && last.focus({ preventScroll: true }); };
    if (!RM) { gsap.to(bg, { opacity: 0, duration: .5 }); gsap.to(p, { xPercent: 102, duration: .65, ease: 'io', onComplete: end }); } else { bg.style.opacity = 0; end(); } };
  document.addEventListener('click', e => { const t = e.target.closest('[data-socio]'); if (t) { e.preventDefault(); openDrawer(); } });
  $('.button-close', dw).addEventListener('click', close); bg.addEventListener('click', close);
  dw.addEventListener('keydown', e => { if (e.key === 'Escape') close();
    if (e.key === 'Tab') { const fs = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', p).filter(x => x.offsetParent !== null);
      const a = fs[0], z = fs[fs.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } });
}
function join(m){
  $$('.section_join', m).forEach(j => { const f = $('.join_form', j), inp = $('input', f), nm = $('.member-card_name', j); cardInit($('.member-card_wrap', j));
    const d = draft(); if (d.nome) { inp.value = [d.nome, d.apelido].filter(Boolean).join(' '); nm.textContent = inp.value; }
    on(inp, 'input', () => { nm.textContent = inp.value.trim() || 'O teu nome'; });
    on(f, 'submit', e => { e.preventDefault(); const v = inp.value.trim().split(/\s+/).filter(Boolean); if (v.length) draft({ nome: v[0], apelido: v.slice(1).join(' ') }); openDrawer(); }); });
}
function nextTag(m){
  const its = $$('.home-year_item', m); if (!its.length) return; const mo = new Date().getMonth();
  const nx = its.find(i => +i.dataset.mes - 1 > mo) || its[0]; $('.home-year_title-wrap', nx).insertAdjacentHTML('beforeend', '<span class="tag is-now">A seguir</span>');
}

/* ================= HOME ================= */
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
let threeP = null;
const three = () => threeP || (threeP = (window.THREE ? Promise.resolve() : loadScript('https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js')).then(() => window.AlvHero ? null : loadScript(BASE + 'hero3d.js')).catch(() => { threeP = null; }));

function hero(m){
  const h = $('.section_home-hero', m), cv = $('.home-hero_canvas', h); let api = null, dead = false;
  const ready = three().then(() => { if (dead || !window.AlvHero) return; api = AlvHero(cv, { root: h, reduced: RM, tags: { top: $('[data-tag=top]', h), base: $('[data-tag=base]', h) } }); if (api) h.classList.add('gl'); });
  cleanups.push(() => { dead = true; api && api.destroy(); });
  if (!RM) ScrollTrigger.create({ trigger: h, start: 'top top', end: 'bottom top', onUpdate: s => api && api.scroll(s.progress) });
  gate.then(() => ready.then(() => { h.classList.add('in'); api && api.intro(); }));
  return ready;
}
function loader(ready){
  { const mk = $('#alv-mark'), wd = $('#alv-word'); if (mk && wd) { $('.loader_line').innerHTML = $('.loader_solid').innerHTML = mk.innerHTML; $('.loader_word').innerHTML = wd.innerHTML; } }
  const ld = $('.loader_component'), svg = $('.loader_svg', ld), lines = $$('.loader_line path', ld), rect = $('.loader_rect', ld), word = $$('.loader_word path', ld), cols = $$('.loader_digit-strip', ld), bg = $('.loader_background', ld), bot = $('.loader_bottom', ld), navIn = $('.nav_bar'), nlogo = $('.nav_component .site-logo');
  ss.set('alv-seen', 1); stop();
  const c = { v: 0 };
  const od = () => { const v = c.v, u = v % 10, t = Math.floor(v / 10) % 10 + Math.max(0, u - 9), h = Math.floor(v / 100) + Math.max(0, (v % 100) - 99);
    [h, t, u].forEach((x, i) => { cols[i].style.transform = `translateY(${-x}em)`; }); };
  gsap.set(nav, { opacity: 1 }); gsap.set(navIn, { autoAlpha: 0, y: -18 }); gsap.set(nlogo, { autoAlpha: 0 });
  gsap.set(lines, { drawSVG: '0%' }); gsap.set(word, { y: 16 });
  const tl = gsap.timeline();
  tl.to(lines, { drawSVG: '100%', duration: 2, ease: 'power2.inOut', stagger: .05 }, .2)
    .to(c, { v: 62, duration: 1.8, ease: 'power2.inOut', onUpdate: od }, .2)
    .to(rect, { attr: { y: -3 }, duration: 1.5, ease: 'io' }, 1.35)
    .to(c, { v: 100, duration: 1.3, ease: 'power3.inOut', onUpdate: od }, 2.05)
    .to(lines, { opacity: 0, duration: .5 }, 2.7)
    .to(word, { opacity: 1, y: 0, duration: .7, stagger: .028, ease: 'out' }, 2.55)
    .addPause(3.75, () => { Promise.race([ready, wait(2500)]).then(() => tl.play()); })
    .to(bot, { opacity: 0, y: 24, duration: .45, ease: 'power2.in' }, 3.75)
    .add(() => { const a = svg.getBoundingClientRect(), b = nlogo.getBoundingClientRect(), ua = a.width / 642.46, ub = b.width / 636.46;
      gsap.to(svg, { x: b.left - a.left - 3 * ub, y: b.top - a.top - 3 * ub, scale: ub / ua, transformOrigin: '0 0', duration: 1.15, ease: 'io' }); }, 3.85)
    .to(bg, { yPercent: -100, duration: 1.05, ease: 'io' }, 4)
    .add(openGate, 4.3)
    .to(navIn, { autoAlpha: 1, y: 0, duration: .8, ease: 'out' }, 4.5)
    .add(() => { gsap.set(nlogo, { autoAlpha: 1 }); html.classList.remove('ld-on'); gsap.set(nav, { clearProps: 'opacity' }); start(); }, 5.05);
}
function trail(m){
  const sec = $('.section_home-trail', m); if (!sec) return;
  const stg = $('.home-trail_sticky', sec), track = $('.home-trail_track', sec), svg = $('.home-trail_svg', sec), base = $('.home-trail_path-base', sec), prog = $('.home-trail_path-light', sec), lamp = $('.home-trail_lamp', sec), beats = $$('.home-trail_item', sec), end = $('.home-trail_end', sec), v = $('.home-trail_line', sec), lw = $('.home-trail_list-wrap', sec);
  if (RM) { beats.forEach(b => b.classList.add('on')); v.style.setProperty('--p', 1); return; }
  const mm = gsap.matchMedia(); cleanups.push(() => mm.revert());
  mm.add('(min-width: 900px)', () => {
    let dist = 0, xs = [];
    const build = () => {
      const W = track.offsetWidth, H = stg.offsetHeight, vw = stg.offsetWidth;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
      const pts = [[0, H * .9], [vw * .46, H * .84]];
      xs = beats.map((b, i) => { const x = b.offsetLeft, y = H * ((i % 2 ? .62 : .46) - i * .012); b.style.setProperty('--y', y + 'px'); pts.push([x, y]); return x; });
      const ex = end.offsetLeft + 70, ey = H * .31; end.style.setProperty('--ye', (ey + 36) + 'px'); pts.push([ex, ey], [W, H * .2]);
      const d = smooth(pts); base.setAttribute('d', d); prog.setAttribute('d', d);
      dist = Math.max(0, W - vw); sec.style.height = (H + dist) + 'px';
    };
    build();
    const tl = gsap.timeline({ defaults: { ease: 'none', duration: 1 } })
      .to(track, { x: () => -dist }, 0)
      .fromTo(prog, { drawSVG: '0%' }, { drawSVG: '100%' }, 0)
      .to(lamp, { motionPath: { path: prog, align: prog, alignOrigin: [.5, .5] } }, 0);
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', scrub: .5, animation: tl, invalidateOnRefresh: true, onRefreshInit: build,
      onUpdate: () => { const lx = gsap.getProperty(lamp, 'x'); beats.forEach((b, i) => b.classList.toggle('on', lx >= xs[i] - 10)); } });
    return () => { sec.style.height = ''; beats.forEach(b => { b.classList.remove('on'); b.style.removeProperty('--y'); }); gsap.set([track, lamp], { clearProps: 'all' }); };
  });
  mm.add('(max-width: 899px)', () => {
    ScrollTrigger.create({ trigger: lw, start: 'top 70%', end: 'bottom 60%', scrub: .4, onUpdate: self => { v.style.setProperty('--p', self.progress.toFixed(4));
      const y = lw.getBoundingClientRect().top + 10 + self.progress * (lw.offsetHeight - 20); beats.forEach(b => b.classList.toggle('on', $('.home-trail_dot', b).getBoundingClientRect().top <= y + 6)); } });
    return () => { beats.forEach(b => b.classList.remove('on')); v.style.removeProperty('--p'); };
  });
}
function night(m){
  const nt = $('.section_home-night', m); if (!nt) return; stars($('.stars-canvas', nt), 170);
  if (RM) return;
  const clock = $('.home-night_clock', nt), mm = { v: 120 };
  const fmt = () => { clock.textContent = String(Math.floor(mm.v / 60)).padStart(2, '0') + ':' + String(Math.floor(mm.v % 60)).padStart(2, '0'); };
  ScrollTrigger.create({ trigger: nt, start: 'top top', end: 'bottom bottom', scrub: .5, animation: gsap.timeline({ defaults: { ease: 'none' } })
    .to(mm, { v: 360, duration: .93, onUpdate: fmt }, 0)
    .to($('.home-night_text .is-first', nt), { opacity: 0, y: -14, duration: .1 }, .4).fromTo($('.home-night_text .is-second', nt), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .1 }, .5)
    .to($('.home-night_dawn', nt), { opacity: 1, duration: .5 }, .48).to($('.stars-canvas', nt), { opacity: 0, duration: .35 }, .5)
    .to($('.home-night_ridge .is-far', nt), { attr: { fill: '#3e4b3d' }, duration: .45 }, .5).to($$('.home-night_ridge .is-near, .home-night_ridge .is-chapel', nt), { attr: { fill: '#1b271d' }, duration: .45 }, .5) });
}
function strip(m){
  const row = $('.home-rostos_row', m); if (!row) return;
  $$('.home-rostos_card', row).forEach(c => { const ne = $('.home-rostos_name', c), re = $('.home-rostos_role', c), n = ne.textContent.trim(), a = re.textContent.trim(), age = c.dataset.idade, tw = /^Gémea/.test(a);
    c.dataset.pt = first(n); if (c.dataset.slug) c.setAttribute('href', '/rosto/' + c.dataset.slug); c.draggable = false; const im = $('img', c); if (im) im.draggable = false;
    re.classList.remove('w-dyn-bind-empty');
    if (a && !tw) { ne.textContent = a; re.textContent = n + (age ? ', ' + age : ''); } else re.textContent = a ? a + (age ? ', ' + age : '') : 'Alvoco das Várzeas'; });
  if (!$('.home-rostos_card', row)) return;
  let down = false, sx = 0, sl = 0, moved = 0, vx = 0, lx = 0, lt = 0;
  on(row, 'pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; down = true; sx = lx = e.clientX; sl = row.scrollLeft; moved = 0; vx = 0; lt = performance.now(); gsap.killTweensOf(row); });
  on(window, 'pointermove', e => { if (!down) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); if (moved > 5) row.classList.add('drag'); row.scrollLeft = sl - dx;
    const n = performance.now(); vx = (e.clientX - lx) / Math.max(1, n - lt); lx = e.clientX; lt = n; });
  on(window, 'pointerup', () => { if (!down) return; down = false; if (!row.classList.contains('drag')) return;
    gsap.to(row, { scrollLeft: row.scrollLeft - vx * 340, duration: .9, ease: 'out', onComplete: () => row.classList.remove('drag') }); });
  on(row, 'click', e => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
  const bs = $$('.home-rostos_arrow', m), upd = () => { bs[0].disabled = row.scrollLeft < 8; bs[1].disabled = row.scrollLeft > row.scrollWidth - row.clientWidth - 8; };
  bs.forEach(b => on(b, 'click', () => { const w = $('.home-rostos_card', row).offsetWidth + parseFloat(getComputedStyle(row).columnGap || 0); gsap.to(row, { scrollLeft: row.scrollLeft + w * +b.dataset.d, duration: .9, ease: 'io', onStart: () => row.classList.add('drag'), onComplete: () => row.classList.remove('drag') }); }));
  on(row, 'scroll', upd, { passive: true }); upd();
  if (!RM) { gsap.set($$('.home-rostos_card', row), { opacity: 0, x: 60 }); when(row, () => gsap.to($$('.home-rostos_card', row), { opacity: 1, x: 0, duration: 1.1, stagger: .07, ease: 'out', clearProps: 'transform' })); }
}
function memory(m){
  const s = $('.section_home-memory', m); if (!s) return; stars($('.stars-canvas', s), 240, true);
  const b = $('.home-memory_star', s), set = v => { s.classList.toggle('on', v); b.setAttribute('aria-expanded', v); };
  on(b, 'click', () => set(!s.classList.contains('on')));
  if (FINE) on(b, 'pointerenter', () => set(true));
  let t; const io = new IntersectionObserver(([e]) => { clearTimeout(t); if (e.intersectionRatio > .6) t = setTimeout(() => set(true), 3200); }, { threshold: [0, .6] });
  io.observe(s); cleanups.push(() => { io.disconnect(); clearTimeout(t); });
}
function home(m, firstLoad){
  const ready = hero(m);
  trail(m); night(m); strip(m); memory(m); nextTag(m);
  return ready;
}

/* ================= OTHER PAGES ================= */
function sobre(m){
  if (RM || matchMedia('(max-height: 640px)').matches) return;
  const chs = $$('.chapter_component', m);
  chs.forEach((c, i) => { if (i < chs.length - 1) gsap.to($('.chapter_inner', c), { scale: .94, opacity: .2, ease: 'none', scrollTrigger: { trigger: chs[i + 1], start: 'top bottom', end: 'top top', scrub: true } }); });
}
function rostos(m){
  const sh = $('.rostos-library_shelf', m), recs = $$('.rostos-library_card', sh);
  recs.forEach(c => { const ne = $('.rostos-library_name', c), ae = $('.rostos-library_alias', c), n = ne.textContent.trim(), a = ae.textContent.trim(), age = c.dataset.idade, im = $('img', c);
    c.dataset.pt = first(n); if (c.dataset.slug) c.setAttribute('href', '/rosto/' + c.dataset.slug);
    if (im) { c.dataset.img = im.currentSrc || im.src; if (!im.alt) im.alt = 'Retrato de ' + n; }
    ae.classList.remove('w-dyn-bind-empty'); ae.textContent = a ? a + (age ? ', ' + age : '') : c.dataset.escrito ? 'Alvoco das Várzeas' : 'Registo por escrever'; });
  $('.rostos-library_count', m).textContent = recs.length + ' rostos';
  const btns = $$('.rostos-library_toggle button', m), mark = v => btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
  const set = (v, anim) => { mark(v); const list = v === 'list'; ls.set('alv-vista', v);
    if (!anim || RM) { sh.classList.toggle('is-list', list); ScrollTrigger.refresh(); return; }
    const state = Flip.getState($$('.rostos-library_image-wrap', sh)); sh.classList.toggle('is-list', list);
    gsap.fromTo($$('.rostos-library_meta', sh), { opacity: 0 }, { opacity: 1, duration: .5, delay: .3, stagger: .02 });
    Flip.from(state, { duration: .85, ease: 'io', stagger: .02, scale: true, onComplete: () => ScrollTrigger.refresh() }); };
  btns.forEach(b => on(b, 'click', () => { if (b.getAttribute('aria-pressed') !== 'true') set(b.dataset.v, true); }));
  if (ls.get('alv-vista') === 'list') set('list', false);
  if (!RM) { gsap.set($$('.rostos-library_card', sh), { opacity: 0, y: 44 }); when(sh, () => gsap.to($$('.rostos-library_card', sh), { opacity: 1, y: 0, duration: 1.1, ease: 'out', stagger: .06, clearProps: 'transform,opacity' }), 'top 98%'); }
  follower(sh, () => sh.classList.contains('is-list'));
}
function rosto(m){
  const slug = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop());
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
function caminhada(m){
  stars($('.walk-scene_stars', m), 320, true);
  const sc = $('.section_walk-scene', m), st = $('.walk-scene_sticky', m), sun = $('.walk-scene_sun', m), sm = $('#summit', m), trail_ = $('#trail', m);
  const clk = $('.walk-scene_clock', m), km = $('.walk-scene_km b', m), bar = $('.walk-scene_progress .walk-scene_bar i', m), tks = $$('.walk-scene_progress .walk-scene_ticks span', m), caps = $$('.walk-scene_captions>div', m);
  const q = s => $$(s, m);
  const placeSun = p => { const r = sm.getBoundingClientRect(), s = st.getBoundingClientRect(), z = sun.offsetWidth; gsap.set(sun, { x: r.left - s.left - z / 2, y: r.top - s.top - z / 2 + (1 - p) * z * 1.15 }); };
  const S = { t: 0 }, sunP = { p: 0 };
  const upd = () => { const p = S.t, mm = Math.min(360, 120 + p * 250); clk.textContent = String(Math.floor(mm / 60)).padStart(2, '0') + ':' + String(Math.floor(mm % 60)).padStart(2, '0');
    const d = gsap.utils.clamp(0, 1, (p - .02) / .9); km.textContent = (d * 9).toFixed(1).replace('.', ','); gsap.set(bar, { scaleX: d }); tks.forEach((t, i) => t.classList.toggle('on', d >= [0, .5, .99][i])); };
  const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: upd });
  tl.to(S, { t: 1, duration: 1 }, 0).fromTo(trail_, { drawSVG: '0%' }, { drawSVG: '100%', duration: .9 }, .02);
  q('.walk-scene_walker').forEach((w, i) => tl.set(w, { opacity: 1 }, .02 + i * .014).to(w, { motionPath: { path: trail_, align: trail_, alignOrigin: [.5, .5] }, duration: .9 }, .02 + i * .014));
  tl.to(q('.walk-scene_sky .walk-scene_sky-1'), { opacity: 1, duration: .2 }, .3).to(q('.walk-scene_sky .walk-scene_sky-2'), { opacity: 1, duration: .22 }, .52).to(q('.walk-scene_sky .walk-scene_sky-3'), { opacity: 1, duration: .14 }, .84)
    .to(q('.walk-scene_stars'), { opacity: 0, duration: .3 }, .4).to(q('.walk-scene_moon'), { y: '42vh', opacity: 0, duration: .5 }, .2).to(q('.walk-scene_lights'), { opacity: 0, duration: .2 }, .55).to(q('.walk-scene_lamps'), { opacity: 0, duration: .08 }, .92);
  [['#r4', '#8e8b98', '#a8b5bf'], ['#r3', '#6a6972', '#7e8e8e'], ['#r2, .vil, .r2c', '#4a4a47', '#566550'], ['.chp', '#34332f', '#3e4a38'], ['#r1', '#2b2d27', '#3d4c36'], ['#r0', '#151a14', '#253120']]
    .forEach(([id, a, b]) => tl.to(q(id), { attr: { fill: a }, duration: .3 }, .5).to(q(id), { attr: { fill: b }, duration: .15 }, .85));
  tl.to(q('.walk-scene_fog'), { opacity: .85, duration: .2, stagger: .05 }, .68).to(q('.walk-scene_fog'), { xPercent: 5, duration: .32 }, .68)
    .to(sun, { opacity: 1, duration: .1 }, .7).to(sunP, { p: 1, duration: .24, onUpdate: () => placeSun(sunP.p) }, .7).to(q('.walk-scene_captions'), { color: '#14201a', duration: .04 }, .835);
  caps.forEach((c, i) => { if (!i) tl.set(c, { opacity: 1 }, 0); else tl.fromTo(c, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: .05 }, [0, .26, .5, .76][i]);
    if (i < caps.length - 1) tl.to(c, { opacity: 0, y: -28, duration: .05 }, [.2, .44, .7][i]); });
  placeSun(0);
  cleanups.push(() => tl.kill());
  if (RM) { tl.progress(1); upd(); caps.forEach(c => gsap.set(c, { opacity: 1, y: 0, position: 'relative' })); }
  else ScrollTrigger.create({ trigger: sc, start: 'top top', end: 'bottom bottom', scrub: .8, animation: tl, onRefresh: () => placeSun(sunP.p) });
  on(window, 'resize', () => placeSun(sunP.p));
}
function agenda(m){
  const ls = $('.agenda_list', m), lw = $('.agenda_list-wrap', m), v = $('.agenda_line', m), now = new Date(), mo = now.getMonth(), yr = now.getFullYear();
  // only what is still to come: this year's remaining dates first, then next year's
  const mth = i => +i.dataset.mes - 1, all = $$('.agenda_item', m), ord = [...all.filter(i => mth(i) > mo), ...all.filter(i => mth(i) <= mo)];
  ord.forEach(i => { const y = mth(i) > mo ? yr : yr + 1, sp = $('.agenda_date-label', i), a = $('.agenda_link', i); i.dataset.y = y; sp.textContent = sp.textContent.replace(/ de \d{4}$/, '') + ' de ' + y; ls.appendChild(i);
    if (a) a.dataset.pagina ? a.setAttribute('href', a.dataset.pagina) : a.remove(); });
  const nx = ord[0]; nx.classList.add('nx');
  let left = 'Data a anunciar';
  if (nx.dataset.dia) { const d = Math.ceil((new Date(+nx.dataset.y, mth(nx), +nx.dataset.dia) - now) / 864e5); left = d > 1 ? 'Faltam ' + d + ' dias' : d === 1 ? 'Falta 1 dia' : 'É hoje'; }
  $('.agenda-next_title', m).textContent = $('h3', nx).textContent;
  $('.agenda-next_date', m).textContent = $('.agenda_date-label', nx).textContent + '. ' + left + '.';
  const lit = p => { const h = lw.offsetHeight; ord.forEach((i, k) => i.classList.toggle('on', !k || i.offsetTop + 14 <= p * h)); };
  if (RM) { v.style.setProperty('--p', 1); lit(2); return; }
  const o = { p: 0 }; lit(0);
  gsap.to(o, { p: 1, ease: 'none', scrollTrigger: { trigger: lw, start: 'top 58%', end: 'bottom 58%', scrub: .5 }, onUpdate: () => { v.style.setProperty('--p', o.p.toFixed(4)); lit(o.p); } });
}
function contactos(m){
  const map = { caminhada: 'Caminhada Noturna', socios: 'Sócios e quotas', memoria: 'Partilhar uma memória' };
  const f = $('#form', m), ok = $('.form_sent', f), mx = $('.form_memory-extra', f), radios = $$('input[name=assunto]', f);
  const sync = () => { const v = (radios.find(r => r.checked) || {}).value, show = v === 'Partilhar uma memória'; if (mx.hidden === !show) return; mx.hidden = !show;
    if (show && !RM) gsap.from(mx, { opacity: 0, y: 16, duration: .6, ease: 'out', clearProps: 'transform,opacity' }); ScrollTrigger.refresh(); };
  const pick = () => { const v = map[location.hash.slice(1)]; if (v) { const r = radios.find(i => i.value === v); if (r) r.checked = true; } sync(); };
  pick(); on(window, 'hashchange', pick); radios.forEach(r => on(r, 'change', sync));
  const cp = $('.contact_copy', m);
  cp && on(cp, 'click', () => { const o = cp.textContent, done = k => { cp.textContent = k ? 'Email copiado' : 'Seleciona o email e copia'; setTimeout(() => { cp.textContent = o; }, 2200); };
    navigator.clipboard ? navigator.clipboard.writeText(cp.dataset.copy).then(() => done(true), () => done(false)) : done(false); });
  liveForm(f); dropzone(f);
  on(f, 'submit', e => { e.preventDefault(); const bad = $$('.form_field', f).filter(fl => !validate(fl, f)); if (bad.length) { $('input,textarea', bad[0]).focus(); ok.textContent = ''; return; }
    ok.textContent = 'Mensagem enviada. Respondemos por email.'; f.reset(); $$('.form_field', f).forEach(fl => fl.classList.remove('ok')); $('.form_thumbs', f).innerHTML = ''; pick(); });
  const mp = $('.contact-map_component', m);
  if (mp && !RM) { const outl = $('.contact-map_outline', mp), ls_ = $$('.contact-map_route', mp), cs = $$('.contact-map_city circle, .contact-map_city text, .contact-map_name, .contact-map_pin', mp);
    gsap.set(outl, { drawSVG: '0%' }); gsap.set(ls_, { drawSVG: '0%' }); gsap.set(cs, { opacity: 0 });
    when(mp, () => gsap.timeline().to(outl, { drawSVG: '100%', duration: 2.2, ease: 'power2.inOut' }, .2).to($$('.contact-map_pin, .contact-map_name', mp), { opacity: 1, duration: .8 }, 1.3)
      .to(ls_, { drawSVG: '100%', duration: 1, stagger: .12, ease: 'power2.out' }, 1.6).to($$('.contact-map_city circle, .contact-map_city text', mp), { opacity: 1, duration: .6, stagger: .06 }, 2)); }
}
function graca(m){ stars($('.stars-canvas', m), 260, true); }

/* ================= MOUNT ================= */
let ro = null, rzT = 0, lastH = 0, bodyCls = '';
function mount(firstLoad){
  const m = $('main'), page = m.dataset.page;
  if (bodyCls) document.body.classList.remove(bodyCls); bodyCls = m.dataset.cls || ''; if (bodyCls) document.body.classList.add(bodyCls);
  document.body.dataset.page = page;
  setCurrent(fileOf(location));
  dots(m);
  const ready = ({ home, sobre, rostos, rosto, caminhada, agenda, contactos, graca })[page]?.(m, firstLoad);
  join(m);
  reveal(m);
  navInit(m.dataset.tema || '');
  footer();
  requestAnimationFrame(() => ScrollTrigger.refresh());
  /* late images or fonts change the page height: measure again */
  if (ro) ro.disconnect();
  lastH = m.offsetHeight;
  ro = new ResizeObserver(() => { const h = m.offsetHeight; if (Math.abs(h - lastH) < 4) return; lastH = h; clearTimeout(rzT); rzT = setTimeout(() => ScrollTrigger.refresh(), 220); });
  ro.observe(m);
  return ready;
}
const boot = () => {
  $$('svg[viewBox="0 0 268 298"]').forEach(s => s.setAttribute('viewBox', '0 0 292 298')); { const lr = $('.loader_rect'); lr && lr.setAttribute('width', 300); }
  dots(); menuInit(); drawer();
  gsap.set([pa, pb], { y: 0, yPercent: 101 });
  const ldOn = html.classList.contains('ld-on');
  if (!ldOn) { gsap.set(pb, { yPercent: 0 }); gsap.set(pc, { autoAlpha: 1, y: 0 }); pt.classList.add('on'); stop(); }
  html.classList.add('app');
  newGate();
  const ready = mount(true) || Promise.resolve();
  if (ldOn) loader(ready); else Promise.race([ready, wait(1100)]).then(() => wait(250)).then(uncover);
  if (location.hash === '#socio') setTimeout(openDrawer, ldOn ? 5400 : 1400);
  addEventListener('load', () => ScrollTrigger.refresh());
};
(document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, wait(1500)]) : Promise.resolve()).then(() => requestAnimationFrame(boot));
})();
