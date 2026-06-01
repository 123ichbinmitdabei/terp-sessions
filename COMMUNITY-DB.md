# Community-DB — v8.7.2-prep Phase 1a (DORMANT)

> **Status:** Backend-SQL + dormant `communityClient` committed; KEINE UI-Anbindung, kein User-sichtbares Update. Andre muss `community-backend.sql` in Supabase ausführen (additiv zu `csc-backend.sql`) und die Live-Selbst-Angriffe durchführen, bevor die UI-Phase 1b startet.

## 1. Strategischer Pivot

Bis v8.7.1: Sessions sollte ein E2EE-Konsum-Tagebuch werden (`cscCrypto` + verschlüsseltes Session-Tracking via Supabase). Krypto-Stack ist Reviewer-abgesegnet, bleibt dormant verfügbar.

Ab v8.7.2-prep: Wir bauen daneben eine **geteilte Wissensbasis** für Sorten und Programme — Pseudonym-Login, Moderation, Edit-Vorschläge, Bewertungen. Persönliches Tracking bleibt **rein lokal** (Phase 1a fasst nichts Tracking-bezogenes an).

Phase 2 (später): E2EE-Sync wird auf den gleichen User-Account aufgepfropft, sobald rechtliche/UX-Klärung steht. Die Krypto-Felder in `csc_users` bleiben deshalb erhalten und werden in Phase 1a mit zufälligen Dummies befüllt — Phase 2 überschreibt sie dann mit echten Werten.

## 2. Architektur-Übersicht

```
                          ┌────────────────────────────────────────────┐
                          │  Supabase (eu-west-1)                       │
                          │                                            │
                          │  csc_users  (existiert + 3 ALTER-Spalten)  │
                          │    ▶ pseudonym, is_admin,                  │
                          │      last_anonymous_choice                 │
                          │                                            │
                          │  + 7 community_*-Tabellen (Phase 1a)        │
                          │  + csc_sessions etc. (Phase 2, dormant)     │
                          └────────┬───────────────────────────────────┘
                                   │ RPC nur, RLS-deny-all auf Tabellen
                  ┌────────────────┼────────────────┐
                  │                │                │
        ┌─────────▼─────┐  ┌──────▼──────┐ ┌───────▼────────┐
        │ communityClient│  │ cscClient  │ │ cscCrypto      │
        │ (Phase 1a)     │  │ (dormant)  │ │ (dormant)      │
        └────────────────┘  └────────────┘ └────────────────┘
```

**Drei Datenebenen:**

1. **Persönliches Tracking** (rein lokal in `localStorage`, NICHT in Supabase): Sessions, Programme die ich selbst erstellt habe für mein Volcano, Notizen. Bleibt unverändert.
2. **Community-Wissen** (Phase 1a, in Supabase): geteilte Sorten + Programme + Bewertungen + Edit-Vorschläge. Pseudonym-Login.
3. **E2EE-Tracking-Sync** (Phase 2, dormant): wenn ein User Sessions-Sync zwischen Geräten will, läuft das durch `cscCrypto` + die existierenden `csc_sessions`-RPCs. **Nicht in Phase 1a.**

## 3. Datenbank-Schema

### 3.1 `csc_users`-Erweiterung (per `ALTER TABLE`)

| Spalte | Typ | Default | Bedeutung |
|---|---|---|---|
| `pseudonym` | `text` | `NULL` | Eindeutig, vom User gewählt. NULLABLE in Phase 1a damit Bestands-User (aus Patch-2-Tests) nicht crashen. NOT NULL kommt in Paket 12b. Unique-Index per `WHERE pseudonym IS NOT NULL`. |
| `is_admin` | `boolean` | `false` | Moderations-Rolle. Initial nur Andre setzt das manuell via SQL. |
| `last_anonymous_choice` | `boolean` | `true` | Default für „nächste Beitrags-Sichtbarkeit". Wird beim Strain-/Programm-Create auf `NOT p_show_pseudonym` gesetzt → nächstes Mal kommt der gewählte Modus als Default zurück. |

### 3.2 Neue Tabellen (7)

