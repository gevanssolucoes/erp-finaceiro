// ===================== Versão 3 · Painel geral e Fluxo de caixa BI
// Mesmo visual do "Dashboard BI fluxo de caixa": cards de entradas, saídas e resultado,
// gráfico mês a mês com a projeção hachurada e matriz Grupo › Conta com cabeçalho e 1ª coluna parados.
// Visões: Orçado, Forecast, Realizado e Orçado × Realizado; regime de Competência ou Caixa.
// Só lê dados (lançamentos, parcelas, orçamento e premissas). Não altera as telas de Orçamento e boletos.
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;
S.v3=S.v3||{visao:'forecast',regime:'caixa',modo:'gerencial',ver:{},fechados:new Set()};

IC['gestao']='<path d="M3 12h4l3-8 4 16 3-8h4"/>';
IC['fluxo-bi']='<rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="17" rx="1"/>';

const css=document.createElement('style');css.textContent=`
.v3{--v3-in:#1D8A43;--v3-in-bar:#A3D5B0;--v3-out:#B86E00;--v3-out-bar:#F2C987;--v3-plan:#6250D6;--v3-plan-soft:#ECE8FB;display:flex;flex-direction:column;gap:14px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .v3{--v3-in:#4CC27A;--v3-in-bar:#2F7A47;--v3-out:#E39A2C;--v3-out-bar:#7A5419;--v3-plan:#A396F2;--v3-plan-soft:#2E2952}}
:root[data-theme="dark"] .v3{--v3-in:#4CC27A;--v3-in-bar:#2F7A47;--v3-out:#E39A2C;--v3-out-bar:#7A5419;--v3-plan:#A396F2;--v3-plan-soft:#2E2952}
.v3-bar{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.v3-fl{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}
.v3-lbl{font-size:10px;font-weight:700;letter-spacing:.8px;color:var(--ink-3);text-transform:uppercase;margin-bottom:4px}
.v3-seg{display:inline-flex;flex-wrap:wrap;gap:2px;background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:3px}
.v3-seg button{font:inherit;font-size:13px;font-weight:600;color:var(--ink-2);background:none;border:0;border-radius:7px;padding:7px 12px;cursor:pointer;min-height:36px}
.v3-seg button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.v3-sel{font:inherit;font-size:13px;font-weight:600;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:8px 10px;min-height:40px;max-width:260px}
.v3-acts{display:flex;gap:8px;flex-wrap:wrap}
.v3-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px}
.v3-k{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:3px;min-width:0}
.v3-k .g{font-size:9.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--ink-3);min-height:13px}
.v3-k .t{font-size:12px;font-weight:600;color:var(--ink-2)}
.v3-k .v{font-size:18px;white-space:nowrap;font-weight:800;letter-spacing:-.4px;font-variant-numeric:tabular-nums;}
.v3-k .d{font-size:11.5px;color:var(--ink-3)}
.v3-k.in .v{color:var(--v3-in)}.v3-k.out .v{color:var(--v3-out)}.v3-k.plan .v{color:var(--v3-plan)}.v3-k.neg .v{color:var(--bad)}
.v3 .panel{margin:0}
.v3-ph{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:10px}
.v3-ph h2{margin:0}
.v3-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink-2)}
.v3-leg span{display:inline-flex;align-items:center;gap:6px}
.v3-sw{width:12px;height:12px;border-radius:3px;display:inline-block;border:1px solid transparent}
.v3-chart{overflow-x:auto}.v3-chart svg{display:block;min-width:720px;width:100%;height:auto}
.v3-mx{overflow:auto;max-height:520px;border:1px solid var(--line);border-radius:10px}
.v3-mx table{border-collapse:separate;border-spacing:0;font-size:13px;font-variant-numeric:tabular-nums;min-width:100%;margin:0}
.v3-mx th,.v3-mx td{padding:7px 10px;text-align:right;white-space:nowrap;border-bottom:1px solid var(--line);background:var(--surface)}
.v3-mx thead th{position:sticky;top:0;z-index:2;background:var(--surface-2);font-size:11.5px;font-weight:700;color:var(--ink-2)}
.v3-mx th:first-child,.v3-mx td:first-child{position:sticky;left:0;z-index:1;text-align:left;min-width:230px;max-width:340px;overflow:hidden;text-overflow:ellipsis;border-right:1px solid var(--line)}
.v3-mx thead th:first-child{z-index:3}
.v3-mx tr.gr td{font-weight:700;background:var(--surface-2);cursor:pointer}
.v3-mx tr.gr td:first-child:before{content:'▾ ';color:var(--ink-3)}.v3-mx tr.gr.fech td:first-child:before{content:'▸ '}
.v3-mx tr.res td{font-weight:800;border-top:2px solid var(--ink-3)}
.v3-mx td.pj{background:repeating-linear-gradient(135deg,transparent 0 5px,var(--v3-plan-soft) 5px 7px),var(--surface);color:var(--v3-plan)}
.v3-mx td.neg{color:var(--bad)}.v3-mx td.pos{color:var(--v3-in)}
.v3-mx .dv{display:block;font-size:11px;font-weight:700}
.v3-mx td .sub{padding-left:16px;display:inline-block}
.v3-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px}
.v3-li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.v3-li:last-child{border-bottom:0}.v3-li b{font-variant-numeric:tabular-nums}
.v3-li .n{min-width:0;overflow-wrap:anywhere}
.v3-drill{font:inherit;font-size:12.5px;font-weight:700;color:var(--accent);background:none;border:0;padding:6px 0;cursor:pointer;text-decoration:none;white-space:nowrap}
.v3-drill:hover{text-decoration:underline}
.v3-imp{display:none}
@media print{.v3-mx{max-height:none!important;overflow:visible!important;border:0}.v3-mx th,.v3-mx td{position:static!important}.v3-imp{display:block;font-size:12px;color:#55656d}.v3-chart svg{min-width:0}}
@media (max-width:640px){.v3-k .v{font-size:17px}.v3-sel{max-width:100%}}
`;document.head.appendChild(css);

