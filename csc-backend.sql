-- ════════════════════════════════════════════════════════════════════════════
-- Sessions PWA — CSC-Mode Backend (v8.7.0-prep, E2EE)
-- Cannabis Social Club: end-to-end-encrypted Session-Sync mit anonymen Codes
-- ════════════════════════════════════════════════════════════════════════════
--
-- ⚠️  SICHERHEIT VOR FEATURE. KRYPTOGRAPHIE.
-- Dieses Schema speichert NUR verschlüsselte Blobs der Session-Inhalte.
-- Klartext liegt ausschließlich auf dem Endgerät des Users. Selbst Andre
-- mit Supabase-Service-Role-Key kann ohne Passphrase des Users nichts
-- über Session-Inhalte erfahren (außer dass eine Session existierte,
-- wann sie hochgeladen wurde, und welcher anonyme Code dazu gehört).
--
-- ⚠️  AUSNAHME: csc_circle_contributions speichert die Aggregat-ZAHL
-- (z.B. „User CSC-4827 hatte in 2026-W22 acht Sessions") im Klartext —
-- bewusst, damit der Server in csc_circle_aggregate addieren kann.
-- Diese Klartext-Datenpunkte sind in CSC-CRYPTO.md als „Non-Goal Nr. 3"
-- dokumentiert. Wer das nicht teilen will, lädt einfach nichts hoch.
--
-- ARCHITEKTUR:
--   1. RLS auf JEDER Tabelle aktiv, OHNE Policies + revoke all → anon
--      hat KEINEN direkten Zugriff.
--   2. Alle Operationen NUR via SECURITY-DEFINER-RPCs (siehe unten).
--   3. PIN-Hash (bcrypt via pgcrypto) ist NUR für „existiert der Account +
--      ist nicht gesperrt"-Check. Die echte Krypto-Sicherheit hängt an der
--      PASSPHRASE des Users (die NIE den Server erreicht).
--   4. encrypted_seed in csc_users ist AES-GCM(account_seed, PBKDF2(passphrase))
--      → ohne Passphrase ist der Seed nicht entschlüsselbar.
--   5. csc_sessions speichert ausschließlich {iv, encrypted_blob}
--      = AES-GCM(JSON-Session, HKDF(seed,'data')).
--
-- ÜBERSCHREIBT die v8.5.0-prep-Version komplett. Die alte (dormant) hatte
-- KLARTEXT-Felder strength/effect/aroma — die wären für E2EE nutzlos.
-- Da v8.5.0-prep nie live war, gibt es keine Migration zu pflegen.
--
-- AUSFÜHRUNG (manuell, einmalig im Supabase-SQL-Editor):
--   1. Falls v8.5.0-prep schon ausgeführt wurde: DROPS unten anwenden.
--   2. Diese Datei komplett ausführen.
--   3. Anon-Key + Projekt-URL aus Settings → API in `csc-config.json`.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Optionaler Reset (für Re-Run nach v8.5.0-prep) ────────────────────────
-- Auskommentiert lassen wenn Tabellen schon korrekt sind. Auskommentieren
-- wenn neu aufgesetzt werden soll.
-- drop function if exists csc_register(text);
-- drop function if exists csc_register(text, text, text, text);
-- drop function if exists csc_verify(text, text);
-- drop function if exists csc_login(text, text);
-- drop function if exists csc_push_session(text, text, text, timestamptz, int, text, int, text, text);
-- drop function if exists csc_push_session(text, text, text, text);
-- drop function if exists csc_pull_sessions(text, text, int);
-- drop function if exists csc_join_circle(text, text, text);
-- drop function if exists csc_leave_circle(text, text);
-- drop function if exists csc_circle_stats(text, text, text, int);
-- drop function if exists csc_circle_aggregate(text, text, text);
-- drop function if exists csc_contribute(text, text, text, text, text, numeric);
-- drop function if exists csc_delete_account(text, text);
-- drop function if exists csc_internal_verify_pin(text, text);
-- drop function if exists csc_internal_generate_code();
-- drop table if exists csc_circle_contributions;
-- drop table if exists csc_circle_members;
-- drop table if exists csc_sessions;
-- drop table if exists csc_circles;
-- drop table if exists csc_users;

-- ── Erweiterungen ─────────────────────────────────────────────────────────
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- TABELLEN (E2EE-Schema)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists csc_users (
  code              text primary key,                  -- "CSC-XXXX"
  pin_hash          text not null,                     -- bcrypt (existence-check, NICHT Datenschutz)
  pin_salt          text not null,                     -- bcrypt salt
  kdf_salt          text not null,                     -- 16 Bytes Base64, PBKDF2-Salt für Passphrase
  encrypted_seed    text not null,                     -- AES-GCM(account_seed, passphrase_key) als Base64
  encrypted_seed_iv text not null,                     -- 12 Bytes Base64
  failed_attempts   int  not null default 0,
  locked_until      timestamptz,
  created_at        timestamptz not null default now(),
  last_seen_at      timestamptz
);

create table if not exists csc_sessions (
  id              uuid primary key default uuid_generate_v4(),
  owner_code      text not null references csc_users(code) on delete cascade,
  iv              text not null,                       -- 12 Bytes Base64
  encrypted_blob  text not null,                       -- AES-GCM(JSON-Session, data_key) Base64
  shared_at       timestamptz not null default now()
);
create index if not exists idx_csc_sessions_owner on csc_sessions(owner_code);
create index if not exists idx_csc_sessions_shared_at on csc_sessions(shared_at);

create table if not exists csc_circles (
  circle_id  text primary key,
  name       text,
  min_k      int  not null default 5,                  -- k-anonymity Grenze
  created_at timestamptz not null default now()
);

create table if not exists csc_circle_members (
  circle_id  text not null references csc_circles(circle_id) on delete cascade,
  owner_code text not null references csc_users(code) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (circle_id, owner_code)
);
create index if not exists idx_csc_members_owner on csc_circle_members(owner_code);

-- Aggregat-Kontributionen: KLARTEXT-Zahlen (siehe Threat-Model / CSC-CRYPTO.md)
create table if not exists csc_circle_contributions (
  circle_id  text not null references csc_circles(circle_id) on delete cascade,
  owner_code text not null references csc_users(code) on delete cascade,
  period     text not null,                            -- z.B. "2026-W22"
  metric     text not null,                            -- z.B. "session_count"
  value      numeric not null,                         -- KLARTEXT-Zahl
  updated_at timestamptz not null default now(),
  primary key (circle_id, owner_code, period, metric)
);
create index if not exists idx_csc_contrib_lookup on csc_circle_contributions(circle_id, period, metric);

-- RLS aktivieren, KEINE Policies definieren → deny all für anon.
alter table csc_users                 enable row level security;
alter table csc_sessions              enable row level security;
alter table csc_circles               enable row level security;
alter table csc_circle_members        enable row level security;
alter table csc_circle_contributions  enable row level security;

revoke all on csc_users                 from anon, authenticated;
revoke all on csc_sessions              from anon, authenticated;
revoke all on csc_circles               from anon, authenticated;
revoke all on csc_circle_members        from anon, authenticated;
revoke all on csc_circle_contributions  from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- INTERNE HELFER (security definer, explicit search_path, NICHT public)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function csc_internal_generate_code()
returns text language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare cand text; tries int := 0;
begin
  loop
    cand := 'CSC-' || lpad(floor(random()*10000)::int::text, 4, '0');
    if not exists (select 1 from csc_users where code = cand) then return cand; end if;
    tries := tries + 1;
    if tries > 200 then raise exception 'CSC_CODE_POOL_EXHAUSTED'; end if;
  end loop;
end
$fn$;
revoke execute on function csc_internal_generate_code() from anon, authenticated, public;

create or replace function csc_internal_verify_pin(p_code text, p_pin text)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare u record; ok boolean;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,12}$' then return false; end if;
  if p_code is null or p_code !~ '^CSC-[0-9]{4}$' then return false; end if;
  select code, pin_hash, failed_attempts, locked_until
    into u from csc_users where code = p_code;
  if not found then
    perform crypt(p_pin, '$2a$08$abcdefghijklmnopqrstuv');   -- constant-time-Annäherung
    return false;
  end if;
  if u.locked_until is not null and u.locked_until > now() then return false; end if;
  ok := (u.pin_hash = crypt(p_pin, u.pin_hash));
  if ok then
    update csc_users set failed_attempts=0, locked_until=null, last_seen_at=now() where code=p_code;
    return true;
  else
    update csc_users set
      failed_attempts = failed_attempts + 1,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
      where code = p_code;
    return false;
  end if;
