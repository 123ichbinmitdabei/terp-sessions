# Autonom Bug-Jagd 3 (Test-Woche-Tag), Logbuch

Mandat (2026-06-08, Andre): „weiter, nächster Tag". Auf Rückfrage Fokus gewählt: **Bug-Jagd + kleine sichere Fixes** (Test-Woche läuft, minimale Störung für aktive Tester). Stand Start: v9.37.0 live. Standregeln wie die Übernacht-Schichten.

## Bug-Jagd

### BJ3-1 (Medium, GEFIXT in v9.38.0) — Geteilte Programm-Links (#prog=) ohne Eingangs-Säuberung
- Ort: checkImportFromUrl (~13996), gegenüber dem Datei-Import importPrograms (9694) + dem schon vorhandenen Helfer _sanitizeImportedSteps (9681).
- Befund (verify-before-fix): Der Datei-Import säubert Schritte längst via `_sanitizeImportedSteps` (Whitelist `_IMPORT_VALID_ACTIONS` inkl. loop_start/loop_end + Wert-Klemmung). Der #prog=-Deeplink-Pfad (auto-getriggert beim Öffnen eines geteilten Links, also die exponiertere Fläche) übernahm `data.s` dagegen ROH, ohne Whitelist, ohne Längen-/Größen-Grenzen. QA2.20.1/20.2/20.3 waren damit nur für den Datei-Pfad erledigt, für den Link-Pfad offen.
- Risiko/Impact: Ein kaputter (abgeschnittener) oder bösartiger Link konnte ein Programm mit ungültigen Aktionen, Riesen-Name/-Beschreibung (Storage-Bloat) oder tausenden Schritten (Render-/expandLoops-Last) anlegen. Engine no-opt unbekannte Aktionen zwar (default-Zweig), aber Größe/Länge blieben ungebremst. Test-Wochen-relevant: Tester teilen Programme per Link.
- Fix (minimal, Infra-Wiederverwendung): Im Deeplink jetzt (a) Base64-Größen-Schutz (>100000 Zeichen -> Ablehnung, vor atob), (b) Name slice(0,80)+trim, Beschreibung slice(0,300), (c) `_sanitizeImportedSteps(data.s)` wie beim Datei-Import, Ablehnung wenn keine gültigen Schritte. Zusätzlich Schritt-Anzahl-Cap (500) IM Sanitizer -> schützt beide Pfade. Keine Engine-/Adapter-Änderung.
- Bewusst NICHT: kein Aktions-Whitelisting neu erfunden (existierte schon); keine Schärfung des Datei-Import-Krypto/Backup-Pfads (außerhalb Scope).

### BJ3-2 (Low-Medium, GEFIXT in v9.39.0) — Mitternachts-Schedule im Editor falsch angezeigt
- Ort: openScheduleEditor (15532).
- Befund: `String(_schEditing.trigger.hour||8)` — dieselbe `||8`-Mitternachts-Klasse wie der v9.33.0-computeNextRun-Beifang, hier im Editor-Zeitfeld. Ein auf 00:xx gesetzter Schedule wurde beim Öffnen als 08:xx angezeigt und beim Speichern (schTime-Wert) auf 8 Uhr verschoben. Die Listen-Anzeige (15483, `String(t.hour)` ohne ||) war schon korrekt -> inkonsistent.
- Test-Wochen-Relevanz: niedrig-mittel (nur wer einen Mitternachts-Schedule editiert), aber es untergrub den v9.33.0-Fix im Edit-Flow.
- Fix: `hour!=null?hour:8`. Verify-before-fix: alle `.hour||`-Stellen gegrept, nur diese eine offen; Listen-Anzeige korrekt bestätigt.

## Pakete

### Paket 1: Import-Härtung, v9.38.0, LIVE
- Test: v938import.mjs 16/16 (Sanitizer-Klemmung/Cap, Deeplink end-to-end feindlich-aber-gültig, zu großer Link abgelehnt, keine-gültigen-Schritte abgelehnt).
- Tester-Update-Baustein: „Geteilte Programm-Links werden jetzt streng geprüft (Größe, Name, Schritte), ein kaputter Link legt kein Müll-Programm mehr an."
- Test/Regression: v938import 16/16, volle Regression 2069/2069 (sauber, kein Flake).
- Live: commit 996572a, Tag v9.38.0, Pages verifiziert.

### Paket 2: Mitternachts-Schedule im Editor, v9.39.0, LIVE
- Test: v939mideditor.mjs 7/7 (00:30 bleibt 00:30, 8/12 Uhr unverändert, Quelle).
- Tester-Update-Baustein: „Auf Mitternacht gesetzte Schedules werden im Editor jetzt korrekt angezeigt (vorher fälschlich 8 Uhr)."
- Test/Regression: volle Regression 2076/2076 (sauber).
- Live: commit 42920aa, Tag v9.39.0, Pages verifiziert.