// ---------- ajudas
const MS=12;
const zeros=()=>Array(MS).fill(0);
const ini=a=>a+'-01-01',fim=a=>a+'-12-31';
const mesDe=d=>+String(d).slice(5,7)-1;
const fmtK=v=>{const r=Math.round(v/1000);return r===0?(Math.abs(v)>=1?'0':'–'):num.format(r)};
const sinalOk=(a,b)=>a===0||b===0||Math.sign(a)===Math.sign(b);
// quanto do orçado ainda não aconteceu (mesmo sinal e maior em módulo)
const resto=(orc,feito)=>sinalOk(orc,feito)&&Math.abs(orc)>Math.abs(feito)?orc-feito:0;
// meses fechados do ano escolhido: ano passado = 12, ano futuro = 0, ano atual = meses antes do mês de hoje
function corteVivo(a){const y=+HOJE.slice(0,4);return a<y?12:a>y?0:mesDe(HOJE)}
const nomeGrupo=g=>GRUPOS[g]||'Sem grupo da DRE';
const ordemG=g=>{const i=ORDEM_GRUPOS.indexOf(g);return i<0?99:i};
const somaM=(M,m)=>Object.values(M).reduce((a,r)=>a+r[m],0);
const INFO={};
// a mesma conta (código + nome) de empresas diferentes vira uma linha só no consolidado
function chave(id){const c=conta(id);if(!c)return '?';const k_=c.codigo+' '+c.nome;if(!INFO[k_])INFO[k_]={codigo:c.codigo,nome:c.nome,grupo:c.grupo_dre||'_'};return k_}
const add=(M,id,m,v)=>{if(m<0||m>11||!v)return;const c=chave(id);(M[c]=M[c]||zeros())[m]+=v};

// versões do ano para cada empresa da seleção: orçamento escolhido (ou o travado mais recente) e forecast mais recente
async function versoesSel(a){
  const t=await todasVersoes();const out=[];
  for(const e of selEmp()){const vs=t.filter(v=>v.empresa_id===e.id&&v.ano===a);
    const orcs=vs.filter(v=>v.tipo!=='forecast').sort((x,y)=>(y.congelada?1:0)-(x.congelada?1:0)||String(y.criado_em).localeCompare(String(x.criado_em)));
    const fcs=vs.filter(v=>v.tipo==='forecast').sort((x,y)=>String(y.criado_em).localeCompare(String(x.criado_em)));
    const esc_=S.v3.ver[e.id];const orc=orcs.find(v=>v.id===esc_)||orcs[0]||null;
    out.push({e,orcs,orc,fc:fcs[0]||null})}
  return out}

// ---------- monta as matrizes (conta → 12 meses) de cada visão e regime
async function dados(a){
  const corte=corteVivo(a),I=ini(a);
  const [lancs,pagas,abertas,vers]=await Promise.all([lancAno(a),parcelasPagas(a),parcelasAbertas(),versoesSel(a)]);
  const naoTr=id=>!ehTransf(conta(id));
  // realizado
  const EO=new Set(vers.filter(x=>x.orc).map(x=>x.e.id));
  const RC={},RX={},AX={},RCo={},RXo={};
  lancs.filter(l=>naSel(l.empresa_id,l.predio_id)&&passaFx(l)&&naoTr(l.conta_id)).forEach(l=>{add(RC,l.conta_id,mesDe(l.competencia),+l.valor);if(EO.has(l.empresa_id))add(RCo,l.conta_id,mesDe(l.competencia),+l.valor)});
  pagas.filter(p=>parcNaSel(p)&&naoTr(p.lancamentos.conta_id)).forEach(p=>{const v=+(p.valor_pago??p.valor);add(RX,p.lancamentos.conta_id,mesDe(p.data_pagamento),v);if(EO.has(p.empresa_id))add(RXo,p.lancamentos.conta_id,mesDe(p.data_pagamento),v)});
  // em aberto: vencidas antes do mês atual entram no mês atual; só o ano escolhido
  const mHoje=+HOJE.slice(0,4)===a?mesDe(HOJE):null;
  abertas.filter(p=>parcNaSel(p)&&naoTr(p.lancamentos.conta_id)).forEach(p=>{
    let m=null;if(p.vencimento.startsWith(String(a)))m=mesDe(p.vencimento);
    if(mHoje!=null&&p.vencimento<HOJE.slice(0,8)+'01')m=mHoje;
    if(m!=null)add(AX,p.lancamentos.conta_id,m,+p.valor)});
  // orçado e base da projeção (forecast mais recente, senão o orçado)
  const OC={},OX={},PC={},PX={};let temOrc=false,temFc=false;const nomes=[];
  for(const x of vers){
    if(x.orc){temOrc=true;nomes.push(x.orc.nome);
      (await linhasDe(x.orc.id)).filter(l=>naSel(l.empresa_id,l.predio_id)&&naoTr(l.conta_id)).forEach(l=>add(OC,l.conta_id,mesDe(l.competencia),+l.valor));
      (await caixaDaVersao(x.orc)).filter(c=>c.data>=I&&c.data<=fim(a)&&naoTr(c.conta_id)).forEach(c=>add(OX,c.conta_id,mesDe(c.data),+c.valor))}
    const base=x.fc||x.orc;if(!base)continue;if(x.fc)temFc=true;
    (await linhasDe(base.id)).filter(l=>naSel(l.empresa_id,l.predio_id)&&naoTr(l.conta_id)).forEach(l=>add(PC,l.conta_id,mesDe(l.competencia),+l.valor));
    (await caixaDaVersao(base)).filter(c=>c.data>=I&&c.data<=fim(a)&&naoTr(c.conta_id)).forEach(c=>add(PX,c.conta_id,mesDe(c.data),+c.valor))}
  // forecast: realizado nos meses fechados; daí em diante o que já aconteceu + o que falta do previsto
  const contas=new Set([...Object.keys(RC),...Object.keys(RX),...Object.keys(AX),...Object.keys(OC),...Object.keys(OX),...Object.keys(PC),...Object.keys(PX)]);
  const FC={},FX={},GX={}; // GX = orçamento a gastar/receber ainda não lançado (caixa)
  contas.forEach(c=>{const rc=RC[c]||zeros(),rx=RX[c]||zeros(),ax=AX[c]||zeros(),pc=PC[c]||zeros(),px=PX[c]||zeros();
    FC[c]=zeros();FX[c]=zeros();GX[c]=zeros();
    for(let m=0;m<MS;m++){
      if(m<corte){FC[c][m]=rc[m];FX[c][m]=rx[m]+(m===mHoje?ax[m]:0);continue}
      FC[c][m]=rc[m]+resto(pc[m],rc[m]);
      const g=resto(px[m],rx[m]+ax[m]);GX[c][m]=g;FX[c][m]=rx[m]+ax[m]+g}});
  const parcial=temOrc&&EO.size<selEmp().length?selEmp().filter(e=>EO.has(e.id)).map(nomeEmp):null;
  return {a,corte,RC,RX,AX,OC,OX,FC,FX,GX,RCo,RXo,temOrc,temFc,nomes,vers,parcial}}

