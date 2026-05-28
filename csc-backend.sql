-- ════════════════════════════════════════════════════════════════════════════
-- Sessions PWA — CSC-Mode Backend (v8.5.0-prep)
-- Cannabis Social Club: anonymer Code+PIN-Zugriff, Kreise mit Aggregaten
-- ════════════════════════════════════════════════════════════════════════════
--
-- ⚠️  SICHERHEIT VOR FEATURE.
-- Dieses Schema speichert Gesundheitsdaten (DSGVO Art. 9). Alle Daten sind
-- per Anon-Code (CSC-XXXX) anonymisiert, nicht per Klarname.
--
-- ARCHITEKTUR (warum nicht direkter Tabellen-Zugriff):
--   Der Supabase Anon-Key steht im Client-JS-Code. Wer den Client öffnet,
--   sieht den Key. Daher MUSS jede Zugriffslogik in der DB liegen:
--   1. RLS auf JEDER Tabelle aktiv, OHNE Policies   → anon kann NICHTS direkt.
--   2. Alle Operationen NUR via SECURITY-DEFINER-RPCs in dieser Datei.
--   3. RPCs erzwingen Code+PIN-Verifikation vor jeder Datenrückgabe.
--   4. Brute-Force-Lockout serverseitig (failed_attempts + locked_until).
--   5. Kreis-Funktionen geben NUR Aggregate zurück, keine Einzeldaten.
--
-- AUSFÜHRUNG (manuell, einmalig im Supabase-SQL-Editor):
--   1. Supabase-Projekt anlegen (eigenes, isoliert von anderen Projekten).
--   2. Diese Datei komplett in den SQL-Editor und ausführen.
--   3. Anon-Key + Projekt-URL aus Settings → API in `csc-config.json`
--      eintragen (siehe csc-config.example.json).
--
-- IDEMPOTENZ: Diese Datei ist re-runnable (CREATE OR REPLACE / IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Erweiterungen ─────────────────────────────────────────────────────────
create extension if not exists pgcrypto;   -- für crypt() + gen_salt('bf')
create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- TABELLEN
-- Alle Tabellen haben RLS aktiv aber KEINE Policies → anon hat keinen Zugriff.
-- Zugriff ausschließlich über die RPCs weiter unten (SECURITY DEFINER).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists csc_users (
  code            text primary key,                                  -- "CSC-4827"
  pin_hash        text not null,                                     -- bcrypt via crypt()
  failed_attempts int  not null default 0,
  locked_until    timestamptz,
  circle_id       text,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz
);

create table if not exists csc_circles (
  circle_id  text primary key,                                       -- frei wählbar, z.B. "csc-koeln-2026"
  name       text,
  created_at timestamptz not null default now()
);

create table if not exists csc_sessions (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null references csc_users(code) on delete cascade,
  client_id   text not null,                                          -- Idempotenz-Key vom Client (= lokale Session-ID)
  shared_at   timestamptz not null default now(),
  started_at  timestamptz,
  duration_sec int,
  device      text,
  strength    int  check (strength is null or (strength between 1 and 10)),
  effect      text,
  aroma       text,
  -- bewusst KEINE Felder: notes (Freitext zu identifizierend), Geräte-MAC, IP, UA
  unique (code, client_id)                                           -- Idempotenz: gleiche Client-ID = update
);
create index if not exists idx_csc_sessions_code         on csc_sessions(code);
create index if not exists idx_csc_sessions_started_at   on csc_sessions(started_at);

-- RLS aktivieren, KEINE Policies definieren → deny all für anon.
alter table csc_users    enable row level security;
alter table csc_circles  enable row level security;
alter table csc_sessions enable row level security;

-- Direkte Privilegien entziehen (Defense in Depth).
-- PostgREST exposiert nur Tabellen mit grants — anon bekommt NICHTS.
revoke all on csc_users    from anon, authenticated;
revoke all on csc_circles  from anon, authenticated;
revoke all on csc_sessions from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- INTERNE HELFER
-- Private Funktionen werden im Schema 'public' belassen aber als
-- security definer + explizitem search_path; werden NICHT extern aufrufbar
-- gemacht (revoke execute from anon).
-- ════════════════════════════════════════════════════════════════════════════

-- Code-Generator: "CSC-XXXX" mit 4 Ziffern (Spec). Bei Kollision: retry.
create or replace function csc_internal_generate_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  cand   text;
  tries  int := 0;
begin
  loop
    cand := 'CSC-' || lpad(floor(random()*10000)::int::text, 4, '0');
    if not exists (select 1 from csc_users where code = cand) then
      return cand;
    end if;
    tries := tries + 1;
    if tries > 200 then
      raise exception 'CSC_CODE_POOL_EXHAUSTED';
    end if;
  end loop;
end
$fn$;
revoke execute on function csc_internal_generate_code() from anon, authenticated, public;

-- PIN-Validierung: prüft Format + Lockout, returnt true bei Match.
-- Inkrementiert failed_attempts bei Fehlschlag, resetet bei Erfolg.
create or replace function csc_internal_verify_pin(p_code text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  u record;
  ok boolean;
begin
  -- Format-Check: PIN nur Ziffern, 4-12 lang
  if p_pin is null or p_pin !~ '^[0-9]{4,12}$' then
    return false;
  end if;
  if p_code is null or p_code !~ '^CSC-[0-9]{4}$' then
    return false;
  end if;

  select code, pin_hash, failed_attempts, locked_until
    into u from csc_users where code = p_code;
  if not found then
    -- Verzögerung-Approximation (constant time): bcrypt-Vergleich gegen Dummy
    perform crypt(p_pin, '$2a$08$abcdefghijklmnopqrstuv');
    return false;
  end if;

  if u.locked_until is not null and u.locked_until > now() then
    return false;
  end if;

  ok := (u.pin_hash = crypt(p_pin, u.pin_hash));

  if ok then
    update csc_users
       set failed_attempts = 0,
           locked_until    = null,
           last_seen_at    = now()
     where code = p_code;
    return true;
  else
    update csc_users
       set failed_attempts = failed_attempts + 1,
           locked_until = case
             when failed_attempts + 1 >= 5 then now() + interval '15 minutes'
             else locked_until
           end
     where code = p_code;
    return false;
  end if;
end
$fn$;
revoke execute on function csc_internal_verify_pin(text, text) from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- PUBLIC RPCs (von der App aufrufbar)
-- Alle SECURITY DEFINER mit explizitem search_path und expliziten GRANTs.
-- ════════════════════════════════════════════════════════════════════════════

-- ── REGISTER ──────────────────────────────────────────────────────────────
-- Erzeugt einen neuen Code. Speichert PIN als bcrypt-Hash.
-- Liefert: { code }
create or replace function csc_register(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  new_code text;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,12}$' then
    raise exception 'INVALID_PIN' using errcode = 'P0001';
  end if;
  new_code := csc_internal_generate_code();
  insert into csc_users (code, pin_hash)
       values (new_code, crypt(p_pin, gen_salt('bf', 8)));
  return jsonb_build_object('code', new_code);
end
$fn$;
revoke execute on function csc_register(text) from public, authenticated;
grant   execute on function csc_register(text) to   anon;

-- ── VERIFY ────────────────────────────────────────────────────────────────
-- Prüft Code+PIN. Liefert nur „ok"-Marker. Kein Session-Token nötig (jeder
-- weitere RPC verifiziert Code+PIN erneut serverseitig).
create or replace function csc_verify(p_code text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then
    raise exception 'AUTH_FAILED' using errcode = 'P0001';
  end if;
  return jsonb_build_object('ok', true, 'code', p_code);
end
$fn$;
revoke execute on function csc_verify(text, text) from public, authenticated;
grant   execute on function csc_verify(text, text) to   anon;

-- ── PUSH SESSION ──────────────────────────────────────────────────────────
-- Idempotent über (code, client_id) UPSERT.
-- Nur explizit übergebene Felder werden gespeichert.
create or replace function csc_push_session(
  p_code        text,
  p_pin         text,
  p_client_id   text,
  p_started_at  timestamptz,
  p_duration_sec int,
  p_device      text,
  p_strength    int,
  p_effect      text,
  p_aroma       text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare ok boolean; sess_id uuid;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then
    raise exception 'AUTH_FAILED' using errcode = 'P0001';
  end if;
  if p_client_id is null or length(p_client_id) < 4 or length(p_client_id) > 64 then
    raise exception 'INVALID_CLIENT_ID' using errcode = 'P0001';
  end if;
  insert into csc_sessions (code, client_id, started_at, duration_sec, device, strength, effect, aroma)
       values (p_code, p_client_id, p_started_at, p_duration_sec, p_device, p_strength, p_effect, p_aroma)
  on conflict (code, client_id)
  do update set
       started_at   = excluded.started_at,
       duration_sec = excluded.duration_sec,
       device       = excluded.device,
       strength     = excluded.strength,
       effect       = excluded.effect,
       aroma        = excluded.aroma,
       shared_at    = now()
  returning id into sess_id;
  return jsonb_build_object('ok', true, 'id', sess_id);
end
$fn$;
revoke execute on function csc_push_session(text, text, text, timestamptz, int, text, int, text, text)
  from public, authenticated;
grant   execute on function csc_push_session(text, text, text, timestamptz, int, text, int, text, text)
  to   anon;

-- ── PULL EIGENE SESSIONS ──────────────────────────────────────────────────
-- Returnt NUR die Sessions des authentifizierten Codes.
-- Hartes Limit gegen Massendown­load.
create or replace function csc_pull_sessions(p_code text, p_pin text, p_limit int default 500)
returns setof jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then
    raise exception 'AUTH_FAILED' using errcode = 'P0001';
  end if;
  return query
    select jsonb_build_object(
             'id', id, 'client_id', client_id,
             'started_at', started_at, 'duration_sec', duration_sec,
             'device', device, 'strength', strength, 'effect', effect,
             'aroma', aroma, 'shared_at', shared_at)
      from csc_sessions
     where code = p_code
  order by shared_at desc
     limit greatest(1, least(coalesce(p_limit, 500), 1000));
end
$fn$;
revoke execute on function csc_pull_sessions(text, text, int) from public, authenticated;
grant   execute on function csc_pull_sessions(text, text, int) to   anon;

-- ── KREIS BEITRETEN ───────────────────────────────────────────────────────
create or replace function csc_join_circle(p_code text, p_pin text, p_circle_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then
    raise exception 'AUTH_FAILED' using errcode = 'P0001';
  end if;
  if p_circle_id is null or length(p_circle_id) < 3 or length(p_circle_id) > 64
     or p_circle_id !~ '^[a-z0-9_-]+$' then
    raise exception 'INVALID_CIRCLE_ID' using errcode = 'P0001';
  end if;
  insert into csc_circles (circle_id) values (p_circle_id)
    on conflict (circle_id) do nothing;
  update csc_users set circle_id = p_circle_id where code = p_code;
  return jsonb_build_object('ok', true, 'circle_id', p_circle_id);
end
$fn$;
revoke execute on function csc_join_circle(text, text, text) from public, authenticated;
grant   execute on function csc_join_circle(text, text, text) to   anon;

-- ── KREIS VERLASSEN ───────────────────────────────────────────────────────
create or replace function csc_leave_circle(p_code text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then
    raise exception 'AUTH_FAILED' using errcode = 'P0001';
  end if;
  update csc_users set circle_id = null where code = p_code;
  return jsonb_build_object('ok', true);
end
$fn$;
revoke execute on function csc_leave_circle(text, text) from public, authenticated;
grant   execute on function csc_leave_circle(text, text) to   anon;

-- ── KREIS-AGGREGAT ────────────────────────────────────────────────────────
-- Liefert NUR aggregierte Zahlen. Keine Codes, keine Einzeldaten, keine IDs.
-- Mindest-Mitgliederzahl (k-anonymity), sonst kein Ergebnis.
create or replace function csc_circle_stats(p_code text, p_pin text, p_circle_id text, p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  ok boolean;
  member_caller boolean;
  member_count  int;
  sess_count    int;
  avg_strength  numeric;
  top_effect    text;
  k_min constant int := 3;   -- k-anonymity: weniger als 3 Mitglieder = kein Output
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then
    raise exception 'AUTH_FAILED' using errcode = 'P0001';
  end if;
  -- Aufrufer muss selbst Mitglied dieses Kreises sein
  select exists (select 1 from csc_users where code = p_code and circle_id = p_circle_id)
    into member_caller;
  if not member_caller then
    raise exception 'NOT_A_MEMBER' using errcode = 'P0001';
  end if;
  select count(*) into member_count from csc_users where circle_id = p_circle_id;
  if member_count < k_min then
    return jsonb_build_object('circle_id', p_circle_id,
                              'members', member_count,
                              'enough', false,
                              'reason', 'k-anonymity: weniger als ' || k_min || ' Mitglieder');
  end if;
  with recent as (
    select s.* from csc_sessions s
     where s.code in (select code from csc_users where circle_id = p_circle_id)
       and s.started_at > now() - make_interval(days => greatest(1, least(coalesce(p_days,7), 90)))
  ),
  eff as (
    select effect, count(*) c from recent where effect is not null group by effect
    order by c desc limit 1
  )
  select count(*), avg(strength)::numeric(5,2), coalesce((select effect from eff), null)
    into sess_count, avg_strength, top_effect from recent;
  return jsonb_build_object(
    'circle_id', p_circle_id,
    'members',   member_count,
    'days',      greatest(1, least(coalesce(p_days,7), 90)),
    'sessions',  sess_count,
    'avg_strength', avg_strength,
    'top_effect',   top_effect,
    'enough', true
  );
end
$fn$;
revoke execute on function csc_circle_stats(text, text, text, int) from public, authenticated;
grant   execute on function csc_circle_stats(text, text, text, int) to   anon;

-- ── DSGVO: KOMPLETT-LÖSCHUNG ──────────────────────────────────────────────
-- Löscht den User und (per ON DELETE CASCADE) alle seine Sessions.
-- Idempotent: Doppelaufruf nach Löschung gibt AUTH_FAILED (User existiert nicht mehr).
create or replace function csc_delete_account(p_code text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then
    raise exception 'AUTH_FAILED' using errcode = 'P0001';
  end if;
  delete from csc_users where code = p_code;
  -- Kreise bleiben (anonym, keine personenbezogenen Daten).
  return jsonb_build_object('ok', true, 'deleted', p_code);
end
$fn$;
revoke execute on function csc_delete_account(text, text) from public, authenticated;
grant   execute on function csc_delete_account(text, text) to   anon;

-- ════════════════════════════════════════════════════════════════════════════
-- SELBST-ANGRIFFS-NOTIZ (für Andre / Reviewer)
-- ════════════════════════════════════════════════════════════════════════════
-- 1) Direkter SELECT mit Anon-Key:
--      Anon hat KEIN grant auf csc_users/csc_sessions/csc_circles → 401.
-- 2) RPC ohne PIN:
--      Jede RPC ruft zuerst csc_internal_verify_pin; ohne PIN → AUTH_FAILED.
-- 3) RPC mit falschem PIN:
--      bcrypt-Vergleich schlägt fehl; nach 5 Versuchen Lockout 15 Min.
-- 4) Kreis-Stats für fremden Kreis:
--      „NOT_A_MEMBER"; Caller muss in csc_users.circle_id = p_circle_id sein.
-- 5) Kreis-Einzeldaten:
--      csc_circle_stats gibt ausschließlich Aggregate zurück; keine IDs, keine Codes.
--      Bei < 3 Mitgliedern: enough=false ohne Daten.
-- ════════════════════════════════════════════════════════════════════════════
