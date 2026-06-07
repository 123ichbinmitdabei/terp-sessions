# Paket BUG-A — Bug-Report-System Audit (READ-ONLY)

Datum: 2026-06-07
App-Stand: v9.11.0 (live)
Anlass: Pioneer-Test-Woche steht an, Andre 1 Woche abwesend. Das Bug-Report-System ist in dieser Zeit der Haupt-Kommunikationskanal.
Charakter: Reiner Bericht. KEIN Code, KEIN git, KEINE Tests. Zeilennummern beziehen sich auf index.html bei v9.11.0.

---

## 0. Kurzfazit (TL;DR)

Es gibt ein funktionierendes, durchdachtes Bug-Report-System, aber mit drei Risiken, die ausgerechnet in einer betreuungsfreien Test-Woche mit blinden Testern wehtun koennen:

1. **GitHub-Account-Pflicht.** Der eigentliche Absende-Schritt passiert NICHT in der App, sondern auf github.com. Die App oeffnet ein vorausgefuelltes Issue-Formular im neuen Tab; der Tester muss bei GitHub eingeloggt sein und dort selbst „Submit new issue" druecken. Ohne GitHub-Konto kommt kein Report an. Fuer blinde iPhone-Tester ist GitHubs Formular zudem ein fremder, nicht barrierefrei garantierter Kontext.
2. **Attribution ist schwach.** Wer den Bug gemeldet hat, steht nur drin, wenn der Tester in der Community-DB eingeloggt ist (Pseudonym). Sonst „(nicht eingeloggt)". In der Test-Woche koennten also anonyme Reports eintreffen, die Andre niemandem zuordnen kann.
3. **Der Diagnose-Log fehlt im strukturierten Report.** Das Bug-Modal schickt UA, Version, Geraet und Pseudonym mit, aber NICHT die letzten Log-Zeilen. Die liegen nur in einer separaten „Diagnose kopieren"-Funktion. Der wertvollste Debug-Inhalt landet also nicht automatisch im Issue.

Zusatzrisiko Plattform: Der Absprung erfolgt per `window.open(url, '_blank')`. In Bluefy (iOS-WKWebView) ist das Verhalten von `window.open` zu github.com unzuverlaessig (kann blockiert werden oder in-app oeffnen).

Bewertung: Das System ist fuer sehende Tester mit GitHub-Konto solide. Fuer die reale Pioneer-Kohorte (blind, iPhone/Bluefy, oft ohne GitHub-Konto) ist die letzte Meile (GitHub) der Schwachpunkt. Empfehlung in Abschnitt 6.

---

## 1. Bestand: Bug-Report-System heute

Es gibt ZWEI getrennte Wege, plus eine Diagnose-Funktion:

### 1a. Strukturiertes Pioneer-Bug-Modal (`#modalPioneerBugReport`, 3268)
- **Erreichbar nur ueber den Pioneer-Test-Wizard:** im Test-Pfad-Tab bei einer Aufgabe der Button „✗ Funktioniert nicht" (20750) ruft `_pioneerBugReportOpen(testId)` (20831/20993).
- Felder: „Was sollte passieren?" (`pbrExpected`, aus der Test-Beschreibung vorbefuellt), „Was ist stattdessen passiert?" (`pbrActual`, Pflicht), „Wie hast du es gemacht?" (`pbrSteps`, optional). Plus eine Auto-Info-Box, die die mitgeschickten Metadaten anzeigt (21002 bis 21013).
- Submit (`_pioneerBugReportSubmit`, 21040): baut eine GitHub-Issue-URL (`_pioneerBugReportBuildUrl`, 21017), oeffnet sie per `window.open(url,'_blank','noopener')` (21053), markiert die Aufgabe als fail mit `bugReported:true` (+25 Punkte, 21055), Toast „Bug-Issue geoeffnet · +25 Punkte".
- Pflichtfeld-Validierung: ohne „actual" Hinweis „Bitte beschreibe was passiert ist." (21046 bis 21049).

### 1b. Pioneers-Karte (allgemeines Feedback, `#pioneersBody`, 2660)
- `renderPioneersCard` (11687): zeigt Beta-Status-Pills, die 7-Punkt-Selbst-Checkliste (`PIONEER_CHECKS`, 11658) und Buttons.
- „📧 E-Mail" (`pioneerMailto`, 11671) und „🐙 GitHub-Issue" (`pioneerIssueUrl`, 11680) als `<a href>`-Links (11694). Da `PIONEERS_EMAIL=''` (11593), faellt der E-Mail-Button auf die GitHub-Issue-URL zurueck (10996, 11677), beide Buttons landen also auf GitHub.
- „📋 Diagnose-Log kopieren" (`btnDiagExport` → `exportDiagnostics`, 11695/11697).
- Dieser Weg ist freier Text (kein expected/actual/steps), Label „Beta-Test", nicht „Bug".