function matDe(D,visao,regime){const cx=regime==='caixa';
  if(visao==='orcado')return cx?D.OX:D.OC;
  if(visao==='realizado-o')return cx?D.RXo:D.RCo;
  if(visao==='realizado'){if(!cx)return D.RC;const o={};Object.keys(D.RX).forEach(c=>o[c]=D.RX[c].slice());return o}
  return cx?D.FX:D.FC}
// mês projetado (hachurado)?
const projetado=(D,visao,m)=>visao==='orcado'||(visao==='forecast'&&m>=D.corte);

// ---------- cards (sempre pelo caixa, como no painel de referência)
function cards(D){
  const pos=(M,f)=>{let t=0;Object.values(M).forEach(r=>r.forEach((v,m)=>{if((!f||f(m))&&v>0)t+=v}));return t};
  const neg=(M,f)=>{let t=0;Object.values(M).forEach(r=>r.forEach((v,m)=>{if((!f||f(m))&&v<0)t+=v}));return t};
  const rec=pos(D.RX),pag=neg(D.RX),aRec=pos(D.AX),aPag=neg(D.AX),gS=neg(D.GX),gE=pos(D.GX);
  const sr=rec+pag,sp=sr+aRec+aPag+gS+gE;const ult=D.corte>0?MESES[Math.min(D.corte,12)-1]+'/'+String(D.a).slice(2):'';
  const card=(cls,g,t,v,d)=>`<div class="v3-k ${cls}"><span class="g">${g}</span><span class="t">${t}</span><span class="v">${v}</span><span class="d">${d}</span></div>`;
  return `<div class="v3-cards">
   ${card('in','Entradas','Receita realizada',k(rec),'recebido em '+D.a)}
   ${card('in','','A receber',k(aRec),'em aberto no contas a receber')}
   ${card('out','Saídas','Pagamentos efetivos',k(-pag),'pago em '+D.a)}
   ${card('out','','A pagar',k(-aPag),'lançado no contas a pagar')}
   ${card('plan','','Orçamento a gastar',D.temOrc?k(-gS):'–',D.temOrc?'orçado e ainda não lançado':'sem orçamento de '+D.a)}
   ${card(sr<0?'neg':'in','Resultado','Saldo realizado',(sr>=0?'+':'')+k(sr),'recebido − pago')}
   ${card(sp<0?'neg':'in','','Saldo projetado',(sp>=0?'+':'')+k(sp),'inclui carteira'+(D.temOrc?' e orçamento':''))}
  </div>`}

