// ===================== Gevans Dados · Caixa e auditoria (painéis prontos por empresa, migração 0033)
// Mostra o caixa do mês montado a partir das planilhas do cliente (receitas, contas pagas, transferências, tarifas),
// o fluxo na estrutura do cliente (Fluxo_Conta / Fluxo_Descricao e as colunas de apresentação),
// a conferência com o extrato conta a conta e a auditoria linha a linha de cada conta bancária.
// Só lê a tabela dados_paineis; quem não tem painel vê uma explicação.
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;
IC.caixa='<path d="M3 7h18v12H3z"/><path d="M3 11h18M7 15h3"/><path d="M8 7V4h8v3"/>';
const X=S.cxa=Object.assign({emp:null,per:null,tab:'visao',conta:null,status:'',q:'',qc:'',fluxo:null,cache:{},f:{reg:'',cid:'',emp:'',obra:''}},S.cxa||{});

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
.cxa-fc td:first-child,.cxa-fc th:first-child{position:sticky;left:0;background:var(--surface);z-index:1;min-width:260px;white-space:normal}
.cxa-fc tr.tot td:first-child{background:var(--surface-2)}
.cxa-fc thead th{z-index:2}
.cxa-tg{display:inline-block;width:16px;color:var(--ink-2)}
.cxa-fc tr.cxa-lanc td{font-size:12px;color:var(--ink-2)}
.cxa-fc tr.l2 td:first-child{padding-left:28px}.cxa-fc thead th:first-child{z-index:3}

