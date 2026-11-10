// Gevans Gestor · pesquisa nos campos de conta do plano.
// Qualquer lista de contas (opções no formato "3.01.001 Nome") com muitas opções ganha,
// logo acima, uma caixa para pesquisar por código ou nome, sem acento.
(function(){
  const MIN=10;
  const tira=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
  const ehListaDeContas=sel=>{if(sel.multiple||sel.dataset.bs||sel.dataset.semBusca!=null)return false;const os=[...sel.options].filter(o=>o.value);
    if(os.length<MIN)return false;return os.filter(o=>/^\d+(\.\d+)*\s/.test(o.textContent.trim())).length>=os.length*.7};
  function guarda(sel){sel._bsTodas=[...sel.options].map(o=>({v:o.value,t:o.textContent,d:o.disabled}))}
  function filtra(sel,q,inp){
    const termos=tira(q).split(/\s+/).filter(Boolean);const atual=sel.value;
    const ok=sel._bsTodas.filter(o=>!o.v||o.v===atual||!termos.length||termos.every(t=>tira(o.t).includes(t)));
    sel.innerHTML='';ok.forEach(o=>{const op=document.createElement('option');op.value=o.v;op.textContent=o.t;op.disabled=o.d;sel.appendChild(op)});
    sel.value=atual;sel._bsMo.takeRecords();
    const achadas=ok.filter(o=>o.v&&(!termos.length||termos.every(t=>tira(o.t).includes(t))));
    if(termos.length&&achadas.length===1&&sel.value!==achadas[0].v){sel.value=achadas[0].v;sel.dispatchEvent(new Event('change',{bubbles:true}))}
    const h=inp.parentNode.querySelector('.sel-busca-hint');
    if(h)h.textContent=!termos.length?'':achadas.length?`${achadas.length} conta${achadas.length>1?'s':''} encontrada${achadas.length>1?'s':''}${achadas.length===1?' · já selecionada':' · escolha na lista abaixo'}`:'Nenhuma conta com esse texto';
    return achadas}
  function liga(sel){
    sel.dataset.bs='1';guarda(sel);
    const box=document.createElement('div');box.className='sel-busca';
    const inp=document.createElement('input');inp.type='search';inp.placeholder='Pesquisar conta: código ou nome';inp.autocomplete='off';inp.setAttribute('aria-label','Pesquisar conta do plano');
    const hint=document.createElement('span');hint.className='sel-busca-hint';hint.setAttribute('aria-live','polite');
    box.append(inp,hint);sel.parentNode.insertBefore(box,sel);
    sel._bsMo=new MutationObserver(()=>{guarda(sel);if(inp.value)filtra(sel,inp.value,inp)});sel._bsMo.observe(sel,{childList:true});
    inp.addEventListener('input',()=>filtra(sel,inp.value,inp));
    inp.addEventListener('keydown',ev=>{
      if(ev.key==='Enter'){ev.preventDefault();const a=filtra(sel,inp.value,inp);if(a.length&&sel.value!==a[0].v){sel.value=a[0].v;sel.dispatchEvent(new Event('change',{bubbles:true}))}sel.focus()}
      else if(ev.key==='ArrowDown'){ev.preventDefault();sel.focus()}
      else if(ev.key==='Escape'&&inp.value){ev.preventDefault();ev.stopPropagation();inp.value='';filtra(sel,'',inp)}});
  }
  let pend=false;
  const varre=()=>{pend=false;document.querySelectorAll('select:not([data-bs])').forEach(s=>{if(ehListaDeContas(s))liga(s)})};
  new MutationObserver(()=>{if(!pend){pend=true;requestAnimationFrame(varre)}}).observe(document.body,{childList:true,subtree:true});
  varre();
})();