---

## Abschluss-Bericht (Bug-Jagd-Tag)

### Fokus (auf Rückfrage gewählt): Bug-Jagd + kleine sichere Fixes (Test-Woche läuft)
Begründung: Tester sind aktiv; kleine, gezielte Korrekturen helfen, ohne die App, die sie gerade lernen, umzubauen.

### Funde
- **BJ3-1 (Medium) GEFIXT (v9.38.0)** — #prog=-Deeplink-Import ohne Eingangs-Säuberung (Datei-Import hatte sie längst). Größen-/Längen-Schutz + bestehender Sanitizer + Schritt-Cap. Test-wochen-relevant (Tester teilen Links).
- **BJ3-2 (Low-Medium) GEFIXT (v9.39.0)** — Mitternachts-Schedule im Editor als 08:xx angezeigt + auf 8 Uhr verschoben. Pendant zum v9.33.0-Fix, vervollständigt die Mitternachts-Korrektheit.

### Bewusst NICHT gemacht / Beobachtungen
- Kein drittes Paket heute: zwei saubere Fixes sind ein solider, disziplinierter Tag während der Test-Woche; mehr zu shippen erhöht nur die Störung.
- BJ-4 aus Nacht 2 (verpasster Einmal-„at"-Schedule wird verschoben statt deaktiviert) bleibt eine Strategie-Frage für Andre, nicht eigenmächtig geändert.
- Engine no-opt unbekannte Schritt-Aktionen (default-Zweig) — daher kein neues Aktions-Whitelisting nötig, der bestehende Sanitizer reicht.

### Code-Stellen, die ich selbst nochmal prüfen würde (kein klarer Bug)
- `escape()`/`unescape()` im Base64-De/Encode (deprecated, funktioniert aber); langfristig auf TextEncoder/Decoder umstellen.
- LS.set verschluckt Quota-Fehler still (bekannt, QA2.27.4) — bei sehr großem Notizbuch/vielen Sessions könnte ein Speicher-Voll-Hinweis helfen.

### Empfehlung für Andre
1. Tester-Feedback sichten (Labels `pioneers,*`).
2. BJ-4 entscheiden (Einmal-„at"-Schedule: verschieben oder deaktivieren?).
3. Nach der Test-Woche: Voice-Befehle (L) als nächstes Feature, mit Geräte-Test.

### Bilanz
2 Versionen (v9.38.0, v9.39.0), beide reine Bug-Fixes, getestet, live, Regression sauber grün (2069/2069 bzw. 2076/2076). Verify-before-fix in beiden Fällen entscheidend (existierender Sanitizer wiederverwendet; alle .hour||-Stellen gegrept).

### Cross-Feature-Interaktions-Wächter (neue Suite vdynamic.mjs) — sauber, kein Bug
- Motivation (Sonntag-Abend, freie Wahl): die dynamischen Interaktionen Schedule × laufendes Programm × Verbindung, Safety-Timer-Auto-Start, Auto-Cool-Down hatten KEINE Unit-Tests. Erst gelesen (verify), dann als Dauer-Wächter gesichert.
- Verify-before-fix-Lese-Ergebnis: alles SOLIDE. executeSchedule (15301) Heat-Zweig prüft State.running -> übersprungen + State.connected -> Hinweis. Programm-Zweig verlässt sich auf den runProgram-State.running-Guard (9426) -> kein Doppel-Lauf. maybeAutoCoolDown nur nach MANUELLEM Ballon (12727), nicht im Programm (eigener _enginePumpFor). maybeAutoStartSafety korrekt an cmdHeaterOn (v9.15.0).
- Neue Suite vdynamic.mjs, 12 Checks, 12/12: Heat-Schedule × laufendes Programm (kein Heiz-Befehl), ohne Verbindung (kein Befehl), idle+verbunden (Temp+Heizer), Programm-Schedule × laufend (kein Doppel-Lauf), fehlende Programm-ID (Hinweis), Safety-Auto-Start, Auto-Cool-Down mit/ohne Heizer, Run-Controls ohne Lauf (false statt Crash), komplexes Loop-Programm bis Ende.

#### Zwei Design-Beobachtungen für Andre (kein Bug, keine eigenmächtige Änderung)
1. **Verpasster/übersprungener Einmal-Heat-Schedule wird trotzdem konsumiert:** Feuert ein einmaliger Heat-Schedule, während ein Programm läuft, wird er übersprungen (korrekt), aber scheduleTick setzt danach lastRun + deaktiviert ihn (once). Der geplante Pre-Heat passiert also nie und wiederholt sich nicht. Analog zur BJ-4-Frage. Entscheidung: übersprungene Einmal-Schedules erneut versuchen oder konsumieren? Strategiefrage, daher nur dokumentiert.
2. **pump_for-Default inkonsistent:** Run-Engine nutzt `s.seconds||20` (runStepInterruptible), die Dauer-Schätzung `s.seconds||0` (_stepDurations). Bei pump_for mit seconds=0 würde der Lauf 20s pumpen, die Schätzung 0s zeigen. In der Praxis nie relevant (Editor-Min=1, _sanitizeImportedSteps klemmt auf 1-600), daher kein Fix. Falls je gewünscht: beide auf dieselbe Default-Semantik bringen.

### Tester-Generalprobe (End-to-End-Smoke, neuer permanenter Wächter) — sauber
- Motivation (Andre: „alles perfekt für die Tester"): statt weiter spekulativ Code zu lesen, die echten Tester-Journeys im echten Browser fahren und JEDE JavaScript-Ausnahme + Konsolen-Fehler abfangen. Fängt Integrations-/Laufzeit-Fehler, die Unit-Tests + Code-Lesen verfehlen.
- Neue Suite `vsmoke.mjs` (in run-all.mjs registriert, lokaler Test-Harness), AUSGEBAUT auf 24 Journeys (28 Checks): alle Tabs, Pioneer-Modus, Verbindung simulieren (Mock-Adapter), Programm starten/stoppen, Sorten, Quick-Action, Schedule-Vorlage, Notizbuch/Quick-Feedback/Dashboard, Bug-Report-Build, Statistik-Aufschlüsselung, 14 Voice-/Text-Befehle, Deeplink-Import, FAQ/Onboarding, ALLE 53 Schalter app-weit je 2x, Screen-Reader-Modus, FAQ-Details, Schriftgröße 200%, Backup-Roundtrip, Programm-Editor + Add-Step-Modal-Stacking, Schedule-Editor speichern, Session-Notiz + Bag-Modal, 6 Themes via applyTheme, Voll-Backup-Export, T-Break-Render, PIN-Setzen mit echtem Prompt-Flow + PBKDF2 + Entfernen.
- Ergebnis: **28/28, null pageerror, null unerwartete Konsolen-Fehler** über alle Journeys (inkl. 106 Schalter-Klicks, 6 Themes, echtem PIN-PBKDF2, gestapelten Modalen). Starkes „ist bereit"-Signal.
- Nebenbefund (kein Bug): nur 1 von 53 `[role=switch]` ist DOM-Kind von #tab-setup; die Einstellungs-Schalter leben in einem separaten Settings-Container (eigene Settings-Ansicht), nicht direkt im #tab-setup-Div. Strukturdetail, korrekt.
- Wert: permanenter Smoke-Wächter gegen künftige Integrations-Regressionen.

### Deep-Dive Voice-Parser (dokumentiert, kein Ship) — solide
- Gewählt als tiefste Prüfung (höchster Test-Wochen-Wert: blinder Tester nutzt Voice am meisten).
- parseGermanNumber (13544) + _GER_NUM_RE-Extraktion (13574) für realistische Vape-Temps durchgespielt: 180 (hundertachtzig), 185 (hundertfuenfundachtzig), 200 (zweihundert), 220 (zweihundertzwanzig), 225, 300, 102, 81 — alle korrekt. Extraktions-Alternation ist richtig geordnet (Compound vor Single, sonst würde „hundertachtzig" zu „hundert" trunkiert). Beide (Parser + Extraktion) konsistent.
- Befehl-Reihenfolge im Parser geprüft: pumpFor VOR pumpOn/pumpOff (sonst würde „pumpe 20 sekunden" als pumpOn fehlgreifen), abortProgram VOR stopAll, heater VOR stopAll, tempUp/Down VOR Digit-Temp. `\b`-Grenzen verhindern Fehltreffer (z.B. „pumpe einundzwanzig" triggert NICHT pumpOn via „ein"). Digit-Temps werden downstream via cmdSetTemp geklemmt.
- Bekannte (akzeptierte) Grenze, kein Bug: Pump-Sekunden per Voice nur als Ziffern, nicht als Zahlwort. Misfire-frei.
- Kein Fund. Voice-Parser ist robust gebaut.

### Runde ohne Fund (dokumentiert, kein Ship) — XSS-Escaping + Temp-Clamp konsistent
- XSS-Sweep: alle HTML-Renders von User-Daten (Programm-/Sorten-Namen, Session-Notizen, Pseudonym) nutzen escapeHtml; bare `${...name}`-Interpolationen sitzen ausnahmslos in sicheren Kanälen (uiConfirm/toast/log/srAnnounce/ttsSay = textContent, oder setAttribute, oder App-Konstanten). sessionRowHtml escaped Notizen. Kein Fund.
- Temp-Clamp-Sweep: alle State.target-Zuweisungen sind entweder geräte-gemeldete Werte oder über cmdSetTemp/Adapter range-geklemmt/-geguardet. Kein unclamped User-Input-Pfad. Kein Fund.
- Bewusst KEIN Ship: kein marginaler Fix erfunden. Saubere Sweeps sind selbst ein Ergebnis (bestätigen Härtung). Trefferquote sinkt erwartungsgemäß nach QA-1/QA-2 + Kampagnen.

### BJ3-4 (Low-Medium, Korrektheit, GEFIXT in v9.42.0) — Programm-Dauer ignorierte Schleifen
- Ort: estimateDuration (12749), Aufrufer progCard (8632) + Import-Bestätigung (14015) ohne Vor-Expansion.
- Befund: estimateDuration hatte keinen loop_start/loop_end-Switch-Zweig -> Schleifen-Körper wurde nur 1x gezählt. 5 von 7 Aufrufern expandierten schon mit `expandLoops(...)` vorher (jemand kannte die Lücke), aber progCard und die Import-Bestätigung übergaben rohe Schritte -> zu kurze „~X min" bei Loops (z.B. „3× [60s]" als ~1 min statt ~3 min).
- Verify-before-fix: alle estimateDuration- und expandLoops-Aufrufer gegrept; expandLoops ist rein + idempotent, hatte aber einen Toast-Nebeneffekt beim Loop-Cap.
- Fix: expandLoops bekommt `silent`-Param (Toast-Guard), estimateDuration expandiert intern `expandLoops(steps, true)` -> korrekt für ALLE Aufrufer, Doppel-Expansion idempotent (vor-expandierende Aufrufer bleiben korrekt). runProgram-Expansion unverändert (toastet weiter beim Cap).
- Test: v942loopdur.mjs 12/12 (Loop 3x/2x, verschachtelt, ohne-Loop unverändert, Idempotenz).

### BJ3-3 (Medium, A11Y/Sicherheit, GEFIXT in v9.41.0) — Sicherheits-Timer-Eingabe falsch beschriftet
- Ort: #sInput (2565), Steuerung-Tab, „Auto-Aus nach (Minuten)".
- Befund: `aria-label="Wartezeit in Sekunden"` (Copy-Paste-Rest), während der sichtbare Label-Text „Auto-Aus nach (Minuten)" sagt und startSafety (9619) den Wert als Minuten interpretiert (×60000). Der sichtbare `<label>` hat kein `for`, ist also NICHT mit dem Feld verknüpft -> das falsche aria-label war der einzige Screen-Reader-Name. Ein blinder Tester hätte „Sekunden" gehört und den Auto-Aus-Wert falsch eingeschätzt (sicherheitsrelevant: erwartet Abschaltung in 20 Sekunden statt 20 Minuten, oder setzt absichtlich kleine Werte).
- Verify-before-fix: alle `aria-label="...Sekunden"` gegrept; nur #sInput ist auf einem Minuten-Feld falsch (#pInput Pumpe-Sekunden und #dirSecInput Direkt-Zug-Sekunden sind echte Sekunden-Felder, bleiben). Funktion via Test belegt: Wert 5 -> 300000ms Restzeit (= 5 Minuten).
- Fix: aria-label -> „Sicherheits-Timer, Auto-Aus nach Minuten". Reine Label-Korrektur, keine Funktionsänderung.
- Test: v941ariafix.mjs 7/7.

### Nachtrag: Paket 3, v9.40.0, LIVE — BJ-4 entschieden (Andre)
Andre-Entscheidung: verpasste EINMALIGE Schedules deaktivieren statt verschieben. Umgesetzt im scheduleTick-Missed-Branch: `repeat==='once'` -> enabled=false/nextRun=null; wiederholende weiterhin auf nächste Zukunft neu berechnen. Hält zugleich den v9.36.0-Anti-Churn (verpasste „in X Min" once). Vorher feuerte ein verpasster Einmal-Uhrzeit-Schedule überraschend am Folgetag. Bewusst silent (kein Startup-Toast), der Schedule bleibt deaktiviert in der Liste sichtbar. Tests v940schedonce.mjs 8/8 (inkl. Beleg, dass computeNextRun einen Zukunfts-Tag GEFUNDEN hätte, wir aber trotzdem deaktivieren). v936bugjagd weiterhin 10/10.
