// ===================== Versão 2 · Pesquisa geral (Ctrl+K)
// Uma caixa que acha telas, contas do plano, lançamentos, clientes e fornecedores,
// contas bancárias e empresas. Abre pelo botão "Pesquisar" no topo, por Ctrl+K ou Cmd+K.
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;
IC.pesquisa='<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>';

const css=document.createElement('style');css.textContent=`
.pg-btn{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);border-radius:7px;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer;min-width:0}
.pg-btn:hover{border-color:var(--accent);color:var(--ink)}.pg-btn kbd{font-family:var(--f-num);font-size:11px;border:1px solid var(--line);border-radius:4px;padding:0 5px}
.pg-fundo{position:fixed;inset:0;background:rgba(10,20,24,.45);z-index:60;display:flex;justify-content:center;align-items:flex-start;padding:max(10vh,16px) max(16px,env(safe-area-inset-right,0px)) 16px max(16px,env(safe-area-inset-left,0px))}
.pg{background:var(--surface);border:1px solid var(--line);border-radius:12px;width:min(680px,100%);max-height:76vh;display:flex;flex-direction:column;box-shadow:0 18px 50px rgba(0,0,0,.25);overflow:hidden}
.pg-in{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}
.pg-in svg{width:18px;height:18px;flex:none;fill:none;stroke:var(--ink-2);stroke-width:2;stroke-linecap:round}
.pg-in input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:16px;color:var(--ink)}
.pg-res{overflow:auto;padding:6px 0}
.pg-grp{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-2);font-weight:600;padding:10px 16px 4px}
.pg-it{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:none;border:0;padding:8px 16px;cursor:pointer;font:inherit;color:var(--ink)}
.pg-it .ic{flex:none;color:var(--ink-2)}.pg-it .t{flex:1;min-width:0;display:flex;flex-direction:column}.pg-it .t small{color:var(--ink-2);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pg-it .v{font-family:var(--f-num);font-size:12.5px;color:var(--ink-2);white-space:nowrap}
.pg-it.on,.pg-it:hover{background:var(--accent-soft)}
.pg-it mark{background:var(--warn-soft);color:inherit;border-radius:2px}
.pg-pe{display:flex;gap:14px;flex-wrap:wrap;padding:8px 16px;border-top:1px solid var(--line);font-size:12px;color:var(--ink-2)}
.pg-pe kbd{font-family:var(--f-num);font-size:11px;border:1px solid var(--line);border-radius:4px;padding:0 4px}
.pg-vazio{padding:22px 16px;color:var(--ink-2);text-align:center}
@media (max-width:820px){.pg-btn kbd,.pg-btn .pg-txt{display:none}.pg-fundo{padding-top:16px}}
`;document.head.appendChild(css);

const mac=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);
const filtros=document.getElementById('filtros');
if(filtros&&!document.getElementById('pgBtn'))filtros.insertAdjacentHTML('afterbegin',`<button class="pg-btn" id="pgBtn" type="button" data-acao="pesquisa-geral" title="Pesquisar em todo o app">${icone('pesquisa',16)}<span class="pg-txt">Pesquisar</span><kbd>${mac?'⌘':'Ctrl'} K</kbd></button>`);

const termosDe=q=>norm(q).split(/\s+/).filter(Boolean);
const bate=(txt,ts)=>{const t=norm(txt);return ts.every(x=>t.includes(x))};
const brlF=v=>typeof brl2!=='undefined'?brl2.format(v):String(v);
let estado={q:'',itens:[],sel:0,lancs:null};

async function carregarLancs(){
  if(estado.lancs)return estado.lancs;
  try{const anos=[...new Set([S.ano,+HOJE.slice(0,4)])];const ls=(await Promise.all(anos.map(a=>lancAno(a)))).flat();
    estado.lancs=ls.filter(l=>S.empresas.some(e=>e.id===l.empresa_id))}catch(e){estado.lancs=[]}
  return estado.lancs}