.cxa-cards{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.cxa-cards .v3-k .v{font-size:17px}.cxa-k .chip{align-self:flex-start;margin-top:4px}
.cxa .n.pos,.cxa .v.pos{color:var(--good)}.cxa .n.neg{color:var(--bad)}
.cxa-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:14px}
.cxa-g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px}
.cxa-vl{font:600 15px var(--f-num,monospace);fill:var(--ink);text-anchor:middle}.cxa-xl{font-size:12.5px;fill:var(--ink-2);text-anchor:middle}
.cxa-bar{width:22%;min-width:50px}.cxa-or td{font-size:12.5px;padding-top:6px;padding-bottom:6px}.cxa-or td.txt{min-width:150px}.cxa-bk td,.cxa-bk th{font-size:12px;padding-left:6px;padding-right:6px}.cxa-bk th{white-space:normal}.cxa-bar i{display:block;height:6px;border-radius:3px;margin:1px 0}.cxa-bar i.o,.cxa-lg i.o{background:var(--plan,#9aa8ae)}.cxa-bar i.e,.cxa-lg i.e{background:var(--good)}.cxa-bar i.s,.cxa-lg i.s{background:var(--bad)}
.cxa-lg{margin-right:10px;white-space:nowrap}.cxa-lg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.cxa-hb{display:grid;grid-template-columns:minmax(0,1.4fr) 1fr auto 34px;gap:8px;align-items:center;font-size:12.5px;margin:4px 0}.cxa-hb .hn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cxa-hb .ht{background:var(--surface-2);height:9px;border-radius:5px;overflow:hidden}.cxa-hb .ht i{display:block;height:100%;border-radius:5px}.cxa-hb i.e{background:var(--good)}.cxa-hb i.s{background:var(--bad)}.cxa-hb i.s2{background:color-mix(in srgb,var(--bad) 45%,transparent)}
.cxa-hb .hv{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}.cxa-hb .hp{color:var(--ink-3);text-align:right;font-size:11.5px}
.cxa-hb.pr{font-size:11.5px;color:var(--ink-2);margin:2px 0}.cxa-hb.pr .hn{padding-left:18px}.cxa-hb.pr .ht{height:6px}
.cxa-dr td{white-space:nowrap}.cxa-dr td:first-child{white-space:normal;min-width:260px}
.cxa-dr tr.l1 td{background:var(--accent-soft,var(--surface-2));font-weight:700}.cxa-dr tr.l2 td{font-weight:700}.cxa-dr tr.l3 td{font-weight:600}.cxa-dr tr.l4 td{color:var(--ink-2)}.cxa-dr tr.l5 td{font-size:12px;color:var(--ink-2);background:var(--surface-2)}
.cxa-nv{font-size:10.5px!important;color:var(--ink-3)!important;text-transform:uppercase;letter-spacing:.03em;font-weight:600!important}
.cxa-q{color:var(--ink-3)}.cxa-dt{font-variant-numeric:tabular-nums;color:var(--ink-3);margin-right:8px}.cxa-ok{color:var(--good);font-size:11px}.cxa-mais2{color:var(--accent,var(--ink));font-weight:600}
.cxa-dw{max-height:75vh}
.cxa-aud td{white-space:normal;font-size:12.5px}.cxa-aud td.n{white-space:nowrap}.cxa-aud td.det{min-width:140px}.cxa-aud{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:14px;align-items:start}
@media (max-width:820px){.cxa-aud{grid-template-columns:1fr}.cxa-accs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}}
.cxa-acc{font:inherit;text-align:left;width:100%;display:block;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:8px;cursor:pointer;color:var(--ink)}
.cxa-acc[aria-pressed="true"]{border:2px solid var(--accent,var(--ink));padding:9px 11px}
.cxa-acc .ah{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:13px;margin-bottom:6px}.cxa-acc .ag{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:12px;color:var(--ink-2)}.cxa-acc .n{font-variant-numeric:tabular-nums;text-align:right}
.cxa-mini{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.cxa-mini div{background:var(--surface-2);border-radius:9px;padding:8px 10px;font-size:11.5px;color:var(--ink-2)}.cxa-mini b{display:block;font-size:15px;color:var(--ink);font-variant-numeric:tabular-nums;margin-top:2px}.cxa-mini b.neg{color:var(--bad)}
.cxa-st{display:flex;flex-wrap:wrap;gap:6px}.cxa-st button{padding:0;border:0;background:none;border-radius:20px;box-shadow:none;display:inline-flex}.cxa-st button[aria-pressed="true"] .chip{outline:2px solid var(--ink);outline-offset:1px}
@media print{.cxa-aud{grid-template-columns:1fr!important}.cxa-accs{display:none}.cxa .tbl-wrap,.cxa-dw{max-height:none!important;overflow:visible!important}.cxa-g2,.cxa-g3{grid-template-columns:1fr 1fr!important}}
.cxa-fg{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}.cxa-fg select{min-width:150px;max-width:260px}.cxa-fg .chip{cursor:pointer}
.cxa-rk td{font-size:12.5px}.cxa-rk tr.l2 td:first-child{padding-left:22px;color:var(--ink-2)}
.cxa-dv{border-bottom:1px solid var(--surface-2);padding:6px 0}.cxa-dv summary{cursor:pointer;font-size:12.5px;list-style:none}.cxa-dv .dd{display:block;color:var(--ink-2);font-size:12px;margin-top:3px}
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
  for(const per of Object.keys(p)){const o=p[per];o.mov=abrir(o.movimentos?.conteudo);o.aud=abrir(o.auditoria?.conteudo);o.res=o.resumo?.conteudo||{};o._v={};o.grupo=o.mov.some(x=>x.empresa)}
  return X.cache[emp]=p}
// ---------- grupo: filtros Regional › Cidade › Empresa › Obra (o painel traz várias empresas no mesmo cadastro)
const FIL=[['reg','Regional','regional'],['cid','Cidade','cidade'],['emp','Empresa','empresa'],['obra','Obra','centro_custo']];
function opcoes(o){const f=X.f,r={};for(const [k,,c] of FIL)r[k]=new Map();
  for(const x of o.mov){const ok=i=>FIL.slice(0,i).every(([k,,c])=>!f[k]||x[c]===f[k]);
    FIL.forEach(([k,,c],i)=>{if(ok(i)&&x[c]&&x[c]!=='—'&&!(k==='obra'&&!['Receitas','Pagamentos'].includes(x.grupo))){r[k].set(x[c],(r[k].get(x[c])||0)+Math.abs(x.valor))}})}
  return r}
function vista(o){if(!o.grupo)return o;const f=X.f,key=FIL.map(([k])=>f[k]).join('|');if(o._v[key])return o._v[key];
  if(!FIL.some(([k])=>f[k]))return o._v[key]=Object.assign(Object.create(o),{_arv:null});
  const pm=x=>FIL.every(([k,,c])=>!f[k]||x[c]===f[k]);
  const mov=o.mov.filter(pm),emps=new Set(mov.map(x=>x.empresa));if(f.emp)emps.add(f.emp);
  const porEmp=x=>emps.has(x.empresa)&&(!f.reg||!x.regional||x.regional===f.reg||f.emp);
  const conc=(o.res.conciliacao||[]).filter(porEmp),contas=new Set(conc.map(c=>c.conta_bancaria));
  const fc=o.res.forecast?{...o.res.forecast,linhas:o.res.forecast.linhas.filter(l=>!l.empresa||emps.has(l.empresa))}:null;
  const ab={};for(const a of (o.res.abas||[]).filter(a=>!a.empresa||emps.has(a.empresa))){const t=ab[a.aba]||(ab[a.aba]={...a,linhas:0,no_extrato:0,total:0,sem_par:0,base_real:a.base_real==null?null:0});t.linhas+=a.linhas;t.no_extrato+=a.no_extrato;t.total+=a.total;t.sem_par+=a.sem_par||0;if(t.base_real!=null)t.base_real+=+a.base_real||0}
  const res={...o.res,conciliacao:conc,forecast:fc,abas:Object.values(ab),fluxo_v07:(o.res.fluxo_v07||[]).filter(r=>!r.empresa||emps.has(r.empresa)),divergencias:(o.res.divergencias||[]).filter(d=>!d.empresa||emps.has(d.empresa))};
  const aud=o.aud.filter(a=>a.empresa?emps.has(a.empresa)||contas.has(a.conta_bancaria)&&f.emp==='':contas.has(a.conta_bancaria));
  return o._v[key]=Object.assign(Object.create(o),{mov,aud,res,_arv:null,parcial:!!(f.cid||f.obra)})}
function barraFiltros(o){if(!o.grupo)return '';const op=opcoes(o),nE=new Set(o.mov.map(x=>x.empresa)).size;
  const sel=([k,t])=>{const it=[...op[k].entries()].sort((a,b)=>k==='obra'?b[1]-a[1]:a[0].localeCompare(b[0],'pt-BR',{numeric:true}));
    return `<label class="hint">${t}<br><select class="v3-sel" data-cxaf="${k}"><option value="">Todas (${it.length})</option>${it.map(([v])=>`<option value="${esc(v)}" ${X.f[k]===v?'selected':''}>${esc(k==='emp'||k==='obra'?nm(v)||v:v)}</option>`).join('')}</select></label>`};
  const on=FIL.filter(([k])=>X.f[k]);
  return `<div class="panel cxa-fg" data-nao-imprime><span class="hint" style="align-self:center;max-width:220px"><b>Grupo · ${nE} empresas</b><br>Filtre para ver uma regional, cidade, empresa ou obra.</span>${FIL.map(sel).join('')}${on.length?`<button type="button" class="btn ghost" data-cxaflimpa="1">Limpar filtros</button>`:''}</div>`}
function filtroTxt(){return FIL.filter(([k])=>X.f[k]).map(([k,t])=>t+': '+(k==='emp'||k==='obra'?nm(X.f[k]):X.f[k])).join(' · ')}

// ---------- formatos: real e orçado sempre em reais inteiros; nomes sem os códigos do plano
const I0=v=>{const r=Math.round(+v||0);return (r<0?'−':'')+Math.abs(r).toLocaleString('pt-BR')};
const SG=v=>{const r=Math.round(+v||0);return (r>0?'+':'')+I0(r)};
const PC=(r,o)=>o?((Math.abs(r)/Math.abs(o)-1)*100).toFixed(1).replace('.',',').replace(/^(?!-)/,'+')+'%':'—';
const cod=s=>{const m=String(s||'').match(/^[\d.]+/);return m?m[0].replace(/\.$/,''):String(s||'')};
function nm(s){s=String(s??'').trim().replace(/^[\d.]+\s*(\(\+\)|\(-\))?\s*/,'').replace(/^[A-Z]?\d+\s*-\s*/,'').replace(/^[\s-]+|[\s-]+$/g,'');
  return /[a-zà-ú]/.test(s)?s:s.charAt(0)+s.slice(1).toLowerCase()}
const BANCOS={'1':'BB','001':'BB','033':'Santander','065':'Andbank','65':'Andbank','104':'Caixa','237':'Bradesco','246':'ABC','341':'Itaú','748':'Sicredi','756':'Sicoob','077':'Inter','260':'Nubank'};
const banco=c=>{const [b,n]=String(c||'').split('|');return n?(BANCOS[b]||'Banco '+b)+' · '+n:String(c||'')};
const mesN=()=>+String(X.per||'').slice(5,7)||10;
function prodDe(o,m){if(m.produto)return m.produto;const p=(m.chave||'').split('-')[2];const mp=o.res.produtos||{};return p&&mp[p]?nm(mp[p]):'Sem produto'}

// orçado do mês por conta do fluxo (linhas Prev do FLUXO)
function orcado(o){const F=o.res.forecast;const r={};if(!F)return r;const i=mesN()-1;for(const l of F.linhas){r[l.conta]=(r[l.conta]||0)+(+l.P[i]||0)}return r}
function totais(o){const m=o.mov,s=f=>sum(m.filter(f).map(x=>x.valor));const c=o.res.conciliacao||[];
  const ini=sum(c.map(x=>x.saldo_inicial)),rec=s(x=>x.grupo==='Receitas'),pag=s(x=>x.grupo==='Pagamentos'),tar=s(x=>x.grupo==='Tarifas e ajustes bancários'),
    apo=s(x=>x.grupo==='Aportes'),dis=s(x=>x.grupo==='Distribuições'),tr=s(x=>x.grupo==='Transferências entre contas'),adm=s(x=>x.grupo==='Taxa ADM');
  return {ini,rec,pag,tar,apo,dis,tr,adm,fim:ini+rec+pag+tar+apo+dis+tr}}

// ---------- 1. Visão geral
function ponte(T){const st=[['Saldo inicial',T.ini,1],['Recebimentos',T.rec],['Pagamentos',T.pag],['Tarifas e ajustes',T.tar],['Aportes',T.apo],['Distribuições',T.dis],['Saldo final',T.fim,1]];
  let run=0,lo=Infinity,hi=-Infinity;for(const [,v,t] of st){if(t){run=v;lo=Math.min(lo,v);hi=Math.max(hi,v)}else{const a=run;run+=v;lo=Math.min(lo,a,run);hi=Math.max(hi,a,run)}}
  const span=(hi-lo)||1;lo-=span*.9;hi+=span*.12;
  const W=700,H=300,pb=40,y=v=>16+(hi-v)/(hi-lo)*(H-pb-16),bw=W/st.length;run=0;let sv='';
  st.forEach(([n,v,t],i)=>{const x=i*bw+8,w=bw-16;let a,b,cor;if(t){a=lo;b=v;run=v;cor='var(--accent,#0d5f73)'}else{a=run;b=run+v;run+=v;cor=v>=0?'var(--good)':'var(--bad)'}
    const y1=y(Math.max(a,b)),h=Math.max(y(Math.min(a,b))-y1,2);
    sv+=`<rect x="${x}" y="${y1}" width="${w}" height="${h}" rx="3" fill="${cor}"><title>${n}: R$ ${I0(v)}</title></rect><text x="${x+w/2}" y="${y1-6}" class="cxa-vl">${I0(v)}</text><text x="${x+w/2}" y="${H-pb+17}" class="cxa-xl">${n}</text>`;
    if(i<st.length-1)sv+=`<line x1="${x+w}" x2="${x+bw+8}" y1="${y(run)}" y2="${y(run)}" stroke="var(--ink-3)" stroke-dasharray="3 3"/>`});
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Ponte do caixa do saldo inicial ao final">${sv}</svg>`}
function telaVisao(o){const T=totais(o),O=orcado(o),m=o.mov;
  const oRec=sum(Object.entries(O).filter(([c])=>c.startsWith('1.01')).map(e=>e[1])),oPag=sum(Object.entries(O).filter(([c])=>c.startsWith('2.')&&!c.startsWith('2.12')&&!c.startsWith('2.10')).map(e=>e[1]));
  const vs=(r,o_)=>{if(!o_)return '';const p=(Math.abs(r)/Math.abs(o_)-1)*100,bom=r>0?p>=0:p<=0;return `<span class="chip ${bom?'good':'bad'}">${PC(r,o_)} vs orçado</span>`};
  const card=(t,v,d,c)=>`<div class="v3-k cxa-k"><span class="t">${t}</span><span class="v ${v<0?'neg':''}">R$ ${I0(v)}</span><span class="d">${d}</span>${c||''}</div>`;
  // orçado × realizado por conta do fluxo
  const R_={};for(const x of m)if(x.fluxo_tipo&&/^[12]/.test(x.fluxo_tipo)&&x.grupo!=='Aportes')R_[x.fluxo_conta]=(R_[x.fluxo_conta]||0)+x.valor;
  const cts=[...new Set([...Object.keys(O),...Object.keys(R_)])].filter(c=>/^[12]/.test(c)&&Math.abs(O[c]||0)+Math.abs(R_[c]||0)>1).sort((a,b)=>cod(a).localeCompare(cod(b),undefined,{numeric:true}));
  const mx=Math.max(1,...cts.map(c=>Math.max(Math.abs(O[c]||0),Math.abs(R_[c]||0))));
  const linhasOR=cts.map(c=>{const o_=O[c]||0,r=R_[c]||0,d=r-o_;return `<tr class="click" data-cxadrill="${esc(c)}"><td class="txt">${esc(nm(c))}</td><td class="cxa-bar"><i class="o" style="width:${Math.abs(o_)/mx*100}%"></i><i class="${c[0]==='1'?'e':'s'}" style="width:${Math.abs(r)/mx*100}%"></i></td><td class="n">${I0(o_)}</td><td class="n"><b>${I0(r)}</b></td><td class="n ${d>=0?'pos':'neg'}">${SG(d)}</td></tr>`}).join('');
  // recebimentos por tipo de parcela
  const tp={};for(const x of m)if(x.grupo==='Receitas'){const t=(x.categoria||'').split('· ').pop()||'Outros';tp[t]=(tp[t]||0)+x.valor}
  const barras=(obj,cls)=>{const it=Object.entries(obj).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));const mm=Math.abs(it[0]?.[1]||1),tt=sum(it.map(e=>Math.abs(e[1])))||1;
    return it.map(([n,v])=>`<div class="cxa-hb"><span class="hn">${esc(n)}</span><span class="ht"><i class="${cls}" style="width:${Math.abs(v)/mm*100}%"></i></span><span class="hv">${I0(v)}</span><span class="hp">${Math.round(Math.abs(v)/tt*100)}%</span></div>`).join('')};
  // pagamentos por obra › produto
  const ob={};for(const x of m)if(x.grupo==='Pagamentos'){const a=nm(x.centro_custo)||'Sem obra',p=nm(prodDe(o,x));const t=ob[a]||(ob[a]={v:0,p:{}});t.v+=x.valor;t.p[p]=(t.p[p]||0)+x.valor}
  const obs=Object.entries(ob).sort((a,b)=>a[1].v-b[1].v).slice(0,o.grupo?12:999),mo=Math.abs(obs[0]?.[1].v||1),to=sum(obs.map(e=>Math.abs(e[1].v)))||1;
  const arv=obs.map(([a,t])=>`<div class="cxa-hb"><span class="hn"><b>${esc(a)}</b></span><span class="ht"><i class="s" style="width:${Math.abs(t.v)/mo*100}%"></i></span><span class="hv"><b>${I0(t.v)}</b></span><span class="hp">${Math.round(Math.abs(t.v)/to*100)}%</span></div>`
    +Object.entries(t.p).sort((a,b)=>a[1]-b[1]).slice(0,6).map(([p,v])=>`<div class="cxa-hb pr"><span class="hn">${esc(p)}</span><span class="ht"><i class="s2" style="width:${Math.abs(v)/mo*100}%"></i></span><span class="hv">${I0(v)}</span><span class="hp">${t.v?Math.round(v/t.v*100):0}%</span></div>`).join('')).join('');
  // movimento por conta bancária com tarifas pagas
  const bk={};for(const x of m){const b=bk[x.conta_bancaria]||(bk[x.conta_bancaria]={e:0,s:0,t:0});if(x.valor>=0)b.e+=x.valor;else b.s+=x.valor;
    if(x.grupo==='Tarifas e ajustes bancários'&&x.valor<0&&/Tarifa|Imposto/i.test(x.categoria||''))b.t+=x.valor}
  delete bk.calculado;const bks=Object.entries(bk).sort((a,b)=>(Math.abs(b[1].e)+Math.abs(b[1].s))-(Math.abs(a[1].e)+Math.abs(a[1].s))).slice(0,o.grupo?25:999);
  const rk=o.grupo?ranking(o):'';
  const conf=m.filter(x=>x.conferido_no_banco==='sim').length;
  const nl=sum(m.map(x=>x.qtd||1));
  return `<p class="cxa-lead">Realizado 100% das planilhas do cliente: <b>${num.format(nl)}</b> lançamentos de ${MES(X.per)}${o.grupo?` em <b>${new Set(m.map(x=>x.empresa)).size}</b> empresas`:''}, <b>${num.format(sum(m.filter(x=>x.conferido_no_banco==='sim').map(x=>x.qtd||1)))}</b> conferidos no extrato do banco. Orçado do FLUXO do cliente. Valores em R$, sem centavos.${m.some(x=>x.grupo==='Taxa ADM')?` Taxa ADM de 4% calculada (R$ ${I0(sum(m.filter(x=>x.grupo==='Taxa ADM'&&x.valor<0).map(x=>x.valor)))}) aparece no fluxo, fora do saldo do banco${Math.abs(T.adm)<1?'; no grupo ela soma zero':''}.`:''}${o.parcial?' Com filtro de cidade ou obra, saldo inicial e orçado são os das empresas filtradas.':''}</p>
  <div class="v3-cards cxa-cards">${card('Saldo inicial',T.ini,'dia 1 · soma das contas')}${card('Recebimentos',T.rec,'orçado R$ '+I0(oRec),vs(T.rec,oRec))}${card('Pagamentos',T.pag,'orçado R$ '+I0(oPag),vs(T.pag,oPag))}${card('Geração operacional',T.rec+T.pag+T.tar,'recebimentos − pagamentos − tarifas')}${card('Aportes − distribuições',T.apo+T.dis,'aportes '+I0(T.apo)+' · distrib. '+I0(T.dis))}${card('Saldo final',T.fim,'variação no mês R$ '+I0(T.fim-T.ini))}</div>
  <div class="cxa-g2"><div class="panel cxa-sec"><h3>Ponte do caixa no mês</h3><p>Do saldo inicial ao final. Verde entra, vermelho sai.</p>${ponte(T)}</div>
   <div class="panel cxa-sec"><h3>Orçado × realizado por conta do fluxo</h3><p><span class="cxa-lg"><i class="o"></i>Orçado</span><span class="cxa-lg"><i class="e"></i>Realizado entrada</span><span class="cxa-lg"><i class="s"></i>Realizado saída</span> · clique para abrir no fluxo</p>
    <div class="tbl-wrap"><table class="cxa-or"><thead><tr><th>Conta</th><th></th><th class="n">Orçado</th><th class="n">Realizado</th><th class="n">Diferença</th></tr></thead><tbody>${linhasOR}</tbody></table></div></div></div>
  <div class="cxa-g2"><div class="cxa-sec" style="gap:14px"><div class="panel cxa-sec"><h3>Recebimentos por tipo de parcela</h3><p>Total R$ ${I0(T.rec)}</p>${barras(tp,'e')}</div>
   <div class="panel cxa-sec"><h3>Movimento por conta bancária</h3><p>Tarifas pagas já estão dentro das saídas. Clique para auditar a conta.</p><div class="tbl-wrap"><table class="cxa-bk"><thead><tr><th>Conta</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Tarifas pagas</th><th class="n">Líquido</th></tr></thead><tbody>
    ${bks.map(([c,b])=>`<tr class="click" data-cxaconta="${esc(c)}"><td style="white-space:nowrap">${esc(banco(c))}</td><td class="n pos">${I0(b.e)}</td><td class="n neg">${I0(b.s)}</td><td class="n neg">${I0(b.t)}</td><td class="n"><b>${I0(b.e+b.s)}</b></td></tr>`).join('')}</tbody></table></div></div></div>
   <div class="panel cxa-sec"><h3>Pagamentos por centro de custo (obra) › produto</h3><p>Total R$ ${I0(T.pag)} · % do produto dentro da obra${o.grupo&&Object.keys(ob).length>12?` · ${Object.keys(ob).length} obras, mostrando as 12 maiores`:''}</p>${arv}</div></div>${rk}`}
