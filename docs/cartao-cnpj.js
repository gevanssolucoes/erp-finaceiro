// ===================== Dados do Cartão CNPJ: consulta na Receita, leitura do PDF e cadastro completo da empresa
(()=>{
if(typeof S==='undefined'||typeof FORMS==='undefined')return;

const CAMPOS=['cnae_principal','cnae_descricao','natureza_juridica','porte','data_abertura','situacao_cadastral','logradouro','numero','complemento','bairro','municipio','uf','cep','email','telefone','inscricao_estadual','inscricao_municipal'];
const vazio=v=>v==null||/^\*+$/.test(String(v).trim())||String(v).trim()===''?null:String(v).trim();
const fmtCnae=c=>{const d=String(c??'').replace(/\D/g,'');if(d.length<5)return null;const p=d.padStart(7,'0');return `${p.slice(0,4)}-${p.slice(4,5)}/${p.slice(5,7)}`};
const dataIso=v=>{v=vazio(v);if(!v)return null;const m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?`${m[3]}-${m[2]}-${m[1]}`:/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):null};
const fmtCep=v=>{const d=soDig(v||'');return d.length===8?d.slice(0,5)+'-'+d.slice(5):vazio(v)};
const fmtTel=v=>{const d=soDig(v||'');return d.length>=10?`(${d.slice(0,2)}) ${d.slice(2,d.length-4)}-${d.slice(-4)}`:vazio(v)};

// mesmo formato da função cnpj do Supabase, para a consulta direta de reserva
function deReceita(r,fonte){return {cnpj:String(r.cnpj||'').replace(/\D/g,'').padStart(14,'0'),razao_social:vazio(r.razao_social),nome_fantasia:vazio(r.nome_fantasia),
  cnae_principal:fmtCnae(r.cnae_fiscal),cnae_descricao:vazio(r.cnae_fiscal_descricao),cnaes_secundarios:(r.cnaes_secundarios||[]).filter(x=>x&&+x.codigo).map(x=>({codigo:fmtCnae(x.codigo),descricao:vazio(x.descricao)})),
  natureza_juridica:vazio(r.natureza_juridica),porte:vazio(r.porte||r.descricao_porte),data_abertura:vazio(r.data_inicio_atividade),situacao_cadastral:vazio(r.descricao_situacao_cadastral),
  logradouro:[vazio(r.descricao_tipo_de_logradouro),vazio(r.logradouro)].filter(Boolean).join(' ')||null,numero:vazio(r.numero),complemento:vazio(r.complemento),bairro:vazio(r.bairro),municipio:vazio(r.municipio),uf:vazio(r.uf),
  cep:vazio(r.cep),email:vazio(r.email)?.toLowerCase()||null,telefone:vazio(r.ddd_telefone_1),simples:r.opcao_pelo_simples??null,mei:r.opcao_pelo_mei??null,inscricao_estadual:null,fonte}}

window.consultarCnpj=async function(cnpj){
  cnpj=soDig(cnpj);if(cnpj.length!==14)throw new Error('Informe o CNPJ com 14 dígitos.');
  let msg=null;
  try{const {data,error}=await sb.functions.invoke('cnpj',{body:{cnpj}});
    if(!error&&data&&!data.erro)return data;
    if(error){let b=null;try{b=await error.context?.json?.()}catch(e){}if(b?.erro){msg=b.erro;if(/não encontrado/i.test(b.erro))throw new Error(b.erro)}}
    else if(data?.erro)msg=data.erro}
  catch(e){if(/não encontrado/i.test(e.message))throw e}
  // reserva: consulta direta na BrasilAPI pelo navegador
  try{const r=await fetch('https://brasilapi.com.br/api/cnpj/v1/'+cnpj,{headers:{accept:'application/json'}});
    if(r.status===404)throw new Error('CNPJ não encontrado na Receita.');
    if(r.ok)return deReceita(await r.json(),'BrasilAPI')}
  catch(e){if(/não encontrado/i.test(e.message))throw e}
  throw new Error(msg||'A consulta à Receita não respondeu agora. Use o PDF do Cartão CNPJ ou tente de novo em alguns minutos.');
};

// ---------- leitura do PDF do Cartão CNPJ (comprovante de inscrição emitido no site da Receita)
const ROTULOS=[['NÚMERO DE INSCRIÇÃO','cnpj'],['DATA DE ABERTURA','data_abertura'],['NOME EMPRESARIAL','razao_social'],['TÍTULO DO ESTABELECIMENTO (NOME DE FANTASIA)','nome_fantasia'],['PORTE','porte'],
  ['CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL','principal'],['CÓDIGO E DESCRIÇÃO DAS ATIVIDADES ECONÔMICAS SECUNDÁRIAS','secundarias'],['CÓDIGO E DESCRIÇÃO DA NATUREZA JURÍDICA','natureza_juridica'],
  ['LOGRADOURO','logradouro'],['NÚMERO','numero'],['COMPLEMENTO','complemento'],['CEP','cep'],['BAIRRO/DISTRITO','bairro'],['MUNICÍPIO','municipio'],['UF','uf'],['ENDEREÇO ELETRÔNICO','email'],['TELEFONE','telefone'],
  ['ENTE FEDERATIVO RESPONSÁVEL (EFR)',null],['SITUAÇÃO CADASTRAL','situacao_cadastral'],['DATA DA SITUAÇÃO CADASTRAL',null],['MOTIVO DE SITUAÇÃO CADASTRAL',null],['SITUAÇÃO ESPECIAL',null],['DATA DA SITUAÇÃO ESPECIAL',null]];
const atividades=t=>{const out=[];const re=/(\d{2}\.\d{2}-\d-\d{2})\s*-\s*(.+?)(?=\s*\d{2}\.\d{2}-\d-\d{2}\s*-|$)/g;let m;while((m=re.exec(t)))out.push({codigo:fmtCnae(m[1]),descricao:m[2].trim()});return out};
window.lerCartaoCnpjTexto=function(txt){
  const t=txt.replace(/\s+/g,' ');const d={};let pos=0;const achados=[];
  for(const [rot,k] of ROTULOS){const i=t.indexOf(rot,pos);if(i<0)continue;achados.push([i,i+rot.length,k]);pos=i+rot.length}
  achados.forEach(([,fim,k],j)=>{if(!k)return;const prox=achados[j+1]?achados[j+1][0]:t.length;let v=t.slice(fim,prox).trim();
    if(k==='cnpj'){const m=v.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);d.cnpj=m?soDig(m[0]):null;return}
    if(k==='data_abertura'){const m=v.match(/\d{2}\/\d{2}\/\d{4}/);d.data_abertura=m?dataIso(m[0]):null;return}
    if(k==='principal'){const a=atividades(v)[0];if(a){d.cnae_principal=a.codigo;d.cnae_descricao=a.descricao}return}
    if(k==='secundarias'){d.cnaes_secundarios=atividades(v);return}
    if(k==='natureza_juridica'){d.natureza_juridica=vazio(v.replace(/^\d{3}-\d\s*-\s*/,''));return}
    if(k==='situacao_cadastral'){d.situacao_cadastral=vazio(v.split(/\s{2,}/)[0]);return}
    d[k]=vazio(v)});
  if(!d.cnpj){const m=t.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);if(m)d.cnpj=soDig(m[0])}
  d.fonte='PDF do Cartão CNPJ';return d;
};
async function lerPdf(file){
  if(typeof carregarPdfJs!=='function')throw new Error('O leitor de PDF não está disponível nesta versão.');
  await carregarPdfJs();const doc=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let txt='';
  for(let p=1;p<=Math.min(doc.numPages,3);p++){const c=await (await doc.getPage(p)).getTextContent();txt+=' '+c.items.map(i=>i.str).join(' ')}
  const d=lerCartaoCnpjTexto(txt);
  if(!d.cnpj&&!d.razao_social)throw new Error('Não reconheci este PDF como Cartão CNPJ. Baixe o comprovante no site da Receita e tente de novo.');
  return d;
}

