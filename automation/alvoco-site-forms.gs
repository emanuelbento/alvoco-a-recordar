/**
 * Alvôco a Recordar: site forms to Notion and email.
 *
 * Runs as a web app inside the association's Google account, so the emails
 * leave from the association's own Gmail. Nothing here holds a secret:
 * everything sensitive lives in Script properties.
 *
 * Script properties (Project settings > Script properties):
 *   NOTION_TOKEN     secret of the Notion internal integration
 *   DB_SOCIOS        id of the "Sócios" database
 *   DB_MENSAGENS     id of the "Mensagens do site" database
 *   EMAIL_DIRECAO    address that is told about every new member and message
 *   MBWAY            number for MB WAY payments (MbWay and MB_WAY also work) (leave empty if the board does not use it)
 *   IBAN             the association's IBAN
 *   TEXTO_PAGAMENTO  optional: replaces the payment block with a text of the board's own.
 *                    Script properties keep one line, so write it without line breaks.
 */
const P = PropertiesService.getScriptProperties();
const TZ = 'Europe/Lisbon';
const NOME = 'Associação Alvôco a Recordar';
// Images for the welcome email, in the public repository, served by jsDelivr at a fixed commit (email clients do not show SVG)
const IMG = 'https://cdn.jsdelivr.net/gh/emanuelbento/alvoco-a-recordar@cc64412d26cc75ea11a5009bd25b3c770ee6e7b0/site/';
const PAGAMENTOS = { 'MB WAY': 'MB WAY', 'Transferência bancária': 'Transferência bancária', 'Em mão, em Alvoco': 'Em mão', 'Em mão': 'Em mão' };
const ASSUNTOS = ['Dúvida', 'Caminhada Noturna', 'Sócios e quotas', 'Partilhar uma memória'];

function doPost(e) {
  let out;
  try {
    const d = JSON.parse((e.postData && e.postData.contents) || '{}');
    // "website" is a field people never see. Only bots fill it, and they get a quiet yes.
    if (clean(d.website)) return json({ ok: true });
    out = d.tipo === 'contacto' ? contacto(d) : socio(d);
  } catch (err) {
    console.error(err);
    out = { ok: false, erro: 'Não foi possível registar. Tenta de novo ou escreve-nos por email.' };
  }
  return json(out);
}

function socio(d) {
  // The site sends the full name in "nome". Older pages sent "nome" and "apelido" apart: both work.
  const completo = clean([d.nome, d.apelido].filter(Boolean).join(' ')), proprio = completo.split(' ')[0], email = clean(d.email).toLowerCase();
  if (completo.split(' ').length < 2 || !isEmail(email) || !d.declaro || !d.dados) return { ok: false, erro: 'Faltam dados obrigatórios.' };

  // One number per person: a second submit with the same email gets the number already given.
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  let numero, page;
  try {
    const dup = notion('databases/' + P.getProperty('DB_SOCIOS') + '/query', { page_size: 1, filter: { and: [{ property: 'Email', email: { equals: email } }, { property: 'Estado', select: { does_not_equal: 'Sem efeito' } }] } });
    if (dup.results.length) return { ok: true, numero: dup.results[0].properties['N.º de sócio'].number, repetido: true };

    numero = proximoNumero();
    page = notion('pages', { parent: { database_id: P.getProperty('DB_SOCIOS') }, properties: {
      'Nome completo': { title: [{ text: { content: completo } }] },
      'N.º de sócio': { number: numero },
      'Estado': { select: { name: 'Novo' } },
      'Origem': { select: { name: 'Site' } },
      'Data do pedido': { date: { start: hoje() } },
      'Email': { email: email },
      'Telemóvel': { phone_number: clean(d.telemovel) || null },
      'Data de nascimento': { date: nascimento(d) },
      'Natural de': txt(d.natural), 'Morada': txt(d.morada), 'Código postal': txt(d.cp), 'Localidade': txt(d.localidade),
      'País': txt(d.pais),
      'NIF': txt(d.nif),
      'Pagamento preferido': { select: PAGAMENTOS[clean(d.pagamento)] ? { name: PAGAMENTOS[clean(d.pagamento)] } : null },
      'Declaração aceite': { checkbox: true }, 'Consentimento de dados': { checkbox: true }
    } });
  } finally {
    lock.releaseLock();
  }

  // The record exists from here on. A mail failure must not turn a saved member into an error on the site.
  try {
    const m = boasVindas(proprio, numero, completo);
    GmailApp.sendEmail(email, m.assunto, m.texto, { name: NOME, htmlBody: m.html });
    GmailApp.sendEmail(P.getProperty('EMAIL_DIRECAO'), 'Novo sócio n.º ' + numero + ': ' + completo,
      completo + ' inscreveu-se no site e ficou com o n.º ' + numero + '.\n\nEmail: ' + email + '\nLocalidade: ' + clean(d.localidade) + '\nPagamento preferido: ' + clean(d.pagamento) +
      '\n\nRegisto no Notion: ' + page.url + '\n\nQuando o pagamento entrar, marca o visto em Joia e muda o estado para Ativo.',
      { name: NOME, replyTo: email });
  } catch (err) { console.error(err); }

  return { ok: true, numero: numero };
}