// ---------- gráfico: entradas × saídas por mês, projeção hachurada e saldo acumulado
function grafico(D,visao,regime){
  const M=matDe(D,visao==='comparativo'?'realizado-o':visao,regime);
  const ent=MESES.map((_,m)=>Object.values(M).reduce((a,r)=>a+(r[m]>0?r[m]:0),0));
  const sai=MESES.map((_,m)=>Object.values(M).reduce((a,r)=>a+(r[m]<0?-r[m]:0),0));
  const ate=visao==='comparativo'?Math.max(D.corte,1):visao==='realizado'?Math.min(12,D.corte+(D.corte<12?1:0)):12;
  let ac=0;const acum=MESES.map((_,m)=>m<ate?(ac+=ent[m]-sai[m]):null);
  const W=1240,H=300,L=64,R_=60,T=30,B=30,cw=(W-L-R_)/12;
  const mx=Math.max(1,...ent,...sai)*1.08;const y=v=>T+(H-T-B)*(1-v/mx);
  const av=acum.filter(v=>v!=null);const amin=Math.min(0,...av),amax=Math.max(1,...av);const ay=v=>T+(H-T-B)*(1-(v-amin)/((amax-amin)||1));
  const step=niceStep(mx/4);let s='';
  for(let t=0;t<=mx;t+=step)s+=`<line x1="${L}" x2="${W-R_}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${L-8}" y="${y(t)+4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${k(t).replace('R$ ','')}</text>`;
  MESES.forEach((n,m)=>{const x=L+m*cw,bw=cw*.32,lb=n+'/'+String(D.a).slice(2);
    if(m<ate){const pj=visao!=='comparativo'&&projetado(D,visao,m);
      if(ent[m])s+=`<rect x="${x+cw*.16}" y="${y(ent[m])}" width="${bw}" height="${y(0)-y(ent[m])}" rx="3" fill="${pj?'url(#v3hE)':'var(--v3-in-bar)'}" stroke="${pj?'var(--v3-in)':'none'}"><title>${lb} · entradas ${brl.format(ent[m])}${pj?' (projetado)':''}</title></rect>`;
      if(sai[m])s+=`<rect x="${x+cw*.52}" y="${y(sai[m])}" width="${bw}" height="${y(0)-y(sai[m])}" rx="3" fill="${pj?'url(#v3hS)':'var(--v3-out-bar)'}" stroke="${pj?'var(--v3-out)':'none'}"><title>${lb} · saídas ${brl.format(sai[m])}${pj?' (projetado)':''}</title></rect>`}
    s+=`<text x="${x+cw/2}" y="${H-9}" text-anchor="middle" font-size="11" fill="${m===D.corte-1?'var(--ink)':'var(--ink-3)'}" font-weight="${m===D.corte-1?700:400}">${lb}</text>`});
  if(visao==='forecast'&&D.corte>0&&D.corte<12){const xc=L+D.corte*cw;s+=`<line x1="${xc}" x2="${xc}" y1="${T-6}" y2="${H-B}" stroke="var(--ink-3)" stroke-dasharray="4 4"/><text x="${xc+6}" y="${T+4}" font-size="11" font-weight="700" fill="var(--ink-2)">projeção →</text>`}
  const pts=acum.map((v,m)=>v==null?null:[L+m*cw+cw/2,ay(v)]).filter(Boolean);
  if(pts.length){s+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--v3-plan)" stroke-width="2.4"/>`;
    pts.forEach((p,i)=>s+=`<circle cx="${p[0]}" cy="${p[1]}" r="${i===pts.length-1?5:2.6}" fill="var(--v3-plan)"><title>${MESES[i]} · saldo acumulado ${brl.format(acum[i])}</title></circle>`);
    const l=pts[pts.length-1];s+=`<text x="${Math.min(l[0],W-R_-10)}" y="${Math.max(l[1]-10,12)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--v3-plan)">${k(acum[pts.length-1])}</text>`}
  return `<div class="v3-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Entradas e saídas por mês com saldo acumulado"><defs>
   <pattern id="v3hE" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="var(--surface)"/><rect width="3" height="7" fill="var(--v3-in-bar)"/></pattern>
   <pattern id="v3hS" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="var(--surface)"/><rect width="3" height="7" fill="var(--v3-out-bar)"/></pattern></defs>${s}</svg></div>`}

// ---------- matriz Grupo › Conta
function linhasMatriz(D,visao,regime){
  // devolve [{tipo:'g'|'c'|'r', id, nome, vals[12], orc?[12]}]
  const comp=visao==='comparativo';
  const M=matDe(D,comp?'realizado-o':visao,regime),O=comp?matDe(D,'orcado',regime):null;
  const ids=new Set([...Object.keys(M),...(O?Object.keys(O):[])]);
  const porG={};ids.forEach(c=>{const g=INFO[c]?.grupo||'_';(porG[g]=porG[g]||[]).push(c)});
  const out=[];
  Object.keys(porG).sort((a,b)=>ordemG(a)-ordemG(b)).forEach(g=>{
    const cs=porG[g].sort((a,b)=>String(INFO[a]?.codigo||a).localeCompare(String(INFO[b]?.codigo||b),undefined,{numeric:true}));
    const tot=f=>MESES.map((_,m)=>cs.reduce((a,c)=>a+((f[c]||zeros())[m]),0));
    out.push({tipo:'g',id:g,nome:nomeGrupo(g),vals:tot(M),orc:O?tot(O):null});
    cs.forEach(c=>{out.push({tipo:'c',g,id:c,nome:c==='?'?'Conta removida':c,vals:(M[c]||zeros()).slice(),orc:O?(O[c]||zeros()).slice():null})})});
  const res=f=>MESES.map((_,m)=>somaM(f,m));
  out.push({tipo:'r',nome:'RESULTADO DO MÊS',vals:res(M),orc:O?res(O):null});
  return out}
function matriz(D,visao,regime){
  const comp=visao==='comparativo',L=linhasMatriz(D,visao,regime);
  const meses=comp?Math.max(1,D.corte):12;
  const cols=MESES.slice(0,meses);
  const vazioReal=m=>visao==='realizado'&&m>D.corte;
  // desvio em tamanho (despesa menor que o orçado = negativo) e cor pelo efeito no resultado
  const dv=(r,o)=>{if(!o)return '';const d=(Math.abs(r)-Math.abs(o))/Math.abs(o);const bom=r-o>=0;return `<span class="dv" style="color:${Math.abs(d)<.03?'var(--ink-3)':bom?'var(--v3-in)':'var(--bad)'}">${d>=0?'+':''}${pct(d)}</span>`};
  let h=`<thead><tr><th>Grupo › Conta</th>${cols.map(m=>`<th>${m}/${String(D.a).slice(2)}</th>`).join('')}<th>Total</th></tr></thead><tbody>`;
  L.forEach(r=>{
    if(r.tipo==='c'&&S.v3.fechados.has(r.g))return;
    const cls=r.tipo==='g'?'gr'+(S.v3.fechados.has(r.id)?' fech':''):r.tipo==='r'?'res':'';
    const lbl=r.tipo==='c'?`<span class="sub">${esc(r.nome)}</span>`:esc(r.nome);
    let t=0,to=0;const tds=cols.map((_,m)=>{const v=r.vals[m];t+=v;
      if(comp){const o=r.orc[m];to+=o;return `<td class="${v<0?'neg':''}">${fmtK(v)}${r.tipo==='r'?`<span class="dv" style="color:var(--ink-3)">orç. ${fmtK(o)}</span>`:dv(v,o)}</td>`}
      if(vazioReal(m))return '<td></td>';
      return `<td class="${projetado(D,visao,m)?'pj ':''}${v<0?'neg':r.tipo==='r'&&v>0?'pos':''}">${fmtK(v)}</td>`}).join('');
    const tt=comp?`<td class="${t<0?'neg':''}"><b>${fmtK(t)}</b>${r.tipo==='r'?`<span class="dv" style="color:var(--ink-3)">orç. ${fmtK(to)}</span>`:dv(t,to)}</td>`:`<td class="${t<0?'neg':r.tipo==='r'&&t>0?'pos':''}"><b>${fmtK(t)}</b></td>`;
    h+=`<tr class="${cls}" ${r.tipo==='g'?`data-v3g="${r.id}" title="Abrir ou fechar as contas"`:''}><td>${lbl}</td>${tds}${tt}</tr>`});
  return `<div class="v3-mx"><table>${h}</tbody></table></div>`}

