// ===================== Versão 2 · Fechamento do mês, trilha de alterações e segregação de funções
// Telas novas no grupo "Controle e auditoria":
//  · Fechamento do mês: checklist por mês e trava (migração 0017). Mês fechado não aceita mudar lançamento nem baixa.
//  · Trilha de alterações: quem incluiu, alterou ou apagou o quê, com o antes e o depois.
// E mais: "Histórico" dentro de cada lançamento e conta do plano, e a chave de segregação de funções em Aprovações.
// Sem a migração 0017 no banco, as telas avisam que falta atualizar e o resto do app segue igual.
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;
IC.fechamento='<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>';
IC.historico='<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>';

const css=document.createElement('style');css.textContent=`
.fm-meses{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.fm{border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;background:var(--surface);min-width:0}
.fm.fechado{background:var(--surface-2)}.fm-h{display:flex;justify-content:space-between;align-items:center;gap:8px}.fm-h b{font-size:14.5px;text-transform:capitalize}
.fm ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:12.5px}
.fm li{display:flex;gap:6px;align-items:flex-start}.fm li .ok{color:var(--good)}.fm li .no{color:var(--warn)}
.fm small{color:var(--ink-2);font-size:12px}
.tr-diff{display:flex;flex-direction:column;gap:2px;font-size:12.5px}.tr-diff span{overflow-wrap:anywhere}
.tr-diff .de{color:var(--bad);text-decoration:line-through}.tr-diff .para{color:var(--good)}
.tr-filtros{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tr-filtros input,.tr-filtros select{border:1px solid var(--line);border-radius:6px;padding:6px 10px;background:var(--surface);font:inherit;color:var(--ink);min-width:0}
.regra-seg{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
.chave{position:relative;display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-weight:600}
.chave input{appearance:none;width:42px;height:24px;border-radius:12px;background:var(--line);position:relative;cursor:pointer;transition:background .15s;flex:none;margin:0}
.chave input::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .15s}
.chave input:checked{background:var(--good)}.chave input:checked::after{left:21px}
.chave input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
`;document.head.appendChild(css);

const MESN=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const semTabela=e=>/does not exist|relation .* does not exist|schema cache|Could not find the table|PGRST20[05]/i.test(String(e?.message||e?.code||e||''));
const faltaBanco=t=>vazio('Falta atualizar o banco de dados',`<p style="margin:0">${t} começa a funcionar quando a atualização 0017 for aplicada no banco. O resto do app segue normal.</p>`);
const ehAdmin=emp=>S.master||S.papeis[emp]==='admin';
const veTrilha=()=>S.master||Object.values(S.papeis).some(p=>p==='admin'||p==='financeiro');

