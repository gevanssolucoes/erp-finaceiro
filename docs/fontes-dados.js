// ===================== Gevans Dados · leitura de fontes (Excel, CSV, PDF, JSON de API, resultado de SQL)
// Módulo sem dependência do app: usado pelo Gevans Dados (dados.html) e pela tela Conexões de dados do Gestor.
// Toda fonte vira uma "tabela" {nome, cab:[...], linhas:[[...]]}; depois o usuário confere qual coluna é qual
// e normalizar() devolve as linhas no formato da base (tipo, competência, data de caixa, conta, grupo, valor, unidade).
window.FontesDados=(()=>{
const MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const r2=v=>Math.round(v*100)/100;
const CAMPOS=[
  ['tipo','Orçado ou realizado',/^(tipo|visao|cenario|base|orc.*real|real.*orc)/],
  ['competencia','Competência (mês)',/(compet|^mes|^data$|^data lanc|periodo|^data comp|^dt)/],
  ['pagamento','Data de pagamento ou recebimento (opcional)',/(pagto|pagamento|recebimento|^caixa|baixa|data caixa|liquida)/],
  ['codigo','Código da conta (opcional)',/(^cod|codigo|conta cod|cod conta)/],
  ['conta','Conta',/(^conta|descri|natureza|rubrica|categoria|plano|historico)/],
  ['grupo','Grupo da DRE (opcional)',/(grupo|^dre|classific)/],
  ['valor','Valor',/(valor|montante|total|^r\$|quantia|amount)/],
  ['empresa','Empresa ou unidade (opcional)',/(empresa|unidade|filial|loja)/],
];
const GRUPOS={receita_bruta:'Receita bruta',deducoes:'Deduções',custos:'Custos',despesas_operacionais:'Despesas operacionais',resultado_financeiro:'Resultado financeiro',outras:'Outras receitas e despesas',ir_csll:'IR e CSLL',nao_operacional:'Não operacional'};

function detectar(cab){const m={};const usado=new Set();
  CAMPOS.forEach(([c,,re])=>{const i=cab.findIndex((h,j)=>!usado.has(j)&&re.test(norm(h)));if(i>=0){m[c]=i;usado.add(i)}});return m}
function data(v){
  if(v==null||v==='')return null;
  if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+v*864e5);return d.toISOString().slice(0,10)}
  // datas lidas do CSV/Excel podem chegar como meia-noite UTC (no Brasil vira 21h do dia anterior): +12h acerta os dois casos
  if(v instanceof Date&&!isNaN(v)){const w=new Date(v.getTime()+432e5);return new Date(Date.UTC(w.getFullYear(),w.getMonth(),w.getDate())).toISOString().slice(0,10)}
  const t=norm(v);let m;
  if((m=t.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/)))return `${m[1]}-${m[2].padStart(2,'0')}-${(m[3]||'1').padStart(2,'0')}`;
  if((m=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)))return `${m[3].length===2?'20'+m[3]:m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if((m=t.match(/^(\d{1,2})\/(\d{4})$/)))return `${m[2]}-${m[1].padStart(2,'0')}-01`;
  if((m=t.match(/^([a-z]{3})[a-z]*[\/\-. ]?(?:de )?(\d{2,4})$/))){const i=MESES.indexOf(m[1]);if(i>=0)return `${m[2].length===2?'20'+m[2]:m[2]}-${String(i+1).padStart(2,'0')}-01`}
  return null}
function valor(v){if(typeof v==='number')return v;const t=String(v??'').replace(/[R$\s ]/g,'');if(!t)return NaN;
  const neg=/^\(.*\)$/.test(t)||t.startsWith('-')||/-$/.test(t)||/d$/i.test(t);const u=t.replace(/[()\-]|[cd]$/gi,'');
  const x=u.includes(',')?parseFloat(u.replace(/\./g,'').replace(',','.')):/^\d{1,3}(\.\d{3})+$/.test(u)?parseFloat(u.replace(/\./g,'')):parseFloat(u);return neg?-x:x}
function grupoDe(txt,v){const t=norm(txt);
  if(t){const k=Object.entries(GRUPOS).find(([id,n])=>norm(n)===t||id===t);if(k)return k[0];
    if(/dedu|imposto.*venda|tribut.*venda|devolu/.test(t))return 'deducoes';if(/receita|venda|fatur/.test(t)&&!/financ/.test(t))return 'receita_bruta';
    if(/custo|cmv|csp|mercador/.test(t))return 'custos';if(/financ|juro|tarifa/.test(t))return 'resultado_financeiro';if(/\bir\b|csll|irpj/.test(t))return 'ir_csll';
    if(/nao oper|outra/.test(t))return 'outras';if(/despesa|admin|comerc|pessoal|folha|oper/.test(t))return 'despesas_operacionais'}
  return v>=0?'receita_bruta':'despesas_operacionais'}
const ehReceita=g=>g==='receita_bruta';

// ---------- tabelas a partir das fontes
const semVazias=rows=>rows.filter(r=>r.some(x=>x!==''&&x!=null));
function tabelasDoLivro(wb){return wb.SheetNames.map(n=>({nome:n,...cabLinhas(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}))})).filter(t=>t.linhas.length)}
function cabLinhas(rows){rows=semVazias(rows);if(!rows.length)return {cab:[],linhas:[]};
  // cabeçalho = primeira linha com pelo menos 2 textos que não são número nem data, entre as 10 primeiras
  let h=rows.slice(0,10).findIndex(r=>r.filter(x=>typeof x==='string'&&x.trim()&&!isFinite(valor(x))&&!data(x)).length>=2);if(h<0)h=0;
  return {cab:rows[h].map((x,i)=>String(x??'').trim()||'Coluna '+(i+1)),linhas:rows.slice(h+1)}}
function achata(o,pre='',out={}){for(const [k,v] of Object.entries(o||{})){const n=pre?pre+'.'+k:k;if(v&&typeof v==='object'&&!Array.isArray(v)&&!(v instanceof Date))achata(v,n,out);else out[n]=Array.isArray(v)?JSON.stringify(v):v}return out}
function tabelaDeObjetos(arr,nome='Dados'){const objs=arr.filter(x=>x&&typeof x==='object').map(x=>achata(x));const cab=[...new Set(objs.flatMap(Object.keys))];
  return {nome,cab,linhas:objs.map(o=>cab.map(c=>o[c]??''))}}
function tabelaDeTexto(txt,nome='Dados'){const t=String(txt||'').replace(/^﻿/,'').trim();
  if(/^[\[{]/.test(t)){let j;try{j=JSON.parse(t)}catch(e){throw new Error('O link devolveu um JSON inválido.')}
    if(!Array.isArray(j)){const k=['value','data','dados','items','itens','results','resultados','rows','linhas','records'].find(k=>Array.isArray(j[k]))||Object.keys(j).find(k=>Array.isArray(j[k]));
      if(!k)throw new Error('Não achei uma lista de registros no JSON.');j=j[k]}
    return tabelaDeObjetos(j,nome)}
  const wb=XLSX.read(t,{type:'string',raw:false});const ts=tabelasDoLivro(wb);if(!ts.length)throw new Error('Não achei linhas no conteúdo.');return {...ts[0],nome}}

let pdfPronto;
function pdfjs(){if(window.pdfjsLib)return Promise.resolve();if(pdfPronto)return pdfPronto;
  pdfPronto=new Promise((ok,erro)=>{const s=document.createElement('script');s.src='vendor/pdf.min.js';s.onload=()=>{pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';ok()};s.onerror=()=>{pdfPronto=null;erro(new Error('O leitor de PDF não carregou.'))};document.head.appendChild(s)});return pdfPronto}
// Tabela de PDF: junta os textos por linha (mesma altura), separa células por espaço e alinha as colunas pelo cabeçalho
async function tabelaDoPDF(buf,nome='PDF'){await pdfjs();const doc=await pdfjsLib.getDocument({data:buf}).promise;const rows=[];
  for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p);const tc=await pg.getTextContent();
    const its=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({x:i.transform[4],y:Math.round(i.transform[5]),w:i.width||i.str.length*4,s:i.str.trim()})).sort((a,b)=>b.y-a.y||a.x-b.x);
    let atual=null;for(const it of its){if(!atual||Math.abs(atual.y-it.y)>3){atual={y:it.y,its:[]};rows.push(atual)}atual.its.push(it)}}
  const cel=rows.map(r=>{r.its.sort((a,b)=>a.x-b.x);const cs=[];for(const it of r.its){const u=cs[cs.length-1];if(u&&it.x-(u.x+u.w)<5){u.s+=' '+it.s;u.w=it.x+it.w-u.x}else cs.push({...it})}return cs});
  const nTxt=cs=>cs.filter(c=>!isFinite(valor(c.s))&&!data(c.s)).length;
  let h=cel.findIndex(cs=>cs.length>=3&&nTxt(cs)===cs.length&&Object.keys(detectar(cs.map(c=>c.s))).length>=2);
  if(h<0)h=cel.reduce((b,cs,i)=>cs.length>(cel[b]?.length||0)?i:b,0);
  const cab=cel[h]||[];if(cab.length<2)throw new Error('Não achei uma tabela neste PDF. Se for imagem escaneada, exporte para Excel antes.');
  const centro=c=>c.x+c.w/2;const chave=cs=>cs.map(c=>c.s).join('|');const kc=chave(cab);
  const linhas=cel.slice(h+1).filter(cs=>cs.length>=2&&chave(cs)!==kc).map(cs=>{const l=Array(cab.length).fill('');
    cs.forEach(c=>{let b=0,d=1e9;cab.forEach((k,i)=>{const dd=Math.min(Math.abs(centro(k)-centro(c)),Math.abs(k.x-c.x),Math.abs(k.x+k.w-(c.x+c.w)));if(dd<d){d=dd;b=i}});l[b]=l[b]?l[b]+' '+c.s:c.s});return l});
  return {nome,cab:cab.map(c=>c.s),linhas}}

// arquivo do usuário → lista de tabelas (uma por aba no Excel)
async function lerArquivo(file){const buf=new Uint8Array(await file.arrayBuffer());const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(ext==='pdf'||file.type==='application/pdf')return [await tabelaDoPDF(buf,file.name)];
  if(ext==='json')return [tabelaDeTexto(new TextDecoder().decode(buf),file.name)];
  const wb=XLSX.read(buf,{type:'array',cellDates:true});return tabelasDoLivro(wb)}

// ---------- premissas (aba "Premissas": Conta | Prazos (dias) | Dia fixo | Entrada % | Compra antes (dias))
function lerPremissas(t){const P={};if(!t||!t.linhas.length)return P;const cab=t.cab.map(norm);
  const ic=cab.findIndex(h=>/conta|codigo/.test(h)),ip=cab.findIndex(h=>/prazo/.test(h)),id=cab.findIndex(h=>/dia/.test(h)&&!/prazo|antes/.test(h)),ie=cab.findIndex(h=>/entrada/.test(h)),ia=cab.findIndex(h=>/antes|anteced/.test(h));
  t.linhas.forEach(r=>{const c=norm(r[ic]);if(!c)return;P[c]={prazos:String(r[ip]??'').split(/[\/;, ]+/).map(Number).filter(x=>x>0),dia:+r[id]||null,entrada:+r[ie]||0,antes:+r[ia]||0}});return P}
function addDias(iso,d){const t=new Date(iso+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+d);return t.toISOString().slice(0,10)}
function vencDia(ano,mes0,dia){const ult=new Date(Date.UTC(ano,mes0+1,0)).getUTCDate();const d=new Date(Date.UTC(ano,mes0,Math.min(dia,ult)));while([0,6].includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)}
// mesma regra do Gestor (caixaDaLinha): base no dia 15 do mês da competência, menos a compra antecipada
function caixaDe(prem,c,comp,v){const p=prem&&(prem[norm(c.codigo)]||prem[norm(c.nome)]||prem[norm(c.codigo+' '+c.nome)]);const base=addDias(comp.slice(0,8)+'15',-(p?.antes||0));if(!p)return [{data:base,valor:v}];
  const out=[];let resto=v;if(p.entrada){const e=r2(v*p.entrada/100);out.push({data:base,valor:e});resto=r2(v-e)}
  if(p.dia){const d=new Date(base+'T12:00:00Z');out.push({data:vencDia(d.getUTCFullYear(),d.getUTCMonth()+1,p.dia),valor:resto})}
  else if(p.prazos.length){const q=p.prazos.length,parte=r2(resto/q);p.prazos.forEach((d,i)=>out.push({data:addDias(base,d),valor:i<q-1?parte:r2(resto-parte*(q-1))}))}
  else out.push({data:base,valor:resto});return out}

// ---------- tabela + mapa de colunas → linhas da base
function normalizar(t,m){const out=[],erros={semConta:0,semData:0,semValor:0,semTipo:0},contas={};
  t.linhas.forEach(r=>{const g=i=>i==null?'':r[i];
    const nome=String(g(m.conta)??'').trim(),cod=String(g(m.codigo)??'').trim();if(!nome&&!cod){erros.semConta++;return}
    const comp=data(g(m.competencia));if(!comp){erros.semData++;return}
    let v=valor(g(m.valor));if(!isFinite(v)||!v){erros.semValor++;return}
    const tt=norm(g(m.tipo));const tipo=m.tipo==null?'realizado':/orc|budget|plan|meta|previs|forecast/.test(tt)?'orcado':/real|actual|efet/.test(tt)?'realizado':null;if(!tipo){erros.semTipo++;return}
    const id=(cod?cod+' ':'')+nome;const gr=grupoDe(g(m.grupo),v);
    if(!contas[id])contas[id]={id,codigo:cod,nome:nome||cod,grupo_dre:gr,tipo:ehReceita(gr)?'receita':'despesa'};
    const c=contas[id];v=c.tipo==='receita'?Math.abs(v):-Math.abs(v);
    out.push({tipo,c,comp:comp.slice(0,8)+'01',pag:data(g(m.pagamento)),v:r2(v),emp:String(g(m.empresa)??'').trim()})});
  return {rows:out,erros,contas}}
// linhas gravadas (dados_linhas) → mesmo formato
function deLinhasSalvas(ls){const contas={};const rows=ls.map(l=>{const id=(l.conta_codigo?l.conta_codigo+' ':'')+l.conta_nome;
  if(!contas[id]){const g=l.grupo_dre||(+l.valor>=0?'receita_bruta':'despesas_operacionais');contas[id]={id,codigo:l.conta_codigo||'',nome:l.conta_nome,grupo_dre:g,tipo:ehReceita(g)?'receita':'despesa'}}
  return {tipo:l.tipo,c:contas[id],comp:l.competencia,pag:l.data_caixa,v:+l.valor,emp:l.unidade||''}});return {rows,contas}}
const paraGravar=(rows,base,emp)=>rows.map(r=>({base_id:base,empresa_id:emp,tipo:r.tipo,competencia:r.comp,data_caixa:r.pag||null,conta_codigo:r.c.codigo||null,conta_nome:r.c.nome,grupo_dre:r.c.grupo_dre,valor:r.v,unidade:r.emp||null}));

// ---------- linhas → D no formato do motor do Gestor (v3-bi.js), para usar as mesmas telas
function montarD(rows,ano,{prem,emp,textoSemOrc}={}){
  const B=window.V3BI,zeros=()=>Array(12).fill(0),INFO=B.INFO;Object.keys(INFO).forEach(x=>delete INFO[x]);
  const k=c=>{const id=(c.codigo?c.codigo+' ':'')+c.nome;if(!INFO[id])INFO[id]={codigo:c.codigo||'',nome:c.nome,grupo:c.grupo_dre||'_'};return id};
  const add=(M,c,m,v)=>{if(m<0||m>11||!v)return;const id=k(c);(M[id]=M[id]||zeros())[m]+=v};
  const RC={},RX={},AX={},OC={},OX={};let ultReal=-1,temOrc=false;
  const noAno=d=>d&&d.startsWith(String(ano));const mes=d=>+d.slice(5,7)-1;
  rows.filter(r=>!emp||r.emp===emp).forEach(r=>{const caixa=r.pag?[{data:r.pag,valor:r.v}]:caixaDe(prem,r.c,r.comp,r.v);
    if(r.tipo==='realizado'){if(noAno(r.comp)){add(RC,r.c,mes(r.comp),r.v);ultReal=Math.max(ultReal,mes(r.comp))}caixa.forEach(x=>{if(noAno(x.data))add(RX,r.c,mes(x.data),x.valor)})}
    else{if(noAno(r.comp)){add(OC,r.c,mes(r.comp),r.v);temOrc=true}caixa.forEach(x=>{if(noAno(x.data))add(OX,r.c,mes(x.data),x.valor)})}});
  const corte=ultReal+1;
  const ids=new Set([...Object.keys(RC),...Object.keys(RX),...Object.keys(OC),...Object.keys(OX)]);const FC={},FX={},GX={};
  ids.forEach(c=>{const rc=RC[c]||zeros(),rx=RX[c]||zeros(),oc=OC[c]||zeros(),ox=OX[c]||zeros();FC[c]=zeros();FX[c]=zeros();GX[c]=zeros();
    for(let m=0;m<12;m++){if(m<corte){FC[c][m]=rc[m];FX[c][m]=rx[m];continue}
      FC[c][m]=rc[m]+B.resto(oc[m],rc[m]);const g=B.resto(ox[m],rx[m]);GX[c][m]=g;FX[c][m]=rx[m]+g}});
  return {a:ano,corte,RC,RX,AX,OC,OX,FC,FX,GX,RCo:RC,RXo:RX,temOrc,temFc:false,nomes:temOrc?['orçado da base']:[],vers:[],parcial:null,
    textoSemOrc:textoSemOrc||'A base não tem linhas de orçado para '+ano+'. As visões Orçado e Orçado × Realizado ficam vazias.'}}
function anoPadrao(rows,hoje){const cont={};rows.filter(r=>r.tipo==='realizado').forEach(r=>{const a=+r.comp.slice(0,4);cont[a]=(cont[a]||0)+1});const anos=Object.keys(cont).map(Number);
  return anos.length?Math.max(...anos):(rows[0]?+rows[0].comp.slice(0,4):+String(hoje).slice(0,4))}

return {CAMPOS,GRUPOS,MESES,norm,data,valor,grupoDe,detectar,cabLinhas,tabelasDoLivro,tabelaDeObjetos,tabelaDeTexto,tabelaDoPDF,lerArquivo,
  lerPremissas,caixaDe,normalizar,deLinhasSalvas,paraGravar,montarD,anoPadrao}})();
