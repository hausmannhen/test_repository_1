-- Eldenfeld: Online-Konten. Einmal im Supabase SQL Editor ausführen.
-- Zugriff nur über die Funktionen unten; die Tabelle selbst ist für den öffentlichen Schlüssel gesperrt.

create extension if not exists pgcrypto;

create table if not exists public.konten (
  name          text primary key,
  pin_hash      text not null,
  save          jsonb,
  level         int  not null default 1,
  fails         int  not null default 0,
  locked_until  timestamptz,
  token         text,
  token_expires timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.konten enable row level security;
revoke all on public.konten from anon, authenticated;

-- ---------- Hilfsfunktionen ----------
create or replace function public._konto_name_ok(p_name text) returns boolean
language sql immutable as $$
  select p_name ~ '^[A-Za-z0-9ÄÖÜäöüß _.-]{2,20}$';
$$;

create or replace function public._konto_pruefen(p_name text, p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare k record;
begin
  select token, token_expires into k from konten where name = p_name;
  if not found or k.token is null then return false; end if;
  if k.token <> p_token or k.token_expires < now() then return false; end if;
  return true;
end $$;

-- ---------- Öffentliche Funktionen ----------
-- Liste aller Konten für die Auswahl (ohne Spielstand)
create or replace function public.konten_liste()
returns table(name text, level int, updated_at timestamptz, gold int, loc jsonb)
language sql security definer set search_path = public stable as $$
  select name, level, updated_at,
         coalesce((save->'P'->>'gold')::int, 0) as gold,
         jsonb_build_object('area', save->'P'->>'area', 'sx', save->'P'->'sx', 'sy', save->'P'->'sy') as loc
  from konten order by updated_at desc;
$$;

-- Konto anlegen: Name, vierstellige PIN, optional ein vorhandener Spielstand
create or replace function public.konto_anlegen(p_name text, p_pin text, p_save jsonb default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare t text; n int;
begin
  if not _konto_name_ok(p_name) then raise exception 'Name: 2 bis 20 Zeichen, Buchstaben, Ziffern, Leerzeichen'; end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'PIN: genau vier Ziffern'; end if;
  select count(*) into n from konten;
  if n >= 10 then raise exception 'Höchstens 10 Konten'; end if;
  if exists (select 1 from konten where lower(name) = lower(p_name)) then raise exception 'Name ist schon vergeben'; end if;
  if p_save is not null and length(p_save::text) > 200000 then raise exception 'Spielstand zu groß'; end if;
  t := encode(gen_random_bytes(24), 'hex');
  insert into konten(name, pin_hash, save, level, token, token_expires)
  values (p_name, crypt(p_pin, gen_salt('bf', 8)), p_save, coalesce((p_save->'P'->>'level')::int, 1), t, now() + interval '60 days');
  return jsonb_build_object('name', p_name, 'token', t, 'save', p_save);
end $$;

-- Anmelden: nach fünf Fehlversuchen 15 Minuten Sperre
create or replace function public.konto_login(p_name text, p_pin text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record; t text;
begin
  select * into k from konten where lower(name) = lower(p_name);
  if not found then raise exception 'Konto nicht gefunden'; end if;
  if k.locked_until is not null and k.locked_until > now() then
    raise exception 'Gesperrt bis % Uhr nach zu vielen Fehlversuchen', to_char(k.locked_until at time zone 'Europe/Zurich', 'HH24:MI');
  end if;
  if crypt(p_pin, k.pin_hash) <> k.pin_hash then
    update konten set fails = fails + 1, locked_until = case when fails + 1 >= 5 then now() + interval '15 minutes' else null end where name = k.name;
    raise exception 'Falsche PIN';
  end if;
  t := encode(gen_random_bytes(24), 'hex');
  update konten set fails = 0, locked_until = null, token = t, token_expires = now() + interval '60 days' where name = k.name;
  return jsonb_build_object('name', k.name, 'token', t, 'save', k.save, 'updated_at', k.updated_at);
end $$;

-- Spielstand laden
create or replace function public.konto_laden(p_name text, p_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record;
begin
  if not _konto_pruefen(p_name, p_token) then raise exception 'Sitzung abgelaufen, bitte neu anmelden'; end if;
  select save, updated_at into k from konten where name = p_name;
  return jsonb_build_object('save', k.save, 'updated_at', k.updated_at);
end $$;

-- Spielstand speichern
create or replace function public.konto_speichern(p_name text, p_token text, p_save jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not _konto_pruefen(p_name, p_token) then raise exception 'Sitzung abgelaufen, bitte neu anmelden'; end if;
  if length(p_save::text) > 200000 then raise exception 'Spielstand zu groß'; end if;
  update konten set save = p_save, level = coalesce((p_save->'P'->>'level')::int, level), updated_at = now() where name = p_name;
  return jsonb_build_object('ok', true, 'updated_at', now());
end $$;

-- PIN ändern
create or replace function public.konto_pin_aendern(p_name text, p_token text, p_alt text, p_neu text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record;
begin
  if not _konto_pruefen(p_name, p_token) then raise exception 'Sitzung abgelaufen, bitte neu anmelden'; end if;
  if p_neu !~ '^[0-9]{4}$' then raise exception 'PIN: genau vier Ziffern'; end if;
  select pin_hash into k from konten where name = p_name;
  if crypt(p_alt, k.pin_hash) <> k.pin_hash then raise exception 'Alte PIN falsch'; end if;
  update konten set pin_hash = crypt(p_neu, gen_salt('bf', 8)) where name = p_name;
  return jsonb_build_object('ok', true);
end $$;

-- Konto löschen
create or replace function public.konto_loeschen(p_name text, p_token text, p_pin text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare k record;
begin
  if not _konto_pruefen(p_name, p_token) then raise exception 'Sitzung abgelaufen, bitte neu anmelden'; end if;
  select pin_hash into k from konten where name = p_name;
  if crypt(p_pin, k.pin_hash) <> k.pin_hash then raise exception 'Falsche PIN'; end if;
  delete from konten where name = p_name;
  return jsonb_build_object('ok', true);
end $$;

-- Rechte: nur die Funktionen sind für den öffentlichen Schlüssel erreichbar
revoke all on function public._konto_pruefen(text, text) from public, anon, authenticated;
revoke all on function public._konto_name_ok(text) from public, anon, authenticated;
grant execute on function public.konten_liste() to anon, authenticated;
grant execute on function public.konto_anlegen(text, text, jsonb) to anon, authenticated;
grant execute on function public.konto_login(text, text) to anon, authenticated;
grant execute on function public.konto_laden(text, text) to anon, authenticated;
grant execute on function public.konto_speichern(text, text, jsonb) to anon, authenticated;
grant execute on function public.konto_pin_aendern(text, text, text, text) to anon, authenticated;
grant execute on function public.konto_loeschen(text, text, text) to anon, authenticated;

-- PIN eines Kontos zurücksetzen (nur hier im SQL Editor, nie im Spiel):
-- update konten set pin_hash = crypt('1234', gen_salt('bf', 8)), fails = 0, locked_until = null where name = 'Hendrik';
