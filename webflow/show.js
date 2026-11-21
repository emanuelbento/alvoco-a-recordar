/* node show.js <fragment> [wrap] : prints a payload fragment ready to paste into a tool call (single-quoted attributes, no double quotes) */
const fs = require('fs'), P = __dirname + '/out/payload/', plan = JSON.parse(fs.readFileSync(P + 'plan.json', 'utf8'));
const [, , f, page] = process.argv;
let h = fs.readFileSync(P + f + '.html', 'utf8').replace(/="([^"']*)"/g, "='$1'"), c = fs.existsSync(P + f + '.css') ? fs.readFileSync(P + f + '.css', 'utf8') : '';
if (page) { const m = plan[page].main; h = `<main class='main-wrapper' id='main' data-page='${m['data-page']}' data-tema='${m['data-tema']}'${m['data-cls'] ? ` data-cls='${m['data-cls']}'` : ''}>` + h + '</main>'; }
if (/"/.test(h) || /\\/.test(h)) console.log('!! double quote or backslash left in html');
if (/"/.test(c)) console.log('!! double quote in css');
console.log(h + '\n\n' + c);
