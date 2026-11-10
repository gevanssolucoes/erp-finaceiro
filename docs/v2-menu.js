// ===================== Versão 2 · Menu por objetivo, com favoritos
// Agrupa as telas pelo que a pessoa quer fazer, esconde as telas "em breve"
// e deixa fixar favoritas no topo (estrela ao passar o mouse; fica salvo neste aparelho).
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;

const GRUPOS_V2=[
  ['Dia a dia',['painel','lancamentos','contas','pagamentos','boletos','aprovacoes']],
  ['Relatórios',['dre','fluxo','faturamento']],
  ['Controle e auditoria',['auditoria','fechamento','historico','excecoes','compras','estoque','nfs']],
  ['Planejamento',['orcamento','premissas','salario']],
  ['Cadastros',['plano','empresas','bancos','tributos','importar','usuarios']],
  ['Pessoas',['pessoas','ausencias']],
  ['Sistema',['admin']],
];
const chaveFav=()=>'gg_fav_'+(S.user?.id||'');
const favs=()=>{const v=lsGet(chaveFav());return Array.isArray(v)?v:[]};
window.menuFavoritos=favs;

const nomes={};
function reorganizar(){
  ROTAS.forEach(r=>{if(r[0]!=='g'&&!r[4])nomes[r[0]]=r});
  const usados=new Set(),novo=[];
  const f=favs().filter(id=>nomes[id]&&!nomes[id][2]);
  if(f.length){novo.push(['g','Favoritos']);f.forEach(id=>novo.push([id,nomes[id][1],0,0,'fav']))}
  GRUPOS_V2.forEach(([g,ids])=>{const its=ids.filter(id=>nomes[id]&&!nomes[id][2]);if(!its.length)return;novo.push(['g',g]);its.forEach(id=>{novo.push(nomes[id]);usados.add(id)})});
  // telas novas que ainda não estão nos grupos acima ficam no fim, em "Outras"
  const resto=Object.keys(nomes).filter(id=>!usados.has(id)&&!nomes[id][2]);
  if(resto.length){novo.push(['g','Outras']);resto.forEach(id=>novo.push(nomes[id]))}
  // telas "em breve" continuam abrindo pelo endereço, mas saem do menu (ficam guardadas em "nomes")
  ROTAS.splice(0,ROTAS.length,...novo);
  Object.keys(nomes).forEach(id=>{if(!TITULOS[id])TITULOS[id]=nomes[id][1]});
}

const css=document.createElement('style');css.textContent=`
.nav a{position:relative}
.nav a .fav{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:0;padding:3px;color:var(--side-ink-2);cursor:pointer;opacity:0;line-height:0;border-radius:4px}
.nav a:hover .fav,.nav a:focus-within .fav,.nav a .fav.on{opacity:1}.nav a .fav.on{color:#e3b04a}
.nav a .fav:hover{background:var(--side-hi);color:#fff}
.nav a:hover .count{visibility:hidden}
.app.mini .nav a .fav{display:none}
@media (hover:none){.nav a .fav{display:none}}
`;document.head.appendChild(css);
const estrela=on=>`<svg viewBox="0 0 24 24" width="13" height="13" fill="${on?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/></svg>`;

const rn0=renderNav;
renderNav=function(r){
  reorganizar();rn0(r);
  const fs=new Set(favs());
  document.querySelectorAll('#nav a[href^="#"]').forEach(a=>{const id=a.getAttribute('href').slice(1);if(!id)return;
    if(a.querySelector('.fav'))return;const on=fs.has(id);
    a.insertAdjacentHTML('beforeend',`<button type="button" class="fav ${on?'on':''}" data-fav="${id}" aria-label="${on?'Tirar dos favoritos':'Fixar nos favoritos'}" title="${on?'Tirar dos favoritos':'Fixar nos favoritos'}">${estrela(on)}</button>`)});
};
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-fav]');if(!b)return;ev.preventDefault();ev.stopPropagation();
  const id=b.dataset.fav,f=favs();const i=f.indexOf(id);if(i>=0)f.splice(i,1);else f.push(id);lsSet(chaveFav(),f);
  renderNav(rota());toast(i>=0?'Tirei dos favoritos.':'Fixei nos favoritos, no topo do menu.')},true);
})();
