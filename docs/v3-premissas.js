// ===================== Versão 3 · Premissas de compra e pagamento
// Uma tela só para dizer quando cada valor do orçamento ou do forecast sai ou entra no caixa:
//  · compras e pagamentos por conta: compra antecipada, entrada %, prazos em dias ou dia fixo do mês seguinte;
//  · recebimentos: como a receita se divide entre formas (cartão, PIX, boleto...) e o prazo de cada uma;
//  · simulação de R$ 10.000 para ver o efeito no caixa.
// O cálculo de caixa do orçamento (caixaDaLinha) passa a considerar a entrada e as formas de recebimento.
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;
IC['premissas-v3']='<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/><path d="M18 14.5V16l1 .8"/>';
S.premRec=S.premRec||[];
const FORMAS={cartao_credito:'Cartão de crédito',cartao_debito:'Cartão de débito',pix:'PIX',dinheiro:'Dinheiro',boleto:'Boleto',transferencia:'Transferência',outro:'Outro'};

// ---------- carga: junto com os cadastros (tabela nova; se ainda não existir, segue sem ela)
async function carregarPremRec(){try{const {data,error}=await sb.from('premissas_recebimento').select('*');if(error)throw error;S.premRec=data||[];S.premRecOk=true}catch(e){S.premRec=[];S.premRecOk=false}}
if(typeof carregarCadastros==='function'){const cc0=carregarCadastros;carregarCadastros=async function(){const r=await cc0.apply(this,arguments);await carregarPremRec();return r}}
const recDe=(contaId,data)=>S.premRec.filter(p=>p.conta_id===contaId&&p.vigencia_inicio<=data&&(!p.vigencia_fim||p.vigencia_fim>=data));

// ---------- caixa de uma linha de competência, com entrada e formas de recebimento
const prazosEmPartes=(base,prazos,valor)=>{const pr=prazos&&prazos.length?prazos:[0];const q=pr.length,parte=r2(valor/q);return pr.map((d,i)=>({data:addDias(base,+d||0),valor:i<q-1?parte:r2(valor-parte*(q-1))}))};
if(typeof caixaDaLinha==='function'){const cx0=caixaDaLinha;
  caixaDaLinha=function(contaId,comp,valor){
    const rec=recDe(contaId,comp);
    if(rec.length){const base=comp.slice(0,8)+'15';let usado=0;const out=[];
      rec.forEach(r=>{const v=r2(valor*Math.min(+r.percentual,100-usado)/100);if(!v)return;usado+=+r.percentual;out.push(...prazosEmPartes(base,r.prazos_dias,v))});
      const resto=r2(valor-sum(out.map(x=>x.valor)));if(Math.abs(resto)>=.01)out.push({data:base,valor:resto});return out}
    const p=premissaDe(contaId,comp);const ent=+(p?.entrada_pct||0);
    if(p&&ent>0&&p.regra!=='a_vista'){const base=addDias(comp.slice(0,8)+'15',-(p.antecedencia_compra_dias||0));const v=r2(valor*ent/100);return [{data:base,valor:v},...cx0(contaId,comp,r2(valor-v))]}
    return cx0(contaId,comp,valor)}}

const css=document.createElement('style');css.textContent=`
.v3p table{font-size:13px}
.v3p td input,.v3p td select{font:inherit;font-size:13px;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:7px;padding:6px 8px;width:100%;min-width:64px;min-height:34px}
.v3p td input.mud,.v3p td select.mud{background:var(--warn-soft);border-color:var(--warn)}
.v3p .w-s{width:90px}.v3p .w-m{width:130px}
.v3p-tl{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.v3p-tm{border:1px solid var(--line);border-radius:9px;padding:8px;font-size:12px;min-height:80px;display:flex;flex-direction:column;gap:4px;background:var(--surface)}
.v3p-tm b{font-size:12.5px}
.v3p-ev{border-radius:5px;padding:3px 6px;font-weight:700;font-size:11.5px;font-variant-numeric:tabular-nums}
.v3p-ev.c{background:var(--v3-plan-soft,#ECE8FB);color:var(--v3-plan,#6250D6)}.v3p-ev.p{background:var(--warn-soft);color:var(--warn)}.v3p-ev.r{background:var(--good-soft);color:var(--good)}
.v3p .soma{font-size:12px;font-weight:700}
@media (max-width:640px){.v3p-tl{grid-template-columns:repeat(3,minmax(0,1fr))}}
`;document.head.appendChild(css);