// por regional › empresa (grupo): clique filtra
function ranking(o){const g={};for(const x of o.mov){if(x.grupo==='Transferências entre contas')continue;const r=g[x.regional]||(g[x.regional]={e:{},t:{rec:0,pag:0,out:0}});const e=r.e[x.empresa]||(r.e[x.empresa]={rec:0,pag:0,out:0});
    const c=x.grupo==='Receitas'?'rec':x.grupo==='Pagamentos'?'pag':'out';e[c]+=x.valor;r.t[c]+=x.valor}
  const sc=new Map();for(const c of o.res.conciliacao||[])sc.set(c.empresa,(sc.get(c.empresa)||0)+c.saldo_final_extrato);
  const rs=Object.entries(g).sort((a,b)=>b[1].t.rec-a[1].t.rec);const um=rs.length===1;
  const lin=(n,t,cls,attr)=>`<tr class="${cls} click" ${attr}><td>${esc(n)}</td><td class="n pos">${I0(t.rec)}</td><td class="n neg">${I0(t.pag)}</td><td class="n">${I0(t.out)}</td><td class="n"><b>${I0(t.rec+t.pag+t.out)}</b></td>${t.sf==null?'<td></td>':`<td class="n">${I0(t.sf)}</td>`}</tr>`;
  let h='';for(const [r,v] of rs){const es=Object.entries(v.e).sort((a,b)=>b[1].rec-a[1].rec);v.t.sf=sum(es.map(([e])=>sc.get(e)||0));
    if(!um)h+=lin(r,v.t,'tot',`data-cxafset="reg" data-v="${esc(r)}"`);
    h+=es.slice(0,um?60:8).map(([e,t])=>lin(nm(e)||e,{...t,sf:sc.get(e)||0},'l2',`data-cxafset="emp" data-v="${esc(e)}"`)).join('')+(es.length>(um?60:8)?`<tr class="l2"><td colspan="6" class="cxa-q">+ ${es.length-(um?60:8)} empresas · filtre a regional para ver todas</td></tr>`:'')}
  return `<div class="panel cxa-sec"><h3>${um?'Empresas':'Regionais › empresas'} no mês</h3><p>Recebimentos, pagamentos e o resto (tarifas, aportes, distribuições, taxa ADM). Saldo final pelo extrato das contas da empresa. Clique para filtrar.</p>
   <div class="tbl-wrap"><table class="cxa-rk"><thead><tr><th>${um?'Empresa':'Regional / empresa'}</th><th class="n">Recebimentos</th><th class="n">Pagamentos</th><th class="n">Outros</th><th class="n">Resultado</th><th class="n">Saldo final</th></tr></thead><tbody>${h}</tbody></table></div></div>`}