function procurar(q){
  const ts=termosDe(q),out=[];if(!ts.length){
    // sem texto: atalhos para as telas mais usadas
    ['lancamentos','contas','dre','fluxo','auditoria','plano'].filter(r=>TITULOS[r]&&podeVer(r)).forEach(r=>out.push({g:'Ir para',ic:r,t:TITULOS[r],s:'Tela',ir:()=>{location.hash=r}}));
    out.push({g:'Ações',ic:'lancamentos',t:'Novo lançamento',s:'Abre o formulário',ir:()=>document.querySelector('[data-acao=novo-lanc],.fab')?.click()});
    return out}
  ROTAS.filter(r=>r[0]!=='g'&&podeVer(r[0])&&!r[2]).forEach(r=>{if(bate(r[1],ts))out.push({g:'Telas',ic:r[0],t:r[1],s:'Abrir tela',ir:()=>{location.hash=r[0]}})});
  const emps=new Map(S.empresas.map(e=>[e.id,e]));const nE=id=>S.empresas.length>1?nomeEmp(emps.get(id))+' · ':'';
  S.contas.filter(c=>emps.has(c.empresa_id)&&bate(c.codigo+' '+c.nome,ts)).slice(0,8).forEach(c=>out.push({g:'Plano de contas',ic:'plano',t:c.codigo+' '+c.nome,s:nE(c.empresa_id)+(c.analitica?'Analítica':'Sintética')+(c.ativa?'':' · inativa'),ir:()=>{S.planoEmp=c.empresa_id;S.planoBusca=c.codigo;S.planoFiltro='todas';if(location.hash==='#plano')render();else location.hash='plano'}}));
  (S.parceiros||[]).filter(p=>emps.has(p.empresa_id)&&bate(p.nome+' '+(p.documento||''),ts)).slice(0,6).forEach(p=>out.push({g:'Clientes e fornecedores',ic:'empresas',t:p.nome,s:nE(p.empresa_id)+(p.documento?fmtDoc(p.documento):'sem documento'),ir:()=>{S.lancBusca=p.nome;location.hash='lancamentos';if(rota()==='lancamentos')render()}}));
  S.empresas.filter(e=>bate(nomeEmp(e)+' '+e.razao_social+' '+(e.cnpj||''),ts)).slice(0,5).forEach(e=>out.push({g:'Empresas',ic:'empresas',t:nomeEmp(e),s:e.razao_social,ir:()=>{location.hash='empresas'}}));
  S.bancos.filter(b=>emps.has(b.empresa_id)&&bate(b.banco_nome+' '+b.agencia+' '+b.conta,ts)).slice(0,5).forEach(b=>out.push({g:'Contas bancárias',ic:'bancos',t:b.banco_nome,s:nE(b.empresa_id)+'ag '+b.agencia+' · cc '+b.conta,ir:()=>{location.hash='bancos'}}));
  if(estado.lancs){const num=parseFloat(q.replace(/\./g,'').replace(',','.'));
    estado.lancs.filter(l=>{const c=conta(l.conta_id),p=l.parceiro_id?parceiro(l.parceiro_id):null;
      return bate([l.descricao,c?.codigo,c?.nome,p?.nome,l.numero_nf].join(' '),ts)||(isFinite(num)&&Math.abs(Math.abs(l.valor)-num)<0.005)})
    .sort((a,b)=>b.competencia.localeCompare(a.competencia)).slice(0,10)
    .forEach(l=>{const c=conta(l.conta_id);out.push({g:'Lançamentos',ic:'lancamentos',t:l.descricao||c?.nome||'Lançamento',s:nE(l.empresa_id)+dataBR(l.competencia)+' · '+(c?c.codigo+' '+c.nome:''),v:brlF(l.valor),ir:()=>abrirLanc(l.id)})})}
  return out}
const fmtDoc=d=>{const s=String(d||'').replace(/\D/g,'');return s.length===14?s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):s.length===11?s.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4'):s};

