# Testing-Status — Stand v8.7.0 + v8.7.1-prep

> ⚠️ **Die in §1 bis §5 beschriebene Puppeteer-Suite existiert nicht mehr. Siehe §0.**
> Der aktuelle, gültige Stand steht in §0. Alles darunter ist historische Dokumentation.

## 0. Neustart der Testinfrastruktur (v9.43.0, 2026-07-26)

### Was passiert ist

Die 28 Puppeteer-Suiten aus §1/§5 sind **verloren**. Sie lagen ausschließlich in einem
lokalen Arbeitsordner, der gelöscht wurde. In **keinem** Branch dieses Repos wurde je eine
`.mjs` committet — die Suite war nie versioniert, nur beschrieben. Die Zahlen 514 / 575
und die Suiten-Tabelle unten sind damit nicht mehr nachvollziehbar oder reproduzierbar.

**Konsequenz, ab sofort verbindlich: Tests gehören ins Repo.** Jede neue Suite wird
zusammen mit dem Feature committet, das sie absichert. Eine Testsuite, die nur lokal
existiert, ist keine Testsuite — sie ist eine Behauptung.

### Was stattdessen da ist

Neuaufbau in v9.43.0, bewusst **ohne Puppeteer und ohne Headless-Chrome**. Der Ansatz:
das Inline-JS aus `index.html` extrahieren und in einem `node:vm`-Kontext mit gemocktem
`document`, `navigator.bluetooth` und `localStorage` ausführen. Damit laufen die **echten**
Funktionen der App — `connectBLE`, `autoConnect`, `log`, `setConn`, `detectDevice` — und
keine Nachbauten. Das DOM wird aus der echten `index.html` geparst, IDs, Klassen und
ARIA-Struktur im Test entsprechen exakt dem ausgelieferten Markup.

| Datei | Rolle |
|---|---|
| `run-all.mjs` | Runner. Sammelt jede `v*.mjs` mit `runSuite`-Export automatisch ein. |
| `test-kit.mjs` | DOM-Parser + Selektor-Engine, Mock für BLE/GATT/Storage/Timer, vm-Loader. |
| `v943autoconnect.mjs` | v9.43.0 Auto-Verbindung (Stufe A/B, LRU, Backoff, Schalter). |

```
node run-all.mjs                  alle Suiten
node run-all.mjs v943             nur passende Suiten
node run-all.mjs --timeout=15000  Watchdog pro Test hochsetzen
node run-all.mjs --list           auflisten, nichts ausführen
```

**Stand: 65 / 65 grün in einer Suite, Laufzeit 4,5 s** (vorher: keine lauffähige
Infrastruktur, die Zahl 2131 aus früheren Notizen ist gegenstandslos).

### Warum kein Puppeteer mehr

Ein voller Chrome-Run dauerte laut §Kopfzeile 3–4 Minuten und brauchte Chrome-Kontention.
Der vm-Ansatz lädt die komplette App in ~110 ms. Das macht den Unterschied zwischen
„Tests laufen vor jedem Commit" und „Tests laufen, wenn jemand daran denkt". Der Preis:
kein echtes Rendering und kein echtes Layout. Reine Layout-Regressionen muss weiterhin
ein Mensch oder ein späteres Screenshot-Werkzeug finden.

### Eine neue Suite anlegen

Datei `vXXXname.mjs` neben `run-all.mjs`, mit:

```js
export const meta = { name:'v944xyz', title:'…' };
export function runSuite(t){
  t.before(async () => { … });        // einmal pro Suite
  t.afterEach(() => { … });           // nach jedem Test aufräumen (App-Instanzen schließen!)
  t('beschreibung', async () => { … });
}
```

`runSuite` registriert nur, der Runner führt aus — nur so kann er pro Test einen Watchdog
setzen. Kein Eintrag in `run-all.mjs` nötig, die Datei wird automatisch gefunden.

### Fallstricke, die schon Zeit gekostet haben

- **`app.dispose()` nach jedem Test.** Jede App-Instanz hält einen DOM-Baum und laufende
  Intervalle. Zwanzig offene Instanzen rechnen parallel weiter und sprengen den Heap.