// ---------- 2. Fluxo de caixa com drill nos níveis do Excel do cliente
const NIV=['Tipo','Conta','Sub conta','Descrição','Resumo','Obra','Lançamento'];
function arvore(o){if(o._arv)return o._arv;const sub=o.res.subcontas||{};const T={};
  const caminho=(tipo,conta,desc,sc,resumo,obra,real)=>{sc=sc||sub[cod(desc)]||desc;const p=[['Tipo',tipo],['Conta',conta],['Sub conta',sc]];
    if(cod(sc)!==cod(desc))p.push(['Descrição',desc]);if(real){p.push(['Resumo',resumo||'(sem resumo)']);p.push(['Obra',obra])}return p};
  const no=p=>{const k_=p.map(e=>e[1]).join('›');return T[k_]||(T[k_]={key:k_,nv:p[p.length-1][0],nome:p[p.length-1][1],nivel:p.length,pai:p.length>1?p.slice(0,-1).map(e=>e[1]).join('›'):null,r:0,o:0,n:0,orc:false,lanc:[]})};
  for(const x of o.mov){if(!x.fluxo_tipo||!/^[12]/.test(x.fluxo_tipo))continue;
    const p=caminho(x.fluxo_tipo,x.fluxo_conta,x.fluxo_descricao,x.fluxo_subconta,(x.servico_resumo||x.resumo_servico||'').trim(),nm(x.centro_custo)||'Sem obra',1);
    for(let i=1;i<=p.length;i++){const n=no(p.slice(0,i));n.r+=x.valor;n.n++;if(i===p.length)n.lanc.push(x)}}
  const F=o.res.forecast,mi=mesN()-1;
  if(F)for(const l of F.linhas){if(!/^[12]/.test(l.tipo))continue;const p=caminho(l.tipo,l.conta,l.descricao,null);for(let i=1;i<=p.length;i++){const n=no(p.slice(0,i));n.o+=+l.P[mi]||0;n.orc=true}}
  const kids={};for(const n of Object.values(T))if(n.pai!=null)(kids[n.pai]=kids[n.pai]||[]).push(n);
  for(const ks of Object.values(kids))ks.sort((a,b)=>cod(a.nome).localeCompare(cod(b.nome),undefined,{numeric:true}));
  for(const ks of Object.values(kids))if(['Resumo','Obra'].includes(ks[0].nv))ks.sort((a,b)=>Math.abs(b.r)-Math.abs(a.r));
  return o._arv={T,kids,raiz:Object.values(T).filter(n=>n.nivel===1).sort((a,b)=>a.nome.localeCompare(b.nome))}}
