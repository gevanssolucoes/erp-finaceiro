// ===================== Cadastros da empresa (autonomia do cliente, sem SQL)
// Uma tela só para criar, alterar, excluir ou desativar os cadastros do dia a dia:
// centros de custo, fornecedores e clientes, unidades, departamentos e produtos e serviços.
// Atalhos para os cadastros que já têm tela própria (plano de contas, contas bancárias, impostos, usuários, colaboradores).
// Excluir: se o cadastro já foi usado, o banco recusa e a tela oferece Desativar (some das listas, fica nos relatórios).
// Importar e exportar Excel por cadastro. Quem grava é admin ou financeiro da empresa (regras do banco).
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;
IC.cadastros='<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>';
const K=S.cad=S.cad||{emp:null,tab:'centros',q:'',inativos:false,cache:{}};
const sim=v=>v?'Sim':'Não';
const contasDe=(emp,tipo)=>S.contas.filter(c=>c.empresa_id===emp&&c.analitica!==false&&(!tipo||c.tipo===tipo)).sort((a,b)=>a.codigo.localeCompare(b.codigo,undefined,{numeric:true}));
const PIX={cpf:'CPF',cnpj:'CNPJ',email:'E-mail',telefone:'Telefone',aleatoria:'Chave aleatória'};

// campo: [nome no banco, rótulo, tipo, obrigatório, opções(emp)=>[[valor,texto]]]
const TABS={
  centros:{tabela:'centros_custo',nome:'Centros de custo',um:'centro de custo',ordem:'nome',temAtivo:true,
    campos:[['codigo','Código','texto'],['nome','Nome','texto',1],['responsavel','Responsável','texto']],
    chave:r=>F_(r.codigo)||F_(r.nome)},
  parceiros:{tabela:'parceiros',nome:'Fornecedores e clientes',um:'fornecedor ou cliente',ordem:'nome',temAtivo:true,
    campos:[['nome','Nome ou razão social','texto',1],['documento','CNPJ ou CPF','doc'],['fornecedor','Fornecedor','bool'],['cliente','Cliente','bool'],['email','E-mail','email'],
      ['conta_padrao_id','Conta padrão nas notas','sel',0,emp=>contasDe(emp).map(c=>[c.id,c.codigo+' '+c.nome])],
      ['pix_tipo','Tipo da chave PIX','sel',0,()=>Object.entries(PIX)],['pix_chave','Chave PIX','texto']],
    nota:'Banco, agência e conta para pagamento ficam em Pagamentos ao banco, que pede conferência antes de pagar.',
    chave:r=>F_(String(r.documento||'').replace(/\D/g,''))||F_(r.nome)},
  unidades:{tabela:'predios',nome:'Unidades',um:'unidade',ordem:'nome',temAtivo:true,
    campos:[['nome','Nome','texto',1],['endereco','Endereço','texto']],chave:r=>F_(r.nome)},
  departamentos:{tabela:'departamentos',nome:'Departamentos',um:'departamento',ordem:'nome',temAtivo:true,
    campos:[['nome','Nome','texto',1],['responsavel','Responsável','texto'],['centro_custo_id','Centro de custo','sel',0,emp=>S.centros.concat(S.centrosInat||[]).filter(c=>c.empresa_id===emp).map(c=>[c.id,(c.codigo?c.codigo+' ':'')+c.nome])]],
    chave:r=>F_(r.nome)},
  produtos:{tabela:'produtos',nome:'Produtos e serviços',um:'produto ou serviço',ordem:'nome',temAtivo:true,
    campos:[['codigo','Código','texto'],['nome','Nome','texto',1],['tipo','Tipo','sel',1,()=>[['produto','Produto'],['servico','Serviço']]],['unidade','Unidade (UN, KG, H…)','texto'],['ncm','NCM','texto'],
      ['preco_padrao','Preço de venda','num'],['custo_padrao','Custo','num'],
      ['conta_receita_id','Conta de receita','sel',0,emp=>contasDe(emp,'receita').map(c=>[c.id,c.codigo+' '+c.nome])],
      ['conta_custo_id','Conta de custo','sel',0,emp=>contasDe(emp,'despesa').map(c=>[c.id,c.codigo+' '+c.nome])],['controla_estoque','Controla estoque','bool']],
    chave:r=>F_(r.codigo)||F_(r.nome)},
};
function F_(v){return String(v??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()}
const ATALHOS=[['plano','Plano de contas','Contas, grupos da DRE, criar e desativar'],['bancos','Contas bancárias','Bancos, saldos iniciais e convênios'],['tributos','Impostos e maquininha','Regime, alíquotas e taxas de cartão'],['premissas-v3','Premissas de pagamento','Prazos de compra e recebimento'],['usuarios','Usuários e acessos','Quem entra e o que pode fazer'],['pessoas','Colaboradores','Equipe, salários e departamentos'],['empresas','Empresa','Dados cadastrais e CNPJ']];

const css=document.createElement('style');css.textContent=`
.cad-tabs{display:flex;gap:6px;flex-wrap:wrap}
.cad-tabs button{font:inherit;font-size:13px;font-weight:600;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);border-radius:8px;padding:8px 12px;cursor:pointer;min-height:38px}
.cad-tabs button[aria-selected="true"]{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.cad-tabs .n{font-weight:500;opacity:.7;margin-left:4px}
.cad-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}
.cad-bar input[type=search]{font:inherit;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:8px 10px;min-height:38px;flex:1 1 200px;min-width:0;background:var(--surface);color:var(--ink)}
.cad-tab{width:100%;border-collapse:collapse;font-size:13px}
.cad-tab th,.cad-tab td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;white-space:normal;overflow-wrap:anywhere}
.cad-tab th{font-size:11.5px;color:var(--ink-2);font-weight:600}
.cad-tab tr.off td{color:var(--ink-3)}
.cad-at{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:10px;margin-top:10px}
.cad-at button{font:inherit;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:10px 12px;cursor:pointer;color:var(--ink);display:flex;flex-direction:column;gap:2px;min-height:62px}
.cad-at button:hover{border-color:var(--ink-3)}.cad-at small{color:var(--ink-2);font-size:12px}
.cad-imp{border:1px solid var(--line);border-radius:10px;padding:12px;background:var(--surface-2);margin-bottom:12px}
`;document.head.appendChild(css);

// ---------- dados
async function linhas(tab,emp,forcar){const ck=tab+':'+emp;if(!forcar&&K.cache[ck])return K.cache[ck];const T=TABS[tab];
  const {data,error}=await sb.from(T.tabela).select('*').eq('empresa_id',emp).order(T.ordem);if(error)throw error;K.cache[ck]=data;return data}
async function contagens(emp){const out={};await Promise.all(Object.keys(TABS).map(async t=>{try{out[t]=(await linhas(t,emp)).filter(r=>r.ativo!==false).length}catch(e){out[t]='–'}}));return out}
async function depoisDeGravar(){K.cache={};await carregarCadastros();render(true)}
// cadastros desativados saem das listas de escolha do app, mas os nomes continuam nos relatórios
if(typeof carregarCadastros==='function'){const orig=carregarCadastros;carregarCadastros=async function(){await orig.apply(this,arguments);
  try{const [c,p,pr]=await Promise.all(['centros_custo','parceiros','produtos'].map(t=>sb.from(t).select('id').eq('ativo',false)));
    const fora=r=>new Set((r.data||[]).map(x=>x.id));const sc=fora(c),sp=fora(p),sr=fora(pr);
    S.centrosInat=S.centros.filter(x=>sc.has(x.id));S.centros=S.centros.filter(x=>!sc.has(x.id));
    S.parceirosInat=S.parceiros.filter(x=>sp.has(x.id));S.parceiros=S.parceiros.filter(x=>!sp.has(x.id));
    S.produtosInat=S.produtos.filter(x=>sr.has(x.id));S.produtos=S.produtos.filter(x=>!sr.has(x.id))}catch(e){console.warn('cadastros inativos',e)}}}

// ---------- tela
const valorTela=(T,c,r,emp)=>{const v=r[c[0]];if(c[2]==='bool')return sim(v);if(c[2]==='num')return v==null?'':(typeof brl2!=='undefined'?brl2:brl).format(+v);
  if(c[2]==='sel'){const o=(c[4](emp)||[]).find(x=>x[0]===v);return o?o[1]:''}return v??''};
async function vCadastros(){
  const emps=S.empresas;if(!emps.length)return semEmpresa();
  if(!emps.some(e=>e.id===K.emp))K.emp=(selEmp()[0]||emps[0]).id;const emp=K.emp,T=TABS[K.tab],pode=podeEditar(emp);
  const [rs,ns]=await Promise.all([linhas(K.tab,emp),contagens(emp)]);
  const q=F_(K.q);const vis=rs.filter(r=>(K.inativos||r.ativo!==false)&&(!q||T.campos.some(c=>F_(valorTela(T,c,r,emp)).includes(q))));
  const cols=T.campos.filter(c=>!['pix_tipo','ncm','unidade','custo_padrao','conta_custo_id','email'].includes(c[0])).slice(0,5);
  const nInat=rs.filter(r=>r.ativo===false).length;
  const selE=emps.length>1?`<label class="hint">Empresa<br><select id="cadEmp" class="v3-sel">${emps.map(e=>`<option value="${e.id}" ${e.id===emp?'selected':''}>${esc(nomeEmp(e))}</option>`).join('')}</select></label>`:'';
  return `<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end"><p class="hint" style="margin:0;max-width:720px">Tudo o que a empresa precisa cadastrar, num lugar só. Crie, altere, exclua ou desative${pode?'':' (seu acesso é só de consulta)'}.</p>${selE}</div>
   <div class="cad-tabs" role="tablist" style="margin-top:12px">${Object.entries(TABS).map(([k_,t])=>`<button role="tab" aria-selected="${k_===K.tab}" data-cadtab="${k_}">${t.nome}<span class="n">${ns[k_]}</span></button>`).join('')}</div>
   <section class="panel" style="margin-top:12px">
    <div class="cad-bar"><input type="search" id="cadQ" placeholder="Procurar em ${esc(T.nome.toLowerCase())}" value="${esc(K.q)}" aria-label="Procurar">
     ${nInat?`<label class="hint" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="cadInat" ${K.inativos?'checked':''}> Mostrar desativados (${nInat})</label>`:''}
     ${pode?`<button class="btn" data-cad="novo">Novo ${esc(T.um)}</button><button class="btn ghost" data-cad="importar">Importar Excel</button>`:''}<button class="btn ghost" data-cad="exportar">Exportar Excel</button></div>
    <div id="cadImp"></div>
    ${T.nota?`<p class="hint" style="margin:0 0 8px">${T.nota}</p>`:''}
    ${vis.length?`<div style="overflow-x:auto"><table class="cad-tab"><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}<th></th></tr></thead><tbody>${vis.map(r=>`<tr class="${r.ativo===false?'off':''}">${cols.map((c,i)=>`<td>${i===0?`<b>${esc(valorTela(T,c,r,emp))}</b>`:esc(valorTela(T,c,r,emp))}${i===0&&r.ativo===false?' <span class="chip mute">desativado</span>':''}</td>`).join('')}<td style="text-align:right">${pode?`<button class="linkbtn" data-cadedit="${r.id}">Alterar</button>`:''}</td></tr>`).join('')}</tbody></table></div>`
      :`<p class="hint" style="margin:8px 0">${rs.length?'Nada encontrado com esse filtro.':'Nenhum '+esc(T.um)+' cadastrado ainda.'}</p>`}
   </section>
   <h2 style="font-size:15px;margin:20px 0 0">Outros cadastros</h2>
   <div class="cad-at">${ATALHOS.filter(([r])=>TITULOS[r]&&podeVer(r)).map(([r,n,d])=>`<button data-v3go="${r}"><b>${n}</b><small>${d}</small></button>`).join('')}</div>`}

