// ===================== Dois produtos: Gevans Gestor (ERP completo) e Gevans Dados (só indicadores)
// Porta do Gevans Dados: o mesmo endereço do app com ?p=dados (o link fica lembrado neste aparelho).
// Quem só tem empresas do produto "dados" (migração 0032) entra com a marca Gevans Dados e vê apenas
// Indicadores, Conexões de dados, Cadastros (centros de custo, plano de contas...) e Usuários. Quem tem alguma empresa "gestor" continua com o app completo.
(()=>{
if(typeof S==='undefined'||typeof telaAuth!=='function')return;
const qs=new URLSearchParams(location.search);
if(qs.get('p')==='dados'||qs.get('p')==='gestor'){lsSet('gg_produto',qs.get('p'));history.replaceState(null,'',location.pathname+location.hash)}
const portaDados=()=>lsGet('gg_produto')==='dados';
const PERMITIDAS=new Set(['indicadores','perguntas','caixa','depara','usuarios','conexoes','cadastros']);
const NOME_DADOS='Gevans Dados';

// ---------- tela de login com a marca do produto
const ta=telaAuth;
telaAuth=function(modo,aviso){ta(modo,aviso);const a=document.getElementById('auth');if(!a)return;
  if(portaDados()){document.title=NOME_DADOS;const s=a.querySelector('.marca-v small');if(s)s.textContent=NOME_DADOS+' · sua base vira indicadores';
    a.querySelector('[data-auth="primeiro"]')?.remove();
    a.querySelector('.auth-card')?.insertAdjacentHTML('beforeend','<p style="margin-top:14px;font-size:12.5px"><a href="?p=gestor">Usa o Gevans Gestor completo? Entre por aqui.</a></p>')}
  else if(modo==='login')a.querySelector('.auth-card')?.insertAdjacentHTML('beforeend','<p style="margin-top:14px;font-size:12.5px"><a href="?p=dados">Cliente do Gevans Dados (só indicadores)? Entre por aqui.</a></p>')};

// ---------- modo Dados depois de carregar as empresas
const cc=carregarCadastros;
const NOME_GESTOR=APP_NOME;
// Quem tem empresas dos dois produtos (ex.: a Gevans com os clientes do Dados) trabalha em um bloco por vez:
// as empresas do Gestor juntas (com "Todas as empresas") ou um cliente do Dados sozinho, no modo Dados.
function aplicarProduto(escolha){
  const todas=S.todasEmp||S.empresas,cli=todas.filter(e=>e.produto==='dados'),ges=todas.filter(e=>e.produto!=='dados');
  if(cli.length&&ges.length){const d=cli.find(e=>e.id===escolha);S.empresas=d?[d]:ges;
    const ks=new Set(unidades().map(u=>u.key)),sel=new Set([...(S.sel||[])].filter(k=>ks.has(k)));S.sel=sel.size?sel:ks}
  else S.empresas=todas;
  S.modoDados=S.empresas.length>0&&S.empresas.every(e=>e.produto==='dados')&&(!S.master||cli.length&&ges.length);
  lsSet('gg_produto',S.modoDados?'dados':'gestor');document.body.classList.toggle('modo-dados',!!S.modoDados);
  APP_NOME=S.modoDados?NOME_DADOS:NOME_GESTOR;if(S.modoDados){document.title=NOME_DADOS;const n=document.getElementById('brandNome');if(n)n.textContent=NOME_DADOS}}
window.aplicarProduto=aplicarProduto;
carregarCadastros=async function(){await cc.apply(this,arguments);S.todasEmp=S.empresas.slice();aplicarProduto(lsGet('gg_emp'))};
const pv=podeVer;podeVer=function(r){if(S.modoDados&&!PERMITIDAS.has(r))return false;return pv(r)};
const ro=rota;rota=function(){if(!S.modoDados)return ro();const h=location.hash.slice(1);
  if(h==='fluxo-bi'||h==='gestao'){S.indic=S.indic||{};S.indic.tab=h;history.replaceState(null,'','#indicadores');return 'indicadores'}
  const r=ro();if(PERMITIDAS.has(r))return r;if(h!=='indicadores')history.replaceState(null,'','#indicadores');return 'indicadores'};
const rn=renderNav;renderNav=function(r){rn(r);if(!S.modoDados)return;const b=document.querySelector('#gvAssina b');if(b)b.textContent=NOME_DADOS;
  const g=document.querySelector('#nav .nav-group');if(g)g.textContent=NOME_DADOS};
// sem botão de lançamento e com o rodapé do produto
const st=document.createElement('style');st.textContent='body.modo-dados .fab{display:none!important}.auth-card p>a[href^="?p="]{color:var(--brand,#0f6475);font-weight:600;text-decoration:none}';document.head.appendChild(st);
const v=document.getElementById('view');if(v)new MutationObserver(()=>{if(!S.modoDados)return;const b=v.querySelector('.gv-rodape b');if(b&&b.textContent!==NOME_DADOS){b.textContent=NOME_DADOS;const sp=b.parentElement;if(sp&&sp.lastChild&&sp.lastChild.nodeType===3)sp.lastChild.textContent=' · indicadores a partir dos seus dados, por Gevans Soluções'}}).observe(v,{childList:true});
})();
