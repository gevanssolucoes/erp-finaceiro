// Teste das telas da versão 3 (Painel geral e Fluxo de caixa BI) com o Supabase falso do teste_app.js.
// Uso: node tests/teste_v3.js <pasta-das-capturas>
const fs=require('fs');const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'teste_app.js'),'utf8');
const base=src.slice(0,src.indexOf('\n(async()=>{'));
const XLSX_NODE=require(path.join(__dirname,'../docs/vendor/xlsx.full.min.js'));
eval(base+`
;(async()=>{
  // login de administrador da empresa (o master não entra no app das empresas)
  perfis[0].master=false;
  DB.premissas_recebimento=[];
  // orçamento 2026 (rascunho) e forecast com corte em setembro, da primeira empresa
  const e0=empresas[0].id,vO={id:id(),empresa_id:e0,nome:'Orçamento 2026',ano:2026,tipo:'orcamento',congelada:false,criado_em:'2026-01-05T10:00:00Z'};
  const vF={id:id(),empresa_id:e0,nome:'Forecast 2026 · Set',ano:2026,tipo:'forecast',mes_corte:9,congelada:false,criado_em:'2026-10-02T10:00:00Z',origem_id:vO.id};
  DB.orcamento_versoes.push(vO,vF);
  lanc.filter(l=>l.empresa_id===e0&&l.competencia.startsWith('2025')).forEach(l=>{
    DB.orcamento_linhas.push({id:id(),empresa_id:e0,versao_id:vO.id,conta_id:l.conta_id,predio_id:l.predio_id,centro_custo_id:null,competencia:'2026'+l.competencia.slice(4,8)+'01',valor:Math.round(l.valor*1.15*100)/100});
    if(+l.competencia.slice(5,7)>9)DB.orcamento_linhas.push({id:id(),empresa_id:e0,versao_id:vF.id,conta_id:l.conta_id,predio_id:l.predio_id,centro_custo_id:null,competencia:'2026'+l.competencia.slice(4,8)+'01',valor:Math.round(l.valor*1.08*100)/100})});
  const b=await chromium.launch();const errs=[];const OUTD=OUT;
  for(const [vp,nome] of [[{width:1366,height:900},'desk'],[{width:400,height:860},'cel']]){
    const ctx=await b.newContext({viewport:vp,deviceScaleFactor:1,acceptDownloads:true});const pg=await ctx.newPage();
    pg.on('pageerror',e=>errs.push(nome+': '+e.message));pg.on('response',r=>{if(r.status()===404)console.log('404',r.url().slice(0,140))});pg.on('console',m=>{if(m.type()==='error'&&!/fonts.googleapis|ERR_/.test(m.text()))errs.push(nome+' console: '+m.text())});
    await pg.route('https://vovomhtwqfnlidqlmycu.supabase.co/**',rotear);await pg.route('https://fonts.googleapis.com/**',r=>r.abort());
    await pg.route('**/rest/v1/rpc/meu_acesso_suspenso',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:'null'}));
    await pg.goto('http://localhost:8765/');await pg.waitForTimeout(400);
    const shot=async n=>{await pg.waitForTimeout(400);const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(ov>0)errs.push(nome+' '+n+': overflow horizontal '+ov+'px');await pg.screenshot({path:OUTD+'/v3-'+nome+'-'+n+'.png',fullPage:true})};
    await pg.fill('#aEmail','evaldoalves561@gmail.com');await pg.fill('#aSenha','x12345678');await pg.click('form[data-form=login] button');await pg.waitForTimeout(2000);
    const en=await pg.$('[data-entra="*"]');if(en){await en.click();await pg.waitForTimeout(800)}
    const menu=await pg.$$eval('#nav .nav-group',g=>g.map(x=>x.textContent));if(menu[0]!=='Gestão'&&menu[1]!=='Gestão')errs.push(nome+': grupo Gestão fora do topo do menu: '+menu.join(','));
    await pg.evaluate(()=>{S.ano=2026;location.hash='gestao'});await pg.waitForTimeout(1500);await shot('gestao');
    if(!(await pg.$('.v3-cards')))errs.push(nome+': painel geral sem cards');
    const txt=await pg.textContent('#view');if(!/Orçado × realizado/.test(txt))errs.push(nome+': sem bloco orçado × realizado');
    await pg.click('[data-v3set=modo][data-val=operacional]');await pg.waitForTimeout(900);await shot('operacional');
    await pg.click('[data-v3set=modo][data-val=gerencial]');await pg.waitForTimeout(700);
    await pg.click('[data-v3go=fluxo-bi][data-visao=forecast]');await pg.waitForTimeout(1500);await shot('fluxo-forecast-caixa');
    if(nome==='cel'){await ctx.close();continue}
    for(const [v,r] of [['orcado','competencia'],['orcado','caixa'],['realizado','caixa'],['comparativo','competencia'],['forecast','competencia']]){
      await pg.click('[data-v3set=regime][data-val='+r+']');await pg.waitForTimeout(500);await pg.click('[data-v3set=visao][data-val='+v+']');await pg.waitForTimeout(900);await shot('fluxo-'+v+'-'+r);
      const nl=await pg.$$eval('.v3-mx tbody tr',x=>x.length);if(nl<3)errs.push('matriz vazia em '+v+'/'+r)}
    await pg.click('[data-v3g]');await pg.waitForTimeout(400);
    {const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:6000}).catch(()=>null),pg.click('[data-v3=excel-bi]')]);
      if(!dl)errs.push('Excel do BI não baixou');else{const f=OUTD+'/'+dl.suggestedFilename();await dl.saveAs(f);const wb=XLSX_NODE.read(fs.readFileSync(f));console.log('EXCEL',dl.suggestedFilename(),wb.SheetNames.join(','));
        const ws=wb.Sheets[wb.SheetNames[1]];const c=ws['C2'];if(!c||c.t!=='n')errs.push('Excel sem número na matriz')}}
    // números conferidos: realizado competência de jan/26 da seleção = soma dos lançamentos
    const conf=await pg.evaluate(async()=>{const D=await window.v3Dados(2026);let a=0;Object.values(D.RC).forEach(r=>a+=r[0]);const ls=(await lancAno(2026)).filter(l=>l.competencia.startsWith('2026-01')&&!ehTransf(conta(l.conta_id)));return [Math.round(a),Math.round(ls.reduce((x,l)=>x+ +l.valor,0)),D.temOrc,D.temFc,D.corte]});
    console.log('CONFERE',JSON.stringify(conf));if(conf[0]!==conf[1])errs.push('realizado de jan diferente dos lançamentos');if(!conf[2]||!conf[3])errs.push('orçamento/forecast não encontrados');
    // etapa 2: premissas de compra e pagamento
    await pg.evaluate(()=>location.hash='premissas-v3');await pg.waitForTimeout(900);await pg.selectOption('#premV3Emp',e0);await pg.waitForTimeout(600);await shot('premissas');
    const cmv=plano.find(c=>c.empresa_id===e0&&c.codigo==='4.01.001').id,vend=plano.find(c=>c.empresa_id===e0&&c.codigo==='3.01.001').id;
    await pg.fill('[data-v3p="'+cmv+'"][data-k=entrada]','20');await pg.dispatchEvent('[data-v3p="'+cmv+'"][data-k=entrada]','input');
    await pg.click('[data-v3pradd="'+vend+'"]');await pg.waitForTimeout(300);await pg.click('[data-v3pradd="'+vend+'"]');await pg.waitForTimeout(300);
    await pg.fill('[data-v3pr="'+vend+'"][data-i="0"][data-k=percentual]','60');await pg.dispatchEvent('[data-v3pr="'+vend+'"][data-i="0"][data-k=percentual]','input');
    await pg.click('[data-v3p-salvar]');await pg.waitForTimeout(1500);
    const pr=DB.premissas_conta.find(x=>x.conta_id===cmv);if(+pr.entrada_pct!==20)errs.push('entrada não salva: '+JSON.stringify(pr));
    const rr=DB.premissas_recebimento.filter(x=>x.conta_id===vend);console.log('RECEB',JSON.stringify(rr.map(r=>[r.forma,r.percentual,r.prazos_dias])));if(rr.length!==2)errs.push('formas de recebimento não salvas');
    await pg.click('[data-v3psim="'+cmv+'"]');await pg.waitForTimeout(400);await shot('premissas-sim-cmv');
    const cx=await pg.evaluate(([c,v])=>[caixaDaLinha(c,'2026-12-01',-10000),caixaDaLinha(v,'2026-12-01',10000)],[cmv,vend]);console.log('CAIXA',JSON.stringify(cx));
    if(Math.round(cx[0].reduce((a,x)=>a+x.valor,0))!==-10000||Math.round(cx[1].reduce((a,x)=>a+x.valor,0))!==10000)errs.push('caixa não soma o valor');
    if(cx[0][0].valor!==-2000)errs.push('entrada de 20% não saiu primeiro');
    await pg.click('[data-v3psim="'+vend+'"]');await pg.waitForTimeout(400);await shot('premissas-sim-venda');
    const menu2=await pg.$$eval('#nav a',a=>a.map(x=>x.getAttribute('href')));if(menu2.includes('#premissas'))errs.push('premissa antiga ainda no menu');if(!menu2.includes('#premissas-v3'))errs.push('premissa nova fora do menu');
    await ctx.close()}
  await b.close();srv.close();
  console.log('ERROS',errs.length?errs.join(' || '):'nenhum')})();
`);
