-- ================================================================
-- BARBEARIA WESLEY (Barbearia Fagundes) — Setup completo do banco
-- ================================================================
-- Como usar: abra o SQL Editor do seu projeto Supabase, cole este
-- arquivo inteiro e clique em RUN. O script é idempotente (pode ser
-- executado mais de uma vez sem quebrar nada).
--
-- IMPORTANTE: o usuário admin já deve existir em Authentication >
-- Users (e-mail abaixo na última seção). O bloco final confirma o
-- e-mail e registra esse usuário como administrador da barbearia.
-- ================================================================

create extension if not exists btree_gist;

-- ================================================================
-- 1) TABELAS
-- ================================================================

-- Administradores do painel
create table if not exists public.barber_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Wesley',
  created_at timestamptz not null default now()
);

-- Configurações gerais (linha única)
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  shop_name text not null default 'Barbearia Fagundes',
  tagline text not null default 'Seu corte. Seu estilo. Seu horário.',
  description text not null default '',
  logo_url text,
  whatsapp text not null default '',
  instagram text not null default '',
  address text not null default '',
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes in (15, 30, 60)),
  booking_window_days integer not null default 30 check (booking_window_days between 1 and 120),
  min_lead_minutes integer not null default 30 check (min_lead_minutes between 0 and 1440),
  updated_at timestamptz not null default now()
);

-- Serviços oferecidos
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  image_url text,
  icon text not null default 'scissors',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clientes
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists customers_whatsapp_key
  on public.customers (whatsapp) where whatsapp <> '';

-- Horário de funcionamento (0 = domingo ... 6 = sábado)
create table if not exists public.business_hours (
  weekday integer primary key check (weekday between 0 and 6),
  is_open boolean not null default false,
  open_time time not null default '08:00',
  close_time time not null default '18:00',
  break_start time,
  break_end time,
  check (close_time > open_time),
  check ((break_start is null) = (break_end is null)),
  check (break_start is null or (break_end > break_start and break_start >= open_time and break_end <= close_time))
);

-- Horários fixos de clientes recorrentes
create table if not exists public.fixed_schedules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists fixed_schedules_weekday_idx
  on public.fixed_schedules (weekday) where active;

-- Agendamentos
-- A exclusion constraint garante NO BANCO que dois clientes nunca
-- ocupam o mesmo intervalo de tempo.
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','in_progress','completed','cancelled','no_show')),
  price numeric(10,2) not null check (price >= 0),
  notes text not null default '',
  origin text not null default 'public' check (origin in ('public','admin','fixed')),
  fixed_schedule_id uuid references public.fixed_schedules(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  constraint appointments_no_overlap
    exclude using gist (tstzrange(starts_at, ends_at) with &&)
    where (status in ('scheduled','confirmed','in_progress','completed'))
);
create index if not exists appointments_starts_at_idx on public.appointments (starts_at);
create index if not exists appointments_customer_idx on public.appointments (customer_id);
create index if not exists appointments_fixed_idx
  on public.appointments (fixed_schedule_id) where fixed_schedule_id is not null;

-- Bloqueios manuais de agenda
create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists blocked_times_range_idx on public.blocked_times (starts_at, ends_at);

-- Lançamentos financeiros (gerados automaticamente ao concluir atendimentos)
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid unique references public.appointments(id) on delete set null,
  type text not null default 'income' check (type in ('income','expense')),
  amount numeric(10,2) not null,
  description text not null default '',
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists financial_transactions_date_idx
  on public.financial_transactions (occurred_on);

-- ================================================================
-- 2) TRIGGERS
-- ================================================================

create or replace function public.bf_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services
  for each row execute function public.bf_set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function public.bf_set_updated_at();

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.bf_set_updated_at();

-- Financeiro automático: só atendimento CONCLUÍDO vira faturamento
create or replace function public.bf_handle_appointment_finance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' then
    insert into public.financial_transactions (appointment_id, type, amount, description, occurred_on)
    values (new.id, 'income', new.price, 'Atendimento concluído',
            (new.starts_at at time zone 'America/Sao_Paulo')::date)
    on conflict (appointment_id) do update
      set amount = excluded.amount, occurred_on = excluded.occurred_on;
  elsif tg_op = 'UPDATE' and old.status = 'completed' and new.status <> 'completed' then
    delete from public.financial_transactions where appointment_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists appointments_finance on public.appointments;
