# QA-2 Fix-Kampagne, Logbuch

Start: 2026-06-08. Mandat von Andre: alle QA-2-Funde (docs/QA-2-AUDIT-2026-06-08.md) systematisch, vollstaendig und sauber abarbeiten. Jeder Fund wird VOR dem Fix im Code verifiziert (kein Raten). Pro Paket: Fix, Tests, volle Regression gruen, Commit, Push, Live-Verify.

Disposition-Kuerzel: FIXED (Paket/Version), FP (False Positive, bestaetigt), DEFERRED-RULE (durch Standregel ausgeschlossen: cscCrypto nie aendern, kein Backend, juristisch, manuelle Geraete-Abnahme), COVERAGE (Test-Luecke, Code korrekt), WONTFIX (bewusst, mit Begruendung), OPEN (in Arbeit).

## Bereits erledigt vor der Kampagne
- **v9.15.0 (Top-3):** QA2.1.2 + QA2.13.1 + QA2.27.3 (Safety-Timer-Kette), QA2.17.1 + QA2.17.2 (Bag-Statistik), QA2.18.1/.2/.3/.4/.6 (Tour-A11Y).
- **v9.16.0 (N2-N5):** QA2.2.1 (BLE-Write-Fehler durchreichen), QA2.13.2 (BLE-Mutex), QA2.5.1 + QA2.11.2 (Hotel-Exit-A11Y, derselbe Befund doppelt), QA2.12.1 (btnExportAll-Kollision).

## Standregel-DEFERRED (nicht in dieser Kampagne, bewusst)
- cscCrypto/CSC-dormant: QA2.7.2 (Klartext-CSC-PIN unreachable), QA2.7.3 (csc_circle_aggregate k-Schranke), QA2.8.1/8.2/8.3 (Community-Backend: Account-Loeschung, Admin-Step-Validierung, Rate-Limits) - alle Backend/CSC, Andre-Entscheidung + Backend-Arbeit noetig. QA-1-Backlog 2/3/7 gehoeren hierzu.
- Juristisch: Datenschutzerklaerung-Status (nicht Engineering).
- Manuelle Abnahmen: Geraete-Abnahme Run-Engine, VoiceOver-Pass am iPhone (kein Code).

## Pakete (chronologisch, wird fortgeschrieben)

