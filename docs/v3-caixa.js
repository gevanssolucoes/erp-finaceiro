// ===================== Gevans Dados · Caixa e auditoria (painéis prontos por empresa, migração 0033)
// Mostra o caixa do mês montado a partir das planilhas do cliente (receitas, contas pagas, transferências, tarifas),
// o fluxo na estrutura do cliente (Fluxo_Conta / Fluxo_Descricao e as colunas de apresentação),
// a conferência com o extrato conta a conta e a auditoria linha a linha de cada conta bancária.
// Só lê a tabela dados_paineis; quem não tem painel vê uma explicação.
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;
IC.caixa='<path d="M3 7h18v12H3z"/><path d="M3 11h18M7 15h3"/><path d="M8 7V4h8v3"/>';
const X=S.cxa=Object.assign({emp:null,per:null,tab:'resumo',conta:null,status:'',q:'',fluxo:null,cache:{}},S.cxa||{});

const css=document.createElement('style');css.textContent=`
.cxa-k .v.pos{color:var(--good)}.cxa-k .v.neg{color:var(--bad)}
.cxa-lead{margin:0;font-size:14px;line-height:1.55;max-width:80ch;color:var(--ink-2)}.cxa-lead b{color:var(--ink);font-variant-numeric:tabular-nums}
.cxa-sec{display:flex;flex-direction:column;gap:8px}
.cxa-sec h3{margin:0;font-size:15px}
.cxa-sec>p{margin:0;font-size:12.5px;color:var(--ink-2);max-width:80ch;line-height:1.5}
.cxa-st{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}
.cxa-st button{font:inherit;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:8px 10px;cursor:pointer;display:flex;flex-direction:column;gap:3px;color:var(--ink)}
.cxa-st button[aria-pressed="true"]{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.cxa-st .chip{white-space:normal;align-self:flex-start}
.cxa-st b{font-variant-numeric:tabular-nums;font-size:13px}.cxa-st small{color:var(--ink-2);font-size:11.5px;font-variant-numeric:tabular-nums}
.cxa td.det{white-space:normal;min-width:220px;max-width:420px;color:var(--ink-2);font-size:12px}
.cxa td.txt{white-space:normal;min-width:180px;max-width:320px}
.cxa .cxa-mais{font-size:12px;color:var(--ink-2);margin:8px 2px 0}
.cxa input.v3-sel{min-width:220px}
.cxa .tbl-wrap{max-height:70vh;overflow:auto}
`;document.head.appendChild(css);

const R=v=>v==null||v===''?'':brl2.format(+v);
const Rk=v=>v==null?'–':k(+v);
const dt=v=>v?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'';
const MES=p=>{const [a,m]=p.split('-');return MESES[+m-1]+'/'+a};
const STC={'Conferido':'good','Conferido (vários lançamentos)':'good','Conferido em outra data':'warn','Depósito de cliente (conferido no total da conta)':'good','Total de recebimentos da conta':'info','Repetido no extrato (contado uma vez)':'warn','Só no extrato':'bad','Só nas abas':'bad'};
const chip=(t,c)=>`<span class="chip ${c||'mute'}">${esc(t)}</span>`;
// tabela compacta {cols,dic,rows} → objetos
function abrir(t){if(!t||!t.rows)return [];const {cols,dic,rows}=t;return rows.map(a=>{const o={};cols.forEach((c,i)=>{o[c]=dic[c]?dic[c][a[i]]:a[i]});return o})}

async function carregar(emp){
  if(X.cache[emp])return X.cache[emp];
  const {data,error}=await sb.from('dados_paineis').select('periodo,parte,titulo,fonte,conteudo,atualizado_em').eq('empresa_id',emp).order('periodo',{ascending:false});
  if(error)throw error;const p={};for(const r of data){(p[r.periodo]=p[r.periodo]||{})[r.parte]=r}
  for(const per of Object.keys(p)){const o=p[per];o.mov=abrir(o.movimentos?.conteudo);o.aud=abrir(o.auditoria?.conteudo);o.res=o.resumo?.conteudo||{}}
  return X.cache[emp]=p}

