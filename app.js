// Utilidades y helpers
const $ = id => document.getElementById(id);
const el = (sel, root=document) => root.querySelector(sel);
const fmt = {
  kcal: n => `${(n||0).toFixed(0)} kcal`,
  g: n => `${(n||0).toFixed(0)} g`,
  pct: n => `${Math.round(n||0)}%`
};
function setLive(id, msg){
  const m = $(id);
  if(m){
    m.textContent = msg;
    m.setAttribute('role','status');
    m.setAttribute('aria-live','polite');
  }
}
function openModal(id){
  const m = $(id);
  if(m){
    m.classList.remove('hide');
    document.body.classList.add('modal-open');
  }
}
function closeModal(id){
  const m = $(id);
  if(m){
    m.classList.add('hide');
    document.body.classList.remove('modal-open');
  }
}
const todayStr = () => new Date().toISOString().slice(0,10);

// Supabase client se inicializa en supabase-client.js

// SPA helpers
const sections = ['hub','goals','meals','progress'];
function show(id){ sections.forEach(s => $(s).classList.toggle('hide', s!==id)); }

let user=null;
let goals=null;
let mealPage=0;

// Eventos de navegación
$('#navToHub')?.addEventListener('click', () => show('hub'));
$('#navToGoals')?.addEventListener('click', () => show('goals'));
$('#ctaGoGoals')?.addEventListener('click', () => show('goals'));
$('#navToMeals')?.addEventListener('click', () => show('meals'));
$('#ctaGoMeals')?.addEventListener('click', () => show('meals'));
$('#navToProgress')?.addEventListener('click', () => show('progress'));
$('#ctaGoProgress')?.addEventListener('click', () => show('progress'));
$('#btnLogout')?.addEventListener('click', async()=>{ await window.sb.auth.signOut(); location.href='/'; });
$('#btnSaveGoals')?.addEventListener('click', saveGoals);
$('#btnAddMeal')?.addEventListener('click', addMeal);
$('#mealsTbody')?.addEventListener('click',e=>{
  const btn = e.target.closest('.btnDelMeal');
  if(btn) deleteMeal(btn.dataset.id);
});
$('#btnMoreMeals')?.addEventListener('click', ()=>{ mealPage++; loadMealsToday(false); });

// Landing: manejo de modales y auth
document.addEventListener('DOMContentLoaded', ()=>{
  $('btnOpenLogin')?.addEventListener('click', ()=>openModal?.('loginModal'));
  $('btnOpenSignup')?.addEventListener('click',()=>openModal?.('signupModal'));
  $('btnCloseLogin')?.addEventListener('click', ()=>closeModal('loginModal'));
  $('btnCloseSignup')?.addEventListener('click', ()=>closeModal('signupModal'));

  $('btnDoLogin')?.addEventListener('click', onDoLogin);
  async function onDoLogin(e){
    e.preventDefault();
    const email = $('liEmail')?.value?.trim();
    const password = $('liPass')?.value||'';
    if(!email || !password){ setLive('msgLogin','Ingresa correo y contraseña.'); return; }
    const btn=$('btnDoLogin'); btn.disabled=true; setLive('msgLogin','Ingresando…');
    try{
      const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
      if(error){ console.error('[Login]',error); setLive('msgLogin', error.message); btn.disabled=false; return; }
      setLive('msgLogin','Sesión iniciada. Redirigiendo…');
      location.href='/app.html';
    }catch(err){
      console.error('[Login unexpected]', err); setLive('msgLogin','Error inesperado.'); btn.disabled=false;
    }
  }

  $('btnDoSignup')?.addEventListener('click', async (e)=>{
    e.preventDefault();
    const email=$('siEmail')?.value?.trim(), password=$('siPass')?.value||'';
    if(!email||!password){ setLive('msgSignup','Completa correo y contraseña.'); return; }
    const btn=$('btnDoSignup'); btn.disabled=true; setLive('msgSignup','Creando cuenta…');
    try{
      const { data, error } = await window.sb.auth.signUp({ email, password });
      if(error){ console.error('[Signup]',error); setLive('msgSignup', error.message||'No pudimos crear tu cuenta.'); btn.disabled=false; return; }
      setLive('msgSignup','Cuenta creada. Revisa tu correo para confirmar.');
      btn.disabled=false;
    }catch(err){ console.error('[Signup unexpected]',err); setLive('msgSignup','Error inesperado.'); btn.disabled=false; }
  });

  $('btnForgot')?.addEventListener('click', async (e)=>{
    e.preventDefault();
    const email=$('liEmail')?.value?.trim(); if(!email){ setLive('msgLogin','Ingresa tu correo.'); return; }
    const btn=$('btnForgot'); btn.disabled=true; setLive('msgLogin','Enviando enlace…');
    try{
      const { error } = await window.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin+'/reset.html' });
      if(error){ console.error('[Reset]',error); setLive('msgLogin', error.message||'No se pudo enviar el enlace.'); btn.disabled=false; return; }
      setLive('msgLogin','Te enviamos un enlace para restablecer tu contraseña.');
      btn.disabled=false;
    }catch(err){ console.error('[Reset unexpected]',err); setLive('msgLogin','Error inesperado.'); btn.disabled=false; }
  });

  window.sb.auth.getSession().then(({ data:{ session } })=>{
    if(session && !$('#hub')) location.href='/app.html';
  });
});

