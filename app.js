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
(async () => {
  console.log("🔍 Probando conexión con Supabase...");

  const { data, error } = await sb.from("profiles").select("*").limit(1);

  if (error) {
    console.error("❌ Error en conexión:", error.message);
  } else {
    console.log("✅ Conexión exitosa. Primeros registros:", data);
  }
})();