// ---------- Fechamento do mês
async function vFechamento(){
  const emps=S.empresas;if(!emps.length)return semEmpresa();
  if(!emps.some(e=>e.id===S.fmEmp))S.fmEmp=(selEmp()[0]||emps[0]).id;const emp=S.fmEmp;
  const {data:fs,error}=await sb.from('fechamentos').select('*').eq('empresa_id',emp).order('mes',{ascending:false});
  if(error)return semTabela(error)?faltaBanco('O fechamento do mês'):vazio('Não consegui ler os fechamentos',`<p style="margin:0">${esc(traduz(error))}</p>`);
  // últimos 12 meses até o mês atual
  const hoje=new Date(HOJE+'T12:00:00Z');const meses=[];for(let i=0;i<12;i++){const d=new Date(Date.UTC(hoje.getUTCFullYear(),hoje.getUTCMonth()-i,1));meses.push(d.toISOString().slice(0,10))}
  const anos=[...new Set(meses.map(m=>+m.slice(0,4)))];const ls=(await Promise.all(anos.map(a=>lancAno(a)))).flat().filter(l=>l.empresa_id===emp);
  const ab=(await parcelasAbertas()).filter(p=>p.empresa_id===emp);
  const {data:exts}=await sb.from('extratos').select('id,periodo_inicio,periodo_fim,situacao').eq('empresa_id',emp);
  let pend={};const ids=(exts||[]).map(x=>x.id);for(let i=0;i<ids.length;i+=100){const {data}=await sb.from('extrato_linhas').select('extrato_id,status').in('extrato_id',ids.slice(i,i+100));(data||[]).forEach(l=>{if(l.status==='nao_lancado'||l.status==='valor_diferente')pend[l.extrato_id]=(pend[l.extrato_id]||0)+1})}
  const fm=new Map((fs||[]).map(f=>[f.mes,f]));const adm=ehAdmin(emp);
  const cards=meses.map(m=>{const ym=m.slice(0,7),f=fm.get(m),fechado=f?.situacao==='fechado';
    const lm=ls.filter(l=>l.competencia.startsWith(ym));
    const semG=lm.filter(l=>{const c=conta(l.conta_id);return c&&!c.grupo_dre&&!ehTransf(c)}).length;
    const venc=ab.filter(p=>p.vencimento.startsWith(ym)&&p.vencimento<HOJE).length;
    const exM=(exts||[]).filter(x=>x.periodo_inicio&&x.periodo_inicio.slice(0,7)<=ym&&(x.periodo_fim||x.periodo_inicio).slice(0,7)>=ym);
    const exPend=exM.reduce((s,x)=>s+(pend[x.id]||0),0);
    const chk=[[exM.length>0&&!exPend,exM.length?(exPend?`${exPend} linha${exPend>1?'s':''} de extrato sem conciliar`:'Extratos conciliados'):'Nenhum extrato importado'],
      [!semG,semG?`${semG} lançamento${semG>1?'s':''} em conta sem grupo da DRE`:'Tudo classificado na DRE'],
      [!venc,venc?`${venc} conta${venc>1?'s':''} vencida${venc>1?'s':''} sem baixa`:'Nada vencido sem baixa']];
    const ok=chk.every(c=>c[0]);const futuro=ym>=HOJE.slice(0,7);
    return `<div class="fm ${fechado?'fechado':''}"><div class="fm-h"><b>${MESN[+m.slice(5,7)-1]} ${m.slice(0,4)}</b>${fechado?'<span class="chip info">🔒 Fechado</span>':f?.situacao==='reaberto'?'<span class="chip warn">Reaberto</span>':futuro?'<span class="chip mute">Em andamento</span>':ok?'<span class="chip good">Pronto para fechar</span>':'<span class="chip mute">Aberto</span>'}</div>
      <small>${lm.length} lançamento${lm.length===1?'':'s'}${fechado?` · fechado por ${esc(f.fechado_por_nome||'')} em ${dataBR(String(f.fechado_em).slice(0,10))}`:f?.situacao==='reaberto'?` · reaberto por ${esc(f.reaberto_por_nome||'')}: ${esc(f.motivo_reabertura||'')}`:''}</small>
      ${fechado?'':`<ul>${chk.map(([o,t])=>`<li><span class="${o?'ok':'no'}">${o?'✓':'!'}</span><span>${esc(t)}</span></li>`).join('')}</ul>`}
      ${adm&&!futuro?fechado?`<button class="linkbtn small" data-fm="reabrir" data-mes="${m}" style="align-self:flex-start">Reabrir mês</button>`:`<button class="btn ${ok?'':'ghost'}" data-fm="fechar" data-mes="${m}" data-ok="${ok?1:0}" style="align-self:flex-start">Fechar ${MESN[+m.slice(5,7)-1]}</button>`:''}</div>`});
  const nF=(fs||[]).filter(f=>f.situacao==='fechado').length;const ultimoF=(fs||[]).find(f=>f.situacao==='fechado');
  return `<div class="grid g-tiles" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="tile"><span class="lbl">Último mês fechado</span><span class="val" style="text-transform:capitalize">${ultimoF?MESN[+ultimoF.mes.slice(5,7)-1]+'/'+ultimoF.mes.slice(2,4):'–'}</span><span class="cmp">${ultimoF?'até lá nada muda sem reabrir':'nenhum mês fechado ainda'}</span></div>
    <div class="tile"><span class="lbl">Meses fechados</span><span class="val">${nF}</span><span class="cmp">${(fs||[]).filter(f=>f.situacao==='reaberto').length} reaberto(s)</span></div>
    <div class="tile"><span class="lbl">Quem fecha</span><span class="val" style="font-size:16px">Administrador</span><span class="cmp">${adm?'<span class="chip good">você pode fechar</span>':'<span class="chip mute">peça ao administrador</span>'}</span></div></div>
  <div class="panel"><div class="ph"><div><h2>Fechamento do mês</h2><p class="hint">Fechar trava o mês: ninguém lança, altera ou apaga lançamentos com competência nele, nem muda pagamentos feitos nele. Para corrigir, o administrador reabre informando o motivo, e tudo fica na trilha de alterações.</p></div>
    <div class="ctrls"><select id="fmEmp" aria-label="Empresa">${opcoesEmp(emp,false)}</select></div></div>
    <div class="fm-meses">${cards.join('')}</div></div>`}

