-- Tabla de metas
create table if not exists public.goals(
  user_id uuid primary key references auth.users(id) on delete cascade,
  kcal_target integer,
  protein_g_target numeric,
  carbs_g_target numeric,
  fat_g_target numeric,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.goals enable row level security;
drop policy if exists goals_select_own on public.goals;
drop policy if exists goals_insert_own on public.goals;
drop policy if exists goals_update_own on public.goals;
create policy goals_select_own on public.goals for select using (auth.uid() = user_id);
create policy goals_insert_own on public.goals for insert with check (auth.uid() = user_id);
create policy goals_update_own on public.goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tabla de comidas (mantener nombre 'meals' para no tocar frontend)
create table if not exists public.meals(
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at date not null default current_date,
  meal_type text,                       -- opcional: desayuno/almuerzo/cena/snack
  food_name text not null,
  qty numeric,                          -- gramos
  kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  inserted_at timestamptz default now()
);
create index if not exists meals_user_day_idx on public.meals(user_id, eaten_at);
alter table public.meals enable row level security;
drop policy if exists meals_select_own on public.meals;
drop policy if exists meals_insert_own on public.meals;
drop policy if exists meals_update_own on public.meals;
create policy meals_select_own on public.meals for select using (auth.uid() = user_id);
create policy meals_insert_own on public.meals for insert with check (auth.uid() = user_id);
create policy meals_update_own on public.meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Vista de totales diarios (mantener nombre 'v_daily_totals')
create or replace view public.v_daily_totals
with (security_invoker = true, security_barrier = true) as
select
  user_id,
  eaten_at as day,
  sum(kcal)      as kcal,
  sum(protein_g) as protein_g,
  sum(carbs_g)   as carbs_g,
  sum(fat_g)     as fat_g
from public.meals
group by user_id, eaten_at;

grant select on public.v_daily_totals to authenticated;

-- Trigger simple para goals.updated_at
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'tr_goals_set_updated_at') then
    create or replace function public.fn_goals_set_updated_at()
    returns trigger language plpgsql as $f$
    begin
      new.updated_at := now();
      return new;
    end
    $f$;
    create trigger tr_goals_set_updated_at
      before update on public.goals
      for each row execute function public.fn_goals_set_updated_at();
  end if;
end$$;