// ---------- sugestões a partir do CNAE e do Simples
function sugerirAtividade(d){
  const div=c=>+(String(c||'').slice(0,2));const tipo=c=>{const x=div(c);if(!x)return null;if(x>=45&&x<=47||x>=10&&x<=33)return 'comercio';if(x===68)return 'locacao';return 'servicos'};
  const p=tipo(d.cnae_principal);if(!p)return null;
  const outros=new Set((d.cnaes_secundarios||[]).map(a=>tipo(a.codigo)).filter(Boolean));
  if(p==='comercio'&&outros.has('servicos')||p==='servicos'&&outros.has('comercio'))return 'misto';
  return p;
}
const sugerirRegime=d=>d.simples===true||d.mei===true?'simples_nacional':null;

const titulo=t=>String(t).toLowerCase().replace(/(^|[\s\-\/(])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()).replace(/\b(De|Da|Do|Das|Dos|E|Em|Ltda|Me|Eireli|S\/a)\b/g,w=>({Ltda:'Ltda',Me:'ME','S/a':'S/A',Eireli:'EIRELI'}[w]||w.toLowerCase()));
const secTexto=a=>(a||[]).map(x=>`${x.codigo||''} - ${x.descricao||''}`).join('\n');
const secLer=t=>String(t||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.match(/^([\d.\-\/]+)\s*-\s*(.*)$/);return m?{codigo:fmtCnae(m[1])||m[1],descricao:m[2].trim()||null}:{codigo:null,descricao:l}});

