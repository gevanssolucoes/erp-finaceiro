// ===================== Gevans Dados · Caixa e auditoria (painéis prontos por empresa, migração 0033)
// Mostra o caixa do mês montado a partir das planilhas do cliente (receitas, contas pagas, transferências, tarifas),
// o fluxo na estrutura do cliente (Fluxo_Conta / Fluxo_Descricao e as colunas de apresentação),
// a conferência com o extrato conta a conta e a auditoria linha a linha de cada conta bancária.
// Só lê a tabela dados_paineis; quem não tem painel vê uma explicação.
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;
IC.caixa='<path d="M3 7h18v12H3z"/><path d="M3 11h18M7 15h3"/><path d="M8 7V4h8v3"/>';
const X=S.cxa=Object.assign({emp:null,per:null,tab:'visao',conta:null,status:'',q:'',qc:'',fluxo:null,cache:{},f:{reg:[],cid:[],emp:[],obra:[]}},S.cxa||{});for(const k_ of ['reg','cid','emp','obra'])if(!Array.isArray(X.f[k_]))X.f[k_]=X.f[k_]?[X.f[k_]]:[];

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
.cxa-aud td{white-space:normal;font-size:12.5px}.cxa-aud td.n{white-space:nowrap}.cxa-aud td.det{min-width:140px}
.cxa-af,.cxa-fg{display:flex;flex-direction:column;gap:10px}.cxa-fgr{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end}.cxa-af select{min-width:150px;max-width:260px}
.cxa-ms .v3-sel{min-width:170px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;list-style:none}.cxa-ms summary::-webkit-details-marker{display:none}.cxa-ms summary::after{content:"▾";float:right;margin-left:8px;color:var(--ink-3)}
.cxa-ms.on summary{border-color:var(--accent,#0d5f73);box-shadow:inset 0 0 0 1px var(--accent,#0d5f73);font-weight:600}.cxa-msn{display:inline-block;min-width:18px;padding:0 6px;border-radius:9px;background:var(--accent,#0d5f73);color:#fff;font-size:11px;font-weight:700;text-align:center}
.cxa-chs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;border-top:1px dashed var(--line);padding-top:8px}.cxa-ch{font:inherit;font-size:12px;border:1px solid var(--line);background:var(--surface-2);border-radius:14px;padding:3px 9px;cursor:pointer;color:var(--ink)}.cxa-ch:hover{border-color:var(--bad,#b3261e)}.cxa-ch span{color:var(--ink-3);margin-left:2px}.cxa-ch.more{cursor:default;background:none}.cxa-chs .btn{padding:3px 10px;font-size:12px}
.cxa-ak .cxa-kb{font:inherit;text-align:left;cursor:pointer;color:var(--ink)}.cxa-ak .cxa-kb[disabled]{cursor:default}.cxa-ak .cxa-kb[aria-pressed="true"]{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.cxa-ct{max-height:560px;overflow:auto}.cxa-ct thead th{position:sticky;top:0;background:var(--surface);z-index:1}.cxa-ct td{font-size:12px;padding-left:6px;padding-right:6px}.cxa-ct td.det{white-space:normal;max-width:170px;min-width:0;font-size:11.5px;color:var(--ink-2)}.cxa-ct th{padding-left:6px;padding-right:6px}.cxa-ct td small{display:block;font-size:11px}.cxa-ct tr.sel td{background:color-mix(in srgb,var(--accent,#0d5f73) 10%,var(--surface))}.cxa-ct tr.tot td{position:static}
.cxa-pg{display:flex;gap:10px;align-items:center;justify-content:flex-end;font-size:12.5px;color:var(--ink-2);margin-top:6px}.cxa-pg .btn{padding:5px 12px}
.cxa-af2{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;justify-content:space-between}.cxa-af2 .cxa-st{flex:1}
@media (max-width:820px){.cxa-af select{min-width:0;width:100%}.cxa-af label{flex:1 1 140px}}
.cxa-acc{font:inherit;text-align:left;width:100%;display:block;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:8px;cursor:pointer;color:var(--ink)}
.cxa-acc[aria-pressed="true"]{border:2px solid var(--accent,var(--ink));padding:9px 11px}
.cxa-acc .ah{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:13px;margin-bottom:6px}.cxa-acc .ag{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:12px;color:var(--ink-2)}.cxa-acc .n{font-variant-numeric:tabular-nums;text-align:right}
.cxa-mini{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.cxa-mini div{background:var(--surface-2);border-radius:9px;padding:8px 10px;font-size:11.5px;color:var(--ink-2)}.cxa-mini b{display:block;font-size:15px;color:var(--ink);font-variant-numeric:tabular-nums;margin-top:2px}.cxa-mini b.neg{color:var(--bad)}
.cxa-st{display:flex;flex-wrap:wrap;gap:6px}.cxa-st button{padding:0;border:0;background:none;border-radius:20px;box-shadow:none;display:inline-flex}.cxa-st button[aria-pressed="true"] .chip{outline:2px solid var(--ink);outline-offset:1px}
@media print{.cxa-aud{grid-template-columns:1fr!important}.cxa-accs{display:none}.cxa .tbl-wrap,.cxa-dw{max-height:none!important;overflow:visible!important}.cxa-g2,.cxa-g3{grid-template-columns:1fr 1fr!important}}
.cxa-fg{display:flex;flex-direction:column;gap:8px}
.cxa-ms{position:relative}.cxa-ms summary{list-style:none;cursor:pointer;min-width:180px;max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cxa-ms summary::after{content:" ▾";float:right}
.cxa-msb{position:absolute;z-index:20;top:calc(100% + 4px);left:0;width:min(420px,88vw);background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.14);padding:10px;display:flex;flex-direction:column;gap:8px}
.cxa-msb input[type=search]{width:100%}.cxa-msa{display:flex;flex-wrap:wrap;gap:6px}.cxa-msa .btn{padding:4px 10px;font-size:12px}
.cxa-msl{max-height:340px;overflow:auto;display:flex;flex-direction:column}.cxa-msl label{display:grid;grid-template-columns:18px 1fr auto;gap:8px;align-items:center;padding:5px 4px;border-radius:6px;font-size:12.5px;color:var(--ink);cursor:pointer}.cxa-msl label:hover{background:var(--surface-2)}.cxa-msl label[hidden]{display:none}.cxa-msl small{color:var(--ink-3);font-variant-numeric:tabular-nums}.cxa-fg select{min-width:150px;max-width:260px}.cxa-fg .chip{cursor:pointer}
.cxa-rk td{font-size:12.5px}.cxa-rk tr.l2 td:first-child{padding-left:22px;color:var(--ink-2)}
.cxa-dv{border-bottom:1px solid var(--surface-2);padding:6px 0}
.cxa-alerta{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;font-size:13px;border-left:4px solid var(--warn,#c98a00);background:color-mix(in srgb,var(--warn,#c98a00) 9%,var(--surface))}
.cxa-ask{background:color-mix(in srgb,var(--warn,#c98a00) 12%,var(--surface))}.cxa-sn{display:inline-block;font-size:10.5px;font-weight:600;border-radius:5px;padding:1px 6px;margin-top:3px}.cxa-sn.p{background:color-mix(in srgb,var(--good,#1f8a5b) 16%,transparent);color:var(--good,#1f7a4f)}.cxa-sn.m{background:color-mix(in srgb,var(--bad,#c0392b) 14%,transparent);color:var(--bad,#b03a2e)}.cxa-sn.x{background:#a66300;color:#fff}.cxa-dp td{font-size:12px;white-space:normal;vertical-align:top}.cxa-dp td:nth-child(2){min-width:180px;max-width:240px}.cxa-dp td:nth-child(3){max-width:170px;font-size:11.5px}.cxa-dp td:last-child .btn{padding:5px 10px;white-space:nowrap}.cxa-dp .k{font-family:var(--f-num,monospace);font-size:10.5px;color:var(--ink-3)}.cxa-dp select{max-width:250px;font-size:12px;padding:4px 6px;border:1px solid var(--line);border-radius:7px;background:var(--surface)}.cxa-dp select.mud{border-color:var(--warn,#c98a00);box-shadow:inset 0 0 0 1px var(--warn,#c98a00)}.cxa-dp input:not([type=checkbox]){font-size:12px;width:140px;display:block;margin-bottom:4px;padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--surface)}.cxa-dp tr.sel td{background:color-mix(in srgb,var(--accent,#0d5f73) 8%,var(--surface))}
.cxa-lote{position:sticky;top:0;z-index:3;display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;background:var(--ink,#16202a);color:#fff;border-radius:10px;padding:8px 12px;margin-bottom:8px}.cxa-lote .hint{color:#cfd6dc}.cxa-lote .btn.ghost{color:#fff;border-color:#ffffff55}.cxa-lote select{max-width:320px}
.cxa-ap td{white-space:nowrap}.cxa-ap tr.l2 td:first-child{padding-left:24px;color:var(--ink-2)}.cxa-dv summary{cursor:pointer;font-size:12.5px;list-style:none}.cxa-dv .dd{display:block;color:var(--ink-2);font-size:12px;margin-top:3px}
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
  let dp=[];try{const r=await sb.from('dados_depara').select('*').eq('empresa_id',emp);if(!r.error)dp=r.data||[]}catch(e){}
  const DP=new Map(dp.map(d=>[d.chave,d]));p._dp=DP;p._dpOk=true;
  for(const per of Object.keys(p)){if(per[0]==='_')continue;const o=p[per];o.mov=abrir(o.movimentos?.conteudo);o.aud=abrir(o.auditoria?.conteudo);o.res=o.resumo?.conteudo||{};o._v={};o.grupo=o.mov.some(x=>x.empresa);aplicaDP(o,DP)}
  return X.cache[emp]=p}
const DPC=['fluxo_tipo','fluxo_conta','fluxo_subconta','fluxo_descricao','base_apresentacao','resumo_servico','servico_resumo'];
function aplicaDP(o,DP){for(const x of o.mov){const d=x.chave&&DP.get(x.chave);if(d){if(!x._orig)x._orig=DPC.reduce((a,c)=>(a[c]=x[c],a),{classificacao:x.classificacao});for(const c of DPC)x[c]=d[c]||'';x.classificacao='de-para'}}o._v={}}
// ---------- grupo: filtros Regional › Cidade › Empresa › Obra (o painel traz várias empresas no mesmo cadastro)
const FIL=[['reg','Regional','regional'],['cid','Cidade','cidade'],['emp','Empresa','empresa'],['obra','Obra','centro_custo']];
// empresa é seleção múltipla (todas, uma ou várias); os outros filtros são um valor só
const ativo=k_=>X.f[k_].length>0;
const casa=(k_,v)=>!X.f[k_].length||X.f[k_].includes(v);
const nomeE=v=>String(v||'').replace(/^(\d+)\s*-\s*/,'');const codE=v=>(String(v||'').match(/^(\d+)\s*-/)||[])[1]||'';
function opcoes(o){const f=X.f,r={};for(const [k,,c] of FIL)r[k]=new Map();
  for(const x of o.mov){const ok=i=>FIL.slice(0,i).every(([k,,c])=>casa(k,x[c]));
    FIL.forEach(([k,,c],i)=>{if(ok(i)&&x[c]&&x[c]!=='—'&&!(k==='obra'&&!['Receitas','Pagamentos'].includes(x.grupo))){r[k].set(x[c],(r[k].get(x[c])||0)+Math.abs(x.valor))}})}
  return r}
function vista(o){if(!o.grupo)return o;const f=X.f,key=FIL.map(([k])=>String(f[k])).join('|');if(o._v[key])return o._v[key];
  if(!FIL.some(([k])=>ativo(k)))return o._v[key]=Object.assign(Object.create(o),{_arv:null});
  const pm=x=>FIL.every(([k,,c])=>casa(k,x[c]));
  const mov=o.mov.filter(pm),emps=new Set(mov.map(x=>x.empresa));f.emp.forEach(e=>emps.add(e));
  const porEmp=x=>emps.has(x.empresa)&&(!f.reg.length||!x.regional||f.reg.includes(x.regional)||f.emp.length);
  const conc=(o.res.conciliacao||[]).filter(porEmp),contas=new Set(conc.map(c=>c.conta_bancaria));
  const fc=o.res.forecast?{...o.res.forecast,linhas:o.res.forecast.linhas.filter(l=>!l.empresa||emps.has(l.empresa))}:null;
  const ab={};for(const a of (o.res.abas||[]).filter(a=>!a.empresa||emps.has(a.empresa))){const t=ab[a.aba]||(ab[a.aba]={...a,linhas:0,no_extrato:0,total:0,sem_par:0,base_real:a.base_real==null?null:0});t.linhas+=a.linhas;t.no_extrato+=a.no_extrato;t.total+=a.total;t.sem_par+=a.sem_par||0;if(t.base_real!=null)t.base_real+=+a.base_real||0}
  const res={...o.res,conciliacao:conc,forecast:fc,abas:Object.values(ab),fluxo_v07:(o.res.fluxo_v07||[]).filter(r=>!r.empresa||emps.has(r.empresa)),divergencias:(o.res.divergencias||[]).filter(d=>!d.empresa||emps.has(d.empresa))};
  const aud=o.aud.filter(a=>a.empresa?emps.has(a.empresa)||contas.has(a.conta_bancaria)&&!f.emp.length:contas.has(a.conta_bancaria));
  // com cidade/obra o saldo do banco continua sendo o da empresa inteira; o que ficou fora do filtro entra numa linha própria para a ponte fechar no saldo real
  const parcial=!!(f.cid.length||f.obra.length),semAdm=x=>x.grupo!=='Taxa ADM';
  const fora=parcial?sum(o.mov.filter(x=>emps.has(x.empresa)&&semAdm(x)).map(x=>x.valor))-sum(mov.filter(semAdm).map(x=>x.valor)):0;
  return o._v[key]=Object.assign(Object.create(o),{mov,aud,res,_arv:null,parcial,fora})}
// ---------- seleção múltipla com pesquisa (todos os filtros de texto da tela): <details> com busca, marcar/desmarcar e contagem
const LBL={reg:v=>v,cid:v=>v,emp:v=>nomeE(v),obra:v=>nm(v)||v,bco:v=>v,conta:v=>banco(v)};
function msel(k,t,it,sel,o={}){const q=norm((X.msQ||{})[k]||''),um=o.um,tp=um?'radio':'checkbox',L=o.lbl||LBL[k]||(v=>v);
  const rot=sel.length?(sel.length===1?L(sel[0]):sel.length+' '+(o.plural||'marcadas')):(o.todas||'Todas')+` (${it.length})`;
  return `<div class="hint cxa-ms ${sel.length&&!um?'on':''}">${t}${sel.length&&!um?` <span class="cxa-msn">${sel.length}</span>`:''}<br><details class="cxa-msd" data-ms="${k}" ${o.id?`id="${o.id}"`:''} ${X.msOpen===k?'open':''}><summary class="v3-sel" title="${esc(sel.map(L).join(', '))}">${esc(rot)}</summary><div class="cxa-msb">
   <input class="v3-sel" type="search" data-msq="${k}" placeholder="pesquisar ${esc(t.toLowerCase())}" value="${esc((X.msQ||{})[k]||'')}">
   ${um?'':`<div class="cxa-msa"><button type="button" class="btn ghost" data-msa="todas" data-ms="${k}">Todas</button><button type="button" class="btn ghost" data-msa="busca" data-ms="${k}">Marcar as da pesquisa</button>${sel.length?`<button type="button" class="btn ghost" data-msa="limpa" data-ms="${k}">Desmarcar (${sel.length})</button>`:''}</div>`}
   <div class="cxa-msl">${it.map(([v,sub])=>`<label ${q&&!norm(v+' '+L(v)).includes(q)?'hidden':''}><input type="${tp}" name="ms-${k}" data-msv="${k}" ${k==='emp'?`data-cxamsv="${esc(v)}"`:''} value="${esc(v)}" ${sel.includes(v)?'checked':''}><span>${esc(L(v))}</span><small>${esc(sub??'')}</small></label>`).join('')||'<p class="cxa-q">Nada para escolher.</p>'}</div></div></details></div>`}
// etiquetas do que está selecionado, com × para tirar
function chipsSel(ks){const on=ks.filter(([k,,arr])=>arr.length);if(!on.length)return '';
  return `<div class="cxa-chs" data-nao-imprime><span class="hint">Selecionado:</span>${on.map(([k,t,arr])=>arr.slice(0,6).map(v=>`<button type="button" class="cxa-ch" data-mschip="${k}" data-v="${esc(v)}" title="Tirar do filtro">${esc(t)}: <b>${esc((LBL[k]||(x=>x))(v))}</b> <span aria-hidden="true">×</span></button>`).join('')+(arr.length>6?`<span class="cxa-ch more">+${arr.length-6} ${esc(t.toLowerCase())}</span>`:'')).join('')}<button type="button" class="btn ghost" data-mslimpa="${ks.map(x=>x[0]).join(',')}">Limpar tudo</button></div>`}
function setMS(k,arr){if(k.startsWith('pq')){pqF()[k]=arr;return}if(k.startsWith('dp')){dpF()[k]=arr;X.dpPg=0;return}if(k==='bco'){(X.au=X.au||{}).bco=arr;X.au.pg=0;return}if(k==='conta'){X.conta=arr[0]||null;X.status='';X.lpg=0;return}
  const i=FIL.findIndex(f=>f[0]===k);if(i<0)return;X.f[k]=arr;const o0=X.p&&X.p[X.per];
  for(const [k2] of FIL.slice(i+1)){const op=o0?opcoes(o0)[k2]:new Map();X.f[k2]=X.f[k2].filter(v=>op.has(v))}
  X.dAb=null;X.conta=null}
const getMS=k=>k.startsWith('pq')?pqF()[k]:k.startsWith('dp')?dpF()[k]:k==='bco'?((X.au||{}).bco||[]):k==='conta'?(X.conta?[X.conta]:[]):X.f[k]||[];
function barraFiltros(o){if(!o.grupo)return '';const op=opcoes(o),nE=new Set(o.mov.map(x=>x.empresa)).size;
  const sel=([k,t])=>{const it=[...op[k].entries()].sort((a,b)=>k==='obra'?b[1]-a[1]:k==='emp'?nomeE(a[0]).localeCompare(nomeE(b[0]),'pt-BR'):a[0].localeCompare(b[0],'pt-BR',{numeric:true})).map(([v])=>[v,k==='emp'?codE(v):'']);
    return msel(k,t==='Empresa'?'Empresas':t,it,X.f[k],{id:k==='emp'?'cxaMs':'',todas:k==='emp'?'Todas as empresas':'Todas',plural:k==='emp'?'empresas marcadas':'marcadas'})};
  const on=FIL.filter(([k])=>ativo(k));
  return `<div class="panel cxa-fg" data-nao-imprime><div class="cxa-fgr"><span class="hint" style="align-self:center;max-width:220px"><b>Grupo · ${nE} empresas</b><br>Pesquise e marque uma ou várias opções em cada filtro.</span>${FIL.map(sel).join('')}${on.length?`<button type="button" class="btn ghost" data-cxaflimpa="1">Limpar filtros</button>`:''}</div>${chipsSel(FIL.map(([k,t])=>[k,t,X.f[k]]))}</div>`}
function filtroTxt(){return FIL.filter(([k])=>ativo(k)).map(([k,t])=>{const a=X.f[k],L=LBL[k];return (a.length>1?t+'s':t).replace('Cidades','Cidades').replace('Regionals','Regionais')+': '+(a.length<=3?a.map(L).join(', '):a.length+' marcadas')}).join(' · ')}

// ---------- formatos: real e orçado sempre em reais inteiros; nomes sem os códigos do plano
const I0=v=>{const r=Math.round(+v||0);return (r<0?'−':'')+Math.abs(r).toLocaleString('pt-BR')};
const SG=v=>{const r=Math.round(+v||0);return (r>0?'+':'')+I0(r)};
const PC=(r,o)=>o?((Math.abs(r)/Math.abs(o)-1)*100).toFixed(1).replace('.',',').replace(/^(?!-)/,'+')+'%':'—';
const cod=s=>{const m=String(s||'').match(/^[\d.]+/);return m?m[0].replace(/\.$/,''):String(s||'')};
function nm(s){s=String(s??'').trim().replace(/^[\d.]+\s*(\(\+\)|\(-\))?\s*/,'').replace(/^[A-Z]?\d+\s*-\s*/,'').replace(/^[\s-]+|[\s-]+$/g,'');
  return /[a-zà-ú]/.test(s)?s:s.charAt(0)+s.slice(1).toLowerCase()}
const BANCOS={'33':'Santander','102':'XP Investimentos','422':'Safra','3':'Banco da Amazônia','212':'Original','336':'C6','1000':'Banco interno','1003':'Banco transitório','-1':'Banco interno','1':'BB','001':'BB','033':'Santander','065':'Andbank','65':'Andbank','104':'Caixa','237':'Bradesco','246':'ABC','341':'Itaú','748':'Sicredi','756':'Sicoob','077':'Inter','260':'Nubank'};
const banco=c=>{const [b,n]=String(c||'').split('|');return n?(BANCOS[b]||'Banco '+b)+' · '+n:String(c||'')};
const mesN=()=>+String(X.per||'').slice(5,7)||10;
function prodDe(o,m){if(m.produto)return m.produto;const p=(m.chave||'').split('-')[2];const mp=o.res.produtos||{};return p&&mp[p]?nm(mp[p]):'Sem produto'}

// orçado do mês por conta do fluxo (linhas Prev do FLUXO)
function orcado(o){const F=o.res.forecast;const r={};if(!F)return r;const i=mesN()-1;for(const l of F.linhas){r[l.conta]=(r[l.conta]||0)+(+l.P[i]||0)}return r}
function totais(o){const m=o.mov,s=f=>sum(m.filter(f).map(x=>x.valor));const c=o.res.conciliacao||[];
  const ini=sum(c.map(x=>x.saldo_inicial)),rec=s(x=>x.grupo==='Receitas'),pag=s(x=>x.grupo==='Pagamentos'),tar=s(x=>x.grupo==='Tarifas e ajustes bancários'),
    apo=s(x=>x.grupo==='Aportes'),dis=s(x=>x.grupo==='Distribuições'),tr=s(x=>x.grupo==='Transferências entre contas'),adm=s(x=>x.grupo==='Taxa ADM');
  const fora=o.fora||0;return {ini,rec,pag,tar,apo,dis,tr,adm,fora,parcial:!!o.parcial,fim:ini+rec+pag+tar+apo+dis+tr+fora}}

// ---------- 1. Visão geral
function ponte(T){const st=[['Saldo inicial',T.ini,1],['Recebimentos',T.rec],['Pagamentos',T.pag],['Tarifas e ajustes',T.tar],['Aportes',T.apo],['Distribuições',T.dis],...(T.parcial?[['Fora do filtro',T.fora]]:[]),['Saldo final',T.fim,1]];
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
  return `<p class="cxa-lead">Realizado 100% das planilhas do cliente: <b>${num.format(nl)}</b> lançamentos de ${MES(X.per)}${o.grupo?` em <b>${new Set(m.map(x=>x.empresa)).size}</b> empresas`:''}, <b>${num.format(sum(m.filter(x=>x.conferido_no_banco==='sim').map(x=>x.qtd||1)))}</b> conferidos no extrato do banco. Orçado do FLUXO do cliente. Valores em R$, sem centavos.${m.some(x=>x.grupo==='Taxa ADM')?` Taxa ADM de 4% calculada${(()=>{const pg=sum(m.filter(x=>x.grupo==='Taxa ADM'&&x.valor<0).map(x=>x.valor)),rc=sum(m.filter(x=>x.grupo==='Taxa ADM'&&x.valor>0).map(x=>x.valor));return [pg?' paga R$ '+I0(-pg):'',rc?' recebida R$ '+I0(rc):''].filter(Boolean).join(' e')})()} aparece no fluxo, fora do saldo do banco${Math.abs(T.adm)<1&&!o.parcial&&!X.f.emp.length?'; no grupo ela soma zero':''}.`:''}${o.parcial?` <b>Filtro de cidade ou obra:</b> o saldo do banco é da empresa inteira (conta bancária não se divide por cidade/obra). Os cards mostram só o movimento do filtro; o que é das outras cidades/obras da mesma empresa aparece em "Fora do filtro" (R$ ${I0(T.fora)}) para o saldo final bater com o extrato.`:''}</p>
  <div class="v3-cards cxa-cards">${card('Saldo inicial',T.ini,T.parcial?'dia 1 · empresa inteira':'dia 1 · soma das contas')}${card('Recebimentos',T.rec,(T.parcial?'orçado da empresa R$ ':'orçado R$ ')+I0(oRec),T.parcial?'':vs(T.rec,oRec))}${card('Pagamentos',T.pag,(T.parcial?'orçado da empresa R$ ':'orçado R$ ')+I0(oPag),T.parcial?'':vs(T.pag,oPag))}${card('Geração operacional',T.rec+T.pag+T.tar,'recebimentos − pagamentos − tarifas')}${card('Aportes − distribuições',T.apo+T.dis,'aportes '+I0(T.apo)+' · distrib. '+I0(T.dis))}${card('Saldo final',T.fim,T.parcial?'extrato da empresa · fora do filtro R$ '+I0(T.fora):'variação no mês R$ '+I0(T.fim-T.ini))}</div>
  <div class="cxa-g2"><div class="panel cxa-sec"><h3>Ponte do caixa no mês</h3><p>Do saldo inicial ao final. Verde entra, vermelho sai.</p>${ponte(T)}</div>
   <div class="panel cxa-sec"><h3>Orçado × realizado por conta do fluxo</h3><p>${o.parcial?'<b>Orçado é da empresa inteira</b> (o FLUXO não vem por cidade/obra) · ':''}<span class="cxa-lg"><i class="o"></i>Orçado</span><span class="cxa-lg"><i class="e"></i>Realizado entrada</span><span class="cxa-lg"><i class="s"></i>Realizado saída</span> · clique para abrir no fluxo</p>
    <div class="tbl-wrap"><table class="cxa-or"><thead><tr><th>Conta</th><th></th><th class="n">Orçado</th><th class="n">Realizado</th><th class="n">Diferença</th></tr></thead><tbody>${linhasOR}</tbody></table></div></div></div>
  <div class="cxa-g2"><div class="cxa-sec" style="gap:14px"><div class="panel cxa-sec"><h3>Recebimentos por tipo de parcela</h3><p>Total R$ ${I0(T.rec)}</p>${barras(tp,'e')}</div>
   <div class="panel cxa-sec"><h3>Movimento por conta bancária</h3><p>Tarifas pagas já estão dentro das saídas. Clique para auditar a conta.</p><div class="tbl-wrap"><table class="cxa-bk"><thead><tr><th>Conta</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Tarifas pagas</th><th class="n">Líquido</th></tr></thead><tbody>
    ${bks.map(([c,b])=>`<tr class="click" data-cxaconta="${esc(c)}"><td style="white-space:nowrap">${esc(banco(c))}</td><td class="n pos">${I0(b.e)}</td><td class="n neg">${I0(b.s)}</td><td class="n neg">${I0(b.t)}</td><td class="n"><b>${I0(b.e+b.s)}</b></td></tr>`).join('')}</tbody></table></div></div></div>
   <div class="panel cxa-sec"><h3>Pagamentos por centro de custo (obra) › produto</h3><p>Total R$ ${I0(T.pag)} · % do produto dentro da obra${o.grupo&&Object.keys(ob).length>12?` · ${Object.keys(ob).length} obras, mostrando as 12 maiores`:''}</p>${arv}</div></div>${rk}`}
// Taxa ADM: só gerencial, nunca entra no saldo das contas (nem de quem paga, nem da empresa 3 que recebe)
function admTot(m){let pg=0,rc=0;for(const x of m)if(x.grupo==='Taxa ADM'){if(x.valor<0)pg+=x.valor;else rc+=x.valor}return {pg,rc}}
function avisoADM(o){const {pg,rc}=admTot(o.mov);if(!pg&&!rc)return '';
  return `<div class="panel cxa-alerta cxa-adm" role="note"><b>Taxa ADM de 4% não mexe no saldo das contas.</b> <span>É um valor calculado (gerencial): ${[pg?'paga R$ '+I0(-pg):'',rc?'recebida R$ '+I0(rc):''].filter(Boolean).join(' · ')}. Saldo inicial, saldo final e auditoria por conta são só o que passou no banco.</span></div>`}
// por regional › empresa (grupo): clique filtra
function ranking(o){const g={};for(const x of o.mov){if(x.grupo==='Transferências entre contas')continue;const r=g[x.regional]||(g[x.regional]={e:{},t:{rec:0,pag:0,out:0,adm:0}});const e=r.e[x.empresa]||(r.e[x.empresa]={rec:0,pag:0,out:0,adm:0});
    const c=x.grupo==='Receitas'?'rec':x.grupo==='Pagamentos'?'pag':x.grupo==='Taxa ADM'?'adm':'out';e[c]+=x.valor;r.t[c]+=x.valor}
  const sc=new Map();for(const c of o.res.conciliacao||[])sc.set(c.empresa,(sc.get(c.empresa)||0)+c.saldo_final_extrato);
  const rs=Object.entries(g).sort((a,b)=>b[1].t.rec-a[1].t.rec);const um=rs.length===1;
  const lin=(n,t,cls,attr)=>`<tr class="${cls} click" ${attr}><td>${esc(n)}</td><td class="n pos">${I0(t.rec)}</td><td class="n neg">${I0(t.pag)}</td><td class="n">${I0(t.out)}</td><td class="n"><b>${I0(t.rec+t.pag+t.out)}</b></td><td class="n cxa-q">${I0(t.adm)}</td>${t.sf==null?'<td></td>':`<td class="n">${I0(t.sf)}</td>`}</tr>`;
  let h='';for(const [r,v] of rs){const es=Object.entries(v.e).sort((a,b)=>b[1].rec-a[1].rec);v.t.sf=sum(es.map(([e])=>sc.get(e)||0));
    if(!um)h+=lin(r,v.t,'tot',`data-cxafset="reg" data-v="${esc(r)}"`);
    h+=es.slice(0,um?60:8).map(([e,t])=>lin(nomeE(e)||e,{...t,sf:sc.get(e)||0},'l2',`data-cxafset="emp" data-v="${esc(e)}"`)).join('')+(es.length>(um?60:8)?`<tr class="l2"><td colspan="7" class="cxa-q">+ ${es.length-(um?60:8)} empresas · filtre a regional para ver todas</td></tr>`:'')}
  return `<div class="panel cxa-sec"><h3>${um?'Empresas':'Regionais › empresas'} no mês</h3><p>Recebimentos, pagamentos e o resto (tarifas, aportes, distribuições). Resultado e saldo final são do banco; a Taxa ADM fica numa coluna à parte e não entra no saldo. Clique para filtrar.</p>
   <div class="tbl-wrap"><table class="cxa-rk"><thead><tr><th>${um?'Empresa':'Regional / empresa'}</th><th class="n">Recebimentos</th><th class="n">Pagamentos</th><th class="n">Outros</th><th class="n">Resultado</th><th class="n">Taxa ADM (fora do saldo)</th><th class="n">Saldo final</th></tr></thead><tbody>${h}</tbody></table></div></div>`}

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
   ${Math.abs(T.adm)>0.5?`<tr><td style="padding-left:26px">Taxa ADM calculada (não mexe no saldo das contas)</td><td></td><td></td><td class="n">${I0(-T.adm)}</td><td colspan="3"></td></tr>`:''}
   ${Math.abs(T.apo+T.dis)>0.5&&o.grupo?`<tr><td style="padding-left:26px">Aportes e distribuições já estão nas entradas e saídas</td><td></td><td></td><td class="n">${I0(0)}</td><td colspan="3"></td></tr>`:''}
   ${Math.abs(T.tr)>0.5?`<tr><td style="padding-left:26px">Transferências entre contas</td><td></td><td></td><td class="n">${I0(T.tr)}</td><td colspan="3"></td></tr>`:''}
   <tr class="tot"><td>Saldo final</td><td></td><td></td><td class="n"><b>${I0(T.fim)}</b></td><td colspan="3"></td></tr>`;
  return `<div class="panel cxa-sec"><div class="v3-bar"><div><h3>Fluxo de caixa de ${MES(X.per)} · orçado × realizado</h3><p>Mesmos níveis do Excel do cliente: Tipo › Conta › Sub conta › Descrição › Resumo › Obra › Lançamento. Quando a descrição é igual à sub conta, o nível é pulado. Orçado vai até a descrição. Clique numa linha para abrir ou fechar.</p></div>
   <div class="v3-seg" role="group" aria-label="Abrir até">${NIV.map((t,i)=>`<button type="button" data-cxadn="${i}" aria-pressed="${nivelMax===i}">${t}</button>`).join('')}</div></div>
   <div class="tbl-wrap cxa-dw"><table class="cxa-dr"><thead><tr><th>Estrutura do fluxo</th><th>Nível</th><th class="n">Orçado</th><th class="n">Realizado</th><th class="n">Diferença</th><th class="n">Var. %</th><th class="n">Lanç.</th></tr></thead><tbody>${h}</tbody></table></div></div>`}

// ---------- 3. Auditoria por conta bancária
// ---------- 3. Auditoria por conta: filtros (banco, conta, situação, busca) › tabela de contas agrupada por banco › detalhe da conta
const bcoCod=c=>String(c||'').split('|')[0];
const bcoNome=r=>{const b=bcoCod(r.conta_bancaria);return BANCOS[b]||nm(String(r.banco_nome||'').replace(/^BCO\.?\s*/i,''))||'Banco '+b};
const PEND=/^Só no extrato|^Só nas abas/;
function audContas(o){const c=(o.res.conciliacao||[]).filter(r=>Math.abs(r.entradas_extrato)+Math.abs(r.saidas_extrato)+Math.abs(r.entradas_base)+Math.abs(r.saidas_base)>0.5);
  const pend=new Map();for(const a of o.aud)if(PEND.test(a.status||''))pend.set(a.conta_bancaria,(pend.get(a.conta_bancaria)||0)+1);
  return c.map(r=>({...r,bco:bcoNome(r),pend:pend.get(r.conta_bancaria)||0,ok:Math.abs(r.diferenca||0)<1}))}
function telaAud(o){if(!o)return '';const A=X.au||(X.au={bco:[],sit:'',qc:'',pg:0});if(!Array.isArray(A.bco))A.bco=A.bco?[A.bco]:[];const all=audContas(o);
  const bcos=[...new Set(all.map(r=>r.bco))].sort((a,b)=>a.localeCompare(b,'pt-BR'));A.bco=A.bco.filter(b=>bcos.includes(b));
  const qc=norm(A.qc||'');
  const cv=all.filter(r=>(!A.bco.length||A.bco.includes(r.bco))&&(!A.sit||(A.sit==='dif'?!r.ok:A.sit==='pend'?r.pend>0:r.ok))&&(!qc||norm([banco(r.conta_bancaria),r.bco,r.empresa,r.descricao_conta].join(' ')).includes(qc)))
    .sort((a,b)=>a.bco.localeCompare(b.bco,'pt-BR')||(Math.abs(b.entradas_extrato)+Math.abs(b.saidas_extrato))-(Math.abs(a.entradas_extrato)+Math.abs(a.saidas_extrato)));
  if(!cv.some(r=>r.conta_bancaria===X.conta))X.conta=(cv.find(r=>!r.ok)||cv[0]||{}).conta_bancaria||null;
  const nDif=all.filter(r=>!r.ok).length,nPend=all.filter(r=>r.pend>0).length,tDif=sum(all.map(r=>Math.abs(r.diferenca||0)));
  const kp=(t,v,d,c,sit)=>`<button type="button" class="v3-k cxa-k cxa-kb" ${sit!=null?`data-cxaau="sit" data-v="${sit}" aria-pressed="${A.sit===sit}"`:'disabled'}><span class="t">${t}</span><span class="v ${c||''}">${v}</span><span class="d">${d}</span></button>`;
  const kpis=`<div class="v3-cards cxa-cards cxa-ak">${kp('Contas com movimento',num.format(all.length),bcos.length+' bancos','','')}${kp('Batidas',num.format(all.length-nDif),'extrato = planilhas','','ok')}${kp('Com diferença',num.format(nDif),'R$ '+I0(tDif)+' em módulo',nDif?'neg':'','dif')}${kp('Com pendências',num.format(nPend),'linhas só no extrato ou só nas abas',nPend?'neg':'','pend')}</div>`;
  const nB={};for(const r of all)nB[r.bco]=(nB[r.bco]||0)+1;
  const fil=`<div class="panel cxa-af" data-nao-imprime><div class="cxa-fgr">${msel('bco','Banco',bcos.map(b=>[b,nB[b]+' contas']),A.bco,{plural:'bancos marcados',todas:'Todos'})}
   ${msel('conta','Conta',cv.map(r=>[r.conta_bancaria,nm(r.descricao_conta||'').slice(0,40)+(o.grupo?' · '+nomeE(r.empresa).slice(0,30):'')]),X.conta?[X.conta]:[],{um:1,todas:'Escolha a conta'})}
   <label class="hint">Situação<br><select class="v3-sel" data-cxaau="sit"><option value="">Todas</option><option value="ok" ${A.sit==='ok'?'selected':''}>Batidas</option><option value="dif" ${A.sit==='dif'?'selected':''}>Com diferença</option><option value="pend" ${A.sit==='pend'?'selected':''}>Com pendências</option></select></label>
   <label class="hint" style="flex:1;min-width:200px">Buscar conta<br><input id="cxaBuscaC" class="v3-sel" type="search" value="${esc(A.qc||'')}" placeholder="número, descrição ou empresa" style="width:100%"></label>
   ${A.bco.length||A.sit||A.qc?'<button type="button" class="btn ghost" data-cxaau="limpa" data-v="1">Limpar</button>':''}</div>${chipsSel([['bco','Banco',A.bco]])}</div>`;
  // tabela de contas agrupada por banco, paginada
  const PG=40,np=Math.max(1,Math.ceil(cv.length/PG));if(A.pg>=np)A.pg=np-1;const pag=cv.slice(A.pg*PG,A.pg*PG+PG);
  const tb={};for(const r of cv){const t=tb[r.bco]||(tb[r.bco]={n:0,si:0,ee:0,eb:0,se:0,sb:0,d:0,sf:0,p:0});t.n++;t.si+=r.saldo_inicial;t.ee+=r.entradas_extrato;t.eb+=r.entradas_base;t.se+=r.saidas_extrato;t.sb+=r.saidas_base;t.d+=r.diferenca||0;t.sf+=r.saldo_final_extrato;t.p+=r.pend}
  let h='',ult='';for(const r of pag){if(r.bco!==ult){ult=r.bco;const t=tb[ult];h+=`<tr class="tot"><td colspan="${o.grupo?3:2}">${esc(ult)} <span class="cxa-q">${t.n} conta${t.n>1?'s':''}</span></td><td class="n">${I0(t.si)}</td><td class="n">${I0(t.ee)}</td><td class="n">${I0(-t.se)}</td><td class="n ${Math.abs(t.d)<1?'':'neg'}">${I0(t.d)}</td><td class="n">${t.p||''}</td><td class="n">${I0(t.sf)}</td></tr>`}
    h+=`<tr class="click ${r.conta_bancaria===X.conta?'sel':''}" data-cxaconta="${esc(r.conta_bancaria)}"><td style="padding-left:20px;white-space:nowrap">${esc(banco(r.conta_bancaria).split(' · ').pop())}</td><td class="det">${esc(nm(r.descricao_conta)||'')}</td>${o.grupo?`<td class="det">${esc(nomeE(r.empresa))}</td>`:''}<td class="n">${I0(r.saldo_inicial)}</td>
     <td class="n">${I0(r.entradas_extrato)}${Math.abs(r.entradas_extrato-r.entradas_base)>=1?`<small class="neg">plan. ${I0(r.entradas_base)}</small>`:''}</td><td class="n">${I0(-r.saidas_extrato)}${Math.abs(r.saidas_extrato-r.saidas_base)>=1?`<small class="neg">plan. ${I0(-r.saidas_base)}</small>`:''}</td>
     <td class="n">${r.ok?chip('Batida','good'):`<b class="neg">${I0(r.diferenca)}</b>`}</td><td class="n">${r.pend?chip(String(r.pend),'bad'):''}</td><td class="n"><b>${I0(r.saldo_final_extrato)}</b></td></tr>`}
  const nav=np>1?`<div class="cxa-pg" data-nao-imprime><button type="button" class="btn ghost" data-cxaau="pg" data-v="${A.pg-1}" ${A.pg?'':'disabled'}>‹ Anterior</button><span>Página ${A.pg+1} de ${np} · ${num.format(cv.length)} contas</span><button type="button" class="btn ghost" data-cxaau="pg" data-v="${A.pg+1}" ${A.pg<np-1?'':'disabled'}>Próxima ›</button></div>`:`<p class="cxa-mais">${num.format(cv.length)} conta${cv.length===1?'':'s'}. Contas sem movimento no mês ficam fora.</p>`;
  const sel=cv.find(r=>r.conta_bancaria===X.conta)||{};
  return `${kpis}${fil}<div class="panel cxa-sec"><h3>Contas por banco</h3><p>Entradas e saídas pelo extrato; quando as planilhas dão outro valor, ele aparece embaixo em vermelho. Clique numa conta para ver as linhas.</p>
    <div class="tbl-wrap cxa-ct"><table><thead><tr><th>Conta</th><th>Descrição</th>${o.grupo?'<th>Empresa</th>':''}<th class="n">Saldo inicial</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Diferença</th><th class="n">Pend.</th><th class="n">Saldo final</th></tr></thead><tbody>${h||`<tr><td colspan="9">Nenhuma conta com esse filtro.</td></tr>`}</tbody></table></div>${nav}</div>
   ${X.conta?`<div class="panel cxa-sec cxa-aud" id="cxaDet"><h3>${esc(banco(X.conta))}${sel.descricao_conta?' · '+esc(nm(sel.descricao_conta)):''}${sel.empresa?` <span class="hint">${esc(nomeE(sel.empresa))}</span>`:''}</h3><p>Extrato do mês × lançamentos das planilhas (pagas, recebidas, transferências e tarifas), linha a linha. Clique num status para filtrar.</p>
    <div class="cxa-mini"><div>Saldo inicial<b>${I0(sel.saldo_inicial)}</b></div><div>Entradas extrato / planilhas<b>${I0(sel.entradas_extrato)}</b>${I0(sel.entradas_base)}</div><div>Saídas extrato / planilhas<b>${I0(-sel.saidas_extrato)}</b>${I0(-sel.saidas_base)}</div><div>Diferença extrato − planilhas<b class="${Math.abs(sel.diferenca||0)<1?'':'neg'}">${I0(sel.diferenca)}</b></div><div>Saldo final extrato<b>${I0(sel.saldo_final_extrato)}</b></div></div>
    <div class="cxa-af2"><div class="cxa-st" id="cxaSt"></div><label class="hint">Buscar nas linhas<br><input id="cxaBusca" class="v3-sel" type="search" value="${esc(X.q)}" placeholder="histórico, fornecedor, documento"></label></div>
    <div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Histórico no extrato</th><th class="n">Extrato</th><th>Lançamento nas planilhas</th><th class="n">Planilhas</th><th class="n">Diferença</th><th>Status</th></tr></thead><tbody id="cxaAud"></tbody></table></div>
    <div id="cxaMais"></div></div>`:''}`}
const STN={'Depósito de cliente (conferido no total da conta)':'Depósito de cliente','Repetido no extrato (contado uma vez)':'Repetido no extrato','Conferido (vários lançamentos)':'Conferido (vários)','Total de recebimentos da conta':'Total de recebimentos'};
function pintarAud(){const o=X.atual;const tb=document.getElementById('cxaAud');if(!o||!tb)return;
  const base=o.aud.filter(a=>a.conta_bancaria===X.conta);const st={};for(const a of base){const s=st[a.status]||(st[a.status]={n:0});s.n++}
  document.getElementById('cxaSt').innerHTML=Object.entries(st).sort((a,b)=>b[1].n-a[1].n).map(([s,x])=>`<button type="button" data-cxast="${esc(s)}" aria-pressed="${X.status===s}">${chip((STN[s]||s)+' · '+num.format(x.n),STC[s])}</button>`).join('');
  const q=norm(X.q);let rows=base.filter(a=>(!X.status||a.status===X.status)&&(!q||norm([a.historico_extrato,a.lancamentos_base,a.documento].join(' ')).includes(q)));
  rows=rows.slice().sort((a,b)=>a.data.localeCompare(b.data));const tot=rows.length,LP=100,npl=Math.max(1,Math.ceil(tot/LP));X.lpg=Math.min(X.lpg||0,npl-1);rows=rows.slice(X.lpg*LP,X.lpg*LP+LP);
  const vext=a=>{if(a.valor_extrato==null&&/^Total de recebimentos/.test(a.status)){const mm=String(a.historico_extrato||'').match(/R\$ ([\d.]+),(\d\d)/);if(mm)return +(mm[1].replace(/\./g,'')+'.'+mm[2])}return a.valor_extrato};
  tb.innerHTML=rows.length?rows.map(a=>{const dep=/^Depósito de cliente/.test(a.status),ve=vext(a),d=(+ve||0)-(+a.valor_base||0);
    return `<tr><td>${dt(a.data).slice(0,5)}</td><td class="txt">${esc(/^Total de recebimentos/.test(a.status)?'Total de depósitos de clientes no mês':nm(a.historico_extrato)||'—')}</td><td class="n">${ve==null?'—':I0(ve)}</td><td class="det">${esc(nm(a.lancamentos_base)||'—')}${a.qtd_lancamentos>1?` (${a.qtd_lancamentos})`:''}</td>
    <td class="n">${dep?'<span class="cxa-q">no total</span>':a.valor_base==null?'—':I0(a.valor_base)}</td><td class="n ${dep?'':Math.abs(d)<1?'pos':'neg'}">${dep?'<span class="cxa-q">no total</span>':I0(d)}</td><td>${chip(STN[a.status]||a.status,STC[a.status])}</td></tr>`}).join(''):'<tr><td colspan="7">Nada nesta conta com esse filtro.</td></tr>';
  document.getElementById('cxaMais').innerHTML=(npl>1?`<div class="cxa-pg" data-nao-imprime><button type="button" class="btn ghost" data-cxalpg="${X.lpg-1}" ${X.lpg?'':'disabled'}>‹ Anterior</button><span>Linhas ${num.format(X.lpg*LP+1)}–${num.format(Math.min(tot,X.lpg*LP+LP))} de ${num.format(tot)}</span><button type="button" class="btn ghost" data-cxalpg="${X.lpg+1}" ${X.lpg<npl-1?'':'disabled'}>Próxima ›</button></div>`:'')+`<p class="cxa-mais">${num.format(tot)} linha${tot===1?'':'s'}. Depósitos de clientes são conferidos pelo total do mês, porque o extrato traz os créditos sem centavos.</p>`}

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
    <div class="tbl-wrap"><table><tbody>${ds.slice(0,300).map(d=>`<tr><td>${esc(d.empresa?nomeE(d.empresa):'')}</td><td>${esc(banco(d.conta_bancaria))}</td><td>${dt(d.data)}</td><td class="n">${I0(d.valor)}</td><td class="det">${esc(d.detalhe)}</td></tr>`).join('')}${ds.length>300?`<tr><td colspan="5" class="cxa-q">Mostrando 300 de ${num.format(ds.length)}. Filtre uma empresa para ver todas.</td></tr>`:''}</tbody></table></div></details>`).join('');
  const k4=(t,v,d,neg)=>`<div class="v3-k cxa-k"><span class="t">${t}</span><span class="v ${neg?'neg':''}">${v}</span><span class="d">${d}</span></div>`;
  return `<p class="cxa-lead">Única tela que usa o FLUXO do cliente como realizado, só para comparar com as planilhas do mês.</p>
  <div class="v3-cards cxa-cards">${k4('Total nas planilhas','R$ '+I0(tt),'contas pagas + recebidas')}${k4('Total no FLUXO (real do mês)','R$ '+I0(tv),'mesmas contas')}${k4('Diferença planilhas − FLUXO','R$ '+I0(tt-tv),'explicada abaixo',Math.abs(tt-tv)>=1)}${k4('Descrições que batem',ok+' de '+f.length,ne>1?'por empresa · diferença menor que R$ 1':'diferença menor que R$ 1')}</div>
  <div class="cxa-sec" style="gap:14px"><div class="panel cxa-sec"><h3>Planilhas × FLUXO por conta e descrição</h3><p>Clique numa descrição para abrir no fluxo.</p><div class="tbl-wrap"><table><thead><tr><th>Conta / descrição</th><th class="n">Planilhas</th><th class="n">FLUXO</th><th class="n">Diferença</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
   <div class="cxa-sec" style="gap:14px"><div class="panel cxa-sec"><h3>Conferência de cada aba</h3><p>Quantas linhas acharam par no extrato e se o total bate com o FLUXO.</p><div class="tbl-wrap"><table><thead><tr><th>Aba</th><th class="n">Linhas</th><th class="n">No extrato</th><th class="n">Total</th><th class="n">No FLUXO</th><th>Observação</th></tr></thead><tbody>${abas}</tbody></table></div></div>
   <div class="panel cxa-sec"><h3>Divergências encontradas</h3><p>Clique num tipo para ver as linhas.</p>${divs}</div></div></div>`}

// ---------- 5. Aplicações: rendimento e imposto sobre aplicação por empresa e conta, % sobre o saldo inicial, mês a mês
const ehApl=x=>x.grupo==='Tarifas e ajustes bancários'&&/aplicação/i.test(x.categoria||'');
function telaAplic(p,o){const pers=Object.keys(p).filter(k_=>k_[0]!=='_').sort();
  const lin={},emps=new Set(o.mov.map(x=>x.empresa||'Empresa'));
  for(const per of pers){const v=vista(p[per]);const si={};for(const c of v.res.conciliacao||[]){const e=c.empresa||'Empresa';si[e]=(si[e]||0)+(+c.saldo_inicial||0)}
    for(const x of v.mov){if(!ehApl(x))continue;const e=x.empresa||'Empresa';const L=lin[e]||(lin[e]={c:{},o:{},m:{}});const M=L.m[per]||(L.m[per]={r:0,i:0,si:si[e]||0});
      if(/Receita/i.test(x.categoria))M.r+=x.valor;else M.i+=x.valor;const ob=x.centro_custo&&x.centro_custo!=='—'?x.centro_custo:'Sem obra';const O_=L.o[ob]||(L.o[ob]={});const om=O_[per]||(O_[per]={r:0,i:0});if(/Receita/i.test(x.categoria))om.r+=x.valor;else om.i+=x.valor;const C_=L.c[x.conta_bancaria]||(L.c[x.conta_bancaria]={});const cm=C_[per]||(C_[per]={r:0,i:0});if(/Receita/i.test(x.categoria))cm.r+=x.valor;else cm.i+=x.valor}
    for(const e of Object.keys(lin))if(lin[e].m[per])lin[e].m[per].si=si[e]||0}
  const es=Object.entries(lin).filter(([e])=>emps.has(e)).sort((a,b)=>sum(Object.values(b[1].m).map(m=>m.r))-sum(Object.values(a[1].m).map(m=>m.r)));
  const pc=(v,b)=>b>0.5?(v/b*100).toFixed(2).replace('.',',')+'%':'—';
  const tot={};for(const [,L] of es)for(const [per,m] of Object.entries(L.m)){const t=tot[per]||(tot[per]={r:0,i:0,si:0});t.r+=m.r;t.i+=m.i;t.si+=m.si}
  const cel=m=>m?`<td class="n">${I0(m.si)}</td><td class="n pos">${I0(m.r)}</td><td class="n neg">${I0(m.i)}</td><td class="n"><b>${I0(m.r+m.i)}</b></td><td class="n">${pc(m.r,m.si)}</td><td class="n"><b>${pc(m.r+m.i,m.si)}</b></td>`:'<td colspan="6"></td>';
  const hd=pers.map(per=>`<th colspan="6" style="text-align:center">${MES(per)}</th>`).join(''),hd2=pers.map(()=>'<th class="n">Saldo inicial</th><th class="n">Rendimento</th><th class="n">Imposto</th><th class="n">Líquido</th><th class="n">% bruto</th><th class="n">% líquido</th>').join('');
  const lim=X.apAll?es.length:40;let h=`<tr class="tot"><td>Total (${es.length} empresas)</td>${pers.map(per=>cel(tot[per])).join('')}</tr>`;
  for(const [e,L] of es.slice(0,lim)){const ab=X.apAb===e;h+=`<tr class="click" data-cxaap="${esc(e)}"><td><span class="cxa-tg">${ab?'▾':'▸'}</span>${esc(nomeE(e)||e)}</td>${pers.map(per=>cel(L.m[per])).join('')}</tr>`;
    const sub=(t,ms)=>`<tr class="l2"><td>${t}</td>${pers.map(per=>ms[per]?`<td></td><td class="n pos">${I0(ms[per].r)}</td><td class="n neg">${I0(ms[per].i)}</td><td class="n">${I0(ms[per].r+ms[per].i)}</td><td></td><td></td>`:'<td colspan="6"></td>').join('')}</tr>`;
    if(ab)h+=`<tr class="l2"><td colspan="${1+pers.length*6}" class="cxa-nv">Por obra</td></tr>`+Object.entries(L.o).sort((a,b)=>sum(Object.values(b[1]).map(m=>m.r))-sum(Object.values(a[1]).map(m=>m.r))).map(([ob,ms])=>sub(esc(nm(ob)||ob),ms)).join('')+`<tr class="l2"><td colspan="${1+pers.length*6}" class="cxa-nv">Por conta bancária</td></tr>`;
    if(ab)h+=Object.entries(L.c).map(([c,ms])=>`<tr class="l2"><td>${esc(banco(c))}</td>${pers.map(per=>ms[per]?`<td></td><td class="n pos">${I0(ms[per].r)}</td><td class="n neg">${I0(ms[per].i)}</td><td class="n">${I0(ms[per].r+ms[per].i)}</td><td></td><td></td>`:'<td colspan="6"></td>').join('')}</tr>`).join('')}
  if(es.length>lim)h+=`<tr class="click" data-cxaapall="1"><td colspan="${1+pers.length*6}" class="cxa-mais2">+ ${es.length-lim} empresas · ver todas</td></tr>`;
  const T=tot[X.per]||{r:0,i:0,si:0};
  return `<p class="cxa-lead">Empresas com movimento de aplicação no mês: rendimento (entradas de aplicação na aba Tarifas) e imposto (IR e IOF sobre aplicação). O % é sobre o saldo inicial de todas as contas da empresa no dia 1, porque o extrato traz as contas de aplicação sem saldo anterior. Cada mês novo que subir vira mais uma coluna.</p>
  <div class="v3-cards cxa-cards"><div class="v3-k cxa-k"><span class="t">Empresas com aplicação</span><span class="v">${es.length}</span><span class="d">${MES(X.per)}</span></div><div class="v3-k cxa-k"><span class="t">Rendimento bruto</span><span class="v pos">R$ ${I0(T.r)}</span><span class="d">${pc(T.r,T.si)} do saldo inicial</span></div><div class="v3-k cxa-k"><span class="t">Imposto sobre aplicação</span><span class="v neg">R$ ${I0(T.i)}</span><span class="d">IR e IOF</span></div><div class="v3-k cxa-k"><span class="t">Rendimento líquido</span><span class="v">R$ ${I0(T.r+T.i)}</span><span class="d">${pc(T.r+T.i,T.si)} do saldo inicial de R$ ${I0(T.si)}</span></div></div>
  <div class="panel cxa-sec"><h3>Aplicações por empresa · % sobre o saldo inicial</h3><p>Clique numa empresa para abrir por obra e por conta bancária.</p><div class="tbl-wrap"><table class="cxa-ap"><thead><tr><th rowspan="2">Empresa</th>${hd}</tr><tr>${hd2}</tr></thead><tbody>${h}</tbody></table></div></div>`}

// ---------- 6. De-para: chave Empresa-Obra-Produto-Serviço-Insumo → estrutura do fluxo; alerta de chave nova
function chavesDP(o){if(o._ch)return o._ch;const m=new Map();
  for(const x of o.mov){if(x.origem!=='Contas Pagas'||!x.chave)continue;let c=m.get(x.chave);
    if(!c){const pt=x.chave.split('-');c={chave:x.chave,regional:x.regional||'',empresa:x.empresa||'',obra:x.centro_custo||'',produto:x.produto||'',servico:[pt[3],x.categoria].filter(Boolean).join(' · '),insumo:[pt[4],x.insumo].filter(Boolean).join(' · '),valor:0,n:0,classificacao:x.classificacao,pre:{}};
      const b=x._orig||x;for(const k_ of DPC)c.pre[k_]=b[k_]||'';c.pre.classificacao=b.classificacao;m.set(x.chave,c)}c.valor+=x.valor;c.n++}
  return o._ch=[...m.values()]}
function pendDP(o){if(!o||!o.grupo&&!o.mov.some(x=>x.chave))return [];const DP=X.p&&X.p._dp||new Map();return chavesDP(o).filter(c=>!DP.has(c.chave)&&c.pre.classificacao!=='V07')}
function opcoesFluxo(o){if(o._of)return o._of;const m=new Map();
  for(const x of o.mov)if(x.fluxo_descricao&&/^[12]/.test(x.fluxo_tipo||'')&&!m.has(x.fluxo_descricao))m.set(x.fluxo_descricao,DPC.reduce((a,c)=>(a[c]=x[c]||'',a),{}));
  for(const l of o.res.forecast?.linhas||[])if(l.descricao&&/^[12]/.test(l.tipo)&&!m.has(l.descricao))m.set(l.descricao,{fluxo_tipo:l.tipo,fluxo_conta:l.conta,fluxo_subconta:(o.res.subcontas||{})[cod(l.descricao)]||l.descricao,fluxo_descricao:l.descricao,base_apresentacao:'',resumo_servico:'',servico_resumo:''});
  return o._of=[...m.values()].sort((a,b)=>cod(a.fluxo_descricao).localeCompare(cod(b.fluxo_descricao),undefined,{numeric:true}))}
const DPST={validado:['Validado','good'],v07:['Da V07 (não validado)','info'],pre:['Pré-preenchido · validar','warn'],sem:['Sem classificação','bad']};
function stDP(c){const DP=X.p&&X.p._dp||new Map();return DP.has(c.chave)?'validado':c.pre.classificacao==='V07'?'v07':c.pre.fluxo_descricao?'pre':'sem'}
// ---------- 6. De-para: pendentes primeiro, filtros com pesquisa, edição em linha, aceitar sugestão, lote, Excel de ida e volta
const DPF=[['dpreg','Regional','regional'],['dpemp','Empresa','empresa'],['dpobra','Obra','obra'],['dpconta','Conta do fluxo','_conta']];
Object.assign(LBL,{dpreg:v=>v,dpemp:v=>nomeE(v)||v,dpobra:v=>nm(v)||v,dpconta:v=>nm(v)||v});
const dpF=()=>X.dpf||(X.dpf={dpreg:[],dpemp:[],dpobra:[],dpconta:[]});
const dpCur=c=>{const e=(X.dpEd||{})[c.chave],d=X.p._dp.get(c.chave)||c.pre;return e?{...d,...e}:d};
function dpOp(){const o=X.atual;return new Map(opcoesFluxo(o).map(f=>[f.fluxo_descricao,f]))}
function dpBase(){const o=X.atual,f=dpF();return chavesDP(o).map(c=>(c._conta=dpCur(c).fluxo_conta||'Sem classificação',c)).filter(c=>DPF.every(([k,,col])=>!f[k].length||f[k].includes(c[col])))}
function telaDepara(o){const f=dpF(),all=chavesDP(o).map(c=>(c._conta=dpCur(c).fluxo_conta||'Sem classificação',c)),base=dpBase(),n={validado:0,v07:0,pre:0,sem:0};for(const c of base)n[stDP(c)]++;
  if(X.dpSt==null)X.dpSt=n.pre+n.sem?'pendentes':'';const ed=podeEditar(X.emp);
  const op={};for(const [k,,col] of DPF){op[k]=new Map();for(const c of all)if(DPF.every(([k2,,c2])=>k2===k||!f[k2].length||f[k2].includes(c[c2])))op[k].set(c[col],(op[k].get(c[col])||0)+1)}
  const it=k=>[...op[k].entries()].sort((a,b)=>String(LBL[k](a[0])).localeCompare(String(LBL[k](b[0])),'pt-BR',{numeric:true})).map(([v,q])=>[v,q+' chaves']);
  const kp=(t,v,d,st,c)=>`<button type="button" class="v3-k cxa-k cxa-kb" data-dpst="${st}" aria-pressed="${X.dpSt===st}"><span class="t">${t}</span><span class="v ${c||''}">${num.format(v)}</span><span class="d">${d}</span></button>`;
  return `<div class="v3-cards cxa-cards cxa-ak">${kp('A validar',n.pre+n.sem,num.format(n.pre)+' com sugestão · '+num.format(n.sem)+' sem','pendentes',n.pre+n.sem?'neg':'')}${kp('Com sugestão',n.pre,'pré-preenchidas, 1 clique para aceitar','pre')}${kp('Sem classificação',n.sem,'escolher a conta do fluxo','sem',n.sem?'neg':'')}${kp('Da V07',n.v07,'classificadas pela base','v07')}${kp('Validadas',n.validado,'gravadas no de-para','validado','pos')}${kp('Todas',base.length,'chaves no filtro','')}</div>
  <div class="panel cxa-af" data-nao-imprime><div class="cxa-fgr">${DPF.map(([k,t])=>msel(k,t,it(k),f[k],{plural:'marcadas'})).join('')}
    <label class="hint" style="flex:1;min-width:200px">Pesquisar<br><input id="cxaDpQ" class="v3-sel" type="search" value="${esc(X.dpQ||'')}" placeholder="chave, serviço, insumo, obra" style="width:100%"></label>
    <span class="v3-acts"><button type="button" class="btn ghost" data-cxadpxls="1">Baixar Excel</button>${ed?`<label class="btn ghost" style="cursor:pointer">Subir Excel<input id="cxaDpArq" type="file" accept=".xlsx,.xls,.csv" hidden></label>`:''}</span></div>
    ${chipsSel(DPF.map(([k,t])=>[k,t,f[k]]))}</div>
  <div class="panel cxa-sec"><div id="cxaDpAsk" class="cxa-lote cxa-ask" hidden></div><div id="cxaDpLote" class="cxa-lote" hidden></div>
   <div class="tbl-wrap cxa-ct"><table class="cxa-dp"><thead><tr>${ed?'<th><input type="checkbox" id="cxaDpTodas" title="Marcar as desta página"></th>':''}<th>Serviço · insumo</th><th>Empresa · obra</th><th class="n">Valor</th><th>Fluxo_Tipo</th><th>Fluxo_Conta</th><th>Fluxo_SubConta</th><th>Fluxo_Descricao</th><th>Base Apresentação</th><th>RESUMO - SERVIÇO</th><th>Serviço - Resumo</th><th>Status</th>${ed?'<th></th>':''}</tr></thead><tbody id="cxaDp"></tbody></table></div><div id="cxaDpMais"></div>
   <p class="cxa-mais">Chave = Empresa-Obra-Produto-Serviço-Insumo das contas pagas. Fluxo_Tipo, Fluxo_Conta e Fluxo_SubConta seguem a Fluxo_Descricao escolhida. <b>+</b> é entrada de caixa e <b>−</b> é saída; "sinal trocado" avisa quando o pagamento caiu numa linha de entrada (ou o contrário), como um AFAC recebido × concedido. O que você valida vale em todas as abas e nos próximos meses. No Excel, preencha a coluna Fluxo_Descricao (e os resumos, se quiser) e suba de volta.</p></div>`}
function linhasDP(){const q=norm(X.dpQ||'');return dpBase().filter(c=>{const s_=stDP(c);return (X.dpSt==='pendentes'?s_==='pre'||s_==='sem':!X.dpSt||s_===X.dpSt)&&(!q||norm([c.chave,c.servico,c.insumo,c.obra,c.empresa,c.produto].join(' ')).includes(q))}).sort((a,b)=>a.valor-b.valor)}
const sinalF=t=>/^1/.test(t||'')?'(+)':/^2/.test(t||'')?'(−)':'';
function chipSinal(cur,valor){const t=cur.fluxo_tipo||'';if(!t)return '';const ent=/^1/.test(t),troc=valor&&(ent?valor<0:valor>0);
  return `<br><span class="cxa-sn ${ent?'p':'m'}">${ent?'+ Entrada':'− Saída'}</span>${troc?'<br><span class="cxa-sn x" title="O valor desta chave tem o sinal oposto ao da linha do fluxo">sinal trocado</span>':''}`}
function optFluxo(sel){const g={};for(const f of opcoesFluxo(X.atual))(g[f.fluxo_conta]=g[f.fluxo_conta]||[]).push(f);
  return `<option value="">— escolher —</option>`+Object.entries(g).map(([c,fs])=>`<optgroup label="${esc(nm(c))}">${fs.map(f=>`<option value="${esc(f.fluxo_descricao)}" ${f.fluxo_descricao===sel?'selected':''}>${sinalF(f.fluxo_tipo)} ${esc(nm(f.fluxo_descricao))}</option>`).join('')}</optgroup>`).join('')}
function pintarDP(){const tb=document.getElementById('cxaDp');if(!tb)return;const ls=linhasDP(),ed=podeEditar(X.emp),sel=X.dpSel||(X.dpSel=new Set());
  const PG=100,np=Math.max(1,Math.ceil(ls.length/PG));X.dpPg=Math.min(X.dpPg||0,np-1);const pag=ls.slice(X.dpPg*PG,X.dpPg*PG+PG);X._dpPag=pag.map(c=>c.chave);
  tb.innerHTML=pag.map(c=>{const cur=dpCur(c),s_=stDP(c),mud=!!(X.dpEd||{})[c.chave],sug=c.pre.fluxo_descricao;
    return `<tr data-ch="${esc(c.chave)}" class="${sel.has(c.chave)?'sel':''}">${ed?`<td><input type="checkbox" data-dpsel="${esc(c.chave)}" ${sel.has(c.chave)?'checked':''}></td>`:''}<td><b>${esc(c.servico||'—')}</b><br><span class="cxa-q">${esc(c.insumo)}</span><br><span class="k">${esc(c.chave)}</span></td>
      <td>${esc(nomeE(c.empresa)||c.empresa)}<br><span class="cxa-q">${esc(nm(c.obra))}${c.produto?' · '+esc(nm(c.produto)):''}</span></td><td class="n">${I0(c.valor)}<br><span class="cxa-q">${c.n} lanç.</span></td>
      <td>${esc(nm(cur.fluxo_tipo||'')||'—')}${chipSinal(cur,c.valor)}</td><td>${esc(nm(cur.fluxo_conta||'')||'—')}</td><td>${esc(nm(cur.fluxo_subconta||'')||'—')}</td>
      <td><select data-dpf="${esc(c.chave)}" ${ed?'':'disabled'} class="${mud?'mud':''}">${optFluxo(cur.fluxo_descricao)}</select>${s_!=='validado'&&sug&&sug!==cur.fluxo_descricao?`<br><span class="cxa-q">Sugestão: ${esc(nm(sug))}</span>`:''}</td>
      <td><input data-dpb="${esc(c.chave)}" value="${esc(cur.base_apresentacao||'')}" ${ed?'':'disabled'} placeholder="Base apresentação" list="cxaDpBas"></td>
      <td><input data-dps="${esc(c.chave)}" value="${esc(cur.resumo_servico||'')}" ${ed?'':'disabled'} placeholder="RESUMO - SERVIÇO" list="cxaDpRS"></td>
      <td><input data-dpr="${esc(c.chave)}" value="${esc(cur.servico_resumo||'')}" ${ed?'':'disabled'} placeholder="Serviço - Resumo" list="cxaDpRes"></td>
      <td>${chip(mud?'Alterado · validar':DPST[s_][0],mud?'warn':DPST[s_][1])}</td>${ed?`<td><button type="button" class="btn ${s_==='validado'&&!mud?'ghost':''}" data-cxadpok="${esc(c.chave)}">${s_==='validado'&&!mud?'Salvar':'✓ Validar'}</button></td>`:''}</tr>`}).join('')||`<tr><td colspan="13">Nada com esse filtro. ${X.dpSt==='pendentes'?'Tudo validado aqui.':''}</td></tr>`;
  const vals=k=>[...new Set(opcoesFluxo(X.atual).map(f=>f[k]).concat([...X.p._dp.values()].map(d=>d[k])).filter(Boolean))].sort();
  document.getElementById('cxaDpMais').innerHTML=`<datalist id="cxaDpRes">${vals('servico_resumo').map(v=>`<option value="${esc(v)}">`).join('')}</datalist><datalist id="cxaDpBas">${vals('base_apresentacao').map(v=>`<option value="${esc(v)}">`).join('')}</datalist><datalist id="cxaDpRS">${vals('resumo_servico').map(v=>`<option value="${esc(v)}">`).join('')}</datalist>`+
    (np>1?`<div class="cxa-pg"><button type="button" class="btn ghost" data-dppg="${X.dpPg-1}" ${X.dpPg?'':'disabled'}>‹ Anterior</button><span>Chaves ${num.format(X.dpPg*PG+1)}–${num.format(Math.min(ls.length,X.dpPg*PG+PG))} de ${num.format(ls.length)} · maiores valores primeiro</span><button type="button" class="btn ghost" data-dppg="${X.dpPg+1}" ${X.dpPg<np-1?'':'disabled'}>Próxima ›</button></div>`:`<p class="cxa-mais">${num.format(ls.length)} chave${ls.length===1?'':'s'}.</p>`);
  const t=document.getElementById('cxaDpTodas');if(t)t.checked=pag.length>0&&pag.every(c=>sel.has(c.chave));pintarLote();pintarAsk()}
const CAMPO_DP={fluxo_descricao:'Fluxo_Descricao',base_apresentacao:'Base Apresentação',resumo_servico:'RESUMO - SERVIÇO',servico_resumo:'Serviço - Resumo'};
function irmaosDP(ch){const all=chavesDP(X.atual),c=all.find(x=>x.chave===ch);if(!c||!c.servico)return [];return all.filter(x=>x.servico===c.servico&&x.chave!==ch).map(x=>x.chave)}
function editarDP(ch,patch){const ed=X.dpEd=X.dpEd||{};ed[ch]={...(ed[ch]||{}),...patch};const ir=irmaosDP(ch);X.dpAsk=ir.length?{ch,patch,ir}:null}
function pintarAsk(){const b=document.getElementById('cxaDpAsk');if(!b)return;const a=X.dpAsk;b.hidden=!a;if(!a)return;const c=chavesDP(X.atual).find(x=>x.chave===a.ch);
  const k=Object.keys(a.patch).find(k_=>CAMPO_DP[k_]),v=a.patch[k];
  b.innerHTML=`<b>Alterou ${esc(CAMPO_DP[k]||'')} para “${esc(nm(v)||'vazio')}” no serviço ${esc(c?.servico||'')}.</b><span class="hint">${a.ir.length>1?'Outras '+num.format(a.ir.length)+' chaves têm':'Outra chave tem'} o mesmo serviço (outras obras ou insumos).</span><button type="button" class="btn" data-dpask="todas">Aplicar em todas (${num.format(a.ir.length+1)})</button><button type="button" class="btn ghost" data-dpask="uma">Só nesta chave</button>`}

function pintarLote(){const b=document.getElementById('cxaDpLote');if(!b)return;const sel=X.dpSel||new Set();b.hidden=!sel.size;if(!sel.size)return;
  b.innerHTML=`<b>${num.format(sel.size)} chave${sel.size>1?'s':''} marcada${sel.size>1?'s':''}</b><button type="button" class="btn" data-dplote="sug">✓ Validar as marcadas como estão</button><span class="hint">ou classificar todas como</span><select id="cxaDpLoteF" class="v3-sel">${optFluxo('')}</select><button type="button" class="btn" data-dplote="como">Aplicar e validar</button><button type="button" class="btn ghost" data-dplote="limpa">Desmarcar</button>`}
async function gravarDP(chs,como){const o=X.atual,op=dpOp(),cs=new Map(chavesDP(o).map(c=>[c.chave,c]));const rows=[];
  for(const ch of chs){const c=cs.get(ch);if(!c)continue;const cur=como?{...dpCur(c),fluxo_descricao:como}:dpCur(c);const f=op.get(cur.fluxo_descricao);if(!f)continue;
    rows.push({empresa_id:X.emp,chave:ch,regional:c.regional,empresa_origem:c.empresa,obra:c.obra,produto:c.produto,servico:c.servico,insumo:c.insumo,...f,
      servico_resumo:cur.servico_resumo||f.servico_resumo||'',resumo_servico:cur.resumo_servico||f.resumo_servico||'',base_apresentacao:cur.base_apresentacao||f.base_apresentacao||'',atualizado_em:new Date().toISOString()})}
  if(!rows.length)return toast('Escolha a classificação no fluxo antes de validar.');
  for(let i=0;i<rows.length;i+=500){const {error}=await sb.from('dados_depara').upsert(rows.slice(i,i+500),{onConflict:'empresa_id,chave'});if(error){if(/dados_depara/.test(error.message||''))return toast('Falta aplicar no banco a atualização 0034 (de-para).');throw error}}
  const DP=X.p._dp;for(const r of rows){DP.set(r.chave,r);if(X.dpEd)delete X.dpEd[r.chave];X.dpSel&&X.dpSel.delete(r.chave)}for(const per of Object.keys(X.p))if(per[0]!=='_'){const pp=X.p[per];aplicaDP(pp,DP);pp._ch=null;pp._of=null}
  toast(rows.length+' chave'+(rows.length>1?'s validadas':' validada')+' no de-para.'+(rows.length<chs.length?` ${chs.length-rows.length} sem classificação ficaram de fora.`:''));render(true)}
async function subirDP(f){const wb=XLSX.read(await f.arrayBuffer());const ls=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});const op=dpOp(),cs=new Set(chavesDP(X.atual).map(c=>c.chave));
  const ed=X.dpEd=X.dpEd||{};let ok=0,ruim=0;for(const l of ls){const ch=String(l.Chave||'').trim(),fd=String(l.Fluxo_Descricao||'').trim();if(!ch||!cs.has(ch))continue;
    if(fd&&!op.has(fd)){ruim++;continue}ed[ch]={...(fd?{fluxo_descricao:fd}:{}),servico_resumo:String(l['Serviço - Resumo']||''),resumo_servico:String(l['RESUMO - SERVIÇO']||''),base_apresentacao:String(l['Base Apresentação']||'')};ok++}
  X.dpSel=new Set(Object.keys(ed));X.dpSt='';toast(`${ok} chaves lidas do Excel${ruim?`, ${ruim} com Fluxo_Descricao que não existe no fluxo`:''}. Confira e clique em "Aceitar" no lote para gravar.`);render(true)}

// ---------- Perguntas do negócio: respostas diretas com real, orçado e forecast (parte "perguntas" do painel)
const MESN=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const mesI=(i)=>MESN[i%12]+'/'+String(26+Math.floor(i/12));
const MI=v=>{const a=Math.abs(v)/1000;return (v<0?'−':'')+(a>=1?a.toLocaleString('pt-BR',{maximumFractionDigits:1,minimumFractionDigits:1})+' mi':Math.round(Math.abs(v)).toLocaleString('pt-BR')+' mil')};
const PQF=[['pqreg','Regional',0],['pqcid','Cidade',1],['pqemp','Empresa',2]];
Object.assign(LBL,{pqreg:v=>v,pqcid:v=>v,pqemp:v=>String(v).replace(/^\d+-/,'')});
const pqF=()=>X.pqf||(X.pqf={pqreg:[],pqcid:[],pqemp:[]});
const somar=(a,b)=>{for(let i=0;i<b.length;i++)a[i]=(a[i]||0)+b[i];return a};
function hbar(items,lab,val,cor,fmt){const m=Math.max(1,...items.map(x=>Math.abs(val(x))));return items.map(x=>`<div class="pq-hb"><span title="${esc(lab(x))}">${esc(lab(x))}</span><i><b class="${cor||''}" style="width:${Math.abs(val(x))/m*100}%"></b></i><em>${(fmt||MI)(val(x))}</em></div>`).join('')}
async function vPerguntas(){const emps=S.empresas;if(!emps.length)return semEmpresa();
  if(!emps.some(e=>e.id===X.emp)){X.emp=null;for(const e of [...selEmp(),...emps]){const r=await carregar(e.id);if(Object.keys(r).some(k_=>k_[0]!=='_')){X.emp=e.id;break}}X.emp=X.emp||(selEmp()[0]||emps[0]).id}
  const p=X.p=await carregar(X.emp);const pers=Object.keys(p).filter(k_=>k_[0]!=='_').sort().reverse();const pq=pers.map(k_=>p[k_].perguntas?.conteudo).find(Boolean);
  const subirPQ=podeEditar(X.emp)?`<label class="btn ghost" style="cursor:pointer">Subir base<input id="pqArq" type="file" accept=".json,application/json" hidden></label>`:'';
  if(!pq)return `<div class="v3 cxa"><div class="v3-bar"><span></span><div class="v3-fl">${subirPQ}</div></div>${vazio('Perguntas do negócio ainda sem base','<p style="margin:0">Esta tela usa o real, o orçado e o forecast do FLUXO do cliente. Use <b>Subir base</b> com o arquivo de perguntas que a Gevans monta a partir do FLUXO.</p>')}</div>`;
  const f=pqF(),L=pq.linhas.map(l=>({r:l[0],c:l[1],e:l[2],k:l[3],real:l[4],orc:l[5],fc:l[6]}));
  const op={};for(const [k,,i] of PQF){op[k]=new Map();const col=['r','c','e'][i];for(const l of L)if(PQF.every(([k2,,i2])=>k2===k||!f[k2].length||f[k2].includes(l[['r','c','e'][i2]])))op[k].set(l[col],(op[k].get(l[col])||0)+1)}
  const it=k=>[...op[k].keys()].sort((a,b)=>String(LBL[k](a)).localeCompare(String(LBL[k](b)),'pt-BR')).map(v=>[v,'']);
  const ls=L.filter(l=>PQF.every(([k,,i])=>!f[k].length||f[k].includes(l[['r','c','e'][i]])));
  const empsF=new Set(ls.map(l=>l.e)),cod=e=>String(e).split('-')[0];
  const saldo=[...empsF].reduce((a,e)=>a+(pq.saldo_out26[cod(e)]||0),0);
  const agr=(key,ser,cls,ms)=>{const m=new Map();for(const l of ls){if(cls&&!cls.includes(l.k))continue;const a=l[ser];let v=0;for(const i of ms)v+=a[i]||0;const kk=key(l);m.set(kk,(m.get(kk)||0)+v)}return m};
  const R10=[...Array(10).keys()],F24=[...Array(24).keys()],FUT=[...Array(26).keys()].map(i=>i+10),OP=['rec','cus','obra'];
  // 1 caixa
  const net={fc:Array(36).fill(0),orc:Array(36).fill(0)};for(const l of ls){somar(net.fc,l.fc);somar(net.orc,l.orc)}
  const traj=k=>{let s_=saldo;return FUT.map(i=>(s_+=net[k][i],s_))},tf=traj('fc'),to=traj('orc');const acaba=tf.findIndex(v=>v<0),acabaO=to.findIndex(v=>v<0);
  const W=1000,H=140,mx=Math.max(1,...tf.map(Math.abs),...to.map(Math.abs)),yy=v=>H/2-v/mx*(H/2-8),pts=a=>a.map((v,i)=>`${(i*W/(a.length-1)).toFixed(0)},${yy(v).toFixed(0)}`).join(' ');
  const spark=`<svg viewBox="0 0 ${W} ${H+18}" width="100%" class="pq-sp"><line x1="0" x2="${W}" y1="${H/2}" y2="${H/2}" class="z"/><polyline points="${pts(to)}" class="o"/><polyline points="${pts(tf)}" class="f"/>${FUT.filter((_,j)=>j%3===0).map(i=>`<text x="${((i-10)*W/25).toFixed(0)}" y="${H+14}" ${i===10?'style="text-anchor:start"':''}>${mesI(i)}</text>`).join('')}</svg>`;
  // 2 retorno e 5 custo até receber, por empresa
  const pe=new Map();for(const l of ls){if(!OP.includes(l.k))continue;const t=pe.get(l.e)||{rec:Array(36).fill(0),cus:Array(36).fill(0)};somar(l.k==='rec'?t.rec:t.cus,l.fc);pe.set(l.e,t)}
  const EM=[...pe.entries()].map(([e,t])=>{const pc=t.cus.findIndex(v=>v<-1),pr=t.rec.findIndex(v=>v>1);let acc=0,neg=false,pb=-1;for(let i=0;i<36;i++){acc+=t.rec[i]+t.cus[i];if(acc<-1)neg=true;if(neg&&acc>=0&&pb<0)pb=i}return {e,pc,pr,gap:pc>=0&&pr>pc?pr-pc:null,pb,neg,acc}});
  const pb=EM.filter(x=>x.pb>=0).sort((a,b)=>a.pb-b.pb),nunca=EM.filter(x=>x.neg&&x.pb<0),gap=EM.filter(x=>x.gap).sort((a,b)=>b.gap-a.gap);
  // 3 lucro e 7 custo-benefício por cidade
  const cid=new Map();for(const [ser,ms] of [['real',R10],['orc',R10],['fc',F24]])for(const l of ls){if(!OP.includes(l.k))continue;const t=cid.get(l.c)||{};const o=t[ser]||(t[ser]={rec:0,cus:0});let v=0;for(const i of ms)v+=l[ser][i]||0;if(l.k==='rec')o.rec+=v;else o.cus+=v;cid.set(l.c,t)}
  const C_=[...cid.entries()].map(([c,t])=>{const lu=s_=>t[s_]?t[s_].rec+t[s_].cus:0,cb=s_=>t[s_]&&t[s_].cus<-1?t[s_].rec/-t[s_].cus:null;return {c,lr:lu('real'),lo:lu('orc'),lf:lu('fc'),br:cb('real'),bo:cb('orc'),bf:cb('fc'),rec:t.real?.rec||0}});
  const luc=C_.slice().sort((a,b)=>b.lr-a.lr),cbs=C_.filter(x=>x.br!=null&&x.rec>Math.max(1000,0.002*Math.max(...C_.map(y=>y.rec)))).sort((a,b)=>b.br-a.br);
  // 4 obra em aberto
  const ob=[...agr(l=>l.c,'fc',['obra'],FUT).entries()].map(([c,v])=>({c,v:-v})).filter(x=>x.v>1).sort((a,b)=>b.v-a.v);
  // 6 regional 5 anos
  const ry=new Map();for(const l of ls){if(l.k!=='rec')continue;const t=ry.get(l.r)||[0,0,0];for(let y=0;y<3;y++)for(let m=0;m<12;m++)t[y]+=l.fc[y*12+m]||0;ry.set(l.r,t)}
  const RG=[...ry.entries()].map(([r,t])=>({r,t,p:Math.max(0,t[2]+1.5*(t[2]-t[0]))})).sort((a,b)=>b.p-a.p);
  const cb2=v=>v==null?'—':v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const nomeEm=e=>String(e).replace(/^\d+-/,'').toLowerCase().replace(/(^|\s)\S/g,m=>m.toUpperCase()).slice(0,34);
  const Q=[
   ['Quando meu caixa vai acabar?',acaba>=0?`<b>${mesI(acaba+10)}</b> pelo forecast, se nada mudar${acabaO>=0?` · pelo orçado: ${mesI(acabaO+10)}`:' · pelo orçado não acaba até dez/28'}`:`Não acaba até dez/28 pelo forecast · menor saldo ${MI(Math.min(...tf))}`,
    `Saldo dos bancos em out/26: <b>${MI(saldo)}</b>. Linhas: saldo projetado mês a mês. <span class="pq-lg"><i class="f"></i>Forecast</span><span class="pq-lg"><i class="o"></i>Orçado</span>${spark}`,'Extrato out/26 + Forecast e Orçado da V07','saldo dos bancos de jan a set/26 e separar aplicações do caixa livre',1],
   ['Qual o tempo de retorno?',pb.length?`<b>${pb.length}</b> empresa${pb.length>1?'s':''} volta${pb.length>1?'m':''} a ficar positiva${pb.length>1?'s':''} até dez/28${nunca.length?` · <b>${nunca.length}</b> ainda não`:''}`:'Nenhuma empresa fecha o retorno até dez/28',
    'Mês em que o acumulado (recebimentos − custos e despesas) volta a ficar positivo, contando de jan/26:'+(pb.length?'':'<p class="hint">Nenhuma empresa no filtro recupera o que gastou até dez/28.</p>')+hbar(pb.slice(0,8),x=>nomeEm(x.e),x=>x.pb+1,'',v=>mesI(v-1)),'Real jan–out/26 + Forecast','investimento feito antes de 2026 (terreno, obra anterior); sem ele o retorno sai mais curto'],
   ['Quais cidades mais me dão lucro?',luc[0]?`<b>${esc(luc[0].c)}</b>${luc[1]?` e <b>${esc(luc[1].c)}</b>`:''}`:'—',
    'Lucro operacional jan–out/26 (recebimentos − custos e despesas, sem empréstimos e dividendos):'+`<table class="pq-t"><tr><th>Cidade</th><th>Real</th><th>Orçado</th><th>Forecast 26+27</th></tr>${luc.slice(0,8).map(x=>`<tr><td>${esc(x.c)}</td><td class="${x.lr<0?'neg':''}"><b>${MI(x.lr)}</b></td><td>${MI(x.lo)}</td><td>${MI(x.lf)}</td></tr>`).join('')}</table>`,'Real · Orçado · Forecast','rateio das despesas da Matriz por cidade (hoje ficam na cidade da holding)'],
   ['Quais cidades têm mais custo de obra em aberto?',ob[0]?`<b>${esc(ob[0].c)}</b> (${MI(ob[0].v)})${ob[1]?` e <b>${esc(ob[1].c)}</b>`:''}`:'Sem custo de obra a pagar no filtro',
    'Custo de obra ainda a pagar de nov/26 a dez/28:'+hbar(ob.slice(0,8),x=>x.c,x=>x.v,'r'),'Forecast V07','contratos de obra assinados e % executado, para separar o que está contratado do que é só orçado'],
   ['Quanto tempo cada empresa gera custo até começar a receber?',gap.length?`<b>${gap.length}</b> empresa${gap.length>1?'s':''} começa${gap.length>1?'m':''} a receber depois de 2026 · maior espera: <b>${gap[0].gap} meses</b>`:'Todas já recebiam em jan/26',
    'Meses entre o primeiro custo e o primeiro recebimento:'+hbar(gap.slice(0,8),x=>nomeEm(x.e),x=>x.gap,'',v=>v+' meses'),'Real + Forecast','data de início de cada empreendimento (quem já vendia antes de 2026 não aparece aqui)'],
   ['Qual regional vai trazer mais receita daqui a 5 anos?',RG[0]?`<b>${esc(RG[0].r)}</b>`:'—',
    'Receita projetada para 2031 seguindo a tendência 2026→2028:'+`<table class="pq-t"><tr><th>Regional</th><th>2026</th><th>2028</th><th>2031 (projeção)</th></tr>${RG.slice(0,8).map(x=>`<tr><td>${esc(x.r)}</td><td>${MI(x.t[0])}</td><td>${MI(x.t[2])}</td><td><b>${MI(x.p)}</b></td></tr>`).join('')}</table>`,'Orçado + Forecast até 2028 · projeção','premissas de 2029 a 2031 (lançamentos e vendas previstas); a V07 vai só até dez/28'],
   ['Qual o melhor custo-benefício por cidade?',cbs[0]?`<b>${esc(cbs[0].c)}</b>: R$ ${cb2(cbs[0].br)} recebidos para cada R$ 1 gasto`:'—',
    'Recebido ÷ gasto (custos, despesas e obra):'+`<table class="pq-t"><tr><th>Cidade</th><th>Real</th><th>Orçado</th><th>Forecast</th></tr>${cbs.slice(0,8).map(x=>`<tr><td>${esc(x.c)}</td><td><b>${cb2(x.br)}</b></td><td>${cb2(x.bo)}</td><td>${cb2(x.bf)}</td></tr>`).join('')}</table>`,'Real · Orçado · Forecast','área vendável e lotes por cidade, para custo por m² e por lote']];
  return `<div class="v3 cxa pq"><p class="cxa-lead">Respostas diretas com o real (jan–out/26), o orçado e o forecast do FLUXO até dez/28. Cada pergunta mostra de onde vem o número e o que falta para ficar completa. Valores em R$.</p>
   <div class="panel cxa-af" data-nao-imprime><div class="cxa-fgr">${PQF.map(([k,t])=>msel(k,t,it(k),f[k],{plural:'marcadas'})).join('')}<span class="v3-acts"><button class="btn ghost" type="button" onclick="window.print()">Imprimir / PDF</button>${subirPQ}</span></div>${chipsSel(PQF.map(([k,t])=>[k,t,f[k]]))}</div>
   <div class="pq-g">${Q.map(([t,a,b,base,falta,larga],i)=>`<section class="panel pq-q ${larga?'w':''}"><div class="pq-h"><span>${i+1}</span><h3>${t}</h3></div><div class="pq-a">${a}</div><div class="pq-b">${b}</div><div class="pq-f"><span class="ok">✓ Base: ${base}</span><span class="fa">Para ficar completo: ${falta}</span></div></section>`).join('')}</div>
   <p class="cxa-mais">Fonte: ${esc(pq.fonte||'')}. ${empsF.size} empresas no filtro.</p></div>`}
const cssPQ=document.createElement('style');cssPQ.textContent=`.pq-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}@media(max-width:900px){.pq-g{grid-template-columns:1fr}}.pq-q{display:flex;flex-direction:column;gap:8px}.pq-q.w{grid-column:1/-1}
.pq-h{display:flex;gap:10px;align-items:center}.pq-h span{width:24px;height:24px;border-radius:50%;background:var(--accent,#0d5f73);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}.pq-h h3{margin:0;font-size:15px}
.pq-a{font-size:17px}.pq-a b{color:var(--accent,#0d5f73)}.pq-b{font-size:12.5px;color:var(--ink-2)}.pq-hb{display:grid;grid-template-columns:minmax(120px,210px) 1fr 84px;gap:8px;align-items:center;margin:5px 0}.pq-hb span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}.pq-hb i{background:var(--surface-2);border-radius:4px;height:10px}.pq-hb i b{display:block;height:10px;border-radius:4px;background:var(--good,#1f8a5b)}.pq-hb i b.r{background:var(--bad,#c0392b)}.pq-hb em{font-style:normal;font-variant-numeric:tabular-nums;text-align:right;color:var(--ink)}
.pq-t{width:100%;border-collapse:collapse;margin-top:6px}.pq-t th,.pq-t td{text-align:right;padding:4px 6px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums;font-size:12px}.pq-t th:first-child,.pq-t td:first-child{text-align:left}.pq-t th{color:var(--ink-3);font-weight:600;font-size:11px}.pq-t td.neg{color:var(--bad)}
.pq-f{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11.5px;border-top:1px dashed var(--line);padding-top:8px;margin-top:auto}.pq-f .ok{color:var(--good,#1f7a4f)}.pq-f .fa{color:#a66300}
.pq-sp line.z{stroke:var(--line);stroke-dasharray:3 3}.pq-sp polyline{fill:none;stroke-width:2.5}.pq-sp .f{stroke:var(--accent,#0d5f73)}.pq-sp .o{stroke:var(--ink-3);stroke-dasharray:5 4;stroke-width:1.8}.pq-sp{max-height:190px}.pq-sp text{font-size:12px;fill:var(--ink-3);text-anchor:middle}.pq-lg{display:inline-flex;align-items:center;gap:4px;margin-left:10px}.pq-lg i{width:14px;height:3px;background:var(--accent,#0d5f73);display:inline-block}.pq-lg i.o{background:var(--ink-3)}`;document.head.appendChild(cssPQ);

async function vCaixa(){const modo=rota()==='depara'?'depara':'caixa';
  const emps=S.empresas;if(!emps.length)return semEmpresa();
  let p;try{
    if(!emps.some(e=>e.id===X.emp)){X.emp=null;for(const e of [...selEmp(),...emps]){const r=await carregar(e.id);if(Object.keys(r).some(k_=>k_[0]!=='_')){X.emp=e.id;break}}X.emp=X.emp||(selEmp()[0]||emps[0]).id}
    p=await carregar(X.emp)}
  catch(e){if(/dados_paineis/.test(e?.message||''))return vazio('Caixa e auditoria ainda não ativado','<p style="margin:0">Falta aplicar no banco a atualização 0033.</p>');throw e}
  const pers=Object.keys(p).filter(k_=>k_[0]!=='_').sort().reverse();X.p=p;
  const subir=podeEditar(X.emp)?`<label class="btn ghost" style="cursor:pointer">Subir painel<input id="cxaArq" type="file" accept=".json,application/json" hidden></label>`:'';
  const selE=`<label class="hint">${Object.values(p).some(x=>x&&x.grupo)?'Cadastro':'Empresa'}<br><select id="cxaEmp" class="v3-sel">${emps.map(e=>`<option value="${e.id}" ${e.id===X.emp?'selected':''}>${esc(nomeEmp(e))}</option>`).join('')}</select></label>`;
  if(!pers.length)return `<div class="v3"><div class="v3-bar"><span></span><div class="v3-fl">${selE}</div></div>${vazio('Nenhum painel de caixa nesta empresa','<p style="margin:0">Envie as planilhas do mês (receitas, contas pagas, transferências, tarifas e o extrato) para a Gevans montar o caixa e a auditoria por conta. Com o arquivo do painel em mãos (.json), use Subir painel.</p>',subir)}</div>`;
  if(!pers.includes(X.per))X.per=pers[0];const o0=p[X.per];if(!o0.grupo)X.f={reg:[],cid:[],emp:[],obra:[]};const o=X.atual=modo==='depara'?o0:vista(o0);
  const tabs=modo==='depara'?[]:[['visao','Visão geral'],['drill','Fluxo de caixa (drill)'],['auditoria','Auditoria por conta'],['confronto','Confronto planilhas × FLUXO'],['aplic','Aplicações']];
  if(modo==='caixa'&&!tabs.some(t=>t[0]===X.tab))X.tab='visao';const TAB=modo==='depara'?'depara':X.tab;
  const corpo=!o.mov.length&&o0.grupo?'':TAB==='drill'?telaDrill(o):TAB==='auditoria'?telaAud(o):TAB==='confronto'?telaConfronto(o):TAB==='aplic'?telaAplic(p,o):TAB==='depara'?telaDepara(o):telaVisao(o);
  if(TAB==='depara')setTimeout(pintarDP,0);
  const nDP=pendDP(o0).length,alerta=nDP&&TAB!=='depara'?`<div class="panel cxa-alerta" role="status"><b>⚠ ${num.format(nDP)} chave${nDP>1?'s':''} sem classificação validada</b> no de-para (itens novos ou pré-classificados). Já vêm pré-preenchidas, só falta validar. <a class="btn ghost" href="#depara">Abrir de-para</a></div>`:'';
  if(TAB==='auditoria')setTimeout(pintarAud,0);
  return `<div class="v3 cxa"><div class="v3-bar"><div class="v3-seg" role="tablist">${tabs.map(([k_,n])=>`<button type="button" aria-pressed="${X.tab===k_}" data-cxatab="${k_}">${n}</button>`).join('')}</div>
   <div class="v3-fl">${emps.length>1?selE:''}<span class="v3-acts" data-nao-imprime><button class="btn ghost" type="button" data-cxaexp="pdf">Exportar PDF</button><button class="btn ghost" type="button" data-cxaexp="excel">Excel</button></span>${subir}<label class="hint">Mês<br><select id="cxaPer" class="v3-sel">${pers.map(x=>`<option value="${x}" ${x===X.per?'selected':''}>${MES(x)}</option>`).join('')}</select></label></div></div>
   ${alerta}${modo==='depara'?'':barraFiltros(o0)}${['visao','drill','auditoria','confronto'].includes(TAB)?avisoADM(o):''}${o0.grupo&&!o.mov.length?vazio('Nada com esse filtro','<p style="margin:0">Troque ou limpe os filtros.</p>'):corpo}
   <p class="cxa-mais">Fonte: ${esc(o.res.fonte||o.resumo?.fonte||'planilhas do cliente')}. Atualizado em ${dt((o.resumo?.atualizado_em||'').slice(0,10))}.</p></div>`}

document.addEventListener('click',ev=>{const b=ev.target.closest('[data-dpst],[data-dppg],[data-dplote],[data-dpask]');if(!b||!document.querySelector('.cxa'))return;
  if(b.dataset.dpst!=null){X.dpSt=X.dpSt===b.dataset.dpst&&b.dataset.dpst!==''?'':b.dataset.dpst;X.dpPg=0;render(true);return}
  if(b.dataset.dppg!=null){X.dpPg=+b.dataset.dppg;pintarDP();document.querySelector('.cxa-dp')?.scrollIntoView({block:'start'});return}
  if(b.dataset.dpask){const a=X.dpAsk;X.dpAsk=null;if(a&&b.dataset.dpask==='todas'){const ed=X.dpEd=X.dpEd||{},sel=X.dpSel=X.dpSel||new Set();for(const ch of a.ir)ed[ch]={...(ed[ch]||{}),...a.patch};sel.add(a.ch);a.ir.forEach(ch=>sel.add(ch));toast(`Alteração copiada para ${a.ir.length+1} chaves e todas marcadas. Clique em "Validar as marcadas" para gravar.`)}pintarDP();return}
  const sel=[...(X.dpSel||[])];if(b.dataset.dplote==='limpa'){X.dpSel=new Set();pintarDP();return}
  if(b.dataset.dplote==='sug')return gravarDP(sel).catch(e=>toast(traduz(e)));
  if(b.dataset.dplote==='como'){const v=document.getElementById('cxaDpLoteF').value;if(!v)return toast('Escolha a conta do fluxo para as marcadas.');return gravarDP(sel,v).catch(e=>toast(traduz(e)))}});
document.addEventListener('click',ev=>{const u=ev.target.closest('button[data-cxaau],[data-cxalpg]');if(u&&document.querySelector('.cxa')){if(u.dataset.cxalpg!=null){X.lpg=+u.dataset.cxalpg;pintarAud();document.getElementById('cxaDet')?.scrollIntoView({block:'start'});return}
    const A=X.au=X.au||{},k_=u.dataset.cxaau;if(k_==='limpa')X.au={bco:[],sit:'',qc:'',pg:0};else if(k_==='pg')A.pg=+u.dataset.v;else if(k_==='sit')A.sit=A.sit===u.dataset.v?'':u.dataset.v,A.pg=0;render(true);return}});
document.addEventListener('click',ev=>{const t=ev.target.closest('[data-cxatab],[data-cxast],[data-cxaconta],[data-cxadr],[data-cxadn],[data-cxadrill],[data-cxatodos],[data-cxaexp],[data-cxafset],[data-cxaflimpa],[data-cxams],[data-cxaap],[data-cxaapall],[data-cxadpok],[data-cxadpall],[data-cxadpxls]');if(!t||!document.querySelector('.cxa'))return;
  if(t.dataset.cxaap){X.apAb=X.apAb===t.dataset.cxaap?null:t.dataset.cxaap;render(true);return}
  if(t.dataset.cxaapall){X.apAll=1;render(true);return}
  if(t.dataset.cxadpok){gravarDP([t.dataset.cxadpok]).catch(e=>toast(traduz(e)));return}
  if(t.dataset.cxadpxls){const DP=X.p._dp;const ls=chavesDP(X.atual).map(c=>{const d=DP.get(c.chave)||c.pre;return {Chave:c.chave,Regional:c.regional,Empresa:c.empresa,Obra:c.obra,Produto:c.produto,'Serviço':c.servico,Insumo:c.insumo,Fluxo_Tipo:d.fluxo_tipo,Fluxo_Conta:d.fluxo_conta,Fluxo_SubConta:d.fluxo_subconta,Fluxo_Descricao:d.fluxo_descricao,'Base Apresentação':d.base_apresentacao,'RESUMO - SERVIÇO':d.resumo_servico,'Serviço - Resumo':d.servico_resumo,Status:DPST[stDP(c)][0],'Valor no mês':Math.round(c.valor*100)/100}});
    if(window.XLSX){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ls),'De-para');XLSX.writeFile(wb,'de-para-'+X.per+'.xlsx')}else toast('Recarregue a página para exportar.');return}
  if(t.dataset.cxaflimpa){X.f={reg:[],cid:[],emp:[],obra:[]};X.dAb=null;X.conta=null;render(true);return}
  if(t.dataset.cxafset){const k0=t.dataset.cxafset;X.f[k0]=[t.dataset.v];if(k0==='reg'){X.f.cid=[];X.f.emp=[];X.f.obra=[]}else X.f.obra=[];X.dAb=null;X.conta=null;render(true);return}
  if(t.dataset.cxaexp){const nomes={visao:'Visão geral',drill:'Fluxo de caixa (drill)',auditoria:'Auditoria por conta',confronto:'Confronto planilhas × FLUXO',aplic:'Aplicações',depara:'De-para'};
    const sub=(nomes[X.tab]||'')+' · '+MES(X.per)+(filtroTxt()?' · '+filtroTxt():'')+(X.tab==='auditoria'&&X.conta?' · '+banco(X.conta)+(X.status?' · '+(STN[X.status]||X.status):''):'');
    const adm=admTot(X.atual?.mov||[]);const sub2=sub+(adm.pg||adm.rc?' · Taxa ADM de 4% é gerencial e não altera o saldo das contas':'');
    const f=t.dataset.cxaexp==='pdf'?window.relatorioPDF:window.relatorioExcel;if(f)f({sub:sub2});else toast('Recarregue a página para exportar.');return}
  if(t.dataset.cxatab){X.tab=t.dataset.cxatab;render(true)}
  else if(t.dataset.cxast!=null){X.status=X.status===t.dataset.cxast?'':t.dataset.cxast;pintarAud()}
  else if(t.dataset.cxadn!=null){X.dNivel=+t.dataset.cxadn;X.dAb=null;X.dFoco=null;render(true)}
  else if(t.dataset.cxadr){const a=X.dAb=X.dAb||new Set();a.has(t.dataset.cxadr)?a.delete(t.dataset.cxadr):a.add(t.dataset.cxadr);render(true)}
  else if(t.dataset.cxatodos){X.dTodos=t.dataset.cxatodos;render(true)}
  else if(t.dataset.cxadrill){const c=t.dataset.cxadrill,tipo=c.startsWith('1')?'1. ENTRADAS (+)':'2. SAÍDAS (-)';X.dNivel=1;X.dAb=null;X.dFoco=tipo+'›'+c;X.tab='drill';render(true)}
  else if(t.dataset.cxaconta){const ja=X.tab==='auditoria';X.conta=t.dataset.cxaconta;X.status='';X.lpg=0;X.tab='auditoria';render(true);if(ja)setTimeout(()=>document.getElementById('cxaDet')?.scrollIntoView({behavior:'smooth',block:'start'}),60)}});
document.addEventListener('change',ev=>{const t=ev.target;if(t.dataset&&t.dataset.cxaau&&t.tagName==='SELECT'){const k_=t.dataset.cxaau,A=X.au=X.au||{};if(k_==='conta'){X.conta=t.value;X.status='';X.lpg=0}else{A[k_]=t.value;A.pg=0}render(true);return}if(t.dataset&&t.dataset.msv){const k_=t.dataset.msv,cur=getMS(k_),v=t.value;setMS(k_,t.type==='radio'?[v]:t.checked?[...new Set([...cur,v])]:cur.filter(x=>x!==v));X.msOpen=t.type==='radio'?null:k_;const sc=document.querySelector(`[data-ms="${k_}"] .cxa-msl`)?.scrollTop||0;render(true);setTimeout(()=>{const l=document.querySelector(`[data-ms="${k_}"] .cxa-msl`);if(l)l.scrollTop=sc},0);return}

  if(t.dataset&&t.dataset.dpf){const f=dpOp().get(t.value);editarDP(t.dataset.dpf,{fluxo_descricao:t.value,...(f?{fluxo_conta:f.fluxo_conta,fluxo_subconta:f.fluxo_subconta,fluxo_tipo:f.fluxo_tipo}:{})});setTimeout(pintarDP,0);return}
  if(t.dataset&&(t.dataset.dpr||t.dataset.dpb||t.dataset.dps)){const ch=t.dataset.dpr||t.dataset.dpb||t.dataset.dps;editarDP(ch,{[t.dataset.dpr?'servico_resumo':t.dataset.dps?'resumo_servico':'base_apresentacao']:t.value});setTimeout(pintarDP,0);return}
  if(t.dataset&&t.dataset.dpsel){const s_=X.dpSel=X.dpSel||new Set();t.checked?s_.add(t.dataset.dpsel):s_.delete(t.dataset.dpsel);t.closest('tr').classList.toggle('sel',t.checked);pintarLote();return}
  if(t.id==='cxaDpTodas'){const s_=X.dpSel=X.dpSel||new Set();for(const ch of X._dpPag||[])t.checked?s_.add(ch):s_.delete(ch);pintarDP();return}
  if(t.id==='cxaDpArq'&&t.files[0]){subirDP(t.files[0]).catch(e=>toast(traduz(e)));t.value='';return}
  if(t.id==='cxaEmp'){X.emp=t.value;X.per=null;X.dAb=null;X.f={reg:[],cid:[],emp:[],obra:[]};render(true)}else if(t.id==='cxaPer'){X.per=t.value;X.dAb=null;render(true)}});
// arquivo do painel: {periodo:'AAAA-MM', fonte, resumo, movimentos, auditoria} montado pela Gevans a partir das planilhas
async function subirPQ(f){try{const j=JSON.parse(await f.text());
  if(!Array.isArray(j.linhas)||!j.saldo_out26||!/^\d{4}-\d{2}$/.test(j.periodo||''))throw new Error('Arquivo não é uma base de Perguntas do negócio da Gevans.');
  toast('Subindo a base das perguntas…');const {error}=await sb.from('dados_paineis').upsert([{empresa_id:X.emp,periodo:j.periodo,parte:'perguntas',titulo:'Perguntas do negócio',fonte:j.fonte||f.name,conteudo:j,atualizado_em:new Date().toISOString()}],{onConflict:'empresa_id,periodo,parte'});if(error)throw error;
  delete X.cache[X.emp];toast('Base das perguntas carregada.');render(true)}
 catch(e){console.warn(e);toast(traduz(e))}}
document.addEventListener('change',ev=>{if(ev.target.id==='pqArq'&&ev.target.files[0])subirPQ(ev.target.files[0])});
async function subirPainel(f){try{const j=JSON.parse(await f.text());
  if(!/^\d{4}-\d{2}$/.test(j.periodo||'')||!j.resumo||!j.movimentos?.rows||!j.auditoria?.rows)throw new Error('Arquivo não é um painel de caixa da Gevans.');
  if(j.empresa&&!confirm(`Subir o painel de ${MES(j.periodo)} (${j.empresa}) em ${nomeEmp(empresa(X.emp))}? Se o mês já existir, ele é substituído.`))return;
  const rows=[['resumo','Resumo, conferência e fluxo'],['movimentos','Movimentos com as colunas do fluxo'],['auditoria','Auditoria do extrato por conta']].map(([pt,t])=>({empresa_id:X.emp,periodo:j.periodo,parte:pt,titulo:t,fonte:j.fonte||f.name,conteudo:j[pt],atualizado_em:new Date().toISOString()}));
  for(const r of rows){toast('Subindo '+r.titulo.toLowerCase()+'…');const {error}=await sb.from('dados_paineis').upsert([r],{onConflict:'empresa_id,periodo,parte'});if(error)throw error}
  delete X.cache[X.emp];X.per=j.periodo;toast('Painel de '+MES(j.periodo)+' carregado.');render(true)}
 catch(e){console.warn(e);toast(traduz(e))}}
document.addEventListener('change',ev=>{if(ev.target.id==='cxaArq'&&ev.target.files[0])subirPainel(ev.target.files[0])});
document.addEventListener('toggle',ev=>{const d=ev.target;if(d.dataset&&d.dataset.ms){if(d.open){X.msOpen=d.dataset.ms;document.querySelectorAll('details.cxa-msd[open]').forEach(o=>{if(o!==d)o.open=false});setTimeout(()=>d.querySelector('[data-msq]')?.focus(),0)}else if(X.msOpen===d.dataset.ms)X.msOpen=null}},true);
document.addEventListener('click',ev=>{document.querySelectorAll('details.cxa-msd[open]').forEach(d=>{if(!d.contains(ev.target)){d.open=false;X.msOpen=null}});
  const b=ev.target.closest('[data-msa],[data-mschip],[data-mslimpa]');if(!b||!document.querySelector('.cxa'))return;
  if(b.dataset.mslimpa){for(const k_ of b.dataset.mslimpa.split(','))setMS(k_,[]);X.msOpen=null;render(true);return}
  if(b.dataset.mschip){const k_=b.dataset.mschip;setMS(k_,getMS(k_).filter(v=>v!==b.dataset.v));render(true);return}
  const k_=b.dataset.ms,its=[...document.querySelectorAll(`[data-ms="${k_}"] [data-msv]`)];setMS(k_,b.dataset.msa==='limpa'?[]:b.dataset.msa==='busca'?its.filter(i=>!i.closest('label').hidden).map(i=>i.value):[]);X.msOpen=k_;render(true)});
document.addEventListener('input',ev=>{if(ev.target.id==='cxaBusca'){X.q=ev.target.value;X.lpg=0;pintarAud()}
  else if(ev.target.dataset&&ev.target.dataset.msq){const k_=ev.target.dataset.msq;(X.msQ=X.msQ||{})[k_]=ev.target.value;const q=norm(ev.target.value);ev.target.closest('.cxa-msb').querySelectorAll('.cxa-msl label').forEach(l=>{l.hidden=!!q&&!norm(l.textContent+' '+l.querySelector('input').value).includes(q)})}
  else if(ev.target.id==='cxaDpQ'){X.dpQ=ev.target.value;X.dpPg=0;clearTimeout(X._tq2);X._tq2=setTimeout(pintarDP,250)}
  else if(ev.target.id==='cxaBuscaC'){(X.au=X.au||{}).qc=ev.target.value;X.au.pg=0;clearTimeout(X._tq);X._tq=setTimeout(()=>{render(true);setTimeout(()=>{const i=document.getElementById('cxaBuscaC');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},0)},350)}});

if(!ROTAS.some(x=>x[0]==='caixa'))ROTAS.push(['caixa','Caixa e auditoria']);
if(!ROTAS.some(x=>x[0]==='depara'))ROTAS.push(['depara','De-para']);
if(!ROTAS.some(x=>x[0]==='perguntas'))ROTAS.push(['perguntas','Perguntas do negócio']);
IC.depara='<path d="M4 7h11l-3-3M20 17H9l3 3"/>';IC.perguntas='<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>';
TITULOS.caixa='Caixa e auditoria';VIEWS.caixa=vCaixa;TITULOS.depara='De-para do fluxo';VIEWS.depara=vCaixa;TITULOS.perguntas='Perguntas do negócio';VIEWS.perguntas=vPerguntas;
})();
