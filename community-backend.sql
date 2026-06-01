-- ════════════════════════════════════════════════════════════════════════════
-- Sessions PWA — Community Backend (v8.7.2-prep Phase 1a, DORMANT)
-- Geteilte Wissensbasis fuer Sorten + Programme mit Pseudonym-Login + Moderation.
--
-- VERHAELTNIS ZU csc-backend.sql:
--   • Eigene Datei NEBEN csc-backend.sql, nicht stattdessen.
--   • csc_users wird per ALTER TABLE additiv erweitert um 3 Spalten.
--   • csc-backend.sql + community-backend.sql sind beide idempotent, koennen in
--     beliebiger Reihenfolge ausgefuehrt werden.
--   • Krypto-Felder in csc_users (kdf_salt, hkdf_salt, encrypted_seed, ...)
--     werden in Phase 1a mit Dummies (zufaellig 16/12 Byte b64) befuellt.
--     Phase 2 (E2EE-Tracking-Sync) ueberschreibt sie spaeter mit echten Werten.
--
-- AUSFUEHRUNG (manuell, im Supabase SQL-Editor):
--   1. csc-backend.sql muss zuerst existieren (Tabelle csc_users wird referenced)
--   2. Diese Datei komplett einfuegen + Run
--   3. Idempotent — `create or replace` + `if not exists` ueberall
--
-- KONVENTIONEN (gleich zu csc-backend.sql):
--   • RLS aktiv auf jeder Tabelle, KEINE Policies fuer anon
--   • Direkter Zugriff revoke-all
--   • Operationen via SECURITY-DEFINER-RPCs mit voll-qualifiziertem
--     extensions.crypt / extensions.gen_salt-Prefix (Patch-2-Style)
--   • search_path = public, pg_temp (search_path-unabhaengiger Prefix bevorzugt)
-- ════════════════════════════════════════════════════════════════════════════

-- ── Extensions sicherstellen ──────────────────────────────────────────────
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- TEIL A — csc_users-Erweiterung (additiv, idempotent)
-- ════════════════════════════════════════════════════════════════════════════

alter table csc_users add column if not exists pseudonym             text;
alter table csc_users add column if not exists is_admin              boolean not null default false;
alter table csc_users add column if not exists last_anonymous_choice boolean not null default true;
create unique index if not exists csc_users_pseudonym_idx on csc_users(pseudonym) where pseudonym is not null;

-- ════════════════════════════════════════════════════════════════════════════
-- TEIL B — Community-Tabellen
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists community_strains (
  id                uuid primary key default gen_random_uuid(),
  author_code       text not null references csc_users(code) on delete cascade,
  show_pseudonym    boolean not null default false,               -- Default anonym
  name              text not null,
  genetics          text check (genetics is null or genetics in ('indica','sativa','hybrid')),
  thc_percent       numeric check (thc_percent is null or (thc_percent >= 0 and thc_percent <= 100)),
  cbd_percent       numeric check (cbd_percent is null or (cbd_percent >= 0 and cbd_percent <= 100)),
  terpenes          text[] check (terpenes is null or array_length(terpenes,1) is null or array_length(terpenes,1) <= 20),
  effects           text[] check (effects  is null or array_length(effects,1)  is null or array_length(effects,1)  <= 20),
  aromas            text[] check (aromas   is null or array_length(aromas,1)   is null or array_length(aromas,1)   <= 20),
  temp_min          int    check (temp_min is null or (temp_min between 40 and 240)),
  temp_max          int    check (temp_max is null or (temp_max between 40 and 240)),
  temp_recommended  int    check (temp_recommended is null or (temp_recommended between 40 and 240)),
  description       text   check (description is null or char_length(description) <= 2000),
  is_factory_seed   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  moderation_status text not null default 'approved' check (moderation_status in ('approved','flagged','pending'))
);
create index if not exists community_strains_name_idx   on community_strains(lower(name));
create index if not exists community_strains_author_idx on community_strains(author_code);
create index if not exists community_strains_factory_idx on community_strains(is_factory_seed);

