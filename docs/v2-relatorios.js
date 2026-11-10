// ===================== Versão 2 · Relatórios em PDF e Excel com a marca da empresa
// Botão "Relatório" no topo das telas de consulta. O PDF sai com logo, nome e CNPJ da empresa,
// tela, período, data de emissão e quem gerou; o Excel leva cada tabela da tela numa aba,
// com os valores em número (dá para somar) e uma aba de capa.
(()=>{
if(typeof S==='undefined'||typeof ROTAS==='undefined')return;
IC.relatorio='<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>';
const TELAS_REL=new Set(['painel','dre','fluxo','contas','faturamento','lancamentos','auditoria','plano','bancos','pagamentos','aprovacoes','compras','pessoas','ausencias','historico','fechamento','usuarios','excecoes']);

const css=document.createElement('style');css.textContent=`
.rel-wrap{position:relative}
.rel-menu{position:absolute;right:0;top:calc(100% + 6px);background:var(--surface);border:1px solid var(--line);border-radius:9px;box-shadow:0 10px 30px rgba(0,0,0,.15);z-index:40;min-width:230px;padding:6px;display:flex;flex-direction:column}
.rel-menu button{display:flex;gap:10px;align-items:flex-start;text-align:left;background:none;border:0;border-radius:6px;padding:8px 10px;cursor:pointer;font:inherit;color:var(--ink)}
.rel-menu button:hover{background:var(--accent-soft)}.rel-menu small{display:block;color:var(--ink-2);font-size:12px}
@media (max-width:820px){.rel-wrap .pg-txt{display:none}}
`;document.head.appendChild(css);

const filtros=document.getElementById('filtros');
if(filtros&&!document.getElementById('relWrap'))filtros.insertAdjacentHTML('beforeend',`<span class="rel-wrap" id="relWrap" hidden><button class="pg-btn" id="relBtn" type="button" data-acao="rel-menu" aria-haspopup="true" aria-expanded="false" title="Baixar esta tela como relatório">${icone('relatorio',16)}<span class="pg-txt">Relatório</span></button></span>`);

const rf0=renderFiltros;
renderFiltros=function(r){rf0(r);const w=document.getElementById('relWrap');if(w)w.hidden=!TELAS_REL.has(r)||!S.empresas.length;fecharMenu()};

function empresaDoRelatorio(){
  const r=rota();const porTela={plano:S.planoEmp,bancos:S.bancoEmp,auditoria:S.ext?.emp}[r];
  if(porTela)return empresa(porTela);
  const es=selEmp();return es.length===1?es[0]:null}
function cabecalho(){
  const e=empresaDoRelatorio(),r=rota();const agora=new Date();
  const sub=document.getElementById('subtitle')?.textContent||'';
  const doc=e?.cnpj?(String(e.cnpj).replace(/\D/g,'').length===11?'CPF ':'CNPJ ')+(typeof fmtCnpj==='function'?fmtCnpj(e.cnpj):e.cnpj):'';
  return {e,tela:TITULOS[r]||'Relatório',sub,doc,quem:S.perfil?.nome||S.user?.email||'',
    quando:agora.toLocaleDateString('pt-BR')+' '+agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
    nome:e?nomeEmp(e):(S.empresas.length>1?'Consolidado · '+selEmp().map(nomeEmp).join(', '):APP_NOME)}}
function nomeArquivo(ext){const c=cabecalho();return (c.tela+'-'+c.nome+'-'+HOJE).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)+'.'+ext}

// cópia da tela sem botões, campos e partes interativas
function conteudoLimpo(){
  const v=document.getElementById('view').cloneNode(true);
  v.querySelectorAll('button,input,select,textarea,.ctrls,.plano-busca,.sel-busca,[data-nao-imprime],.fab,.tabs-acoes,label.btn').forEach(x=>x.remove());
  v.querySelectorAll('[hidden]').forEach(x=>x.remove());
  v.querySelectorAll('a').forEach(a=>a.replaceWith(...a.childNodes));
  return v.innerHTML}

function pdf(){
  const c=cabecalho();const estilos=[...document.querySelectorAll('style')].map(s=>s.outerHTML).join('');
  const fontes=[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.outerHTML).join('');
  const selo=c.e?seloEmp(c.e,44):`<span class="selo" style="width:44px;height:44px;background:#0d5f73;font-size:17px">G</span>`;
  const html=`<!doctype html><html lang="pt-BR" data-theme="light"><head><meta charset="utf-8"><title>${esc(c.tela)} · ${esc(c.nome)}</title>${fontes}${estilos}
  <style>@page{size:A4 ${['dre','fluxo','lancamentos','contas','orcamento','historico'].includes(rota())?'landscape':'portrait'};margin:12mm}
  html,body{background:#fff!important;height:auto}body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .rel-cab{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-bottom:2px solid var(--emp,#0d5f73);padding-bottom:10px;margin-bottom:14px}
  .rel-cab .esq{display:flex;gap:12px;align-items:center}.rel-cab h1{font-size:18px;margin:0}.rel-cab .s{color:#55656d;font-size:12px}
  .rel-cab .dir{text-align:right;font-size:11.5px;color:#55656d}.rel-cab .dir b{display:block;font-size:15px;color:#16232a}
  .rel-pe{margin-top:16px;border-top:1px solid #dde3e6;padding-top:6px;font-size:10.5px;color:#83939a;display:flex;justify-content:space-between}
  .panel,.tile{break-inside:avoid}.tbl-wrap{overflow:visible!important}table{font-size:11px}thead{display:table-header-group}tr{break-inside:avoid}
  .grid{gap:10px!important}.content,.rel-corpo{padding:0!important}.loading{opacity:1!important}
  </style></head><body><div class="rel-corpo" style="--emp:${c.e?corEmp(c.e):'#0d5f73'}">
  <div class="rel-cab"><div class="esq">${selo}<div><h1>${esc(c.nome)}</h1><div class="s">${esc(c.doc)}${c.doc&&c.e?.razao_social&&c.e.razao_social!==c.nome?' · ':''}${c.e?.razao_social&&c.e.razao_social!==c.nome?esc(c.e.razao_social):''}</div></div></div>
  <div class="dir"><b>${esc(c.tela)}</b>${esc(c.sub)}</div></div>
  ${conteudoLimpo()}
  <div class="rel-pe"><span>Emitido em ${esc(c.quando)} por ${esc(c.quem)}</span><span>${esc(APP_NOME)} · ${esc(APP_SUB)}</span></div></div></body></html>`;
  const fr=document.createElement('iframe');fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.appendChild(fr);
  const d=fr.contentDocument;d.open();d.write(html);d.close();
  const imprime=()=>{try{fr.contentWindow.focus();fr.contentWindow.print()}catch(e){toast('O navegador bloqueou a impressão: '+e.message)}setTimeout(()=>fr.remove(),60000)};
  (d.fonts?.ready||Promise.resolve()).then(()=>setTimeout(imprime,350));
  toast('Na janela de impressão, escolha “Salvar como PDF”.');
}

// "R$ 1.234,56", "-8.520,00", "12,5%" viram número no Excel
function numeroBR(t){const s=String(t).replace(/\s| /g,'');let m=s.match(/^(-|−)?R\$(-|−)?([\d.]+(,\d+)?)$/);if(m){const v=parseFloat(m[3].replace(/\./g,'').replace(',','.'));return {v:(m[1]||m[2])?-v:v,z:'#,##0.00'}}
  m=s.match(/^([-−+]?)([\d.]+,\d+)%$/);if(m){const v=parseFloat(m[2].replace(/\./g,'').replace(',','.'))/100;return {v:m[1]==='-'||m[1]==='−'?-v:v,z:'0.0%'}}
  m=s.match(/^([-−]?)(\d{1,3}(\.\d{3})*,\d{2})$/);if(m){const v=parseFloat(m[2].replace(/\./g,'').replace(',','.'));return {v:m[1]?-v:v,z:'#,##0.00'}}
  m=s.match(/^([-−]?)(\d{1,3}(\.\d{3})+)$/);if(m){const v=+m[2].replace(/\./g,'');return {v:m[1]?-v:v,z:'#,##0'}}
  if(/^-?\d+$/.test(s)&&s.length<10)return {v:+s};return null}
function excel(){
  const c=cabecalho();const tabs=[...document.querySelectorAll('#view table')].filter(t=>t.rows.length>1);
  if(!tabs.length){toast('Esta tela não tem tabela para levar ao Excel. Use o PDF.');return}
  const wb=XLSX.utils.book_new();const usados=new Set();
  const capa=XLSX.utils.aoa_to_sheet([[c.nome],[c.doc],[],['Relatório',c.tela],['Período e filtro',c.sub],['Emitido em',c.quando],['Por',c.quem],[],['Gerado pelo '+APP_NOME+' · '+APP_SUB]]);capa['!cols']=[{wch:22},{wch:60}];
  XLSX.utils.book_append_sheet(wb,capa,'Capa');
  tabs.forEach((t,i)=>{const cl=t.cloneNode(true);cl.querySelectorAll('button,input,select,svg').forEach(x=>x.remove());
    const ws=XLSX.utils.table_to_sheet(cl,{raw:true});const rg=XLSX.utils.decode_range(ws['!ref']||'A1');
    for(let R=rg.s.r;R<=rg.e.r;R++)for(let C=rg.s.c;C<=rg.e.c;C++){const a=XLSX.utils.encode_cell({r:R,c:C});const x=ws[a];if(!x||x.t!=='s')continue;const n=numeroBR(x.v);if(n){x.t='n';x.v=n.v;if(n.z)x.z=n.z}else x.v=String(x.v).replace(/^[▸▾›]\s*/,'')}
    ws['!cols']=Array.from({length:rg.e.c+1},(_,C)=>({wch:Math.min(48,Math.max(10,...Array.from({length:Math.min(rg.e.r+1,200)},(_,R)=>String(ws[XLSX.utils.encode_cell({r:R,c:C})]?.v??'').length+2)))}));
    let nome=(t.closest('.panel')?.querySelector('h2')?.textContent||c.tela+' '+(i+1)).replace(/[\\/?*[\]:]/g,'').slice(0,28).trim()||'Tabela';
    let n=nome,k=2;while(usados.has(n))n=nome.slice(0,25)+' '+k++;usados.add(n);XLSX.utils.book_append_sheet(wb,ws,n)});
  XLSX.writeFile(wb,nomeArquivo('xlsx'));toast('Excel gerado com '+tabs.length+' tabela'+(tabs.length>1?'s':'')+'.')}

function fecharMenu(){document.getElementById('relMenu')?.remove();document.getElementById('relBtn')?.setAttribute('aria-expanded','false')}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-acao=rel-menu]');
  if(b){ev.stopPropagation();if(document.getElementById('relMenu')){fecharMenu();return}
    document.getElementById('relWrap').insertAdjacentHTML('beforeend',`<div class="rel-menu" id="relMenu" role="menu"><button type="button" role="menuitem" data-rel="pdf"><span>${icone('relatorio',16)}</span><span>PDF com a marca<small>Para mandar ao sócio, banco ou contador</small></span></button><button type="button" role="menuitem" data-rel="xlsx"><span>${icone('importar',16)}</span><span>Excel<small>Cada tabela numa aba, valores em número</small></span></button></div>`);
    b.setAttribute('aria-expanded','true');return}
  const o=ev.target.closest('[data-rel]');if(o){ev.stopPropagation();fecharMenu();(o.dataset.rel==='pdf'?pdf:excel)();return}
  if(!ev.target.closest('#relMenu'))fecharMenu()},true);
window.relatorioPDF=pdf;window.relatorioExcel=excel;
})();
