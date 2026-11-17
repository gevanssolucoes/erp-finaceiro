// Teste do Gevans Dados (docs/dados.html): exemplo, envio de planilha, troca de abas e Excel
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const http=require('http');
const raiz=path.join(__dirname,'..','docs');const tipos={'.html':'text/html','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.css':'text/css'};
const srv=http.createServer((q,r)=>{const f=path.join(raiz,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'content-type':tipos[path.extname(f)]||'application/octet-stream'});r.end(b)})});
(async()=>{await new Promise(o=>srv.listen(0,o));const url=`http://localhost:${srv.address().port}/dados.html`;
const b=await chromium.launch();const erros=[];const out=process.env.SHOT||'/tmp';
for(const vp of [{width:1366,height:900},{width:390,height:844}]){
  const p=await b.newPage({viewport:vp,acceptDownloads:true});p.on('pageerror',e=>erros.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts\.g/.test(m.text()))erros.push('console '+m.text())});
  await p.goto(url);
  // 1) modelo
  const [dm]=await Promise.all([p.waitForEvent('download'),p.click('#btModelo')]);const fm=path.join(out,'modelo.xlsx');await dm.saveAs(fm);
  // 2) exemplo
  await p.click('#btExemplo');await p.waitForSelector('#view .v3-card, #view svg',{timeout:8000});
  const t1=await p.textContent('#view');if(!/Receita/i.test(t1))erros.push('painel sem receita');
  await p.screenshot({path:path.join(out,`dados-gestao-${vp.width}.png`),fullPage:true});
  await p.click('#tabs [data-tab="fluxo-bi"]');await p.waitForTimeout(300);
  for(const v of ['orcado','realizado','comparativo','forecast'])for(const rg of ['competencia','caixa']){
    for(const [c,val] of [['visao',v],['regime',rg]]){const bt=await p.$(`[data-v3set="${c}"][data-val="${val}"]`);if(bt)await bt.click();else erros.push('sem botão '+c+' '+val)}
    await p.waitForTimeout(80)}
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(ov>2)erros.push('rolagem lateral '+ov+' em '+vp.width);
  await p.screenshot({path:path.join(out,`dados-fluxo-${vp.width}.png`),fullPage:true});
  const be=await p.$('[data-v3="excel-bi"]');if(be){const [d]=await Promise.all([p.waitForEvent('download'),be.click()]);const f=path.join(out,'bi.xlsx');await d.saveAs(f);if(fs.statSync(f).size<2000)erros.push('excel pequeno')}else erros.push('sem botão excel-bi');
  // 3) envio de planilha própria com nomes de colunas diferentes
  const csv='Cenario;Mes;Descricao;Valor\nReal;01/2025;Vendas;1.000,00\nReal;02/2025;Vendas;2.000,00\nOrcamento;01/2025;Vendas;1500\nOrcamento;02/2025;Vendas;1500\nReal;01/2025;Aluguel;-300\nOrcamento;01/2025;Aluguel;-250\n';
  const fc=path.join(out,'base.csv');fs.writeFileSync(fc,csv);await p.setInputFiles('#arq',fc);await p.waitForTimeout(600);
  const mapa=await p.textContent('#mapa');if(!/2 contas/.test(mapa))erros.push('csv contas: '+mapa.slice(0,200));
  const ano=await p.$eval('#dAno',s=>s.value);if(ano!=='2025')erros.push('ano '+ano);
  await p.click('#tabs [data-tab="gestao"]');await p.waitForTimeout(300);
  await p.close()}
await b.close();srv.close();console.log('ERROS',erros.length?erros:'nenhum')})();
