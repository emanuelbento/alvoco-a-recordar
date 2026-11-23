#!/usr/bin/env python3
"""Builds the Alvôco a Recordar prototype (v8) from shared partials."""
import json, math, pathlib, re

R = pathlib.Path(__file__).parent
A = R / 'assets' / 'img'
LOGO_RAW = (A / 'logo-h.svg').read_text()
LOGO = LOGO_RAW.replace('<svg ', '<svg aria-hidden="true" focusable="false" ', 1)
MARK = '<svg viewBox="0 0 292 298" fill="currentColor" aria-hidden="true">' + (A / 'mark-inline.txt').read_text() + '</svg>'
J = 'https://cdn.jsdelivr.net/npm/'
LIBS = ''.join(f'<script src="{J}gsap@3.13.0/dist/{f}.min.js"></script>' for f in
               ['gsap', 'ScrollTrigger', 'SplitText', 'CustomEase', 'DrawSVGPlugin', 'MotionPathPlugin', 'Flip'])
LIBS += f'<script src="{J}lenis@1.1.13/dist/lenis.min.js"></script>'
NAV = [('./', 'Início'), ('sobre.html', 'Sobre nós'), ('rostos.html', 'Rostos'), ('caminhada.html', 'Caminhada'),
       ('agenda.html', 'Agenda'), ('contactos.html', 'Contactos')]
LAT, LON = 40.303057, -7.833814
MAPS = f'https://www.google.com/maps?q={LAT},{LON}'
COORD = '40,3031° N, 7,8338° O'
MAIL = 'alvocoarecordar@gmail.com'


def smooth(pts, h=0):
    d = f'M{pts[0][0]} {pts[0][1]}'
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i else pts[i]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6); c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f'C{c1[0]:.0f} {c1[1]:.0f} {c2[0]:.0f} {c2[1]:.0f} {p2[0]} {p2[1]}'
    return d + (f'V{h}H0Z' if h else '')


RIDGE = '<path fill="currentColor" d="' + smooth([(0, 62), (90, 44), (170, 56), (260, 26), (350, 40), (450, 10), (540, 30), (640, 16), (730, 38), (820, 22), (910, 44), (1000, 32)], 100) + '"/>'


# ---- logo split in two groups (mark, wordmark) for the loader ----
def top_groups(svg):
    inner = svg[svg.index('>') + 1: svg.rindex('</svg>')]
    out, depth, start = [], 0, None
    for m in re.finditer(r'<(/?)g\b[^>]*>', inner):
        if not m.group(1):
            if depth == 0: start = m.end()
            depth += 1
        else:
            depth -= 1
            if depth == 0: out.append(inner[start: m.start()])
    return out


G_MARK, G_WORD = top_groups(LOGO_RAW)
LD_LOGO = f'''<svg class="ld-svg" viewBox="-3 -3 642.46 303.27" fill="currentColor" aria-hidden="true">
  <defs><clipPath id="ldc"><rect class="ld-rect" x="-3" y="300" width="300" height="304"/></clipPath></defs>
  <g class="ld-line" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round">{G_MARK}</g>
  <g class="ld-solid" clip-path="url(#ldc)">{G_MARK}</g>
  <g class="ld-word">{G_WORD}</g>
</svg>'''
OD = '<span class="od-c"><i>' + '<br>'.join(str(i % 10) for i in range(11)) + '</i></span>'


# ---- Portugal outline for the contacts map (Natural Earth, via world-atlas) ----
def portugal():
    f = pathlib.Path('/tmp/claude-0/-home-claude/f0b68390-b372-54fe-a152-254cf7efb1aa/scratchpad/alvdeps/node_modules/world-atlas/countries-10m.json')
    cache = R / 'assets' / 'pt-outline.json'
    if not f.exists():
        return json.loads(cache.read_text())
    t = json.loads(f.read_text()); sx, sy = t['transform']['scale']; tx, ty = t['transform']['translate']
    def arc(i):
        a = t['arcs'][~i if i < 0 else i]; x = y = 0; pts = []
        for dx, dy in a:
            x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
        return pts[::-1] if i < 0 else pts
    g = next(g for g in t['objects']['countries']['geometries'] if str(g.get('id')) == '620')
    polys = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
    rings = []
    for p in polys:
        ring = []
        for i in p[0]:
            a = arc(i); ring += a if not ring else a[1:]
        rings.append(ring)
    main = max(rings, key=lambda r: abs(sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r)))))
    out = {'ring': main}
    cache.write_text(json.dumps(out))
    return out


K = 112
def proj(lon, lat):
    return ((lon + 9.62) * math.cos(math.radians(39.7)) * K, (42.22 - lat) * K)

def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return round(6371 * 2 * math.asin(math.sqrt(h)))

_ring = portugal()['ring']
_pts, _last = [], None
for lo, la in _ring:
    x, y = proj(lo, la)
    if _last is None or (x - _last[0]) ** 2 + (y - _last[1]) ** 2 > 1.1:
        _pts.append((x, y)); _last = (x, y)
PT_D = 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in _pts) + 'Z'
CITIES = [('Porto', 41.1496, -8.6110), ('Coimbra', 40.2056, -8.4195), ('Lisboa', 38.7223, -9.1393)]
AX, AY = proj(LON, LAT)
MAP_W, MAP_H = proj(-6.1, 0)[0], proj(0, 36.9)[1]

def mapsvg():
    lines = ''
    for n, la, lo in CITIES:
        x, y = proj(lo, la); d = km((LAT, LON), (la, lo))
        lines += f'<g class="mp-c"><path class="mp-l" d="M{AX:.1f} {AY:.1f}L{x:.1f} {y:.1f}"/><circle cx="{x:.1f}" cy="{y:.1f}" r="3.4"/><text x="{x - 10:.1f}" y="{y + 4:.1f}" text-anchor="end">{n}<tspan x="{x - 10:.1f}" dy="15" class="s">{d} km</tspan></text></g>'
    return f'''<svg class="mp-svg" viewBox="-70 -14 {MAP_W + 90:.0f} {MAP_H + 28:.0f}" role="img" aria-label="Mapa de Portugal continental com Alvoco das Várzeas assinalado, no interior centro, a {km((LAT, LON), (CITIES[1][1], CITIES[1][2]))} km de Coimbra em linha reta">
  <path class="mp-pt" d="{PT_D}"/>{lines}
  <g class="mp-a" transform="translate({AX:.1f} {AY:.1f})"><circle class="mp-r" r="8"/><circle class="mp-r b" r="8"/><circle class="mp-d" r="5"/></g>
  <text class="mp-n" x="{AX + 16:.1f}" y="{AY - 2:.1f}">Alvoco das Várzeas<tspan x="{AX + 16:.1f}" dy="15" class="s">Serra do Açor</tspan></text>
</svg>'''


# ---------------- shared partials ----------------
def card(nome='O teu nome', n='0000', small='Sócio n.º', place='Alvoco das Várzeas'):
    rg = '<svg class="rg" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">' + RIDGE + '</svg>'
    return f'''<div class="card3d"><div class="card">
  <div class="card-f">{rg}<div class="top">{LOGO}<span>Cartão<br>de sócio</span></div>
    <div class="num"><small>{small}</small><span class="c-n{" pend" if n == "0000" else ""}">{n}</span></div>
    <div class="nm"><b class="c-nm">{nome}</b><span class="c-pl">{place}</span></div></div>
  <div class="card-b"><div>{MARK}<p>Recordamos os Alvocenses, as tradições, os saberes, as memórias. Recordamos Alvoco.</p></div></div>
</div></div>'''


def fl(id_, label, v, type_='text', ac='', full=False, opt='', extra='', hint=''):
    o = f' <em>{opt}</em>' if opt else ''
    h = f'<span class="hn">{hint}</span>' if hint else ''
    return (f'<div class="fl{" full" if full else ""}"><label for="{id_}">{label}{o}</label>'
            f'<input id="{id_}" name="{id_}" type="{type_}" autocomplete="{ac}" data-v="{v}"{extra}>'
            f'<span class="bl"></span><span class="ck"></span>{h}<span class="er" aria-live="polite"></span></div>')


PAISES = ['Portugal', 'França', 'Suíça', 'Luxemburgo', 'Alemanha', 'Bélgica', 'Reino Unido', 'Espanha', 'Brasil', 'Canadá', 'Estados Unidos', 'Outro']
FS = 'class="fs0"'
DOB = '''<fieldset class="fl dob" data-dob><legend>Data de nascimento</legend>
  <div class="dob-i"><input name="dia" inputmode="numeric" maxlength="2" placeholder="DD" autocomplete="bday-day" aria-label="Dia"><span>/</span><input name="mes" inputmode="numeric" maxlength="2" placeholder="MM" autocomplete="bday-month" aria-label="Mês"><span>/</span><input name="ano" inputmode="numeric" maxlength="4" placeholder="AAAA" autocomplete="bday-year" aria-label="Ano"></div>
  <span class="bl"></span><span class="ck"></span><span class="er" aria-live="polite"></span></fieldset>'''
