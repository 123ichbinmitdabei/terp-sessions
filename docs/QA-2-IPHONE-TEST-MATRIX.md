# QA-2 iPhone-Test-Matrix (Terp Sessions v9.14.0)

**Fuer:** Andre Reiche
**Geraet:** iPhone, oft Bluefy-Browser (Web-Bluetooth-faehig), Safari als Vergleich, VoiceOver
**Stand:** 2026-06-07, vor der Pioneer-Test-Woche
**Quelle:** Code-belegte Flows aus `index.html` (v9.14.0). Zeilen-Verweise hinter Schritten dienen der Nachpruefbarkeit.

> Hinweis: Diese Matrix wurde im Read-Only-Audit erstellt. Es wurde nichts am Code veraendert. Sicherheits-relevante Voice-Befehle (Heizen) bitte mit echtem Geraet nur in sicherer Umgebung testen.

---

## Legende

**Prioritaet**
- **P1** = Muss vor der Test-Woche gruen sein. Bricht Kernnutzen oder Sicherheit, wenn defekt.
- **P2** = Wichtig, sollte getestet sein. Funktional relevant, aber nicht blockierend.
- **P3** = Nice-to-have, Randfaelle und Komfort.

**Browser-Spalte**
- **B** = Bluefy (Web-Bluetooth, primaer fuer echtes Geraet)
- **S** = Safari (kein Web-Bluetooth, aber UI/Voice/Daten testbar)
- Wenn beides relevant: **B+S**

**Status-Spalte** zum Abhaken: `[ ]` offen, `[x]` ok, `[!]` Bug (dann Bug-Report-Flow nutzen).

---

## Top-20 (muss vor Test-Woche getestet sein)

| # | Subsystem | Flow | Prio | Browser | VoiceOver-relevant | Status |
|---|-----------|------|------|---------|--------------------|--------|
| 1 | Verbinden | Geraet koppeln (Bluefy-Dialog) | P1 | B | ja | [ ] |
| 2 | Verbinden | Trennen + Wiederverbinden (known device) | P1 | B | ja | [ ] |
| 3 | Adapter | Richtiger Adapter erkannt, Capabilities-UI korrekt | P1 | B | nein | [ ] |
| 4 | Steuerung | Heizer an/aus, Pumpe an/aus | P1 | B | ja | [ ] |
| 5 | PIN | PIN setzen, App-Sperre, korrektes Entsperren | P1 | B+S | ja | [ ] |
| 6 | PIN-Recovery | PIN vergessen, mit 4 BIP39-Woertern entsperren | P1 | B+S | ja | [ ] |
| 7 | Programm | Programm starten und vollstaendig laufen lassen | P1 | B | ja | [ ] |
| 8 | Programm | Pause und Fortsetzen | P1 | B | ja | [ ] |
| 9 | Programm | Schritt ueberspringen + Stop | P1 | B | ja | [ ] |
| 10 | Voice | Mikrofon-FAB, Befehl "Heize auf 185 Grad" | P1 | B | ja | [ ] |
| 11 | Voice | Text-Befehl-Eingabe als Fallback | P1 | B+S | ja | [ ] |
| 12 | Voice | Screen-Reader-Master-Toggle sperrt App-TTS + Wake-Word | P1 | S | ja | [ ] |
| 13 | Sorten | Sorten-DB oeffnen, suchen, Detail ansehen | P1 | B+S | ja | [ ] |
| 14 | Schedule | Schedule anlegen, Sicherheits-Hinweis sichtbar | P2 | B+S | ja | [ ] |
| 15 | Hotel-Mode | Aktivieren, 5-Sekunden-Entsperren | P1 | B+S | ja | [ ] |
| 16 | Bug-Report | "Funktioniert nicht" melden, Clipboard-Fallback | P1 | B+S | ja | [ ] |
| 17 | Onboarding | Welcome-Flow + Tour, Ueberspringen | P2 | B+S | ja | [ ] |
| 18 | Settings | Theme/Toggles persistieren ueber Reload | P2 | B+S | ja | [ ] |
| 19 | A11Y | Modal-Fokus-Trap, Hintergrund inert unter VoiceOver | P1 | S | ja | [ ] |
| 20 | Wartung | JSON-Backup exportieren + Forget-Me | P1 | B+S | ja | [ ] |

