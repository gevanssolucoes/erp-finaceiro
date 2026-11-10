// ===================== Grupos de empresas (migração 0018)
// Cada grupo é um cliente da Gevans com uma ou mais empresas. Quem é de um grupo nunca enxerga outro:
// quem garante é o banco (RLS e gatilhos), não a tela. A conta master cria grupos, escolhe os
// administradores de cada grupo e verifica o isolamento. O administrador do grupo vê o grupo dele,
// cria empresas dentro dele e vê o consolidado do grupo.
(()=>{
if(typeof S==='undefined'||typeof VIEWS==='undefined'||typeof ROTAS==='undefined')return;

IC.grupos='<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/>';
S.grupos=[];S.grpAdmins=[];S.grpOk=null;S.grpPerfis=[];S.isoRes=null;

async function carregarGrupos(){
  const [g,a]=await Promise.all([sb.from('grupos').select('*').order('nome'),sb.from('grupos_admins').select('*')]);
  if(g.error){S.grpOk=false;S.grupos=[];S.grpAdmins=[];return}
  S.grpOk=true;S.grupos=g.data||[];S.grpAdmins=a.error?[]:(a.data||[]);
  if(S.master){const {data}=await sb.from('perfis').select('usuario_id,email,nome,master,ativo').order('email');S.grpPerfis=data||[]}
}
const _carregar=carregarCadastros;
carregarCadastros=async function(){await _carregar();await carregarGrupos()};

const grupo=id=>S.grupos.find(g=>g.id===id);
window.grupoDe=e=>e?grupo(e.grupo_id):null;
window.meusGruposAdmin=()=>S.user?S.grupos.filter(g=>S.grpAdmins.some(a=>a.grupo_id===g.id&&a.usuario_id===S.user.id)):[];
const gruposVisiveis=()=>S.master?S.grupos:meusGruposAdmin();
const empsDo=g=>S.empresas.filter(e=>e.grupo_id===g.id);
const perfil=uid=>S.grpPerfis.find(p=>p.usuario_id===uid);

// ---------- menu: Cadastros › Grupos de empresas (master e administradores de grupo)
const _podeVer=podeVer;
podeVer=function(r){if(r==='grupos')return S.grpOk!==false&&(!!S.master||meusGruposAdmin().length>0);return _podeVer(r)};
if(!ROTAS.some(x=>x[0]==='grupos')){const i=ROTAS.findIndex(x=>x[0]==='empresas');ROTAS.splice(i>=0?i+1:ROTAS.length,0,['grupos','Grupos de empresas'])}
TITULOS.grupos='Grupos de empresas';

// ---------- tela
const NIVEL={grave:['Grave','bad'],aviso:['Atenção','warn']};
const TIPO={
  usuario_em_dois_grupos:'Pessoas ligadas a empresas de dois grupos (o app já bloqueia o acesso delas até corrigir)',
  referencia_outro_grupo:'Registros que apontam para cadastro de outro grupo',
  referencia_outra_empresa:'Registros que apontam para cadastro de outra empresa do mesmo grupo',
};
const NOME_TAB={lancamentos:'Lançamentos',parcelas:'Parcelas',plano_contas:'Plano de contas',contas_bancarias:'Contas bancárias',orcamento_linhas:'Linhas do orçamento',premissas_conta:'Premissas de prazo',extrato_linhas:'Linhas de extrato',compras_pedidos:'Pedidos de compra',colaboradores:'Colaboradores',usuarios_empresas:'Acessos de usuários',notas_fiscais:'Notas fiscais',pagamento_itens:'Itens de pagamento'};
function tile(lbl,val,cmp){return `<div class="tile"><div class="lbl">${lbl}</div><div class="val">${val}</div><div class="cmp">${cmp}</div></div>`}

async function vGrupos(){
  if(S.grpOk===null)await carregarGrupos();
  if(S.grpOk===false)return vazio('Grupos ainda desligados',`<p style="margin:0">${S.master?'Falta aplicar a atualização <b>0018</b> do banco. Até lá cada usuário já só vê as empresas liberadas para ele, mas ainda não existe o grupo.':'Esta função ainda não foi liberada.'}</p>`);
  const gs=gruposVisiveis();
  const nAdm=new Set(S.grpAdmins.filter(a=>gs.some(g=>g.id===a.grupo_id)).map(a=>a.usuario_id)).size;
  const iso=S.isoRes;const graves=iso?iso.filter(r=>r.nivel==='grave').length:0;
  const tIso=!S.master?tile('Separação','<span style="font-size:17px">Pelo banco</span>','<span class="chip good">nenhum outro grupo enxerga</span>')
    :!iso?tile('Isolamento','<span style="font-size:15px">Não verificado</span>','<button class="linkbtn small" data-acao="grp-verificar">Verificar agora</button>')
    :tile('Isolamento',graves?`<span style="color:var(--bad)">${graves}</span>`:'<span style="font-size:17px">Isolado</span>',graves?'<span class="chip bad">problema grave</span>':iso.length?'<span class="chip warn">só avisos</span>':'<span class="chip good">nenhum cruzamento</span>');
  const cab=`<section class="grid g-tiles" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
    ${tile('Grupos',gs.length,S.master?'clientes da Gevans':'que você administra')}
    ${tile('Empresas',gs.reduce((s,g)=>s+empsDo(g).length,0),`${S.predios.filter(p=>gs.some(g=>empsDo(g).some(e=>e.id===p.empresa_id))).length} unidades`)}
    ${tile('Administradores de grupo',nAdm,'entram em todas as empresas do grupo')}
    ${tIso}
  </section>
  <div class="effect" style="margin-bottom:14px">Cada grupo é um cliente. Quem é de um grupo <b>nunca</b> vê as empresas, contas, bancos ou lançamentos de outro grupo: o próprio banco de dados recusa, mesmo que alguém tente pela tela ou direto pelo sistema. A conta master enxerga todos.</div>`;
  const ctrl=S.master?`<div style="display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn ghost" data-acao="grp-verificar">${icone('buscar',15)||''} Verificar isolamento</button><button class="btn" data-acao="grp-novo">Novo grupo</button></div>`:'';
  const painelIso=S.master&&iso?`<div class="panel"><div class="ph"><div><h2>Verificação de isolamento</h2><p class="hint">Procura em todas as tabelas qualquer ligação entre grupos diferentes. Não altera nada.</p></div></div>
    ${iso.length?`<div class="tbl-wrap"><table><thead><tr><th>Nível</th><th>O que é</th><th>Onde</th><th class="n">Quantos</th><th>Detalhe</th></tr></thead><tbody>${iso.map(r=>`<tr><td><span class="chip ${NIVEL[r.nivel]?.[1]||'mute'}">${NIVEL[r.nivel]?.[0]||esc(r.nivel)}</span></td><td>${esc(TIPO[r.tipo]||r.tipo)}</td><td>${esc(NOME_TAB[r.tabela]||r.tabela)}</td><td class="n">${num.format(r.quantidade)}</td><td class="mono" style="font-size:12px">${esc(r.detalhe||'')}</td></tr>`).join('')}</tbody></table></div>`
    :'<div class="effect" style="border-left-color:var(--good);background:var(--good-soft)">Tudo isolado. Nenhum grupo tem ligação com outro.</div>'}</div>`:'';
  if(!gs.length)return cab+ctrl+vazio('Nenhum grupo',S.master?'<p style="margin:0">Crie o primeiro grupo e coloque as empresas do cliente nele.</p>':'<p style="margin:0">Você não administra nenhum grupo.</p>');
  return cab+ctrl+painelIso+gs.map(g=>painelGrupo(g)).join('');
}
function painelGrupo(g){
  const es=empsDo(g),adms=S.grpAdmins.filter(a=>a.grupo_id===g.id);
  const souAdm=S.master||adms.some(a=>a.usuario_id===S.user?.id);
  const outros=S.grupos.filter(x=>x.id!==g.id);
  return `<div class="panel"><div class="ph"><div><h2 style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${esc(g.nome)} <span class="chip info" style="font-size:11px">${es.length} empresa${es.length===1?'':'s'}</span>${g.ativo===false?'<span class="chip mute">inativo</span>':''}</h2>
      <p class="hint" style="margin:0">${adms.length?`Administrado por ${adms.map(a=>esc(perfil(a.usuario_id)?.nome||perfil(a.usuario_id)?.email||(a.usuario_id===S.user?.id?'você':'administrador'))).join(', ')}`:'Sem administrador de grupo: só a conta master gerencia.'}</p></div>
    <div class="ctrls">${es.length>1||(es.length&&S.empresas.length>es.length)?`<button class="btn ghost" data-acao="grp-consolidado" data-grp="${g.id}">Ver consolidado</button>`:''}${souAdm?`<button class="btn ghost" data-acao="grp-renomear" data-grp="${g.id}">Renomear</button><button class="btn ghost" data-acao="grp-empresa" data-grp="${g.id}">+ Empresa</button>`:''}${S.master?`<button class="btn ghost" data-acao="grp-admin" data-grp="${g.id}">+ Administrador</button>`:''}</div></div>
    <div class="grid g-2e" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
      <div><b style="font-size:12px;color:var(--ink-2);text-transform:uppercase;letter-spacing:.06em">Empresas</b>
        ${es.length?`<div class="tbl-wrap"><table><tbody>${es.map(e=>`<tr><td style="width:40px">${seloEmp(e,28)}</td><td>${esc(nomeEmp(e))}<span class="unit">${docTipo(e)} <span class="mono">${esc(fmtCnpj(e.cnpj))}</span>${e.tipo_pessoa==='pf'?' · pessoa física':''}</span></td>
          <td style="text-align:right">${S.master&&outros.length?`<button class="linkbtn small" style="white-space:normal;text-align:right" data-acao="grp-mover" data-emp="${e.id}">Mudar de grupo</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted" style="font-size:13px">Nenhuma empresa neste grupo.</p>'}</div>
      <div><b style="font-size:12px;color:var(--ink-2);text-transform:uppercase;letter-spacing:.06em">Administradores do grupo</b>
        ${adms.length?`<div class="tbl-wrap"><table><tbody>${adms.map(a=>{const p=perfil(a.usuario_id);return `<tr><td>${esc(p?.nome||(a.usuario_id===S.user?.id?'Você':'Administrador'))}<span class="unit">${esc(p?.email||'')}</span></td><td style="text-align:right">${S.master?`<button class="linkbtn small" data-acao="grp-tira-admin" data-grp="${g.id}" data-uid="${a.usuario_id}" style="color:var(--bad)">Tirar</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`
          :'<p class="muted" style="font-size:13px;margin:6px 0 0">O administrador do grupo entra como administrador em todas as empresas do grupo, inclusive nas que forem criadas depois, e convida a equipe do cliente.</p>'}</div>
    </div></div>`;
}
VIEWS.grupos=vGrupos;

// ---------- formulários
const fNome=(g)=>`<h3>${g?'Renomear grupo':'Novo grupo'}</h3><form data-form="grp-nome" ${g?`data-grp="${g.id}"`:''} class="form-grid">
  <div class="field wide"><label for="gNome">Nome do grupo (ex.: nome do cliente)</label><input id="gNome" name="nome" required maxlength="120" value="${esc(g?.nome||'')}" autocomplete="off"></div>
  ${g?'':'<p class="hint wide" style="margin:0">Depois de criar, use “Mudar de grupo” nas empresas ou “+ Empresa” para cadastrar uma empresa já dentro dele.</p>'}
  <div class="wide" style="display:flex;gap:8px"><button class="btn">${g?'Salvar':'Criar grupo'}</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`;
const fAdmin=g=>{const ja=new Set(S.grpAdmins.filter(a=>a.grupo_id===g.id).map(a=>a.usuario_id));
  const ops=S.grpPerfis.filter(p=>!p.master&&p.ativo&&!ja.has(p.usuario_id));
  return `<h3>Administrador do grupo · ${esc(g.nome)}</h3><p class="muted" style="margin:0">A pessoa entra como administradora em todas as empresas do grupo. Ela precisa já ter cadastro no app (convide antes pela tela Usuários). Quem já usa o app em outro grupo não pode ser escolhido.</p>
  <form data-form="grp-admin" data-grp="${g.id}" class="form-grid">
  <div class="field wide"><label for="gAdm">Pessoa</label><input id="gAdm" name="email" list="dlGrpPerfis" type="email" required placeholder="e-mail da pessoa" autocomplete="off"><datalist id="dlGrpPerfis">${ops.map(p=>`<option value="${esc(p.email)}">${esc(p.nome||'')}</option>`).join('')}</datalist></div>
  <div class="wide" style="display:flex;gap:8px"><button class="btn">Tornar administrador</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`};
const fMover=e=>`<h3>Mudar de grupo · ${esc(nomeEmp(e))}</h3><p class="muted" style="margin:0">Hoje no grupo <b>${esc(grupoDe(e)?.nome||'')}</b>. Os administradores do grupo antigo perdem o acesso a esta empresa e os do grupo novo ganham. Se alguém da empresa também usa outra empresa do grupo antigo, o banco recusa até você tirar esse acesso.</p>
  <form data-form="grp-mover" data-emp="${e.id}" class="form-grid">
  <div class="field wide"><label for="gDest">Novo grupo</label><select id="gDest" name="grupo" required>${S.grupos.filter(g=>g.id!==e.grupo_id).map(g=>`<option value="${g.id}">${esc(g.nome)}</option>`).join('')}</select></div>
  <div class="wide" style="display:flex;gap:8px"><button class="btn">Mudar de grupo</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`;

async function recarregar(){await carregarCadastros();renderNav(rota());render(true)}
Object.assign(FORMS,{
  async 'grp-nome'(f){const nome=f.nome.value.trim();if(!nome)return toast('Informe o nome.');
    const q=f.dataset.grp?sb.from('grupos').update({nome}).eq('id',f.dataset.grp):sb.from('grupos').insert({nome});
    const {error}=await q;if(error)throw error;fecharDrawer();toast(f.dataset.grp?'Grupo renomeado.':'Grupo criado.');await recarregar()},
  async 'grp-admin'(f){const email=f.email.value.trim().toLowerCase();const p=S.grpPerfis.find(x=>x.email.toLowerCase()===email);
    if(!p)return toast('Não achei este e-mail entre os usuários. Convide a pessoa pela tela Usuários antes.');
    if(p.master)return toast('Este e-mail é da equipe master: já enxerga todos os grupos.');
    const {error}=await sb.from('grupos_admins').insert({grupo_id:f.dataset.grp,usuario_id:p.usuario_id});if(error)throw error;
    fecharDrawer();toast('Administrador incluído. Já tem acesso a todas as empresas do grupo.');S.usuarios=null;await recarregar()},
  async 'grp-mover'(f){const e=empresa(f.dataset.emp);const g=grupo(f.grupo.value);
    if(!confirm(`Mudar “${nomeEmp(e)}” para o grupo “${g?.nome}”?`))return;
    const {error}=await sb.from('empresas').update({grupo_id:f.grupo.value}).eq('id',f.dataset.emp);if(error)throw error;
    fecharDrawer();toast('Empresa mudou de grupo.');S.isoRes=null;S.usuarios=null;await recarregar()},
});

document.addEventListener('click',async ev=>{
  const gs=ev.target.closest('[data-grpsel]');
  if(gs){const ks=unidades().filter(u=>u.emp.grupo_id===gs.dataset.grpsel).map(u=>u.key);if(ks.length){S.sel=new Set(ks);render();renderPop()}return}
  const b=ev.target.closest('[data-acao^="grp-"]');if(!b)return;const a=b.dataset.acao;
  try{
    if(a==='grp-novo')drawer(fNome());
    else if(a==='grp-renomear')drawer(fNome(grupo(b.dataset.grp)));
    else if(a==='grp-admin')drawer(fAdmin(grupo(b.dataset.grp)));
    else if(a==='grp-mover')drawer(fMover(empresa(b.dataset.emp)));
    else if(a==='grp-empresa'){S._grupoNovaEmp=b.dataset.grp;drawer(formNovaEmpresa())}
    else if(a==='grp-consolidado'){const ids=new Set(S.empresas.filter(e=>e.grupo_id===b.dataset.grp).map(e=>e.id));S.empAtiva=null;S.sel=new Set(unidades().filter(u=>ids.has(u.emp.id)).map(u=>u.key));location.hash='painel'}
    else if(a==='grp-verificar'){b.disabled=true;const {data,error}=await sb.rpc('verificar_isolamento');if(error)throw error;S.isoRes=data||[];if(rota()!=='grupos')location.hash='grupos';else render(true)}
    else if(a==='grp-tira-admin'){const g=grupo(b.dataset.grp),p=perfil(b.dataset.uid);
      if(!confirm(`Tirar ${p?.email||'esta pessoa'} da administração do grupo “${g?.nome}”? Ela também perde o acesso às empresas do grupo (dá para liberar de novo pela tela Usuários).`))return;b.disabled=true;
      const {error}=await sb.from('grupos_admins').delete().eq('grupo_id',b.dataset.grp).eq('usuario_id',b.dataset.uid);if(error)throw error;
      const ids=empsDo(g).map(e=>e.id);if(ids.length){const {error:e2}=await sb.from('usuarios_empresas').delete().eq('usuario_id',b.dataset.uid).in('empresa_id',ids);if(e2)throw e2}
      toast('Administrador retirado do grupo.');S.usuarios=null;await recarregar()}
  }catch(e){console.error(e);toast(traduz(e));b.disabled=false}
});

// ---------- filtro de empresas: atalho para marcar só as empresas de um grupo (consolidado do grupo)
const _renderPop=renderPop;
renderPop=function(){_renderPop();const pop=document.getElementById('pop');if(!pop)return;
  const gs=S.grupos.filter(g=>S.empresas.some(e=>e.grupo_id===g.id));if(gs.length<2)return;
  const marcado=g=>{const ks=unidades().filter(u=>u.emp.grupo_id===g.id).map(u=>u.key);return ks.length===S.sel.size&&ks.every(k=>S.sel.has(k))};
  pop.insertAdjacentHTML('afterbegin',`<div class="grp" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><small class="muted" style="width:100%">Consolidado do grupo</small>${gs.map(g=>`<button type="button" class="chip ${marcado(g)?'info':'mute'}" data-grpsel="${g.id}" style="cursor:pointer;border:0">${esc(g.nome)}</button>`).join('')}</div>`)};

if(S.user)carregarGrupos().then(()=>renderNav(rota()));
})();