DRAWER = f'''
<div class="dw" role="dialog" aria-modal="true" aria-labelledby="dw-t" aria-hidden="true">
  <div class="dw-bg"></div>
  <div class="dw-p">
    <aside class="dw-s" aria-hidden="true">
      <p class="dw-k">Pedido de admissão</p>
      {card()}
      <ol class="dw-steps"><li class="on">Quem és</li><li>Onde te encontramos</li><li>Confirmar</li></ol>
      <p class="dw-fee"><b>10 €</b> no ano em que entras<br><b>5 €</b> em cada ano seguinte</p>
    </aside>
    <div class="dw-m">
      <div class="dw-h"><div><p id="dw-t" class="d3">Ser sócio</p><span class="st">Passo 1 de 3</span></div><button class="x-btn" type="button" aria-label="Fechar"></button></div>
      <div class="dw-pb" aria-hidden="true"><i></i></div>
      <div class="dw-b" data-lenis-prevent>
        <form id="socio" novalidate>
          <fieldset class="stp on"><legend class="sr">Quem és</legend>
            <h2 class="d3" tabindex="-1">Quem és</h2><p class="sub">Dois minutos. Não há pagamento nesta fase.</p>
            <div class="fm">{fl('nome', 'Nome completo', 'nome', ac='name', full=True, extra=' placeholder="Como aparece no cartão de cidadão"')}{DOB}{fl('natural', 'Natural de', 'req', ac='off', extra=' placeholder="Onde nasceste"')}</div>
          </fieldset>
          <fieldset class="stp"><legend class="sr">Onde te encontramos</legend>
            <h2 class="d3" tabindex="-1">Onde te encontramos</h2><p class="sub">Muitos sócios vivem longe de Alvoco. Indica o país, se não for Portugal.</p>
            <div class="fm">{fl('email', 'Email', 'email', 'email', 'email', extra=' inputmode="email"')}{fl('telemovel', 'Telemóvel', 'tel', 'tel', 'tel', extra=' inputmode="tel"')}
              <div class="fl"><label for="pais">País</label><select id="pais" name="pais" autocomplete="country-name">{''.join(f'<option>{p}</option>' for p in PAISES)}</select><span class="bl"></span><span class="er"></span></div>
              {fl('cp', 'Código postal', 'cp', ac='postal-code', extra=' inputmode="numeric" placeholder="0000-000"')}
              {fl('localidade', 'Localidade', 'req', ac='address-level2', full=True, hint='')}
              {fl('morada', 'Morada', 'req', ac='street-address', full=True, extra=' placeholder="Rua, número, andar"')}</div>
          </fieldset>
          <fieldset class="stp"><legend class="sr">Confirmar</legend>
            <h2 class="d3" tabindex="-1">Confirmar</h2><p class="sub">Vê se está tudo certo antes de enviar.</p>
            <dl class="rv"></dl>
            <div class="fm" style="margin-top:var(--s4)">{fl('nif', 'NIF', 'nif', 'text', 'off', full=True, opt='opcional', extra=' inputmode="numeric" maxlength="9"', hint='Só é preciso se quiseres o recibo da quota com contribuinte.')}</div>
            <fieldset {FS} style="margin-top:var(--s3)"><legend class="lg">Como preferes pagar? <em>opcional</em></legend>
              <div class="chips">{''.join(f'<label><input type="radio" name="pagamento" value="{c}"><span>{c}</span></label>' for c in ['MB WAY', 'Transferência bancária', 'Em mão, em Alvoco'])}</div></fieldset>
            <div class="fee"><div><b>10 €</b><br>Joia, no ano em que entras</div><div><b>5 €</b><br>Quota, em cada ano seguinte</div></div>
            <div class="mst"><label class="check"><input type="checkbox" name="declaro" value="sim" data-must><span class="bx"></span><span>Quero ser sócio da Associação Alvôco a Recordar e comprometo-me a pagar a joia de inscrição e a quota anual.</span></label><span class="er-g"></span></div>
            <div class="mst"><label class="check"><input type="checkbox" name="dados" value="sim" data-must><span class="bx"></span><span>Li a <a class="lk" href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a> e sei que a associação usa estes dados para gerir a minha inscrição e avisar-me das atividades.</span></label><span class="er-g"></span></div>
          </fieldset>
        </form>
        <div class="done" hidden>
          <div class="done-c">{card()}</div>
          <h2 class="d2" tabindex="-1">Obrigado, <span class="d-nome"></span>.</h2>
          <p class="done-p">O teu pedido chegou. O número de sócio segue no email de confirmação.</p>
          <ol><li>Enviámos a confirmação para <b class="d-mail"></b>, com os dados para pagares a quota.</li><li>Quando o pagamento chegar, a tua inscrição fica ativa.</li><li>O número de sócio é teu e não muda.</li></ol>
        </div>
      </div>
      <div class="dw-f"><button class="back" type="button" hidden>Voltar</button><button class="btn next" type="button">Continuar</button></div>
    </div>
  </div>
</div>'''


def head(title, desc, page, first=False):
    cur = {'home': './', 'rosto': 'rostos.html', 'graca': '', 'documentos': '', 'privacidade': '', 'cookies': ''}.get(page, page + '.html')
    links = ''.join(f'<a href="{h}"{" aria-current=page" if h == cur else ""}>{n}</a>' for h, n in NAV)
    mlinks = ''.join(f'<li><span class="ln"><a href="{h}">{n}</a></span></li>' for h, n in NAV) + '<li><span class="ln"><button type="button" data-socio>Ser sócio</button></span></li>'
    early = ("<script>(function(){var d=document.documentElement;d.classList.add('js');try{"
             + ("if(!sessionStorage.getItem('alv-seen')&&!matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('ld-on');" if page == 'home' else '')
             + "}catch(e){}})()</script>")
    metas = f'''<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="claude:viewport-fit-sides" content="cover">
{early}
<link rel="preload" href="assets/fonts/exo-extrabold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="assets/app.css">'''
    if first:
        top = metas + f'\n<script>document.body.dataset.page="{page}"</script>\n'
    else:
        top = f'<!doctype html>\n<html lang="pt-PT">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n{metas}\n</head>\n<body data-page="{page}">\n'
    return top + f'''<a class="skip" href="#main">Saltar para o conteúdo</a>
<header class="nav">
  <div class="nav-in">
    <a class="logo" href="./" aria-label="Alvôco a Recordar, início">{LOGO}</a>
    <nav class="nav-l" aria-label="Principal">{links}</nav>
    <div class="nav-a"><button class="btn sm" type="button" data-socio>Ser sócio</button><button class="burger" type="button" aria-label="Abrir menu"><span></span><span></span></button></div>
  </div>
</header>
<div class="menu w" role="dialog" aria-modal="true" aria-label="Menu" data-lenis-prevent>
  <div class="top"><a class="logo" href="./" aria-label="Início">{LOGO}</a><button class="x-btn" type="button" aria-label="Fechar menu"></button></div>
  <ul>{mlinks}</ul>
  <div class="f"><span>{MAIL}</span><span>Alvoco das Várzeas, Serra do Açor</span></div>
</div>
<div class="pt" aria-hidden="true"><i class="pt-a"></i><div class="pt-b"><div class="pt-c"><span class="pt-m">{MARK}</span><span class="pt-n"></span></div></div></div>
{DRAWER}
'''


def foot():
    cols = ''.join(f'<li><a class="ul" href="{h}">{n}</a></li>' for h, n in NAV)
    return f'''
<footer class="ft" data-tema="claro">
  <div class="ft-mk" aria-hidden="true">{MARK}</div>
  <div class="w">
    <div class="g ft-top">
      <p class="d1 ft-t">Recordamos<br>Alvoco.</p>
      <div class="act"><p>Uma cassete antiga devolveu-nos as Marchas Populares e as Festas do Rio. Se tens fotografias, gravações ou histórias guardadas, é com elas que este arquivo se faz.</p><a class="btn lt" href="contactos.html#memoria">Partilhar uma memória</a></div>
    </div>
  </div>
  <div class="ft-ridge" aria-hidden="true"><svg><path class="ft-r0"/><path class="ft-r1"/></svg><span class="ft-lamp"></span></div>
  <div class="w">
    <div class="g ft-cols">
      <div><h3>Páginas</h3><ul>{cols}</ul></div>
      <div><h3>A associação</h3><ul><li><a class="ul" href="documentos.html">Documentos</a></li><li><a class="ul" href="graca.html">Em memória</a></li><li><button class="ul lkb" type="button" data-socio>Ser sócio</button></li></ul></div>
      <div><h3>Sede</h3><ul><li>Alvoco das Várzeas</li><li>Oliveira do Hospital</li><li>{COORD}</li><li><a class="ul" href="{MAPS}" target="_blank" rel="noopener">Abrir no mapa</a></li></ul></div>
      <div><h3>Falar connosco</h3><ul><li><span class="sel">{MAIL}</span></li><li><a class="ul" href="https://www.facebook.com/alvocoarecordar" target="_blank" rel="noopener">Facebook</a></li><li><a class="ul" href="https://www.instagram.com/alvocoarecordar" target="_blank" rel="noopener">Instagram</a></li></ul></div>
    </div>
    <div class="ft-b"><span>Associação Alvôco a Recordar, associação cultural sem fins lucrativos</span><span class="ft-lg"><a class="ul" href="privacidade.html">Privacidade</a><a class="ul" href="cookies.html">Cookies</a></span><span>Em Alvoco são <span class="clock">--:--</span></span></div>
  </div>
</footer>
'''