// ---------- estado de edição
const ED={pag:{},rec:null,emp:null};
const textoRegra=p=>!p||p.regra==='a_vista'?'No próprio mês':p.regra==='dia_fixo_mes_seguinte'?`Dia ${p.dia_fixo||10} do mês seguinte`:`${(p.prazos_dias||[30]).join('/')} dias`;
const contasDe=(emp,tipo)=>contasOrc(emp).filter(c=>tipo==='receita'?c.tipo==='receita':c.tipo!=='receita');
const geral=c=>S.premissas.find(x=>x.conta_id===c&&x.vigencia_inicio==='2000-01-01')||premissaDe(c,HOJE);

function vPremV3(){
  if(!S.empresas.length)return semEmpresa();
  if(!S.empresas.some(e=>e.id===S.premV3Emp))S.premV3Emp=(selEmp()[0]||S.empresas[0]).id;
  const emp=S.premV3Emp,ed=podeEditar(emp);
  if(ED.emp!==emp){ED.emp=emp;ED.pag={};ED.rec=null}
  if(!ED.rec){ED.rec={};contasDe(emp,'receita').forEach(c=>{ED.rec[c.id]=recDe(c.id,HOJE).map(r=>({forma:r.forma,percentual:+r.percentual,prazos:(r.prazos_dias||[0]).join('/')}))})}
  // compras e pagamentos
  let g=null,rowsP='';
  contasDe(emp,'despesa').forEach(c=>{if(c.grupo_dre!==g){g=c.grupo_dre;rowsP+=`<tr class="grp-row"><td colspan="7">${esc(GRUPOS[g]||'Sem grupo da DRE')}</td></tr>`}
    const p=geral(c.id),e=ED.pag[c.id]||{};
    const val=(k_,def)=>e[k_]!==undefined?e[k_]:def;
    const prz=p&&p.regra==='dias_corridos'?(p.prazos_dias||[30]).join('/'):'';const dia=p&&p.regra==='dia_fixo_mes_seguinte'?(p.dia_fixo||''):'';
    const inp=(k_,v,ex)=>ed?`<input data-v3p="${c.id}" data-k="${k_}" value="${esc(String(val(k_,v)))}" class="${e[k_]!==undefined?'mud':''}" ${ex}>`:esc(String(v||'–'));
    rowsP+=`<tr><td style="padding-left:18px"><button type="button" class="linkbtn" data-v3psim="${c.id}" title="Simular esta conta">${esc(c.codigo)} ${esc(c.nome)}</button></td>
     <td class="w-s">${inp('antec',p?.antecedencia_compra_dias||0,'type="number" min="0" aria-label="Compra antes, em dias"')}</td>
     <td class="w-s">${inp('entrada',+(p?.entrada_pct||0),'type="number" min="0" max="100" aria-label="Entrada em %"')}</td>
     <td class="w-m">${inp('prazos',prz,'placeholder="30/60/90" aria-label="Prazos em dias"')}</td>
     <td class="w-s">${inp('dia',dia,'type="number" min="1" max="31" placeholder="–" aria-label="Dia fixo do mês seguinte"')}</td>
     <td class="w-m">${inp('forma',p?.forma_pagamento||'','placeholder="Boleto, PIX…" aria-label="Forma de pagamento"')}</td>
     <td class="muted" style="white-space:nowrap;font-size:12px">${esc(textoRegra(p))}</td></tr>`});
  // recebimentos
  const rowsR=contasDe(emp,'receita').map(c=>{const rs=ED.rec[c.id]||[];const tot=sum(rs.map(r=>+r.percentual||0));
    return `<tr class="grp-row"><td colspan="5"><span>${esc(c.codigo)} ${esc(c.nome)}</span> <span class="soma" style="color:${tot>100?'var(--bad)':tot===100||!rs.length?'var(--ink-3)':'var(--warn)'}">${rs.length?`· ${num.format(tot)}% dividido${tot<100?` · ${num.format(100-tot)}% entra no próprio mês`:tot>100?' · passa de 100%':''}`:'· tudo no próprio mês'}</span></td></tr>`+
      rs.map((r,i)=>`<tr><td style="padding-left:18px">${ed?`<select data-v3pr="${c.id}" data-i="${i}" data-k="forma" aria-label="Forma de recebimento">${Object.entries(FORMAS).map(([k_,n])=>`<option value="${k_}" ${r.forma===k_?'selected':''}>${n}</option>`).join('')}</select>`:esc(FORMAS[r.forma]||r.forma)}</td>
        <td class="w-s">${ed?`<input data-v3pr="${c.id}" data-i="${i}" data-k="percentual" type="number" min="1" max="100" value="${r.percentual}" aria-label="% da receita">`:r.percentual+'%'}</td>
        <td class="w-m">${ed?`<input data-v3pr="${c.id}" data-i="${i}" data-k="prazos" value="${esc(r.prazos)}" placeholder="0 ou 30 ou 30/60" aria-label="Recebe em quantos dias">`:esc(r.prazos)}</td>
        <td class="muted" style="font-size:12px">${r.prazos==='0'||!r.prazos?'no próprio mês':'em '+esc(r.prazos)+' dias'}</td>
        <td>${ed?`<button type="button" class="linkbtn" style="color:var(--bad)" data-v3prdel="${c.id}" data-i="${i}">Tirar</button>`:''}</td></tr>`).join('')+
      (ed?`<tr><td colspan="5" style="padding-left:18px"><button type="button" class="linkbtn" data-v3pradd="${c.id}">+ Forma de recebimento</button> · <button type="button" class="linkbtn" data-v3psim="${c.id}">Simular</button></td></tr>`:'')}).join('');
  const sujo=Object.keys(ED.pag).length||ED.recSujo;
  const aviso=S.premRecOk===false?`<div class="effect" style="margin:0">As formas de recebimento precisam de uma atualização do banco que ainda não foi aplicada. As premissas de pagamento já funcionam.</div>`:'';
  return `<div class="v3 v3p">
   <div class="v3-bar"><div class="v3-fl"><div><div class="v3-lbl">Empresa</div><select class="v3-sel" id="premV3Emp" aria-label="Empresa">${opcoesEmp(emp,false)}</select></div></div>
     <div class="v3-acts">${ed?`<button class="btn" type="button" data-v3p-salvar ${sujo?'':'disabled'}>Salvar alterações</button>`:''}</div></div>
   <p class="hint" style="margin:0;max-width:820px">Dizem quando cada valor do orçamento e do forecast sai ou entra no caixa. O Fluxo de caixa BI e o caixa do orçamento usam estas regras para o que ainda não foi lançado. Clique no nome de uma conta para simular.</p>
   ${aviso}
   <div id="v3pSim">${simulacao(S.premV3Sim&&conta(S.premV3Sim)?.empresa_id===emp?S.premV3Sim:(contasDe(emp,'despesa')[0]?.id))}</div>
   <div class="panel"><div class="v3-ph"><div><h2>Compras e pagamentos</h2><p class="hint" style="margin:2px 0 0">Compra antes: quantos dias antes do mês da despesa o pedido é feito. Entrada: parte paga na compra. Prazos: dias depois da compra (30/60/90 divide em três). Dia fixo: vence no dia do mês seguinte, como impostos e folha.</p></div></div>
     <div class="tbl-wrap"><table><thead><tr><th>Conta</th><th>Compra antes (dias)</th><th>Entrada %</th><th>Prazos (dias)</th><th>Dia fixo</th><th>Forma</th><th>Hoje</th></tr></thead><tbody>${rowsP||'<tr><td colspan="7" class="muted">Nenhuma conta de despesa ativa.</td></tr>'}</tbody></table></div></div>
   <div class="panel"><div class="v3-ph"><div><h2>Recebimentos</h2><p class="hint" style="margin:2px 0 0">Como a receita de cada conta se divide entre formas de recebimento e em quantos dias cada parte entra. As taxas da maquininha ficam em <a href="#tributos">Impostos e maquininha</a>.</p></div></div>
     <div class="tbl-wrap"><table><thead><tr><th>Forma</th><th>% da receita</th><th>Recebe em (dias)</th><th>Resumo</th><th></th></tr></thead><tbody>${rowsR||'<tr><td colspan="5" class="muted">Nenhuma conta de receita ativa.</td></tr>'}</tbody></table></div></div>
  </div>`}