// Carga inicial y guard de auth para app
document.addEventListener('DOMContentLoaded', async () => {
  if (!$('#hub')) return; // solo en app.html
    try{
      const { data: { session } } = await window.sb.auth.getSession();
      if(!session){
        window.location.replace('/');
        return;
      }
      user = session.user;
      await loadGoals();
      await loadMealsToday();
      await loadCompliance7d();
      show('hub');
    }catch(err){
      console.error('[Guard]', err);
      window.location.replace('/');
    }
  });

// Funciones de datos
async function loadGoals(){
  const { data } = await window.sb.from('goals').select('*').eq('user_id', user.id).maybeSingle();
  goals = data;
  if(data){
    $('#metaKcal').value = data.kcal_target || '';
    $('#metaProt').value = data.protein_g_target || '';
    $('#metaCarb').value = data.carbs_g_target || '';
    $('#metaFat').value = data.fat_g_target || '';
    $('#statGoals').textContent = `${fmt.kcal(data.kcal_target)} / ${fmt.g(data.protein_g_target)}`;
  }else{
    $('#statGoals').textContent = 'Sin metas';
  }
  $('#statGoals').classList.remove('skeleton');
}

async function saveGoals(){
  const kcal = Number($('#metaKcal').value);
  const prot = Number($('#metaProt').value);
  const carb = Number($('#metaCarb').value);
  const fat = Number($('#metaFat').value);
  if([kcal,prot,carb,fat].some(v=>isNaN(v)||v<=0)){
    setLive('msgGoals','Ingresa valores válidos');
    return;
  }
    const { error } = await window.sb.from('goals').upsert({
    user_id:user.id,
    kcal_target:kcal,
    protein_g_target:prot,
    carbs_g_target:carb,
    fat_g_target:fat
  });
  setLive('msgGoals', error?('Error: '+error.message):'Metas guardadas');
  await loadGoals();
  await loadMealsToday();
  await loadCompliance7d();
}

