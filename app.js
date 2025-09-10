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
const todayStr = () => new Date().toISOString().slice(0,10);

// Supabase
const { createClient } = supabase;
const SUPABASE_URL = "https://nzzzeycpfdtvzphbupbf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56enpleWNwZmR0dnpwaGJ1cGJmIiwi\ncm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDA3MTIsImV4cCI6MjA3MzAxNjcxMn0.HoAjTwnWdtjueVALlX4-du7uF919QEMj8SS2CHP0N44";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
$('#btnLogout')?.addEventListener('click', async()=>{ await sb.auth.signOut(); location.href='/'; });
$('#btnSaveGoals')?.addEventListener('click', saveGoals);
$('#btnAddMeal')?.addEventListener('click', addMeal);
$('#mealsTbody')?.addEventListener('click',e=>{
  const btn = e.target.closest('.btnDelMeal');
  if(btn) deleteMeal(btn.dataset.id);
});
$('#btnMoreMeals')?.addEventListener('click', ()=>{ mealPage++; loadMealsToday(false); });

// Landing: manejo de modales de acceso
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('btnOpenLogin');
  const signupBtn = document.getElementById('btnOpenSignup');
  const loginModal = document.getElementById('loginModal');
  const signupModal = document.getElementById('signupModal');
  const btnCloseLogin = document.getElementById('btnCloseLogin');
  const btnCloseSignup = document.getElementById('btnCloseSignup');

  if (loginBtn && loginModal) {
    loginBtn.addEventListener('click', () => loginModal.classList.remove('hide'));
    btnCloseLogin?.addEventListener('click', () => loginModal.classList.add('hide'));
  }

  if (signupBtn && signupModal) {
    signupBtn.addEventListener('click', () => signupModal.classList.remove('hide'));
    btnCloseSignup?.addEventListener('click', () => signupModal.classList.add('hide'));
  }
});

// Carga inicial y guard de auth
document.addEventListener('DOMContentLoaded', async()=>{
  const { data:{ session } } = await sb.auth.getSession();
  if(!session){ location.href='/'; return; }
  user = session.user;
  await loadGoals();
  await loadMealsToday();
  await loadCompliance7d();
  show('hub');
});

// Funciones de datos
async function loadGoals(){
  const { data } = await sb.from('goals').select('*').eq('user_id', user.id).maybeSingle();
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
  const { error } = await sb.from('goals').upsert({
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
  const { data, error, count } = await sb.from('meals')
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

  const { data:totals } = await sb.from('v_daily_totals').select('*').eq('user_id', user.id).eq('day', todayStr()).maybeSingle();
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
  const { error } = await sb.from('meals').insert({
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
  await sb.from('meals').delete().eq('id', id);
  await loadMealsToday();
  await loadCompliance7d();
}

async function loadCompliance7d(){
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate()-6);
  const start = fromDate.toISOString().slice(0,10);
  const { data } = await sb.from('v_daily_totals').select('day,kcal').eq('user_id', user.id).gte('day', start).lte('day', todayStr()).order('day');
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