function formFechar(m,ok){const n=MESN[+m.slice(5,7)-1]+' de '+m.slice(0,4);
  drawer(`<h3>Fechar ${n}</h3><form data-fmform="fechar" data-mes="${m}" class="form-grid">
    <p class="wide" style="margin:0">Depois de fechado, ninguém lança, altera ou apaga lançamentos de ${n}, nem muda pagamentos feitos nele, até o administrador reabrir.</p>
    ${ok?'':'<div class="wide effect" style="border-left-color:var(--warn);background:var(--warn-soft)">O checklist deste mês tem pendências. Dá para fechar mesmo assim, mas registre o motivo abaixo.</div>'}
    <div class="field wide"><label for="fmObs">Observação ${ok?'(opcional)':''}</label><input id="fmObs" name="obs" ${ok?'':'required minlength="5"'} placeholder="${ok?'Ex.: conferido com o contador':'Ex.: extrato da Caixa chega dia 10, sem impacto no resultado'}"></div>
    <div class="wide" style="display:flex;gap:8px"><button class="btn">Fechar o mês</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`)}
function formReabrir(m){const n=MESN[+m.slice(5,7)-1]+' de '+m.slice(0,4);
  drawer(`<h3>Reabrir ${n}</h3><form data-fmform="reabrir" data-mes="${m}" class="form-grid">
    <p class="wide" style="margin:0">O mês volta a aceitar mudanças. O motivo fica registrado na trilha de alterações. Lembre de fechar de novo depois de corrigir.</p>
    <div class="field wide"><label for="fmMot">Motivo da reabertura</label><input id="fmMot" name="motivo" required minlength="5" placeholder="Ex.: nota fiscal lançada com valor errado"></div>
    <div class="wide" style="display:flex;gap:8px"><button class="btn">Reabrir</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`)}
async function gravarFechamento(f){
  const m=f.dataset.mes,emp=S.fmEmp;let r;
  if(f.dataset.fmform==='fechar'){const {data:ja}=await sb.from('fechamentos').select('id').eq('empresa_id',emp).eq('mes',m).maybeSingle();
    r=ja?await sb.from('fechamentos').update({situacao:'fechado',observacao:f.obs.value.trim()||null}).eq('id',ja.id):await sb.from('fechamentos').insert({empresa_id:emp,mes:m,situacao:'fechado',observacao:f.obs.value.trim()||null})}
  else r=await sb.from('fechamentos').update({situacao:'reaberto',motivo_reabertura:f.motivo.value.trim()}).eq('empresa_id',emp).eq('mes',m);
  if(r.error){toast(traduz(r.error));return}
  fecharDrawer();toast(f.dataset.fmform==='fechar'?'Mês fechado. Lançamentos dele agora estão travados.':'Mês reaberto. Lembre de fechar de novo depois de corrigir.');S._fechados=null;render(true)}

// meses fechados (para avisar no formulário de lançamento antes de tentar gravar)
async function fechados(){if(S._fechados)return S._fechados;const {data,error}=await sb.from('fechamentos').select('empresa_id,mes').eq('situacao','fechado');S._fechados=new Set(error?[]:(data||[]).map(f=>f.empresa_id+'|'+f.mes.slice(0,7)));return S._fechados}
window.mesFechado=async(emp,data)=>!!data&&(await fechados()).has(emp+'|'+String(data).slice(0,7));