// ---------- Excel com números de verdade (uma aba por visão escolhida, mais a capa)
function excelBI(D){
  if(typeof XLSX==='undefined')return toast('Não consegui carregar o gerador de Excel. Recarregue a página.');
  const v=S.v3.visao,rg=S.v3.regime,wb=XLSX.utils.book_new();
  const nomeV={orcado:'Orçado',forecast:'Forecast',realizado:'Realizado',comparativo:'Orçado x Realizado'}[v];
  const capa=XLSX.utils.aoa_to_sheet([[APP_NOME+' · Fluxo de caixa BI'],[],['Empresas',escopo()],['Ano',D.a],['Visão',nomeV],['Regime',rg==='caixa'?'Caixa':'Competência'],['Orçamento usado',D.nomes.join(', ')||'nenhum'],['Realizado até',D.corte?MESES[D.corte-1]+'/'+D.a:'—'],['Emitido em',new Date().toLocaleString('pt-BR')],['Por',S.perfil?.nome||S.user?.email||'']]);
  capa['!cols']=[{wch:20},{wch:60}];XLSX.utils.book_append_sheet(wb,capa,'Capa');
  const aba=(vis,nome)=>{const L=linhasMatriz(D,vis,rg);const rows=[['Grupo','Conta',...MESES.map(m=>m+'/'+D.a),'Total']];
    L.forEach(r=>rows.push([r.tipo==='c'?nomeGrupo(r.g):r.nome,r.tipo==='c'?r.nome:'',...r.vals.map(x=>Math.round(x*100)/100),Math.round(sum(r.vals)*100)/100]));
    const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:28},{wch:40},...Array(13).fill({wch:13})];
    const R=XLSX.utils.decode_range(ws['!ref']);for(let r=1;r<=R.e.r;r++)for(let c=2;c<=R.e.c;c++){const x=ws[XLSX.utils.encode_cell({r,c})];if(x&&x.t==='n')x.z='#,##0.00;[Red]-#,##0.00'}
    ws['!freeze']={xSplit:2,ySplit:1};XLSX.utils.book_append_sheet(wb,ws,nome)};
  if(v==='comparativo'){aba('realizado','Realizado');aba('orcado','Orçado');
    const Lr=linhasMatriz(D,'comparativo',rg);const rows=[['Grupo','Conta',...MESES.map(m=>m+'/'+D.a),'Total']];
    Lr.forEach(r=>{const d=r.vals.map((x,m)=>Math.round((x-r.orc[m])*100)/100);rows.push([r.tipo==='c'?nomeGrupo(r.g):r.nome,r.tipo==='c'?r.nome:'',...d,Math.round(sum(d)*100)/100])});
    const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:28},{wch:40},...Array(13).fill({wch:13})];XLSX.utils.book_append_sheet(wb,ws,'Desvio (R - O)')}
  else aba(v,nomeV);
  const arq=('fluxo-de-caixa-bi-'+nomeV+'-'+(rg==='caixa'?'caixa':'competencia')+'-'+D.a+'-'+HOJE).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.xlsx';
  XLSX.writeFile(wb,arq);toast('Excel gerado: '+arq)}

const btnsExp=(excel)=>`<div class="v3-acts" data-nao-imprime><button class="btn ghost" type="button" data-v3="pdf">${icone('relatorio',15)||''} Exportar PDF</button><button class="btn ghost" type="button" data-v3="${excel}">Exportar Excel</button></div>`;
const NOME_V={orcado:'Orçado',forecast:'Forecast',realizado:'Realizado',comparativo:'Orçado × Realizado'};
const semOrcAviso=D=>!D.temOrc&&D.textoSemOrc?`<div class="effect" style="margin:0">${esc(D.textoSemOrc)}</div>`:D.temOrc?(D.parcial?`<div class="effect" style="margin:0">Só ${esc(D.parcial.join(', '))} ${D.parcial.length>1?'têm':'tem'} orçamento de ${D.a}. Nas comparações com o orçado, o realizado considera só ${D.parcial.length>1?'essas empresas':'essa empresa'}.</div>`:''):`<div class="effect" style="margin:0">Ainda não há orçamento de ${D.a} para ${esc(escopo())}. As visões Orçado e Orçado × Realizado ficam vazias e o Forecast usa só o realizado e o que já está lançado. <a href="#orcamento">Criar orçamento</a></div>`;