create trigger appointments_finance after insert or update on public.appointments
  for each row execute function public.bf_handle_appointment_finance();

-- ================================================================
-- 3) SEGURANÇA (RLS)
-- ================================================================

alter table public.barber_admins enable row level security;
alter table public.settings enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.business_hours enable row level security;
alter table public.fixed_schedules enable row level security;
alter table public.appointments enable row level security;
alter table public.blocked_times enable row level security;
alter table public.financial_transactions enable row level security;

create or replace function public.bf_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.barber_admins where user_id = auth.uid());
$$;

grant execute on function public.bf_is_admin() to anon, authenticated;

drop policy if exists "bf_admins_self_select" on public.barber_admins;
create policy "bf_admins_self_select" on public.barber_admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "bf_settings_public_read" on public.settings;
create policy "bf_settings_public_read" on public.settings
  for select to anon, authenticated using (true);
drop policy if exists "bf_settings_admin_write" on public.settings;
create policy "bf_settings_admin_write" on public.settings
  for all to authenticated using (public.bf_is_admin()) with check (public.bf_is_admin());

drop policy if exists "bf_services_public_read" on public.services;
create policy "bf_services_public_read" on public.services
  for select to anon, authenticated using (active or public.bf_is_admin());
drop policy if exists "bf_services_admin_insert" on public.services;
create policy "bf_services_admin_insert" on public.services
  for insert to authenticated with check (public.bf_is_admin());
drop policy if exists "bf_services_admin_update" on public.services;
create policy "bf_services_admin_update" on public.services
  for update to authenticated using (public.bf_is_admin()) with check (public.bf_is_admin());
drop policy if exists "bf_services_admin_delete" on public.services;
create policy "bf_services_admin_delete" on public.services
  for delete to authenticated using (public.bf_is_admin());

drop policy if exists "bf_hours_public_read" on public.business_hours;
create policy "bf_hours_public_read" on public.business_hours
  for select to anon, authenticated using (true);
drop policy if exists "bf_hours_admin_write" on public.business_hours;
create policy "bf_hours_admin_write" on public.business_hours
  for all to authenticated using (public.bf_is_admin()) with check (public.bf_is_admin());

drop policy if exists "bf_customers_admin" on public.customers;
create policy "bf_customers_admin" on public.customers
  for all to authenticated using (public.bf_is_admin()) with check (public.bf_is_admin());

drop policy if exists "bf_appointments_admin" on public.appointments;
create policy "bf_appointments_admin" on public.appointments
  for all to authenticated using (public.bf_is_admin()) with check (public.bf_is_admin());

drop policy if exists "bf_fixed_admin" on public.fixed_schedules;
create policy "bf_fixed_admin" on public.fixed_schedules
  for all to authenticated using (public.bf_is_admin()) with check (public.bf_is_admin());

drop policy if exists "bf_blocked_admin" on public.blocked_times;
create policy "bf_blocked_admin" on public.blocked_times
  for all to authenticated using (public.bf_is_admin()) with check (public.bf_is_admin());

drop policy if exists "bf_finance_admin" on public.financial_transactions;
create policy "bf_finance_admin" on public.financial_transactions
  for all to authenticated using (public.bf_is_admin()) with check (public.bf_is_admin());

-- ================================================================
-- 4) FUNÇÕES DE AGENDAMENTO (validação de conflitos no banco)
-- ================================================================

-- Um intervalo está livre? (agendamentos, bloqueios e horários fixos)
create or replace function public.bf_slot_is_free(p_starts timestamptz, p_ends timestamptz)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_local_date date := (p_starts at time zone v_tz)::date;
  v_dow int := extract(dow from (p_starts at time zone v_tz))::int;