// coloca no formulário o que veio da Receita ou do PDF (não apaga o que já está preenchido quando o dado veio vazio)
function preencher(f,d){
  const set=(n,v)=>{if(f[n]&&v!=null&&v!=='')f[n].value=v};
  if(d.cnpj&&f.doc)f.doc.value=fmtCnpj(d.cnpj);
  set('razao',d.razao_social);if(f.fantasia&&!f.fantasia.value.trim()&&d.nome_fantasia)f.fantasia.value=titulo(d.nome_fantasia);
  CAMPOS.forEach(k=>{let v=d[k];if(k==='cep')v=fmtCep(v);if(k==='telefone')v=fmtTel(v);if(k==='data_abertura')v=dataIso(v);set(k,v)});
  if(f.cnaes_sec&&d.cnaes_secundarios?.length)f.cnaes_sec.value=secTexto(d.cnaes_secundarios);
  const atv=sugerirAtividade(d);if(atv&&f.atividade&&!f.atividade.value)f.atividade.value=atv;
  const reg=sugerirRegime(d);if(reg&&f.regime)f.regime.value=reg;else if(d.simples===false&&f.regime?.value==='simples_nacional')f.regime.value='';
  f.dataset.consultado='1';S._cnpjBusca=d;
  const av=f.querySelector('[data-cnpj-aviso]');if(av){const sit=d.situacao_cadastral;const ok=!sit||/ativa/i.test(sit);
    av.className='wide cnpj-aviso '+(ok?'ok':'alerta');
    av.innerHTML=`<b>${ok?'Dados preenchidos':'Atenção: situação '+esc(sit)}</b> · fonte: ${esc(d.fonte||'Receita')}${sit&&ok?' · situação '+esc(sit):''}.`+
      (d.simples===true?' Optante pelo Simples Nacional.':d.simples===false?' Não optante pelo Simples: escolha Lucro Presumido ou Lucro Real com o seu contador.':'')+' Confira e clique em Salvar.'}
}
function aviso(f,html,cls='info'){const av=f.querySelector('[data-cnpj-aviso]');if(av){av.className='wide cnpj-aviso '+cls;av.innerHTML=html}}