### 1c. Diagnose (Settings → Daten)
- `btnShowDiag` „Diagnose-TXT" → `showDiagnostics` (9595) und `exportDiagnostics` (11636).

### Repos und Labels
- `PIONEER_GITHUB_REPO` (20882) und `PIONEERS_REPO` (11594) sind beide `123ichbinmitdabei/terp-sessions` (konsistent, kein Mismatch). **Das ist das oeffentliche App-Repo, Issues sind also weltweit sichtbar.**
- Labels: strukturierter Report `pioneers,bug` (21037); allgemeines Feedback `pioneers,beta-test` (11685); Firefly-RE-Pfad `pioneers,firefly-re` (10996).

---

## 2. Diagnose-Infos: was da ist, was fehlt

### Automatisch im strukturierten Issue-Body (`_pioneerBugReportBuildUrl`, 21024 bis 21033)
Vorhanden: expected, actual, steps, Test-ID, App-Version (`SW_VERSION_LABEL`), Browser-UA (voll), Geraet (`State.adapter` displayName/deviceType, sonst „kein Geraet verbunden"), Pseudonym (oder „(nicht eingeloggt)"), Timestamp (ISO). Sauber per `escapeHtml`/`encodeURIComponent`.

### In `exportDiagnostics` (11636 bis 11654), aber SEPARAT (Clipboard)
Vorhanden: Version, Adapter (inkl. Beta-Level), Geraet (inkl. subtype), Browser-UA, Zeit, **die letzten 100 Log-Zeilen** (`#log div`, 11637).

### Was fehlt (wichtig)
- **Der Diagnose-Log ist NICHT im strukturierten Bug-Report.** Das Bug-Modal hat die Metadaten, aber nicht die Log-Zeilen. Genau die braeuchte Andre zum Debuggen. (Befund BUG-A.2a, High.)
- **Kein App-State-Snapshot** im Report (z.B. State.connected, State.heater, aktuelle Temp, laufendes Programm). Die Log-Zeilen decken einiges ab, aber nur wenn `log()` es protokolliert hat.
- **Kein Geraete-/Pfad-Kontext aus dem Pioneer-Test** ueber die Test-ID hinaus (z.B. ob im Screenreader-Modus, ob Mock-Modus). Waere fuer die Einordnung wertvoll.
- **subtype/Beta-Level** sind in exportDiagnostics, aber nicht im Bug-Report-Body (dort nur displayName/deviceType).

---

## 3. User-Flow: Klicks, A11Y, Klarheit

### Klick-Pfad (strukturierter Bug)
Einmalig: Pioneer-Test-Modus aktivieren (Settings-Toggle, jetzt mit barrierefreiem uiConfirm seit DLG-1). Pro Bug: Test-Tab oeffnen, Aufgabe ansteuern, „✗ Funktioniert nicht", „actual" tippen, „Bug auf GitHub melden", dann auf GitHub einloggen (falls noetig) und „Submit new issue". Also etwa 4 bis 5 In-App-Klicks plus der GitHub-Schritt.

### A11Y
- Das Bug-Modal ist sauber: `role="dialog" aria-modal="true"`, `aria-labelledby`, alle Felder mit `<label>`, Status als `aria-live="polite"` (3289). Wird vom Inert-System (v9.7.0) erfasst.
- Seit DLG-1 (v9.11.0) sind im gesamten Flow keine nativen Dialoge mehr (vorher waren confirm/prompt potenzielle Stolpersteine). Gut.
- **Bruchstelle bleibt der Absprung zu GitHub** (`window.open` → github.com). Das ist ein Kontextwechsel in eine fremde, nicht von uns kontrollierte Seite. Fuer VoiceOver-Nutzer in Bluefy ist GitHubs Issue-Formular plus Login eine erhebliche Huerde, und `window.open` in Bluefy ist unzuverlaessig. (Befund BUG-A.3a, High.)
- Die Pioneers-Karte nutzt normale `<a href>`-Links, das ist barrierefrei, aber dieselbe GitHub-Huerde am Ende.