def end(first=False):
    return f'{LIBS}\n<script src="assets/app.js"></script>\n' + ('' if first else '</body>\n</html>\n')

def btn(h, t, c='', x=''):
    return f'<a class="btn {c}" href="{h}"{x}>{t}</a>'

def sbtn(t, c=''):
    return f'<button class="btn {c}" type="button" data-socio>{t}</button>'


JOIN = f'''
<section class="jn gr" data-tema="claro" aria-labelledby="h-jn">
  <div class="w g jn-g">
    <h2 class="d1 jn-h" id="h-jn" data-r="lines">Caminha connosco.</h2>
    <div class="jn-l">
      <p class="lede" data-r="fade">Na serra e na vida da aldeia. Ser sócio é fazer parte do que mantém Alvoco junto.</p>
      <ul class="jn-ul" data-r="list">
        <li>Preço de sócio nos almoços e nas excursões.</li>
        <li>Voz e voto na Assembleia Geral.</li>
        <li>As convocatórias, as datas e as inscrições em primeira mão.</li>
        <li>Um número de sócio, que é teu e não muda.</li>
      </ul>
    </div>
    <div class="jn-r">
      <div class="jn-card" data-r="fade">{card()}</div>
      <form class="jn-f" novalidate aria-label="Começar o pedido de sócio">
        <label for="jn-nome">O teu nome, como vai ficar no cartão</label>
        <div class="jn-row"><input id="jn-nome" name="nome" autocomplete="name" placeholder="Nome e apelido" maxlength="40"><button class="btn lt" type="submit">Pedir admissão</button></div>
      </form>
      <div class="jn-p"><div><b>10 €</b><span>no ano de entrada</span></div><div><b>5 €</b><span>em cada ano seguinte</span></div></div>
      <p class="jn-n">Recebes logo o teu número de sócio e, por email, os dados para pagamento.</p>
    </div>
  </div>
</section>
'''

YEAR = [
    (0, '6 de janeiro', 'Dia de Reis', 'Saímos à rua para cantar as janeiras. É também o dia em que recordamos a queda da Sobreira, símbolo maior de Alvoco das Várzeas.'),
    (3, 'Abril ou maio', 'Excursão', 'Uma viagem em comunidade, de autocarro e com o farnel atrás. Durante décadas foi assim que as aldeias conheceram o país.'),
    (5, 'Junho', 'Sardinhada', 'O Largo 25 de Abril volta a cheirar a sardinha assada, a soar a música e a encher-se de gente.'),
    (7, 'Agosto', 'Almoço da associação', 'O aniversário celebra-se à mesa, nos dias da Caminhada. Há sempre espaço para puxar mais uma cadeira.'),
    (7, 'Madrugada de 15 de agosto', 'Caminhada Noturna', 'Cerca de nove quilómetros sempre a subir, de Alvoco ao Monte do Colcurinho, para ver nascer o sol.'),
    (8, 'Setembro', 'Desfolhada', 'Meses de trabalho no campo terminavam com a desfolhada, vivida na aldeia como festa. Fazemo-la no CERCAV, com quem já perdeu a conta às que fez.'),
    (10, 'Novembro', 'Magusto', 'Castanhas assadas e o calor das fogueiras, pelo São Martinho.'),
]

def yrow(mo, dt, t, ds, href='agenda.html', tag=''):
    tg = f'<span class="tag">{tag}</span>' if tag else ''
    return f'<li class="yr-i" data-mo="{mo}"><a href="{href}"><span class="dt">{dt}</span><span class="tt"><b>{t}</b>{tg}</span><span class="ds">{ds}</span><span class="ar" aria-hidden="true"></span></a></li>'


def stars_sec(cls=''):
    return f'<canvas class="st-cv {cls}" aria-hidden="true"></canvas>'


# ---------------- HOME ----------------
HERO_FB = ''.join(f'<path d="{smooth(p)}"/>' for p in [
    [(0, 520), (200, 470), (420, 500), (640, 380), (860, 250), (1010, 190), (1160, 270), (1340, 360), (1600, 330)],
    [(0, 590), (220, 540), (460, 570), (700, 470), (900, 380), (1040, 340), (1200, 400), (1400, 450), (1600, 430)],
    [(0, 660), (260, 620), (520, 650), (760, 580), (980, 520), (1180, 540), (1380, 570), (1600, 550)],
    [(0, 740), (300, 705), (600, 735), (880, 690), (1140, 700), (1400, 720), (1600, 700)],
    [(0, 820), (340, 800), (700, 822), (1050, 796), (1350, 815), (1600, 800)]])
BEATS = [
    ('Antes de haver associação', 'Um grupo de amigos', 'Todos os anos, na madrugada de 15 de agosto, subia de Alvoco ao Monte do Colcurinho para ver nascer o sol. A caminhada é mais antiga do que a associação.'),
    ('Maio de 2022', 'Forma oficial', 'Aquilo que era apenas um grupo de amigos passa a ser a Associação Alvôco a Recordar, com sócios, assembleias e um plano de atividades.'),
    ('O ano inteiro', 'As tradições', 'As janeiras no Dia de Reis, a sardinhada no largo, a desfolhada, o magusto. Encontros simples, que ajudam a manter viva a memória da terra.'),
    ('Os mais velhos', 'As pessoas', 'Enchem-nos de histórias. Registamo-las nos Rostos Alvocenses e agradecemos, em vida, a quem as guarda.'),
    ('Hoje', 'O mesmo propósito', 'Preservar e valorizar o património imaterial de Alvoco das Várzeas, com todos os que têm caminhado connosco, na serra e na vida da aldeia.'),
]
NT_A = smooth([(0, 210), (170, 160), (320, 190), (480, 112), (640, 148), (790, 74), (900, 42), (1000, 70), (1120, 122), (1280, 104), (1440, 150)], 400)
NT_B = smooth([(0, 300), (200, 252), (380, 282), (560, 232), (740, 272), (920, 222), (1100, 262), (1280, 232), (1440, 262)], 400)