document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-cnpj-buscar]');if(!b)return;const f=b.closest('form');
  const cnpj=soDig(f.doc.value);if(cnpj.length!==14){aviso(f,'Digite o CNPJ com 14 dígitos e clique de novo.','alerta');f.doc.focus();return}
  b.disabled=true;aviso(f,'Consultando a Receita…');
  try{preencher(f,await consultarCnpj(cnpj))}catch(e){aviso(f,esc(e.message),'alerta')}finally{b.disabled=false}
});
document.addEventListener('change',async ev=>{
  const inp=ev.target.closest?.('[data-cnpj-pdf]');if(!inp||!inp.files[0])return;const f=inp.form;
  aviso(f,'Lendo o PDF do Cartão CNPJ…');
  try{let d=await lerPdf(inp.files[0]);
    if(d.cnpj){aviso(f,'PDF lido. Conferindo os dados atualizados na Receita…');try{const on=await consultarCnpj(d.cnpj);const m={...d};Object.entries(on).forEach(([k,v])=>{if(v!=null&&!(Array.isArray(v)&&!v.length))m[k]=v});m.fonte='PDF do Cartão CNPJ + '+on.fonte;d=m}catch(e){}}
    preencher(f,d)}
  catch(e){aviso(f,esc(e.message),'alerta')}finally{inp.value=''}
});

