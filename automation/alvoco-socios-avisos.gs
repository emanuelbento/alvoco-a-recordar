/**
 * Alvôco a Recordar: automatic emails to members, driven by the "Sócios" database in Notion.
 *
 * Lives in the same Apps Script project as alvoco-site-forms.gs (second file, "Avisos.gs"),
 * so it shares the Script properties, the member card and the Notion helper.
 *
 * The board only ticks boxes in Notion. Every hour this file checks the database and:
 *   1. Joia ticked, confirmation not sent yet  -> "A tua inscrição está ativa" (and Estado = Ativo)
 *   2. Joia not ticked, request 7 and 25 days old -> reminder; at 31 days the board gets a list
 *   3. Quota of the year not ticked: from 15 March a reminder, from 1 April a last notice
 *      (and Estado = Quota em atraso)
 *   4. Quota of the year ticked after a notice -> "Quota recebida" (and Estado back to Ativo)
 *
 * Each email is sent once: Notion keeps track in three columns that prepararAvisos() creates
 * ("Confirmação enviada", "Lembretes de joia", "Avisos de quota").
 *
 * Rules (approved by the board, change them here):
 *   joia within 30 days of the request; quota for the calendar year, paid by 31 March;
 *   whoever joins from 1 October has the next year covered by the joia.
 */

const JOIA_DIAS = 30;
const QUOTA = 5;
const QUOTA_LIMITE = { mes: 3, dia: 31 };   // 31 March
const QUOTA_AVISO = { mes: 3, dia: 15 };    // reminder from 15 March
const HORAS = [9, 20];                      // reminders only between 09:00 and 20:59; confirmations at any hour

/** Run once from the editor. Creates the Notion columns, marks what already happened, installs the hourly trigger. */
function prepararAvisos() {
  const ano = +Utilities.formatDate(new Date(), TZ, 'yyyy');
  const props = { 'Confirmação enviada': { checkbox: {} }, 'Lembretes de joia': { number: { format: 'number' } }, 'Avisos de quota': { rich_text: {} } };
  props['Quota ' + ano] = { checkbox: {} };
  props['Quota ' + (ano + 1)] = { checkbox: {} };
  notion('databases/' + P.getProperty('DB_SOCIOS'), { properties: props }, 'patch');

  // Members who already paid before the automation existed must not get a "welcome" now.
  let n = 0;
  socios().forEach(s => {
    const upd = {};
    if (s.joia && !s.confirmada) upd['Confirmação enviada'] = { checkbox: true };
    if (s.quota(ano) && !s.aviso.startsWith(ano + ':ok')) upd['Avisos de quota'] = rt(ano + ':ok');
    if (Object.keys(upd).length) { atualizar(s.id, upd); n++; }
  });

  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'avisos').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('avisos').timeBased().everyHours(1).create();
  console.log('Pronto. Registos marcados como já tratados: ' + n + '. Acionador de hora a hora instalado.');
}

/** The hourly job. Safe to run by hand: nothing is sent twice. */
function avisos() {
  const agora = new Date(), hora = +Utilities.formatDate(agora, TZ, 'H'), hoje_ = hoje();
  const ano = +hoje_.slice(0, 4), deHoras = hora >= HORAS[0] && hora <= HORAS[1];
  const expirados = [];
  socios().forEach(s => {
    if (!s.email || /Saiu|Sem efeito/.test(s.estado)) return;
    try {
      // 1. joia ticked: welcome
      if (s.joia && !s.confirmada) {
        enviar(s, emailAtivo(s));
        const upd = { 'Confirmação enviada': { checkbox: true }, 'Estado': { select: { name: 'Ativo' } } };
        if (!s.admissao) upd['Data de admissão'] = { date: { start: hoje_ } };
        atualizar(s.id, upd);
        return;
      }
      // 2. joia missing
      if (!s.joia && s.pedido) {
        const dias = diasDesde(s.pedido);
        if (dias >= JOIA_DIAS + 1 && s.lembretes < 3) { expirados.push(s); atualizar(s.id, { 'Lembretes de joia': { number: 3 } }); return; }
        if (!deHoras) return;
        if (dias >= JOIA_DIAS - 5 && s.lembretes < 2) { enviar(s, emailJoia(s, true)); atualizar(s.id, { 'Lembretes de joia': { number: 2 } }); return; }
        if (dias >= 7 && s.lembretes < 1) { enviar(s, emailJoia(s, false)); atualizar(s.id, { 'Lembretes de joia': { number: 1 } }); return; }
        return;
      }
      // 3 and 4. yearly quota, only for members whose joia does not cover this year
      if (!s.joia || cobertoPelaJoia(s, ano)) return;
      const etapa = s.aviso.startsWith(ano + ':') ? s.aviso.split(':')[1] : '';
      if (s.quota(ano)) {
        if (etapa !== 'ok') {
          if (etapa) enviar(s, emailQuotaRecebida(s, ano));   // thank only who was reminded; quiet otherwise
          const upd = { 'Avisos de quota': rt(ano + ':ok') };
          if (s.estado === 'Quota em atraso') upd['Estado'] = { select: { name: 'Ativo' } };
          atualizar(s.id, upd);
        }
        return;
      }
      if (!deHoras) return;
      const md = hoje_.slice(5), limite = pad(QUOTA_LIMITE.mes) + '-' + pad(QUOTA_LIMITE.dia), aviso = pad(QUOTA_AVISO.mes) + '-' + pad(QUOTA_AVISO.dia);
      if (md > limite && etapa !== 'atraso') {
        enviar(s, emailQuota(s, ano, true));
        atualizar(s.id, { 'Avisos de quota': rt(ano + ':atraso'), 'Estado': { select: { name: 'Quota em atraso' } } });
      } else if (md >= aviso && md <= limite && !etapa) {
        enviar(s, emailQuota(s, ano, false));
        atualizar(s.id, { 'Avisos de quota': rt(ano + ':aviso') });
      }
    } catch (err) { console.error('Sócio ' + s.numero + ': ' + err); }
  });
  if (expirados.length) {
    GmailApp.sendEmail(P.getProperty('EMAIL_DIRECAO'), 'Pedidos de sócio sem joia há mais de ' + JOIA_DIAS + ' dias',
      'Estes pedidos passaram o prazo da joia. Se não houver notícias, muda o Estado para "Sem efeito" no Notion (o número não volta a ser usado).\n\n' +
      expirados.map(s => 'N.º ' + s.numero + ': ' + s.nome + ' (' + s.email + '), pedido a ' + s.pedido).join('\n'), { name: NOME });
  }
  // Next year's quota column, ready before January
  if (hoje_.slice(5) >= '12-01') garantirColuna('Quota ' + (ano + 1));
}