function indicadores(o){const m=o.mov,s=f=>sum(m.filter(f).map(x=>x.valor));const c=o.res.conciliacao||[];
  const ini=sum(c.map(x=>x.saldo_inicial)),fim=sum(c.map(x=>x.saldo_final_extrato));
  const rec=s(x=>x.grupo==='Receitas'),pag=s(x=>x.grupo==='Pagamentos'),tE=s(x=>x.grupo==='Tarifas e ajustes bancários'&&x.valor>0),tS=s(x=>x.grupo==='Tarifas e ajustes bancários'&&x.valor<0);
  const apo=s(x=>x.grupo==='Aportes'),dis=s(x=>x.grupo==='Distribuições'),ent=s(x=>x.grupo==='Transferências entre contas');const ger=rec+pag+tE+tS,abas=ini+ger+apo+dis+ent;
  return {ini,rec,tE,pag,tS,ger,apo,dis,ent,abas,fim,dif:fim-abas}}

function telaResumo(o){const I=indicadores(o);
  const card=(g,t,v,d,cor)=>`<div class="v3-k cxa-k"><span class="g">${g}</span><span class="t">${t}</span><span class="v ${cor?(v<0?'neg':'pos'):''}">${Rk(v)}</span><span class="d">${d}</span></div>`;
  const L=(n,v,cls)=>`<tr class="${cls||''}"><td>${n}</td><td class="n ${v<0?'neg':''}">${R(v)}</td><td class="n">${I.rec&&!/^(Saldo|= Saldo|Diferença)/.test(n)?pct(v/I.rec):''}</td></tr>`;
  const obras=new Map();for(const m of o.mov){if(m.grupo!=='Receitas'&&m.grupo!=='Pagamentos')continue;const x=obras.get(m.centro_custo)||{rec:0,pag:0};if(m.valor>0)x.rec+=m.valor;else x.pag-=m.valor;obras.set(m.centro_custo,x)}
  const soc=new Map();for(const m of o.mov){if(m.grupo!=='Aportes'&&m.grupo!=='Distribuições')continue;const kk=m.categoria.replace(/^(Aporte da|Distribuição para a) empresa /,'');const x=soc.get(kk)||{a:0,d:0};if(m.grupo==='Aportes')x.a+=m.valor;else x.d-=m.valor;soc.set(kk,x)}
  return `<p class="cxa-lead">A operação gerou <b>${Rk(I.ger)}</b> de caixa no mês. As distribuições para outras empresas somaram <b>${Rk(-I.dis)}</b> e os aportes recebidos <b>${Rk(I.apo)}</b>. O saldo terminou em <b>${Rk(I.fim)}</b> pelo extrato, diferença de <b>${R(I.dif)}</b> para as planilhas.</p>
  <div class="v3-cards">${card('Saldo','Saldo inicial',I.ini,'soma das contas no dia 1')}${card('Entradas','Recebimentos de clientes',I.rec,'parcelas, custas, sinais e corretagem')}${card('Saídas','Pagamentos',I.pag,'contas pagas, por obra',1)}${card('Resultado','Geração de caixa',I.ger,'recebimentos menos pagamentos e tarifas',1)}${card('Sócios','Aportes recebidos',I.apo,'outras empresas mandando para esta')}${card('Sócios','Distribuições',I.dis,'esta empresa mandando para outras',1)}${card('Saldo','Saldo final',I.fim,'pelo extrato, no último dia')}</div>
  <div class="v3-g2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px">
   <div class="panel cxa-sec"><h3>Fluxo de caixa do mês</h3><div class="tbl-wrap"><table><thead><tr><th>Linha</th><th class="n">${MES(X.per)}</th><th class="n">% receb.</th></tr></thead><tbody>
    ${L('Saldo inicial',I.ini,'tot')}${L('(+) Recebimentos de clientes',I.rec,'l2')}${L('(+) Rendimentos e outras entradas',I.tE,'l2')}${L('(−) Pagamentos',I.pag,'l2')}${L('(−) Tarifas, impostos e ajustes',I.tS,'l2')}${L('= Geração de caixa',I.ger,'tot')}${L('(+) Aportes de outras empresas',I.apo,'l2')}${L('(−) Distribuições para outras empresas',I.dis,'l2')}${L('(±) Transferências entre contas',I.ent,'l2')}${L('= Saldo final pelas planilhas',I.abas,'tot')}${L('Saldo final no extrato',I.fim,'l2')}${L('Diferença para o extrato',I.dif,'l2')}
   </tbody></table></div></div>
   <div class="panel cxa-sec"><h3>Resultado por obra</h3><div class="tbl-wrap"><table><thead><tr><th>Obra (centro de custo)</th><th class="n">Recebido</th><th class="n">Pago</th><th class="n">Resultado</th></tr></thead><tbody>
    ${[...obras].sort((a,b)=>(b[1].rec-b[1].pag)-(a[1].rec-a[1].pag)).map(([n,x])=>`<tr><td class="txt">${esc(n)}</td><td class="n">${R(x.rec)}</td><td class="n">${R(-x.pag)}</td><td class="n ${x.rec-x.pag<0?'neg':''}">${R(x.rec-x.pag)}</td></tr>`).join('')}
   </tbody></table></div></div></div>
  <div class="panel cxa-sec"><h3>Aportes e distribuições por empresa</h3><p>Regra: outra empresa mandando para esta é aporte; esta mandando para outra é distribuição; entre contas da própria empresa é transferência.</p><div class="tbl-wrap"><table><thead><tr><th>Empresa</th><th class="n">Aportes</th><th class="n">Distribuições</th><th class="n">Líquido</th></tr></thead><tbody>
   ${[...soc].map(([n,x])=>`<tr><td>Empresa ${esc(n)}</td><td class="n">${x.a?R(x.a):''}</td><td class="n">${x.d?R(-x.d):''}</td><td class="n ${x.a-x.d<0?'neg':''}">${R(x.a-x.d)}</td></tr>`).join('')}
  </tbody></table></div></div>`}