| Tabelle | Zweck | Kern-Felder |
|---|---|---|
| `community_strains` | Sorten-Stammdaten | `id`, `author_code`, `show_pseudonym`, `name`, `genetics`, `thc_percent`, `cbd_percent`, `terpenes[]`, `effects[]`, `aromas[]`, `temp_*`, `description`, `is_factory_seed`, `moderation_status` |
| `community_strain_reviews` | Bewertungen pro Sorte | unique `(strain_id, user_code)`, `stars 1..5`, optional `comment` |
| `community_programs` | Programm-Stammdaten | `id`, `author_code`, `show_pseudonym`, `name`, `description`, `steps jsonb`, `total_duration_sec`, `is_factory_seed`, `moderation_status` |
| `community_program_strains` | n:n Programm ↔ Sorten | PK `(program_id, strain_id)` |
| `community_program_devices` | n:n Programm ↔ Geräte | PK `(program_id, device)` mit Device-Whitelist (12 + `other`) |
| `community_program_reviews` | Bewertungen pro Programm | analog zu strain_reviews |
| `community_edit_proposals` | Edit-Vorschläge | `target_type` (strain/program) + `target_id`, `proposed_changes jsonb`, `status` (pending/accepted/rejected), Resolver-Felder |

**RLS:** Auf jeder Tabelle `enable row level security` + `revoke all from anon, authenticated`. Zugriff ausschließlich über die 19 RPCs.

### 3.3 Erlaubte Device-Identifier (Whitelist)

`volcano-classic, volcano-hybrid, crafty, crafty-plus, mighty, mighty-plus, venty, veazy, plenty, pax-3, puffco-peak-pro, firefly, other`

### 3.4 Erlaubte Step-Actions (für `programs.steps[]`)

`heat_on, heat_off, pump_on, pump_off, set_temperature, wait_until, wait, pump_for, loop_start, loop_end`

## 4. RPC-API-Referenz (19 Stück)

Alle RPCs sind `security definer set search_path = public, pg_temp`, voll-qualifiziert mit `extensions.crypt`/`extensions.gen_salt` (Patch-2-Konvention). Alle haben `revoke from public, authenticated` + `grant to anon`.

### 4.1 Auth (3)

| RPC | Args | Return | Wirft |
|---|---|---|---|
| `community_pseudonym_available` | `p_pseudonym` | `{available: bool}` | `INVALID_PSEUDONYM` |
| `community_register_pseudonym` | `p_code, p_pin, p_pseudonym` | `{ok, pseudonym}` | `AUTH_FAILED`, `INVALID_PSEUDONYM`, `PSEUDONYM_TAKEN` |
| `community_login_by_pseudonym` | `p_pseudonym, p_pin` | `{code, pseudonym, is_admin, kdf_salt, hkdf_salt, encrypted_seed, encrypted_seed_iv}` | `INVALID_PSEUDONYM`, `AUTH_FAILED` |

`community_login_by_pseudonym` macht intern den Pseudonym→Code-Lookup und ruft `csc_internal_verify_pin`. Bei nicht-existentem Pseudonym läuft ein Dummy-`extensions.crypt`-Aufruf für konstante Antwortzeit (verhindert Pseudonym-Enumeration).

### 4.2 Strain (6)

| RPC | Args | Return |
|---|---|---|
| `community_strain_create` | `p_code, p_pin, p_show_pseudonym, p_data` | `{ok, id}` |
| `community_strain_list` | `p_filter?, p_limit?, p_offset?` | `setof jsonb` (mit `author_pseudonym`, `avg_stars`, `review_count`) |
| `community_strain_update_own` | `p_code, p_pin, p_strain_id, p_data` | `{ok}` |
| `community_strain_delete_own` | `p_code, p_pin, p_strain_id` | `{ok}` |
| `community_strain_propose_edit` | `p_code, p_pin, p_strain_id, p_changes, p_comment?` | `{ok, proposal_id}` |
| `community_strain_rate` | `p_code, p_pin, p_strain_id, p_stars, p_comment?` | `{ok, my_stars}` |

### 4.3 Program (8)