// ---------- Trilha de alterações
const TAB={lancamentos:'Lançamento',parcelas:'Parcela',plano_contas:'Conta do plano',contas_bancarias:'Conta bancária',centros_custo:'Centro de custo',parceiros:'Cliente ou fornecedor',empresas:'Empresa',usuarios_empresas:'Acesso de usuário',alcadas:'Faixa de aprovação',impostos_config:'Imposto',acordos_cartao:'Taxa da maquininha',premissas_conta:'Premissa de prazo',extratos:'Extrato',fechamentos:'Fechamento do mês'};
const CAMPO={descricao:'Descrição',valor:'Valor',competencia:'Competência',vencimento:'Vencimento',data_pagamento:'Pago em',valor_pago:'Valor pago',status:'Situação',conta_id:'Conta',centro_custo_id:'Centro de custo',parceiro_id:'Cliente/fornecedor',conta_bancaria_id:'Conta bancária',predio_id:'Unidade',nome:'Nome',codigo:'Código',papel:'Papel',grupo_dre:'Grupo da DRE',ativa:'Ativa',ativo:'Ativo',situacao:'Situação',motivo_reabertura:'Motivo',forma_pagamento:'Forma de pagamento',numero:'Parcela',razao_social:'Razão social',nome_fantasia:'Nome fantasia',cnpj:'CNPJ/CPF',agencia:'Agência',conta:'Conta',banco_nome:'Banco',saldo_inicial:'Saldo inicial',data_saldo_inicial:'Data do saldo inicial',conta_pai:'Conta superior',analitica:'Analítica',tipo:'Tipo',aprovador:'Quem aprova',valor_a_partir:'A partir de',outra_pessoa:'Outra pessoa aprova',segregar_funcoes:'Segregação de funções',aliquota:'Alíquota',documento:'Documento',cor:'Cor',logo:'Logo',departamento_id:'Departamento',numero_nf:'Nota fiscal',origem:'Origem',observacao:'Observação',regime_tributario:'Regime',tipo_pessoa:'Tipo de pessoa'};
const ESCONDE=new Set(['id','empresa_id','criado_por','criado_por_nome','importacao_id','vinculo_id','lancamento_id','acordo_id','apuracao_id','nf_id','produto_id','fechado_por','reaberto_por','usuario_id','codigo_barras','linha_digitavel']);
function valorTxt(k,v){if(v==null||v==='')return '–';
  if(k==='conta_id'||k==='conta_pai'){const c=conta(v);return c?c.codigo+' '+c.nome:'(conta apagada)'}
  if(k==='centro_custo_id')return centro(v)?.nome||'(apagado)';if(k==='parceiro_id')return parceiro(v)?.nome||'(apagado)';
  if(k==='conta_bancaria_id'){const b=banco(v);return b?b.banco_nome+' cc '+b.conta:'(apagada)'}
  if(k==='predio_id')return S.predios.find(p=>p.id===v)?.nome||'(apagada)';
  if(k==='departamento_id')return (S.departamentos||[]).find(d=>d.id===v)?.nome||'(apagado)';
  if(k==='grupo_dre')return GRUPOS[v]||v;
  if(typeof v==='boolean')return v?'Sim':'Não';
  if(/valor|saldo/.test(k)&&isFinite(+v))return brl2.format(+v);
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))return dataBR(v);
  return String(typeof v==='object'?JSON.stringify(v):v)}
function descreve(r){const x=r.depois||r.antes||{};
  if(r.tabela==='lancamentos'){const c=conta(x.conta_id);return (x.descricao||c?.nome||'Lançamento')+(x.competencia?' · '+dataBR(x.competencia):'')}
  if(r.tabela==='parcelas')return 'Parcela'+(x.numero?' '+x.numero:'')+(x.vencimento?' · vence '+dataBR(x.vencimento):'');
  if(r.tabela==='plano_contas'){const c=conta(r.registro_id);return x.codigo||x.nome?(x.codigo||c?.codigo||'')+' '+(x.nome||c?.nome||''):(c?c.codigo+' '+c.nome:'')}
  if(r.tabela==='fechamentos')return x.mes?MESN[+x.mes.slice(5,7)-1]+' '+x.mes.slice(0,4):'';
  if(r.tabela==='usuarios_empresas')return x.papel?'papel '+x.papel:'';
  return x.nome||x.razao_social||x.banco_nome||x.descricao||''}
