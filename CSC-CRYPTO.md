# CSC-Mode — Krypto-Doku (v8.7.1-prep, Review-Iteration 1 eingearbeitet)

> **Status:** `cscCrypto`-Modul + E2EE-Backend-Schema sind committed, NICHT live. App-Version bleibt **v8.7.0** für Endnutzer. Das Krypto-Modul ist nicht ans UI angebunden, der dormant `cscClient` wurde NICHT umgebaut (das ist die v8.7.2-Aufgabe). Vor jeder Live-Schaltung ist ein **externes Krypto-Review durch Fachpersonal** dringend empfohlen — siehe Abschnitt 6.
>
> **v8.7.1-prep:** drei Review-Punkte umgesetzt (HKDF mit Per-User-Salt, PBKDF2 auf 1 Mio. Iter, IV-Walkthrough verifiziert + Test-Umfang verdoppelt), Backend-Funktion-für-Funktion-Audit dokumentiert (§ 9). Siehe § 8 für die kompakte Änderungsliste.

## 1. Threat-Model

**Angenommene Angreifer:**
1. **Supabase-Insider / Daten-Leak / Behörden-Anfrage** — bekommen alles, was auf dem Server liegt: anonyme Codes, verschlüsselte Seed-Blobs, verschlüsselte Session-Blobs, Klartext-Aggregat-Zahlen, Zeitstempel.
2. **Person mit gestohlenem CSC-Code** — kann PIN-Brute-Force versuchen (5 Versuche → 15 min Lockout). Selbst mit korrekter PIN kommt sie nur an den verschlüsselten Seed, nicht an die Daten — dazu braucht es die Passphrase.
3. **Person mit dem Gerät eines eingeloggten Users** — sieht alles. Threat-Model „verlorenes/gestohlenes Gerät" liegt außerhalb der Verschlüsselung; dagegen helfen lokale PIN-Locks (App-Einstellung, separat) oder Gerät-Sperre des OS.
4. **Member desselben Kreises** — sieht nur Aggregat-Zahlen (Summe über alle Mitglieder, mit k-Anonymity-Schwelle).
5. **Network-MITM** — sieht TLS-verschlüsselten Traffic zu Supabase. Sieht Größe + Zeitpunkt der Requests, nicht den Inhalt.

**Geschützt durch E2EE:**
- Inhalte aller Session-Datensätze (Stärke, Effekt, Aroma, Notes, Tags, Mood, Purpose, Device, Start-Zeit).
- Der Account-Seed, aus dem alle Daten-Keys abgeleitet werden.

**NICHT geschützt (bewusst dokumentierte Non-Goals):**
1. **Account-Existenz** — der CSC-Code ist Server-bekannt.
2. **Zeitmuster der Aktivität** — wann Sessions hochgeladen werden, wie häufig.
3. **Aggregat-Zahlen** — `csc_circle_contributions.value` ist KLARTEXT, sonst könnte der Server nicht addieren. Wer einem Kreis beitritt, akzeptiert dass die Aggregat-Zahlen den anderen Mitgliedern (und dem Server) im Klartext sichtbar sind. Wer das nicht möchte, lädt keine Beiträge hoch — das System funktioniert lokal weiter.
4. **Schwache Passphrasen** — User-Verantwortung. UI wird mind. 12 Zeichen verlangen und Wortfolge empfehlen. Eine Passphrase wie „123456789012" ist trotz Länge schlecht; das kann das Krypto nicht ausgleichen.
5. **PIN-Brute-Force über Backup-Pfade** — die PIN ist NICHT der Datenschutz, nur der Existenz-Check. Selbst bei PIN-Treffer braucht der Angreifer immer noch die Passphrase, um den Seed zu entschlüsseln.

## 2. Krypto-Stack — Algorithmen, Parameter, Quellen

| Zweck | Algorithmus | Parameter | Quelle |
|---|---|---|---|
| Passphrase → Schlüssel | PBKDF2-HMAC-SHA256 | **1 000 000 Iterationen** (v8.7.1-prep), 16-Byte kdf_salt, 256-Bit-Key | OWASP-Untergrenze 600 000; Reviewer-Empfehlung „mehr darf gerne sein" |
| Seed → Schlüssel | HKDF-SHA256 | **16-Byte hkdf_salt pro User** (v8.7.1-prep) + Info-Tag `"sessions-csc/v1/<purpose>"`, 256-Bit-Output | RFC 5869 |
| Symmetrische Verschlüsselung | AES-256-GCM | 12-Byte-IV (zufällig pro Operation), 16-Byte-Auth-Tag | NIST SP 800-38D |
| Zufalls-Quelle | `crypto.getRandomValues` | CSPRNG des Browsers | Web Crypto API |
| PIN-Hash (Account-Existence) | bcrypt via `pgcrypto` | Cost-Factor 8 | Standard Postgres |
| Account-Seed | 16 zufällige Bytes | = 128 Bit Entropie, BIP39-kompatibel | NIST SP 800-90A (CSPRNG) |

