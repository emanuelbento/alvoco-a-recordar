/**
 * Alvôco a Recordar: receipts for the joia and the yearly quota.
 *
 * Third file of the same Apps Script project ("Recibos.gs"). avisos() calls recibo() when the board
 * ticks Joia or Quota in Notion: the PDF goes attached to the email, a copy is kept in Google Drive
 * (folder "Recibos Alvôco a Recordar", one subfolder per year) and the receipt number is written
 * in the "Recibos" column in Notion.
 *
 * Numbering: one series per year, 2026/001, 2026/002, ... kept in the Script properties (RECIBO_SEQ_2026).
 * To continue a paper series, set RECIBO_SEQ_<year> to the last number already used.
 */

const ASSOCIACAO = {
  nome: 'Associação Alvôco a Recordar',
  nif: '516877470',
  morada: 'Avenida da Sobreira, 19',
  cp: '3400-302 Alvoco das Várzeas',
  assina: 'Laura Maria Gouveia Brito',
  cargo: 'A Tesoureira'
};
const JOIA = 10;
// The receipt number is drawn in Exo ExtraBold from one image per character: the PDF converter has no web fonts.
const GLIFOS = 'https://cdn.jsdelivr.net/gh/emanuelbento/alvoco-a-recordar@ac3667c2cffcb398316029a27a596d55475ff7bf/site/recibo/';
const GLIFO_LARGURA = { '0': 25.27, '1': 14.55, '2': 22.88, '3': 22.59, '4': 24.63, '5': 23.47, '6': 23.59, '7': 21.83, '8': 24.42, '9': 23.59, 'barra': 18.88, 'n': 53.83, 'espaco': 9.67 };

/**
 * Creates one receipt. tipo: 'joia' or 'quota'. ano: the quota year (for the joia, the year of entry).
 * sim: true for tests and simulations (number "TESTE", nothing saved, counter untouched).
 * Returns { numero, pdf, linha } where linha is the text for the Notion column.
 */
function recibo(s, tipo, ano, sim) {
  const data = hoje();
  const numero = sim ? 'TESTE' : proximoRecibo(+data.slice(0, 4));
  const valor = tipo === 'joia' ? JOIA : QUOTA;
  let referente;
  if (tipo === 'joia') {
    const anos = [ano]; if (cobertoPelaJoia(Object.assign({}, s, { admissao: s.admissao || data }), ano + 1)) anos.push(ano + 1);
    referente = 'Joia de inscrição, que inclui a quota de ' + anos.join(' e de ');
  } else referente = 'Quota anual de ' + ano;

  const html = reciboHtml({ numero, data, nome: s.nome, socio: n3(s.numero), nif: clean(s.nif), valor, referente });
  const pdf = Utilities.newBlob(html, 'text/html', 'recibo.html').getAs('application/pdf')
    .setName('Recibo ' + numero.replace('/', '-') + ' ' + n3(s.numero) + ' ' + s.nome + '.pdf');
  if (!sim) pastaRecibos(+data.slice(0, 4)).createFile(pdf);
  return { numero, pdf, linha: numero + ' ' + (tipo === 'joia' ? 'joia' : 'quota ' + ano) + ' (' + data.split('-').reverse().join('/') + ')' };
}

/** Called only from avisos(), which already holds the script lock, so two runs never take the same number. */
function proximoRecibo(ano) {
  const k = 'RECIBO_SEQ_' + ano, n = (+P.getProperty(k) || 0) + 1;
  P.setProperty(k, String(n));
  return ano + '/' + String(n).padStart(3, '0');
}

function pastaRecibos(ano) {
  const raiz = 'Recibos Alvôco a Recordar';
  const it = DriveApp.getFoldersByName(raiz), base = it.hasNext() ? it.next() : DriveApp.createFolder(raiz);
  const sub = base.getFoldersByName(String(ano));
  return sub.hasNext() ? sub.next() : base.createFolder(String(ano));
}

