// ===================== Versão 2 · Assistente de implantação
// Passo a passo para deixar uma empresa pronta: dados, identidade visual, plano de contas,
// bancos com saldo inicial, centros de custo, impostos, histórico e orçamento.
// Aparece no topo de "Empresas e unidades" e, enquanto faltar algo, no Painel da empresa escolhida.
(()=>{
if(typeof S==='undefined'||typeof VIEWS==='undefined')return;
IC.implantar='<path d="M4 20h16M6 16l4-4 3 3 5-6"/><circle cx="18" cy="6" r="2"/>';

const css=document.createElement('style');css.textContent=`
.imp{display:flex;flex-direction:column;gap:12px}
.imp-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.imp-bar{height:8px;background:var(--surface-2);border-radius:5px;overflow:hidden;flex:1;min-width:120px}.imp-bar span{display:block;height:100%;background:var(--accent);border-radius:5px}
.imp-prog{display:flex;align-items:center;gap:10px;font-family:var(--f-num);font-size:12.5px;color:var(--ink-2);min-width:220px;flex:1;max-width:420px}
.imp-passos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.imp-p{border:1px solid var(--line);border-radius:9px;padding:10px 12px;display:flex;flex-direction:column;gap:4px;min-width:0;background:var(--surface)}
.imp-p.ok{background:var(--good-soft);border-color:transparent}.imp-p .n{display:flex;gap:8px;align-items:center;font-weight:600;font-size:13px}
.imp-p .b{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-family:var(--f-num);font-size:11px;flex:none;background:var(--surface-2);color:var(--ink-2)}
.imp-p.ok .b{background:var(--good);color:#fff}.imp-p small{color:var(--ink-2);font-size:12px}
.imp-p .linkbtn{align-self:flex-start;margin-top:auto}
.imp-mini{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-2)}
@media (max-width:1100px){.imp-passos{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:560px){.imp-passos{grid-template-columns:minmax(0,1fr)}.imp-p.ok{display:none}.imp-p .n{font-size:13.5px}}
@media (max-width:640px){.grid.g-2e[style]{grid-template-columns:minmax(0,1fr)!important}}
`;document.head.appendChild(css);

const cacheN={};
async function nLanc(emp){if(cacheN[emp]!=null)return cacheN[emp];const {count}=await sb.from('lancamentos').select('id',{count:'exact',head:true}).eq('empresa_id',emp);return cacheN[emp]=count||0}
async function passos(e){
  const pf=e.tipo_pessoa==='pf',id=e.id;
  const cs=S.contas.filter(c=>c.empresa_id===id),an=cs.filter(c=>c.analitica&&c.ativa);
  const semG=an.filter(c=>!c.grupo_dre&&!(typeof ehTransf==='function'&&ehTransf(c))).length;
  const bs=S.bancos.filter(b=>b.empresa_id===id&&b.ativa!==false),bsSaldo=bs.filter(b=>b.data_saldo_inicial);
  let vers=[];try{vers=typeof versoesDe==='function'?await versoesDe(id):[]}catch(x){}
  const nl=await nLanc(id).catch(()=>0);
  const P=[
    {t:'Dados cadastrais',ok:!!e.razao_social&&(pf||!!e.regime_tributario),s:pf?'Nome e CPF':'Razão social, CNPJ e regime tributário',a:`<button class="linkbtn small" data-acao="dados-emp" data-emp="${id}">Completar dados</button>`},
    {t:'Identidade visual',ok:!!(e.logo||e.cor),s:'Logo e cor nos relatórios e no app',a:`<button class="linkbtn small" data-acao="marca-emp" data-emp="${id}">Escolher logo e cor</button>`},
    {t:'Plano de contas',ok:an.length>0&&!semG,s:an.length?(semG?`${semG} conta${semG>1?'s':''} sem grupo da DRE`:`${an.length} contas prontas`):'Nenhuma conta',a:`<button class="linkbtn small" data-imp-ir="plano" data-emp="${id}">Revisar plano</button>`},
    {t:'Contas bancárias',ok:bs.length>0&&bsSaldo.length===bs.length,s:bs.length?(bsSaldo.length<bs.length?`${bs.length-bsSaldo.length} sem saldo inicial`:`${bs.length} conta${bs.length>1?'s':''} com saldo inicial`):'Nenhuma conta cadastrada',a:`<button class="linkbtn small" data-acao="novo-banco" data-emp="${id}">${bs.length?'+ Outra conta':'Cadastrar conta'}</button>${bs.length&&bsSaldo.length<bs.length?` · <button class="linkbtn small" data-imp-ir="bancos" data-emp="${id}">Informar saldo</button>`:''}`},
    ...(pf?[]:[{t:'Centros de custo',ok:S.centros.some(c=>c.empresa_id===id),s:'Para separar os gastos por área',a:`<button class="linkbtn small" data-acao="novo-centro" data-emp="${id}">+ Centro de custo</button>`},
      {t:'Impostos e maquininha',ok:S.impostos.some(c=>c.empresa_id===id),s:'Alíquotas e vencimentos',a:`<button class="linkbtn small" data-imp-ir="tributos" data-emp="${id}">Configurar impostos</button>`}]),
    {t:'Histórico',ok:nl>0,s:nl?`${nl.toLocaleString('pt-BR')} lançamentos`:'Importe a planilha ou lance o primeiro',a:`<button class="linkbtn small" data-imp-ir="importar" data-emp="${id}">Importar planilha</button>`},
    {t:'Orçamento',ok:vers.length>0,s:vers.length?`${vers.length} versão(ões)`:'Monte o orçamento do ano',a:`<button class="linkbtn small" data-imp-ir="orcamento" data-emp="${id}">Montar orçamento</button>`},
  ];return P}
function cartao(e,P,compacto){
  const ok=P.filter(p=>p.ok).length,pc=Math.round(ok/P.length*100);
  const prox=P.find(p=>!p.ok);
  return `<div class="panel imp" data-imp="${e.id}"><div class="imp-top"><div><h2 style="display:flex;gap:8px;align-items:center">${icone('implantar',18)}${pc===100?'Implantação concluída':'Implantação da empresa'} · ${esc(nomeEmp(e))}</h2>
    <p class="hint">${pc===100?'Tudo pronto. A empresa já tem cadastro, plano, bancos, histórico e orçamento.':prox?'Próximo passo: <b>'+esc(prox.t)+'</b> · '+esc(prox.s)+'.':''}</p></div>
    <div class="imp-prog"><div class="imp-bar" role="progressbar" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da implantação"><span style="width:${pc}%"></span></div><span>${ok} de ${P.length}</span>${compacto?`<button class="linkbtn small" data-imp-ocultar="${e.id}" title="Esconder do painel">Ocultar</button>`:''}</div></div>
    <div class="imp-passos">${P.map((p,i)=>`<div class="imp-p ${p.ok?'ok':''}"><span class="n"><span class="b">${p.ok?'✓':i+1}</span>${esc(p.t)}</span><small>${esc(p.s)}</small>${p.ok||!podeEditar(e.id)?'':p.a}</div>`).join('')}</div></div>`}

// Empresas e unidades: um cartão por empresa ainda incompleta (e um resumo das prontas)
const vE=VIEWS.empresas;
VIEWS.empresas=async function(){const h=await vE();if(!S.empresas.length)return h;
  const lst=await Promise.all(S.empresas.map(async e=>({e,P:await passos(e)})));
  const inc=lst.filter(x=>x.P.some(p=>!p.ok)),prontas=lst.length-inc.length;
  return inc.map(x=>cartao(x.e,x.P)).join('')+(prontas?`<div class="imp-mini">${icone('implantar',16)}${prontas} empresa${prontas>1?'s':''} com implantação concluída.</div>`:'')+h};
// Painel: só quando há uma empresa escolhida e falta algo
const vP=VIEWS.painel;
VIEWS.painel=async function(){const h=await vP();const es=selEmp();if(es.length!==1)return h;const e=es[0];
  if(lsGet('gg_imp_oculta_'+e.id))return h;const P=await passos(e);if(P.every(p=>p.ok))return h;return cartao(e,P,true)+h};

document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-imp-ir]');if(b){const r=b.dataset.impIr,emp=b.dataset.emp;
    if(r==='plano')S.planoEmp=emp;else if(r==='bancos')S.bancoEmp=emp;else if(r==='tributos')S.tribEmp=emp;else if(r==='orcamento')S.orcEmp=emp;
    location.hash=r;return}
  const o=ev.target.closest('[data-imp-ocultar]');if(o){lsSet('gg_imp_oculta_'+o.dataset.impOcultar,1);o.closest('.imp')?.remove();toast('Escondi do painel. A implantação continua em Empresas e unidades.')}});
// novo lançamento ou importação mudam a contagem
const inv=window.invalidar;if(typeof inv==='function')window.invalidar=function(){Object.keys(cacheN).forEach(k=>delete cacheN[k]);return inv.apply(this,arguments)};
})();
