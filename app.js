// Carga el SDK v2 desde index.html:
// <script src="https://unpkg.com/@supabase/supabase-js@2"></script>

const { createClient } = supabase;

// ⚠️ Reemplaza con tus valores de Supabase:
const SUPABASE_URL = "https://nzzzeycpfdtvzphbupbf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56enpleWNwZmR0dnpwaGJ1cGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDA3MTIsImV4cCI6MjA3MzAxNjcxMn0.HoAjTwnWdtjueVALlX4-du7uF919QEMj8SS2CHP0N44";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id)=>document.getElementById(id);
const show = (id)=>$(id).classList.remove('hide');
const hide = (id)=>$(id).classList.add('hide');

function showSection(sec){ ["resumen","comidas","progreso"].forEach(id=>$(id).classList.toggle("hide", id!==sec)); }

// ====== Modales helpers
function openModal(id){ show(id); document.body.style.overflow='hidden'; }
function closeModal(id){ hide(id); document.body.style.overflow=''; }

// ---------- Utils de fecha ----------
function todayStr() { return new Date().toISOString().slice(0,10); }

// ---------- Metas (goals) ----------
async function loadGoal() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb.from('goals').select('*').eq('user_id', user.id).maybeSingle();
  if (error) { console.error(error); return null; }
  return data || null;
}

async function saveGoal() {
  const msg = $('goalMsg'); msg.textContent = '';
  const kcal  = Number($('inGoalKcal').value||0);
  const prot  = Number($('inGoalProt').value||0);
  const carb  = Number($('inGoalCarb').value||0);
  const fat   = Number($('inGoalFat').value||0);
  if (kcal<=0 || prot<0 || carb<0 || fat<0) { msg.textContent='Revisa los valores.'; return; }

  const { data: { user } } = await sb.auth.getUser();
  if (!user) { msg.textContent='Inicia sesión.'; return; }

  const { error } = await sb.from('goals').upsert({
    user_id: user.id, kcal_target: kcal,
    protein_g_target: prot, carbs_g_target: carb, fat_g_target: fat
  });
  msg.textContent = error ? ('Error: '+error.message) : 'Metas guardadas ✅';
  await loadToday(); // refresca resumen
}
$('btnSaveGoal').onclick = saveGoal;

// ---------- Comidas (meals) ----------
async function addMeal() {
  const msg = $('mealMsg'); msg.textContent = '';
  const name = ($('mealName').value||'').trim();
  const qty = Number($('mealQty').value||0);
  const per = {
    kcal: Number($('perKcal').value||0),
    protein_g: Number($('perProt').value||0),
    carbs_g: Number($('perCarb').value||0),
    fat_g: Number($('perFat').value||0),
  };
  if (!name || qty<=0 || per.kcal<0) { msg.textContent='Completa nombre, cantidad y kcal.'; return; }

  const { data: { user } } = await sb.auth.getUser();
  if (!user) { msg.textContent='Inicia sesión.'; return; }

  const payload = {
    user_id: user.id,
    eaten_at: todayStr(),
    food_name: name,
    qty,
    kcal: per.kcal * qty,
    protein_g: per.protein_g * qty,
    carbs_g: per.carbs_g * qty,
    fat_g: per.fat_g * qty,
  };

  const { error } = await sb.from('meals').insert(payload);
  if (error) { msg.textContent = 'Error: '+error.message; return; }

  msg.textContent = 'Agregado ✅';
  $('mealName').value=''; $('mealQty').value='1';
  ['perKcal','perProt','perCarb','perFat'].forEach(id=>$(id).value='');
  await loadToday();
  await loadMealsToday();
}
$('btnAddMeal').onclick = addMeal;

// ---------- Listado & resumen del día ----------
async function loadMealsToday() {
  const list = $('mealList'); list.innerHTML = '';
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const { data, error } = await sb
    .from('meals')
    .select('id, food_name, qty, kcal, protein_g, carbs_g, fat_g')
    .eq('user_id', user.id)
    .eq('eaten_at', todayStr())
    .order('id', { ascending: false });

  if (error) { list.innerHTML = `<p class="muted">Error: ${error.message}</p>`; return; }
  if (!data?.length) { list.innerHTML = `<p class="muted">Aún no registras comidas hoy.</p>`; return; }

  data.forEach(m=>{
    const div = document.createElement('div');
    div.className = 'feat-card';
    div.innerHTML = `<b>${m.food_name}</b> — ${m.qty} porciones · ${m.kcal} kcal 
      · P ${m.protein_g}g · C ${m.carbs_g}g · G ${m.fat_g}g`;
    list.appendChild(div);
  });
}

async function loadToday() {
  const setText=(id,val)=>$(id).textContent = String(val ?? 0);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { $('summaryMsg').textContent='Inicia sesión para ver tu resumen.'; return; }

  // Metas
  const goal = await loadGoal();
  setText('goalKcal', goal?.kcal_target || 0);
  setText('goalProt', goal?.protein_g_target || 0);
  setText('goalCarb', goal?.carbs_g_target || 0);
  setText('goalFat',  goal?.fat_g_target   || 0);

  // Totales de hoy
  // Opción A (si creaste la vista v_daily_totals):
  let totals = null;
  const { data, error } = await sb
    .from('v_daily_totals')
    .select('kcal, protein_g, carbs_g, fat_g, day')
    .eq('user_id', user.id)
    .eq('day', todayStr())
    .maybeSingle();
  if (!error && data) totals = data;

  // Opción B (si NO creaste la vista): descomenta este bloque y comenta el bloque de la Opción A
  // const { data: sumData, error: e2 } = await sb.rpc('sql', {/* no aplica en cliente */});
  // En cliente, alternativa sin RPC:
  // const { data: meals, error: e3 } = await sb.from('meals')
  //   .select('kcal, protein_g, carbs_g, fat_g')
  //   .eq('user_id', user.id).eq('eaten_at', todayStr());
  // if (!e3 && meals) {
  //   totals = meals.reduce((acc,m)=>({
  //     kcal: (acc.kcal||0)+Number(m.kcal||0),
  //     protein_g: (acc.protein_g||0)+Number(m.protein_g||0),
  //     carbs_g: (acc.carbs_g||0)+Number(m.carbs_g||0),
  //     fat_g: (acc.fat_g||0)+Number(m.fat_g||0),
  //   }), {});
  // }

  setText('sumKcal', Math.round(totals?.kcal || 0));
  setText('sumProt', Math.round(totals?.protein_g || 0));
  setText('sumCarb', Math.round(totals?.carbs_g || 0));
  setText('sumFat',  Math.round(totals?.fat_g || 0));
  $('summaryMsg').textContent = 'Actualizado';
}