/** The logo as a data URI: the PDF converter does not fetch images from the web. Cached for 6 hours. */
function logoDataUri() {
  const c = CacheService.getScriptCache(), k = 'logo-recibo';
  const hit = c.get(k); if (hit) return hit;
  const b64 = Utilities.base64Encode(UrlFetchApp.fetch(IMG + 'email-logo.png').getContent());
  const uri = 'data:image/png;base64,' + b64;
  if (uri.length < 95000) c.put(k, uri, 21600);
  return uri;
}

function reciboHtml(r) {
  const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const euros = v => v.toFixed(2).replace('.', ',') + ' €';
  const dataLonga = d => { const m = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return +d.slice(8, 10) + ' de ' + m[+d.slice(5, 7) - 1] + ' de ' + d.slice(0, 4); };
  const lbl = 'font-size:9pt;color:#5b6a60;padding:0 0 2pt';
  const val = 'font-size:11pt;color:#14201a;padding:0 0 10pt';
  return '<html><head><meta charset="utf-8"><style>@page{size:A4;margin:22mm 20mm}body{font-family:Helvetica,Arial,sans-serif;color:#14201a}</style></head><body>' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
      '<td valign="top"><img src="' + logoDataUri() + '" width="150" style="width:150px"></td>' +
      '<td valign="top" align="right" style="font-size:9pt;line-height:1.5;color:#5b6a60">' + esc(ASSOCIACAO.nome) + '<br>NIF ' + ASSOCIACAO.nif + '<br>' + esc(ASSOCIACAO.morada) + '<br>' + esc(ASSOCIACAO.cp) + '</td>' +
    '</tr></table>' +
    '<div style="margin:34pt 0 4pt;font-size:9pt;color:#476949">Recibo</div>' +
    '<div style="margin:0 0 26pt;line-height:0">' + numeroExo(r.numero) + '</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1pt solid #c9d2c4;padding-top:12pt">' +
      '<tr><td width="50%" valign="top"><div style="' + lbl + '">Recebemos de</div><div style="' + val + '">' + esc(r.nome) + '</div></td>' +
      '<td width="25%" valign="top"><div style="' + lbl + '">Sócio n.º</div><div style="' + val + '">' + r.socio + '</div></td>' +
      '<td width="25%" valign="top"><div style="' + lbl + '">NIF</div><div style="' + val + '">' + (r.nif ? esc(r.nif) : '&nbsp;') + '</div></td></tr>' +
      '<tr><td colspan="3"><div style="' + lbl + '">Referente a</div><div style="' + val + '">' + esc(r.referente) + '</div></td></tr>' +
      '<tr><td colspan="2" valign="top"><div style="' + lbl + '">A quantia de</div><div style="' + val + '">' + extenso(r.valor) + '</div></td>' +
      '<td valign="top"><div style="' + lbl + '">Valor</div><div style="font-size:20pt;font-weight:bold;color:#14201a">' + euros(r.valor) + '</div></td></tr>' +
    '</table>' +
    '<div style="margin:26pt 0 0;font-size:10pt">Alvoco das Várzeas, ' + dataLonga(r.data) + '</div>' +
    (assinatura() ? '<div style="margin:30pt 0 2pt;line-height:0"><img src="' + assinatura() + '" width="260" style="width:260px;height:auto"></div>' : '<div style="height:40pt"></div>') +
    '<div style="margin:0;width:260px;border-top:1pt solid #14201a;padding-top:5pt;font-size:10pt">' + esc(ASSOCIACAO.cargo) + '<br>' + esc(ASSOCIACAO.assina) + '</div>' +
    (clean(P.getProperty('NOTA_RECIBO')) ? '<div style="margin:30pt 0 0;font-size:8pt;color:#5b6a60">' + esc(P.getProperty('NOTA_RECIBO')) + '</div>' : '') +
    '<div style="margin:16pt 0 0;font-size:8pt;color:#5b6a60">Documento emitido automaticamente pela ' + esc(ASSOCIACAO.nome) + '.</div>' +
    '</body></html>';
}

