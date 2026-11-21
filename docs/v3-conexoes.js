// ===================== Gevans Dados no Gestor · Conexões de dados
// Obter dados (como o "Obter dados" do Power BI): arquivo Excel/CSV/PDF/JSON, link de API ou banco SQL do cliente.
// A base fica guardada na empresa (dados_bases/dados_linhas, migração 0030) e entra nas mesmas telas de BI.
// Entregar dados: Excel e PDF (telas de BI), API com chave por empresa e acesso SQL só de leitura, para Power BI e Excel.
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined'||!window.FontesDados)return;
const F=window.FontesDados;
IC.conexoes='<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>';
const API_URL=SUPABASE_URL+'/functions/v1/dados-api';
const DB={host:'db.vovomhtwqfnlidqlmycu.supabase.co',pooler:'aws-0-sa-east-1.pooler.supabase.com',ref:'vovomhtwqfnlidqlmycu',porta:5432,banco:'postgres'};
const RECURSOS=[['fluxo_mensal','Tudo mês a mês: realizado e orçado, por competência e por caixa'],['realizado_competencia','Realizado por competência, linha a linha'],['realizado_caixa','Pagamentos e recebimentos efetivos'],['contas_abertas','Contas a pagar e a receber em aberto'],['orcado_competencia','Orçamento e forecast por competência'],['orcado_caixa','Orçamento e forecast por caixa (com as premissas)'],['contas','Plano de contas'],['empresas','Empresa']];
const C=S.cx=S.cx||{emp:null,fonte:'arquivo',tabelas:[],t:0,mapa:{},n:null,origem:'',detalhe:'',ver:null,ano:null,cache:{}};
const dataBR=t=>t?new Date(t).toLocaleDateString('pt-BR'):'–';
const ehAdmin=id=>S.papeis[id]==='admin';
const ORIG={excel:'Excel',csv:'CSV',pdf:'PDF',web:'Link de API',sql:'Banco SQL',manual:'Manual'};

const css=document.createElement('style');css.textContent=`
.cx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:14px}
.cx-fontes{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px}
.cx-fontes button{font:inherit;font-size:13px;font-weight:600;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);border-radius:8px;padding:8px 12px;cursor:pointer;min-height:38px}
.cx-fontes button[aria-pressed="true"]{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.cx-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.cx-form label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--ink-2);min-width:0}
.cx-form input,.cx-form select,.cx-form textarea{font:inherit;font-size:13px;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:7px;padding:8px 10px;min-height:38px;min-width:0;width:100%}
.cx-form textarea{font-family:ui-monospace,Menlo,Consolas,monospace;min-height:90px;resize:vertical}
.cx-form .full{grid-column:1/-1}
.cx-map{width:100%;border-collapse:collapse;font-size:13px}.cx-map td{padding:5px 6px;border-bottom:1px solid var(--line)}
.cx-map select{font:inherit;font-size:13px;width:100%;border:1px solid var(--line);border-radius:6px;padding:5px 7px;background:var(--surface);color:var(--ink)}
.cx-seg{word-break:break-all;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:8px 10px;display:block}
.cx-passos{margin:6px 0 0;padding-left:20px;font-size:13px;display:flex;flex-direction:column;gap:4px}
.cx-tab{width:100%;border-collapse:collapse;font-size:13px}.cx-tab th,.cx-tab td{padding:7px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.cx-tab th{font-size:11.5px;color:var(--ink-2);font-weight:600}
.cx-wrap{overflow-x:auto}
.cx-tab td{white-space:normal;overflow-wrap:anywhere}.cx-tab code{overflow-wrap:anywhere}
`;document.head.appendChild(css);

// ---------- dados
async function bases(emp){const {data,error}=await sb.from('dados_bases').select('*').eq('empresa_id',emp).order('atualizado_em',{ascending:false});if(error)throw error;return data}
async function acessos(emp){const {data,error}=await sb.from('acessos_dados').select('id,tipo,nome,prefixo,papel,criado_em,ultimo_uso,usos,revogado_em').eq('empresa_id',emp).order('criado_em',{ascending:false});if(error)throw error;return data}
const faltaMigracao=e=>/dados_bases|acessos_dados|relation .* does not exist|schema cache/i.test(e?.message||'');