// ====== Perfil API
async function getUser(){ const { data:{ user } } = await sb.auth.getUser(); return user||null; }
async function getProfile(userId){ const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle(); if(error){ console.error(error); return null; } return data||null; }
async function ensureProfile(){ const user = await getUser(); if(!user) return null; let prof = await getProfile(user.id); if(!prof){ const { error } = await sb.from('profiles').insert({ id:user.id, display_name:user.email }); if(error) console.error(error); prof = await getProfile(user.id); openModal('profileModal'); } return prof; }

function setLoggedUI({ user, profile }){
  show("topbar"); // header visible
  hide("hero-guest");
  show("dashboard");
  $("userBadge").textContent = user.email;
}
function setGuestUI(){ hide("topbar"); show("hero-guest"); hide("dashboard"); }

async function afterLoginShowApp(){ const user = await getUser(); if(!user){ setGuestUI(); return; } const profile = await ensureProfile(); setLoggedUI({ user, profile }); }

// ====== Botones acceso
$("btnOpenSignup").onclick = ()=> openModal('signupModal');
$("btnOpenLogin").onclick = ()=> openModal('loginModal');

// ====== Signup
$("btnCloseSignup").onclick = ()=> closeModal('signupModal');
$("btnDoSignup").onclick = async ()=>{
  const email = ( $("suEmail").value || '' ).trim();
  const password = ( $("suPass").value || '' ).trim();
  const msg = $("suMsg"); msg.textContent='';
  if(!/.+@.+\..+/.test(email)){ msg.textContent='Ingresa un correo válido.'; return; }
  if(password.length < 6){ msg.textContent='La contraseña debe tener al menos 6 caracteres.'; return; }
  const { data, error } = await sb.auth.signUp({ email, password });
  if(error){ msg.textContent = 'Error: '+error.message; return; }
  if(data?.user && !data.session){ msg.textContent='Cuenta creada. Revisa tu correo para confirmar.'; }
  else{ msg.textContent='Cuenta creada y sesión iniciada ✅'; closeModal('signupModal'); await afterLoginShowApp(); }
};

// ====== Login
$("btnCloseLogin").onclick = ()=> closeModal('loginModal');
$("btnDoLogin").onclick = async ()=>{
  const email = ( $("liEmail").value || '' ).trim();
  const password = ( $("liPass").value || '' ).trim();
  const msg = $("liMsg"); msg.textContent='';
  if(!/.+@.+\..+/.test(email)){ msg.textContent='Ingresa un correo válido.'; return; }
  if(!password){ msg.textContent='Ingresa tu contraseña.'; return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error){ msg.textContent = 'No pudimos iniciar sesión: '+error.message; return; }
  msg.textContent='Sesión iniciada ✅';
  closeModal('loginModal');
  await afterLoginShowApp();
};

// ====== Forgot password
$("btnForgot").onclick = async ()=>{
  const email = ( $("liEmail").value || '' ).trim();
  const msg = $("liMsg"); msg.textContent='';
  if(!/.+@.+\..+/.test(email)){ msg.textContent='Escribe el correo que usaste para registrarte.'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  msg.textContent = error ? ('No se pudo enviar: '+error.message) : 'Te enviamos un enlace para restablecer tu contraseña ✅';
};

async function logout(){ await sb.auth.signOut(); setGuestUI(); }
$("btnHeaderLogout").onclick = logout;

// ====== Perfil
$("btnProfile").onclick = async ()=>{ const user = await getUser(); if(!user) return; const profile = await getProfile(user.id); $("profEmail").value = user.email || ''; $("profName").value = profile?.display_name || ''; openModal('profileModal'); };
$("btnCloseProfile").onclick = ()=> closeModal('profileModal');
$("btnSaveProfile").onclick = async ()=>{ const user = await getUser(); if(!user) return; const display_name = ( $("profName").value || '' ).trim() || user.email; const { error } = await sb.from('profiles').upsert({ id:user.id, display_name }); $("profMsg").textContent = error ? ('Error: '+error.message) : 'Guardado ✅'; };

// ====== Restaurar sesión desde enlaces de email
(async ()=>{
  $("year").textContent = new Date().getFullYear();
  const hash = window.location.hash || "";
  if(hash.includes("access_token") && hash.includes("refresh_token")){
    const p = new URLSearchParams(hash.substring(1));
    await sb.auth.setSession({ access_token: p.get("access_token"), refresh_token: p.get("refresh_token") });
    history.replaceState({}, document.title, window.location.pathname);
  }
  if(hash.includes("type=recovery")){
    // Si viene desde email de recuperación, abrir modal de login para que establezca nueva pass si el flujo lo pide
    openModal('loginModal');
  }
  const { data:{ user } } = await sb.auth.getUser();
  if(user) await afterLoginShowApp(); else setGuestUI();
})();