function formulario(r){const T=TABS[K.tab],emp=K.emp;const novo=!r;r=r||{fornecedor:true,tipo:'produto'};
  const campo=c=>{const [n,rot,tp,ob,ops]=c,v=r[n],id='cf_'+n;
    if(tp==='bool')return `<div class="field"><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" name="${n}" ${v?'checked':''}> ${rot}</label></div>`;
    if(tp==='sel')return `<div class="field"><label for="${id}">${rot}</label><select id="${id}" name="${n}" ${ob?'required':''}>${ob?'':'<option value="">—</option>'}${ops(emp).map(([a,b])=>`<option value="${esc(a)}" ${a===v?'selected':''}>${esc(b)}</option>`).join('')}</select></div>`;
    return `<div class="field${n==='nome'||n==='endereco'?' wide':''}"><label for="${id}">${rot}${ob?'':' <span class="hint">(opcional)</span>'}</label><input id="${id}" name="${n}" ${tp==='num'?'inputmode="decimal"':tp==='email'?'type="email"':''} ${ob?'required':''} maxlength="200" value="${esc(v==null?'':tp==='num'?String(v).replace('.',','):v)}"></div>`};
  drawer(`<h3>${novo?'Novo '+esc(T.um):'Alterar '+esc(T.um)}</h3><form data-cad-form="${novo?'':r.id}" class="form-grid">${T.campos.map(campo).join('')}
   ${!novo&&T.temAtivo?`<div class="field wide"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="ativo" ${r.ativo!==false?'checked':''}> Ativo (desmarque para tirar das listas de escolha sem apagar)</label></div>`:''}
   <div class="wide" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn">${novo?'Cadastrar':'Salvar'}</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button>${novo?'':`<button type="button" class="btn ghost" data-cadexc="${r.id}" style="margin-left:auto;color:var(--bad)">Excluir</button>`}</div></form>`)}