end
$fn$;
revoke execute on function csc_internal_verify_pin(text, text) from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- PUBLIC RPCs
-- ════════════════════════════════════════════════════════════════════════════

-- REGISTER: Client erzeugt account_seed lokal, leitet passphrase_key ab,
-- verschlüsselt seed → schickt {pin, kdf_salt, encrypted_seed, iv}. Server
-- hashed PIN (bcrypt) und legt User-Zeile an.
create or replace function csc_register(
  p_pin               text,
  p_kdf_salt          text,
  p_encrypted_seed    text,
  p_encrypted_seed_iv text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare new_code text;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,12}$' then raise exception 'INVALID_PIN' using errcode='P0001'; end if;
  if p_kdf_salt is null or length(p_kdf_salt) < 16 or length(p_kdf_salt) > 64 then raise exception 'INVALID_KDF_SALT' using errcode='P0001'; end if;
  if p_encrypted_seed is null or length(p_encrypted_seed) < 24 or length(p_encrypted_seed) > 200 then raise exception 'INVALID_ENCRYPTED_SEED' using errcode='P0001'; end if;
  if p_encrypted_seed_iv is null or length(p_encrypted_seed_iv) < 12 or length(p_encrypted_seed_iv) > 32 then raise exception 'INVALID_IV' using errcode='P0001'; end if;
  new_code := csc_internal_generate_code();
  insert into csc_users (code, pin_hash, pin_salt, kdf_salt, encrypted_seed, encrypted_seed_iv)
    values (new_code, crypt(p_pin, gen_salt('bf', 8)), '', p_kdf_salt, p_encrypted_seed, p_encrypted_seed_iv);
  return jsonb_build_object('code', new_code);