function diff(r){
  if(r.acao==='alteracao')return `<div class="tr-diff">${(r.campos||[]).filter(k=>!ESCONDE.has(k)).map(k=>`<span><b>${esc(CAMPO[k]||k)}:</b> <span class="de">${esc(valorTxt(k,r.antes?.[k]))}</span> → <span class="para">${esc(valorTxt(k,r.depois?.[k]))}</span></span>`).join('')||'<span class="muted">campos internos</span>'}</div>`;
  const x=r.depois||r.antes||{};const ks=Object.keys(x).filter(k=>!ESCONDE.has(k)&&x[k]!=null&&x[k]!==''&&CAMPO[k]).slice(0,6);
  return `<div class="tr-diff">${ks.map(k=>`<span><b>${esc(CAMPO[k])}:</b> ${esc(valorTxt(k,x[k]))}</span>`).join('')}</div>`}
const ACAO={inclusao:['Incluiu','good'],alteracao:['Alterou','info'],exclusao:['Apagou','bad']};
function linhasTrilha(rs,comEmp){return rs.map(r=>{const [a,c]=ACAO[r.acao]||[r.acao,'mute'];const d=new Date(r.em);
  return `<tr><td class="mono" style="white-space:nowrap">${d.toLocaleDateString('pt-BR')}<span class="unit">${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></td><td>${esc(r.usuario_nome||'–')}</td>${comEmp?`<td>${esc(nomeEmp(empresa(r.empresa_id))||'(empresa apagada)')}</td>`:''}<td><span class="chip ${c}">${a}</span></td><td><b>${esc(TAB[r.tabela]||r.tabela)}</b><span class="unit">${esc(descreve(r))}</span></td><td>${diff(r)}</td></tr>`}).join('')}
async function vHistorico(){
  if(!veTrilha())return vazio('Acesso restrito','<p style="margin:0">A trilha de alterações é vista pelo administrador e pelo financeiro.</p>');
  const F=S.tr||(S.tr={dias:30,tabela:'',quem:'',q:''});const emps=selEmp();
  let q=sb.from('auditoria').select('*').in('empresa_id',emps.map(e=>e.id)).gte('em',new Date(Date.now()-F.dias*864e5).toISOString()).order('em',{ascending:false}).limit(500);
  if(F.tabela)q=q.eq('tabela',F.tabela);
  const {data,error}=await q;if(error)return semTabela(error)?faltaBanco('A trilha de alterações'):vazio('Não consegui ler a trilha',`<p style="margin:0">${esc(traduz(error))}</p>`);
  const quem=[...new Set((data||[]).map(r=>r.usuario_nome||'–'))].sort();
  const t=norm(F.q).split(/\s+/).filter(Boolean);
  const rs=(data||[]).filter(r=>(!F.quem||(r.usuario_nome||'–')===F.quem)&&(!t.length||t.every(x=>norm(descreve(r)+' '+JSON.stringify(r.antes||{})+' '+JSON.stringify(r.depois||{})+' '+(TAB[r.tabela]||'')).includes(x))));
  const cont=k=>rs.filter(r=>r.acao===k).length;
  return `<div class="grid g-tiles" style="grid-template-columns:repeat(4,minmax(0,1fr))">
    <div class="tile"><span class="lbl">Registros no período</span><span class="val">${rs.length}</span><span class="cmp">últimos ${F.dias} dias${(data||[]).length===500?' · mostrando os 500 mais novos':''}</span></div>
    <div class="tile"><span class="lbl">Inclusões</span><span class="val">${cont('inclusao')}</span><span class="cmp"><span class="chip good">novos registros</span></span></div>
    <div class="tile"><span class="lbl">Alterações</span><span class="val">${cont('alteracao')}</span><span class="cmp"><span class="chip info">com antes e depois</span></span></div>
    <div class="tile"><span class="lbl">Exclusões</span><span class="val">${cont('exclusao')}</span><span class="cmp">${cont('exclusao')?'<span class="chip bad">confira</span>':'<span class="chip good">nenhuma</span>'}</span></div></div>
  <div class="panel"><div class="ph"><div><h2>Trilha de alterações</h2><p class="hint">Tudo que foi incluído, alterado ou apagado, por quem e quando. A trilha é gravada pelo banco de dados e ninguém consegue editar nem apagar.</p></div>
    <div class="tr-filtros"><input type="search" id="trQ" placeholder="Pesquisar (descrição, valor, conta…)" value="${esc(F.q)}" aria-label="Pesquisar na trilha" style="width:230px">
      <select id="trTab" aria-label="O quê"><option value="">Tudo</option>${Object.entries(TAB).map(([k,v])=>`<option value="${k}" ${F.tabela===k?'selected':''}>${v}</option>`).join('')}</select>
      <select id="trQuem" aria-label="Quem"><option value="">Todas as pessoas</option>${quem.map(n=>`<option ${F.quem===n?'selected':''}>${esc(n)}</option>`).join('')}</select>
      <select id="trDias" aria-label="Período">${[[1,'Hoje'],[7,'7 dias'],[30,'30 dias'],[90,'90 dias'],[365,'12 meses']].map(([d,n])=>`<option value="${d}" ${F.dias===d?'selected':''}>${n}</option>`).join('')}</select></div></div>
    ${rs.length?`<div class="tbl-wrap"><table><thead><tr><th>Quando</th><th>Quem</th>${emps.length>1?'<th>Empresa</th>':''}<th>Ação</th><th>O quê</th><th>Detalhe</th></tr></thead><tbody>${linhasTrilha(rs,emps.length>1)}</tbody></table></div>`:'<p class="muted" style="margin:0">Nada registrado com esses filtros.</p>'}</div>`}
