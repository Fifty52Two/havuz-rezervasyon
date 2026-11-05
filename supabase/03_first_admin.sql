-- İlk admin: siteye normal şekilde kayıt olup e-postanızı doğruladıktan SONRA,
-- aşağıdaki e-postayı kendi adresinizle değiştirip çalıştırın.
-- Sonraki adminleri admin panelinden atayabilirsiniz.

update public.profiles set is_admin = true where email = 'SIZIN-EPOSTANIZ@ornek.com';

-- Kontrol:
-- select name, email, is_admin from public.profiles where is_admin;