| RPC | Args | Return |
|---|---|---|
| `community_program_create` | `p_code, p_pin, p_show_pseudonym, p_data` | `{ok, id}` |
| `community_program_list` | `p_filter?, p_device?, p_limit?, p_offset?` | `setof jsonb` (mit `devices[]`, `strains[]`, `avg_stars`, `review_count`) |
| `community_program_update_own` | `p_code, p_pin, p_program_id, p_data` | `{ok}` |
| `community_program_delete_own` | `p_code, p_pin, p_program_id` | `{ok}` |
| `community_program_propose_edit` | `p_code, p_pin, p_program_id, p_changes, p_comment?` | `{ok, proposal_id}` |
| `community_program_rate` | `p_code, p_pin, p_program_id, p_stars, p_comment?` | `{ok, my_stars}` |
| `community_program_link_strains` | `p_code, p_pin, p_program_id, p_strain_ids[]` | `{ok, count}` |
| `community_program_set_devices` | `p_code, p_pin, p_program_id, p_devices[]` | `{ok, count}` |

### 4.4 Admin (3)

| RPC | Args | Return |
|---|---|---|
| `community_admin_resolve_proposal` | `p_code, p_pin, p_proposal_id, p_accept, p_note?` | `{ok, status}` |
| `community_admin_flag` | `p_code, p_pin, p_target_type, p_target_id, p_reason?` | `{ok}` |
| `community_admin_delete` | `p_code, p_pin, p_target_type, p_target_id` | `{ok}` |

`is_admin` wird intern aus `csc_users` gelesen. Initial setzt Andre das manuell über das Supabase-Dashboard (`update csc_users set is_admin = true where code = '…'`).

## 5. Berechtigungs-Matrix

| Aktion | Anonym | Eingeloggt (User) | Eingeloggt (Admin) |
|---|:---:|:---:|:---:|
| Strain-/Programm-Liste lesen | ✅ | ✅ | ✅ |
| Strain/Programm anlegen | ❌ | ✅ | ✅ |
| Eigene Strain/Programm bearbeiten/löschen | ❌ | ✅ | ✅ |
| Fremde Strain/Programm: Edit-Vorschlag | ❌ | ✅ | ✅ |
| Fremde Strain/Programm: direkt ändern | ❌ | ❌ | ❌ (nur via Resolve-Proposal) |
| Bewerten (1 Bewertung pro User pro Item) | ❌ | ✅ | ✅ |
| Edit-Vorschlag akzeptieren/ablehnen | ❌ | ❌ | ✅ |
| Item flaggen (verstecken) | ❌ | ❌ | ✅ |
| Item hart löschen | ❌ | ❌ | ✅ |

## 6. Phase 1a → Phase 2 Migrations-Pfad

| Tabelle/Spalte | Phase 1a | Phase 2 |
|---|---|---|
| `csc_users.pseudonym` | gewählt beim Register | unverändert |
| `csc_users.kdf_salt` | **Random-Dummy** (16 Byte) | überschrieben mit echtem PBKDF2-Salt |
| `csc_users.hkdf_salt` | **Random-Dummy** (16 Byte) | überschrieben mit echtem HKDF-Salt |
| `csc_users.encrypted_seed` | **Random-Dummy** (32 Byte) | überschrieben mit `AES-GCM(account_seed, passphrase_key)` |
| `csc_users.encrypted_seed_iv` | **Random-Dummy** (12 Byte) | überschrieben mit echtem IV |
| `csc_users.is_admin` | manuell von Andre gesetzt | unverändert |
| `csc_users.last_anonymous_choice` | wird vom Client beim Create-Aufruf gepflegt | unverändert |
| `csc_sessions` (existierend) | unbenutzt | kommt mit Phase 2 |
| `community_*` (neu) | aktiv | unverändert |

**Wichtig für Phase 2:** Wenn ein User die optionale E2EE-Sync-Aktivierung wählt, leitet `cscCrypto.deriveKeyFromPassphrase(passphrase, kdf_salt)` den Passphrase-Key ab, generiert `account_seed`, verschlüsselt → `csc_login`-RPC bekommt die echten Werte per `UPDATE`. Der `code` + `pin` + `pseudonym` bleiben gleich.

## 7. Offene Punkte für den Anwalt

