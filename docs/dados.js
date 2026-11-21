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
let ARQ='';const escopo=()=>ARQ||'Planilha enviada';
let toastT;function toast(m){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),3800)}
window.relatorioPDF=()=>{toast('Na janela de impressão, escolha “Salvar como PDF”.');setTimeout(()=>window.print(),300)};

// ---------- leitura (Excel, CSV, PDF, JSON e link de API) pelo módulo comum fontes-dados.js
const F=window.FontesDados;
const P={tabelas:[],t:0,mapa:{},rows:[],contas:{},prem:{},ano:null,tab:'gestao',emp:''};
const $=s=>document.querySelector(s);
function tabelaAtual(){return P.tabelas[P.t]}
function telaMapa(erros){
  const t=tabelaAtual();const op=i=>`<option value="">— não tem —</option>`+t.cab.map((h,j)=>`<option value="${j}" ${i===j?'selected':''}>${esc(h)}</option>`).join('');
  const anos=[...new Set(P.rows.map(r=>r.comp.slice(0,4)))].sort();const emps=[...new Set(P.rows.map(r=>r.emp).filter(Boolean))].sort();
  const nOrc=P.rows.filter(r=>r.tipo==='orcado').length,nReal=P.rows.length-nOrc;
  const abas=P.tabelas.length>1?`<label class="hint">Aba ou tabela<br><select id="dTab" class="v3-sel">${P.tabelas.map((x,i)=>`<option value="${i}" ${i===P.t?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></label>`:'';
  $('#mapa').innerHTML=`${abas}<table class="map"><thead><tr><th>Campo</th><th>Coluna</th></tr></thead><tbody>${F.CAMPOS.map(([c,n])=>`<tr><td>${n}</td><td><select data-campo="${c}" aria-label="${esc(n)}">${op(P.mapa[c])}</select></td></tr>`).join('')}</tbody></table>
   <p class="hint" style="margin:6px 0 0"><span class="chip good">${num.format(nReal)} realizado</span> <span class="chip info">${num.format(nOrc)} orçado</span> <span class="chip mute">${Object.keys(P.contas).length} contas</span></p>
   ${anos.length?`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:6px"><label class="hint">Ano<br><select id="dAno" class="v3-sel">${anos.map(a=>`<option ${+a===P.ano?'selected':''}>${a}</option>`).join('')}</select></label>${emps.length>1?`<label class="hint">Empresa<br><select id="dEmp" class="v3-sel"><option value="">Todas (${emps.length})</option>${emps.map(e=>`<option ${e===P.emp?'selected':''}>${esc(e)}</option>`).join('')}</select></label>`:''}</div>`:''}`;
  const msgs=[];if(erros.semConta)msgs.push(erros.semConta+' sem conta');if(erros.semData)msgs.push(erros.semData+' sem data de competência válida');if(erros.semValor)msgs.push(erros.semValor+' sem valor');if(erros.semTipo)msgs.push(erros.semTipo+' sem dizer se é orçado ou realizado');
  const np=Object.keys(P.prem).length;
  $('#avisos').innerHTML=(msgs.length?`<div class="effect bad">Deixei de fora ${msgs.join(', ')}. Confira as colunas no passo 3.</div>`:'')+(np?`<div class="effect" style="margin-top:8px">${np} premissa${np>1?'s':''} de pagamento lida${np>1?'s':''} da aba Premissas. Linhas sem data de pagamento caem no caixa por elas.</div>`:'')}
async function render(){
  if(!P.rows.length){$('#view').innerHTML='';$('#tabs').hidden=true;return}
  $('#tabs').hidden=false;document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===P.tab)));
  const D=F.montarD(P.rows,P.ano,{prem:P.prem,emp:P.emp});window.V3BI.usar(D);
  $('#view').innerHTML=P.tab==='fluxo-bi'?await window.V3BI.telaFluxo(D):await window.V3BI.telaGestao(D)}
function atualizar(novoAno){const n=F.normalizar(tabelaAtual(),P.mapa);P.rows=n.rows;P.contas=n.contas;
  if(novoAno||!P.ano)P.ano=F.anoPadrao(P.rows,HOJE);telaMapa(n.erros);render()}
function carregar(tabelas,nome){
  const prem=tabelas.find(t=>/premiss/.test(F.norm(t.nome)));P.prem=F.lerPremissas(prem);
  P.tabelas=tabelas.filter(t=>t!==prem);if(!P.tabelas.length){toast('Não achei linhas de lançamentos.');return}
  // escolhe a tabela que mais parece de lançamentos
  P.t=P.tabelas.reduce((b,t,i)=>Object.keys(F.detectar(t.cab)).length>Object.keys(F.detectar(P.tabelas[b].cab)).length?i:b,0);
  P.mapa=F.detectar(tabelaAtual().cab);ARQ=nome;P.emp='';atualizar(true);$('#dropTxt').textContent=nome;
  toast('Base lida: '+num.format(tabelaAtual().linhas.length)+' linhas.')}
async function lerArquivo(f){if(!f)return;try{carregar(await F.lerArquivo(f),f.name)}catch(e){console.warn(e);toast(e.message||'Não consegui ler este arquivo. Use Excel, CSV, PDF ou JSON.')}}
async function lerLink(){const url=$('#url').value.trim();if(!/^https?:\/\//.test(url)){toast('Cole um link que comece com https://');return}
  const tk=$('#token').value.trim();const h={accept:'application/json, text/csv, */*'};if(tk)h.authorization=/^(bearer|basic) /i.test(tk)?tk:'Bearer '+tk;
  const bt=$('#btLink');bt.disabled=true;bt.textContent='Buscando…';
  try{const r=await fetch(url,{headers:h});if(!r.ok)throw new Error('O link respondeu '+r.status+'.');
    let nome;try{nome=new URL(url).hostname}catch(e){nome='API'}carregar([F.tabelaDeTexto(await r.text(),nome)],nome)}
  catch(e){console.warn(e);toast(e instanceof TypeError?'O servidor do link não permite leitura direta pelo navegador. No Gevans Gestor, a tela Conexões de dados busca pelo servidor.':e.message)}
  finally{bt.disabled=false;bt.textContent='Buscar'}}

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
  $('#btExemplo').onclick=()=>carregar(F.tabelasDoLivro(XLSX.read(XLSX.write(modelo(true),{type:'array',bookType:'xlsx'}),{type:'array'})),'Exemplo · Loja 1');
  $('#arq').onchange=e=>lerArquivo(e.target.files[0]);
  $('#btLink').onclick=lerLink;
  const d=$('#drop');['dragenter','dragover'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.add('on')}));['dragleave','drop'].forEach(t=>d.addEventListener(t,e=>{e.preventDefault();d.classList.remove('on')}));
  d.addEventListener('drop',e=>lerArquivo(e.dataTransfer.files[0]));
  document.addEventListener('change',e=>{const s=e.target.closest('[data-campo]');if(s){P.mapa[s.dataset.campo]=s.value===''?undefined:+s.value;atualizar(true);return}
    if(e.target.id==='dTab'){P.t=+e.target.value;P.mapa=F.detectar(tabelaAtual().cab);atualizar(true)}
    else if(e.target.id==='dAno'){P.ano=+e.target.value;render()}else if(e.target.id==='dEmp'){P.emp=e.target.value;ARQ=ARQ.split(' · ')[0]+(P.emp?' · '+P.emp:'');render()}});
  $('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){P.tab=b.dataset.tab;render()}});
  addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(h==='fluxo-bi'||h==='gestao'){P.tab=h;render()}});
}
