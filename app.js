// app.js — Lógica de helpers, auth, routing y CRUD básico de metas/comidas/resumen.
// Requiere supabase-js v2 desde CDN: <script src="https://unpkg.com/@supabase/supabase-js@2"></script>

/* =========================
   A) Helpers
   ========================= */
const $ = (id)=>document.getElementById(id);
const show = (id)=>{ const el=$(id); if(el) el.classList.remove('hide'); };
const hide = (id)=>{ const el=$(id); if(el) el.classList.add('hide'); };
const setText = (id,v)=>{ const el=$(id); if(el) el.textContent = String(v ?? ''); };
const todayStr = ()=> new Date().toISOString().slice(0,10);

function openModal(id){ const el=$(id); if(!el) return; show(id); document.body.style.overflow='hidden'; }
function closeModal(id){ const el=$(id); if(!el) return; hide(id); document.body.style.overflow=''; }

/* =========================
   B) Supabase (cliente)
   ========================= */
const { createClient } = supabase;

const SUPABASE_URL = "https://nzzzeycpfdtvzphbupbf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56enpleWNwZmR0dnpwaGJ1cGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDA3MTIsImV4cCI6MjA3MzAxNjcxMn0.HoAjTwnWdtjueVALlX4-du7uF919QEMj8SS2CHP0N44";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getUser(){ const { data:{ user } } = await sb.auth.getUser(); return user||null; }

/* Restaurar sesión desde enlaces (confirmación / reset) */
async function restoreFromHash(){
  const hash = window.location.hash || "";
  if(hash.includes("access_token") && hash.includes("refresh_token")){
    const p = new URLSearchParams(hash.substring(1));
    await sb.auth.setSession({ access_token: p.get("access_token"), refresh_token: p.get("refresh_token") });
    history.replaceState({}, document.title, window.location.pathname);
  }
}

/* =========================
   C) Auth UI (modales)
   ========================= */
function wireAuthButtons(){
  const btnLogin = $("btnOpenLogin"); if(btnLogin) btnLogin.onclick = ()=> openModal('loginModal');
  const btnSignup = $("btnOpenSignup"); if(btnSignup) btnSignup.onclick = ()=> openModal('signupModal');

  const btnCloseLogin = $("btnCloseLogin"); if(btnCloseLogin) btnCloseLogin.onclick = ()=> closeModal('loginModal');
  const btnCloseSignup = $("btnCloseSignup"); if(btnCloseSignup) btnCloseSignup.onclick = ()=> closeModal('signupModal');

  const doLogin = $("btnDoLogin");
  if(doLogin) doLogin.onclick = async ()=>{
    const email = ($("liEmail")?.value||'').trim();
    const password = ($("liPass")?.value||'').trim();
    const msg = $("liMsg"); if(msg) msg.textContent='';
    if(!/.+@.+\..+/.test(email)){ if(msg) msg.textContent='Ingresa un correo válido.'; return; }
    if(!password){ if(msg) msg.textContent='Ingresa tu contraseña.'; return; }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if(error){ if(msg) msg.textContent='No pudimos iniciar sesión: '+error.message; return; }
    if(msg) msg.textContent='Sesión iniciada ✅';
    closeModal('loginModal');
    await routePostAuth(); // redirige a /app.html
  };

  const doSignup = $("btnDoSignup");
  if(doSignup) doSignup.onclick = async ()=>{
    const email = ($("suEmail")?.value||'').trim();
    const password = ($("suPass")?.value||'').trim();
    const msg = $("suMsg"); if(msg) msg.textContent='';
    if(!/.+@.+\..+/.test(email)){ if(msg) msg.textContent='Ingresa un correo válido.'; return; }
    if(password.length < 6){ if(msg) msg.textContent='Mínimo 6 caracteres.'; return; }
    const { data, error } = await sb.auth.signUp({ email, password });
    if(error){ if(msg) msg.textContent='Error: '+error.message; return; }
    if(data?.user && !data.session){
      if(msg) msg.textContent='Cuenta creada. Revisa tu correo para confirmar.';
    }else{
      if(msg) msg.textContent='Cuenta creada y sesión iniciada ✅';
      closeModal('signupModal');
      await routePostAuth();
    }
  };

  const forgot = $("btnForgot");
  if(forgot) forgot.onclick = async ()=>{
    const email = ($("liEmail")?.value||'').trim();
    const msg = $("liMsg"); if(!/.+@.+\..+/.test(email)){ if(msg) msg.textContent='Escribe tu correo.'; return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: "https://calculadora-edumvt.vercel.app" });
    if(msg) msg.textContent = error ? ('No se pudo enviar: '+error.message) : 'Te enviamos un enlace para restablecer tu contraseña ✅';
  };
}