home = head('Alvôco a Recordar', 'Associação cultural de Alvoco das Várzeas, na Serra do Açor. Existe para preservar e valorizar o património imaterial da aldeia: as pessoas, as tradições e as memórias.', 'home', first=True) + f'''
<div class="ld" aria-hidden="true">
  <div class="ld-bg"></div>
  <div class="ld-logo">{LD_LOGO}</div>
  <div class="ld-b"><span>Alvoco das Várzeas, Serra do Açor</span><span class="od">{OD * 3}</span></div>
</div>
<main id="main" data-page="home" data-tema="claro">
<section class="hero nt-bg" data-tema="claro" aria-labelledby="h1">
  <div class="hero-bg" aria-hidden="true">
    <svg class="hero-fb" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">{HERO_FB}</svg>
    <canvas class="hero-gl"></canvas>
    <span class="hero-tag" data-tag="top"><i></i>Monte do Colcurinho</span>
    <span class="hero-tag" data-tag="base"><i></i>Ponte Medieval</span>
  </div>
  <div class="hero-in w">
    <p class="hero-k" data-r="fade">Associação cultural de Alvoco das Várzeas, Serra do Açor</p>
    <h1 class="d1" id="h1" data-r="lines">Continuamos cá,<br>juntos.</h1>
    <div class="hero-f">
      <p class="hero-p" data-r="fade">A Alvôco a Recordar existe para preservar e valorizar o património imaterial de Alvoco das Várzeas: as pessoas, as tradições e as memórias de uma aldeia da Serra do Açor.</p>
      <p class="hero-h" data-r="fade"><i></i><span class="d">Move o cursor para iluminar a serra.</span><span class="m">Toca para iluminar a serra.</span></p>
    </div>
  </div>
</section>

<section class="pn" aria-label="A Ponte Medieval">
  <figure class="pn-f" data-r="img"><img src="assets/img/ponte.webp" alt="A Ponte Medieval de Alvoco das Várzeas refletida na ribeira" width="1600" height="1067" data-px>
    <figcaption class="w"><span>Ponte Medieval de Alvoco das Várzeas</span><span>Ponto de encontro da Caminhada Noturna, todos os anos</span></figcaption></figure>
</section>

<section class="mani sec w" data-tema="" aria-labelledby="h-mn">
  <div class="g">
    <p class="lb mani-k" data-r="fade">Quem somos</p>
    <h2 class="big mani-t" id="h-mn" data-r="words">Aquilo que antes era apenas um grupo de amigos ganhou forma oficial em 2022. Juntamo-nos para recordar Alvoco, as pessoas e as tradições. Porque a memória é também identidade e orgulho coletivo.</h2>
    <div class="mani-f" data-r="fade"><p>Uma associação cultural sem fins lucrativos, feita por quem é de Alvoco das Várzeas e por quem a ela regressa.</p>{btn('sobre.html', 'Conhecer a associação', 'ol')}</div>
  </div>
</section>

<section class="tr dk" data-tema="claro" aria-labelledby="h-tr">
  <div class="tr-st">
    <div class="tr-track">
      <svg class="tr-svg" aria-hidden="true"><path class="tr-base"/><path class="tr-prog"/></svg>
      <span class="tr-lamp" aria-hidden="true"></span>
      <div class="tr-ti"><p class="lb">A história, em cinco passos</p><h2 class="d2" id="h-tr" data-r="lines">Como<br>chegámos<br>aqui</h2><p class="tr-sub" data-r="fade">Aquilo que antes era apenas um grupo de amigos ganhou forma oficial.</p></div>
      <div class="tr-lw"><span class="tr-v" aria-hidden="true"><i></i><b></b></span><ol class="tr-ls">
        {''.join(f'<li class="tr-b {"up" if i % 2 == 0 else "dn"}" style="--i:{i}"><i class="tr-d" aria-hidden="true"></i><div class="tr-t"><span class="k">{k}</span><h3 class="d3">{t}</h3><p>{p}</p></div></li>' for i, (k, t, p) in enumerate(BEATS))}
      </ol></div>
      <div class="tr-end">{btn('sobre.html', 'Ler a história toda', 'lt')}</div>
    </div>
  </div>
</section>

<section class="nt nt-bg" data-tema="claro" aria-labelledby="h-nt">
  <div class="nt-st">
    <canvas class="st-cv" aria-hidden="true"></canvas>
    <div class="nt-dawn" aria-hidden="true"></div>
    <svg class="nt-r" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path class="a" fill="#0f1a13" d="{NT_A}"/><path class="b" fill="#050a07" d="{NT_B}"/><path class="c" fill="#050a07" d="M889 44h22V30l-11-9-11 9z"/>
    </svg>
    <div class="nt-in w">
      <div><p class="lb">Madrugada de 15 de agosto</p><h2 class="d2" id="h-nt" data-r="lines">Caminhada<br>Noturna</h2></div>
      <div><div class="nt-clock" aria-hidden="true">02:00</div>
        <div class="nt-row"><div class="nt-tx"><p class="a">De volta à montanha. De volta à tradição. Saída da Ponte Medieval às duas da manhã, para cerca de nove quilómetros sempre a subir.</p><p class="b">O esforço é real, mas a recompensa também. Chega-se ao cume pelas seis, a tempo de ver nascer o sol.</p></div>{btn('caminhada.html', 'Ver a Caminhada', 'lt')}</div></div>
    </div>
  </div>
</section>

<section class="sec w" aria-labelledby="h-yr" data-tema="">
  <div class="g head"><div class="ti"><h2 class="d2 vv" id="h-yr" data-r="lines">O ano<br>em Alvoco</h2></div><div class="in" data-r="fade"><p>Há qualquer coisa nestes encontros difícil de explicar. Talvez seja o facto de, por umas horas, o tempo abrandar e as pessoas se lembrarem umas das outras.</p></div></div>
  <ul class="yr">{''.join(yrow(*y) for y in YEAR)}</ul>
  <div class="sec-a" data-r="fade">{btn('agenda.html', 'Ver a agenda', 'ol')}</div>
</section>

<section class="rs p2 sec" data-tema="" aria-labelledby="h-rs">
  <div class="w g head"><div class="ti"><h2 class="d2 vv" id="h-rs" data-r="lines">Rostos<br>Alvocenses</h2></div><div class="in" data-r="fade"><p>Alvoco é o que é por causa de quem cá viveu. Os Rostos Alvocenses registam essas pessoas num retrato e num texto: histórias esquecidas, ou até escondidas, por detrás de cada olhar.</p></div></div>
  <div class="rs-row" tabindex="0" aria-label="Rostos Alvocenses, desliza para ver mais"></div>
  <div class="w rs-f"><div class="rs-nav"><button type="button" class="rs-b" data-d="-1" aria-label="Anteriores"></button><button type="button" class="rs-b n" data-d="1" aria-label="Seguintes"></button></div>{btn('rostos.html', 'Ver todos os rostos')}</div>
</section>

<section class="ms nt-bg" data-tema="claro" aria-labelledby="h-ms">
  {stars_sec()}
  <button class="ms-star" type="button" aria-expanded="false" aria-controls="ms-l"><span class="sr">Mostrar o nome desta estrela</span><i></i></button>
  <div class="ms-l" id="ms-l"><b>Graça Brito</b><span>Sócia número 1, uma das fundadoras</span><a class="ul" href="graca.html">Em memória</a></div>
  <div class="ms-in w">
    <p class="lb" data-r="fade">Em memória</p>
    <h2 class="big" id="h-ms" data-r="words">Há presenças que continuam mesmo quando o tempo avança.</h2>
    <p class="ms-p" data-r="fade">Desde o início, trouxe consigo a vontade de preservar o que nos une: a memória, a amizade, o sentido de comunidade.</p>
    <p class="ms-h" data-r="fade"><span class="d">Neste céu há uma estrela mais acesa do que as outras.</span><span class="m">Toca na estrela mais acesa.</span></p>
  </div>
</section>
{JOIN}
</main>
''' + foot() + end(first=True)

# ---------------- SOBRE ----------------
def ch(cls, yr, h, txt, im=None, alt='', extra=''):
    p = f'<div class="ch-im" data-r="img"><div class="ph"><img src="assets/img/{im}.webp" alt="{alt}" loading="lazy" width="1600" height="1067"></div></div>' if im else ''
    x = f'<p>{extra}</p>' if extra else ''
    return f'<article class="ch {cls}" data-tema="{"claro" if "dk" in cls or "gr" in cls else ""}"><div class="ch-in w"><div class="ch-tx" data-r="list"><span class="ch-y">{yr}</span><h3>{h}</h3><p>{txt}</p>{x}</div>{p}</div></article>'

