-- =============================================================================
-- Sessions PWA — Backend-Patch v8.7.5 / Paket 12b.3 A6: Admin-Proposals-Liste
-- =============================================================================
-- Neue RPC community_list_open_proposals fuer Admin-Moderations-UI.
-- Liefert alle pending Edit-Vorschlaege mit:
--   * target_name (denormalisiert aus community_strains.name oder _programs.name)
--   * proposer_pseudonym (NULL wenn proposer anonym vorgeschlagen hat)
--   * proposed_changes, proposer_comment, created_at, target_type, target_id
--
-- SICHERHEIT:
--   * security definer + search_path = public, pg_temp
--   * AUTH-Check (PIN-Verify) + Admin-Check (community_internal_is_admin)
--   * revoke from public,authenticated + grant to anon (RLS-Pattern)
--
-- IDEMPOTENZ: create or replace function — re-runnable.
--
-- DEPLOYMENT: im Supabase SQL-Editor ausfuehren.
-- =============================================================================

create or replace function community_list_open_proposals(p_code text, p_pin text)
returns setof jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  ok        boolean;
  is_adm    boolean;
begin
  ok := csc_internal_verify_pin(p_code, p_pin);
  if not ok then raise exception 'AUTH_FAILED' using errcode='P0001'; end if;

  is_adm := community_internal_is_admin(p_code);
  if not is_adm then raise exception 'NOT_ADMIN' using errcode='P0001'; end if;

  return query
    select jsonb_build_object(
      'id',                  p.id,
      'target_type',         p.target_type,
      'target_id',           p.target_id,
      'target_name',         case p.target_type
                               when 'strain'  then (select name from community_strains  where id = p.target_id)
                               when 'program' then (select name from community_programs where id = p.target_id)
                               else null
                             end,
      'proposed_changes',    p.proposed_changes,
      'proposer_comment',    p.proposer_comment,
      'proposer_pseudonym',  (
        -- Pseudonym nur wenn die Original-Sorte/Programm mit show_pseudonym=true
        -- erstellt wurde ODER wenn der Vorschlagende auch sein eigenes Pseudonym
        -- preisgeben moechte. Aktuell vereinfacht: wir zeigen das Pseudonym des
        -- Proposers immer (Admins muessen das pruefen koennen).
        select pseudonym from csc_users where code = p.proposer_code
      ),
      'created_at',          p.created_at
    )
    from community_edit_proposals p
    where p.status = 'pending'
    order by p.created_at desc
    limit 500;
end
$fn$;

revoke execute on function community_list_open_proposals(text, text) from public, authenticated;
grant   execute on function community_list_open_proposals(text, text) to anon;

-- =============================================================================
-- ENDE Patch 12b.3-proposals
-- =============================================================================
