# Autonom-Übernacht 2, Kampagnen-Logbuch

Mandat (2026-06-08, Andre, freie Hand, zweite Nacht-Schicht): Substanz wo noch da + gezielte Bug-Jagd in bestehenden Subsystemen. Stand Start: v9.35.0 live. Strategie laut Auftraggeber: erst Bug-Jagd (präziser Geist), dann 1 Feature-Paket mit echtem Test-Wochen-Wert.

Standregeln: wie Nacht 1 (kein cscCrypto/Backend/MB.7/Bundle-Split/Adapter-Protokoll/Beta-Hardware/Capacitor/datenschutz.html-Text/tabindex>0/breite DOM-Umsortierung; Em-Dash zu Komma; bestehende Infra; node --check; volle Regression je Paket; Push nach grün; Commit per -F; max 4h/Paket; KEIN Refactor von Tester-Werkzeugen/Modal-Inert/BLE-Adaptern).

## Bug-Jagd

Methode: `||`-Numeric-Defaults (0-überschreibt-Klasse wie gestern t.hour||8), Datum/Zeit, scheduleTick, Streak, parseInt/JSON.parse. Funde:

### BJ-1 (Medium, GEFIXT in v9.36.0) — scheduleTick: verpasster „in X Min"-Schedule churnt endlos
- Ort: scheduleTick (15197) Missed-Branch + computeNextRun (15108 'in'-Zweig).
- Symptom: Ein einmaliger „in X Minuten"-Schedule, der verpasst wird (App war >5 Min zu, z.B. Bluefy-Tab im Hintergrund/Reload auf iPhone), bekommt im Missed-Branch `sch.nextRun = computeNextRun(sch)`. Für 'in' ohne lastRun liefert computeNextRun `createdAt+mins`, also wieder einen Vergangenheits-Zeitpunkt. Nächster Tick (alle 30s): wieder `< now-5min` -> wieder recompute -> wieder Vergangenheit. Ergebnis: `changed=true` und `saveSchedules()` bei JEDEM Tick (alle 30s, dauerhaft), der Schedule feuert nie und wird nie deaktiviert (Zombie mit Vergangenheits-„nextRun").
- Test-Wochen-Relevanz: HOCH. Bluefy/iPhone backgrounden/reloaden Tabs ständig -> „in X Min"-Schedules werden oft verpasst.
- Fix: Im Missed-Branch nur übernehmen, wenn der recompute einen Zukunfts-Zeitpunkt liefert, sonst Schedule deaktivieren (enabled=false, nextRun=null). Wiederholende 'at'-Schedules liefern weiterhin Zukunft -> unverändert. Minimaler Eingriff.

### BJ-2 (Low, GEFIXT in v9.36.0) — noteSessionDay: „gestern" via fixem 86400000 (nicht DST-sicher)
- Ort: noteSessionDay (16801).
- Symptom: `dayKey(Date.now() - 86400000)` für die Streak-„gestern"-Prüfung. Der Rest des Codes wurde bewusst auf `setDate(getDate()-1)` umgestellt (QA2.17.9, Kommentar bei 14919 „DST-sicher statt fixem DAY_MS-Vielfachen"). Hier blieb der fixe Tag-Offset. An DST-Übergängen (in DE: Ende März / Ende Oktober) kann die „gestern"-Berechnung auf den falschen Kalendertag fallen und den Streak-Zähler zurücksetzen.
- Test-Wochen-Relevanz: NIEDRIG (kein DST-Übergang im Juni). Aber sauberer, konsistenter 1-Zeilen-Fix in der Spirit von gestern.
- Fix: `yesterday` via `new Date(); d.setDate(d.getDate()-1); dayKey(d.getTime())`.

### BJ-3 (sehr niedrig, DOKUMENTIERT, nicht gefixt) — Routine-Nudge: Stunden-Fenster wrappt nicht um Mitternacht
- Ort: 19105, `Math.abs(now.getHours() - r.hour) <= 1`.
- Symptom: Der einmal-tägliche „Routine erkannt"-Toast prüft ein ±1h-Fenster ohne Mitternachts-Wrap (23 vs 0 -> abs=23, kein Match, obwohl 1h auseinander). Folge: der unverbindliche Vorschlags-Toast erscheint in seltenen Grenzfällen nicht.
- Bewertung: rein kosmetischer Nudge, kein funktionaler Schaden. Nicht gefixt (Wert zu gering, Risiko unnötig). Für nach der Test-Woche notiert.

### BJ-4 (Beobachtung, kein Fix) — verpasster „once"+„at"-Schedule wird auf nächsten Tag verschoben
- Ort: scheduleTick Missed-Branch + computeNextRun 'at'-Zweig (liefert nächsten passenden Zukunfts-Tag).
- Symptom: Ein einmaliger Uhrzeit-Schedule (z.B. „einmalig 8:00"), der verpasst wird, feuert nicht ersatzlos, sondern beim nächsten Mal um 8:00. Das ist eine Design-Entscheidung, kein klarer Bug. BJ-1-Fix lässt dieses Verhalten bewusst unverändert (nur 'in' wird deaktiviert).
- Empfehlung für Andre: entscheiden, ob ein verpasster Einmal-Uhrzeit-Schedule deaktiviert statt verschoben werden soll. Strategie-Frage, daher nicht eigenmächtig geändert.

## Pakete

### Paket 1: Bug-Jagd Schedule + Streak, v9.36.0, LIVE (Richtung 2)

- **Was:** BJ-1 (scheduleTick verpasster „in X Min" once -> deaktivieren statt Endlos-Recompute/Save-Churn) + BJ-2 (noteSessionDay „gestern" DST-sicher via setDate).
- **Warum jetzt:** BJ-1 ist test-wochen-relevant (Bluefy/iPhone backgrounden Tabs, „in X Min"-Schedules werden oft verpasst). BJ-2 ist konsistenter Korrektheitsfix.
- **Risiko:** niedrig, je 1-3 Zeilen, gekapselt, keine Engine-/Adapter-Änderung. BJ-1 lässt wiederholende und „at"-Schedules bewusst unverändert (nur der nicht-zukunftsfähige Fall wird deaktiviert).
- **Verify-before-fix:** scheduleTick-Intervall 30s bestätigt; computeNextRun 'in'-Zweig liefert ohne lastRun `createdAt+mins` (Vergangenheit bei verpasst) bestätigt; QA2.17.9-setDate-Muster als Referenz für BJ-2.
- **Test:** v936bugjagd.mjs 10/10 (Deaktivierung + kein Zombie-Churn + Kontrast wiederholend bleibt aktiv; Streak +1/Reset/kein-Doppel).
- **Tester-Update-Baustein:** „Verpasste „in X Minuten"-Timer hängen nicht mehr fest, und der Streak-Zähler ist an Zeitumstellungen robust."
- **Live:** wird nach Regression + Push bestätigt.
