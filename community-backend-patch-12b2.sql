-- =============================================================================
-- Sessions PWA — Community Backend Patch v8.7.4 (Paket 12b.2)
-- =============================================================================
-- Ziel: community_strain_list + community_program_list erweitern um optionale
-- Caller-Identifikation (p_caller_code + p_caller_pin), damit die UI pro
-- Listen-Item my_stars (eigene Bewertung) und is_my (eigener Beitrag) anzeigen
-- kann. Ohne diese Felder ist die UI-Spec von 12b.2 (Modul 3 Detail-Ansicht,
-- Modul 8 Sterne-Komponente) nicht sauber umsetzbar.
--
-- DESIGN:
-- * Additiv: keine bestehenden Spalten/Tabellen werden geaendert
-- * Idempotent: re-runnable via drop function if exists + create or replace
-- * Backwards-kompatibel via NAMED-RPC-Call (Supabase PostgREST sendet JSON):
--   - Alter Client {p_filter,p_limit,p_offset} funktioniert weiter
--     (p_caller_code/p_caller_pin defaulten auf null, my_stars/is_my = null/false)
--   - Neuer Client uebergibt zusaetzlich {p_caller_code, p_caller_pin}
-- * Sicherheit: wenn p_caller_code gesetzt aber PIN falsch → AUTH_FAILED.
--   Kein silent-degrade — sonst wuerde der Client unbemerkt "is_my=false" sehen
--   bei tatsaechlich eigenen Beitraegen.
-- * Privacy: my_stars wird NIEMALS ohne valide Auth zurueckgegeben (sonst koennte
--   anyone die Bewertungs-Historie eines Pseudonyms abgreifen).
--
-- DEPLOYMENT:
-- 1. Im Supabase SQL-Editor diesen Patch ausfuehren (DROP+CREATE, idempotent)
-- 2. Live-Verify-Skript von CC bestaetigt my_stars + is_my werden geliefert
-- 3. Client wird in v8.7.4 angepasst (strainList/programList senden caller-Code)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PATCH 1: community_strain_list mit optionalem Caller-Code
-- -----------------------------------------------------------------------------
drop function if exists community_strain_list(text, int, int);

create or replace function community_strain_list(
  p_caller_code text default null,
  p_caller_pin  text default null,
  p_filter      text default null,
  p_limit       int  default 50,
  p_offset      int  default 0
)
returns setof jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  lim         int;
  ofs         int;
  v_caller    text := null;  -- gesetzt wenn PIN-Verify erfolgreich
  v_auth_ok   boolean;
begin
  lim := greatest(1, least(coalesce(p_limit, 50), 200));
  ofs := greatest(0, coalesce(p_offset, 0));

  -- Auth optional: wenn p_caller_code gesetzt, MUSS PIN stimmen.
  if p_caller_code is not null then
    if p_caller_pin is null then
      raise exception 'AUTH_FAILED' using errcode='P0001';
    end if;
    v_auth_ok := csc_internal_verify_pin(p_caller_code, p_caller_pin);
    if not v_auth_ok then
      raise exception 'AUTH_FAILED' using errcode='P0001';
    end if;
    v_caller := p_caller_code;
  end if;

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
      'review_count', (select count(*) from community_strain_reviews r where r.strain_id = s.id),
      -- v8.7.4 NEU: my_stars (eigene Bewertung) nur wenn authentifiziert
      'my_stars', case
        when v_caller is null then null
        else (select stars from community_strain_reviews r where r.strain_id = s.id and r.user_code = v_caller)
      end,
      -- v8.7.4 NEU: is_my (eigener Beitrag) auch fuer anonyme Beitraege erkennbar
      'is_my', case
        when v_caller is null then false
        else (s.author_code = v_caller)
      end
    )
    from community_strains s
    left join csc_users u on u.code = s.author_code
    where s.moderation_status = 'approved'
      and (p_filter is null or s.name ilike '%' || p_filter || '%')
    order by s.is_factory_seed desc, s.created_at desc
    limit lim offset ofs;
end
$fn$;

revoke execute on function community_strain_list(text,text,text,int,int) from public, authenticated;
grant   execute on function community_strain_list(text,text,text,int,int) to anon;


-- -----------------------------------------------------------------------------
-- PATCH 2: community_program_list mit optionalem Caller-Code (analog)
-- -----------------------------------------------------------------------------
drop function if exists community_program_list(text, text, int, int);

create or replace function community_program_list(
  p_caller_code text default null,
  p_caller_pin  text default null,
  p_filter      text default null,
  p_device      text default null,
  p_limit       int  default 50,
  p_offset      int  default 0
)
returns setof jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  lim         int;
  ofs         int;
  v_caller    text := null;
  v_auth_ok   boolean;
begin
  lim := greatest(1, least(coalesce(p_limit, 50), 200));
  ofs := greatest(0, coalesce(p_offset, 0));

  if p_caller_code is not null then
    if p_caller_pin is null then
      raise exception 'AUTH_FAILED' using errcode='P0001';
    end if;
    v_auth_ok := csc_internal_verify_pin(p_caller_code, p_caller_pin);
    if not v_auth_ok then
      raise exception 'AUTH_FAILED' using errcode='P0001';
    end if;
    v_caller := p_caller_code;
  end if;

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
      'strains', (select array_agg(strain_id) from community_program_strains ps where ps.program_id = p.id),
      -- v8.7.4 NEU
      'my_stars', case
        when v_caller is null then null
        else (select stars from community_program_reviews r where r.program_id = p.id and r.user_code = v_caller)
      end,
      'is_my', case
        when v_caller is null then false
        else (p.author_code = v_caller)
      end
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

revoke execute on function community_program_list(text,text,text,text,int,int) from public, authenticated;
grant   execute on function community_program_list(text,text,text,text,int,int) to anon;

-- =============================================================================
-- ENDE PATCH 12b.2
-- =============================================================================