// ---------- simulação: R$ 10.000 na competência do mês que vem, pelas regras salvas
function simulacao(cid){
  const c=conta(cid);if(!c)return '';
  const rec=c.tipo==='receita',v=rec?10000:-10000;
  const d0=new Date(HOJE.slice(0,8)+'01T12:00:00Z');d0.setUTCMonth(d0.getUTCMonth()+1);const comp=d0.toISOString().slice(0,10);
  const cx=caixaDaLinha(cid,comp,v);const p=!rec&&premissaDe(cid,comp);
  const meses=Array.from({length:6},(_,i)=>{const d=new Date(comp+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+i-2);return d.toISOString().slice(0,7)});
  const ev=Object.fromEntries(meses.map(m=>[m,[]]));
  if(p?.antecedencia_compra_dias){const dc=addDias(comp.slice(0,8)+'15',-p.antecedencia_compra_dias).slice(0,7);ev[dc]?.push(['c','Pedido de compra'])}
  ev[comp.slice(0,7)]?.push(['r',(rec?'Receita':'Despesa')+' de '+brl.format(10000)]);
  const fora=[];cx.forEach(x=>{const m=x.data.slice(0,7);const t=(rec?'Entra ':'Sai ')+brl.format(Math.abs(x.valor))+' · '+x.data.slice(8,10)+'/'+x.data.slice(5,7);if(ev[m])ev[m].push(['p',t]);else fora.push(t)});
  return `<div class="panel"><div class="v3-ph"><div><h2>Simulação · ${esc(c.codigo)} ${esc(c.nome)}</h2><p class="hint" style="margin:2px 0 0">Uma ${rec?'receita':'despesa'} de ${brl.format(10000)} na competência de ${MESES[+comp.slice(5,7)-1]}/${comp.slice(2,4)} fica assim no caixa, pelas regras salvas.</p></div>
    <div class="v3-leg"><span><i class="v3-sw" style="background:var(--v3-plan-soft,#ECE8FB)"></i>Compra</span><span><i class="v3-sw" style="background:var(--good-soft)"></i>Competência (DRE)</span><span><i class="v3-sw" style="background:var(--warn-soft)"></i>Caixa</span></div></div>
   <div class="v3p-tl">${meses.map(m=>`<div class="v3p-tm"><b>${MESES[+m.slice(5,7)-1]}/${m.slice(2,4)}</b>${ev[m].map(([k_,t])=>`<span class="v3p-ev ${k_}">${t}</span>`).join('')}</div>`).join('')}</div>
   ${fora.length?`<p class="hint" style="margin:8px 0 0">Depois: ${fora.map(esc).join(' · ')}</p>`:''}</div>`}