OG = ['Presidente da Direção|Emanuel Bento', 'Vice-presidente|', 'Secretário|', 'Tesoureiro|', 'Mesa da Assembleia Geral|', 'Conselho Fiscal|']
sobre = head('A associação, Alvôco a Recordar', 'Aquilo que antes era apenas um grupo de amigos ganhou forma oficial em 2022. A Alvôco a Recordar preserva e valoriza o património imaterial de Alvoco das Várzeas.', 'sobre') + f'''
<main id="main" data-page="sobre" data-tema="">
<section class="ph1 w" aria-labelledby="h1">
  <p class="lb" data-r="fade">Sobre nós</p>
  <h1 class="d1 vv" id="h1" data-r="lines">A associação</h1>
  <div class="g ph1-m"><p class="lede" data-r="fade">Aquilo que antes era apenas um grupo de amigos ganhou forma oficial em 2022. Continuamos unidos pelo mesmo propósito: preservar e valorizar o património imaterial de Alvoco das Várzeas.</p></div>
</section>
<section class="pn" aria-label="Alvoco das Várzeas">
  <figure class="pn-f sm" data-r="img"><img src="assets/img/aldeia.webp" alt="Alvoco das Várzeas, no vale da ribeira" width="1600" height="1067" data-px><figcaption class="w"><span>Alvoco das Várzeas</span><span>Oliveira do Hospital, Serra do Açor</span></figcaption></figure>
</section>
<section class="chs" aria-label="A história da associação">
  {ch('', '15.08', 'Antes de haver associação', 'Havia uma caminhada. Todos os anos, na madrugada de 15 de agosto, um grupo de amigos subia de Alvoco ao Monte do Colcurinho para ver nascer o sol. Em 2026 fez-se a décima quarta edição.', 'colcurinho', 'A capela no topo do Monte do Colcurinho ao nascer do sol')}
  {ch('p2', '2018', 'Rostos Alvocenses', 'O Emanuel Bento começa a fotografar e a ouvir os mais velhos da aldeia, para revelar a essência humana de cada rosto e contar histórias esquecidas, ou até escondidas, por detrás de cada olhar.', 'conceicao-pimentel', 'Conceição Lopes Pimentel, a São Pimentel', '<a class="lk" href="rostos.html">Ver os Rostos Alvocenses</a>')}
  {ch('', '2022', 'Forma oficial', 'Em maio, o grupo de amigos passa a ser a Associação Alvôco a Recordar. A Graça Brito, uma das fundadoras, é a sócia número 1.', 'almoco', 'Sócios à mesa, num almoço da associação', '<a class="lk" href="graca.html">Em memória de Graça Brito</a>')}
  {ch('gr', '2024', 'As tradições de volta ao largo', 'Janeiras no Dia de Reis, sardinhada pelos santos populares, desfolhada no CERCAV, magusto pelo São Martinho. Em abril, com a Junta de Freguesia, os Sons de Alvoco e o Centro de Documentação 25 de Abril, celebram-se os cinquenta anos da Revolução.', 'rua', 'Uma rua de Alvoco das Várzeas')}
  {ch('dk', '2025', 'Um ano difícil', 'No terceiro aniversário prestamos homenagem ao Sr. Acácio Mendes, que mantém viva a história que se canta de geração em geração. Dias depois, a Serra do Açor arde e a caminhada é cancelada. É impossível olhar para o horizonte e não sentir um aperto no peito.', 'acacio-mendes', 'Acácio Mendes')}
  {ch('p2', '2026', 'De volta à montanha', 'A XIV caminhada junta o maior grupo de sempre. No almoço do quarto aniversário, uma cassete antiga devolve-nos as Marchas Populares e as Festas do Rio. Ver várias gerações a apontar para o ecrã prova que a memória é também identidade e orgulho coletivo.', 'noite', 'A aldeia ao anoitecer')}
</section>
<section class="sec w dk" data-tema="claro" aria-labelledby="h-ac">
  <div class="g head"><div class="ti"><h2 class="d2" id="h-ac" data-r="lines">O que<br>fazemos</h2></div><div class="in" data-r="fade"><p>Encontros simples, mas cheios de significado, que ajudam a manter viva a memória da terra e das pessoas que a tornam especial.</p></div></div>
  <div class="g acts" data-r="list">{''.join(f'<article class="act-i"><span class="lb">{dt}</span><h3 class="d3">{t}</h3><p>{ds}</p></article>' for _, dt, t, ds in YEAR)}</div>
  <div class="sec-a" data-r="fade">{btn('agenda.html', 'Ver a agenda', 'ol')}</div>
</section>
<section class="sec w" aria-labelledby="h-og">
  <div class="g og-g">
    <div class="og-l"><h2 class="d2 vv" id="h-og" data-r="lines">Órgãos<br>sociais</h2><p data-r="fade">Estatutos, planos de atividades e contas estão na página de documentos.</p><div data-r="fade">{btn('documentos.html', 'Ver os documentos', 'ol')}</div></div>
    <dl class="og" data-r="list">{''.join(f'<div><dt>{a}</dt><dd{"" if b else " class=vz"}>{b or "A preencher"}</dd></div>' for a, b in (o.split('|') for o in OG))}</dl>
  </div>
</section>
{JOIN}
</main>
''' + foot() + end()

# ---------------- GRAÇA ----------------
graca = head('Em memória de Graça Brito, Alvôco a Recordar', 'Em memória de Graça Brito, sócia número 1 e uma das fundadoras da Associação Alvôco a Recordar.', 'graca') + f'''
<main id="main" data-page="graca" data-tema="claro">
<section class="gx nt-bg" data-tema="claro" aria-labelledby="h1">
  {stars_sec()}
  <span class="gx-star" aria-hidden="true"><i></i></span>
  <div class="gx-in w">
    <p class="lb" data-r="fade">Em memória</p>
    <h1 class="d2" id="h1" data-r="lines">Graça Brito</h1>
    <p class="gx-s" data-r="fade">Sócia número 1 e uma das fundadoras</p>
  </div>
</section>
<section class="sec w" aria-label="Homenagem" data-tema="">
  <div class="g gq">
    <p class="big" data-r="words">Há presenças que continuam mesmo quando o tempo avança.</p>
    <div class="prose" data-r="fade">
      <p>Uma mulher que vive com presença e sente com verdade. Há nela uma forma serena de estar no mundo, uma atenção rara às pessoas e às coisas simples.</p>
      <p>Gosta de falar com as pessoas na rua, de saber como estão, de ouvir as histórias que o tempo vai deixando. Cria laços, junta pessoas, transforma o que é comum em algo que fica.</p>
      <p>É sócia número 1 e uma das fundadoras do Alvôco a Recordar. Desde o início, trouxe consigo a vontade de preservar o que nos une: a memória, a amizade, o sentido de comunidade. Representa o que Alvoco tem de mais bonito: a proximidade, a autenticidade e a alegria simples de pertencer.</p>
      <p>Permanecerá, sempre, nas conversas, nas memórias e na ternura com que ensinou, sem o dizer, o que é viver com humanidade.</p>
      <p class="gq-e">Emanuel Bento</p>
    </div>
  </div>
</section>
<section class="sec w p2" aria-labelledby="h-m" data-tema="">
  <div class="g gm">
    <div class="gm-l" data-r="fade"><div class="gphoto">{MARK}<span>Fotografia, a escolher pela família</span></div></div>
    <div class="gm-r"><h2 class="d3" id="h-m" data-r="lines">Quem a conheceu</h2>
      <p data-r="fade">Esta página fica aberta a quem a conheceu. Uma fotografia, uma frase, um dia em Alvoco. O que nos enviares fica aqui guardado.</p>
      <div data-r="fade">{btn('contactos.html#memoria', 'Partilhar uma memória')}</div></div>
  </div>
</section>
</main>
''' + foot() + end()

# ---------------- ROSTOS ----------------
rostos = head('Rostos Alvocenses, Alvôco a Recordar', 'Rostos Alvocenses: uma fotografia e um texto por pessoa, para homenagear em vida quem fez Alvoco das Várzeas. Série de Emanuel Bento, iniciada em 2018.', 'rostos') + f'''
<main id="main" data-page="rostos" data-tema="">
<section class="ph1 w" aria-labelledby="h1">
  <p class="lb" data-r="fade">Uma homenagem em vida</p>
  <h1 class="d1 vv" id="h1" data-r="lines">Rostos<br>Alvocenses</h1>
  <div class="g ph1-m"><blockquote class="lede" data-r="fade">“Um projeto que iniciei em 2018 e que pretende revelar a essência humana de cada rosto. Conta histórias esquecidas, ou até escondidas, por detrás de cada olhar.”<footer>Emanuel Bento, autor da série, hoje continuada com a associação</footer></blockquote></div>
</section>
<section class="sec-b w">
  <div class="lib-bar" data-r="fade"><span class="lib-n lb"></span><div class="tog" role="group" aria-label="Vista"><button type="button" data-v="grid" aria-pressed="true">Grelha</button><button type="button" data-v="list" aria-pressed="false">Lista</button></div></div>
  <div class="shelf"></div>
  <p class="lib-c" data-r="fade">Conheces alguém que devia estar aqui? <a class="lk" href="contactos.html#memoria">Diz-nos quem</a>.</p>
</section>
</main>
''' + foot() + end()

rosto = head('Rostos Alvocenses', 'Um registo da série Rostos Alvocenses.', 'rosto') + '<main id="main" data-page="rosto" data-tema=""><div id="artigo"></div></main>' + foot() + end()

# ---------------- CAMINHADA ----------------

def _village():
    # Alvoco das Varzeas at night: a terraced cluster of houses on the shoulder above the river, the parish church tower,
    # lit windows and street lamps. Silhouettes share the colour of the ridge they stand on (r2), so they turn grey at dawn with it.
    houses = [(604,22,18,'r'),(624,18,24,'l'),(640,26,16,'r'),(664,20,26,'l'),(682,24,20,'r'),(704,18,30,'r'),(720,26,22,'l'),(744,22,18,'r'),(762,20,24,'l'),(780,18,16,'r')]
    g = lambda x: 690 - (x - 600) * .1
    d, win = [], []
    for i,(x,w,h,k) in enumerate(houses):
        b = g(x + w/2) + 3; t = b - h; r = 7 if w > 20 else 6
        d.append(f'M{x} 760V{t}l{w/2:.1f} -{r}l{w/2:.1f} {r}V760z')
        for j,(wx,wy) in enumerate([(x+4,t+5),(x+w-8,t+5),(x+w/2-1.5,t+12)]):
            if (i*3+j) % 4 != 1 and wy + 5 < b: win.append(f'<rect x="{wx:.1f}" y="{wy:.1f}" width="3" height="4"/>')
    # church: nave with a square tower and a short spire, slightly above the houses
    cx = 692; cb = g(cx) - 2
    d.append(f'M{cx} 760V{cb-14}l9 -6 9 6V760z M{cx+18} 760V{cb-40}l6 -12 6 12V760z')
    win.append(f'<rect x="{cx+22.5:.1f}" y="{cb-34:.1f}" width="3" height="5"/>')
    lamps = ''.join(f'<circle cx="{x}" cy="{g(x)+5:.1f}" r="1.8"/>' for x in (612,650,698,736,772))
    return (f'<path class="vil" fill="#070d0b" d="{" ".join(d)}"/>'
            f'<g class="lights" fill="#ffcf7a">{"".join(win)}{lamps}</g>')