### Paket 1 - v9.17.0 (Engine/Safety-Robustheit), Tests v917qa2engine.mjs (18)
Alle Funde vor dem Fix im Code verifiziert.
- QA2.3.1 (Medium) FIXED: UI-Stop (#btnRunStop) -> neue `stopRunFull`, setzt _shutdownOnStop; runProgram-finally schaltet Heizer+Pumpe ab. Voice-`stopRun` (abortProgram) bleibt soft. aria-label angepasst.
- QA2.3.2 (Medium) FIXED: `resolveVarsInSteps` ersetzt Platzhalter typsicher pro Feld (deep walk) statt String-Replace ins JSON. Kein JSON.parse-Bruch mehr bei Sonderzeichen.
- QA2.3.3 (Medium) FIXED: gattserverdisconnected setzt bei laufendem Programm stopFlag; `_engineWait` bricht bei State.connectionLost ab.
- QA2.3.4 (Low) FIXED: `expandLoops` mit harter Obergrenze EXPAND_LOOP_CAP=2000 + Toast.
- QA2.3.6 (Low) FIXED: `_sanitizeImportedSteps` validiert Datei-Import-Schritte; `cmdSetTemp` ignoriert NaN.
- QA2.3.7 (Low) FIXED: Schritt-Editor-Hinweis auf Laufzeit-Clamp aufs Geraete-Limit.
- QA2.17.3 (Medium) FIXED: `statsHeatStop()` im Disconnect-Handler und in `disconnectBLE` -> kein Ueberzaehlen von totalHeatSec.

### Paket 2 - v9.18.0 (BLE-Lifecycle-Robustheit), Tests v918qa2ble.mjs (15) + BLE-Bestandssuiten
- QA2.14.1 + QA2.2.8 (Medium/Low) FIXED: `adapter.disconnect()` in disconnectBLE UND gattserverdisconnected -> Poll-Intervalle/Notifications sauber abgebaut.
- QA2.14.2 + QA2.2.7 (Medium) FIXED: benannte Notify-Listener (this._onNotify) bei Crafty/Venty/PAX, removeEventListener in disconnect(). Puffco ist Poll-only (kein Listener).
- QA2.14.3 (Low) FIXED: Crafty-Poll mit if(!this._poll)-Guard (beide Pfade).
- QA2.2.5 (Medium) FIXED: eingehende Zieltemp gegen Adapter-tempRange (Venty parseStatus, PAX _applyParsed) statt fixe Weitbereiche.
- QA2.2.11 (Low) FIXED: Crafty-Poll zaehlt aufeinanderfolgende Lesefehler, Warnung nach 5.

### Paket 3 - v9.19.0 (A11Y-Detailfixes), Tests v919qa2a11y.mjs (9)
- QA2.5.2 (Medium) FIXED: aria-busy + srAnnounce-Spiegelung auf 4 async-Listen (commProgList, commStrainList, commModList, tplList).
- QA2.5.3 (Low) FIXED: data-tip -> aria-describedby via sr-only-Spans in _a11yAutoLabel.
- QA2.5.4 (Low) FIXED: modalDlg aria-describedby=dlgMsg.
- QA2.5.5 (Low) FIXED: _pioneerAnnounce setzt erste Ansage einer frischen Region verzoegert (setTimeout 50).
- QA2.5.6 (Low) FIXED: Fokus-Rueckkehr mit document.contains-Guard + Fallback auf oberstes offenes Modal.

### Paket 4 - v9.20.0 (Reconnect/Queue/Custom-BLE), Tests v920qa2reconnect.mjs (11)
- QA2.2.3 (Medium) FIXED: Oszillations-Schutz, reconnectAttempts wird erst nach 10s stabiler Verbindung genullt (setConn _stableTimer); Sofort-Resets aus Handler + tryReconnect-Success entfernt.
- QA2.2.9 (Low) FIXED: _bleWithTimeout (5s) in allen _enqueue (Basis + Venty/PAX/Puffco); haengende Op blockiert die Queue nicht mehr.
- QA2.2.2 (High) FIXED: Custom-Profil-UUIDs in optionalServices; detectDevice ordnet Custom-Service dem Volcano-Adapter (Auto-Mapping) zu; ehrlicher Hinweis (nur S&B-kompatible Chars).
- QA2.2.4 (Medium) DEFERRED-RULE: Puffco-Auth beim Reconnect, BETA-Adapter ohne Hardware, Auth-Flow-Aenderung ohne Verifikation zu riskant (kein Raten). Empfehlung im Audit dokumentiert.
- QA2.2.6 (Medium) DEFERRED-RULE: PAX-Serial-Plausibilitaet, BETA ohne Hardware; QA2.2.5 verhindert bereits Muell-Anzeige; proaktive Heuristik braucht Hardware-Tuning.
- QA2.2.10 (Low) WONTFIX: deklarierte vs. genutzte Capabilities, kosmetisch; currentCapabilities mappt ohnehin nur die 7 UI-relevanten Felder, ueberzaehlige Deklarationen erreichen die UI nicht.

### Paket 5 - v9.21.0 (Storage/Daten-Robustheit), Tests v921qa2storage.mjs (11)
- QA2.6.1 (Medium) FIXED: exportAllData strippt pinHash/pinSalt/pinKdf (PIN nicht mehr offline brute-forcebar aus Backup).
- QA2.6.6 (Low) FIXED: importAllData entfernt pinHash/pinSalt/pinKdf aus der Datei (kein Fremd-PIN).
- QA2.6.4 (Low) FIXED: encryptSensitive Roundtrip-Verify vor removeItem (kein Datenverlust bei korruptem Blob).
- QA2.6.8 + QA2.27.4 (Low/Medium) FIXED: LS.get/set loggen Parse-/Quota-Fehler.
- QA2.6.5 (Low) FIXED: window storage-Listener warnt einmalig bei Multi-Tab-Aenderung.
- QA2.14.4 (Low) FIXED: #log auf 200 Zeilen begrenzt.
- QA2.14.5 (Low) FIXED: requirePin Re-Entry-Guard (gemeinsames _pinInFlight-Promise).
- QA2.6.7 (Low) OPEN: Recovery setzt PIN nicht zurueck -> Folgepaket (UX). QA2.6.9/6.10 (Info): Forget-Me sessionStorage/IndexedDB (faktisch ungenutzt) + webhookEvents-Sync -> Info, ggf. Folgepaket.

### Paket 6 - v9.22.0 (Voice-Doku + UX-Konsistenz), Tests v922qa2voice.mjs (14)
- QA2.4.1/4.2/4.4 (Medium/Low) FIXED: VOICE-BEFEHLE.md (Bluefy/iOS-Behauptung, Wake-Word-Wortlaut, „warte" entfernt).
- QA2.4.3 (Low) FIXED: VOICE_HELP nennt Boost/Verbindung trennen/sorten mit.
- QA2.4.6 (Low) FIXED: blosses „sessions" aus WAKE_WORDS entfernt.
- QA2.4.7 (Low) FIXED: gemeinsame findProgramByName fuer Voice + URL.
- QA2.10.2 (Medium, Teil) FIXED: Toast-Dauer an Textlaenge gekoppelt. OFFEN (DEFERRED): breite Umstellung aller Fehler-Toasts auf showFriendlyError (gross/subjektiv).
- QA2.10.1 (Medium) DEFERRED: voller Em-Dash/Benennungs-Sweep = QA-1-Backlog 13, grosser redaktioneller Durchlauf ueber 184 Em-Dashes (viele legitime en-dash/Box-Drawing nicht anfassen); separat planen.

### Paket 7 - v9.23.0 (PWA-Konfiguration), Tests v923qa2pwa.mjs (8)
- QA2.9.2 (Medium) FIXED: datenschutz.html + info.html in SW-SHELL (offline).
- QA2.9.1 (Low) FIXED: theme-color HTML -> #0c0a08 (== Manifest).
- QA2.9.7 (Info) FIXED: manifest.json id ergaenzt. (Icon any/maskable-Split: braucht dediziertes padded-Icon-Asset -> offen.)
- QA2.9.8 (Info) FIXED: Meta-Description nennt alle 7 Geraete.
- QA2.16.1 (Low) FIXED: --safe-top/--safe-bot env-Fallback 0px (mit Einheit).
- QA2.16.3 (Low) DEFERRED: Hover-Guard, ~30 :hover-Regeln, systemischer CSS-Pass, rein kosmetisch, fuer VoiceOver-Kohorte irrelevant.
- QA2.16.2 (Low) DEFERRED: Safe-Area links/rechts, App portrait-locked (Landscape-Notch Edge-Case).
- QA2.9.3 (Low) DEFERRED: beforeinstallprompt feuert auf iOS/Bluefy (die Kohorte) gar nicht. QA2.9.4/9.5/9.6 (Info) dokumentiert.

### Paket 8 - v9.24.0 (Statistik-Korrektheit), Tests v924qa2stats.mjs (9)
- QA2.17.4 (Medium) FIXED: noteSessionDay nutzt lokalen dayKey (konsistent mit v8.2-Streak), vorher UTC.
- QA2.17.5 (Low) FIXED: getHeatCurveStats VOR rememberHeatCurve (aktueller Lauf nicht im eigenen Mittelwert).
- QA2.17.9 (Info) FIXED: Heatmap iteriert per setDate (DST-sicher) statt fixem DAY_MS.
- QA2.17.8 (Info) FIXED: Konsum-Report nutzt fmtHeat (h+min) statt Math.round(/3600).
- QA2.17.6 (Low) DEFERRED: Combo-Wortlaut „hintereinander" Nuance, Combo resettet korrekt bei Fehlschlag (per v90pioneer-game bestaetigt); volle Test-Adjazenz geringer Wert.
- QA2.17.7 (Low) DEFERRED: Bag-Zaehler nur geführter Flow, vertretbare Design-Entscheidung; DEVSTATS labelt bereits „geschaetzt".

### Paket 9 - v9.25.0 (Cleanup), Tests v925qa2cleanup.mjs (7)
- QA2.3.5 (Low) FIXED: executeSchedule überspringt 'heat' bei laufendem Programm (State.running-Guard + Hinweis).
- QA2.19.1 (Medium) FIXED: Fail ohne Bug-Report sagt „als Fehler markiert" statt „Bug gemeldet".
- QA2.6.7 (Low) FIXED: uiAlert nach Recovery, neuen PIN setzen.
- QA2.4.5 (Low) FIXED: B10-Testbeschreibung (FAB bleibt antippbar im SR-Modus).
- QA2.27.6 (Low) FALSE POSITIVE: gatt.disconnect() ist synchron (void), kein await noetig.
- QA2.27.11 (Low) WONTFIX: _pioneerShowPathChoice ist im Code als bewusster Fallback dokumentiert.
- QA2.27.7/8/9 (Medium/Low) DEFERRED: bewusst stille best-effort-catches (Vibration/Wake-Lock/Audio sind Progressive-Enhancement, Logging wuerde bei fehlender Hardware spammen).
- QA2.18.5 (Medium) DEFERRED: Tour-Hintergrund-Inert; Tour hat seit v9.15.0 role=dialog/aria-modal + Fokus-Rueckgabe; voller Inert braucht Integration mit _a11yRecomputeInert (.modal-basiert), geringer Zusatznutzen fuer Spotlight-Tour. QA2.18.7/18.8 (Low) ebenfalls offen.

## Verbleibende offene Punkte (Test-Debt + bewusste Vertagungen)
- **Test-Coverage-Luecken (QA2.1.x):** GESCHLOSSEN. Viele durch die Kampagnen-Suiten (Safety-Timer v915/v917, expandLoops v917, Import-Validierung v917, encrypt-Roundtrip v921, LS.set v921). Die verbliebenen (computeNextRun 'at'+Wochentage 2.1.4, escapeHtml 2.1.9, migrateFromV3-Smoke 2.1.10) deckt das reine Coverage-Paket `v926qa2coverage.mjs` (12) ab, alle gruen -> die Funktionen sind nachweislich korrekt (kein App-Code geaendert, daher kein Versionsbump/Deploy).
- **Standregel-DEFERRED (unveraendert):** cscCrypto/Backend (2.7.2, 2.7.3, 2.8.x, QA-1-Backlog 2/3/7), Beta-Adapter ohne Hardware (2.2.4, 2.2.6), manuelle Geraete-/VoiceOver-Abnahmen, Datenschutzerklaerung (juristisch).
- **Gross/redaktionell:** Em-Dash-Sweep (2.10.1 = QA-1-Backlog 13) ERLEDIGT in Paket 10 (v9.26.0). Weiter offen: breite Toast->showFriendlyError-Umstellung (Teil 2.10.2), Hover-Guard (2.16.3), Bundle-Split (QA-1-Backlog 8).

### Paket 10 - v9.26.0 (Em-Dash-Sweep), Tests v926emdash.mjs (7)
- QA2.10.1 (Medium) FIXED: 185 Prosa-Em-Dashes („ — ") in index.html -> Komma, plus info.html (1) + VOICE-BEFEHLE.md (6). En-Dashes (51 Ranges) + Box-Drawing unberuehrt. 12 dekorative Dropdown-Platzhalter-Em-Dashes bleiben. NICHT angefasst: datenschutz.html (anwaltlich freigegeben) + README-Versions-Ueberschriften (Changelog-Konvention).
- **Info/kosmetisch:** diverse 2.x.Info (Capabilities-Deklaration 2.2.10, manifest icon-split braucht Asset, etc.).