create table if not exists community_strain_reviews (
  id            uuid primary key default gen_random_uuid(),
  strain_id     uuid not null references community_strains(id) on delete cascade,
  user_code     text not null references csc_users(code) on delete cascade,
  stars         int  not null check (stars between 1 and 5),
  comment       text check (comment is null or char_length(comment) <= 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(strain_id, user_code)
);
create index if not exists community_strain_reviews_strain_idx on community_strain_reviews(strain_id);

create table if not exists community_programs (
  id                  uuid primary key default gen_random_uuid(),
  author_code         text not null references csc_users(code) on delete cascade,
  show_pseudonym      boolean not null default false,
  name                text not null,
  description         text  check (description is null or char_length(description) <= 2000),
  steps               jsonb not null,
  total_duration_sec  int   check (total_duration_sec is null or total_duration_sec between 0 and 14400),
  is_factory_seed     boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  moderation_status   text not null default 'approved' check (moderation_status in ('approved','flagged','pending'))
);
create index if not exists community_programs_name_idx    on community_programs(lower(name));
create index if not exists community_programs_author_idx  on community_programs(author_code);

create table if not exists community_program_strains (
  program_id uuid not null references community_programs(id) on delete cascade,
  strain_id  uuid not null references community_strains(id)  on delete cascade,
  primary key (program_id, strain_id)
);

create table if not exists community_program_devices (
  program_id uuid not null references community_programs(id) on delete cascade,
  device     text not null check (device in (
    'volcano-classic','volcano-hybrid','crafty','crafty-plus','mighty','mighty-plus',
    'venty','veazy','plenty','pax-3','puffco-peak-pro','firefly','other')),
  primary key (program_id, device)
);

create table if not exists community_program_reviews (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references community_programs(id) on delete cascade,
  user_code     text not null references csc_users(code) on delete cascade,
  stars         int  not null check (stars between 1 and 5),
  comment       text check (comment is null or char_length(comment) <= 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(program_id, user_code)
);
create index if not exists community_program_reviews_program_idx on community_program_reviews(program_id);

create table if not exists community_edit_proposals (
  id               uuid primary key default gen_random_uuid(),
  proposer_code    text not null references csc_users(code) on delete cascade,
  target_type      text not null check (target_type in ('strain','program')),
  target_id        uuid not null,
  proposed_changes jsonb not null,
  proposer_comment text check (proposer_comment is null or char_length(proposer_comment) <= 1000),
  status           text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  resolved_by      text references csc_users(code),
  resolver_note    text check (resolver_note is null or char_length(resolver_note) <= 1000)
);
create index if not exists community_edit_proposals_status_idx on community_edit_proposals(status);
create index if not exists community_edit_proposals_target_idx on community_edit_proposals(target_type, target_id);

-- RLS aktivieren, KEINE Policies fuer anon
alter table community_strains          enable row level security;
alter table community_strain_reviews   enable row level security;
alter table community_programs         enable row level security;
alter table community_program_strains  enable row level security;
alter table community_program_devices  enable row level security;
alter table community_program_reviews  enable row level security;
alter table community_edit_proposals   enable row level security;
revoke all on community_strains          from anon, authenticated;
revoke all on community_strain_reviews   from anon, authenticated;
revoke all on community_programs         from anon, authenticated;
revoke all on community_program_strains  from anon, authenticated;
revoke all on community_program_devices  from anon, authenticated;
revoke all on community_program_reviews  from anon, authenticated;
revoke all on community_edit_proposals   from anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- TEIL C — Interne Helfer
-- ════════════════════════════════════════════════════════════════════════════

-- Pseudonym-Format-Check: 3..24 Zeichen, [a-zA-Z0-9_-]
create or replace function community_internal_validate_pseudonym(p_pseudonym text)
returns boolean
language sql
immutable
as $fn$
  select p_pseudonym is not null and p_pseudonym ~ '^[a-zA-Z0-9_-]{3,24}$'
$fn$;
revoke execute on function community_internal_validate_pseudonym(text) from anon, authenticated, public;

-- Admin-Check anhand csc_users.is_admin (kein PIN-Check hier; PIN-Verify
-- in der aufrufenden RPC vorgeschaltet).
create or replace function community_internal_is_admin(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare r boolean;
begin
  select coalesce(is_admin, false) into r from csc_users where code = p_code;
  return coalesce(r, false);
end
$fn$;
revoke execute on function community_internal_is_admin(text) from anon, authenticated, public;

-- Strain-Datenvalidation: prueft p_data-jsonb auf zulaessige Felder + Wertebereiche.
-- Wirft EXCEPTION mit klarer Fehlermeldung statt return false (bessere DX).
create or replace function community_internal_validate_strain_data(p_data jsonb)
returns void
language plpgsql
immutable
as $fn$
declare v_name text;
begin
  if p_data is null then raise exception 'STRAIN_DATA_NULL' using errcode='P0001'; end if;
  v_name := p_data->>'name';
  if v_name is null or char_length(v_name) < 1 or char_length(v_name) > 100 then
    raise exception 'INVALID_STRAIN_NAME' using errcode='P0001';
  end if;
  if (p_data ? 'genetics') and (p_data->>'genetics') is not null
     and (p_data->>'genetics') not in ('indica','sativa','hybrid') then
    raise exception 'INVALID_GENETICS' using errcode='P0001';
  end if;
  if (p_data ? 'thc_percent') and (p_data->>'thc_percent') is not null
     and ((p_data->>'thc_percent')::numeric < 0 or (p_data->>'thc_percent')::numeric > 100) then
    raise exception 'INVALID_THC_PERCENT' using errcode='P0001';
  end if;
  if (p_data ? 'cbd_percent') and (p_data->>'cbd_percent') is not null
     and ((p_data->>'cbd_percent')::numeric < 0 or (p_data->>'cbd_percent')::numeric > 100) then
    raise exception 'INVALID_CBD_PERCENT' using errcode='P0001';
  end if;
  if (p_data ? 'temp_min') and (p_data->>'temp_min') is not null
     and ((p_data->>'temp_min')::int < 40 or (p_data->>'temp_min')::int > 240) then
    raise exception 'INVALID_TEMP_MIN' using errcode='P0001';
  end if;
  if (p_data ? 'temp_max') and (p_data->>'temp_max') is not null
     and ((p_data->>'temp_max')::int < 40 or (p_data->>'temp_max')::int > 240) then
    raise exception 'INVALID_TEMP_MAX' using errcode='P0001';
  end if;
  if (p_data ? 'temp_recommended') and (p_data->>'temp_recommended') is not null
     and ((p_data->>'temp_recommended')::int < 40 or (p_data->>'temp_recommended')::int > 240) then
    raise exception 'INVALID_TEMP_RECOMMENDED' using errcode='P0001';
  end if;
  if (p_data ? 'description') and (p_data->>'description') is not null
     and char_length(p_data->>'description') > 2000 then
    raise exception 'DESCRIPTION_TOO_LONG' using errcode='P0001';
  end if;
end
$fn$;
revoke execute on function community_internal_validate_strain_data(jsonb) from anon, authenticated, public;

-- Programm-Steps-Validation: Array, max 200 steps, jeder mit erlaubter action.
create or replace function community_internal_validate_program_steps(p_steps jsonb)
returns void
language plpgsql
immutable
as $fn$
declare elem jsonb; valid_actions text[];
begin
  if p_steps is null or jsonb_typeof(p_steps) <> 'array' then
    raise exception 'STEPS_NOT_ARRAY' using errcode='P0001';
  end if;
  if jsonb_array_length(p_steps) < 1 or jsonb_array_length(p_steps) > 200 then
    raise exception 'STEPS_LENGTH (1..200)' using errcode='P0001';
  end if;
  valid_actions := array['heat_on','heat_off','pump_on','pump_off','set_temperature','wait_until','wait','pump_for','loop_start','loop_end'];
  for elem in select * from jsonb_array_elements(p_steps) loop
    if not (elem->>'action' = any(valid_actions)) then
      raise exception 'INVALID_STEP_ACTION %', elem->>'action' using errcode='P0001';
    end if;
  end loop;
end
$fn$;
revoke execute on function community_internal_validate_program_steps(jsonb) from anon, authenticated, public;

-- ════════════════════════════════════════════════════════════════════════════
-- TEIL D — Public RPCs (14 Stueck)
-- ════════════════════════════════════════════════════════════════════════════

-- RPC 1: Pseudonym registrieren (nach csc_register)
create or replace function community_register_pseudonym(p_code text, p_pin text, p_pseudonym text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; existing text;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  if not community_internal_validate_pseudonym(p_pseudonym) then
    raise exception 'INVALID_PSEUDONYM' using errcode='P0001';
  end if;
  select code into existing from csc_users where pseudonym = p_pseudonym;
  if existing is not null and existing <> p_code then
    raise exception 'PSEUDONYM_TAKEN' using errcode='P0001';
  end if;
  update csc_users set pseudonym = p_pseudonym where code = p_code;
  return jsonb_build_object('ok', true, 'pseudonym', p_pseudonym);
end
$fn$;
revoke execute on function community_register_pseudonym(text,text,text) from public, authenticated;
grant   execute on function community_register_pseudonym(text,text,text) to anon;

-- RPC 2: Pseudonym verfuegbar?
create or replace function community_pseudonym_available(p_pseudonym text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare cnt int;
begin
  if not community_internal_validate_pseudonym(p_pseudonym) then
    raise exception 'INVALID_PSEUDONYM' using errcode='P0001';
  end if;
  select count(*) into cnt from csc_users where pseudonym = p_pseudonym;
  return jsonb_build_object('available', cnt = 0);
end
$fn$;
revoke execute on function community_pseudonym_available(text) from public, authenticated;
grant   execute on function community_pseudonym_available(text) to anon;

-- RPC 3: Strain anlegen
create or replace function community_strain_create(p_code text, p_pin text, p_show_pseudonym boolean, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; new_id uuid;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  perform community_internal_validate_strain_data(p_data);
  insert into community_strains (author_code, show_pseudonym, name, genetics, thc_percent, cbd_percent,
                                 terpenes, effects, aromas, temp_min, temp_max, temp_recommended, description)
    values (
      p_code, coalesce(p_show_pseudonym, false),
      p_data->>'name',
      p_data->>'genetics',
      nullif(p_data->>'thc_percent','')::numeric,
      nullif(p_data->>'cbd_percent','')::numeric,
      case when p_data ? 'terpenes' then array(select jsonb_array_elements_text(p_data->'terpenes')) end,
      case when p_data ? 'effects'  then array(select jsonb_array_elements_text(p_data->'effects')) end,
      case when p_data ? 'aromas'   then array(select jsonb_array_elements_text(p_data->'aromas')) end,
      nullif(p_data->>'temp_min','')::int,
      nullif(p_data->>'temp_max','')::int,
      nullif(p_data->>'temp_recommended','')::int,
      p_data->>'description'
    ) returning id into new_id;
  -- Default-Memory: naechstes Mal das Gegenteil als Default
  update csc_users set last_anonymous_choice = (not coalesce(p_show_pseudonym, false)) where code = p_code;
  return jsonb_build_object('ok', true, 'id', new_id);
end
$fn$;
revoke execute on function community_strain_create(text,text,boolean,jsonb) from public, authenticated;
grant   execute on function community_strain_create(text,text,boolean,jsonb) to anon;

-- RPC 4: Strain-Liste (oeffentlich, kein PIN)
create or replace function community_strain_list(p_filter text default null, p_limit int default 50, p_offset int default 0)
returns setof jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare lim int; ofs int;
begin
  lim := greatest(1, least(coalesce(p_limit, 50), 200));
  ofs := greatest(0, coalesce(p_offset, 0));
  return query
    select jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'genetics', s.genetics,
      'thc_percent', s.thc_percent,
      'cbd_percent', s.cbd_percent,
      'terpenes', s.terpenes,
      'effects', s.effects,
      'aromas', s.aromas,
      'temp_min', s.temp_min,
      'temp_max', s.temp_max,
      'temp_recommended', s.temp_recommended,
      'description', s.description,
      'is_factory_seed', s.is_factory_seed,
      'created_at', s.created_at,
      'author_pseudonym', case when s.show_pseudonym then u.pseudonym else null end,
      'avg_stars', (select avg(stars)::numeric(3,2) from community_strain_reviews r where r.strain_id = s.id),
      'review_count', (select count(*) from community_strain_reviews r where r.strain_id = s.id)
    )
    from community_strains s
    left join csc_users u on u.code = s.author_code
    where s.moderation_status = 'approved'
      and (p_filter is null or s.name ilike '%' || p_filter || '%')
    order by s.is_factory_seed desc, s.created_at desc
    limit lim offset ofs;
end
$fn$;
revoke execute on function community_strain_list(text,int,int) from public, authenticated;
grant   execute on function community_strain_list(text,int,int) to anon;

-- RPC 5: Strain aktualisieren (eigene)
create or replace function community_strain_update_own(p_code text, p_pin text, p_strain_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; existing_author text;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  select author_code into existing_author from community_strains where id = p_strain_id;
  if existing_author is null then raise exception 'STRAIN_NOT_FOUND' using errcode='P0001'; end if;
  if existing_author <> p_code then raise exception 'NOT_AUTHOR' using errcode='P0001'; end if;
  perform community_internal_validate_strain_data(p_data);
  update community_strains set
    name = coalesce(p_data->>'name', name),
    genetics = case when p_data ? 'genetics' then p_data->>'genetics' else genetics end,
    thc_percent = case when p_data ? 'thc_percent' then nullif(p_data->>'thc_percent','')::numeric else thc_percent end,
    cbd_percent = case when p_data ? 'cbd_percent' then nullif(p_data->>'cbd_percent','')::numeric else cbd_percent end,
    terpenes = case when p_data ? 'terpenes' then array(select jsonb_array_elements_text(p_data->'terpenes')) else terpenes end,
    effects  = case when p_data ? 'effects'  then array(select jsonb_array_elements_text(p_data->'effects'))  else effects  end,
    aromas   = case when p_data ? 'aromas'   then array(select jsonb_array_elements_text(p_data->'aromas'))   else aromas   end,
    temp_min = case when p_data ? 'temp_min' then nullif(p_data->>'temp_min','')::int else temp_min end,
    temp_max = case when p_data ? 'temp_max' then nullif(p_data->>'temp_max','')::int else temp_max end,
    temp_recommended = case when p_data ? 'temp_recommended' then nullif(p_data->>'temp_recommended','')::int else temp_recommended end,
    description = case when p_data ? 'description' then p_data->>'description' else description end,
    updated_at = now()
   where id = p_strain_id;
  return jsonb_build_object('ok', true);
end
$fn$;
revoke execute on function community_strain_update_own(text,text,uuid,jsonb) from public, authenticated;
grant   execute on function community_strain_update_own(text,text,uuid,jsonb) to anon;

-- RPC 6: Strain loeschen (eigene)
create or replace function community_strain_delete_own(p_code text, p_pin text, p_strain_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; existing_author text;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  select author_code into existing_author from community_strains where id = p_strain_id;
  if existing_author is null then raise exception 'STRAIN_NOT_FOUND' using errcode='P0001'; end if;
  if existing_author <> p_code then raise exception 'NOT_AUTHOR' using errcode='P0001'; end if;
  delete from community_strains where id = p_strain_id;
  return jsonb_build_object('ok', true);
end
$fn$;
revoke execute on function community_strain_delete_own(text,text,uuid) from public, authenticated;
grant   execute on function community_strain_delete_own(text,text,uuid) to anon;

-- RPC 7: Edit-Vorschlag fuer Strain
create or replace function community_strain_propose_edit(p_code text, p_pin text, p_strain_id uuid, p_changes jsonb, p_comment text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; new_id uuid;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  if not exists(select 1 from community_strains where id = p_strain_id) then
    raise exception 'STRAIN_NOT_FOUND' using errcode='P0001';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'CHANGES_NOT_OBJECT' using errcode='P0001';
  end if;
  if p_comment is not null and char_length(p_comment) > 1000 then
    raise exception 'COMMENT_TOO_LONG' using errcode='P0001';
  end if;
  insert into community_edit_proposals (proposer_code, target_type, target_id, proposed_changes, proposer_comment)
    values (p_code, 'strain', p_strain_id, p_changes, p_comment)
    returning id into new_id;
  return jsonb_build_object('ok', true, 'proposal_id', new_id);
end
$fn$;
revoke execute on function community_strain_propose_edit(text,text,uuid,jsonb,text) from public, authenticated;
grant   execute on function community_strain_propose_edit(text,text,uuid,jsonb,text) to anon;

-- RPC 8: Strain bewerten (Upsert)
create or replace function community_strain_rate(p_code text, p_pin text, p_strain_id uuid, p_stars int, p_comment text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  if not exists(select 1 from community_strains where id = p_strain_id) then
    raise exception 'STRAIN_NOT_FOUND' using errcode='P0001';
  end if;
  if p_stars < 1 or p_stars > 5 then raise exception 'INVALID_STARS' using errcode='P0001'; end if;
  if p_comment is not null and char_length(p_comment) > 1000 then
    raise exception 'COMMENT_TOO_LONG' using errcode='P0001';
  end if;
  insert into community_strain_reviews (strain_id, user_code, stars, comment)
    values (p_strain_id, p_code, p_stars, p_comment)
    on conflict (strain_id, user_code) do update
      set stars = excluded.stars, comment = excluded.comment, updated_at = now();
  return jsonb_build_object('ok', true, 'my_stars', p_stars);
end
$fn$;
revoke execute on function community_strain_rate(text,text,uuid,int,text) from public, authenticated;
grant   execute on function community_strain_rate(text,text,uuid,int,text) to anon;

-- RPC 9: Programm anlegen
create or replace function community_program_create(p_code text, p_pin text, p_show_pseudonym boolean, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; new_id uuid; v_steps jsonb;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  if p_data is null then raise exception 'DATA_NULL' using errcode='P0001'; end if;
  if (p_data->>'name') is null or char_length(p_data->>'name') < 1 or char_length(p_data->>'name') > 100 then
    raise exception 'INVALID_PROGRAM_NAME' using errcode='P0001';
  end if;
  v_steps := p_data->'steps';
  perform community_internal_validate_program_steps(v_steps);
  if (p_data ? 'description') and (p_data->>'description') is not null
     and char_length(p_data->>'description') > 2000 then
    raise exception 'DESCRIPTION_TOO_LONG' using errcode='P0001';
  end if;
  insert into community_programs (author_code, show_pseudonym, name, description, steps, total_duration_sec)
    values (p_code, coalesce(p_show_pseudonym, false),
            p_data->>'name', p_data->>'description', v_steps,
            nullif(p_data->>'total_duration_sec','')::int)
    returning id into new_id;
  update csc_users set last_anonymous_choice = (not coalesce(p_show_pseudonym, false)) where code = p_code;
  return jsonb_build_object('ok', true, 'id', new_id);
end
$fn$;
revoke execute on function community_program_create(text,text,boolean,jsonb) from public, authenticated;
grant   execute on function community_program_create(text,text,boolean,jsonb) to anon;

-- RPC 10: Programm-Liste (oeffentlich)
create or replace function community_program_list(p_filter text default null, p_device text default null, p_limit int default 50, p_offset int default 0)
returns setof jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare lim int; ofs int;
begin
  lim := greatest(1, least(coalesce(p_limit, 50), 200));
  ofs := greatest(0, coalesce(p_offset, 0));
  return query
    select jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'steps', p.steps,
      'total_duration_sec', p.total_duration_sec,
      'is_factory_seed', p.is_factory_seed,
      'created_at', p.created_at,
      'author_pseudonym', case when p.show_pseudonym then u.pseudonym else null end,
      'avg_stars', (select avg(stars)::numeric(3,2) from community_program_reviews r where r.program_id = p.id),
      'review_count', (select count(*) from community_program_reviews r where r.program_id = p.id),
      'devices', (select array_agg(device) from community_program_devices pd where pd.program_id = p.id),
      'strains', (select array_agg(strain_id) from community_program_strains ps where ps.program_id = p.id)
    )
    from community_programs p
    left join csc_users u on u.code = p.author_code
    where p.moderation_status = 'approved'
      and (p_filter is null or p.name ilike '%' || p_filter || '%')
      and (p_device is null or exists(select 1 from community_program_devices pd where pd.program_id = p.id and pd.device = p_device))
    order by p.is_factory_seed desc, p.created_at desc
    limit lim offset ofs;
end
$fn$;
revoke execute on function community_program_list(text,text,int,int) from public, authenticated;
grant   execute on function community_program_list(text,text,int,int) to anon;

-- RPC 11: Programm aktualisieren (eigene)
create or replace function community_program_update_own(p_code text, p_pin text, p_program_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; existing_author text;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  select author_code into existing_author from community_programs where id = p_program_id;
  if existing_author is null then raise exception 'PROGRAM_NOT_FOUND' using errcode='P0001'; end if;
  if existing_author <> p_code then raise exception 'NOT_AUTHOR' using errcode='P0001'; end if;
  if (p_data ? 'steps') then perform community_internal_validate_program_steps(p_data->'steps'); end if;
  update community_programs set
    name = case when p_data ? 'name' then p_data->>'name' else name end,
    description = case when p_data ? 'description' then p_data->>'description' else description end,
    steps = case when p_data ? 'steps' then p_data->'steps' else steps end,
    total_duration_sec = case when p_data ? 'total_duration_sec' then nullif(p_data->>'total_duration_sec','')::int else total_duration_sec end,
    updated_at = now()
   where id = p_program_id;
  return jsonb_build_object('ok', true);
end
$fn$;
revoke execute on function community_program_update_own(text,text,uuid,jsonb) from public, authenticated;
grant   execute on function community_program_update_own(text,text,uuid,jsonb) to anon;

-- RPC 12: Programm loeschen (eigene)
create or replace function community_program_delete_own(p_code text, p_pin text, p_program_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; existing_author text;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  select author_code into existing_author from community_programs where id = p_program_id;
  if existing_author is null then raise exception 'PROGRAM_NOT_FOUND' using errcode='P0001'; end if;
  if existing_author <> p_code then raise exception 'NOT_AUTHOR' using errcode='P0001'; end if;
  delete from community_programs where id = p_program_id;
  return jsonb_build_object('ok', true);
end
$fn$;
revoke execute on function community_program_delete_own(text,text,uuid) from public, authenticated;
grant   execute on function community_program_delete_own(text,text,uuid) to anon;

-- RPC 13: Programm-Edit-Vorschlag
create or replace function community_program_propose_edit(p_code text, p_pin text, p_program_id uuid, p_changes jsonb, p_comment text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; new_id uuid;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  if not exists(select 1 from community_programs where id = p_program_id) then
    raise exception 'PROGRAM_NOT_FOUND' using errcode='P0001';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'CHANGES_NOT_OBJECT' using errcode='P0001';
  end if;
  if p_comment is not null and char_length(p_comment) > 1000 then
    raise exception 'COMMENT_TOO_LONG' using errcode='P0001';
  end if;
  insert into community_edit_proposals (proposer_code, target_type, target_id, proposed_changes, proposer_comment)
    values (p_code, 'program', p_program_id, p_changes, p_comment)
    returning id into new_id;
  return jsonb_build_object('ok', true, 'proposal_id', new_id);
end
$fn$;
revoke execute on function community_program_propose_edit(text,text,uuid,jsonb,text) from public, authenticated;
grant   execute on function community_program_propose_edit(text,text,uuid,jsonb,text) to anon;

-- RPC 14: Programm bewerten
create or replace function community_program_rate(p_code text, p_pin text, p_program_id uuid, p_stars int, p_comment text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  if not exists(select 1 from community_programs where id = p_program_id) then
    raise exception 'PROGRAM_NOT_FOUND' using errcode='P0001';
  end if;
  if p_stars < 1 or p_stars > 5 then raise exception 'INVALID_STARS' using errcode='P0001'; end if;
  if p_comment is not null and char_length(p_comment) > 1000 then
    raise exception 'COMMENT_TOO_LONG' using errcode='P0001';
  end if;
  insert into community_program_reviews (program_id, user_code, stars, comment)
    values (p_program_id, p_code, p_stars, p_comment)
    on conflict (program_id, user_code) do update
      set stars = excluded.stars, comment = excluded.comment, updated_at = now();
  return jsonb_build_object('ok', true, 'my_stars', p_stars);
end
$fn$;
revoke execute on function community_program_rate(text,text,uuid,int,text) from public, authenticated;
grant   execute on function community_program_rate(text,text,uuid,int,text) to anon;

-- RPC 15: Programm <-> Sorten verknuepfen
create or replace function community_program_link_strains(p_code text, p_pin text, p_program_id uuid, p_strain_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; existing_author text; sid uuid;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  select author_code into existing_author from community_programs where id = p_program_id;
  if existing_author is null then raise exception 'PROGRAM_NOT_FOUND' using errcode='P0001'; end if;
  if existing_author <> p_code then raise exception 'NOT_AUTHOR' using errcode='P0001'; end if;
  if p_strain_ids is null then p_strain_ids := array[]::uuid[]; end if;
  if array_length(p_strain_ids, 1) > 50 then raise exception 'TOO_MANY_STRAINS' using errcode='P0001'; end if;
  delete from community_program_strains where program_id = p_program_id;
  if p_strain_ids is not null and array_length(p_strain_ids,1) > 0 then
    foreach sid in array p_strain_ids loop
      insert into community_program_strains (program_id, strain_id) values (p_program_id, sid)
        on conflict do nothing;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'count', coalesce(array_length(p_strain_ids,1),0));
end
$fn$;
revoke execute on function community_program_link_strains(text,text,uuid,uuid[]) from public, authenticated;
grant   execute on function community_program_link_strains(text,text,uuid,uuid[]) to anon;

-- RPC 16: Programm <-> Geraete setzen
create or replace function community_program_set_devices(p_code text, p_pin text, p_program_id uuid, p_devices text[])
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; existing_author text; d text;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  select author_code into existing_author from community_programs where id = p_program_id;
  if existing_author is null then raise exception 'PROGRAM_NOT_FOUND' using errcode='P0001'; end if;
  if existing_author <> p_code then raise exception 'NOT_AUTHOR' using errcode='P0001'; end if;
  if p_devices is null then p_devices := array[]::text[]; end if;
  if array_length(p_devices, 1) > 13 then raise exception 'TOO_MANY_DEVICES' using errcode='P0001'; end if;
  delete from community_program_devices where program_id = p_program_id;
  if array_length(p_devices,1) > 0 then
    foreach d in array p_devices loop
      insert into community_program_devices (program_id, device) values (p_program_id, d)
        on conflict do nothing;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'count', coalesce(array_length(p_devices,1),0));
end
$fn$;
revoke execute on function community_program_set_devices(text,text,uuid,text[]) from public, authenticated;
grant   execute on function community_program_set_devices(text,text,uuid,text[]) to anon;

-- RPC 17: Admin — Vorschlag aufloesen
create or replace function community_admin_resolve_proposal(p_code text, p_pin text, p_proposal_id uuid, p_accept boolean, p_note text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; is_adm boolean; prop record;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  is_adm := community_internal_is_admin(p_code);
  if not is_adm then raise exception 'NOT_ADMIN' using errcode='P0001'; end if;
  select * into prop from community_edit_proposals where id = p_proposal_id;
  if prop.id is null then raise exception 'PROPOSAL_NOT_FOUND' using errcode='P0001'; end if;
  if prop.status <> 'pending' then raise exception 'PROPOSAL_ALREADY_RESOLVED' using errcode='P0001'; end if;
  if p_accept then
    if prop.target_type = 'strain' then
      update community_strains set
        name = coalesce(prop.proposed_changes->>'name', name),
        genetics = case when prop.proposed_changes ? 'genetics' then prop.proposed_changes->>'genetics' else genetics end,
        thc_percent = case when prop.proposed_changes ? 'thc_percent' then nullif(prop.proposed_changes->>'thc_percent','')::numeric else thc_percent end,
        cbd_percent = case when prop.proposed_changes ? 'cbd_percent' then nullif(prop.proposed_changes->>'cbd_percent','')::numeric else cbd_percent end,
        temp_recommended = case when prop.proposed_changes ? 'temp_recommended' then nullif(prop.proposed_changes->>'temp_recommended','')::int else temp_recommended end,
        description = case when prop.proposed_changes ? 'description' then prop.proposed_changes->>'description' else description end,
        updated_at = now()
       where id = prop.target_id;
    elsif prop.target_type = 'program' then
      update community_programs set
        name = case when prop.proposed_changes ? 'name' then prop.proposed_changes->>'name' else name end,
        description = case when prop.proposed_changes ? 'description' then prop.proposed_changes->>'description' else description end,
        steps = case when prop.proposed_changes ? 'steps' then prop.proposed_changes->'steps' else steps end,
        updated_at = now()
       where id = prop.target_id;
    end if;
    update community_edit_proposals set status='accepted', resolved_at=now(), resolved_by=p_code, resolver_note=p_note where id = p_proposal_id;
  else
    update community_edit_proposals set status='rejected', resolved_at=now(), resolved_by=p_code, resolver_note=p_note where id = p_proposal_id;
  end if;
  return jsonb_build_object('ok', true, 'status', case when p_accept then 'accepted' else 'rejected' end);
end
$fn$;
revoke execute on function community_admin_resolve_proposal(text,text,uuid,boolean,text) from public, authenticated;
grant   execute on function community_admin_resolve_proposal(text,text,uuid,boolean,text) to anon;

-- RPC 18: Admin — flaggen (versteckt aber nicht loeschen)
create or replace function community_admin_flag(p_code text, p_pin text, p_target_type text, p_target_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; is_adm boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  is_adm := community_internal_is_admin(p_code);
  if not is_adm then raise exception 'NOT_ADMIN' using errcode='P0001'; end if;
  if p_target_type not in ('strain','program') then raise exception 'INVALID_TARGET_TYPE' using errcode='P0001'; end if;
  if p_target_type = 'strain' then
    update community_strains  set moderation_status='flagged' where id = p_target_id;
  else
    update community_programs set moderation_status='flagged' where id = p_target_id;
  end if;
  return jsonb_build_object('ok', true);
end
$fn$;
revoke execute on function community_admin_flag(text,text,text,uuid,text) from public, authenticated;
grant   execute on function community_admin_flag(text,text,text,uuid,text) to anon;

-- RPC 19a: Login per Pseudonym (Pseudonym + PIN → Code + Krypto-Felder).
-- Ohne korrekte PIN gibt es KEINEN Code zurueck — Brute-Force-Schutz via
-- csc_internal_verify_pin (failed_attempts/lockout, gleicher Pfad wie csc_login).
create or replace function community_login_by_pseudonym(p_pseudonym text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; v_code text; u record;
begin
  if not community_internal_validate_pseudonym(p_pseudonym) then
    raise exception 'INVALID_PSEUDONYM' using errcode='P0001';
  end if;
  select code into v_code from csc_users where pseudonym = p_pseudonym;
  if v_code is null then
    -- Constant-time-Annaeherung: dummy crypt-Lauf wie in csc_internal_verify_pin
    perform extensions.crypt(p_pin, '$2a$08$abcdefghijklmnopqrstuv');
    raise exception 'AUTH_FAILED' using errcode='P0001';
  end if;
  ok := csc_internal_verify_pin(v_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  select kdf_salt, hkdf_salt, encrypted_seed, encrypted_seed_iv, is_admin into u
    from csc_users where code = v_code;
  return jsonb_build_object(
    'code', v_code,
    'pseudonym', p_pseudonym,
    'is_admin', coalesce(u.is_admin, false),
    'kdf_salt', u.kdf_salt,
    'hkdf_salt', u.hkdf_salt,
    'encrypted_seed', u.encrypted_seed,
    'encrypted_seed_iv', u.encrypted_seed_iv
  );
end
$fn$;
revoke execute on function community_login_by_pseudonym(text,text) from public, authenticated;
grant   execute on function community_login_by_pseudonym(text,text) to anon;

-- RPC 19: Admin — loeschen (Spam-Fall, hart)
create or replace function community_admin_delete(p_code text, p_pin text, p_target_type text, p_target_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; is_adm boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  is_adm := community_internal_is_admin(p_code);
  if not is_adm then raise exception 'NOT_ADMIN' using errcode='P0001'; end if;
  if p_target_type not in ('strain','program') then raise exception 'INVALID_TARGET_TYPE' using errcode='P0001'; end if;
  if p_target_type = 'strain' then
    delete from community_strains  where id = p_target_id;
  else
    delete from community_programs where id = p_target_id;
  end if;
  return jsonb_build_object('ok', true);
end
$fn$;
revoke execute on function community_admin_delete(text,text,text,uuid) from public, authenticated;
grant   execute on function community_admin_delete(text,text,text,uuid) to anon;

-- ════════════════════════════════════════════════════════════════════════════
-- TEIL E — v8.7.2-prep Phase 1b.1: Admin-Bootstrap + Promotion + Audit
-- (idempotent additiv, ans Schema-Ende angehaengt)
-- ════════════════════════════════════════════════════════════════════════════

-- Audit-Tabelle fuer Admin-Aktionen
create table if not exists community_admin_audit (
  id          uuid primary key default gen_random_uuid(),
  admin_code  text not null references csc_users(code) on delete cascade,
  action      text not null check (action in ('bootstrap_first_admin','promote_to_admin')),
  target      text,                                   -- pseudonym oder NULL
  ts          timestamptz not null default now()
);
create index if not exists community_admin_audit_admin_idx on community_admin_audit(admin_code);
create index if not exists community_admin_audit_ts_idx    on community_admin_audit(ts desc);
alter table community_admin_audit enable row level security;
revoke all on community_admin_audit from anon, authenticated;

-- RPC: bootstrap_available — oeffentlich, kein PIN, return ob noch kein Admin existiert.
create or replace function community_bootstrap_available()
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare cnt int;
begin
  select count(*) into cnt from csc_users where is_admin = true;
  return jsonb_build_object('available', cnt = 0, 'admin_count', cnt);
end
$fn$;
revoke execute on function community_bootstrap_available() from public, authenticated;
grant   execute on function community_bootstrap_available() to   anon;

-- RPC: bootstrap_first_admin — der eingeloggte User wird Admin, ABER nur wenn
-- noch keiner existiert. Advisory-Lock + Re-Check verhindern Race-Conditions.
create or replace function community_bootstrap_first_admin(p_code text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; cnt int; lock_obtained boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  -- Globaler Advisory-Lock fuer Bootstrap-Race-Schutz (eindeutige int8 ID)
  select pg_try_advisory_xact_lock(8472623001) into lock_obtained;
  if not lock_obtained then
    raise exception 'BOOTSTRAP_RACE' using errcode='P0001';
  end if;
  -- Re-Check unter Lock
  select count(*) into cnt from csc_users where is_admin = true;
  if cnt > 0 then
    raise exception 'BOOTSTRAP_NOT_AVAILABLE' using errcode='P0001';
  end if;
  -- Promote
  update csc_users set is_admin = true where code = p_code;
  -- Audit
  insert into community_admin_audit (admin_code, action, target) values (p_code, 'bootstrap_first_admin', null);
  return jsonb_build_object('ok', true, 'code', p_code);
end
$fn$;
revoke execute on function community_bootstrap_first_admin(text,text) from public, authenticated;
grant   execute on function community_bootstrap_first_admin(text,text) to   anon;

-- RPC: admin_promote — bestehender Admin ernennt einen anderen User per Pseudonym.
create or replace function community_admin_promote(p_code text, p_pin text, p_target_pseudonym text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $fn$
declare ok boolean; is_adm boolean; target_code text; was_admin boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;
  is_adm := community_internal_is_admin(p_code);
  if not is_adm then raise exception 'NOT_ADMIN' using errcode='P0001'; end if;
  if not community_internal_validate_pseudonym(p_target_pseudonym) then
    raise exception 'INVALID_PSEUDONYM' using errcode='P0001';
  end if;
  select code, is_admin into target_code, was_admin from csc_users where pseudonym = p_target_pseudonym;
  if target_code is null then
    raise exception 'PSEUDONYM_NOT_FOUND' using errcode='P0001';
  end if;
  if target_code = p_code then
    raise exception 'ALREADY_ADMIN_SELF' using errcode='P0001';
  end if;
  if was_admin then
    -- idempotent: kein update noetig, aber Audit-Eintrag spart sich
    return jsonb_build_object('ok', true, 'target', p_target_pseudonym, 'already_admin', true);
  end if;
  update csc_users set is_admin = true where code = target_code;
  insert into community_admin_audit (admin_code, action, target) values (p_code, 'promote_to_admin', p_target_pseudonym);
  return jsonb_build_object('ok', true, 'target', p_target_pseudonym);
end
$fn$;
revoke execute on function community_admin_promote(text,text,text) from public, authenticated;
grant   execute on function community_admin_promote(text,text,text) to   anon;

-- ════════════════════════════════════════════════════════════════════════════
-- SELBST-ANGRIFFS-NOTIZ (Andre macht das live mit curl, analog zu Patch 2)
-- ════════════════════════════════════════════════════════════════════════════
-- 1) Direkte SELECTs auf community_strains/community_programs/... mit Anon-Key
--    → 401/403 (revoke all + RLS)
-- 2) RPC ohne PIN/falscher PIN → AUTH_FAILED
-- 3) Strain-Update als fremder User → NOT_AUTHOR
-- 4) Admin-RPC als nicht-Admin → NOT_ADMIN
-- 5) Pseudonym doppelt registrieren → PSEUDONYM_TAKEN
-- 6) Programm mit ungueltigen Steps → INVALID_STEP_ACTION
-- v8.7.2-prep Phase 1b.1:
-- 7) bootstrap_first_admin zweimal → erstes ok, zweites BOOTSTRAP_NOT_AVAILABLE
-- 8) admin_promote als Nicht-Admin → NOT_ADMIN
-- 9) admin_promote auf nicht-existentes Pseudonym → PSEUDONYM_NOT_FOUND
-- ════════════════════════════════════════════════════════════════════════════