// ---------- gravação
async function salvar(btn){
  const emp=S.premV3Emp;btn.disabled=true;
  try{
    for(const [cid,e] of Object.entries(ED.pag)){
      const p=S.premissas.find(x=>x.conta_id===cid&&x.vigencia_inicio==='2000-01-01');
      const prz=String(e.prazos!==undefined?e.prazos:(p&&p.regra==='dias_corridos'?(p.prazos_dias||[30]).join('/'):'')).split(/[\/;, ]+/).map(Number).filter(x=>!isNaN(x)&&x>0);
      const dia=e.dia!==undefined?+e.dia||null:(p&&p.regra==='dia_fixo_mes_seguinte'?p.dia_fixo:null);
      const ent=Math.min(100,Math.max(0,+(e.entrada!==undefined?e.entrada:(p?.entrada_pct||0))||0));
      const d={regra:dia?'dia_fixo_mes_seguinte':prz.length?'dias_corridos':'a_vista',prazos_dias:prz.length?prz:[30],dia_fixo:dia,
        antecedencia_compra_dias:Math.max(0,+(e.antec!==undefined?e.antec:(p?.antecedencia_compra_dias||0))||0),
        forma_pagamento:(e.forma!==undefined?e.forma:(p?.forma_pagamento||'')).trim()||null};
      if(ent||(p&&+p.entrada_pct))d.entrada_pct=ent;
      const q=p?sb.from('premissas_conta').update(d).eq('id',p.id):sb.from('premissas_conta').insert({...d,empresa_id:emp,conta_id:cid,vigencia_inicio:'2000-01-01'});
      const {error}=await q;if(error)throw error}
    if(ED.recSujo){
      for(const [cid,rs] of Object.entries(ED.rec)){
        const tot=sum(rs.map(r=>+r.percentual||0));if(tot>100)throw new Error('A receita de '+conta(cid).nome+' passa de 100% entre as formas de recebimento.')}
      for(const [cid,rs] of Object.entries(ED.rec)){
        const velhos=S.premRec.filter(r=>r.conta_id===cid&&r.vigencia_inicio==='2000-01-01');
        const novos=rs.filter(r=>+r.percentual>0).map(r=>({empresa_id:emp,conta_id:cid,vigencia_inicio:'2000-01-01',forma:r.forma,percentual:+r.percentual,prazos_dias:(String(r.prazos||'0').split(/[\/;, ]+/).map(Number).filter(x=>!isNaN(x)&&x>=0)).slice(0,24)}));
        novos.forEach(n=>{if(!n.prazos_dias.length)n.prazos_dias=[0]});
        const igual=JSON.stringify(velhos.map(r=>[r.forma,+r.percentual,(r.prazos_dias||[]).join('/')]))===JSON.stringify(novos.map(r=>[r.forma,r.percentual,r.prazos_dias.join('/')]));
        if(igual)continue;
        if(velhos.length){const {error}=await sb.from('premissas_recebimento').delete().in('id',velhos.map(r=>r.id));if(error)throw error}
        if(novos.length){const {error}=await sb.from('premissas_recebimento').insert(novos);if(error)throw error}}}
    ED.pag={};ED.rec=null;ED.recSujo=false;S.caixaOrc=null;
    toast('Premissas salvas. O caixa do orçamento e do forecast já usa as regras novas.');
    await recarregarCad()}
  catch(e){console.error(e);toast(traduz(e));btn.disabled=false}}

