// ===================== Orçamento: grade de preenchimento (versão 3)
// - "Preencher automático" no começo de cada linha e na barra acima da tabela
// - os 12 meses cabem na tela sem rolar para o lado
// - despesas como % da receita bruta (impostos já vêm da configuração de Faturamento e impostos)
// - pessoa física: pergunta se o salário digitado é líquido ou bruto (bruto calcula INSS e IRRF sozinho)
// - receitas, despesas, resultado e margem sempre à vista enquanto preenche
// - preencher por competência ou por caixa
// - exportar a base para Excel e importar preenchida
// - gerar contas a pagar e a receber a partir do orçamento, perguntando de quem
(()=>{
if(typeof S==='undefined'||typeof vOrcamento!=='function')return;
IC.raio='<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>';
IC.excel='<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 13l4 5M13 13l-4 5"/>';
IC.importa='<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>';
IC.exporta='<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>';

const css=document.createElement('style');css.textContent=`
.orc-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:8px 0 12px}
.orc-kpis .tile{padding:10px 14px;gap:3px}.orc-kpis .tile .val{font-size:19px}
.orc-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:10px}
.orc-bar .grp{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.orc-bar .btn{padding:7px 12px;font-size:13px;display:inline-flex;gap:6px;align-items:center}
.orc-bar select{padding:7px 10px;font-size:13px}
.orc-wrap{max-height:calc(100vh - 110px);min-height:320px;overflow:auto;border:1px solid var(--line);border-radius:8px}
.orc-grade{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-size:12px;min-width:900px}
.orc-grade th,.orc-grade td{padding:4px 3px;border-bottom:1px solid var(--line);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.orc-grade thead th{position:sticky;top:0;z-index:2;background:var(--surface);font-size:10.5px;letter-spacing:.04em;padding:7px 3px}
.orc-grade th.n,.orc-grade td.n{text-align:right;font-variant-numeric:tabular-nums}
.orc-grade td.c-conta{padding-left:4px}
.orc-grade .c-conta .nm{vertical-align:middle}
.orc-grade td.c-conta.sub{padding-left:2px}
.orc-grade .c-pct{text-align:center}
.orc-grade input.cel{width:100%;min-width:0;font-family:var(--f-num);font-size:11.5px;letter-spacing:-.03em;padding:4px 2px;box-sizing:border-box;border:1px solid transparent;border-radius:3px;background:transparent;box-shadow:inset 0 -1px 0 var(--line)}
.orc-grade input.cel:hover{border-color:var(--line)}.orc-grade input.cel:focus{background:var(--surface);border-color:var(--accent);box-shadow:none}
.orc-grade input.pct{width:100%;font:inherit;font-size:11.5px;text-align:right;padding:3px 4px;border:1px dashed var(--line);border-radius:4px;background:var(--surface);color:var(--ink);box-sizing:border-box}
.orc-grade input.pct:not(:placeholder-shown){border-style:solid;border-color:var(--accent);background:var(--accent-soft)}
.orc-grade .calc{display:block;padding:4px 2px;font-family:var(--f-num);font-size:11.5px;letter-spacing:-.03em;color:var(--accent-ink);font-style:italic}
.orc-grade tr.grp-row td{font-size:10.5px}
.orc-grade tfoot{position:sticky;bottom:0;z-index:2}
.orc-grade tfoot td{background:var(--surface-2);font-weight:700;border-bottom:0}
.orc-grade tfoot tr:first-child td{border-top:2px solid var(--ink-3)}
.orc-grade tfoot tr.res td{font-size:12.5px}
.orc-fill{border:0;background:none;color:var(--accent);cursor:pointer;padding:1px 3px;margin-right:2px;border-radius:4px;vertical-align:middle;line-height:0}
.orc-fill:hover,.orc-fill:focus-visible{background:var(--accent-soft)}
.orc-tag{font-size:9.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;border-radius:3px;padding:1px 4px;margin-right:4px;vertical-align:1px;background:var(--accent-soft);color:var(--accent-ink);border:0;cursor:pointer}
.orc-tag.warn{background:var(--warn-soft);color:var(--warn)}
.orc-legenda{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink-2);margin-top:8px}
.orc-legenda i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.sheet.largo{width:min(1120px,100%)}.gc-tab{width:100%}.gc-tab td{vertical-align:middle;padding:5px 6px}.gc-tab .unit{display:inline;margin-left:6px}.gc-tab input[type=text],.gc-tab input[type=date],.gc-tab input.gv{width:100%;font:inherit;font-size:12.5px;padding:4px 6px;border:1px solid var(--line);border-radius:4px;background:var(--surface);color:var(--ink);box-sizing:border-box}
.gc-tab tr.ja td{color:var(--ink-3)}
@media (max-width:1100px){.orc-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;document.head.appendChild(css);

const MESN=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const f0=x=>x?num.format(Math.round(x)):'';
const fAbs=x=>x?num.format(Math.round(Math.abs(x))):'';
const pctTxt=x=>x==null||x===''?'':String(Math.round(x*100)/100).replace('.',',');
const chaveU=pred=>pred||'_';
const parDe=v=>(v&&v.parametros&&typeof v.parametros==='object')?v.parametros:{};
const RE_SAL=/SALARI|PRO.?LABORE|ORDENADO|REMUNERA|PROVENTO|HOLERITE/;
const ehPF=emp=>{const e=empresa(emp);return e?.tipo_pessoa==='pf'||soDig(e?.cnpj).length===11};
const versaoAtual=()=>(S.versoes?.[S.orcEmp]||[]).find(x=>x.id===S.orcVer);

// % padrão dos impostos: soma das alíquotas configuradas em Faturamento e impostos, por conta
function impostosPadrao(emp,cs){
  const out={};const imp=(S.impostos||[]).filter(i=>i.empresa_id===emp&&(!i.vigencia_fim||i.vigencia_fim>=HOJE));if(!imp.length)return out;
  const ded=cs.filter(c=>c.grupo_dre==='deducoes'&&!RE_SAL.test(norm(c.nome))&&!/INSS|IRRF/.test(norm(c.nome))),irc=cs.filter(c=>c.grupo_dre==='ir_csll');
  imp.forEach(i=>{const p=i.periodicidade==='trimestral'?(+i.aliquota)*((+i.presuncao||100)/100):+i.aliquota;if(!p)return;
    const alvo=cs.find(c=>c.id===i.conta_id)||(i.periodicidade==='trimestral'?irc[0]:ded[0]);if(!alvo)return;out[alvo.id]=r2((out[alvo.id]||0)+p)});
  return out;
}

// ---------- modelo da grade: valor de cada conta em cada mês, com % da receita e INSS/IRRF automáticos
function modelo(emp,v,M,corte,E){
  const cs=contasOrc(emp);
  const base=(c,m)=>{const k_=c.id+'|'+m;return k_ in E.vals?E.vals[k_]:(M[c.id]?.[m]||0)};
  let rec=cs.filter(c=>c.tipo==='receita'&&c.grupo_dre==='receita_bruta');if(!rec.length)rec=cs.filter(c=>c.tipo==='receita');
  const rb=m=>sum(rec.map(c=>base(c,m)));
  const pf=ehPF(emp);const brutos=pf?cs.filter(c=>c.tipo==='receita'&&E.pf[c.id]==='bruto'):[];
  let inssC=null,irC=null,sal=null;
  if(brutos.length){const des=cs.filter(c=>c.tipo==='despesa');inssC=des.find(c=>/INSS/.test(norm(c.nome)));irC=des.find(c=>/IRRF|IMPOSTO DE RENDA|IR SOBRE|IR RETIDO/.test(norm(c.nome)));
    sal=m=>{const b=sum(brutos.map(c=>base(c,m)));if(b<=0)return {i:0,r:0};const i=calcINSS(b).total;return {i,r:calcIR(b,i,0).total}}}
  const auto=c=>(inssC&&c.id===inssC.id)?'inss':(irC&&c.id===irC.id)?'ir':(E.pct[c.id]!=null&&c.tipo==='despesa')?'pct':null;
  const val=(c,m)=>{if(m<corte)return M[c.id]?.[m]||0;const a=auto(c);
    if(a==='inss')return -sal(m).i;if(a==='ir')return -sal(m).r;if(a==='pct')return -r2(Math.max(0,rb(m))*E.pct[c.id]/100);return base(c,m)};
  return {cs,rb,val,auto,inssC,irC,pf,rec};
}
function totais(md){
  const e=Array(12).fill(0),s=Array(12).fill(0);md.cs.forEach(c=>MESES.forEach((_,m)=>{const x=md.val(c,m);if(c.tipo==='receita')e[m]+=x;else s[m]+=x}));
  const r=e.map((x,m)=>x+s[m]);return {e,s,r};
}

// ---------- tela
async function abaEditar3(emp,v,ed){
  const ls=await linhasDe(v.id);const ps=S.predios.filter(p=>p.empresa_id===emp);
  if(S.orcPredio!=null&&S.orcPredio!=='*'&&S.orcPredio!==''&&!ps.some(p=>p.id===S.orcPredio))S.orcPredio=null;
  const pred=S.orcPredio??(ps.length&&ls.some(l=>l.predio_id)?'*':'');const M=matriz(ls,pred==='*'?undefined:pred);
  const corte=v.tipo==='forecast'?(v.mes_corte||0):0;
  const edita=ed&&!v.congelada&&pred!=='*';const P=parDe(v);
  if(!(S.orcEdit&&S.orcEdit.ver===v.id&&S.orcEdit.pred===pred)){
    const pctSalvo=P.pct?.[chaveU(pred)];
    S.orcEdit={ver:v.id,pred,vals:{},sujo:false,pct:{...(pctSalvo||{})},pf:{...(P.pf||{})},base:P.base==='caixa'?'caixa':'competencia',aviso:''};
    if(!pctSalvo&&edita){const imp=impostosPadrao(emp,contasOrc(emp));if(Object.keys(imp).length){Object.assign(S.orcEdit.pct,imp);S.orcEdit.pend=true;
      S.orcEdit.aviso=`Impostos calculados sozinhos pela configuração de <a href="#tributos">Faturamento e impostos</a> (${Object.entries(imp).map(([c,p])=>esc(conta(c)?.nome||'')+' '+pctTxt(p)+'%').join(', ')}). Confira e salve.`}}
  }
  const E=S.orcEdit;const md=modelo(emp,v,M,corte,E);S._orcMd={md,emp,v,M,corte,edita,pred};
  if(celular())return barraMobile(v,edita,pred)+editarCelular(v,md.cs,(c,m)=>md.val(c,m),edita,corte,pred,ps,ed);
  const T=totais(md);
  const hint=v.congelada?`Travado em ${dataBR(String(v.congelada_em||'').slice(0,10))}. Não pode mais ser alterado: para revisar, crie um forecast a partir dele. Dá para exportar e gerar contas a pagar e a receber.`
    :pred==='*'&&ed?'Visão consolidada, só leitura. Escolha uma unidade, ou “Sem unidade”, para preencher.'
    :`Digite valores positivos: o sinal vem do tipo da conta. Pode colar um bloco do Excel numa célula. Na coluna <b>% rec.</b> a despesa vira um percentual da receita bruta do mês.${corte?` Meses até ${MESES[corte-1]} trazem o realizado e ficam fixos.`:''}`;
  let rows='',grupo=null,ri=0;
  md.cs.forEach(c=>{
    if(c.grupo_dre!==grupo){grupo=c.grupo_dre;const g=grupo||'';const tg=MESES.map((_,m)=>sum(md.cs.filter(x=>(x.grupo_dre||'')===g).map(x=>md.val(x,m))));
      rows+=`<tr class="grp-row" data-g="${esc(g)}"><td class="c-conta">${esc(GRUPOS[grupo]||'Sem grupo da DRE')}</td><td></td>${tg.map((x,m)=>`<td class="n ${x<0?'neg':''}" data-gm="${esc(g)}|${m}">${f0(x)}</td>`).join('')}<td class="n ${sum(tg)<0?'neg':''}" data-gt="${esc(g)}">${f0(sum(tg))}</td></tr>`}
    const a=md.auto(c);const r=ri++;
    const tag=a==='inss'||a==='ir'?`<button class="orc-tag" data-acao="orc-pf" data-cid="${c.id}" title="Calculado pelo salário bruto">auto</button>`
      :md.pf&&c.tipo==='receita'&&E.pf[c.id]?`<button class="orc-tag ${E.pf[c.id]==='bruto'?'':'warn'}" data-acao="orc-pf" data-cid="${c.id}" title="Trocar líquido ou bruto">${E.pf[c.id]}</button>`:'';
    const pctCel=c.tipo==='despesa'&&!a?.match?.(/inss|ir/)?(edita?`<input class="pct" data-pct="${c.id}" inputmode="decimal" placeholder="%" value="${pctTxt(E.pct[c.id])}" aria-label="${esc(c.nome)} em % da receita" title="% da receita bruta">`:(E.pct[c.id]!=null?`<span class="muted">${pctTxt(E.pct[c.id])}%</span>`:'')):'';
    rows+=`<tr data-cid="${c.id}"><td class="c-conta sub" title="${esc(c.codigo)} ${esc(c.nome)}">${edita?`<button class="orc-fill" data-acao="orc-preencher" data-cid="${c.id}" title="Preencher automático: ${esc(c.nome)}" aria-label="Preencher automático ${esc(c.nome)}">${icone('raio',14)}</button>`:''}${tag}<span class="nm">${esc(c.codigo)} ${esc(c.nome)}</span></td>
      <td class="c-pct">${pctCel}</td>${MESES.map((_,m)=>{const x=md.val(c,m);const fixo=!edita||m<corte||a;
        return `<td class="n">${fixo?`<span class="${a&&m>=corte?'calc':m<corte?'muted':''}" data-v="${c.id}|${m}">${fAbs(x)}</span>`:`<input class="cel" data-cel="${c.id}|${m}" data-r="${r}" data-m="${m}" inputmode="decimal" value="${fAbs(x)}" aria-label="${esc(c.nome)} ${MESES[m]}">`}</td>`}).join('')}
      <td class="n" data-tot="${c.id}">${fAbs(sum(MESES.map((_,m)=>md.val(c,m))))}</td></tr>`});
  const te=sum(T.e),tr_=sum(T.r);const fl=(nm,key,arr,tot,fmt,cls='')=>`<tr class="${cls}"><td class="c-conta">${nm}</td><td></td>${arr.map((x,m)=>`<td class="n ${key!=='e'&&key!=='s'&&T.r[m]<0?'neg':''}" data-ft="${key}|${m}">${fmt(x,m)}</td>`).join('')}<td class="n ${key!=='e'&&key!=='s'&&tr_<0?'neg':''}" data-ft="${key}|t">${tot}</td></tr>`;
  const foot=`<tfoot>${fl('Receitas','e',T.e,f0(te),x=>f0(x))}${fl('Despesas','s',T.s,fAbs(sum(T.s)),x=>fAbs(x))}${fl('Resultado','r',T.r,f0(tr_)||'0',x=>f0(x)||'0','res')}${fl('Margem','p',T.r,te?pct(tr_/te):'–',(x,m)=>T.e[m]?pct(x/T.e[m]):'–')}</tfoot>`;
  const yy=String(v.ano).slice(2);
  const html=`<div class="orc-kpis" id="orcKpis">${kpis(T,v)}</div>
    ${E.aviso&&edita?`<div class="effect" style="margin-bottom:10px">${E.aviso}</div>`:''}
    <div class="orc-bar"><div class="grp">
      ${edita?`<button class="btn" data-acao="orc-preencher">${icone('raio',15)} Preencher automático</button>`:''}
      <button class="btn ghost" data-acao="orc-exportar" title="Baixar a base em Excel para preencher">${icone('exporta',15)} Exportar Excel</button>
      ${edita?`<button class="btn ghost" data-acao="orc-importar" title="Trazer a planilha preenchida">${icone('importa',15)} Importar Excel</button><input type="file" id="orcArq" accept=".xlsx,.xls,.csv" hidden>`:''}
      <button class="btn ghost" data-acao="orc-gerar-contas" title="Lançar em contas a pagar e a receber o que está orçado">${icone('contas',15)} Gerar contas a pagar/receber</button></div>
      <div class="grp">
      <div class="seg" role="group" aria-label="Preencher por">${[['competencia','Competência'],['caixa','Caixa']].map(([k_,n])=>`<button ${edita?`data-acao="orc-base" data-base="${k_}"`:'disabled'} class="${E.base===k_?'on':''}" aria-pressed="${E.base===k_}" title="${k_==='caixa'?'Os valores digitados são o que entra e sai do caixa em cada mês':'Os valores digitados são da competência; o caixa sai pelas premissas de prazo'}">${n}</button>`).join('')}</div>
      ${ps.length?`<select id="orcPredio" aria-label="Unidade"><option value="*" ${pred==='*'?'selected':''}>Todas as unidades</option><option value="" ${pred===''?'selected':''}>Sem unidade (empresa)</option>${ps.map(p=>`<option value="${p.id}" ${pred===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select>`:''}
      ${edita?`<button class="btn ghost" data-acao="excluir-versao" data-id="${v.id}" style="color:var(--bad)">Excluir</button><button class="btn ghost" data-acao="travar-versao" data-id="${v.id}">Travar</button><button class="btn" data-acao="salvar-orc" ${E.sujo||E.pend?'':'disabled'}>Salvar alterações</button>`:''}</div></div>
    <p class="hint" style="margin:0 0 8px">${hint} ${E.base==='caixa'?'<b>Preenchendo por caixa:</b> cada valor entra ou sai do caixa no próprio mês, sem as premissas de prazo.':''}</p>
    <div class="orc-wrap"><table class="orc-grade"><colgroup><col style="width:20%"><col style="width:46px">${MESES.map(()=>'<col>').join('')}<col style="width:76px"></colgroup>
    <thead><tr><th class="c-conta">Conta</th><th class="c-pct" title="% da receita bruta">% rec.</th>${MESES.map(m=>`<th class="n">${m}/${yy}</th>`).join('')}<th class="n">Total</th></tr></thead>
    <tbody>${rows}</tbody>${foot}</table></div>
    <div class="orc-legenda"><span><i style="background:var(--warn-soft);border:1px solid var(--warn)"></i>alterado, falta salvar</span><span><i style="background:var(--accent-soft);border:1px solid var(--accent)"></i>calculado pelo % da receita</span>${corte?'<span><i style="background:var(--surface-2)"></i>realizado (fixo)</span>':''}</div>`;
  return html;
}
function kpis(T,v){
  const e=sum(T.e),s=sum(T.s),r=sum(T.r);const pior=T.r.reduce((a,x,i)=>x<T.r[a]?i:a,0);const neg=T.r.filter(x=>x<0).length;
  return [[`Receitas ${v.ano}`,k(e),`média ${k(e/12)} por mês`],[`Despesas ${v.ano}`,k(Math.abs(s)),e?`${pct(Math.abs(s)/e)} da receita`:'–'],
    [`Resultado ${v.ano}`,`<span class="${r<0?'neg':''}">${k(r)}</span>`,`<span class="chip ${r<0?'bad':'good'}">margem ${e?pct(r/e):'–'}</span>`],
    ['Pior mês',`<span class="${T.r[pior]<0?'neg':''}">${MESES[pior]} · ${k(T.r[pior])}</span>`,neg?`<span class="chip bad">${neg} ${neg>1?'meses':'mês'} no vermelho</span>`:'<span class="chip good">nenhum mês no vermelho</span>']]
    .map(([l,x,c])=>`<div class="tile"><div class="lbl">${l}</div><div class="val">${x}</div><div class="cmp">${c}</div></div>`).join('');
}
// atualiza totais, grupos, linhas calculadas e cartões sem redesenhar a tela
function recalc(){
  const G=S._orcMd;if(!G||!document.querySelector('.orc-grade'))return;const {md,v}=G;
  const set=(sel,txt,neg)=>{const el=document.querySelector(sel);if(el){el.textContent=txt;el.classList.toggle('neg',!!neg)}};
  md.cs.forEach(c=>{const a=md.auto(c);let t=0;MESES.forEach((_,m)=>{const x=md.val(c,m);t+=x;if(a)set(`[data-v="${c.id}|${m}"]`,fAbs(x))});set(`[data-tot="${c.id}"]`,fAbs(t))});
  const gs=[...new Set(md.cs.map(c=>c.grupo_dre||''))];
  gs.forEach(g=>{let t=0;MESES.forEach((_,m)=>{const x=sum(md.cs.filter(c=>(c.grupo_dre||'')===g).map(c=>md.val(c,m)));t+=x;set(`[data-gm="${g}|${m}"]`,f0(x),x<0)});set(`[data-gt="${g}"]`,f0(t),t<0)});
  const T=totais(md);
  MESES.forEach((_,m)=>{set(`[data-ft="e|${m}"]`,f0(T.e[m]));set(`[data-ft="s|${m}"]`,fAbs(T.s[m]));set(`[data-ft="r|${m}"]`,f0(T.r[m])||'0',T.r[m]<0);set(`[data-ft="p|${m}"]`,T.e[m]?pct(T.r[m]/T.e[m]):'–',T.r[m]<0)});
  const e=sum(T.e),r=sum(T.r);set('[data-ft="e|t"]',f0(e));set('[data-ft="s|t"]',fAbs(sum(T.s)));set('[data-ft="r|t"]',f0(r)||'0',r<0);set('[data-ft="p|t"]',e?pct(r/e):'–',r<0);
  const kp=document.getElementById('orcKpis');if(kp)kp.innerHTML=kpis(T,v);
}
function barraMobile(v,edita,pred){
  return `<div class="orc-bar" style="margin-top:8px"><div class="grp">${edita?`<button class="btn ghost" data-acao="orc-preencher">${icone('raio',15)} Preencher</button>`:''}<button class="btn ghost" data-acao="orc-exportar">${icone('exporta',15)} Excel</button>${edita?`<button class="btn ghost" data-acao="orc-importar">${icone('importa',15)} Importar</button><input type="file" id="orcArq" accept=".xlsx,.xls,.csv" hidden>`:''}<button class="btn ghost" data-acao="orc-gerar-contas">${icone('contas',15)} Gerar contas</button></div></div>`;
}

// ---------- digitação
function marcaCel3(i){
  const E=S.orcEdit;if(!E)return;const [c,m]=i.dataset.cel.split('|');const x=parseCel(i.value);E.vals[c+'|'+m]=r2(Math.abs(x)*sinal(conta(c)));E.sujo=true;
  if(E.pct[c]!=null&&conta(c)?.tipo==='despesa'){delete E.pct[c]}
  i.style.background='var(--warn-soft)';const bt=document.querySelector('[data-acao=salvar-orc]');if(bt)bt.disabled=false;recalc();
}
window.marcaCel=marcaCel3;
document.addEventListener('focusin',ev=>{const i=ev.target;if(!i.matches?.('.orc-grade input.cel'))return;
  const [c,m]=i.dataset.cel.split('|');const G=S._orcMd;const E=S.orcEdit;
  if(G&&E){const x=G.md.val(conta(c),+m);i.value=fmtIn(x);setTimeout(()=>{try{i.select()}catch(e){}},0)}
  // pessoa física: pergunta se o salário digitado é líquido ou bruto
  const ct=conta(c);if(G&&G.md.pf&&ct?.tipo==='receita'&&E&&!E.pf[c]&&!E._perguntou?.[c]){E._perguntou=E._perguntou||{};E._perguntou[c]=true;perguntaPF(c,i)}});
document.addEventListener('focusout',ev=>{const i=ev.target;if(!i.matches?.('.orc-grade input.cel'))return;const t=parseCel(i.value);i.value=fAbs(t)});
document.addEventListener('input',ev=>{const i=ev.target;if(!i.matches?.('.orc-grade input.pct'))return;const E=S.orcEdit;if(!E)return;
  const t=String(i.value).trim();const c=i.dataset.pct;if(!t){delete E.pct[c]}else{const p=parseCel(t);if(!(p>=0&&p<=100))return;E.pct[c]=p}
  E.sujo=true;const bt=document.querySelector('[data-acao=salvar-orc]');if(bt)bt.disabled=false;
  // a linha vira calculada: troca os campos por valores calculados sem perder o foco do %
  clearTimeout(S._orcPctT);S._orcPctT=setTimeout(()=>{const pos=i.selectionStart;render(true).then?.(()=>{const n=document.querySelector(`input.pct[data-pct="${c}"]`);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}})},450);recalc()});

function perguntaPF(cid,inp){
  const c=conta(cid);
  drawer(`<h3>Este valor é líquido ou bruto?</h3><p class="muted" style="margin:0">${esc(c.codigo)} ${esc(c.nome)}</p>
  <div class="effect">Se for o <b>bruto</b> (o valor do holerite), o app calcula sozinho o INSS e o imposto de renda de cada mês e mostra o líquido no resultado. Se for o <b>líquido</b> (o que cai na conta), fica como está.</div>
  <div style="display:grid;gap:8px"><button class="btn" data-acao="orc-pf-escolhe" data-cid="${cid}" data-modo="liquido">Líquido (o que cai na conta)</button>
  <button class="btn ghost" data-acao="orc-pf-escolhe" data-cid="${cid}" data-modo="bruto">Bruto (valor do holerite)</button></div>`);
  S._orcPfFoco=inp?.dataset.cel||null;
}
async function escolhePF(cid,modo){
  const E=S.orcEdit;if(!E)return;E.pf[cid]=modo;E.sujo=true;
  if(modo==='bruto'){const emp=S.orcEmp;const des=S.contas.filter(c=>c.empresa_id===emp&&c.analitica&&c.ativa&&c.tipo==='despesa');
    if(!des.some(c=>/INSS/.test(norm(c.nome))))await contaAuto(emp,'INSS sobre salário','despesa','deducoes');
    if(!des.some(c=>/IRRF|IMPOSTO DE RENDA|IR SOBRE|IR RETIDO/.test(norm(c.nome))))await contaAuto(emp,'IRRF sobre salário','despesa','deducoes')}
  fecharDrawer();toast(modo==='bruto'?'Salário bruto: INSS e IRRF calculados todo mês. Salve para gravar.':'Salário líquido. Salve para gravar.');
  const foco=S._orcPfFoco;await render(true);if(foco){const n=document.querySelector(`input.cel[data-cel="${foco}"]`);n?.focus()}
}

// ---------- preencher automático
function formPreencher(cid){
  const G=S._orcMd;if(!G||!G.edita)return toast('Escolha uma unidade em rascunho para preencher.');const {md,corte}=G;
  const c=cid?conta(cid):null;const mIni=Math.max(corte,MESES.findIndex((_,m)=>m>=corte&&c&&md.val(c,m))>=0?MESES.findIndex((_,m)=>m>=corte&&c&&md.val(c,m)):corte);
  const mOp=sel=>MESES.map((m,i)=>i<corte?'':`<option value="${i}" ${i===sel?'selected':''}>${m}</option>`).join('');
  drawer(`<h3>${icone('raio')} Preencher automático</h3>
  <p class="muted" style="margin:0">Escolha a conta e como preencher. Os valores entram na grade para você conferir antes de salvar.</p>
  <form data-form="orc-preencher" class="form-grid">
    <div class="field wide"><label for="ppConta">Conta</label><select id="ppConta" name="conta"><option value="*">Todas as contas que têm valor no mês de partida</option>${md.cs.filter(x=>!md.auto(x)||md.auto(x)==='pct').map(x=>`<option value="${x.id}" ${x.id===cid?'selected':''}>${esc(x.codigo)} ${esc(x.nome)}</option>`).join('')}</select></div>
    <fieldset class="wide" style="border:0;padding:0;margin:0;display:grid;gap:8px">
      <legend class="muted" style="font-size:12px;margin-bottom:4px">Como preencher</legend>
      <label style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="radio" name="modo" value="repetir" checked> Repetir o valor de <select name="de" aria-label="Mês de partida">${mOp(mIni)}</select> nos meses seguintes</label>
      <label style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="radio" name="modo" value="crescer"> Repetir e crescer <input name="cresce" inputmode="decimal" placeholder="1,5" style="width:70px"> % ao mês</label>
      <label style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="radio" name="modo" value="fixo"> Mesmo valor em todos os meses: R$ <input name="fixo" inputmode="decimal" placeholder="1.500,00" style="width:120px"></label>
      <label style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="radio" name="modo" value="anual"> Dividir um total do ano de R$ <input name="anual" inputmode="decimal" placeholder="60.000,00" style="width:130px"> pelos meses</label>
      <label style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="radio" name="modo" value="pct"> Despesa como <input name="pct" inputmode="decimal" placeholder="6" style="width:60px"> % da receita bruta do mês</label>
    </fieldset>
    <div class="wide" style="display:flex;gap:8px"><button class="btn">Preencher</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`);
  const f=document.querySelector('form[data-form="orc-preencher"]');f.addEventListener('focusin',ev=>{const r=ev.target.closest('label')?.querySelector('input[type=radio]');if(r&&ev.target.type!=='radio')r.checked=true});
}
FORMS['orc-preencher']=async f=>{
  const G=S._orcMd,E=S.orcEdit;if(!G||!E)return;const {md,corte}=G;const modo=f.modo.value;const de=Math.max(corte,+f.de.value||0);
  const alvo=f.conta.value==='*'?md.cs.filter(c=>!md.auto(c)&&md.val(c,de)):[conta(f.conta.value)].filter(Boolean);
  if(!alvo.length)return toast(f.conta.value==='*'?`Nenhuma conta tem valor em ${MESES[de]}.`:'Escolha a conta.');
  const put=(c,m,x)=>{if(m>=corte)E.vals[c.id+'|'+m]=r2(Math.abs(x)*sinal(c))};let n=0;
  for(const c of alvo){
    if(modo==='pct'){const p=parseCel(f.pct.value);if(c.tipo!=='despesa')return toast('% da receita vale só para despesas.');if(!(p>0&&p<=100))return toast('Informe o percentual.');E.pct[c.id]=p;n++;continue}
    if(E.pct[c.id]!=null)delete E.pct[c.id];
    if(modo==='repetir'||modo==='crescer'){const b=Math.abs(md.val(c,de));if(!b&&alvo.length===1)return toast(`${c.nome} não tem valor em ${MESES[de]}.`);const g=modo==='crescer'?(parseCel(f.cresce.value)||0)/100:0;
      for(let m=de+1;m<12;m++)put(c,m,b*Math.pow(1+g,m-de));n++}
    else if(modo==='fixo'){const x=parseCel(f.fixo.value);if(!x)return toast('Informe o valor.');for(let m=corte;m<12;m++)put(c,m,x);n++}
    else if(modo==='anual'){const x=parseCel(f.anual.value);if(!x)return toast('Informe o total do ano.');const q=12-corte,parte=r2(x/q);for(let m=corte;m<12;m++)put(c,m,m<11?parte:r2(x-parte*(q-1)));n++}
  }
  E.sujo=true;fecharDrawer();toast(`${n} conta${n>1?'s':''} preenchida${n>1?'s':''}. Confira e clique em Salvar alterações.`);render(true);
};

// ---------- salvar (valores, % da receita, líquido/bruto e competência/caixa)
async function salvarOrc3(){
  const E=S.orcEdit;const G=S._orcMd;const v=(S.versoes[S.orcEmp]||[]).find(x=>x.id===E?.ver);if(!v||v.congelada||!G)return;
  const ls=await linhasDe(v.id,true);const M=matriz(ls,E.pred);const md=modelo(v.empresa_id,v,M,G.corte,E);
  md.cs.forEach(c=>MESES.forEach((_,m)=>{const x=md.val(c,m);if(x||M[c.id])(M[c.id]=M[c.id]||Array(12).fill(0))[m]=x}));
  let q=sb.from('orcamento_linhas').delete().eq('versao_id',v.id);q=E.pred?q.eq('predio_id',E.pred):q.is('predio_id',null);const {error}=await q;if(error)throw error;
  const rows=[];Object.entries(M).forEach(([c,arr])=>arr.forEach((x,m)=>{if(r2(x))rows.push({empresa_id:v.empresa_id,versao_id:v.id,conta_id:c,predio_id:E.pred||null,competencia:ym(v.ano,m)+'-01',valor:r2(x)})}));
  await lotes('orcamento_linhas',rows);
  const P=parDe(v);const novo={...P,base:E.base,pf:E.pf,pct:{...(P.pct||{}),[chaveU(E.pred)]:E.pct}};
  const {error:e2}=await sb.from('orcamento_versoes').update({parametros:novo}).eq('id',v.id);
  if(e2){console.warn(e2);toast('Valores salvos. Os % e a escolha competência/caixa precisam da atualização 0026 do banco.')}else{v.parametros=novo;toast('Orçamento salvo.')}
  S.orcEdit=null;S.caixaOrc=null;await linhasDe(v.id,true);render(true);
}
window.salvarOrc=salvarOrc3;
window.abaEditar=abaEditar3;

// ---------- Excel: exportar a base e importar preenchida
function exportar(){
  const G=S._orcMd;if(!G)return;const {md,v,corte}=G;const E=S.orcEdit;const yy=String(v.ano).slice(2);
  const un=G.pred==='*'?'Todas as unidades':G.pred?S.predios.find(p=>p.id===G.pred)?.nome:'Sem unidade';
  const head=['Código','Conta','Tipo','Grupo da DRE','% da receita',...MESN.map(m=>`${m}/${yy}`),'Total'];
  const rows=md.cs.map(c=>{const vals=MESES.map((_,m)=>r2(Math.abs(md.val(c,m))));return [c.codigo,c.nome,c.tipo==='receita'?'Receita':'Despesa',GRUPOS[c.grupo_dre]||'',E?.pct[c.id]!=null?E.pct[c.id]:'',...vals,r2(sum(vals))]});
  const ws=XLSX.utils.aoa_to_sheet([head,...rows]);ws['!cols']=[{wch:11},{wch:34},{wch:9},{wch:20},{wch:11},...MESN.map(()=>({wch:11})),{wch:13}];ws['!freeze']={xSplit:2,ySplit:1};
  const info=XLSX.utils.aoa_to_sheet([['Empresa',nomeEmp(empresa(v.empresa_id))],['Versão',v.nome],['Ano',v.ano],['Unidade',un],['Preenchido por',E?.base==='caixa'?'Caixa':'Competência'],[],
    ['Como preencher'],['1. Preencha os valores dos meses em positivo. O sinal vem do tipo da conta.'],['2. Em “% da receita”, informe o percentual para a despesa ser calculada sobre a receita bruta do mês (deixe os meses em branco).'],
    ['3. Não mude a coluna Código: é por ela que o app encontra a conta.'],['4. No app, abra a mesma versão e unidade e clique em Importar Excel. Confira e salve.'],...(corte?[['Meses até '+MESES[corte-1]+' são realizado e não são importados.']]:[])]);
  info['!cols']=[{wch:16},{wch:60}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Orçamento');XLSX.utils.book_append_sheet(wb,info,'Leia-me');
  const nm=s=>norm(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  XLSX.writeFile(wb,`orcamento-${nm(nomeEmp(empresa(v.empresa_id)))}-${nm(v.nome)}${G.pred&&G.pred!=='*'?'-'+nm(un):''}.xlsx`);
}
function importar(file){
  const G=S._orcMd,E=S.orcEdit;if(!G||!E||!G.edita)return toast('Escolha uma unidade em rascunho para importar.');const {md,corte}=G;
  const fr=new FileReader();fr.onload=()=>{try{
    const wb=XLSX.read(new Uint8Array(fr.result),{type:'array'});const ws=wb.Sheets[wb.SheetNames.find(n=>/ORCAMENTO/.test(norm(n)))||wb.SheetNames[0]];
    const aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});const hi=aoa.findIndex(r=>r.some(x=>/^CODIGO$/.test(norm(String(x)))));if(hi<0)throw new Error('Não achei a coluna “Código”. Use a planilha do botão Exportar Excel.');
    const h=aoa[hi].map(x=>norm(String(x)));const cCod=h.findIndex(x=>x==='CODIGO'),cPct=h.findIndex(x=>/% DA RECEITA|^%/.test(x));
    const cMes=MESN.map(m=>h.findIndex(x=>x.startsWith(norm(m))));if(cMes.filter(x=>x>=0).length<1)throw new Error('Não achei as colunas dos meses (Jan, Fev, …).');
    const num_=x=>typeof x==='number'?x:parseCel(x);let n=0,contas=0;const fora=[];
    aoa.slice(hi+1).forEach(r=>{const cod=String(r[cCod]??'').trim();if(!cod)return;const c=md.cs.find(x=>x.codigo===cod);if(!c){fora.push(cod);return}
      if(md.auto(c)==='inss'||md.auto(c)==='ir')return;let mexeu=false;
      const p=cPct>=0?String(r[cPct]??'').trim():'';if(p!==''&&c.tipo==='despesa'){const pv=num_(p);if(pv>=0&&pv<=100){E.pct[c.id]=pv;mexeu=true}}
      else{if(E.pct[c.id]!=null&&cPct>=0)delete E.pct[c.id];cMes.forEach((ci,m)=>{if(ci<0||m<corte)return;const raw=r[ci];if(raw===''||raw==null)return;const x=num_(raw);if(isNaN(x))return;E.vals[c.id+'|'+m]=r2(Math.abs(x)*sinal(c));n++;mexeu=true})}
      if(mexeu)contas++});
    E.sujo=true;toast(`${contas} conta${contas===1?'':'s'} importada${contas===1?'':'s'} (${n} valores)${fora.length?`. ${fora.length} código${fora.length>1?'s':''} não existe${fora.length>1?'m':''} no plano: ${fora.slice(0,4).join(', ')}`:''}. Confira e salve.`);render(true);
  }catch(err){console.error(err);toast(err.message||'Não consegui ler a planilha.')}};fr.readAsArrayBuffer(file);
}
document.addEventListener('change',ev=>{if(ev.target.id==='orcArq'&&ev.target.files[0]){importar(ev.target.files[0]);ev.target.value=''}});

// ---------- gerar contas a pagar e a receber a partir do orçamento
async function formGerar(){
  const G=S._orcMd;if(!G)return;const {v}=G;const emp=v.empresa_id;
  if(!podeEditar(emp))return toast('Seu acesso a esta empresa é só de consulta.');
  if(S.orcEdit?.sujo)return toast('Salve as alterações antes de gerar as contas.');
  const hm=+HOJE.slice(5,7)-1,hy=+HOJE.slice(0,4);const de=S.gcDe??(v.ano===hy?hm:v.ano>hy?0:11),ate=S.gcAte??Math.min(11,de+2);
  const ls=(await linhasDe(v.id)).filter(l=>G.pred==='*'||(l.predio_id||'')===(G.pred||''));
  const real=(await lancAno(v.ano)).filter(l=>l.empresa_id===emp);
  const ag={};ls.forEach(l=>{const m=+l.competencia.slice(5,7)-1;if(m<de||m>ate)return;const key=l.conta_id+'|'+(l.predio_id||'')+'|'+m;ag[key]=(ag[key]||0)+ +l.valor});
  const jaDe=(c,p,m)=>sum(real.filter(l=>l.conta_id===c&&(l.predio_id||'')===p&&+l.competencia.slice(5,7)-1===m).map(l=>+l.valor));
  // fornecedor ou cliente mais recente usado em cada conta
  const ultPar={};[...real].sort((a,b)=>b.competencia.localeCompare(a.competencia)).forEach(l=>{if(l.parceiro_id&&!ultPar[l.conta_id])ultPar[l.conta_id]=l.parceiro_id});
  const base=parDe(v).base==='caixa';
  const itens=Object.entries(ag).map(([key,x])=>{const [c,p,m]=key.split('|');const ct=conta(c);if(!ct||!x)return null;const ja=jaDe(c,p,+m);
    const falta=x>0?Math.max(0,r2(x-ja)):Math.min(0,r2(x-ja));const comp=ym(v.ano,+m)+'-01';
    const parc=base?[{data:comp.slice(0,8)+'15',valor:falta}]:caixaDaLinha(c,comp,falta);
    const par=S.parceiros.find(q=>q.id===ultPar[c]);return {key,c:ct,p,m:+m,orc:x,ja,falta,parc,par:par?.nome||''}}).filter(Boolean)
    .sort((a,b)=>a.m-b.m||(a.c.tipo===b.c.tipo?0:a.c.tipo==='receita'?-1:1)||a.c.codigo.localeCompare(b.c.codigo,undefined,{numeric:true}));
  S._gc={v,itens};
  const mOp=(sel,nm)=>`<select name="${nm}" data-gc-per="${nm}" aria-label="${nm==='de'?'De':'Até'}">${MESES.map((m,i)=>`<option value="${i}" ${i===sel?'selected':''}>${m}/${String(v.ano).slice(2)}</option>`).join('')}</select>`;
  const dlF=S.parceiros.filter(p=>p.empresa_id===emp&&p.fornecedor!==false),dlC=S.parceiros.filter(p=>p.empresa_id===emp&&p.cliente!==false);
  const linha=(it,i)=>{const sel=Math.abs(it.falta)>=0.01;const un=it.p?S.predios.find(q=>q.id===it.p)?.nome:'';
    return `<tr class="${sel?'':'ja'}"><td><input type="checkbox" data-gc="${i}" ${sel?'checked':''} aria-label="Lançar ${esc(it.c.nome)} ${MESES[it.m]}"></td>
    <td class="mono">${MESES[it.m]}</td><td class="wrap" style="min-width:200px"><span class="chip ${it.c.tipo==='receita'?'good':'bad'}" style="font-size:10.5px">${it.c.tipo==='receita'?'receber':'pagar'}</span> ${esc(it.c.codigo)} ${esc(it.c.nome)}${un?`<span class="unit">· ${esc(un)}</span>`:''}</td>
    <td class="n">${brl.format(Math.abs(it.orc))}</td><td class="n">${it.ja?brl.format(Math.abs(it.ja)):'–'}</td>
    <td style="width:110px"><input class="gv" data-gcv="${i}" inputmode="decimal" value="${fmtIn(it.falta)}" aria-label="Valor a lançar"></td>
    <td style="width:130px"><input type="date" data-gcd="${i}" value="${it.parc[0]?.data||''}" aria-label="Vencimento">${it.parc.length>1?`<span class="unit">em ${it.parc.length} parcelas</span>`:''}</td>
    <td style="min-width:160px"><input type="text" data-gcp="${i}" list="${it.c.tipo==='receita'?'dlGcC':'dlGcF'}" value="${esc(it.par)}" placeholder="${it.c.tipo==='receita'?'De quem? (cliente)':'Para quem? (fornecedor)'}" aria-label="Fornecedor ou cliente"></td></tr>`};
  drawer(`<h3>${icone('contas')} Gerar contas a pagar e a receber</h3>
  <p class="muted" style="margin:0">Do orçamento <b>${esc(v.nome)}</b>. Mostra o orçado, o que já está lançado em cada conta no mês e lança só a diferença. Diga de quem é cada conta: o app sugere o último fornecedor ou cliente usado.</p>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="muted">Meses de</span>${mOp(de,'de')}<span class="muted">até</span>${mOp(ate,'ate')}
    <span style="flex:1"></span><input type="text" id="gcTodos" list="dlGcF" placeholder="Mesmo fornecedor/cliente para os marcados" style="min-width:240px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:var(--ink)"><button type="button" class="btn ghost" data-acao="gc-todos">Aplicar</button></div>
  ${itens.length?`<div class="tbl-wrap" style="max-height:52vh;overflow:auto"><table class="gc-tab"><thead><tr><th><input type="checkbox" data-gc="*" aria-label="Marcar todas" checked></th><th>Mês</th><th>Conta</th><th class="n">Orçado</th><th class="n">Já lançado</th><th>Lançar (R$)</th><th>Vencimento</th><th>De quem</th></tr></thead>
    <tbody>${itens.map(linha).join('')}</tbody></table></div>`:`<p class="muted" style="margin:0">Nada orçado nesses meses${G.pred&&G.pred!=='*'?' nesta unidade':''}.</p>`}
  <datalist id="dlGcF">${dlF.map(p=>`<option value="${esc(p.nome)}">`).join('')}</datalist><datalist id="dlGcC">${dlC.map(p=>`<option value="${esc(p.nome)}">`).join('')}</datalist>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn" data-acao="gc-lancar" ${itens.length?'':'disabled'}>Lançar marcadas</button><button class="btn ghost" data-acao="fechar">Cancelar</button><span class="muted" id="gcResumo" aria-live="polite"></span></div>
  <p class="muted small" style="margin:0">Cada conta vira um lançamento em aberto com vencimento pela premissa de prazo da conta${base?' (orçamento por caixa: vence no próprio mês)':''}. Fornecedor ou cliente novo é cadastrado sozinho.</p>`);
  document.querySelector('#layer .sheet')?.classList.add('largo');resumoGc();
}
function resumoGc(){const el=document.getElementById('gcResumo');if(!el||!S._gc)return;let n=0,p=0,r=0;
  document.querySelectorAll('[data-gc]:not([data-gc="*"])').forEach(cb=>{if(!cb.checked)return;const i=+cb.dataset.gc;const x=parseCel(document.querySelector(`[data-gcv="${i}"]`)?.value);if(!x)return;n++;if(S._gc.itens[i].c.tipo==='receita')r+=Math.abs(x);else p+=Math.abs(x)});
  el.textContent=n?`${n} conta${n>1?'s':''}: ${brl.format(p)} a pagar e ${brl.format(r)} a receber`:'Nenhuma marcada';
  const b=document.querySelector('[data-acao=gc-lancar]');if(b){b.disabled=!n;b.textContent=n?`Lançar ${n} conta${n>1?'s':''}`:'Lançar marcadas'}}
async function parceiroPorNome(emp,nome,tipo){
  const n=norm(nome);if(!n)return null;const p=S.parceiros.find(x=>x.empresa_id===emp&&norm(x.nome)===n);if(p)return p.id;
  const {data,error}=await sb.from('parceiros').insert({empresa_id:emp,nome:nome.trim().slice(0,200),fornecedor:tipo!=='receita',cliente:tipo==='receita'}).select('id,empresa_id,documento,nome,fornecedor,cliente').single();
  if(error)throw error;S.parceiros.push(data);return data.id;
}
async function lancarGerar(b){
  const G=S._gc;if(!G)return;const v=G.v;const marc=[...document.querySelectorAll('[data-gc]:not([data-gc="*"])')].filter(x=>x.checked).map(x=>+x.dataset.gc);
  const lista=marc.map(i=>({it:G.itens[i],val:parseCel(document.querySelector(`[data-gcv="${i}"]`).value),venc:document.querySelector(`[data-gcd="${i}"]`).value,par:document.querySelector(`[data-gcp="${i}"]`).value.trim()})).filter(x=>x.val);
  if(!lista.length)return toast('Marque ao menos uma conta com valor.');
  const sem=lista.filter(x=>!x.par).length;if(sem&&!confirm(`${sem} conta${sem>1?'s':''} sem fornecedor ou cliente. Lançar assim mesmo?`))return;
  b.disabled=true;b.textContent='Lançando…';let ok=0;
  try{for(const x of lista){const c=x.it.c;const valor=r2(Math.abs(x.val)*sinal(c));const id=uuid();
      const parcs=x.it.parc.length>1&&Math.abs(Math.abs(x.val)-Math.abs(x.it.falta))<0.01?x.it.parc.map(p=>({...p,valor:r2(Math.abs(p.valor)*sinal(c))})):[{data:x.venc||x.it.parc[0]?.data||ym(v.ano,x.it.m)+'-15',valor}];
      if(x.venc&&parcs.length>1)parcs[0].data=x.venc;
      const L={id,empresa_id:v.empresa_id,predio_id:x.it.p||null,conta_id:c.id,parceiro_id:await parceiroPorNome(v.empresa_id,x.par,c.tipo),competencia:ym(v.ano,x.it.m)+'-01',descricao:`${/^(OR[CÇ]AMENTO|FORECAST)/i.test(v.nome)?'':'Orçamento '}${v.nome} · ${c.nome}`.slice(0,300),valor,origem:'manual'};
      const {error}=await sb.from('lancamentos').insert(L);if(error)throw error;
      const forma=premissaDe(c.id,L.competencia)?.forma_pagamento||null;
      const {error:e2}=await sb.from('parcelas').insert(parcs.map((p,i)=>({empresa_id:v.empresa_id,lancamento_id:id,numero:i+1,vencimento:p.data,valor:p.valor,status:'aberta',forma_pagamento:forma})));
      if(e2){await sb.from('lancamentos').delete().eq('id',id);throw e2}ok++}
  }catch(e){console.error(e);toast(`Lancei ${ok} e parei: ${traduz(e)}`);b.disabled=false;return}
  finally{invalidar();if(typeof carregarAnos==='function')await carregarAnos().catch(()=>{})}
  fecharDrawer();toast(`${ok} conta${ok>1?'s':''} lançada${ok>1?'s':''} em contas a pagar e a receber.`);window.atualizaContadores?.();render(true);
}
document.addEventListener('change',ev=>{const t=ev.target;
  if(t.dataset?.gcPer){S[t.dataset.gcPer==='de'?'gcDe':'gcAte']=+t.value;if(S.gcDe>S.gcAte){if(t.dataset.gcPer==='de')S.gcAte=S.gcDe;else S.gcDe=S.gcAte}formGerar();return}
  if(t.dataset?.gc==='*'){document.querySelectorAll('[data-gc]').forEach(x=>x.checked=t.checked);resumoGc();return}
  if(t.dataset?.gc!=null)resumoGc()});
document.addEventListener('input',ev=>{if(ev.target.dataset?.gcv!=null)resumoGc()});

Object.assign(ACOES_ORC,{
  'orc-preencher':b=>formPreencher(b.dataset.cid),
  'repetir':b=>formPreencher(b.dataset.cid),
  'orc-exportar':()=>exportar(),
  'orc-importar':()=>document.getElementById('orcArq')?.click(),
  'orc-gerar-contas':()=>formGerar(),
  'gc-lancar':b=>lancarGerar(b),
  'gc-todos':()=>{const nm=document.getElementById('gcTodos')?.value.trim();if(!nm)return toast('Digite o fornecedor ou cliente.');document.querySelectorAll('[data-gc]:not([data-gc="*"])').forEach(cb=>{if(cb.checked){const i=document.querySelector(`[data-gcp="${cb.dataset.gc}"]`);if(i)i.value=nm}})},
  'orc-base':b=>{const E=S.orcEdit;if(!E||E.base===b.dataset.base)return;E.base=b.dataset.base;E.sujo=true;toast(E.base==='caixa'?'Preenchendo por caixa: cada valor cai no caixa no próprio mês. Salve para gravar.':'Preenchendo por competência: o caixa sai pelas premissas de prazo. Salve para gravar.');render(true)},
  'orc-pf':b=>{const E=S.orcEdit;if(!E)return;const c=b.dataset.cid;const ct=conta(c);if(ct?.tipo==='despesa'){const br=Object.keys(E.pf).find(x=>E.pf[x]==='bruto');if(br)perguntaPF(br);return}perguntaPF(c)},
  'orc-pf-escolhe':b=>escolhePF(b.dataset.cid,b.dataset.modo),
});
// competência ou caixa ao criar a versão
const _formVersao=formVersao;
window.formVersao=tipo=>{_formVersao(tipo);const f=document.querySelector('form[data-form=versao]');if(!f)return;const ref=f.querySelector('.wide:last-child');
  const d=document.createElement('div');d.className='field';d.style.gridColumn='span 3';
  d.innerHTML=`<label for="vBaseCx">Preencher os valores por</label><select id="vBaseCx" name="basecx"><option value="competencia">Competência (o caixa sai pelas premissas de prazo)</option><option value="caixa">Caixa (o que entra e sai em cada mês)</option></select>`;f.insertBefore(d,ref)};
if(S.user&&rota()==='orcamento')render(true);
})();