**Implementierung:** ausschließlich `window.crypto.subtle` (Web Crypto API). Kein selbst-implementierter Algorithmus. Kein externer Code. Keine npm-Lib. Modul-Quelltext in `index.html` ist als IIFE `cscCrypto` markiert und durch `v87crypto.mjs` mit 31 Tests abgedeckt (UTF-8/Emoji-Round-Trip, IV-Uniqueness über 100 Operationen, AES-GCM-Auth-Failure bei manipulierten Bytes, PBKDF2-Determinismus, HKDF-Purpose-Trennung).

## 3. Schlüssel-Hierarchie

```
USER-PASSPHRASE  (mind. 12 Zeichen)
       │
       ▼  PBKDF2-HMAC-SHA256 (1 000 000 Iter, kdf_salt)        ← v8.7.1: 600k → 1M
PASSPHRASE-KEY  (AES-256-GCM)
       │
       ▼  AES-GCM(account_seed)  →  encrypted_seed  ──► Supabase (csc_users.encrypted_seed)
       │
       └────────────────────────────────────────────┐
                                                    │
ACCOUNT-SEED  (16 Bytes, BIP39-kompatibel)          │
       │                                            │
       │  + hkdf_salt (16 Bytes Per-User)           │  ← v8.7.1: NEU als Pflicht-Salt für HKDF
       │
       ├──── HKDF(hkdf_salt, info="sessions-csc/v1/master") ─▶ MASTER-KEY
       │
       ├──── HKDF(hkdf_salt, info="sessions-csc/v1/data")   ─▶ DATA-KEY    ──► AES-GCM(JSON-Session)  ──► Supabase
       │
       └──── HKDF(hkdf_salt, info="sessions-csc/v1/agg")    ─▶ AGG-KEY     (für künftige Aggregat-Verschlüsselung)
```

**Begründung für Per-User-Salt (Option C aus Review-Punkt 1):**
Per-User-Salt + Per-Purpose-Info-Tag kombiniert. Sichert zwei Eigenschaften:
- **Salt:** zwei User mit zufällig identischem Seed (sehr unwahrscheinlich, aber theoretisch möglich) bekommen trotzdem unterschiedliche Daten-Keys.
- **Info-Tag:** `data`-Key und `agg`-Key eines Users sind garantiert verschieden, auch bei gleichem Salt.
Salt ist per Definition öffentlich → klartext in `csc_users.hkdf_salt`, analog zu `kdf_salt`.

**Recovery-Pfade:**
- **Passphrase + PIN (Standard-Login):** PIN entsperrt den Account auf dem Server (Brute-Force-geschützt), Passphrase entschlüsselt den lokal heruntergeladenen `encrypted_seed` → Daten-Keys werden abgeleitet.
- **Recovery-Wörter (v8.7.1 geplant):** 12 BIP39-EN-Wörter rekonstruieren den `account_seed` direkt, ohne PIN/Passphrase. Diesen Pfad gibt es in v8.7.0-prep **noch nicht** (`seedToWords`/`wordsToSeed` werfen `NOT_IMPLEMENTED_v870prep`). Begründung im Code-Kommentar: die offiziellen 2048 EN-Wörter müssen byte-genau übereinstimmen. Eine Memory-Reproduktion in dieser Session ist zu fehleranfällig — ein vertauschtes Wort = inkompatibel mit jedem anderen BIP39-Wallet. v8.7.1 wird die Liste aus `bitcoin/bips/master/bip-0039/english.txt` als verifizierte Datei einbinden (SHA-256 gegen kanonischen Hash) und die 24 offiziellen BIP39-Test-Vektoren als Pflicht-Tests fahren.

## 4. Nicht gelöst (zusätzlich zu Threat-Model-Non-Goals)

