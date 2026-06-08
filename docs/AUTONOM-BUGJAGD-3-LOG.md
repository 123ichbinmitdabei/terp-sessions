# Autonom Bug-Jagd 3 (Test-Woche-Tag), Logbuch

Mandat (2026-06-08, Andre): „weiter, nächster Tag". Auf Rückfrage Fokus gewählt: **Bug-Jagd + kleine sichere Fixes** (Test-Woche läuft, minimale Störung für aktive Tester). Stand Start: v9.37.0 live. Standregeln wie die Übernacht-Schichten.

## Bug-Jagd

### BJ3-1 (Medium, GEFIXT in v9.38.0) — Geteilte Programm-Links (#prog=) ohne Eingangs-Säuberung
- Ort: checkImportFromUrl (~13996), gegenüber dem Datei-Import importPrograms (9694) + dem schon vorhandenen Helfer _sanitizeImportedSteps (9681).
- Befund (verify-before-fix): Der Datei-Import säubert Schritte längst via `_sanitizeImportedSteps` (Whitelist `_IMPORT_VALID_ACTIONS` inkl. loop_start/loop_end + Wert-Klemmung). Der #prog=-Deeplink-Pfad (auto-getriggert beim Öffnen eines geteilten Links, also die exponiertere Fläche) übernahm `data.s` dagegen ROH, ohne Whitelist, ohne Längen-/Größen-Grenzen. QA2.20.1/20.2/20.3 waren damit nur für den Datei-Pfad erledigt, für den Link-Pfad offen.
- Risiko/Impact: Ein kaputter (abgeschnittener) oder bösartiger Link konnte ein Programm mit ungültigen Aktionen, Riesen-Name/-Beschreibung (Storage-Bloat) oder tausenden Schritten (Render-/expandLoops-Last) anlegen. Engine no-opt unbekannte Aktionen zwar (default-Zweig), aber Größe/Länge blieben ungebremst. Test-Wochen-relevant: Tester teilen Programme per Link.
- Fix (minimal, Infra-Wiederverwendung): Im Deeplink jetzt (a) Base64-Größen-Schutz (>100000 Zeichen -> Ablehnung, vor atob), (b) Name slice(0,80)+trim, Beschreibung slice(0,300), (c) `_sanitizeImportedSteps(data.s)` wie beim Datei-Import, Ablehnung wenn keine gültigen Schritte. Zusätzlich Schritt-Anzahl-Cap (500) IM Sanitizer -> schützt beide Pfade. Keine Engine-/Adapter-Änderung.
- Bewusst NICHT: kein Aktions-Whitelisting neu erfunden (existierte schon); keine Schärfung des Datei-Import-Krypto/Backup-Pfads (außerhalb Scope).

## Pakete

### Paket 1: Import-Härtung, v9.38.0, LIVE
- Test: v938import.mjs 16/16 (Sanitizer-Klemmung/Cap, Deeplink end-to-end feindlich-aber-gültig, zu großer Link abgelehnt, keine-gültigen-Schritte abgelehnt).
- Tester-Update-Baustein: „Geteilte Programm-Links werden jetzt streng geprüft (Größe, Name, Schritte), ein kaputter Link legt kein Müll-Programm mehr an."
- Live: wird nach Regression + Push bestätigt.