// ---------- telas
function blocoFonte(){const f=C.fonte;let corpo='';
  if(f==='arquivo')corpo=`<label class="drop" for="cxArq" style="border:2px dashed var(--line);border-radius:10px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:6px;background:var(--surface-2);cursor:pointer;text-align:center"><b>Escolher arquivo</b><span class="hint">Excel, CSV, PDF com tabela ou JSON</span><input id="cxArq" type="file" accept=".xlsx,.xls,.csv,.pdf,.json" hidden></label>`;
  else if(f==='web')corpo=`<div class="cx-form"><label class="full">Link da API ou do arquivo (JSON ou CSV)<input id="cxUrl" type="url" placeholder="https://api.seusistema.com/lancamentos"></label><label>Cabeçalho (opcional)<input id="cxHn" placeholder="Authorization"></label><label>Valor do cabeçalho<input id="cxHv" type="password" autocomplete="off" placeholder="Bearer …"></label></div><div style="margin-top:8px"><button class="btn" data-cx="buscar-web">Buscar</button></div>`;
  else corpo=`<div class="cx-form"><label>Banco<select id="cxTipo"><option value="postgres">PostgreSQL</option><option value="mysql">MySQL / MariaDB</option><option value="sqlserver">SQL Server</option></select></label><label>Servidor<input id="cxHost" placeholder="servidor.empresa.com.br"></label><label>Porta<input id="cxPorta" inputmode="numeric" placeholder="padrão"></label><label>Banco de dados<input id="cxBanco"></label><label>Usuário<input id="cxUser" autocomplete="off"></label><label>Senha<input id="cxSenha" type="password" autocomplete="new-password"></label><label class="full">Consulta (só SELECT)<textarea id="cxSql" spellcheck="false" placeholder="select tipo, competencia, conta, valor from vw_orcado_realizado"></textarea></label></div><p class="hint" style="margin:6px 0 0">A senha vale só para esta busca e não fica guardada. Use um usuário só de leitura e o endereço público do servidor.</p><div style="margin-top:8px"><button class="btn" data-cx="buscar-sql">Consultar</button></div>`;
  return corpo}
