# Paket QA2.0 — Verifikation des QA-1-Audits (READ-ONLY)

Datum: 2026-06-08
App-Stand: v9.14.0 (sw.js VERSION = v9.14.0, index.html SW_VERSION_LABEL = v9.14.0)
Quell-Audit: docs/QA-1-AUDIT-2026-06-06.md (Stand damals v9.9.0, Nachtrag-Vermerk v9.10.0)
Methode: Read-only. Jeder QA-1-Befund per Grep gegen den heutigen Code neu lokalisiert (Zeilen sind seit v9.9.0 gedriftet, das File ist von ca. 21.230 auf 21.735 Zeilen und von 1,13 MB auf 1,19 MB gewachsen). Keine Tests gelaufen, kein Code, keine Doku, kein git angefasst. Belege als Datei:Zeile mit Kurzzitat. Wo QA-1 sich seither erledigt hat, ist das vermerkt; wo QA-1 schon damals daneben lag, steht es unter Selbstkritik.

Zusammenfassung in einem Satz: QA-1 war damals fachlich solide, und die vier Folge-Pakete SEC-1, DOC-2, DLG-1 (sowie die schon laufende BUG-B-Arbeit) haben die Top-5 weitgehend vollstaendig abgearbeitet, der groessere strukturelle Rest (Monolith, Em-Dashes, Kontrast, Duplikate, dormante CSC-Befunde) steht unveraendert offen.

---

## 1. High-Funde-Verifikation

QA-1 zaehlte 7 High-Funde. Pruefung Punkt fuer Punkt:

