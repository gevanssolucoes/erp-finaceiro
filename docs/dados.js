// ===================== Gevans Dados · produto à parte
// O cliente envia uma planilha pronta (orçamento + realizado) e recebe as mesmas telas do Fluxo de caixa BI
// e do Painel gerencial do Gevans Gestor. Usa o mesmo motor (v3-bi.js) e as mesmas regras de premissas
// (compra antecipada, entrada %, prazos em dias, dia fixo do mês seguinte). Tudo roda no navegador.

// ---------- o que o motor do Gestor espera encontrar
var S={v3:{visao:'forecast',regime:'caixa',modo:'gerencial',ver:{},fechados:new Set()},perfil:{nome:''},empresas:[]};
var ROTAS=[],TITULOS={},VIEWS={},USA_EMP=new Set(),USA_ANO=new Set(),IC={};
const APP_NOME='Gevans Dados';
const HOJE=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const num=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0});
const pct=v=>(isFinite(v)?(v*100).toFixed(1).replace('.',','):'–')+'%';
const k=v=>{const a=Math.abs(v);const s=v<0?'-':'';return a>=1e6?s+'R$ '+(a/1e6).toFixed(2).replace('.',',')+' mi':a>=1e3?s+'R$ '+(a/1e3).toFixed(1).replace('.',',')+' mil':s+'R$ '+a.toFixed(0)};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum=a=>a.reduce((x,y)=>x+(+y||0),0);
const r2=v=>Math.round(v*100)/100;
function niceStep(r){if(!(r>0))return 1;const p=Math.pow(10,Math.floor(Math.log10(r)));const f=r/p;return (f<1.5?1:f<3?2:f<7?5:10)*p}
const GRUPOS={receita_bruta:'Receita bruta',deducoes:'Deduções',custos:'Custos',despesas_operacionais:'Despesas operacionais',resultado_financeiro:'Resultado financeiro',outras:'Outras receitas e despesas',ir_csll:'IR e CSLL',nao_operacional:'Não operacional'};
const ORDEM_GRUPOS=['receita_bruta','deducoes','custos','despesas_operacionais','resultado_financeiro','outras','nao_operacional','ir_csll'];
const icone=()=>'';
const CONTAS={};const conta=id=>CONTAS[id];
let ARQ='';const escopo=()=>ARQ||'Planilha enviada';
let toastT;function toast(m){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),3800)}
window.relatorioPDF=()=>{toast('Na janela de impressão, escolha “Salvar como PDF”.');setTimeout(()=>window.print(),300)};
function addDias(iso,d){const t=new Date(iso+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+d);return t.toISOString().slice(0,10)}
function vencDia(ano,mes0,dia){const ult=new Date(Date.UTC(ano,mes0+1,0)).getUTCDate();const d=new Date(Date.UTC(ano,mes0,Math.min(dia,ult)));while([0,6].includes(d.getUTCDay()))d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)}

// ---------- leitura da planilha
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
const CAMPOS=[
  ['tipo','Orçado ou realizado',/^(tipo|visao|cenario|base|orc.*real|real.*orc)/],
  ['competencia','Competência (mês)',/(compet|^mes|^data$|^data lanc|periodo|^data comp)/],
  ['pagamento','Data de pagamento ou recebimento (opcional)',/(pagto|pagamento|recebimento|^caixa|baixa|data caixa|liquida)/],
  ['codigo','Código da conta (opcional)',/(^cod|codigo|conta cod|cod conta)/],
  ['conta','Conta',/(^conta|descri|natureza|rubrica|categoria|plano)/],
  ['grupo','Grupo da DRE (opcional)',/(grupo|^dre|classific)/],
  ['valor','Valor',/(valor|montante|total|^r\$|quantia)/],
  ['empresa','Empresa ou unidade (opcional)',/(empresa|unidade|filial|loja)/],
];
function detectar(cab){const m={};const usado=new Set();
  CAMPOS.forEach(([c,,re])=>{const i=cab.findIndex((h,j)=>!usado.has(j)&&re.test(norm(h)));if(i>=0){m[c]=i;usado.add(i)}});return m}
