-- Seansların her gece otomatik üretilmesi.
-- ÖNCE: Supabase → Database → Extensions → "pg_cron" etkinleştirilmeli.
-- pg_cron UTC kullanır: 21:05 UTC = 00:05 Türkiye saati.

select cron.schedule('generate-sessions', '5 21 * * *', $$select public.generate_sessions();$$);

-- İlk seansları hemen oluştur.
select public.generate_sessions();

-- Kontrol: önümüzdeki günlerin seans sayıları
-- select local_date, count(*) from public.sessions
-- where local_date >= public.tr_today() group by local_date order by local_date;
