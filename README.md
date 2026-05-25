# Volcano Hybrid Controller v4.1

Web-App zur Steuerung des Storz & Bickel Volcano Hybrid (und in Beta: Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML, PWA-fähig, mobile-first, mit interaktivem Onboarding.

## Was ist neu in v4.1

- **Interaktiver Beginner-Guide** (9 Slides): startet automatisch beim ersten Öffnen, jederzeit über das **?**-Symbol oben rechts erneut aufrufbar
- **iOS / Bluefy-Erkennung**: erkennt iPhone/iPad und blendet eine Anleitung zur Bluefy-App ein (Web Bluetooth läuft auf iOS sonst nicht)
- **Geräte-Auswahl**: Volcano Hybrid (fertig), Crafty / Mighty / Venty (Beta — verbinden geht, UUIDs ggf. via Auto-Mapping kalibrieren)
- **Kontextuelle Hilfe**: kleine **?**-Buttons in jeder Karte, mit gezielten Erklärungen statt langer Dokumentation
- **Browser-Check** im Wizard: erkennt Chrome/Edge Desktop, Chrome Android, Bluefy auf iOS, oder warnt bei unterstützten Browsern

## Was war neu in v4

- Mobile-First UI mit Bottom-Nav, großen Touch-Targets, Live-Temperatur-Anzeige
- Echter Workflow-Builder statt JSON-Editieren
- 6 fertige Vorlagen (Aroma-Tour, Schnellsession, Mikro-Dose, Slow Burn, Ramp, End-Extraktion)
- PWA: auf den Home-Screen installierbar, Vollbild-Modus
- Notify-Parsing: Uint16 LE × 10 mit Heuristik
- Migration alter v3-Slots

## Voraussetzungen

| Plattform | Browser | Funktioniert? |
|---|---|---|
| Android (Handy/Tablet) | Chrome | ✅ ja |
| Windows / macOS / Linux | Chrome oder Edge | ✅ ja |
| **iPhone / iPad** | **Bluefy** (App Store, kostenlos) | ✅ ja, nur in dieser App |
| iPhone / iPad | Safari, Chrome, Firefox | ❌ Apple sperrt Web Bluetooth dort |

**Wichtig:**
- **HTTPS oder localhost** erforderlich (GitHub Pages erfüllt das automatisch)
- **Nur eine BLE-Verbindung** pro Gerät: offizielle S&B-App vorher trennen

## Live-URL

https://marianacannabis.github.io/volcano/

Auf dem Handy in Chrome (Android) oder Bluefy (iOS) öffnen, Menü → „Zum Startbildschirm hinzufügen" — dann läuft die App wie eine native App.

## Erste Inbetriebnahme

Beim ersten Start öffnet sich der Wizard automatisch und führt durch:

1. Browser-Check
2. Geräte-Auswahl
3. Vorbereitung (S&B-App trennen, Volcano an, in Reichweite)
4. Verbinden
5. Auto-Mapping
6. Probierlauf (Heizen auf 180°C, dann aus)
7. Sicherheits-Hinweise
8. Fertig

Du kannst den Wizard jederzeit über das **?**-Symbol oben rechts erneut starten.

## Probleme & Diagnose

| Symptom | Ursache / Fix |
|---|---|
| „Web Bluetooth nicht verfügbar" | Falscher Browser. Chrome/Edge nutzen oder iOS-Banner folgen (Bluefy). |
| Connect-Dialog zeigt nichts | Volcano nicht an oder noch mit S&B-App verbunden. |
| Verbunden, aber Temperatur bleibt „––" | Notify-Char falsch. Setup → Discovery → mir die Liste schicken. |
| Buttons ohne Wirkung | Falsche Write-Chars. Auto-Mapping erneut versuchen. |
| Werte 10× zu hoch | Parser-Heuristik daneben. Discovery-Output schicken, ich kalibriere. |
| Crafty/Mighty/Venty funktioniert nicht voll | Beta-Profile, UUIDs unverifiziert. Auto-Mapping + Discovery → mir schicken. |

## Workflow-Aktionen

- `heat_on` / `heat_off`
- `pump_on` / `pump_off` (dauerhaft)
- `pump_for { seconds }` (Pumpe X Sekunden, dann aus)
- `set_temperature { value }` (40–230 °C)
- `wait_until { value }` (blockiert bis aktuelle Temp ≥ Ziel oder 240 s Timeout)
- `wait { seconds }` (einfach warten)

## Sicherheit

- Volcano **niemals unbeaufsichtigt** lassen.
- Im Tab Steuerung gibt es einen **Sicherheits-Timer**: nach X Minuten Heizer + Pumpe automatisch AUS.
- Bei Programmfehler werden Heizer und Pumpe automatisch abgeschaltet.
- Bei langen Programmen: Display nicht ausgehen lassen.

## Roadmap (v4.2+)

- Crafty / Mighty / Venty: vollständige Profile nach erstem echten Test
- Notify-Hex-Dump im Setup für leichteres Debugging unbekannter Firmware
- Drag-Reorder für Workflow-Schritte
- Optionaler Live-Temperatur-Graph
- HA-Bridge: lokale REST-API für Home Assistant (Phase 2)