/* =========================
   D) Navegación / Estado UI
   ========================= */
function setGuestUI(){
  // En index.html se muestra hero-guest; en app.html redirigimos a landing.
  show("hero-guest");
  hide("topbar"); hide("main");
}
function setLoggedUI({ user, profile }){
  hide("hero-guest");
  show("topbar"); show("main");
  setText("userBadge", user.email||'');
}

async function ensureProfile(){
  const user = await getUser(); if(!user) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if(!data){
    const { error: e2 } = await sb.from('profiles').insert({ id:user.id, display_name:user.email });
    if(e2) console.error(e2);
    return { id:user.id, display_name:user.email };
  }
  if(error) console.error(error);
  return data;
}

/* Redirecciones */
async function routeOnLoad(){
  await restoreFromHash();
  const { data:{ user } } = await sb.auth.getUser();

  const path = location.pathname.toLowerCase();
  const onIndex = path.endsWith('/') || path.endsWith('/index.html');
  const onApp = path.endsWith('/app.html');

  setText("year", new Date().getFullYear());

  if(user && onIndex){
    location.href = "/app.html";
    return;
  }
  if(!user && onApp){
    location.href = "/";
    return;
  }
  if(user && onApp){
    await afterLoginShowApp();
    return;
  }
  if(onIndex){
    setGuestUI();
  }
}

async function routePostAuth(){
  location.href = "/app.html";
}

async function logout(){
  await sb.auth.signOut();
  location.href = "/";
}
const headerLogout = $("btnHeaderLogout");
if(headerLogout) headerLogout.onclick = logout;

function showSection(sec){ ["resumen","comidas","progreso"].forEach(id=>{ const el=$(id); if(el) el.classList.toggle("hide", id!==sec); }); }

/* =========================
   E) Metas (goals)
   ========================= */
async function loadGoal(){
  const user = await getUser(); if(!user) return null;
  const { data, error } = await sb.from('goals').select('*').eq('user_id', user.id).maybeSingle();
  if(error){ console.error(error); return null; }
  return data||null;
}
async function saveGoal(){
  const msg = $("goalMsg"); if(msg) msg.textContent='';
  const kcal = Number($("inGoalKcal")?.value||0);
  const prot = Number($("inGoalProt")?.value||0);
  const carb = Number($("inGoalCarb")?.value||0);
  const fat  = Number($("inGoalFat")?.value||0);
  if(kcal<=0 || prot<0 || carb<0 || fat<0){ if(msg) msg.textContent='Revisa los valores.'; return; }
  const user = await getUser(); if(!user){ if(msg) msg.textContent='Inicia sesión.'; return; }
  const { error } = await sb.from('goals').upsert({
    user_id: user.id, kcal_target:kcal, protein_g_target:prot, carbs_g_target:carb, fat_g_target:fat
  });
  if(msg) msg.textContent = error ? ('Error: '+error.message) : 'Metas guardadas ✅';
  await loadToday();
}
const btnSaveGoal = $("btnSaveGoal");
if(btnSaveGoal) btnSaveGoal.onclick = saveGoal;

/* =========================
   F) Comidas (meals)
   ========================= */