function telaDrill(o){const A=arvore(o);const nivelMax=X.dNivel??2;
  if(!X.dAb){X.dAb=new Set(Object.values(A.T).filter(n=>NIV.indexOf(n.nv)<nivelMax).map(n=>n.key));if(X.dFoco){let k_=X.dFoco;X.dAb.add(k_.split('›')[0]);X.dAb.add(k_)}}
  const ab=X.dAb;let h='';
  const pinta=n=>{if(Math.abs(n.o)<0.5&&Math.abs(n.r)<0.5)return;const ks=A.kids[n.key]||[],temF=ks.length||n.lanc.length,aberto=ab.has(n.key);
    const o_=n.orc?n.o:null,d=o_==null?null:n.r-o_,bom=d==null||d>=0,cls={'Tipo':'l1','Conta':'l2','Sub conta':'l3','Descrição':'l3','Resumo':'l4','Obra':'l4'}[n.nv];
    const nome=n.nv==='Tipo'?(n.nome.startsWith('1')?'Entradas':'Saídas'):nm(n.nome);
    h+=`<tr class="${cls} ${temF?'click':''}" ${temF?`data-cxadr="${esc(n.key)}"`:''}><td style="padding-left:${8+(n.nivel-1)*18}px"><span class="cxa-tg">${temF?(aberto?'▾':'▸'):''}</span>${esc(nome)}</td><td class="cxa-nv">${n.nv}</td>
      <td class="n">${o_==null?'':I0(o_)}</td><td class="n"><b>${I0(n.r)}</b></td><td class="n ${d==null?'':bom?'pos':'neg'}">${d==null?'':SG(d)}</td><td class="n ${d==null?'':bom?'pos':'neg'}">${o_==null?'':PC(n.r,o_)}</td><td class="n cxa-q">${n.n||''}</td></tr>`;
    if(!aberto)return;ks.forEach(pinta);
    if(n.lanc.length){const ls=n.lanc.slice().sort((a,b)=>a.data.localeCompare(b.data)||a.valor-b.valor),mx=X.dTodos===n.key?ls.length:30;
      h+=ls.slice(0,mx).map(x=>`<tr class="l5"><td style="padding-left:${8+n.nivel*18}px"><span class="cxa-dt">${dt(x.data).slice(0,5)}</span>${esc(nm(x.descricao)||x.categoria)}${x.categoria&&x.grupo==='Receitas'?' · '+esc(x.categoria.split('· ').pop()):''} <span class="cxa-q">${esc(banco(x.conta_bancaria))}</span>${x.conferido_no_banco==='sim'?' <span class="cxa-ok">✓ no extrato</span>':' <span class="chip bad">fora do extrato</span>'}</td><td class="cxa-nv">Lançamento</td><td></td><td class="n">${I0(x.valor)}</td><td></td><td></td><td></td></tr>`).join('');
      if(ls.length>mx)h+=`<tr class="l5 click" data-cxatodos="${esc(n.key)}"><td style="padding-left:${8+n.nivel*18}px" class="cxa-mais2">+ ${ls.length-mx} lançamentos · ver todos</td><td colspan="6"></td></tr>`}};
  A.raiz.forEach(pinta);
  const T=totais(o),E=A.raiz.find(n=>n.nome.startsWith('1'))||{r:0,o:0},S_=A.raiz.find(n=>n.nome.startsWith('2'))||{r:0,o:0};
  h+=`<tr class="tot"><td>Resultado do mês (entradas − saídas)</td><td></td><td class="n">${I0(E.o+S_.o)}</td><td class="n"><b>${I0(E.r+S_.r)}</b></td><td colspan="3"></td></tr>
   <tr class="l1"><td colspan="7">Saldo</td></tr><tr><td style="padding-left:26px">Saldo inicial</td><td></td><td></td><td class="n">${I0(T.ini)}</td><td colspan="3"></td></tr>
   <tr><td style="padding-left:26px">Rendimentos, tarifas e ajustes bancários</td><td></td><td></td><td class="n">${I0(T.tar)}</td><td colspan="3"></td></tr>
   ${Math.abs(T.adm)>0.5?`<tr><td style="padding-left:26px">Taxa ADM calculada (fora do banco, volta para o saldo)</td><td></td><td></td><td class="n">${I0(-T.adm)}</td><td colspan="3"></td></tr>`:''}
   ${Math.abs(T.apo+T.dis)>0.5&&o.grupo?`<tr><td style="padding-left:26px">Aportes e distribuições já estão nas entradas e saídas</td><td></td><td></td><td class="n">${I0(0)}</td><td colspan="3"></td></tr>`:''}
   ${Math.abs(T.tr)>0.5?`<tr><td style="padding-left:26px">Transferências entre contas</td><td></td><td></td><td class="n">${I0(T.tr)}</td><td colspan="3"></td></tr>`:''}
   <tr class="tot"><td>Saldo final</td><td></td><td></td><td class="n"><b>${I0(T.fim)}</b></td><td colspan="3"></td></tr>`;
  return `<div class="panel cxa-sec"><div class="v3-bar"><div><h3>Fluxo de caixa de ${MES(X.per)} · orçado × realizado</h3><p>Mesmos níveis do Excel do cliente: Tipo › Conta › Sub conta › Descrição › Resumo › Obra › Lançamento. Quando a descrição é igual à sub conta, o nível é pulado. Orçado vai até a descrição. Clique numa linha para abrir ou fechar.</p></div>
   <div class="v3-seg" role="group" aria-label="Abrir até">${NIV.map((t,i)=>`<button type="button" data-cxadn="${i}" aria-pressed="${nivelMax===i}">${t}</button>`).join('')}</div></div>
   <div class="tbl-wrap cxa-dw"><table class="cxa-dr"><thead><tr><th>Estrutura do fluxo</th><th>Nível</th><th class="n">Orçado</th><th class="n">Realizado</th><th class="n">Diferença</th><th class="n">Var. %</th><th class="n">Lanç.</th></tr></thead><tbody>${h}</tbody></table></div></div>`}

