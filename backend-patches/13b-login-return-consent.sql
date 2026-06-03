-- ════════════════════════════════════════════════════════════════════════════
-- PATCH 13b (OPTIONAL): Login-RPC liefert data_consent_at zurueck
-- ════════════════════════════════════════════════════════════════════════════
--
-- WAS:    community_login_by_pseudonym gibt zusaetzlich data_consent_at zurueck.
-- WARUM:  Nur damit das Frontend im Community-Profil "Datenschutz-Zustimmung seit:
--         <Datum>" anzeigen kann. OHNE diesen Patch funktioniert alles weiter,
--         die Anzeige zeigt dann lediglich "noch nicht erfasst".
-- ABHAENGIGKEIT: Patch 13 muss vorher eingespielt sein (Spalte muss existieren).
--
-- ⚠️  BACKUP wie bei Patch 13 empfohlen. Dieser Patch ersetzt eine Funktion
--     (CREATE OR REPLACE), Privilegien bleiben dabei erhalten; die GRANT/REVOKE
--     am Ende sind nur zur Sicherheit idempotent wiederholt.
--
-- Diese Definition ist eine 1:1-Kopie der aktuellen Funktion aus csc-backend.sql
-- (Stand v9.0.x), ERGAENZT um data_consent_at im SELECT und im Rueckgabe-Objekt.
-- ════════════════════════════════════════════════════════════════════════════

-- ── START PATCH 13b ─────────────────────────────────────────────────────────
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
  select kdf_salt, hkdf_salt, encrypted_seed, encrypted_seed_iv, is_admin, data_consent_at into u
    from csc_users where code = v_code;
  return jsonb_build_object(
    'code', v_code,
    'pseudonym', p_pseudonym,
    'is_admin', coalesce(u.is_admin, false),
    'kdf_salt', u.kdf_salt,
    'hkdf_salt', u.hkdf_salt,
    'encrypted_seed', u.encrypted_seed,
    'encrypted_seed_iv', u.encrypted_seed_iv,
    'data_consent_at', u.data_consent_at          -- NEU (Patch 13b)
  );
end
$fn$;

revoke execute on function community_login_by_pseudonym(text,text) from public, authenticated;
grant   execute on function community_login_by_pseudonym(text,text) to anon;
-- ── ENDE PATCH 13b ──────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK: dieselbe Funktion ohne die data_consent_at-Zeile erneut einspielen
-- (also den 'data_consent_at'-Eintrag im SELECT und im jsonb_build_object entfernen).
-- Die Original-Definition steht in csc-backend.sql.
-- ════════════════════════════════════════════════════════════════════════════
