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
 *   TEXTO_PAGAMENTO  paragraph with the amount and how to pay, written by the board
 */
const P = PropertiesService.getScriptProperties();
const TZ = 'Europe/Lisbon';
const NOME = 'Associação Alvôco a Recordar';
const PAISES = ['Portugal', 'França', 'Suíça', 'Luxemburgo', 'Alemanha', 'Bélgica', 'Reino Unido', 'Espanha', 'Brasil', 'Canadá', 'Estados Unidos', 'Outro'];
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
  const nome = clean(d.nome), apelido = clean(d.apelido), email = clean(d.email).toLowerCase();
  if (!nome || !apelido || !isEmail(email) || !d.declaro || !d.dados) return { ok: false, erro: 'Faltam dados obrigatórios.' };

  // One number per person: a second submit with the same email gets the number already given.
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  let numero, page;
  try {
    const dup = notion('databases/' + P.getProperty('DB_SOCIOS') + '/query', { page_size: 1, filter: { and: [{ property: 'Email', email: { equals: email } }, { property: 'Estado', select: { does_not_equal: 'Sem efeito' } }] } });
    if (dup.results.length) return { ok: true, numero: dup.results[0].properties['N.º de sócio'].number, repetido: true };

    numero = proximoNumero();
    const pais = PAISES.indexOf(clean(d.pais)) > -1 ? clean(d.pais) : 'Outro';
    page = notion('pages', { parent: { database_id: P.getProperty('DB_SOCIOS') }, properties: {
      'Nome completo': { title: [{ text: { content: nome + ' ' + apelido } }] },
      'N.º de sócio': { number: numero },
      'Estado': { select: { name: 'Novo' } },
      'Origem': { select: { name: 'Site' } },
      'Data do pedido': { date: { start: hoje() } },
      'Email': { email: email },
      'Telemóvel': { phone_number: clean(d.telemovel) || null },
      'Data de nascimento': { date: nascimento(d) },
      'Natural de': txt(d.natural), 'Morada': txt(d.morada), 'Código postal': txt(d.cp), 'Localidade': txt(d.localidade),
      'País': { select: { name: pais } },
      'NIF': txt(d.nif),
      'Pagamento preferido': { select: PAGAMENTOS[clean(d.pagamento)] ? { name: PAGAMENTOS[clean(d.pagamento)] } : null },
      'Declaração aceite': { checkbox: true }, 'Consentimento de dados': { checkbox: true }
    } });
  } finally {
    lock.releaseLock();
  }

  // The record exists from here on. A mail failure must not turn a saved member into an error on the site.
  try {
    const pagar = P.getProperty('TEXTO_PAGAMENTO') || 'A Direção envia-te os dados para pagamento por email.';
    GmailApp.sendEmail(email, 'És o sócio n.º ' + numero + ' da Alvôco a Recordar',
      'Olá, ' + nome + '.\n\nRecebemos o teu pedido. O teu número de sócio é o ' + numero + '. É teu a partir de hoje e não muda.\n\n' + pagar +
      '\n\nQuando o pagamento chegar, confirmamos por email.\n\nObrigado por caminhares connosco, na serra e na vida da aldeia.\n\n' + NOME + '\nAlvoco das Várzeas',
      { name: NOME });
    GmailApp.sendEmail(P.getProperty('EMAIL_DIRECAO'), 'Novo sócio n.º ' + numero + ': ' + nome + ' ' + apelido,
      nome + ' ' + apelido + ' inscreveu-se no site e ficou com o n.º ' + numero + '.\n\nEmail: ' + email + '\nLocalidade: ' + clean(d.localidade) + '\nPagamento preferido: ' + clean(d.pagamento) +
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