function lerForm(f){const T=TABS[K.tab],d={};T.campos.forEach(([n,,tp])=>{const el=f.elements[n];if(!el)return;
  if(tp==='bool')d[n]=el.checked;else if(tp==='num'){const t=el.value.trim();d[n]=t?+t.replace(/\./g,'').replace(',','.'):null;if(t&&!isFinite(d[n]))throw new Error('Valor inválido em '+n+'.')}
  else if(tp==='doc'){const t=el.value.replace(/\D/g,'');d[n]=t||null;if(t&&t.length!==11&&t.length!==14)throw new Error('CNPJ precisa de 14 dígitos e CPF de 11.')}
  else d[n]=el.value.trim()||null});
  if(f.elements.ativo)d.ativo=f.elements.ativo.checked;return d}
const msgErro=e=>e?.code==='23505'?'Já existe um cadastro com esse código ou documento nesta empresa.':traduz(e);

// ---------- Excel
function exportar(){const T=TABS[K.tab];const rs=K.cache[K.tab+':'+K.emp]||[];
  const cab=T.campos.map(c=>c[1]).concat(T.temAtivo?['Ativo']:[]);
  const rows=rs.map(r=>T.campos.map(c=>c[2]==='bool'?sim(r[c[0]]):c[2]==='num'?(r[c[0]]==null?'':+r[c[0]]):c[2]==='sel'?valorTela(T,c,r,K.emp):(r[c[0]]??'')).concat(T.temAtivo?[sim(r.ativo!==false)]:[]));
  const ws=XLSX.utils.aoa_to_sheet([cab,...rows]);ws['!cols']=cab.map(h=>({wch:Math.max(12,h.length+4)}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,T.nome.slice(0,31));
  XLSX.writeFile(wb,F_(T.nome).replace(/[^a-z0-9]+/g,'-')+'-'+F_(nomeEmp(S.empresas.find(e=>e.id===K.emp))).replace(/[^a-z0-9]+/g,'-')+'.xlsx');toast(rs.length?'Excel gerado. Pode alterar e importar de volta.':'Modelo vazio gerado: preencha e importe.')}
function deExcel(T,cab,l){const d={},nc=cab.map(F_);
  T.campos.forEach(([n,rot,tp,,ops])=>{const i=nc.indexOf(F_(rot));if(i<0)return;let v=l[i];if(v==null||v==='')return;
    if(tp==='bool')d[n]=/^(s|sim|x|1|true|verdadeiro)$/i.test(String(v).trim());
    else if(tp==='num'){d[n]=typeof v==='number'?v:+String(v).replace(/[R$\s]/g,'').replace(/\./g,'').replace(',','.');if(!isFinite(d[n]))delete d[n]}
    else if(tp==='doc')d[n]=String(v).replace(/\D/g,'')||null;
    else if(tp==='sel'){const o=ops(K.emp).find(([a,b])=>F_(b)===F_(v)||F_(a)===F_(v)||F_(b).startsWith(F_(v)+' '));if(o)d[n]=o[0]}
    else d[n]=String(v).trim()});
  const ia=nc.indexOf('ativo');if(T.temAtivo&&ia>=0&&l[ia]!=='')d.ativo=!/^(n|nao|0|false)$/i.test(F_(l[ia]));return d}
async function importar(file){const T=TABS[K.tab];const wb=XLSX.read(new Uint8Array(await file.arrayBuffer()),{type:'array'});
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:''}).filter(r=>r.some(x=>x!==''));if(rows.length<2)throw new Error('A planilha não tem linhas.');
  const cab=rows[0].map(String);const obrig=T.campos.filter(c=>c[3]);const falta=obrig.filter(c=>!cab.map(F_).includes(F_(c[1])));if(falta.length)throw new Error('Falta a coluna '+falta.map(c=>'“'+c[1]+'”').join(', ')+'. Exporte o Excel desta tela para ver o modelo.');
  const atuais=await linhas(K.tab,K.emp,true);const porChave=new Map(atuais.map(r=>[T.chave(r),r]));const novos=[],alts=[];let ign=0;
  rows.slice(1).forEach(l=>{const d=deExcel(T,cab,l);if(obrig.some(c=>d[c[0]]==null||d[c[0]]==='')){ign++;return}const r=porChave.get(T.chave(d));
    if(r){if(T.campos.some(c=>d[c[0]]!==undefined&&String(d[c[0]]??'')!==String(r[c[0]]??''))||(d.ativo!==undefined&&d.ativo!==(r.ativo!==false)))alts.push([r.id,d])}else novos.push(d)});
  K.imp={novos,alts,ign,nome:file.name};mostraImp()}