1. **Schwache Passphrase** — User-Verantwortung. Die UI wird:
   - Mindest-Länge 12 Zeichen erzwingen.
   - Eine Wortfolge empfehlen („großer-blauer-elefant-tanzt").
   - Optional: zxcvbn-style Stärke-Indikator (offline).
2. **Kompromittiertes Gerät** — wer Zugriff auf das entsperrte Gerät hat, kann alle Daten lesen. Lokale PIN-Sperre (App-Einstellung) reduziert das Fenster.
3. **Traffic-Analyse** — Supabase + Netzbeobachter sehen Zeitpunkt und Größe der Requests. Das verrät grob, wie oft eine Person Sessions teilt.
4. **Aggregat-Klartext-Zahlen** — siehe Threat-Model Non-Goal #3.
5. **Recovery NOCH NICHT verfügbar** — siehe Abschnitt 3. Bis v8.7.1 würde Verlust der Passphrase = Daten-Verlust bedeuten. Das ist ein weiteres Argument dafür, die Live-Schaltung NICHT ohne Recovery-Pfad zu machen.
6. **DSGVO bleibt nicht erfüllt** durch E2EE allein — siehe nächster Abschnitt.

## 5. DSGVO-Argumentation

**E2EE ändert die Pflichten nicht grundsätzlich.** Auch verschlüsselte Daten sind personenbezogen, sobald sie über einen Kontostand (CSC-Code, PIN, Passphrase) einer natürlichen Person zuordenbar sind — und das sind sie hier.

| Anforderung | Mit E2EE | Restpflicht für Andre |
|---|---|---|
| Pseudonymisierung | ✅ stärker als zuvor (Inhalte nur per Passphrase entschlüsselbar) | Privacy-Policy ergänzen: „E2EE-Schutz, dennoch personenbezogen" |
| Datensparsamkeit | ✅ Supabase sieht nur Blobs + Aggregat-Zahlen | Aggregat-Klartext im Consent erwähnen |
| Auskunftsrecht | ⏳ Server liefert Blobs raus, aber **nur der User selbst kann sie entschlüsseln** | Auskunft per UI-Export-Funktion (Client-seitig) bauen |
| Löschungsrecht | ✅ `csc_delete_account` cascade-löscht alles | UI-Button + Hard-Confirmation, lokal auch `cscClient.logout()` |
| Auftragsverarbeitung | ⏳ Supabase Inc. bleibt Auftragsverarbeiter | DPA unterschreiben, Supabase EU-Region wählen |
| Verschlüsselungs-Pflicht (Art. 32) | ✅ AES-256-GCM + PBKDF2-600k = stark | im Verzeichnis der Verarbeitungstätigkeiten dokumentieren |
| Anzeige bei Datenpanne (Art. 33/34) | ⏳ Selbst bei DB-Leak: ohne Passphrasen kein Klartext-Leak | Risiko-Bewertung dokumentieren („pseudonyme verschlüsselte Daten") |
| Privacy by Design / Default | ✅ Default-OFF, Passphrase + Recovery erst beim Setup | Onboarding-Flow muss das transparent machen |

**Was Andre vor Go-Live klären muss (zusätzlich zu v8.5.0-prep-Liste):**
1. **Externes Krypto-Review** (siehe nächster Abschnitt) ist **nicht-verhandelbar** bei Gesundheitsdaten + DSGVO Art. 9.
2. **Privacy-Policy** ergänzen: E2EE-Schutz erklären, aber auch die Non-Goals (Aggregat-Klartext, Metadaten, Account-Existenz).
3. **Einwilligungs-Dialog** in der UI vor erster Aktivierung: muss die Passphrase + Recovery-Pflicht erklären, inkl. „bei Verlust der Passphrase ohne Recovery = Daten weg".
4. **Recovery-Pfad** muss in v8.7.1 fertig sein, **bevor** der Aktivierungs-Button für User freigegeben wird.

## 6. Empfehlung externes Krypto-Review

**Klare Empfehlung: vor Live-Schaltung NICHT ohne externes Review starten.** Ich bin ein KI-Assistent, kein Krypto-Auditor. Selbst wenn alle 31 Tests grün sind und die Algorithmen-Auswahl Standard ist, gibt es eine Menge subtiler Fehler, die nur eine zweite menschliche Krypto-Expertin/ein Krypto-Experte verlässlich findet:

- Korrekte Verwendung der Web Crypto API (z.B. `deriveKey` vs. `deriveBits`, key-extractable-Flags)
- Side-Channel-Resistenz der Implementierung
- Sicherer Speicher der entschlüsselten Schlüssel im Browser (sind die `CryptoKey`-Objekte wirklich unauslesbar?)
- DSGVO-spezifische Bewertung des Aggregat-Klartext-Pfades

**Konkrete nächste Schritte für Andre:**
1. Diese Datei + `index.html`-Sektion `cscCrypto` + `csc-backend.sql` + `v87crypto.mjs` an eine/n Krypto-Fachperson(in) zur Review geben.
2. Externe Review-Empfehlungen umsetzen.
3. Dann erst v8.7.1 (UI + cscClient-Umbau) und schließlich v8.7.2 (Live-Aktivierung) machen.

## 7. Selbstkritik (die 3 Krypto-Pflichtfragen)

**1. „Habe ich IRGENDWO eine Krypto-Konstante oder einen Algorithmus selbst erfunden statt Standard zu nehmen?"**

**Nein.** Alle Primitives sind Standard (PBKDF2 / HKDF / AES-256-GCM) und werden ausschließlich über `window.crypto.subtle` aufgerufen. Alle Parameter sind aus etablierten Empfehlungen (OWASP 600 000 PBKDF2-Iter, NIST 12-Byte-IV für AES-GCM, RFC 5869 HKDF-SHA256). Der HKDF-Info-Tag `"sessions-csc/v1/<purpose>"` ist KEIN Geheimnis, sondern ein anwendungsspezifischer Domain-Separator (RFC-5869-konform).

**2. „Wird ein IV oder Nonce IRGENDWO wiederverwendet?"**

**Nein.** `encrypt()` zieht den IV bei jedem Aufruf frisch via `crypto.getRandomValues(new Uint8Array(12))`. Test `v87crypto.mjs` verifiziert: 100 Verschlüsselungen desselben Plaintexts produzieren 100 verschiedene IVs und 100 verschiedene Ciphertexts. Es gibt **keinen** Code-Pfad, der einen IV zwischenspeichert oder ableitet — der einzige IV-Generator-Pfad ist `generateIv()`.

**3. „Hat das Krypto irgendeine Stelle wo ich unsicher bin ob es korrekt ist?"**

In v8.7.0-prep waren drei Stellen markiert. Stand v8.7.1-prep nach Review-Iteration 1:

- ~~**(a) HKDF-Salt = leer:**~~ **RESOLVED in v8.7.1-prep** (Review-Punkt 1). Per-User-Salt + Per-Purpose-Info-Tag eingebaut, siehe Abschnitt 3 + Code-Kommentar `deriveKeyFromSeed`.
- **(b) PBKDF2 vs. Argon2id:** weiterhin offen. Argon2id ist nach wie vor nicht in der Web Crypto API verfügbar; PBKDF2-HMAC-SHA256 mit jetzt **1 000 000 Iterationen** (vorher 600 000, Review-Punkt 2) ist die nächstbeste Standard-Wahl. Externe Review sollte erneut bewerten, ob das für Gesundheitsdaten + DSGVO Art. 32 angemessen ist.
- **(c) `CryptoKey`-Extractable:** weiterhin überprüfungswert. Ich setze `extractable=false` für alle Daten-Keys. Grep über `deriveKey` und `importKey` in `index.html`: bestätigt 5 Stellen, alle mit `false`. Aber Code wächst — sollte mit jedem Crypto-Change neu gegrept werden.

**Keine dieser Unsicherheiten ist ein Show-Stopper** — alle sind Standard-Praxis in WebApp-E2EE. Aber sie verdienen ausdrückliche externe Validierung, bevor Andre auf „Live" drückt.

## 8. Review-Iteration 1 — Erledigt (v8.7.1-prep, 2026-05-31)

Vier Punkte aus dem ersten externen Krypto-Review:

| # | Review-Punkt | Status | Code-Belege |
|---|---|---|---|
| 1 | HKDF-Salt einbauen (Per-User + Per-Purpose) | ✅ implementiert | `generateHkdfSalt()`, `deriveKeyFromSeed(seed, hkdfSalt, purpose)` Pflicht-Signatur, `csc_users.hkdf_salt`-Feld + `csc_register`/`csc_login` RPC-Update; 6 neue Tests inkl. „zwei User mit gleichem Seed aber unterschiedlichen Salts" |
| 2 | PBKDF2 auf 1 000 000 bumpen | ✅ implementiert | `PBKDF2_ITERATIONS = 1000000`, Konstante exposed für Audit, Test-Assert aktualisiert |
| 3 | IV-Handling Doppel-Check | ✅ verifiziert clean | Walkthrough siehe unten; Test 100→1000 Operationen verdoppelt (Set-Größe 1000 = alle unique) |
| 4 | Backend RLS/RPCs Doppel-Check | ✅ Tabelle siehe §9 | 2 Defense-in-Depth-Härtungen markiert — **inzwischen via v8.7.1-prep-Patch geschlossen** (siehe §9-Fußnoten) |

**IV-Walkthrough-Ergebnis (Punkt 3):**
- `generateIv()` (1 Zeile) ruft `crypto.getRandomValues(new Uint8Array(12))` direkt — Standard-CSPRNG, keine Caching.
- `encrypt(key, plaintext)` ruft `generateIv()` synchron bei jedem Aufruf — keine Wiederverwendung, keine Ableitung aus einem Counter, kein Zwischenspeichern.
- `encryptSession()` ruft `encrypt()` — IV-Generierung erbt korrekt.
- Grep nach `iv` im cscCrypto-Block bestätigt: nur Generator-Aufruf + Return + Decrypt-Parameter-Lesen. Keine Variable hält einen IV über mehrere `encrypt()`-Aufrufe.
- **Verdict:** CLEAN. Test bumped von 100 auf 1000 Operationen liefert 1000 unique IVs (Set-Check).

**Migration für etwaige v8.7.0-prep-Test-Backends:** kein Migrationspfad implementiert. Wer ein altes Test-Backend angelegt hat (sehr unwahrscheinlich, das Modul war dormant): `DROP TABLE csc_users CASCADE;` + restliche Tabellen, dann `csc-backend.sql` neu ausführen. Es gibt keine Produktivdaten zu retten.

## 9. Backend-Funktion-für-Funktion-Audit (Review-Punkt 4)

| # | Funktion | search_path | revoke/grant | Validate | owner_code aus PIN |
|---|---|:---:|:---:|:---:|:---:|
| 1 | `csc_internal_generate_code` | ✅ | ✅ (intern, kein grant an anon) | n/a (keine Inputs) | n/a |
| 2 | `csc_internal_verify_pin` | ✅ | ✅ (intern, kein grant an anon) | ✅ PIN-Regex + Code-Regex | n/a |
| 3 | `csc_register` | ✅ | ✅ revoke from public/auth, grant to anon | ✅ alle 5 Inputs validated (PIN, kdf_salt, hkdf_salt, encrypted_seed, encrypted_seed_iv) | n/a (Code wird intern generiert) |
| 4 | `csc_login` | ✅ | ✅ | ✅ via `csc_internal_verify_pin` | ✅ Response enthält nur den verifizierten Code |
| 5 | `csc_push_session` | ✅ | ✅ | ✅ PIN+iv+blob alle validated | ✅ `owner_code = p_code` aus PIN-Verify, NICHT vom Client direkt |
| 6 | `csc_pull_sessions` | ✅ | ✅ | ✅ PIN + limit-clamp (1..1000) | ✅ `where owner_code = p_code` |
| 7 | `csc_join_circle` | ✅ | ✅ | ✅ PIN + circle_id-Regex + Length | ✅ `owner_code = p_code` |
| 8 | `csc_leave_circle` | ✅ | ✅ | ✅ ¹ | ✅ `delete where owner_code = p_code` |
| 9 | `csc_contribute` | ✅ | ✅ | ✅ alle Inputs (PIN, period, metric, value) + member-check | ✅ `owner_code = p_code` |
| 10 | `csc_circle_aggregate` | ✅ | ✅ | ✅ ² | ✅ via member-check |
| 11 | `csc_delete_account` | ✅ | ✅ | ✅ via verify_pin | ✅ `delete where code = p_code` |

**Fußnoten — Defense-in-Depth-Patch v8.7.1-prep:**

¹ **#8 `csc_leave_circle`** hatte ursprünglich keine Length/Regex-Validation für `p_circle_id`. Kein direkter Angriffsvektor — PIN-Auth + DELETE-Idempotenz schützen die Funktion. Aber Konsistenz mit `csc_join_circle` verlangt: gleicher `^[a-z0-9_-]+$`-Regex + Length 3..64. **Eingebaut im v8.7.1-prep-Patch** (gleiches Pattern wie `csc_join_circle`, Beleg im SQL-Kommentar).

² **#10 `csc_circle_aggregate`** validierte `p_circle_id`/`p_period`/`p_metric` nicht direkt. PIN + Member-Check schützten gegen Cross-Circle-Read; Postgres-bind-Vars schützten gegen SQL-Injection. Aber Konsistenz mit `csc_contribute` verlangt: Length/Regex-Checks vor dem Member-Check. **Eingebaut im v8.7.1-prep-Patch** (drei Validations analog zu `csc_contribute` Z. 326-328).

---

**Stand:** v8.7.1-prep (inkl. Defense-in-Depth-Patch) · `cscCrypto` 37/37 Tests grün · 514/514 Gesamt-Regression · NICHT aktiv, NICHT bewerben, externes Review für Punkt b+c aus §7 weiterhin ausstehend (§9 jetzt komplett ✅).
