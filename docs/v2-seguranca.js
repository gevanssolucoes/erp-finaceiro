// ===================== Versão 2 · Login em duas etapas e saída por inatividade
// Duas etapas: aplicativo autenticador (Google Authenticator, Microsoft Authenticator, Authy…)
// pelo recurso de MFA do Supabase. Quem ativou digita o código de 6 dígitos depois da senha.
// Inatividade: depois de N minutos sem uso (padrão 30, ajustável em Administração · app.inatividade_min)
// o app sai sozinho e pede a senha de novo.
(()=>{
if(typeof S==='undefined'||typeof sb==='undefined')return;
IC.seguranca='<path d="M12 3 4 7v5c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V7z"/><path d="m9 12 2 2 4-4"/>';
const mfa=sb.auth?.mfa;

const css=document.createElement('style');css.textContent=`
.mfa-qr{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.mfa-qr img{width:168px;height:168px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:6px}
.mfa-seg{font-family:var(--f-num);font-size:12.5px;background:var(--surface-2);border-radius:6px;padding:6px 8px;overflow-wrap:anywhere}
.codigo6{font-family:var(--f-num);font-size:22px;letter-spacing:.35em;text-align:center}
.seg-status{display:flex;gap:12px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:12px 14px}
`;document.head.appendChild(css);

// ---------- segunda etapa no login
async function precisaCodigo(){
  if(!mfa)return null;
  try{const {data,error}=await mfa.getAuthenticatorAssuranceLevel();if(error||!data)return null;
    if(data.nextLevel==='aal2'&&data.currentLevel!=='aal2'){const f=await mfa.listFactors();const t=(f.data?.totp||[]).find(x=>x.status==='verified');return t||null}}
  catch(e){}
  return null}
function telaCodigo(user,fator,aviso){
  document.getElementById('app').hidden=true;const a=document.getElementById('auth');a.hidden=false;
  a.innerHTML=`<div class="auth-card"><div class="brand" style="padding:0">${LOGO}<div><b style="color:var(--ink)">${APP_NOME}</b><small style="color:var(--ink-2)">${APP_SUB}</small></div></div>
  <h1>Código de verificação</h1>${aviso?`<div class="msg err" role="status">${esc(aviso)}</div>`:''}
  <p>Abra o aplicativo autenticador no celular e digite o código de 6 dígitos do ${esc(APP_NOME)}.</p>
  <form data-form="mfa-login" style="display:flex;flex-direction:column;gap:12px"><div class="field"><label for="mfaCod">Código</label><input id="mfaCod" name="codigo" class="codigo6" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></div>
  <button class="btn">Confirmar e entrar</button></form><button class="linkbtn small" data-acao="mfa-sair">Entrar com outra conta</button>
  <p style="font-size:12.5px">Perdeu o celular? Peça ao administrador da conta master para desligar a verificação do seu usuário.</p></div>`;
  a.querySelector('#mfaCod').focus();
  a.querySelector('form').addEventListener('submit',async ev=>{ev.preventDefault();const b=ev.target.querySelector('button');b.disabled=true;
    const {error}=await mfa.challengeAndVerify({factorId:fator.id,code:ev.target.codigo.value.trim()});
    if(error){telaCodigo(user,fator,'Código não confere. Confira a hora do celular e tente o código novo.');return}
    entrar0(user)});
}
const entrar0=entrar;
entrar=async function(user){const f=await precisaCodigo();if(f)return telaCodigo(user,f);marcarUso();return entrar0(user)};

// ---------- tela "Segurança da conta"
async function fatores(){if(!mfa)return [];const {data,error}=await mfa.listFactors();if(error)throw error;return data?.totp||[]}
async function abrirSeguranca(){
  let fs=[];let erro='';try{fs=await fatores()}catch(e){erro=traduz(e)}
  const ativo=fs.find(f=>f.status==='verified');const min=minutosLimite();
  drawer(`<h3>Segurança da conta</h3>
  <div style="display:flex;flex-direction:column;gap:14px">
  <div class="seg-status"><span class="tic ${ativo?'tic-good':'tic-warn'}" style="width:34px;height:34px;border-radius:8px;display:grid;place-items:center">${icone('seguranca',18)}</span><div style="flex:1;min-width:0"><b>Login em duas etapas: ${ativo?'ligado':'desligado'}</b><br><span class="muted" style="font-size:12.5px">${ativo?'Além da senha, o app pede o código do autenticador do celular.':'Hoje basta a senha. Com as duas etapas, quem descobrir sua senha ainda não entra.'}</span></div></div>
  ${erro?`<p class="muted">Não consegui ver a verificação desta conta: ${esc(erro)}. Confira em Supabase › Authentication › Multi-Factor se o TOTP está habilitado.</p>`:''}
  ${!mfa?'<p class="muted">Esta versão da biblioteca de login não tem a verificação em duas etapas.</p>':ativo?`<button class="btn ghost" data-acao="mfa-desligar" data-id="${ativo.id}" style="color:var(--bad);align-self:flex-start">Desligar login em duas etapas</button>`:'<button class="btn" data-acao="mfa-ligar" style="align-self:flex-start">Ligar login em duas etapas</button>'}
  <div id="mfaPasso"></div>
  <div class="seg-status"><span class="tic tic-accent" style="width:34px;height:34px;border-radius:8px;display:grid;place-items:center">${icone('relatorio',18)}</span><div><b>Saída automática: ${min} minutos sem uso</b><br><span class="muted" style="font-size:12.5px">Depois disso o app sai sozinho e pede a senha. ${S.master?'Ajuste em Administração › Parâmetros (app.inatividade_min).':'Quem define é o administrador do sistema.'}</span></div></div>
  <div><button type="button" class="btn ghost" data-acao="fechar">Fechar</button></div></div>`);
}
async function ligar(){
  const box=document.getElementById('mfaPasso');box.innerHTML='<p class="muted">Gerando o código…</p>';
  // remove tentativas antigas não confirmadas
  try{for(const f of await fatores())if(f.status!=='verified')await mfa.unenroll({factorId:f.id})}catch(e){}
  const {data,error}=await mfa.enroll({factorType:'totp',friendlyName:APP_NOME+' · '+new Date().toISOString().slice(0,16)});
  if(error){box.innerHTML=`<p class="msg err">${esc(traduz(error))}</p>`;return}
  box.innerHTML=`<form data-form="mfa-ligar" data-id="${data.id}" style="display:flex;flex-direction:column;gap:12px">
   <ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:13.5px"><li>Instale um autenticador no celular (Google Authenticator, Microsoft Authenticator ou Authy).</li><li>No aplicativo, toque em adicionar e leia o QR code abaixo.</li><li>Digite o código de 6 dígitos que aparecer.</li></ol>
   <div class="mfa-qr"><img src="${esc(data.totp.qr_code)}" alt="QR code para o autenticador"><div style="min-width:0;flex:1"><span class="muted" style="font-size:12.5px">Sem câmera? Digite esta chave no aplicativo:</span><div class="mfa-seg">${esc(data.totp.secret)}</div></div></div>
   <div class="field" style="max-width:220px"><label for="mfaNovo">Código do aplicativo</label><input id="mfaNovo" name="codigo" class="codigo6" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></div>
   <div><button class="btn">Confirmar e ligar</button></div></form>`;
  box.querySelector('#mfaNovo').focus();
}
document.addEventListener('submit',async ev=>{const f=ev.target;if(f.dataset?.form!=='mfa-ligar')return;ev.preventDefault();ev.stopPropagation();
  const {error}=await mfa.challengeAndVerify({factorId:f.dataset.id,code:f.codigo.value.trim()});
  if(error){toast('Código não confere. Use o código que está aparecendo agora no aplicativo.');return}
  toast('Login em duas etapas ligado. No próximo acesso o app vai pedir o código.');abrirSeguranca()},true);
document.addEventListener('click',async ev=>{const b=ev.target.closest('[data-acao]');if(!b)return;const a=b.dataset.acao;
  if(a==='seguranca'){ev.stopPropagation();abrirSeguranca()}
  else if(a==='mfa-ligar'){ev.stopPropagation();ligar()}
  else if(a==='mfa-desligar'){ev.stopPropagation();if(!confirm('Desligar o login em duas etapas? Depois disso basta a senha para entrar.'))return;
    const {error}=await mfa.unenroll({factorId:b.dataset.id});if(error){toast(traduz(error));return}toast('Login em duas etapas desligado.');abrirSeguranca()}
  else if(a==='mfa-sair'){ev.stopPropagation();await sb.auth.signOut();telaAuth('login')}},true);

// link no rodapé do menu
const rn=renderNav;
renderNav=function(r){rn(r);const f=document.getElementById('sideFoot');if(f&&!f.querySelector('[data-acao=seguranca]')){const s=f.querySelector('[data-acao=alterar-senha]');s?.insertAdjacentHTML('afterend',' · <button class="linkbtn small" data-acao="seguranca" style="color:var(--side-ink)">Segurança</button>')}};

// ---------- saída por inatividade
function minutosLimite(){const v=typeof appCfg==='function'?Number(appCfg('app.inatividade_min')):NaN;return v>=5&&v<=720?v:30}
let ultimo=Date.now(),ultimoGravado=0;
function marcarUso(){ultimo=Date.now();if(ultimo-ultimoGravado>15000){ultimoGravado=ultimo;try{localStorage.setItem('gg_ultimo_uso',String(ultimo))}catch(e){}}}
['pointerdown','keydown','wheel','touchstart','scroll'].forEach(t=>addEventListener(t,marcarUso,{passive:true,capture:true}));
async function conferir(){
  if(!S.user)return;let outro=0;try{outro=+localStorage.getItem('gg_ultimo_uso')||0}catch(e){}
  const parado=Date.now()-Math.max(ultimo,outro);
  if(parado>minutosLimite()*60000){const m=minutosLimite();S.user=null;fecharDrawer();try{await sb.auth.signOut()}catch(e){}telaAuth('login',`Saímos da sua conta depois de ${m} minutos sem uso. Entre de novo para continuar.`)}}
setInterval(conferir,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)conferir()});
window.segurancaConta=abrirSeguranca;
})();