begin
  -- 1) Agendamentos ativos (mesmo predicado da exclusion constraint)
  if exists (
    select 1 from public.appointments a
    where a.status in ('scheduled','confirmed','in_progress','completed')
      and tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts, p_ends)
  ) then
    return false;
  end if;

  -- 2) Bloqueios manuais
  if exists (
    select 1 from public.blocked_times b
    where tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts, p_ends)
  ) then
    return false;
  end if;

  -- 3) Horários fixos ativos do dia da semana
  --    (exceto ocorrência liberada: agendamento materializado cancelado/no_show)
  if exists (
    select 1
    from public.fixed_schedules fs
    join public.services s on s.id = fs.service_id
    where fs.active
      and fs.weekday = v_dow
      and tstzrange(
            (v_local_date::text || ' ' || fs.start_time::text)::timestamp at time zone v_tz,
            ((v_local_date::text || ' ' || fs.start_time::text)::timestamp at time zone v_tz)
              + make_interval(mins => s.duration_minutes)
          ) && tstzrange(p_starts, p_ends)
      and not exists (
        select 1 from public.appointments a2
        where a2.fixed_schedule_id = fs.id
          and a2.starts_at = (v_local_date::text || ' ' || fs.start_time::text)::timestamp at time zone v_tz
          and a2.status in ('cancelled','no_show')
      )
  ) then
    return false;
  end if;

  return true;
end;
$$;

-- Horários disponíveis de um dia para um serviço
create or replace function public.get_available_slots(p_date date, p_service_id uuid)
returns table(slot text)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_today date;
  v_settings record;
  v_service record;
  v_bh record;
  v_slot time;
  v_slot_end time;
  v_last time;
  v_starts timestamptz;
  v_ends timestamptz;
  v_min_start timestamptz;
  v_iter int := 0;
begin
  select * into v_settings from public.settings where id = 1;
  if not found then return; end if;

  select * into v_service from public.services where id = p_service_id and active;
  if not found then return; end if;

  v_today := (now() at time zone v_tz)::date;
  if p_date < v_today or p_date > v_today + v_settings.booking_window_days then
    return;
  end if;

  select * into v_bh from public.business_hours
  where weekday = extract(dow from p_date)::int and is_open;
  if not found then return; end if;

  v_min_start := now() + make_interval(mins => v_settings.min_lead_minutes);
  v_slot := v_bh.open_time;
  v_last := v_bh.close_time - make_interval(mins => v_service.duration_minutes);
  if v_last < v_bh.open_time then return; end if;

  while v_slot <= v_last loop
    v_iter := v_iter + 1;
    exit when v_iter > 200;

    v_slot_end := v_slot + make_interval(mins => v_service.duration_minutes);
    v_starts := (p_date::text || ' ' || v_slot::text)::timestamp at time zone v_tz;
    v_ends := v_starts + make_interval(mins => v_service.duration_minutes);

    if (v_bh.break_start is null or v_slot_end <= v_bh.break_start or v_slot >= v_bh.break_end)
       and v_starts >= v_min_start
       and public.bf_slot_is_free(v_starts, v_ends)
    then
      slot := to_char(v_slot, 'HH24:MI');
      return next;
    end if;

    v_slot := v_slot + make_interval(mins => v_settings.slot_interval_minutes);
  end loop;
  return;
end;
$$;

-- Agendamento público (cliente não autenticado) com validação completa
create or replace function public.create_booking(
  p_name text,
  p_whatsapp text,
  p_service_id uuid,
  p_date date,
  p_time text,
  p_notes text default ''
)
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_service record;
  v_phone text;
  v_time time;
  v_customer_id uuid;
  v_starts timestamptz;
  v_ends timestamptz;
  v_appt_id uuid;
  v_future_count int;
begin
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'NOME_OBRIGATORIO';
  end if;

  v_phone := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  if length(v_phone) < 10 or length(v_phone) > 13 then
    raise exception 'WHATSAPP_INVALIDO';
  end if;

  begin
    v_time := p_time::time;
  exception when others then
    raise exception 'HORA_INVALIDA';
  end;

  select * into v_service from public.services where id = p_service_id and active;
  if not found then
    raise exception 'SERVICO_INDISPONIVEL';
  end if;

  -- Revalida disponibilidade no servidor (nunca confiar só no front)
  if not exists (
    select 1 from public.get_available_slots(p_date, p_service_id) g
    where g.slot = to_char(v_time, 'HH24:MI')
  ) then
    raise exception 'HORARIO_INDISPONIVEL';
  end if;

  v_starts := (p_date::text || ' ' || v_time::text)::timestamp at time zone v_tz;
  v_ends := v_starts + make_interval(mins => v_service.duration_minutes);

  select id into v_customer_id from public.customers where whatsapp = v_phone;
  if v_customer_id is null then
    insert into public.customers (name, whatsapp)
    values (btrim(p_name), v_phone)
    returning id into v_customer_id;
  else
    update public.customers set name = btrim(p_name) where id = v_customer_id;
  end if;

  -- Anti-abuso: máx. 3 agendamentos futuros ativos por cliente
  select count(*) into v_future_count from public.appointments
  where customer_id = v_customer_id
    and status in ('scheduled','confirmed')
    and starts_at > now();
  if v_future_count >= 3 then
    raise exception 'LIMITE_AGENDAMENTOS';
  end if;

  insert into public.appointments (customer_id, service_id, starts_at, ends_at, status, price, notes, origin)
  values (v_customer_id, p_service_id, v_starts, v_ends, 'scheduled', v_service.price,
          left(coalesce(p_notes, ''), 500), 'public')
  returning id into v_appt_id;

  return jsonb_build_object(
    'id', v_appt_id,
    'customer_name', btrim(p_name),
    'service_name', v_service.name,
    'price', v_service.price,
    'duration_minutes', v_service.duration_minutes,
    'date', p_date,
    'time', to_char(v_time, 'HH24:MI')
  );
