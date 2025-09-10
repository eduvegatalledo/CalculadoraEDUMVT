// Helpers
const $ = id => document.getElementById(id);
const show = id => $(id)?.classList.remove('hide');
const hide = id => $(id)?.classList.add('hide');
const setText = (id,v)=>{ const el=$(id); if(el) el.textContent = String(v ?? ''); };
const todayStr = ()=> new Date().toISOString().slice(0,10);

// Modals with focus trap
const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';
let lastFocus = null;
function openModal(id){
  const m = $(id); if(!m) return;
  lastFocus = document.activeElement;
  m.classList.remove('hide');
  document.body.style.overflow = 'hidden';
  const focusables = m.querySelectorAll(FOCUSABLE);
  focusables[0]?.focus();
  m._trap = e=>{
    if(e.key === 'Escape'){ closeModal(id); }
    else if(e.key === 'Tab' && focusables.length){
      const first = focusables[0];
      const last = focusables[focusables.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  };
  m.addEventListener('keydown', m._trap);
  m._backdrop = e=>{ if(e.target === m) closeModal(id); };
  m.addEventListener('click', m._backdrop);
}
function closeModal(id){
  const m = $(id); if(!m) return;
  m.classList.add('hide');
  document.body.style.overflow = '';
  m.removeEventListener('keydown', m._trap);
  m.removeEventListener('click', m._backdrop);
  lastFocus?.focus();
}
function wireAuthButtons(){
  $('btnOpenLogin')?.addEventListener('click',()=>openModal('loginModal'));
  $('btnOpenSignup')?.addEventListener('click',()=>openModal('signupModal'));
  $('btnCloseLogin')?.addEventListener('click',()=>closeModal('loginModal'));
  $('btnCloseSignup')?.addEventListener('click',()=>closeModal('signupModal'));
}
wireAuthButtons();

// Supabase client
const { createClient } = supabase;
const SUPABASE_URL = "https://nzzzeycpfdtvzphbupbf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56enpleWNwZmR0dnpwaGJ1cGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDA3MTIsImV4cCI6MjA3MzAxNjcxMn0.HoAjTwnWdtjueVALlX4-du7uF919QEMj8SS2CHP0N44";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth actions
$('btnDoSignup')?.addEventListener('click', async()=>{
  const email = ($('suEmail')?.value||'').trim();
  const password = ($('suPass')?.value||'').trim();
  const msg = $('suMsg'); if(msg) msg.textContent='';
  if(!/.+@.+\..+/.test(email)){ msg.textContent='Ingresa un correo válido.'; return; }
  if(password.length<6){ msg.textContent='La contraseña debe tener al menos 6 caracteres.'; return; }
  const { data, error } = await sb.auth.signUp({ email, password });
  if(error){ msg.textContent='Error: '+error.message; return; }
  if(data.user && !data.session){ msg.textContent='Cuenta creada. Revisa tu correo para confirmar.'; }
  else{ window.location.href='/app.html'; }
});

$('btnDoLogin')?.addEventListener('click', async()=>{
  const email = ($('liEmail')?.value||'').trim();
  const password = ($('liPass')?.value||'').trim();
  const msg = $('liMsg'); if(msg) msg.textContent='';
  if(!/.+@.+\..+/.test(email)){ msg.textContent='Ingresa un correo válido.'; return; }
  if(!password){ msg.textContent='Ingresa tu contraseña.'; return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if(error){ msg.textContent='No pudimos iniciar sesión: '+error.message; return; }
  window.location.href='/app.html';
});

$('btnForgot')?.addEventListener('click', async()=>{
  const email = ($('liEmail')?.value||'').trim();
  const msg = $('liMsg'); if(msg) msg.textContent='';
  if(!/.+@.+\..+/.test(email)){ msg.textContent='Escribe el correo que usaste.'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  msg.textContent = error ? ('No se pudo enviar: '+error.message) : 'Enlace enviado ✅';
});

$('btnHeaderLogout')?.addEventListener('click', async()=>{
  await sb.auth.signOut();
  window.location.href='/';
});

// Panel functions
function showSection(sec){
  ['resumen','metas','comidas','progreso'].forEach(id=>$(id)?.classList.toggle('hide', id!==sec));
}

async function saveGoal(){
  const msg = $('goalMsg'); if(msg) msg.textContent='';
  const kcal=Number($('inGoalKcal')?.value||0);
  const prot=Number($('inGoalProt')?.value||0);
  const carb=Number($('inGoalCarb')?.value||0);
  const fat=Number($('inGoalFat')?.value||0);
  if(kcal<=0 || prot<0 || carb<0 || fat<0){ msg.textContent='Revisa los valores.'; return; }
  const { data:{ user } } = await sb.auth.getUser();
  if(!user){ msg.textContent='Inicia sesión.'; return; }
  const { error } = await sb.from('goals').upsert({
    user_id:user.id,
    kcal_target:kcal,
    protein_g_target:prot,
    carbs_g_target:carb,
    fat_g_target:fat
  });
  msg.textContent = error ? ('Error: '+error.message) : 'Metas guardadas ✅';
  await loadSummary();
}
$('btnSaveGoal')?.addEventListener('click', saveGoal);

async function loadSummary(){
  const { data:{ user } } = await sb.auth.getUser();
  if(!user){ setText('summaryMsg','Inicia sesión.'); return; }
  const { data:goal } = await sb.from('goals').select('*').eq('user_id', user.id).maybeSingle();
  const { data:totals } = await sb.from('v_daily_totals').select('*').eq('user_id', user.id).eq('day', todayStr()).maybeSingle();
  setText('goalKcal', goal?.kcal_target || 0);
  setText('goalProt', goal?.protein_g_target || 0);
  setText('goalCarb', goal?.carbs_g_target || 0);
  setText('goalFat', goal?.fat_g_target || 0);
  setText('sumKcal', Math.round(totals?.kcal || 0));
  setText('sumProt', Math.round(totals?.protein_g || 0));
  setText('sumCarb', Math.round(totals?.carbs_g || 0));
  setText('sumFat', Math.round(totals?.fat_g || 0));
  setText('summaryMsg','Actualizado');
}

async function addMeal(){
  const name = ($('mealName')?.value||'').trim();
  const qty = Number($('mealQty')?.value||0);
  const perKcal = Number($('perKcal')?.value||0);
  const perProt = Number($('perProt')?.value||0);
  const perCarb = Number($('perCarb')?.value||0);
  const perFat = Number($('perFat')?.value||0);
  const msg = $('mealMsg'); if(msg) msg.textContent='';
  if(!name || qty<=0){ msg.textContent='Datos inválidos.'; return; }
  const { data:{ user } } = await sb.auth.getUser();
  if(!user){ msg.textContent='Inicia sesión.'; return; }
  const meal = {
    user_id:user.id,
    eaten_at: todayStr(),
    food_name:name,
    qty,
    kcal: qty*perKcal,
    protein_g: qty*perProt,
    carbs_g: qty*perCarb,
    fat_g: qty*perFat
  };
  const { error } = await sb.from('meals').insert(meal);
  msg.textContent = error ? ('Error: '+error.message) : 'Agregado ✅';
  if(!error){
    ['mealName','mealQty','perKcal','perProt','perCarb','perFat'].forEach(id=>{ const el=$(id); if(el) el.value=''; });
    loadMealsToday();
    loadSummary();
  }
}
$('btnAddMeal')?.addEventListener('click', addMeal);

async function loadMealsToday(){
  const list = $('mealList'); if(!list) return;
  list.innerHTML='';
  const { data:{ user } } = await sb.auth.getUser();
  if(!user){ list.innerHTML='<p class="muted">Inicia sesión.</p>'; return; }
  const { data, error } = await sb.from('meals')
    .select('id, food_name, qty, kcal, protein_g, carbs_g, fat_g')
    .eq('user_id', user.id).eq('eaten_at', todayStr()).order('id', { ascending:false });
  if(error){ list.innerHTML=`<p class="muted">Error: ${error.message}</p>`; return; }
  if(!data?.length){ list.innerHTML='<p class="muted">Aún no registras comidas hoy.</p>'; return; }
  data.forEach(m=>{
    const div=document.createElement('div');
    div.className='feat-card';
    div.textContent=`${m.food_name} — ${m.qty} porciones · ${m.kcal} kcal · P ${m.protein_g}g · C ${m.carbs_g}g · G ${m.fat_g}g`;
    list.appendChild(div);
  });
}

// Session routing
async function checkSession(){
  const { data:{ user } } = await sb.auth.getUser();
  const isApp = window.location.pathname.endsWith('app.html');
  if(isApp){
    if(!user){ window.location.replace('/'); return; }
    show('topbar'); show('main');
    setText('userBadge', user.email);
    await loadSummary();
    await loadMealsToday();
  }else{
    if(user) window.location.replace('/app.html');
  }
}

// Init
(async()=>{
  setText('year', new Date().getFullYear());
  const hash = window.location.hash;
  if(hash.includes('access_token') && hash.includes('refresh_token')){
    const p = new URLSearchParams(hash.substring(1));
    await sb.auth.setSession({ access_token:p.get('access_token'), refresh_token:p.get('refresh_token') });
    history.replaceState({}, document.title, window.location.pathname);
  }
  await checkSession();
})();