---

## 1. Verbinden / Adapter

### Flow 1.1 Geraet koppeln (P1, Bluefy)
**Schritte**
1. App in Bluefy oeffnen, Tab "Steuerung".
2. Button **"Verbinden"** tippen (oben `#btnConnect`, Zeile 2362, oder gross `#btnConnect2`, Zeile 2764).
3. Im Browser-Dialog das eigene Geraet waehlen (typisch "VOLCANO …", "Crafty"), dann verbinden.

**Erwartung**
- Bluefy zeigt den Geraete-Auswahldialog (`navigator.bluetooth.requestDevice`, Zeile 7007).
- Nach Verbindung: Log-Eintrag "Adapter: …" (Zeile 7061), Trennen-Button `#btnDisconnect` wird aktiv (Zeile 2765), Status-Indikatoren Heizer/Pumpe sichtbar.

**VoiceOver-Schritte**
1. Mit Wischen zum Element "Mit Vaporizer verbinden" (aria-label, Zeile 2362) navigieren, Doppeltipp.
2. Der native Bluetooth-Dialog ist VoiceOver-zugaenglich, Geraet auswaehlen, Doppeltipp auf Verbinden.
3. Nach Erfolg sollte ein Status-/Live-Region-Hinweis vorgelesen werden.

**Bei Fehlschlag vermuten**
- Kein Dialog: Bluefy hat keine BT-Berechtigung, oder Safari statt Bluefy (Safari hat kein Web-Bluetooth). Friendly-Error-Mapper greift (Zeile 6616 ff.).
- Dialog leer: Geraet nicht im Pairing-Modus oder ausserhalb Reichweite.

### Flow 1.2 Trennen und Wiederverbinden (P1, Bluefy)
**Schritte**
1. Bei verbundenem Geraet **"Trennen"** (`#btnDisconnect`) tippen.
2. Erneut **"Verbinden"** tippen, ggf. auf "bekannte Geraete" pruefen (`navigator.bluetooth.getDevices`, Zeile 18043).

**Erwartung** Saubere Trennung, Wiederverbindung idealerweise ohne erneute Geraete-Auswahl.

**VoiceOver-Schritte** Zum "Trennen"-Button wischen, Doppeltipp, Status-Aenderung wird angesagt.

**Bei Fehlschlag vermuten** `getDevices` in Bluefy ggf. nicht unterstuetzt, dann faellt App auf erneuten Auswahldialog zurueck. Das ist erwartbar, kein Bug.

### Flow 1.3 Adapter-Erkennung und Capabilities (P1, Bluefy)
**Schritte**
1. Verbinden (Flow 1.1).
2. Pruefen, ob nur die fuer das Geraet gueltigen Bedienelemente sichtbar sind (z.B. Pumpe nur bei Volcano).

**Erwartung**
- `detectDevice` waehlt korrekte Adapter-Klasse (Zeile 7032), bei Venty/Veazy korrekte Unterscheidung (Zeile 7048).
- `applyCapabilitiesUI` blendet Pumpe-Buttons je nach `caps.pump` ein/aus (Zeilen 14005-14006).
- Probe-Only-Geraete (Firefly) sperren Steuerung (Zeile 14041).

**VoiceOver-Schritte** Nach Verbinden durch die Steuerung-Buttons wischen, pruefen dass keine "toten" deaktivierten Steuerelemente vorgelesen werden, die das Geraet nicht kann.

**Bei Fehlschlag vermuten** Falscher Adapter erkannt: Pumpe-Button erscheint bei Geraet ohne Pumpe, oder Steuerung trotz Probe-Only aktiv.

