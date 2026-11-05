-- Mevcut veritabanı için güncelleme (2026-11-05).
-- 1) +1 ay: eklenen ayı ve hak sayısını döndürür (dinamik mesaj için).
-- 2) Aylık hak değişince henüz başlamamış aylar da güncellenir.
-- Dönüş tipleri değiştiği için fonksiyonlar önce silinip yeniden oluşturulur.
-- SQL Editor'de TEK SEFERDE çalıştırın.

drop function if exists public.admin_add_month(uuid);
drop function if exists public.admin_update_settings(int, int, time, time, time, time, int, int, int, int);

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

revoke execute on function public.admin_add_month(uuid) from public, anon;
revoke execute on function public.admin_update_settings(int, int, time, time, time, time, int, int, int, int) from public, anon;
grant execute on function public.admin_add_month(uuid) to authenticated;
grant execute on function public.admin_update_settings(int, int, time, time, time, time, int, int, int, int) to authenticated;
