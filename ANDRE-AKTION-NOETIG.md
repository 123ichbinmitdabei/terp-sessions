# ⛔ ANDRE-AKTION NÖTIG — Paket N3 (DSGVO data_consent_at, v9.1.0)

**Status:** Frontend + SQL-Patches vorbereitet und getestet. **Es wurde noch NICHTS gepusht.**
Der Frontend-Push (v9.1.0) erfolgt erst, nachdem du Patch 13 in Supabase eingespielt und bestätigt hast.

---

## Was du tun musst (ca. 5 bis 10 Minuten)

### 1. Backup erstellen (Pflicht vor Schema-Änderung)
Supabase-Dashboard, Settings, Database/Backups, ein On-demand-Backup anlegen.

### 2. Patch 13 einspielen (MANDATORY, der rechtliche Nachweis)
- Datei: `backend-patches/13-data-consent-at.sql`
- Supabase-Dashboard, SQL-Editor, Inhalt einfügen, **Run**.
- Was er tut: fügt `data_consent_at` zu `csc_users` hinzu, backfillt **echte** Nutzer auf das Release-Datum **2026-06-03**, setzt NOT NULL + DEFAULT now().
- **FACTORY-Sonderfall berücksichtigt:** Der System-Dummy `code='FACTORY'` (Pseudonym „Werk", kann sich nicht einloggen) bekommt **1970-01-01** als n/a-Marker, weil er nie zugestimmt hat. So bricht der NOT-NULL-Constraint nicht und es ist semantisch klar, dass kein Consent vorliegt.
- Bewusst minimal: `csc_register` wird NICHT angefasst (DEFAULT now() reicht für neue Nutzer), kein Audit-INSERT (es gibt keine generische Audit-Tabelle). Spalten-Referenz ist `code` (nicht `user_code`).

### 3. Verifizieren
Im SQL-Editor ausführen:
```sql
select code, pseudonym, data_consent_at from csc_users order by code;
select count(*) as ohne_consent from csc_users where data_consent_at is null;  -- erwartet: 0
```
Erwartung (bei aktuell 3 Usern): `FACTORY` = 1970-01-01, `CSC-8304` und `CSC-5391` = 2026-06-03, `ohne_consent` = 0.

### 4. Patch 13b einspielen (OPTIONAL, nur für die Anzeige)
- Datei: `backend-patches/13b-login-return-consent.sql`
- Nötig, damit das Community-Profil **„Datenschutz-Zustimmung seit: 03.06.2026"** anzeigt.
- Ohne 13b funktioniert alles weiter, die Anzeige steht dann auf **„noch nicht erfasst"**.
- Es ist eine 1:1-Kopie der aktuellen Login-RPC plus eine zusätzliche Rückgabe-Zeile (kein Raten, exakte Definition übernommen). Privilegien bleiben erhalten.

### 5. Mir Bescheid geben
Schreib **„Patch 13 eingespielt"** (und ob 13b auch). Dann mache ich:
- Version-Bump v9.0.4 → v9.1.0
- README-Eintrag, Commit, Push, Tag v9.1.0
- Pages-Build abwarten + Live-Verify

---

## Was schon fertig und getestet ist (noch nicht gepusht)
- **SQL:** `backend-patches/13-data-consent-at.sql` (mandatory) + `backend-patches/13b-login-return-consent.sql` (optional), beide mit Backup-Hinweis und Rollback-SQL.
- **Frontend (index.html):**
  - `communityClient` reicht `data_consent_at` aus der Login-Session durch.
  - Community-Profil zeigt „Datenschutz-Zustimmung seit: <Datum>" (oder „noch nicht erfasst").
  - Neuer Button **„📄 Meine Daten"** im Community-Bereich: lädt eine DSGVO-Auskunft als JSON (Pseudonym, Code, Admin-Status, `data_consent_at`). Persönliche Tracking-Daten bleiben lokal und sind nicht enthalten.
- **Tests:** `v910consent.mjs` (24 Tests) grün; volle Regression grün.
- **Unberührt:** cscCrypto-Modul, alle anderen Backend-RPCs.

## Rollback (falls nötig)
Steht als Kommentar am Ende jeder Patch-Datei. Kurz:
- Patch 13: `alter table csc_users drop column if exists data_consent_at;`
- Patch 13b: Original-Login-RPC aus `csc-backend.sql` erneut einspielen.