end
$fn$;
revoke execute on function csc_register(text,text,text,text) from public, authenticated;
grant   execute on function csc_register(text,text,text,text) to   anon;

-- LOGIN: prüft PIN → liefert kdf_salt + encrypted_seed + iv zurück.
-- Client leitet passphrase_key lokal ab und entschlüsselt seed selbst.
create or replace function csc_login(p_code text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; u record;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  select kdf_salt, encrypted_seed, encrypted_seed_iv into u from csc_users where code = p_code;
  return jsonb_build_object('kdf_salt', u.kdf_salt, 'encrypted_seed', u.encrypted_seed, 'encrypted_seed_iv', u.encrypted_seed_iv);
end
$fn$;
revoke execute on function csc_login(text,text) from public, authenticated;
grant   execute on function csc_login(text,text) to   anon;

-- PUSH SESSION: Client hat lokal verschlüsselt, schickt nur iv + ct.
create or replace function csc_push_session(p_code text, p_pin text, p_iv text, p_encrypted_blob text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; new_id uuid;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  if p_iv is null or length(p_iv) < 12 or length(p_iv) > 32 then raise exception 'INVALID_IV' using errcode='P0001'; end if;
  if p_encrypted_blob is null or length(p_encrypted_blob) < 24 or length(p_encrypted_blob) > 50000 then raise exception 'INVALID_BLOB' using errcode='P0001'; end if;
  insert into csc_sessions (owner_code, iv, encrypted_blob) values (p_code, p_iv, p_encrypted_blob) returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end
$fn$;
revoke execute on function csc_push_session(text,text,text,text) from public, authenticated;
grant   execute on function csc_push_session(text,text,text,text) to   anon;

-- PULL SESSIONS: nur eigene, Limit gegen Massendownload.
create or replace function csc_pull_sessions(p_code text, p_pin text, p_limit int default 500)
returns setof jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  return query
    select jsonb_build_object('id', id, 'iv', iv, 'ct', encrypted_blob, 'shared_at', shared_at)
      from csc_sessions where owner_code = p_code
  order by shared_at desc
     limit greatest(1, least(coalesce(p_limit, 500), 1000));
end
$fn$;
revoke execute on function csc_pull_sessions(text,text,int) from public, authenticated;
grant   execute on function csc_pull_sessions(text,text,int) to   anon;

-- KREIS BEITRETEN
create or replace function csc_join_circle(p_code text, p_pin text, p_circle_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  if p_circle_id is null or length(p_circle_id) < 3 or length(p_circle_id) > 64 or p_circle_id !~ '^[a-z0-9_-]+$' then
    raise exception 'INVALID_CIRCLE_ID' using errcode='P0001';
  end if;
  insert into csc_circles (circle_id) values (p_circle_id) on conflict (circle_id) do nothing;
  insert into csc_circle_members (circle_id, owner_code) values (p_circle_id, p_code) on conflict do nothing;
  return jsonb_build_object('ok', true, 'circle_id', p_circle_id);
end
$fn$;
revoke execute on function csc_join_circle(text,text,text) from public, authenticated;
grant   execute on function csc_join_circle(text,text,text) to   anon;

-- KREIS VERLASSEN
create or replace function csc_leave_circle(p_code text, p_pin text, p_circle_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  delete from csc_circle_members where circle_id = p_circle_id and owner_code = p_code;
  -- Klartext-Aggregat-Beiträge dieses Users für diesen Kreis ebenfalls löschen
  delete from csc_circle_contributions where circle_id = p_circle_id and owner_code = p_code;
  return jsonb_build_object('ok', true);
end
$fn$;
revoke execute on function csc_leave_circle(text,text,text) from public, authenticated;
grant   execute on function csc_leave_circle(text,text,text) to   anon;

-- AGGREGAT-KONTRIBUTION schreiben (Upsert)
create or replace function csc_contribute(p_code text, p_pin text, p_circle_id text, p_period text, p_metric text, p_value numeric)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; is_member boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  if p_period is null or length(p_period) < 4 or length(p_period) > 32 then raise exception 'INVALID_PERIOD' using errcode='P0001'; end if;
  if p_metric is null or p_metric !~ '^[a-z_]{2,40}$' then raise exception 'INVALID_METRIC' using errcode='P0001'; end if;
  if p_value is null or p_value < 0 or p_value > 1e9 then raise exception 'INVALID_VALUE' using errcode='P0001'; end if;
  select exists(select 1 from csc_circle_members where circle_id=p_circle_id and owner_code=p_code) into is_member;
  if not is_member then raise exception 'NOT_A_MEMBER' using errcode='P0001'; end if;
  insert into csc_circle_contributions (circle_id, owner_code, period, metric, value)
       values (p_circle_id, p_code, p_period, p_metric, p_value)
  on conflict (circle_id, owner_code, period, metric)
  do update set value = excluded.value, updated_at = now();
  return jsonb_build_object('ok', true);
end
$fn$;
revoke execute on function csc_contribute(text,text,text,text,text,numeric) from public, authenticated;
grant   execute on function csc_contribute(text,text,text,text,text,numeric) to   anon;

-- KREIS-AGGREGAT (Summe + Mitgliederzahl, mit k-Anonymity-Schranke)
-- Liefert NUR {sum, count_users} bei genug Daten, sonst {error:'k_too_low'}.
-- Auch hier muss der Aufrufer authentifiziertes Kreis-Mitglied sein.
create or replace function csc_circle_aggregate(p_code text, p_pin text, p_circle_id text, p_period text, p_metric text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; is_member boolean; min_k int; agg_sum numeric; agg_count int;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  select exists(select 1 from csc_circle_members where circle_id=p_circle_id and owner_code=p_code) into is_member;
  if not is_member then raise exception 'NOT_A_MEMBER' using errcode='P0001'; end if;
  select c.min_k into min_k from csc_circles c where c.circle_id = p_circle_id;
  if min_k is null then min_k := 5; end if;
  select coalesce(sum(value), 0)::numeric, count(distinct owner_code)::int
    into agg_sum, agg_count
    from csc_circle_contributions
   where circle_id = p_circle_id and period = p_period and metric = p_metric;
  if agg_count < min_k then
    return jsonb_build_object('error', 'k_too_low', 'count_users', agg_count, 'min_k', min_k);
  end if;
  return jsonb_build_object('sum', agg_sum, 'count_users', agg_count, 'min_k', min_k);
end
$fn$;
revoke execute on function csc_circle_aggregate(text,text,text,text,text) from public, authenticated;
grant   execute on function csc_circle_aggregate(text,text,text,text,text) to   anon;

-- DSGVO: KOMPLETT-LÖSCHUNG
create or replace function csc_delete_account(p_code text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  delete from csc_users where code = p_code;
  -- cascade löscht csc_sessions + csc_circle_members + csc_circle_contributions
  return jsonb_build_object('ok', true, 'deleted', p_code);
end
$fn$;
revoke execute on function csc_delete_account(text,text) from public, authenticated;
grant   execute on function csc_delete_account(text,text) to   anon;

-- ════════════════════════════════════════════════════════════════════════════
-- SELBST-ANGRIFFS-NOTIZ (für Andre / Reviewer, MUSS live nochmal mit curl)
-- ════════════════════════════════════════════════════════════════════════════
-- 1) Direkter SELECT mit Anon-Key: revoke all → 401/404 (PostgREST blockt).
-- 2) RPC ohne PIN: csc_internal_verify_pin → false → AUTH_FAILED.
-- 3) RPC mit falschem PIN: bcrypt-Vergleich fail; 5 Versuche → 15-min-Lockout.
-- 4) RPC mit korrekter PIN aber ohne Passphrase: liefert encrypted_seed —
--    der ist ohne PASSPHRASE des Users nicht entschlüsselbar (AES-GCM).
--    Hier liegt die echte Krypto-Sicherheit, nicht in der PIN.
-- 5) Kreis-Aggregate mit < min_k Mitgliedern: error:'k_too_low' ohne Werte.
-- 6) Push fremder Sessions: owner_code wird vom Server aus PIN-verifiziertem
--    p_code gesetzt, NICHT vom Client gewählt.
-- ════════════════════════════════════════════════════════════════════════════