document.addEventListener('change',ev=>{const t=ev.target;const F=S.tr||(S.tr={dias:30,tabela:'',quem:'',q:''});
  if(t.id==='trTab'){F.tabela=t.value;render(true)}else if(t.id==='trQuem'){F.quem=t.value;render(true)}else if(t.id==='trDias'){F.dias=+t.value;render(true)}
  else if(t.id==='fmEmp'){S.fmEmp=t.value;render(true)}
  else if(t.id==='segChave')mudaSegregacao(t)});
document.addEventListener('input',ev=>{if(ev.target.id==='trQ'){const F=S.tr;F.q=ev.target.value;clearTimeout(S._trT);S._trT=setTimeout(async()=>{const p=ev.target.selectionStart;await render(true);const i=document.getElementById('trQ');if(i){i.focus();i.setSelectionRange(p,p)}},300)}});

// histórico de um registro (lançamento com as parcelas, conta do plano)
async function historicoDe(tabela,ids,titulo){
  const {data,error}=await sb.from('auditoria').select('*').in('registro_id',ids).order('em',{ascending:false}).limit(200);
  if(error){toast(semTabela(error)?'A trilha de alterações começa depois da atualização 0017 do banco.':traduz(error));return}
  drawer(`<h3>Histórico · ${esc(titulo)}</h3>${data?.length?`<div class="tbl-wrap"><table><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>O quê</th><th>Detalhe</th></tr></thead><tbody>${linhasTrilha(data,false)}</tbody></table></div>`:'<p class="muted">Nenhuma alteração registrada desde que a trilha foi ligada.</p>'}<div style="margin-top:12px"><button class="btn ghost" data-acao="fechar">Fechar</button></div>`)}
const abrir0=abrirLanc;
abrirLanc=async function(id){const r=await abrir0.apply(this,arguments);const sh=document.querySelector('.sheet');
  if(sh&&veTrilha()&&!sh.querySelector('[data-hist-lanc]')){const fechado=await mesFechado(S._lancAberto?.l?.empresa_id,S._lancAberto?.l?.competencia).catch(()=>false);
    sh.insertAdjacentHTML('beforeend',`<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px">${fechado?'<span class="chip info">🔒 Mês fechado: para mudar, o administrador reabre o mês</span>':''}<button class="linkbtn small" data-hist-lanc="${id}">Ver histórico de alterações</button></div>`)}
  return r};
const formConta0=formConta;
formConta=function(id){const r=formConta0.apply(this,arguments);if(id&&veTrilha()){const f=document.querySelector('form[data-form=conta] .wide:last-child');f?.insertAdjacentHTML('beforeend',`<button type="button" class="linkbtn small" data-hist-conta="${id}">Histórico</button>`)}return r};

