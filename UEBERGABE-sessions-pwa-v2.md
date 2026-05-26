# Übergabe Sessions PWA v2 — Stand 2026-05-26 ~17:00

Übergabe-Doku für nahtlose Fortsetzung des v5.0-Multi-Device-Auftrags (DeviceAdapter-Pattern). Quelle der Wahrheit für Protokoll/UUIDs/Capabilities: `C:\Users\Nutzer\Downloads\v5_0_PLAN.md` plus die Addendum-Punkte (K1-K3, W1-W4, N1-N5) aus Andres Ergänzungsnachricht.

## Eckdaten
- **Repo:** `MarianaCannabis/volcano` (public). **Live:** https://marianacannabis.github.io/volcano/
- **Lokales Arbeitsverzeichnis:** `C:\Users\Nutzer\Downloads\volcano-controller-v4` (git-Repo, Single-File `index.html` ~480 KB + sw.js + README + 2 Icons + manifest.json).
- **Live aktuell:** v5.0.0 (verifiziert). **Branch `main`:** v5.0.0 (Tag `v5.0.0`, commit d3fe108).
- **Andre testet nur Hardware:** (1) Mighty bei v5.0.1-ZIP, (2) Venty bei v5.0.2-ZIP. Sonst alles autonom.

## Phasen-Status
- **Phase 1 (v4.9.8 verify):** ✅ live-verifiziert (Scheduler + Regression).
- **Phase 2 (v5.0.0 Foundation):** ✅ live (14/14). DeviceAdapter-Basis, VolcanoAdapter, detectDevice, State.adapter, cmd*→Adapter-Delegation, currentCapabilities adapter-getrieben. Volcano unverändert (Uint32 LE x10).
- **Phase 3 (v5.0.1 Crafty/Mighty):** ✅ IMPLEMENTIERT auf Branch `v5.0.1-crafty-mighty` (NICHT gemmerged/gepusht). Enthält:
  - CraftyMightyAdapter (Uint16 LE Temp, Battery reiner %, dynamische UUIDs `000000xx-4c45-4b43-4942-265a524f5453`, Chars 0x11/0x21/0x41/0x81/0x91, 2s-Poll, Akku in #battBadge, Pumpe versteckt).
  - **K1** gerätespezifischer Pflicht-Safety-Timer (`capabilities.requiresAppSafetyTimer`, force-enable 8 min bei Crafty/Mighty via LS-Key `vol_safety_forced_<type>`, Warnhinweis `#safetyPortableHint` + Confirm beim Deaktivieren von `#togSafetyAuto`).
  - **W2** Temp-Clamp beim Senden in `cmdSetTemp` mit Toast (Programm bleibt unverändert).
  - **K2** Mock-Mighty-GATT-Suite (puppeteer): 12/12. Mock-Pattern siehe `%TEMP%\sessions-pwa-test\v501mock.mjs`.
  - Lokale Suiten: v501.mjs 24/24, v501mock.mjs 12/12, node --check OK.
  - **ZIP fertig:** `C:\Users\Nutzer\Downloads\volcano-controller-v5.0.1.zip` (155 KB) — **wartet auf Andres Mighty-Test** (Checkliste s.u.).
- **Phase 4 (v5.0.2 Venty):** ⏸ nicht begonnen. Command-Protokoll (write+notify), Spec Kapitel 1.3.
- **Phase 5 (v5.0.3 Polish):** ⏸ nicht begonnen.

## PENDING — priorisiert
1. **Andres Mighty-Hardware-Test** (blockiert Phase-3-Abschluss). Bei OK: `git checkout main && git merge --no-ff v5.0.1-crafty-mighty`, Tag `v5.0.1`, push, live-verify, dann Phase 4.
2. **K3 Reconnect-Logik** ✅ ERLEDIGT (adapter-aware tryReconnect 3x/2s, #connLostBanner rot + #connLostHeat orange, scheduleTick pausiert bei State.connectionLost, Verstanden/Neu-verbinden-Buttons; k3.mjs 7/7). Damit sind alle drei KRITISCH-Punkte (K1+K2+K3) + W2 fertig.
3. **W3 Auto-Detection-Cache** (LS `vol_last_device`), **N2** adaptive Polling-Frequenz (1s heating / 5s idle / x2 bei batterySaveMode) in CraftyMightyAdapter.subscribeStatus, **N3** Webhook/MQTT-Payload um device/battery/boost erweitern (rückwärtskompatibel). Niedrigere Prio, vor v5.0.1-Push oder in Polish.
4. **Phase 4 Venty** inkl. K1 (Safety), K2 (Mock-Venty), N1 (Boost-Visualization-Setting).
5. **Phase 5** W1 (Programm-Migration-Wizard + Editor/Player-Skip), N4 (HA-YAML gerätespezifisch), N5 (Profile preferredDeviceType, optional).

## Korrekturen aus firsttris-Recherche (eingearbeitet / pending)
- **E1 ✅** Venty = Name enthält `S&B VY`, Veazy = `S&B VZ` (NICHT `^VY\d{3}`). In detectDevice korrigiert (noch null bis Phase 4).
- **E4/E5 ✅** Volcano Zusatz-Services (Bootloader, Service2) in optionalServices; VolcanoAdapter.KNOWN_CHARS-Block.
- **A2-A5 ✅** Multi-Brand-Architektur vorbereitet (Capabilities-Zukunftsfelder alle false, State.device flexibel, requestDevice/optionalServices-Kommentare). W3-Cache (`vol_last_device`) wird bei Connect geschrieben.
- **E3 PENDING (nach Mighty-OK):** CraftyMightyAdapter erweitern — 3 Services (Crafty1/2/3), Chars brightness 0x51, autoOff 0x61, runtime 0x23+0x1e3, boostTemp 0x31, firmware 0x32. **Battery evtl. 0x63 (primary)+0x73 (fallback) statt 0x41** — wenn Andres Mighty 0% meldet: 0x41→0x63 wechseln. requiresAppSafetyTimer BLEIBT true.
- **Phase 4 heisst VentyVeazyAdapter** (ein Adapter, Venty subtype venty + Veazy subtype veazy/Beta, gleiche UUIDs; Settings2-Bit BLE_PERMANENT=1<<0). Vor Start `v5_0_PLAN_v2.md` Korrekturen-Block lesen. Veazy ist NEU in-scope (v5.0.2).
- **v6.0+ Multi-Brand** (PAX/Puffco/Firefly): nur Architektur vorbereitet, KEIN Code jetzt.

## Andre-Feedback / Kontext (letzte Punkte)
- Vollautonom durchziehen, nur 2 Hardware-Tests (Mighty, Venty) involvieren. Reports kurz.
- Crafty hat er nicht (gleicher Adapter wie Mighty → implizit abgedeckt).
- GitHub-Pages-Incident 26.05. 10:57 UTC: Build-Status-API zeigt `errored`, ABER Deploys gehen trotzdem durch → Live-Wahrheit immer via `sw.js`-VERSION prüfen, nicht via API. Kein leerer Re-Commit.

## Code-Patterns / Fallen
- **Single-File-Pattern bleibt**, kein Code-Splitting. Keine Verhaltensänderung für Volcano außerhalb Refactor-Scope.
- **Em-Dashes** in deutscher Prosa durch Kommas. **Keine ASCII-Doublequote direkt nach deutschem „** in JS-Strings (Quote-Falle). In neuen JS-Strings besser ASCII-Umschreibung (z. B. "ausfuehren") statt typografischer Quotes.
- **node --check nach jeder JS-Änderung:** inline-Script aus index.html extrahieren (Regex `<script(?![^>]*src=)...>`), in tmp .js schreiben, `node --check`. One-Liner in der History.
- **Headless-Tests:** puppeteer-core (Chrome `C:\Program Files\Google\Chrome\Application\chrome.exe`), lokaler http-Server der das Repo serviert, oder Live-URL. Tour via `localStorage.setItem('vol_tour_completed','true')` deaktivieren. Mock-BLE via `Object.defineProperty(navigator,'bluetooth',...)` in evaluateOnNewDocument.
- **ZIP-Workflow:** Compress-Archive der 6 Dateien flach nach `C:\Users\Nutzer\Downloads\volcano-controller-vX.Y.Z.zip`.
- **Version-Bump:** sw.js `const VERSION`, index.html `log('Sessions vX bereit.')`, README-Header.

## Nächste konkrete Schritte
1. Auf Andres Mighty-Feedback warten. Bei Bug: konkrete Diagnose (BLE-Console-Log/rohe Bytes), fixen, neues ZIP, kein spekulativer Fix.
2. Parallel/danach K3 Reconnect in die Adapter-Basis (kritisch, noch offen für v5.0.1).
3. Bei Mighty-OK: v5.0.1 mergen/pushen/taggen/live-verify.
4. Phase 4 Venty starten (Branch von v5.0.1-main): VentyAdapter command-basiert, Mock-Venty-Suite 12+, ZIP, Andres Venty-Test.

## EXPLIZIT NICHT TUN
Kein Veazy, kein Code-Splitting, keine gerätespezifischen KI-Assistenten, keine separaten PWA-Builds, kein Push bei roter Suite.