---

## 2. Steuerung (Heizer / Pumpe)

### Flow 2.1 Heizer und Pumpe schalten (P1, Bluefy)
**Schritte**
1. Verbunden sein.
2. **"Heizer aus"** tippen (`#btnHeat`, Zeile 2507). Label wechselt zu "Heizer aus"/"Heizer an" je nach Zustand (Zeile 6744).
3. **"Pumpe aus"** tippen (`#btnPump`, Zeile 2508).
4. Pumpdauer ueber `#pInput` setzen und **"Start"** (`#btnPumpFor`, Zeile 2524).

**Erwartung**
- Indikatoren `#indHeat`/`#indPump` aktualisieren aria-label "Heizer: aus/an" (Zeilen 2406-2407, 6746).
- `aria-pressed` auf den Buttons spiegelt Zustand (Zeilen 6746-6748).

**VoiceOver-Schritte**
1. Zu "Heizer ein- oder ausschalten" wischen, Doppeltipp.
2. VoiceOver soll den neuen Zustand ueber aria-pressed bzw. Indikator-Statusregion ansagen.

**Bei Fehlschlag vermuten** BLE-Schreibfehler, Log-Eintrag mit 'err' (Zeile 9590). Sicherheits-Timer pruefen (Tooltip Zeile 2507).

---

## 3. PIN + Recovery

### Flow 3.1 PIN einrichten und Sperre (P1, B+S)
**Schritte**
1. Setup-Tab oeffnen, PIN-Bereich, PIN setzen (`setupPin`, Zeile 15830).
2. App neu laden oder sperren, PIN-Prompt sollte erscheinen (`requirePin`, Zeile 15858).
3. Korrekte PIN eingeben.

**Erwartung**
- PIN wird mit PBKDF2 gehasht (SEC-1, salt-erhaltend, Zeile 15825), nie im Klartext.
- Korrekte Eingabe entsperrt; falsche bleibt gesperrt.

**VoiceOver-Schritte** PIN-Eingabefeld muss als sicheres/numerisches Feld erreichbar sein. Mit Tastatur ueber VoiceOver eingeben, Submit per Doppeltipp.

**Bei Fehlschlag vermuten** Migration alter PIN-Hash: Salt darf NICHT geaendert werden, weil er zugleich Backup-Verschluesselungs-Salt ist (Kommentar Zeile 15801-15803). Falls Backup-Restore danach scheitert, ist die Migration betroffen.

### Flow 3.2 PIN entfernen (P2, B+S)
**Schritte** Im PIN-Bereich erneut tippen, Bestaetigung "PIN entfernen?" (`uiConfirm`, Zeile 10018), `removePin` (Zeile 15848).

**Erwartung** PIN weg UND Recovery wird mit entfernt (`_recoveryClear`, Zeile 15854, Decision REC1.7).

**VoiceOver-Schritte** Bestaetigungs-Dialog `#modalDlg` muss fokussiert und vorlesbar sein, "Ja/Abbrechen" erreichbar.

**Bei Fehlschlag vermuten** Recovery bleibt aktiv nach PIN-Entfernung = Inkonsistenz.

### Flow 3.3 PIN-Recovery (P1, B+S) — wichtigster Sicherheits-Flow
**Schritte**
1. PIN gesetzt und Recovery-Code aktiviert (`#pinRecConfirm`, Zeile 15778).
2. Im PIN-Prompt auf "PIN vergessen" tippen (sichtbar nur wenn Recovery aktiv, `forgot.hidden = !_recoveryActive()`, Zeile 15891).
3. Die 4 BIP39-Woerter eingeben (`_recoveryVerify`, Zeile 15898).

**Erwartung**
- Bei korrekten Woertern: entsperrt, Fail-Counter zurueckgesetzt (Zeile 15900).
- Bei falschen: "Falscher Code. Versuche uebrig: N" (Zeile 15911), nach zu vielen Fails Lock (`recLockUI`, Zeile 15910).