def _chapel():
    # Capela da Senhora das Necessidades, side on: nave with a pitched roof, lower apse at the back,
    # bell gable with a cross at the front. The base goes into the ground and a patch of summit covers it.
    x, b = 966, 466
    nave = f'M{x} {b+6}V{b-17}l17 -9 17 9V{b+6}z'
    apse = f'M{x+34} {b+6}V{b-11}h9l3 4V{b+6}z'
    gable = f'M{x-4} {b+6}V{b-24}l6 -6 6 6V{b+6}z'
    cross = f'M{x+1.2} {b-29}h1.6v-9h-1.6z M{x-1} {b-35}h6v1.6h-6z'
    ground = f'M{x-34} {b+18}C{x-16} {b+4} {x-6} {b} {x+20} {b} S{x+56} {b+2} {x+84} {b+26}V{b+60}H{x-34}z'
    return (f'<path class="chp" fill="#050a08" d="{nave} {apse} {gable} {cross}"/>'
            f'<path class="r2c" fill="#070d0b" d="{ground}"/>')

r = lambda pts: smooth(pts, 900)
caminhada = head('Caminhada Noturna ao Colcurinho, Alvôco a Recordar', 'Da Ponte Medieval de Alvoco das Várzeas ao topo do Colcurinho, às duas da manhã, para ver o dia nascer. Na noite de 14 para 15 de agosto.', 'caminhada') + f'''
<main id="main" data-page="caminhada" data-tema="claro" data-cls="nt-bg">
<section class="ci w" aria-labelledby="h1">
  <p class="lb" data-r="fade">XV edição. Madrugada de 15 de agosto de 2027.</p>
  <h1 class="d1" id="h1" data-r="lines">Caminhada<br>Noturna ao<br><span class="v">Colcurinho</span></h1>
  <div class="ci-r" data-r="fade"><dl><div><dt>Encontro</dt><dd>Ponte Medieval, 01h30</dd></div><div><dt>Saída</dt><dd>02h00</dd></div><div><dt>Percurso</dt><dd>9 km</dd></div><div><dt>Chegada</dt><dd>Pelas 06h00</dd></div></dl>{btn('contactos.html#caminhada', 'Quero ir', 'lt')}</div>
</section>
<section class="cs" aria-label="A caminhada, da noite ao nascer do sol">
  <div class="cs-st">
    <div class="sky" aria-hidden="true"><i class="s0"></i><i class="s1"></i><i class="s2"></i><i class="s3"></i></div>
    <canvas class="cs-stars st-cv" aria-hidden="true"></canvas><div class="moon" aria-hidden="true"></div><div class="sun" aria-hidden="true"></div>
    <svg class="land" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path id="r4" fill="#0b1411" d="{r([(0,540),(140,500),(270,528),(410,452),(560,486),(700,418),(860,458),(1010,408),(1160,448),(1310,416),(1460,460),(1600,438)])}"/>
      <path id="r3" fill="#09110e" d="{r([(0,612),(170,568),(330,598),(480,540),(640,580),(780,522),(900,508),(1040,548),(1200,508),(1360,556),(1600,528)])}"/>
      <path id="r2" fill="#070d0b" d="{r([(0,760),(190,702),(370,728),(500,700),(620,688),(740,676),(850,590),(915,500),(952,468),(986,464),(1018,468),(1052,492),(1130,540),(1280,598),(1440,634),(1600,618)])}"/>
      <path id="r1" fill="#050a08" d="{r([(0,814),(180,786),(330,806),(480,780),(620,812),(780,792),(960,826),(1160,800),(1360,832),(1600,812)])}"/>
      <path id="r0" fill="#030605" d="{r([(0,862),(260,844),(520,858),(820,846),(1100,866),(1380,850),(1600,862)])}"/>
      {_village()}
      <path id="trail" d="M700 690C724 684 748 676 772 660S818 622 842 596 878 552 898 526 924 494 942 480 962 470 972 466" fill="none" stroke="#ffd38a" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round"/>
      <g class="lamps">{''.join('<circle class="walker" r="3.4" fill="#ffe2a6" opacity="0"/>' for _ in range(6))}</g>
      {_chapel()}
      <circle id="summit" cx="988" cy="418" r="1" fill="none"/>
    </svg>
    <div class="fog" style="top:58%" aria-hidden="true"></div><div class="fog" style="top:65%;left:-35%" aria-hidden="true"></div>
    <div class="cap-s">
      <div><span class="k">01h30, Ponte Medieval</span><h2 class="d2">Ponto de encontro</h2><p>Calçado confortável, agasalho e lanterna. A saída é às duas da manhã.</p></div>
      <div><span class="k">A subida</span><h2 class="d2">Nove quilómetros</h2><p>Sempre a subir. Uma imensa fila de lanternas a iluminar os trilhos.</p></div>
      <div><span class="k">Antes do amanhecer</span><h2 class="d2">O ar da serra</h2><p>Não perdoa ao amanhecer. Quem já foi leva agasalho, e o esforço esquece-se quando o céu começa a mudar.</p></div>
      <div><span class="k">Monte do Colcurinho, pelas 06h00</span><h2 class="d2">O sol nasce</h2><p>Por detrás do ponto mais alto de Portugal Continental. É daquelas memórias que ficam para a vida.</p></div>
    </div>
    <div class="hud w" aria-hidden="true"><div class="clk">02:00</div>
      <div class="prg"><span class="lb">Da Ponte Medieval ao Colcurinho</span><div class="bar"><i></i></div><div class="tk"><span class="on">Partida</span><span>Subida</span><span>Topo</span></div></div>
      <div class="km"><b>0,0</b> km<small>de 9 km</small></div></div>
  </div>
</section>
<section class="cinfo sec w pp" data-tema="" aria-labelledby="h-in">
  <div class="g"><div class="cinfo-l"><h2 class="d2 vv" id="h-in" data-r="lines">Antes<br>de subir</h2><div data-r="fade">{btn('contactos.html#caminhada', 'Quero ir')}</div></div>
    <dl data-r="list">
      <div><dt>Encontro</dt><dd>Junto à Ponte Medieval de Alvoco das Várzeas, por volta da 01h30. Saída às 02h00.</dd></div>
      <div><dt>Percurso</dt><dd>Cerca de 9 km sempre a subir, até ao topo do Monte do Colcurinho. É uma caminhada de esforço médio, não tanto pela extensão, mas pela subida.</dd></div>
      <div><dt>Chegada</dt><dd>Pelas 06h00, uns antes e outros depois, conforme o passo. O sol nasce pouco depois.</dd></div>
      <div><dt>Levar</dt><dd>Calçado confortável e resistente, agasalho e lanterna. O ar da serra não perdoa ao amanhecer.</dd></div>
      <div><dt>Inscrição</dt><dd>Por email, até dois dias antes. As vagas são limitadas: em 2026 esgotaram antes do prazo. O valor inclui seguro, reforço alimentar e pequeno-almoço.</dd></div>
      <div><dt>Regresso</dt><dd>A organização assegura o transporte de regresso a Alvoco das Várzeas.</dd></div>
    </dl></div>
</section>
<section class="chist sec-b w pp" data-tema="" aria-labelledby="h-cm">
  <div class="g">
    <figure class="ph" data-r="img"><img data-px src="assets/img/colcurinho.webp" alt="A capela no topo do Colcurinho ao nascer do sol" loading="lazy" width="780" height="285"></figure>
    <div class="tx" data-r="fade"><p class="lb">Monte do Colcurinho ao nascer do sol. Fotografia de Nuno Dias.</p></div>
    <div class="chist-t"><h2 class="d3 vv" id="h-cm" data-r="lines">Catorze edições</h2></div>
    <div class="chist-p prose" data-r="fade"><p>A caminhada é mais antiga do que a associação. Em 2025, com a Serra do Açor a arder, a segurança de todos ficou acima de qualquer evento e a décima quarta edição foi cancelada.</p><p>Em 2026 voltámos à montanha, com o maior grupo de sempre. Ver aquela imensa fila de lanternas a iluminar os trilhos e chegar ao topo sob o céu estrelado são imagens que ficam gravadas.</p></div>
    <blockquote data-r="words">Vem pela paisagem. Fica pelo ambiente. Volta pela experiência.</blockquote>
  </div>
</section>
</main>
''' + foot() + end()

