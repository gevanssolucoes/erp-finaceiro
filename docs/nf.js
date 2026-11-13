// ===================== Notas fiscais e cobrança por API
// Emite NFS-e pelo emissor (Focus NFe), gera boleto e PIX pelo banco (Asaas) e dá baixa sozinha quando o cliente paga.
// Sem token configurado tudo roda em modo simulado, para testar o fluxo inteiro: NF → faturamento → cobrança → caixa.
(()=>{
if(typeof S==='undefined'||typeof VIEWS==='undefined')return;

const PROV_NF={simulado:'Simulado (teste)',focusnfe:'Focus NFe'},PROV_BANCO={simulado:'Simulado (teste)',asaas:'Asaas'};
const AMB={simulado:['Simulado','mute'],homologacao:['Homologação','warn'],producao:['Produção','good']};
const MODELOS={nfse:'NFS-e da prefeitura',nfse_nacional:'NFS-e Nacional',nfe:'NF-e de produto (próxima etapa)'};
const ST_NF={processando:['Processando','info'],autorizada:['Autorizada','good'],erro:['Com erro','bad'],cancelada:['Cancelada','mute']};
const ST_COB={pendente:['Aguardando','info'],paga:['Paga','good'],cancelada:['Cancelada','mute'],erro:['Com erro','bad']};
const TIPO_COB={boleto_pix:'Boleto + PIX',boleto:'Boleto',pix:'PIX'};
const FORMAS_NF={boleto_pix:'Boleto + PIX pelo banco',boleto:'Boleto pelo banco',pix_banco:'PIX pelo banco',
  debito:'Cartão de débito',credito_vista:'Crédito à vista',credito_parcelado:'Crédito parcelado',pix:'PIX na maquininha',dinheiro:'Dinheiro',transferencia:'Transferência'};
const PELO_BANCO=new Set(['boleto_pix','boleto','pix_banco']);
// Reforma tributária: em 2026 a nota destaca CBS 0,9% e IBS 0,1% só como informação (não é cobrado)
const REFORMA={2026:[0.9,0.1]};
const chip=(m,v)=>{const x=m[v]||[v,'mute'];return `<span class="chip ${x[1]}">${x[0]}</span>`};
const docFmt=d=>{d=soDig(d);return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):d.length===11?d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4'):d};
const linhaFmt=d=>{d=soDig(d);return d.length===47?`${d.slice(0,5)}.${d.slice(5,10)} ${d.slice(10,15)}.${d.slice(15,21)} ${d.slice(21,26)}.${d.slice(26,32)} ${d[32]} ${d.slice(33)}`:d};
const mesesAno=()=>MESES.map((_,i)=>`${S.ano}-${String(i+1).padStart(2,'0')}`);

IC.cobranca='<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h2M11 15h6"/>';
IC.integra='<path d="M9 7H6a3 3 0 0 0 0 6h3M15 7h3a3 3 0 0 1 0 6h-3M8 10h8"/><path d="M12 15v5M9 20h6"/>';

const css=document.createElement('style');css.textContent=`
.nf-integ{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.nf-integ .card{border:1px solid var(--line);border-radius:10px;padding:14px;background:var(--surface);display:flex;flex-direction:column;gap:8px;min-width:0}
.nf-integ .card h3{margin:0;font-size:14px;display:flex;align-items:center;gap:8px}
.nf-integ .card .linha{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.nf-integ .card small{color:var(--ink-3)}
.nf-fluxo{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--ink-2)}
.nf-fluxo b{font-weight:600;color:var(--ink)}
.nf-fluxo i{font-style:normal;color:var(--ink-3)}
.nf-copia{font-family:var(--f-num);font-size:12px;line-height:1.5;text-align:left;white-space:normal;word-break:break-all;max-width:240px;display:inline-block}
.nf-sec{grid-column:1/-1;margin:6px 0 -2px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3);border-top:1px solid var(--line);padding-top:10px}
`;document.head.appendChild(css);

// ---------- dados
async function api(body){
  const {data,error}=await sb.functions.invoke('integracoes',{body});
  if(error){let m=error.message;try{const j=await error.context.json();if(j?.erro)m=j.erro}catch(e){}throw new Error(m)}
  if(data?.erro)throw new Error(data.erro);return data}
async function carregar(){
  const ids=selEmp().map(e=>e.id);if(!ids.length){S.nfs=[];S.cobs=[];return}
  const [n,c]=await Promise.all([
    sb.from('nf_emitidas').select('*').in('empresa_id',ids).order('data_emissao',{ascending:false}).order('criado_em',{ascending:false}).limit(1000),
    sb.from('cobrancas').select('*').in('empresa_id',ids).order('vencimento',{ascending:false}).limit(1000)]);
  if(n.error)throw n.error;if(c.error)throw c.error;S.nfs=n.data||[];S.cobs=c.data||[];
  S.integ=S.integ||{};
  await Promise.all(ids.filter(id=>!S.integ[id]).map(async id=>{const {data,error}=await sb.rpc('integracoes_status',{p_emp:id});
    S.integ[id]={nf:null,banco:null};if(!error)(data||[]).forEach(r=>S.integ[id][r.servico]=r)}));
}
const integ=(emp,s)=>S.integ?.[emp]?.[s]||{provedor:'simulado',ambiente:'simulado',config:{}};
const nomeParc=id=>S.parceiros.find(p=>p.id===id)?.nome;

// ---------- tela
async function vNfs(){
  await carregar();
  const ab=S.nfAba||'notas',emps=selEmp(),multi=emps.length>1,ano=String(S.ano),mes=HOJE.slice(0,7);
  const nfsAno=S.nfs.filter(n=>n.data_emissao.startsWith(ano)),aut=nfsAno.filter(n=>n.status==='autorizada');
  const sum=a=>a.reduce((s,x)=>s+(+x||0),0);
  const fatAno=sum(aut.map(n=>n.valor_servicos)),fatMes=sum(aut.filter(n=>n.data_emissao.startsWith(mes)).map(n=>n.valor_servicos));
  const pend=S.cobs.filter(c=>c.status==='pendente'),venc=pend.filter(c=>c.vencimento<HOJE),pagas=S.cobs.filter(c=>c.status==='paga'&&(c.pago_em||'').startsWith(ano));
  const atencao=S.nfs.filter(n=>n.status==='erro'||n.status==='processando').length+S.cobs.filter(c=>c.status==='erro').length;
  const ms=mesesAno(),hi=new Set(ms.map((m,i)=>m===mes?i:-1).filter(i=>i>=0));
  const bars=ms.map(m=>sum(aut.filter(n=>n.data_emissao.startsWith(m)).map(n=>n.valor_servicos)));
  const line=ms.map(m=>sum(pagas.filter(c=>c.pago_em.startsWith(m)).map(c=>c.valor_pago)));
  const ed=emps.some(e=>podeEditar(e.id));
  const tiles=`<section class="grid g-tiles" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
    <div class="tile"><div class="lbl">Notas emitidas em ${ano}</div><div class="val">${k(fatAno)}</div><div class="cmp">${aut.length} autorizada${aut.length===1?'':'s'}<span>· ${k(fatMes)} no mês</span></div></div>
    <div class="tile"><div class="lbl">A receber por cobrança</div><div class="val">${k(sum(pend.map(c=>c.valor)))}</div><div class="cmp">${pend.length} em aberto</div></div>
    <div class="tile"><div class="lbl">Vencidas sem pagamento</div><div class="val">${k(sum(venc.map(c=>c.valor)))}</div><div class="cmp">${venc.length?`<span class="chip bad">${venc.length} cobrança${venc.length>1?'s':''}</span>`:'<span class="chip good">nenhuma</span>'}</div></div>
    <div class="tile"><div class="lbl">Recebido pelo banco em ${ano}</div><div class="val">${k(sum(pagas.map(c=>c.valor_pago)))}</div><div class="cmp">tarifas ${brl2.format(sum(pagas.map(c=>c.taxa)))}</div></div>
    <div class="tile"><div class="lbl">Precisa de atenção</div><div class="val">${atencao}</div><div class="cmp">${atencao?'<span class="chip warn">erro ou processando</span>':'<span class="chip good">tudo em dia</span>'}</div></div></section>`;
  const grafico=`<div class="panel"><div class="ph"><div><h2>Notas emitidas e recebimentos por mês</h2><p class="hint">Barras: valor das notas autorizadas pela data de emissão. Linha: o que entrou no caixa pelas cobranças do banco.</p></div></div>
    ${bars.some(v=>v)||line.some(v=>v)?chartBarsLine({labels:MESES,bars,line,hi,nomeBar:'Notas emitidas',nomeLine:'Recebido pelo banco'}):`<p class="muted" style="margin:0">Nenhuma nota autorizada nem recebimento pelo banco em ${ano}.</p>`}
    <div class="legend"><span><i style="background:var(--accent)"></i>Notas emitidas</span><span><i style="background:var(--ink-2)"></i>Recebido pelo banco</span></div></div>`;
  return `${tiles}${painelInteg(emps)}${grafico}
  <div class="panel"><div class="ph"><div><h2>${ab==='notas'?'Notas fiscais emitidas':'Cobranças (boleto e PIX)'}</h2><p class="hint">${ab==='notas'?'Cada nota entra no faturamento pela data de emissão e calcula os impostos do mês.':'Quando o cliente paga, o banco avisa o sistema, a parcela é quitada e a tarifa é lançada.'}</p></div>
    <div class="ctrls">${ed?(ab==='notas'?`<button class="btn" data-acao="nf-nova">${icone('nfs',15)} Emitir nota</button>`:`<button class="btn" data-acao="nf-cob-nova">${icone('cobranca',15)} Nova cobrança</button>`):''}</div></div>
    <div class="tabs" role="tablist" style="margin:0 0 8px;border:0">${[['notas','Notas emitidas',S.nfs.length],['cobrancas','Cobranças',S.cobs.length]].map(([k_,t,n])=>`<button role="tab" data-nfaba="${k_}" class="${ab===k_?'on':''}" aria-selected="${ab===k_}">${t} <span class="chip mute">${n}</span></button>`).join('')}</div>
    ${ab==='notas'?tabNotas(multi):tabCobs(multi)}</div>`;
}
function painelInteg(emps){
  const e=emps.find(x=>x.id===S.nfEmp)||emps[0];if(!e)return '';S.nfEmp=e.id;
  const nf=integ(e.id,'nf'),bc=integ(e.id,'banco'),ed=podeEditar(e.id);
  const cert=nf.certificado_validade?(nf.certificado_validade<HOJE?'<span class="chip bad">Certificado vencido</span>':`<span class="chip ${nf.certificado_validade<addDias(HOJE,30)?'warn':'good'}">Certificado até ${dataBR(nf.certificado_validade)}</span>`):'<span class="chip mute">Certificado A1 não enviado</span>';
  const banco=S.bancos.find(b=>b.id===bc.config?.conta_bancaria_id);
  return `<div class="panel"><div class="ph"><div><h2>Integrações</h2><p class="hint">Emissor de nota e banco de cobrança de ${esc(nomeEmp(e))}. Sem token, o sistema simula a nota e o pagamento para você testar.</p></div>
    <div class="ctrls">${emps.length>1?`<select id="nfEmpSel" aria-label="Empresa">${emps.map(x=>`<option value="${x.id}" ${x.id===e.id?'selected':''}>${esc(nomeEmp(x))}</option>`).join('')}</select>`:''}${ed?`<button class="btn ghost" data-acao="nf-config" data-emp="${e.id}">${icone('integra',15)} Configurar</button>`:''}</div></div>
    <div class="nf-integ">
      <div class="card"><h3>${icone('nfs',16)} Emissor de nota</h3><div class="linha"><b>${esc(PROV_NF[nf.provedor]||nf.provedor)}</b>${chip(AMB,nf.ambiente)}${nf.tem_token?`<span class="chip mute">token ••••${esc(nf.token_final||'')}</span>`:''}</div>
        <div class="linha">${cert}${nf.config?.codigo_municipio?`<span class="chip mute">IBGE ${esc(nf.config.codigo_municipio)}</span>`:''}</div>
        <small>${nf.provedor==='simulado'?'As notas saem como “simuladas”, sem valor fiscal.':nf.ambiente==='homologacao'?'Notas de teste na prefeitura (sem valor fiscal).':'Notas com valor fiscal.'}</small></div>
      <div class="card"><h3>${icone('cobranca',16)} Banco de cobrança</h3><div class="linha"><b>${esc(PROV_BANCO[bc.provedor]||bc.provedor)}</b>${chip(AMB,bc.ambiente)}${bc.tem_token?`<span class="chip mute">token ••••${esc(bc.token_final||'')}</span>`:''}</div>
        <div class="linha">${banco?`<span class="chip info">Baixa em ${esc(bancoTxt(banco))}</span>`:'<span class="chip mute">Conta da baixa: a da parcela</span>'}<span class="chip mute">Tarifa boleto ${brl2.format(+(bc.config?.tarifa_boleto??1.99))}</span></div>
        <small>${bc.provedor==='simulado'?'Boleto e PIX de teste. “Simular pagamento” mostra a baixa entrando no caixa.':'O banco avisa o pagamento e o sistema quita a parcela sozinho.'}</small></div>
      <div class="card"><h3>${icone('fluxo',16)} Como o dinheiro anda</h3>
        <div class="nf-fluxo"><b>Nota emitida</b><i>→</i><b>Faturamento e impostos</b><i>→</i><b>Boleto/PIX</b><i>→</i><b>Cliente paga</b><i>→</i><b>Parcela quitada + tarifa</b><i>→</i><b>Fluxo de caixa</b></div>
        <small>Cartão na maquininha segue o acordo de taxa e prazo cadastrado em Impostos e maquininha.</small></div>
    </div></div>`;
}
function tabNotas(multi){
  const l=S.nfs;if(!l.length)return '<p class="muted" style="margin:0">Nenhuma nota emitida ainda. Clique em “Emitir nota”.</p>';
  return `<div class="tbl-wrap"><table><thead><tr><th>Emissão</th><th>Nº</th><th>Situação</th><th>Cliente e serviço</th>${multi?'<th>Empresa</th>':''}<th class="n">ISS</th><th class="n">Valor</th><th></th></tr></thead><tbody>
  ${l.map(n=>{const ed=podeEditar(n.empresa_id),cob=S.cobs.filter(c=>c.nf_id===n.id&&c.status!=='cancelada');
    return `<tr><td class="mono">${dataBR(n.data_emissao)}</td><td class="mono">${esc(n.numero||'–')}${n.ambiente!=='producao'?`<span class="unit">${n.ambiente==='simulado'?'simulada':'homologação'}</span>`:''}</td>
    <td>${chip(ST_NF,n.status)}${cob.length?`<span class="unit">${cob.length} cobrança${cob.length>1?'s':''} · ${cob.filter(c=>c.status==='paga').length} paga${cob.filter(c=>c.status==='paga').length===1?'':'s'}</span>`:''}</td>
    <td class="wrap" style="min-width:220px"><b>${esc(n.tomador_nome||nomeParc(n.parceiro_id)||'Consumidor')}</b>${n.tomador_documento?` <span class="muted mono">${docFmt(n.tomador_documento)}</span>`:''}<span class="unit">${esc((n.discriminacao||'').slice(0,140))}</span>
      ${n.mensagem?`<span class="unit" style="color:${n.status==='erro'?'var(--bad)':'var(--ink-3)'}">${esc(n.mensagem)}</span>`:''}</td>
    ${multi?`<td>${esc(nomeEmp(empresa(n.empresa_id)))}</td>`:''}
    <td class="n">${n.valor_iss!=null?brl2.format(n.valor_iss):'–'}${n.iss_retido?'<span class="unit">retido</span>':''}</td><td class="n"><b>${brl2.format(n.valor_servicos)}</b></td>
    <td><div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
      ${n.url_pdf?`<a class="btn ghost" href="${esc(n.url_pdf)}" target="_blank" rel="noopener noreferrer">PDF</a>`:''}
      ${n.status==='autorizada'&&n.ambiente==='simulado'?`<button class="btn ghost" data-acao="nf-ver" data-id="${n.id}">Ver</button>`:''}
      ${ed&&n.status==='processando'?`<button class="btn ghost" data-acao="nf-atualizar" data-id="${n.id}">Atualizar</button>`:''}
      ${ed&&n.status==='erro'?`<button class="btn" data-acao="nf-reemitir" data-id="${n.id}">Emitir de novo</button>`:''}
      ${ed&&n.status==='autorizada'&&!cob.length&&n.lancamento_id?`<button class="btn ghost" data-acao="nf-cobrar" data-id="${n.id}">Gerar cobrança</button>`:''}
      ${ed&&n.status==='autorizada'?`<button class="linkbtn small" data-acao="nf-cancelar" data-id="${n.id}">Cancelar</button>`:''}
      ${n.lancamento_id?`<button class="linkbtn small" data-lanc="${n.lancamento_id}">Lançamento</button>`:''}</div></td></tr>`}).join('')}</tbody></table></div>`;
}
function tabCobs(multi){
  const l=S.cobs;if(!l.length)return '<p class="muted" style="margin:0">Nenhuma cobrança ainda. Elas são geradas ao emitir a nota com boleto ou PIX, ou em “Nova cobrança” para uma conta a receber.</p>';
  return `<div class="tbl-wrap"><table><thead><tr><th>Vencimento</th><th>Situação</th><th>Cliente / nota</th>${multi?'<th>Empresa</th>':''}<th>Boleto / PIX</th><th class="n">Valor</th><th class="n">Tarifa</th><th></th></tr></thead><tbody>
  ${l.map(c=>{const ed=podeEditar(c.empresa_id),nf=S.nfs.find(n=>n.id===c.nf_id),vencida=c.status==='pendente'&&c.vencimento<HOJE;
    return `<tr><td class="mono">${dataBR(c.vencimento)}</td><td>${vencida?'<span class="chip bad">Vencida</span>':chip(ST_COB,c.status)}${c.pago_em?`<span class="unit">pago ${dataBR(c.pago_em)}</span>`:''}${c.ambiente!=='producao'?`<span class="unit">${c.ambiente==='simulado'?'simulada':'sandbox'}</span>`:''}</td>
    <td class="wrap" style="min-width:180px">${esc(nf?.tomador_nome||'')}${nf?`<span class="unit">NF ${esc(nf.numero||'–')} · ${esc(TIPO_COB[c.tipo])}</span>`:`<span class="unit">${esc(TIPO_COB[c.tipo])}</span>`}${c.mensagem?`<span class="unit" style="color:${c.status==='erro'?'var(--bad)':'var(--ink-3)'}">${esc(c.mensagem)}</span>`:''}</td>
    ${multi?`<td>${esc(nomeEmp(empresa(c.empresa_id)))}</td>`:''}
    <td>${c.linha_digitavel?`<button class="linkbtn nf-copia" data-acao="nf-copiar" data-txt="${esc(c.linha_digitavel)}" title="Copiar linha digitável">${esc(linhaFmt(c.linha_digitavel))}</button>`:''}${c.pix_copia_cola?`<div><button class="linkbtn small" data-acao="nf-copiar" data-txt="${esc(c.pix_copia_cola)}">Copiar PIX copia e cola</button></div>`:''}${!c.linha_digitavel&&!c.pix_copia_cola?'<span class="muted">–</span>':''}</td>
    <td class="n"><b>${brl2.format(c.valor)}</b>${c.valor_pago!=null&&+c.valor_pago!==+c.valor?`<span class="unit">pago ${brl2.format(c.valor_pago)}</span>`:''}</td><td class="n">${c.taxa!=null?brl2.format(c.taxa):'–'}</td>
    <td><div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
      ${c.url?`<a class="btn ghost" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Abrir</a>`:''}
      ${ed&&c.status==='pendente'&&c.ambiente!=='producao'?`<button class="btn ghost" data-acao="nf-simular" data-id="${c.id}">Simular pagamento</button>`:''}
      ${ed&&(c.status==='pendente'||c.status==='erro')?`<button class="linkbtn small" data-acao="nf-cob-cancelar" data-id="${c.id}">Cancelar</button>`:''}</div></td></tr>`}).join('')}</tbody></table></div>`;
}

// ---------- emitir nota
function aliqIss(emp){const it=integ(emp,'nf');if(it.config?.aliquota_iss!=null)return +it.config.aliquota_iss;const c=S.impostos.find(x=>x.empresa_id===emp&&x.imposto==='ISS'&&(!x.vigencia_fim||x.vigencia_fim>=HOJE));return c?+c.aliquota:null}
function formNf(empId,pre={}){
  const emps=S.empresas.filter(e=>podeEditar(e.id)&&e.tipo_pessoa!=='pf');
  const emp=emps.find(e=>e.id===empId)||emps.find(e=>selEmp().includes(e))||emps[0];
  if(!emp)return toast('Nenhuma empresa com CNPJ que você possa editar.');
  const f=camposEmpresa(emp.id),it=integ(emp.id,'nf'),cfg=it.config||{};
  const contasRec=S.contas.filter(c=>c.empresa_id===emp.id&&c.analitica&&c.ativa&&c.grupo_dre==='receita_bruta');
  const aliq=pre.aliquota_iss??aliqIss(emp.id),ano=+(pre.data_emissao||HOJE).slice(0,4);
  drawer(`<h3>${icone('nfs')} Emitir nota fiscal</h3>
  <p class="muted" style="margin:0">${it.provedor==='simulado'?'<span class="chip mute">Modo simulado</span> A nota sai numerada e autorizada, sem valor fiscal, para você testar o fluxo inteiro.':`<span class="chip ${AMB[it.ambiente][1]}">${AMB[it.ambiente][0]}</span> Emitida por ${esc(PROV_NF[it.provedor])}.`} O valor entra no faturamento pela data de emissão.</p>
  <form data-form="nf-emitir" class="form-grid">
    <div class="field wide"><label for="nfEmp">Empresa</label><select id="nfEmp" name="empresa">${emps.map(e=>`<option value="${e.id}" ${e.id===emp.id?'selected':''}>${esc(nomeEmp(e))}</option>`).join('')}</select></div>
    <div class="field"><label for="nfMod">Tipo de nota</label><select id="nfMod" name="modelo">${Object.entries(MODELOS).filter(([v])=>v!=='nfe').map(([v,n])=>`<option value="${v}" ${v===(pre.modelo||cfg.modelo||'nfse')?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label for="nfEmi">Data de emissão</label><input id="nfEmi" name="emissao" type="date" required value="${pre.data_emissao||HOJE}"></div>
    <div class="nf-sec">Cliente (tomador)</div>
    <div class="field wide"><label for="nfCli">Nome ou razão social</label><input id="nfCli" name="parceiro" list="dlParcNf" autocomplete="off" required value="${esc(pre.tomador_nome||'')}"></div>
    <div class="field"><label for="nfDoc">CPF ou CNPJ</label><input id="nfDoc" name="doc" inputmode="numeric" value="${esc(docFmt(pre.tomador_documento||''))}" placeholder="00.000.000/0000-00"></div>
    <div class="field"><label for="nfMail">E-mail (recebe a nota e o boleto)</label><input id="nfMail" name="email" type="email" value="${esc(pre.tomador_email||'')}"></div>
    <div class="nf-sec">Serviço</div>
    <div class="field wide"><label for="nfDisc">Descrição do serviço</label><textarea id="nfDisc" name="discriminacao" rows="3" required maxlength="2000">${esc(pre.discriminacao||'')}</textarea></div>
    <div class="field"><label for="nfServ">Item da lista de serviços (LC 116)</label><input id="nfServ" name="servico" value="${esc(pre.codigo_servico||cfg.item_lista_servico||'')}" placeholder="ex.: 17.01"></div>
    <div class="field"><label for="nfVal">Valor do serviço (R$)</label><input id="nfVal" name="valor" required inputmode="decimal" placeholder="1.000,00" value="${pre.valor_servicos?String(pre.valor_servicos).replace('.',','):''}"></div>
    <div class="field"><label for="nfIss">Alíquota do ISS (%)</label><input id="nfIss" name="iss" inputmode="decimal" value="${aliq!=null?String(aliq).replace('.',','):''}"></div>
    <label class="wide" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="retido" ${pre.iss_retido?'checked':''}> ISS retido pelo cliente (ele recolhe o ISS e paga o valor líquido)</label>
    <div class="nf-sec">Faturamento e recebimento</div>
    <div class="field wide"><label for="nfConta">Conta de receita</label><select id="nfConta" name="conta" required>${contasRec.map(c=>`<option value="${c.id}">${esc(c.codigo)} ${esc(c.nome)}</option>`).join('')}</select></div>
    <div class="field"><label for="nfPred">Unidade</label><select id="nfPred" name="predio">${f.pred}</select></div>
    <div class="field"><label for="nfCC">Centro de custo</label><select id="nfCC" name="centro">${f.cc}</select></div>
    <div class="field"><label for="nfForma">Como o cliente paga</label><select id="nfForma" name="forma">${Object.entries(FORMAS_NF).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></div>
    <div class="field"><label for="nfParc">Parcelas</label><input id="nfParc" name="parcelas" type="number" min="1" max="24" value="1"></div>
    <div class="field"><label for="nfAc">Acordo da maquininha</label><select id="nfAc" name="acordo"></select></div>
    <div class="field"><label for="nfVenc">1º vencimento</label><input id="nfVenc" name="vencimento" type="date" value="${addDias(HOJE,7)}"></div>
    <div class="field wide"><label for="nfBanco">Conta bancária que recebe</label><select id="nfBanco" name="banco">${f.bancos}</select></div>
    <div class="wide" id="nfPrev" aria-live="polite"></div>
    <datalist id="dlParcNf">${S.parceiros.filter(p=>p.empresa_id===emp.id).map(p=>`<option value="${esc(p.nome)}">`).join('')}</datalist>
    <div class="wide" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn">Emitir nota${it.provedor==='simulado'?' (simulada)':''}</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`);
  const fm=document.querySelector('form[data-form="nf-emitir"]');fm.dataset.ano=ano;
  const bc=integ(emp.id,'banco').config?.conta_bancaria_id;if(bc&&fm.banco.querySelector(`option[value="${bc}"]`))fm.banco.value=bc;
  if(pre.forma)fm.forma.value=pre.forma;
  prevNf(fm);
}
// cálculo: banco = parcelas mensais; maquininha = mesma regra do faturamento (acordo, taxa e prazo)
function calcNf(f){
  const emp=f.empresa.value,forma=f.forma.value,n=Math.max(1,Math.min(24,+f.parcelas.value||1)),data=f.emissao.value||HOJE,bruto=r2(parseValor(f.valor.value)||0);
  const iss=parseValor(f.iss.value),aliq=isNaN(iss)?null:iss,valIss=aliq!=null?r2(bruto*aliq/100):0;
  const rf=REFORMA[+data.slice(0,4)],cbs=rf?r2(bruto*rf[0]/100):null,ibs=rf?r2(bruto*rf[1]/100):null;
  const retido=f.retido.checked?valIss:0;
  if(PELO_BANCO.has(forma)){const liq=r2(bruto-retido),pb=r2(liq/n),v1=f.vencimento.value||addDias(data,7);
    const receb=Array.from({length:n},(_,i)=>{const d=new Date(v1+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+i);return {venc:d.toISOString().slice(0,10),valor:i<n-1?pb:r2(liq-pb*(n-1))}});
    const tar=+(integ(emp,'banco').config?.[forma==='pix_banco'?'tarifa_pix':'tarifa_boleto']??1.99)||0;
    return {emp,forma,n,data,bruto,aliq,valIss,retido,cbs,ibs,ac:null,taxa:0,tarifa:r2(tar*n),liq,receb,banco:true}}
  const shim={empresa:{value:emp},forma:{value:forma},parcelas:{value:n},emissao:{value:data},valor:{value:String(bruto-retido)},acordo:{value:f.acordo.value},vencimento:{value:f.vencimento.value||data}};
  const c=calcFat(shim);return {...c,bruto,aliq,valIss,retido,cbs,ibs,tarifa:0,banco:false};
}
function prevNf(f){
  const forma=f.forma.value,emp=f.empresa.value,n=Math.max(1,+f.parcelas.value||1),data=f.emissao.value||HOJE;
  const ops=CARTAO.has(forma)?acordosPara(emp,forma,n,data):[];const atual=f.acordo.value;
  f.acordo.innerHTML=ops.length?ops.map(a=>`<option value="${a.id}" ${a.id===atual?'selected':''}>${esc(a.prestador)} · ${String(a.taxa_percentual).replace('.',',')}% · D+${a.prazo_dias}</option>`).join(''):`<option value="">${CARTAO.has(forma)?'Nenhum acordo cadastrado para esta forma':'Não se aplica'}</option>`;
  f.acordo.disabled=!ops.length;f.acordo.closest('.field').hidden=!CARTAO.has(forma);
  f.parcelas.closest('.field').hidden=!(PELO_BANCO.has(forma)||forma==='credito_parcelado');
  f.vencimento.closest('.field').hidden=CARTAO.has(forma)&&!!ops.length;
  const c=calcNf(f),o=document.getElementById('nfPrev');if(!o)return;
  if(!c.bruto){o.innerHTML='<p class="muted" style="margin:0">Informe o valor para ver ISS, taxas, líquido e as datas de recebimento.</p>';return}
  o.innerHTML=`<div class="kv"><div><small>Valor da nota</small><span>${brl2.format(c.bruto)}</span></div><div><small>ISS${c.aliq!=null?' '+String(c.aliq).replace('.',',')+'%':''}${c.retido?' (retido)':''}</small><span>${brl2.format(c.valIss)}</span></div>
    <div><small>${c.banco?'Tarifa do banco (estimada)':'Taxa da maquininha'}</small><span>${brl2.format(c.banco?c.tarifa:c.taxa)}</span></div><div><small>Você recebe</small><span>${brl2.format(r2(c.liq-(c.banco?c.tarifa:0)))}</span></div></div>
    ${c.cbs!=null?`<div class="effect" style="margin-top:8px">Reforma tributária: em ${c.data.slice(0,4)} a nota destaca <b>CBS ${brl2.format(c.cbs)}</b> e <b>IBS ${brl2.format(c.ibs)}</b> só como informação. Não é cobrado este ano.</div>`:''}
    <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Recebimento</th><th>Como</th><th class="n">Valor</th></tr></thead><tbody>${c.receb.map((r,i)=>`<tr><td class="mono">${dataBR(r.venc)}</td><td>${esc(FORMAS_NF[c.forma])}${c.receb.length>1?` · ${i+1}/${c.receb.length}`:''}</td><td class="n">${brl2.format(r.valor)}</td></tr>`).join('')}</tbody></table></div>`;
}
async function parceiroDe(emp,nome,doc,email){
  doc=soDig(doc);let p=(doc&&S.parceiros.find(x=>x.empresa_id===emp&&soDig(x.documento)===doc))||S.parceiros.find(x=>x.empresa_id===emp&&norm(x.nome)===norm(nome));
  if(!p){const {data,error}=await sb.from('parceiros').insert({empresa_id:emp,nome,documento:doc||null,email:email||null,cliente:true}).select('id,empresa_id,documento,nome').single();if(error)throw error;S.parceiros.push(data);return data}
  const up={};if(doc&&!p.documento)up.documento=doc;if(email)up.email=email;
  if(Object.keys(up).length){const {error}=await sb.from('parceiros').update(up).eq('id',p.id);if(!error)Object.assign(p,up)}
  return p;
}
async function emitir(f){
  const c=calcNf(f),forma=c.forma;if(!c.bruto||c.bruto<0)return toast('Informe o valor do serviço.');
  const doc=soDig(f.doc.value);if(doc&&doc.length!==11&&doc.length!==14)return toast('O CPF precisa de 11 dígitos e o CNPJ de 14.');
  if(CARTAO.has(forma)&&forma!=='pix'&&!c.ac)return toast('Cadastre o acordo da maquininha para '+FORMAS_NF[forma]+' em Impostos e maquininha.');
  if(PELO_BANCO.has(forma)&&integ(c.emp,'banco').provedor!=='simulado'&&!doc)return toast('Para gerar boleto ou PIX no banco, informe o CPF ou CNPJ do cliente.');
  const nome=f.parceiro.value.trim(),email=f.email.value.trim();
  const p=await parceiroDe(c.emp,nome,doc,email);
  // 1) faturamento (entra na DRE e nos impostos pela data de emissão)
  const id=uuid(),fr=forma==='boleto_pix'||forma==='boleto'?'boleto':forma==='pix_banco'?'pix':forma;
  const {error}=await sb.from('lancamentos').insert({id,empresa_id:c.emp,predio_id:f.predio.value||null,conta_id:f.conta.value,centro_custo_id:f.centro.value||null,parceiro_id:p.id,competencia:c.data,
    descricao:'Nota fiscal · '+f.discriminacao.value.trim().slice(0,80),valor:c.bruto,origem:'faturamento',forma_recebimento:fr==='pix'&&forma==='pix_banco'?'transferencia':fr,parcelas_receb:c.receb.length,acordo_id:c.ac?.id||null});
  if(error)throw error;
  if(c.taxa){const ct=(c.ac.conta_id&&conta(c.ac.conta_id))||contaCod(c.emp,'6.01.004');
    if(ct){const {error:e2}=await sb.from('lancamentos').insert({empresa_id:c.emp,predio_id:f.predio.value||null,conta_id:ct.id,centro_custo_id:f.centro.value||null,competencia:c.data,descricao:`Taxa ${c.ac.prestador} · nota fiscal`,valor:-c.taxa,origem:'taxa_cartao',vinculo_id:id,acordo_id:c.ac.id});if(e2)throw e2}}
  const {data:ps,error:e3}=await sb.from('parcelas').insert(c.receb.map((r,i)=>({empresa_id:c.emp,lancamento_id:id,numero:i+1,vencimento:r.venc,valor:r.valor,status:'aberta',forma_pagamento:FORMAS_NF[forma],conta_bancaria_id:f.banco.value||null,centro_custo_id:f.centro.value||null}))).select('id');
  if(e3)throw e3;
  // 2) nota no emissor
  let nf;
  try{nf=await api({acao:'nf_emitir',empresa_id:c.emp,lancamento_id:id,dados:{modelo:f.modelo.value,data_emissao:c.data,valor:c.bruto,discriminacao:f.discriminacao.value.trim(),codigo_servico:f.servico.value.trim(),
    aliquota_iss:c.aliq,iss_retido:f.retido.checked,valor_cbs:c.cbs,valor_ibs:c.ibs,tomador:{nome,documento:doc,email}}})}
  catch(e){invalidar();await carregarAnos();fecharDrawer();S.nfAba='notas';render();return toast('O faturamento foi registrado, mas a nota não saiu: '+e.message)}
  // 3) cobrança no banco
  let cobs=[];
  if(PELO_BANCO.has(forma)&&nf.status!=='erro'){try{cobs=await api({acao:'cobranca_criar',empresa_id:c.emp,parcela_ids:(ps||[]).map(x=>x.id),tipo:forma==='pix_banco'?'pix':forma,nf_id:nf.id})}catch(e){toast('Nota emitida, mas a cobrança não foi gerada: '+e.message)}}
  invalidar();await carregarAnos();fecharDrawer();S.nfAba='notas';
  const okC=cobs.filter(x=>x.status==='pendente').length;
  toast(nf.status==='autorizada'?`Nota ${nf.numero} autorizada${okC?` e ${okC} cobrança${okC>1?'s':''} gerada${okC>1?'s':''}`:''}.`:nf.status==='erro'?'O emissor recusou a nota: '+(nf.mensagem||''):'Nota enviada. O emissor está processando; atualize em instantes.');
  render();
}
function verNf(n){
  const e=empresa(n.empresa_id);
  drawer(`<h3>${icone('nfs')} NFS-e ${esc(n.numero)} <span class="chip mute">simulada</span></h3>
  <div class="effect" style="border-left-color:var(--warn);background:var(--warn-soft)">Documento de teste, sem valor fiscal. Com o emissor configurado, aqui aparece o PDF oficial da prefeitura.</div>
  <div class="kv"><div><small>Prestador</small><span>${esc(e?.razao_social||nomeEmp(e))}</span></div><div><small>CNPJ</small><span class="mono">${docFmt(e?.cnpj||'')}</span></div><div><small>Emissão</small><span>${dataBR(n.data_emissao)}</span></div><div><small>Código de verificação</small><span class="mono">${esc(n.codigo_verificacao||'')}</span></div></div>
  <div class="kv"><div><small>Tomador</small><span>${esc(n.tomador_nome||'')}</span></div><div><small>CPF/CNPJ</small><span class="mono">${docFmt(n.tomador_documento||'')||'–'}</span></div><div><small>E-mail</small><span>${esc(n.tomador_email||'–')}</span></div></div>
  <p style="white-space:pre-wrap;margin:0">${esc(n.discriminacao||'')}</p>
  <div class="kv"><div><small>Item LC 116</small><span>${esc(n.codigo_servico||'–')}</span></div><div><small>Valor</small><span>${brl2.format(n.valor_servicos)}</span></div><div><small>ISS ${n.aliquota_iss!=null?String(+n.aliquota_iss).replace('.',',')+'%':''}</small><span>${n.valor_iss!=null?brl2.format(n.valor_iss):'–'}${n.iss_retido?' (retido)':''}</span></div>
    ${n.valor_cbs!=null?`<div><small>CBS / IBS (informativo)</small><span>${brl2.format(n.valor_cbs)} / ${brl2.format(n.valor_ibs||0)}</span></div>`:''}</div>
  <div style="display:flex;gap:8px"><button class="btn ghost" data-acao="fechar">Fechar</button></div>`);
}

// ---------- configurar integrações
function formConfig(empId){
  const e=empresa(empId);if(!e)return;const nf=integ(e.id,'nf'),bc=integ(e.id,'banco'),cn=nf.config||{},cb=bc.config||{};
  const hook=`${SUPABASE_URL}/functions/v1/integracoes-webhook?p=asaas&e=${e.id}`;
  const opt=(m,v)=>Object.entries(m).map(([k_,n])=>`<option value="${k_}" ${k_===v?'selected':''}>${n}</option>`).join('');
  drawer(`<h3>${icone('integra')} Integrações · ${esc(nomeEmp(e))}</h3>
  <p class="muted" style="margin:0">O token fica guardado no servidor e nunca volta para a tela; aparecem só os 4 últimos caracteres. Para trocar, digite um novo.</p>
  <form data-form="nf-integ" data-emp="${e.id}" data-servico="nf" class="form-grid">
    <div class="nf-sec">${icone('nfs',14)} Emissor de nota</div>
    <div class="field"><label for="iNfP">Emissor</label><select id="iNfP" name="provedor">${opt(PROV_NF,nf.provedor)}</select></div>
    <div class="field"><label for="iNfA">Ambiente</label><select id="iNfA" name="ambiente">${opt({homologacao:'Homologação (teste)',producao:'Produção'},nf.ambiente==='producao'?'producao':'homologacao')}</select></div>
    <div class="field wide"><label for="iNfT">Token da API</label><input id="iNfT" name="token" type="password" autocomplete="off" placeholder="${nf.tem_token?'•••• '+esc(nf.token_final||'')+' (já salvo)':'Cole o token do painel do emissor'}"></div>
    <div class="field"><label for="iNfM">Tipo de nota padrão</label><select id="iNfM" name="modelo">${opt({nfse:MODELOS.nfse,nfse_nacional:MODELOS.nfse_nacional},cn.modelo||'nfse')}</select></div>
    <div class="field"><label for="iNfI">Código IBGE do município</label><input id="iNfI" name="codigo_municipio" inputmode="numeric" maxlength="7" value="${esc(cn.codigo_municipio||'')}" placeholder="ex.: 3548500"></div>
    <div class="field"><label for="iNfIm">Inscrição municipal</label><input id="iNfIm" name="inscricao_municipal" value="${esc(cn.inscricao_municipal||e.inscricao_municipal||'')}"></div>
    <div class="field"><label for="iNfS">Item LC 116 padrão</label><input id="iNfS" name="item_lista_servico" value="${esc(cn.item_lista_servico||'')}" placeholder="ex.: 17.01"></div>
    <div class="field"><label for="iNfCt">Código tributário do município</label><input id="iNfCt" name="codigo_tributario_municipio" value="${esc(cn.codigo_tributario_municipio||'')}"></div>
    <div class="field"><label for="iNfAl">Alíquota do ISS padrão (%)</label><input id="iNfAl" name="aliquota_iss" inputmode="decimal" value="${cn.aliquota_iss!=null?String(cn.aliquota_iss).replace('.',','):''}"></div>
    <div class="wide" style="display:flex;gap:8px"><button class="btn">Salvar emissor</button></div></form>
  <form data-form="nf-cert" data-emp="${e.id}" class="form-grid">
    <div class="nf-sec">Certificado digital A1</div>
    <p class="wide muted" style="margin:0">${nf.certificado_validade?`Enviado em ${dataBR((nf.certificado_enviado_em||'').slice(0,10))}, válido até <b>${dataBR(nf.certificado_validade)}</b>.`:'O arquivo .pfx e a senha vão direto para o emissor e não ficam guardados neste sistema.'}${nf.provedor!=='focusnfe'?' Salve o emissor Focus NFe com o token antes de enviar.':''}</p>
    <div class="field"><label for="iCert">Arquivo (.pfx ou .p12)</label><input id="iCert" name="arquivo" type="file" accept=".pfx,.p12" ${nf.provedor!=='focusnfe'?'disabled':''}></div>
    <div class="field"><label for="iCertS">Senha do certificado</label><input id="iCertS" name="senha" type="password" autocomplete="off" ${nf.provedor!=='focusnfe'?'disabled':''}></div>
    <div class="wide"><button class="btn ghost" ${nf.provedor!=='focusnfe'?'disabled':''}>Enviar certificado ao emissor</button></div></form>
  <form data-form="nf-integ" data-emp="${e.id}" data-servico="banco" class="form-grid">
    <div class="nf-sec">${icone('cobranca',14)} Banco de cobrança (boleto e PIX)</div>
    <div class="field"><label for="iBcP">Banco</label><select id="iBcP" name="provedor">${opt(PROV_BANCO,bc.provedor)}</select></div>
    <div class="field"><label for="iBcA">Ambiente</label><select id="iBcA" name="ambiente">${opt({homologacao:'Sandbox (teste)',producao:'Produção'},bc.ambiente==='producao'?'producao':'homologacao')}</select></div>
    <div class="field wide"><label for="iBcT">Chave da API</label><input id="iBcT" name="token" type="password" autocomplete="off" placeholder="${bc.tem_token?'•••• '+esc(bc.token_final||'')+' (já salva)':'Cole a chave ($aact_…) do painel do banco'}"></div>
    <div class="field wide"><label for="iBcB">Conta onde o dinheiro cai (para a baixa)</label><select id="iBcB" name="conta_bancaria_id"><option value="">A conta informada em cada parcela</option>${S.bancos.filter(b=>b.empresa_id===e.id).map(b=>`<option value="${b.id}" ${b.id===cb.conta_bancaria_id?'selected':''}>${esc(bancoTxt(b))}</option>`).join('')}</select></div>
    <div class="field"><label for="iBcTb">Tarifa por boleto pago (R$)</label><input id="iBcTb" name="tarifa_boleto" inputmode="decimal" value="${String(cb.tarifa_boleto??1.99).replace('.',',')}"></div>
    <div class="field"><label for="iBcTp">Tarifa por PIX recebido (R$)</label><input id="iBcTp" name="tarifa_pix" inputmode="decimal" value="${String(cb.tarifa_pix??1.99).replace('.',',')}"></div>
    ${bc.provedor==='asaas'?`<div class="field wide"><label for="iHook">Endereço do aviso de pagamento (já cadastrado no banco ao salvar)</label><input id="iHook" readonly value="${esc(hook)}"></div>`:''}
    <div class="wide" style="display:flex;gap:8px"><button class="btn">Salvar banco</button><button type="button" class="btn ghost" data-acao="fechar">Fechar</button></div></form>`);
}

// ---------- cobrança de contas a receber já lançadas
async function formCobNova(empId){
  const emps=selEmp().filter(e=>podeEditar(e.id));const emp=emps.find(e=>e.id===empId)||emps[0];if(!emp)return;
  const {data,error}=await sb.from('parcelas').select('id,vencimento,valor,numero,lancamento_id,lancamentos(descricao,parceiro_id,numero_nf)').eq('empresa_id',emp.id).eq('status','aberta').gt('valor',0).order('vencimento').limit(300);
  if(error)throw error;const ja=new Set(S.cobs.filter(c=>c.status==='pendente'||c.status==='paga').map(c=>c.parcela_id));
  const l=(data||[]).filter(p=>!ja.has(p.id));
  drawer(`<h3>${icone('cobranca')} Nova cobrança</h3><p class="muted" style="margin:0">Escolha as contas a receber em aberto. Cada uma vira um boleto/PIX ${integ(emp.id,'banco').provedor==='simulado'?'<b>simulado</b>':'no '+esc(PROV_BANCO[integ(emp.id,'banco').provedor])}.</p>
  <form data-form="nf-cob" data-emp="${emp.id}" class="form-grid">
    ${emps.length>1?`<div class="field wide"><label for="cbEmp">Empresa</label><select id="cbEmp" name="empresa">${emps.map(e=>`<option value="${e.id}" ${e.id===emp.id?'selected':''}>${esc(nomeEmp(e))}</option>`).join('')}</select></div>`:''}
    <div class="field"><label for="cbTipo">Forma</label><select id="cbTipo" name="tipo">${Object.entries(TIPO_COB).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></div>
    <div class="wide">${l.length?`<div class="tbl-wrap" style="max-height:340px;overflow:auto"><table><thead><tr><th></th><th>Vencimento</th><th>Cliente / descrição</th><th class="n">Valor</th></tr></thead><tbody>
      ${l.map(p=>`<tr><td><input type="checkbox" name="parc" value="${p.id}" aria-label="Cobrar"></td><td class="mono">${dataBR(p.vencimento)}</td><td class="wrap">${esc(nomeParc(p.lancamentos?.parceiro_id)||'Sem cliente')}<span class="unit">${esc(p.lancamentos?.descricao||'')}</span></td><td class="n">${brl2.format(p.valor)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Nenhuma conta a receber em aberto sem cobrança.</p>'}</div>
    <div class="wide" style="display:flex;gap:8px"><button class="btn" ${l.length?'':'disabled'}>Gerar cobrança</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`);
}

// ---------- formulários
const lerArquivo=f=>new Promise((ok,er)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=er;r.readAsDataURL(f)});
Object.assign(FORMS,{
  'nf-emitir':emitir,
  async 'nf-integ'(f){const emp=f.dataset.emp,servico=f.dataset.servico;const cfg={};
    ['modelo','codigo_municipio','inscricao_municipal','item_lista_servico','codigo_tributario_municipio','conta_bancaria_id'].forEach(n=>{if(f[n])cfg[n]=f[n].value.trim()});
    ['aliquota_iss','tarifa_boleto','tarifa_pix'].forEach(n=>{if(f[n]){const v=parseValor(f[n].value);cfg[n]=isNaN(v)?null:v}});
    if(cfg.codigo_municipio&&!/^\d{7}$/.test(cfg.codigo_municipio))return toast('O código IBGE do município tem 7 números.');
    const r=await api({acao:'salvar',empresa_id:emp,servico,provedor:f.provedor.value,ambiente:f.ambiente.value,token:f.token.value.trim(),config:cfg});
    if(S.integ)delete S.integ[emp];await carregar();toast((servico==='nf'?'Emissor':'Banco')+' salvo.'+(r.avisos?.length?' '+r.avisos.join(' '):''));formConfig(emp);render(true)},
  async 'nf-cert'(f){const a=f.arquivo.files[0];if(!a)return toast('Escolha o arquivo do certificado.');if(a.size>300000)return toast('Arquivo grande demais para um certificado A1.');
    const r=await api({acao:'certificado',empresa_id:f.dataset.emp,arquivo_base64:await lerArquivo(a),senha:f.senha.value});f.senha.value='';
    if(S.integ)delete S.integ[f.dataset.emp];await carregar();toast(r.validade?'Certificado enviado. Válido até '+dataBR(r.validade)+'.':'Certificado enviado ao emissor.');formConfig(f.dataset.emp);render(true)},
  async 'nf-cob'(f){const ids=[...f.querySelectorAll('input[name=parc]:checked')].map(i=>i.value);if(!ids.length)return toast('Marque ao menos uma conta a receber.');
    const r=await api({acao:'cobranca_criar',empresa_id:f.empresa?.value||f.dataset.emp,parcela_ids:ids,tipo:f.tipo.value});
    fecharDrawer();S.nfAba='cobrancas';const ok=r.filter(x=>x.status==='pendente').length,er=r.filter(x=>x.status==='erro');
    toast(`${ok} cobrança${ok===1?'':'s'} gerada${ok===1?'':'s'}.`+(er.length?' Com erro: '+er[0].mensagem:''));render()},
  async 'nf-cancelar'(f){const r=await api({acao:'nf_cancelar',empresa_id:f.dataset.emp,nf_id:f.dataset.id,justificativa:f.just.value});
    fecharDrawer();toast(r.status==='cancelada'?'Nota cancelada. Se o serviço não vai ser cobrado, exclua ou ajuste o lançamento do faturamento.':'Pedido de cancelamento enviado.');render()},
});

// ---------- cliques e mudanças
const nfDe=id=>S.nfs.find(n=>n.id===id),cobDe=id=>S.cobs.find(c=>c.id===id);
document.addEventListener('click',async ev=>{
  const t=ev.target.closest('[data-nfaba]');if(t){S.nfAba=t.dataset.nfaba;render(true);return}
  const b=ev.target.closest('[data-acao^="nf-"]');if(!b)return;const a=b.dataset.acao;
  try{
    if(a==='nf-nova')formNf(S.nfEmp);
    else if(a==='nf-config')formConfig(b.dataset.emp);
    else if(a==='nf-ver')verNf(nfDe(b.dataset.id));
    else if(a==='nf-cob-nova')await formCobNova(S.nfEmp);
    else if(a==='nf-copiar'){const x=b.dataset.txt;try{await navigator.clipboard.writeText(x);toast('Copiado.')}catch(e){toast(x)}}
    else if(a==='nf-atualizar'){b.disabled=true;const n=nfDe(b.dataset.id);await api({acao:'nf_consultar',empresa_id:n.empresa_id,nf_id:n.id});toast('Situação atualizada.');render(true)}
    else if(a==='nf-reemitir'){const n=nfDe(b.dataset.id);formNf(n.empresa_id,n);toast('Confira os dados e emita de novo. O faturamento anterior continua lançado; exclua-o se não for usar.')}
    else if(a==='nf-cobrar'){b.disabled=true;const n=nfDe(b.dataset.id);
      const {data,error}=await sb.from('parcelas').select('id').eq('lancamento_id',n.lancamento_id).eq('status','aberta').gt('valor',0);if(error)throw error;
      if(!data?.length){toast('Esta nota não tem parcelas a receber em aberto.');b.disabled=false;return}
      const r=await api({acao:'cobranca_criar',empresa_id:n.empresa_id,parcela_ids:data.map(x=>x.id),tipo:'boleto_pix',nf_id:n.id});S.nfAba='cobrancas';toast(`${r.filter(x=>x.status==='pendente').length} cobrança(s) gerada(s).`);render(true)}
    else if(a==='nf-cancelar'){const n=nfDe(b.dataset.id);
      drawer(`<h3>Cancelar nota ${esc(n.numero||'')}</h3><p class="muted" style="margin:0">O cancelamento vai para a prefeitura e não pode ser desfeito. Cobranças em aberto desta nota continuam valendo até você cancelá-las.</p>
      <form data-form="nf-cancelar" data-emp="${n.empresa_id}" data-id="${n.id}" class="form-grid"><div class="field wide"><label for="nfJust">Motivo (mínimo 15 letras)</label><textarea id="nfJust" name="just" rows="2" minlength="15" required></textarea></div>
      <div class="wide" style="display:flex;gap:8px"><button class="btn">Cancelar a nota</button><button type="button" class="btn ghost" data-acao="fechar">Voltar</button></div></form>`)}
    else if(a==='nf-simular'){b.disabled=true;const c=cobDe(b.dataset.id);const r=await api({acao:'cobranca_simular',empresa_id:c.empresa_id,cobranca_id:c.id});
      invalidar();toast(r.aguardando_webhook?'Pagamento confirmado no sandbox. A baixa chega pelo aviso do banco em alguns segundos.':`Pagamento simulado: parcela quitada${r.taxa?' e tarifa de '+brl2.format(r.taxa)+' lançada':''}. Veja no fluxo de caixa.`);render(true)}
    else if(a==='nf-cob-cancelar'){const c=cobDe(b.dataset.id);if(!confirm('Cancelar esta cobrança no banco?'))return;b.disabled=true;await api({acao:'cobranca_cancelar',empresa_id:c.empresa_id,cobranca_id:c.id});toast('Cobrança cancelada.');render(true)}
  }catch(e){console.error(e);toast(traduz(e));b.disabled=false}
});
document.addEventListener('change',ev=>{const t=ev.target;
  if(t.id==='nfEmpSel'){S.nfEmp=t.value;render(true);return}
  if(t.id==='nfEmp'){formNf(t.value);return}
  if(t.id==='cbEmp'){formCobNova(t.value).catch(e=>toast(traduz(e)));return}
  if(t.form?.dataset.form==='nf-emitir')prevNf(t.form)});
document.addEventListener('input',ev=>{const t=ev.target;if(t.form?.dataset.form==='nf-emitir'&&['valor','iss','parcelas'].includes(t.name))prevNf(t.form);
  if(t.id==='nfCli'){const p=S.parceiros.find(x=>x.empresa_id===t.form.empresa.value&&norm(x.nome)===norm(t.value));if(p){if(p.documento&&!t.form.doc.value)t.form.doc.value=docFmt(p.documento);if(p.email&&!t.form.email.value)t.form.email.value=p.email}}});

// ---------- registra a tela
delete EM_BREVE.nfs;
VIEWS.nfs=vNfs;TITULOS.nfs='Notas fiscais e cobrança';
USA_EMP.add('nfs');USA_ANO.add('nfs');
ROTAS.forEach(r=>{if(r[0]==='nfs'){r[1]='Notas fiscais e cobrança';r[2]=0}});
})();