**VoiceOver-Schritte**
1. "PIN vergessen" muss als Button erreichbar und sichtbar sein.
2. Eingabefeld fuer Woerter vorlesbar, Restversuche-Meldung als Live-Region ansagen.

**Bei Fehlschlag vermuten**
- "PIN vergessen" fehlt = Recovery wurde nie aktiviert (`_recoveryActive` false).
- Sofort-Lock = Lock-Timer aus vorherigem Test noch aktiv (`_recoveryLockRemainingMs`, Zeile 15886). Vor echtem Test ggf. App-Daten zuruecksetzen.

---

## 4. Programm-Lauf + Pause/Skip

### Flow 4.1 Programm vollstaendig laufen (P1, Bluefy)
**Schritte**
1. Steuerung-Tab, ein Programm waehlen und starten.
2. Lauf bis Ende beobachten.

**Erwartung** Run-Engine arbeitet `expandedSteps` flach ab (v9.8.0), Countdown laeuft, Schritt-Labels korrekt (z.B. "Pause Xs", Zeile 7779).

**VoiceOver-Schritte** Run-Card `runPausedBadge`/Status (role=status, Zeile 2861) soll Schrittwechsel ansagen.

**Bei Fehlschlag vermuten** BLE-Disconnect mitten im Lauf, oder Schritt haengt (`_engineWait`).

### Flow 4.2 Pause und Fortsetzen (P1, Bluefy)
**Schritte**
1. Waehrend Lauf **"Pause"** tippen (`#btnRunPause`, Zeile 2857).
2. Erneut tippen zum Fortsetzen.

**Erwartung**
- Badge "Pausiert" sichtbar (`#runPausedBadge`, aria-live=assertive, Zeile 2861).
- Countdown friert ein (Zeile 9089), Geraet bleibt wie es ist (Decision Zeile 9112).
- Achtung: 30-Minuten-Pause-Timeout beendet Programm automatisch mit Ansage (Zeile 9163-9171). Nicht als Bug werten, wenn 30 Min vergangen sind.

**VoiceOver-Schritte** "Programm pausieren" (aria-label, Zeile 2857) erreichbar, das assertive Badge wird sofort vorgelesen.

**Bei Fehlschlag vermuten** Countdown laeuft trotz Pause weiter, oder Geraet schaltet bei Pause ab.

### Flow 4.3 Schritt ueberspringen, Zurueck, Stop (P1, Bluefy)
**Schritte**
1. Waehrend Lauf **"Schritt"** (`#btnRunSkip`, Zeile 2859) = naechster Schritt.
2. **"Zurueck"** (`#btnRunPrev`, Zeile 2858) = vorheriger Schritt (nur Zeiger, Decision Zeile 9112).
3. **"Stop"** (`#btnRunStop`, Zeile 2853, `stopRun` Zeile 9375).

**Erwartung** Skip bei `pump_for` schaltet Pumpe sofort aus (Decision Zeile 9112). Stop ist responsiv (kein Haengen bis Schrittende).

**VoiceOver-Schritte** Buttons haben klare aria-labels "Naechster Schritt"/"Vorheriger Schritt"/"Programm stoppen". Durchtabben und Doppeltipp.

**Bei Fehlschlag vermuten** Stop reagiert verzoegert = Engine-Checkpoint-Poll greift nicht. Skip laesst Pumpe an = `_enginePumpFor`-Variante betroffen.

---

## 5. Voice-Befehle

### Flow 5.1 Mikrofon-FAB und Sprachbefehl (P1, Bluefy)
**Schritte**
1. Voice in Settings aktiv (`#togVoice`, Zeile 3934, default an).
2. Mikrofon-FAB unten tippen (`#voiceFab` 🎤, Zeile 2976; aria-label "Sprachsteuerung aktivieren").
3. Sagen: "Heize auf 185 Grad".