exception
  when exclusion_violation then
    -- corrida entre dois clientes: a exclusion constraint garante 1 vencedor
    raise exception 'HORARIO_INDISPONIVEL';
end;
$$;

grant execute on function public.get_available_slots(date, uuid) to anon, authenticated;
grant execute on function public.create_booking(text, text, uuid, date, text, text) to anon, authenticated;
revoke execute on function public.bf_slot_is_free(timestamptz, timestamptz) from public, anon;
grant execute on function public.bf_slot_is_free(timestamptz, timestamptz) to authenticated;

-- ================================================================
-- 5) DADOS INICIAIS (tudo editável pelo painel depois)
-- ================================================================

insert into public.settings (id, shop_name, tagline, description, whatsapp, instagram, address)
values (
  1,
  'Barbearia Fagundes',
  'Seu corte. Seu estilo. Seu horário.',
  'Tradição de barbearia clássica com acabamento moderno. Atendimento com hora marcada, do jeito que você merece.',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into public.business_hours (weekday, is_open, open_time, close_time, break_start, break_end) values
  (0, false, '08:00', '18:00', null, null),
  (1, true,  '08:00', '18:00', '12:00', '13:00'),
  (2, true,  '08:00', '18:00', '12:00', '13:00'),
  (3, true,  '08:00', '18:00', '12:00', '13:00'),
  (4, true,  '08:00', '18:00', '12:00', '13:00'),
  (5, true,  '08:00', '18:00', '12:00', '13:00'),
  (6, true,  '08:00', '13:00', null, null)
on conflict (weekday) do nothing;

insert into public.services (name, description, price, duration_minutes, icon, sort_order)
select * from (
  values
    ('Corte', 'Corte completo na tesoura ou máquina, com acabamento na navalha e finalização com produto.', 40.00, 30, 'scissors', 1),
    ('Corte + Barba', 'O combo completo: corte personalizado e barba desenhada com toalha quente e navalha.', 65.00, 60, 'crown', 2),
    ('Barba', 'Barba modelada com navalha, toalha quente e balm finalizador.', 35.00, 30, 'mustache', 3),
    ('Corte Infantil', 'Corte para crianças até 12 anos, com paciência e capricho.', 35.00, 30, 'baby', 4),
    ('Acabamento (Pézinho)', 'Manutenção rápida do contorno do corte para manter o visual em dia.', 20.00, 15, 'zap', 5),
    ('Sobrancelha', 'Alinhamento de sobrancelha na navalha, realçando o olhar.', 15.00, 15, 'eye', 6)
) as v(name, description, price, duration_minutes, icon, sort_order)
where not exists (select 1 from public.services);

-- ================================================================
-- 6) REGISTRAR O ADMINISTRADOR
-- ================================================================
-- O usuário abaixo já foi criado via API de signup. Este bloco
-- confirma o e-mail (dispensa clicar no link) e o registra como
-- admin da barbearia. Para trocar/adicionar admins, repita com
-- outro e-mail existente em Authentication > Users.

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'guilherme@biasiengenharia.com.br';

insert into public.barber_admins (user_id, display_name)
select id, 'Wesley' from auth.users
where email = 'guilherme@biasiengenharia.com.br'
on conflict (user_id) do nothing;

select 'Setup concluído com sucesso! ✅' as status;
