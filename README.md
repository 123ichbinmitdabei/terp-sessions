# Terp Sessions — Vape Controller (v9.37.0)

Web-App zur Steuerung von Storz & Bickel Vaporizern, PAX 3 (Beta) und Puffco Peak Pro (Beta). Firefly: Erkennung + Reverse-Engineering-Aufruf (Probe-Only). Single-File HTML PWA.

## Über dieses Projekt

**Terp Sessions** ist ein **privates Open-Source-Forschungsprojekt von Andre Reiche** für eine geschlossene Pioneer-Tester-Gruppe.

Dies ist **kein kommerzielles Produkt**, kein Anspruch auf Marken- oder Patentrechte. Verwendung auf eigene Verantwortung. Storz & Bickel, PAX, Puffco, Firefly sind eingetragene Marken der jeweiligen Hersteller und stehen in keinerlei Verbindung zu diesem Projekt.

**Verantwortlicher i.S.d. DSGVO:** Andre Reiche, privat (Kontakt: `123ichbinmitdabei@googlemail.com`).
**Datenschutzerklärung:** in Vorbereitung — wird nach Anwalts-Freigabe veröffentlicht.

**Live-URL:** https://123ichbinmitdabei.github.io/terp-sessions/
**Repo:** https://github.com/123ichbinmitdabei/terp-sessions
**Voice-Befehle (Anleitung):** [VOICE-BEFEHLE.md](./VOICE-BEFEHLE.md)

## v9.37.0 — Statistik-Aufschlüsselung (autonom)

Im Setup → Übersicht gibt es eine neue Karte „📊 Aufschlüsselung", die das Session-Tagebuch auswertet: Sessions **pro Wochentag** (Mo-So), **pro Tageszeit** (Morgens/Mittags/Abends/Nachts) und die **Top-Sorten**, jeweils als kleine Balken. Jeder Balken hat ein `aria-label` (z.B. „Mo: 3 Sessions"), damit Screen-Reader die Werte vorlesen. Aktualisiert sich automatisch mit dem Tagebuch. Tester können so in der Test-Woche ihre eigenen Muster erkunden.

Tests: `v937stats.mjs` (12 Checks, inkl. XSS-Escaping der Sorten-Namen). Reine lokale Auswertung, kein neuer Speicher, keine Engine-Änderung.

## v9.36.0 — Bug-Jagd: Schedule + Streak (autonom)

Zwei latente Bugs aus gezieltem Code-Lesen behoben:

- **Verpasster „in X Minuten"-Schedule (Medium):** Wurde ein einmaliger „in X Min"-Schedule verpasst (App war länger als 5 Min zu, z.B. Bluefy-Tab im Hintergrund/Reload auf iPhone), berechnete `scheduleTick` den nächsten Lauf immer wieder in die Vergangenheit und schrieb dadurch alle 30 Sekunden den Speicher neu, ohne den Schedule je auszuführen oder zu deaktivieren (Zombie). Jetzt wird ein verpasster Schedule, der keinen Zukunfts-Lauf mehr hat, sauber deaktiviert. Wiederholende Zeit-Schedules bleiben unverändert.
- **Streak-„gestern" DST-sicher (Low):** `noteSessionDay` berechnete „gestern" über einen festen 24-Stunden-Abzug; der Rest des Codes nutzt dafür schon `setDate`. An Sommerzeit-Wechseln hätte das den Streak-Zähler verfälschen können. Jetzt kalendergenau.

Tests: `v936bugjagd.mjs` (10 Checks). Keine Engine-/Adapter-Änderung, nur die zwei Korrekturen.

## v9.35.0 — Schedule-Vorlagen (autonom)

Der Session-Planer hat jetzt drei Vorlagen-Knöpfe, die mit einem Tipp einen fertigen Schedule anlegen (Zeit danach anpassbar): „🌅 Morgens Decarb" (115 °C, täglich 08:00), „🌙 Abend-Session" (190 °C, täglich 20:00) und „🍃 Wochenend-Aroma" (180 °C, Sa+So 11:00). Spart Tippen für wiederkehrende Routinen. Temperaturen werden bei der Ausführung ohnehin an den Geräte-Bereich geklemmt.

Tests: `v935schedtpl.mjs` (10 Checks). Additive UI + Daten, kein Eingriff in die Schedule-Engine.

## v9.34.0 — Toggle-Beschreibungen für Screen-Reader (autonom)

Alle Einstellungs-Schalter haben sichtbare Kurz-Erklärungen (`<small>`), die ein Screen-Reader bisher nicht mit vorlas (der Schalter trug nur ein `aria-label`). Ein kleiner Start-Pass hängt diese Erklärung per `aria-describedby` an den jeweiligen Schalter (29 Schalter). Damit hört z.B. VoiceOver bei „Auto-Cool-Down" jetzt auch „Heizer auf Standby-Temperatur runter". Rein additive ARIA, keine sichtbare Änderung, idempotent.

Tests: `v934toggledesc.mjs` (10 Checks). Verify-before-fix: die `<small>`-Texte existierten bereits, nur die SR-Verknüpfung fehlte.

## v9.33.0 — Crash-Recovery (autonom)

Wenn die App mitten in einem laufenden Programm neu geladen wird oder abstürzt (auf iPhone/Bluefy nicht selten), bietet sie beim nächsten Start an, das Programm neu zu starten. Sichere Variante: der Lauf-Status wird in `sessionStorage` gespiegelt, beim sauberen Ende (Fertig/Stop/Fehler) wieder gelöscht. Überlebt der Marker einen Reload, fragt die App per Dialog „Programm X war aktiv, neu starten?". **Nie** automatische Wiederaufnahme (der Geräte-/Adapter-Zustand ist nach dem Reload weg), und nur mit bestehender Verbindung. Der Marker wird beim ersten Prüfen sofort konsumiert (kein erneutes Nachfragen nach weiteren Reloads).

Tests: `v933recovery.mjs` (12 Checks). Reine Anzeige-/Nachfrage-Logik, keine Adapter-Änderung.

Beifang (vom zeitabhängigen Coverage-Test gegen 22 Uhr aufgedeckt): `computeNextRun` nutzte `t.hour||8`, wodurch ein auf Mitternacht (00:xx) gesetzter Schedule fälschlich auf 08:xx fiel. Behoben (`t.hour!=null`-Prüfung). Ein „Morgens decarb um 00:30"-Schedule feuert jetzt korrekt.

## v9.32.0 — Tester-Daten ins Backup (Testwoche-Prep, autonomes Paket)

Das bestehende JSON-Backup (Setup, „JSON-Backup"/„Restore") sicherte Einstellungen, Programme und Sessions, aber nicht die in v9.28.0 neu gesammelten Tester-Daten. Damit ein Browser-Clear oder Reinstall während der Test-Woche das Notizbuch und das Quick-Feedback nicht vernichtet, umfasst das Backup jetzt zusätzlich `vol_pioneer_notes`, `vol_quick_feedback` und `vol_pioneer_active_days` (der Test-Fortschritt lag schon immer mit drin, da in PREFS). Restore stellt sie samt Notizbuch-Textfeld und Dashboard wieder her, mit Typ-Guards gegen fehlerhafte Dateien.

Tests: `v932backup.mjs` (9 Checks). Begründung (autonom): Daten-Verlust-Schutz für die Woche, in der die Daten entstehen, minimaler Eingriff in das bereits getestete Export/Import.

## v9.31.0 — Tester-Wochen-Dashboard (Testwoche-Prep, autonomes Paket)

Konsolidiert die in v9.28.0 gesammelten Tester-Daten zu einem Überblick und einem Gesamt-Report. Nur im Pioneer-Test-Modus, alles lokal.

- **Dashboard „Meine Test-Woche"** im Pioneer-Tab: bestandene Tests, gemeldete Bugs, übersprungene, 👍/👎-Quick-Feedback, aktive Tage, Punkte und Notizbuch-Länge auf einen Blick.
- **Aktive-Tage-Zähler:** `vol_pioneer_active_days` protokolliert (dedupliziert) die Tage, an denen die App im Test-Modus benutzt wurde.
- **Wochen-Report:** „Wochen-Report (Markdown)" lädt einen kombinierten Report herunter (Tests + Quick-Feedback-Statistik + Problem-Notizen + Notizbuch + Tester-Kennung) und kopiert ihn in die Zwischenablage. „An Andre senden" öffnet zusätzlich ein vorausgefülltes GitHub-Issue (mit Clipboard-Fallback).

Begründung (autonomes Paket): macht aus den verstreuten Einzeldaten ein konsolidiertes Artefakt pro Tester, genau das, was beim Wiedereinstieg nach der Test-Woche gebraucht wird. Tests: `v931dashboard.mjs` (12 Checks).

## v9.30.0 — A11Y-D3 (Testwoche-Prep Paket 3)

Barrierefreiheit, dritte Runde. Audit in `docs/A11Y-D3-AUDIT-2026-06-08.md`, VoiceOver-Anhang in `docs/A11Y-D3-IPHONE-VOICEOVER-V2.md`.

**Top-3:**
- **Pfeiltasten-Navigation im Haupt-Tablist:** Pfeil-Links/-Rechts wechseln zwischen Steuerung/Programme/Setup (umlaufend), Pos1/Ende zum ersten/letzten Tab. Roving tabindex (aktiver Tab 0, andere -1), Selection-follows-Focus, versteckte Tabs werden übersprungen. Touch/Wisch bleibt unverändert.
- **Größere Touch-Ziele der Blatt-Bewertung:** `.comm-stars-btn` hat jetzt eine 44×44-Punkte-Trefferfläche (min-width/height, zentriertes Glyph), das Blatt bleibt visuell 20px. role=radio/aria-label unverändert.
- **Gerätename in der Verbindungs-Anzeige:** „Verbunden mit [Name]" und „Getrennt (war: [Name])" statt nur „Verbunden"/„Getrennt". Da `#connChip` aria-live=polite ist, hört VoiceOver den Namen.

**Subsystem-Stichproben:** Symptom-Tracker (Slider beschriftet), Sessions-Tagebuch (fokussierbar + beschriftet), DSL-Editor (aria-label), Touch-Macros (beschriftete Buttons) sind ok. Ein Fix: die T-Break-/Streak-Anzeige ist jetzt `role="status" aria-live="polite"`.

Tests: `v930a11yd3.mjs` (14 Checks). Vertagt nach A11Y-D4: Panel-Fokus beim Tabwechsel, Kontrast-Audit, Screen-Reader-Abnahme der dynamischen Listen am Gerät.

## v9.29.0 — Multi-Brand + Onboarding (Testwoche-Prep Paket 2)

Drei Teile, keine Adapter-/Protokoll-/Backend-Änderung.

**TEIL A, MB.4 Puffco-Temp:** Der Puffco Peak Pro ist ein Dab-Gerät (204-327 °C statt der Vaporizer-Defaults). Schnellzugriffe „Dab heizen" (232 °C) und „Pre-Heat" (204 °C), die Temperatur setzen und heizen. `cmdSetTemp` klemmt schon immer an `tempRange`; neu klemmen auch die Haupt-Temperatur-Eingabe (`#tInput`), der Programm-Editor-Step-Slider (Grenzen je Gerät) und Aroma-Auto-Programme (`buildProgramFromAroma`) an den Geräte-Bereich. Der Beta-Hinweis nennt den Puffco-Dab-Bereich. Volcano und die anderen Geräte bleiben unverändert.

**TEIL B, MB.5 Geräte-Sprache:** Der Einrichtungs-Wizard ist jetzt geräte-neutral formuliert („Wähle deinen Vaporizer", „Deinen Vaporizer einschalten" mit Geräte-Beispielen). Hinweis: die vom Auftrag vermuteten Strings „deinem Volcano"/„Ballon befüllen" existierten im Wizard gar nicht (er war schon multi-device); die Ballon-Schnellzugriffe sind bereits per Capability (`bagFill`) gegated.

**TEIL C, Onboarding-Tiefe:**
- **FAQ** im Setup-Tab: ausklappbare Sektion mit 15 Fragen (Gerät verbinden, Bluefy, Offline, Sicherheits-Timer, Schnellzugriffe, Voice, Pioneer-Tests, Datenschutz, Bug melden, Ballon-Profil, Beta-Marker, Sorten-Werte, Programm-Editor, Recovery-Code, Offline-Cache), Inhalte aus README/VOICE-BEFEHLE/Datenschutz.
- **Geräte-Touren** erweitert: neue Touren für PAX, Puffco und Firefly (zusätzlich zu Volcano/Crafty-Mighty/Venty-Veazy), `resetDeviceTours` deckt jetzt alle ab.
- **„Erster Schritt"-Block** auf der Steuerung: drei Schritte (Browser prüfen, Gerät einschalten, Verbinden), nur sichtbar wenn nie verbunden und keine eigenen Programme, verschwindet nach erstem Connect oder per Ausblenden.

Tests: `v929brand.mjs` (18 Checks).

## v9.28.0 — Tester-Werkzeuge (Testwoche-Prep Paket 1)

Vier Werkzeuge, die der Pioneer-Test-Woche Struktur geben. Alle nur sichtbar bei aktivem Pioneer-Test-Modus, alles lokal (localStorage), kein Backend.

- **W1 Strukturierte Bug-Report-Templates:** Der Bug-Report-Dialog hat jetzt Dropdowns für Bereich (Verbindung/BLE, Programm-Engine, Sorten, Voice, Pioneer-Test-Pfad, Onboarding, Sonstiges) und Schweregrad (Kritisch/Hoch/Mittel/Niedrig), eine Blätter-Bewertung „Wie schlimm für dich persönlich" (1-5, als radiogroup wie das Sorten-Rating) und „Reproduzierbar?" (Ja/Manchmal/Nein). Die Felder landen als maschinenlesbarer JSON-Header oben im Issue, dazu eine lesbare Klassifikation. So kann Andre die Reports sortieren.
- **W2 Tester-Notizbuch:** Im Pioneer-Test-Tab ein mehrzeiliges Notizfeld (LS `vol_pioneer_notes`) mit Auto-Save (debounced 1s), „+ Zeitstempel" (fügt `[HH:MM]` auf neuer Zeile ein), „Als Markdown exportieren" (mit Geräte-/App-Kontext) und „In Bug-Report" (hängt die Notizen an den nächsten Bug-Report an).
- **W3 Quick-Feedback-Knöpfe:** Auf Programm-, Sorten- und Schnellzugriff-Karten je ein 👍/👎 (LS `vol_quick_feedback`, Eintrag `{at, what, kind, context, note}`). Bei 👎 ein optionales 1-Satz-Feld. Im Setup-Tab unter Pioneer-Tester: „Exportieren (JSON)" mit Stats-Zusammenfassung und „An Andre senden" (GitHub-Issue vorausgefüllt + Clipboard-Fallback).
- **W4 Audio-Memo:** Im Bug-Report-Dialog „🎤 Audio-Memo aufnehmen" (MediaRecorder, bis 60 Sek.), besonders für den blinden Tester. Das Memo wird lokal als Datei gespeichert (Download), der Report vermerkt „Audio-Memo, X Sek." mit Hinweis zum Anhängen/DM. Graceful degradation: wo MediaRecorder/Mikrofon fehlt (z.B. iOS Safari/Bluefy teils), erscheint „Audio-Memo nicht verfügbar, bitte Textbeschreibung nutzen". Hinweis: Base64-Audio wird bewusst NICHT in den Issue-Body eingebettet (würde die URL sprengen und nicht rendern), stattdessen die lokale Datei plus Vermerk.

Tests: `v928tools.mjs` (27 Checks). Keine Adapter-, Krypto- oder Backend-Änderung.

## v9.27.0 — A11Y-D2 (Top-5)

VoiceOver-Lese-Reihenfolge und Touch-Exploration fuer iPhone-Tester (Audit in `docs/A11Y-D2-AUDIT-2026-06-08.md`, Test-Anleitung in `docs/A11Y-D2-IPHONE-VOICEOVER.md`). Umgesetzt wurden die 5 Funde mit dem hoechsten Tester-Nutzen:

- **A11Y-D2.5.1 (High):** Toasts sind jetzt hoerbar. `#toast` ist `role="status" aria-live="polite" aria-atomic="true"`, also werden alle Toast-Rueckmeldungen (z.B. „Verbunden mit Volcano", „Sorte gespeichert", Fehler) von VoiceOver vorgelesen. Das schliesst zugleich die Verbindungs-Ansage aus Pfad 1.
- **A11Y-D2.4.1 (High):** Quick-Action-Buttons sagen ihre Meta-Info mit an. Die `.meta` (z.B. „5 Sek.") wird ans `aria-label` angehaengt („Direkt-Zug, 5 Sek.") und das dekorative Icon ist `aria-hidden`, statt dass das Label die Info verschluckt.
- **A11Y-D2.2.1 (Medium):** Schritt-Wechsel im Programm-Lauf wird atomar angesagt. `#runMeta` ist `aria-atomic="true"`, VoiceOver liest „Schritt 3 / 7" als Einheit.
- **A11Y-D2.2.2 (Medium):** Tablist-Muster vervollstaendigt. Die 4 Tab-Sektionen (`#tab-ctl/#tab-prog/#tab-setup/#tab-pioneer`) sind `role="tabpanel"`, passend zu `aria-controls` der Tabs.
- **A11Y-D2.2.3 (Medium):** Programm-Start wird via `srAnnounce` angesagt („Programm gestartet: Name, N Schritte"), auch im Screen-Reader-Modus.

Keine Logik-, Adapter-, Krypto- oder Backend-Aenderung. Reine Auszeichnung ueber die bestehende Live-Region- und sr-Infrastruktur. Tests: `v927a11yd2.mjs` (14 Checks). Weitere Punkte (Pfeiltasten-Tablist, groessere Blatt-Touch-Ziele, Geraetename im connChip-Text) sind fuer A11Y-D3 vorgemerkt.

## v9.26.0 — QA-2 Em-Dash-Sweep (Paket 10 der Fix-Kampagne)

Zehntes Paket der QA-2-Fix-Kampagne (QA2.10.1 / QA-1-Backlog 13). Reiner redaktioneller Durchlauf, keine Logik-Änderung.

- **Em-Dashes in deutscher Prosa zu Kommas:** In `index.html` wurden 185 Em-Dashes („ — ", Gedankenstriche in Sätzen und Kommentaren) durch Kommas ersetzt, ebenso in `info.html` (1) und `VOICE-BEFEHLE.md` (6). En-Dashes in Zahlenbereichen („40–230 °C", 51 Stück) und Box-Drawing-Zeichen blieben unangetastet. Die ~12 dekorativen Platzhalter-Em-Dashes in Dropdowns („— keine —", „— Sorte aus Community —") bleiben als bewusste UI-Verzierung erhalten.

**Bewusst NICHT angefasst:** `datenschutz.html` (anwaltlich freigegebenes Dokument, Punktuation nicht eigenmächtig ändern), die README-Versions-Überschriften (Changelog-Trenner-Konvention, kein Fließtext) und die Marken-/Titel-Bezeichnung „Terp Sessions — Vape Controller" (`<title>`, Konsolen-Banner) als bewusstes Branding, konsistent mit `manifest.json`.

**Unberührt:** App-Logik, cscCrypto, Backend. **Tests:** `v926emdash.mjs` (7, Regressions-Guard gegen neue Prosa-Em-Dashes). Volle Regression grün.

## v9.25.0 — QA-2 Cleanup (Paket 9 der Fix-Kampagne)

Neuntes Paket der QA-2-Fix-Kampagne. Schwerpunkt: kleinere Korrektheits- und Genauigkeits-Fixes. Frontend-only.

- **QA2.3.5 Schedule greift nicht in laufendes Programm:** Ein zeitgesteuerter „Heizen"-Schedule wird übersprungen (mit Hinweis), wenn gerade ein Programm läuft, statt parallel einzugreifen.
- **QA2.19.1 Korrekte Ansage:** Ein als Fehler markierter Pioneer-Test ohne abgesendeten Bug-Report sagt jetzt „als Fehler markiert" statt fälschlich „Bug gemeldet".
- **QA2.6.7 Recovery-Hinweis:** Nach erfolgreichem PIN-Recovery weist die App darauf hin, in den Einstellungen einen neuen PIN zu setzen (der alte ist dem Nutzer ja unbekannt).
- **QA2.4.5 Pioneer-Test B10 korrigiert:** Die Testbeschreibung sagt jetzt korrekt, dass im Screen-Reader-Modus der Mikrofon-FAB antippbar bleibt (nur das Wake-Word ist aus), statt fälschlich „FAB inaktiv".

**Bewusst zurückgestellt / FALSE POSITIVE (dokumentiert in `docs/QA-2-FIX-LOG.md`):** QA2.27.6 (gatt.disconnect ist synchron, kein await nötig = FALSE POSITIVE); QA2.27.11 (toter `_pioneerShowPathChoice` ist im Code bereits als bewusster Fallback dokumentiert); QA2.27.7/8/9 (bewusst stille best-effort-catches für Vibration/Wake-Lock/Audio); QA2.18.5 (Tour-Inert, geringer Zusatznutzen, Tour hat seit v9.15.0 Dialog-Semantik + Fokus-Management).

**Unberührt:** cscCrypto, Backend, App-Logik. **Tests:** `v925qa2cleanup.mjs` (7). Volle Regression grün.

## v9.24.0 — QA-2 Statistik-Korrektheit (Paket 8 der Fix-Kampagne)

Achtes Paket der QA-2-Fix-Kampagne. Schwerpunkt: korrekte Berechnung und Darstellung der Statistiken. Frontend-only.

- **QA2.17.4 Streak-Zeitzone:** Das ältere Streak-System (`noteSessionDay`) nutzt jetzt denselben lokalen Tagesschlüssel (`dayKey`) wie das neuere Streak-/Heatmap-System, statt UTC. Spät-abendliche oder früh-morgendliche Sessions landen nicht mehr im falschen Kalendertag.
- **QA2.17.5 Heizkurven-Mittelwert:** Der Vergleich „schneller/langsamer als üblich" berechnet den Durchschnitt jetzt VOR dem Einspeichern des aktuellen Laufs, der aktuelle Wert verfälscht seinen eigenen Vergleichswert nicht mehr.
- **QA2.17.9 Heatmap über Zeitumstellung:** Die 12-Wochen-Heatmap iteriert die Tage über `setDate` statt über feste 24-Stunden-Offsets, eine Sommer-/Winterzeit-Umstellung verschiebt keine Spalte mehr.
- **QA2.17.8 Heizzeit-Format:** Der Konsum-Report zeigt die Heizzeit über `fmtHeat` (Stunden und Minuten) statt grob auf ganze Stunden gerundet.

**Bewusst zurückgestellt (dokumentiert in `docs/QA-2-FIX-LOG.md`):** QA2.17.6 (Combo-Wortlaut „hintereinander", reine Nuance, Combo setzt korrekt bei Fehlschlag zurück) und QA2.17.7 (Bag-Zähler nur im geführten Ballon-Flow, vertretbare Design-Entscheidung; DEVSTATS labelt bereits „geschätzt").

**Unberührt:** App-Logik, cscCrypto, Backend. **Tests:** `v924qa2stats.mjs` (9). Volle Regression grün.

## v9.23.0 — QA-2 PWA-Konfiguration (Paket 7 der Fix-Kampagne)

Siebtes Paket der QA-2-Fix-Kampagne. Schwerpunkt: PWA-Manifest, Service-Worker-Cache und Safe-Area. Frontend-only.

- **QA2.9.2 Offline-Vollständigkeit:** `datenschutz.html` und `info.html` werden jetzt vom Service Worker mit in die App-Shell (`SHELL`) vorgecacht und sind offline verfügbar.
- **QA2.9.1 theme-color konsistent:** Die `theme-color` im HTML (war `#0a0908`) entspricht jetzt dem Manifest-Wert `#0c0a08`.
- **QA2.9.7 Manifest-`id`:** Das Manifest hat eine explizite `id` (stabile App-Identität über URL-Wechsel hinweg).
- **QA2.9.8 Beschreibung:** Die Meta-Description nennt jetzt alle unterstützten Geräte (Volcano, Crafty, Mighty, Venty, PAX 3, Puffco Peak Pro, Firefly) statt nur vier.
- **QA2.16.1 Safe-Area-Fallback:** Die CSS-Variablen `--safe-top`/`--safe-bot` nutzen `0px` (mit Einheit) als `env()`-Fallback, damit `calc()`-Ausdrücke auf Geräten ohne Notch korrekt rechnen.

**Bewusst zurückgestellt (dokumentiert in `docs/QA-2-FIX-LOG.md`):** QA2.16.3 (Hover-Guard, systemischer CSS-Durchlauf über ~30 Regeln, rein kosmetisch und für die VoiceOver-Kohorte ohne Belang), QA2.16.2 (Safe-Area links/rechts, App ist portrait-locked), QA2.9.3 (`beforeinstallprompt`, feuert auf iOS gar nicht), QA2.9.4/9.5/9.6 (Info).

**Unberührt:** App-Logik, cscCrypto, Backend. **Tests:** `v923qa2pwa.mjs` (8). Volle Regression grün.

## v9.22.0 — QA-2 Voice-Doku und UX-Konsistenz (Paket 6 der Fix-Kampagne)

Sechstes Paket der QA-2-Fix-Kampagne. Schwerpunkt: Sprachbefehle, Hilfe-Text, Doku-Genauigkeit und Toast-Verhalten. Frontend-only.

- **QA2.4.1 / QA2.4.2 / QA2.4.4 VOICE-BEFEHLE.md korrigiert:** Mikrofon-Sprachbefehle sind Chrome/Edge (Android/Desktop), NICHT Bluefy/iOS (dort Text-Befehl + URL/Siri); Wake-Word-Wortlaut auf „Hey Sessions"/„Hey Terp Sessions" angeglichen; das nicht existierende Pause-Synonym „warte" entfernt.
- **QA2.4.3 VOICE_HELP vervollständigt:** Die In-App-Hilfe nennt jetzt auch „Boost", „Verbindung trennen" und das Sorten-Synonym „sorten mit <Wort>" (waren im Parser vorhanden, aber nicht in der Hilfe).
- **QA2.4.6 Wake-Word entschärft:** Das bloße „sessions" wurde aus der Wake-Word-Liste entfernt (zu hohe Falsch-Trigger-Wahrscheinlichkeit), die Anrede-Präfixe bleiben.
- **QA2.4.7 Einheitliche Programm-Suche:** Voice und URL-/Siri-Befehle nutzen jetzt dieselbe `findProgramByName` (getAllPrograms + Fuzzy), statt zweier unterschiedlich fähiger Suchpfade.
- **QA2.10.2 Toast-Dauer:** Die Anzeigedauer von Hinweisen skaliert jetzt mit der Textlänge (2,2 bis 7 Sekunden), längere Meldungen bleiben lesbar.

**Bewusst zurückgestellt (dokumentiert in `docs/QA-2-FIX-LOG.md`):** der vollständige Em-Dash/Benennungs-Sweep (QA2.10.1, = QA-1-Backlog 13, großer redaktioneller Durchlauf) und die breite Umstellung aller Fehler-Toasts auf `showFriendlyError` (Teil QA2.10.2).

**Unberührt:** cscCrypto, Backend, Adapter. **Tests:** `v922qa2voice.mjs` (14), plus Voice-Bestandssuiten grün. Volle Regression grün.

## v9.21.0 — QA-2 Storage- und Datenrobustheit (Paket 5 der Fix-Kampagne)

Fünftes Paket der QA-2-Fix-Kampagne. Schwerpunkt: Backup/Import, Persistenz und Datenverlust-Schutz. Frontend-only.

- **QA2.6.1 Backup ohne PIN-Geheimnisse:** Der JSON-Export enthält nicht mehr `pinHash`/`pinSalt`/`pinKdf`. Ein 4- bis 8-stelliger PIN wäre aus Hash und Salt offline in Sekunden brute-forcebar gewesen.
- **QA2.6.6 Import ignoriert Sicherheits-Keys:** Beim Import werden `pinHash`/`pinSalt`/`pinKdf` aus der Datei entfernt, eine Backup-Datei kann keinen fremden PIN-Hash setzen, der eigene PIN bleibt.
- **QA2.6.4 Kein stiller Datenverlust beim Verschlüsseln:** `encryptSensitive` entschlüsselt den frisch geschriebenen Blob sofort wieder und vergleicht ihn, bevor der Klartext gelöscht wird. Schlägt die Verifikation fehl, bleibt der Klartext erhalten.
- **QA2.6.8 / QA2.27.4 Speicher-Fehler sichtbar:** Der LocalStorage-Wrapper loggt jetzt Lese- (Parse-) und Schreibfehler (z.B. voller Speicher), statt sie still zu verschlucken.
- **QA2.6.5 Multi-Tab-Warnung:** Ein `storage`-Listener warnt einmalig, wenn ein zweiter Tab dieselben Daten ändert (Schutz vor last-write-wins-Datenverlust).
- **QA2.14.4 Log-Begrenzung:** Das Haupt-Log (`#log`) wird auf 200 Zeilen begrenzt und wächst nicht mehr unbegrenzt über lange Sessions.
- **QA2.14.5 PIN-Overlay-Re-Entry-Guard:** `requirePin` gibt bei wiederholtem Aufruf (z.B. durch den Auto-Lock-Tick) dasselbe laufende Promise zurück, statt erneut Event-Listener zu registrieren.

**Unberührt:** cscCrypto, Backend, der PIN-Salt selbst (zugleich Backup-Verschlüsselungs-Salt, nie geändert). **Tests:** `v921qa2storage.mjs` (11). Volle Regression grün.

## v9.20.0 — QA-2 Reconnect- und Queue-Robustheit (Paket 4 der Fix-Kampagne)

Viertes Paket der QA-2-Fix-Kampagne. Schwerpunkt: robuster Reconnect, BLE-Befehls-Queue und Custom-Profile. Frontend-only, keine Protokoll-Änderung.

- **QA2.2.3 Reconnect-Oszillations-Schutz:** Der Reconnect-Zähler wird nicht mehr bei jedem Verbindungsabbruch sofort genullt, sondern erst nach 10 Sekunden stabiler Verbindung (`setConn` armiert einen Stabilitäts-Timer). Ein Gerät, das ständig kurz verbindet und sofort wieder abbricht, läuft nicht mehr in endlose Reconnect-Versuche, sondern erreicht nach drei Fehlversuchen den „bitte manuell neu verbinden"-Banner.
- **QA2.2.9 Queue-Timeout:** Jede serialisierte BLE-Operation läuft jetzt gegen einen 5-Sekunden-Timeout (`_bleWithTimeout`). Eine hängende Operation (z.B. nach stillem GATT-Verlust) blockiert nicht mehr dauerhaft alle nachfolgenden Befehle; die Queue erholt sich automatisch.
- **QA2.2.2 Custom-BLE-Profile:** Die Service-UUIDs eigener Profile werden jetzt in die `optionalServices` der Geräteauswahl aufgenommen (sonst scheitert der Zugriff am Web-Bluetooth-Permission-Modell), und `detectDevice` ordnet ein Gerät mit passender Custom-Service-UUID dem generischen Volcano-Adapter mit Auto-Mapping zu. Der Profil-Hinweis sagt jetzt ehrlich, dass Custom-Profile nur mit S&B-kompatiblen Characteristics funktionieren.

**Bewusst zurückgestellt (dokumentiert in `docs/QA-2-FIX-LOG.md`):** QA2.2.4 (Puffco-Auth beim Reconnect) und QA2.2.6 (PAX-Seriennummer-Plausibilität) betreffen unverifizierte Beta-Adapter ohne verfügbare Hardware; QA2.2.5 (Paket 2) verhindert dort bereits die Anzeige von Müll-Werten. QA2.2.10 (deklarierte vs. genutzte Capabilities) ist kosmetisch.

**Unberührt:** Adapter-Protokolle, cscCrypto, Backend. **Tests:** `v920qa2reconnect.mjs` (11), plus BLE-Bestandssuiten grün. Volle Regression grün.

## v9.19.0 — QA-2 Barrierefreiheit-Detailfixes (Paket 3 der Fix-Kampagne)

Drittes Paket der QA-2-Fix-Kampagne. Schwerpunkt: Screen-Reader-Erlebnis für die blinden Pioneer-Tester. Frontend-only.

- **QA2.5.2 Lade-/Fehlerzustände hörbar:** Die asynchronen Listen (Community-Programme, Community-Sorten, Moderation, Vorlagen-Picker) setzen jetzt `aria-busy` während des Ladens und spiegeln Lade- und Fehlertexte in die Live-Region (`srAnnounce`), sodass Screen-Reader-Nutzer Laden und Fehlschlag mitbekommen.
- **QA2.5.3 Tooltip-Detail für Screen-Reader:** Der erklärende `data-tip`-Text (43 Elemente) wird in `_a11yAutoLabel` jetzt über versteckte `sr-only`-Spans als `aria-describedby` verknüpft, statt nur als CSS-Tooltip sichtbar zu sein.
- **QA2.5.4 Dialog-Beschreibung:** Der barrierefreie Dialog (`#modalDlg`) verweist per `aria-describedby` auf seinen Nachrichtentext, der beim Öffnen damit zuverlässig angesagt wird.
- **QA2.5.5 erste Ansage:** `_pioneerAnnounce` setzt den Text einer frisch erzeugten Live-Region jetzt verzögert (nach dem Einfügen ins DOM), sodass auch die erste Ansage von Screen-Readern erfasst wird.
- **QA2.5.6 Fokus-Rückkehr:** Beim Schließen eines Modals prüft die Fokus-Rückgabe, ob der ursprüngliche Auslöser noch im DOM ist; sonst wird das oberste noch offene Modal fokussiert statt der Fokus auf `<body>` zu fallen.

**Unberührt:** App-Logik, cscCrypto, Backend. **Tests:** `v919qa2a11y.mjs` (9), plus A11Y-Bestandssuiten grün. Volle Regression grün.

## v9.18.0 — QA-2 BLE-Lifecycle-Robustheit (Paket 2 der Fix-Kampagne)

Zweites Paket der QA-2-Fix-Kampagne. Schwerpunkt: sauberes Auf- und Abbauen der Bluetooth-Verbindung über alle Adapter. Frontend-only, keine Protokoll-Änderung.

- **QA2.14.1 + QA2.2.8 Disconnect-Cleanup:** Manuelles Trennen (`disconnectBLE`) und Verbindungsverlust (`gattserverdisconnected`) rufen jetzt `adapter.disconnect()` auf, das Poll-Intervalle und Notifications sauber abbaut. Vorher liefen die `setInterval`-Polls (Venty 500ms, Crafty/PAX/Puffco 2s) nach dem Trennen endlos weiter.
- **QA2.14.2 + QA2.2.7 Listener-Hygiene:** Die Notify-Listener von Crafty/Mighty, Venty/Veazy und PAX sind jetzt benannte Referenzen, die in `disconnect()` per `removeEventListener` wieder entfernt werden (kein Doppel-Listener bei wiederholtem Reconnect).
- **QA2.14.3 Poll-Guard:** Der Crafty/Mighty-Poll wird nur noch mit `if(!this._poll)` gesetzt (beide Pfade), analog zu Venty/PAX/Puffco, kein verwaister Timer mehr.
- **QA2.2.5 Status-Plausibilität:** Eingehende Zieltemperaturen aus Notify-Frames werden gegen die jeweilige Geräte-`tempRange` geprüft statt gegen feste Weitbereiche (Venty 40-210, PAX 175-215). Ein falsch dekodiertes oder durch falschen PAX-Key entstandenes Frame zeigt keine unplausible Zieltemperatur mehr an.
- **QA2.2.11 Lesefehler sichtbar:** Der Crafty/Mighty-Poll zählt aufeinanderfolgende Lesefehler und warnt nach fünf in Folge, statt still auf alten Werten zu verharren (relevant, da Crafty/Mighty keinen Geräte-Auto-Aus hat).

**Unberührt:** Adapter-Protokolle/Encoding, cscCrypto, Backend. **Tests:** `v918qa2ble.mjs` (15), plus BLE-Bestandssuiten (v500/501/51/60pax/70puffco) grün. Volle Regression grün.

## v9.17.0 — QA-2 Engine- und Sicherheits-Robustheit (Paket 1 der Fix-Kampagne)

Erstes Paket der systematischen QA-2-Fix-Kampagne (alle Funde aus `docs/QA-2-AUDIT-2026-06-08.md`, Logbuch `docs/QA-2-FIX-LOG.md`). Schwerpunkt: Programm-Engine, Abbruch und Verbindungsverlust. Frontend-only.

- **QA2.3.1 UI-Stop schaltet das Gerät ab:** Der prominente Stop-Knopf der Run-Card beendet das Programm jetzt UND schaltet Heizer und Pumpe aus (neue Funktion `stopRunFull`). Vorher blieb beim Stoppen während eines Warte- oder Heizschritts der Heizer an. Der weiche Voice-Abbruch (`abortProgram`) bleibt bewusst ohne Geräte-Aus.
- **QA2.3.3 + QA2.17.3 Verbindungsverlust:** Bricht die BLE-Verbindung während eines laufenden Programms ab, wird das Programm jetzt aktiv abgebrochen (statt die Wartezeit blind zu Ende laufen zu lassen), und der Heizzeit-Zähler wird sauber geschlossen (vorher umspannte der nächste Heizer-Aus die ganze Trennungszeit und überzählte `totalHeatSec`). Gilt auch für manuelles Trennen.
- **QA2.3.2 Variablen-Eingabe robust:** Programm-Variablen werden jetzt typsicher pro Feld ersetzt statt per String-Replace ins serialisierte JSON. Ein Wert mit Anführungszeichen oder Backslash brach vorher `JSON.parse` mit einem unbehandelten Fehler.
- **QA2.3.4 Schleifen-Obergrenze:** `expandLoops` begrenzt die Gesamtzahl expandierter Schritte hart (2000), verschachtelte 20er-Schleifen aus Import/Parser können den Speicher nicht mehr multiplikativ sprengen.
- **QA2.3.6 Import-Validierung:** Der lokale JSON-Programm-Import validiert jetzt die Schritt-Felder (gültige Aktion, endliche Werte), `cmdSetTemp` ignoriert zusätzlich NaN/undefined. Vorher konnte eine `set_temperature` ohne Wert eine NaN-Temperatur an den Adapter schicken.
- **QA2.3.7 Editor-Hinweis:** Der Schritt-Editor weist darauf hin, dass Temperaturen beim Start auf das Limit des verbundenen Geräts begrenzt werden.

**Unberührt:** Adapter-Protokolle, cscCrypto, Backend. **Tests:** `v917qa2engine.mjs` (18). Volle Regression grün.

## v9.16.0 — QA-2 N2 bis N5 (BLE-Fehler, BLE-Mutex, Hotel-Exit, ID-Kollision)

Die nächsten vier High-Befunde aus dem QA-2-Audit (`docs/QA-2-AUDIT-2026-06-08.md`). Frontend-only, kein Backend, keine Protokoll-/cscCrypto-Änderung.

- **N2 BLE-Write-Fehler werden durchgereicht (QA2.2.1):** Die Queue-Adapter (Venty/Veazy, PAX, Puffco) fingen Schreibfehler im `_enqueue`-Promise ab und gaben das bereinigte Promise zurück, dadurch meldeten `cmdSetTemp`/`cmdHeaterOn` fälschlich Erfolg (Toast „Ziel X°C", State gesetzt), obwohl das Gerät den Befehl nie erhielt. Jetzt trennt `_enqueue` die interne Sequenz-Kette vom Rückgabe-Promise (`const run = this._q.then(fn); this._q = run.catch(()=>{}); return run;`), der Fehler erreicht den Aufrufer und läuft in den Friendly-Error-Pfad. Besonders relevant bei erwartetem Abschalten. Der Diagnose-Log-Eintrag bleibt erhalten.
- **N3 Globaler BLE-Mutex pro Adapter (QA2.13.2):** Volcano und Crafty/Mighty schrieben direkt via `writeValue` ohne Serialisierung, parallele Befehle (Doppel-Tap, Voice plus UI) konnten überlappen. Jetzt hat die `DeviceAdapter`-Basisklasse ein `_enqueue` (lazy `this._q`), über das Volcano (setTargetTemp/heaterOn/heaterOff/pumpOn/pumpOff) und Crafty/Mighty (setTargetTemp/heaterOn/heaterOff) ihre Writes serialisieren. Re-entrant-sicher: verschachtelte Aufrufe wie `cmdPumpFor` (ruft `cmdPumpOn`/`cmdPumpOff`) laufen über die Queue ohne Deadlock.
- **N4 Hotel-Modus barrierefrei verlassbar (QA2.5.1):** Das Hotel-Overlay war für Tastatur- und Screen-Reader-Nutzer eine Falle (Exit nur per 5-Sekunden-Touch-Hold). Die Exit-Fläche ist jetzt ein fokussierbarer `role=button` mit `tabindex=0`, beim Öffnen wird sie fokussiert, Eingabetaste/Leertaste darauf und Escape (solange das Overlay sichtbar ist) verlassen den Modus sofort. Der 5-Sekunden-Touch-Hold bleibt für die Touch-Bedienung erhalten.
- **N5 ID-Kollision `btnExportAll` (QA2.12.1):** Der Programme-Export-Button und der Settings-JSON-Backup-Button teilten sich dieselbe id, dadurch bekam der Settings-Button nie einen Listener (tot) und der Programme-Button feuerte beide Export-Funktionen (Doppel-Download). Der Programme-Button heißt jetzt `btnExportPrograms`, der Settings-Backup-Button funktioniert wieder eigenständig.

**Unberührt:** Adapter-Protokolle/Encoding, cscCrypto, Backend, Datenbanken. **Tests:** `v916qa2n2345.mjs` (25: _enqueue-Durchwurf je Adapter + Ketten-Überleben + setTargetTemp-Fehlerpfad, Write-Serialisierung Volcano/Crafty + cmdPumpFor-Deadlock-Freiheit, Hotel-Escape/Enter/Fokus, btnExportAll-Eindeutigkeit). Volle Regression grün.

## v9.15.0 — QA-2 Top-3-Fixes (Safety-Timer, Bag-Statistik, Tour-A11Y)

Die drei höchstpriorisierten Befunde aus dem QA-2-Audit (`docs/QA-2-AUDIT-2026-06-08.md`), umgesetzt vor der betreuungsfreien Pioneer-Test-Woche. Frontend-only, kein Backend, keine Adapter-/cscCrypto-Änderung.

- **N1 Safety-Timer härten (QA2.1.2 / QA2.13.1 / QA2.27.3):** Der automatische Sicherheits-Timer beim Heizen war toter Code, `maybeAutoStartSafety()` rief das nicht existierende `startSafetyTimer()` auf statt `startSafety(min)`. Jetzt startet der Auto-Aus-Timer wie vorgesehen (Default an, S&B 25 min, portabel 8 min). Zusätzlich: das Not-Abschalten von Heizer und Pumpe im Fehlerpfad verschluckt Fehler nicht mehr still, sondern schreibt sie ins Diagnose-Log; und eine `beforeunload`-Warnung greift, wenn der Browser-Tab bei laufendem Heizer geschlossen wird (der App-Timer stirbt mit dem Tab, der Browser-Dialog ist das letzte Netz).
- **N6 Bag-Tageslimit und Statistik fixen (QA2.17.1 / QA2.17.2):** `finishSession` speicherte den lebenslangen Gesamtzähler statt des Pro-Session-Werts, und `bagsTodayCount` addierte denselben lebenslangen Zähler, das Bag-Tageslimit war dadurch oft sofort scheinbar erreicht. Neu: Pro-Session-Werte werden als Delta seit Session-Start berechnet (`sessionBagsBase`/`sessionHeatBase`), archivierte Sessions und der Tageszähler stimmen jetzt. Der lebenslange `bagsFilled`-Zähler (für Anzeige und Achievements) bleibt unverändert. Bestandsnutzer werden migriert, ohne historische Bags fälschlich der aktuellen Session zuzuordnen.
- **N8 Tour-A11Y (QA2.18.1-4):** Das Onboarding-Tour-Overlay bekommt Dialog-Semantik (`role=dialog`, `aria-modal`, `aria-labelledby`), jeder Schritt-Wechsel wird über die Live-Region (`#srLive`) für VoiceOver angesagt, der Fokus kehrt nach Tour-Ende dorthin zurück, wo er vorher war, und die doppelte Schritt-Nummer „4." wurde korrigiert (Titel jetzt durchgängig 1 bis 7).

**Unberührt:** Adapter/Protokoll, cscCrypto, Backend, Datenbanken. **Tests:** `v915qa2top3.mjs` (26: Safety-Auto-Start + Fehler-Logging + beforeunload-Quelle, Bag-Delta/Tageslimit/finishSession/Migration, Tour-Dialog-Semantik/Live-Ansage/Fokus-Rückgabe/Nummerierung). Volle Regression grün.

## v9.14.0 — Sorten + Programme um 200% erweitert (Paket DB-EXT)

Reine Daten-Erweiterung für die Pioneer-Test-Woche, damit Tester reichlich Inhalte zum Erkunden haben. Keine Code-Logik-Änderung, kein Schema-Edit, kein Backend.

- **Sorten-DB (AROMA_DB): 127 → 381 Einträge (+254, +200%).** Reale, bekannte Cannabis-Sorten (Haze-Linien, OG/Kush-Familie, Cookies/Gelato/Runtz-Linien, Diesel- und Zitrus-Sorten, Landrassen u.v.m.) im bestehenden Schema `{name, temps[3], desc, kind, terps}`. Verteilung der neuen Sorten: ca. 40% Sativa-dominant, 43% Indica-dominant, 17% Hybrid. Realistische Drei-Temperatur-Profile (170-215 Grad je nach Profil), nur reale Terpene (Myrcen, Limonen, Pinen, Caryophyllen, Linalool, Humulen, Terpinolen), ehrliche Kurzbeschreibungen ohne Heilsversprechen. Keine Doubletten gegen den Bestand, keine Marken-Symbole.
- **Programme-DB (PRESETS): 19 → 57 Einträge (+38, +200%).** Neue Vorlagen über alle Stile: Decarb-Programme, Drei-Stufen-Klassiker, Microdose, Marathon (mehrere Ballons), Aroma-optimiert (terpenschonend, niedrigere Temps), Wirkstoff-Maximierung (höhere Temps, längere Holds), sorten-spezifisch (Indica-Abend, Sativa-Tag, Hybrid-Allzweck) und geräte-spezifisch (Volcano-Bag, Mighty-Direkt-Zug, Venty-Boost-Profil, Crafty-Solo). Portable Geräte (Mighty/Crafty/Venty ohne Volcano-Tag) nutzen ausschließlich pumpfreie Aktionen, sind also gerätekompatibel.

**Unberührt:** App-Logik, Schema, Adapter, cscCrypto, Backend. **Tests:** `v914dbext.mjs` (20: Umfang ≥3x, Pflicht-Schema, Temperatur-Plausibilität, keine Doubletten/Kollisionen, reale Terpene, keine Marken-Symbole/Em-Dashes, gültige Programm-Actions, Geräte-Kompatibilität). Volle Regression grün.

## v9.13.0 — Multi-Brand-Quick-Wins (Paket MB-B)

Drei kleine geräteübergreifende Verbesserungen aus `docs/MB-A-AUDIT-2026-06-07.md`, damit die App für Nicht-Volcano-Geräte (Crafty/Mighty, Venty/Veazy, PAX, Puffco, Firefly) ehrlicher und korrekter wirkt. MINOR, rein Frontend, kein Backend, keine Adapter-/Protokoll-Änderung, cscCrypto unberührt.

- **MB.1 — Generische statt Volcano-fixe Texte:** Nicht-S&B-spezifische „Volcano"-Strings wurden generisch gemacht. `#btnConnect` aria-label „Mit Volcano verbinden" → „Mit Vaporizer verbinden"; Sicherheits-Fußzeile „Lass den Volcano niemals unbeaufsichtigt" → „Lass den Vaporizer niemals unbeaufsichtigt"; QR-Import-Hinweis, Siri-Voraussetzung und Zeitplan-Sicherheitshinweis ebenso entschärft. Volcano-Hybrid-spezifische Texte (Werks-Sorten, Programm-Tags, Geräte-Profil-Beispiele) bleiben bewusst stehen.
- **MB.2 — Direkt-Zug an echte Fähigkeit gebunden:** Die Fähigkeit `directDraw` war in `currentCapabilities` hartcodiert `true`. Jetzt nur für S&B-Kräuter-Geräte (`volcano`, `crafty_mighty`, `venty_veazy`) aktiv, für PAX/Puffco/Firefly `false`. Der Direkt-Zug-Button (Quick-Action) wird über die bereits bestehende Gate-Logik in `applyCapabilitiesUI()` entsprechend deaktiviert. Keine Adapter-Änderung.
- **MB.3 — Einmaliger Geräte-Status-Hinweis beim Connect:** Beim ersten Verbinden eines nicht-stabilen Geräts erscheint ein barrierefreier Hinweis (uiAlert) zum Erwartungsmanagement: Crafty/Mighty „noch nicht auf echter Hardware verifiziert", PAX/Puffco „im Beta-Status, manche Funktionen können fehlen", Veazy „nutzt die gleiche Logik wie Venty, Abweichungen melden", Firefly „Probe-Only, Steuerung nicht freigegeben". Einmalig pro Gerät, gemerkt in `PREFS.shownBetaHints`. Der bestehende Heiz-Sicherheits-Gate (`ensureBetaConfirmed`) bleibt davon unberührt.

**Bewusst NICHT in diesem Paket:** Puffco-Temperatur-Clamp (MB.4), S&B-Wizard-Sprache (MB.5), echte Mighty-Hardware-Verifikation (MB.7). **Unberührt:** Adapter/Protokoll/BLE-Logik, cscCrypto, Backend. **Tests:** `v913mbb.mjs`. Volle Regression grün.

## v9.12.0 — Robusteres Bug-Reporting für die Pioneer-Test-Woche (Paket BUG-B Kern)

Härtung des Bug-Report-Systems vor der betreuungsfreien Pioneer-Test-Woche, basierend auf `docs/BUG-A-AUDIT-2026-06-07.md`. Adressiert die drei High-Risiken des Audits. MINOR, rein Frontend, kein Backend, cscCrypto unberührt.

- **Diagnose-Log + App-Status im Report (BUG-A.2a/5c):** Der strukturierte Pioneer-Bug-Report enthält jetzt einen kompakten Diagnose-Block, die letzten Log-Zeilen (gekürzt) plus einen Status-Snapshot (`connected`/`heater`/`pump`/`cur`/`target`/`running`). Vorher fehlte der wertvollste Debug-Inhalt im Issue. Ein URL-Längen-Guard nimmt den Log bei Überlänge aus der URL (er bleibt im Clipboard-Report, siehe unten).
- **Clipboard-Fallback (BUG-A.5a/3a):** Beim Absenden wird der vollständige Report IMMER in die Zwischenablage kopiert, zusätzlich zum Öffnen des vorausgefüllten GitHub-Issues. Falls `window.open` scheitert (in Bluefy/WKWebView unzuverlässig) oder der Tester kein GitHub-Konto hat, geht nichts verloren. Eine barrierefreie Bestätigung (uiAlert aus DLG-1) erklärt genau das.
- **Tester-Kennung (BUG-A.6a):** Beim Aktivieren des Pioneer-Test-Modus wird einmalig ein Name/Kürzel abgefragt (barrierefrei via uiPrompt) und in jeden Report geschrieben (strukturierter Bug, allgemeines Feedback, Diagnose-Export). Ohne Eingabe wird eine stabile zufällige Kennung vergeben. Damit kann Andre eingehende Reports zuordnen, auch ohne Community-Login.
- **Ehrlicher Modal-Text:** Der Intro-Hinweis nennt jetzt den Clipboard-Fallback statt zu suggerieren, „Submit" passiere in der App.

**Bewusst NICHT in diesem Paket** (kommt ggf. nach der Test-Woche, braucht Andres Backend-Entscheidung): direkter Supabase-Empfang von Reports (würde die GitHub-Konto-Hürde ganz entfernen), globaler Bug-melden-Einstieg außerhalb des Test-Wizards, Schweregrad-Auswahl. **Unberührt:** cscCrypto, Backend, App-Logik. **Tests:** `v912bugb.mjs` (22: Tester-Kennung, Diagnose-Block, Report-Bau mit URL-Guard, Submit mit Clipboard-Fallback + Bestätigung, Validierung, Aktivierungs-Prompt, Diagnose/Feedback mit Tester). Volle Regression grün.

## v9.11.0 — Barrierefreie Dialoge statt nativer alert/confirm/prompt (Paket DLG-1)

Ersetzt alle nativen Browser-Dialoge durch barrierefreie In-App-Modale. Native `alert`/`confirm`/`prompt` sind für die blinde Pioneer-Tester-Kohorte (iPhone, VoiceOver, Bluefy) unzuverlässig bis unbenutzbar. Größter A11Y-Befund aus dem QA-1-Audit (Backlog 4). MINOR, neues Dialog-System mit Verhaltensänderung. Kein Backend-Eingriff, cscCrypto unberührt.

- **Neue Bausteine:** `uiAlert(msg)`, `uiConfirm(msg)` und `uiPrompt(msg, default)` geben Promises zurück und rendern ein echtes `role="dialog"`-Modal (`#modalDlg`), das vom Inert-System (v9.7.0) erfasst wird, eine Fokus-Falle und Esc/Enter hat und Bestätigungen vorliest. `uiConfirm` löst zu `true`/`false`, `uiPrompt` zum eingegebenen Text oder `null` bei Abbruch, jeweils analog zu den nativen Pendants.
- **Voller Sweep:** Alle 70 nativen Aufrufe (7 `alert`, 38 `confirm`, 24 `prompt` plus ein verstecktes `window.prompt`) wurden ersetzt. Funktionen, die einen Dialog gaten, wurden dafür zu `async` und nutzen `await`. Aufrufer-Ketten wurden geprüft, der eine synchrone Sonderfall (`checkBagsLimit`, in `startBagFill` per `if(...)` genutzt) wurde sauber auf `await` umgestellt.
- **Blind-kritische Flows** profitieren besonders: PIN setzen/entfernen/Backup-Ver- und Entschlüsseln, der Programm-Variablen-Dialog beim Programmstart (der R0-Nebenbefund), Sorten/Profile/Geräte-Eingaben sowie alle Löschen- und Zurücksetzen-Bestätigungen.
- **Verhalten erhalten:** Die Texte, Validierungen und Abbruch-Semantik sind unverändert (Abbrechen = `null`/`false`, Eingabe = Wert). Nur der Dialog-Mechanismus wurde ausgetauscht.

**Unberührt:** cscCrypto, Backend, die App-Logik (nur der Dialog-Mechanismus). **Tests:** `v911dlg.mjs` (22: Bausteine, uiConfirm/uiPrompt/uiAlert, Source-Guard „keine nativen Dialoge mehr", migrierte E2E-Flows für confirm-gated Delete und prompt-Flow). Mehrere bestehende Suiten, die native Dialoge stubten (`v51`, `v901hotfix`, `v930picker`, `v90pioneer-s3`), wurden auf das neue Modell (uiConfirm-Stub plus `await`) umgestellt. Volle Regression grün.

## v9.10.1 — Doku-Staleness-Patch (Paket DOC-2)

Rein redaktioneller Patch aus dem QA-1-Audit (Backlog 14), plus zwei nicht-funktionale Code-Korrekturen (Kommentare und eine ungenutzte Funktion). Keine Verhaltensänderung, kein Backend, cscCrypto unberührt.

- **VOICE-BEFEHLE.md:** Header „Stand: v9.7.1 (mit Vorschau auf v9.8.0)" auf v9.10.1 aktualisiert, Überschrift „Programm-Steuerung (kommt mit v9.8.0)" auf „(seit v9.8.0)" (v9.8.0 ist live).
- **docs/SIRI-SHORTCUTS-ANLEITUNG.md:** Stempel von „v9.6.0" auf v9.10.1 aktualisiert (die URL-Befehle sind seit v9.6.0 unverändert, daher nur der Stempel).
- **docs/P-AUDIT-PROGRAMME:** fehlender Erledigt-Vermerk nachgetragen (umgesetzt in v9.3.0 / Paket P), für Parität mit den anderen Audit-Docs.
- **Pioneer-Test-Zahlen:** drei veraltete Code-Kommentare („12 Tests" pro Pfad, „24 Test-Definitionen") auf die tatsächlichen 15 pro Pfad / 30 gesamt korrigiert. Die ungenutzte `_pioneerShowPathChoice`-Funktion (deprecated, kein Live-Aufrufer) leitet ihre Zahlen jetzt dynamisch aus `PIONEER_TESTS` ab, damit sie nie wieder veralten. Der Live-Pioneer-Pfad nutzte bereits dynamische Zahlen.

**Unberührt:** App-Verhalten (nur Kommentare, Doku und eine tote Funktion), cscCrypto, Backend. **Tests:** keine neue Suite (rein redaktionell); volle Regression grün.

## v9.10.0 — Sicherheits- und A11Y-Härtung (Paket SEC-1)

Umsetzung der kleinen, hochwirksamen Befunde aus dem QA-1-Audit (`docs/QA-1-AUDIT-2026-06-06.md`). MINOR, weil das PIN-Sicherheitsmodell mit Migration geändert wird. Kein Backend-Eingriff, cscCrypto unberührt.

- **PIN-Härtung:** Die PIN-Sperre nutzte bisher einen `Math.random()`-Salt und ein einfaches `sha256(salt+pin)` ohne Key-Stretching, offline brute-forcebar wenn `vol_prefs` abfließt. Neu: bei jedem Setzen einer PIN ein kryptografisch sicherer 16-Byte-Salt (`crypto.getRandomValues`) plus PBKDF2 mit 100.000 Iterationen (`_pinHashPbkdf2`). Ein Format-Marker `PREFS.pinKdf` unterscheidet Legacy (`sha256`) von gehärtet (`pbkdf2`).
- **Transparente Migration:** Bestehende PINs (Legacy-SHA-256) werden beim ersten korrekten Eingeben automatisch auf PBKDF2 hochgestuft (`_pinVerify`), ohne dass der Nutzer etwas tun muss. **Wichtig:** der bestehende `pinSalt` wird dabei NICHT geändert, weil er zugleich der Salt der optionalen Backup-Verschlüsselung ist (`deriveKey(pin, pinSalt)` für `vol_encrypted`). Ein Salt-Wechsel hätte vorhandene verschlüsselte Backups unbrauchbar gemacht; daher wird nur der Hash-Algorithmus migriert, der Salt bleibt. Die Backup-Verschlüsselung (`deriveKey`, ebenfalls PBKDF2-100k) ist unverändert.
- **A11Y-Labels:** Zwei dynamisch gerenderte Controls, die der Laufzeit-Auto-Labeler strukturell nicht erreicht, bekommen jetzt statische `aria-label`: die Session-Tagebuch-Filter-Dropdowns (`#sessFilterDev` / `#sessFilterDays`) und der Zeitplan-Schalter im Session-Planer (mit dem Zeitplan-Namen). Für VoiceOver-Nutzer waren diese vorher namenlos.
- **Diagnose-Melde-Pfad barrierefrei:** `exportDiagnostics` greift jetzt nur noch auf `navigator.clipboard` zu, wenn es existiert (in Bluefy/insecure context kann es fehlen und synchron werfen, genau der Kopier-Pfad, den blinde Tester brauchen). Der Hardware-Fehler-Toast sagt nicht mehr „Screenshot an Andre" (für blinde Nutzer unbrauchbar), sondern verweist auf „Diagnose-Log kopieren und an Andre senden".
- **`#hotelOverlay`** bekam `aria-modal="true"` für Konsistenz mit `#pinOverlay`.

**Unberührt:** cscCrypto, Backend, die Backup-Verschlüsselung (`deriveKey`), die PIN-Eingabe-UX (gleiche Overlay-Flows), das Recovery-System aus v9.9.0. **Tests:** `v910sec1.mjs` (28: Hash-Primitiven, `_pinVerify` pbkdf2, Legacy-Migration mit Salt-Erhalt, E2E-Unlock mit Migration, A11Y-Labels, Diagnose-Härtung). Volle Regression grün.

## v9.9.0 — Recovery-Mechanismus für PIN (Paket REC-1)

Bei vergessener PIN waren bisher alle lokalen Daten verloren (localStorage musste gelöscht werden). Ein Recovery-Code löst das. MINOR, neues Feature, kein Breaking Change. Eigene Crypto-Domain (nicht cscCrypto), kein Backend-Eingriff.

- **Recovery-Code:** 4 BIP39-Wörter aus der englischen Standard-Wortliste (2048 Wörter, inline eingebaut), zum Beispiel „hammer table river forest". 44 Bit Entropie, kryptografisch sicher per `crypto.getRandomValues`. Der Code wird nie im Klartext gespeichert, sondern als SHA-256-Hash mit einem 16-Byte-Salt (`crypto.getRandomValues`) in localStorage.
- **Optional beim PIN-Setzen** (Andres Entscheidung 4): nach dem Setzen erscheint ein Dialog mit der Frage, ob ein Recovery-Code generiert werden soll. „Nein" zeigt eine deutliche Warnung. „Ja" zeigt den Code groß an, mit Kopier-Button und einer Pflicht-Checkbox „Ich habe den Code sicher notiert", die das Bestätigen freischaltet (der Code wird danach nicht erneut angezeigt).
- **Mehrfach nutzbar** (Entscheidung 2): der Code bleibt gültig, solange die PIN nicht geändert wird. Beim PIN-Ändern oder Entfernen werden die Recovery-Daten gelöscht (und beim Ändern ein neuer Code angeboten).
- **Direct-Unlock** (Entscheidung 3): nach erfolgreicher Recovery entsperrt die App direkt, kein erzwungener PIN-Reset. Der Nutzer kann später in den Einstellungen selbst eine neue PIN setzen oder die Sperre deaktivieren.
- **„PIN vergessen?"** erscheint im PIN-Sperrbildschirm nur, wenn ein Recovery-Code aktiv ist. Ein Klick öffnet ein Eingabefeld für die vier Wörter (Eingabe wird normalisiert: getrimmt, kleingeschrieben, Mehrfach-Leerzeichen zusammengefasst).
- **Brute-Force-Schutz** (nur für die Recovery-Eingabe): nach 5 Fehlversuchen 60 Sekunden Sperre mit Countdown, danach Zähler-Reset. Die bestehende PIN-Eingabe selbst wurde bewusst nicht verändert (separates Thema).
- **Einstellungen:** unter Zugriffsschutz zeigt eine neue Zeile den Recovery-Status (Aktiv / Nicht aktiv) mit einem Button zum Generieren oder Neu-Generieren. Nur sichtbar, wenn die PIN-Sperre aktiv ist.

Der Dialog ist ein `role=dialog`-Modal und wird vom Modal-Inert-System aus v9.7.0 korrekt behandelt. **Unberührt:** cscCrypto, Backend, die bestehende PIN-Eingabe-Logik, das PIN-Storage-Format. **Tests:** `v99recovery.mjs` (35: BIP39-Liste, Generierung, Normalisierung, Hashing, Modal-Ja/Nein-Pfad, Verify plus Brute-Force, E2E-Unlock über `requirePin`, Clear-Wiring, Settings-Status). Volle Regression grün.

## v9.8.0 — Run-Engine-Refactor: Voice-Pause/Skip/Previous + responsiver Abbruch (Paket R1)

Implementiert die in B2.3 zurückgestellten Programm-Lauf-Befehle (A Pause, B Skip, C Previous) plus einen responsiveren Abbruch. Grundlage: `docs/R0-AUDIT-2026-06-05.md`. MINOR, neues Feature-Set. Kein Backend-Eingriff, cscCrypto unberührt.

**Architektur** (vom Audit empfohlen): Da `expandLoops` alle Schleifen vor dem Lauf zu einem flachen Array auflöst, ist die Engine zur Laufzeit nur ein Index in eine flache Liste. Der `for`-Loop wurde zu einem index-gesteuerten `while`-Loop, kombiniert mit einer unterbrechbaren Warteprimitive, die alle 200 Millisekunden stop, skip, previous und paused prüft.

- **Pause/Weiter:** `_engineWait` und `_engineCheckpoint` halten den Fortschritt an, ohne den Gerätezustand zu ändern (Heizer bleibt an wie zum Pause-Zeitpunkt, Andres Entscheidung 1). Der Countdown friert bei Pause ein und setzt beim Weitermachen nahtlos fort (`_stepStartedAt`-Verschiebung um die Pausendauer).
- **Skip:** bricht die laufende Wartezeit ab und springt zum nächsten Schritt. Ein laufendes `pump_for` schaltet die Pumpe dabei sofort aus (Andres Entscheidung 2, garantiert über `finally` in der engine-eigenen `_enginePumpFor`). Der globale `cmdPumpFor` (UI-Buttons, Voice „pumpe für X") bleibt unangetastet (Entscheidung 7).
- **Previous:** setzt nur den Index zurück und führt ab dort normal weiter, kein Rückgängig-Machen bereits ausgeführter Aktionen (Entscheidung 3). Am ersten Schritt passiert nichts.
- **Pause-Timeout:** nach 30 Minuten Pause automatischer Abbruch mit Sprach-Hinweis (Entscheidung 5).
- **Voice (Entscheidung 6):** „pause"/„pausiere"/„anhalten", „weiter"/„fortsetzen", „nächster Schritt", „vorheriger Schritt". Die Phrasen stehen bewusst vor der Navigations-Erkennung, damit bare „zurück"/„weiter" nicht mit „schließe das Modal" oder der Tab-Navigation kollidieren, und Skip vor Resume, damit „weiter zum nächsten" als Skip zählt.
- **UI:** die Run-Card hat jetzt Pause/Weiter-, Zurück- und Schritt-Buttons plus eine assertive „⏸ Pausiert"-Anzeige, sodass Tester es auch ohne Stimme bedienen können. Voice und Buttons teilen sich dieselbe `_engineCtl*`-Logik.
- **Responsiver Abbruch (Bonus D):** weil `stopFlag` jetzt alle 200 Millisekunden in den Wartezeiten geprüft wird, reagiert der B2.3-Abbruch sofort (vorher erst am Schritt-Ende, bei einem `wait_until` bis zu mehrere Minuten Verzögerung).

**Race-Verhalten:** Stop hat Vorrang vor Skip und Pause. Skip oder Previous während einer Pause heben die Pause auf. BLE-Disconnect während Pause hält die Pause (der Nutzer entscheidet, Entscheidung 4).

**Unberührt:** cscCrypto, Backend, der globale `cmdPumpFor`, Wake-Word, die Step-Action-Typen, Werks-Programme. Der `prompt()`-Nebenbefund beim Programmstart bleibt für ein separates Paket (Entscheidung 8). **Tests:** `v98engine.mjs` (54: State-Felder, `_engineWait`, Pause/Resume, Skip, Previous, Pause-Timeout, `pump_for`-Cleanup, Race Pause plus Stop, Abbruch unter 500 Millisekunden, Parser, executeVoiceCommand, UI). Volle Regression grün. Finale Geräte-Abnahme bleibt ein manueller Lauf am echten Vaporizer.

## v9.7.1 — A11Y Nice-to-haves + Blätter-Konsistenz (Paket A11Y-N1)

Reine A11Y-Polish aus den A-Audit- und B-Audit-Reviews, keine Bugs. PATCH-Bump. Kein Backend-Eingriff, cscCrypto unberührt.

- **N1.1 Blätter statt Sterne (Konsistenz):** Die Bewertungs-Symbole sind seit v8.9.0 Cannabis-Blätter, einige Texte sagten aber noch „Sterne". Umgestellt: die Bewertungs-Toasts („Bewertung: N Blätter"), die Voice-Bestätigung („N Blätter für X gespeichert") und der VOICE_HELP-Eintrag. Die Render-aria-labels („N von 5 Blättern", `role=radio`/`aria-checked`) waren bereits korrekt. Der **Voice-Parser versteht jetzt beides:** „bewerte mit 4 Blättern" und weiterhin „bewerte mit 4 Sternen" (das Synonym `blaett`/`blatt` wurde zur normalisierten Erkennung ergänzt, die Tester sind „Sterne" gewohnt).
- **N1.2 Pioneer-Anzahl 24 zu 30:** Der Pioneer-Test-Pfad hat seit v9.0.0 dreißig Aufgaben (`PIONEER_TESTS.length`), mehrere Tooltips und Achievement-Texte nannten noch 24. Korrigiert und zukunftssicher gemacht: `_a11ySyncPioneerCount()` setzt den Tab-Tooltip und den Settings-Hinweis dynamisch aus `PIONEER_TESTS.length`. Die Achievement-Beschreibungen (Completionist, Accessibility Champion) sind jetzt zahl-frei formuliert, die Vergabe-Logik war ohnehin dynamisch (`PIONEER_TESTS.every`).
- **N1.3 Dekorative SVGs:** Das dekorative Temperatur-Graph-SVG bekam `aria-hidden="true"` plus `focusable="false"`. Das QR-Fehler-Fallback-SVG (funktional) bekam `role="img"` mit `aria-label`. Die übrigen Diagramm-SVGs (Heizkurve, Statistik, QR-Code) hatten bereits `role="img"` mit Label, das Blatt-Icon bereits `aria-hidden`.
- **N1.4 Live-Region-Politeness:** Geprüft, keine Änderung nötig. `#ttsLive` und `#srAlert` sind korrekt `assertive`, `#voiceFeedback` korrekt `polite` (Status), `#connLostBanner` korrekt `assertive`.
- **N1.5 syncToggle global:** `syncToggle` (setzt `aria-checked` auf `role=switch`-Toggles) war eine lokale `const` in einer Funktion, ein Aufruf an anderer Stelle (`togTrackingEnabled`) lief deshalb ins Leere. Jetzt eine globale Funktion, überall verfügbar.

**Unberührt:** cscCrypto, Backend, Run-Engine, Wake-Word, der Voice-Parser über N1.1 hinaus, die visuellen Symbole (Blätter bleiben Blätter). **Tests:** `v971polish.mjs` (26); volle Regression grün.

## v9.7.0 — Modal-Inert Fix (Paket A11Y-D2)

Behebt einen von einem blinden Tester (iPhone, VoiceOver, Bluefy) gemeldeten Bug: Bei offenem Modal wischte VoiceOver aus dem Dialog heraus und las Buttons und Texte aus dem Hintergrund-DOM vor, die im aktiven Modal gar nicht existieren. MINOR, A11Y-Fix mit Tester-Impact. Kein Backend-Eingriff, cscCrypto unberührt.

**Diagnose** (`docs/A11Y-D1-AUDIT-2026-06-05.md`): Beim Modal-Open wurde der Hintergrund nicht inertiert. Es gab kein `inert` und keine JS-gesteuerte `aria-hidden` auf Geschwister. Die einzige Eingrenzung war `aria-modal="true"`, und darauf darf man sich auf iOS Safari und in Bluefy (WKWebView) nicht verlassen. Die beiden vorhandenen Fokus-Fallen sind reine Tab-Tasten-Schleifen und gegen VoiceOver-Wischen wirkungslos. Glücksfall: Die `<body>`-Struktur ist flach, alle Modale, `#main`, Header und die Live-Regionen sind direkte body-Kinder.

**Lösung:** Eine idempotente Hintergrund-Inertisierung. Bei jedem Modal-Open und -Close berechnet `_a11yRecomputeInert()` neu: erst alle Markierungen freigeben, dann das oberste offene Modal oder Overlay bestimmen und alle anderen direkten body-Kinder mit `inert` plus `aria-hidden="true"` schalten. Markierung über `data-a11y-inertified`, damit das Aufräumen nur Selbst-Gesetztes entfernt und statische Deko-`aria-hidden` (Icons) unangetastet bleiben.

- **Whitelist (nie inertiert):** Live-Regionen und Status (`#ttsLive`, `#srLive`, `#srAlert`, `#voiceFeedback` und alles mit `aria-live` oder `role` in status/alert/alertdialog) plus das kritische `#connLostBanner` (Andres Entscheidung 1: Verbindungsabbruch bleibt auch bei offenem Dialog hörbar).
- **Stacking** fällt automatisch heraus: Da immer nur das oberste Modal nicht-inert ist, wird beim Öffnen eines Sub-Modals das Eltern-Modal inert und beim Schließen wieder aktiv.
- **`.modal`-Elemente werden nie über die Whitelist exemptiert** (Edge-Hunt-Fund): ein Hintergrund-Modal mit `role="alertdialog"` (z. B. `#modalBeta`) muss inert werden; das aktive Modal wird separat ausgenommen.
- **PIN- und Hotel-Overlay** (`#pinOverlay`, `#hotelOverlay`) werden per `style.display` statt `.modal`-Klasse getoggled und daher von einem eigenen Style-Observer erfasst (Andres Entscheidung 2). Sie selbst bleiben von der Inertisierung ausgenommen, was zugleich eine Observer-Schleife verhindert.
- **`#ttsLive` bleibt assertive** (Andres Entscheidung 3), keine Pro-Modal-Live-Region (Entscheidung 4), `inert` plus `aria-hidden` parallel (Entscheidung 5).

Integration über Option B aus der Diagnose: kein zentraler `openModal`-Refactor, sondern Anbindung an den bereits existierenden W2/W3-Klassen-Observer plus den neuen Overlay-Style-Observer. **Unberührt:** cscCrypto, Backend, Run-Engine, Wake-Word, Voice-Parser, die beiden bestehenden Fokus-Fallen. **Tests:** `v97inert.mjs` (27, inkl. Open/Close, Stacking A über B, PIN-Overlay, Live-Region bei offenem Modal, Marker-Disziplin); volle Regression grün. Finale Abnahme bleibt ein manueller VoiceOver-Pass auf einem echten iPhone in Bluefy.

## v9.6.0 — iOS/Bluefy/Siri-Bridge (Paket C)

Umsetzung der Quick Wins aus `docs/C-AUDIT-2026-06-04.md`. MINOR, iOS- und Siri-Erweiterung. Kein Backend-Eingriff, cscCrypto unberührt. Andres sechs Design-Entscheidungen umgesetzt.

- **C1, Bluefy-Live-Regions:** Eine assertive `aria-live`-Region `#ttsLive` direkt nach `<body>`. `ttsSay` spiegelt jede Bestätigung dorthin (Clear plus verzögertes Setzen, damit der Screen-Reader die Änderung sicher ankündigt). Damit hören VoiceOver-Nutzer auch in Bluefy eine Bestätigung, wo `SpeechSynthesis` systembedingt blockiert ist. Im Screen-Reader-Modus nur die Live-Region, keine zusätzliche App-TTS (vermeidet Doppel-Vorlesen). Auf normalen Browsern läuft die Sprachausgabe wie bisher, plus stiller Live-Region-Spiegel.
- **C2, Haptik-Label ehrlich:** Neue Erkennung `_vibrationUsable()` (iOS = nie nutzbar, da Apple `navigator.vibrate` in WebKit nicht implementiert). `_applyHapticLabel()` ergänzt auf iPhone den Hinweis „(auf iPhone systembedingt nicht verfügbar)". Der Schalter bleibt funktional für Android und Desktop, das Versprechen wird nur ehrlich gemacht statt versteckt.
- **C3, URL-Commands erweitert:** Drei neue Befehle ohne BLE: `abort` (nutzt die `abortProgram`-Logik aus B2.3), `help` (öffnet `#modalVoiceHelp`), `open_strain` (`?value=<Name>`, ruft die Sorten-Suche). Dazu deutsche Siri-Aliase `abbrechen`, `hilfe`, `sorte`. Alle parallel zu den bestehenden 15 Commands.
- **C4, Shortcuts-Modal erweitert:** Prominenter BLE-Hinweis am Anfang (nicht in einem Akkordeon versteckt) plus ein iPhone-Bluefy-Tipp, und die neuen Befehle in der kopierbaren URL-Liste. **Bugfix nebenbei:** `openShortcutsModal` öffnete fälschlich `#modalKbdShortcuts` (Tastatur-Hilfe), während es die Liste in `#modalShortcuts` (Siri/URL) füllte. Die Siri-Modal wurde dadurch nie angezeigt. Jetzt öffnet und schließt der Button korrekt `#modalShortcuts`.
- **C5, Siri-Anleitung:** Neue `docs/SIRI-SHORTCUTS-ANLEITUNG.md` mit Schritt-für-Schritt-Aufbau, vollständiger Befehlsliste, fertigen URL-Strings zum Nachbauen und einem ehrlichen Abschnitt zu den Grenzen (BLE-Wiederverbindung, kein Siri-Rückkanal, keine Vibration). Keine iCloud-Shortcut-Dateien, das geht nicht aus dem Code.

**Bewusst NICHT in Paket C** (Plattformgrenzen, kein Bug): TTS in Bluefy „reparieren", echte iOS-Haptik, Siri-Rückkanal oder Hintergrund-BLE. Run-Engine-Refactor (Pause/Skip) bleibt ein eigenes Paket. **Unberührt:** cscCrypto, Backend, Run-Engine, Wake-Word. **Tests:** `v96live.mjs` (11) + `v96haptic.mjs` (8) + `v96urlcmds.mjs` (14) + `v96shortcuts.mjs` (11); volle Regression grün.

## v9.5.0 — Voice Big Tickets (Paket B2)

Zweite Voice-Ausbaustufe aus `docs/B-AUDIT-2026-06-04.md`, in drei Phasen, ein Release. MINOR, große A11Y-Erweiterung. Deutsch only für neue Befehle, kein Backend-Eingriff.

**B2.1, TTS-Tempo + Lautstärke:** Auswahl Sprechgeschwindigkeit (langsam 0,7 / normal 1,05 / schnell 1,5 / sehr schnell 2,0) mit „▶ Test", plus Lautstärke-Slider 0 bis 100 Prozent (Live-Vorschau). `PREFS.ttsRate` / `PREFS.ttsVolume`. Zentrale, geclampte Helfer `_ttsRate()` / `_ttsVolume()` gelten für alle app-eigenen Ansagen (die sechs vorher hart auf 1,05 gesetzten Stellen nutzen sie jetzt). Besonders für VoiceOver-erfahrene blinde Nutzer, die schneller hören wollen.

**B2.2, Aroma/Sorten per Voice:** „öffne Sorte <Name>" (Werks aus `AROMA_DB`, Community aus dem Cache), „suche Sorte <Wort>" (Top 3 per TTS), „bewerte Sorte <Name> mit <1 bis 5> Sternen" / „<N> Sterne für <Name>" / „bewerte mit <N> Sternen" (geöffnete Sorte). Bewerten nur für Community-Sorten (Login nötig). Bei mehreren Treffern ein Multi-Turn-Dialog: die App liest die ersten drei vor, der Nutzer wählt per „eins/zwei/drei" oder „die erste", „vergiss es" bricht ab, nach 30 Sekunden Timeout. Substring-Match mit Umlaut-Normalisierung.

**B2.3, Programm abbrechen (Subset):** „stoppe das Programm", „Programm abbrechen/beenden", „brich das Programm ab" beenden nur das laufende Programm (Heizer und Pumpe bleiben an, anders als „alles aus"). Bares „abbrechen" bleibt bewusst „alles aus".

**Bewusst NICHT gebaut:** Pause, nächster Schritt und vorheriger Schritt während eines laufenden Programms. Der Architektur-Check ergab, dass die Run-Engine (eine `for`-Schleife mit nicht abbrechbaren `await`-Schritten) dafür keine sauberen Hooks hat. Das bräuchte einen Run-Engine-Refactor (Pause-Schleife plus abbrechbare Waits) und wird, nach Andres Entscheidung, in einem eigenen Engine-Paket adressiert. Aktuell ist nur „abbrechen" verfügbar.

**Unberührt:** cscCrypto, Backend, Run-Engine, Wake-Word. **Tests:** `v95tts.mjs` (21) + `v95strains.mjs` (26) + `v95runtime.mjs` (13); volle Regression grün.

## v9.4.0 — Voice Quick Wins für Accessibility (Paket B1)

Erste Ausbaustufe der Sprachsteuerung, gezielt auf die Lücken aus `docs/B-AUDIT-2026-06-04.md`, die blinde Tester (iPhone + VoiceOver) am stärksten entlasten. MINOR-Bump (neues Feature-Set). Deutsch only für neue Befehle, kein neuer Englisch-Ausbau. Backend und cscCrypto unberührt.

- **Hilfe-Befehl:** „Hilfe", „was kann ich sagen", „Befehle" lesen die verfügbaren Sprachbefehle vor (gruppiert nach Navigation, Gerät, Programm, Sonstiges) und öffnen ein neues `#modalVoiceHelp`. Bei aktivem Screen-Reader-Modus nur das Modal (VoiceOver liest es selbst), sonst zusätzlich vorgelesen. Dazu ein Button „📋 Voice-Befehle anzeigen" in den Einstellungen.
- **Navigations-Befehle (ohne BLE-Verbindung):** „öffne Steuerung/Programme/Sorten/Setup", „öffne Community" (öffnet die Sorten-Ansicht), „öffne Sessions", sowie „schließe" und „zurück" für das oberste offene Modal. Mit kurzer Bestätigung.
- **Wiederhole:** „wiederhole", „nochmal", „was hast du gesagt" geben die letzte Ansage erneut aus, auch im Screen-Reader-Modus (explizit angefordert).
- **Text-Befehl-FAB und iOS-Diktat:** klareres `aria-label` und Platzhalter, plus ein einmaliger Tipp in iOS-Bluefy, dass die Mikrofon-Taste der Tastatur zum Diktieren funktioniert. Das ist der realistische Voice-Pfad in Bluefy, wo die Web-Speech-API fehlt.
- **TTS-Ausführlichkeit:** neuer Schalter „Knappe Ansagen" (Einstellungen, Sprachsteuerung). `PREFS.ttsVerbosity` = `verbose` (Default) oder `compact`. `ttsEvent` wählt per `_ttsPickText` die passende Variante, Beispiel-Event „Ziel-Temperatur erreicht" kurz als „185 Grad".
- **Bugfix (aus dem Audit):** der `runProgram`-Regex war ein Catch-all, „starte X" konnte fast alles als Programm-Start fehl-interpretieren. Jetzt ist das Schlüsselwort „Programm" Pflicht („starte Programm <Name>"), das reduziert Fehl-Trigger deutlich. Nebenbei ein HTML-Bug im Text-Input-Platzhalter gefixt (gerades Anführungszeichen im Attribut).

**Bewusst nicht in B1** (kommt in B2 oder Paket C): Programm-Lauf-Steuerung per Stimme, Aroma/Sorten per Stimme, TTS-Tempo/Lautstärke, Siri-Shortcuts-Brücke. **Tests:** `v940voice.mjs` (30), volle Regression grün.

## v9.3.1 — A11Y-Polish W1+W2+W3 (Paket A)

Reiner A11Y-Patch, kein neues Feature. Arbeitet die letzten offenen WICHTIG-Befunde aus `docs/A-AUDIT-2026-06-03.md` ab, besonders relevant geworden durch die gestapelten Sub-Modale aus Paket P.

- **W1 erledigt:** Ein visuell verstecktes `<h1 class="sr-only">Terp Sessions</h1>` direkt nach `<body>` gibt der VoiceOver-Rotor-Navigation eine Seitenüberschrift. Vorher hatte die App kein `<h1>` (nur das PDF-Export-Template). Die `.sr-only`-Klasse existierte bereits.
- **W2 erledigt:** Die Fokus-Rückgabe beim Schließen von Modalen läuft jetzt über einen Stack (`_a11yModalFocusStack`) statt eines einzelnen globalen Werts. Bei gestapelten Sub-Modalen (`#modalCommunityProgramEdit` zu `#modalEditor` zu `#modalTemplatePicker`) kehrt der Fokus beim Schließen jeweils zum auslösenden Element der darunterliegenden Ebene zurück. Push beim Öffnen, Pop beim Schließen.
- **W3 erledigt:** Ein `childList`-MutationObserver auf `document.body` versieht auch zur Laufzeit hinzugefügte Modale (z. B. `#modalKbdShortcuts`) automatisch mit Esc, Fokus-Trap und Fokus-Management. Vorher griff das nur für beim Start vorhandene Modale. Die Modal-Enhancement-Logik wurde dafür in `_a11yEnhanceOneModal` ausgelagert.

**Unberührt:** cscCrypto, Backend, Schema. Die Nice-to-have-Befunde (Sterne-Anzahl im Label, veralteter Tooltip usw.) bleiben bewusst für separate Mini-Pakete. **Tests:** `v931a11y.mjs` (16, inkl. LIFO-Fokus-Rückgabe und dynamischem Modal), volle Regression grün.

## v9.3.0 — Programm-Templates + Editor-Vereinheitlichung + Veröffentlichen (Paket P)

Größeres Feature in drei Phasen (P1 bis P3). Ziel (aus `docs/P-AUDIT-PROGRAMME-2026-06-03.md`): Community-Programme bekommen denselben reichen Editor wie eigene Programme, jedes Programm kann als Vorlage dienen, und eigene Programme lassen sich in die Community veröffentlichen. Kein Backend-Eingriff, die nötigen RPCs (`community_program_create`, `community_program_list`) existierten bereits.

**Andres fünf Design-Entscheidungen:** (1) In-Editor-Template-Picker als Modal mit Suche/Filter, (2) Sorten-Verknüpfungen beim Laden mitkopieren, (3) alle Community-Programme als Templates verfügbar, (4) Veröffentlichen lokal nach Community mit Bestätigungs-Dialog, (5) toten Code aufräumen.

**P1, Editor-Vereinheitlichung (Delegation):** Der simple Inline-Step-Editor des Community-Modals wurde durch eine Read-Only-Summary plus Button „🛠 Schritte bearbeiten" ersetzt, der den bestehenden reichen `#modalEditor` auf die Community-Schritte öffnet (Sub-Modal). `openEditor(id, opts)` ist rückwärtskompatibel und kennt jetzt einen Delegations-Modus (`opts.onSave/onClose/title/steps`, `editorState.__source`). Werks-Programme bleiben schreibgeschützt (read-only Summary, kein Editor-Button). Architektur-Entscheidung war Delegation statt Inline-Komponente, weil das reiche Editor-DOM fest in `#modalEditor` verdrahtet ist.

**P2, Template-Picker:** Button „📚 Aus Vorlage laden" im Editor öffnet das Sub-Modal `#modalTemplatePicker` mit Suche, Quellen-Filter (Alle/Built-in/Community) und gemergten Quellen: 19 Built-in-Presets plus alle Community-Programme (`programList`, lazy). Werks-Programme mit 🔒-Badge, ladbar aber nicht editierbar. „Laden" macht Deep-Copy der Schritte (Confirm bei nicht-leeren Schritten); im Community-Modus werden die Sorten-Verknüpfungen mitkopiert.

**P3, Veröffentlichen + Cleanup:** Eigene Programme (nicht-Preset) zeigen bei eingeloggten Community-Nutzern einen „🌐"-Button, der einen Bestätigungs-Dialog mit Vorschau (Name, Schritt-Anzahl, Dauer, Sichtbarkeit, Pseudonym) öffnet. Bestätigung ruft `programCreate` auf, invalidiert die Listen-Caches und meldet Erfolg oder Fehler (Dialog bleibt bei Fehler offen). Toter Code entfernt: `duplicatePreset` (nirgends aufgerufen) und `_commProgValidActions` (seit P1 ungenutzt).

**Sub-Modal-Stack:** `#modalCommunityProgramEdit` zu `#modalEditor` zu `#modalTemplatePicker`, z-index und Esc-Isolation laufen automatisch über den bestehenden Modal-Stack- und A11Y-Observer. Alle neuen Karten/Listen sind Buttons (Tastatur/VoiceOver-fokussierbar, K1-konform).

**Unberührt:** cscCrypto, Backend, Schema, Werks-Sorten/-Programme. **Tests:** `v930editor.mjs` (29) + `v930picker.mjs` (24) + `v930publish.mjs` (22); bestehende Programm-Suiten auf die Delegation aktualisiert; volle Regression grün.

## v9.2.1 — Karten fokussierbar für VoiceOver (Paket A K1)

Reiner A11Y-Patch, kein neues Feature. Behebt den kritischen Befund **K1** aus `docs/A-AUDIT-2026-06-03.md`: klickbare Karten waren nicht-fokussierbare `<div>` ohne `role`/`tabindex`/Tastatur-Handler, dadurch konnten die 5+ blinden Tester (iPhone + VoiceOver) Sorten- und Programm-Details nicht öffnen.

- Neuer A11Y-Helfer `makeActivatable(el, {label, role, onActivate})`: setzt `role="button"`, `tabindex="0"`, optionales `aria-label` und bindet Enter + Leertaste zusätzlich zum Klick.
- Angewendet auf **alle 7 als Ganzes klickbaren Karten/Zeilen** (im Audit waren nur 2 bis 4 genannt, der Rest kam beim Implementieren dazu): Community-Sorten-Karte, Community-Programm-Karte, Session-Zeile, Geräte-Auswahl, Ballon-Auswahl, Profil-Karte, Touch-Macro-Karte. Werks-Sorten/-Programme tragen 🔒 im Label.
- Reine Button-Container (`aroma-card`, eigene `prog`-Karte) und die bereits als `<button>` umgesetzte Theme-Karte blieben unberührt.
- Sichtbarer Fokus-Ring per `:focus-visible` (kein Ring bei reinen Maus-Klicks).
- Version v9.2.0 → v9.2.1 (PATCH). W1 (`<h1>`), W2 (Fokus-Stack) und die Nice-to-haves bleiben bewusst für separate Pakete.

**Tests:** `v921a11y.mjs` (29, inkl. echter Enter/Leertaste/Klick-Aktivierung), volle Regression grün.

## v9.2.0 — Werks-Sorten Polish (Paket N4, final)

Letztes Paket der N-Serie. Wichtig: das eigentliche Feature („Werks-Sorten als Community-Mirror") war **bereits seit v8.7.5 vorhanden** und der Seed-Patch ist in der Live-DB eingespielt. v9.2.0 zieht nur den fehlenden UX-Polish nach, **keine** Schema-Änderung, **kein** SQL-Patch.

**Bereits vorhanden (kein Neubau in N4):**
- Tabelle `community_strains` mit `is_factory_seed`; 127 Werks-Sorten als Mirror (Owner `FACTORY`, nicht einloggbar) via `community-backend-patch-factory-seed.sql`. Sanity-Check: die 127 Seed-Sorten decken sich namensgenau mit der eingebetteten `AROMA_DB` (kein Drift).
- Bewertungen über `community_strain_rate`; `community_strain_list` liefert bereits `avg_stars`, `review_count`, `my_stars`. Ein separates `get_strain_ratings_summary` war daher nicht nötig.
- Edit-Schutz über das bestehende Ownership-Modell (RLS deny-all plus RPC-gated; FACTORY kann sich nicht einloggen, daher kein „Edit own" auf Werks-Sorten).

**Neu in v9.2.0 (UX-Polish):**
- 🔒-Schloss-Icon am „Werks-Vorschlag"-Badge der Sorten (Karte und Detail).
- Im Detail einer Werks-Sorte ein klarer Hinweis „🔒 Werks-Sorte, direkte Bearbeitung gesperrt. Bewerten und Änderungen vorschlagen ist möglich." plus `title`-Tooltip am Edit-Vorschlag-Button. Direktes Bearbeiten/Löschen bleibt gesperrt, Bewerten und Edit-Vorschläge bleiben möglich.

**Unberührt:** cscCrypto, alle Backend-RPCs, Schema. **Tests:** `v920factory.mjs`, volle Regression grün.

## v9.1.0 — DSGVO data_consent_at (Paket N3)

Rechtssicherer Nachweis, wann ein Community-Nutzer der Datenschutzerklärung zugestimmt hat. MINOR-Bump, weil es eine Backend-Schema-Änderung ist.

**Backend (SQL-Patch 13, von Andre in Supabase eingespielt):**
- Neue Spalte `data_consent_at` in `csc_users`. Echte Nutzer per Backfill auf das Release-Datum 2026-06-03, danach NOT NULL + DEFAULT now() (neue Registrierungen bekommen den Zeitpunkt automatisch).
- Minimal-invasiv: `csc_register` wurde nicht angefasst (DEFAULT now() genügt), kein Audit-INSERT (es gibt keine generische Audit-Tabelle).
- Der FACTORY-System-Dummy (`code='FACTORY'`, kann sich nicht einloggen) bekommt 1970-01-01 als n/a-Marker, weil er nie zugestimmt hat.
- Patch 13b (optional, noch nicht eingespielt) würde die Login-RPC erweitern, damit das Profil das echte Datum statt „noch nicht erfasst" zeigt.

**Frontend:**
- `communityClient` reicht `data_consent_at` aus der Login-Session durch (`currentSession`, `login`, `register`).
- Community-Profil zeigt „Datenschutz-Zustimmung seit: <Datum>" (deutsches Format) oder „noch nicht erfasst" (graceful, solange Patch 13b fehlt; 1970-Marker wird ebenfalls als „nicht erfasst" behandelt).
- Neuer Button „📄 Meine Daten": lädt eine DSGVO-Auskunft als JSON (Pseudonym, Code, Admin-Status, `data_consent_at`). Persönliche Tracking-Daten bleiben lokal und sind nicht enthalten.

**Unberührt:** cscCrypto-Modul, alle anderen Backend-RPCs. **Tests:** `v910consent.mjs` (27), volle Regression grün über 48 Suiten.

## v9.0.4 — Browser-Kompatibilitäts-Welcome (Paket N2)

Neuer „First-Visit-Compatibility-Check": Beim ersten Besuch eines neuen Browsers oder Geräts sieht der User klar, welche Funktionen verfügbar sind, statt versteckter Hinweise. Besonders wichtig für iPhone-Safari-User, die kein Web-Bluetooth haben.

**Zentrale Capability-Matrix `detectBrowserCapabilities()`** (baut auf der bestehenden `browserCapabilities()` auf, keine externen UA-Libs):
- Erkennt einen lesbaren Browser-Namen (iPhone Safari, iPhone Chrome, iPhone Bluefy, Android Chrome, Desktop Edge, usw.). iOS-Browser außer Bluefy (CriOS/FxiOS/EdgiOS) sind alle WebKit, werden also wie Safari behandelt.
- Liefert ehrliche Feature-Flags: `bluetooth` (iOS-WebKit und Firefox haben kein Web-Bluetooth), `tts` (bei Bluefy systembedingt aus), `voice` (Mikrofon-Spracherkennung, bei Bluefy aus).
- `hash` über Browser plus Feature-Flags, damit ein Browser-Wechsel erkannt wird.

**Welcome-Modal `modalCompatibilityWelcome`:**
- Zeigt „Du nutzt: …" plus Tabelle Feature für Feature (verfügbar / nicht verfügbar mit kurzer Erklärung).
- Kontextabhängige Empfehlung (iPhone ohne BT zu Bluefy, sonst Chrome/Edge) plus passende Buttons: „Bluefy im App Store öffnen" (nur wenn sinnvoll), „Trotzdem weitermachen", „Später erinnern".
- „Trotzdem weitermachen" merkt sich den Browser-Hash (`PREFS.compatibilityHintSeen`), „Später erinnern" nicht, der Hinweis kommt dann erneut.

**Trigger + Recall:** Beim Erst-Besuch automatisch (selbst-guarded, legt sich nie über Welcome-Flow, Onboarding-Tour oder ein anderes Modal, retryt sonst). Manuell jederzeit über Einstellungen, Sprachsteuerung, „🔎 Browser-Kompatibilität prüfen".

**Konsolidierung:** Die bestehenden Hints (`modalNoBluetooth`, Voice-FAB-Conditional, TTS-Bluefy-Heuristik) bleiben als Fallback unverändert.

**Tests:** neue Suite `v904hints.mjs`, volle Regression grün.

## v9.0.3 — Wake-Word „Hey Terp Sessions" + Pioneers-Naming (Paket N1.5)

Mini-Patch zwischen N1 und N2, zieht die zwei in N1 bewusst offen gelassenen Grenzfälle nach.

**Wake-Word erweitert:** Das Wake-Word erkennt jetzt zusätzlich „Hey Terp Sessions" (plus „Terp Sessions", „Okay/Ok Terp Sessions"). Die bisherigen Trigger („Hey Sessions" usw.) funktionieren weiter. `WAKE_WORDS` ist nach Prefix-Länge absteigend sortiert, damit `_wakeMatchPrefix` den korrekten Befehls-Rest extrahiert. Indikator-Pille, Einstellungs-Hilfetext und Aktivierungs-Toast nennen beide Trigger.

**„Sessions Pioneers" zu „Pioneers":** Der Programm-Eigenname heißt in der UI jetzt nur noch „Pioneers" (Setup-Karte, Beta-Bestätigungs-Modal, E-Mail-Betreff `[Pioneers]`, interne Kommentare/Framework-Bezeichnung). Bewusst unverändert: der Feature-Name „Pioneer-Test-Modus" und alle Code-Identifier (`PIONEER_TESTS`, `pioneerTestState`, `pioneerWizard` usw.).

**Tests:** neue Suiten `v903wakeword.mjs` + `v903pioneers.mjs`, volle Regression grün.

## v9.0.2 — Naming-Konsistenz „Terp Sessions" (Paket N1)

Der Produktname ist jetzt überall konsistent „Terp Sessions", wo vorher „Sessions" oder „Volcano Controller" als Markenname stand. Rein chirurgisch, das generische Wort „Sessions" (also Konsum-Sessions, Session-Tracking, Reinigung „alle X Sessions", Statistik-Labels) bleibt unverändert, sonst würde die App-Sprache unsinnig.

**Geändert (Produktname/Brand/technischer Name):**
- `manifest.json`: `name` = „Terp Sessions — Vape Controller", `short_name` = „Terp Sessions".
- `index.html` Head: `<title>`, `apple-mobile-web-app-title`, `meta description`.
- Header-Brand-Element, Lock-Screen-Überschrift („Terp Sessions gesperrt").
- Welcome-Flow + Geräte-Touren + Migrations-Wizard + Onboarding-Tour-Titel.
- Alt-Wizard-Titel „Willkommen beim Volcano Controller" zu „Willkommen bei Terp Sessions".
- Console-ASCII-Art + `sessions.about()`-Credits (die JS-API `window.sessions` bleibt).
- „Sessions PWA" (technische Sicht) zu „Terp Sessions PWA" an allen 5 Stellen (HA-Export, Diagnose, PDF-Report).
- Update-Prompt, Diagnose-Export-Label, zwei „Sessions-Community"-Strings.
- `sw.js`: Cache-Name `sessions-` zu `terp-sessions-` (erzwingt einmaliges Cache-Update bei allen PWA-Usern, akzeptiert) plus Datei-Kommentar.
- Console-Log „Terp Sessions v9.0.2 bereit".

**Bewusst NICHT geändert (Begründung):**
- Generisches Wort „Sessions" (Vape-Sessions, Tracking, Reminder, Stat-Labels, CSV, Achievements).
- Code-Identifier: `window.sessions`, `sessions.about()`, Storage-Keys (`sessions_onboarded_v1`, `sessions_migration_v5_seen`), Variablen/Funktionen (`renderSessions`, `exportSessionsCSV`, `cleanReminderSessions` etc.), IDs, CSS-Klassen.
- Wake-Word „Hey Sessions" (fester Sprach-Trigger, Umbenennen würde die Erkennung und UX verändern). Offen für N2/spätere Runde, falls gewünscht.
- Programm-/Feature-Name „Sessions Pioneers" (etablierter Eigenname des Tester-Programms). Offen falls Andre Vereinheitlichung wünscht.
- Repo-Name `terp-sessions`, Domain, historische Code-Kommentare („formerly Volcano Controller"), historische Changelog-Abschnitte in dieser README.

**Tests:** neue Suite `v902rename.mjs`, volle Regression grün.

## v9.0.1 — Hotfix: Self-Test-Findings (B4, B5, B1/B2, B6, B7)

Hotfix nach Andres Live-Self-Test von v9.0.0. Sechs gemeldete Bugs in einem Rutsch, **keine** Änderung an cscCrypto oder Backend, **keine** neuen Features.

- **B4 (hoch) — Pfad-Wahl ohne `prompt()`:** Beim Aktivieren des Pioneer-Test-Modus öffnete sich ein nativer Browser-`prompt()` zur Pfad-Eingabe — für blinde Tester (Pfad B!) absurd. Jetzt springt die Aktivierung direkt in den Test-Pfad-Tab, wo die bereits vorhandenen, barrierefreien Pfad-Wahl-Buttons stehen. Buttons aufgewertet: größere Touch-Targets, Icons, klare `aria-label`s, Beschreibung mit echten Test-Zahlen (15 pro Pfad), `aria-live`-Ansage beim Öffnen. `_pioneerShowPathChoice` bleibt als toter Backup-Code erhalten, wird aber nicht mehr aufgerufen.
- **B5 (mittel) — Combo-Sound nicht hörbar:** Die Combo-Logik (`st.combo % 3 === 0`) war korrekt — Ursache war der `AudioContext`, der je nach Browser im `suspended`-Zustand startet. Fix: `_pioneerAudioCtx.resume()` bei `state === 'suspended'` in `_pioneerPlaySound`.
- **B1/B2 (mittel) — Google-Fonts-CORS-Error:** `crossorigin="anonymous"` stand fälschlich am **Stylesheet**-`<link>` (Abweichung vom kanonischen Google-Fonts-Snippet). Das erzwingt CORS-Modus für die CSS-Datei; ein Cache-Layer ohne ACAO-Header (alter SW / Disk-Cache) löst dann „CSS stylesheet blocked by CORS" aus. Fix: `crossorigin` vom Stylesheet entfernt, `preconnect` zu gstatic behält `crossorigin` (Font-Binärdateien laden ohnehin im CORS-Modus). Kein externes Font-CDN hinzugefügt; Fraunces/Inter-Tight/IBM-Plex-Mono bleiben.
- **B6 (niedrig, UX) — Sticky-Schließen in langen Modalen:** Lange Modale (Strain-/Programm-Edit, Bug-Report, Aroma) hatten Cancel/Save nur im Footer. Neu: ein „✕"-Schließen-X wird oben (sticky) injiziert — automatisch und **nur** in Sheets, die höher als ~85 % des Viewports sind (Höhenmessung in `_modalInjectCloseX`, eingehängt in den bestehenden `_modalStackManageEl`-MutationObserver). Footer-Buttons bleiben unberührt; kurze Modale bekommen kein X.
- **B7 (niedrig) — `favicon.ico` 404:** `datenschutz.html` hatte keinen Icon-Link, der Browser fragte `/favicon.ico` im Root an → 404. Fix: `<link rel="icon" href="./icon-192.png">` ergänzt.

**Tests:** neue Suite `v901hotfix.mjs` mit 31 Tests (alle fünf Bugs + Version-Bump), volle Regression grün.

## v9.0.0 — S3-Features echt + Pioneer-Tests 25-30 (Paket S2.3)

Phase 3 finalisiert v9.0.0: drei echte App-Features die NORMAL nutzbar sind UND im Pioneer-Test-Pfad als Aufgaben A13-A15 + B13-B15 mitgetestet werden. Bereit für Pioneer-Onboarding.

### URL-Scheme-Befehle (Siri-Shortcuts / Android-Tasker)
Die bestehende `handleUrlCommand()` (seit v4.9.4 mit `?cmd=…`) bekommt Spec-konforme Alias-Form:
- `?command=set_temp&value=185` → mapped auf `?cmd=set&temp=185`
- `?command=heat_on` / `heat_off` / `pump_on` / `pump_off` / `stop_all` / `status`
- Beide Formate funktionieren parallel; ältere Shortcuts bleiben gültig.
- Nach Ausführung: `history.replaceState` Cleanup; Toast „URL-Befehl: …"; bei BLE-Befehlen ohne Verbindung 2s Auto-Reconnect-Versuch oder Hinweis.

### Touch-Befehl-Macros (1-Tap Custom Quick-Actions)
- Settings → Erweitert → „Touch-Befehl-Macros" → „+ Neuer Macro": Name, Emoji-Icon, Aktion-Dropdown (7 Optionen), bei `set_temp` zusätzlich Temperatur-Eingabe.
- Macros werden im Steuerung-Tab unter den Standard-Quick-Actions als kompakte Chips (grünlich) gerendert, mit Aria-Label „Macro X ausführen (Aktion)".
- Klick auf Chip führt sofort aus (mit Toast-Bestätigung + TTS-Ansage); bei BLE-Befehlen ohne Verbindung Hinweis.
- Edit/Delete via Edit-Icon in Settings-Liste.
- Lokal in `PREFS.touchMacros = [{id, name, icon, action, params}]`.

### TTS-Voice-Profile + Bluefy-Heuristik
- Settings → Sprachsteuerung → „TTS-Stimme": Dropdown mit allen verfügbaren Browser-Stimmen (sortiert nach Sprache+Name) + „▶ Test"-Button.
- `PREFS.ttsVoiceURI` speichert Auswahl; `ttsSay()` nutzt sie via `SpeechSynthesisUtterance.voice`.
- **Bluefy-Heuristik:** `ttsSay()` returnt early bei `navigator.userAgent.indexOf('Bluefy') !== -1` (Apple-WebKit-Limitation für injizierten Browser).
- `speechSynthesis.onvoiceschanged` lädt asynchron geladene Stimmen nach.

### Pioneer-Test-Pfad erweitert auf 30 Tests
6 neue Tests (15 sehend + 15 Screen-Reader gesamt):
- **A13 / B13:** URL-Scheme via Siri Shortcut / Adressleiste / Voice-Feedback
- **A14 / B14:** Touch-Macro anlegen + nutzen (sehend / mit Screen-Reader)
- **A15 / B15:** TTS-Stimme wechseln + testen / SR-Modus-Heuristik

`completionist`-Achievement-Bedingung „alle 24 pass" gilt jetzt für alle 30 (via `PIONEER_TESTS.every(...)`). `accessibility_champ` (alle B-Tests) erfordert jetzt 15 statt 12 Pfad-B-Pässe.

Tests: +38 in `v90pioneer-s3.mjs` (30-Test-Definition-Konsistenz, URL-Scheme-Aliases + Live-Parse mit Mock, Touch-Macros CRUD + Render + Validation + Fire, TTS-Voice-Dropdown + Bluefy-UA-Block + Voice-Selection-Persist, Pioneer-Tests-Inhalte). Volle Regression bleibt grün.

### Was Pioneer-Tester bekommen
1. **Komplette App** (Verbinden, Steuern, Programme, Aroma, Community)
2. **Test-Pfad-Modus** (30 gefuehrte Aufgaben, Punkte, 10 Achievements, Bug-Reports per GitHub-Issue)
3. **3 neue Power-User-Features** (URL-Scheme für Voice-Assistants, Touch-Macros, TTS-Stimmen-Auswahl)

## v9.0.0-beta — Pioneer-Gamification + Bug-Reports (Paket S2.2)

Phase 2 baut auf der alpha-Basis auf. Phase 3 (S3-Features: URL-Scheme, Touch-Macros, TTS-Profile) folgt nach Andre-Status-Sync.

- **Punkte-System** — pass +10 Punkte, fail+Bug-Report +25 Punkte (Bug-Hunter-Bonus), skip 0; Combo-Bonus +5 alle 3 hintereinander erfolgreiche Tests. Aktuelle Punkte + Combo werden im Wizard-Header sichtbar (z.B. „120 Pkt · 🔥 4 Combo · 33%"). Re-Bewertung gibt keine Punkte (anti-Gaming).
- **10 Cannabis-Themed Achievements** — 🌱 Erste Sprossen, 🌿 Bowl Master, 🧙 Strain Sage, 🔬 Terp Hunter, 🎤 Voice Warrior, 🐛 Bug Hunter, ♿ Accessibility Champion (alle 12 Pfad-B-Tests), 💯 Completionist (24/24), 🥇 Patient Zero (in Juni/Juli 2026 abgeschlossen), ⚡ Speed Run (alle Tests <30 Min). Trigger werden in `_pioneerCheckAchievements()` zentralisiert ausgewertet nach jedem `_pioneerSetResult`. Bei Freischaltung: Toast + Sound + 200ms Vibration + Aria-Live-Announcement.
- **Sound-Library** via Web Audio API (KEIN externes Asset, KEIN data-URI Bloat): `_pioneerPlaySound(type)` mit 4 Tönen (pass=880Hz sine, fail=180Hz sawtooth, achievement=523/659/784Hz Sequenz, combo=200→800Hz Sweep). Toggle „🔊 Test-Sounds" im Settings (default ON, für Screen-Reader-User mute-bar via `PREFS.pioneerTestSounds`).
- **Bug-Report-Modal** `#modalPioneerBugReport` — bei „✗ Funktioniert nicht" öffnet sich Formular mit „Was sollte passieren? / Was ist passiert? / Wie hast du es gemacht?". Auto-Info (Test-ID, App-Version, Browser-UA, Geräte-Name, Pseudonym, Timestamp) wird sichtbar angezeigt. Submit-Button generiert eine vorausgefüllte **GitHub-Issue-URL** für `123ichbinmitdabei/terp-sessions` mit Labels `pioneers,bug` und öffnet sie in neuem Tab. Bei Submit: Test als `fail` mit `bugReported=true` markiert → +25 Punkte → bug_hunter-Achievement triggert.
- **End-Screen erweitert** — neben den bisherigen Stats (X bestanden / Y Bugs / Z übersprungen) jetzt: Total-Punkte, Liste freigeschalteter Achievements mit Titel+Desc, **„📋 Komplett-Report als Issue"**-Button generiert ein Übersichts-Issue mit pro-Test-Status (✓/✗/⏭ pro ID), Notizen, Auto-Info — Labels `pioneers,test-complete`.

**Achievement-Trigger im Detail:**
| ID | Bedingung |
|---|---|
| first_steps | ≥1 pass total |
| bowl_master | A3 oder B3 pass (Bluetooth-Verbinden) |
| strain_sage | A8 oder B8 pass (Sorte anlegen) |
| terp_hunter | A5 oder B5 pass (Aroma-Liste navigiert) |
| voice_warrior | A10 oder B10 pass (Sprachsteuerung) |
| bug_hunter | ≥1 fail mit bugReported=true |
| accessibility_champ | alle 12 Pfad-B-Tests pass |
| completionist | alle 24 Tests pass (beide Pfade) |
| patient_zero | completedAt vor 2026-07-31 |
| speed_run | (completedAt − startedAt) < 30 Min |

Tests: +39 in `v90pioneer-game.mjs` (Punkte-Vergabe in allen Modi, Combo-Logik, alle 10 Achievement-Trigger einzeln, Sound-Mute-Toggle, Bug-URL-Format + Escape, Bug-Modal-Workflow, Komplett-Report-URL-Generator). Volle Regression bleibt grün.

## v9.0.0-alpha — Pioneer-Test-Modus Phase 1 (Paket S2.1)

Erster deploybarer Stand des Pioneer-Test-Wizards. Phase 2 (Gamification + Bug-Reports) und Phase 3 (S3-Features: URL-Scheme, Touch-Macros, TTS-Profile) folgen nach Andre-Status-Sync.

- **Feature-Flag `PREFS.pioneerTestMode`** (default OFF) — Toggle in Settings → Erweitert → „Pioneer-Test-Modus". Confirm-Dialog beim Aktivieren. Normal-User sehen den Test-Pfad-Tab GAR NICHT.
- **Neuer Tab „🌿 Test-Pfad"** in der Bottom-Navigation, nur sichtbar wenn Flag an. Bei Deaktivierung des Mode während Tab aktiv → automatischer Fallback auf Steuerung-Tab.
- **24 Test-Definitionen** als `PIONEER_TESTS`-Konstante: 12 Tests für Pfad A (sehende Tester, IDs A1–A12) + 12 Tests für Pfad B (Screen-Reader-Tester, IDs B0–B11). Inhalt: App-Install, Onboarding, Bluetooth, Temperatur, Aroma-Liste, Programm-Start, Community-Register, Sorte anlegen, Sterne-Bewertung, Sprachsteuerung, Session-Tracking, Datenschutz lesen. *Andre sollte später aus `Pioneer-Test-Szenarien-v1.docx` abgleichen — Plausible-Defaults sind derzeit drin.*
- **Wizard-UI** mit Pfad-Auswahl (initial + jederzeit wechselbar), Fortschrittsbalken („Test X von 12 — XX%"), Aufgaben-Card mit ID + Titel + Beschreibung + Hint, drei Action-Buttons (✓ Geschafft / ✗ Funktioniert nicht / ⏭ Überspringen) sowie Navigation (‹ Zurück / Weiter ›).
- **Lokale State-Speicherung** in `PREFS.pioneerTestState`: `{path, currentIndex, results, startedAt, completedAt, points, combo, achievements}`. Auto-Save nach jedem Klick. Resume nach Re-Open am letzten Index.
- **Accessibility-Basis**: Aria-Live-Region (`#pioneerLive`, off-screen) für Test-Wechsel-Announcements. Fokus springt nach jedem Klick auf den primären Action-Button (Pass) für Keyboard-Nutzer. Buttons mit klaren `aria-label`s.
- **End-Screen** bei alle 24 (bzw. 12 pro Pfad) Tests bearbeitet: Stats („X bestanden, Y Bugs, Z übersprungen") + Reset + Pfad-Wechsel. Komplett-Report-Generierung kommt in v9.0.0-beta.
- **Bug-Report-Formular** ist in Phase 1 noch nicht voll implementiert — bei „✗ Funktioniert nicht" wird derzeit nur eine Toast-Nachricht „Bug-Report-Formular kommt in v9.0.0-beta" gezeigt, der Test selbst aber bereits als `fail` markiert.

Tests: +39 in `v90pioneer-basis.mjs` (Feature-Flag-Default, Tab-Visibility, 24-Definitionen-Konsistenz, Pfad-Wahl, Wizard-Render, Result-Speicherung, Back/Next-Navigation, Aria-Live, Persist+Reload, Reset, End-Screen). Volle Regression: bleibt grün.

## v8.9.0 — Pre-Test-Polish (Paket S1)

Fünf UX-Verbesserungen vor dem ersten Pioneer-Test:

- **Cannabis-Blatt statt Sterne in Bewertungen** (Option B: stilisiert, 5-fingrig). Inline-SVG via `leafSvg()`, gleiche CSS-Klassen `.comm-stars-*` (backwards-kompatibel), Bewertungs-API (1–5 int) unverändert. Farbschema: Leaf-Green (`#5fb84d`) für allgemeine Bewertung, helleres Grün (`#7fd968`) für eigene Bewertung. Click-Animation via `:active` scale(.88). Aria-Labels: „X von 5 Blättern".

- **Community-Profil auf Hauptseite (Option A: Header-Avatar erweitert)**. Das bestehende 👤-Symbol im Header öffnet jetzt ein erweitertes Profil-Modal mit zwei Sektionen: **🌿 Community** (Login/Register-Buttons bei logged-out, Pseudonym+Admin-Badge+Logout+Moderation-Quickaccess bei logged-in) und darunter die bestehende **👥 Lokale Profile auf diesem Gerät**-Sektion. Bei Klick auf Anmelden/Registrieren ohne aktivierte Community-DB: Confirm-Dialog aktiviert sie automatisch.

- **Browser-Detection mit Just-in-Time-Hinweisen**. Neuer Helper `browserCapabilities()` (native checks, keine UA-Libs). Wenn User „Verbinden" antippt aber Web-Bluetooth fehlt: `#modalNoBluetooth` mit Bluefy-App-Store-Link + „Nicht wieder zeigen"-Checkbox (persistiert in `PREFS.browserHintsDismissed.noBluetooth`). Keine permanenten Banner, keine Modale beim App-Start.

- **Mikrofon-FAB conditional + Text-Befehl-Alternative**. Bei `!voiceAvailable()` zeigt der Sprach-FAB ein Tastatur-Icon (⌨) statt Mikrofon (🎤); Klick öffnet `#modalTextCommand` mit Eingabefeld + 5 Tipp-Chips (z.B. „Heize auf 185 Grad"). Eingabe geht durch denselben `handleVoiceCommand`-Pfad. Settings-Toggle zeigt Hinweis-Text wenn Browser keine Spracherkennung unterstützt.

- **Datenschutz-Häkchen bei Registrierung (anwaltliche Pflicht)**. Neuer Pflicht-Schritt im Register-Wizard: Checkbox „Ich habe die Datenschutzerklärung gelesen…" + Link zur neuen `datenschutz.html` (eigenständige statische Seite mit Inhaltsverzeichnis, Vorschau-Banner, 9 Sektionen). Submit-Button bleibt `disabled` + `aria-disabled=true` bis Checkbox gehakt. Einwilligung wird lokal in `PREFS.dataConsentAcceptedAt` (ISO-Datestring) protokolliert; Backend-Spalte folgt in v9.0. Checkbox wird bei jedem `_commRegisterOpen` wieder zurückgesetzt (Pflicht-Einwilligung muss explizit sein).

**Neue PREFS-Felder:**
- `PREFS.browserHintsDismissed` (Object mit `noBluetooth`/`noSpeech`/`pwaVoiceWarn`/`bluefyVoiceWarn`-Flags)
- `PREFS.dataConsentAcceptedAt` (ISO-Datestring oder null)

Tests: +41 in `v89polish.mjs` (Blatt-Icon, Profil-Sektion logged-out+admin, Browser-Capabilities, modalNoBluetooth-Dismiss, Text-Command-Modal, FAB-Conditional, Datenschutz-Workflow + Reset). Volle Regression bleibt grün.

## v8.8.0 — Hosting-Migration auf privaten Account (Paket 12d)

Strategischer Pivot: dieses private Projekt zieht von der bisherigen Hosting-URL (`marianacannabis.github.io/volcano`) auf den eigenen Account (`123ichbinmitdabei.github.io/terp-sessions`) um. Saubere Trennung zwischen Mariana-Verein und Andre privat — DSGVO-Verantwortlicher ist Andre privat.

- **Neue Live-URL:** https://123ichbinmitdabei.github.io/terp-sessions/
- **Alte URL** (`marianacannabis.github.io/volcano`) zeigt nach Migration eine Notice-Seite mit Verweis auf den neuen Standort. Bleibt mindestens 30 Tage online.
- **Backend bleibt 1:1 dasselbe Supabase-Projekt** — `csc-config.json` mit identischer URL und Anon-Key. Pseudonym/PIN-Logins funktionieren unverändert weiter, keine Re-Registrierung nötig.
- **App-Anzeigename in der UI bleibt „Sessions"** — nur der Repo/URL ändert sich. Manifest-`name` wird zu „Sessions — Vape Controller (Terp Sessions)" für die PWA-Installation, `short_name` bleibt „Sessions".
- **Branding-Säuberung:** alle User-sichtbaren „Mariana"-Strings in Onboarding-Tour, Footer, Console-Branding, ASCII-Logo wurden generisch gemacht. Code-Kommentare unverändert (historisch).
- **`PIONEERS_EMAIL` ist jetzt leer im Code** — Kontakt-Adresse steht ausschließlich in dieser README. Pioneers-Feedback-Buttons fallen automatisch auf GitHub-Issues zurück (`pioneerMailto()` und `fireflyHelpMailto()` returnen die Issue-URL wenn keine Email gesetzt).
- **`PIONEERS_REPO` aktualisiert** auf `123ichbinmitdabei/terp-sessions` — Bug-Reports und RE-Hilfe-Anfragen landen jetzt im neuen Repo.
- **Service-Worker-Cache invalidiert** durch Version-Bump v8.7.6 → v8.8.0. Bestehende User holen das neue Bundle automatisch beim nächsten Aufruf der neuen URL.

Tests: +x in neuer Suite `v88migration.mjs`. Volle Regression auf bestehenden 852 Tests bleibt grün.

**Was Pioneer-Tester tun müssen:** siehe `Pioneer-Migration-Notice.md` (mitgeliefert für Andre's Verteilung). TL;DR: einmal auf die neue URL gehen, App installieren, mit altem Pseudonym+PIN einloggen — fertig.

## v8.7.6 — Hotfix Modal-Scrolling + Modal-Stacking (Paket 12e)

Zwei Bugs aus Andre's v8.7.5-Manuell-Test:

1. **Modal-Scrolling am Desktop kaputt:** Lange Modale (z.B. Strain-Create mit allen Feldern) konnten am PC nicht gescrollt werden — Scroll-Event leakte ans Dokument, die Hauptseite scrollte statt das Modal. Root-Cause: `body` hatte kein `overflow:hidden` während Modal offen. **Fix:** neue CSS-Klasse `body.modal-open { overflow:hidden }` + JS-Hook der bei Modal-Open/Close diese Klasse togglet.

2. **Modale öffnen hinter anderen:** Aus einem offenen Modal heraus getriggerte zweite Modale (z.B. Settings → Login) öffneten sich HINTER dem ersten — beide hatten denselben `z-index:50`, DOM-Order entschied. **Fix:** Modal-Stack-Manager via MutationObserver auf alle `.modal`-Elemente. Pro Open inkrementiert Stack-Counter + dynamischer `z-index = 1000 + stackPos*10`. Beim Close: z-index zurückgesetzt + Counter dekrementiert.

**Implementation-Pragmatik:** der MutationObserver beobachtet Class-Changes aller bestehenden `.modal`-Elemente und vergibt den z-index dynamisch — **keine Änderung an bestehenden `.classList.add('open')`-Aufrufen nötig**. Idempotent via `dataset.modalStack`-Check. Funktioniert für alle 39 Modale im DOM ohne Touch.

Tests: +24 in neuer Suite `v876modals.mjs`. Modal-Inventar-Skript prüft alle 39 Modale (Open/Close + Stack-Verhalten) — 39/39 OK. Visual-Check mit Puppeteer-Screenshots zeigt korrektes Stacking (z=1020 vorne, z=1010 hinten) und vollständige Scroll-Range im Strain-Create-Modal. Volle Regression: **852/852 PASS** über 37 Suiten (+24 vs. 828).

**Patch 2 (Werks-Sorten-Migration) Status:** ✓ live verifiziert — 127/127 Werks-Sorten als `is_factory_seed=true` in der Community-DB.

## v8.7.5 — Community-Programme + Moderation + Werks-Migration (Paket 12b.3)

Sorten-CRUD von v8.7.4 + Programme-CRUD + Admin-Moderation. Zwei optionale Backend-Patches im Repo, die App degradiert sauber wenn sie noch nicht eingespielt sind.

- **Programm-Tab-Leiste** in *Programme*: Meine / Vorlagen / Community. Community-Tab nur sichtbar wenn `PREFS.communityEnabled` UND `communityClient.isLoggedIn()`. Memory-only Tab-State. Trennung der bisherigen „Eigene" + „Vorlagen"-Cards in zwei separate Tabs; Community-Tab zeigt eigenen Container.
- **Community-Programme-Liste** mit Name, Beschreibung, Step-Count, Gesamtdauer, Geräte-Badges, Sterne-Anzeige, Verknüpfungs-Count. 50er-Pagination, Loading/Empty/Error-States.
- **Programm-Detail-Modal** mit interaktiven Sternen (Optimistic Update), verknüpften Sorten (klickbar → Strain-Detail), Steps-Liste (action · °C · sec). Action-Buttons je nach `is_my`. Extra: **„In meine Programme laden"** importiert das Community-Programm als lokales Programm.
- **Programm-Create/Edit/Propose-Formular** mit Steps-Editor (Add/Remove + Action-Dropdown + Temp + Sekunden pro Schritt), Device-Toggle-Chips (13 unterstützte Geräte), Sorten-Multi-Select (aus Community-Cache), Pseudonym-Toggle mit Default-Memory. Submit ruft `programCreate` + `programSetDevices` + `programLinkStrains` nacheinander auf.
- **Moderations-UI für Admins** im *Settings → Community*-Bereich: Button „📝 Offene Edit-Vorschläge" öffnet Modal mit Filter (Alle / Sorten / Programme). Pro Vorschlag: Target-Name, Vorschlagender (oder anonym), Kommentar, Diff der vorgeschlagenen Änderungen, [Annehmen] / [Ablehnen]-Buttons. Bei Ablehnen optional Begründung. **Bei fehlendem Backend-Patch zeigt die UI einen klaren Hinweis-Banner** mit Patch-Datei-Name (kein Crash, kein generic Error).
- **Backend-Patch 12b.3-proposals** (`community-backend-patch-12b3-proposals.sql`, KRITISCH für A6): Neue RPC `community_list_open_proposals(p_code, p_pin)` mit Admin-Check, returnt offene Vorschläge mit denormalisiertem `target_name` und `proposer_pseudonym`. Additiv-idempotent. Andre spielt im Supabase SQL-Editor ein.
- **Backend-Patch Werks-Migration** (`community-backend-patch-factory-seed.sql`, optional): Importiert die 127 in der App eingebetteten Werks-Aroma-Sorten in `community_strains` mit `is_factory_seed=true`. Owner ist spezieller `FACTORY`-User mit nicht-login-barem pin_hash. Re-runnable (Existenz-Check via `author_code='FACTORY' AND name`).

Tests: +61 in zwei neuen Suiten (`v875programs.mjs` 41/41, `v875moderation.mjs` 20/20). Volle Regression: **809/809 PASS** über 35 Suiten (+61 vs. 748).

**Was NICHT in v8.7.5 ist:**
- Live-Migration der Werks-Sorten (Patch-Vorschlag liegt, Einspielen bei Andre)
- DSGVO-Datenschutzerklärung v2 (separater Paket-Teil B, kein Code-Asset)
- Edge-Case-Bug-Hunt (Paket-Teil C, falls Zeit)

## v8.7.4 — Community-Sorten-CRUD (Paket 12b.2, Phase 1b.2)

Sorten-CRUD ist jetzt user-sichtbar. Wer Community aktiviert + eingeloggt ist, sieht in Aroma & Sorten einen dritten Tab **„Community"** — kann fremde Sorten lesen, bewerten, Änderungen vorschlagen; eigene anlegen, bearbeiten, löschen.

- **Tab-Leiste in Aroma & Sorten**: Werk / Meine / Community. Community-Tab nur sichtbar wenn `PREFS.communityEnabled` UND `communityClient.isLoggedIn()`. Tab-State ist memory-only (jeder App-Start beginnt mit „Werk"). Werk-Tab und Meine-Tab sind unverändert (Werks-DB 57 Sorten, lokale Anlage); neu ist nur die Trennung in zwei separate Tabs.
- **Sorten-Liste (Community)** zeigt Name, Genetik-Badge (indica/sativa/hybrid), THC/CBD, Sterne-Bewertung (`avg_stars` aus Aggregat, eigene Hervorhebung via `my_stars`), erste 3 Effekte + 2 Aromen, Temperatur-Bereich, „von Pseudonym" / „anonym beigetragen" / „Werks-Vorschlag"-Hinweis, „Mehr laden"-Pagination (50er-Seiten).
- **Detail-Modal** mit interaktiven Sterne (Optimistic Update), Action-Buttons je nach `is_my`: eigene Sorten zeigen „Bearbeiten" + „Löschen", fremde zeigen „Edit-Vorschlag".
- **Create-Modal** mit Tag-Inputs für Terpene/Effekte/Aromen, Temperatur min/max/empfohlen, Pseudonym-Toggle (Default-Memory via `PREFS.communityLastAnonymous` — letzter Beitrag merkt sich Gegenteil als Default).
- **Edit eigene**: gleiches Formular vorbefüllt, `strainUpdateOwn` via Backend. Backend `community_strain_update_own` updated heute KEINE `show_pseudonym`-Spalte — Toggle ist deshalb im Edit-Mode ausgeblendet (nachzureichen in 12b.2.1 wenn nötig).
- **Löschen eigene** mit Confirm-Dialog; Backend `ON DELETE CASCADE` löscht auch alle Bewertungen.
- **Edit-Vorschlag** für fremde Sorten: gleiches Formular, sendet nur den Diff per `strainProposeEdit` zusammen mit optionalem Admin-Kommentar.
- **Backend-Patch 12b.2** (`community-backend-patch-12b2.sql`): `community_strain_list` und `community_program_list` bekommen optionale `p_caller_code` + `p_caller_pin`-Parameter. Mit Auth liefert die Liste pro Item zusätzlich `my_stars` (eigene Bewertung) und `is_my` (eigener Beitrag — auch für anonyme erkennbar). Ohne Auth bleibt der alte Pfad (my_stars=null, is_my=false). Patch ist additiv-idempotent (DROP+CREATE der Signatur, `revoke ... from public, authenticated; grant ... to anon`). Live verifiziert: 9/9 Read-Only-Smoke-Tests grün.
- **Aroma-Search ist tab-aware**: bei Community-Tab debounced (350ms) Reload via `strainList(filter)`, sonst lokale Filterung wie bisher.

Tests: +53 in neuer Suite `v874strains.mjs` (Sterne-Komponente, Tab-Sichtbarkeit, Card-Render, List-View-States, Detail-Modal-Branching, Create-Validation, Pseudonym-Memory, Edit-Mode-Vorbefüllung, Propose-Diff-Logik, Werk/Meine-Tab-Filterung, Client-Caller-Code-Sending). Volle Regression: **748/748 PASS** über 33 Suiten.

**Was NICHT in v8.7.4 ist** (kommt in 12b.3):
- Programm-Tab + Programm-CRUD-UI (Backend ist da, UI fehlt)
- Moderations-UI für Admin (Edit-Vorschläge prüfen, Flag/Delete)
- Migration der 57 Werks-Aromas in `community_strains` als `is_factory_seed=true`
- `show_pseudonym`-Editierbarkeit im Edit-Mode (benötigt Backend-Patch in `community_strain_update_own`)

## v8.7.3 — Hotfix Community-Setup

Drei Findings aus Andre's v8.7.2-Setup-Test:

1. **KRITISCH:** `csc-config.json` war `.gitignored` und damit auf GitHub Pages nicht ausgeliefert → `COMMUNITY_NOT_CONFIGURED` beim Toggle. Datei jetzt deploy-bar; Anon-Key ist by-design öffentlich (RLS + RPC-Grants + PIN-Verify sind der Sicherheits-Layer, nicht die Key-Geheimhaltung). Inline-`_comment` erklärt das.
2. **Kosmetisch:** „Mariana-Community"/„Mariana-Mitgliedern" → „Sessions-Community"/„anderen Nutzern" in den zwei user-sichtbaren UI-Strings (Wizard-Welcome + Setup-Box-Beschreibung). Code-Kommentare/README unverändert.
3. **UX-Bug:** Register/Anmelden/Abmelden in der Setup-Box reagierten unter bestimmten Init-Race-Bedingungen nicht — `addEventListener` lief direkt nach `innerHTML` auf den dynamischen Buttons, das ist fragil. Fix: ein delegierter Click-Listener auf dem Container `#communityButtons`, idempotent via `__wired`-Flag. Robust gegen beliebige innerHTML-Rebuilds.

Tests: +5 in `v872setup.mjs` (jetzt 40/40); volle Regression 695/695 (+5 vs. 690). Live-Check: Pseudonym „Andre" ist frei (kein Halb-Account aus dem fehlgeschlagenen Setup).

## v8.7.2 — Community-Setup (Phase 1b.1: Login + Bootstrap-Admin)

Erstes user-sichtbares Stück des Community-Pivots. Sorten-/Programm-Liste + Anlage-Formulare folgen in v8.7.3. Hier nur: Toggle, Register-Wizard, Login, Erst-Admin-Bootstrap, Admin-Promotion.

- **Toggle „🌿 Community-DB aktivieren"** in Settings → Erweitert → Community (vor allen anderen Settings-Sektionen). Default AUS — die App funktioniert auch ohne. Bei AN erscheint die Setup-Box.
- **Register-Wizard (3 Schritte)** im `#modalCommunityRegister`: Welcome + DSGVO-Hinweis → Pseudonym (Live-Verfügbarkeits-Check, debounced 500 ms) → PIN + Bestätigung. Nach Register: bei leerem Backend (`bootstrapAvailable()` returnt `available:true`) erscheint ein Bootstrap-Modal „Du bist der erste — willst du Admin werden?".
- **Login-Modal** mit Inline-Fehler bei `AUTH_FAILED` (Modal bleibt offen, User darf nochmal probieren). Brute-Force-Schutz läuft serverseitig via `csc_internal_verify_pin`-Lockout.
- **Admin-Bereich** in der Setup-Box nur sichtbar wenn `currentSession().is_admin === true`. Enthält Button „User zum Admin ernennen" → `#modalAdminPromote` (Pseudonym-Input → `community_admin_promote`-RPC, idempotent bei schon-Admin).

### Backend-Erweiterung (`community-backend.sql`)

3 neue RPCs + 1 Audit-Tabelle, additiv und idempotent:
- `community_bootstrap_available()` — public, `{available: bool, admin_count: int}`
- `community_bootstrap_first_admin(p_code, p_pin)` — promotet den eingeloggten User zum ersten Admin; per `pg_try_advisory_xact_lock` race-safe + Re-Check unter Lock
- `community_admin_promote(p_code, p_pin, p_target_pseudonym)` — bestehender Admin ernennt anderen via Pseudonym; idempotent bei schon-Admin; `NOT_ADMIN`/`PSEUDONYM_NOT_FOUND`/`ALREADY_ADMIN_SELF`-Errors
- `community_admin_audit` — Tabelle für `bootstrap_first_admin`/`promote_to_admin`-Events; RLS-deny-all, CASCADE-clean bei User-Delete

### Tests + Live-Verifikation

- **+35 statische Tests** in `v872setup.mjs` (UI-Toggle, Wizard-Navigation, Pseudonym-Live-Check, PIN-Validation, Login-AUTH_FAILED-Verhalten, Admin-Bereich-Sichtbarkeit, mock-Roundtrips).
- **Regression: 690 / 690 grün** über 31 Suiten.
- **Live-Bootstrap-Test (9/9 PASS)** gegen das Live-Supabase nach Andre's SQL-Update: Bootstrap → Re-Bootstrap-Schutz → Promote → Idempotenz → 3 Invalid-Promote-Cases → Cleanup → Backend wieder leer. Report lokal (gitignored).

### Was NICHT in v8.7.2 ist
- Sorten-Liste + Sorten-Anlage-Formular (kommen in v8.7.3)
- Programm-Liste + Programm-Anlage-Formular (v8.7.3)
- Moderations-UI für Edit-Vorschläge (v8.7.3)
- Werks-Sorten-Migration der 57+ bestehenden Sorten ins Community-Schema (v8.7.3)
- Live-Sync-Features (Phase 1c)
- E2EE-Tracking-Aktivierung (Phase 2)

## v8.7.2-prep Phase 1a — Community-DB Backend (DORMANT, aktiviert in v8.8.0)

**Strategischer Pivot:** Sessions wird neben dem (dormant) E2EE-Tracking-Pfad eine geteilte Wissensbasis für Sorten + Programme bekommen — Pseudonym-Login, Bewertungen, Edit-Vorschläge, Moderation. Persönliches Tracking bleibt rein lokal.

Phase 1a liefert nur Backend + dormant Client-Schicht — KEINE UI-Anbindung, kein Versions-Bump für Endnutzer.

- **`community-backend.sql`** im Repo-Root: 7 neue Tabellen + 3 `ALTER TABLE`-Erweiterungen auf `csc_users` (`pseudonym`, `is_admin`, `last_anonymous_choice`) + 19 RPCs (Auth/Strain/Programm/Admin). Idempotent, additiv zu `csc-backend.sql`. Alle RPCs `security definer` mit voll-qualifiziertem `extensions.crypt`/`extensions.gen_salt` (Patch-2-Konvention).
- **`window.communityClient`** in `index.html`: dormant Client-Schicht analog zu `cscClient`. Memory-only-Session (kein localStorage), tolerant gegenüber Naming-Variationen in `csc-config.json` (`supabaseUrl`|`url`). Krypto-Felder in Phase 1a mit zufälligen Dummies befüllt — Phase 2 überschreibt sie.
- **`COMMUNITY-DB.md`** dokumentiert Pivot-Begründung, Schema, vollständige RPC-Referenz, Berechtigungs-Matrix, Phase-1a→2-Migrationspfad, offene Punkte für den Anwalt (Art. 4 vs Art. 9, Anti-Spam) und Andre's Live-Setup-Anleitung inkl. 6 curl-Selbst-Angriffe.
- **+47 Tests** (`v872community.mjs`): API-Existenz aller 26 Methoden + Pseudonym-Regex + Strain-/Programm-/Device-Validierung + Not-logged-in-Guards für alle 15 Logged-In-Methoden + `show_pseudonym`-Durchreichung + Login-Mock-Roundtrip.
- **Regression: 655 / 655 grün** über 30 Suiten.

**Was NICHT in 12a ist:** UI-Anbindung (12b), Werks-Sorten-Migration der 57+ bestehenden Sorten (12c), Live-Sync-Features (Phase 1c), E2EE-Aktivierung (Phase 2).

**Was Andre vor Paket 12b tun muss:** `community-backend.sql` in Supabase ausführen (additiv) + die 6 Live-Selbst-Angriffe per `curl` durchspielen (Anleitung in `COMMUNITY-DB.md §8.3`). Bei Findings: stoppen, melden — kein eigenmächtiger Fix.

## v8.7.1 — Screen-Reader-Modus (TTS-Konflikt-Fix nach Praxis-Test)

Andre hat v8.7.0 mit iOS VoiceOver getestet — die Sessions-eigene Sprachausgabe (`speechSynthesis` für TTS-Events) überlagerte sich mit dem Screen-Reader. Für blinde Nutzer unbenutzbar. W3C/WCAG entmutigen automatische Screen-Reader-Detection — die Lösung ist User-Toggle-basiert.

### Modul 1 — Screen-Reader-Master-Toggle
- Neue `PREFS.screenReaderMode` (Default false).
- Toggle im Setup → Sprachsteuerung als **erster** Toggle vor allen anderen TTS/Voice-Optionen, hervorgehobener Container mit `♿`-Symbol.
- `ttsEvent()` checkt `PREFS.screenReaderMode === true` **ganz am Anfang** → ALLE app-eigenen TTS-Events werden unterdrückt.
- `_wakeSay()` (Wake-Word-Dialog-TTS) wird ebenfalls geguarded.
- `setupWakeWord()` stoppt aktives Wake-Word und blockiert Neustart, solange SR-Mode an ist.
- Toggle-Click leert auch eine laufende `speechSynthesis`-Queue.
- Visuell: alle `[data-sr-affected]`-Toggle-Rows bekommen `.sr-overridden`-Klasse + ihre Buttons werden `disabled=true`. Betrifft `togVoice`, `togVoiceTts`, `togWakeWord`.

### Modul 2 — iOS-Erst-Start-Hinweis
- `_isIOS()` prüft `iPad|iPhone|iPod`-UA und iPadOS-13+-Sonderfall (`MacIntel` + `maxTouchPoints > 1`).
- Auf iOS + `PREFS.screenReaderHintShown !== true`: nach 2 s Modal `#modalSrHint` mit „Jetzt aktivieren" / „Später"-Buttons (Modal-Trigger wartet zusätzliche 5 s wenn ein anderes Modal offen ist).
- Beide Pfade setzen `screenReaderHintShown=true` → Hinweis kommt nur einmal.
- Buttons sind unabhängig vom UA-Check verdrahtet — Modal lässt sich auch programmatisch öffnen.

### Modul 3 (Bonus, implementiert) — 30-Sekunden-Heuristik
- Plattform-unabhängig: nach 30 s App-Nutzung wird gezählt: Tab-Keydowns, Pointer-Events, Touch-Events.
- Wenn `tab > 0 && pointer == 0 && touch == 0`: Banner `#srHeuristicBanner` (kein Modal — nicht aufdrängend) mit „Ja, Screen-Reader-Modus an" / „Nein danke".
- Trigger nur einmal (`PREFS.heuristicHintShown`); übersprungen wenn SR-Mode schon an.

### Modul 4 — Cross-Platform-Doku in `?`-Shortcut-Hilfe
- Bestehendes Modal `#modalKbdShortcuts` bekommt neue Sektion `♿ Screen-Reader` mit Plattform-Hinweisen (VoiceOver/TalkBack/NVDA/JAWS) plus Erklärung warum kein Auto-Detect.

### Tests + Regression
- +33 neue Tests in `v871screenreader.mjs` (PREFS-Defaults, UI-Position vor TTS-Toggles, ttsEvent-Guard, Toggle-Wirkung auf abhängige Toggles, `_isIOS()`-Detection, Modal-Buttons, Heuristik-Banner, ?-Hilfe-Erweiterung).
- **608 / 608 grün** über 29 Suiten. Keine forward-compat-Patches nötig — `v85tts` läuft transparent über den neuen `ttsEvent`-Guard.

### Was Andre seinen blinden Test-Nutzern sagen kann
> „Wenn ihr VoiceOver/TalkBack nutzt, geht in Setup → Sprachsteuerung und aktiviert den Schalter ‚Ich nutze einen Screen-Reader'. Danach ist Sessions still und überlasst alles VoiceOver/TalkBack."

iPhone/iPad-Nutzer sehen den Hinweis automatisch beim ersten Start. Tastatur-only-Nutzer (NVDA/JAWS) sehen nach 30 s einen freundlichen Banner.

## v8.7.0 — Accessibility-Update

Sessions PWA wurde für die blinden und behinderten Test-Nutzer aus der Mariana-Community zugänglich gemacht. Keine Änderung an Adaptern, Voice-Parser, CSC-Backend / cscClient (dormant) oder cscCrypto-Modul.

### Phase A — Audit
Statisches A11Y-Audit über alle interaktiven Elemente. Befunde dokumentiert in `A11Y-AUDIT.md` (Vorher-Zustand): 72 interaktive Elemente ohne accessible-name (40 davon echt — die anderen waren über `<label for=>` oder verschachtelte `<label>`-Pattern bereits korrekt), 8 Touch-Targets unter 44 px. Skip-Link, `<main>`-Element und Focus-Trap-Pattern waren bereits vorhanden. Kontrast: 9 geprüfte Paarungen, **0 unter WCAG AA**.

### Prio 1 — Kritisch für blinde Nutzer
- 3 Number-Inputs (tInput / pInput / sInput) + 1 Textarea (shareLinkText) bekommen direktes `aria-label`.
- `_a11yAutoLabel()`-Init labelt automatisch alle restlichen Inputs/Selects/Textareas/Toggles über das benachbarte `<label>` oder den `.info > b`-Text. Damit sind UUID-Inputs, Voice-Cmd-Toggles und TTS-Event-Toggles per Screen-Reader bedienbar.
- Skip-Link „Zum Hauptinhalt", `<main>`-Element und `aria-live`-Regionen bestätigt vorhanden.
- Neue srAnnounce-/TTS-Hooks an Verbinden-Events.

### Prio 2 — Tastatur-Navigation
- `_a11yModalEnhance()`: Esc schließt jedes offene Modal, Tab/Shift+Tab wird im offenen Modal getrappt (Fokus läuft im Kreis), Initial-Fokus wird automatisch auf das erste fokussierbare Element gesetzt, vorheriger Fokus wird beim Schließen wiederhergestellt. `MutationObserver` registriert das auch für Modals, die später per `createElement` hinzukommen (Shortcut-Hilfe).
- Globale `:focus-visible`-CSS-Regel: 3 px solid in `--hot` mit 2 px Offset auf alle interaktiven Elemente.

### Prio 3 — Sehbehinderte
- `Schriftgröße`-Buttons erweitert um **200 %** (zusätzlich zu 100/125/150). Skaliert über `--app-zoom` auf `<html>`.
- Hochkontrast-Modus war bereits da (`html.hc-mode` → schwarz/weiß, 21:1-Kontrast, 2px-Borders, 3px Focus-Outline) — Tests verifizieren jetzt das Verhalten.

### Prio 4 — Touch-Targets ≥44 px (WCAG 2.5.5)
- `.btn.sm` → `min-height:44px`, `.nav-btn` → 56 px, `.help-ico` + `.user-avatar` → 44 px, `.aroma-temp` + `.sess-effect` → 44 px, `.aroma-pill` → 36 px (Filter-Chips, AA reicht).
- Der runde `.toggle`-Switch bleibt 32 px sichtbar, bekommt aber eine unsichtbare Hit-Area über `::before` (`inset:-8px -6px`) → effektiv ≥44 px tappbar ohne Layout-Bruch.

### Prio 5 — TTS-Events erweitert
`PREFS.ttsEvents` bekommt 7 neue Per-Event-Toggles (UI im Setup → Sprachsteuerung → Welche Events vorlesen):
- `connectChange` (Verbindung an/aus) — **default an** (wichtig für Blinde)
- `connectStart`, `modalOpen`, `modalClose`, `sortSelect`, `actionDone` — default aus
- `importDone` — **default an** (kritisches Feedback nach Sharing-Import)

Hooks: `setConn()` triggert `connectChange`, der A11Y-Modal-Observer triggert `modalOpen`/`modalClose`, Aroma-Karten triggern `sortSelect`, Share-Import triggert `importDone`, QR-Generierung triggert `actionDone`.

### UX-Bonus
- **`?`-Taste öffnet eine Tastatur-Shortcut-Hilfe** (`#modalKbdShortcuts`) mit 6 Einträgen. In Inputs/Textareas wird die Taste bewusst ignoriert.
- **`undoToast()`-Helper** + Integration in Programm-Löschen und Session-Löschen: 6 Sekunden langer Toast mit „↺ Rückgängig"-Button, der die Aktion wiederherstellt.
- (Auto-Save-Indikator bewusst ausgelassen — kein konkreter Nutzen ohne genauere Spezifikation.)

### Tests + Regression
- +28 neue Tests in `v87a11y.mjs` (Skip-Link, Auto-Label, Touch-Targets, TTS-Events, Schriftgröße, Hochkontrast, Modal-Esc, Shortcut-Hilfe, Undo-Toast, Connect-Hook).
- **508 / 508** grün über 24 Suiten.
- Forward-compat: `v85tts.mjs` Toggle-Count-Assert auf `≥11` gelockert (v8.7.0 hat 18 Toggles).

### Was Andre seinen Test-Nutzern sagen kann
- **Hochkontrast** + **Schriftgröße bis 200 %**: Settings → Inklusion.
- **Tastatur-Shortcut-Hilfe** mit `?`-Taste aufrufen.
- **Esc** schließt jedes offene Dialog-Fenster zuverlässig.
- **Mehr Sprachausgabe-Events** im Setup → Sprachsteuerung → Welche Events vorlesen (7 neue Optionen).
- **„Rückgängig"-Toast** nach versehentlichem Löschen einer Session oder eines Programms — 6 Sekunden Zeit zum Klicken.
- **Mikro-/Avatar-Buttons** sind während laufender Programme weiter bedienbar (v8.5.0-Fix, in v8.7.0 bestätigt).

## v8.7.1-prep — CSC E2EE Krypto: Review-Iteration 1 + Patch 2 (DORMANT)

**Sicherheitskritisch — Folgeauftrag nach externem Krypto-Review. App-Version bleibt v8.7.0 für Endnutzer.**

**Patch 2 (2026-05-31, pgcrypto-Schema-Qualifikation):** Nach dem ersten Live-Selbst-Angriffs-Lauf gegen das Supabase-Backend zeigte sich, dass die `pgcrypto`-Extension in Supabase im `extensions`-Schema liegt — nicht in `public` — und die SECURITY-DEFINER-RPCs mit `search_path = public, pg_temp` die Funktionen `crypt`/`gen_salt` nicht fanden. Alle drei Aufrufstellen in `csc-backend.sql` sind jetzt voll-qualifiziert auf `extensions.crypt` und `extensions.gen_salt`. Begründung Option B vs A in `CSC-CRYPTO.md §10`. Keine Änderung am `cscCrypto`-Modul, keine App-Code-Änderung.

Drei konkrete Code-Änderungen + zwei Walkthroughs aus dem ersten Review:

1. **HKDF mit Per-User-Salt** (`csc_users.hkdf_salt`, 16 Bytes Base64). `cscCrypto.deriveKeyFromSeed(seed, hkdfSalt, purpose)` macht Salt zur Pflicht-Signatur (alte 2-Arg-Aufrufe werfen `HKDF_SALT_REQUIRED`). `csc_register` nimmt `p_hkdf_salt` zusätzlich entgegen, `csc_login` liefert es zurück. Begründung: zwei User mit zufällig identischem Seed bekommen jetzt trotzdem unterschiedliche Daten-Keys. Per-Purpose-Info-Tag bleibt zusätzlich aktiv.
2. **PBKDF2 600 000 → 1 000 000 Iterationen.** OWASP-Untergrenze ist 600 000; Reviewer empfiehlt höher. 1 M dauert ~500–1 000 ms auf Handys — akzeptabel für Setup/Login (1× pro Session). Daten-Zugriffe nutzen nur HKDF (instant).
3. **IV-Walkthrough (Punkt 3)** verifiziert clean — kein Code-Pfad cached oder leitet IV ab, `generateIv()` ruft direkt `crypto.getRandomValues`. Test verdoppelt von 100 auf 1 000 Operationen (Set-Größe == 1 000).
4. **Backend-Funktion-für-Funktion-Audit (Punkt 4)** als Tabelle in `CSC-CRYPTO.md` §9. 11 Funktionen, alle ✅. Die zwei `⚠️`-Defense-in-Depth-Schwächen in `csc_leave_circle` und `csc_circle_aggregate` (fehlende Length/Regex-Validation der Kreis-Args) sind inzwischen via **v8.7.1-prep-Patch** geschlossen — gleiches Pattern wie `csc_join_circle` bzw. `csc_contribute`. Begründung als Fußnoten in §9.

Tests: +6 in `v87crypto.mjs` (jetzt 37/37 grün); volle Regression unverändert grün. Kein Tag, kein `SW_VERSION_LABEL`-Bump.

Migrations-Pfad für etwaige v8.7.0-prep-Test-Backends: keiner. `csc-backend.sql` neu ausführen (DROP+CREATE). Modul war dormant, keine Produktivdaten.

## v8.7.0-prep — CSC E2EE Krypto-Modul (DORMANT, nicht aktiv)

**Sicherheitskritisch — Kryptographie. App-Version bleibt v8.6.0 für Endnutzer.**

- **`cscCrypto`-Modul** als IIFE inline in `index.html`: PBKDF2-HMAC-SHA256 (600 000 Iter) für Passphrase→Key, HKDF-SHA256 für Seed→Daten-Keys, AES-256-GCM (12-Byte-IV pro Operation, niemals reuse) für alle Verschlüsselungen. Ausschließlich Web Crypto API, keine externen Libs.
- **`csc-backend.sql` komplett überschrieben** (alte v8.5.0-prep-Version war Klartext und nie live): neues E2EE-Schema mit `csc_users.kdf_salt` + `encrypted_seed`, `csc_sessions.{iv, encrypted_blob}` (KEINE Klartext-Sortfelder mehr), `csc_circles` + `csc_circle_members` + `csc_circle_contributions` mit k-Anonymity-Schwelle.
- **BIP39-Recovery vertagt auf v8.7.1.** Begründung: 2048-Wort-EN-Liste muss byte-genau übereinstimmen, eine Memory-Reproduktion ist zu fehleranfällig. v8.7.1 wird die offizielle Datei aus `bitcoin/bips` mit SHA-256-Test einbinden.
- **`CSC-CRYPTO.md`** dokumentiert Threat-Model, Stack, Schlüssel-Hierarchie, Non-Goals, DSGVO-Restpflichten und die drei Stellen, an denen ich externe Krypto-Review für nötig halte.
- **31 Tests** in `v87crypto.mjs` (Round-Trip, IV-Uniqueness über 100 Operationen, AES-GCM-Auth-Failures bei falschem Key/IV/manipuliertem CT, PBKDF2-Determinismus + Salt-Trennung, HKDF-Purpose-Trennung, Session-Wrapper-Versionierung).
- **Volle Regression 480/480 grün** über 23 Suiten.

**KEIN UI, KEIN Live-Feature, KEIN Tag.** Der bestehende dormant `cscClient` wurde NICHT umgebaut — das ist die v8.7.1-Aufgabe, nach externem Krypto-Review.

**Was Andre tun muss vor jedem Live-Schritt:** externes Krypto-Review (siehe `CSC-CRYPTO.md` Abschnitt 6 + 7), Supabase-EU-Projekt mit neuem `csc-backend.sql` aufsetzen, BIP39-Recovery (v8.7.1) abwarten, dann erst v8.7.2 Aktivierung.

## v8.6.0 — Teilen vervollständigt (QR-Code inline, Buttons, CDN-Fix)

Drei fokussierte Module, keine neuen Features sonst. Keine Änderung an Adaptern, CSC-Backend/-Client, Voice oder Tracking-Logik.

### Modul 1 — Inline-QR-Encoder
- Eigener QR-Code-Encoder im index.html als IIFE: `qrEncode(text, eclName)` → `{size, modules, version, mask}` und `qrRender(text, opts)` → SVG-String.
- Basis: **Nayuki QR Code Generator** (MIT-Lizenz, Header im Source); slimmed JS-Port (byte-mode only, auto-version-Auswahl 1..40, alle 4 EC-Levels L/M/Q/H, 8 Masken werden penalty-evaluiert).
- Kein externes CDN, keine Network-Fetch, keine npm-Dependency. ~350 LoC inline.
- Render: einfaches `<svg>` mit `<path>` (run-length-encoded Rechtecke pro horizontalem Modul-Run), skaliert sauber. SVG-Hash deterministisch für gleichen Input.
- Test-Vektoren: "hi" → v1/21px; "https://...x×200" → v11/61px; "x×800" mit EC=L → v20/97px; UTF-8 + Emoji + Surrogate-Pairs funktionieren; Fallback-SVG bei Überlänge (>2,9 KB) statt Exception.

### Modul 2 — Teilen-Buttons in Listen + QR im Share-Modal
- **Programm-Karten** (eigene + Werks) haben jetzt zwei Share-Buttons: `📤` öffnet das v8.5.0-Modal (Link + JSON + neu QR), `🔗` bleibt der klassische `openQRShare`-Pfad (für Rückwärtskompatibilität mit dem alten `#prog=`-Format).
- **Sorten-Karten** (Aroma-Liste, Werks + User-eigene) bekommen einen `📤`-Button → öffnet das v8.5.0-Modal mit `kind:'aroma'`.
- **Share-Modal #modalShareExport** erweitert: neuer `🔲 QR-Code`-Button rendert SVG inline in einer weißen Karte unter den Buttons mit Hinweis „lokal generiert, kein externer Service". Bei Modal-Open wird der QR-Container zurückgesetzt.

### Modul 3 — Externe CDN-Schuld abgeräumt
- **`openQRShare` (pre-v8.5.0)** nutzte `api.qrserver.com` als `<img src>`-Fetch. Jetzt: `qrRender()` inline, gleiches `#qrBox` zeigt das SVG.
- **Grep-Audit** aller HTTPS-URLs in index.html: keine unbekannten externen Hosts mehr. Whitelist (dokumentierte intentional-Externe): `fonts.googleapis.com` + `fonts.gstatic.com` (Google Fonts, sw.js skipt bewusst), `api.open-meteo.com` + `geocoding-api.open-meteo.com` (Wetter-Feature, vom User opt-in), `github.com` + `apps.apple.com` + `123ichbinmitdabei.github.io` (alle nur `<a href>`-Links, kein Fetch), `nayuki.io` (Lizenz-Header-URL im Kommentar), `www.w3.org` (SVG-xmlns, kein Fetch). Webhook/MQTT-Felder bleiben User-konfigurierbar (`webhook.example.com`, `your-webhook-url` sind Placeholder).
- **Service Worker** `sw.js` SHELL-Array enthält ausschließlich relative Pfade (`./`, `./index.html`, …). Google-Fonts-Domains werden im Fetch-Handler explizit übersprungen (kein Cache, kein Intercept).

### Tests + Regression
- +36 neue Tests: `v86qr.mjs` (17, davon UTF-8/Emoji/EC-Levels/Determinismus/Lizenz-Header) + `v86sharebuttons.mjs` (10) + `v86nocdn.mjs` (9, davon Grep gegen Whitelist + sw.js SHELL-Audit).
- **449 / 449** grün über 22 Suiten.
- Forward-compat-Patch: `v84voice.mjs` SW_VERSION_LABEL-Assert auf `/^v8\./` gelockert (war hart auf `'v8.4.0'`).

### Was NICHT in v8.6.0 ist (bewusst)
- Kein Bulk-Teilen-Mehrfachauswahl (Modul-2.4 war optional, ausgelassen für Fokus).
- Keine CSC-Mode-Aktivierung — Backend bleibt dormant; Supabase-Setup steht weiterhin bei Andre.
- Keine UI-Änderung am Quick-Action-Bereich oder am bestehenden Inline-Help-System.

## v8.5.0 — Praxis-Feedback

Sieben Module nach Andres Praxis-Nutzung von v8.4.0 mit dem Volcano. Keine Änderung an Adaptern, am CSC-Backend/-Client (bleibt dormant), an Voice-Parser oder Onboarding.

### Modul 1+2 — Programm-Anzeige Fix + Split-Screen
- `runCard` z-index auf 33 gesenkt, `voiceFab`/`wakeIndicator`/`connectHint` auf 41 gehoben → Header-Buttons (Mikro, Avatar, Hilfe, Settings) bleiben klickbar während Programm läuft. Bei aktivem Programm rutschen voiceFab und wake-indicator zusätzlich hoch (`bottom: 220px`), damit sie nicht unter dem expandierten Run-Panel verschwinden.
- Run-Panel zeigt jetzt die komplette Schritt-Liste mit aktuellem Schritt-Highlight, Restzeit pro Schritt (mm:ss) und Gesamt-Restzeit. Per-Step-Dauer per `_stepDurations()` aus der gleichen Logik wie `estimateDuration()`. Automatischer Switch auf Steuerungs-Tab beim Programm-Start, damit die Hero-Temperatur-Anzeige sichtbar bleibt → das ist die "untere Hälfte" des Splits.

### Modul 3 — TTS-Events konfigurierbar
- Neuer Master + Per-Event-Toggle-Map (`PREFS.ttsEvents`): `tempReached`, `programStart/StepChange/End`, `heaterOn/Off`, `pumpOn/Off`, `sessionStart/End`, `errors`.
- `ttsEvent(name, text)` als zentrale Sprech-Funktion; respektiert Master `PREFS.voiceTts`.
- Hooks in `cmdHeaterOn/Off`, `cmdPumpOn/Off`, `runProgram` (Step-Change + Start + End), `sessionTracker*`, `renderStatus` (`tempReached` mit ±2 °C Hysterese + einmal-pro-Heiz-Zyklus-Lockout).
- UI: `<details>`-Sub-Block unter „Sprachsteuerung" mit 11 Per-Event-Toggles.

### Modul 4 — Sorten-DB +70 (additiv)
- Von 57 auf **127** Sorten. Bestehende unverändert. Neu hinzugefügt: Sativa-/Indica-/Hybrid-Klassiker (Sour Diesel, Northern Lights, OG Kush, Pineapple Express, …), moderne hochpotente (Runtz, Zkittlez, Gelato, Wedding Cake, …), CBD/medizinisch (Harlequin, ACDC, Cannatonic, Bediol, …), Landrace (Acapulco Gold, Hindu Kush, Durban Poison, …), Hash (Bubble Hash, Dry Sift) und drei Temperatur-Profile (Niedertemp 160 °C / Mittel 180 °C / Hoch 210 °C).

### Modul 5 — Programm-Vorlagen +12 (additiv mit Tags)
- Bestehende 6 PRESETS unverändert. Neu: Aroma-Sweep 4 Stufen, Doppel-Ballon 185°, Easy-Valve-Refill 195°, Smooth-Ramp 165→195, Power-Ramp 180→215, CBD-Modus 160-175°, Abend-Indica 200°, Mighty Step-Session 180→205, Mighty Microdose 165°, Portable Power 195°, Schlaf-Programm 200° tief, Schmerz-Stütze 1:1, Microdose-Reihe (3× Mini). Jedes mit `tags`-Array (z. B. `['volcano','aroma']`, `['mighty','crafty','portable','microdose']`).

### Modul 6 — Offline-Teilen (JSON + Share-Link)
- Schema-validierte Share-Payloads (`{v:1, kind, items}`) für `aroma` / `program` / `bundle`. Hard limits: 100 Items, 200 Schritte pro Programm, 500 Zeichen pro Textfeld. Whitelist erlaubter Step-Actions (kein `eval`, kein Code).
- Share-Link: URL-Hash mit base64url-codiertem JSON, App liest beim Start aus dem Hash und öffnet **Vorschau-Modal** vor jedem Import.
- JSON-Datei-Download/-Upload via Blob + FileReader.
- Import vergibt **immer neue IDs**, überschreibt nichts.
- **QR-Code vertagt auf v8.5.1** — Inline-QR-Encoder (~700 LoC Reed-Solomon) sprengt den Session-Rahmen. Spec erlaubte das ausdrücklich. `openQRShare` (pre-v8.5.0) nutzt weiterhin `api.qrserver.com`-CDN; auch das wird in v8.5.1 auf inline umgestellt.

### Modul 7 — Tracking konfigurierbar + erweitert
- `PREFS.trackingEnabled` (Default an): aus → keine Auto-Notiz-Modale mehr nach Sessions.
- `PREFS.trackingFields` (8 Felder): `strength`, `effect`, `aroma`, `moodBefore`, `moodAfter`, `purpose`, `tags`, `notes`. Modal blendet nicht-aktivierte Felder aus (`data-track-field`-Attribut + `style.display`).
- Neue Felder: Stimmung vorher/nachher (1-5 Skala mit 😢😕😐🙂😊), Zweck (Schlaf/Schmerz/Genuss/Sozial/Kreativität/Sport/Anderes), Tags (Komma-getrennt mit `<datalist>`-Auto-Vervollständigung aus früheren Sessions). Aroma-Dropdown war bereits v8.3.0.
- **⚡ Schnell-Speichern**-Button: speichert mit `PREFS.trackingDefaults`-Werten, kein Ausfüllen nötig — direkte Antwort auf Andres „nervig"-Feedback bei Routine-Sessions.
- Setup-Akkordeon „📝 Sessions" hat jetzt eine zweite Karte „Tracking-Einstellungen" mit Master-Toggle + 8 Feld-Checkboxen.

### Tests + Regression
- +68 neue Tests: `v85uifix.mjs` (13) + `v85tts.mjs` (13) + `v85sharing.mjs` (25) + `v85tracking.mjs` (17).
- **413 / 413** grün über 19 Suiten.
- Keine forward-compat-Patches an älteren Suiten nötig.

## v8.5.0-prep — CSC-Mode (DORMANT, nicht für Endnutzer)

**Sicherheitskritisch.** App-Version bleibt v8.4.0. Diese Vorbereitung committet:

- `csc-backend.sql` — Schema + RLS-deny-all + SECURITY-DEFINER-RPCs (bcrypt-PIN-Hash via pgcrypto, Brute-Force-Lockout, k-anonymity auf Kreis-Aggregaten).
- `cscClient` im Frontend — feature-flagged hinter `PREFS.cscEnabled` (default **false**), kein UI verdrahtet, keine Auto-Sync-Trigger. Ohne `csc-config.json` passiert nichts.
- `CSC-SECURITY.md` — Threat-Model, logische Bewertung der 5 Pflicht-Selbst-Angriffe (Live-Lauf muss Andre nach Setup machen), DSGVO-Checkliste.
- `csc-config.example.json` — Vorlage; `csc-config.json` ist gitignored.

**Vor Aktivierung muss Andre:** Supabase-Projekt anlegen (EU-Region), `csc-backend.sql` ausführen, die 5 Live-Angriffe mit `curl` durchspielen, Einwilligungs-UI ergänzen, DPA + Privacy-Policy klären. Siehe `CSC-SECURITY.md` für Details. Nichts davon ist mit diesem Commit live.

Tests: +28 (`v85csc.mjs`, fetch-mocked) → 345 / 345 über 16 Suiten grün. Keine Änderung an Adaptern, Voice, Onboarding, Heizkurven, Aroma oder lokalem Tracking.

## v8.4.0 — Onboarding + Voice

Keine Änderung an Adaptern, Pioneers-Framework, UX-Polish, Session-Tracking, Heizkurven oder Aroma-Bibliothek.

### Erst-Onboarding

Frische Nutzer (kein `sessions_onboarded_v1`, `vol_tour_completed` oder `vol_onboarded` im Storage) sehen beim ersten Start einen 5-Slide-Welcome-Flow via dem bestehenden `showSlides`-Modal: Willkommen / Geräte / Verbinden / Features / Sicherheit. Nach Abschluss läuft die bestehende interaktive Schritt-für-Schritt-Tour (`startOnboardingTour`) automatisch weiter. Setup-Tab → „Onboarding nochmal zeigen" startet den Welcome-Flow erneut (unabhängig vom Tour-Reset-Button). Alt-Nutzer (vorhandenes `vol_tour_completed`) sehen weiterhin den bestehenden v5-Migrations-Wizard, nicht das Welcome.

Zusätzlich: ein dezenter „👆 hier tippen"-Pill neben dem „Verbinden"-Button für noch nicht verbundene Frisch-Nutzer (verschwindet beim ersten Connect-Versuch, dauerhaft via `sessions_connect_hint_dismissed_v1`).

### Voice-Steuerung — erweitert

Der existierende Voice-Pfad wurde um einen reinen Parser (`parseVoiceCommand(text) → {action, value, raw}`) refaktoriert — testbar ohne Web-Speech-API. Neue Befehle: „wärmer / heißer / hotter" (+5 °C), „kälter / cooler" (−5 °C), „status / wie warm" (TTS-Statusantwort über bestehendes `speakStatus`), „trennen / disconnect", „boost". Deutsche Zahlwörter werden via `parseGermanNumber` aufgelöst — z. B. „auf hundertneunundachtzig grad" → 189. Englische Varianten (`heater on`, `stop heating`, `pump for 20 seconds`, `set temperature 200`) werden ebenfalls erkannt. Hardlimits (`tempRange`) und das Beta-Confirmation-Modal (für `unverified`-Adapter wie PAX) gelten unverändert auch für Voice — kein Bypass.

### Wake-Word „Hey Sessions" 🧪 (experimentell)

Optionaler Toggle im Setup (Default AUS). **Ehrliche Bewertung im UI und im Code:**

- **Was es ist:** Web Speech API mit `continuous=true`, hört auf Prefix „Hey Sessions / Okay Sessions / Sessions". Nach Match spricht die App via TTS „Ja?" und der nächste Satz wird als Voice-Befehl ausgeführt. 10 s Dialog-Timeout. Auto-Restart über `onend`, da die Recognition periodisch von alleine stoppt.
- **Was es NICHT ist:** kein lokales On-Device-Wake-Word wie Alexa/Hey-Siri. Chrome routet das Audio über die Google-Speech-Cloud — das ist im Setup-Label und in den Code-Kommentaren so dokumentiert.
- **Wo es geht:** Chrome / Edge auf Android und Desktop. iOS Safari, Firefox: nicht unterstützt; der Toggle lehnt das ab und meldet das per Toast.
- **Wo Vorsicht:** Mikrofon ist dauer-aktiv (Akku); Beta-Confirmation bleibt aktiv (Wake-Word kann keine ungelabelten Heiz-Befehle „durchrutschen" lassen).

### Tests + Regression

- +79 neue Tests: `v84onboarding.mjs` (19) + `v84voice.mjs` (60).
- **317 / 317** über 15 Suiten grün.
- Forward-compat: zwei Versionsasserts (`v51`, `v83aroma`) auf `^v8\.` gelockert; v51-Migration-Test prüft jetzt den Wizard-Titel (statt nur ob das Slides-Modal offen ist), damit der neue Welcome-Flow für frische Nutzer nicht fälschlich als Migration durchgeht.

## v8.3.0 — Heizkurven-Editor + Aroma-Bibliothek

Zwei Power-User-Features. Keine Änderung an Adaptern, Pioneers-Framework, UX-Polish oder Session-Tracking (nur ein optionaler Aroma-Hook im Session-Notiz-Modal).

### Heizkurven-Editor (visuell)

Im Programm-Editor neue dritte Ansicht **🌡 Kurve** neben Liste/Timeline (toggle bleibt gespeichert).

- **Inline-SVG** Ziel-Temperatur-Profil über die geschätzte Zeit (gleiches Zeitmodell wie `estimateDuration`).
- **Vertikales Ziehen** an einem Punkt ändert die Set-Temperatur (Snap 5 °C, geclamped auf den Geräte-Bereich). Folgende `wait_until`-Schritte mit gleichem Wert werden automatisch mitgezogen.
- **Dauer +/−** für jeden `wait`/`pump_for`-Schritt (±5 s).
- **Punkt hinzufügen / löschen** (Long-Press = löschen mit Bestätigung).
- **Live-Marker** für aktuellen Ist-Wert wenn verbunden; **Pump-Bänder** zeigen `pump_for`-Phasen.
- **▶ Simulation**: animierter Sweep über die Kurve in ~4 s (rein visuell, schickt nichts ans Gerät).
- Beide Editoren teilen dieselben Daten — eine Änderung in der Kurve erscheint sofort in der Liste.

### Aroma-Bibliothek

Bestehende DB mit 57 Sorten + Custom-Sorten **non-destruktiv erweitert** um abgeleitete Felder (`effects`, `thcLevel`, `recommendedTemp{min,max}`, `description`, `terpenes`, `userAdded`) via `normAroma()` — kein einziger DB-Eintrag wird verändert.

- **Filter & Suche**: Effekt-Pills (Entspannt/Energetisch/Kreativ/Schläfrig/Fokussiert/Sozial, Multi-Select), Typ (Sativa/Indica/Hybrid/Andere), THC-Level (Mid/High/CBD), Sortierung (A-Z / Beliebtheit / Zufall), kombinierbar mit der bestehenden Volltext-Suche.
- **„Empfohlen für dich"** oben: gewichtet die Effekt-Bewertungen aus deinen Session-Notizen (v8.2.0); ohne Sessions: drei zufällige Sorten als Einstieg.
- **Detail-Modal** pro Sorte: Typ + THC, Effekte, empfohlener Temperatur-Bereich + Direkt-Buttons zum Setzen, Statistik aus deinen Sessions („Du hast diese Sorte 5× getestet, ⌀ Stärke 7,2/10") bei eigener Sorte: löschen.
- **Custom-Sorten** weiterhin im bestehenden Key `vol_custom_aromas`; bestehende Einträge bleiben kompatibel.
- **Session-Modal-Integration**: optionales Aroma-Dropdown im v8.2.0-Notiz-Modal → `SessionNote.aroma` (einziger Eingriff in v8.2.0).
- **Tests**: +38 (v83curves 18 + v83aroma 20). Adapter/Pioneers/UX-Polish/Session-Tracking-Core unverändert.

## v8.2.0 — Session-Tracking (Minimal)

Ein eigenständiges, lokales Session-Tagebuch — **parallel** zur bestehenden v5.1.0-Statistik (die unverändert bleibt). Alles in `localStorage`, kein Tracking, kein Cloud-Sync, keine Chart-Library (Inline-SVG). Bewusst minimal gehalten; Mood/Zweck/Aroma/Limits folgen in v8.3.0.

- **Auto-Erkennung**: Heizer-EIN startet einen Session-Kandidaten, Heizer-AUS beendet ihn. Sessions unter 60 s werden verworfen; längere öffnen ein Notiz-Modal. Manueller Start/Stopp zusätzlich per Quick-Action („Session beginnen/beenden").
- **Notiz-Modal**: Stärke 1–10 (Pflicht, Default 5), Effekt (Entspannt/Energetisch/Kreativ/Schläfrig/Fokussiert/Sozial, optional), Freitext-Notiz. „Speichern" / „Später" (halb-gespeichert, erscheint als offene Session) / „Verwerfen".
- **Sessions-Sektion** im Setup-Tab (neues Akkordeon „📝 Sessions"): Liste neueste zuerst, Geräte-/Zeitraum-Filter, Aufklappen für Details, Bearbeiten/Löschen, JSON-Export, Banner für offene Sessions.
- **Drei Visualisierungen** (ab 5 Sessions): Wochen-Trend (12 W), GitHub-Style-Aktivitäts-Heatmap (7×12), Pausen-Historie (Top 5 + aktueller Streak).
- **Sanfte Hinweise**: sachlich-beobachtende Gesundheits-Notiz je nach Konsumdichte (keine Moral, kein Shaming).
- **3 Achievements** (Basis): „Bewusster Konsument", „Erste Pause", „Reflektierende Woche".
- **Tests**: +28 (v82tracking), volle Regression 264 grün. Keine Adapter-/Pioneers-/v5.1.0-Stats-Änderungen.

## v8.1.0 — UX-Polish

Vier Komfort-Features, keine Änderung an den Geräte-Adaptern oder Frameworks (236/236 Tests grün).

- **Theme „Automatisch (System)"**: neuer Schalter im Setup → Stil. Folgt dem hellen/dunklen Systemfarbschema (`prefers-color-scheme`) und reagiert live auf Systemwechsel. Die bestehenden 6 Themes (Dunkel/Hell/Lava/Forest/Cosmos/Paper) bleiben unverändert; eine manuelle Theme-Wahl beendet den Auto-Modus.
- **Benutzerfreundliche Fehlermeldungen**: technische BLE-Fehler werden in verständliche Hinweise mit Titel, Erklärung und konkreter Handlungsempfehlung übersetzt (`humanizeError` + größerer „friendly"-Toast mit Schließen-X, 8 s). Greift bei Verbinden, Heizen/Temperatur/Pumpe und Adapter-Auth; der UUID-Selbsttest bleibt bewusst still.
- **Setup-Tab als Akkordeon**: die fünf Setup-Sektionen (Gerät / Übersicht / Werkzeuge / Erweitert / Verbindung) sind jetzt auf-/zuklappbar (`<details>`), der Zustand wird pro Sektion gespeichert. Die App-Einstellungen im Settings-Modal (eigene Sub-Tabs) bleiben unverändert.
- **Smarte Schnellzugriffe**: die Quick-Actions auf der Steuerung passen sich Verbindungs-, Geräte- und Heizer-Status an (z. B. Volcano: Direkt-Zug/Ballon/Timer/Aroma mit Puls auf dem nächsten Schritt; Puffco: Heizen starten/abbrechen; Firefly: nur „Pioneer melden"). Eine Aktion lässt sich per Long-Press anpinnen (bleibt an Position 1).

## v8.0.0 — Firefly (Probe-Only, RE-Hilfe gesucht) 🔬

Firefly ist die schwierigste Plattform der Roadmap: **es existiert kein vollständiges Open-Source-Reverse-Engineering**. Die GitHub-Repo-Suche „firefly vaporizer bluetooth" liefert **0 Treffer**, npm/Web-Recherche keine eindeutige BLE-Service-/Characteristic-/Frame-Dokumentation. Die offizielle Steuerung läuft über die Hersteller-Web-App (fireflyvaporwebapp.com), die **bewusst nicht reverse-engineert** wurde.

**→ Konsequenz: kein Raten. Firefly läuft als Probe-Only-Adapter** — das Gerät wird erkannt, aber es gibt **keine Steuerung**. Stattdessen ein Aufruf an die Community, beim Reverse-Engineering zu helfen.

- **Erkennung:** per Name (`/firefly/i`); keine spekulative Service-UUID.
- **UI:** Beim Verbinden wird die manuelle Steuerung ausgeblendet und ein Banner „🔬 Gerät erkannt, Protokoll-Recherche läuft" mit einem Reverse-Engineering-Hilfe-Button (eigener E-Mail-Betreff `[Pioneers RE-Hilfe]`) gezeigt. Alle Steuer-Methoden werfen einen klaren Fehler statt etwas zu raten.
- **Pioneers-Framework:** neue Status-Stufe **`probe_only`** (Pille „🔬 RE-Hilfe gesucht", abgegrenzt von „🟡 Tester gesucht").
- **Was RE-Helfer liefern können:** BLE-Sniffer-Logs aus der offiziellen App (Android HCI-Snoop / Wireshark), Service-/Characteristic-UUIDs (nRF Connect / Web Bluetooth Inspector), beobachtete Befehle (Temperatur, Heizen, Akku). Damit lässt sich später ein echter Adapter nachziehen.
- **Scope:** Firefly 2 / 2+ als Subtypes geführt (`supported:false`, Recherche läuft). Hersteller-Temperaturbereich 200–500 °F (nur Info, nicht als Protokoll verwendet).
- **Tests:** 16 automatisierte (Detection, Probe-Only-Verhalten, alle Steuer-Methoden werfen, UI-Ausblendung, Banner, Pioneers-Pille). Volle Regression grün, alle anderen Geräte unverändert.

## v7.0.0 — Puffco Peak Pro (Beta) ⚠️

Erster Konzentrat-Vaporizer (Dab) im Adapter-Set. Das BLE-Protokoll wurde aus **zwei unabhängigen Open-Source-Quellen portiert, die sich exakt decken** (keine Widersprüche): [Fr0st3h/Puffco-Reverse-Engineering-Writeup](https://github.com/Fr0st3h/Puffco-Reverse-Engineering-Writeup) (README + deobfuscated App) und [meekzyr/PuffcoPC](https://github.com/meekzyr/PuffcoPC) (Python BLE-Client). Kein Raten.

**⚠️ BETA — NICHT auf Hardware getestet.** Der Entwickler besitzt kein Puffco-Gerät. Geht live geschützt durch das Sessions-Pioneers-Framework (Status `unverified` → Beta-Bestätigung vor dem ersten Heizen + Notfall-Stop). **Nur für Tester mit Peak Pro.**

- **Auth (Firmware X):** Beim Verbinden liest die App den `accessSeed` vom `E0`-Characteristic, berechnet `Token = SHA-256(DEVICE_HANDSHAKE[16] ‖ accessSeed[16])[0..15]` und schreibt ihn zurück auf `E0`. **SHA-256 ist nativ (Web Crypto) — kein AES.** Der Token-Algorithmus ist gegen **beide** Referenz-Implementierungen validiert (identischer Output für Fr0st3hs publizierten Seed); ältere Firmware ohne `E0` läuft ohne Auth. Auth-Fehler → sofortiger Disconnect.
- **Werte:** IEEE-754 float32 little-endian, Temperatur in **Celsius**. Aktuelle Temp `…025`, Ziel `…026`, Akku `…020`, Betriebszustand `…022`, Kammertyp `…03f`.
- **Heizen:** explizites Kommando (anders als PAX) — `heatCycleStart`/`heatCycleAbort` (float32 7/8) an `…040`. Beta-Bestätigung greift in `cmdHeaterOn`.
- **Zieltemperatur:** wird über das aktive Heiz-Profil gesetzt (Pointer `…061` + Preheat-Temp `…063`), genau wie die offizielle App + PuffcoPC. Hard-Lock **204–327 °C** (400–620 °F).
- **Pflicht-Sicherheitstimer** (tragbares Gerät, kein BLE-Auto-Aus). Keine Pumpe/Ballon.
- **Scope:** nur **Peak Pro**. Proxy/Pivot sind in den Quellen nicht dokumentiert → `supported:false`. Das neuere **Lorax**-Protokoll (neueste Firmware) ist noch nicht implementiert (TODO).
- **Tests:** 35 automatisierte (Auth gegen cross-validierten Vektor, float32-Byte-Vektoren von Fr0st3h, Mock-BLE-End-to-End inkl. Handshake-Verifikation). Volle Regression grün, alle anderen Geräte unverändert.

**Credits:** Puffco-Protokoll © [Fr0st3h](https://github.com/Fr0st3h/Puffco-Reverse-Engineering-Writeup) & [meekzyr/PuffcoPC](https://github.com/meekzyr/PuffcoPC). Reverse-Engineering zwecks Interoperabilität (DMCA §1201(f)).

## v6.0.0 — PAX 3 (Beta) ⚠️

Erster Adapter außerhalb der S&B-Familie. Das PAX-3-BLE-Protokoll wurde **1:1 aus dem Open-Source-Projekt [evertonstz/pax-romana](https://github.com/evertonstz/pax-romana) (MIT-Lizenz) portiert** — kein Reverse-Engineering, keine geratenen Bytes. Die Krypto ist gegen die Testvektoren von pax-romana selbst validiert (nicht-zirkulär).

**⚠️ BETA — NICHT auf Hardware getestet.** Der Entwickler besitzt kein PAX-Gerät. Der Adapter geht live, geschützt durch das Sessions-Pioneers-Framework (Status `unverified` → Beta-Bestätigung vor dem ersten Heizen + dauerhaft sichtbarer Notfall-Stop). **Nur für Tester mit PAX 3.** Feedback bitte an die Pioneers-Adresse in der App.

- **Krypto:** AES-128-ECB (Schlüssel-Ableitung aus der Seriennummer) + AES-128-OFB (Frame-Ver-/Entschlüsselung), via inline eingebettetem [aes-js](https://github.com/ricmoo/aes-js) (MIT). Web Crypto bietet weder ECB noch OFB.
- **Seriennummer-Pflicht:** Der Schlüssel wird aus der 8-stelligen PAX-Seriennummer (steht im Akkufach) abgeleitet → einmalige manuelle Eingabe beim Verbinden. Automatische Auslesung ist TODO (im PAX-Protokoll nicht über den BLE-Namen verfügbar).
- **Temperatur:** Hard-Lock 175–215 °C (PAX-3-Bereich). Werte außerhalb werden begrenzt.
- **Kein Heizer-Befehl:** PAX 3 heizt **automatisch** beim Ziehen (Lippensensor) — das Protokoll kennt kein „Heizer an/aus". Der Heizer-Status (Heizt/Bereit/Boost/Abkühlen/Standby/Aus) wird nur **gelesen**. Zieltemperatur setzen genügt.
- **Pflicht-Sicherheitstimer:** wie bei allen tragbaren Geräten (kein BLE-Auto-Aus) erzwingt die App einen Auto-Aus-Timer.
- **Scope:** nur **PAX 3**. PAX Plus/Mini und Era/Era Pro sind ein anderer Handshake und **nicht** enthalten.
- **Tests:** 39 automatisierte Tests (Krypto gegen pax-romana-Vektoren, Frame-Builder/-Parser, Mock-BLE-End-to-End-Connect mit ver-/entschlüsselten Frames). Volcano/Crafty/Mighty/Venty/Veazy unverändert (volle Regression grün).

**Credits:** PAX-3-Protokoll © [evertonstz/pax-romana](https://github.com/evertonstz/pax-romana) (MIT) · AES © [Richard Moore / aes-js](https://github.com/ricmoo/aes-js) (MIT) · Venty/Veazy-Protokoll © [firsttris/reactive-volcano-app](https://github.com/firsttris/reactive-volcano-app) (MIT).

## v5.2.0 — Sessions Pioneers (Beta-Tester-Framework)

Foundation für die Multi-Brand-Roadmap: ein Beta-Status-System (`stable` / `mock_only` / `unverified`) pro Gerätefamilie, eine Pioneers-Karte im Setup (E-Mail- + GitHub-Issue-Vorlage, Status-Pills, Diagnose-Log-Export, Tester-Checkliste), ein Beta-Bestätigungs-Dialog vor dem ersten Heizen auf ungetesteten Geräten und ein Notfall-Stop-Button. Greift automatisch für künftige Beta-Adapter (PAX/Puffco/Firefly). Bestehende Geräte (Volcano stable, Venty/Veazy stable, Crafty/Mighty mock-validiert) unverändert.

## v5.1.0 — Polish-Features

Vier nutzersichtbare Features, keine Adapter-Änderungen:
- **Geräte-Statistik** pro Gerätetyp (Sessions, Heizzeit, Heizer-/Pumpe-/Boost-Zyklen, Max-Temp, Ballons) im Setup-Tab, mit Reset pro Gerät. Eigener `sessions_stats_v1`-Store, failsafe.
- **Home-Assistant-Export**: WebHook-URL + auto-generiertes REST-Sensor-YAML-Snippet (Kopieren), optionales Test-Senden der Stats (kein Auto-Push, Privacy).
- **Gerätespezifische Tour**: beim ersten Connect je Gerätetyp eine kurze Slide-Tour (Volcano/Crafty-Mighty/Venty-Veazy), zurücksetzbar.
- **Migrations-Wizard** v4→v5: einmaliger Willkommens-Slide für Bestandsnutzer nach dem Update.

## v5.0.4 — Venty Status-Details

Macht bereits geparste Status-Felder im Hero sichtbar (keine neuen Protokoll-Hypothesen): Lade-Indikator (🔋 87% ⚡ wenn am Netzteil), Heiz-/Bereit-Status („Heizt…" / „✓ Bereit"), Boost-/Super-Boost-Badge. Nur Venty/Veazy betroffen, Volcano/Crafty/Mighty unverändert.

## v5.0.3 — Venty/Veazy-Protokoll aus firsttris portiert

Das Venty/Veazy-BLE-Protokoll ist jetzt 1:1 aus **[firsttris/reactive-volcano-app](https://github.com/firsttris/reactive-volcano-app)** (MIT-Lizenz, hardware-getestet) portiert, statt aus Hex-Dumps geraten. Kernpunkte: Status wird aktiv per Command 0x01 alle 500 ms angefragt (das Polling ist zugleich der Keep-Alive gegen den Idle-Disconnect); Write-Format ist `[cmd=1][mask][payload]`; der Status-Frame liefert Zieltemperatur (Bytes 4-5), **Akku (Byte 8)**, Heizer-Modus (Byte 11: aus/normal/boost/super), Lade-Status und Settings. Venty liefert protokollbedingt **keine Ist-Temperatur** — angezeigt werden Soll-Temperatur + Heiz-/Bereit-Status. UI aktualisiert sich jetzt live nach jedem Status. Permanent-Bluetooth wird korrekt gesetzt. Dank an firsttris (MIT).

## Hotfix v5.0.2.3 — Venty Frame-Typen kalibriert

Mit echten Hardware-Hex-Dumps: drei weitere Venty-Frame-Typen werden erkannt — Firmware-Info (Byte0 0x02, parst ASCII FW/BL-Version → Anzeige im Hero), Heater-Command-Echo (0x20, kein State-Update), Status (0x04, Current-Temp Bytes 1-2). Target-Temp und Akku kommen nicht über Notifications zurück (Bytes 4-5 sind eine Konstante) → Target aus eigenem Setzbefehl, Akku weiter „🔋 --". BLE_PERMANENT wird nur einmal pro Session versucht (kein „GATT operation already in progress" mehr bei Reconnect).

## Hotfix v5.0.2.2 — Venty Parser + Verbindungsstabilität

Nach Venty-Hardware-Test Runde 2: Notification-Parser unterscheidet jetzt Frame-Typen (1-Byte Settings-Echo, 5-Byte Command-Echo für Boost/SuperBoost, ≥6-Byte Status mit Current-Temp aus Bytes 2-3 Uint16 LE). Akku wird nur angezeigt, wenn der Wert bekannt ist (sonst „🔋 --", kein falscher Wert). Gegen den ~30s-Auto-Disconnect des Venty: BLE_PERMANENT-Setting-Versuch + Keep-Alive-Read alle 20s. Service-Stale-Recovery beim manuellen Service-Scan (neu verbinden + Services frisch holen). Erste 10 Notifications werden als Hex geloggt.

## Hotfix v5.0.2.1 — Geräte-Erkennung robust

Nach Venty-Hardware-Test (Fehl-Erkennung als Volcano): Erkennung läuft jetzt **Service-UUID-Probe zuerst** (zuverlässiger als Namens-Strings), **kein stiller Volcano-Fallback** mehr bei unbekanntem Gerät (stattdessen Disconnect + Fehlermeldung), Hero-Badge zeigt den **aktiven Adapter** (nicht das Legacy-Picker-Profil), Diagnose-Dump im sichtbaren App-Log bei jedem Connect, erste 5 Venty-Notifications immer als Hex geloggt (Parser-Kalibrierung), kein Reconnect-Loop bei nicht erkanntem Gerät.

## Was ist neu in v5.0.2 — Venty / Veazy Support

`VentyVeazyAdapter`: ein Adapter für Venty (Hardware-getestet ausstehend) und Veazy (Beta, ungetestet, gleiches Protokoll). Command-basiert über einen einzelnen Control-Characteristic mit Notification-Status (Boost, Super-Boost, Akku, Temperatur). Boost/Super-Boost-Steuerung in der Hero-Steuerung, Boost-LED-Visualisierung in den Einstellungen, K1-Pflicht-Safety-Timer + K3-Reconnect auch für Venty/Veazy. Zusätzlich: Crafty/Mighty Battery-Char-Fallback (0x63 → 0x41 → 0x73) für unterschiedliche Geräte-Generationen. Der Notification-Parser ist defensiv (nur plausible Werte) und bei Bedarf via Hex-Dump kalibrierbar. Volcano + Crafty/Mighty unverändert.

## Was war in v5.0.1 — Crafty / Mighty Support

`CraftyMightyAdapter`: Auto-Detection per Name (STORZ&BICKEL / MIGHTY / CRAFTY) und Service-UUID, Temperatur + Heizer + Akku über das Crafty/Mighty-BLE-Protokoll (Uint16 LE, dynamische Char-UUIDs). Keine Pumpe/Ballon (Direkt-Zug), Akku-Anzeige im Hero, Status-Polling alle 2s. Pumpe-bezogene Quick-Actions und Steps werden bei diesen Geräten ausgeblendet/übersprungen. Volcano bleibt unverändert.

## Was war in v5.0.0 — Foundation für Multi-Device

Reiner Architektur-Refactor, keine sichtbare Verhaltensänderung für Volcano. Der bestehende BLE-Code ist jetzt im **DeviceAdapter-Pattern** gekapselt (`DeviceAdapter`-Basisklasse, `VolcanoAdapter`), mit Capabilities-Map pro Gerät, Auto-Detection-Layer (`detectDevice`) und Vorbereitung für Crafty/Mighty (v5.0.1) und Venty (v5.0.2). Alle Steuerbefehle laufen über `State.adapter`.

## Was war in v4.9.8 — Session-Scheduler (Pre-Heat-Erweiterung)

Andre's Wunsch: „Pre-Heat umbenennen und als Timer nutzen. Start einer Session in X Stunden/Minuten mit Temperatur oder Programm, mit Möglichkeit der Wiederholung bis hin zum Wochenplan."

### Umbenennung: Pre-Heat → ⏱ Timer

Die Quick-Action „Pre-Heat" heißt jetzt **„Timer"** und öffnet einen vollwertigen Session-Planer statt zwei prompt-Dialoge. Der Meta-Text zeigt:
- „planen" wenn nichts geplant
- „in 10 Min" / „in 2 Std" wenn ein Schedule bald läuft
- „Mo. 20:00" für längerfristige

### Session-Scheduler — Datenmodell

| Feld | Optionen |
|---|---|
| **Name** | freier Text, max 40 Zeichen |
| **Aktion** | 🔥 Heizen auf X°C **oder** ⚙️ Programm starten |
| **Trigger** | In X Min (1–1440) **oder** zu Uhrzeit HH:MM |
| **Wiederholung** | Einmalig / Täglich / Mo–Fr / Sa+So / Eigene Wochentage |

Mehrere Schedules parallel möglich. Jeder hat einen Toggle-Switch zum Aktivieren/Deaktivieren ohne Löschen.

### Scheduler-Engine

- **Tick alle 30 Sek**: prüft alle aktiven Schedules
- **Re-Compute nach Trigger**: einmalige Schedules werden disabled, wiederkehrende bekommen neue nextRun-Zeit
- **Verpasste Schedules** (> 5 Min vorbei): werden übersprungen mit Recompute (kein Trigger Stunden später)
- **Sortierung**: aktive zuerst, nach nextRun
- **Persistenz**: LocalStorage `vol_schedules`

### Hero-Anzeige

Der bisherige Pre-Heat-Bereich im Hero zeigt jetzt den **nächsten anstehenden Schedule**:
- Name als großer Text
- Aktion + Restzeit / Uhrzeit als kleiner Text
- ×-Knopf deaktiviert den Schedule sofort (statt löschen)

### Sicherheits-Warnung im Modal

Da geplante Heiz-Aktionen ein Brandrisiko sind:

> ⚠️ **Sicherheit:** Geplante Sessions werden nur ausgeführt wenn die App geöffnet und mit dem Volcano verbunden ist. Auto-Cool-Down empfohlen.

App-Schließen = Schedule pausiert. Web Bluetooth kann nicht aus dem Hintergrund triggern, daher ist das physisch durch den Browser begrenzt.

### URL-Command Erweiterungen

- `?cmd=preheat&temp=185&min=10` erzeugt jetzt einen einmaligen Schedule (sauberer als alte prompt-Dialoge)
- `?cmd=schedule` öffnet das Scheduler-Modal direkt

Damit kann via Siri ein Schedule eingerichtet werden: „Hey Siri, Volcano in einer halben Stunde anheizen" → URL → Schedule angelegt + nextRun gesetzt.

### Tour-Erweiterung

Der Onboarding-Walkthrough hat jetzt einen Schritt für den Session-Planer: „4. Session-Planer (Timer) — plane Sessions zeitgesteuert..." Damit lernen neue User die Funktion automatisch kennen.

### Manual-Updates

Im Setup → Anleitung gibt es jetzt:
- „Session-Planer (Timer)" — komplette Erklärung
- „Schedule abbrechen" — wo und wie
- Pre-Heat-Eintrag entfernt (ist im Scheduler aufgegangen)

### Backward-Kompatibilität

- Alte `schedulePreheat()`-Funktion + `cancelPreheat()` bleiben für Legacy-Code da
- Bei Klick auf ×-Cancel im Hero: prüft erst ob ein Schedule next-up ist, sonst alter Pre-Heat-Cancel-Pfad
- Bestehende User ohne Schedules sehen den Quick-Button mit „planen"-Meta

## Beispiele

**Morgenroutine:**
- Name: „Morgen-Sativa"
- Aktion: Programm starten → „Sativa-Sweet-Spot"
- Trigger: Zu Uhrzeit → 08:00
- Wiederholung: Mo–Fr

**Abend einmalig:**
- Name: „Heute Abend"
- Aktion: Heizen auf 195°C
- Trigger: Zu Uhrzeit → 21:30
- Wiederholung: Einmalig

**Schnell vorheizen:**
- Name: „Jetzt vorheizen"
- Aktion: Heizen auf 185°C
- Trigger: In 5 Min
- Wiederholung: Einmalig (automatisch)

**Sonntags entspannt:**
- Name: „Sonntag-Indica"
- Aktion: Programm „Indica-Vollblüte"
- Trigger: 19:00
- Wiederholung: Eigene Wochentage → So

## Was bleibt offen

**v5.0 (nach Andre's Go):** Crafty / Mighty / Venty BLE-Implementierung — der Scheduler funktioniert dann automatisch für alle Geräte über das DeviceAdapter-Interface.

## Was war in v4.9.7

Tour-Endlosschleife gefixt (Spotlight bei Rand-Elementen), Settings-Tabs deutlich sichtbar gemacht (Hinweis-Text, oranger Active-Tab, Fade-Gradient, Scroll-Snap).

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt. **Niemals unbeaufsichtigt füllen — auch nicht via Schedule.**

## Hinweis zu Auto-Heat-Schedules

Geplantes Heizen ohne Anwesenheit ist ein Brandrisiko. **Lass die Auto-Cool-Down-Sicherheit immer aktiv** (Einstellungen → Sicherheit). Standard: nach 30 Min ohne Pumpaktivität schaltet sich der Heizer automatisch aus.
