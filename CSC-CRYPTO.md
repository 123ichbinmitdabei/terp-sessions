# CSC-Mode — Krypto-Doku (v8.7.0-prep)

> **Status:** `cscCrypto`-Modul + neues E2EE-Backend-Schema sind committed, NICHT live. App-Version bleibt v8.6.0 für Endnutzer. Das Krypto-Modul ist nicht ans UI angebunden, der bestehende dormant `cscClient` wurde NICHT umgebaut (das ist die v8.7.1-Aufgabe). Vor jeder Live-Schaltung ist ein **externes Krypto-Review durch Fachpersonal** dringend empfohlen — siehe Abschnitt 6.

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
| Passphrase → Schlüssel | PBKDF2-HMAC-SHA256 | 600 000 Iterationen, 16-Byte-Salt, 256-Bit-Key | OWASP Password Storage Cheat Sheet (Stand 2023+) |
| Seed → Schlüssel | HKDF-SHA256 | leeres Salt, Info-Tag `"sessions-csc/v1/<purpose>"`, 256-Bit-Output | RFC 5869 |
| Symmetrische Verschlüsselung | AES-256-GCM | 12-Byte-IV (zufällig pro Operation), 16-Byte-Auth-Tag | NIST SP 800-38D |
| Zufalls-Quelle | `crypto.getRandomValues` | CSPRNG des Browsers | Web Crypto API |
| PIN-Hash (Account-Existence) | bcrypt via `pgcrypto` | Cost-Factor 8 | Standard Postgres |
| Account-Seed | 16 zufällige Bytes | = 128 Bit Entropie, BIP39-kompatibel | NIST SP 800-90A (CSPRNG) |

**Implementierung:** ausschließlich `window.crypto.subtle` (Web Crypto API). Kein selbst-implementierter Algorithmus. Kein externer Code. Keine npm-Lib. Modul-Quelltext in `index.html` ist als IIFE `cscCrypto` markiert und durch `v87crypto.mjs` mit 31 Tests abgedeckt (UTF-8/Emoji-Round-Trip, IV-Uniqueness über 100 Operationen, AES-GCM-Auth-Failure bei manipulierten Bytes, PBKDF2-Determinismus, HKDF-Purpose-Trennung).

## 3. Schlüssel-Hierarchie

```
USER-PASSPHRASE  (mind. 12 Zeichen)
       │
       ▼  PBKDF2-HMAC-SHA256 (600 000 Iter, kdf_salt)
PASSPHRASE-KEY  (AES-256-GCM)
       │
       ▼  AES-GCM(account_seed)  →  encrypted_seed  ──► Supabase (csc_users.encrypted_seed)
       │
       └────────────────────────────────────────────┐
                                                    │
ACCOUNT-SEED  (16 Bytes, BIP39-kompatibel)          │
       │                                            │
       ├──── HKDF(info="sessions-csc/v1/master") ─▶ MASTER-KEY
       │
       ├──── HKDF(info="sessions-csc/v1/data")   ─▶ DATA-KEY    ──► AES-GCM(JSON-Session)  ──► Supabase
       │
       └──── HKDF(info="sessions-csc/v1/agg")    ─▶ AGG-KEY     (für künftige Aggregat-Verschlüsselung;
                                                                  in v8.7.0-prep noch ungenutzt)
```

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

**Ja, drei Stellen** — die müssen vor Live-Schaltung extern geprüft werden:

- **(a) HKDF-Salt = leer:** RFC 5869 erlaubt explizit ein leeres Salt für HKDF, wenn das Input-Keying-Material (hier der `account_seed`) selbst hinreichend zufällig ist (was er ist: 128 Bit aus dem CSPRNG). Standard-Praxis, aber eine externe Review sollte bestätigen, dass kein per-purpose-Salt zusätzlich nötig ist.
- **(b) PBKDF2 vs. Argon2id:** OWASP empfiehlt für neue Systeme bevorzugt Argon2id. Argon2id ist in der Web Crypto API NICHT verfügbar — daher PBKDF2-HMAC-SHA256 mit 600 000 Iter als nächstbeste Standard-Wahl. Eine externe Review sollte einschätzen, ob das für den Use-Case (Cannabis-Konsumdaten) als „angemessen" gemäß DSGVO Art. 32 durchgeht.
- **(c) `CryptoKey`-Extractable:** Ich setze `extractable=false` für alle Daten-Keys (PBKDF2/HKDF-derived). Das bedeutet, sie können nicht per `exportKey` aus dem Browser raus. Eine Review sollte bestätigen, dass es keinen Code-Pfad gibt, der versehentlich `extractable=true` setzt — ich habe das gegrept, aber Code wächst.

**Keine dieser Unsicherheiten ist ein Show-Stopper** — alle sind Standard-Praxis in WebApp-E2EE. Aber sie verdienen ausdrückliche externe Validierung, bevor Andre auf „Live" drückt.

---

**Stand:** v8.7.0-prep · `cscCrypto` 31/31 Tests grün · 480/480 Gesamt-Regression · NICHT aktiv, NICHT bewerben, externes Review ausstehend.