// ---------- 3. Auditoria por conta bancária
function telaAud(o){if(!o)return '';const c=(o.res.conciliacao||[]).filter(r=>Math.abs(r.entradas_extrato)+Math.abs(r.saidas_extrato)+Math.abs(r.entradas_base)+Math.abs(r.saidas_base)>0.5)
    .sort((a,b)=>(b.entradas_extrato+b.saidas_extrato)-(a.entradas_extrato+a.saidas_extrato));
  const contas=c.map(r=>r.conta_bancaria);if(!contas.includes(X.conta))X.conta=contas.includes('341|42921-0')?'341|42921-0':contas[0];
  const qc=norm(X.qc||'');const cv=c.filter(r=>!qc||norm([banco(r.conta_bancaria),r.empresa,r.descricao_conta].join(' ')).includes(qc)),LIM=40;
  const sel=c.find(r=>r.conta_bancaria===X.conta)||{};
  const st=d=>Math.abs(d)<1?chip('Batido','good'):chip('Diferença '+I0(d),'warn');
  const lista=(o.grupo?`<label class="hint" style="display:block;margin-bottom:8px">Buscar conta (${c.length})<br><input id="cxaBuscaC" class="v3-sel" type="search" value="${esc(X.qc||'')}" placeholder="banco, número ou empresa" style="width:100%"></label>`:'')+cv.slice(0,LIM).map(r=>`<button type="button" class="cxa-acc" data-cxaconta="${esc(r.conta_bancaria)}" aria-pressed="${r.conta_bancaria===X.conta}"><span class="ah"><b>${esc(banco(r.conta_bancaria))}</b>${st(r.diferenca)}</span>${r.empresa?`<span class="hint" style="display:block;margin:-2px 0 6px">${esc(nm(r.empresa))}</span>`:''}
    <span class="ag"><span>Saldo inicial</span><span class="n">${I0(r.saldo_inicial)}</span><span>Entradas extrato / planilhas</span><span class="n">${I0(r.entradas_extrato)} / ${I0(r.entradas_base)}</span><span>Saídas extrato / planilhas</span><span class="n">${I0(-r.saidas_extrato)} / ${I0(-r.saidas_base)}</span><span>Saldo final extrato</span><span class="n"><b>${I0(r.saldo_final_extrato)}</b></span></span></button>`).join('')+(cv.length>LIM?`<p class="cxa-mais">Mostrando ${LIM} de ${cv.length} contas, as de maior movimento. Use a busca ou os filtros.</p>`:'');
  return `<div class="cxa-aud"><div class="cxa-accs">${lista}<p class="cxa-mais">Contas sem movimento no mês ficam fora da lista.</p></div>
   <div class="panel cxa-sec"><h3>${esc(banco(X.conta))} · conta selecionada${sel.empresa?` <span class="hint">${esc(nm(sel.empresa))}</span>`:''}</h3><p>Extrato do mês × lançamentos das planilhas (pagas, recebidas, transferências e tarifas), linha a linha. Clique num status para filtrar.</p>
    <div class="cxa-mini"><div>Saldo inicial<b>${I0(sel.saldo_inicial)}</b></div><div>Entradas extrato / planilhas<b>${I0(sel.entradas_extrato)}</b>${I0(sel.entradas_base)}</div><div>Saídas extrato / planilhas<b>${I0(-sel.saidas_extrato)}</b>${I0(-sel.saidas_base)}</div><div>Diferença extrato − planilhas<b class="${Math.abs(sel.diferenca||0)<1?'':'neg'}">${I0(sel.diferenca)}</b></div></div>
    <div class="cxa-st" id="cxaSt"></div>
    <label class="hint">Buscar<br><input id="cxaBusca" class="v3-sel" type="search" value="${esc(X.q)}" placeholder="histórico, fornecedor, documento"></label>
    <div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Histórico no extrato</th><th class="n">Extrato</th><th>Lançamento nas planilhas</th><th class="n">Planilhas</th><th class="n">Diferença</th><th>Status</th></tr></thead><tbody id="cxaAud"></tbody></table></div>
    <p class="cxa-mais" id="cxaMais"></p></div></div>`}
const STN={'Depósito de cliente (conferido no total da conta)':'Depósito de cliente','Repetido no extrato (contado uma vez)':'Repetido no extrato','Conferido (vários lançamentos)':'Conferido (vários)','Total de recebimentos da conta':'Total de recebimentos'};
function pintarAud(){const o=X.atual;const tb=document.getElementById('cxaAud');if(!o||!tb)return;
  const base=o.aud.filter(a=>a.conta_bancaria===X.conta);const st={};for(const a of base){const s=st[a.status]||(st[a.status]={n:0});s.n++}
  document.getElementById('cxaSt').innerHTML=Object.entries(st).sort((a,b)=>b[1].n-a[1].n).map(([s,x])=>`<button type="button" data-cxast="${esc(s)}" aria-pressed="${X.status===s}">${chip((STN[s]||s)+' · '+num.format(x.n),STC[s])}</button>`).join('');
  const q=norm(X.q);let rows=base.filter(a=>(!X.status||a.status===X.status)&&(!q||norm([a.historico_extrato,a.lancamentos_base,a.documento].join(' ')).includes(q)));
  rows=rows.slice().sort((a,b)=>a.data.localeCompare(b.data));const tot=rows.length;rows=rows.slice(0,400);
  const vext=a=>{if(a.valor_extrato==null&&/^Total de recebimentos/.test(a.status)){const mm=String(a.historico_extrato||'').match(/R\$ ([\d.]+),(\d\d)/);if(mm)return +(mm[1].replace(/\./g,'')+'.'+mm[2])}return a.valor_extrato};
  tb.innerHTML=rows.length?rows.map(a=>{const dep=/^Depósito de cliente/.test(a.status),ve=vext(a),d=(+ve||0)-(+a.valor_base||0);
    return `<tr><td>${dt(a.data).slice(0,5)}</td><td class="txt">${esc(/^Total de recebimentos/.test(a.status)?'Total de depósitos de clientes no mês':nm(a.historico_extrato)||'—')}</td><td class="n">${ve==null?'—':I0(ve)}</td><td class="det">${esc(nm(a.lancamentos_base)||'—')}${a.qtd_lancamentos>1?` (${a.qtd_lancamentos})`:''}</td>
    <td class="n">${dep?'<span class="cxa-q">no total</span>':a.valor_base==null?'—':I0(a.valor_base)}</td><td class="n ${dep?'':Math.abs(d)<1?'pos':'neg'}">${dep?'<span class="cxa-q">no total</span>':I0(d)}</td><td>${chip(STN[a.status]||a.status,STC[a.status])}</td></tr>`}).join(''):'<tr><td colspan="7">Nada nesta conta com esse filtro.</td></tr>';
  document.getElementById('cxaMais').textContent=tot>400?`Mostrando 400 de ${num.format(tot)} linhas. Use a busca ou clique num status para filtrar.`:`${num.format(tot)} linha${tot===1?'':'s'}. Depósitos de clientes são conferidos pelo total do mês, porque o extrato traz os créditos sem centavos.`}