function contacto(d) {
  const nome = clean(d['c-nome'] || d.nome), email = clean(d['c-email'] || d.email).toLowerCase(), msg = String(d.mensagem || '').trim();
  if (!nome || !isEmail(email) || !msg) return { ok: false, erro: 'Faltam dados obrigatórios.' };
  const assunto = ASSUNTOS.indexOf(clean(d.assunto)) > -1 ? clean(d.assunto) : 'Dúvida';
  const page = notion('pages', { parent: { database_id: P.getProperty('DB_MENSAGENS') }, properties: {
    'Nome': { title: [{ text: { content: nome } }] },
    'Assunto': { select: { name: assunto } },
    'Email': { email: email },
    'Mensagem': txt(msg),
    'Data': { date: { start: hoje() } },
    'Estado': { select: { name: 'Por responder' } }
  } });
  try {
    GmailApp.sendEmail(P.getProperty('EMAIL_DIRECAO'), 'Mensagem do site: ' + assunto + ', de ' + nome,
      msg + '\n\n' + nome + '\n' + email + '\n\nRegisto no Notion: ' + page.url, { name: NOME, replyTo: email });
  } catch (err) { console.error(err); }
  return { ok: true };
}

/** The member card from the site, drawn with a table so it survives Gmail, Outlook and Apple Mail. Name and number are live text. */
function cartao(completo, numero) {
  const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const exo = "font-family:'Exo','Arial Black',Arial,sans-serif;font-weight:800";
  const small = 'font-size:11px;line-height:1.3;color:#c9d2c4';
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" background="' + IMG + 'email-card.jpg" ' +
    'style="max-width:464px;border-collapse:separate;border-radius:18px;background:#1b2a1f url(' + IMG + 'email-card.jpg) center / cover no-repeat;color:#f6f8f3;margin:0 0 32px">' +
    '<tr><td valign="top" style="padding:22px 0 0 24px"><img src="' + IMG + 'email-logo-white.png" width="96" alt="' + NOME + '" style="display:block;width:96px;height:auto;border:0"></td>' +
    '<td valign="top" align="right" style="padding:22px 24px 0 0;' + small + '">Cartão<br>de sócio</td></tr>' +
    '<tr><td colspan="2" style="padding:30px 24px 0"><div style="' + small + ';margin:0 0 6px">Sócio n.º</div>' +
    '<div style="' + exo + ';font-size:58px;line-height:.9;letter-spacing:-1px;color:#f6f8f3">' + String(numero).padStart(3, '0') + '</div></td></tr>' +
    '<tr><td valign="bottom" style="padding:30px 12px 22px 24px;' + exo + ';font-size:17px;line-height:1.1;text-transform:uppercase;color:#f6f8f3">' + esc(completo) + '</td>' +
    '<td valign="bottom" align="right" style="padding:30px 24px 22px 0;white-space:nowrap;' + small + '">Alvoco das<br>Várzeas</td></tr></table>';
}