// ---------- eventos
const marcarSujo=()=>{const b=document.querySelector('[data-v3p-salvar]');if(b)b.disabled=false};
document.addEventListener('input',ev=>{
  const i=ev.target.closest('[data-v3p]');if(i){(ED.pag[i.dataset.v3p]=ED.pag[i.dataset.v3p]||{})[i.dataset.k]=i.value;i.classList.add('mud');marcarSujo();return}
  const r=ev.target.closest('[data-v3pr]');if(r){const x=ED.rec[r.dataset.v3pr][+r.dataset.i];x[r.dataset.k]=r.dataset.k==='percentual'?+r.value:r.value;ED.recSujo=true;r.classList.add('mud');marcarSujo()}});
document.addEventListener('change',ev=>{
  if(ev.target.id==='premV3Emp'){if(Object.keys(ED.pag).length||ED.recSujo){toast('Salve ou recarregue antes de trocar de empresa.');ev.target.value=S.premV3Emp;return}S.premV3Emp=ev.target.value;render(true);return}
  const r=ev.target.closest('select[data-v3pr]');if(r){ED.rec[r.dataset.v3pr][+r.dataset.i].forma=r.value;ED.recSujo=true;r.classList.add('mud');marcarSujo()}});
document.addEventListener('click',ev=>{
  const s=ev.target.closest('[data-v3psim]');if(s){S.premV3Sim=s.dataset.v3psim;const el=document.getElementById('v3pSim');if(el){el.innerHTML=simulacao(S.premV3Sim);el.scrollIntoView({behavior:'smooth',block:'nearest'})}return}
  const a=ev.target.closest('[data-v3pradd]');if(a){const rs=ED.rec[a.dataset.v3pradd];const tot=sum(rs.map(r=>+r.percentual||0));rs.push({forma:rs.length?'pix':'cartao_credito',percentual:Math.max(0,100-tot)||10,prazos:rs.length?'0':'30'});ED.recSujo=true;render(true);return}
  const d=ev.target.closest('[data-v3prdel]');if(d){ED.rec[d.dataset.v3prdel].splice(+d.dataset.i,1);ED.recSujo=true;render(true);return}
  const b=ev.target.closest('[data-v3p-salvar]');if(b){salvar(b)}});

// ---------- registro no app
// a tela nova substitui a antiga "Premissas de prazo" no menu (o endereço antigo continua abrindo)
const iOld=ROTAS.findIndex(x=>x[0]==='premissas');
if(!ROTAS.some(x=>x[0]==='premissas-v3'))ROTAS.splice(iOld>=0?iOld:ROTAS.length,iOld>=0?1:0,['premissas-v3','Premissas de compra e pagamento']);
TITULOS['premissas-v3']='Premissas de compra e pagamento';VIEWS['premissas-v3']=vPremV3;
})();