1. **Personenbezogene Daten:** Pseudonyme + Beiträge sind nach DSGVO Art. 4 personenbezogen, sobald sie über `code`/`pin` einem User zugeordnet werden können. **Nicht** Art. 9 (Gesundheitsdaten) — Community-DB enthält keine Konsum-Tracking-Daten, nur Sorten- und Programm-Wissen.
2. **Anti-Spam:** Bewertungen sind via `UNIQUE(strain_id, user_code)` auf eine pro User pro Item begrenzt. Pseudonyme sind unique. Admin-Moderation kann flaggen/löschen.
3. **PIN-Brute-Force:** läuft über `csc_internal_verify_pin` mit failed_attempts/lockout (15 Min nach 5 Versuchen) — gleiches Pattern wie für Phase 2.
4. **Datenschutzerklärung:** muss neu/schlanker formuliert werden, weil der Tracking-Pfad nicht aktiviert ist. Vorschlag: getrennte Abschnitte „Community-Wiki" (Phase 1a) und „Optionale Cloud-Sync" (Phase 2).
5. **Pseudonym-Sichtbarkeit:** Default ist **anonym** (`show_pseudonym=false`). User können pro Beitrag explizit ihr Pseudonym zeigen. Memory-Default merkt sich die letzte Wahl.
6. **Werks-Seed-Daten (`is_factory_seed=true`):** kommen in Paket 12c (Migration der 57+ bestehenden Werks-Sorten ins Community-Schema). In Phase 1a noch leer.

## 8. Anleitung für Andre (Live-Setup)

### 8.1 SQL ausführen

1. Supabase SQL-Editor öffnen.
2. **Reihenfolge wichtig** — `csc-backend.sql` muss zuerst existieren (`csc_users`-Tabelle ist Referenz).
3. Inhalt von `community-backend.sql` komplett einfügen + Run.
4. Erwartung: „Success. No rows returned" ohne Errors. Idempotent — `create or replace function` + `if not exists` ist überall.
5. Verifikation: im Tabellen-Editor → `community_strains` etc. existieren mit leeren Tabellen-Daten. `csc_users` hat neue Spalten `pseudonym`, `is_admin`, `last_anonymous_choice`.

### 8.2 Andre als Admin markieren

Nur einmal nötig:

```sql
update csc_users set is_admin = true where code = 'CSC-XXXX';
-- (Andre's eigener Code aus seinem ersten Register-Versuch)
```

### 8.3 Live-Selbst-Angriffe per `curl` (vor Paket 12b!)

Analog zur Patch-2-Verifikation. Die `_supabase_selfattack`-Skripte aus Paket 10.5/10.6 sind ein guter Startpunkt — analog erweitern für die neuen 19 RPCs. Wichtige Angriffe:

1. **Direkte SELECTs:**
   ```
   curl -H "apikey: $ANON" "$URL/rest/v1/community_strains?select=*"
   curl -H "apikey: $ANON" "$URL/rest/v1/community_programs?select=*"
   ```
   → erwartet `HTTP 401` (RLS-deny-all).

2. **RPC ohne PIN:** `community_strain_create` mit gültigem `p_code` aber falscher PIN → erwartet `AUTH_FAILED`.

3. **Fremde Strain ändern:** User A erzeugt Strain, User B versucht `community_strain_update_own` → erwartet `NOT_AUTHOR`.

4. **Admin-RPC als nicht-Admin:** Random-User versucht `community_admin_resolve_proposal` → erwartet `NOT_ADMIN`.

5. **Pseudonym doppelt:** zwei User probieren das gleiche Pseudonym → zweiter bekommt `PSEUDONYM_TAKEN`.

6. **Ungültige Steps:** `community_program_create` mit `{action:'eval_remote_code'}` → erwartet `INVALID_STEP_ACTION`.

Bei Findings: STOPP, wie üblich. Kein eigenmächtiger Fix.

### 8.4 Was NICHT in Paket 12a ist (kommt später)

- **UI-Anbindung** (Setup-Wizard, Community-Tab, Strain-/Programm-Browser): Paket 12b
- **Werks-Sorten-Migration** (57+ bestehende Sorten ins community_strains importieren als `is_factory_seed=true`): Paket 12c
- **Live-Sync-Features** (lokales Programm → community_programs synct automatisch): Phase 1c
- **E2EE-Tracking-Aktivierung** (echte Krypto-Werte überschreiben Dummies): Phase 2
