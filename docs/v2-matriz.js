// ===================== Versão 2 · Matriz de acessos
// No fim da tela Usuários: quem acessa cada empresa, com que papel, departamento e unidades,
// o que cada papel pode fazer e quem aprova cada faixa de valor. Sai em PDF ou Excel pelo botão Relatório.
(()=>{
if(typeof S==='undefined'||typeof VIEWS==='undefined'||!VIEWS.usuarios)return;
const PAPEL={admin:['Administrador','info'],financeiro:['Financeiro','good'],rh:['RH','warn'],leitura:['Leitura','mute']};
const PODE={admin:'Tudo na empresa: lança, paga, aprova pela alçada, gerencia usuários',financeiro:'Lança, dá baixa, importa extrato, aprova pela alçada',rh:'Colaboradores, férias e ausências',leitura:'Só consulta'};
const PROC={compra:'Compras',pagamento:'Pagamentos ao banco',conciliacao:'Conciliação de extrato'};
const QUEM={master:'Só a conta master',admin:'Administrador',financeiro:'Financeiro ou administrador'};

const vU=VIEWS.usuarios;
VIEWS.usuarios=async function(){
  const h=await vU();if(!S.usuarios)return h;
  const emps=adminEmps();if(!emps.length)return h;
  if(typeof carregarAlcadas==='function')await carregarAlcadas();
  const us=S.usuarios.filter(u=>!u.master&&u.ativo).map(u=>({...u,acessos:acessosDe(u)})).sort((a,b)=>String(a.nome||a.email).localeCompare(String(b.nome||b.email)));
  const dep=id=>(S.departamentos||[]).find(d=>d.id===id)?.nome;
  const cel=(u,e)=>{const a=u.acessos.find(x=>x.empresa_id===e.id);if(!a)return '<td class="muted">–</td>';const [n,c]=PAPEL[a.papel]||[a.papel,'mute'];
    const un=(a.predios||[]).map(id=>S.predios.find(p=>p.id===id)?.nome).filter(Boolean);
    return `<td><span class="chip ${c}">${n}</span>${dep(a.departamento_id)?`<span class="unit">${esc(dep(a.departamento_id))}</span>`:''}${un.length?`<span class="unit">só ${esc(un.join(', '))}</span>`:''}</td>`};
  const alc=(S.alcadas||[]).filter(a=>a.ativo&&emps.some(e=>e.id===a.empresa_id)).sort((a,b)=>a.empresa_id.localeCompare(b.empresa_id)||a.processo.localeCompare(b.processo)||a.valor_a_partir-b.valor_a_partir);
  const segr=emps.filter(e=>e.segregar_funcoes);
  return h+`<div class="panel"><div class="ph"><div><h2>Matriz de acessos</h2><p class="hint">Quem acessa cada empresa e com que papel. Revise uma vez por mês: tire quem saiu e confira se ninguém acumula funções que deveriam ser separadas. Use o botão Relatório no topo para salvar em PDF ou Excel.</p></div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Usuário</th>${emps.map(e=>`<th>${esc(nomeEmp(e))}</th>`).join('')}<th>Último acesso</th></tr></thead><tbody>
    ${us.length?us.map(u=>`<tr><td><b>${esc(u.nome||'')}</b><span class="unit">${esc(u.email)}</span></td>${emps.map(e=>cel(u,e)).join('')}<td class="mono">${u.ultimo_acesso?dataBR(u.ultimo_acesso.slice(0,10)):'nunca entrou'}</td></tr>`).join(''):`<tr><td colspan="${emps.length+2}" class="muted">Nenhum usuário além da conta master.</td></tr>`}
    </tbody></table></div></div>
  <div class="grid g-2e" style="grid-template-columns:repeat(2,minmax(0,1fr))">
    <div class="panel"><h2>O que cada papel pode fazer</h2><div class="tbl-wrap"><table><tbody>${Object.entries(PODE).map(([k,v])=>`<tr><td style="white-space:nowrap"><span class="chip ${PAPEL[k][1]}">${PAPEL[k][0]}</span></td><td>${v}</td></tr>`).join('')}</tbody></table></div>
      <p class="hint" style="margin-top:10px">Segregação de funções ${segr.length?`<span class="chip good">ligada em ${segr.length} empresa${segr.length>1?'s':''}</span>`:'<span class="chip mute">desligada</span>'}: quando ligada, quem lança não aprova o próprio pedido nem dá baixa no próprio lançamento.${S.master||emps.length?' Liga em Aprovações › Regras da empresa.':''}</p></div>
    <div class="panel"><h2>Quem aprova</h2>${alc.length?`<div class="tbl-wrap"><table><thead><tr>${emps.length>1?'<th>Empresa</th>':''}<th>Processo</th><th class="n">A partir de</th><th>Quem aprova</th><th>Outra pessoa</th></tr></thead><tbody>${alc.map(a=>`<tr>${emps.length>1?`<td>${esc(nomeEmp(empresa(a.empresa_id)))}</td>`:''}<td>${PROC[a.processo]||a.processo}</td><td class="n">${brl2.format(+a.valor_a_partir)}</td><td>${QUEM[a.aprovador]||a.aprovador}</td><td>${a.outra_pessoa?'Sim':'Não'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted" style="margin:0">Nenhuma faixa de aprovação cadastrada. Sem faixa, quem é administrador ou financeiro aprova tudo.</p>'}</div>
  </div>`};
})();