/** Welcome email: plain text for old clients, HTML for everyone else. The payment block comes from Script properties. */
function boasVindas(proprio, numero, completo) {
  // MBWAY, MbWay or MB_WAY: the property name is forgiving, the value is what matters
  const mbway = clean(P.getProperty('MBWAY') || P.getProperty('MbWay') || P.getProperty('MB_WAY')), iban = clean(P.getProperty('IBAN')), livre = clean(P.getProperty('TEXTO_PAGAMENTO'));
  const formas = [];
  if (mbway) formas.push(['MB WAY', mbway]);
  if (iban) formas.push(['Transferência', iban + '<br>em nome da ' + NOME]);
  formas.push(['Em mão', 'a qualquer pessoa da Direção, da próxima vez que estiveres em Alvoco']);
  const esc = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const p = t => '<p style="margin:0 0 16px">' + t + '</p>';
  const linhas = formas.map(([k, v]) => '<tr><td style="padding:10px 16px 10px 0;vertical-align:top;font-weight:600;white-space:nowrap">' + k + '</td><td style="padding:10px 0;vertical-align:top">' + v + '</td></tr>').join('');
  const pagamento = livre ? p(esc(livre)) :
    p('Falta só a joia: <b>10 €</b> no ano em que entras, e a partir daí <b>5 €</b> por ano. Escolhe a forma que te der mais jeito:') +
    '<table role="presentation" style="border-collapse:collapse;width:100%;margin:0 0 16px;border-top:1px solid #d6dccf">' + linhas.replace(/<tr>/g, '<tr style="border-bottom:1px solid #d6dccf">') + '</table>' +
    p('Põe o teu número de sócio, <b>' + numero + '</b>, no descritivo, para sabermos de quem é.');
  const html = '<div style="background:#eceee6;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#14201a;font-size:16px;line-height:1.55">' +
    '<div style="max-width:520px;margin:0 auto;background:#f6f8f3;padding:32px 28px">' +
    cartao(completo, numero) +
    p('Olá, ' + esc(proprio) + '.') +
    p('Recebemos o teu pedido. O teu número de sócio é o <b>' + numero + '</b>. É teu a partir de hoje e não muda.') +
    pagamento +
    p('Quando o pagamento chegar, confirmamos por email.') +
    p('Obrigado por caminhares connosco, na serra e na vida da aldeia.') +
    '<p style="margin:24px 0 0;font-size:14px;color:#4b5a50">' + NOME + '<br>Alvoco das Várzeas</p></div></div>';
  const texto = 'Olá, ' + proprio + '.\n\nRecebemos o teu pedido. O teu número de sócio é o ' + numero + '. É teu a partir de hoje e não muda.\n\n' +
    (livre || ('Falta só a joia: 10 € no ano em que entras, e a partir daí 5 € por ano.\n\n' + formas.map(([k, v]) => k + ': ' + v.replace('<br>', ', ')).join('\n') +
    '\n\nPõe o teu número de sócio no descritivo, para sabermos de quem é.')) +
    '\n\nQuando o pagamento chegar, confirmamos por email.\n\nObrigado por caminhares connosco, na serra e na vida da aldeia.\n\n' + NOME + '\nAlvoco das Várzeas';
  return { assunto: 'O n.º ' + numero + ' da Alvôco a Recordar é teu', texto, html };
}

/** Run this from the editor to see the welcome email in your own inbox. No record in Notion. */
function testarEmail() {
  const m = boasVindas('Teste', 45, 'Teste Site');
  GmailApp.sendEmail(Session.getActiveUser().getEmail(), '[teste] ' + m.assunto, m.texto, { name: NOME, htmlBody: m.html });
}

/** The next member number: one more than the highest ever given. Numbers are never reused. */
function proximoNumero() {
  const r = notion('databases/' + P.getProperty('DB_SOCIOS') + '/query', { page_size: 1,
    filter: { property: 'N.º de sócio', number: { is_not_empty: true } },
    sorts: [{ property: 'N.º de sócio', direction: 'descending' }] });
  return (r.results.length ? r.results[0].properties['N.º de sócio'].number : 0) + 1;
}

/** Run this from the editor after filling the Script properties. It only reads: no record, no email. */
function testarLigacao() {
  console.log('Próximo número de sócio: ' + proximoNumero());
}

function notion(path, payload) {
  const res = UrlFetchApp.fetch('https://api.notion.com/v1/' + path, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + P.getProperty('NOTION_TOKEN'), 'Notion-Version': '2022-06-28' }, payload: JSON.stringify(payload) });
  const body = JSON.parse(res.getContentText());
  if (res.getResponseCode() >= 300) throw new Error('Notion ' + res.getResponseCode() + ': ' + (body.message || ''));
  return body;
}

function nascimento(d) {
  const y = +d.ano, m = +d.mes, day = +d.dia;
  if (!y || !m || !day) return null;
  const dt = new Date(Date.UTC(y, m - 1, day));
  if (dt.getUTCMonth() !== m - 1 || y < 1900 || dt > new Date()) return null;
  return { start: Utilities.formatDate(dt, 'UTC', 'yyyy-MM-dd') };
}

const hoje = () => Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
// Notion caps a rich text item at 2000 characters.
const txt = v => ({ rich_text: clean(v) ? [{ text: { content: String(v).trim().slice(0, 1900) } }] : [] });
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const json = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