- **`setFastTimers(true)` nie mit `fireReady()` kombinieren.** Der Boot staffelt Dutzende
  Setups per `setTimeout`; gestaucht fallen sie übereinander her. `fireReady()` wirft
  deshalb, wenn Fast-Timer an sind.
- **Ausgabe geht per `fs.writeSync` auf FD 1.** Node puffert stdout blockweise, sobald es
  kein TTY ist. Ohne das sieht ein hängender Test wie ein hängender Runner aus.
- **Der Testname wird vor dem Lauf ausgegeben.** Ein synchron hängender Test lässt sich von
  `Promise.race` nicht abbrechen — aber sein Name steht dann schon auf dem Schirm.

---

# Historisch: Stand v8.7.0 + v8.7.1-prep (Suite verloren, siehe §0)

> Stand 2026-05-31, vor v8.7.2 (BIP39 + UI + CSC-Aktivierung). Erstellt im Rahmen des internen Test-Audits (Paket 10).
> **Phase-A-Baseline:** 514 / 514 grün über 24 Suiten.
> **Phase-B-Erweiterung:** +61 neue Tests in 4 neuen Suiten → **575 / 575 grün über 28 Suiten** (siehe §5).
> Ein voller Test-Run dauert ~3-4 min sequenziell (Chrome-Kontention bei parallelem Run).

## 1. Test-Coverage-Übersicht

24 Puppeteer-Test-Suiten + 11 Helper-/Mock-/Live-Skripte (nicht in der Regression). Jede Suite startet einen lokalen HTTP-Server auf der `index.html` aus dem Repo, lädt sie in headless Chrome, und prüft Code-Pfade per `page.evaluate()`. Die Backend-SQL (`csc-backend.sql`) hat KEINE Test-Coverage — siehe §2.

| Suite | Bereich | Tests |
|---|---|---:|
| `k3.mjs` | v5.0.1 Reconnect-Logic | 7 |
| `v500.mjs` | v5.0.0 Adapter-Foundation (Volcano + UUID-Mapping) | 23 |
| `v501.mjs` | v5.0.1 Crafty/Mighty-Profil + Connect | 24 |
| `v502hotfix.mjs` | v5.0.2.1 Heizkurven-Hotfix | 4 |
| `v51.mjs` | v5.1.0 HA-Export + Migrations-Wizard + Geräte-Touren | 13 |
| `v52pioneers.mjs` | v5.2.0 Pioneers-Beta-Confirmation-Framework | 11 |
| `v60pax.mjs` | v6.0.0 PAX 3 Adapter (Krypto, Auth, Protokoll) | 25 |
| `v70puffco.mjs` | v7.0.0 Puffco Peak Pro Adapter (Auth, Heizung) | 21 |
| `v80firefly.mjs` | v8.0.0 Firefly Probe-Only Erkennung + RE-CTA | 16 |
| `v81ux.mjs` | v8.1.0 UX-Polish (Auto-Theme, friendly Errors, Setup-Akkordeon, Smart-Quick-Actions) | 28 |
| `v82tracking.mjs` | v8.2.0 Session-Tracking (Auto-Detect, Modal, Liste, 3 Visualisierungen, Hinweise, Achievements) | 28 |
| `v83aroma.mjs` | v8.3.0 Aroma-DB-Erweiterung (Filter, Empfehlungen, normAroma) | 20 |
| `v83curves.mjs` | v8.3.0 Heizkurven-Editor (Drag+Drop, Snap, Vorschau) | 18 |
| `v84onboarding.mjs` | v8.4.0 Welcome-Flow + Re-Open + Connect-Hint | 19 |
| `v84voice.mjs` | v8.4.0 Voice-Parser (Befehle, Zahlwörter, TTS, Wake-Word-UI) | 60 |
| `v85csc.mjs` | v8.5.0-prep CSC-Client (mocked fetch — dormant!) | 28 |
| `v85uifix.mjs` | v8.5.0 Run-Card-Z-Index + Split-Screen-Programm | 13 |
| `v85tts.mjs` | v8.5.0 TTS-Events konfigurierbar | 13 |
| `v85sharing.mjs` | v8.5.0 JSON + Share-Link + Schema-Validation | 25 |
| `v85tracking.mjs` | v8.5.0 Tracking konfigurierbar + neue Felder + Schnell-Speichern | 17 |
| `v86qr.mjs` | v8.6.0 Inline-QR-Encoder (Nayuki MIT) | 17 |
| `v86sharebuttons.mjs` | v8.6.0 Teilen-Buttons in Listen + QR im Share-Modal | 10 |
| `v86nocdn.mjs` | v8.6.0 CDN-Audit (grep + sw.js-Shell) | 9 |
| `v87crypto.mjs` | v8.7.1-prep cscCrypto (HKDF-Salt, PBKDF2-1M, IV-Uniqueness, AES-GCM-Auth) | 37 |
| `v87a11y.mjs` | v8.7.0 Accessibility (Skip-Link, Auto-Label, Touch-Targets, Modal-Esc, Undo-Toast) | 28 |
| **Summe** | | **514** |

