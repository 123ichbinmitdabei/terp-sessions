-- ════════════════════════════════════════════════════════════════════════════
-- PATCH 13: DSGVO data_consent_at (Terp Sessions, v9.1.0 / Paket N3)
-- ════════════════════════════════════════════════════════════════════════════
--
-- WAS:    Neue Spalte data_consent_at (timestamptz) in csc_users. Sie dokumentiert
--         rechtssicher, WANN ein Nutzer der Datenschutzerklaerung zugestimmt hat.
-- WARUM:  Nachweisbarkeit der Einwilligung (DSGVO). Neue Nutzer bekommen den
--         Zeitpunkt automatisch (DEFAULT now()), bestehende werden per Backfill
--         auf das v9.0.1-Release-Datum gesetzt (siehe unten).
-- WANN:   Vorbereitet 2026-06-03 (Pioneer-Test-Phase).
--
-- ────────────────────────────────────────────────────────────────────────────
-- ⚠️  BACKUP ZUERST: Vor dem Einspielen im Supabase-Dashboard ein On-demand-Backup
--     erstellen (Settings → Database → Backups → "Create backup" bzw.
--     Settings → Backups → On-demand). Dieser Patch aendert ein Schema.
-- ────────────────────────────────────────────────────────────────────────────
--
-- DESIGN-ENTSCHEIDUNG (minimal-invasiv):
--   * Es wird NUR die Tabelle geaendert (ADD COLUMN + Backfill + NOT NULL + DEFAULT).
--   * Die RPC csc_register wird BEWUSST NICHT angefasst: durch DEFAULT now() bekommt
--     jeder neue INSERT den Zeitstempel automatisch, ohne die Funktion zu aendern.
--     Das vermeidet das Risiko, die existierende Funktionssignatur zu treffen.
--   * Kein Audit-Log-INSERT: es existiert keine generische Audit-Tabelle
--     (nur community_admin_audit fuer Admin-Aktionen). Der Patch selbst ist der Beleg.
--   * Die Anzeige des Datums im Profil benoetigt zusaetzlich Patch 13b
--     (erweitert die Login-RPC, damit sie den Wert zurueckliefert). Patch 13b ist
--     OPTIONAL und nur fuer die Frontend-Anzeige noetig, NICHT fuer den Nachweis.
--
-- BACKFILL-BEGRUENDUNG:
--   Echte Nutzer, die sich vor v9.0.1 registriert haben, hatten noch kein explizites
--   Datenschutz-Haekchen. Ihre Registrierung gilt als implizite Einwilligung; als
--   dokumentierter Naeherungswert wird das v9.0.1-Release-Datum (2026-06-03) gesetzt.
--
--   AUSNAHME FACTORY-SYSTEM-DUMMY (code = 'FACTORY', pseudonym 'Werk'): das ist KEIN
--   echter Nutzer (Owner-Referenz fuer die Werks-Sorten, kann sich nicht einloggen,
--   pin_hash = '$$NO_LOGIN_FOR_FACTORY_USER$$'). Er hat nie zugestimmt und bekommt
--   daher 1970-01-01 als "n/a"-Marker, damit der NOT-NULL-Constraint haelt, aber
--   semantisch klar ist, dass keine Einwilligung vorliegt.
-- ════════════════════════════════════════════════════════════════════════════

-- ── START PATCH 13 ──────────────────────────────────────────────────────────

-- 1) Spalte hinzufuegen (zunaechst nullable, damit Backfill moeglich ist)
alter table csc_users
  add column if not exists data_consent_at timestamptz;

-- 2a) Backfill ECHTE Nutzer auf das v9.0.1-Release-Datum (FACTORY ausgenommen)
update csc_users
  set data_consent_at = '2026-06-03 00:00:00+00'
  where data_consent_at is null
    and code <> 'FACTORY';

-- 2b) FACTORY-System-Dummy: n/a-Marker (kein echter Consent)
update csc_users
  set data_consent_at = '1970-01-01 00:00:00+00'
  where data_consent_at is null
    and code = 'FACTORY';

-- 3) Ab jetzt verpflichtend + Default fuer alle neuen Inserts
alter table csc_users
  alter column data_consent_at set not null,
  alter column data_consent_at set default now();

-- ── ENDE PATCH 13 ───────────────────────────────────────────────────────────

-- Verifikation (manuell ausfuehren):
--   select code, pseudonym, data_consent_at from csc_users order by code;
--   -- erwartet: echte User = 2026-06-03, FACTORY = 1970-01-01
--   select count(*) as ohne_consent from csc_users where data_consent_at is null;  -- erwartet: 0

-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (nur falls noetig, in dieser Reihenfolge ausfuehren):
--   alter table csc_users drop column if exists data_consent_at;
-- Hinweis: csc_register wurde von diesem Patch NICHT veraendert, daher ist fuer
-- den Rollback KEINE Wiederherstellung der Funktion noetig.
-- ════════════════════════════════════════════════════════════════════════════