function telaFluxo(o){const f=o.res.fluxo_v07||[];const dif=f.filter(r=>Math.abs(r.diferenca)>0.05);
  const det=X.fluxo?o.mov.filter(m=>m.fluxo_descricao===X.fluxo):[];
  return `<div class="panel cxa-sec"><h3>Fluxo na estrutura do cliente</h3><p>Pagamentos ligados à Chave por Empresa-Obra-Produto-Serviço-Insumo e recebimentos por Empresa-Obra-Produto com Tipo de Parcela e Tipo de Custa. ${dif.length?`<b>${dif.length} linha(s) não batem</b> com o realizado da planilha de fluxo.`:'Todas as linhas batem.'} Clique numa linha para ver os lançamentos.</p>
   <div class="tbl-wrap"><table><thead><tr><th>Fluxo_Conta</th><th>Fluxo_Descricao</th><th class="n">Planilhas do mês</th><th class="n">Realizado no fluxo</th><th class="n">Diferença</th><th>Situação</th></tr></thead><tbody>
   ${f.map(r=>`<tr class="click" data-cxafluxo="${esc(r.fluxo_descricao)}"${X.fluxo===r.fluxo_descricao?' style="outline:2px solid var(--ink);outline-offset:-2px"':''}><td class="txt">${esc(r.fluxo_conta)}</td><td class="txt">${esc(r.fluxo_descricao)}</td><td class="n">${R(r.base_teste)}</td><td class="n">${R(r.real_out26_v07)}</td><td class="n ${Math.abs(r.diferenca)>0.05?'neg':''}">${R(r.diferenca)}</td><td>${Math.abs(r.diferenca)<0.05?chip('Bate','good'):+r.base_teste===0?chip('Falta nas planilhas','bad'):chip('Verificar','warn')}</td></tr>`).join('')}
   </tbody></table></div></div>
   ${X.fluxo?`<div class="panel cxa-sec"><h3>${esc(X.fluxo)} · ${det.length} lançamentos</h3>${det.length?`<div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Conta</th><th>Chave</th><th>Regional</th><th>Base apresentação</th><th>Resumo serviço</th><th>Serviço resumo</th><th>Fluxo_SubConta</th><th>Descrição</th><th class="n">Valor</th><th>No banco</th></tr></thead><tbody>
    ${det.slice(0,500).map(m=>`<tr><td>${dt(m.data)}</td><td>${esc(m.conta_bancaria)}</td><td>${esc(m.chave)}</td><td>${esc(m.regional)}</td><td class="txt">${esc(m.base_apresentacao)}</td><td class="txt">${esc(m.resumo_servico)}</td><td class="txt">${esc(m.servico_resumo)}</td><td class="txt">${esc(m.fluxo_subconta)}</td><td class="txt">${esc(m.descricao)}</td><td class="n ${m.valor<0?'neg':''}">${R(m.valor)}</td><td>${m.conferido_no_banco==='sim'?chip('Sim','good'):chip('Não','bad')}</td></tr>`).join('')}
    </tbody></table></div>${det.length>500?`<p class="cxa-mais">Mostrando 500 de ${det.length}.</p>`:''}`:'<p>Nenhum lançamento das planilhas nesta linha: o valor existe só no fluxo.</p>'}</div>`:''}`}