// ---------- 4. Confronto planilhas × FLUXO do cliente
function telaConfronto(o){const f=(o.res.fluxo_v07||[]).map(r=>({...r,base_teste:+r.base_teste||0,real_out26_v07:+r.real_out26_v07||0}));
  const tt=sum(f.map(r=>r.base_teste)),tv=sum(f.map(r=>r.real_out26_v07)),ok=f.filter(r=>Math.abs(r.base_teste-r.real_out26_v07)<1).length;
  const ne=new Set(f.map(r=>r.empresa).filter(Boolean)).size;
  const g0={};for(const r of f){r.fluxo_conta=r.fluxo_conta||'Sem classificação no fluxo (falta no de-para)';r.fluxo_descricao=r.fluxo_descricao||'Sem classificação';const k_=r.fluxo_conta+'\u0001'+r.fluxo_descricao;const t=g0[k_]||(g0[k_]={...r,base_teste:0,real_out26_v07:0});t.base_teste+=r.base_teste;t.real_out26_v07+=r.real_out26_v07}
  const f2=Object.values(g0).sort((a,b)=>cod(a.fluxo_conta).localeCompare(cod(b.fluxo_conta),undefined,{numeric:true})||cod(a.fluxo_descricao).localeCompare(cod(b.fluxo_descricao),undefined,{numeric:true}));
  const g={};for(const r of f2)(g[r.fluxo_conta]=g[r.fluxo_conta]||[]).push(r);
  let rows='';for(const [c,fs] of Object.entries(g)){const a=sum(fs.map(r=>r.base_teste)),b=sum(fs.map(r=>r.real_out26_v07)),d=a-b;
    rows+=`<tr class="tot"><td>${esc(nm(c))}</td><td class="n">${I0(a)}</td><td class="n">${I0(b)}</td><td class="n ${Math.abs(d)<1?'pos':'neg'}">${I0(d)}</td><td>${Math.abs(d)<1?chip('Bate','good'):chip('Diferença','warn')}</td></tr>`;
    if(fs.length>1||Math.abs(d)>=1)rows+=fs.map(r=>{const d2=r.base_teste-r.real_out26_v07;return `<tr class="click" data-cxadrill="${esc(c)}"><td style="padding-left:24px;color:var(--ink-2)">${esc(nm(r.fluxo_descricao))}</td><td class="n">${I0(r.base_teste)}</td><td class="n">${I0(r.real_out26_v07)}</td><td class="n ${Math.abs(d2)<1?'pos':'neg'}">${I0(d2)}</td><td></td></tr>`}).join('')}
  const ab0={};for(const a of o.res.abas||[]){const t=ab0[a.aba]||(ab0[a.aba]={...a,linhas:0,no_extrato:0,total:0,base_real:a.base_real==null?null:0});t.linhas+=a.linhas;t.no_extrato+=a.no_extrato;t.total+=a.total;if(t.base_real!=null)t.base_real+=+a.base_real||0}const ab=Object.values(ab0);
  const abas=ab.map(a=>`<tr><td><b>${esc(a.aba)}</b></td><td class="n">${num.format(a.linhas)}</td><td class="n">${num.format(a.no_extrato)}</td><td class="n">${I0(a.total)}</td><td class="n">${a.base_real==null?'<span class="cxa-q">não tem no FLUXO</span>':I0(a.base_real)}</td><td class="det" style="min-width:200px">${esc(String(a.obs||'').replace(/\(\d[\d.]*\)\s*/g,''))}</td></tr>`).join('');
  const dv={};for(const d of o.res.divergencias||[])(dv[d.tipo]=dv[d.tipo]||[]).push(d);
  const cor=t=>/repetida|Pré-classificado/i.test(t)?'warn':/fora d[oa]s? (abas|extrato)|Sem classificação/i.test(t)?'bad':'info';
  const divs=Object.entries(dv).map(([t,ds])=>`<details class="cxa-dv"><summary>${chip(t,cor(t))} <b>${num.format(ds.length)}</b> · R$ ${I0(sum(ds.map(d=>+d.valor||0)))}<span class="dd">${esc(ds[0].detalhe)}</span></summary>
    <div class="tbl-wrap"><table><tbody>${ds.slice(0,300).map(d=>`<tr><td>${esc(d.empresa?nm(d.empresa):'')}</td><td>${esc(banco(d.conta_bancaria))}</td><td>${dt(d.data)}</td><td class="n">${I0(d.valor)}</td><td class="det">${esc(d.detalhe)}</td></tr>`).join('')}${ds.length>300?`<tr><td colspan="5" class="cxa-q">Mostrando 300 de ${num.format(ds.length)}. Filtre uma empresa para ver todas.</td></tr>`:''}</tbody></table></div></details>`).join('');
  const k4=(t,v,d,neg)=>`<div class="v3-k cxa-k"><span class="t">${t}</span><span class="v ${neg?'neg':''}">${v}</span><span class="d">${d}</span></div>`;
  return `<p class="cxa-lead">Única tela que usa o FLUXO do cliente como realizado, só para comparar com as planilhas do mês.</p>
  <div class="v3-cards cxa-cards">${k4('Total nas planilhas','R$ '+I0(tt),'contas pagas + recebidas')}${k4('Total no FLUXO (real do mês)','R$ '+I0(tv),'mesmas contas')}${k4('Diferença planilhas − FLUXO','R$ '+I0(tt-tv),'explicada abaixo',Math.abs(tt-tv)>=1)}${k4('Descrições que batem',ok+' de '+f.length,ne>1?'por empresa · diferença menor que R$ 1':'diferença menor que R$ 1')}</div>
  <div class="cxa-sec" style="gap:14px"><div class="panel cxa-sec"><h3>Planilhas × FLUXO por conta e descrição</h3><p>Clique numa descrição para abrir no fluxo.</p><div class="tbl-wrap"><table><thead><tr><th>Conta / descrição</th><th class="n">Planilhas</th><th class="n">FLUXO</th><th class="n">Diferença</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
   <div class="cxa-sec" style="gap:14px"><div class="panel cxa-sec"><h3>Conferência de cada aba</h3><p>Quantas linhas acharam par no extrato e se o total bate com o FLUXO.</p><div class="tbl-wrap"><table><thead><tr><th>Aba</th><th class="n">Linhas</th><th class="n">No extrato</th><th class="n">Total</th><th class="n">No FLUXO</th><th>Observação</th></tr></thead><tbody>${abas}</tbody></table></div></div>
   <div class="panel cxa-sec"><h3>Divergências encontradas</h3><p>Clique num tipo para ver as linhas.</p>${divs}</div></div></div>`}

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
  if(!pers.includes(X.per))X.per=pers[0];const o0=p[X.per];if(!o0.grupo)X.f={reg:'',cid:'',emp:'',obra:''};const o=X.atual=vista(o0);
  const tabs=[['visao','Visão geral'],['drill','Fluxo de caixa (drill)'],['auditoria','Auditoria por conta'],['confronto','Confronto planilhas × FLUXO']];
  if(!tabs.some(t=>t[0]===X.tab))X.tab='visao';
  const corpo=!o.mov.length&&o0.grupo?'':X.tab==='drill'?telaDrill(o):X.tab==='auditoria'?telaAud(o):X.tab==='confronto'?telaConfronto(o):telaVisao(o);
  if(X.tab==='auditoria')setTimeout(pintarAud,0);
  return `<div class="v3 cxa"><div class="v3-bar"><div class="v3-seg" role="tablist">${tabs.map(([k_,n])=>`<button type="button" aria-pressed="${X.tab===k_}" data-cxatab="${k_}">${n}</button>`).join('')}</div>
   <div class="v3-fl">${emps.length>1?selE:''}<span class="v3-acts" data-nao-imprime><button class="btn ghost" type="button" data-cxaexp="pdf">Exportar PDF</button><button class="btn ghost" type="button" data-cxaexp="excel">Excel</button></span>${subir}<label class="hint">Mês<br><select id="cxaPer" class="v3-sel">${pers.map(x=>`<option value="${x}" ${x===X.per?'selected':''}>${MES(x)}</option>`).join('')}</select></label></div></div>
   ${barraFiltros(o0)}${o0.grupo&&!o.mov.length?vazio('Nada com esse filtro','<p style="margin:0">Troque ou limpe os filtros.</p>'):corpo}
   <p class="cxa-mais">Fonte: ${esc(o.res.fonte||o.resumo?.fonte||'planilhas do cliente')}. Atualizado em ${dt((o.resumo?.atualizado_em||'').slice(0,10))}.</p></div>`}