// ---------- tela: Fluxo de caixa BI
let ultimoD=null;
async function vFluxoBI(Dpre){
  if(!Dpre&&!S.empresas.length)return semEmpresa();
  const D=Dpre||await dados(S.ano);ultimoD=D;const v=S.v3.visao,rg=S.v3.regime;
  const vers=D.vers.filter(x=>x.orcs.length);
  const selVer=vers.length===1&&vers[0].orcs.length>1?`<div><div class="v3-lbl">Orçamento</div><select class="v3-sel" id="v3Ver" data-emp="${vers[0].e.id}" aria-label="Versão do orçamento">${vers[0].orcs.map(o=>`<option value="${o.id}" ${o.id===vers[0].orc.id?'selected':''}>${esc(o.nome)}${o.congelada?' · travado':' · rascunho'}</option>`).join('')}</select></div>`:'';
  const titulo={orcado:'Orçado'+(D.nomes.length?' · '+D.nomes.join(', '):''),forecast:'Forecast: realizado'+(D.corte?' até '+MESES[D.corte-1]+'/'+String(D.a).slice(2):'')+' + projeção'+(D.temFc?' do forecast':D.temOrc?' do orçamento':''),realizado:'Realizado'+(D.corte&&D.corte<12?' até '+MESES[D.corte-1]+'/'+String(D.a).slice(2):''),comparativo:'Realizado × Orçado, com desvio %'}[v];
  const seg=(nome,campo,ops)=>`<div><div class="v3-lbl">${nome}</div><div class="v3-seg" role="group" aria-label="${nome}">${ops.map(([k_,n])=>`<button type="button" aria-pressed="${S.v3[campo]===k_}" data-v3set="${campo}" data-val="${k_}">${n}</button>`).join('')}</div></div>`;
  return `<div class="v3">
   <div class="v3-bar" data-nao-imprime><div class="v3-fl">${seg('Visão','visao',Object.entries(NOME_V))}${seg('Regime','regime',[['competencia','Competência'],['caixa','Caixa']])}${selVer}</div>${btnsExp('excel-bi')}</div>
   <p class="v3-imp">Visão: ${NOME_V[v]} · Regime: ${rg==='caixa'?'Caixa':'Competência'} · ${esc(escopo())} · ${D.a}</p>
   ${semOrcAviso(D)}
   ${cards(D)}
   <div class="panel"><div class="v3-ph"><div><h2>Fluxo mês a mês · ${esc(titulo)}</h2><p class="hint" style="margin:2px 0 0">${rg==='caixa'?'Caixa: datas de pagamento e recebimento; o que ainda não foi lançado cai no caixa pelas premissas':'Competência: mês em que a receita ou a despesa aconteceu'} · ${esc(escopo())}</p></div>
     <div class="v3-leg"><span><i class="v3-sw" style="background:var(--v3-in-bar)"></i>Entradas</span><span><i class="v3-sw" style="background:var(--v3-out-bar)"></i>Saídas</span><span><i class="v3-sw" style="background:repeating-linear-gradient(135deg,var(--surface) 0 3px,var(--ink-3) 3px 5px);border-color:var(--ink-3)"></i>Projetado</span><span><i class="v3-sw" style="background:var(--v3-plan)"></i>Saldo acumulado</span></div></div>
     ${grafico(D,v,rg)}</div>
   <div class="panel"><div class="v3-ph"><div><h2>Matriz · Grupo › Conta, mês a mês</h2><p class="hint" style="margin:2px 0 0">R$ mil · clique no grupo para abrir ou fechar as contas · cabeçalho e 1ª coluna ficam parados ao rolar${v==='forecast'?' · meses projetados hachurados':''}${v==='comparativo'?' · embaixo de cada valor, o desvio frente ao orçado':''}</p></div>
     <div class="v3-acts" data-nao-imprime><button class="btn ghost" type="button" data-v3="abrir-todos">Abrir tudo</button><button class="btn ghost" type="button" data-v3="fechar-todos">Fechar tudo</button></div></div>
     ${matriz(D,v,rg)}</div>
  </div>`}

