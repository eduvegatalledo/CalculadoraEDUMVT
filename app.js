// Lógica principal de Prouti: helpers, auth, routing, metas, comidas y resumen.
// TODO: implementar gráficos semanales en la sección "Progreso".

const { createClient } = supabase;
const SUPABASE_URL = "https://nzzzeycpfdtvzphbupbf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56enpleWNwZmR0dnpwaGJ1cGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDA3MTIsImV4cCI6MjA3MzAxNjcxMn0.HoAjTwnWdtjueVALlX4-du7uF919QEMj8SS2CHP0N44";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----- Helpers -----
const $ = id => document.getElementById(id);
const show = id => $(id)?.classList.remove('hide');
const hide = id => $(id)?.classList.add('hide');
const todayStr = () => new Date().toISOString().slice(0,10);
const setText = (id, txt) => { const el = $(id); if(el) el.textContent = String(txt); };

// Modales con manejo de foco
let lastFocus = null;
function openModal(id){
  lastFocus = document.activeElement;
  show(id);
  $(id).querySelector('input,button,select,textarea')?.focus();
  document.body.style.overflow = 'hidden';
}
function closeModal(id){
  hide(id);
  document.body.style.overflow = '';
  lastFocus?.focus();
}

// Mostrar secciones del panel
function showSection(sec){
  ['metas','comidas','progreso'].forEach(id=>$(id).classList.toggle('hide', id!==sec));
}

// ----- Auth -----
$('btnOpenSignup')?.addEventListener('click',()=>openModal('signupModal'));
$('btnCloseSignup')?.addEventListener('click',()=>closeModal('signupModal'));
$('btnOpenLogin')?.addEventListener('click',()=>openModal('loginModal'));
$('btnCloseLogin')?.addEventListener('click',()=>closeModal('loginModal'));

$('btnDoSignup')?.addEventListener('click', async()=>{
  const email = ($('suEmail').value||'').trim();
  const password = ($('suPass').value||'').trim();
  const msg = $('suMsg'); msg.textContent='';
  if(!/.+@.+\..+/.test(email)){ msg.textContent='Ingresa un correo válido.'; return; }
  if(password.length<6){ msg.textContent='La contraseña debe tener al menos 6 caracteres.'; return; }
  const { data, error } = await sb.auth.signUp({ email, password });
  if(error){ msg.textContent = 'Error: '+error.message; return; }
  if(data.user && !data.session){ msg.textContent='Cuenta creada. Revisa tu correo para confirmar.'; }
  else{ window.location.href='/app.html'; }
});

$('btnDoLogin')?.addEventListener('click', async()=>{
  const email = ($('liEmail').value||'').trim();
  const password = ($('liPass').value||'').trim();
  const msg = $('liMsg'); msg.textContent='';
  if(!/.+@.+\..+/.test(email)){ msg.textContent='Ingresa un correo válido.'; return; }
  if(!password){ msg.textContent='Ingresa tu contraseña.'; return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if(error){ msg.textContent = 'No pudimos iniciar sesión: '+error.message; return; }
  window.location.href='/app.html';
});

$('btnForgot')?.addEventListener('click', async()=>{
  const email = ($('liEmail').value||'').trim();
  const msg = $('liMsg'); msg.textContent='';
  if(!/.+@.+\..+/.test(email)){ msg.textContent='Escribe el correo que usaste.'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  msg.textContent = error ? ('No se pudo enviar: '+error.message) : 'Enlace enviado ✅';
});

$('btnHeaderLogout')?.addEventListener('click', async()=>{
  await sb.auth.signOut();
  window.location.href='/';
});

// ----- Metas -----
async function saveGoal(){
  const msg = $('goalMsg'); msg.textContent='';
  const kcal=Number($('inGoalKcal').value||0);
  const prot=Number($('inGoalProt').value||0);
  const carb=Number($('inGoalCarb').value||0);
  const fat=Number($('inGoalFat').value||0);
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

// ----- Comidas -----
async function addMeal(){
  const msg = $('mealMsg'); msg.textContent='';
  const name = ($('mealName').value||'').trim();
  const qty = Number($('mealQty').value||0);
  const per = {
    kcal:Number($('perKcal').value||0),
    protein_g:Number($('perProt').value||0),
    carbs_g:Number($('perCarb').value||0),
    fat_g:Number($('perFat').value||0)
  };
  if(!name || qty<=0 || per.kcal<0){ msg.textContent='Completa nombre, cantidad y kcal.'; return; }
  const { data:{ user } } = await sb.auth.getUser();
  if(!user){ msg.textContent='Inicia sesión.'; return; }
  const payload={
    user_id:user.id,
    eaten_at:todayStr(),
    food_name:name,
    qty,
    kcal:per.kcal*qty,
    protein_g:per.protein_g*qty,
    carbs_g:per.carbs_g*qty,
    fat_g:per.fat_g*qty
  };
  const { error } = await sb.from('meals').insert(payload);
  if(error){ msg.textContent='Error: '+error.message; return; }
  msg.textContent='Agregado ✅';
  $('mealName').value=''; $('mealQty').value='1';
  ['perKcal','perProt','perCarb','perFat'].forEach(id=>$(id).value='');
  await loadSummary();
  await loadMealsToday();
}
$('btnAddMeal')?.addEventListener('click', addMeal);

async function loadMealsToday(){
  const list = $('mealList'); if(!list) return; list.innerHTML='';
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return;
  const { data, error } = await sb
    .from('meals')
    .select('id, food_name, qty, kcal, protein_g, carbs_g, fat_g')
    .eq('user_id', user.id)
    .eq('eaten_at', todayStr())
    .order('id',{ascending:false});
  if(error){ list.innerHTML=`<p class="muted">Error: ${error.message}</p>`; return; }
  if(!data.length){ list.innerHTML='<p class="muted">Aún no registras comidas hoy.</p>'; return; }
  data.forEach(m=>{
    const div=document.createElement('div');
    div.className='feat-card';
    div.innerHTML=`<b>${m.food_name}</b> — ${m.qty} porciones · ${m.kcal} kcal · P ${m.protein_g}g · C ${m.carbs_g}g · G ${m.fat_g}g`;
    list.appendChild(div);
  });
}

// ----- Resumen -----
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

// ----- Sesiones y routing -----
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

// ----- Inicio -----
(async()=>{
  setText('year', new Date().getFullYear());
  const hash=window.location.hash;
  if(hash.includes('access_token') && hash.includes('refresh_token')){
    const p=new URLSearchParams(hash.substring(1));
    await sb.auth.setSession({ access_token:p.get('access_token'), refresh_token:p.get('refresh_token') });
    history.replaceState({}, document.title, window.location.pathname);
  }
  await checkSession();
})();
