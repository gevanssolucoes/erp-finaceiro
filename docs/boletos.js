// ===================== Boletos do e-mail (versão 2 da tela)
// Diagnóstico da leitura do Gmail, filtros, fornecedor e conta sugeridos pelo CNPJ,
// aviso de boleto já lançado, lançar vários de uma vez, ignorar remetente para sempre,
// ajustes da busca feitos aqui (o script do Gmail lê na próxima execução) e leitura de linha digitável colada.
(()=>{
if(typeof S==='undefined'||typeof VIEWS==='undefined')return;
const VERSAO_SCRIPT=3;
IC.colar='<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M8 12h8M8 16h5"/>';

// ---------- leitura de linha digitável no navegador (mesma regra do script do Gmail)
function mod10(s){let soma=0,peso=2;for(let i=s.length-1;i>=0;i--){const n=+s[i]*peso;soma+=n>9?Math.floor(n/10)+n%10:n;peso=peso===2?1:2}return (10-soma%10)%10}
function mod11b(s){let soma=0,peso=2;for(let i=s.length-1;i>=0;i--){soma+=+s[i]*peso;peso=peso===9?2:peso+1}let dv=11-soma%11;return dv===0||dv>9?1:dv}
function mod11c(s){let soma=0,peso=2;for(let i=s.length-1;i>=0;i--){soma+=+s[i]*peso;peso=peso===9?2:peso+1}const r=soma%11;return r<2?0:r===10?1:11-r}
const dvC=(b,s)=>b[2]==='6'||b[2]==='7'?mod10(s):mod11c(s);
function lerLinha(txt){
  const d=soDig(txt);
  if(d.length===47&&d[0]!=='8'){
    if(mod10(d.slice(0,9))!==+d[9]||mod10(d.slice(10,20))!==+d[20]||mod10(d.slice(21,31))!==+d[31])return {erro:'Algum número foi digitado errado (o dígito verificador não confere).'};
    const bc=d.slice(0,4)+d[32]+d.slice(33)+d.slice(4,9)+d.slice(10,20)+d.slice(21,31);if(mod11b(bc.slice(0,4)+bc.slice(5))!==+bc[4])return {erro:'O dígito geral do boleto não confere.'};
    const f=+d.slice(33,37),v=+d.slice(37)/100;return {linha:d,valor:v||null,vencimento:f?fator(f):null,banco:d.slice(0,3)}}
  if(d.length===44&&d[0]!=='8'){if(mod11b(d.slice(0,4)+d.slice(5))!==+d[4])return {erro:'O código de barras não confere.'};
    const c1=d.slice(0,4)+d.slice(19,24),c2=d.slice(24,34),c3=d.slice(34);return lerLinha(c1+mod10(c1)+c2+mod10(c2)+c3+mod10(c3)+d[4]+d.slice(5,19))}
  if(d.length===48&&d[0]==='8'){for(let i=0;i<4;i++)if(dvC(d,d.slice(i*12,i*12+11))!==+d[i*12+11])return {erro:'Algum número foi digitado errado (o dígito de um dos blocos não confere).'};
    const cb=[0,12,24,36].map(i=>d.slice(i,i+11)).join('');return {linha:d,valor:(cb[2]==='6'||cb[2]==='8')?(+cb.slice(4,15)/100)||null:null,vencimento:null,consumo:true}}
  if(d.length===44&&d[0]==='8'){if(dvC(d,d.slice(0,3)+d.slice(4))!==+d[3])return {erro:'O código de barras não confere.'};return lerLinha([0,11,22,33].map(i=>{const b=d.slice(i,i+11);return b+dvC(d,b)}).join(''))}
  return {erro:d.length?`Tem ${d.length} números. A linha digitável tem 47 (boleto) ou 48 (conta de consumo).`:'Cole a linha digitável.'};
}
function fator(f){const dia=864e5,hoje=Date.now(),a=Date.UTC(1997,9,7)+f*dia,n=Date.UTC(2025,1,22)+(f-1000)*dia;return new Date(Math.abs(n-hoje)<Math.abs(a-hoje)?n:a).toISOString().slice(0,10)}
const BANCOS={'001':'Banco do Brasil','033':'Santander','041':'Banrisul','070':'BRB','077':'Inter','104':'Caixa','136':'Unicred','197':'Stone','208':'BTG','237':'Bradesco','260':'Nubank','290':'PagBank','323':'Mercado Pago','336':'C6','341':'Itaú','380':'PicPay','403':'Cora','422':'Safra','748':'Sicredi','756':'Sicoob'};

// ---------- dados da tela
const remEmail=r=>((String(r||'').match(/<([^>]+)>/)||[])[1]||String(r||'')).trim().toLowerCase();
const remNome=r=>String(r||'').replace(/<.*>/,'').replace(/"/g,'').trim()||remEmail(r);
function parcPorDoc(b){const doc=soDig(b.documento_beneficiario);if(doc.length>=11){const p=S.parceiros.find(x=>x.empresa_id===b.empresa_id&&soDig(x.documento)===doc);if(p)return p}
  if(b.beneficiario){const n=norm(b.beneficiario);return S.parceiros.find(x=>x.empresa_id===b.empresa_id&&norm(x.nome)===n)||null}return null}
async function carregar(){
  const ids=selEmp().map(e=>e.id);
  const [{data:bs,error},{data:tks}]=await Promise.all([
    sb.from('boletos_email').select('*').in('empresa_id',ids).order('vencimento',{ascending:true,nullsFirst:false}).limit(1000),
    sb.from('boletos_email_token').select('*').in('empresa_id',ids)]);
  if(error)return {error};
  S.boletos=bs||[];S.bolTokens=tks||[];
  const novos=S.boletos.filter(b=>b.status==='novo');
  // fornecedor e conta sugeridos: pelo CNPJ do beneficiário ou pelo último boleto igual já lançado
  const parcs=new Map();novos.forEach(b=>{const p=parcPorDoc(b);if(p)parcs.set(b.id,p)});
  const pids=[...new Set([...parcs.values()].map(p=>p.id))];
  const sug={};
  if(pids.length){const {data}=await sb.from('lancamentos').select('parceiro_id,conta_id,centro_custo_id,predio_id,competencia').in('parceiro_id',pids).order('competencia',{ascending:false}).limit(500);
    (data||[]).forEach(l=>{if(!sug[l.parceiro_id])sug[l.parceiro_id]=l})}
  const lancados=S.boletos.filter(b=>b.status==='lancado'&&b.lancamento_id);
  if(lancados.length){const {data}=await sb.from('lancamentos').select('id,conta_id,centro_custo_id,predio_id').in('id',lancados.map(b=>b.lancamento_id).slice(0,300));
    const porId=Object.fromEntries((data||[]).map(l=>[l.id,l]));
    lancados.sort((a,b)=>b.criado_em.localeCompare(a.criado_em)).forEach(b=>{const l=porId[b.lancamento_id];if(!l)return;const k='b:'+b.empresa_id+'|'+(soDig(b.documento_beneficiario)||norm(b.beneficiario));if(!sug[k])sug[k]=l})}
  S.bolInfo={};
  novos.forEach(b=>{const p=parcs.get(b.id);const l=(p&&sug[p.id])||sug['b:'+b.empresa_id+'|'+(soDig(b.documento_beneficiario)||norm(b.beneficiario))]||null;S.bolInfo[b.id]={parc:p||null,sug:l}});
  // boletos que parecem já estar em contas a pagar (mesmo valor, vencimento até 5 dias de diferença)
  const comValor=novos.filter(b=>b.valor&&b.vencimento);
  if(comValor.length){
    const vs=comValor.map(b=>b.vencimento).sort();const usados=new Set(lancados.map(b=>b.lancamento_id));
    const {data}=await sb.from('parcelas').select('id,empresa_id,lancamento_id,vencimento,valor,status,lancamentos(descricao,parceiro_id)').in('empresa_id',ids).gte('vencimento',addDias(vs[0],-5)).lte('vencimento',addDias(vs[vs.length-1],5)).limit(2000);
    const dias=(a,b)=>Math.abs((new Date(a)-new Date(b))/864e5);
    comValor.forEach(b=>{const m=(data||[]).filter(p=>p.empresa_id===b.empresa_id&&Math.abs(Math.abs(+p.valor)-(+b.valor))<0.01&&dias(p.vencimento,b.vencimento)<=5&&!usados.has(p.lancamento_id)).sort((x,y)=>dias(x.vencimento,b.vencimento)-dias(y.vencimento,b.vencimento))[0];
      if(m)S.bolInfo[b.id].dup=m})}
  return {};
}

// ---------- tela
const quandoT=ts=>{if(!ts)return 'nunca';const min=Math.round((Date.now()-new Date(ts))/60000);return min<2?'agora há pouco':min<60?`há ${min} min`:min<1440?`há ${Math.round(min/60)} h`:`há ${Math.round(min/1440)} dia${min>=2880?'s':''}`};
function estado(t){if(window.estadoGmail)return estadoGmail(t);const u=t.ultimo_uso;return u?['Ligado','good','Última leitura '+quandoT(u)+'.']:['Ainda não rodou','warn','']}
function painelGmail(){
  const tks=S.bolTokens;if(!tks.length)return '';
  return `<div class="panel"><div class="ph"><div><h2>Leitura do Gmail</h2><p class="hint">O script roda sozinho na conta Google a cada 30 minutos e avisa aqui cada vez que lê.</p></div>
    <div class="ctrls">${tks.some(t=>t.url_busca)?`<button class="btn" data-acao="bol-buscar">${icone('buscar',15)} Buscar boletos agora</button>`:''}${podeEditarAlguma()?`<button class="btn ghost" data-acao="bol-config">Configurar Gmail</button>`:''}</div></div>
    <div class="alerts">${tks.map(t=>{const e=estado(t),r=t.ultimo_resumo||{};const cor=e[1]==='good'?'good':e[1]==='bad'?'bad':'warn';
      const det=r.conversas!=null?`${r.conversas} conversas e ${r.mensagens||0} e-mails lidos · ${r.novos||0} boleto${r.novos===1?'':'s'} novo${r.novos===1?'':'s'}${r.sem_linha?` · ${r.sem_linha} sem linha digitável`:''}${r.links?` · ${r.links} em link`:''}${r.pendente?' · continua na próxima leitura':''}${r.versao?` · script v${r.versao}`:''}`:'';
      const desat=!t.ultima_execucao||(r.versao||0)<VERSAO_SCRIPT;
      return `<div class="alert"><span class="dot" style="background:var(--${cor})"></span><div style="flex:1;min-width:0"><b>${S.empresas.length>1?esc(nomeEmp(empresa(t.empresa_id)))+' · ':''}${e[0]}</b><small>${esc(e[2])}${det?' '+det+'.':''}</small>
        ${(r.erros||[]).length?`<small style="color:var(--warn)">Último erro: ${esc(r.erros[r.erros.length-1])}</small>`:''}</div>
        ${desat&&podeEditar(t.empresa_id)?`<button class="btn ghost" data-acao="bol-script" data-emp="${t.empresa_id}" style="flex:none">Copiar script novo</button>`:''}</div>`}).join('')}</div></div>`;
}
const FILTROS=[['novo','Para lançar'],['lancado','Lançados'],['ignorado','Ignorados'],['todos','Todos']];
async function vBoletos2(){
  const rapido=S._bolRapido&&S.boletos&&S.bolInfo;S._bolRapido=false;
  const {error}=rapido?{}:await carregar();
  if(error){if(/boletos_email|schema cache|does not exist/i.test(error.message||''))return vazio('Boletos do e-mail ainda não está ativo','<p style="margin:0">Falta aplicar a atualização do banco de dados (migração 0011).</p>');throw error}
  const multi=selEmp().length>1;const dias=+(window.appCfg?.('app.alerta_dias'))||7;
  const novos=S.boletos.filter(b=>b.status==='novo');
  const venc=novos.filter(b=>b.vencimento&&b.vencimento<HOJE),sem=novos.filter(b=>b.vencimento&&b.vencimento>=HOJE&&b.vencimento<=addDias(HOJE,dias));
  const dups=novos.filter(b=>S.bolInfo[b.id]?.dup);
  const tot=v=>brl.format(sum(v.map(b=>+b.valor||0)));
  const f=S.bolFiltro||'novo',q=norm(S.bolBusca||'');
  let lista=f==='todos'?S.boletos:S.boletos.filter(b=>b.status===f);
  if(q)lista=lista.filter(b=>norm([b.beneficiario,b.remetente,b.assunto,b.anexo,b.linha_digitavel,b.valor!=null?brl2.format(b.valor):''].join(' ')).includes(q));
  if(f!=='novo')lista=lista.slice().sort((a,b)=>(b.recebido_em||b.criado_em).localeCompare(a.recebido_em||a.criado_em));
  S.bolLista=lista.map(b=>b.id);
  const sel=S.bolSel=new Set([...(S.bolSel||[])].filter(id=>novos.some(b=>b.id===id)));
  const ult=S.bolTokens.map(t=>t.ultima_execucao||t.ultimo_uso).filter(Boolean).sort().pop();
  const linha=b=>{const inf=S.bolInfo[b.id]||{};const [st,c]=!b.vencimento?['Sem data','mute']:statusParcela(b);const ed=podeEditar(b.empresa_id);
    const sugC=inf.sug&&conta(inf.sug.conta_id);const banco=b.linha_digitavel&&b.linha_digitavel.length===47?BANCOS[b.linha_digitavel.slice(0,3)]:null;
    const extra=[inf.parc?`<span class="chip info" title="Fornecedor já cadastrado">${esc(inf.parc.nome)}</span>`:'',sugC?`<span class="chip mute" title="Conta usada da última vez">${esc(sugC.codigo)} ${esc(sugC.nome)}</span>`:'',
      inf.dup?`<span class="chip warn" title="Já existe conta a pagar com o mesmo valor e vencimento próximo">Parece já lançado: ${dataBR(inf.dup.vencimento)} · ${esc(inf.dup.lancamentos?.descricao||'')}</span>`:''].filter(Boolean).join(' ');
    return `<tr>${f==='novo'?`<td>${ed&&b.valor&&b.vencimento?`<input type="checkbox" data-bolsel="${b.id}" ${sel.has(b.id)?'checked':''} aria-label="Selecionar boleto">`:''}</td>`:''}
    <td class="mono">${dataBR(b.vencimento)||'–'}</td><td>${b.status==='novo'?`<span class="chip ${c}">${st}</span>`:b.status==='lancado'?'<span class="chip good">Lançado</span>':'<span class="chip mute">Ignorado</span>'}</td>
    <td class="wrap" style="min-width:220px">${esc(b.beneficiario||remNome(b.remetente))}<span class="unit">${esc(b.assunto||'')}${b.recebido_em?' · recebido '+dataBR(b.recebido_em.slice(0,10)):''}${banco?' · '+banco:''}</span>
      ${extra?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${extra}</div>`:''}
      ${b.observacao?`<span class="unit" style="color:var(--warn)">${esc(b.observacao)}</span>`:''}${b.link?`<a class="small" href="${esc(b.link)}" target="_blank" rel="noopener noreferrer">Abrir o boleto</a>`:''}</td>
    ${multi?`<td>${esc(nomeEmp(empresa(b.empresa_id)))}</td>`:''}
    <td>${b.linha_digitavel?`<button class="linkbtn mono small" data-acao="bol-copiar" data-id="${b.id}" title="Copiar linha digitável" style="text-align:left;white-space:normal;font-size:12px;line-height:1.5;max-width:230px;display:inline-block">${esc(linhaFmt(b.linha_digitavel))}</button>`:'<span class="muted">–</span>'}</td>
    <td class="n">${b.valor!=null?brl2.format(b.valor):'–'}</td>
    <td>${ed?`<div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">${b.status==='novo'?`${inf.dup?`<button class="btn ghost" data-acao="bx-vincular" data-id="${b.id}" title="Marca este boleto como o lançamento que já existe">Já lançado</button>`:''}<button class="btn" data-acao="bol-lancar" data-id="${b.id}">Lançar</button><button class="btn ghost" data-acao="bx-ignorar" data-id="${b.id}">Ignorar</button>`
      :b.status==='ignorado'?`<button class="linkbtn small" data-acao="bol-voltar" data-id="${b.id}">Voltar para a lista</button>`:b.lancamento_id?`<button class="linkbtn small" data-lanc="${b.lancamento_id}">Ver lançamento</button>`:''}</div>`:''}</td></tr>`};
  const n=k=>k==='todos'?S.boletos.length:S.boletos.filter(b=>b.status===k).length;
  return `<section class="grid g-tiles" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
    <div class="tile"><div class="lbl">Boletos a lançar</div><div class="val">${novos.length}</div><div class="cmp">${tot(novos)}</div></div>
    <div class="tile"><div class="lbl">Vencidos sem lançar</div><div class="val">${tot(venc)}</div><div class="cmp">${venc.length?`<span class="chip bad">${venc.length} boleto${venc.length>1?'s':''}</span>`:'<span class="chip good">nenhum</span>'}</div></div>
    <div class="tile"><div class="lbl">Vence nos próximos ${dias} dias</div><div class="val">${tot(sem)}</div><div class="cmp">${sem.length} boleto${sem.length===1?'':'s'}</div></div>
    <div class="tile"><div class="lbl">Parecem já lançados</div><div class="val">${dups.length}</div><div class="cmp">${dups.length?'<span class="chip warn">confira antes de lançar</span>':'<span class="chip good">nenhum em dobro</span>'}</div></div>
    <div class="tile"><div class="lbl">Última leitura do e-mail</div><div class="val" style="font-size:16px">${ult?quandoT(ult):'Ainda não ligado'}</div><div class="cmp">${S.bolTokens.length?S.bolTokens.map(t=>{const e=estado(t);return `<span class="chip ${e[1]}">${e[0]}</span>`}).join(' '):'<span class="chip mute">Gmail desligado</span>'}</div></div></section>
  ${painelGmail()}
  <div class="panel"><div class="ph"><div><h2>Boletos</h2><p class="hint">${f==='novo'?'Chegaram por e-mail. Marque vários para lançar de uma vez, ou use Lançar em cada um.':'Histórico dos boletos que chegaram por e-mail.'}</p></div>
    <div class="ctrls">${podeEditarAlguma()?`<button class="btn" data-acao="bx-arquivos">${icone('importa',15)} Adicionar boletos (foto ou arquivo)</button><button class="btn ghost" data-acao="bx-colar">${icone('colar',15)} Colar linha digitável</button>`:''}${!S.bolTokens.length&&podeEditarAlguma()?`<button class="btn" data-acao="bol-config">${icone('boletos',15)} Ligar o Gmail</button>`:''}</div></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div class="tabs" role="tablist" style="margin:0;border:0">${FILTROS.map(([k,t])=>`<button role="tab" data-bolf="${k}" class="${f===k?'on':''}" aria-selected="${f===k}">${t} <span class="chip mute">${n(k)}</span></button>`).join('')}</div>
      <input type="search" id="bolBusca" placeholder="Buscar beneficiário, assunto, valor…" value="${esc(S.bolBusca||'')}" aria-label="Buscar boletos" style="border:1px solid var(--line);border-radius:6px;padding:6px 10px;background:var(--surface);width:260px;max-width:100%"></div>
    ${f==='novo'&&sel.size?`<div class="effect" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px"><span><b>${sel.size}</b> selecionado${sel.size>1?'s':''} · ${brl2.format(sum(novos.filter(b=>sel.has(b.id)).map(b=>+b.valor||0)))}</span><span style="display:flex;gap:6px"><button class="btn" data-acao="bx-lote">Lançar selecionados</button><button class="btn ghost" data-acao="bx-lote-ignorar">Ignorar selecionados</button><button class="linkbtn small" data-acao="bx-limpar">Limpar seleção</button></span></div>`:''}
    ${lista.length?`<div class="tbl-wrap"><table><thead><tr>${f==='novo'?`<th style="width:28px">${novos.some(b=>podeEditar(b.empresa_id)&&b.valor&&b.vencimento)?'<input type="checkbox" data-bolsel="*" aria-label="Selecionar todos">':''}</th>`:''}<th>Vencimento</th><th>Situação</th><th>Beneficiário / e-mail</th>${multi?'<th>Empresa</th>':''}<th>Linha digitável</th><th class="n">Valor</th><th></th></tr></thead><tbody>${lista.slice(0,300).map(linha).join('')}</tbody></table></div>${lista.length>300?`<p class="muted">Mostrando 300 de ${lista.length}. Use a busca.</p>`:''}`
      :`<p class="muted" style="margin:0">${q?'Nenhum boleto na busca.':f==='novo'?(S.bolTokens.length?'Nenhum boleto para lançar. O e-mail é lido a cada 30 minutos.':'Nenhum boleto ainda. Clique em “Ligar o Gmail” para o app buscar os boletos sozinho, ou em “Colar linha digitável”.'):'Nada aqui.'}</p>`}</div>`;
}

// ---------- configurar Gmail: passos + ajustes da busca
const linhas=v=>(Array.isArray(v)?v:[]).join('\n');
const deLinhas=s=>String(s||'').split(/[\n,;]+/).map(x=>x.trim()).filter(x=>x.length>1).slice(0,40);
function formConfig(empId){
  const emps=S.empresas.filter(e=>podeEditar(e.id));const emp=emps.find(e=>e.id===empId)||selEmp().find(e=>podeEditar(e.id))||emps[0];if(!emp)return;
  const tk=(S.bolTokens||[]).find(t=>t.empresa_id===emp.id);const temCfg=tk&&('config' in tk);const c=tk?.config||{};
  const e=tk?estado(tk):null;
  drawer(`<h3>${icone('boletos')} ${tk?'Configurar Gmail':'Ligar o Gmail'}</h3>
  <p class="muted" style="margin:0">Um pequeno programa roda na sua própria conta Google, procura e-mails com boleto e manda para cá a linha digitável, o valor e o vencimento. Nada é pago sozinho: cada boleto espera você lançar.</p>
  <div class="field wide"><label for="bolEmp">Os boletos entram na empresa</label><select id="bolEmp">${opcoesEmp(emp.id)}</select></div>
  ${tk?`<div class="effect" ${e[1]!=='good'?'style="border-left-color:var(--warn);background:var(--warn-soft)"':''}><b>${e[0]}.</b> ${esc(e[2])} Botão “Buscar boletos agora”: ${tk.url_busca?'<b>ligado</b>':'desligado (passo 4)'}.</div>`:''}
  <ol style="margin:0;padding-left:20px;display:grid;gap:6px;font-size:14px">
    <li>${tk?'Copie o script desta empresa':'Gere o código desta empresa'} no botão abaixo.</li>
    <li>Abra <a href="https://script.google.com/home" target="_blank" rel="noopener">script.google.com</a> com a conta do Gmail dos boletos. Se já existe o projeto “Gevans Gestor · Boletos”, abra ele; senão, crie um novo. Apague o que estiver lá e cole.</li>
    <li>Salve, escolha a função <b>instalar</b> no topo e clique em <b>Executar</b>. Autorize o acesso que o Google pedir.</li>
    <li>Para o botão <b>Buscar boletos agora</b>: em <b>Implantar › Gerenciar implantações</b> (ou Nova implantação, tipo <b>App da Web</b>, executar como <b>Eu</b>, acesso <b>Qualquer pessoa</b>), crie uma versão nova. Depois execute <b>instalar</b> de novo.</li></ol>
  <div style="display:flex;gap:8px;flex-wrap:wrap">${tk?`<button class="btn" data-acao="bol-script" data-emp="${emp.id}">Copiar script</button><button class="btn ghost" data-acao="bol-novo-codigo" data-emp="${emp.id}">Trocar código</button>`:`<button class="btn" data-acao="bol-gerar" data-emp="${emp.id}">Gerar código e copiar script</button>`}</div>
  <textarea id="bolScript" rows="3" readonly hidden style="font-size:11px"></textarea>
  ${tk?`<form data-form="bx-config" data-emp="${emp.id}" class="form-grid" style="border-top:1px solid var(--line);padding-top:12px;margin-top:4px">
    <h3 class="wide" style="margin:0">Ajustes da busca</h3>
    ${temCfg?'':'<p class="wide muted" style="margin:0">Os ajustes ficam disponíveis depois da atualização 0015 do banco.</p>'}
    <p class="wide muted small" style="margin:0">O script lê estes ajustes a cada execução. Não precisa copiar o script de novo.</p>
    <div class="field"><label for="bxDias">Olhar e-mails dos últimos (dias)</label><input id="bxDias" name="dias" type="number" min="7" max="365" value="${+c.dias||60}" ${temCfg?'':'disabled'}></div>
    <label class="field" style="display:flex;gap:8px;align-items:center;flex-direction:row"><input type="checkbox" name="promo" ${c.incluir_promocoes?'checked':''} ${temCfg?'':'disabled'}> Ler também as abas Promoções e Social</label>
    <div class="field wide"><label for="bxSempre">Sempre ler os e-mails destes remetentes (um por linha)</label><textarea id="bxSempre" name="sempre" rows="2" placeholder="ipasgo.go.gov.br&#10;cobranca@condominio.com.br" ${temCfg?'':'disabled'}>${esc(linhas(c.sempre_remetentes))}</textarea></div>
    <div class="field wide"><label for="bxTermos">Palavras extras para procurar (uma por linha)</label><textarea id="bxTermos" name="termos" rows="2" placeholder="aluguel&#10;condomínio" ${temCfg?'':'disabled'}>${esc(linhas(c.termos_extras))}</textarea></div>
    <div class="field wide"><label for="bxIgn">Nunca trazer boletos destes remetentes (um por linha)</label><textarea id="bxIgn" name="ignorar" rows="2" placeholder="newsletter@loja.com" ${temCfg?'':'disabled'}>${esc(linhas(c.ignorar_remetentes))}</textarea></div>
    <div class="wide" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" ${temCfg?'':'disabled'}>Salvar ajustes</button>${tk.url_busca?'<button type="button" class="btn ghost" data-acao="bx-reler">Ler tudo de novo agora</button>':''}<button type="button" class="btn ghost" data-acao="fechar">Fechar</button></div></form>`:'<div><button class="btn ghost" data-acao="fechar">Fechar</button></div>'}
  <p class="muted small" style="margin:0">Trocar o código desliga o script antigo. Use se achar que alguém viu o código.</p>`);
  document.getElementById('bolEmp').addEventListener('change',ev=>formConfig(ev.target.value));
}

// ---------- lançar vários boletos de uma vez
function formLote(){
  const bs=S.boletos.filter(b=>S.bolSel.has(b.id));if(!bs.length)return;
  const emps=[...new Set(bs.map(b=>b.empresa_id))];if(emps.length>1)return toast('Selecione boletos de uma empresa só.');
  const emp=emps[0];const f=camposEmpresa(emp);
  const sug=bs.map(b=>S.bolInfo[b.id]?.sug).find(Boolean);
  drawer(`<h3>Lançar ${bs.length} boleto${bs.length>1?'s':''} em contas a pagar</h3>
  <p class="muted" style="margin:0">Cada boleto vira um lançamento com o próprio valor e vencimento. O fornecedor vem do beneficiário (pelo CNPJ quando houver).</p>
  <div class="tbl-wrap" style="max-height:200px;overflow:auto"><table><tbody>${bs.map(b=>`<tr><td class="mono">${dataBR(b.vencimento)}</td><td>${esc(b.beneficiario||remNome(b.remetente))}</td><td class="n">${brl2.format(b.valor)}</td></tr>`).join('')}
    <tr><td colspan="2"><b>Total</b></td><td class="n"><b>${brl2.format(sum(bs.map(b=>+b.valor)))}</b></td></tr></tbody></table></div>
  <form data-form="bx-lote" data-emp="${emp}" class="form-grid">
    <div class="field wide"><label for="bxConta">Conta do plano</label><select id="bxConta" name="conta" required>${f.contas}</select></div>
    <div class="field"><label for="bxCentro">Centro de custo</label><select id="bxCentro" name="centro">${f.cc}</select></div>
    <div class="field"><label for="bxPred">Unidade</label><select id="bxPred" name="predio">${f.pred}</select></div>
    <div class="field"><label for="bxBanco">Pagar pela conta bancária</label><select id="bxBanco" name="banco">${f.bancos}</select></div>
    <div class="field"><label for="bxComp">Competência</label><select id="bxComp" name="comp"><option value="venc">Mês do vencimento</option><option value="rec">Mês em que o e-mail chegou</option></select></div>
    <div class="wide" style="display:flex;gap:8px"><button class="btn">Lançar ${bs.length} conta${bs.length>1?'s':''} a pagar</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`);
  const fm=document.querySelector('form[data-form="bx-lote"]');
  if(sug){if(sug.conta_id)fm.conta.value=sug.conta_id;if(sug.centro_custo_id)fm.centro.value=sug.centro_custo_id;if(sug.predio_id)fm.predio.value=sug.predio_id}
  const ultBanco=lsGet('gg_ult_banco_'+emp);if(ultBanco&&[...fm.banco.options].some(o=>o.value===ultBanco))fm.banco.value=ultBanco;
}
async function parceiroDoBoleto(b){
  const p=S.bolInfo[b.id]?.parc||parcPorDoc(b);if(p)return p.id;
  const nome=(b.beneficiario||remNome(b.remetente)||'').trim();if(!nome)return null;
  const {data,error}=await sb.from('parceiros').insert({empresa_id:b.empresa_id,nome:nome.slice(0,200),documento:soDig(b.documento_beneficiario)||null,fornecedor:true,cliente:false}).select('id,empresa_id,documento,nome').single();
  if(error){console.warn(error);return null}S.parceiros.push(data);return data.id;
}
async function lancarBoleto(b,o){
  const c=conta(o.conta);const v=-Math.abs(+b.valor);const id=uuid();
  const comp=o.comp==='rec'&&b.recebido_em?b.recebido_em.slice(0,10):b.vencimento;
  const L={id,empresa_id:b.empresa_id,predio_id:o.predio||null,conta_id:c.id,centro_custo_id:o.centro||null,parceiro_id:await parceiroDoBoleto(b),competencia:comp,descricao:['Boleto',b.assunto].filter(Boolean).join(' · ').slice(0,300),valor:c.tipo==='receita'?-v:v};
  const {error}=await sb.from('lancamentos').insert(L);if(error)throw error;
  const {error:e2}=await sb.from('parcelas').insert({empresa_id:b.empresa_id,lancamento_id:id,numero:1,vencimento:b.vencimento,valor:L.valor,status:'aberta',forma_pagamento:'Boleto',conta_bancaria_id:o.banco||null,centro_custo_id:o.centro||null});
  if(e2){await sb.from('lancamentos').delete().eq('id',id);throw e2}
  const {error:e3}=await sb.from('boletos_email').update({status:'lancado',lancamento_id:id}).eq('id',b.id);if(e3)throw e3;
}
Object.assign(FORMS,{
  async 'bx-lote'(f){
    const bs=S.boletos.filter(b=>S.bolSel.has(b.id));if(!conta(f.conta.value))return toast('Escolha a conta do plano.');
    const o={conta:f.conta.value,centro:f.centro.value,predio:f.predio.value,banco:f.banco.value,comp:f.comp.value};if(o.banco)lsSet('gg_ult_banco_'+f.dataset.emp,o.banco);
    let ok=0;for(const b of bs){try{await lancarBoleto(b,o);ok++}catch(e){console.error(e);toast(`Parei no boleto de ${dataBR(b.vencimento)}: ${traduz(e)}`);break}}
    S.bolSel=new Set();invalidar();if(typeof carregarAnos==='function')await carregarAnos();fecharDrawer();if(ok)toast(`${ok} boleto${ok>1?'s':''} lançado${ok>1?'s':''} em contas a pagar.`);render(true);window.atualizaContadores?.()},
  async 'bx-config'(f){
    const cfgNovo={dias:Math.min(365,Math.max(7,+f.dias.value||60)),incluir_promocoes:f.promo.checked,sempre_remetentes:deLinhas(f.sempre.value),termos_extras:deLinhas(f.termos.value),ignorar_remetentes:deLinhas(f.ignorar.value).map(x=>x.toLowerCase())};
    const {error}=await sb.from('boletos_email_token').update({config:cfgNovo}).eq('empresa_id',f.dataset.emp);if(error)throw error;
    const tk=S.bolTokens.find(t=>t.empresa_id===f.dataset.emp);if(tk)tk.config=cfgNovo;toast('Ajustes salvos. Valem na próxima leitura do Gmail.');formConfig(f.dataset.emp)},
  async 'bx-colar'(f){const r=lerLinha(f.linha.value);if(r.erro)return toast(r.erro);
    const emp=f.empresa.value;fecharDrawer();
    formLanc(null,null,{empresa:emp,valor:r.valor||'',vencimento:r.vencimento||HOJE,competencia:r.vencimento||HOJE,parceiro:'',documento:'Boleto',descricao:'Linha '+linhaFmt(r.linha),forma:'Boleto'})},
});

function formColar(){
  drawer(`<h3>${icone('colar')} Colar linha digitável</h3><p class="muted" style="margin:0">Cole a linha digitável ou o código de barras de um boleto que não veio por e-mail. O app confere os números e já traz o valor e o vencimento.</p>
  <form data-form="bx-colar" class="form-grid">
    <div class="field wide"><label for="bxLinha">Linha digitável</label><textarea id="bxLinha" name="linha" rows="2" required placeholder="00190.00009 01234.567890 12345.678901 1 12340000012345" style="font-family:var(--f-num)"></textarea></div>
    <div class="field wide"><label for="bxEmp">Empresa</label><select id="bxEmp" name="empresa">${opcoesEmp(selEmp().find(e=>podeEditar(e.id))?.id)}</select></div>
    <div class="wide" id="bxLeitura" aria-live="polite"></div>
    <div class="wide" style="display:flex;gap:8px"><button class="btn">Continuar para o lançamento</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`);
}
document.addEventListener('input',ev=>{
  if(ev.target.id==='bxLinha'){const r=lerLinha(ev.target.value),o=document.getElementById('bxLeitura');if(!o)return;
    o.innerHTML=soDig(ev.target.value).length<44?'':r.erro?`<div class="effect" style="border-left-color:var(--bad);background:var(--bad-soft)">${esc(r.erro)}</div>`
      :`<div class="kv"><div><small>Valor</small><span>${r.valor?brl2.format(r.valor):'não informado'}</span></div><div><small>Vencimento</small><span>${r.vencimento?dataBR(r.vencimento):'ver no boleto'}</span></div><div><small>${r.consumo?'Tipo':'Banco'}</small><span>${r.consumo?'Conta de consumo':esc(BANCOS[r.banco]||r.banco)}</span></div></div>`}
  if(ev.target.id==='bolBusca'){S.bolBusca=ev.target.value;clearTimeout(S._bolT);S._bolT=setTimeout(async()=>{S._bolRapido=true;const pos=ev.target.selectionStart;await render(true);const i=document.getElementById('bolBusca');if(i){i.focus();try{i.setSelectionRange(pos,pos)}catch(e){}}},300)}
});
document.addEventListener('change',ev=>{const t=ev.target;if(!t.dataset?.bolsel)return;
  S.bolSel=S.bolSel||new Set();
  if(t.dataset.bolsel==='*'){const ids=S.boletos.filter(b=>b.status==='novo'&&podeEditar(b.empresa_id)&&b.valor&&b.vencimento&&S.bolLista.includes(b.id)).map(b=>b.id);ids.forEach(id=>t.checked?S.bolSel.add(id):S.bolSel.delete(id))}
  else t.checked?S.bolSel.add(t.dataset.bolsel):S.bolSel.delete(t.dataset.bolsel);
  S._bolRapido=true;render(true)});
document.addEventListener('click',async ev=>{
  const fb=ev.target.closest('[data-bolf]');if(fb){S.bolFiltro=fb.dataset.bolf;S._bolRapido=true;render(true);return}
  const b=ev.target.closest('[data-acao^="bx-"]');if(!b)return;const a=b.dataset.acao;
  try{
    if(a==='bx-lote')formLote();
    else if(a==='bx-limpar'){S.bolSel=new Set();S._bolRapido=true;render(true)}
    else if(a==='bx-colar')formColar();
    else if(a==='bx-arquivos')formArquivos();
    else if(a==='bx-arq-gravar')await gravarArquivos(b);
    else if(a==='bx-arq-tirar'){const i=S.bxArq?.itens?.[+b.dataset.i];if(i&&!i.lendo){S.bxArq.itens.splice(+b.dataset.i,1);desenhaArq()}}
    else if(a==='bx-lote-ignorar'){if(!confirm(`Ignorar ${S.bolSel.size} boleto(s)?`))return;const {error}=await sb.from('boletos_email').update({status:'ignorado'}).in('id',[...S.bolSel]);if(error)throw error;S.bolSel=new Set();toast('Boletos ignorados.');render(true);window.atualizaContadores?.()}
    else if(a==='bx-ignorar'){const x=S.boletos.find(y=>y.id===b.dataset.id);const em=remEmail(x.remetente);const tk=S.bolTokens.find(t=>t.empresa_id===x.empresa_id);
      drawer(`<h3>Ignorar boleto</h3><p class="muted" style="margin:0">${esc(x.beneficiario||remNome(x.remetente))}${x.valor?' · '+brl2.format(x.valor):''}</p>
        <div style="display:grid;gap:8px"><button class="btn" data-acao="bx-ign-um" data-id="${x.id}">Ignorar só este</button>
        ${em&&tk&&('config' in tk)?`<button class="btn ghost" data-acao="bx-ign-sempre" data-id="${x.id}">Ignorar sempre os e-mails de ${esc(em)}</button>`:''}
        <button class="btn ghost" data-acao="fechar">Cancelar</button></div>`)}
    else if(a==='bx-ign-um'){b.disabled=true;const {error}=await sb.from('boletos_email').update({status:'ignorado'}).eq('id',b.dataset.id);if(error)throw error;fecharDrawer();toast('Boleto ignorado.');render(true);window.atualizaContadores?.()}
    else if(a==='bx-ign-sempre'){b.disabled=true;const x=S.boletos.find(y=>y.id===b.dataset.id);const em=remEmail(x.remetente);const tk=S.bolTokens.find(t=>t.empresa_id===x.empresa_id);
      const c={...(tk.config||{})};c.ignorar_remetentes=[...new Set([...(c.ignorar_remetentes||[]),em])];
      const {error}=await sb.from('boletos_email_token').update({config:c}).eq('empresa_id',x.empresa_id);if(error)throw error;tk.config=c;
      const ids=S.boletos.filter(y=>y.status==='novo'&&y.empresa_id===x.empresa_id&&remEmail(y.remetente)===em).map(y=>y.id);
      const {error:e2}=await sb.from('boletos_email').update({status:'ignorado'}).in('id',ids);if(e2)throw e2;
      fecharDrawer();toast(`${em} não entra mais na lista (${ids.length} boleto${ids.length>1?'s':''} ignorado${ids.length>1?'s':''}). Dá para desfazer em Configurar Gmail.`);render(true);window.atualizaContadores?.()}
    else if(a==='bx-vincular'){const x=S.boletos.find(y=>y.id===b.dataset.id);const d=S.bolInfo[x.id]?.dup;if(!d)return;
      if(!confirm(`Marcar este boleto como já lançado na conta a pagar de ${dataBR(d.vencimento)} (${brl2.format(Math.abs(d.valor))})?`))return;b.disabled=true;
      const {error}=await sb.from('boletos_email').update({status:'lancado',lancamento_id:d.lancamento_id}).eq('id',x.id);if(error)throw error;toast('Boleto ligado ao lançamento que já existia.');render(true);window.atualizaContadores?.()}
    else if(a==='bx-reler'){const tk=S.bolTokens.find(t=>t.url_busca);if(!tk)return;b.disabled=true;b.textContent='Lendo o Gmail…';
      try{const r=await fetch(tk.url_busca,{method:'POST',body:JSON.stringify({token:tk.token,releitura:true})});const j=await r.json();toast(j.ok?`Pronto: ${j.novos||0} boleto(s) novo(s) em ${j.conversas||0} conversas.`:'O script respondeu: '+(j.erro||'erro'))}
      catch(e){await fetch(tk.url_busca,{method:'POST',mode:'no-cors',body:JSON.stringify({token:tk.token,releitura:true})}).catch(()=>{});toast('Pedido enviado. A leitura completa leva alguns minutos.')}
      fecharDrawer();render(true)}
  }catch(e){console.error(e);toast(traduz(e));b.disabled=false}
});


// ---------- boletos por foto ou arquivo: vários de uma vez, lendo o código de barras de cada um
IC.importa=IC.importa||'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>';
IC.camera='<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>';
let zxPronto=null;
function carregarZX(){if(window.ZXing)return Promise.resolve();if(zxPronto)return zxPronto;
  zxPronto=new Promise((ok,erro)=>{const sc=document.createElement('script');sc.src='vendor/zxing/zxing.min.js';sc.onload=ok;sc.onerror=()=>{zxPronto=null;erro(new Error('O leitor de código de barras não carregou.'))};document.head.appendChild(sc)});return zxPronto}
// procura no texto uma linha digitável ou código de barras que confira (dígitos verificadores)
function linhaNoTexto(txt){
  const blocos=String(txt||'').match(/\d[\d.\s\-]{38,90}\d/g)||[];const achados=new Map();
  const busca=Ls=>{for(const bl of blocos){const d=soDig(bl);for(const L of Ls)for(let i=0;i+L<=d.length;i++){const r=lerLinha(d.substr(i,L));if(!r.erro&&!achados.has(r.linha)){achados.set(r.linha,r);i+=L-1}}}};
  busca([47,48]);
  // código de barras de 44 números só tem um dígito verificador: aceita se o valor e o vencimento fizerem sentido
  if(!achados.size){busca([44]);for(const [k_,r] of achados){const ok=r.consumo?!!r.valor:(r.valor>0&&r.vencimento&&Math.abs(new Date(r.vencimento)-new Date())<5*365*864e5);if(!ok)achados.delete(k_)}}
  return [...achados.values()];
}
function dadosNoTexto(txt){
  const t=String(txt||'');const o={};
  const cn=t.match(/BENEFICI[AÁ]RIO[\s\S]{0,160}?(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i)||t.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);if(cn)o.documento=soDig(cn[1]);
  const ln=t.split(/\n/).map(x=>x.trim());const i=ln.findIndex(x=>/BENEFICI[AÁ]RIO|CEDENTE/i.test(x));
  if(i>=0){let n=ln[i].replace(/.*?(BENEFICI[AÁ]RIO|CEDENTE)( FINAL)?\s*:?/i,'').replace(/(CPF|CNPJ)?[\s:]*[\d.\/-]{11,}.*$/i,'').trim();if(n.length<3)n=(ln[i+1]||'').replace(/(CPF|CNPJ)?[\s:]*[\d.\/-]{11,}.*$/i,'').trim();if(n.length>=3&&!/^\d/.test(n))o.beneficiario=n.slice(0,120)}
  const vc=t.match(/VENCIMENTO[\s:]*?(\d{2}\/\d{2}\/\d{4})/i);if(vc)o.vencimento=isoDe(vc[1]);
  return o;
}
async function codigoNaImagem(canvas){
  // 1) leitor do próprio navegador (Chrome no Mac e no Android)
  if('BarcodeDetector' in window){try{const fm=await BarcodeDetector.getSupportedFormats();if(fm.includes('itf')){const bd=new BarcodeDetector({formats:['itf']});for(const r of await bd.detect(canvas)){const d=soDig(r.rawValue);if(d.length===44&&!lerLinha(d).erro)return d}}}catch(e){}}
  // 2) ZXing (Windows e os demais)
  await carregarZX();const H=new Map();H.set(ZXing.DecodeHintType.POSSIBLE_FORMATS,[ZXing.BarcodeFormat.ITF]);H.set(ZXing.DecodeHintType.TRY_HARDER,true);H.set(ZXing.DecodeHintType.ALLOWED_LENGTHS,Int32Array.from([44]));
  const rd=new ZXing.MultiFormatReader();rd.setHints(H);
  const tenta=c=>{try{const r=rd.decode(new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(new ZXing.HTMLCanvasElementLuminanceSource(c))));const d=soDig(r.getText());return d.length===44&&!lerLinha(d).erro?d:null}catch(e){return null}};
  let d=tenta(canvas);if(d)return d;
  // foto: tenta faixas da imagem e menor resolução (o código costuma ficar no rodapé)
  const W=canvas.width,Hh=canvas.height;const corte=(y0,y1,esc)=>{const c=document.createElement('canvas');c.width=Math.round(W*esc);c.height=Math.round((y1-y0)*Hh*esc);c.getContext('2d').drawImage(canvas,0,y0*Hh,W,(y1-y0)*Hh,0,0,c.width,c.height);return c};
  for(const [a,b] of [[.55,1],[.7,1],[0,.5],[.3,.8]])for(const e of [1,.6]){d=tenta(corte(a,b,e));if(d)return d}
  return null;
}
function canvasDaImagem(file){return new Promise((ok,erro)=>{const u=URL.createObjectURL(file);const im=new Image();im.onload=()=>{const max=2400,e=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*e);c.height=Math.round(im.height*e);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c)};im.onerror=()=>{URL.revokeObjectURL(u);erro(new Error('Não consegui abrir a imagem. Envie JPG, PNG ou PDF.'))};im.src=u})}
async function ocrCanvas(c){await carregarOCR();const base=new URL('vendor/ocr/',location.href).href;
  const w=await Tesseract.createWorker('por',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base,workerBlobURL:false});try{const {data}=await w.recognize(c);return data.text}finally{w.terminate()}}
async function lerBoletoArquivo(file,avisa){
  const pdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';let texto='',canvases=[];
  if(pdf){const buf=await file.arrayBuffer();try{texto=(await textoPDF(new Uint8Array(buf.slice(0)))).flat().join('\n')}catch(e){throw new Error('Não consegui abrir o PDF (pode ter senha).')}
    let ach=linhaNoTexto(texto);if(ach.length)return ach.map(r=>({...r,...dadosNoTexto(texto),fonte:'texto do PDF'}));
    avisa('procurando o código de barras');await carregarPdfJs();const doc=await pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;
    for(let p=1;p<=Math.min(doc.numPages,6);p++){const pg=await doc.getPage(p);const vp=pg.getViewport({scale:2.5});const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;canvases.push(c)}}
  else if(/^image\//.test(file.type)||/\.(jpe?g|png|webp|heic|gif|bmp)$/i.test(file.name)){avisa('procurando o código de barras');canvases=[await canvasDaImagem(file)]}
  else throw new Error('Formato não aceito. Envie foto (JPG, PNG) ou PDF.');
  const out=[];for(const c of canvases){const d=await codigoNaImagem(c);if(d)out.push({...lerLinha(d),fonte:'código de barras'})}
  if(out.length){return out.map(r=>({...r,...dadosNoTexto(texto)}))}
  avisa('lendo os números da imagem');let ocr='';for(const c of canvases)ocr+='\n'+await ocrCanvas(c);
  const ach=linhaNoTexto(ocr);if(ach.length)return ach.map(r=>({...r,...dadosNoTexto(texto+'\n'+ocr),fonte:'leitura da imagem'}));
  throw new Error('Não achei o código de barras. Tire a foto mais de perto, com boa luz e o código inteiro na imagem, ou cole a linha digitável.');
}
function formArquivos(){
  const emp=selEmp().find(e=>podeEditar(e.id))?.id||S.empresas.find(e=>podeEditar(e.id))?.id;if(!emp)return toast('Seu acesso é só de consulta.');
  S.bxArq={emp,itens:[]};
  drawer(`<h3>${icone('importa')} Adicionar boletos por foto ou arquivo</h3>
  <p class="muted" style="margin:0">Escolha vários de uma vez: fotos do boleto ou PDFs. O app lê o código de barras de cada um e traz valor, vencimento e banco. Depois é só lançar em contas a pagar.</p>
  <div class="field"><label for="bxArqEmp">Empresa</label><select id="bxArqEmp">${opcoesEmp(emp)}</select></div>
  <label class="bx-drop" for="bxArqIn" style="display:grid;place-items:center;gap:6px;border:2px dashed var(--line);border-radius:10px;padding:22px;text-align:center;cursor:pointer;background:var(--surface-2)">
    ${icone('importa',26)}<b>Clique para escolher ou arraste os arquivos aqui</b><span class="muted small">PDF, JPG ou PNG · vários de uma vez</span></label>
  <input id="bxArqIn" type="file" multiple accept="application/pdf,image/*" hidden>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn ghost" for="bxArqCam" style="display:inline-flex;gap:6px;align-items:center;cursor:pointer">${icone('camera',15)} Tirar foto</label><input id="bxArqCam" type="file" accept="image/*" capture="environment" multiple hidden></div>
  <div id="bxArqLista" aria-live="polite"></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-acao="bx-arq-gravar" disabled>Adicionar à lista de boletos</button><button class="btn ghost" data-acao="fechar">Cancelar</button></div>`);
  const dz=document.querySelector('.bx-drop');dz.addEventListener('dragover',ev=>{ev.preventDefault();dz.style.borderColor='var(--accent)'});dz.addEventListener('dragleave',()=>dz.style.borderColor='');
  dz.addEventListener('drop',ev=>{ev.preventDefault();dz.style.borderColor='';receberArquivos([...ev.dataTransfer.files])});
  document.getElementById('bxArqEmp').addEventListener('change',ev=>{S.bxArq.emp=ev.target.value});
}
async function receberArquivos(files){
  const A=S.bxArq;if(!A)return;const novos=files.map(f=>({f,nome:f.name,lendo:true,etapa:'na fila'}));A.itens.push(...novos);desenhaArq();
  for(const it of novos){it.etapa='lendo';desenhaArq();
    try{const rs=await lerBoletoArquivo(it.f,t=>{it.etapa=t;desenhaArq()});const [r,...outros]=rs;Object.assign(it,{r,lendo:false});
      outros.forEach(o=>A.itens.push({f:it.f,nome:it.nome+' (outro boleto)',r:o,lendo:false}))}
    catch(e){console.warn(e);Object.assign(it,{erro:e.message||String(e),lendo:false})}desenhaArq()}
}
function desenhaArq(){
  const A=S.bxArq,el=document.getElementById('bxArqLista');if(!A||!el)return;
  const ja=new Set((S.boletos||[]).filter(b=>b.empresa_id===A.emp).map(b=>b.chave));
  const vistos=new Set();A.itens.forEach(it=>{if(it.r){it.dup=ja.has(it.r.linha)||vistos.has(it.r.linha);vistos.add(it.r.linha)}});
  const ok=A.itens.filter(it=>it.r&&!it.dup);
  el.innerHTML=A.itens.length?`<div class="tbl-wrap"><table><thead><tr><th>Arquivo</th><th>Vencimento</th><th class="n">Valor</th><th>Leitura</th><th></th></tr></thead><tbody>${A.itens.map((it,i)=>`<tr>
    <td class="wrap" style="max-width:200px">${esc(it.nome)}${it.r?.beneficiario?`<span class="unit">${esc(it.r.beneficiario)}</span>`:''}</td>
    <td class="mono">${it.r?(it.r.vencimento?dataBR(it.r.vencimento):'ver no boleto'):''}</td><td class="n">${it.r?.valor?brl2.format(it.r.valor):''}</td>
    <td class="wrap" style="max-width:250px;white-space:normal">${it.lendo?`<span class="chip mute">${esc(it.etapa)}…</span>`:it.erro?`<span class="chip bad" title="${esc(it.erro)}">não li</span><span class="unit" style="color:var(--bad)">${esc(it.erro)}</span>`:it.dup?'<span class="chip warn">já está na lista</span>':`<span class="chip good">ok</span><span class="unit mono" style="font-size:11px;word-break:break-word">${esc(linhaFmt(it.r.linha))}</span>`}</td>
    <td>${it.lendo?'':`<button class="linkbtn small" data-acao="bx-arq-tirar" data-i="${i}" aria-label="Tirar da lista">✕</button>`}</td></tr>`).join('')}</tbody></table></div>`:'';
  const b=document.querySelector('[data-acao=bx-arq-gravar]');if(b){b.disabled=!ok.length||A.itens.some(it=>it.lendo);b.textContent=ok.length?`Adicionar ${ok.length} boleto${ok.length>1?'s':''} à lista`:'Adicionar à lista de boletos'}
}
document.addEventListener('change',ev=>{if((ev.target.id==='bxArqIn'||ev.target.id==='bxArqCam')&&ev.target.files.length){receberArquivos([...ev.target.files]);ev.target.value=''}});
async function gravarArquivos(b){
  const A=S.bxArq;const its=A.itens.filter(it=>it.r&&!it.dup);if(!its.length)return;b.disabled=true;b.textContent='Gravando…';
  const agora=new Date().toISOString();
  const rows=its.map(it=>({empresa_id:A.emp,chave:it.r.linha,remetente:'Enviado pelo app',assunto:it.nome.slice(0,500),anexo:it.nome.slice(0,300),recebido_em:agora,linha_digitavel:it.r.linha,valor:it.r.valor||null,vencimento:it.r.vencimento||null,
    beneficiario:it.r.beneficiario||(it.r.banco&&BANCOS[it.r.banco]?'Boleto '+BANCOS[it.r.banco]:null),documento_beneficiario:it.r.documento||null,observacao:it.r.vencimento?null:'Confira o vencimento no boleto.'}));
  const {data,error}=await sb.from('boletos_email').insert(rows).select('id');
  if(error){b.disabled=false;b.textContent='Adicionar à lista de boletos';if(/row-level|policy|permission/i.test(error.message||''))return toast('Falta a atualização 0026 do banco para adicionar boletos pelo app.');if(/duplicate|unique/i.test(error.message||''))return toast('Algum destes boletos já estava na lista. Tire-o e tente de novo.');throw error}
  S.bolSel=new Set((data||[]).map(x=>x.id));S.bolFiltro='novo';S.bxArq=null;fecharDrawer();
  toast(`${its.length} boleto${its.length>1?'s':''} na lista e já marcado${its.length>1?'s':''}. Clique em Lançar para virar contas a pagar.`);await render(true);window.atualizaContadores?.();
}

// ---------- troca a tela antiga pela nova
VIEWS.boletos=vBoletos2;
formBolConfig=formConfig;
const _bolLancar=ACOES_BOL['bol-lancar'];
// o lançamento individual também usa o fornecedor e a conta sugeridos
ACOES_BOL['bol-lancar']=async b=>{const x=S.boletos.find(y=>y.id===b.dataset.id);const inf=x&&S.bolInfo?.[x.id];
  if(!x||!inf||(!inf.sug&&!inf.parc))return _bolLancar(b);
  formLanc(null,null,{boleto:x.id,empresa:x.empresa_id,valor:x.valor,vencimento:x.vencimento||HOJE,competencia:x.vencimento||HOJE,parceiro:inf.parc?.nome||x.beneficiario||'',documento:'Boleto',descricao:x.assunto||'',forma:'Boleto',conta:inf.sug?.conta_id||null,centro:inf.sug?.centro_custo_id||null})};
if(S.user&&rota()==='boletos')render(true);
})();