**Pre-Regression-Helpers / nicht in `run-all.mjs`:**
- `checksyntax.mjs` — JS-Syntax-Check der gesamten `index.html` (extrahiert alle `<script>`-Blöcke, parsed via `new Function()`)
- `livecheck.mjs` — fetcht `123ichbinmitdabei.github.io/terp-sessions/sw.js` und prüft die Live-Version
- `aesbrowser.mjs` / `validate-aes.mjs` — Krypto-Sanity-Checks aus früheren Iterationen
- `phase1.mjs` — alte v4.9.8-Scheduler-Tests (durch v5.x ersetzt)
- `v501mock.mjs` / `v502mock.mjs` / `v60paxmock.mjs` / `v70puffcomock.mjs` — Geräte-Protokoll-Mocks ohne Connect

## 2. Lückenanalyse

### 2.1 Bereiche mit dünner Coverage

| Bereich | Coverage | Lücke |
|---|---|---|
| **Tab-Navigation komplette Hauptseite** | indirekt via Modal-Test | Tab-Reihenfolge nicht E2E geprüft (Skip-Link → Header → Hero → Bottom-Nav) |
| **Modal-Fokus-Trap auf mehreren Modals** | nur Settings-Modal (`v87a11y`) | 28 weitere Modal-IDs unbenutzt |
| **Hochkontrast-Modus Visual-Output** | nur Toggle-Effekt (`v87a11y`) | CSS-Variablen-Werte nach Toggle nicht numerisch verifiziert |
| **Schriftgröße 200% Layout-Stress** | nur `--app-zoom` numerisch (`v87a11y`) | Kein Layout-Brechen-Test (überlappende Buttons, abgeschnittene Texte) |
| **Skip-Link Fokus-Landing** | nur Existenz (`v87a11y`) | Nach Click landet Fokus wirklich in `<main>`? — ungetestet |
| **Programm-Engine E2E (Start → laufen → Stop)** | Run-Card-UI-Komponenten (`v85uifix`) | Kein voller `runProgram()` → 4 Schritte → `stopRun()` Round-Trip |
| **Sharing-Roundtrip** | Schema (`v85sharing`) + Buttons (`v86sharebuttons`) | Kein voller User-Klick → Export → JSON → Import → Vorschau → Apply E2E |
| **Session-Tracking-Modal E2E** | Modal-Felder-Logik (`v82tracking`, `v85tracking`) | Kein voller Auto-Trigger → ausfüllen → speichern → Liste-erscheint |
| **QR-Code-Decode-Test** | Encode-Pfad (`v86qr`) | Kein Decode (außerhalb Scope, da kein Decoder im Repo) |
| **cscCrypto Stress (>10 KB)** | Round-Trip ~10 KB (`v87crypto`) | Sehr große Sessions (100 KB) ungetestet → JSON.parse-Performance, Memory |
| **cscCrypto Passphrase-Unicode** | nur ASCII-Passphrasen | Unicode (z.B. „großer-🌋-elefant") ungetestet |
| **PBKDF2-Performance** | Determinismus (`v87crypto`) | Wie lange dauert 1M-Iter im headless Chrome? Bench-Test fehlt |
| **IV-Uniqueness statistisch tieferes Sampling** | 1 000 IVs (`v87crypto`) | 10 000 IVs für höhere statistische Sicherheit |
| **localStorage-Korruption** | indirekt via PREFS-Migration | Was wenn `vol_programs = "garbage"`? — graceful degraden? |
| **PREFS-Migration alte Strukturen** | Nested-Defaults werden gemerged (`init`) | Alte v4-Struktur ohne `ttsEvents`/`trackingFields` lädt sauber? |
| **Service-Worker-Update-Flow** | nur Existenz (`v86nocdn`) | Alte-Cache → neuer-Cache-Übergang, Versionsanzeige |
| **csc-backend.sql** | 0 Tests | by design — kein Live-Supabase im CI; **dokumentiert in CSC-CRYPTO.md §9 als Live-Verify-Pflicht für Andre** |
| **Echte Screen-Reader-Interaktion** | 0 Tests | by design — VoiceOver/TalkBack/NVDA nicht headless-reproduzierbar; **Pioneers-Test-Nutzer übernehmen das** |

### 2.2 Indirekt getestete kritische Pfade

- `cscClient` (dormant) — wird über mocked fetch getestet, aber kein Pfad ruft ihn produktiv. v8.7.2 wird ihn ersetzen.
- `cscCrypto` — algorithmisch getestet, aber nicht in einem realen End-to-End-Flow durch das `csc-backend.sql`. Erster echter Test passiert in v8.7.2.
- Voice-Wake-Word — UI-Toggle getestet, aber kein realer kontinuierlicher Speech-Recognition-Test (nicht headless-reproduzierbar).

## 3. Risiken-Liste

Top 5 Risiken die v8.7.2-Aktivierung scheitern lassen könnten.

| # | Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **CSC E2EE-Aktivierung scheitert in der Live-Phase, weil cscClient noch nie gegen echtes Supabase + neue 5-Arg-Register-Signatur lief** | med | **high** | v8.7.2 mit Pioneers-Test-Gruppe + cscClient-Umbau-PR separat reviewen; csc-backend.sql nach DROP-CREATE in einem Test-Projekt verifizieren bevor Live |
| 2 | **PBKDF2 1 M Iter ist auf schwachen Android-Phones >3s; Login fühlt sich kaputt an** | med | med | Phase B Performance-Bench (s. §4); v8.7.2 Loading-Indikator im Setup-Wizard PLANEN |
| 3 | **Schriftgröße-200%-Modus bricht ein wichtiges UI-Element (überlappende Buttons im Hero, abgeschnittene Modal-Texte)** | med | med | Phase B Layout-Stress-Test; manuelle Screenshot-Review durch Andre |
| 4 | **localStorage-Korruption (User-Manipulation, alter Browser-Bug) → App crasht beim Start** | low | med | Phase B defensive `JSON.parse`-Fallback-Tests; alle `LS.get`-Pfade auf Default-Werte prüfen |
| 5 | **Tab-Navigation hat einen kaputten Tab-Stop irgendwo in der Hauptseite (z.B. `tabindex=-1` auf einem wichtigen Button)** | low | med | Phase B Tab-Order-Test (Skip-Link → Header → Hero → Bottom-Nav durchlaufen) |

**Ausgelassen aus Top-5 (auch wichtig, aber adressiert):**
- Krypto-Algorithmus-Schwächen: zwei Iterationen externes Review absolviert (siehe `CSC-CRYPTO.md §8`); nicht mehr in Top-5.
- Adapter-Regression: alle 6 Adapter haben ihre eigene Suite + werden bei jedem Push live mit `v500/v501/v60pax/v70puffco/v80firefly` regressed.
- Sharing-Schema-Bypass: schon hart durch `v85sharing` (Validation-Tests) abgedeckt.

## 4. v8.7.2-Vorbereitung — was vor Start klar sein muss

### 4.1 Pflicht-Tests vor v8.7.2

| Test | Warum | Priorität |
|---|---|---|
| PBKDF2-Performance-Bench im headless Chrome | Wenn das schon im CI >2 s dauert: User-Wartezeit ungelöst | **hoch** |
| Tab-Order durch komplette Hauptseite | Blinde Pioneers-Test-Nutzer werden sofort merken wenn ein Tab-Stop kaputt ist | **hoch** |
| Multi-Modal-Fokus-Trap (3-5 verschiedene Modals) | Nur eines (Settings) getestet — andere können stillen Bug haben | mittel |
| Schriftgröße-200%-Layout-Stress | Sehbehinderte Nutzer werden sich sofort beschweren wenn Hero abgeschnitten ist | mittel |
| LS-Korruption-Recovery | Edge-Case, aber dokumentiert besser als wenn echter User crasht | mittel |
| 100-KB-Session-Round-Trip | cscCrypto-Performance + JSON-Stress | niedrig |
| Unicode-Passphrase-Round-Trip | Edge-Case, einfach zu testen | niedrig |

### 4.2 Was CC für v8.7.2 in der Codebase wissen muss

1. **`cscClient` (v8.5.0-prep) nutzt die ALTE Backend-API.** Konkret: alte `csc_register(p_pin)` → neue Signatur `csc_register(p_pin, p_kdf_salt, p_hkdf_salt, p_encrypted_seed, p_encrypted_seed_iv)`. Alte Tests in `v85csc.mjs` mocken die alte Signatur. v8.7.2 muss `cscClient` komplett umbauen ODER eine neue Datei `cscClientV2` daneben legen + `v85csc.mjs` archivieren.

2. **`cscCrypto.deriveKeyFromSeed`** ist seit v8.7.1-prep 3-Arg-Pflicht (`seed, hkdfSalt, purpose`). Alte 2-Arg-Aufrufe werfen `HKDF_SALT_REQUIRED`. Tests verifizieren das.

3. **BIP39 ist NOT_IMPLEMENTED_v870prep.** v8.7.2 muss:
   - `bip39-en.txt` aus `bitcoin/bips/master/bip-0039/english.txt` einchecken
   - SHA-256 als Test-Anker (kanonischer Hash der englischen Liste)
   - `seedToWords` / `wordsToSeed` implementieren (4-Bit-Checksumme aus SHA-256, 12 × 11-Bit-Wort-Indizes)
   - 24 offizielle BIP39-Test-Vektoren als Pflicht-Tests fahren

4. **`csc-backend.sql` Schema-Updates** in v8.7.1-prep waren Breaking Changes. Falls jemand ein v8.5.0-prep oder v8.7.0-prep Test-Backend angelegt hat (sehr unwahrscheinlich, war dormant): `DROP TABLE csc_users CASCADE;` + restliche Tabellen, dann `csc-backend.sql` neu ausführen.

5. **Defense-in-Depth-Validation-Pattern** (aus v8.7.1-prep-Patch) für alle künftigen RPCs befolgen:
   - `p_circle_id`: `^[a-z0-9_-]+$` Regex + Length 3..64
   - `p_period`: Length 4..32 (z.B. "2026-W22")
   - `p_metric`: `^[a-z_]{2,40}$` Regex
   - `p_pin`, `p_code`: in `csc_internal_verify_pin` zentralisiert

6. **Test-Hygiene-Lektion (aus Memory):** Bei 24+ Puppeteer-Suiten back-to-back gibt es transiente Chrome-Errors. Bei einem auffälligen Fail: Suite isoliert re-runnen bevor man Regression annimmt.

### 4.3 Pioneer-Test-Plan-Vorschlag für v8.7.2

1. Andre legt **eigenes Supabase-Projekt in EU-Region** an, führt `csc-backend.sql` aus, trägt URL+Anon-Key in `csc-config.json` ein.
2. Andre führt **die 5 Selbst-Angriffe per `curl`** durch (siehe `CSC-CRYPTO.md §8` Beleg-Liste).
3. **3-5 Pioneer-Nutzer** mit blindem Test (kein User-Manual, nur die App): Registrieren, Passphrase setzen, Recovery-Wörter notieren, Sessions teilen, von zweitem Gerät einloggen, Account löschen → DSGVO-Auskunftsfunktion testen.
4. Erst nach erfolgreichem Pioneer-Test: Aktivierungs-Toggle für general release.

## 5. Phase-B-Erweiterung — was wurde im Audit hinzugefügt

Vier neue Suiten nach Phase-A-Risiko-Priorisierung:

| Suite | Bereich | Tests | Adressiertes Risiko |
|---|---|---:|---|
| `v87a11ydetail.mjs` | A11Y-Detail: Skip-Link-Fokus, HC-CSS-Vars-Wechsel, FS-200, Multi-Modal-Esc (5 Modals), Tab-Order, HC+FS-Kombination | **20** | Risiko #3 (Schriftgröße 200% Layout), Risiko #5 (Tab-Order) |
| `v870flow.mjs` | User-Flow-E2E: Programm-Start/Stop, Sharing-Roundtrip, Session-Note, QR-Roundtrip, Voice-E2E | **18** | Coverage-Lücke „E2E-Flows" aus §2.1 |
| `v87cryptostress.mjs` | cscCrypto-Edge-Cases: 100 KB Session, 4 Unicode/Emoji-Passphrasen, PBKDF2-Performance-Bench, 10 000 IV-Uniqueness, All-Zero-Seed | **12** | Risiko #2 (PBKDF2-Performance verifiziert), Coverage-Lücke „Edge-Cases" |
| `v870defensive.mjs` | LS-Korruption (vol_programs/vol_prefs/sessions/vol_custom_aromas), PREFS-Migration alte v4-Struktur, Reload-Robustheit, Müll-Hash-Import, QR-Überlänge, Voice-ohne-Adapter | **11** | Risiko #4 (LS-Korruption) |
| **Summe** | | **61** | |

### Wichtigster Bench-Befund (Risiko #2 quantifiziert)

`PBKDF2 1 000 000 Iter` im headless Chrome auf dem Test-Rechner: **Median 503 ms** über 3 Samples ([503, 493, 507] ms). Auf modernen Desktops also klar unter 1 s. **Auf einem 3-Jahre-alten Mid-Range-Android-Phone ist mit dem 3–5× erwartbar** — also 1.5–2.5 s. Das **ist akzeptabel mit Loading-Indikator** beim Setup/Login (passiert 1× pro Session), wurde im UI-Wizard für v8.7.2 als Pflicht-Empfehlung dokumentiert.

### 100 KB Session-Performance (Risiko-quantifiziert)
encrypt **10 ms**, decrypt **5 ms** im headless Chrome für 108 055-Byte-JSON. AES-GCM ist hier sehr schnell — Performance-Risiko **nur** bei PBKDF2, nicht bei AES-GCM.

## 6. Was wurde NICHT abgedeckt + warum

| Bereich | Grund |
|---|---|
| Echte Screen-Reader-Interaktion (VoiceOver/TalkBack/NVDA/JAWS) | Nicht headless-reproduzierbar. Pioneer-Test-Nutzer übernehmen. |
| Echte Wake-Word-Continuous-Speech-Recognition | Web Speech API ist nicht headless-reproduzierbar. UI-Toggle ist getestet, Browser-Verhalten nicht. |
| `csc-backend.sql` Live-Tests | Kein Supabase-Test-Projekt im CI. Andre muss vor v8.7.2 manuell mit `curl` die 5 Selbst-Angriffe fahren (siehe `CSC-CRYPTO.md §8`). |
| Visuelle Regression (Screenshot-Diff) | Out-of-Scope; manuelle Sichtprüfung durch Andre. |
| Echte Mobile-Geräte-Touch-Latenz | Headless-Chrome mit `isMobile:true` simuliert, aber kein echtes Touch-Hardware-Verhalten. |
| QR-Decode-Round-Trip | Kein QR-Decoder im Repo. Encode-Validität wird strukturell (SVG-Format, Modul-Größe, Path-Daten-Länge) geprüft. |
| Service-Worker-Update-Flow (alte→neue Version live) | Headless-Cache-Verhalten ≠ produktiver SW-Lebenszyklus. Manuelle Verifikation per Live-Deploy. |
| `cscClient` produktiver Pfad | dormant; wird in v8.7.2 komplett umgebaut. v85csc-Tests testen die alte Mock-Variante, sind aber als Regression sinnvoll bis zum Umbau.