### Klarheit
- Die Modal-Texte sind klar und ermutigend („du musst nur noch Submit klicken"). Aber dieser Satz ist optimistisch: „Submit" passiert auf GitHub und setzt ein Konto voraus. Ein Tester ohne GitHub-Konto sieht ein Login-Formular statt eines Submit-Knopfs. (Befund BUG-A.3b, Medium: Erwartungs-Klarheit.)
- Der strukturierte Weg ist nur im Pioneer-Test-Modus auffindbar. Wer einen Bug ausserhalb einer Test-Aufgabe bemerkt, hat nur den unstrukturierten Pioneers-Karten-Weg. (Befund BUG-A.3c, Medium.)

---

## 4. GitHub-Integration: wie es funktioniert

- **Kein echter Direkt-Submit.** Die App baut eine vorausgefuellte `…/issues/new?title=…&body=…&labels=…`-URL und oeffnet sie. Der Tester sendet das Issue selbst auf GitHub ab. Die App bekommt KEINE Bestaetigung, ob das Issue wirklich erstellt wurde (sie zaehlt die +25 Punkte schon beim Oeffnen, 21055).
- **Repo:** `123ichbinmitdabei/terp-sessions` (oeffentlich). Issues sind oeffentlich lesbar, inklusive UA und Pseudonym. (Befund BUG-A.4a, Medium: Privatsphaere, da UA/Geraet/Pseudonym oeffentlich.)
- **Kein Issue-Template** im Repo wird genutzt; der Body wird komplett aus der URL gebaut (mit Markdown-Ueberschriften, das ist gut).
- **Kein Token/keine API:** rein URL-basiert, also kein Auth-Risiko in der App, aber eben auch kein serverseitiger Empfang.

---

## 5. Fehlende Features (mit Prioritaet)

| ID | Feature | Severity | Begruendung |
|---|---|---|---|
| BUG-A.2a | Diagnose-Log im strukturierten Report mitschicken | **High** | Wertvollster Debug-Inhalt fehlt aktuell im Issue; Andre muss sonst nachfragen, in einer Woche ohne ihn unmoeglich. |
| BUG-A.5a | In-App-Absende-Weg ohne GitHub-Konto | **High** | Ohne GitHub-Konto kommt kein Report an. Alternative: Reports in einen Supabase-Tabellen-Endpoint posten (Community-Backend existiert), oder als kopierbaren Text plus klare „an Andre senden"-Anleitung. |
| BUG-A.3a | Zuverlaessiger Absprung in Bluefy / kein window.open-Bruch | **High** | `window.open` zu github.com ist in Bluefy unzuverlaessig; betrifft genau die Zielplattform. |
| BUG-A.6a | Pioneer-Status/Tester-ID immer mitschicken (auch ohne Login) | **Medium** | Sonst anonyme Reports. Eine lokale Tester-Kennung (z.B. beim Pioneer-Modus-Start vergeben) wuerde Attribution sichern. |
| BUG-A.3c | Globaler „Bug melden"-Einstieg (nicht nur im Test-Wizard) | **Medium** | Bugs passieren auch ausserhalb der Test-Aufgaben; aktuell nur unstrukturiertes Feedback verfuegbar. |
| BUG-A.5b | Schweregrad-Auswahl (kritisch/normal/kosmetisch) | **Medium** | Hilft Andre beim Priorisieren der eingehenden Reports. |
| BUG-A.5c | App-State-Snapshot (connected/heater/temp/running) im Report | **Medium** | Ergaenzt den Log um den Moment-Zustand. |
| BUG-A.4a | Privatsphaere: oeffentliches Repo fuer Reports | **Low bis Medium** | UA/Pseudonym sind oeffentlich. Ggf. privates Issue-Ziel oder Backend-Tabelle. |
| BUG-A.5d | Anhang (Screenshot) | **Low** | Per Issue-URL technisch nicht moeglich; fuer blinde Kohorte ohnehin nachrangig (Text/Log wichtiger). |
| BUG-A.5e | Bestaetigung „Report wirklich erstellt" | **Low** | Aktuell werden Punkte beim Oeffnen vergeben, nicht beim echten Absenden. Kosmetisch, aber Punkte koennen ohne echten Report anfallen. |

Bereits vorhanden (kein Mangel): Reproduktions-Schritte (`pbrSteps`), Geraet-Auto-Erkennung (`State.adapter`), expected/actual-Struktur, Bug-Achievement (`bug_hunter`, 20963; +25 Punkte). Pseudonym wird mitgeschickt, wenn eingeloggt.

---

## 6. Empfehlung fuer das Bug-B-Paket

Ziel: In der betreuungsfreien Woche muessen Reports (a) zuverlaessig ankommen, (b) zuordenbar sein, (c) genug Kontext haben. Die GitHub-Konto-Huerde ist das groesste Risiko.

**Vorschlag, gestaffelt:**

**Bug-B Kern (empfohlen, klein bis mittel):**
1. **Diagnose-Log in den strukturierten Report aufnehmen** (BUG-A.2a). Die letzten N Log-Zeilen plus App-State-Snapshot an den Issue-Body anhaengen. Achtung URL-Laenge: GitHub-Issue-URLs sind begrenzt (praktisch ca. 8 KB), daher Log kuerzen oder, falls zu lang, einen „Diagnose unten einfuegen"-Hinweis plus Auto-Clipboard-Kopie.
2. **Robuster Absende-Fallback** (BUG-A.5a + BUG-A.3a): Wenn `window.open` fehlschlaegt oder kein GitHub vorhanden, den kompletten Report automatisch in die Zwischenablage kopieren und eine klare Anweisung zeigen („Report kopiert, bitte an Andre senden: …"). So geht nichts verloren, auch ohne GitHub-Konto/in Bluefy.
3. **Lokale Tester-Kennung** (BUG-A.6a): beim Aktivieren des Pioneer-Modus eine kurze, stabile Kennung vergeben oder abfragen (jetzt barrierefrei via uiPrompt aus DLG-1) und in jeden Report schreiben.

**Bug-B Plus (groesser, optional):**
4. **Direkter Backend-Empfang**: Reports zusaetzlich in eine Supabase-Tabelle posten (das Community-Backend ist vorhanden, anon-Key reicht fuer Insert mit passender RLS). Damit kommt der Report OHNE GitHub-Konto an und ist nicht oeffentlich. Das ist die nachhaltigste Loesung, braucht aber Andres Backend-Entscheidung und ist daher eher nach der Test-Woche sinnvoll, NICHT als Schnellschuss davor.
5. **Globaler „Bug melden"-Button** (BUG-A.3c) und **Schweregrad** (BUG-A.5b).

**Wichtig fuer die Woche:** Punkte 1 bis 3 sind klein, rein Frontend, kein Backend, und adressieren die drei High-Risiken. Punkt 4 (Backend) sollte NICHT kurz vor der Abwesenheit ueberstuerzt werden.

---

## 7. Geschaetzter Fix-Aufwand pro Item

| Item | Aufwand | Backend noetig? |
|---|---|---|
| BUG-A.2a Log + State in Report (mit URL-Laengen-Handling) | S bis M | nein |
| BUG-A.5a Clipboard-Fallback + Anleitung wenn window.open scheitert | S | nein |
| BUG-A.3a Bluefy-window.open-Absicherung (Erfolg pruefen, Fallback) | S | nein |
| BUG-A.6a Lokale Tester-Kennung (Vergabe + in Report) | S | nein |
| BUG-A.3c Globaler Bug-melden-Einstieg | S bis M | nein |
| BUG-A.5b Schweregrad-Auswahl | S | nein |
| BUG-A.5c App-State-Snapshot | S | nein |
| BUG-A.4a Privates Report-Ziel | M | ggf. ja |
| BUG-A Plus Backend-Empfang (Supabase-Insert + RLS) | L | ja (Andre) |
| BUG-A.5e Echte Submit-Bestaetigung | M (technisch kaum sauber loesbar bei URL-Weg) | nein |

**Empfehlung in einem Satz:** Vor der Test-Woche ein schlankes Bug-B mit Log-im-Report (2a), Clipboard-Fallback (5a/3a) und lokaler Tester-Kennung (6a) bauen, alles Frontend; den Backend-Empfang (Plus 4) bewusst auf nach der Woche legen.

---

## Anhang: belegende Fundstellen (index.html @ v9.11.0)

- Bug-Modal HTML: 3268 bis 3293 (Felder pbrExpected/pbrActual/pbrSteps, pbrAutoInfo, pbrStatus, btnPbrCancel/btnPbrSubmit).
- Trigger: „✗ Funktioniert nicht" 20750, `_pioneerBugReportOpen` 20831/20993; Wiring 21107/21115.
- Submit + URL-Bau: `_pioneerBugReportSubmit` 21040, `_pioneerBugReportBuildUrl` 21017 bis 21038, `window.open` 21053, Punkte 21055.
- exportDiagnostics: 11636 bis 11654 (Log + Metadaten, Clipboard).
- Pioneers-Karte: `renderPioneersCard` 11687, `pioneerMailto` 11671, `pioneerIssueUrl` 11680, Links 11694, Diagnose-Button 11695/11697.
- Repos: `PIONEER_GITHUB_REPO` 20882, `PIONEERS_REPO` 11594, `PIONEERS_EMAIL=''` 11593.
- Bug-Achievement: `bug_hunter` 20963; +25 Punkte-Logik um 20792 bis 20831.
- Selbst-Check-Liste: `PIONEER_CHECKS` 11658.
