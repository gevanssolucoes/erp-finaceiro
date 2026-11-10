// Gevans Gestor · seletor de conta do plano com pesquisa.
// Toda lista de contas (opções no formato "3.01.001 Nome") com muitas opções vira um seletor
// que mostra só o nome da conta. Ao abrir, aparece a caixa de pesquisa no topo da lista:
// acha por nome, pela conta superior ou pelo código, sem acento.
// O <select> original continua no formulário (escondido), então valor, change e envio não mudam.
(function(){
  const MIN=10;
  const RE_COD=/^(\d+(?:\.\d+)*)\s+/;
  const tira=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ehListaDeContas=sel=>{if(sel.multiple||sel.dataset.bs||sel.dataset.semBusca!=null)return false;const os=[...sel.options].filter(o=>o.value);
    if(os.length<MIN)return false;return os.filter(o=>RE_COD.test(o.textContent.trim())).length>=os.length*.7};

  const css=document.createElement('style');css.textContent=`
.cb{position:relative;display:inline-flex;max-width:100%;min-width:0;vertical-align:middle}
.cb-sel{position:absolute!important;inset:0;opacity:0;pointer-events:none;width:100%!important;height:100%!important;min-width:0!important}
.cb-btn{display:flex;align-items:center;gap:8px;width:100%;min-width:0;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:6px 8px;font:inherit;color:var(--ink);cursor:pointer}
.cb-btn:hover{border-color:var(--ink-3)}.cb-btn:focus-visible,.cb.aberto .cb-btn{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.cb-btn:disabled{opacity:.6;cursor:not-allowed}
.cb-btn .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cb-btn .t.vazio{color:var(--ink-2)}
.cb-btn svg{width:14px;height:14px;flex:none;fill:none;stroke:var(--ink-2);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cb-pop{position:fixed;z-index:1000;background:var(--surface);border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;min-width:260px}
.cb-q{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--line)}
.cb-q svg{width:16px;height:16px;flex:none;fill:none;stroke:var(--ink-2);stroke-width:2;stroke-linecap:round}
.cb-q input{border:0;outline:0;background:transparent;flex:1;min-width:0;font:inherit;color:var(--ink);padding:4px 0}
.cb-lista{overflow-y:auto;overscroll-behavior:contain;padding:4px 0;margin:0;list-style:none}
.cb-g{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2);padding:8px 12px 4px}
.cb-o{padding:7px 12px;cursor:pointer;display:flex;flex-direction:column;gap:1px;border-left:3px solid transparent}
.cb-o .n{font-size:13.5px;color:var(--ink)}.cb-o .p{font-size:11.5px;color:var(--ink-2)}
.cb-o.ativo{background:var(--accent-soft);border-left-color:var(--accent)}.cb-o.sel .n{font-weight:600;color:var(--accent-ink)}
.cb-o.desab{opacity:.45;cursor:not-allowed}
.cb-o mark{background:var(--warn-soft,#fff3c4);color:inherit;border-radius:2px;padding:0 1px}
.cb-nada{padding:14px 12px;color:var(--ink-2);font-size:13px}
.cb-rod{font-size:11.5px;color:var(--ink-2);padding:6px 12px;border-top:1px solid var(--line)}
.cb-fundo{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.35)}
@media (max-width:640px){
  .cb-pop{left:0!important;right:0!important;bottom:0!important;top:auto!important;width:auto!important;max-height:75vh!important;border-radius:14px 14px 0 0}
  .cb-q{padding:12px 14px}.cb-q input{font-size:16px}.cb-o{padding:11px 14px}.cb-o .n{font-size:15px}.cb-rod{display:none}
}`;document.head.appendChild(css);

  // monta a lista a partir das opções do select (com optgroup, se houver)
  function itens(sel){
    const contas=(typeof S!=='undefined'&&S.contas)||[];
    const nomePai=v=>{const c=contas.find(x=>x.id===v);if(!c||!c.conta_pai)return '';return contas.find(x=>x.id===c.conta_pai)?.nome||''};
    return [...sel.options].map(o=>{const txt=o.textContent.trim(),m=txt.match(RE_COD);
      return {v:o.value,cod:m?m[1]:'',nome:m?txt.slice(m[0].length):txt,grupo:o.parentElement?.tagName==='OPTGROUP'?o.parentElement.label:'',pai:o.value?nomePai(o.value):'',d:o.disabled}})}
  const rotulo=(it)=>it?it.nome:'';

  function marca(t,termos){let h=esc(t);if(!termos.length)return h;
    const base=tira(t);const faixas=[];termos.forEach(q=>{let i=base.indexOf(q);while(i>=0&&q){faixas.push([i,i+q.length]);i=base.indexOf(q,i+q.length)}});
    if(!faixas.length)return h;faixas.sort((a,b)=>a[0]-b[0]);let out='',pos=0;
    faixas.forEach(([a,b])=>{if(a<pos)return;out+=esc(t.slice(pos,a))+'<mark>'+esc(t.slice(a,b))+'</mark>';pos=b});return out+esc(t.slice(pos))}

  let aberto=null; // {sel,cb,pop,fundo,lista,inp,vis,ativo}
  function fechar(foco){if(!aberto)return;const a=aberto;aberto=null;a.pop.remove();a.fundo?.remove();a.cb.classList.remove('aberto');a.btn.setAttribute('aria-expanded','false');
    window.removeEventListener('resize',a.pos);document.removeEventListener('scroll',a.rolou,true);if(foco)a.btn.focus()}
  function escolher(a,it){if(!it||it.d)return;fechar(true);if(a.sel.value!==it.v){a.sel.value=it.v;a.sel.dispatchEvent(new Event('input',{bubbles:true}));a.sel.dispatchEvent(new Event('change',{bubbles:true}))}atualiza(a.sel)}

  function desenha(a){
    const termos=tira(a.inp.value).split(/\s+/).filter(Boolean);const atual=a.sel.value;
    const todos=itens(a.sel);const vazio=todos.find(i=>!i.v);
    const ok=todos.filter(i=>i.v&&termos.every(t=>tira(i.nome+' '+i.cod+' '+i.pai+' '+i.grupo).includes(t)));
    a.vis=[];let html='',grp=null;
    if(vazio&&!termos.length&&!a.sel.required){a.vis.push(vazio);html+=`<li class="cb-o${!atual?' sel':''}" role="option" data-i="0" aria-selected="${!atual}"><span class="n">${esc(vazio.nome||'Nenhuma')}</span></li>`}
    ok.forEach(it=>{const cab=it.grupo||'';
      if(cab&&cab!==grp){html+=`<li class="cb-g" role="presentation">${esc(cab)}</li>`;grp=cab}
      const i=a.vis.push(it)-1;
      html+=`<li class="cb-o${it.v===atual?' sel':''}${it.d?' desab':''}" role="option" id="${a.id}-o${i}" data-i="${i}" aria-selected="${it.v===atual}"${it.d?' aria-disabled="true"':''}><span class="n">${marca(it.nome,termos)}</span>${it.pai?`<span class="p">${marca(it.pai,termos)}</span>`:''}</li>`});
    if(!ok.length)html+=`<li class="cb-nada">Nenhuma conta com “${esc(a.inp.value)}”</li>`;
    a.lista.innerHTML=html;
    a.rod.textContent=termos.length?`${ok.length} conta${ok.length===1?'':'s'} · Enter escolhe`:`${ok.length} contas · digite nome ou código`;
    const iSel=a.vis.findIndex(i=>i.v===atual&&i.v);
    ativa(a,termos.length?a.vis.findIndex(i=>i.v&&!i.d):(iSel>=0?iSel:0),!termos.length)}
  function ativa(a,i,centro){a.ativo=i;a.lista.querySelectorAll('.cb-o.ativo').forEach(e=>e.classList.remove('ativo'));
    const el=a.lista.querySelector(`.cb-o[data-i="${i}"]`);if(el){el.classList.add('ativo');a.inp.setAttribute('aria-activedescendant',el.id||'');
      if(centro)el.scrollIntoView({block:'center'});else el.scrollIntoView({block:'nearest'})}}

  let seq=0;
  function abrir(sel){
    if(aberto){const mesmo=aberto.sel===sel;fechar(false);if(mesmo)return}
    const cb=sel._cb,btn=cb.querySelector('.cb-btn');if(btn.disabled)return;
    const a={sel,cb,btn,id:'cb'+(++seq)};
    const mob=matchMedia('(max-width:640px)').matches;
    if(mob){a.fundo=document.createElement('div');a.fundo.className='cb-fundo';a.fundo.addEventListener('pointerdown',e=>{e.preventDefault();fechar(true)});document.body.appendChild(a.fundo)}
    a.pop=document.createElement('div');a.pop.className='cb-pop';a.pop.setAttribute('role','dialog');a.pop.setAttribute('aria-label','Escolher conta do plano');
    a.pop.innerHTML=`<div class="cb-q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input type="search" placeholder="Pesquisar conta…" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="${a.id}-l" aria-label="Pesquisar conta do plano"></div><ul class="cb-lista" id="${a.id}-l" role="listbox"></ul><div class="cb-rod"></div>`;
    document.body.appendChild(a.pop);
    a.inp=a.pop.querySelector('input');a.lista=a.pop.querySelector('.cb-lista');a.rod=a.pop.querySelector('.cb-rod');
    a.pos=()=>{if(mob)return;const r=btn.getBoundingClientRect(),w=Math.max(r.width,300),h=Math.min(380,innerHeight-24);
      const baixo=innerHeight-r.bottom-8,cima=r.top-8,emCima=baixo<240&&cima>baixo,alt=Math.min(h,emCima?cima:baixo);
      a.pop.style.width=w+'px';a.pop.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';a.pop.style.maxHeight=Math.max(200,alt)+'px';
      a.pop.style.top=(emCima?Math.max(8,r.top-4-Math.max(200,alt)):r.bottom+4)+'px'};
    a.rolou=e=>{if(!a.pop.contains(e.target))a.pos()};
    a.pos();window.addEventListener('resize',a.pos);document.addEventListener('scroll',a.rolou,true);
    aberto=a;cb.classList.add('aberto');btn.setAttribute('aria-expanded','true');
    desenha(a);a.inp.focus({preventScroll:true});
    a.inp.addEventListener('input',()=>desenha(a));
    a.inp.addEventListener('keydown',ev=>{
      const n=a.vis.length;const passo=d=>{let i=a.ativo;for(let k=0;k<n;k++){i=(i+d+n)%n;if(!a.vis[i].d)break}ativa(a,i)};
      if(ev.key==='ArrowDown'){ev.preventDefault();if(n)passo(1)}
      else if(ev.key==='ArrowUp'){ev.preventDefault();if(n)passo(-1)}
      else if(ev.key==='Enter'){ev.preventDefault();escolher(a,a.vis[a.ativo])}
      else if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();if(a.inp.value){a.inp.value='';desenha(a)}else fechar(true)}
      else if(ev.key==='Tab'){fechar(false)}});
    a.lista.addEventListener('pointerdown',ev=>ev.preventDefault());
    a.lista.addEventListener('click',ev=>{const li=ev.target.closest('.cb-o');if(li)escolher(a,a.vis[+li.dataset.i])});
    a.lista.addEventListener('pointermove',ev=>{const li=ev.target.closest('.cb-o');if(li&&+li.dataset.i!==a.ativo&&matchMedia('(hover:hover)').matches)ativa(a,+li.dataset.i)});
  }
  document.addEventListener('pointerdown',ev=>{if(aberto&&!aberto.pop.contains(ev.target)&&!aberto.cb.contains(ev.target))fechar(false)},true);

  function atualiza(sel){const cb=sel._cb;if(!cb)return;const btn=cb.querySelector('.cb-btn'),t=btn.querySelector('.t');
    const o=sel.options[sel.selectedIndex];const its=o?itens({options:[o]}):[];const it=its[0];
    const txt=it&&o.value?rotulo(it):(o?o.textContent.trim():'')||'Escolha a conta…';
    t.textContent=txt;t.classList.toggle('vazio',!o||!o.value);btn.title=it&&o.value?(it.cod?it.cod+' · ':'')+it.nome:'';
    btn.disabled=sel.disabled}

  function liga(sel){
    sel.dataset.bs='1';
    const cb=document.createElement('span');cb.className='cb';
    if(sel.getAttribute('style'))cb.setAttribute('style',sel.getAttribute('style'));
    cb.style.width=cb.style.width||(sel.closest('.field,.campo,label')?'100%':'');
    const btn=document.createElement('button');btn.type='button';btn.className='cb-btn';btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');
    btn.innerHTML='<span class="t"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    const lab=sel.id&&document.querySelector(`label[for="${CSS.escape(sel.id)}"]`);
    if(lab){lab.addEventListener('click',e=>{e.preventDefault();btn.focus()})}
    btn.setAttribute('aria-label',(lab?lab.textContent.trim()+': ':'')+'escolher conta');
    sel.parentNode.insertBefore(cb,sel);cb.append(btn,sel);sel.classList.add('cb-sel');sel.tabIndex=-1;sel.setAttribute('aria-hidden','true');
    sel._cb=cb;
    btn.addEventListener('click',()=>abrir(sel));
    btn.addEventListener('keydown',ev=>{if(ev.key==='ArrowDown'||ev.key==='ArrowUp'||ev.key==='Enter'||ev.key===' '){ev.preventDefault();abrir(sel)}
      else if(ev.key.length===1&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey){ev.preventDefault();abrir(sel);if(aberto){aberto.inp.value=ev.key;desenha(aberto)}}});
    // o app às vezes troca o valor por código (sugestão, regra, edição): mantém o botão em dia
    const proto=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value'),protoI=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'selectedIndex');
    Object.defineProperty(sel,'value',{configurable:true,get(){return proto.get.call(this)},set(v){proto.set.call(this,v);atualiza(this)}});
    Object.defineProperty(sel,'selectedIndex',{configurable:true,get(){return protoI.get.call(this)},set(v){protoI.set.call(this,v);atualiza(this)}});
    sel.addEventListener('change',()=>atualiza(sel));
    new MutationObserver(()=>atualiza(sel)).observe(sel,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
    sel.form?.addEventListener('reset',()=>setTimeout(()=>atualiza(sel)));
    sel.addEventListener('invalid',()=>{btn.focus();btn.classList.add('erro')});
    atualiza(sel);
  }
  let pend=false;
  const varre=()=>{pend=false;document.querySelectorAll('select:not([data-bs])').forEach(s=>{if(ehListaDeContas(s))liga(s)});
    if(aberto&&!document.contains(aberto.cb))fechar(false)};
  new MutationObserver(()=>{if(!pend){pend=true;requestAnimationFrame(varre)}}).observe(document.body,{childList:true,subtree:true});
  varre();
  window.abrirSeletorConta=sel=>{if(sel&&sel._cb)abrir(sel)};
})();
