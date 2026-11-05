-- =====================================================================
-- GTÜ Havuz Rezervasyon — veritabanı şeması
--
-- Yeni ve boş bir Supabase projesinde, SQL Editor'de TEK SEFERDE çalıştırın.
--
-- Güvenlik modeli (OWASP A01 Broken Access Control):
--   * Tüm tablolarda RLS açık. anon ve authenticated rollerinin tablolara
--     doğrudan yazma yetkisi YOK; okuma yalnızca kendi profil satırı için var.
--   * Uygulama tüm okuma/yazma işlemlerini aşağıdaki fonksiyonlar (RPC)
--     üzerinden yapar. Her fonksiyon kimliği auth.uid()'den alır, istemciden
--     gelen kimlik/isim bilgisine asla güvenmez.
--   * Admin fonksiyonları assert_admin() ile yetki kontrolü yapar ve her işlemi
--     admin_audit_log tablosuna yazar (OWASP A09).
--   * Kapasite, hak ve limit kontrolleri satır kilitleriyle (FOR UPDATE) yapılır;
--     aynı anda basan iki kişi kapasiteyi aşamaz (OWASP A04).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tablolar
-- ---------------------------------------------------------------------

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null check (char_length(name) between 2 and 60),
  email           text not null,
  is_admin        boolean not null default false,
  name_changed_at timestamptz,
  created_at      timestamptz not null default now()
);

-- Tek satırlık ayar tablosu. Saatler Türkiye saatidir; seanslar 1 saattir.
-- Bitiş saati hariçtir: 17:00–21:00 → 17, 18, 19, 20 seansları.
create table public.settings (
  id                  int primary key default 1 check (id = 1),
  lane_count          int  not null default 2  check (lane_count between 1 and 10),
  lane_capacity       int  not null default 10 check (lane_capacity between 1 and 50),
  weekday_start       time not null default '17:00',
  weekday_end         time not null default '21:00',
  weekend_start       time not null default '09:00',
  weekend_end         time not null default '14:00',
  monthly_credits     int  not null default 8  check (monthly_credits between 0 and 100),
  booking_window_days int  not null default 7  check (booking_window_days between 1 and 28),
  daily_limit         int  not null default 1  check (daily_limit between 0 and 10),
  min_cancel_hours    int  not null default 2  check (min_cancel_hours between 0 and 72),
  check (weekday_start < weekday_end and weekend_start < weekend_end)
);
insert into public.settings default values;

create table public.sessions (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null unique,
  local_date date not null,   -- Türkiye tarihi
  local_time time not null,   -- Türkiye saati (başlangıç)
  created_at timestamptz not null default now()
);
create index sessions_local_date_idx on public.sessions (local_date);

-- Kapatmalar: lane NULL ise seansın tamamı kapalıdır.
create table public.closures (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  lane       int check (lane between 1 and 10),
  reason     text not null check (char_length(reason) between 2 and 200),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index closures_session_lane_uniq on public.closures (session_id, (coalesce(lane, 0)));

create type public.booking_status as enum ('active', 'cancelled_by_user', 'cancelled_by_admin');

-- Rezervasyonlar silinmez; iptal edildiğinde durumu değişir (geçmiş ve hak hesabı için).
-- Kullanılan hak = o aydaki 'active' rezervasyon sayısı. İptal, hakkı otomatik iade eder.
create table public.bookings (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete restrict,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  lane          int  not null check (lane between 1 and 10),
  status        public.booking_status not null default 'active',
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 200),
  created_at    timestamptz not null default now(),
  cancelled_at  timestamptz
);
create unique index bookings_one_active_per_session on public.bookings (session_id, user_id) where status = 'active';
create index bookings_user_status_idx on public.bookings (user_id, status);
create index bookings_session_lane_idx on public.bookings (session_id, lane) where status = 'active';

-- Üyelik ayları: her satır bir takvim ayı ve o ayın hak sayısı.
-- Haklar sadece o aydaki seanslar için geçerlidir, sonraki aya devretmez.
create table public.memberships (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  month      date not null check (extract(day from month) = 1),
  credits    int  not null check (credits between 0 and 100),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, month)
);

