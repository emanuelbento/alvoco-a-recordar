// node inv.js : classes of the remaining pages that have no Client-First name yet
const fs=require('fs'),cheerio=require('cheerio'),M=require('./maps.js');
const SRC='/home/claude/alvoco2';const known=new Set([...Object.keys(M.G),...M.CTX.map(c=>c[0])]);
const pages=['sobre','rostos','rosto','caminhada','agenda','contactos','graca','documentos','privacidade','cookies'];
const inv={};
for(const p of pages){const $=cheerio.load(fs.readFileSync(`${SRC}/${p}.html`,'utf8'));
 $('main').find('[class]').addBack('[class]').each((i,el)=>{for(const c of $(el).attr('class').split(/\s+/)){if(!c||/^(on|open|in|gl|drag|ok|bad|over|lock|nx)$/.test(c))continue;if(M.G[c])continue;
  const par=($(el).parent().attr('class')||'').split(/\s+/)[0]||$(el).parent()[0].name;const k=c;inv[k]=inv[k]||{pages:new Set(),tags:new Set(),par:new Set(),txt:'',n:0};const o=inv[k];o.pages.add(p);o.tags.add(el.name);o.par.add(par);o.n++;if(!o.txt)o.txt=$(el).clone().children().remove().end().text().trim().slice(0,26);}});}
for(const [k,o] of Object.entries(inv))console.log(`${k} | ${[...o.pages].join(',')} | ${[...o.tags].join(',')} < ${[...o.par].slice(0,3).join(',')} | x${o.n} | ${o.txt}`);