// ---------- formulário "Editar dados" completo (PJ); pessoa física continua com o formulário simples
const formOriginal=window.formDadosEmp;
window.formDadosEmp=function(empId){const e=empresa(empId);if(!e)return;if(e.tipo_pessoa==='pf')return formOriginal(empId);
  const v=k=>esc(e[k]??'');const opt=(o,sel)=>Object.entries(o).map(([k,n])=>`<option value="${k}" ${k===sel?'selected':''}>${esc(n)}</option>`).join('');
  const consult=e.receita_consultada_em?`Última consulta à Receita: ${dataBR(e.receita_consultada_em.slice(0,10))}.`:'Busque na Receita ou leia o PDF do Cartão CNPJ para preencher tudo de uma vez.';
  drawer(`<h3>Dados da empresa · ${esc(nomeEmp(e))}</h3><p class="muted" style="margin:0">Cadastro conforme o Cartão CNPJ. ${consult}</p>
  <form data-form="dados-emp" data-emp="${e.id}" data-tipo="pj" data-completo="1" class="form-grid">
    <div class="field"><label for="dDoc">CNPJ</label><input id="dDoc" name="doc" inputmode="numeric" value="${esc(fmtCnpj(e.cnpj))}" ${S.master?'':'readonly'}></div>
    <div class="wide cnpj-acoes"><button type="button" class="btn ghost" data-cnpj-buscar>${typeof icone==='function'?icone('busca',15):''}Buscar dados na Receita</button>
      <label class="btn ghost">Ler PDF do Cartão CNPJ<input type="file" accept="application/pdf,.pdf" data-cnpj-pdf hidden></label></div>
    <div class="wide cnpj-aviso" data-cnpj-aviso hidden></div>
    <div class="field wide"><label for="dRazao">Razão social (nome empresarial)</label><input id="dRazao" name="razao" required value="${v('razao_social')}"></div>
    <div class="field wide"><label for="dFant">Nome fantasia (é o nome que aparece no app e nos relatórios)</label><input id="dFant" name="fantasia" value="${v('nome_fantasia')}" placeholder="${v('razao_social')}"></div>
    <div class="field"><label for="dSit">Situação cadastral</label><input id="dSit" name="situacao_cadastral" value="${v('situacao_cadastral')}" placeholder="ATIVA"></div>
    <div class="field"><label for="dAbre">Data de abertura</label><input id="dAbre" name="data_abertura" type="date" value="${v('data_abertura')}"></div>
    <div class="field"><label for="dPorte">Porte</label><input id="dPorte" name="porte" value="${v('porte')}" placeholder="ME, EPP, Demais"></div>
    <div class="field wide"><label for="dNat">Natureza jurídica</label><input id="dNat" name="natureza_juridica" value="${v('natureza_juridica')}" placeholder="Sociedade Empresária Limitada"></div>

    <div class="wide sec-tit">Atividade e impostos</div>
    <div class="field"><label for="dCnae">CNAE principal</label><input id="dCnae" name="cnae_principal" value="${v('cnae_principal')}" placeholder="4711-3/02"></div>
    <div class="field" style="grid-column:span 2"><label for="dCnaeD">Descrição da atividade principal</label><input id="dCnaeD" name="cnae_descricao" value="${v('cnae_descricao')}"></div>
    <div class="field wide"><label for="dSec">Atividades secundárias (uma por linha: código - descrição)</label><textarea id="dSec" name="cnaes_sec" rows="3">${esc(secTexto(e.cnaes_secundarios))}</textarea></div>
    <div class="field"><label for="dReg">Regime tributário</label><select id="dReg" name="regime"><option value="">Não definido</option>${opt(REGIMES,e.regime_tributario)}</select></div>
    <div class="field" style="grid-column:span 2"><label for="dAtv">Atividade para os impostos</label><select id="dAtv" name="atividade"><option value="">Não definida</option>${opt(ATIVIDADES,e.atividade)}</select></div>
    <div class="field"><label for="dIE">Inscrição estadual</label><input id="dIE" name="inscricao_estadual" value="${v('inscricao_estadual')}" placeholder="Isento ou número"></div>
    <div class="field"><label for="dIM">Inscrição municipal</label><input id="dIM" name="inscricao_municipal" value="${v('inscricao_municipal')}"></div>
    <div class="field"><span class="hint" style="display:block;margin-top:22px"><button type="button" class="linkbtn small" data-acao="ir-tributos" data-emp="${e.id}">Impostos e taxas da maquininha ›</button></span></div>

    <div class="wide sec-tit">Endereço e contato</div>
    <div class="field" style="grid-column:span 2"><label for="dLog">Logradouro</label><input id="dLog" name="logradouro" value="${v('logradouro')}"></div>
    <div class="field"><label for="dNum">Número</label><input id="dNum" name="numero" value="${v('numero')}"></div>
    <div class="field"><label for="dComp">Complemento</label><input id="dComp" name="complemento" value="${v('complemento')}"></div>
    <div class="field"><label for="dBai">Bairro</label><input id="dBai" name="bairro" value="${v('bairro')}"></div>
    <div class="field"><label for="dCep">CEP</label><input id="dCep" name="cep" inputmode="numeric" value="${v('cep')}"></div>
    <div class="field" style="grid-column:span 2"><label for="dMun">Município</label><input id="dMun" name="municipio" value="${v('municipio')}"></div>
    <div class="field"><label for="dUf">UF</label><input id="dUf" name="uf" maxlength="2" value="${v('uf')}" style="text-transform:uppercase"></div>
    <div class="field" style="grid-column:span 2"><label for="dMail">E-mail</label><input id="dMail" name="email" type="email" value="${v('email')}"></div>
    <div class="field"><label for="dTel">Telefone</label><input id="dTel" name="telefone" inputmode="tel" value="${v('telefone')}"></div>
    <div class="wide" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn">Salvar</button><button type="button" class="btn ghost" data-acao="fechar">Cancelar</button></div></form>`)};