/* ---------- emails ---------- */

function emailAtivo(s) {
  const prox = cobertoPelaJoia(s, anoAtual() + 1) ? anoAtual() + 2 : anoAtual() + 1;
  return molde(s, 'A tua inscrição no Alvôco a Recordar está ativa', [
    'Olá, ' + s.proprio + '.',
    'Recebemos a joia. A partir de hoje és sócio do Alvôco a Recordar, com o número <b>' + n3(s.numero) + '</b>.',
    'Boas-vindas à família. Vais receber notícias da Caminhada Noturna, dos almoços e de tudo o que fizermos em Alvoco.',
    'A próxima quota, de <b>' + QUOTA + ' €</b>, é a de ' + prox + ' e paga-se até 31 de março desse ano. Nós lembramos.'
  ], false);
}

function emailJoia(s, ultimo) {
  return molde(s, ultimo ? 'O teu pedido de sócio termina dentro de 5 dias' : 'Ainda falta a joia do Alvôco a Recordar', [
    'Olá, ' + s.proprio + '.',
    ultimo ? 'O teu pedido de sócio fica sem efeito se a joia não chegar nos próximos 5 dias. Se já pagaste, ignora este email: às vezes demora uns dias a chegar até nós.'
           : 'Recebemos o teu pedido de sócio há uma semana, mas ainda não chegou a joia. Se já pagaste, ignora este email.',
    'A joia é de <b>10 €</b>. Escolhe a forma que te der mais jeito:'
  ], true);
}

function emailQuota(s, ano, atraso) {
  return molde(s, atraso ? 'A quota de ' + ano + ' ficou por pagar' : 'A quota de ' + ano + ' paga-se até 31 de março', [
    'Olá, ' + s.proprio + '.',
    atraso ? 'O prazo da quota de ' + ano + ' acabou a 31 de março e ainda não temos a tua. Enquanto estiver em atraso não podes votar na Assembleia Geral. Se já pagaste, ignora este email.'
           : 'Está a chegar o fim do prazo da quota de ' + ano + ': <b>31 de março</b>. São <b>' + QUOTA + ' €</b> que pagam os seguros, as atividades e a memória que andamos a guardar.',
    'Escolhe a forma que te der mais jeito:'
  ], true);
}

function emailQuotaRecebida(s, ano) {
  return molde(s, 'Quota de ' + ano + ' recebida', [
    'Olá, ' + s.proprio + '.',
    'Recebemos a tua quota de ' + ano + '. Está tudo em dia.',
    'Obrigado por continuares a caminhar connosco.'
  ], false);
}