// ---------- tela: Painel geral (gerencial e operacional)
async function vGestao(Dpre){
  if(!Dpre&&!S.empresas.length)return semEmpresa();
  const ger=!!Dpre||S.v3.modo!=='operacional';
  const topo=`<div class="v3-bar" data-nao-imprime><div ${Dpre?'hidden':''}><div class="v3-lbl">Visão</div><div class="v3-seg" role="group" aria-label="Tipo de visão"><button type="button" aria-pressed="${ger}" data-v3set="modo" data-val="gerencial">Gerencial</button><button type="button" aria-pressed="${!ger}" data-v3set="modo" data-val="operacional">Operacional</button></div></div>${btnsExp('excel-tela')}</div>`;
  if(!ger)return `<div class="v3">${topo}<p class="v3-imp">Visão operacional · ${esc(escopo())}</p>${await operacional()}</div>`;
  const D=Dpre||await dados(S.ano);ultimoD=D;const ate=Math.max(D.corte,0);
  const lsR=[],lsO=[];const dreG=ls=>{const G={};ls.forEach(x=>{const g=INFO[x.c]?.grupo;if(!g||g==='_')return;G[g]=(G[g]||0)+x.v});const v=x=>G[x]||0;const d={rb:v('receita_bruta')};d.rl=d.rb+v('deducoes');d.eb=d.rl+v('custos')+v('despesas_operacionais');d.ll=d.eb+v('resultado_financeiro')+v('outras')+v('nao_operacional')+v('ir_csll');d.ml=d.rl?d.ll/d.rl:NaN;return d};
  Object.entries(D.RCo).forEach(([c,r])=>r.slice(0,ate).forEach(v=>v&&lsR.push({c,v})));
  Object.entries(D.OC).forEach(([c,r])=>r.slice(0,ate).forEach(v=>v&&lsO.push({c,v})));
  const dR=dreG(lsR),dO=dreG(lsO);const per=ate?`jan a ${MESES[ate-1]}/${String(D.a).slice(2)}`:'—';
  const chip=(r,o,inv)=>{if(!o)return '<span class="chip mute">sem orçado</span>';const d=(r-o)/Math.abs(o);const bom=inv?d<=0:d>=0;return `<span class="chip ${Math.abs(d)<.02?'mute':bom?'good':'bad'}">${d>=0?'+':''}${pct(d)}</span>`};
  const desv=[...new Set([...Object.keys(D.RCo),...Object.keys(D.OC)])].map(c=>{const r=sum((D.RCo[c]||zeros()).slice(0,ate)),o=sum((D.OC[c]||zeros()).slice(0,ate));return {c,r,o,d:r-o}}).filter(x=>x.o&&x.d<=-1).sort((a,b)=>a.d-b.d);
  const piores=desv.slice(0,6);
  return `<div class="v3">${topo}<p class="v3-imp">Visão gerencial · ${esc(escopo())} · ${D.a}</p>
   ${semOrcAviso(D)}
   ${cards(D)}
   <div class="v3-g2">
    <div class="panel"><div class="v3-ph"><div><h2>Orçado × realizado no ano</h2><p class="hint" style="margin:2px 0 0">${per} · competência</p></div><button type="button" class="v3-drill" data-v3go="fluxo-bi" data-visao="comparativo" data-regime="competencia">Abrir comparativo →</button></div>
     ${ate?`<div class="v3-li"><span class="n">Receita bruta</span><span><b>${k(dR.rb)}</b> <span class="hint">orç. ${k(dO.rb)}</span> ${chip(dR.rb,dO.rb)}</span></div>
     <div class="v3-li"><span class="n">EBITDA</span><span><b>${k(dR.eb)}</b> <span class="hint">orç. ${k(dO.eb)}</span> ${chip(dR.eb,dO.eb)}</span></div>
     <div class="v3-li"><span class="n">Lucro líquido</span><span><b>${k(dR.ll)}</b> <span class="hint">orç. ${k(dO.ll)}</span> ${chip(dR.ll,dO.ll)}</span></div>
     <div class="v3-li"><span class="n">Margem líquida</span><span><b>${pct(dR.ml)}</b> <span class="hint">orç. ${dO.rl?pct(dO.ml):'–'}</span></span></div>`:'<p class="muted" style="margin:0">Nenhum mês fechado neste ano ainda.</p>'}
     ${Dpre?'':'<div style="margin-top:6px"><a class="v3-drill" href="#dre">Abrir DRE →</a></div>'}</div>
    <div class="panel"><div class="v3-ph"><div><h2>Maiores desvios</h2><p class="hint" style="margin:2px 0 0">contas que mais tiraram do resultado frente ao orçado · ${per}</p></div><button type="button" class="v3-drill" data-v3go="fluxo-bi" data-visao="comparativo" data-regime="competencia">Ver por mês →</button></div>
     ${piores.length?piores.map(x=>{const r=(Math.abs(x.r)-Math.abs(x.o))/Math.abs(x.o);return `<div class="v3-li"><span class="n">${esc(x.c)}</span><span style="white-space:nowrap"><b style="color:${x.d<0?'var(--bad)':'var(--v3-in)'}">${x.d<0?'−':'+'}${k(Math.abs(x.d)).replace('-','')}</b> <span class="chip ${Math.abs(r)>.05?'bad':'warn'}">${r>=0?'+':''}${pct(r)}</span></span></div>`}).join(''):`<p class="muted" style="margin:0">${D.temOrc?'Sem desvios no período.':'Crie o orçamento para ver os desvios.'}</p>`}
     ${Dpre?'':'<div style="margin-top:6px"><a class="v3-drill" href="#orcamento">Abrir orçamento e forecast →</a></div>'}</div>
   </div>
   <div class="panel"><div class="v3-ph"><div><h2>Fluxo mês a mês · forecast no caixa</h2><p class="hint" style="margin:2px 0 0">realizado${D.corte?' até '+MESES[D.corte-1]+'/'+String(D.a).slice(2):''}, projeção hachurada · linha roxa = saldo acumulado</p></div><button type="button" class="v3-drill" data-v3go="fluxo-bi" data-visao="forecast" data-regime="caixa">Abrir fluxo de caixa BI →</button></div>${grafico(D,'forecast','caixa')}</div>
  </div>`}

