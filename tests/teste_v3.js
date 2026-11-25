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
  DB.premissas_recebimento=[];DB.atividades=[];DB.atividades_registros=[];DB.dados_bases=[];DB.dados_linhas=[];DB.acessos_dados=[];DB.dados_paineis=[];
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
    await pg.route('**/rest/v1/rpc/pessoas_da_empresa',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify([{usuario_id:UID,nome:'Evaldo'},{usuario_id:'22222222-2222-4222-8222-222222222222',nome:'Ana Souza'}])}));
    await pg.route('**/rest/v1/rpc/meu_acesso_suspenso',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:'null'}));
    const H={'access-control-allow-origin':'*','access-control-allow-headers':'*'};const JS=(r,b)=>r.fulfill({status:200,contentType:'application/json',headers:H,body:JSON.stringify(b)});
    await pg.route('**/rest/v1/rpc/criar_chave_api',r=>{const b=r.request().postDataJSON();const k='gd_'+'ab'.repeat(24);DB.acessos_dados.push({id:id(),empresa_id:b.p_empresa,tipo:'api',nome:b.p_nome,prefixo:k.slice(0,9),criado_em:new Date().toISOString(),usos:0});return JS(r,[{id:'x',chave:k}])});
    await pg.route('**/rest/v1/rpc/criar_acesso_sql',r=>{const b=r.request().postDataJSON();DB.acessos_dados.push({id:id(),empresa_id:b.p_empresa,tipo:'sql',nome:b.p_nome,papel:'bi_123abc',criado_em:new Date().toISOString(),usos:0});return JS(r,[{id:'y',usuario:'bi_123abc',senha:'s3nh4'}])});
    await pg.route('**/rest/v1/rpc/revogar_acesso_dados',r=>{const b=r.request().postDataJSON();const a=DB.acessos_dados.find(x=>x.id===b.p_id);if(a)a.revogado_em=new Date().toISOString();return JS(r,null)});
    await pg.route('**/functions/v1/dados-conector',r=>{const b=r.request().postDataJSON();if(b.tipo==='web')return JS(r,{conteudo:JSON.stringify({value:[{tipo:'Realizado',mes:'2026-01',conta:'Vendas',valor:100},{tipo:'Orçado',mes:'2026-01',conta:'Vendas',valor:120}]}),tipo:'application/json'});
      return JS(r,{linhas:Array.from({length:24},(_,i)=>({cenario:i%2?'Orçado':'Realizado',competencia:'2026-'+String(1+(i>>1)).padStart(2,'0')+'-01',conta:i%4<2?'Vendas':'Aluguel',grupo:i%4<2?'Receita bruta':'Despesas operacionais',valor:i%4<2?1000+i:-300})),cortado:false})});
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
    if(nome==='cel'){await pg.evaluate(()=>location.hash='conexoes');await pg.waitForTimeout(900);await shot('conexoes');await pg.click('[data-cxfonte=sql]');await pg.waitForTimeout(300);await shot('conexoes-sql');await ctx.close();continue}
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
    // etapa 3: esteira de produção
    await pg.evaluate(()=>location.hash='producao');await pg.waitForTimeout(900);await pg.selectOption('#estEmp',e0);await pg.waitForTimeout(600);await shot('esteira-vazia');
    for(const [t,sup] of [['Conciliar extrato Nubank de outubro',''],['Fechamento de outubro','22222222-2222-4222-8222-222222222222']]){
      await pg.click('[data-est-nova]');await pg.waitForTimeout(300);await pg.fill('#eTit',t);await pg.selectOption('#eSup',sup);await pg.fill('#eEsp','Tudo conferido até sexta.');if(!sup)await pg.fill('#ePrazo','2026-11-01');
      await pg.click('form[data-est-form=nova] button:not([type=button])');await pg.waitForTimeout(900);console.log('TOAST',await pg.evaluate(()=>document.querySelector('.toast')?.textContent))}
    if(DB.atividades.length!==2)errs.push('atividades não criadas: '+DB.atividades.length);
    await shot('esteira-duas');await pg.click('[data-est="'+DB.atividades[1].id+'"]');await pg.waitForTimeout(300);await shot('esteira-atividade');
    await pg.fill('#eAnd','100');await pg.dispatchEvent('#eAnd','input');await pg.fill('#eNota','Pronto.');await pg.click('form[data-est-form=andamento] button');await pg.waitForTimeout(900);
    const a1=DB.atividades[0];console.log('ATIV',JSON.stringify(DB.atividades.map(a=>[a.titulo,a.status,a.andamento,a.avaliacao||''])));
    // como admin, avalia a que está em revisão
    const rv=DB.atividades.find(a=>a.status==='revisao');if(!rv)errs.push('nenhuma atividade foi para revisão');else{
      await pg.click('[data-est="'+rv.id+'"]');await pg.waitForTimeout(300);await pg.click('form[data-est-form=avaliar] button[value=nao_atende]');await pg.waitForTimeout(400);
      if(rv.avaliacao)errs.push('devolveu sem retorno');await pg.fill('#eRet','Faltou explicar a diferença de R$ 300.');await pg.click('form[data-est-form=avaliar] button[value=nao_atende]');await pg.waitForTimeout(900);
      if(rv.avaliacao!=='nao_atende'||rv.status!=='andamento')errs.push('devolução não gravou: '+rv.status)}
    await shot('esteira-quadro');console.log('REGISTROS',DB.atividades_registros.length);
    await pg.evaluate(()=>{location.hash='gestao'});await pg.waitForTimeout(600);await pg.click('[data-v3set=modo][data-val=operacional]');await pg.waitForTimeout(1000);if(!/Esteira de produção/.test(await pg.textContent('#view')))errs.push('card da esteira fora do operacional');
    await pg.click('[data-v3set=modo][data-val=gerencial]');await pg.waitForTimeout(300);
    // Cadastros da empresa
    await pg.evaluate(()=>location.hash='cadastros');await pg.waitForTimeout(900);await pg.selectOption('#cadEmp',e0).catch(()=>{});await pg.waitForTimeout(500);await shot('cadastros');
    const nCC=DB.centros_custo.filter(c=>c.empresa_id===e0).length;
    await pg.click('[data-cad=novo]');await pg.waitForTimeout(300);await pg.fill('#cf_codigo','CC9');await pg.fill('#cf_nome','Marketing digital');await pg.click('form[data-cad-form] button:not([type=button])');await pg.waitForTimeout(900);
    const cc=DB.centros_custo.find(c=>c.nome==='Marketing digital');if(!cc)errs.push(nome+': centro não criado');
    else{await pg.click('[data-cadedit="'+cc.id+'"]');await pg.waitForTimeout(300);await pg.fill('#cf_responsavel','Ana');await pg.uncheck('form[data-cad-form] input[name=ativo]');await pg.click('form[data-cad-form] button:not([type=button])');await pg.waitForTimeout(900);
      if(cc.responsavel!=='Ana'||cc.ativo!==false)errs.push(nome+': alteração do centro não gravou '+JSON.stringify(cc))}
    await pg.click('[data-cadtab=parceiros]');await pg.waitForTimeout(600);await pg.click('[data-cad=novo]');await pg.waitForTimeout(300);await pg.fill('#cf_nome','Gráfica Boa Vista');await pg.fill('#cf_documento','12.345.678/0001-90');await pg.click('form[data-cad-form] button:not([type=button])');await pg.waitForTimeout(900);
    const pa=DB.parceiros.find(p=>p.nome==='Gráfica Boa Vista');if(!pa||pa.documento!=='12345678000190'||pa.fornecedor!==true)errs.push(nome+': fornecedor não criado '+JSON.stringify(pa));
    // importar produtos por Excel
    await pg.click('[data-cadtab=produtos]');await pg.waitForTimeout(600);
    const wbI=XLSX_NODE.utils.book_new();XLSX_NODE.utils.book_append_sheet(wbI,XLSX_NODE.utils.aoa_to_sheet([['Código','Nome','Tipo','Preço de venda','Controla estoque'],['P1','Café 500g','Produto','29,90','Sim'],['S1','Consultoria','Serviço',350,'Não'],['','','',1,'']]),'Produtos');
    const fI=OUTD+'/produtos.xlsx';fs.writeFileSync(fI,XLSX_NODE.write(wbI,{type:'buffer',bookType:'xlsx'}));
    const [fc]=await Promise.all([pg.waitForEvent('filechooser'),pg.click('[data-cad=importar]')]);await fc.setFiles(fI);await pg.waitForTimeout(800);
    const tImp=await pg.textContent('#cadImp');if(!/2 novos/.test(tImp)||!/1 linha/.test(tImp))errs.push(nome+': prévia da importação: '+tImp);
    await pg.click('[data-cad=imp-ok]');await pg.waitForTimeout(1200);const pc=DB.produtos.find(p=>p.codigo==='P1');if(!pc||+pc.preco_padrao!==29.9||pc.controla_estoque!==true||pc.tipo!=='produto')errs.push(nome+': produto importado errado '+JSON.stringify(pc));
    await shot('cadastros-produtos');
    const [dlx]=await Promise.all([pg.waitForEvent('download'),pg.click('[data-cad=exportar]')]);const fx=OUTD+'/prod-exp.xlsx';await dlx.saveAs(fx);const rx=XLSX_NODE.utils.sheet_to_json(XLSX_NODE.read(fs.readFileSync(fx)).Sheets[XLSX_NODE.read(fs.readFileSync(fx)).SheetNames[0]]);if(!rx.some(r=>r['Nome']==='Café 500g'))errs.push(nome+': exportação sem o produto');
    // excluir unidade criada agora
    await pg.click('[data-cadtab=unidades]');await pg.waitForTimeout(600);await pg.click('[data-cad=novo]');await pg.waitForTimeout(300);await pg.fill('#cf_nome','Loja Centro');await pg.click('form[data-cad-form] button:not([type=button])');await pg.waitForTimeout(900);
    const un=DB.predios.find(p=>p.nome==='Loja Centro');if(!un)errs.push(nome+': unidade não criada');else{await pg.click('[data-cadedit="'+un.id+'"]');await pg.waitForTimeout(300);await pg.click('[data-cadexc]');await pg.click('[data-cadexc]');await pg.waitForTimeout(900);if(DB.predios.some(p=>p.id===un.id))errs.push(nome+': unidade não excluída')}
    // Gevans Dados no Gestor: conexões de dados
    await pg.evaluate(()=>location.hash='conexoes');await pg.waitForTimeout(900);await shot('conexoes-vazia');
    await pg.click('[data-cxfonte=sql]');await pg.waitForTimeout(200);await pg.fill('#cxHost','db.cliente.com.br');await pg.fill('#cxUser','leitor');await pg.fill('#cxSenha','x');await pg.fill('#cxSql','select * from vw');
    await pg.click('[data-cx=buscar-sql]');await pg.waitForTimeout(800);const mp=await pg.textContent('#view');if(!/12 realizado/.test(mp)||!/12 orçado/.test(mp))errs.push(nome+': sql não mapeou');
    await pg.fill('#cxNome','ERP do cliente');await pg.click('[data-cx=salvar]');await pg.waitForTimeout(1500);
    if(DB.dados_bases.length!==1||DB.dados_linhas.filter(l=>l.base_id===DB.dados_bases[0].id).length!==24)errs.push(nome+': base não guardada '+DB.dados_bases.length+'/'+DB.dados_linhas.length);
    if(!/Base “ERP do cliente” no Fluxo/.test(await pg.textContent('#view')))errs.push(nome+': BI da base não abriu');await shot('conexoes-base-bi');
    await pg.click('[data-cxfonte=web]');await pg.waitForTimeout(200);await pg.fill('#cxUrl','https://api.cliente.com/x');await pg.click('[data-cx=buscar-web]');await pg.waitForTimeout(600);
    if(!/1 realizado/.test(await pg.textContent('#view')))errs.push(nome+': link de API não mapeou');await pg.click('[data-cx=descartar]');await pg.waitForTimeout(300);
    await pg.fill('#cxNomeApi','Power BI');await pg.click('[data-cx=nova-chave]');await pg.waitForTimeout(700);if(!/gd_abab/.test(await pg.textContent('#layer')))errs.push(nome+': chave não mostrada');await shot('conexoes-chave');
    await pg.click('[data-cx=fechar-segredo]');await pg.waitForTimeout(300);await pg.click('[data-cx=novo-sql]');await pg.waitForTimeout(700);if(!/bi_123abc\.vovomhtwqfnlidqlmycu/.test(await pg.textContent('#layer')))errs.push(nome+': acesso sql não mostrado');
    await pg.click('[data-cx=fechar-segredo]');await pg.waitForTimeout(500);const rv1=await pg.$('[data-cxrev]');await rv1.click();await rv1.click();await pg.waitForTimeout(700);if(!DB.acessos_dados.some(a=>a.revogado_em))errs.push(nome+': revogar não gravou');
    await shot('conexoes-acessos');const dl1=await pg.$('[data-cxdel]');await dl1.click();await dl1.click();await pg.waitForTimeout(700);if(DB.dados_bases.length)errs.push(nome+': base não excluída');
    DB.acessos_dados.length=0;
    await ctx.close()}
  // Produto Gevans Dados: login próprio e menu só de indicadores
  { empresas.forEach(e=>e.produto='dados');const e0d=empresas[0].id;DB.dados_bases.length=0;DB.dados_linhas.length=0;
    const bd={id:id(),empresa_id:e0d,nome:'Planilha 2026',origem:'excel',linhas:4,atualizado_em:'2026-11-20T10:00:00Z'};DB.dados_bases.push(bd);
    [['realizado','2026-01-01','Vendas','receita_bruta',1000],['orcado','2026-01-01','Vendas','receita_bruta',1200],['realizado','2026-01-01','Aluguel','despesas_operacionais',-300],['orcado','2026-02-01','Vendas','receita_bruta',1300]].forEach(([t,c,n,g,v],i)=>DB.dados_linhas.push({id:i+1,base_id:bd.id,empresa_id:e0d,tipo:t,competencia:c,data_caixa:null,conta_codigo:null,conta_nome:n,grupo_dre:g,valor:v,unidade:null}));
    const ctx=await b.newContext({viewport:{width:1366,height:900},deviceScaleFactor:1});const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push('dados: '+e.message));
    pg.on('console',m=>{if(m.type()==='error'&&!/fonts.googleapis|ERR_/.test(m.text()))errs.push('dados console: '+m.text())});
    await pg.route('https://vovomhtwqfnlidqlmycu.supabase.co/**',rotear);await pg.route('https://fonts.googleapis.com/**',r=>r.abort());
    await pg.route('**/rest/v1/rpc/meu_acesso_suspenso',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:'null'}));
    await pg.goto('http://localhost:8765/?p=dados');await pg.waitForTimeout(600);
    const la=await pg.textContent('#auth');if(!/Gevans Dados/.test(la))errs.push('login sem a marca Gevans Dados');await pg.screenshot({path:OUTD+'/dados-login.png'});
    await pg.fill('#aEmail','evaldoalves561@gmail.com');await pg.fill('#aSenha','x12345678');await pg.click('form[data-form=login] button');await pg.waitForTimeout(2000);
    const en=await pg.$('[data-entra="*"]');if(en){await en.click();await pg.waitForTimeout(800)}
    await pg.waitForTimeout(800);const links=await pg.$$eval('#nav a',a=>a.map(x=>x.getAttribute('href')));
    if(links.some(h=>!['#indicadores','#caixa','#conexoes','#cadastros','#plano','#usuarios'].includes(h)))errs.push('menu do Dados com telas do ERP: '+links.join(','));
    if(!(await pg.evaluate(()=>location.hash)).includes('indicadores'))errs.push('Dados não abriu em Indicadores: '+await pg.evaluate(()=>location.hash));
    if(await pg.$('#indEmp')){await pg.selectOption('#indEmp',e0d);await pg.waitForTimeout(900)}
    const tv=await pg.textContent('#view');if(!/Receita/.test(tv))errs.push('Indicadores sem receita');await pg.screenshot({path:OUTD+'/dados-indicadores.png',fullPage:true});
    await pg.click('[data-indtab="fluxo-bi"]');await pg.waitForTimeout(600);if(!/Matriz/.test(await pg.textContent('#view')))errs.push('aba Fluxo BI não abriu');
    for(const r of ['cadastros','plano']){await pg.evaluate(h=>location.hash=h,r);await pg.waitForTimeout(800);if(!(await pg.evaluate(()=>location.hash)).includes(r))errs.push('Dados sem a tela '+r);await pg.screenshot({path:OUTD+'/dados-'+r+'.png',fullPage:true})}
    if(!(await pg.$$eval('#nav a',a=>a.map(x=>x.getAttribute('href')))).includes('#cadastros'))errs.push('Dados sem Cadastros no menu');
    // Caixa e auditoria: painel pronto de outubro (arquivos de exemplo em tests/fixtures/painel_*.json)
    {const pj={periodo:'2026-10',empresa:'Empresa Exemplo',fonte:'planilhas de teste'};for(const pt of ['resumo','movimentos','auditoria'])pj[pt]=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/painel_'+pt+'.json'),'utf8'));
     fs.writeFileSync(OUTD+'/painel_teste.json',JSON.stringify(pj))}
    pg.on('dialog',d=>d.accept());
    await pg.evaluate(()=>location.hash='caixa');await pg.waitForTimeout(1200);
    if(await pg.$('#cxaEmp')){await pg.selectOption('#cxaEmp',e0d);await pg.waitForTimeout(800)}
    if(!/Nenhum painel/.test(await pg.textContent('#view')))errs.push('caixa vazio sem aviso');
    await pg.setInputFiles('#cxaArq',OUTD+'/painel_teste.json');await pg.waitForTimeout(1500);
    if(DB.dados_paineis.length!==3)errs.push('painel não gravado: '+DB.dados_paineis.length);
    {const t=await pg.textContent('#view');if(!/Geração de caixa/.test(t)||!/Resultado por obra/.test(t))errs.push('Caixa do mês sem indicadores');await pg.screenshot({path:OUTD+'/dados-caixa.png',fullPage:true});
     const fim=await pg.evaluate(()=>{const m=S.cxa.atual.mov;return Math.round(m.filter(x=>x.grupo==='Receitas').reduce((a,x)=>a+x.valor,0)*100)/100});console.log('RECEBIMENTOS',fim);
     await pg.click('[data-cxatab=forecast]');await pg.waitForTimeout(700);{const nc=await pg.$$eval('.cxa-fc thead th',x=>x.length);if(nc<30)errs.push('forecast com poucas colunas '+nc)}
     await pg.click('[data-cxanivel="2"]');await pg.waitForTimeout(500);{const n2=await pg.$$eval('.cxa-fc tbody tr',x=>x.length);await pg.click('[data-cxanivel="4"]');await pg.waitForTimeout(800);const n4=await pg.$$eval('.cxa-fc tbody tr',x=>x.length);const nl=await pg.$$eval('.cxa-fc tr.cxa-lanc',x=>x.length);console.log('DRILL',n2,n4,nl);if(!(n4>n2)||!nl)errs.push('drill do forecast não abriu lançamentos');await pg.click('[data-cxanivel="0"]');await pg.waitForTimeout(500);const n0=await pg.$$eval('.cxa-fc tbody tr',x=>x.length);if(n0>=n2)errs.push('recolher tudo não recolheu');await pg.click('[data-cxafc]');await pg.waitForTimeout(500);if((await pg.$$eval('.cxa-fc tbody tr',x=>x.length))<=n0)errs.push('clique na linha não abriu');await pg.click('[data-cxanivel="3"]');await pg.waitForTimeout(600)}await pg.screenshot({path:OUTD+'/dados-caixa-forecast.png'});
     await pg.selectOption('#cxaFcMes','10');await pg.waitForTimeout(600);{const nc=await pg.$$eval('.cxa-fc thead th',x=>x.length);if(nc!==6)errs.push('forecast out com '+nc+' colunas')}await pg.screenshot({path:OUTD+'/dados-caixa-forecast-out.png',fullPage:true});
     await pg.click('[data-cxatab=fluxo]');await pg.waitForTimeout(700);const nf=await pg.$$eval('[data-cxafluxo]',x=>x.length);if(nf<5)errs.push('fluxo V07 com poucas linhas '+nf);
     await pg.click('[data-cxafluxo]');await pg.waitForTimeout(700);if(!/lançamentos/.test(await pg.textContent('#view')))errs.push('fluxo sem detalhe');await pg.screenshot({path:OUTD+'/dados-caixa-fluxo.png',fullPage:true});
     await pg.click('[data-cxatab=auditoria]');await pg.waitForTimeout(900);const na=await pg.$$eval('#cxaAud tr',x=>x.length);if(na<3)errs.push('auditoria vazia '+na);
     await pg.click('[data-cxast]');await pg.waitForTimeout(300);const ns=await pg.$$eval('#cxaAud tr',x=>x.length);console.log('AUDITORIA linhas',na,'só no extrato',ns);await pg.screenshot({path:OUTD+'/dados-caixa-auditoria.png',fullPage:true});
     await pg.fill('#cxaBusca','Historico');await pg.waitForTimeout(300);
     await pg.click('[data-cxatab=conferencia]');await pg.waitForTimeout(700);if(!/Conferência por aba/.test(await pg.textContent('#view')))errs.push('sem conferência por aba');await pg.screenshot({path:OUTD+'/dados-caixa-conf.png',fullPage:true});await pg.click('[data-cxaconta="246|2000-2"]');await pg.waitForTimeout(900);if(await pg.$eval('#cxaConta',e=>e.value)!=='246|2000-2')errs.push('clique na conta não abriu a auditoria');
     await pg.screenshot({path:OUTD+'/dados-caixa-conta246.png',fullPage:true});
     await pg.setViewportSize({width:400,height:860});await pg.click('[data-cxatab=resumo]');await pg.waitForTimeout(700);const ov=await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(ov>0)errs.push('caixa no celular com overflow '+ov);await pg.screenshot({path:OUTD+'/dados-caixa-cel.png',fullPage:true});await pg.setViewportSize({width:1366,height:900})}
    await pg.evaluate(()=>location.hash='lancamentos');await pg.waitForTimeout(700);if(await pg.textContent('#title')!=='Indicadores')errs.push('tela do ERP abriu no Dados: '+await pg.textContent('#title'));
    if(!/Gevans Dados/.test(await pg.textContent('#nav')+await pg.textContent('.brand')))errs.push('marca Gevans Dados fora do menu');
    await ctx.close();empresas.forEach(e=>delete e.produto)}
  await b.close();srv.close();
  console.log('ERROS',errs.length?errs.join(' || '):'nenhum')})();
`);
