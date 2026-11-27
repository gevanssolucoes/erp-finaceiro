// Prévia local da Visão executiva com uma base real (arquivo JSON fora do repo). Uso: node tests/previa_px.js <base.json> <pasta>
const fs=require('fs');const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'teste_app.js'),'utf8');
const base=src.slice(0,src.indexOf('\n(async()=>{'));
const BASE=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const OUTX=process.argv[3];
eval(base+`
;(async()=>{perfis[0].master=false;empresas.forEach(e=>e.produto='dados');
  DB.premissas_recebimento=[];DB.atividades=[];DB.atividades_registros=[];DB.dados_bases=[];DB.dados_linhas=[];DB.acessos_dados=[];DB.dados_depara=[];
  DB.dados_paineis=[{id:id(),empresa_id:empresas[0].id,periodo:'2026-10',parte:'perguntas',conteudo:BASE,atualizado_em:'2026-11-25T10:00:00Z'}];
  const b=await chromium.launch();
  for(const [vp,nm,sc] of [[{width:1440,height:900},'desk',2],[{width:400,height:860},'cel',2]]){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:sc});const pg=await ctx.newPage();pg.on('pageerror',e=>console.log('ERRO',e.message));
  await pg.route('https://vovomhtwqfnlidqlmycu.supabase.co/**',rotear);await pg.route('https://fonts.googleapis.com/**',r=>r.abort());
  await pg.route('**/rest/v1/rpc/meu_acesso_suspenso',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:'null'}));
  await pg.goto('http://localhost:8765/');await pg.fill('#aEmail','x@x.com');await pg.fill('#aSenha','x12345678');await pg.click('form[data-form=login] button');await pg.waitForTimeout(2000);
  const en=await pg.$('[data-entra="'+empresas[0].id+'"]');if(en){await en.click();await pg.waitForTimeout(800)}
  await pg.evaluate(()=>location.hash='perguntas');await pg.waitForTimeout(2500);
  await pg.screenshot({path:OUTX+'/px-'+nm+'.png',fullPage:true});
  if(nm==='desk'){await pg.click('[data-pqx="cen:pess"]');await pg.waitForTimeout(1200);await pg.screenshot({path:OUTX+'/px-pess.png',fullPage:true})}
  console.log(nm,'overflow',await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth));await ctx.close()}
  await b.close();srv.close()})();
`);