# ---------------- AGENDA ----------------
AG_DAY = {'Dia de Reis': 6, 'Caminhada Noturna': 15}
def agrow(mo, dt, t, ds):
    day = f' data-day="{AG_DAY[t]}"' if t in AG_DAY else ''
    tba = '' if t in AG_DAY else ' <em>Data a anunciar</em>'
    lk = '<a class="lk" href="caminhada.html">Ver a Caminhada Noturna</a>' if t == 'Caminhada Noturna' else ''
    return f'<li class="ag-i" data-mo="{mo}"{day}><i class="ag-d" aria-hidden="true"></i><div class="ag-tx"><p class="ag-dt"><span>{dt} de 2027</span>{tba}</p><h3>{t}</h3><p class="ag-ds">{ds}</p>{lk}</div></li>'

agenda = head('Agenda, Alvôco a Recordar', 'As datas do ano em Alvoco das Várzeas: Dia de Reis, excursão, sardinhada, almoço da associação, Caminhada Noturna, desfolhada e magusto.', 'agenda') + f'''
<main id="main" data-page="agenda" data-tema="">
<section class="ph1 w" aria-labelledby="h1">
  <p class="lb" data-r="fade">O ano em Alvoco</p>
  <h1 class="d1 vv" id="h1" data-r="lines">Agenda</h1>
  <div class="g ph1-m ag-m"><p class="lede" data-r="fade">Sete encontros marcam o ano em Alvoco das Várzeas. Uns têm dia certo há muito tempo, os outros são anunciados com antecedência.</p>
    <div class="ag-nx" data-r="fade"><p class="lb">A seguir</p><p class="ag-nx-t">Dia de Reis</p><p class="ag-nx-d">6 de janeiro de 2027</p></div></div>
</section>
<section class="ag dk" data-tema="claro" aria-labelledby="h-px">
  <div class="w g ag-g">
    <div class="ag-s"><h2 class="d2" id="h-px" data-r="lines">Os próximos<br>encontros</h2>
      <p class="ag-sp" data-r="fade">As datas certas são anunciadas aqui e no <a class="lk" href="https://www.facebook.com/alvocoarecordar" target="_blank" rel="noopener">Facebook da associação</a>. As Assembleias Gerais são convocadas pelos mesmos meios.</p></div>
    <div class="ag-l"><span class="ag-v" aria-hidden="true"><i></i><b></b></span>
      <ol class="ag-ls">{''.join(agrow(mo, dt, t, ds) for mo, dt, t, ds in YEAR)}</ol></div>
  </div>
</section>
</main>
''' + foot() + end()

# ---------------- CONTACTOS ----------------
chips = ['Dúvida', 'Caminhada Noturna', 'Sócios e quotas', 'Partilhar uma memória']
contactos = head('Contactos, Alvôco a Recordar', 'Fala com a Associação Alvôco a Recordar: dúvidas, inscrições na Caminhada Noturna, sócios, ou fotografias antigas de Alvoco das Várzeas.', 'contactos') + f'''
<main id="main" data-page="contactos" data-tema="">
<section class="ph1 w" aria-labelledby="h1">
  <p class="lb" data-r="fade">Contactos</p>
  <h1 class="d1 vv" id="h1" data-r="lines">Fala<br>connosco</h1>
  <div class="g ph1-m"><p class="lede" data-r="fade">Dúvidas, inscrições, fotografias antigas, histórias da aldeia. Respondemos por email.</p></div>
</section>
<section class="sec-b w"><div class="g kc">
  <aside>
    <div class="mp dk" data-r="fade">
      {mapsvg()}
      <div class="mp-f"><div><span class="lb">Sede</span><p>Alvoco das Várzeas<br>Oliveira do Hospital</p><p class="mp-co">{COORD}</p></div>{btn(MAPS, 'Abrir no Google Maps', 'lt sm', ' target="_blank" rel="noopener"')}</div>
    </div>
    <div class="kc-i" data-r="fade"><span class="lb">Email</span><p class="sel">{MAIL}</p><button class="copy" type="button" data-copy="{MAIL}">Copiar email</button></div>
    <div class="kc-i" data-r="fade"><span class="lb">Seguir</span><p><a class="ul" href="https://www.facebook.com/alvocoarecordar" target="_blank" rel="noopener">Facebook</a>, <a class="ul" href="https://www.instagram.com/alvocoarecordar" target="_blank" rel="noopener">Instagram</a></p></div>
    <div class="kc-i" data-r="fade"><span class="lb">Sócios</span><p>O pedido de sócio faz-se num formulário próprio.</p>{sbtn('Quero ser sócio', 'ol sm')}</div>
  </aside>
  <form id="form" class="fm" novalidate data-r="fade">
    <fieldset class="fl full fs0"><legend class="lg">Sobre o que queres falar?</legend>
      <div class="chips">{''.join(f'<label><input type="radio" name="assunto" value="{c}"{" checked" if i == 0 else ""}><span>{c}</span></label>' for i, c in enumerate(chips))}</div></fieldset>
    {fl('c-nome', 'Nome', 'req', ac='name')}{fl('c-email', 'Email', 'email', 'email', 'email', extra=' inputmode="email"')}
    <div class="fl full"><label for="c-msg">Mensagem</label><textarea id="c-msg" name="mensagem" data-v="req" rows="4"></textarea><span class="bl"></span><span class="er" aria-live="polite"></span></div>
    <div class="fl full mem-x" hidden><span class="lab">Fotografias <em>opcional</em></span><label class="drop"><input type="file" accept="image/*" multiple aria-label="Adicionar fotografias"><p><b>Arrasta as fotografias para aqui</b><br>ou toca para escolher. Diz-nos na mensagem quem aparece e de que ano são.</p></label><div class="thumbs"></div></div>
    <div class="fl full fm-s"><button class="btn" type="submit">Enviar mensagem</button><p class="sent" role="status"></p></div>
    <p class="fm-n full">Usamos o teu nome e o teu email só para te responder. Mais na <a class="lk" href="privacidade.html">Política de Privacidade</a>.</p>
  </form>
</div></section>
</main>
''' + foot() + end()

# ---------------- DOCUMENTOS ----------------
DOCS = [
    ('A associação', [('Estatutos', 'O documento que nos fundou, em 2022.', 'Por publicar'), ('Ficha de inscrição de sócio', 'Para quem prefere preencher em papel e entregar em mão.', 'Por publicar')]),
    ('Planos e contas', [('Plano de atividades de 2027', 'O que a Assembleia Geral aprovou para o ano.', 'Por publicar'), ('Relatório de atividades e contas de 2026', 'O que fizemos e quanto custou.', 'Por publicar')]),
    ('Assembleias', [('Convocatórias', 'A data, a hora e a ordem de trabalhos de cada Assembleia Geral.', 'Por publicar'), ('Atas', 'Têm nomes e decisões de quem lá esteve. Ficam para os sócios.', 'Só para sócios')]),
]
documentos = head('Documentos, Alvôco a Recordar', 'Estatutos, planos de atividades, contas e convocatórias da Associação Alvôco a Recordar.', 'documentos') + f'''
<main id="main" data-page="documentos" data-tema="">
<section class="ph1 w" aria-labelledby="h1">
  <p class="lb" data-r="fade">A associação por dentro</p>
  <h1 class="d1 vv" id="h1" data-r="lines">Documentos</h1>
  <div class="g ph1-m"><p class="lede" data-r="fade">O que uma associação decide deve poder ser lido por quem faz parte dela. Vamos publicando aqui o que for sendo aprovado.</p></div>
</section>
<section class="sec-b w">
  {''.join(f'<div class="dc g" data-r="fade"><h2 class="dc-h">{h}</h2><ul class="dc-l">' + ''.join(f'<li class="{"lock" if s.startswith("Só") else ""}"><span class="dc-t"><b>{t}</b><span>{d}</span></span><span class="dc-s">{s}</span></li>' for t, d, s in items) + '</ul></div>' for h, items in DOCS)}
  <p class="lb dc-n" data-r="fade">És sócio e precisas de uma ata? <a class="lk" href="contactos.html#socios">Pede-nos por email</a>.</p>
</section>
</main>
''' + foot() + end()