/** Whole euros in words, up to 999 999: "dez euros", "cinco euros", "vinte e cinco euros". */
function extenso(v) {
  const u = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
  const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = n => { if (n < 20) return u[n]; if (n < 100) return d[Math.floor(n / 10)] + (n % 10 ? ' e ' + u[n % 10] : '');
    if (n === 100) return 'cem'; return c[Math.floor(n / 100)] + (n % 100 ? ' e ' + ate999(n % 100) : ''); };
  const n = Math.round(v), mil = Math.floor(n / 1000), resto = n % 1000;
  const txt = (mil ? (mil === 1 ? 'mil' : ate999(mil) + ' mil') + (resto ? (resto < 100 || resto % 100 === 0 ? ' e ' : ' ') : '') : '') + (resto || !mil ? ate999(resto) : '');
  return txt + (n === 1 ? ' euro' : ' euros');
}

/** Sends you a sample of both receipts (number TESTE). Nothing is saved and the numbering does not move. */
function testarRecibo() {
  const s = { nome: 'Teste Site', proprio: 'Teste', numero: 45, nif: '', admissao: hoje() };
  const ano = anoAtual();
  const pasta = pastaRecibos(ano).getParents().next();   // creates the folder the first time, so the signature has somewhere to go
  console.log('Pasta dos recibos: ' + pasta.getUrl() + (assinatura() ? ' (assinatura encontrada)' : ' (ainda sem assinatura.png)'));
  const a = recibo(s, 'joia', ano, true), b = recibo(s, 'quota', ano + 1, true);
  GmailApp.sendEmail(Session.getActiveUser().getEmail(), '[teste] Recibos', 'Exemplos dos dois recibos, com o número TESTE.', { name: NOME, attachments: [a.pdf, b.pdf] });
}

/** "N.º 2026/001" as a row of Exo images. Anything that is not a digit or a slash (the TESTE number) falls back to text. */
function numeroExo(numero) {
  if (!/^\d{4}\/\d+$/.test(numero)) return '<span style="font-size:30pt;font-weight:bold;color:#476949;line-height:1.2">N.º ' + numero + '</span>';
  const alto = 46, chaves = ['n', 'espaco'].concat(numero.split('').map(c => c === '/' ? 'barra' : c));
  return chaves.map(k => '<img src="' + glifo(k) + '" height="' + alto + '" width="' + Math.round(GLIFO_LARGURA[k] * alto / 48) + '" style="height:' + alto + 'px;width:' + Math.round(GLIFO_LARGURA[k] * alto / 48) + 'px;vertical-align:bottom">').join('');
}

function glifo(k) {
  const c = CacheService.getScriptCache(), chave = 'glifo-' + k, hit = c.get(chave);
  if (hit) return hit;
  const uri = 'data:image/png;base64,' + Utilities.base64Encode(UrlFetchApp.fetch(GLIFOS + k + '.png').getContent());
  c.put(chave, uri, 21600);
  return uri;
}

/** The treasurer's own signature: a PNG or JPG named "assinatura" in the Drive folder "Recibos Alvôco a Recordar".
 *  If the file is not there, the receipt keeps the printed name under the line. */
function assinatura() {
  if (assinatura.uri !== undefined) return assinatura.uri;
  assinatura.uri = '';
  const it = DriveApp.getFoldersByName('Recibos Alvôco a Recordar'); if (!it.hasNext()) return '';
  const pasta = it.next();
  for (const nome of ['assinatura.png', 'assinatura.jpg', 'assinatura.jpeg']) {
    const f = pasta.getFilesByName(nome);
    if (f.hasNext()) { const b = f.next().getBlob(); assinatura.uri = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); break; }
  }
  return assinatura.uri;
}