function blocoMapa(){const t=C.tabelas[C.t];if(!t)return '';const n=C.n;
  const op=i=>`<option value="">— não tem —</option>`+t.cab.map((h,j)=>`<option value="${j}" ${i===j?'selected':''}>${esc(h)}</option>`).join('');
  const nO=n.rows.filter(r=>r.tipo==='orcado').length,nR=n.rows.length-nO;const e=n.erros,fora=e.semConta+e.semData+e.semValor+e.semTipo;
  return `<div class="panel" style="margin-top:14px"><h2 style="font-size:15px;margin:0 0 4px">Confira as colunas</h2><p class="hint" style="margin:0 0 8px">${esc(C.detalhe)} · ${num.format(t.linhas.length)} linhas lidas</p>
   ${C.tabelas.length>1?`<label class="hint">Aba ou tabela <select id="cxTab" class="v3-sel">${C.tabelas.map((x,i)=>`<option value="${i}" ${i===C.t?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></label>`:''}
   <table class="cx-map"><tbody>${F.CAMPOS.map(([c,nm])=>`<tr><td>${nm}</td><td><select data-cxcampo="${c}" aria-label="${esc(nm)}">${op(C.mapa[c])}</select></td></tr>`).join('')}</tbody></table>
   <p style="margin:8px 0"><span class="chip good">${num.format(nR)} realizado</span> <span class="chip info">${num.format(nO)} orçado</span> <span class="chip mute">${Object.keys(n.contas).length} contas</span> ${fora?`<span class="chip bad">${num.format(fora)} linhas fora</span>`:''}</p>
   <div class="cx-form"><label>Nome da base<input id="cxNome" maxlength="120" value="${esc(C.nomeBase||C.detalhe.slice(0,60))}"></label></div>
   <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-cx="salvar" ${n.rows.length?'':'disabled'}>Guardar na empresa</button><button class="btn ghost" data-cx="descartar">Descartar</button></div>
   <p class="hint" style="margin:6px 0 0">Se já existir uma base com o mesmo nome, ela é substituída.</p></div>`}
async function blocoVer(emp){const b=C.cache.bases?.find(x=>x.id===C.ver);if(!b)return '';
  if(C.cache.verId!==b.id){C.cache.linhas=await todos(()=>sb.from('dados_linhas').select('tipo,competencia,data_caixa,conta_codigo,conta_nome,grupo_dre,valor,unidade').eq('base_id',b.id).order('id'));C.cache.verId=b.id;C.ano=null}
  const {rows}=F.deLinhasSalvas(C.cache.linhas);if(!rows.length)return '';
  const anos=[...new Set(rows.map(r=>r.comp.slice(0,4)))].sort();if(!C.ano||!anos.includes(String(C.ano)))C.ano=F.anoPadrao(rows,HOJE);
  const D=F.montarD(rows,C.ano,{});window.V3BI.usar(D);
  return `<section class="panel" style="margin-top:14px" id="cxVer"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-end"><div><h2 style="font-size:15px;margin:0">Base “${esc(b.nome)}” no Fluxo de caixa BI</h2><p class="hint" style="margin:2px 0 0">Mesmo motor e mesmas telas do Gestor. Os botões de Exportar geram PDF e Excel desta base.</p></div><div style="display:flex;gap:8px;align-items:flex-end"><label class="hint">Ano<br><select id="cxAno" class="v3-sel">${anos.map(a=>`<option ${+a===C.ano?'selected':''}>${a}</option>`).join('')}</select></label><button class="btn ghost" data-cx="fechar-ver">Fechar</button></div></div></section>
   <div style="margin-top:12px">${await window.V3BI.telaFluxo(D)}</div>`}
function blocoAcessos(emp,ac){const adm=ehAdmin(emp);const api=ac.filter(a=>a.tipo==='api'),sql=ac.filter(a=>a.tipo==='sql');
  const linha=a=>`<tr${a.revogado_em?' style="opacity:.55"':''}><td><b>${esc(a.nome)}</b><br><span class="hint">${a.tipo==='api'?esc(a.prefixo)+'…':esc(a.papel)}</span></td><td>${dataBR(a.criado_em)}</td><td>${a.ultimo_uso?dataBR(a.ultimo_uso)+' · '+num.format(a.usos)+'×':a.tipo==='api'?'nunca':'–'}</td><td>${a.revogado_em?'<span class="chip mute">revogada</span>':adm?`<button class="linkbtn" data-cxrev="${a.id}">Revogar</button>`:'<span class="chip good">ativa</span>'}</td></tr>`;
  const tab=(ls,vazio)=>ls.length?`<div class="cx-wrap"><table class="cx-tab"><thead><tr><th>Nome</th><th>Criada</th><th>Último uso</th><th></th></tr></thead><tbody>${ls.map(linha).join('')}</tbody></table></div>`:`<p class="hint" style="margin:6px 0">${vazio}</p>`;
  const semAdm=adm?'':'<p class="hint" style="margin:6px 0 0">Só o administrador da empresa cria e revoga acessos.</p>';
  return `<div class="cx-grid" style="margin-top:14px">
   <section class="panel"><h2 style="font-size:15px;margin:0">API com chave</h2><p class="hint" style="margin:2px 0 8px">Para Power BI (Obter dados › Web), Excel (Dados › Da Web) e outros sistemas. A chave só enxerga esta empresa.</p>
    ${tab(api,'Nenhuma chave criada.')}${adm?'<div class="cx-form" style="margin-top:8px;grid-template-columns:1fr auto;align-items:end"><label>Nome da nova chave<input id="cxNomeApi" maxlength="80" placeholder="Power BI do financeiro"></label><button class="btn" data-cx="nova-chave">Criar chave</button></div>':semAdm}</section>
   <section class="panel"><h2 style="font-size:15px;margin:0">Acesso SQL só de leitura</h2><p class="hint" style="margin:2px 0 8px">Conexão direta ao banco (PostgreSQL) para Power BI, Excel, Metabase ou DBeaver. Vê só as tabelas de BI desta empresa.</p>
    ${tab(sql,'Nenhum acesso SQL criado.')}${adm?'<div class="cx-form" style="margin-top:8px;grid-template-columns:1fr auto;align-items:end"><label>Nome do novo acesso<input id="cxNomeSql" maxlength="80" placeholder="Power BI da diretoria"></label><button class="btn" data-cx="novo-sql">Criar acesso</button></div>':semAdm}</section>
   <section class="panel"><h2 style="font-size:15px;margin:0">Excel e PDF</h2><p class="hint" style="margin:2px 0 8px">Cada tela de BI tem Exportar PDF e Exportar Excel.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-v3go="fluxo-bi">Fluxo de caixa BI</button><button class="btn ghost" data-v3go="gestao">Painel geral</button><button class="btn ghost" data-v3go="dre">DRE</button></div></section>
   <section class="panel"><h2 style="font-size:15px;margin:0">O que sai</h2><div class="cx-wrap"><table class="cx-tab"><tbody>${RECURSOS.map(([r,d])=>`<tr><td><code>${r}</code></td><td class="hint">${d}</td></tr>`).join('')}</tbody></table></div><p class="hint" style="margin:6px 0 0">Junta o que é lançado no app e as bases guardadas acima.</p></section></div>`}

async function vConexoes(){
  const emps=S.empresas;if(!emps.length)return semEmpresa();
  if(!emps.some(e=>e.id===C.emp))C.emp=(selEmp()[0]||emps[0]).id;const emp=C.emp;
  let bs,ac;try{[bs,ac]=await Promise.all([bases(emp),acessos(emp)])}catch(e){if(faltaMigracao(e))return vazio('Conexões de dados ainda não ativadas','<p style="margin:0">Falta aplicar no banco a atualização 0030 (Gevans Dados). Depois disso esta tela funciona.</p>');throw e}
  C.cache.bases=bs;const pode=podeEditar(emp);
  const selE=emps.length>1?`<label class="hint">Empresa<br><select id="cxEmp" class="v3-sel">${emps.map(e=>`<option value="${e.id}" ${e.id===emp?'selected':''}>${esc(nomeEmp(e))}</option>`).join('')}</select></label>`:'';
  const lista=bs.length?`<div class="cx-wrap"><table class="cx-tab"><thead><tr><th>Base</th><th>Origem</th><th>Linhas</th><th>Atualizada</th><th></th></tr></thead><tbody>${bs.map(b=>`<tr><td><b>${esc(b.nome)}</b>${b.detalhe?`<br><span class="hint">${esc(b.detalhe)}</span>`:''}</td><td>${ORIG[b.origem]||b.origem}</td><td>${num.format(b.linhas)}</td><td>${dataBR(b.atualizado_em)}</td><td><span style="display:flex;flex-wrap:wrap;gap:2px 10px"><button class="linkbtn" data-cxver="${b.id}">Ver no BI</button><button class="linkbtn" data-cxxls="${b.id}">Excel</button>${pode?`<button class="linkbtn" data-cxdel="${b.id}" style="color:var(--bad)">Excluir</button>`:''}</span></td></tr>`).join('')}</tbody></table></div>`:'<p class="hint" style="margin:6px 0">Nenhuma base guardada. Traga uma planilha, PDF, API ou banco SQL ao lado.</p>';
  return `<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end"><p class="hint" style="margin:0;max-width:720px">Traga dados de onde o cliente já tem (como no Power BI) e entregue para onde ele precisa. Tudo separado por empresa.</p>${selE}</div>
   <div class="cx-grid" style="margin-top:12px">
    <section class="panel"><h2 style="font-size:15px;margin:0">Obter dados</h2>${pode?`<div class="cx-fontes" role="group" aria-label="Fonte">${[['arquivo','Arquivo'],['web','Link de API'],['sql','Banco SQL']].map(([k_,n])=>`<button type="button" aria-pressed="${C.fonte===k_}" data-cxfonte="${k_}">${n}</button>`).join('')}</div>${blocoFonte()}`:'<p class="hint">Seu acesso é só de consulta nesta empresa.</p>'}</section>
    <section class="panel"><h2 style="font-size:15px;margin:0 0 6px">Bases guardadas</h2>${lista}</section>
   </div>
   ${C.n?blocoMapa():''}
   ${C.ver?await blocoVer(emp):''}
   <h2 style="font-size:16px;margin:22px 0 0">Entregar dados</h2>
   ${blocoAcessos(emp,ac)}`}

// ---------- ações
function carregar(tabelas,origem,detalhe){C.tabelas=tabelas.filter(t=>t.linhas.length&&!/premiss/.test(F.norm(t.nome)));if(!C.tabelas.length){toast('Não achei linhas para importar.');return}
  C.t=C.tabelas.reduce((b,t,i)=>Object.keys(F.detectar(t.cab)).length>Object.keys(F.detectar(C.tabelas[b].cab)).length?i:b,0);
  C.mapa=F.detectar(C.tabelas[C.t].cab);C.origem=origem;C.detalhe=detalhe;C.nomeBase='';C.n=F.normalizar(C.tabelas[C.t],C.mapa);render(true)}
async function conector(body){const {data,error}=await sb.functions.invoke('dados-conector',{body:{empresa_id:C.emp,...body}});
  if(error){let m=error.message;try{m=(await error.context.json()).erro||m}catch(e){}throw new Error(m)}if(data?.erro)throw new Error(data.erro);return data}
async function ocupado(bt,txt,fn){const t0=bt.textContent;bt.disabled=true;bt.textContent=txt;try{await fn()}catch(e){toast(traduz(e))}finally{bt.disabled=false;bt.textContent=t0}}
function mostraSegredo(titulo,html){drawer(`<h3>${titulo}</h3><div style="display:flex;flex-direction:column;gap:12px">${html}</div><div class="actions" style="margin-top:14px"><button class="btn" type="button" data-cx="fechar-segredo">Já copiei, fechar</button></div>`)}
const copiar=v=>`<span style="display:flex;gap:6px;align-items:stretch"><code class="cx-seg" style="flex:1">${esc(v)}</code><button class="btn ghost" data-cxcopia="${esc(v)}">Copiar</button></span>`;

document.addEventListener('click',async ev=>{
  const fo=ev.target.closest('[data-cxfonte]');if(fo){C.fonte=fo.dataset.cxfonte;render(true);return}
  const cp=ev.target.closest('[data-cxcopia]');if(cp){try{await navigator.clipboard.writeText(cp.dataset.cxcopia);toast('Copiado.')}catch(e){toast('Selecione e copie manualmente.')}return}
  const vr=ev.target.closest('[data-cxver]');if(vr){C.ver=vr.dataset.cxver;await render(true);document.getElementById('cxVer')?.scrollIntoView({behavior:'smooth'});return}
  const xl=ev.target.closest('[data-cxxls]');if(xl){const b=C.cache.bases.find(x=>x.id===xl.dataset.cxxls);
    const ls=await todos(()=>sb.from('dados_linhas').select('tipo,competencia,data_caixa,conta_codigo,conta_nome,grupo_dre,valor,unidade').eq('base_id',b.id).order('id'));
    const ws=XLSX.utils.json_to_sheet(ls.map(l=>({Tipo:l.tipo==='orcado'?'Orçado':'Realizado','Competência':l.competencia,'Data pagamento':l.data_caixa||'','Código':l.conta_codigo||'',Conta:l.conta_nome,'Grupo DRE':F.GRUPOS[l.grupo_dre]||l.grupo_dre||'',Valor:+l.valor,Empresa:l.unidade||''})));
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Lançamentos');XLSX.writeFile(wb,'base-'+F.norm(b.nome).replace(/[^a-z0-9]+/g,'-')+'.xlsx');return}
  const dl=ev.target.closest('[data-cxdel]');if(dl){if(dl.dataset.ok!=='1'){dl.dataset.ok='1';dl.textContent='Confirmar exclusão';setTimeout(()=>{dl.dataset.ok='';dl.textContent='Excluir'},4000);return}
    const {error}=await sb.from('dados_bases').delete().eq('id',dl.dataset.cxdel);if(error){toast(traduz(error));return}if(C.ver===dl.dataset.cxdel)C.ver=null;toast('Base excluída.');render(true);return}
  const rv=ev.target.closest('[data-cxrev]');if(rv){if(rv.dataset.ok!=='1'){rv.dataset.ok='1';rv.textContent='Confirmar';setTimeout(()=>{rv.dataset.ok='';rv.textContent='Revogar'},4000);return}
    const {error}=await sb.rpc('revogar_acesso_dados',{p_id:rv.dataset.cxrev});if(error){toast(traduz(error));return}toast('Acesso revogado. Quem usava não conecta mais.');render(true);return}
  const b=ev.target.closest('[data-cx]');if(!b)return;const a=b.dataset.cx;
  if(a==='buscar-web')return ocupado(b,'Buscando…',async()=>{const url=document.getElementById('cxUrl').value.trim();if(!/^https?:\/\//.test(url))throw new Error('Cole um link que comece com https://');
    const hn=document.getElementById('cxHn').value.trim(),hv=document.getElementById('cxHv').value;const r=await conector({tipo:'web',url,cabecalhos:hn?{[hn]:hv}:{}});
    let host;try{host=new URL(url).hostname}catch(e){host='API'}carregar([F.tabelaDeTexto(r.conteudo,host)],'web',url.split('?')[0])});
  if(a==='buscar-sql')return ocupado(b,'Consultando…',async()=>{const g=id=>document.getElementById(id).value.trim();
    const r=await conector({tipo:g('cxTipo'),host:g('cxHost'),porta:g('cxPorta'),banco:g('cxBanco'),usuario:g('cxUser'),senha:document.getElementById('cxSenha').value,sql:document.getElementById('cxSql').value});
    if(r.cortado)toast('Vieram as primeiras 100 mil linhas.');carregar([F.tabelaDeObjetos(r.linhas,'Consulta')],'sql',g('cxTipo')+' · '+g('cxHost')+(g('cxBanco')?' / '+g('cxBanco'):''))});
  if(a==='fechar-segredo'){fecharDrawer();return}
  if(a==='descartar'){C.n=null;C.tabelas=[];render(true);return}
  if(a==='fechar-ver'){C.ver=null;render(true);return}
  if(a==='salvar')return ocupado(b,'Guardando…',async()=>{const nome=document.getElementById('cxNome').value.trim();if(!nome)throw new Error('Dê um nome para a base.');
    const rows=C.n.rows;const velha=C.cache.bases.find(x=>x.nome.toLowerCase()===nome.toLowerCase());
    if(velha){const {error}=await sb.from('dados_bases').delete().eq('id',velha.id);if(error)throw error}
    const {data:nb,error}=await sb.from('dados_bases').insert({empresa_id:C.emp,nome,origem:C.origem,detalhe:C.detalhe.slice(0,300),linhas:rows.length}).select().single();if(error)throw error;
    const ls=F.paraGravar(rows,nb.id,C.emp);for(let i=0;i<ls.length;i+=1000){b.textContent=`Guardando ${Math.min(i+1000,ls.length)} de ${ls.length}…`;const {error:e2}=await sb.from('dados_linhas').insert(ls.slice(i,i+1000));if(e2){await sb.from('dados_bases').delete().eq('id',nb.id);throw e2}}
    C.n=null;C.tabelas=[];C.ver=nb.id;C.cache.verId=null;toast(`Base “${nome}” guardada com ${num.format(rows.length)} linhas.`);await render(true);document.getElementById('cxVer')?.scrollIntoView({behavior:'smooth'})});
  if(a==='nova-chave')return ocupado(b,'Criando…',async()=>{const nome=prompt_('cxNomeApi','Power BI');const {data,error}=await sb.rpc('criar_chave_api',{p_empresa:C.emp,p_nome:nome});if(error)throw error;const k_=data[0].chave;
    const ex=API_URL+'?recurso=fluxo_mensal&formato=csv';
    mostraSegredo('Chave de API criada',`<div class="effect bad">Copie agora: a chave não aparece de novo. Quem tiver a chave lê os dados desta empresa.</div>
     <div><b>Chave</b>${copiar(k_)}</div><div><b>Endereço</b>${copiar(ex)}</div>
     <div><b>No Power BI</b><ol class="cx-passos"><li>Obter dados › Web › Avançado.</li><li>Partes da URL: cole o endereço acima (troque <code>fluxo_mensal</code> por outro recurso se quiser).</li><li>Cabeçalho: <code>x-api-key</code> com a chave.</li><li>Acesso: Anônimo. O Power BI lê o CSV e atualiza quando você mandar.</li></ol></div>
     <div><b>No Excel</b><ol class="cx-passos"><li>Dados › Obter dados › Da Web › Avançado.</li><li>Mesmo endereço e mesmo cabeçalho. Use <code>formato=csv-br</code> para vírgula decimal.</li></ol></div>
     <p class="hint" style="margin:0">Também aceita <code>formato=json</code> e filtros <code>de=AAAA-MM-DD</code> e <code>ate=AAAA-MM-DD</code>.</p>`);render(true)});
  if(a==='novo-sql')return ocupado(b,'Criando…',async()=>{const nome=prompt_('cxNomeSql','Power BI SQL');const {data,error}=await sb.rpc('criar_acesso_sql',{p_empresa:C.emp,p_nome:nome});if(error)throw error;const u=data[0];
    mostraSegredo('Acesso SQL criado',`<div class="effect bad">Copie a senha agora: ela não aparece de novo.</div>
     <div class="cx-form"><div class="full"><b>Servidor</b>${copiar(DB.pooler)}</div><div><b>Porta</b>${copiar(String(DB.porta))}</div><div><b>Banco</b>${copiar(DB.banco)}</div><div class="full"><b>Usuário</b>${copiar(u.usuario+'.'+DB.ref)}</div><div class="full"><b>Senha</b>${copiar(u.senha)}</div></div>
     <div><b>No Power BI</b><ol class="cx-passos"><li>Obter dados › Banco de dados PostgreSQL.</li><li>Servidor: <code>${esc(DB.pooler)}:${DB.porta}</code>, banco <code>${DB.banco}</code>.</li><li>Usuário e senha acima (aba Banco de dados).</li><li>Abra o esquema <b>bi</b> e marque as tabelas (fluxo_mensal é a mais fácil).</li></ol></div>
     <p class="hint" style="margin:0">Se o seu programa conectar por IPv6, também funciona com o servidor <code>${esc(DB.host)}</code> e o usuário <code>${esc(u.usuario)}</code>. Só leitura, até 60 s por consulta e 5 conexões ao mesmo tempo.</p>`);render(true)});
});
function prompt_(id,padrao){const i=document.getElementById(id);return (i&&i.value.trim())||padrao}
document.addEventListener('change',async ev=>{const t=ev.target;
  if(t.id==='cxEmp'){C.emp=t.value;C.n=null;C.ver=null;render(true)}
  else if(t.id==='cxAno'){C.ano=+t.value;render(true)}
  else if(t.id==='cxTab'){C.t=+t.value;C.mapa=F.detectar(C.tabelas[C.t].cab);C.n=F.normalizar(C.tabelas[C.t],C.mapa);render(true)}
  else if(t.dataset.cxcampo){C.mapa[t.dataset.cxcampo]=t.value===''?undefined:+t.value;C.n=F.normalizar(C.tabelas[C.t],C.mapa);render(true)}
  else if(t.id==='cxArq'&&t.files[0]){const f=t.files[0];try{const ext=(f.name.split('.').pop()||'').toLowerCase();carregar(await F.lerArquivo(f),ext==='pdf'?'pdf':ext==='csv'?'csv':'excel',f.name)}catch(e){console.warn(e);toast(e.message||'Não consegui ler o arquivo.')}}
});

// ---------- registro no app
if(!ROTAS.some(x=>x[0]==='conexoes'))ROTAS.push(['conexoes','Conexões de dados']);
TITULOS.conexoes='Conexões de dados';VIEWS.conexoes=vConexoes;
})();
