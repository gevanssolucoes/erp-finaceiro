// passos do teste do orçamento (chamado por teste_orcamento.js)
module.exports=async({pg,shot,errs,DB,empresas,predios,plano,parceiros,lanc,parc,OUT})=>{
  const e0=empresas[0].id;const ct=cod=>plano.find(x=>x.empresa_id===e0&&x.codigo===cod);
  await pg.evaluate(()=>location.hash='orcamento');await pg.waitForTimeout(700);await pg.selectOption('#orcEmp',e0);await pg.waitForTimeout(500);
  await pg.click('[data-acao=nova-versao][data-tipo=orcamento]');await pg.waitForTimeout(200);await pg.fill('#vAno','2027');await pg.fill('#vNome','Orçamento 2027');await shot('novo');
  await pg.click('form[data-form=versao] button:not([type=button])');await pg.waitForTimeout(1200);await pg.selectOption('#orcPredio',predios[0].id);await pg.waitForTimeout(600);await shot('editar');
  // 12 meses sem rolar
  const ov=await pg.evaluate(()=>{const w=document.querySelector('.orc-wrap');return w.scrollWidth-w.clientWidth});if(ov>0)errs.push('grade rola para o lado: '+ov+'px');
  // impostos automáticos pela configuração (PIS/COFINS 3,65% e ICMS 4%)
  const pctImp=await pg.evaluate(()=>JSON.stringify(S.orcEdit.pct));console.log('PCT inicial',pctImp);
  // digitar receita e ver o total mudar na hora
  const r0=await pg.textContent('[data-ft="r|t"]');
  const cel=await pg.$(`input.cel[data-cel="${ct('3.01.001').id}|0"]`);await cel.click();await cel.fill('200.000');await cel.dispatchEvent('input');await pg.waitForTimeout(200);
  const r1=await pg.textContent('[data-ft="r|t"]');if(r0===r1)errs.push('resultado não mudou ao digitar: '+r0);
  // despesa em % da receita
  const desp=ct('5.02.001');await pg.fill(`input.pct[data-pct="${desp.id}"]`,'10');await pg.waitForTimeout(1200);
  const v0=await pg.textContent(`[data-v="${desp.id}|0"]`).catch(()=>'');console.log('10% jan',v0);if(!v0||v0.replace(/\D/g,'')<'1')errs.push('% da receita não calculou: '+v0);
  await shot('pct');
  // preencher automático pela linha
  await pg.click(`[data-acao=orc-preencher][data-cid="${ct('3.01.001').id}"]`);await pg.waitForTimeout(300);await pg.check('input[name=modo][value=crescer]');await pg.fill('input[name=cresce]','2');await shot('preencher');
  await pg.click('form[data-form="orc-preencher"] button:not([type=button])');await pg.waitForTimeout(800);
  const fev=await pg.inputValue(`input.cel[data-cel="${ct('3.01.001').id}|1"]`);if(fev.replace(/\D/g,'')!=='204000')errs.push('crescer 2%: fev='+fev);
  // caixa
  await pg.click('[data-acao=orc-base][data-base=caixa]');await pg.waitForTimeout(500);
  await pg.click('[data-acao=salvar-orc]');await pg.waitForTimeout(1500);
  const v=DB.orcamento_versoes.find(x=>x.nome==='Orçamento 2027');console.log('PARAM',JSON.stringify(v.parametros));
  if(v.parametros?.base!=='caixa')errs.push('base caixa não gravou');
  const lj=DB.orcamento_linhas.filter(l=>l.versao_id===v.id&&l.conta_id===desp.id&&l.competencia==='2027-01-01');if(!lj.length||Math.abs(lj[0].valor+20000)>1)errs.push('linha da despesa % errada: '+JSON.stringify(lj));
  await shot('salvo');
  // exportar
  const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('[data-acao=orc-exportar]')]);const arq=OUT+'/orc.xlsx';await dl.saveAs(arq);
  const XLSX=require('../docs/vendor/xlsx.full.min.js');const fs=require('fs');const wb=XLSX.read(fs.readFileSync(arq));const aoa=XLSX.utils.sheet_to_json(wb.Sheets['Orçamento'],{header:1});console.log('XLSX',aoa[0].join('|'),'\n',aoa[1].join('|'));
  // importar: muda a venda de produtos de março para 123.456
  const ri=aoa.findIndex(r=>r[0]==='3.01.001');aoa[ri][7]=123456;const ws=XLSX.utils.aoa_to_sheet(aoa);const wb2=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb2,ws,'Orçamento');fs.writeFileSync(OUT+'/orc2.xlsx',XLSX.write(wb2,{type:'buffer',bookType:'xlsx'}));
  await pg.setInputFiles('#orcArq',OUT+'/orc2.xlsx');await pg.waitForTimeout(1000);
  const mar=await pg.inputValue(`input.cel[data-cel="${ct('3.01.001').id}|2"]`);if(mar.replace(/\D/g,'')!=='123456')errs.push('importar: mar='+mar);
  await pg.click('[data-acao=salvar-orc]');await pg.waitForTimeout(1500);
  // gerar contas a pagar e receber
  const nl=lanc.length;await pg.click('[data-acao=orc-gerar-contas]');await pg.waitForTimeout(1200);await pg.selectOption('[data-gc-per=de]','0');await pg.waitForTimeout(900);await pg.selectOption('[data-gc-per=ate]','0');await pg.waitForTimeout(1000);await shot('gerar');
  await pg.fill('#gcTodos','Fornecedor Teste');await pg.click('[data-acao=gc-todos]');
  pg.once('dialog',d=>d.accept());await pg.click('[data-acao=gc-lancar]');await pg.waitForTimeout(2500);
  const novos=lanc.slice(nl);console.log('GERADOS',novos.length,novos.slice(0,3).map(l=>l.descricao+' '+l.valor+' '+l.competencia).join(' ; '));
  if(!novos.length)errs.push('gerar contas não lançou');
  if(novos.some(l=>!l.parceiro_id))errs.push('gerar contas sem parceiro');
  const pc=parc.filter(p=>novos.some(l=>l.id===p.lancamento_id));if(pc.length<novos.length)errs.push('parcelas faltando');console.log('PARC',pc.slice(0,3).map(p=>p.vencimento+' '+p.valor).join(' ; '));
  await shot('depois-gerar');
  // pessoa física: pergunta líquido ou bruto; bruto calcula INSS e IRRF
  const e1=empresas[1].id;
  await pg.evaluate(()=>location.hash='painel');await pg.waitForTimeout(400);await pg.evaluate(()=>location.hash='orcamento');await pg.waitForTimeout(700);await pg.selectOption('#orcEmp',e1);await pg.waitForTimeout(600);
  await pg.click('[data-acao=nova-versao][data-tipo=orcamento]');await pg.waitForTimeout(200);await pg.fill('#vAno','2027');await pg.fill('#vNome','Casa 2027');await pg.selectOption('#vOrig','vazio');
  await pg.click('form[data-form=versao] button:not([type=button])');await pg.waitForTimeout(1200);
  if(await pg.$('#orcPredio')){await pg.selectOption('#orcPredio','');await pg.waitForTimeout(600)}
  const sal=plano.find(x=>x.empresa_id===e1&&x.codigo==='3.01.002');
  await pg.click(`input.cel[data-cel="${sal.id}|0"]`);await pg.waitForTimeout(400);await shot('pf-pergunta');
  if(!await pg.$('[data-acao=orc-pf-escolhe][data-modo=bruto]'))errs.push('PF: não perguntou líquido ou bruto');
  else{await pg.click('[data-acao=orc-pf-escolhe][data-modo=bruto]');await pg.waitForTimeout(1200);
    await pg.fill(`input.cel[data-cel="${sal.id}|0"]`,'6000');await pg.dispatchEvent(`input.cel[data-cel="${sal.id}|0"]`,'input');await pg.waitForTimeout(300);
    const inss=plano.find(x=>x.empresa_id===e1&&/INSS/.test(x.nome));const ir=plano.find(x=>x.empresa_id===e1&&/IRRF/.test(x.nome));
    if(!inss||!ir)errs.push('PF: contas INSS/IRRF não criadas');else{const vi=await pg.textContent(`[data-v="${inss.id}|0"]`),vr=await pg.textContent(`[data-v="${ir.id}|0"]`);console.log('PF INSS',vi,'IRRF',vr);if(!vi||vi==='')errs.push('PF: INSS não calculado')}
    await shot('pf-bruto')}
};
module.exports.boletos=async({pg,shot,errs,DB,empresas,OUT})=>{
  const {boleto,fmt,pdfTexto,pngITF}=require('./boleto_util.js');
  const b1=boleto('341','2026-12-10',159.9,'1234567890123456789012345'),b2=boleto('104','2026-12-20',1250,'9876543210987654321098765');
  const pdf=pdfTexto(['Recibo do pagador','Beneficiario: Condominio Mar Azul CNPJ 12.345.678/0001-90','Vencimento 20/12/2026',fmt(b2.linha)]);
  const png=await pngITF(pg,b1.bc);require('fs').writeFileSync(OUT+'/boleto-foto.png',png);
  await pg.evaluate(()=>location.hash='boletos');await pg.waitForTimeout(1200);await pg.click('[data-acao=bx-arquivos]');await pg.waitForTimeout(300);await shot('bol-arq-vazio');
  await pg.setInputFiles('#bxArqIn',[{name:'condominio.pdf',mimeType:'application/pdf',buffer:pdf},{name:'foto-escola.png',mimeType:'image/png',buffer:png},{name:'qualquer.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')}]);
  for(let i=0;i<60;i++){await pg.waitForTimeout(1000);const lendo=await pg.$$eval('#bxArqLista .chip.mute',x=>x.length).catch(()=>0);if(!lendo)break}
  await shot('bol-arq-lidos');
  const txt=await pg.textContent('#bxArqLista');console.log('BOL ARQ',txt.replace(/\s+/g,' ').slice(0,600));
  if(!txt.includes('1.250,00'))errs.push('PDF do boleto não lido');if(!txt.includes('159,90'))errs.push('foto do boleto (código de barras) não lida');
  const n0=DB.boletos_email.length;await pg.click('[data-acao=bx-arq-gravar]');await pg.waitForTimeout(1500);
  const novos=DB.boletos_email.slice(n0);console.log('BOL NOVOS',novos.map(b=>b.linha_digitavel+' '+b.valor+' '+b.vencimento+' '+b.beneficiario).join(' ; '));
  if(novos.length!==2)errs.push('boletos gravados: '+novos.length);if(novos.some(b=>b.linha_digitavel!==b1.linha&&b.linha_digitavel!==b2.linha))errs.push('linha errada');
  await shot('bol-arq-lista');
};

module.exports.celular=async({pg,shot,errs,empresas})=>{
  await pg.setViewportSize({width:390,height:844});await pg.evaluate(()=>location.hash='painel');await pg.waitForTimeout(500);await pg.evaluate(()=>location.hash='orcamento');await pg.waitForTimeout(1200);await shot('celular');
  await pg.setViewportSize({width:1280,height:800});await pg.waitForTimeout(800);await pg.selectOption('#orcEmp',empresas[0].id).catch(()=>{});await pg.waitForTimeout(800);
  const ov=await pg.evaluate(()=>{const w=document.querySelector('.orc-wrap');return w?w.scrollWidth-w.clientWidth:-1});console.log('1280 overflow grade',ov);if(ov>0)errs.push('1280: grade rola '+ov);await shot('1280');
};