function telaAud(o){const contas=[...new Set(o.aud.map(a=>a.conta_bancaria))].sort();
  if(!contas.includes(X.conta))X.conta=contas.includes('341|42921-0')?'341|42921-0':contas[0];
  return `<div class="panel cxa-sec"><h3>Auditoria por conta bancária</h3><p>Cada linha do extrato ao lado dos lançamentos das planilhas que a explicam. Clique num quadro para filtrar pela situação.</p>
   <div class="v3-fl"><label class="hint">Conta<br><select id="cxaConta" class="v3-sel">${contas.map(c=>`<option value="${esc(c)}" ${c===X.conta?'selected':''}>${esc(c)} (${o.aud.filter(a=>a.conta_bancaria===c).length})</option>`).join('')}</select></label>
   <label class="hint">Buscar<br><input id="cxaBusca" class="v3-sel" type="search" value="${esc(X.q)}" placeholder="histórico, fornecedor, documento"></label></div>
   <div class="cxa-st" id="cxaSt"></div>
   <div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Doc</th><th>Extrato</th><th class="n">Valor no extrato</th><th>Lançamentos das planilhas</th><th class="n">Valor nas planilhas</th><th>Situação</th></tr></thead><tbody id="cxaAud"></tbody></table></div>
   <p class="cxa-mais" id="cxaMais"></p></div>`}
function pintarAud(){const o=X.atual;const tb=document.getElementById('cxaAud');if(!o||!tb)return;
  const base=o.aud.filter(a=>a.conta_bancaria===X.conta);const st={};for(const a of base){const s=st[a.status]||(st[a.status]={n:0,v:0});s.n++;s.v+=+(a.valor_extrato??a.valor_base??0)}
  document.getElementById('cxaSt').innerHTML=Object.entries(st).sort((a,b)=>b[1].n-a[1].n).map(([s,x])=>`<button type="button" data-cxast="${esc(s)}" aria-pressed="${X.status===s}">${chip(s,STC[s])}<b>${num.format(x.n)} linha${x.n>1?'s':''}</b><small>${R(x.v)}</small></button>`).join('');
  const q=norm(X.q);let rows=base.filter(a=>(!X.status||a.status===X.status)&&(!q||norm([a.historico_extrato,a.lancamentos_base,a.documento].join(' ')).includes(q)));
  if(!X.status&&!q)rows=rows.slice().sort((a,b)=>(a.status.startsWith('Depósito')-b.status.startsWith('Depósito'))||a.data.localeCompare(b.data));
  const tot=rows.length;rows=rows.slice(0,400);
  tb.innerHTML=rows.length?rows.map(a=>`<tr><td>${dt(a.data)}</td><td>${esc(a.documento)}</td><td class="txt">${esc(a.historico_extrato)}</td><td class="n ${a.valor_extrato<0?'neg':''}">${R(a.valor_extrato)}</td><td class="det">${esc(a.lancamentos_base)}${a.qtd_lancamentos>1?` (${a.qtd_lancamentos} lançamentos)`:''}</td><td class="n ${a.valor_base<0?'neg':''}">${R(a.valor_base)}</td><td>${chip(a.status,STC[a.status])}</td></tr>`).join(''):'<tr><td colspan="7">Nada nesta conta com esse filtro.</td></tr>';
  document.getElementById('cxaMais').textContent=tot>400?`Mostrando 400 de ${num.format(tot)} linhas. Use a busca ou clique num quadro para filtrar.`:`${num.format(tot)} linha${tot===1?'':'s'}.`}

