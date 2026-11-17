// Teste do orçamento (preencher, % da receita, competência/caixa, Excel, gerar contas) e dos boletos em lote
// Usa o mesmo Supabase falso do teste_app.js. Rodar: node tests/teste_orcamento.js [pasta-das-imagens]
const fs_=require('fs'),path_=require('path');
global.require=require;global.__dirname=__dirname;require('vm').runInThisContext(fs_.readFileSync(path_.join(__dirname,'teste_app.js'),'utf8').split('\n(async()=>{')[0].replace('listen(8765)','listen(8766)'));
perfis[0].master=false;empresas[1].tipo_pessoa='pf';
(async()=>{
  const b=await chromium.launch();const errs=[];
  const ctx=await b.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1,acceptDownloads:true});const pg=await ctx.newPage();
  pg.on('pageerror',e=>errs.push('pageerror: '+e.message));pg.on('console',m=>{if(m.type()==='error'&&!/fonts.googleapis|ERR_|404/.test(m.text()))errs.push('console: '+m.text())});
  await pg.route('https://vovomhtwqfnlidqlmycu.supabase.co/**',rotear);await pg.route('https://fonts.googleapis.com/**',r=>r.abort());
  const shot=async n=>{await pg.waitForTimeout(400);const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(ov>0)errs.push(n+': overflow horizontal '+ov+'px');await pg.screenshot({path:`${OUT}/o-${n}.png`,fullPage:false})};
  await pg.goto('http://localhost:8766/');await pg.waitForTimeout(400);
  await pg.fill('#aEmail','evaldoalves561@gmail.com');await pg.fill('#aSenha','x12345678');await pg.click('form[data-form=login] button');await pg.waitForSelector('[data-entra]',{timeout:8000});await pg.click('[data-entra="*"]');await pg.waitForSelector('.tile',{timeout:8000});await shot('painel');
  const passos=require('./passos_orcamento.js');
  try{if(!process.env.SO_BOLETOS)await passos({pg,shot,errs,DB,empresas,predios,plano,parceiros,lanc,parc,boletos,OUT});await passos.boletos({pg,shot,errs,DB,empresas,OUT});await passos.celular({pg,shot,errs,empresas})}catch(e){errs.push('falhou: '+e.stack)}
  console.log('LOG',log.slice(-40).join(' | '));
  console.log('ERROS',errs.length?errs.join('\n'):'nenhum');await b.close();srv.close();process.exit(errs.length?1:0);
})();