**Erwartung** FAB bekommt Klasse `listening` (Zeile 13009), Befehl wird geparst (`parseVoiceCommand`) und ausgefuehrt, Geraet heizt.

**VoiceOver-Schritte** Achtung Konflikt: VoiceOver belegt das Mikrofon teils selbst. Realistisch testet Andre Voice eher OHNE aktiven VoiceOver, oder per Text-Befehl (Flow 5.2). FAB-Label "Sprachsteuerung starten" (Zeile 17371) sollte vorgelesen werden.

**Bei Fehlschlag vermuten** Bluefy/Safari-iOS unterstuetzen Web-Speech-Recognition teils nicht. Dann erscheint Hinweis "Dein Browser unterstuetzt keine Spracherkennung" (Zeile 3933) und der Text-Fallback greift.

### Flow 5.2 Text-Befehl-Fallback (P1, B+S)
**Schritte**
1. Voice-Hilfe/Text-Eingabe oeffnen.
2. In `#txtCmdInput` (Zeile 3367) z.B. "oeffne Sorten" eingeben, Enter.

**Erwartung** Funktioniert wie Sprache, nur via Tastatur (Hinweis Zeile 3366). Eingabe wird nach Ausfuehrung geleert (Zeile 20768).

**VoiceOver-Schritte** Textfeld erreichbar, Platzhalter vorgelesen, Enter loest Befehl aus (keydown-Handler Zeile 20820).

**Bei Fehlschlag vermuten** Wichtigster A11Y-Pfad fuer VoiceOver-Nutzer. Wenn das bricht, haben Screen-Reader-Nutzer keine Sprach-Alternative.

### Flow 5.3 Screen-Reader-Master-Toggle (P1, Safari mit VoiceOver)
**Schritte**
1. Settings, Toggle "Ich nutze einen Screen-Reader" aktivieren (Bereich Zeile 3927, `PREFS.screenReaderMode`, Zeile 5524).
2. App bedienen, auf doppelte Sprachausgabe achten.

**Erwartung** App-eigenes TTS macht nichts mehr, Wake-Word gesperrt (Zeile 5524-5526), damit es sich nicht mit VoiceOver ueberlagert.

**VoiceOver-Schritte** Toggle als role=switch erreichbar, aria-checked korrekt. Nach Aktivierung darf keine App-Stimme mehr parallel zu VoiceOver sprechen.

**Bei Fehlschlag vermuten** Doppel-Sprache = Master-Toggle blockt nicht alle `ttsEvent`-Pfade.

### Flow 5.4 Voice-Befehle-Liste (P3, B+S)
**Schritte** "Voice-Befehle anzeigen" (`#btnVoiceHelp`, Zeile 3986) oeffnet `#modalVoiceHelp` (Zeile 3352).
**Erwartung** Liste sichtbar, Schliessen-Button funktioniert.
**VoiceOver-Schritte** Modal role=dialog, Fokus faellt hinein, Liste vorlesbar.

---

## 6. Sorten-DB

### Flow 6.1 Sorten oeffnen und durchsuchen (P1, B+S)
**Schritte**
1. Quick-Action "Aroma & Sorten" tippen (`#qaAroma`, aria-label Zeile 2460-2462).
2. Tabs Werk / Meine / Community pruefen (Zeile 2033, 3227).
3. Sorte suchen, Detail oeffnen.

**Erwartung** Werks-Sorten (127) sichtbar, Suche filtert, Detail zeigt Aroma/Temperatur.

**VoiceOver-Schritte** Tabs als role=tab erreichbar, Liste durchwischbar, Detail-Modal fokussiert.

**Bei Fehlschlag vermuten** Community-Tab leer ist OK wenn Community inaktiv/nicht eingeloggt. Werk-Tab leer = echter Bug.