function telaConf(o){const c=o.res.conciliacao||[],d=o.res.divergencias||[];
  const sit=v=>Math.abs(v)<0.5?chip('Bate','good'):Math.abs(v)<1500?chip('Centavos e cheques','warn'):chip('Verificar','bad');
  return `<div class="panel cxa-sec"><h3>Conferência com o banco, conta a conta</h3><p>Diferença é o movimento do extrato menos o das planilhas. Linhas repetidas do extrato contam uma vez.</p><div class="tbl-wrap"><table><thead><tr><th>Banco | conta</th><th class="n">Saldo inicial</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Saldo final</th><th class="n">Diferença</th><th>Situação</th></tr></thead><tbody>
   ${c.map(r=>`<tr class="click" data-cxaconta="${esc(r.conta_bancaria)}"><td>${esc(r.conta_bancaria)}</td><td class="n">${R(r.saldo_inicial)}</td><td class="n">${R(r.entradas_extrato)}</td><td class="n">${R(-r.saidas_extrato)}</td><td class="n">${R(r.saldo_final_extrato)}</td><td class="n">${R(r.diferenca)}</td><td>${sit(r.diferenca)}</td></tr>`).join('')}
   <tr class="tot"><td>Total</td><td class="n">${R(sum(c.map(r=>r.saldo_inicial)))}</td><td class="n">${R(sum(c.map(r=>r.entradas_extrato)))}</td><td class="n">${R(-sum(c.map(r=>r.saidas_extrato)))}</td><td class="n">${R(sum(c.map(r=>r.saldo_final_extrato)))}</td><td class="n">${R(sum(c.map(r=>r.diferenca)))}</td><td></td></tr>
  </tbody></table></div></div>
  <div class="panel cxa-sec"><h3>O que não bateu</h3><div class="tbl-wrap"><table><thead><tr><th>Tipo</th><th>Conta</th><th>Data</th><th class="n">Valor</th><th>Detalhe</th></tr></thead><tbody>
   ${d.map(r=>`<tr><td>${chip(r.tipo,/repetida|fora|Juros/i.test(r.tipo)?'warn':'mute')}</td><td>${esc(r.conta_bancaria)}</td><td>${dt(r.data)}</td><td class="n">${R(r.valor)}</td><td class="det">${esc(r.detalhe)}</td></tr>`).join('')}
  </tbody></table></div></div>`}

async function vCaixa(){
  const emps=S.empresas;if(!emps.length)return semEmpresa();
  let p;try{
    if(!emps.some(e=>e.id===X.emp)){X.emp=null;for(const e of [...selEmp(),...emps]){const r=await carregar(e.id);if(Object.keys(r).length){X.emp=e.id;break}}X.emp=X.emp||(selEmp()[0]||emps[0]).id}
    p=await carregar(X.emp)}
  catch(e){if(/dados_paineis/.test(e?.message||''))return vazio('Caixa e auditoria ainda não ativado','<p style="margin:0">Falta aplicar no banco a atualização 0033.</p>');throw e}
  const pers=Object.keys(p).sort().reverse();
  const subir=podeEditar(X.emp)?`<label class="btn ghost" style="cursor:pointer">Subir painel<input id="cxaArq" type="file" accept=".json,application/json" hidden></label>`:'';
  const selE=`<label class="hint">Empresa<br><select id="cxaEmp" class="v3-sel">${emps.map(e=>`<option value="${e.id}" ${e.id===X.emp?'selected':''}>${esc(nomeEmp(e))}</option>`).join('')}</select></label>`;
  if(!pers.length)return `<div class="v3"><div class="v3-bar"><span></span><div class="v3-fl">${selE}</div></div>${vazio('Nenhum painel de caixa nesta empresa','<p style="margin:0">Envie as planilhas do mês (receitas, contas pagas, transferências, tarifas e o extrato) para a Gevans montar o caixa e a auditoria por conta. Com o arquivo do painel em mãos (.json), use Subir painel.</p>',subir)}</div>`;
  if(!pers.includes(X.per))X.per=pers[0];const o=X.atual=p[X.per];
  const tabs=[['resumo','Caixa do mês'],['fluxo','Fluxo na estrutura do cliente'],['auditoria','Auditoria por conta'],['conferencia','Conferência e divergências']];
  const corpo=X.tab==='fluxo'?telaFluxo(o):X.tab==='auditoria'?telaAud(o):X.tab==='conferencia'?telaConf(o):telaResumo(o);
  if(X.tab==='auditoria')setTimeout(pintarAud,0);
  return `<div class="v3 cxa"><div class="v3-bar"><div class="v3-seg" role="tablist">${tabs.map(([k_,n])=>`<button type="button" aria-pressed="${X.tab===k_}" data-cxatab="${k_}">${n}</button>`).join('')}</div>
   <div class="v3-fl">${emps.length>1?selE:''}${subir}<label class="hint">Mês<br><select id="cxaPer" class="v3-sel">${pers.map(x=>`<option value="${x}" ${x===X.per?'selected':''}>${MES(x)}</option>`).join('')}</select></label></div></div>
   ${corpo}
   <p class="cxa-mais">Fonte: ${esc(o.res.fonte||o.resumo?.fonte||'planilhas do cliente')}. Atualizado em ${dt((o.resumo?.atualizado_em||'').slice(0,10))}.</p></div>`}