function data(v){
  if(v==null||v==='')return null;
  if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+v*864e5);return d.toISOString().slice(0,10)}
  if(v instanceof Date&&!isNaN(v))return new Date(Date.UTC(v.getFullYear(),v.getMonth(),v.getDate())).toISOString().slice(0,10);
  const t=norm(v);let m;
  if((m=t.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/)))return `${m[1]}-${m[2].padStart(2,'0')}-${(m[3]||'1').padStart(2,'0')}`;
  if((m=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)))return `${m[3].length===2?'20'+m[3]:m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if((m=t.match(/^(\d{1,2})\/(\d{4})$/)))return `${m[2]}-${m[1].padStart(2,'0')}-01`;
  if((m=t.match(/^([a-z]{3})[a-z]*[\/\- ]?(\d{2,4})$/))){const i=MESES.indexOf(m[1]);if(i>=0)return `${m[2].length===2?'20'+m[2]:m[2]}-${String(i+1).padStart(2,'0')}-01`}
  return null}
function valor(v){if(typeof v==='number')return v;const t=String(v??'').replace(/[R$\s]/g,'');if(!t)return NaN;const neg=/^\(.*\)$/.test(t)||t.startsWith('-');const u=t.replace(/[()\-]/g,'');
  const x=u.includes(',')?parseFloat(u.replace(/\./g,'').replace(',','.')):/^\d{1,3}(\.\d{3})+$/.test(u)?parseFloat(u.replace(/\./g,'')):parseFloat(u);return neg?-x:x}
function grupoDe(txt,codigo,v){const t=norm(txt);
  if(t){if(/receita|venda|fatur/.test(t)&&!/dedu|financ/.test(t))return 'receita_bruta';if(/dedu|imposto.*venda|tribut.*venda|devolu/.test(t))return 'deducoes';
    if(/custo|cmv|csp|mercador/.test(t))return 'custos';if(/financ|juro|tarifa/.test(t))return 'resultado_financeiro';if(/\bir\b|csll|irpj|lucro/.test(t))return 'ir_csll';
    if(/nao oper|outra/.test(t))return 'outras';if(/despesa|admin|comerc|pessoal|folha|oper/.test(t))return 'despesas_operacionais';
    const k_=Object.entries(GRUPOS).find(([,n])=>norm(n)===t);if(k_)return k_[0]}
  return v>=0?'receita_bruta':'despesas_operacionais'}
const ehReceita=g=>g==='receita_bruta'||g==='outras_receitas';

// ---------- premissas da aba "Premissas": Conta | Prazos (dias) | Dia fixo | Entrada % | Compra antes (dias)
let PREM={};
function lerPremissas(ws){PREM={};if(!ws)return 0;const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true}).filter(r=>r.some(x=>x!==''&&x!=null));if(rows.length<2)return 0;
  const cab=rows[0].map(norm);const ic=cab.findIndex(h=>/conta|codigo/.test(h)),ip=cab.findIndex(h=>/prazo/.test(h)),id=cab.findIndex(h=>/dia/.test(h)&&!/prazo|antes/.test(h)),ie=cab.findIndex(h=>/entrada/.test(h)),ia=cab.findIndex(h=>/antes|anteced/.test(h));
  rows.slice(1).forEach(r=>{const c=norm(r[ic]);if(!c)return;PREM[c]={prazos:String(r[ip]??'').split(/[\/;, ]+/).map(Number).filter(x=>x>0),dia:+r[id]||null,entrada:+r[ie]||0,antes:+r[ia]||0}});return Object.keys(PREM).length}
const premDe=c=>PREM[norm(c.codigo)]||PREM[norm(c.nome)]||PREM[norm(c.codigo+' '+c.nome)];
// mesma regra do Gestor (caixaDaLinha): base no dia 15 do mês da competência, menos a compra antecipada
function caixaDe(c,comp,v){const p=premDe(c);const base=addDias(comp.slice(0,8)+'15',-(p?.antes||0));if(!p)return [{data:base,valor:v}];
  const out=[];let resto=v;if(p.entrada){const e=r2(v*p.entrada/100);out.push({data:base,valor:e});resto=r2(v-e)}
  if(p.dia){const d=new Date(base+'T12:00:00Z');out.push({data:vencDia(d.getUTCFullYear(),d.getUTCMonth()+1,p.dia),valor:resto})}
  else if(p.prazos.length){const q=p.prazos.length,parte=r2(resto/q);p.prazos.forEach((d,i)=>out.push({data:addDias(base,d),valor:i<q-1?parte:r2(resto-parte*(q-1))}))}
  else out.push({data:base,valor:resto});return out}

// ---------- estado da página
const P={wb:null,cab:[],linhas:[],mapa:{},rows:[],ano:null,tab:'gestao',emp:''};
const zeros=()=>Array(12).fill(0);
function montarLinhas(){
  const m=P.mapa;const out=[],erros={semConta:0,semData:0,semValor:0,semTipo:0};
  Object.keys(CONTAS).forEach(x=>delete CONTAS[x]);
  P.linhas.forEach(r=>{const g=i=>i==null?'':r[i];
    const nome=String(g(m.conta)??'').trim(),cod=String(g(m.codigo)??'').trim();if(!nome&&!cod){erros.semConta++;return}
    const comp=data(g(m.competencia));if(!comp){erros.semData++;return}
    let v=valor(g(m.valor));if(!isFinite(v)||!v){erros.semValor++;return}
    const t=norm(g(m.tipo));const tipo=m.tipo==null?'realizado':/orc|budget|plan|meta|previs/.test(t)?'orcado':/real|actual|efet/.test(t)?'realizado':null;if(!tipo){erros.semTipo++;return}
    const id=(cod?cod+' ':'')+nome;const gr=grupoDe(g(m.grupo),cod,v);
    if(!CONTAS[id])CONTAS[id]={id,codigo:cod,nome:nome||cod,grupo_dre:gr,tipo:ehReceita(gr)?'receita':'despesa'};
    const c=CONTAS[id];v=c.tipo==='receita'?Math.abs(v):-Math.abs(v);
    out.push({tipo,c,comp:comp.slice(0,8)+'01',pag:data(g(m.pagamento)),v,emp:String(g(m.empresa)??'').trim()})});
  P.rows=out;return erros}

// D no mesmo formato que o Gestor monta (v3-bi.js), para usar as mesmas telas
function montarD(ano){
  const B=window.V3BI;Object.keys(B.INFO).forEach(x=>delete B.INFO[x]);
  const RC={},RX={},AX={},OC={},OX={};let ultReal=-1,temOrc=false;
  const rs=P.rows.filter(r=>!P.emp||r.emp===P.emp);
  const noAno=d=>d&&d.startsWith(String(ano));const mes=d=>+d.slice(5,7)-1;
  rs.forEach(r=>{const caixa=r.pag?[{data:r.pag,valor:r.v}]:caixaDe(r.c,r.comp,r.v);
    if(r.tipo==='realizado'){if(noAno(r.comp)){B.add(RC,r.c.id,mes(r.comp),r.v);ultReal=Math.max(ultReal,mes(r.comp))}caixa.forEach(x=>{if(noAno(x.data))B.add(RX,r.c.id,mes(x.data),x.valor)})}
    else{if(noAno(r.comp)){B.add(OC,r.c.id,mes(r.comp),r.v);temOrc=true}caixa.forEach(x=>{if(noAno(x.data))B.add(OX,r.c.id,mes(x.data),x.valor)})}});
  const corte=ultReal+1;
  const ids=new Set([...Object.keys(RC),...Object.keys(RX),...Object.keys(OC),...Object.keys(OX)]);const FC={},FX={},GX={};
  ids.forEach(c=>{const rc=RC[c]||zeros(),rx=RX[c]||zeros(),oc=OC[c]||zeros(),ox=OX[c]||zeros();FC[c]=zeros();FX[c]=zeros();GX[c]=zeros();
    for(let m=0;m<12;m++){if(m<corte){FC[c][m]=rc[m];FX[c][m]=rx[m];continue}
      FC[c][m]=rc[m]+B.resto(oc[m],rc[m]);const g=B.resto(ox[m],rx[m]);GX[c][m]=g;FX[c][m]=rx[m]+g}});
  return {a:ano,corte,RC,RX,AX,OC,OX,FC,FX,GX,RCo:RC,RXo:RX,temOrc,temFc:false,nomes:temOrc?['orçado da planilha']:[],vers:[],parcial:null,
    textoSemOrc:'A planilha não tem linhas de orçado para '+ano+'. As visões Orçado e Orçado × Realizado ficam vazias.'}}

// ---------- tela
const $=s=>document.querySelector(s);
function telaMapa(erros){
  const op=i=>`<option value="">— não tem —</option>`+P.cab.map((h,j)=>`<option value="${j}" ${i===j?'selected':''}>${esc(h||'Coluna '+(j+1))}</option>`).join('');
  const anos=[...new Set(P.rows.map(r=>r.comp.slice(0,4)))].sort();const emps=[...new Set(P.rows.map(r=>r.emp).filter(Boolean))].sort();
  const nOrc=P.rows.filter(r=>r.tipo==='orcado').length,nReal=P.rows.length-nOrc;
  $('#mapa').innerHTML=`<table class="map"><thead><tr><th>Campo</th><th>Coluna da planilha</th></tr></thead><tbody>${CAMPOS.map(([c,n])=>`<tr><td>${n}</td><td><select data-campo="${c}" aria-label="${esc(n)}">${op(P.mapa[c])}</select></td></tr>`).join('')}</tbody></table>
   <p class="hint" style="margin:6px 0 0"><span class="chip good">${num.format(nReal)} realizado</span> <span class="chip info">${num.format(nOrc)} orçado</span> <span class="chip mute">${Object.keys(CONTAS).length} contas</span></p>
   ${anos.length?`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:6px"><label class="hint">Ano<br><select id="dAno" class="v3-sel">${anos.map(a=>`<option ${+a===P.ano?'selected':''}>${a}</option>`).join('')}</select></label>${emps.length>1?`<label class="hint">Empresa<br><select id="dEmp" class="v3-sel"><option value="">Todas (${emps.length})</option>${emps.map(e=>`<option ${e===P.emp?'selected':''}>${esc(e)}</option>`).join('')}</select></label>`:''}</div>`:''}`;
  const msgs=[];if(erros.semConta)msgs.push(erros.semConta+' sem conta');if(erros.semData)msgs.push(erros.semData+' sem data de competência válida');if(erros.semValor)msgs.push(erros.semValor+' sem valor');if(erros.semTipo)msgs.push(erros.semTipo+' sem dizer se é orçado ou realizado');
  $('#avisos').innerHTML=(msgs.length?`<div class="effect bad">Deixei de fora ${msgs.join(', ')}. Confira as colunas no passo 3.</div>`:'')+(Object.keys(PREM).length?`<div class="effect" style="margin-top:8px">${Object.keys(PREM).length} premissa${Object.keys(PREM).length>1?'s':''} de pagamento lida${Object.keys(PREM).length>1?'s':''} da aba Premissas. Linhas sem data de pagamento caem no caixa por elas.</div>`:'')}
async function render(){
  if(!P.rows.length){$('#view').innerHTML='';$('#tabs').hidden=true;return}
  $('#tabs').hidden=false;document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===P.tab)));
  const D=montarD(P.ano);window.V3BI.usar(D);
  $('#view').innerHTML=P.tab==='fluxo-bi'?await window.V3BI.telaFluxo(D):await window.V3BI.telaGestao(D)}
function carregarPlanilha(wb,nome){
  P.wb=wb;ARQ=nome;const abas=wb.SheetNames;const aba=abas.find(n=>!/premiss/.test(norm(n)))||abas[0];
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[aba],{header:1,raw:true,defval:''}).filter(r=>r.some(x=>x!==''&&x!=null));
  if(rows.length<2){toast('Não achei linhas na aba '+aba+'.');return}
  P.cab=rows[0].map(String);P.linhas=rows.slice(1);P.mapa=detectar(P.cab);
  lerPremissas(wb.Sheets[abas.find(n=>/premiss/.test(norm(n)))]);
  atualizar(true);$('#dropTxt').textContent=nome;toast('Planilha lida: '+P.linhas.length+' linhas.')}
function atualizar(novoAno){const e=montarLinhas();
  if(novoAno||!P.ano){const cont={};P.rows.filter(r=>r.tipo==='realizado').forEach(r=>{const a=+r.comp.slice(0,4);cont[a]=(cont[a]||0)+1});const anos=Object.keys(cont).map(Number);P.ano=anos.length?Math.max(...anos):(P.rows[0]?+P.rows[0].comp.slice(0,4):+HOJE.slice(0,4))}
  telaMapa(e);render()}

// ---------- modelo e exemplo
function modelo(exemplo){
  const L=[['Tipo','Competência','Data pagamento','Código','Conta','Grupo DRE','Valor','Empresa']];
  const contas=[['3.01','Venda de produtos','Receita bruta',180000],['3.02','Impostos sobre vendas','Deduções',-18000],['4.01','Compra de mercadorias','Custos',-76000],['5.01','Salários e encargos','Despesas operacionais',-38000],['5.02','Aluguel','Despesas operacionais',-12000],['5.03','Marketing','Despesas operacionais',-6500],['6.01','Tarifas bancárias','Resultado financeiro',-900]];
  const ano=+HOJE.slice(0,4),ultimo=exemplo?Math.max(0,+HOJE.slice(5,7)-2):1;
  for(let m=0;m<12;m++)contas.forEach(([c,n,g,v],i)=>{const saz=1+Math.sin(m/1.7+i)*.07;const comp=`${String(m+1).padStart(2,'0')}/${ano}`;
    L.push(['Orçado',comp,'',c,n,g,Math.round(v*1.05*saz),'Loja 1']);
    if(m<=ultimo)L.push(['Realizado',comp,'',c,n,g,Math.round(v*saz*(1+((m*7+i*3)%9-4)/100)),'Loja 1'])});
  const prem=[['Conta','Prazos (dias)','Dia fixo','Entrada %','Compra antes (dias)'],['Venda de produtos','30','','',''],['Impostos sobre vendas','','20','',''],['Compra de mercadorias','30/60','','20','15'],['Salários e encargos','','5','',''],['Marketing','30','','','']];
  const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet(exemplo?L:L.slice(0,1+contas.length*2));ws['!cols']=[{wch:11},{wch:12},{wch:15},{wch:8},{wch:26},{wch:22},{wch:12},{wch:12}];
  XLSX.utils.book_append_sheet(wb,ws,'Lançamentos');const wp=XLSX.utils.aoa_to_sheet(prem);wp['!cols']=[{wch:26},{wch:14},{wch:9},{wch:10},{wch:18}];XLSX.utils.book_append_sheet(wb,wp,'Premissas');
  const leia=XLSX.utils.aoa_to_sheet([['Como preencher'],[],['Tipo','Orçado ou Realizado'],['Competência','Mês da receita ou despesa (01/2026, jan/26 ou data)'],['Data pagamento','Opcional. Sem ela, o caixa é calculado pelas premissas'],['Código e Conta','Conta do seu plano de contas'],['Grupo DRE','Receita bruta, Deduções, Custos, Despesas operacionais, Resultado financeiro, IR e CSLL'],['Valor','Pode ser positivo; o sinal vem do grupo'],['Empresa','Opcional, para filtrar por empresa ou loja']]);leia['!cols']=[{wch:18},{wch:80}];XLSX.utils.book_append_sheet(wb,leia,'Leia-me');
  return wb}

function iniciarDados(){
  $('#btModelo').onclick=()=>{XLSX.writeFile(modelo(false),'gevans-dados-modelo.xlsx');toast('Modelo baixado.')};
  $('#btExemplo').onclick=()=>{const wb=XLSX.read(XLSX.write(modelo(true),{type:'array',bookType:'xlsx'}),{type:'array'});carregarPlanilha(wb,'Exemplo · Loja 1')};
  const ler=f=>{if(!f)return;const r=new FileReader();r.onload=()=>{try{carregarPlanilha(XLSX.read(new Uint8Array(r.result),{type:'array',cellDates:true}),f.name)}catch(e){console.error(e);toast('Não consegui ler este arquivo. Use .xlsx, .xls ou .csv.')}};r.readAsArrayBuffer(f)};
  $('#arq').onchange=e=>ler(e.target.files[0]);
  const d=$('#drop');['dragenter','dragover'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.add('on')}));['dragleave','drop'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.remove('on')}));
  d.addEventListener('drop',e=>ler(e.dataTransfer.files[0]));
  document.addEventListener('change',e=>{const s=e.target.closest('[data-campo]');if(s){P.mapa[s.dataset.campo]=s.value===''?undefined:+s.value;atualizar(true);return}
    if(e.target.id==='dAno'){P.ano=+e.target.value;render()}else if(e.target.id==='dEmp'){P.emp=e.target.value;ARQ=ARQ.split(' · ')[0]+(P.emp?' · '+P.emp:'');render()}});
  $('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){P.tab=b.dataset.tab;render()}});
  addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(h==='fluxo-bi'||h==='gestao'){P.tab=h;render()}});
}