const salvarOriginal=FORMS['dados-emp'];
FORMS['dados-emp']=async function(f){
  if(f.dataset.completo!=='1')return salvarOriginal(f);
  const id=f.dataset.emp;const row={razao_social:f.razao.value.trim(),nome_fantasia:f.fantasia.value.trim()||null,regime_tributario:f.regime.value||null,atividade:f.atividade.value||null};
  if(!row.razao_social)return toast('Informe a razão social.');
  if(S.master&&f.doc&&!f.doc.readOnly){const d=soDig(f.doc.value);if(d.length!==14)return toast('O CNPJ precisa ter 14 dígitos.');row.cnpj=d}
  const ext={};CAMPOS.forEach(k=>{const el=f[k];if(el)ext[k]=el.value.trim()||null});
  if(ext.uf)ext.uf=ext.uf.toUpperCase();if(ext.uf&&!/^[A-Z]{2}$/.test(ext.uf))return toast('UF com 2 letras, por exemplo SP.');
  if(ext.cep)ext.cep=fmtCep(ext.cep);ext.cnaes_secundarios=secLer(f.cnaes_sec?.value);
  if(f.dataset.consultado==='1')ext.receita_consultada_em=new Date().toISOString();
  let {error}=await sb.from('empresas').update({...row,...ext}).eq('id',id);
  if(error&&/column|schema cache/i.test(error.message)){({error}=await sb.from('empresas').update(row).eq('id',id));if(!error){fecharDrawer();toast('Razão social, regime e atividade salvos. O restante do Cartão CNPJ precisa da atualização do banco.');await recarregarCad();return}}
  if(error)throw error;
  fecharDrawer();toast('Dados da empresa salvos.');await recarregarCad();S._marca=null;if(typeof marcaPelaSelecao==='function')marcaPelaSelecao()};

// ---------- nova empresa: botões de busca no CNPJ e gravação dos dados extras depois de criar
const novaOriginal=window.formNovaEmpresa;
window.formNovaEmpresa=function(){S._cnpjBusca=null;
  const alvo='placeholder="00.000.000/0001-00"></div>';let h=novaOriginal();
  if(h.includes(alvo))h=h.replace(alvo,alvo+`<div class="wide cnpj-acoes" data-pj><button type="button" class="btn ghost" data-cnpj-buscar>Buscar dados na Receita</button><label class="btn ghost">Ler PDF do Cartão CNPJ<input type="file" accept="application/pdf,.pdf" data-cnpj-pdf hidden></label></div><div class="wide cnpj-aviso" data-cnpj-aviso hidden></div>`);
  return h};
const criarOriginal=window.criarEmpresaPadrao;
window.criarEmpresaPadrao=async function(f){
  const d=S._cnpjBusca,doc=soDig(f.doc.value);await criarOriginal(f);
  if(!d||f.tipo?.value==='pf'||soDig(d.cnpj||'')!==doc)return;
  const e=S.empresas.find(x=>x.cnpj===doc);if(!e)return;
  const ext={cnaes_secundarios:d.cnaes_secundarios||[],receita_consultada_em:new Date().toISOString()};
  CAMPOS.forEach(k=>{let v=d[k];if(k==='cep')v=fmtCep(v);if(k==='telefone')v=fmtTel(v);if(k==='data_abertura')v=dataIso(v);if(k==='uf'&&v)v=String(v).toUpperCase();if(v!=null)ext[k]=v});
  const {error}=await sb.from('empresas').update(ext).eq('id',e.id);if(!error){S._cnpjBusca=null;await recarregarCad()}else console.warn('dados do Cartão CNPJ não gravados',error.message);
};

document.addEventListener('click',ev=>{const b=ev.target.closest('[data-acao=ir-tributos]');if(!b)return;ev.stopPropagation();S.tribEmp=b.dataset.emp;fecharDrawer();location.hash='tributos'},true);

const st=document.createElement('style');st.textContent=`
.cnpj-acoes{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:-4px}
.cnpj-acoes .btn{display:inline-flex;align-items:center;gap:6px}
.cnpj-aviso{font-size:13px;border-radius:8px;padding:9px 12px;border-left:3px solid var(--accent);background:var(--accent-soft);color:var(--ink)}
.cnpj-aviso:empty{display:none}.cnpj-aviso.ok{border-left-color:var(--good)}.cnpj-aviso.alerta{border-left-color:var(--warn);background:var(--warn-soft)}`;
document.head.appendChild(st);
// mostra o aviso só quando tem texto
new MutationObserver(()=>document.querySelectorAll('[data-cnpj-aviso]').forEach(a=>a.hidden=!a.textContent.trim())).observe(document.getElementById('layer'),{childList:true,subtree:true,characterData:true});
})();