function marca(txt,ts){return typeof marcaBusca==='function'?marcaBusca(txt,ts):esc(txt)}
function desenhar(){
  const box=document.getElementById('pgRes');if(!box)return;const ts=termosDe(estado.q);
  if(!estado.itens.length){box.innerHTML=`<div class="pg-vazio">Nada encontrado para “${esc(estado.q)}”.<br>Tente parte do nome, sem acento, um código de conta (ex.: 2.01) ou um valor (ex.: 159,90).</div>`;return}
  let g='',h='';estado.itens.forEach((it,i)=>{if(it.g!==g){g=it.g;h+=`<div class="pg-grp">${esc(g)}</div>`}
    h+=`<button class="pg-it ${i===estado.sel?'on':''}" data-pg="${i}" type="button">${icone(it.ic,16)}<span class="t"><span>${marca(it.t,ts)}</span><small>${esc(it.s||'')}</small></span>${it.v?`<span class="v">${esc(it.v)}</span>`:''}</button>`});
  box.innerHTML=h;box.querySelector('.pg-it.on')?.scrollIntoView({block:'nearest'})}
function atualizar(){estado.itens=procurar(estado.q);estado.sel=0;desenhar()}
function abrir(){
  if(document.getElementById('pgFundo')||!S.user)return;
  const el=document.createElement('div');el.className='pg-fundo';el.id='pgFundo';
  el.innerHTML=`<div class="pg" role="dialog" aria-modal="true" aria-label="Pesquisar no app"><div class="pg-in">${'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'}<input id="pgQ" type="search" placeholder="Pesquisar conta, lançamento, fornecedor, empresa ou tela…" autocomplete="off" aria-label="Pesquisar"></div>
    <div class="pg-res" id="pgRes" role="listbox"></div><div class="pg-pe"><span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span><span id="pgCarr">carregando lançamentos…</span></div></div>`;
  document.body.appendChild(el);const i=document.getElementById('pgQ');i.focus();estado.q='';atualizar();
  carregarLancs().then(()=>{const c=document.getElementById('pgCarr');if(c)c.textContent='lançamentos de '+[...new Set([S.ano,+HOJE.slice(0,4)])].join(' e ');if(estado.q)atualizar()});
}
function fechar(){document.getElementById('pgFundo')?.remove()}
function escolher(i){const it=estado.itens[i];if(!it)return;fechar();it.ir()}
window.abrirPesquisaGeral=abrir;

document.addEventListener('keydown',ev=>{
  if((ev.ctrlKey||ev.metaKey)&&!ev.altKey&&(ev.key==='k'||ev.key==='K')){if(S.user){ev.preventDefault();document.getElementById('pgFundo')?fechar():abrir()}return}
  if(!document.getElementById('pgFundo'))return;
  if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();fechar()}
  else if(ev.key==='ArrowDown'){ev.preventDefault();estado.sel=Math.min(estado.itens.length-1,estado.sel+1);desenhar()}
  else if(ev.key==='ArrowUp'){ev.preventDefault();estado.sel=Math.max(0,estado.sel-1);desenhar()}
  else if(ev.key==='Enter'&&ev.target.id==='pgQ'){ev.preventDefault();escolher(estado.sel)}
},true);
document.addEventListener('input',ev=>{if(ev.target.id==='pgQ'){estado.q=ev.target.value;atualizar()}});
document.addEventListener('click',ev=>{
  if(ev.target.closest('[data-acao=pesquisa-geral]')){ev.stopPropagation();abrir();return}
  const it=ev.target.closest('[data-pg]');if(it){escolher(+it.dataset.pg);return}
  if(ev.target.id==='pgFundo')fechar()},true);
// dados mudaram (novo lançamento etc.): a próxima pesquisa recarrega
const inv0=window.invalidar;if(typeof inv0==='function')window.invalidar=function(){estado.lancs=null;return inv0.apply(this,arguments)};
})();