### Flow 6.2 Eigene Sorte anlegen (P2, B+S)
**Schritte** Tab "Meine", neue Sorte ueber Create/Edit-Formular (`#modalCommStrainForm`-Bereich, Zeile 3110 ff.) anlegen, speichern.
**Erwartung** Sorte in "Meine" persistiert (LocalStorage).
**VoiceOver-Schritte** Formularfelder beschriftet, Speichern-Button erreichbar.

---

## 7. Schedule (Zeitplan)

### Flow 7.1 Schedule anlegen (P2, B+S)
**Schritte**
1. Schedule-Bereich, **"+ Neuer Schedule"** (`#btnAddSchedule`, Zeile 4566, `openScheduleEditor(null)` Zeile 10304).
2. Zeit/Programm waehlen, speichern.

**Erwartung**
- Sicherheits-Hinweis (`.schedule-safety`, Zeile 2174) sichtbar, dass unbeaufsichtigtes Heizen riskant ist.
- Eintrag erscheint, "next-up" markiert den naechsten (Zeile 2193).

**VoiceOver-Schritte** Sicherheits-Hinweis als Text vorlesbar (wichtig fuer Risiko-Bewusstsein), Toggle pro Eintrag (role=switch) erreichbar.

**Bei Fehlschlag vermuten** iOS-Hintergrund-Limits: Schedule kann bei geschlossener App/Bluefy nicht zuverlaessig feuern. Ehrlich gegenueber Pioneers kommunizieren.

---

## 8. Hotel-Mode

### Flow 8.1 Aktivieren und Entsperren (P1, B+S)
**Schritte**
1. Settings, Reise-Modi, Toggle "Hotel-Modus" (`#togHotelMode`, Zeile 3821).
2. Wetter-Overlay erscheint (`#hotelOverlay`, Zeile 2287).
3. 5 Sekunden auf die Flaeche druecken (`#hotelExitArea`, aria-label "5 Sekunden druecken zum Entsperren", Zeile 2288).

**Erwartung** App versteckt sich hinter Wetter-Splash, langer Druck entsperrt, Toast "Hotel-Modus aus" (Zeile 17493).

**VoiceOver-Schritte** Overlay ist role=dialog aria-modal (Zeile 2287). Entsperr-Flaeche hat aria-label mit der 5-Sekunden-Anweisung. Pruefen, dass VoiceOver nicht den Hintergrund durchliest (inert-System v9.7.0).

**Bei Fehlschlag vermuten** Entsperren reagiert nicht: Long-Press-Handler oder Touch-Target. Hintergrund vorlesbar trotz Overlay = aria-modal/inert-Fehler.

---

## 9. Bug-Report (BUG-B)

### Flow 9.1 Fehler melden (P1, B+S)
**Schritte**
1. Im Pioneer-Test-Modus eine Aufgabe als **"✗ Funktioniert nicht"** markieren (`#btnPioneerFail`, Zeile 21151).
2. Bug-Modal "🐛 Bug melden" (`#pbrTitle`, Zeile 3272, `_pioneerBugReportOpen` Zeile 21394) ausfuellen: Erwartet/Tatsaechlich/Schritte.
3. Absenden (`_pioneerBugReportSubmit`, Zeile 21452).

**Erwartung**
- Report enthaelt Tester-Kennung + Log/State-Block (`_bugDiagBlock`).
- `_pioneerBugReportBuildUrl` liefert {url,title,body} (Zeile 21418). Da `window.open` in Bluefy unzuverlaessig ist, sollte ein Clipboard-Fallback greifen (BUG-B).

**VoiceOver-Schritte** Modal fokussiert, Felder beschriftet, Absenden-Button erreichbar, Erfolgs-Toast vorgelesen.

**Bei Fehlschlag vermuten** In Bluefy oeffnet `window.open` keinen Mail-Entwurf, dann muss Clipboard-Fallback aktiv werden und das dem Nutzer ansagen. Wenn weder noch, ist der wichtigste Test-Woche-Kanal kaputt.

---

## 10. Onboarding-Tour