// ---------- Segregação de funções (em Aprovações)
async function mudaSegregacao(t){const emp=t.dataset.emp,on=t.checked;
  const {error}=await sb.from('empresas').update({segregar_funcoes:on}).eq('id',emp);
  if(error){t.checked=!on;toast(/segregar_funcoes/.test(error.message||'')?'A segregação de funções começa depois da atualização 0017 do banco.':traduz(error));return}
  const e=empresa(emp);if(e)e.segregar_funcoes=on;toast(on?'Segregação ligada: quem lança não aprova nem dá baixa no próprio lançamento.':'Segregação desligada.')}
if(typeof VIEWS!=='undefined'&&VIEWS.aprovacoes){const vA=VIEWS.aprovacoes;
  VIEWS.aprovacoes=async function(){const h=await vA();const es=selEmp().filter(e=>ehAdmin(e.id)||S.papeis[e.id]);if(!es.length)return h;
    return `<div class="panel"><div class="ph"><div><h2>Regras da empresa · segregação de funções</h2><p class="hint">Ligada, o sistema não deixa a mesma pessoa fazer as duas pontas: quem pediu a compra ou o pagamento não aprova, e quem lançou a conta não dá a baixa. Recomendado quando a empresa tem duas ou mais pessoas no financeiro.</p></div></div>
      <div style="display:flex;flex-direction:column;gap:10px">${es.map(e=>`<div class="regra-seg"><span style="display:flex;gap:8px;align-items:center">${seloEmp(e,24)}<b>${esc(nomeEmp(e))}</b></span><label class="chave"><input type="checkbox" id="segChave" data-emp="${e.id}" ${e.segregar_funcoes?'checked':''} ${ehAdmin(e.id)?'':'disabled'} aria-label="Segregação de funções em ${esc(nomeEmp(e))}">${e.segregar_funcoes?'Ligada':'Desligada'}</label></div>`).join('')}</div>
      ${es.some(e=>!ehAdmin(e.id))?'<p class="hint" style="margin-top:8px">Só o administrador da empresa liga ou desliga.</p>':''}</div>`+h}}

document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-fm]');if(b){if(b.dataset.fm==='fechar')formFechar(b.dataset.mes,b.dataset.ok==='1');else formReabrir(b.dataset.mes);return}
  const h=ev.target.closest('[data-hist-lanc]');if(h){const A=S._lancAberto;historicoDe('lancamentos',[h.dataset.histLanc,...(A?.ps||[]).map(p=>p.id)],A?.l?.descricao||'lançamento');return}
  const c=ev.target.closest('[data-hist-conta]');if(c){const x=conta(c.dataset.histConta);historicoDe('plano_contas',[c.dataset.histConta],x?x.codigo+' '+x.nome:'conta')}});
document.addEventListener('submit',ev=>{const f=ev.target;if(!f.dataset?.fmform)return;ev.preventDefault();ev.stopPropagation();gravarFechamento(f)},true);
document.addEventListener('change',ev=>{const t=ev.target;if(t.name==='competencia'&&t.form?.dataset.form==='lanc'){const emp=t.form.empresa?.value;mesFechado(emp,t.value).then(f=>{let w=t.form.querySelector('.aviso-fechado');if(f&&!w){t.closest('.field')?.insertAdjacentHTML('beforeend','<small class="aviso-fechado" style="color:var(--bad)">🔒 Mês fechado: não vai gravar</small>')}else if(!f&&w)w.remove()})}});

// rotas
const iC=ROTAS.findIndex(x=>x[0]==='auditoria');
if(!ROTAS.some(x=>x[0]==='fechamento'))ROTAS.splice(iC>=0?iC+1:ROTAS.length,0,['fechamento','Fechamento do mês'],['historico','Trilha de alterações']);
TITULOS.fechamento='Fechamento do mês';TITULOS.historico='Trilha de alterações';
VIEWS.fechamento=vFechamento;VIEWS.historico=vHistorico;USA_EMP.add('historico');
const pv=podeVer;podeVer=function(r){if(r==='historico')return veTrilha();return pv(r)};
const inv=window.invalidar;if(typeof inv==='function')window.invalidar=function(){S._fechados=null;return inv.apply(this,arguments)};
})();