async function operacional(){
  const ab=(await parcelasAbertas()).filter(parcNaSel).filter(p=>!ehTransf(conta(p.lancamentos?.conta_id)));
  const pag=ab.filter(p=>p.valor<0),rec=ab.filter(p=>p.valor>0),d7=addDias(HOJE,7);
  const t=(xs)=>sum(xs.map(p=>Math.abs(+p.valor)));
  const vencP=pag.filter(p=>p.vencimento<HOJE),hojeP=pag.filter(p=>p.vencimento===HOJE),semP=pag.filter(p=>p.vencimento>HOJE&&p.vencimento<=d7),atrR=rec.filter(p=>p.vencimento<HOJE),semR=rec.filter(p=>p.vencimento>=HOJE&&p.vencimento<=d7);
  const nc=S.navCount||{};
  const est=window.v3EsteiraResumo?await window.v3EsteiraResumo():null;
  const card=(cls,tt,v,d,href)=>`<a class="v3-k ${cls}" href="${href}" style="text-decoration:none;color:inherit"><span class="t">${tt}</span><span class="v">${v}</span><span class="d">${d}</span></a>`;
  const desc=p=>esc((p.lancamentos?.descricao||conta(p.lancamentos?.conta_id)?.nome||'Lançamento')+(p.numero>1?' · parcela '+p.numero:''));
  const quando=p=>p.vencimento<HOJE?`<span class="chip bad">venceu ${p.vencimento.slice(8,10)}/${p.vencimento.slice(5,7)}</span>`:p.vencimento===HOJE?'<span class="chip warn">hoje</span>':`<span class="chip mute">${p.vencimento.slice(8,10)}/${p.vencimento.slice(5,7)}</span>`;
  const lista=(xs,vazio)=>xs.length?xs.slice(0,8).map(p=>`<div class="v3-li"><span class="n">${desc(p)}</span><span style="white-space:nowrap"><b>${brl.format(Math.abs(+p.valor))}</b> ${quando(p)}</span></div>`).join('')+(xs.length>8?`<p class="hint" style="margin:6px 0 0">e mais ${xs.length-8}</p>`:''):`<p class="muted" style="margin:0">${vazio}</p>`;
  const proxP=[...vencP,...hojeP,...semP].sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  const proxR=[...atrR,...semR].sort((a,b)=>a.vencimento.localeCompare(b.vencimento));
  return `<div class="v3-cards">
    ${card(vencP.length?'neg':'out','A pagar vencido',brl.format(t(vencP)),vencP.length+' conta'+(vencP.length===1?'':'s'),'#contas')}
    ${card('out','A pagar hoje',brl.format(t(hojeP)),hojeP.length+' conta'+(hojeP.length===1?'':'s'),'#contas')}
    ${card('out','A pagar em 7 dias',brl.format(t(semP)),semP.length+' conta'+(semP.length===1?'':'s'),'#contas')}
    ${card(atrR.length?'neg':'in','A receber atrasado',brl.format(t(atrR)),atrR.length+' recebimento'+(atrR.length===1?'':'s'),'#contas')}
    ${card('in','A receber em 7 dias',brl.format(t(semR)),semR.length+' recebimento'+(semR.length===1?'':'s'),'#contas')}
    ${card('plan','Boletos do e-mail',String(nc.boletos||0),'novos para conferir','#boletos')}
    ${card('plan','Aprovações',String(nc.aprovacoes||0),'esperando você','#aprovacoes')}
    ${est?card(est.atrasadas?'neg':'plan','Esteira de produção',String(est.atrasadas),'atrasada'+(est.atrasadas===1?'':'s')+(est.revisao?' · '+est.revisao+' para você avaliar':''),'#producao'):''}
   </div>
   <div class="v3-g2">
    <div class="panel"><div class="v3-ph"><div><h2>Pagar: vencidos, hoje e próximos 7 dias</h2></div><a class="v3-drill" href="#contas">Abrir contas a pagar →</a></div>${lista(proxP,'Nada a pagar até '+d7.slice(8,10)+'/'+d7.slice(5,7)+'.')}</div>
    <div class="panel"><div class="v3-ph"><div><h2>Receber: atrasados e próximos 7 dias</h2></div><a class="v3-drill" href="#contas">Abrir contas a receber →</a></div>${lista(proxR,'Nada a receber até '+d7.slice(8,10)+'/'+d7.slice(5,7)+'.')}</div>
   </div>
   <div class="v3-g2">
    <div class="panel"><div class="v3-ph"><h2>Atalhos do dia a dia</h2></div>
     <div class="v3-li"><span class="n">Conciliar extratos</span><a class="v3-drill" href="#auditoria">Abrir →</a></div>
     <div class="v3-li"><span class="n">Lançar uma conta ou receita</span><a class="v3-drill" href="#lancamentos">Abrir →</a></div>
     <div class="v3-li"><span class="n">Pagamentos ao banco</span><a class="v3-drill" href="#pagamentos">Abrir →</a></div>
     <div class="v3-li"><span class="n">Fechamento do mês</span><a class="v3-drill" href="#fechamento">Abrir →</a></div></div>
   </div>`}

// ---------- ações
document.addEventListener('click',async ev=>{
  const s=ev.target.closest('[data-v3set]');if(s){S.v3[s.dataset.v3set]=s.dataset.val;render(true);return}
  const g=ev.target.closest('[data-v3g]');if(g){const id=g.dataset.v3g;S.v3.fechados.has(id)?S.v3.fechados.delete(id):S.v3.fechados.add(id);render(true);return}
  const go=ev.target.closest('[data-v3go]');if(go){if(go.dataset.visao)S.v3.visao=go.dataset.visao;if(go.dataset.regime)S.v3.regime=go.dataset.regime;location.hash=go.dataset.v3go;return}
  const b=ev.target.closest('[data-v3]');if(!b)return;const a=b.dataset.v3;
  if(a==='pdf'){if(window.relatorioPDF)window.relatorioPDF();else toast('Recarregue a página para gerar o PDF.')}
  else if(a==='excel-tela'){if(window.relatorioExcel)window.relatorioExcel();else toast('Recarregue a página para gerar o Excel.')}
  else if(a==='excel-bi'){if(ultimoD)excelBI(ultimoD)}
  else if(a==='abrir-todos'){S.v3.fechados.clear();render(true)}
  else if(a==='fechar-todos'){document.querySelectorAll('[data-v3g]').forEach(x=>S.v3.fechados.add(x.dataset.v3g));render(true)}
});
document.addEventListener('change',ev=>{if(ev.target.id==='v3Ver'){S.v3.ver[ev.target.dataset.emp]=ev.target.value;render(true)}});

// ---------- registro no app: grupo "Gestão" no topo do menu
if(!ROTAS.some(x=>x[0]==='gestao')){const i=ROTAS.findIndex(x=>x[0]==='g');ROTAS.splice(i>=0?i:0,0,['g','Gestão'],['gestao','Painel geral'],['fluxo-bi','Fluxo de caixa BI'])}
TITULOS.gestao='Painel geral';TITULOS['fluxo-bi']='Fluxo de caixa BI';
VIEWS.gestao=vGestao;VIEWS['fluxo-bi']=vFluxoBI;
['gestao','fluxo-bi'].forEach(r=>{USA_EMP.add(r);USA_ANO.add(r)});
window.v3Dados=dados;
// motor exposto para o Gevans Dados (dados.html), que monta as mesmas telas a partir de uma planilha
window.V3BI={telaFluxo:vFluxoBI,telaGestao:vGestao,cards,grafico,matriz,linhasMatriz,excelBI,resto,zeros,add,INFO,NOME_V,usar:D=>{ultimoD=D}};
})();
