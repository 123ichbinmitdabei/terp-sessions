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

## Paket 2: Multi-Brand + Onboarding, v9.29.0, AUSSTEHEND

## Paket 3: A11Y-D3, v9.30.0, AUSSTEHEND

## Autonome Erweiterungen, v9.31.0+, AUSSTEHEND

---

## Abschluss-Empfehlung für Andre

(wird am Ende der Kampagne ergänzt)