function mostraImp(){const i=K.imp,el=document.getElementById('cadImp');if(!el)return;if(!i){el.innerHTML='';return}
  el.innerHTML=`<div class="cad-imp"><b>${esc(i.nome)}</b><p style="margin:4px 0 8px">${i.novos.length} novo${i.novos.length===1?'':'s'}, ${i.alts.length} alteraç${i.alts.length===1?'ão':'ões'}${i.ign?`, ${i.ign} linha${i.ign>1?'s':''} sem os campos obrigatórios (ficam de fora)`:''}.</p>
   <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-cad="imp-ok" ${i.novos.length+i.alts.length?'':'disabled'}>Gravar</button><button class="btn ghost" data-cad="imp-cancela">Cancelar</button></div></div>`}

// ---------- eventos
document.addEventListener('click',async ev=>{
  const tb=ev.target.closest('[data-cadtab]');if(tb){K.tab=tb.dataset.cadtab;K.q='';K.imp=null;render(true);return}
  const ed=ev.target.closest('[data-cadedit]');if(ed){formulario((K.cache[K.tab+':'+K.emp]||[]).find(r=>r.id===ed.dataset.cadedit));return}
  const ex=ev.target.closest('[data-cadexc]');if(ex){const T=TABS[K.tab],id=ex.dataset.cadexc;
    if(ex.dataset.ok!=='1'){ex.dataset.ok='1';ex.textContent='Confirmar exclusão';return}
    const {error}=await sb.from(T.tabela).delete().eq('id',id);
    if(error){if(error.code==='23503'&&T.temAtivo){ex.dataset.ok='';ex.outerHTML=`<button type="button" class="btn ghost" data-caddes="${id}" style="margin-left:auto">Desativar</button>`;toast('Este cadastro já foi usado em lançamentos ou outros registros. Use Desativar: ele sai das listas e continua nos relatórios.');return}toast(msgErro(error));return}
    fecharDrawer();toast('Excluído.');await depoisDeGravar();return}
  const de=ev.target.closest('[data-caddes]');if(de){const {error}=await sb.from(TABS[K.tab].tabela).update({ativo:false}).eq('id',de.dataset.caddes);if(error){toast(msgErro(error));return}fecharDrawer();toast('Desativado.');await depoisDeGravar();return}
  const b=ev.target.closest('[data-cad]');if(!b)return;const a=b.dataset.cad;
  if(a==='novo')formulario(null);
  else if(a==='exportar')exportar();
  else if(a==='importar'){const i=document.createElement('input');i.type='file';i.accept='.xlsx,.xls,.csv';i.onchange=async()=>{try{await importar(i.files[0])}catch(e){toast(e.message)}};i.click()}
  else if(a==='imp-cancela'){K.imp=null;mostraImp()}
  else if(a==='imp-ok'){const T=TABS[K.tab],i=K.imp;b.disabled=true;b.textContent='Gravando…';
    try{if(i.novos.length){const {error}=await sb.from(T.tabela).insert(i.novos.map(d=>({...d,empresa_id:K.emp})));if(error)throw error}
      for(const [id,d] of i.alts){const {error}=await sb.from(T.tabela).update(d).eq('id',id);if(error)throw error}
      toast(`${i.novos.length} cadastrado${i.novos.length===1?'':'s'} e ${i.alts.length} alterado${i.alts.length===1?'':'s'}.`);K.imp=null;await depoisDeGravar()}
    catch(e){toast(msgErro(e));b.disabled=false;b.textContent='Gravar'}}
});
document.addEventListener('submit',async ev=>{const f=ev.target.closest('form[data-cad-form]');if(!f)return;ev.preventDefault();const T=TABS[K.tab];
  let d;try{d=lerForm(f)}catch(e){toast(e.message);return}const bt=f.querySelector('button:not([type=button])');bt.disabled=true;
  const id=f.dataset.cadForm;const {error}=id?await sb.from(T.tabela).update(d).eq('id',id):await sb.from(T.tabela).insert({...d,empresa_id:K.emp});
  bt.disabled=false;if(error){toast(msgErro(error));return}fecharDrawer();toast(id?'Alterações salvas.':'Cadastrado.');await depoisDeGravar()});
document.addEventListener('change',ev=>{const t=ev.target;if(t.id==='cadEmp'){K.emp=t.value;K.imp=null;render(true)}else if(t.id==='cadInat'){K.inativos=t.checked;render(true)}});
let qT;document.addEventListener('input',ev=>{if(ev.target.id!=='cadQ')return;clearTimeout(qT);const v=ev.target.value;qT=setTimeout(async()=>{K.q=v;await render(true);const i=document.getElementById('cadQ');if(i){i.focus();i.setSelectionRange(v.length,v.length)}},250)});

// ---------- registro no app
if(!ROTAS.some(x=>x[0]==='cadastros'))ROTAS.push(['cadastros','Cadastros da empresa']);
TITULOS.cadastros='Cadastros da empresa';VIEWS.cadastros=vCadastros;
})();