### Flow 10.1 Welcome-Flow und Tour (P2, B+S)
**Schritte**
1. Frisch (oder "👋 Onboarding nochmal zeigen" `#btnReplayWelcome`, Zeile 4068, `resetWelcomeFlow` Zeile 11850).
2. Welcome-Slides durchgehen, dann interaktive Tour.
3. Tour mit **"Ueberspringen"** (`data-tour="skip"`, Zeile 18258) oder "Weiter" durchklicken.

**Erwartung** Welcome-Flow zuerst (v8.4.0, separat von Tour), dann Tour ohne Haengen (scrollIntoView-Guard aus v4.9.7). Compatibility-Welcome legt sich nicht ueber andere Modale (Zeile 6964).

**VoiceOver-Schritte** Jeder Tour-Schritt fokussiert das Ziel-Element, "Weiter"/"Zurueck"/"Ueberspringen" vorlesbar.

**Bei Fehlschlag vermuten** Tour haengt = Ziel-Element nicht im DOM/nicht scrollbar. Welcome ueber anderem Modal = Re-Try-Timer (Zeile 6964) greift nicht.

---

## 11. Settings

### Flow 11.1 Persistenz ueber Reload (P2, B+S)
**Schritte**
1. Mehrere Toggles aendern (Theme, Voice `#togVoice`, Voice-TTS `#togVoiceTts` Zeile 3951, Wake-Word `#togWakeWord` Zeile 4011).
2. App neu laden.

**Erwartung** Alle Werte aus `vol_prefs` wiederhergestellt, aria-checked korrekt gesetzt.

**VoiceOver-Schritte** Alle Toggles role=switch mit aria-label und aria-checked. Nach Reload Zustand korrekt angesagt.

**Bei Fehlschlag vermuten** Toggle springt zurueck = PREFS-Speichern bricht. Wake-Word ist bewusst Chrome-only/Cloud (Zeile 4010), auf iPhone ggf. nicht funktional, das ist ehrlich gelabelt und kein Bug.

---

## 12. Community (falls aktiv)

> Hinweis: Community ist standardmaessig nur via Toggle nutzbar, `cscCrypto` ist dormant (Feature-Flag aus). Diese Flows nur testen, wenn Andre die Community im Backend aktiviert hat.

### Flow 12.1 Registrieren und Anmelden (P3, B+S)
**Schritte**
1. Community-Bereich, Pseudonym waehlen (`#commRegPseudonym`, 3-24 Zeichen, Zeile 3005-3007), Registrieren (`#btnCommunityRegisterSubmit`, Zeile 3036).
2. Spaeter Anmelden (`#commLoginPseudonym` + Submit, Zeile 3050/3059).

**Erwartung** Nur Pseudonym + PIN gespeichert, keine personenbezogenen Daten (Hinweis Zeile 2995). Memory-only Session.

**VoiceOver-Schritte** Pseudonym-Feld autocapitalize=none, beschriftet. Submit erst aktiv wenn gueltig (disabled-Zustand Zeile 3036).

**Bei Fehlschlag vermuten** Backend/Anon-Key fehlt oder Pseudonym belegt. "Mit Pseudonym beitragen"-Toggle (Zeile 3152) steuert Anonymitaet pro Beitrag.

---

## 13. Touch-Macros

### Flow 13.1 Macro anlegen und ausloesen (P2, B+S)
**Schritte**
1. Settings, Touch-Befehl-Macros, Editor oeffnen (`#modalTouchMacro` "⚡ Touch-Macro", Zeile 3242).
2. Macro mit Befehl speichern.
3. In Steuerung-Tab erscheint es als Quick-Action-Chip (`#quickActions`, Zeile 2444, render Zeile 14051 ff.).
4. Chip tippen.

**Erwartung** 1-Tap fuehrt den hinterlegten Befehl aus. Chips rendern kontextabhaengig (Heizer-Status, Zeile 6686).

**VoiceOver-Schritte** Chip als Button mit Label erreichbar, Doppeltipp loest aus.

