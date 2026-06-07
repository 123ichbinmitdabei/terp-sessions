# Autonom-Übernacht, Kampagnen-Logbuch

Mandat (2026-06-07, Andre, freie Hand): autonom durch die Nacht bis Montag-Morgen, kein fester Paket-Katalog. Stand zu Beginn: v9.32.0 live. Alle Audit-/Logbuch-Docs vor dem ersten Edit gelesen (QA-2-AUDIT + FIX-LOG, MB-A, A11Y-D2/-D3, TESTWOCHE-PREP, QA-1).

Standregeln (HART): kein cscCrypto, kein Backend, kein MB.7, kein Bundle-Split, keine Adapter-Protokoll-Änderung, keine Beta-Adapter-Hardware-Verifikation, kein Capacitor, kein Em-Dash-Sweep auf datenschutz.html, kein tabindex>0, keine breite DOM-Umsortierung, Em-Dashes in Prosa zu Kommas. Bestehende Infra nutzen. node --check je JS-Edit, volle Regression je Paket grün, Push erst nach grün, Commit per -F-Datei, Live-Verify. Pro Paket max 4h. Bei Unsicherheit: STOPP, dokumentieren, nächstes Paket.

## Initiale Prioritäten-Liste (Tester-Wert × Risiko, vor der Test-Woche)

Bewertung: die meisten QA-2-Funde sind im abgeschlossenen QA-2-Lauf (v9.16-9.26) bereits als FIXED/FALSE-POSITIVE/DEFERRED disponiert. Truly-open + nicht-verboten + sinnvoll vor der Test-Woche:

VERIFY-BEFORE-FIX-Korrektur (vor dem ersten Edit): Die Tour-A11Y (QA2.18.2/3/4: role=dialog + aria-modal + aria-labelledby, srLive-Schritt-Ansage, Fokus merken/zurückgeben, ESC) ist bereits seit v9.15.0 N8 umgesetzt (showTourStep 18653, endOnboardingTour 18768). Damit ist A11Y-D4 deutlich dünner als der Audit (pre-fix) vermuten ließ. Reihenfolge daher umgestellt auf Pakete mit echter offener Substanz:

1. **Crash-Recovery, sichere Variante (D)** — höchster Test-Wochen-Wert (Bluefy/iPhone-Reloads). Run-State in sessionStorage spiegeln; beim Start, falls unterbrochener Lauf, NUR Nachfrage „Programm X war aktiv, neu starten?" mit Bestätigung. NIE automatische Wiederaufnahme. Risiko: mittel, gekapselt (3 Einhängepunkte: Start, Ende/Stop, App-Start).
2. **Settings-Tooltips (G)** — Tester verstehen unklare Toggles. aria-describedby via sr-only + data-tip. Additive. Risiko: niedrig.
3. **Schedule-Templates (M)** — vordefinierte Schedules („Morgens decarb", „Abend-Session", „Wochenend-Aroma"). Additive, Tester-Komfort. Risiko: niedrig.
4. **Hover-Guard (C / QA2.16.3)** — 31 :hover-Regeln in @media(hover:hover) gaten (Sticky-Hover auf Touch). Niedriger Wert, niedriges Risiko. Falls Zeit/Kontext.
5. **Stretch: Pioneer-Achievements (J)** — Engagement der Tester -> mehr Daten. Falls Energie übrig.

Weitere Verify-Korrekturen werden pro Paket notiert.

Bewusst NICHT in der Liste (begründet):
- Toast->showFriendlyError (B, QA2.10.2): breit, hohe Churn-Gefahr in String-Assertion-Tests, geringer Netto-Wert vor der Woche. Vertagt.
- datenschutz.html-Inhaltsänderungen (QA2.21.x): anwaltlich freigegeben, nicht anfassen.
- QA2.9.2 (datenschutz/info in SHELL): bereits seit v9.23.0 erledigt (verifiziert).
- Alle FORBIDDEN-Kategorien der Kernregel.

---

## Pakete

### Paket 1: Crash-Recovery, v9.33.0, LIVE (Stossrichtung D)

- **Was:** Lauf-Status in sessionStorage spiegeln (Marker bei runProgram-Start, Löschen im finally). Beim App-Start `_maybeRunRecovery`: überlebt der Marker einen Reload (= Crash/Reload mitten im Lauf), Dialog „Programm X war aktiv, neu starten?". Nie Auto-Resume, nur mit Verbindung, Marker wird sofort konsumiert.
- **Warum jetzt:** Test-Woche läuft auf iPhone/Bluefy, wo Reloads/Abstürze vorkommen. Ein abgebrochener Lauf hinterlässt sonst nur Verwirrung; die Nachfrage gibt Orientierung ohne Risiko.
- **Risiko:** mittel, aber gekapselt. 3 Einhängepunkte (Start-Write, finally-Clear, Startup-Check). Sichere Variante laut Mandat: KEINE automatische Wiederaufnahme (Adapter-State nach Reload weg). sessionStorage (nicht localStorage), damit es nur Reloads überlebt, nicht Tab-Schließen.
- **Verify-before-fix:** runProgram (9421) + finally (9501) als einzige State.running-Lebenszyklus-Punkte bestätigt; uiConfirm unterstützt {title, okText, cancelText}.
- **Test:** v933recovery.mjs 12/12 (Quelle + synchroner Marker-Konsum + Dialog erscheint mit Name + Verwerfen/ohne-Verbindung/Programm-fehlt-Guards).
- **Beifang (echter Bug):** Die volle Regression deckte um ~22 Uhr (zeitabhängiger Coverage-Test QA2.1.4, `H=(getHours()+2)%24` -> 0) einen echten Bug in `computeNextRun` auf: `t.hour||8` behandelte Stunde 0 (Mitternacht) als fehlend und schob den Schedule auf 08:00. Fix: `t.hour!=null`-Prüfung. Verify-before-fix: Ursache im Code lokalisiert (nicht von Crash-Recovery verursacht), Fix minimal, in dieses Paket gefaltet, weil er die grüne Regression blockierte und ein 1-Zeilen-Korrektheitsfix ist. Relevanz für die Test-Woche: nächtliche Schedules (Decarb) feuern jetzt zur richtigen Zeit.
- **Tester-Update-Baustein:** „Wenn die App mitten in einem Programm neu lädt, fragt sie beim Start, ob sie es neu starten soll, statt es still zu vergessen. Außerdem feuern auf Mitternacht gesetzte Schedules jetzt korrekt (vorher fälschlich um 8 Uhr)."
- **Live:** wird nach Regression + Push bestätigt.