/** Same look as the welcome email: card, paragraphs, optional payment table, signature. */
function molde(s, assunto, paragrafos, comPagamento) {
  const p = t => '<p style="margin:0 0 16px">' + t + '</p>';
  const formas = formasPagamento();
  const tabela = '<table role="presentation" style="border-collapse:collapse;width:100%;margin:0 0 16px;border-top:1px solid #d6dccf">' +
    formas.map(([k, v]) => '<tr style="border-bottom:1px solid #d6dccf"><td style="padding:10px 16px 10px 0;vertical-align:top;font-weight:600;white-space:nowrap">' + k + '</td><td style="padding:10px 0;vertical-align:top">' + v + '</td></tr>').join('') + '</table>' +
    p('Coloca o teu número de sócio, <b>' + n3(s.numero) + '</b>, na descrição, para sabermos a quem pertence.');
  const html = '<div style="background:#eceee6;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#14201a;font-size:16px;line-height:1.55">' +
    '<div style="max-width:520px;margin:0 auto;background:#f6f8f3;padding:32px 28px">' + cartao(s.nome, s.numero) +
    paragrafos.map(p).join('') + (comPagamento ? tabela : '') +
    '<p style="margin:24px 0 0;font-size:14px;color:#4b5a50">' + NOME + '<br>Alvoco das Várzeas</p></div></div>';
  const semTags = t => t.replace(/<br>/g, ', ').replace(/<[^>]+>/g, '');
  const texto = paragrafos.map(semTags).join('\n\n') +
    (comPagamento ? '\n\n' + formas.map(([k, v]) => k + ': ' + semTags(v)).join('\n') + '\n\nColoca o teu número de sócio, ' + n3(s.numero) + ', na descrição, para sabermos a quem pertence.' : '') +
    '\n\n' + NOME + '\nAlvoco das Várzeas';
  return { assunto, texto, html };
}

function formasPagamento() {
  const mbway = clean(P.getProperty('MBWAY') || P.getProperty('MbWay') || P.getProperty('MB_WAY')), iban = clean(P.getProperty('IBAN'));
  const f = [];
  if (mbway) f.push(['MB WAY', mbway]);
  if (iban) f.push(['Transferência', iban + '<br>em nome da ' + NOME]);
  f.push(['Em mão', 'a qualquer pessoa da Direção, da próxima vez que estiveres em Alvoco']);
  return f;
}

function enviar(s, m) { GmailApp.sendEmail(s.email, m.assunto, m.texto, { name: NOME, htmlBody: m.html }); }

/** Sends every automatic email to the account running the script, with a sample member. Nothing changes in Notion. */
function testarAvisos() {
  const s = { nome: 'Teste Site', proprio: 'Teste', numero: 45, admissao: hoje() };
  const para = Session.getActiveUser().getEmail(), ano = anoAtual();
  [emailAtivo(s), emailJoia(s, false), emailJoia(s, true), emailQuota(s, ano, false), emailQuota(s, ano, true), emailQuotaRecebida(s, ano)]
    .forEach(m => GmailApp.sendEmail(para, '[teste] ' + m.assunto, m.texto, { name: NOME, htmlBody: m.html }));
}

/* ---------- Notion ---------- */

function socios() {
  const out = []; let cursor;
  do {
    const r = notion('databases/' + P.getProperty('DB_SOCIOS') + '/query', Object.assign({ page_size: 100, filter: { property: 'N.º de sócio', number: { is_not_empty: true } } }, cursor ? { start_cursor: cursor } : {}));
    r.results.forEach(pg => {
      const pr = pg.properties, nome = texto(pr['Nome completo']);
      out.push({
        id: pg.id, numero: pr['N.º de sócio'].number, nome, proprio: nome.split(' ')[0],
        email: clean(pr['Email'] && pr['Email'].email).toLowerCase(),
        estado: pr['Estado'] && pr['Estado'].select ? pr['Estado'].select.name : '',
        joia: !!(pr['Joia'] && pr['Joia'].checkbox),
        confirmada: !!(pr['Confirmação enviada'] && pr['Confirmação enviada'].checkbox),
        lembretes: (pr['Lembretes de joia'] && pr['Lembretes de joia'].number) || 0,
        aviso: texto(pr['Avisos de quota']),
        pedido: pr['Data do pedido'] && pr['Data do pedido'].date ? pr['Data do pedido'].date.start : '',
        admissao: pr['Data de admissão'] && pr['Data de admissão'].date ? pr['Data de admissão'].date.start : '',
        quota: ano => !!(pr['Quota ' + ano] && pr['Quota ' + ano].checkbox)
      });
    });
    cursor = r.has_more ? r.next_cursor : null;
  } while (cursor);
  return out;
}

function atualizar(id, properties) { notion('pages/' + id, { properties }, 'patch'); }

function garantirColuna(nome) {
  const db = notion('databases/' + P.getProperty('DB_SOCIOS'), null, 'get');
  if (!db.properties[nome]) notion('databases/' + P.getProperty('DB_SOCIOS'), { properties: { [nome]: { checkbox: {} } } }, 'patch');
}

/* ---------- small helpers ---------- */

const texto = pr => !pr ? '' : (pr.title || pr.rich_text || []).map(t => t.plain_text).join('').trim();
const rt = v => ({ rich_text: [{ text: { content: v } }] });
const pad = v => String(v).padStart(2, '0');
const n3 = v => String(v).padStart(3, '0');
const anoAtual = () => +Utilities.formatDate(new Date(), TZ, 'yyyy');
const diasDesde = iso => Math.floor((new Date(hoje() + 'T00:00:00Z') - new Date(iso.slice(0, 10) + 'T00:00:00Z')) / 864e5);

/** The joia pays the year of entry; from 1 October it also pays the next year. */
function cobertoPelaJoia(s, ano) {
  const d = s.admissao || s.pedido; if (!d) return false;
  const y = +d.slice(0, 4), md = d.slice(5, 10);
  return ano === y || (ano === y + 1 && md >= '10-01');
}