document.addEventListener('click',ev=>{const t=ev.target.closest('[data-cxatab],[data-cxast],[data-cxafluxo],[data-cxaconta]');if(!t||!document.querySelector('.cxa'))return;
  if(t.dataset.cxatab){X.tab=t.dataset.cxatab;render(true)}
  else if(t.dataset.cxast!=null){X.status=X.status===t.dataset.cxast?'':t.dataset.cxast;pintarAud()}
  else if(t.dataset.cxafluxo!=null){X.fluxo=X.fluxo===t.dataset.cxafluxo?null:t.dataset.cxafluxo;render(true)}
  else if(t.dataset.cxaconta){X.conta=t.dataset.cxaconta;X.status='';X.tab='auditoria';render(true)}});
document.addEventListener('change',ev=>{const t=ev.target;if(t.id==='cxaEmp'){X.emp=t.value;X.per=null;X.fluxo=null;render(true)}else if(t.id==='cxaPer'){X.per=t.value;render(true)}else if(t.id==='cxaConta'){X.conta=t.value;X.status='';pintarAud()}});
// arquivo do painel: {periodo:'AAAA-MM', fonte, resumo, movimentos, auditoria} montado pela Gevans a partir das planilhas
async function subirPainel(f){try{const j=JSON.parse(await f.text());
  if(!/^\d{4}-\d{2}$/.test(j.periodo||'')||!j.resumo||!j.movimentos?.rows||!j.auditoria?.rows)throw new Error('Arquivo não é um painel de caixa da Gevans.');
  if(j.empresa&&!confirm(`Subir o painel de ${MES(j.periodo)} (${j.empresa}) em ${nomeEmp(empresa(X.emp))}? Se o mês já existir, ele é substituído.`))return;
  const rows=[['resumo','Resumo, conferência e fluxo'],['movimentos','Movimentos com as colunas do fluxo'],['auditoria','Auditoria do extrato por conta']].map(([pt,t])=>({empresa_id:X.emp,periodo:j.periodo,parte:pt,titulo:t,fonte:j.fonte||f.name,conteudo:j[pt],atualizado_em:new Date().toISOString()}));
  const {error}=await sb.from('dados_paineis').upsert(rows,{onConflict:'empresa_id,periodo,parte'});if(error)throw error;
  delete X.cache[X.emp];X.per=j.periodo;toast('Painel de '+MES(j.periodo)+' carregado.');render(true)}
 catch(e){console.warn(e);toast(traduz(e))}}
document.addEventListener('change',ev=>{if(ev.target.id==='cxaArq'&&ev.target.files[0])subirPainel(ev.target.files[0])});
document.addEventListener('input',ev=>{if(ev.target.id==='cxaBusca'){X.q=ev.target.value;pintarAud()}});

if(!ROTAS.some(x=>x[0]==='caixa'))ROTAS.push(['caixa','Caixa e auditoria']);
TITULOS.caixa='Caixa e auditoria';VIEWS.caixa=vCaixa;
})();