document.addEventListener('click',ev=>{const t=ev.target.closest('[data-cxatab],[data-cxast],[data-cxaconta],[data-cxadr],[data-cxadn],[data-cxadrill],[data-cxatodos],[data-cxaexp],[data-cxafset],[data-cxaflimpa]');if(!t||!document.querySelector('.cxa'))return;
  if(t.dataset.cxaflimpa){X.f={reg:'',cid:'',emp:'',obra:''};X.dAb=null;X.conta=null;render(true);return}
  if(t.dataset.cxafset){X.f[t.dataset.cxafset]=t.dataset.v;if(t.dataset.cxafset==='reg'){X.f.cid='';X.f.emp='';X.f.obra=''}else X.f.obra='';X.dAb=null;X.conta=null;render(true);return}
  if(t.dataset.cxaexp){const nomes={visao:'Visão geral',drill:'Fluxo de caixa (drill)',auditoria:'Auditoria por conta',confronto:'Confronto planilhas × FLUXO'};
    const sub=(nomes[X.tab]||'')+' · '+MES(X.per)+(filtroTxt()?' · '+filtroTxt():'')+(X.tab==='auditoria'&&X.conta?' · '+banco(X.conta)+(X.status?' · '+(STN[X.status]||X.status):''):'');
    const f=t.dataset.cxaexp==='pdf'?window.relatorioPDF:window.relatorioExcel;if(f)f({sub});else toast('Recarregue a página para exportar.');return}
  if(t.dataset.cxatab){X.tab=t.dataset.cxatab;render(true)}
  else if(t.dataset.cxast!=null){X.status=X.status===t.dataset.cxast?'':t.dataset.cxast;pintarAud()}
  else if(t.dataset.cxadn!=null){X.dNivel=+t.dataset.cxadn;X.dAb=null;X.dFoco=null;render(true)}
  else if(t.dataset.cxadr){const a=X.dAb=X.dAb||new Set();a.has(t.dataset.cxadr)?a.delete(t.dataset.cxadr):a.add(t.dataset.cxadr);render(true)}
  else if(t.dataset.cxatodos){X.dTodos=t.dataset.cxatodos;render(true)}
  else if(t.dataset.cxadrill){const c=t.dataset.cxadrill,tipo=c.startsWith('1')?'1. ENTRADAS (+)':'2. SAÍDAS (-)';X.dNivel=1;X.dAb=null;X.dFoco=tipo+'›'+c;X.tab='drill';render(true)}
  else if(t.dataset.cxaconta){X.conta=t.dataset.cxaconta;X.status='';X.tab='auditoria';render(true)}});
document.addEventListener('change',ev=>{const t=ev.target;if(t.dataset&&t.dataset.cxaf){const k_=t.dataset.cxaf,i=FIL.findIndex(f=>f[0]===k_);X.f[k_]=t.value;FIL.slice(i+1).forEach(([k2])=>X.f[k2]='');X.dAb=null;X.conta=null;render(true);return}
  if(t.id==='cxaEmp'){X.emp=t.value;X.per=null;X.dAb=null;X.f={reg:'',cid:'',emp:'',obra:''};render(true)}else if(t.id==='cxaPer'){X.per=t.value;X.dAb=null;render(true)}});
// arquivo do painel: {periodo:'AAAA-MM', fonte, resumo, movimentos, auditoria} montado pela Gevans a partir das planilhas
async function subirPainel(f){try{const j=JSON.parse(await f.text());
  if(!/^\d{4}-\d{2}$/.test(j.periodo||'')||!j.resumo||!j.movimentos?.rows||!j.auditoria?.rows)throw new Error('Arquivo não é um painel de caixa da Gevans.');
  if(j.empresa&&!confirm(`Subir o painel de ${MES(j.periodo)} (${j.empresa}) em ${nomeEmp(empresa(X.emp))}? Se o mês já existir, ele é substituído.`))return;
  const rows=[['resumo','Resumo, conferência e fluxo'],['movimentos','Movimentos com as colunas do fluxo'],['auditoria','Auditoria do extrato por conta']].map(([pt,t])=>({empresa_id:X.emp,periodo:j.periodo,parte:pt,titulo:t,fonte:j.fonte||f.name,conteudo:j[pt],atualizado_em:new Date().toISOString()}));
  for(const r of rows){toast('Subindo '+r.titulo.toLowerCase()+'…');const {error}=await sb.from('dados_paineis').upsert([r],{onConflict:'empresa_id,periodo,parte'});if(error)throw error}
  delete X.cache[X.emp];X.per=j.periodo;toast('Painel de '+MES(j.periodo)+' carregado.');render(true)}
 catch(e){console.warn(e);toast(traduz(e))}}
document.addEventListener('change',ev=>{if(ev.target.id==='cxaArq'&&ev.target.files[0])subirPainel(ev.target.files[0])});
document.addEventListener('input',ev=>{if(ev.target.id==='cxaBusca'){X.q=ev.target.value;pintarAud()}
  else if(ev.target.id==='cxaBuscaC'){X.qc=ev.target.value;clearTimeout(X._tq);X._tq=setTimeout(()=>{render(true);setTimeout(()=>{const i=document.getElementById('cxaBuscaC');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)},350)}});

if(!ROTAS.some(x=>x[0]==='caixa'))ROTAS.push(['caixa','Caixa e auditoria']);
TITULOS.caixa='Caixa e auditoria';VIEWS.caixa=vCaixa;
})();
