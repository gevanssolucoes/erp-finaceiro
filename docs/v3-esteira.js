// ===================== Versão 3 · Esteira de produção
// A pessoa registra o que está fazendo e o andamento (%) de cada atividade.
// O supervisor diz o que espera da entrega e avalia: "Atende" (conclui) ou "Não atende" (devolve com retorno).
// Quadro por coluna (A fazer, Em andamento, Aguardando supervisor, Concluído), filtros por pessoa e departamento.
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;
IC.producao='<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>';
const E=S.est=S.est||{emp:null,pessoa:'todas',depto:'',cache:{},pessoas:{}};
const COLS=[['a_fazer','A fazer'],['andamento','Em andamento'],['revisao','Aguardando supervisor'],['concluida','Concluído']];
const hojeBR=d=>d?d.slice(8,10)+'/'+d.slice(5,7):'';
const quando=t=>{const d=new Date(t);return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
const meuNome=()=>S.perfil?.nome||S.user?.email?.split('@')[0]||'Eu';

const css=document.createElement('style');css.textContent=`
.est-kan{display:grid;grid-template-columns:repeat(4,minmax(250px,1fr));gap:12px;overflow-x:auto;padding-bottom:4px}
.est-col{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px;min-width:250px}
.est-col h3{display:flex;justify-content:space-between;align-items:center;font-size:13px;margin:2px 4px}
.est-tk{font:inherit;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;cursor:pointer;color:var(--ink);width:100%}
.est-tk:hover{border-color:var(--ink-3)}
.est-tk .t{font-weight:700;font-size:13.5px;overflow-wrap:anywhere}
.est-tk .m{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--ink-2);flex-wrap:wrap}
.est-bar{height:8px;background:var(--surface-2);border:1px solid var(--line);border-radius:4px;overflow:hidden}
.est-bar i{display:block;height:100%;background:var(--v3-in,#1D8A43)}
.est-tk.atr .est-bar i{background:var(--bad)}
.est-tl{display:flex;flex-direction:column;gap:10px;border-left:2px solid var(--line);padding-left:12px;margin:0}
.est-tl div{font-size:13px}.est-tl small{color:var(--ink-3)}
.est-esp{background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:13px}
`;document.head.appendChild(css);

// ---------- dados
async function carregar(emp,forcar){
  if(!forcar&&E.cache[emp])return E.cache[emp];
  const [a,r]=await Promise.all([sb.from('atividades').select('*').eq('empresa_id',emp).order('prazo',{ascending:true,nullsFirst:false}),
    sb.from('atividades_registros').select('*').eq('empresa_id',emp).order('criado_em')]);
  if(a.error)throw a.error;if(r.error)throw r.error;
  E.cache[emp]={ativ:a.data,reg:r.data};return E.cache[emp]}
async function pessoas(emp){if(E.pessoas[emp])return E.pessoas[emp];const {data,error}=await sb.rpc('pessoas_da_empresa',{p_empresa:emp});E.pessoas[emp]=error?[{usuario_id:S.user.id,nome:meuNome()}]:data;return E.pessoas[emp]}
const atrasada=a=>a.status!=='concluida'&&a.prazo&&a.prazo<HOJE;
const supervisiona=a=>a.supervisor_id===S.user?.id||podeEditar(a.empresa_id);
function filtradas(D){return D.ativ.filter(a=>(E.pessoa==='todas'||(E.pessoa==='minhas'&&(a.responsavel_id===S.user?.id||a.supervisor_id===S.user?.id))||a.responsavel_nome===E.pessoa)&&(!E.depto||a.departamento_id===E.depto)
  &&(a.status!=='concluida'||(a.avaliado_em||a.atualizado_em||'')>=addDias(HOJE,-30)))}

// resumo para o Painel geral (operacional)
window.v3EsteiraResumo=async()=>{try{const out={atrasadas:0,revisao:0,minhas:0};for(const e of selEmp()){const D=await carregar(e.id);D.ativ.forEach(a=>{if(atrasada(a))out.atrasadas++;if(a.status==='revisao'&&supervisiona(a))out.revisao++;if(a.responsavel_id===S.user?.id&&a.status!=='concluida')out.minhas++})}return out}catch(e){return null}};

// ---------- tela
async function vProducao(){
  if(!S.empresas.length)return semEmpresa();
  if(!S.empresas.some(e=>e.id===E.emp))E.emp=(selEmp()[0]||S.empresas[0]).id;
  let D;try{D=await carregar(E.emp)}catch(e){if(/atividades|does not exist|schema cache/i.test(e.message||''))return vazio('A esteira de produção ainda não foi ativada','<p style="margin:0">Falta aplicar a atualização do banco (migração 0028). Depois disso a tela funciona sozinha.</p>');throw e}
  const ps=await pessoas(E.emp);const deps=(S.departamentos||[]).filter(d=>d.empresa_id===E.emp&&d.ativo!==false);
  const L=filtradas(D);const nomes=[...new Set(D.ativ.map(a=>a.responsavel_nome))].sort();
  const and=L.filter(a=>a.status==='andamento'),rev=L.filter(a=>a.status==='revisao'),atr=L.filter(atrasada),conc=L.filter(a=>a.status==='concluida');
  const card=(cls,t,v,d)=>`<div class="v3-k ${cls}"><span class="t">${t}</span><span class="v">${v}</span><span class="d">${d}</span></div>`;
  const tk=a=>{const at=atrasada(a);return `<button type="button" class="est-tk ${at?'atr':''}" data-est="${a.id}"><span class="t">${esc(a.titulo)}</span>
    <span class="m"><span>${esc(a.responsavel_nome)}${a.departamento_id?' · '+esc(deps.find(d=>d.id===a.departamento_id)?.nome||''):''}</span>${a.prazo?`<span style="${at?'color:var(--bad);font-weight:700':''}">prazo ${hojeBR(a.prazo)}</span>`:''}</span>
    <span class="est-bar" role="img" aria-label="${a.andamento}% feito"><i style="width:${a.andamento}%"></i></span>
    <span class="m"><span>${a.andamento}% feito</span>${a.avaliacao==='atende'?'<span class="chip good">atende</span>':a.avaliacao==='nao_atende'?'<span class="chip bad">devolvida</span>':a.status==='revisao'?`<span class="chip info">${supervisiona(a)?'avaliar':'em revisão'}</span>`:''}</span></button>`};
  return `<div class="v3">
   <div class="v3-bar"><div class="v3-fl">
     <div><div class="v3-lbl">Empresa</div><select class="v3-sel" id="estEmp" aria-label="Empresa">${opcoesEmp(E.emp,false)}</select></div>
     <div><div class="v3-lbl">Pessoa</div><select class="v3-sel" id="estPes" aria-label="Pessoa"><option value="todas">Todas</option><option value="minhas" ${E.pessoa==='minhas'?'selected':''}>Minhas (faço ou superviso)</option>${nomes.map(n=>`<option ${E.pessoa===n?'selected':''}>${esc(n)}</option>`).join('')}</select></div>
     ${deps.length?`<div><div class="v3-lbl">Departamento</div><select class="v3-sel" id="estDep" aria-label="Departamento"><option value="">Todos</option>${deps.map(d=>`<option value="${d.id}" ${E.depto===d.id?'selected':''}>${esc(d.nome)}</option>`).join('')}</select></div>`:''}
   </div><div class="v3-acts" data-nao-imprime><button class="btn ghost" type="button" data-est-excel>Exportar Excel</button><button class="btn" type="button" data-est-nova>+ Nova atividade</button></div></div>
   <div class="v3-cards">
    ${card('','Em andamento',String(and.length),and.length?'média '+Math.round(sum(and.map(a=>a.andamento))/and.length)+'% feito':'nenhuma agora')}
    ${card('plan','Aguardando supervisor',String(rev.length),'para avaliar')}
    ${card(atr.length?'neg':'','Atrasadas',String(atr.length),'prazo vencido')}
    ${card('in','Concluídas',String(conc.length),'nos últimos 30 dias')}
   </div>
   <div class="est-kan">${COLS.map(([k_,n])=>{const ts=L.filter(a=>a.status===k_);return `<div class="est-col"><h3>${n}<span class="chip mute">${ts.length}</span></h3>${ts.map(tk).join('')||'<span class="hint" style="padding:6px">Nada aqui.</span>'}</div>`}).join('')}</div>
   ${!D.ativ.length?`<p class="hint" style="margin:0">Comece com “+ Nova atividade”: diga o que precisa ser feito, quem faz, quem supervisiona, o prazo e o que se espera da entrega.</p>`:''}
  </div>`}

// ---------- formulários
async function formNova(){
  const ps=await pessoas(E.emp);const deps=(S.departamentos||[]).filter(d=>d.empresa_id===E.emp&&d.ativo!==false);
  const op=(sel)=>ps.map(p=>`<option value="${p.usuario_id}" ${p.usuario_id===sel?'selected':''}>${esc(p.nome)}${p.usuario_id===S.user?.id?' (eu)':''}</option>`).join('');
  drawer(`<h3>Nova atividade</h3><form data-est-form="nova" class="form-grid">
    <div class="field wide"><label for="eTit">O que precisa ser feito</label><input id="eTit" name="titulo" required maxlength="200" placeholder="Ex.: Conciliar extrato do Nubank de novembro"></div>
    <div class="field"><label for="eResp">Quem faz</label><select id="eResp" name="resp">${op(S.user?.id)}<option value="_outro">Outra pessoa (sem login)</option></select></div>
    <div class="field"><label for="eRespN">Nome, se for outra pessoa</label><input id="eRespN" name="respNome" placeholder="Nome"></div>
    <div class="field"><label for="eSup">Supervisor</label><select id="eSup" name="sup"><option value="">Sem supervisor</option>${op(ps.find(p=>p.usuario_id!==S.user?.id)?.usuario_id||'')}</select></div>
    <div class="field"><label for="ePrazo">Prazo</label><input id="ePrazo" name="prazo" type="date" value="${addDias(HOJE,7)}"></div>
    ${deps.length?`<div class="field wide"><label for="eDep">Departamento</label><select id="eDep" name="depto"><option value="">Nenhum</option>${deps.map(d=>`<option value="${d.id}">${esc(d.nome)}</option>`).join('')}</select></div>`:''}
    <div class="field wide"><label for="eEsp">O que o supervisor espera da entrega</label><textarea id="eEsp" name="esp" rows="3" placeholder="Ex.: tudo conciliado e diferenças explicadas até sexta"></textarea></div>
    <div class="field wide"><label for="eDesc">Detalhes (opcional)</label><textarea id="eDesc" name="desc" rows="2"></textarea></div>
    <div class="wide" style="display:flex;gap:8px"><button class="btn">Criar atividade</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`)}

function abrir(id){
  const D=E.cache[E.emp];const a=D.ativ.find(x=>x.id===id);if(!a)return;const regs=D.reg.filter(r=>r.atividade_id===id).slice().reverse();
  const sup=supervisiona(a);const resp=a.responsavel_id===S.user?.id||podeEditar(a.empresa_id)||!a.responsavel_id;
  drawer(`<div class="v3-lbl">${esc(a.responsavel_nome)}${a.supervisor_nome?' · supervisor '+esc(a.supervisor_nome):''}${a.prazo?' · prazo '+hojeBR(a.prazo):''}</div>
   <h3 style="margin-top:4px">${esc(a.titulo)}</h3>${a.descricao?`<p class="muted" style="margin:0">${esc(a.descricao)}</p>`:''}
   <div class="est-esp"><b>O supervisor espera:</b><br>${a.expectativa?esc(a.expectativa):'<span class="muted">Ainda não informado.</span>'}</div>
   ${a.avaliacao?`<div class="effect" style="margin:0">${a.avaliacao==='atende'?'Atende.':'Não atende, devolvida.'}${a.avaliacao_texto?' '+esc(a.avaliacao_texto):''} <small class="muted">· ${esc(a.avaliado_por||'')} ${a.avaliado_em?quando(a.avaliado_em):''}</small></div>`:''}
   ${resp&&a.status!=='concluida'?`<form data-est-form="andamento" data-id="${a.id}" style="display:flex;flex-direction:column;gap:10px">
     <div class="field"><label for="eAnd">Andamento: <b id="eAndV">${a.andamento}</b>%</label><input id="eAnd" name="and" type="range" min="0" max="100" step="5" value="${a.andamento}"></div>
     <div class="field"><label for="eNota">O que fiz ou o que está travando</label><textarea id="eNota" name="nota" rows="2" placeholder="Ex.: 12 de 20 notas lançadas, faltam as da Alfa."></textarea></div>
     <div><button class="btn">Registrar andamento</button> <span class="hint">Em 100% vai para o supervisor avaliar.</span></div></form>`:''}
   ${sup?`<form data-est-form="avaliar" data-id="${a.id}" style="display:flex;flex-direction:column;gap:10px;border-top:1px solid var(--line);padding-top:12px">
     <div class="field"><label for="eEsp2">O que você espera da entrega</label><textarea id="eEsp2" name="esp" rows="2">${esc(a.expectativa||'')}</textarea></div>
     <div class="field"><label for="eRet">Retorno para ${esc(a.responsavel_nome)} (obrigatório ao devolver)</label><textarea id="eRet" name="ret" rows="2"></textarea></div>
     <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" name="av" value="atende">Atende · concluir</button><button class="btn ghost" style="color:var(--bad)" name="av" value="nao_atende">Não atende · devolver</button><button class="btn ghost" name="av" value="esp">Só salvar a expectativa</button></div></form>`:''}
   <h3 style="font-size:14px">Histórico</h3><div class="est-tl">${regs.map(r=>`<div><b>${esc(r.autor_nome||'')}</b> <small>${quando(r.criado_em)}${r.andamento!=null?' · '+r.andamento+'%':''}</small><br>${esc(r.texto||'')}</div>`).join('')||'<small>Sem registros ainda.</small>'}</div>
   <div style="display:flex;gap:8px;flex-wrap:wrap">${a.criado_por===S.user?.id||podeEditar(a.empresa_id)?`<button type="button" class="btn ghost" style="color:var(--bad)" data-est-del="${a.id}">Excluir</button>`:''}<button type="button" class="btn ghost" data-acao="fechar">Fechar</button></div>`);
  const r=document.getElementById('eAnd');if(r)r.oninput=()=>{document.getElementById('eAndV').textContent=r.value}}

const aviso=m=>Object.assign(new Error(m),{aviso:true});
async function registrar(id,tipo,andamento,texto){const {error}=await sb.from('atividades_registros').insert({atividade_id:id,empresa_id:E.emp,tipo,andamento,texto:texto||null,autor_id:S.user.id,autor_nome:meuNome()});if(error)throw error}
document.addEventListener('submit',async ev=>{
  const f=ev.target.closest('[data-est-form]');if(!f)return;ev.preventDefault();ev.stopPropagation();const b=ev.submitter;if(b)b.disabled=true;
  try{const t=f.dataset.estForm;
    if(t==='nova'){const ps=await pessoas(E.emp);const r=f.resp.value,s_=f.sup.value;
      const rn=r==='_outro'?f.respNome.value.trim():ps.find(p=>p.usuario_id===r)?.nome;if(!rn)throw aviso('Diga quem faz a atividade.');
      const row={empresa_id:E.emp,titulo:f.titulo.value.trim(),descricao:f.desc.value.trim()||null,responsavel_id:r==='_outro'?null:r,responsavel_nome:rn,supervisor_id:s_||null,supervisor_nome:s_?ps.find(p=>p.usuario_id===s_)?.nome:null,prazo:f.prazo.value||null,departamento_id:f.depto?.value||null,expectativa:f.esp.value.trim()||null,criado_por:S.user.id,status:'a_fazer',andamento:0};
      const {data,error}=await sb.from('atividades').insert(row).select().single();if(error)throw error;await registrar(data.id,'comentario',0,'Atividade criada por '+meuNome()+'.');toast('Atividade criada.')}
    else if(t==='andamento'){const id=f.dataset.id,a=E.cache[E.emp].ativ.find(x=>x.id===id);const v=+f.and.value;
      const d={andamento:v,status:v>=100?'revisao':v>0?'andamento':'a_fazer'};if(a.avaliacao==='nao_atende'&&v>=100)d.avaliacao=null;
      if(v>=100&&!a.supervisor_id){d.status='concluida'}
      const {error}=await sb.from('atividades').update(d).eq('id',id);if(error)throw error;await registrar(id,'andamento',v,f.nota.value.trim()||('Andamento em '+v+'%.'));
      toast(d.status==='revisao'?'Registrado. Foi para o supervisor avaliar.':d.status==='concluida'?'Concluída.':'Andamento registrado.')}
    else if(t==='avaliar'){const id=f.dataset.id,av=b?.value||'esp',ret=f.ret.value.trim(),esp=f.esp.value.trim()||null;
      if(av==='nao_atende'&&!ret)throw aviso('Escreva o retorno para a pessoa saber o que ajustar.');
      const a=E.cache[E.emp].ativ.find(x=>x.id===id);const d={expectativa:esp};if(av!=='esp'){d.avaliacao=av;d.avaliacao_texto=ret||null;
        // o banco faz o mesmo (gatilho); aqui só para a tela já mostrar certo
        if(av==='atende'){d.status='concluida';d.andamento=100}else{d.status='andamento';d.andamento=Math.min(a.andamento,90)}}
      const {error}=await sb.from('atividades').update(d).eq('id',id);if(error)throw error;
      await registrar(id,av==='esp'?'expectativa':'avaliacao',null,av==='atende'?'Atende. Concluída.'+(ret?' '+ret:''):av==='nao_atende'?'Não atende, devolvida. '+ret:'Expectativa: '+(esp||'(em branco)'));
      toast(av==='atende'?'Concluída.':av==='nao_atende'?'Devolvida com o seu retorno.':'Expectativa salva.')}
    fecharDrawer();await carregar(E.emp,true);render(true)}
  catch(e){if(!e.aviso)console.error(e);toast(e.aviso?e.message:traduz(e));if(b)b.disabled=false}},true);
document.addEventListener('click',async ev=>{
  const t=ev.target.closest('[data-est]');if(t){abrir(t.dataset.est);return}
  if(ev.target.closest('[data-est-nova]')){formNova();return}
  const d=ev.target.closest('[data-est-del]');if(d){if(d.dataset.ok!=='1'){d.dataset.ok='1';d.textContent='Clique de novo para excluir';return}
    const {error}=await sb.from('atividades').delete().eq('id',d.dataset.estDel);if(error){toast(traduz(error));return}fecharDrawer();await carregar(E.emp,true);toast('Atividade excluída.');render(true);return}
  if(ev.target.closest('[data-est-excel]')){const D=E.cache[E.emp];if(!D||typeof XLSX==='undefined')return;const deps=S.departamentos||[];
    const rows=[['Atividade','Responsável','Supervisor','Departamento','Prazo','Andamento %','Situação','Avaliação','O supervisor espera','Atrasada']].concat(filtradas(D).map(a=>[a.titulo,a.responsavel_nome,a.supervisor_nome||'',deps.find(x=>x.id===a.departamento_id)?.nome||'',a.prazo||'',a.andamento,COLS.find(c=>c[0]===a.status)[1],a.avaliacao==='atende'?'Atende':a.avaliacao==='nao_atende'?'Não atende':'',a.expectativa||'',atrasada(a)?'sim':'']));
    const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:44},{wch:20},{wch:20},{wch:18},{wch:12},{wch:12},{wch:22},{wch:12},{wch:44},{wch:10}];XLSX.utils.book_append_sheet(wb,ws,'Esteira');
    XLSX.writeFile(wb,'esteira-de-producao-'+HOJE+'.xlsx');toast('Excel gerado.')}});
document.addEventListener('change',ev=>{const id=ev.target.id;
  if(id==='estEmp'){E.emp=ev.target.value;render(true)}else if(id==='estPes'){E.pessoa=ev.target.value;render(true)}else if(id==='estDep'){E.depto=ev.target.value;render(true)}});

// ---------- registro no app
if(!ROTAS.some(x=>x[0]==='producao'))ROTAS.push(['producao','Esteira de produção']);
TITULOS.producao='Esteira de produção';VIEWS.producao=vProducao;
})();