| # | Fund (QA-1) | damals (v9.9.0) | heute (v9.14.0) | Status |
|---|---|---|---|---|
| H1 | PIN-Salt `Math.random()` + einfaches `sha256(salt+pin)` (QA1.4.B1) | index.html:15345 | `setupPin` nutzt jetzt `_pinRandomSalt()` (CSPRNG) + `_pinHashPbkdf2()` (PBKDF2 100k), Helfer 15804-15828, gesetzt 15835-15839 (`PREFS.pinKdf='pbkdf2'`); `_pinVerify` 15816 mit salt-erhaltender Legacy-Migration 15825 | ERLEDIGT (SEC-1, v9.10.0). Korrekt umgesetzt inkl. Migration |
| H2 | Plaintext `sessions_csc_pin` in localStorage (dormant) (QA1.4.C1) | index.html:19348/19355 | unveraendert: `LS.set('sessions_csc_pin', String(pin))` 19835/19842, gelesen 19850/19853; weiter durch `cscEnabled:false` dormant | BESTAETIGT, weiter offen (by design erst vor CSC-Live) |
| H3 | 2 unbeschriftete dynamische Controls (Session-Filter, Zeitplan-Schalter) (QA1.3.A1/A3) | 13900/13901, 14436 | beide jetzt gelabelt: `#sessFilterDev` aria-label="Sessions nach Gerät filtern" (14360), `#sessFilterDays` (14361), `data-toggle-sch` mit `aria-label="Zeitplan ... aktiv"` (14896) | ERLEDIGT (SEC-1) |
| H4 | Native Dialoge als A11Y-Klasse (ca. 70 alert/confirm/prompt) (QA1.2.D) | u.a. 8862, 15341-15550, 20537 | nur noch 1 Treffer fuer `alert/confirm/prompt(` im ganzen File, und der ist ein Kommentar (21003: „KEIN browser-prompt() mehr"). Alles auf `uiAlert/uiConfirm/uiPrompt` umgestellt (z.B. setupPin 15831/15832, removePin 15849, checkBagsLimit 15956, _pioneerShowPathChoice 21032) | ERLEDIGT (DLG-1, v9.11.0). Vollstaendiger als QA-1 erwartete |
| H5 | 1,1-MB-Monolith / ~80% inline JS (QA1.5.A) | ganze Datei | gewachsen auf 1.189.899 Bytes (1,19 MB) / 21.735 Zeilen. Kein Bundle-Split, BIP39 weiter eager (siehe Backlog 8) | BESTAETIGT, unveraendert offen (sogar groesser) |
| H6 | cscCrypto: 2 Befunde in `csc_leave_circle`/`csc_circle_aggregate` (QA1.4 / Backlog 2) | 19392 / backend-SQL | `csc_leave_circle` sendet weiter `p_pin` (19879); dormant; Backend-SQL unveraendert | BESTAETIGT, weiter offen (erst vor CSC-Live) |
| H7 | (QA-1 zaehlt H6+H7 zusammen als „cscCrypto-2-Befunde") | 19392 / SQL | siehe H6 | BESTAETIGT (Doppel-Zaehlung, siehe Selbstkritik 5.3) |

Fazit High: 2 von 7 erledigt (H1 PIN-Salt, H3 A11Y-Labels), H4 sogar voll erledigt statt nur priorisiert, 3 bewusst dormant/offen (H2, H6/H7 = CSC), 1 strukturell offen (H5 Monolith). Keiner der High-Funde war ein False Positive.

---

## 2. Top-5-Empfehlungen-Status

| Empfehlung (QA-1) | Paket | Status | Beleg |
|---|---|---|---|
| 1. PIN-Salt haerten | SEC-1 | VOLLSTAENDIG | `_pinRandomSalt`/`_pinHashPbkdf2` 15804-15828, Legacy-Migration im `_pinVerify` 15825 („Salt bleibt -> Backup-Kompat") |
| 2. Native Dialoge ersetzen | DLG-1 | VOLLSTAENDIG (uebererfuellt) | 0 echte native Dialoge mehr, nur Kommentar-Treffer 21003; PIN-Eingabe, Programm-Variablen und Pioneer-Pfad-Picker (21032 uiPrompt) alle migriert |
| 3. Zwei dynamische Controls labeln | SEC-1 | VOLLSTAENDIG | aria-label an 14360/14361/14896 |
| 4. Diagnose-Kopie barrierefrei machen | SEC-1 + spaeter | VOLLSTAENDIG | Clipboard jetzt gegated: `if(navigator.clipboard && navigator.clipboard.writeText)` (12025) mit `.catch`-Fallback (12026) und else-Toast (12028); „Screenshot"-Hinweis im Hardware-Toast ersetzt (7037: „Setup, Diagnose-TXT, Diagnose-Log kopieren und an Andre senden"), einziger „Screenshot"-Rest ist ein Code-Kommentar (6827) |
| 5. Doku-Staleness | DOC-2 | VOLLSTAENDIG | VOICE-BEFEHLE.md „Stand: v9.10.1 (alle ... live)"; SIRI-Doku (jetzt docs/SIRI-SHORTCUTS-ANLEITUNG.md) „Stand: 2026-06-06, App-Version v9.10.1"; Pioneer-Kommentare „15 Tests, A1-A15 / B0-B15" (20930/20943); P-AUDIT-Vermerk nachgetragen (docs/P-AUDIT-PROGRAMME-2026-06-03.md:9) |

Alle fuenf Top-Empfehlungen sind vollstaendig erledigt. Empfehlung 4 war urspruenglich Medium, wurde aber als Top-5 gefuehrt und mitbehandelt. Anmerkung zu 5: Die SIRI-Doku ist seit QA-1 nach docs/ verschoben worden, QA-1 verwies noch auf den Root-Pfad.

---

## 3. Backlog-24-Durchgang

Severity = Risiko heute. Datei:Zeile per Grep auf v9.14.0 neu verifiziert.

| # | Item | QA-1-Severity | Status heute | heutige Datei:Zeile / Beleg |
|---|---|---|---|---|
| 1 | PIN-Salt Math.random + kein Stretching | High | ERLEDIGT (SEC-1) | geloest 15804-15839 |
| 2 | cscCrypto 2 Befunde (csc_leave_circle/aggregate) | High (CSC-Live) | OFFEN (dormant) | 19879 `p_pin`; backend-SQL |
| 3 | Plaintext sessions_csc_pin | High (CSC-Live) | OFFEN (dormant) | 19835/19842/19850/19853 |
| 4 | Native Dialoge (ca. 70) | High (Klasse) | ERLEDIGT (DLG-1) | nur Kommentar 21003; uiAlert/uiConfirm/uiPrompt durchgaengig |
| 5 | 2 unbeschriftete dynamische Controls | High (A11Y) | ERLEDIGT (SEC-1) | 14360/14361/14896 |
| 6 | prompt() Programm-Variablen Run-Start | Medium | ERLEDIGT (DLG-1, Teil von 4) | kein prompt mehr; Run-Variablen auf uiPrompt-Modal (QA1.6.1-Luecke damit testbar geworden) |
| 7 | BIP39-Mnemonic CSC noch STUB | Medium | OFFEN | 19433/19436 `NOT_IMPLEMENTED_v870prep` (Zeilenkommentar nennt v8.7.1, Drift, siehe 5.2) |
| 8 | 1,1-MB-Monolith / BIP39 eager | Medium | OFFEN (groesser) | jetzt 1,19 MB; BIP39 eager |
| 9 | Manuelle Geraete-Abnahme Run-Engine | Medium | OFFEN (manuell) | README; kein Code-Aspekt |
| 10 | Manueller VoiceOver-Pass Modal-Inert | Medium | OFFEN (manuell) | README; `_a11yObserveOverlays` 20059 vorhanden |
| 11 | clipboard ungeschuetzt + Screenshot-Hinweis | Medium | ERLEDIGT (SEC-1) | Guard 12025, Toast 7037 |
| 12 | --dim Kontrast unter AA (Default) | Medium | OFFEN | unveraendert `--dim:#5a4f42` index.html:36 |
| 13 | Em-Dashes (185) in dt. Prosa | Medium | OFFEN (praktisch unveraendert) | jetzt 184 `—` (1 weniger, kein Sweep gelaufen) |
| 14 | Pioneer 12-vs-15; VOICE/SIRI-Staleness; P-AUDIT-Vermerk | Low (Doku) | ERLEDIGT (DOC-2) | 20930/20943; docs/; P-AUDIT:9. Rest-Drift: README:389 historischer Changelog nennt noch „12 Tests/A1-A12/B0-B11" (bewusst historisch) |
| 15 | Zwei parallele Fokus-Trap-Systeme | Low | OFFEN | FOCUS_SELECTOR/`_focusTrapHandler` 9494-9511 plus Inert-System `_a11yObserveOverlays` 20059 |
| 16 | Zwei Env-Detektoren + 3 Bluefy-Regex | Low | OFFEN | `detectEnv` 11425, `detectPlatform` 18368 |
| 17 | Doppelte btnShortcutsClose-id | Low | OFFEN | statisch 4543, dynamisch 20365 (beide id="btnShortcutsClose") |
| 18 | PIONEERS_EMAIL leer | Low | OFFEN (by design) | `const PIONEERS_EMAIL=''` 11937; Fallback 11340/12073 |
| 19 | BLE _enqueue 3x dupliziert | Low | OFFEN | 10875 (Venty), 11073 (PAX), 11204 (Puffco) wortgleich bis aufs Log-Label |
| 20 | hotelOverlay ohne aria-modal; tourOverlay ohne Dialog-Semantik | Low | TEILWEISE (SEC-1) | hotelOverlay jetzt `aria-modal="true"` (2287) ERLEDIGT; tourOverlay-Dialog-Semantik nicht verifiziert geaendert, vermutlich weiter offen |
| 21 | updateSafety-Interval ungecleart; AutoLock/requirePin-Listener-Hygiene | Low | OFFEN | `setInterval(updateSafety,1000)` 9405 ungecleart (Singleton); setupAutoLock 15924 fuegt 4 Listener ohne remove (15927), aber `noteActivity` stabile Named-Ref (Browser-Dedup) |
| 22 | Firefly/Auto-Extraktion/Lorax TODOs | Low | OFFEN (by design) | 7001, 10973, 11158 (3 TODO, 0 FIXME, unveraendert) |
| 23 | C-Audit „bewusst offen" (TTS-Bluefy, iOS-Haptik, Siri-Rueckkanal) | Low (Plattform) | OFFEN (Plattform) | C-Audit |
| 24 | Datenschutz „in Vorbereitung" | Low | OFFEN (juristisch) | README:12 „in Vorbereitung — wird nach Anwalts-Freigabe veroeffentlicht" |

Backlog-Bilanz: 7 erledigt (1, 4, 5, 6, 11, 14, 20-Teil), 17 offen, davon viele bewusst dormant/manuell/juristisch. Kein Backlog-Eintrag stellte sich als False Positive heraus. Severity-Einstufungen waren damals plausibel.

---

## 4. Versions-Drift (was an QA-1 heute nicht mehr stimmt)

- Versions-Stempel: QA-1 ist auf v9.9.0 datiert, der Nachtrag-Block (Zeile 13) auf v9.10.0. Heute v9.14.0. Alle absoluten Zeilennummern in QA-1 sind um ca. +500 verschoben (File von 21.230 auf 21.735 Zeilen). Konkret z.B. PIN bei QA-1 15341-15550, heute 15804-15919; setupAutoLock 15435 -> 15924; copyDiagnostics/Diagnose-Export 11589 -> 12010-12028; _pioneerShowPathChoice 20537 -> 21028; cscCrypto/csc_leave_circle 19392 -> 19879.
- Bundle-Zahlen veraltet: 1.127.997 Bytes / 21.230 Zeilen ist heute 1.189.899 Bytes / 21.735 Zeilen. QA-1s eigene Notiz „Brief sagte 857 KB, File ist gewachsen" gilt jetzt umso mehr.
- Intervall-Inventar veraltet: QA-1 sagt „12 setInterval / 12 clearInterval, 1 ungecleart". Heute sind es 12 echte `setInterval`-Aufrufe (9102, 9405, 10821, 10826, 10946, 11137, 11285, 14613, 14723, 15554, 15930, 16586), aber mit `breathingTimer` (16586) und dem Run-Countdown (9102) sind neue dazugekommen, die in QA-1s Aufzaehlung so nicht standen. Das ungeclearte Singleton ist weiter `updateSafety` (jetzt 9405 statt 9008). Der grobe Befund haelt, die Liste ist gedriftet.
- DLG-1 hat den ganzen QA1.2.D-Block und QA1.6.1 ueberholt: die „ca. 70 native Dialoge" existieren nicht mehr, der prompt()-Programm-Variablen-Flow (8862) ist verschwunden, der dort beschriebene „nicht E2E-testbar"-Caveat ist obsolet.
- SEC-1 hat QA1.4.B1, QA1.3.A1/A3, QA1.7.B1, QA1.10.G1 und QA1.3.C2 (hotelOverlay) ueberholt.
- DOC-2 hat QA1.8.D/E, QA1.10.D1 und QA1.8.C (P-AUDIT) ueberholt. Zusatz-Drift: VOICE-BEFEHLE.md liegt im Root, SIRI-Doku wurde nach docs/ verschoben (QA-1 zeigte auf Root).
- README-Changelog-Drift (nicht durch DOC-2 abgedeckt, weil bewusst historisch): README:389 nennt fuer das damalige Pioneer-Feature noch „12 Tests / A1-A12 / B0-B11". Das ist ein eingefrorener Changelog-Eintrag, kein Live-Widerspruch, aber wer README liest, koennte stolpern.

---

## 5. Selbstkritik (was QA-1 schon beim damaligen Stand uebersehen oder schief eingeordnet hat)

5.1 Pioneer-Test-Sequenz hat eine Luecke bei B12: Die IDs laufen B0, B1, ..., B11, dann B13, B14, B15 (kein B12). Es sind zwar 15 Items (Count stimmt), aber die ID-Sequenz hat ein Loch. QA-1 hat „15 pro Pfad" korrekt gezaehlt, das fehlende B12 in der ID-Folge aber nicht erwaehnt. Niedrige Relevanz, aber eine echte Inkonsistenz, die schon damals da war.

5.2 BIP39-STUB-Kommentar-Drift war schon zu QA-1-Zeit vorhanden: Backlog 7 nennt nur „STUB NOT_IMPLEMENTED_v870prep", erwaehnt aber nicht, dass die Fehlermeldung selbst veraltet ist (19433/19436: „folgt in v8.7.1" obwohl laengst v9.x). Das ist eigene Doku-Staleness im Code, die QA-1 unter „Doku-Staleness" (Backlog 14/DOC-2) haette mitnehmen koennen, dort aber fehlt.

5.3 Doppelzaehlung in der High-Bilanz: QA-1 sagt im Header „7 High", listet in der Severity-Tabelle (Zeile 22) aber „cscCrypto-2-Befunde" als EINEN Sammelposten und im Backlog als EINEN Eintrag (Backlog 2). Zaehlt man streng, sind die 7 High-Funde nur erreichbar, wenn man die beiden cscCrypto-Befunde getrennt zaehlt, was QA-1 anderswo nicht tut. Die Zahl 7 ist also leicht buchhalterisch. Sachlich kein Fehler, aber die Selbstkonsistenz der Zaehlung ist unsauber.

5.4 setupAutoLock-Listener-Befund war damals schon halb entschaerft und ist es heute auch: QA-1 (QA1.5.C, Backlog 21) markiert „setupAutoLock re-added 4 document-Listener pro Aufruf ohne remove" als Leak-Verdacht und entlastet sich im selben Satz mit „Browser dedupliziert (kein echter Leak)". Das ist eher Info als Low. Heute unveraendert (15927). QA-1 haette es klarer als Nicht-Leak einstufen koennen statt als Backlog-Risiko.

5.5 README-Changelog als Staleness-Quelle uebersehen: QA-1 prueft VOICE-BEFEHLE.md und SIRI-Doku auf „12 vs 15", nennt aber den README-Changelog-Eintrag (389) mit derselben „12 Tests/A1-A12"-Aussage nicht. Da DOC-2 README bewusst historisch laesst, ist das heute kein Schaden, aber QA-1s Staleness-Inventar war an der Stelle unvollstaendig.

5.6 Doppelte btnShortcutsClose-id (Backlog 17) ist korrekt gefunden, aber QA-1 wertet sie nur als „Low Konsistenz". Tatsaechlich ist eine doppelte id ein potenzielles A11Y-/Query-Risiko (`getElementById`/`querySelector('#...')` trifft nur das erste), das in einer App mit zwei Shortcuts-Modalen real fehlleiten kann. Eher Low-Medium als Low. Beide existieren heute weiter (4543 statisch, 20365 dynamisch).

5.7 Positiv-Befund zur Fairness: QA-1s Kern-Aussagen (keine Critical, anon-Key verifiziert, keine eval/Function/document.write, escapeHtml durchgaengig, SW-Cache-Strategie korrekt, 49/49 Modale mit role+aria-modal) sind bei Stichprobe heute weiter haltbar. Die Falsch-Positiv-Quote von QA-1 ist niedrig, kein verifizierter Befund war erfunden.

---

### Gesamturteil
QA-1 war ein verlaessliches Audit. Von den 5 Top-Empfehlungen sind alle 5 vollstaendig erledigt (SEC-1, DOC-2, DLG-1), von den 7 High-Funden 2 erledigt plus 1 voll (H4) ueber Erwartung, der Rest bewusst dormant (CSC) oder strukturell offen (Monolith). Vom 24-Item-Backlog sind 7 erledigt und 17 offen, fast alle offenen sind bewusste Vertagungen (CSC dormant, manuelle Abnahmen, juristisch, Bundle-Refactor). Die Hauptbaustelle bleibt unveraendert der 1,19-MB-Monolith samt eager BIP39, plus die kosmetischen Sweeps (Em-Dashes 184, --dim-Kontrast) und die Duplikat-Konsolidierungen (BLE _enqueue, Env-Detektoren, Fokus-Trap, doppelte id). Vor jeder CSC-Aktivierung bleiben Backlog 2, 3, 7 zwingend.