create table public.feedback (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles(id) on delete set null,
  message    text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index feedback_user_time_idx on public.feedback (user_id, created_at);

create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  admin_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_user uuid,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. RLS ve tablo yetkileri (varsayılan: hepsi kapalı)
-- ---------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.settings        enable row level security;
alter table public.sessions        enable row level security;
alter table public.closures        enable row level security;
alter table public.bookings        enable row level security;
alter table public.memberships     enable row level security;
alter table public.feedback        enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Kullanıcı yalnızca kendi profil satırını okuyabilir (menü, admin kontrolü).
grant select on public.profiles to authenticated;
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 3. Yardımcı fonksiyonlar (dışarıya kapalı)
-- ---------------------------------------------------------------------

create or replace function public.tr_today()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Europe/Istanbul')::date
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function public.assert_admin()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

create or replace function public.admin_log(p_action text, p_target uuid, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_audit_log (admin_id, action, target_user, details)
  values (auth.uid(), p_action, p_target, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------
-- 4. Auth tetikleyicileri
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text := left(trim(coalesce(new.raw_user_meta_data->>'name', '')), 60);
begin
  if char_length(v_name) < 2 then
    v_name := 'Üye';
  end if;
  insert into public.profiles (id, name, email)
  values (new.id, v_name, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- 5. Seans üretimi (pg_cron her gece çalıştırır, ayar değişince de çağrılır)
-- ---------------------------------------------------------------------

create or replace function public.generate_sessions()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_set   public.settings;
  v_today date := public.tr_today();
begin
  select * into v_set from public.settings where id = 1;

  -- Bugünden itibaren (rezervasyon penceresi + 1 hafta) gün için eksik seansları ekle.
  insert into public.sessions (starts_at, local_date, local_time)
  select ts at time zone 'Europe/Istanbul', ts::date, ts::time
  from generate_series(0, v_set.booking_window_days + 7) as g(n)
  cross join lateral (select v_today + g.n as d) dd
  cross join lateral generate_series(
    dd.d + case when extract(isodow from dd.d) in (6, 7) then v_set.weekend_start else v_set.weekday_start end,
    dd.d + case when extract(isodow from dd.d) in (6, 7) then v_set.weekend_end   else v_set.weekday_end   end
         - interval '1 hour',
    interval '1 hour'
  ) as ts
  on conflict (starts_at) do nothing;

  -- Saatler değiştiyse: yeni programa uymayan, hiç rezervasyonu olmayan gelecek seansları sil.
  delete from public.sessions se
  where se.starts_at > now()
    and not exists (select 1 from public.bookings b where b.session_id = se.id)
    and not (
      se.local_time >= case when extract(isodow from se.local_date) in (6, 7) then v_set.weekend_start else v_set.weekday_start end
      and se.local_time <= case when extract(isodow from se.local_date) in (6, 7) then v_set.weekend_end else v_set.weekday_end end
                           - interval '1 hour'
    );

  -- 30 günden eski, hiç rezervasyonu olmamış seansları temizle.
  delete from public.sessions se
  where se.starts_at < now() - interval '30 days'
    and not exists (select 1 from public.bookings b where b.session_id = se.id);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Üye fonksiyonları
-- ---------------------------------------------------------------------

-- Haftanın seansları, kulvar kulvar doluluk bilgisiyle. Diğer üyelerin isimleri dönmez.
create or replace function public.get_week(p_week_start date)
returns table (
  session_id     uuid,
  local_date     date,
  local_time     time,
  starts_at      timestamptz,
  lane           int,
  capacity       int,
  booked         int,
  is_closed      boolean,
  closure_reason text,
  my_booking_id  uuid,
  my_lane        int,
  opens_on       date
)
language sql stable security definer set search_path = public as $$
  select se.id, se.local_date, se.local_time, se.starts_at, l.n, st.lane_capacity,
         (select count(*)::int from public.bookings b
           where b.session_id = se.id and b.lane = l.n and b.status = 'active'),
         exists (select 1 from public.closures c
                  where c.session_id = se.id and (c.lane is null or c.lane = l.n)),
         (select c.reason from public.closures c
           where c.session_id = se.id and (c.lane is null or c.lane = l.n)
           order by c.lane nulls first limit 1),
         mb.id, mb.lane,
         se.local_date - st.booking_window_days
  from public.settings st
  join public.sessions se on se.local_date between p_week_start and p_week_start + 6
  cross join lateral generate_series(1, st.lane_count) as l(n)
  left join public.bookings mb
         on mb.session_id = se.id and mb.user_id = auth.uid() and mb.status = 'active'
  where st.id = 1 and auth.uid() is not null
  order by se.starts_at, l.n
$$;

-- Bu aydan itibaren üyelik ayları ve kullanılan haklar.
create or replace function public.get_my_status()
returns table (month date, credits int, used int)
language sql stable security definer set search_path = public as $$
  select m.month, m.credits,
         (select count(*)::int
            from public.bookings b join public.sessions se on se.id = b.session_id
           where b.user_id = m.user_id and b.status = 'active'
             and date_trunc('month', se.local_date)::date = m.month)
  from public.memberships m
  where m.user_id = auth.uid()
    and m.month >= date_trunc('month', public.tr_today())::date
  order by m.month
$$;

create or replace function public.get_my_bookings()
returns table (
  booking_id    uuid,
  starts_at     timestamptz,
  local_date    date,
  local_time    time,
  lane          int,
  status        text,
  cancel_reason text
)
language sql stable security definer set search_path = public as $$
  select b.id, se.starts_at, se.local_date, se.local_time, b.lane, b.status::text, b.cancel_reason
  from public.bookings b
  join public.sessions se on se.id = b.session_id
  where b.user_id = auth.uid()
  order by se.starts_at desc
  limit 100
$$;

create or replace function public.get_settings()
returns public.settings
language sql stable security definer set search_path = public as $$
  select * from public.settings where id = 1 and auth.uid() is not null
$$;

create or replace function public.book_session(p_session_id uuid, p_lane int)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_set     public.settings;
  v_session public.sessions;
  v_month   date;
  v_credits int;
  v_used    int;
  v_count   int;
  v_id      uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  -- Kilit sırası: kullanıcı → ayarlar → seans. Aynı kullanıcının eşzamanlı istekleri
  -- (hak/günlük limit) ve aynı seansa eşzamanlı istekler (kapasite) sırayla işlenir.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then raise exception 'profile_not_found'; end if;

  select * into v_set from public.settings where id = 1 for share;

  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  if v_session.starts_at <= now() then raise exception 'session_started'; end if;
  if v_session.local_date > public.tr_today() + v_set.booking_window_days then
    raise exception 'not_open_yet';
  end if;
  if p_lane is null or p_lane < 1 or p_lane > v_set.lane_count then
    raise exception 'invalid_lane';
  end if;

  if exists (select 1 from public.closures c
              where c.session_id = p_session_id and (c.lane is null or c.lane = p_lane)) then
    raise exception 'session_closed';
  end if;

  if exists (select 1 from public.bookings b
              where b.session_id = p_session_id and b.user_id = v_uid and b.status = 'active') then
    raise exception 'already_booked';
  end if;

  if v_set.daily_limit > 0 then
    select count(*) into v_count
      from public.bookings b join public.sessions se on se.id = b.session_id
     where b.user_id = v_uid and b.status = 'active' and se.local_date = v_session.local_date;
    if v_count >= v_set.daily_limit then raise exception 'daily_limit_reached'; end if;
  end if;

  v_month := date_trunc('month', v_session.local_date)::date;
  select m.credits into v_credits
    from public.memberships m where m.user_id = v_uid and m.month = v_month;
  if not found then raise exception 'membership_required'; end if;

  select count(*) into v_used
    from public.bookings b join public.sessions se on se.id = b.session_id
   where b.user_id = v_uid and b.status = 'active'
     and date_trunc('month', se.local_date)::date = v_month;
  if v_used >= v_credits then raise exception 'no_credits_left'; end if;

  select count(*) into v_count
    from public.bookings b
   where b.session_id = p_session_id and b.lane = p_lane and b.status = 'active';
  if v_count >= v_set.lane_capacity then raise exception 'lane_full'; end if;

  insert into public.bookings (session_id, user_id, lane)
  values (p_session_id, v_uid, p_lane)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_starts timestamptz;
  v_hours  int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select se.starts_at into v_starts
    from public.bookings b join public.sessions se on se.id = b.session_id
   where b.id = p_booking_id and b.user_id = v_uid and b.status = 'active'
   for update of b;
  if not found then raise exception 'booking_not_found'; end if;

  select s.min_cancel_hours into v_hours from public.settings s where s.id = 1;
  if v_starts <= now() then raise exception 'session_started'; end if;
  if v_starts - now() < make_interval(hours => v_hours) then raise exception 'cancel_too_late'; end if;

  update public.bookings
     set status = 'cancelled_by_user', cancelled_at = now()
   where id = p_booking_id;
end;
$$;

create or replace function public.update_my_name(p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := trim(p_name);
  v_last timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'invalid_name';
  end if;
  select name_changed_at into v_last from public.profiles where id = v_uid for update;
  if v_last is not null and v_last > now() - interval '30 days' then
    raise exception 'name_change_too_soon';
  end if;
  update public.profiles set name = v_name, name_changed_at = now() where id = v_uid;
end;
$$;

-- Geri bildirim: saatte en fazla 3 mesaj (kötüye kullanım ve e-posta kotası koruması).
create or replace function public.submit_feedback(p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_msg    text := trim(p_message);
  v_recent int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_msg is null or char_length(v_msg) = 0 or char_length(v_msg) > 2000 then
    raise exception 'invalid_message';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  select count(*) into v_recent
    from public.feedback where user_id = v_uid and created_at > now() - interval '1 hour';
  if v_recent >= 3 then raise exception 'rate_limited'; end if;
  insert into public.feedback (user_id, message) values (v_uid, v_msg);
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Admin fonksiyonları (hepsi assert_admin() ile korunur ve loglanır)
-- ---------------------------------------------------------------------

create or replace function public.admin_overview()
returns table (member_count int, active_member_count int, today_bookings int, week_bookings int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_today date := public.tr_today();
  v_week  date := date_trunc('week', public.tr_today())::date;
begin
  perform public.assert_admin();
  return query select
    (select count(*)::int from public.profiles),
    (select count(distinct m.user_id)::int from public.memberships m
      where m.month = date_trunc('month', v_today)::date),
    (select count(*)::int from public.bookings b join public.sessions se on se.id = b.session_id
      where b.status = 'active' and se.local_date = v_today),
    (select count(*)::int from public.bookings b join public.sessions se on se.id = b.session_id
      where b.status = 'active' and se.local_date between v_week and v_week + 6);
end;
$$;

create or replace function public.admin_list_members(p_query text)
returns table (
  id               uuid,
  name             text,
  email            text,
  is_admin         boolean,
  created_at       timestamptz,
  membership_until date,
  current_credits  int,
  current_used     int
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_month date := date_trunc('month', public.tr_today())::date;
  v_q     text := nullif(trim(coalesce(p_query, '')), '');
  v_like  text;
begin
  perform public.assert_admin();
  if v_q is not null then
    -- LIKE joker karakterlerini kaçışla; arama metni desen olarak yorumlanmasın.
    v_like := '%' || replace(replace(replace(left(v_q, 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  select p.id, p.name, p.email, p.is_admin, p.created_at,
         (select (max(m.month) + interval '1 month' - interval '1 day')::date
            from public.memberships m where m.user_id = p.id),
         (select m.credits from public.memberships m where m.user_id = p.id and m.month = v_month),
         (select count(*)::int from public.bookings b join public.sessions se on se.id = b.session_id
           where b.user_id = p.id and b.status = 'active'
             and date_trunc('month', se.local_date)::date = v_month)
  from public.profiles p
  where v_like is null or p.name ilike v_like or p.email ilike v_like
  order by p.name
  limit 200;
end;
$$;

create or replace function public.admin_get_member(p_user_id uuid)
returns table (id uuid, name text, email text, is_admin boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform public.assert_admin();
  return query select p.id, p.name, p.email, p.is_admin from public.profiles p where p.id = p_user_id;
end;
$$;

create or replace function public.admin_member_months(p_user_id uuid)
returns table (month date, credits int, used int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform public.assert_admin();
  return query
  select m.month, m.credits,
         (select count(*)::int from public.bookings b join public.sessions se on se.id = b.session_id
           where b.user_id = m.user_id and b.status = 'active'
             and date_trunc('month', se.local_date)::date = m.month)
  from public.memberships m
  where m.user_id = p_user_id
  order by m.month desc
  limit 24;
end;
$$;

-- Üyeliği bir ay uzatır: hiç üyeliği yoksa veya son ayı geçmişte kaldıysa bu ay,
-- değilse son aydan sonraki ay eklenir. Hak sayısı ayarlardaki aylık haktır.
-- Eklenen ayı ve hak sayısını döndürür (arayüzdeki mesaj gerçek değeri gösterir).
create or replace function public.admin_add_month(p_user_id uuid)
returns table (month date, credits int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_admin   uuid := public.assert_admin();
  v_current date := date_trunc('month', public.tr_today())::date;
  v_last    date;
  v_month   date;
  v_credits int;
begin
  perform 1 from public.profiles p where p.id = p_user_id for update;
  if not found then raise exception 'member_not_found'; end if;

  select max(m.month) into v_last from public.memberships m where m.user_id = p_user_id;
  v_month := case
    when v_last is null or v_last < v_current then v_current
    else (v_last + interval '1 month')::date
  end;

  select s.monthly_credits into v_credits from public.settings s where s.id = 1;
  insert into public.memberships (user_id, month, credits, created_by)
  values (p_user_id, v_month, v_credits, v_admin);

  perform public.admin_log('add_month', p_user_id, jsonb_build_object('month', v_month, 'credits', v_credits));
  return query select v_month, v_credits;
end;
$$;

create or replace function public.admin_set_month_credits(p_user_id uuid, p_month date, p_credits int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_used int;
begin
  perform public.assert_admin();
  if p_credits is null or p_credits < 0 or p_credits > 100 then raise exception 'invalid_credits'; end if;

  perform 1 from public.memberships where user_id = p_user_id and month = p_month for update;
  if not found then raise exception 'membership_not_found'; end if;

  select count(*) into v_used
    from public.bookings b join public.sessions se on se.id = b.session_id
   where b.user_id = p_user_id and b.status = 'active'
     and date_trunc('month', se.local_date)::date = p_month;
  if p_credits < v_used then raise exception 'credits_below_used'; end if;

  update public.memberships set credits = p_credits where user_id = p_user_id and month = p_month;
  perform public.admin_log('set_credits', p_user_id, jsonb_build_object('month', p_month, 'credits', p_credits));
end;
$$;

create or replace function public.admin_remove_month(p_user_id uuid, p_month date)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if exists (select 1 from public.bookings b join public.sessions se on se.id = b.session_id
              where b.user_id = p_user_id and b.status = 'active'
                and date_trunc('month', se.local_date)::date = p_month) then
    raise exception 'month_has_bookings';
  end if;
  delete from public.memberships where user_id = p_user_id and month = p_month;
  if not found then raise exception 'membership_not_found'; end if;
  perform public.admin_log('remove_month', p_user_id, jsonb_build_object('month', p_month));
end;
$$;

create or replace function public.admin_set_admin(p_user_id uuid, p_is_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := public.assert_admin();
begin
  if p_user_id = v_admin and not p_is_admin then raise exception 'cannot_demote_self'; end if;
  update public.profiles set is_admin = p_is_admin where id = p_user_id;
  if not found then raise exception 'member_not_found'; end if;
  perform public.admin_log('set_admin', p_user_id, jsonb_build_object('is_admin', p_is_admin));
end;
$$;

-- Silme işleminin kendisi sunucuda (secret key ile auth kullanıcısını siler).
-- Bu fonksiyon yetkiyi doğrular, kendini silmeyi engeller ve işlemi loglar.
create or replace function public.admin_prepare_delete(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := public.assert_admin();
  v_email text;
begin
  if p_user_id = v_admin then raise exception 'cannot_delete_self'; end if;
  select email into v_email from public.profiles where id = p_user_id;
  if not found then raise exception 'member_not_found'; end if;
  perform public.admin_log('delete_member', p_user_id, jsonb_build_object('email', v_email));
end;
$$;

create or replace function public.admin_day(p_date date)
returns table (
  session_id     uuid,
  local_time     time,
  starts_at      timestamptz,
  lane           int,
  capacity       int,
  booked         int,
  session_closed boolean,
  lane_closed    boolean,
  closure_reason text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform public.assert_admin();
  return query
  select se.id, se.local_time, se.starts_at, l.n, st.lane_capacity,
         (select count(*)::int from public.bookings b
           where b.session_id = se.id and b.lane = l.n and b.status = 'active'),
         exists (select 1 from public.closures c where c.session_id = se.id and c.lane is null),
         exists (select 1 from public.closures c where c.session_id = se.id and c.lane = l.n),
         (select c.reason from public.closures c
           where c.session_id = se.id and (c.lane is null or c.lane = l.n)
           order by c.lane nulls first limit 1)
  from public.settings st
  join public.sessions se on se.local_date = p_date
  cross join lateral generate_series(1, st.lane_count) as l(n)
  where st.id = 1
  order by se.starts_at, l.n;
end;
$$;

create or replace function public.admin_day_bookings(p_date date)
returns table (booking_id uuid, session_id uuid, lane int, user_id uuid, name text, email text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform public.assert_admin();
  return query
  select b.id, b.session_id, b.lane, p.id, p.name, p.email
  from public.bookings b
  join public.sessions se on se.id = b.session_id
  join public.profiles p on p.id = b.user_id
  where se.local_date = p_date and b.status = 'active'
  order by se.starts_at, b.lane, p.name;
end;
$$;

-- Seansı (p_lane NULL) veya tek kulvarı kapatır; etkilenen rezervasyonları iptal edip
-- bildirim e-postası için listesini döndürür. İptal edilenlerin hakları kendiliğinden iade olur.
create or replace function public.admin_close(p_session_id uuid, p_lane int, p_reason text)
returns table (
  booking_id uuid,
  user_id    uuid,
  email      text,
  name       text,
  local_date date,
  local_time time,
  lane       int
)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_admin  uuid := public.assert_admin();
  v_reason text := trim(p_reason);
  v_lanes  int;
  v_ids    uuid[];
begin
  if v_reason is null or char_length(v_reason) < 2 or char_length(v_reason) > 200 then
    raise exception 'invalid_reason';
  end if;

  perform 1 from public.sessions where id = p_session_id for update;
  if not found then raise exception 'session_not_found'; end if;

  select lane_count into v_lanes from public.settings where id = 1;
  if p_lane is not null and (p_lane < 1 or p_lane > v_lanes) then raise exception 'invalid_lane'; end if;

  if p_lane is null then
    -- Seansın tamamı kapanıyorsa kulvar bazlı kapatmalar gereksizleşir.
    delete from public.closures where session_id = p_session_id and lane is not null;
  elsif exists (select 1 from public.closures where session_id = p_session_id and lane is null) then
    raise exception 'already_closed';
  end if;

  insert into public.closures (session_id, lane, reason, created_by)
  values (p_session_id, p_lane, v_reason, v_admin)
  on conflict (session_id, (coalesce(lane, 0)))
  do update set reason = excluded.reason, created_by = excluded.created_by, created_at = now();

  with cancelled as (
    update public.bookings b
       set status = 'cancelled_by_admin', cancel_reason = v_reason, cancelled_at = now()
     where b.session_id = p_session_id and b.status = 'active'
       and (p_lane is null or b.lane = p_lane)
    returning b.id
  )
  select array_agg(c.id) into v_ids from cancelled c;

  perform public.admin_log('close', null, jsonb_build_object(
    'session_id', p_session_id, 'lane', p_lane, 'reason', v_reason,
    'cancelled', coalesce(array_length(v_ids, 1), 0)));

  return query
  select b.id, b.user_id, p.email, p.name, se.local_date, se.local_time, b.lane
  from public.bookings b
  join public.profiles p on p.id = b.user_id
  join public.sessions se on se.id = b.session_id
  where b.id = any(coalesce(v_ids, '{}'::uuid[]));
end;
$$;

create or replace function public.admin_close_day(p_date date, p_reason text)
returns table (
  booking_id uuid,
  user_id    uuid,
  email      text,
  name       text,
  local_date date,
  local_time time,
  lane       int
)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_sid uuid;
begin
  perform public.assert_admin();
  for v_sid in
    select se.id from public.sessions se
    where se.local_date = p_date and se.starts_at > now()
    order by se.starts_at
  loop
    return query select * from public.admin_close(v_sid, null, p_reason);
  end loop;
end;
$$;

create or replace function public.admin_reopen(p_session_id uuid, p_lane int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.assert_admin();
  if p_lane is null then
    delete from public.closures where session_id = p_session_id;
  else
    delete from public.closures where session_id = p_session_id and lane = p_lane;
  end if;
  perform public.admin_log('reopen', null, jsonb_build_object('session_id', p_session_id, 'lane', p_lane));
end;
$$;

create or replace function public.admin_cancel_booking(p_booking_id uuid, p_reason text)
returns table (
  booking_id uuid,
  user_id    uuid,
  email      text,
  name       text,
  local_date date,
  local_time time,
  lane       int
)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_reason text := trim(p_reason);
begin
  perform public.assert_admin();
  if v_reason is null or char_length(v_reason) < 2 or char_length(v_reason) > 200 then
    raise exception 'invalid_reason';
  end if;

  update public.bookings
     set status = 'cancelled_by_admin', cancel_reason = v_reason, cancelled_at = now()
   where id = p_booking_id and status = 'active';
  if not found then raise exception 'booking_not_found'; end if;

  perform public.admin_log('cancel_booking', null,
    jsonb_build_object('booking_id', p_booking_id, 'reason', v_reason));

  return query
  select b.id, b.user_id, p.email, p.name, se.local_date, se.local_time, b.lane
  from public.bookings b
  join public.profiles p on p.id = b.user_id
  join public.sessions se on se.id = b.session_id
  where b.id = p_booking_id;
end;
$$;

-- Ayarları günceller. Aylık hak değişirse, HENÜZ BAŞLAMAMIŞ aylardaki ve hâlâ eski
-- varsayılan hak sayısında olan üyelikler yeni değere geçer (admin'in bir üyeye özel
-- verdiği farklı hak sayıları korunur; içinde bulunulan ay değişmez). Hak sayısı o ay
-- kullanılmış haktan aşağı inmez. Güncellenen üyelik ayı sayısını döndürür.
create or replace function public.admin_update_settings(
  p_lane_count          int,
  p_lane_capacity       int,
  p_weekday_start       time,
  p_weekday_end         time,
  p_weekend_start       time,
  p_weekend_end         time,
  p_monthly_credits     int,
  p_booking_window_days int,
  p_daily_limit         int,
  p_min_cancel_hours    int
)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_conflicts   int;
  v_old_credits int;
  v_updated     int := 0;
begin
  perform public.assert_admin();
  select s.monthly_credits into v_old_credits from public.settings s where s.id = 1 for update;

  if extract(minute from p_weekday_start) <> 0 or extract(minute from p_weekday_end) <> 0
     or extract(minute from p_weekend_start) <> 0 or extract(minute from p_weekend_end) <> 0 then
    raise exception 'times_must_be_on_the_hour';
  end if;
  if p_weekday_start >= p_weekday_end or p_weekend_start >= p_weekend_end then
    raise exception 'invalid_hours';
  end if;

  -- Kaldırılacak kulvarlarda ileri tarihli rezervasyon varsa önce onlar iptal edilmeli.
  select count(*) into v_conflicts
    from public.bookings b join public.sessions se on se.id = b.session_id
   where b.status = 'active' and se.starts_at > now() and b.lane > p_lane_count;
  if v_conflicts > 0 then raise exception 'lane_has_future_bookings'; end if;

  -- Kapasite, mevcut ileri tarihli doluluğun altına indirilemez.
  select count(*) into v_conflicts from (
    select 1
      from public.bookings b join public.sessions se on se.id = b.session_id
     where b.status = 'active' and se.starts_at > now()
     group by b.session_id, b.lane
    having count(*) > p_lane_capacity
  ) x;
  if v_conflicts > 0 then raise exception 'capacity_below_bookings'; end if;

  update public.settings set
    lane_count          = p_lane_count,
    lane_capacity       = p_lane_capacity,
    weekday_start       = p_weekday_start,
    weekday_end         = p_weekday_end,
    weekend_start       = p_weekend_start,
    weekend_end         = p_weekend_end,
    monthly_credits     = p_monthly_credits,
    booking_window_days = p_booking_window_days,
    daily_limit         = p_daily_limit,
    min_cancel_hours    = p_min_cancel_hours
  where id = 1;

  if p_monthly_credits <> v_old_credits then
    with targets as (
      select m.user_id, m.month,
             (select count(*)::int
                from public.bookings b join public.sessions se on se.id = b.session_id
               where b.user_id = m.user_id and b.status = 'active'
                 and date_trunc('month', se.local_date)::date = m.month) as used_count
        from public.memberships m
       where m.month > date_trunc('month', public.tr_today())::date
         and m.credits = v_old_credits
    )
    update public.memberships m
       set credits = greatest(p_monthly_credits, t.used_count)
      from targets t
     where m.user_id = t.user_id and m.month = t.month;
    get diagnostics v_updated = row_count;
  end if;

  perform public.admin_log('update_settings', null, jsonb_build_object(
    'lane_count', p_lane_count, 'lane_capacity', p_lane_capacity,
    'weekday', p_weekday_start::text || '-' || p_weekday_end::text,
    'weekend', p_weekend_start::text || '-' || p_weekend_end::text,
    'monthly_credits', p_monthly_credits, 'booking_window_days', p_booking_window_days,
    'daily_limit', p_daily_limit, 'min_cancel_hours', p_min_cancel_hours,
    'future_months_updated', v_updated));

  perform public.generate_sessions();
  return v_updated;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Fonksiyon yetkileri: önce hepsi kapatılır, sonra sadece gerekenler açılır.
-- ---------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.is_admin(),
  public.get_week(date),
  public.get_my_status(),
  public.get_my_bookings(),
  public.get_settings(),
  public.book_session(uuid, int),
  public.cancel_booking(uuid),
  public.update_my_name(text),
  public.submit_feedback(text),
  public.admin_overview(),
  public.admin_list_members(text),
  public.admin_get_member(uuid),
  public.admin_member_months(uuid),
  public.admin_add_month(uuid),
  public.admin_set_month_credits(uuid, date, int),
  public.admin_remove_month(uuid, date),
  public.admin_set_admin(uuid, boolean),
  public.admin_prepare_delete(uuid),
  public.admin_day(date),
  public.admin_day_bookings(date),
  public.admin_close(uuid, int, text),
  public.admin_close_day(date, text),
  public.admin_reopen(uuid, int),
  public.admin_cancel_booking(uuid, text),
  public.admin_update_settings(int, int, time, time, time, time, int, int, int, int)
to authenticated;
