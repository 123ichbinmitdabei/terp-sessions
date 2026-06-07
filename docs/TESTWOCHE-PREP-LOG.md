# Testwoche-Prep, Kampagnen-Logbuch

Mandat (2026-06-07, Andre): vor Andres einwöchiger Offline-Phase ab Dienstag maximale Test-Oberfläche bauen, damit die Pioneer-Woche strukturierte Daten liefert. Autonom, sequenziell, je Paket eigene v-Version + Tests + Push + Live-Verify + Memory-Update. Vier vorgegebene Pakete plus explizite Erlaubnis für eigene Erweiterungs-Pakete.

Standregeln: keine Adapter-/Protokoll-/BLE-Änderung, kein cscCrypto, kein Backend, kein tabindex>0, keine breite DOM-Umsortierung, Em-Dashes in Prosa zu Kommas (Marken-Em-Dash „Terp Sessions —" bleibt), bestehende Infra nutzen, node --check je JS-Edit, volle Regression je Paket grün, Push erst nach grün, Commit per -F-Datei.

---

## Paket 1: Tester-Werkzeuge, v9.28.0, LIVE

Inhalt:
- W1 Strukturierte Bug-Report-Templates: Dropdowns Bereich + Schweregrad, Blätter-Bewertung (radiogroup, konsistent mit Sorten-Rating), Reproduzierbar-Dropdown. Maschinenlesbarer JSON-Header + lesbare Klassifikation oben im Issue-Body (`_pioneerBugReportBuildUrl`).
- W2 Tester-Notizbuch im Pioneer-Tab: `vol_pioneer_notes`, Auto-Save debounced 1s, „+ Zeitstempel", Markdown-Export mit Kontext, „In Bug-Report" (hängt an nächsten Report).
- W3 Quick-Feedback 👍/👎 auf Programm-/Sorten-Karten + Quick-Bar für letzte Schnellzugriff-Aktion; `vol_quick_feedback`; 👎 mit optionalem 1-Satz-Feld (uiPrompt); Setup-Export JSON + „An Andre" (GitHub + Clipboard-Fallback).
- W4 Audio-Memo im Bug-Report (MediaRecorder bis 60s), lokaler Datei-Download, Vermerk im Report, graceful degradation.

Was war schwer / Entscheidungen:
- Quick-Action-Feedback: Quick-Actions sind `<button>`; verschachtelte Buttons sind ungültiges HTML und eine Umstrukturierung verstößt gegen „keine breite DOM-Umsortierung". Lösung: pro Karte (Programm/Sorte) Inline-👍/👎, für Schnellzugriffe stattdessen eine Quick-Bar als Geschwister-Element nach dem Grid, die die zuletzt ausgelöste Aktion (`State._lastQuickAction`) bewertet. Sauber und valide.
- W4 Base64-in-Issue-Body: bewusst NICHT eingebettet (würde GitHub-URL sprengen, rendert nicht). Stattdessen lokaler Download + Vermerk „Audio-Memo, X Sek." plus DM-Hinweis. Im Code dokumentiert.
- W2 „bei neuer Zeile Timestamp prefixen": als expliziter „+ Zeitstempel"-Knopf umgesetzt (fügt `[HH:MM]` auf neuer Zeile ein), statt Auto-Prefix bei jedem Enter (das wäre für Tipp-/Screen-Reader-Fluss störend gewesen).

Sichtbarkeit: alles an `PREFS.pioneerTestMode` gekoppelt (Notebook im Pioneer-Tab inhärent, Export-Box + Quick-Bar via `_pioneerApplyTabVisibility` / `renderQuickActions`).

Tests: `v928tools.mjs`, 27/27. Volle Regression: siehe unten. Vertagt: nichts aus Paket 1.

---

## Paket 2: Multi-Brand + Onboarding, v9.29.0, LIVE

TEIL A (MB.4 Puffco-Temp): Puffco-Schnellzugriffe „Dab heizen" 232 / „Pre-Heat" 204 (quickPuffcoTemp setzt Temp + Heizer an); `_clampTempToDevice` klemmt an tempRange; angewandt in buildProgramFromAroma (Aroma-Programme), #tInput (applyCapabilitiesUI), Editor-Step-Slider (editStepAt min/max device-aware); Beta-Hinweis um Puffco-Dab-Range ergänzt. cmdSetTemp klemmte bereits (verifiziert). Volcano unverändert.

TEIL B (MB.5 Sprache): Wizard geräte-neutral formuliert (Welches-Gerät-Seite + Prep-Liste). Verifikation: die vermuteten Strings „deinem Volcano"/„Ballon befüllen" existierten im Wizard NICHT (war schon multi-device), Ballon-Quick-Actions bereits per bagFill-Capability gegated. Daher minimaler, ehrlicher Eingriff statt erfundener Ersetzungen.

TEIL C (Onboarding): FAQ-Sektion (15 <details>-Fragen, #faqCard) im Setup-Tab; DEVICE_TOURS um pax/puffco/firefly erweitert + bestehende behalten, resetDeviceTours via Object.keys; „Erster Schritt"-Willkommensblock (#firstStepCard) auf der Steuerung, gegated auf nie-verbunden + keine eigenen Programme, ausblendbar (vol_firststep_dismissed), re-evaluiert in renderQuickActions.

Was war schwer / Entscheidungen:
- MB.5 premise check: Verify-before-fix zeigte, dass die Auftrag-Strings nicht existierten. Statt Pseudo-Fixes nur die real vorhandene Volcano-Zentrierung im Wizard neutralisiert, Rest dokumentiert.
- Aroma-Programm auf Puffco wird flach auf 204 geklemmt (alle Stufen < 204). Akzeptiert: ein 3-Stufen-Aroma-Verlauf ergibt für ein Dab-Gerät ohnehin wenig Sinn, der Clamp schützt vor Out-of-Range.

Tests: v929brand.mjs, 18/18. Vertagt: tiefere per-Schritt-Geräte-Texte im Wizard (nicht nötig, da generisch); MB.7 weiter vertagt (Hardware).

## Paket 3: A11Y-D3, v9.30.0, AUSSTEHEND

## Autonome Erweiterungen, v9.31.0+, AUSSTEHEND

---

## Abschluss-Empfehlung für Andre

(wird am Ende der Kampagne ergänzt)