async function loadMealsToday(reset=true){
  const body = $('#mealsTbody');
  if(reset){ body.innerHTML=''; mealPage=0; }
  const { data, error, count } = await window.sb.from('meals')
    .select('id,food_name,kcal,protein_g,carbs_g,fat_g',{ count:'exact' })
    .eq('user_id', user.id).eq('eaten_at', todayStr())
    .order('id',{ascending:false})
    .range(mealPage*10, mealPage*10+9);
  if(error){ body.innerHTML=`<tr><td colspan="6" class="muted">Error</td></tr>`; return; }
  if(reset && (!data || data.length===0)){
    body.innerHTML=`<tr><td colspan="6" class="muted">Aún no hay comidas</td></tr>`;
  }else{
    data.forEach(m=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${m.food_name}</td><td>${Math.round(m.kcal)}</td><td>${Math.round(m.protein_g)}</td><td>${Math.round(m.carbs_g)}</td><td>${Math.round(m.fat_g)}</td><td><button type="button" class="chip btnDelMeal" data-id="${m.id}">✕</button></td>`;
      body.appendChild(tr);
    });
  }
  if((mealPage+1)*10 < (count||0)) $('#btnMoreMeals').classList.remove('hide'); else $('#btnMoreMeals').classList.add('hide');

  const { data:totals } = await window.sb.from('v_daily_totals').select('*').eq('user_id', user.id).eq('day', todayStr()).maybeSingle();
  renderTodaySummary(totals);
  $('#statMeals').textContent = `${count||0} regs / ${fmt.kcal(totals?.kcal)}`;
  $('#statMeals').classList.remove('skeleton');
}

function renderTodaySummary(totals){
  const summary = $('#todaySummary');
  summary.innerHTML='';
  const t = totals || {};
  const g = goals || {};
  const list = [
    {label:'Calorías', total:t.kcal, goal:g.kcal_target, fmt:fmt.kcal},
    {label:'Proteína', total:t.protein_g, goal:g.protein_g_target, fmt:fmt.g},
    {label:'Carbos', total:t.carbs_g, goal:g.carbs_g_target, fmt:fmt.g},
    {label:'Grasas', total:t.fat_g, goal:g.fat_g_target, fmt:fmt.g}
  ];
  list.forEach(item=>{
    const pct = item.goal ? Math.min(100,(item.total||0)/item.goal*100) : 0;
    const row=document.createElement('div');
    row.className='progress-row';
    row.innerHTML=`<span>${item.label}</span><div class="bar"><div class="fill" style="width:${pct}%"></div></div><span>${item.fmt(item.total)} / ${item.fmt(item.goal)}</span>`;
    summary.appendChild(row);
  });
  summary.classList.remove('skeleton');
}

async function addMeal(){
  const name=$('#mealName').value.trim();
  const qty=Number($('#mealQty').value);
  const prot=Number($('#mealProt').value);
  const carb=Number($('#mealCarb').value);
  const fat=Number($('#mealFat').value);
  const kcalInput=Number($('#mealKcal').value);
  if(!name || qty<=0){ setLive('msgMeals','Datos inválidos'); return; }
  const kcal = kcalInput>0 ? kcalInput : prot*4 + carb*4 + fat*9;
    const { error } = await window.sb.from('meals').insert({
    user_id:user.id,
    eaten_at:todayStr(),
    food_name:name,
    qty,
    protein_g:prot,
    carbs_g:carb,
    fat_g:fat,
    kcal
  });
  setLive('msgMeals', error?('Error: '+error.message):'Agregado');
  if(!error){
    ['mealName','mealQty','mealProt','mealCarb','mealFat','mealKcal'].forEach(id=>{$(id).value='';});
    $('#mealQty').value='100';
    await loadMealsToday();
    await loadCompliance7d();
  }
}

async function deleteMeal(id){
  if(!confirm('¿Eliminar comida?')) return;
    await window.sb.from('meals').delete().eq('id', id);
  await loadMealsToday();
  await loadCompliance7d();
}

async function loadCompliance7d(){
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate()-6);
  const start = fromDate.toISOString().slice(0,10);
  const { data } = await window.sb.from('v_daily_totals').select('day,kcal').eq('user_id', user.id).gte('day', start).lte('day', todayStr()).order('day');
  const gkcal = goals?.kcal_target;
  const points=[];
  if(gkcal && data){
    data.forEach(d=>{ points.push({day:d.day,pct:(d.kcal/gkcal*100)}); });
  }
  const avg = points.length ? points.reduce((a,b)=>a+b.pct,0)/points.length : 0;
  $('#kpiCompliance').textContent = fmt.pct(avg);
  $('#statProgress').textContent = points.length ? fmt.pct(avg) : 'Sin datos';
  renderChart(points);
  $('#kpiCompliance').classList.remove('skeleton');
  $('#statProgress').classList.remove('skeleton');
  setLive('msgProgress', points.length ? '' : 'Registra tus comidas para ver tu progreso.');
}

function renderChart(points){
  const area = $('#chartArea');
  area.innerHTML='';
  if(!points.length) return;
  points.forEach(p=>{
    const bar=document.createElement('div');
    bar.className='chart-bar';
    bar.style.height = `${Math.min(100,p.pct)}%`;
    area.appendChild(bar);
  });
}
