/* =========================================================
   Alvôco a Recordar: the hero.
   A night view of the serra drawn in ridgelines. A line of
   lanterns climbs from the bridge to the Colcurinho, and the
   visitor carries one more: the pointer lights the mountain.
   The terrain is drawn, not surveyed. It is a picture of the
   walk, not a map.
   ========================================================= */
window.AlvHero = function (canvas, opt) {
  const T = window.THREE;
  if (!T) return null;
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  const root = opt.root, coarse = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
  renderer.setClearColor(0x000000, 0);

  /* ---- terrain ---- */
  const fract = x => x - Math.floor(x);
  const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y) => { let s = 0, a = .5, f = 1; for (let i = 0; i < 4; i++) { s += a * vn(x * f, y * f); f *= 2.03; a *= .5; } return s; };
  const gs = (x, z, cx, cz, sx, sz) => Math.exp(-(((x - cx) * (x - cx)) / (2 * sx * sx) + ((z - cz) * (z - cz)) / (2 * sz * sz)));
  const PEAK = [5, -9];
  const H = (x, z) => {
    let h = 6.6 * gs(x, z, PEAK[0], PEAK[1], 5.2, 4.4) + 3.6 * gs(x, z, -10, -12, 6.5, 4) + 2.8 * gs(x, z, 15, -5, 5, 5) + 1.9 * gs(x, z, -15, -2, 5, 4.5);
    h += 2.3 * fbm(x * .16 + 3.1, z * .16 + 7.7) + .45 * fbm(x * .6, z * .6);
    return h * (1 - .78 * gs(x, z, -3.5, 6.5, 7.5, 4.2));
  };
  const X0 = -30, X1 = 30, Z0 = -19, Z1 = 9.5, NX = coarse ? 170 : 230, NZ = coarse ? 58 : 74;
  const px = i => X0 + (X1 - X0) * i / (NX - 1), pz = j => Z0 + (Z1 - Z0) * j / (NZ - 1);

  const scene = new T.Scene(), cam = new T.PerspectiveCamera(40, 1, .1, 200);
  const U = { uLight: { value: new T.Vector3(-3, 1, 5) }, uTime: { value: 0 }, uReveal: { value: 0 }, uDawn: { value: 0 },
    uCol: { value: new T.Color('#9db29b') }, uLamp: { value: new T.Color('#ffe2a6') }, uBg: { value: new T.Color('#0a130e') } };

  // ground: hides the lines behind each ridge and takes the pool of light
  const gp = new Float32Array(NX * NZ * 3), gi = [];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const k = (j * NX + i) * 3, x = px(i), z = pz(j); gp[k] = x; gp[k + 1] = H(x, z); gp[k + 2] = z; }
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; gi.push(a, c, b, b, c, d); }
  const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(gp, 3)); gg.setIndex(gi);
  const ground = new T.Mesh(gg, new T.ShaderMaterial({ uniforms: U, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 2,
    vertexShader: 'varying vec3 vW;void main(){vW=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'precision highp float;uniform vec3 uLight;uniform vec3 uLamp;uniform vec3 uBg;uniform float uDawn;varying vec3 vW;void main(){float d=distance(vW.xz,uLight.xz);float g=smoothstep(6.5,0.,d);vec3 c=uBg*(1.+vW.y*.09)+uLamp*g*g*.13+vec3(.012,.03,.02)*uDawn;gl_FragColor=vec4(c,1.);}' }));
  scene.add(ground);

  // ridgelines
  const lp = new Float32Array(NZ * (NX - 1) * 6), lr = new Float32Array(NZ * (NX - 1) * 2); let o = 0, q = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX - 1; i++) {
    const k = (j * NX + i) * 3;
    lp[o++] = gp[k]; lp[o++] = gp[k + 1]; lp[o++] = gp[k + 2]; lp[o++] = gp[k + 3]; lp[o++] = gp[k + 4]; lp[o++] = gp[k + 5];
    lr[q++] = j / (NZ - 1); lr[q++] = j / (NZ - 1);
  }
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(lp, 3)); lg.setAttribute('aRow', new T.BufferAttribute(lr, 1));
  const lines = new T.LineSegments(lg, new T.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false,
    vertexShader: 'attribute float aRow;varying vec3 vW;varying float vR;void main(){vW=position;vR=aRow;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'precision highp float;uniform vec3 uLight;uniform vec3 uCol;uniform vec3 uLamp;uniform float uReveal;uniform float uDawn;varying vec3 vW;varying float vR;void main(){float d=distance(vW.xz,uLight.xz);float g=smoothstep(8.,0.,d);float a=mix(.13,.4,vR)+vW.y*.018+uDawn*.1+g*.85;float rv=smoothstep(0.,.14,uReveal*1.36-(1.-vR)-abs(vW.x)*.004);gl_FragColor=vec4(mix(uCol,uLamp,g*.9),clamp(a,0.,1.)*rv);}' }));
  scene.add(lines);

  /* ---- the walk ---- */
  const ctl = [[-5.5, 8.2], [-3.2, 6.2], [-4.8, 3.6], [-2, 1.4], [.6, -.6], [-.8, -3], [1.8, -4.6], [3, -6.6], [4.4, -8.2], PEAK];
  const curve = new T.CatmullRomCurve3(ctl.map(([x, z]) => new T.Vector3(x, H(x, z) + .16, z)), false, 'catmullrom', .5);
  const NW = coarse ? 34 : 48, wp = new Float32Array(NW * 3), wa = new Float32Array(NW), ws = new Float32Array(NW), ph = [];
  for (let i = 0; i < NW; i++) { const grp = Math.floor(i / 6); ph.push((grp * .145 + (i % 6) * .012 + Math.random() * .01) % 1); ws[i] = .7 + Math.random() * .7; }
  const wg = new T.BufferGeometry(); wg.setAttribute('position', new T.BufferAttribute(wp, 3)); wg.setAttribute('aA', new T.BufferAttribute(wa, 1)); wg.setAttribute('aS', new T.BufferAttribute(ws, 1));
  const PV = 'attribute float aA;attribute float aS;uniform float uTime;uniform float uPx;varying float vA;void main(){vA=aA*(.75+.25*sin(uTime*3.+aS*40.));vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=uPx*aS/-mv.z;gl_Position=projectionMatrix*mv;}';
  const PF = 'precision highp float;uniform vec3 uLamp;varying float vA;void main(){float r=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,r);gl_FragColor=vec4(uLamp,a*a*vA);}';
  const pm = px_ => new T.ShaderMaterial({ uniforms: Object.assign({ uPx: { value: px_ } }, U), vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
  const walkers = new T.Points(wg, pm(150)); scene.add(walkers);

  // the village, asleep by the bridge
  const NVl = 14, vp = new Float32Array(NVl * 3), va = new Float32Array(NVl).fill(.55), vs = new Float32Array(NVl);
  for (let i = 0; i < NVl; i++) { const x = -6.4 + Math.random() * 2.6, z = 8.3 + Math.random() * 1; vp[i * 3] = x; vp[i * 3 + 1] = H(x, z) + .12; vp[i * 3 + 2] = z; vs[i] = .35 + Math.random() * .4; }
  const vg = new T.BufferGeometry(); vg.setAttribute('position', new T.BufferAttribute(vp, 3)); vg.setAttribute('aA', new T.BufferAttribute(va, 1)); vg.setAttribute('aS', new T.BufferAttribute(vs, 1));
  scene.add(new T.Points(vg, pm(130)));

  // the visitor's lantern
  const mg = new T.BufferGeometry(); const mpos = new Float32Array(3);
  mg.setAttribute('position', new T.BufferAttribute(mpos, 3)); mg.setAttribute('aA', new T.BufferAttribute(new Float32Array([1]), 1)); mg.setAttribute('aS', new T.BufferAttribute(new Float32Array([1]), 1));
  const mine = new T.Points(mg, pm(340)); mine.frustumCulled = false; scene.add(mine);

  // stars
  const NS = coarse ? 420 : 700, sp = new Float32Array(NS * 3), sa = new Float32Array(NS), sz = new Float32Array(NS);
  for (let i = 0; i < NS; i++) { sp[i * 3] = -90 + Math.random() * 180; sp[i * 3 + 1] = 6 + Math.random() * 52; sp[i * 3 + 2] = -60; sa[i] = .25 + Math.random() * .75; sz[i] = .5 + Math.random() * 1.1; }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3)); sg.setAttribute('aA', new T.BufferAttribute(sa, 1)); sg.setAttribute('aS', new T.BufferAttribute(sz, 1));
  const starsM = new T.ShaderMaterial({ uniforms: Object.assign({ uPx: { value: 150 } }, U), transparent: true, depthWrite: false,
    vertexShader: 'attribute float aA;attribute float aS;uniform float uTime;uniform float uPx;uniform float uReveal;varying float vA;void main(){vA=aA*(.55+.45*sin(uTime*(.6+aS)+aA*60.))*smoothstep(.1,.7,uReveal);vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=uPx*aS/-mv.z;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'precision highp float;varying float vA;void main(){float r=length(gl_PointCoord-.5);gl_FragColor=vec4(.96,.97,.94,smoothstep(.5,.1,r)*vA);}' });
  const stars = new T.Points(sg, starsM); stars.frustumCulled = false; scene.add(stars);

  /* ---- camera, pointer, loop ---- */
  let W = 1, Hh = 1, portrait = false, sc = 0, mx = 0, my = 0, lastMove = -1e9, vis = true, raf = 0, dead = false, t0 = performance.now();
  const target = new T.Vector3(-3, 1, 5), look = new T.Vector3(), ray = new T.Raycaster(), ndc = new T.Vector2(), tmp = new T.Vector3();
  const camBase = new T.Vector3();
  function size() {
    W = root.clientWidth; Hh = root.clientHeight; if (!W || !Hh) return;
    renderer.setSize(W, Hh, false); cam.aspect = W / Hh; portrait = cam.aspect < .9;
    cam.fov = portrait ? 56 : 40; camBase.set(portrait ? 2.2 : .6, portrait ? 8.6 : 6.9, portrait ? 21.5 : 17.5); look.set(portrait ? 3.4 : 2.2, portrait ? 3.2 : 2.5, -4);
    const k = renderer.getPixelRatio() * Hh / 900; walkers.material.uniforms.uPx.value = 150 * k; mine.material.uniforms.uPx.value = 360 * k; starsM.uniforms.uPx.value = 190 * k;
    scene.children.forEach(c => { if (c.isPoints && c !== walkers && c !== mine && c !== stars) c.material.uniforms.uPx.value = 120 * k; });
    cam.updateProjectionMatrix();
  }
  function aim(cx, cy) {
    const r = root.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1)); mx = ndc.x; my = ndc.y;
    ray.setFromCamera(ndc, cam); const d = ray.ray.direction, og = ray.ray.origin; let t = 0, hit = false;
    for (let i = 0; i < 90; i++) { t += .45; tmp.copy(og).addScaledVector(d, t); if (tmp.x < X0 || tmp.x > X1 || tmp.z < Z0) break; if (tmp.z <= Z1 && tmp.y <= H(tmp.x, tmp.z) + .05) { hit = true; break; } }
    if (hit) { target.set(tmp.x, 0, tmp.z); lastMove = performance.now(); }
  }
  const onMove = e => { if (e.pointerType === 'touch' && !e.isPrimary) return; aim(e.clientX, e.clientY); };
  root.addEventListener('pointermove', onMove, { passive: true }); root.addEventListener('pointerdown', onMove, { passive: true });
  const ro = new ResizeObserver(size); ro.observe(root);
  const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && !raf && !dead) raf = requestAnimationFrame(frame); }); io.observe(root);
  const tags = opt.tags || {}, tagAt = { top: new T.Vector3(PEAK[0], H(PEAK[0], PEAK[1]) + .3, PEAK[1]), base: new T.Vector3(ctl[0][0], H(ctl[0][0], ctl[0][1]) + .3, ctl[0][1]) };
  const L = U.uLight.value;

  function frame(now) {
    raf = 0; if (dead) return;
    const t = (now - t0) / 1000; U.uTime.value = t;
    if (now - lastMove > 2600) { const u = .5 + .42 * Math.sin(t * .11), p = curve.getPointAt(u); target.set(p.x + Math.sin(t * .5) * 1.4, 0, p.z + Math.cos(t * .37) * 1.2); mx *= .97; my *= .97; }
    L.x += (target.x - L.x) * .07; L.z += (target.z - L.z) * .07; L.y = H(L.x, L.z) + .34;
    mpos[0] = L.x; mpos[1] = L.y; mpos[2] = L.z; mg.attributes.position.needsUpdate = true;
    for (let i = 0; i < NW; i++) { const u = (ph[i] + t * .0085) % 1, p = curve.getPointAt(u); wp[i * 3] = p.x; wp[i * 3 + 1] = p.y; wp[i * 3 + 2] = p.z; wa[i] = Math.min(1, u / .05) * Math.min(1, (1 - u) / .06); }
    wg.attributes.position.needsUpdate = true; wg.attributes.aA.needsUpdate = true;
    cam.position.set(camBase.x + mx * 1.1, camBase.y + my * .5 + sc * 3.2, camBase.z - sc * 2.2);
    cam.lookAt(look.x + mx * .5, look.y - sc * 1.2, look.z);
    U.uDawn.value = sc;
    renderer.render(scene, cam);
    for (const k in tags) { const el = tags[k]; if (!el) continue; tmp.copy(tagAt[k]).project(cam); const x = (tmp.x * .5 + .5) * W, w = el.offsetWidth, left = x + 14 + w > W - 12; el.style.flexDirection = left ? 'row-reverse' : 'row'; el.style.transform = `translate(${(left ? x - 14 - w : x + 14).toFixed(1)}px,${((-tmp.y * .5 + .5) * Hh - 8).toFixed(1)}px)`; }
    if (vis && !opt.reduced && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const onVis = () => { if (!document.hidden && vis && !raf && !dead) raf = requestAnimationFrame(frame); };
  document.addEventListener('visibilitychange', onVis);
  size();
  if (opt.reduced) U.uReveal.value = 1;
  raf = requestAnimationFrame(frame);

  return {
    intro() { if (opt.reduced || !window.gsap) { U.uReveal.value = 1; return; } gsap.fromTo(U.uReveal, { value: 0 }, { value: 1, duration: 3.2, ease: 'power2.out' }); },
    scroll(p) { sc = p; },
    destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
      root.removeEventListener('pointermove', onMove); root.removeEventListener('pointerdown', onMove);
      scene.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); renderer.dispose(); }
  };
};
