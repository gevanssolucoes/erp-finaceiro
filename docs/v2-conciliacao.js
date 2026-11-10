// ===================== Versão 2 · Painel de conciliação e conciliação em lote
// No topo de "Extratos e conciliação": cada conta bancária com o saldo do banco (último extrato),
// o saldo do sistema na mesma data, a diferença, o % conciliado e há quantos dias não chega extrato.
// Dentro de um extrato aberto: um botão aceita de uma vez todas as baixas e vínculos que o sistema encontrou.
(()=>{
if(typeof S==='undefined'||typeof VIEWS==='undefined'||!VIEWS.auditoria)return;

const css=document.createElement('style');css.textContent=`
.cc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.cc{border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;background:var(--surface);min-width:0;border-left:4px solid var(--good)}
.cc.warn{border-left-color:var(--warn)}.cc.bad{border-left-color:var(--bad)}.cc.mute{border-left-color:var(--line)}
.cc-h{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.cc-h b{font-size:14px}.cc-h small{display:block;color:var(--ink-2);font-size:12px}
.cc-nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.cc-nums div{display:flex;flex-direction:column;min-width:0}.cc-nums span{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-2);font-weight:600}
.cc-nums b{font-family:var(--f-num);font-weight:500;font-size:13px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.cc-bar{height:6px;border-radius:4px;background:var(--surface-2);overflow:hidden}.cc-bar span{display:block;height:100%;background:var(--accent)}
.cc-pe{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;color:var(--ink-2);flex-wrap:wrap}
.lote-conc{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border:1px dashed var(--accent);background:var(--accent-soft);border-radius:10px;padding:10px 14px}
.lote-conc span{color:var(--accent-ink);font-size:13px}
`;document.head.appendChild(css);

const r2_=v=>Math.round(v*100)/100;
const diasEntre=(a,b)=>Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/864e5);

async function painel(empId){
  const bs=S.bancos.filter(b=>b.empresa_id===empId&&b.ativa!==false);if(!bs.length)return '';
  const ids=bs.map(b=>b.id);
  const [exts,pagas]=await Promise.all([
    sb.from('extratos').select('id,conta_bancaria_id,periodo_inicio,periodo_fim,saldo_final,situacao,enviado_em').eq('empresa_id',empId).order('periodo_fim',{ascending:false}).limit(200).then(r=>r.data||[]),
    todos(()=>sb.from('parcelas').select('conta_bancaria_id,valor,valor_pago,data_pagamento').eq('empresa_id',empId).eq('status','paga').in('conta_bancaria_id',ids))]);
  let lin=[];const exIds=exts.map(x=>x.id);
  for(let i=0;i<exIds.length;i+=100){const {data}=await sb.from('extrato_linhas').select('extrato_id,status').in('extrato_id',exIds.slice(i,i+100));lin=lin.concat(data||[])}
  const porExt={};lin.forEach(l=>{const r=porExt[l.extrato_id]||(porExt[l.extrato_id]={n:0,ok:0,pend:0});r.n++;if(['conciliado','lancado_na_auditoria','ignorado'].includes(l.status))r.ok++;else r.pend++});
  const cards=bs.map(b=>{
    const ex=exts.filter(x=>x.conta_bancaria_id===b.id);const ult=ex[0];
    const tot=ex.reduce((a,x)=>{const r=porExt[x.id]||{n:0,ok:0,pend:0};a.n+=r.n;a.ok+=r.ok;a.pend+=r.pend;return a},{n:0,ok:0,pend:0});
    const pc=tot.n?Math.round(tot.ok/tot.n*100):null;
    const ate=ult?.periodo_fim||HOJE;
    const sis=r2_(+b.saldo_inicial+pagas.filter(p=>p.conta_bancaria_id===b.id&&p.data_pagamento&&p.data_pagamento<=ate&&(!b.data_saldo_inicial||p.data_pagamento>=b.data_saldo_inicial)).reduce((s,p)=>s+ +(p.valor_pago??p.valor),0));
    const temSaldo=ult&&ult.saldo_final!=null;const dif=temSaldo?r2_(+ult.saldo_final-sis):null;
    const atraso=ult?diasEntre(ult.periodo_fim,HOJE):null;
    const cls=!ult?'mute':(dif&&Math.abs(dif)>=0.01)||tot.pend?'bad':atraso>7?'warn':'good';
    const sit=!ult?'<span class="chip mute">sem extrato</span>':tot.pend?`<span class="chip bad">${tot.pend} pendente${tot.pend>1?'s':''}</span>`:dif&&Math.abs(dif)>=0.01?'<span class="chip bad">saldo não bate</span>':atraso>7?`<span class="chip warn">extrato de ${atraso} dias atrás</span>`:'<span class="chip good">em dia</span>';
    return `<div class="cc ${cls}"><div class="cc-h"><div><b>${esc(b.banco_nome)}</b><small>ag ${esc(b.agencia)} · cc ${esc(b.conta)}</small></div>${sit}</div>
      <div class="cc-nums"><div><span>Banco</span><b>${temSaldo?brl2.format(+ult.saldo_final):'–'}</b></div><div><span>Sistema</span><b>${brl2.format(sis)}</b></div><div><span>Diferença</span><b style="color:${dif&&Math.abs(dif)>=0.01?'var(--bad)':'inherit'}">${dif==null?'–':brl2.format(dif)}</b></div></div>
      <div class="cc-bar" title="${pc??0}% das linhas de extrato conciliadas"><span style="width:${pc??0}%"></span></div>
      <div class="cc-pe"><span>${ult?`${pc}% conciliado · até ${dataBR(ult.periodo_fim)}`:'Nenhum extrato importado'}</span>${ult?`<button class="linkbtn small" data-cc-abrir="${ult.id}" data-banco="${b.id}">Abrir último</button>`:`<button class="linkbtn small" data-cc-banco="${b.id}">Importar extrato</button>`}</div></div>`});
  const nBad=cards.filter(c=>c.includes('cc bad')).length;
  return `<div class="panel"><div class="ph"><div><h2>Painel de conciliação · ${esc(nomeEmp(empresa(empId)))}</h2><p class="hint">Saldo do banco no último extrato contra o saldo do sistema na mesma data. Diferença zero e nada pendente: a conta está conciliada.${nBad?` <b>${nBad} conta${nBad>1?'s':''} pede${nBad>1?'m':''} atenção.</b>`:''}</p></div></div><div class="cc-grid">${cards.join('')}</div></div>`}

const vX=VIEWS.auditoria;
VIEWS.auditoria=async function(){
  const h=await vX();const E=stExt();if(!E.emp)return h;
  let p='';try{p=await painel(E.emp)}catch(err){console.warn(err)}
  // botão de lote quando há sugestões no extrato aberto
  let lote='';const ls=E.aberto&&!E.prev?(E._ls||[]):[];
  const sug=ls.filter(l=>l.status==='nao_lancado'&&l.match);
  if(sug.length&&podeEditar(E.emp)){const ab=sug.filter(l=>l.match.tipo==='aberta').length,vi=sug.length-ab;
    lote=`<div class="lote-conc"><span><b>${sug.length} sugest${sug.length>1?'ões':'ão'} pronta${sug.length>1?'s':''}:</b> ${vi?`${vi} vínculo${vi>1?'s':''} com baixas já registradas`:''}${vi&&ab?' e ':''}${ab?`${ab} conta${ab>1?'s':''} em aberto para dar baixa`:''}. Confira na lista e aceite tudo de uma vez.</span><button class="btn" data-acao="ext-aceitar-todas">Aceitar ${sug.length} sugest${sug.length>1?'ões':'ão'}</button></div>`}
  if(!lote)return p+h;
  const i=h.indexOf('<div class="sit-conc');return i>=0?p+h.slice(0,i)+lote+h.slice(i):p+h+lote};

async function aceitarTodas(btn){
  const E=stExt();const ls=(E._ls||[]).filter(l=>l.status==='nao_lancado'&&l.match);if(!ls.length)return;
  btn.disabled=true;btn.textContent='Conciliando…';
  const x=(await sb.from('extratos').select('conta_bancaria_id').eq('id',E.aberto).single()).data;let ok=0,erro='';
  for(const l of ls){const m=l.match;
    try{if(m.tipo==='aberta'){const {error}=await sb.from('parcelas').update({status:'paga',data_pagamento:l.data,valor_pago:r2_(+l.valor),conta_bancaria_id:x.conta_bancaria_id,forma_pagamento:'Extrato bancário'}).eq('id',m.p.id);if(error)throw error;
        const {error:e2}=await sb.from('extrato_linhas').update({status:'conciliado',parcela_id:m.p.id}).eq('id',l.id);if(e2)throw e2}
      else{const {error}=await sb.from('extrato_linhas').update({status:m.tipo,parcela_id:m.p.id,diferenca:m.tipo==='valor_diferente'?m.dif:null}).eq('id',l.id);if(error)throw error}
      ok++}catch(e){erro=traduz(e);break}}
  invalidar();toast(erro?`Conciliei ${ok} de ${ls.length}. Parei em uma linha: ${erro}`:`${ok} linha${ok>1?'s':''} conciliada${ok>1?'s':''} de uma vez.`);render(true)}

document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-acao=ext-aceitar-todas]');if(b){ev.stopPropagation();aceitarTodas(b).catch(e=>toast(traduz(e)));return}
  const a=ev.target.closest('[data-cc-abrir]');if(a){const E=stExt();E.banco=a.dataset.banco;E.prev=null;E.aberto=a.dataset.ccAbrir;E.sel=new Set();render(true);return}
  const n=ev.target.closest('[data-cc-banco]');if(n){const E=stExt();E.banco=n.dataset.ccBanco;E.prev=null;E.aberto=null;render(true).then(()=>document.querySelector('label[for=arqExt]')?.scrollIntoView({block:'center'}))}},true);
})();
