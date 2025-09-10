// Utilidades básicas
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);
const todayStr = () => new Date().toISOString().slice(0,10);

const { createClient } = supabase;
const SUPABASE_URL = "https://nzzzeycpfdtvzphbupbf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56enpleWNwZmR0dnpwaGJ1cGJmIiwi cm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDA3MTIsImV4cCI6MjA3MzAxNjcxMn0.HoAjTwnWdtjueVALlX4-du7uF919QEMj8SS2CHP0N44";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const formatKcal = n => `${Math.round(n)} kcal`;
const formatGrams = n => `${Math.round(n)} g`;
function relTime(ts){
  const diff = Math.floor((Date.now()-ts)/1000);
  if(diff < 60) return `hace ${diff}s`;
  if(diff < 3600) return `hace ${Math.floor(diff/60)}m`;
  if(diff < 86400) return `hace ${Math.floor(diff/3600)}h`;
  return `hace ${Math.floor(diff/86400)}d`;
}

function renderEmptyState(container,title,ctaText,onClick){
  container.innerHTML = '';
  const div=document.createElement('div');
  div.className='center';
  const p=document.createElement('p');p.textContent=title;p.className='muted';div.appendChild(p);
  const btn=document.createElement('button');btn.type='button';btn.textContent=ctaText;btn.className='btn btn-primary';btn.addEventListener('click',onClick);div.appendChild(btn);
  container.appendChild(div);
}

async function loadToday(){
  const cards = $('#summaryCards');
  cards.querySelectorAll('.stat-card').forEach(c=>c.classList.add('skeleton'));
  const { data:{ user } } = await sb.auth.getUser();
  if(!user){ location.href='/'; return; }
  const [{ data:goal }, { data:totals }] = await Promise.all([
    sb.from('goals').select('*').eq('user_id', user.id).maybeSingle(),
    sb.from('v_daily_totals').select('*').eq('user_id', user.id).eq('day', todayStr()).maybeSingle()
  ]);
  $('#goalKcal').textContent = goal?.kcal_target || 0;
  $('#goalProt').textContent = goal?.protein_g_target || 0;
  $('#goalCarb').textContent = goal?.carbs_g_target || 0;
  $('#goalFat').textContent = goal?.fat_g_target || 0;
  $('#sumKcal').textContent = Math.round(totals?.kcal || 0);
  $('#sumProt').textContent = Math.round(totals?.protein_g || 0);
  $('#sumCarb').textContent = Math.round(totals?.carbs_g || 0);
  $('#sumFat').textContent = Math.round(totals?.fat_g || 0);
  cards.querySelectorAll('.stat-card').forEach(c=>c.classList.remove('skeleton'));
  $('#summaryTime').textContent = 'Actualizado ' + relTime(Date.now());
  if(!goal){
    renderEmptyState(cards,'Configura tus metas','Configura tus metas',()=>location.hash='#goals');
  }
}

async function loadGoals(){
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return;
  const { data } = await sb.from('goals').select('*').eq('user_id', user.id).maybeSingle();
  if(data){
    $('#metaKcal').value = data.kcal_target || '';
    $('#metaProt').value = data.protein_g_target || '';
    $('#metaCarb').value = data.carbs_g_target || '';
    $('#metaGrasa').value = data.fat_g_target || '';
  }
}

async function saveGoals(){
  const msg = $('#goalMsg'); msg.textContent='';
  const kcal = Number($('#metaKcal').value);
  const prot = Number($('#metaProt').value);
  const carb = Number($('#metaCarb').value);
  const fat = Number($('#metaGrasa').value);
  if(kcal<=0){ msg.textContent='Ingresa valores válidos.'; return; }
  const { data:{ user } } = await sb.auth.getUser();
  if(!user){ location.href='/'; return; }
  const { error } = await sb.from('goals').upsert({
    user_id:user.id,
    kcal_target:kcal,
    protein_g_target:prot,
    carbs_g_target:carb,
    fat_g_target:fat
  });
  msg.textContent = error ? ('Error: '+error.message) : 'Metas guardadas';
  await loadToday();
}

let mealPage = 0;
async function loadMealsToday(reset=true){
  const body = $('#mealTable');
  if(reset){ body.innerHTML=''; mealPage=0; }
  const { data:{ user } } = await sb.auth.getUser();
  if(!user) return;
  const { data, error, count } = await sb.from('meals')
    .select('id,eaten_at,food_name,kcal,protein_g,carbs_g,fat_g',{ count:'exact' })
    .eq('user_id', user.id).eq('eaten_at', todayStr())
    .order('id',{ascending:false})
    .range(mealPage*10, mealPage*10+9);
  if(error){ body.innerHTML=`<tr><td colspan="7" class="muted">Error: ${error.message}</td></tr>`; return; }
  if(reset && (!data || data.length===0)){
    body.innerHTML=`<tr><td colspan="7" class="muted">Aún no registras comidas hoy.</td></tr>`;
    $('#btnMoreMeals').classList.add('hide');
    return;
  }
  data.forEach(m=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>--:--</td><td>${m.food_name}</td><td>${Math.round(m.kcal)}</td><td>${Math.round(m.protein_g)}</td><td>${Math.round(m.carbs_g)}</td><td>${Math.round(m.fat_g)}</td><td><button class="chip" data-id="${m.id}">✕</button></td>`;
    body.appendChild(tr);
  });
  const more=$('#btnMoreMeals');
  if((mealPage+1)*10 < (count||0)) more.classList.remove('hide'); else more.classList.add('hide');
}

async function addMeal(){
  const msg = $('#mealMsg'); msg.textContent='';
  const name = $('#mealName').value.trim();
  const qty = Number($('#mealQty').value||0);
  const prot = Number($('#mealProt').value||0);
  const carb = Number($('#mealCarb').value||0);
  const fat = Number($('#mealFat').value||0);
  const kcalInput = Number($('#mealKcal').value||0);
  if(!name || qty<=0){ msg.textContent='Datos inválidos'; return; }
  const { data:{ user } } = await sb.auth.getUser();
  if(!user){ location.href='/'; return; }
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
  msg.textContent = error ? ('Error: '+error.message) : 'Agregado';
  if(!error){
    ['mealName','mealQty','mealProt','mealCarb','mealFat','mealKcal'].forEach(id=>{$(id).value='';});
    $('#mealQty').value='100';
    loadMealsToday();
    loadToday();
  }
}

async function deleteMeal(id){
  if(!id) return;
  if(!confirm('¿Eliminar comida?')) return;
  await sb.from('meals').delete().eq('id', id);
  loadMealsToday();
  loadToday();
}

$('#mealTable').addEventListener('click',e=>{
  const btn=e.target.closest('button[data-id]');
  if(btn) deleteMeal(btn.dataset.id);
});
$('#btnMoreMeals').addEventListener('click',()=>{mealPage++;loadMealsToday(false);});
$('#btnSaveGoals').addEventListener('click',saveGoals);
$('#btnAddMeal').addEventListener('click',addMeal);
$('#btnLogout').addEventListener('click',async()=>{await sb.auth.signOut();location.href='/';});

document.addEventListener('DOMContentLoaded',async()=>{
  const { data:{ session } } = await sb.auth.getSession();
  if(!session){ location.href='/'; return; }
  $('#userEmail').textContent = session.user.email;
  await loadToday();
  await loadGoals();
  await loadMealsToday();
});