async function addMeal(){
  const msg = $("mealMsg"); if(msg) msg.textContent='';
  const name = ($("mealName")?.value||'').trim();
  const qty  = Number($("mealQty")?.value||0);
  const per = {
    kcal: Number($("perKcal")?.value||0),
    protein_g: Number($("perProt")?.value||0),
    carbs_g: Number($("perCarb")?.value||0),
    fat_g: Number($("perFat")?.value||0),
  };
  if(!name || qty<=0 || per.kcal<0){ if(msg) msg.textContent='Completa nombre, cantidad y kcal.'; return; }
  const user = await getUser(); if(!user){ if(msg) msg.textContent='Inicia sesión.'; return; }

  const payload = {
    user_id:user.id, eaten_at:todayStr(), food_name:name, qty,
    kcal: per.kcal*qty, protein_g: per.protein_g*qty, carbs_g: per.carbs_g*qty, fat_g: per.fat_g*qty
  };
  const { error } = await sb.from('meals').insert(payload);
  if(error){ if(msg) msg.textContent='Error: '+error.message; return; }

  if(msg) msg.textContent='Agregado ✅';
  if($("mealName")) $("mealName").value='';
  if($("mealQty")) $("mealQty").value='1';
  ["perKcal","perProt","perCarb","perFat"].forEach(id=>{ if($(id)) $(id).value=''; });
  await loadMealsToday();
  await loadToday();
}
const btnAddMeal = $("btnAddMeal");
if(btnAddMeal) btnAddMeal.onclick = addMeal;

async function loadMealsToday(){
  const list = $("mealList"); if(!list) return; list.innerHTML='';
  const user = await getUser(); if(!user) return;
  const { data, error } = await sb.from('meals')
    .select('id, food_name, qty, kcal, protein_g, carbs_g, fat_g')
    .eq('user_id', user.id).eq('eaten_at', todayStr()).order('id', { ascending:false });
  if(error){ list.innerHTML = `<p class="muted">Error: ${error.message}</p>`; return; }
  if(!data?.length){ list.innerHTML = `<p class="muted">Aún no registras comidas hoy.</p>`; return; }
  data.forEach(m=>{
    const div = document.createElement('div');
    div.className = 'feat-card';
    div.innerHTML = `<b>${m.food_name}</b> — ${m.qty} porciones · ${m.kcal} kcal · P ${m.protein_g}g · C ${m.carbs_g}g · G ${m.fat_g}g`;
    list.appendChild(div);
  });
}

/* =========================
   G) Resumen (v_daily_totals)
   ========================= */
async function loadToday(){
  const set = (id,v)=> setText(id, Math.round(Number(v||0)));
  const msg = $("summaryMsg"); if(msg) msg.textContent='Actualizando…';

  const user = await getUser(); if(!user){ if(msg) msg.textContent='Inicia sesión para ver tu resumen.'; return; }

  // Metas
  const goal = await loadGoal();
  setText('goalKcal', goal?.kcal_target||0);
  setText('goalProt', goal?.protein_g_target||0);
  setText('goalCarb', goal?.carbs_g_target||0);
  setText('goalFat',  goal?.fat_g_target||0);

  // Totales de hoy (intenta vista; si no existe, suma en cliente)
  let totals = null;
  const { data, error } = await sb.from('v_daily_totals')
    .select('kcal, protein_g, carbs_g, fat_g, day')
    .eq('user_id', user.id).eq('day', todayStr()).maybeSingle();

  if(!error && data){ totals = data; }
  else {
    const { data: meals } = await sb.from('meals').select('kcal,protein_g,carbs_g,fat_g').eq('user_id', user.id).eq('eaten_at', todayStr());
    if(meals?.length){
      totals = meals.reduce((acc,m)=>({
        kcal:(acc.kcal||0)+Number(m.kcal||0),
        protein_g:(acc.protein_g||0)+Number(m.protein_g||0),
        carbs_g:(acc.carbs_g||0)+Number(m.carbs_g||0),
        fat_g:(acc.fat_g||0)+Number(m.fat_g||0),
      }), {});
    }
  }

  set('sumKcal', totals?.kcal||0);
  set('sumProt', totals?.protein_g||0);
  set('sumCarb', totals?.carbs_g||0);
  set('sumFat',  totals?.fat_g||0);

  if(msg) msg.textContent='Actualizado';
}

/* =========================
   H) Inicialización
   ========================= */
function wireCommon(){
  const profBtn = $("btnProfile");
  if(profBtn) profBtn.onclick = async ()=>{
    const user = await getUser(); if(!user) return;
    // Aquí podrías abrir un modal de perfil si lo agregas.
    alert(`Tu correo: ${user.email}`);
  };
}
wireCommon();
wireAuthButtons();

(async ()=>{
  await routeOnLoad();
})();
 
// TODO: Agregar gráficos semanales en sección "Progreso".