# ---------------- LEGAL ----------------
def legal(page, title, desc, h1, lede, secs, note):
    toc = ''.join(f'<li><a href="#s{i + 1}">{t}</a></li>' for i, (t, _) in enumerate(secs))
    body = ''.join(f'<section id="s{i + 1}"><h2>{t}</h2>{b}</section>' for i, (t, b) in enumerate(secs))
    return head(title, desc, page) + f'''
<main id="main" data-page="{page}" data-tema="">
<section class="ph1 w lg1" aria-labelledby="h1">
  <p class="lb" data-r="fade">Atualizado em novembro de 2026</p>
  <h1 class="d2 vv" id="h1" data-r="lines">{h1}</h1>
  <div class="g ph1-m"><p class="lede" data-r="fade">{lede}</p></div>
</section>
<section class="sec-b w"><div class="g lgl">
  <nav class="lgl-n" aria-label="Nesta página" data-r="fade"><ol>{toc}</ol></nav>
  <div class="lgl-b prose" data-r="fade">{body}<p class="lgl-x">{note}</p></div>
</div></section>
</main>
''' + foot() + end()

FILL = '<mark>a preencher</mark>'
privacidade = legal('privacidade', 'Política de Privacidade, Alvôco a Recordar', 'Como a Associação Alvôco a Recordar trata os dados pessoais de sócios, participantes e visitantes do site.', 'Política de<br>Privacidade',
    'Pedimos poucos dados e usamos cada um para uma coisa só. Aqui fica dito, sem letra pequena, o que guardamos, porquê e durante quanto tempo.', [
    ('Quem trata os teus dados', f'<p>A Associação Alvôco a Recordar, associação cultural sem fins lucrativos com sede em Alvoco das Várzeas, concelho de Oliveira do Hospital. NIPC {FILL}.</p><p>Para qualquer assunto sobre os teus dados, escreve para <span class="sel">{MAIL}</span>.</p>'),
    ('Que dados pedimos e para quê', '''<div class="tbl"><table><thead><tr><th>Quando</th><th>Dados</th><th>Para quê</th><th>Com que fundamento</th></tr></thead><tbody>
      <tr><td>Pedes para ser sócio</td><td>Nome, data de nascimento, naturalidade, morada, código postal, localidade, email, telemóvel. NIF só se o quiseres dar.</td><td>Decidir a admissão, manter o registo de sócios, cobrar quotas, convocar para as assembleias e avisar das atividades.</td><td>A relação de sócio que pedes para ter connosco (artigo 6.º, n.º 1, alínea b) do RGPD) e as obrigações legais da associação (alínea c).</td></tr>
      <tr><td>Escreves pelo formulário de contacto</td><td>Nome, email e o que escreveres.</td><td>Responder-te.</td><td>O teu pedido (alínea b) e o nosso interesse legítimo em responder a quem nos procura (alínea f).</td></tr>
      <tr><td>Envias fotografias ou memórias</td><td>As imagens, o que nos contares e o teu nome.</td><td>Guardar no arquivo da associação e, se autorizares, publicar.</td><td>O teu consentimento (alínea a). Podes retirá-lo quando quiseres.</td></tr>
      <tr><td>Te inscreves numa atividade</td><td>Nome, contacto e os dados que o seguro exigir.</td><td>Organizar a atividade e fazer o seguro.</td><td>A inscrição que fizeste (alínea b).</td></tr>
      <tr><td>Apareces nos Rostos Alvocenses</td><td>Retrato, nome, alcunha e a história que nos contaste.</td><td>Publicar o teu registo na série.</td><td>O teu consentimento, ou o da tua família (alínea a).</td></tr>
    </tbody></table></div><p>Não pedimos o número do Cartão de Cidadão no site. Não é preciso para seres sócio.</p>'''),
    ('Durante quanto tempo', f'<ul><li>Dados de sócio: enquanto fores sócio. Depois de saíres, guardamos o mínimo que a lei exige para as contas da associação, até dez anos.</li><li>Pedidos de sócio que não avancem: seis meses.</li><li>Mensagens do formulário de contacto: um ano depois da última resposta.</li><li>Fotografias e memórias: enquanto o arquivo existir, ou até nos pedires para as retirar.</li></ul><p>Prazos propostos, {FILL} pela Direção.</p>'),
    ('Com quem os partilhamos', f'<p>Não vendemos nem cedemos dados a ninguém. Para o site e a gestão de sócios funcionarem, usamos serviços de outras empresas, que tratam os dados por nossa conta e só para isso: o alojamento do site, a base de dados dos sócios e o email. Alguns destes serviços guardam dados fora da União Europeia, ao abrigo dos mecanismos que o RGPD prevê para essas transferências. A lista dos serviços usados fica aqui: {FILL}.</p><p>Quando uma atividade tem seguro, comunicamos à seguradora os dados que ela exige.</p>'),
    ('Os teus direitos', f'<p>Podes pedir para ver os teus dados, corrigi-los, apagá-los, limitar o uso que lhes damos, opor-te a esse uso ou recebê-los num formato que possas levar contigo. Onde o tratamento depende do teu consentimento, podes retirá-lo a qualquer momento.</p><p>Basta escreveres para <span class="sel">{MAIL}</span>. Respondemos no prazo de um mês.</p><p>Se achares que não tratámos bem os teus dados, podes apresentar queixa à Comissão Nacional de Proteção de Dados, em <a class="lk" href="https://www.cnpd.pt" target="_blank" rel="noopener">cnpd.pt</a>.</p>'),
    ('Como os protegemos', '<p>O registo de sócios só é acessível aos membros da Direção que precisam dele. O site usa ligação cifrada e os formulários não guardam dados de pagamento, porque não há pagamentos no site.</p>'),
    ('Alterações', '<p>Se esta política mudar, a data no topo muda com ela. Mudanças importantes são comunicadas aos sócios por email.</p>'),
], 'Lei aplicável: Regulamento (UE) 2016/679 (RGPD) e Lei n.º 58/2019, de 8 de agosto.')

cookies = legal('cookies', 'Política de Cookies, Alvôco a Recordar', 'O site da Associação Alvôco a Recordar não usa cookies de publicidade nem de estatística. Só guarda no teu dispositivo o indispensável para funcionar.', 'Política<br>de Cookies',
    'Este site não te segue. Não tem publicidade nem ferramentas de estatística, e por isso não te pede para aceitares cookies.', [
    ('O que fica guardado no teu dispositivo', '''<p>Em vez de cookies, o site usa a memória do próprio navegador para três coisas pequenas. Nenhuma sai do teu dispositivo.</p><div class="tbl"><table><thead><tr><th>Nome</th><th>Para que serve</th><th>Quanto tempo fica</th></tr></thead><tbody>
      <tr><td>alv-seen</td><td>Lembrar que já viste a animação de entrada, para não a repetir.</td><td>Até fechares o separador.</td></tr>
      <tr><td>alv-socio</td><td>Guardar o que já escreveste no pedido de sócio, para não o perderes se mudares de página.</td><td>Até enviares o pedido ou fechares o separador.</td></tr>
      <tr><td>alv-vista</td><td>Lembrar se preferes ver os Rostos em grelha ou em lista.</td><td>Até a apagares no navegador.</td></tr>
    </tbody></table></div>'''),
    ('Porque não aparece nenhum aviso', '<p>A lei portuguesa só exige consentimento para guardar informação no teu dispositivo quando ela não é estritamente necessária ao serviço que pediste. O que este site guarda é só isso: o necessário para funcionar como esperas.</p><p>Se um dia quisermos saber quantas pessoas nos visitam com uma ferramenta que use cookies, pedimos-te autorização primeiro.</p>'),
    ('Serviços de fora', '<p>As ligações para o Facebook, o Instagram e o Google Maps são ligações simples. Esses sites só recebem dados teus se carregares nelas, e a partir daí valem as políticas deles.</p>'),
    ('Como apagar', '<p>Nas definições do teu navegador, procura por dados de sites ou armazenamento e apaga os deste site. Não perdes nada de importante: na visita seguinte volta tudo ao início.</p>'),
], 'Lei aplicável: artigo 5.º da Lei n.º 41/2004, de 18 de agosto, na redação da Lei n.º 46/2012, e RGPD.')

# ---------------- write ----------------
for f in ['socio.html', 'assets/site.css', 'assets/site.js']:
    if (R / f).exists(): (R / f).unlink()
PAGES = [('index.html', home), ('sobre.html', sobre), ('graca.html', graca), ('rostos.html', rostos), ('rosto.html', rosto), ('caminhada.html', caminhada),
         ('agenda.html', agenda), ('contactos.html', contactos), ('documentos.html', documentos), ('privacidade.html', privacidade), ('cookies.html', cookies)]
for n, h in PAGES:
    (R / n).write_text(h)
print('ok', len(PAGES), 'pages', sum(len(h) for _, h in PAGES) // 1024, 'KB')
