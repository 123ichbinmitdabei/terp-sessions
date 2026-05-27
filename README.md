# Sessions — Vape Controller (v7.0.0)

Web-App zur Steuerung von Storz & Bickel Vaporizern, PAX 3 (Beta) und Puffco Peak Pro (Beta). Single-File HTML PWA.

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