**Bei Fehlschlag vermuten** Chip erscheint nicht = `renderQuickActions` wurde nicht getriggert (nur bei Heizer-Wechsel neu gerendert, Zeile 6686). Tab-Wechsel/Reconnect kann Re-Render ausloesen.

---

## 14. Wartung / Forget-Me

### Flow 14.1 JSON-Backup exportieren (P1, B+S)
**Schritte** Settings, Backup & Export, **"JSON-Backup"** (`#btnExportAll`, Zeile 4052).
**Erwartung** Datei/Share-Sheet mit JSON. Auf iOS ggf. Share-Sheet statt Download.
**VoiceOver-Schritte** Button beschriftet, Share-Sheet ist iOS-nativ und VoiceOver-faehig.
**Bei Fehlschlag vermuten** iOS-Download-Verhalten weicht ab, Share-Sheet pruefen.

### Flow 14.2 Forget-Me (P1, B+S)
**Schritte**
1. Settings ganz unten **"⚠️ Forget Me — alles loeschen"** (`#btnForgetMe`, Zeile 4070, `forgetMe` Zeile 15965).
2. Bestaetigung durchgehen.

**Erwartung** Loescht ALLES: Einstellungen, Programme, Sessions, PIN, Caches (FAQ Zeile 17200). Alle 44 LocalStorage-Keys (vol_prefs, vol_programs, vol_sessions, sessions_csc_pin u.a.) weg.

**VoiceOver-Schritte** Danger-Button klar als solcher vorgelesen, Bestaetigungs-Dialog (`#modalDlg`, DLG-1) fokussiert und vorlesbar, kein versehentliches Ausloesen.

**Bei Fehlschlag vermuten** Reste in LocalStorage = `forgetMe` deckt nicht alle Keys ab. Service-Worker-Cache (`sw.js`) ggf. separat. Nach Forget-Me sollte App im frischen Zustand sein (Welcome-Flow erscheint wieder).

---

## A11Y-Querschnitt (gilt fuer alle Modale)

### Flow A.1 Modal-Fokus und Inert-Hintergrund (P1, Safari + VoiceOver)
**Schritte**
1. Beliebiges Modal oeffnen (z.B. Voice-Hilfe, Bug-Report, Sorten-Detail).
2. Mit VoiceOver versuchen, aus dem Modal heraus in den Hintergrund zu wischen.

**Erwartung**
- Hintergrund ist inert + aria-hidden, VoiceOver bleibt im Modal gefangen (v9.7.0, `_a11yObserveOverlays`).
- Esc/Schliessen gibt Fokus sinnvoll zurueck. 49 Modale mit role=dialog + aria-modal.

**Bei Fehlschlag vermuten** VoiceOver liest Hintergrund-Inhalte: Observer-Reihenfolge oder ein Modal wurde faelschlich vom Inert ausgenommen (`.modal` nie exemptieren, Landmine aus v9.7.0).

---

## Vor-Test-Hygiene (Empfehlung)

- Vor Recovery-Tests (3.3) ggf. App-Daten zuruecksetzen, damit kein alter Lock-Timer (`pin_recovery_lock_until`) Tests verfaelscht.
- Voice-Tests (5.x) ohne aktiven VoiceOver durchfuehren, A11Y-Voice-Pfad separat ueber Text-Befehl (5.2) und Master-Toggle (5.3) pruefen.
- Bug-Report (9.1) bewusst in Bluefy testen, weil der `window.open`-vs-Clipboard-Unterschied genau dort auftritt.
- Geraete-abhaengige Flows (Heizen, Programm-Lauf) nur mit echtem Vaporizer in sicherer Umgebung.

---

**Hinweis zum Audit:** Diese Datei wurde als Vorschlag erzeugt und im Read-Only-Modus NICHT in das Repository geschrieben. Andre entscheidet, ob sie unter `docs/QA-2-IPHONE-TEST-MATRIX.md` abgelegt wird.
