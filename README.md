# Volcano Hybrid Controller v4.2

Web-App zur Steuerung des Storz & Bickel Volcano Hybrid (und in Beta: Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML, PWA-fähig, mobile-first, mit interaktivem Onboarding.

## Was ist neu in v4.2

**Der große Fix:** Heizer und Pumpe funktionieren jetzt wirklich.

Bisheriges Problem (v4.0/v4.1): die UUIDs für Heater und Pumpe waren falsch, und das Schreibformat für die Temperatur ebenfalls. Verbindung und Auto-Mapping liefen durch, aber die eigentlichen Befehle hatten keinen Effekt.

Konkrete Korrekturen, alle verifiziert gegen den Reverse-Engineering-Code von `firsttris/reactive-volcano-app` (live im Einsatz):

- **Separate Characteristics für ON und OFF**: Der Volcano hat nicht eine einzelne Heater-Char mit Wert 0/1, sondern zwei: `1011000f` für Heater-AN und `10110010` für Heater-AUS. Genauso für die Pumpe: `10110013` und `10110014`. Geschrieben wird ein einzelnes Null-Byte, der UUID-Aufruf selbst löst die Aktion aus.
- **Temperatur als Uint32 LE × 10**: nicht Uint16. Bei Wunschtemperatur 185°C wird `0x73 0x07 0x00 0x00` (= 1850 als Uint32 LE) auf `10110003` geschrieben.
- **Activity-Bitmaske**: Heizer-Status ist Bit 5 (`0x0020`), Pumpe ist Bit 13 (`0x2000`), Auto-Off ist Bit 9 (`0x0200`), alles im Uint16 LE auf Char `1010000c`.
- **9 UUID-Felder statt 7** im Setup-Tab: zwei Services (State und Control) und vier separate Heater/Pump-Chars.
- **Auto-Mapping** erkennt sowohl Volcano Hybrid (zwei Services) als auch Crafty/Mighty (ein Service) automatisch.
- **Crafty/Mighty Profile** mit verifizierten UUIDs (`00000001-4c45-4b43-4942-265a524f5453` Service).
- **Venty** bleibt experimentell — anderes Protokoll mit Write-Masken statt separater Chars.

**Mehr User-Feedback:**

- **„Letzte Aktion"-Banner** im Hero direkt unter den Indikatoren: zeigt live an was passiert, mit pulsierendem Punkt während BLE-Writes
- **Mini-Log im Steuerung-Tab**: die letzten 5 Log-Zeilen immer sichtbar, ohne in den Setup-Tab wechseln zu müssen
- **Toast für jede Aktion** statt nur bei Fehlern
- **Verbindungs-Punkt oben** pulst gelb während Operationen laufen
- **Auto-Mapping zeigt Trefferzahl**: „5/7 Chars gefunden" statt nur „fertig"
- **Test-Funktion mit klarem Ergebnis**: „Test bestanden ✓" oder „X von 5 fehlgeschlagen"

## Was war neu in v4.1

- Interaktiver 9-Slide Beginner-Wizard
- iOS-Erkennung mit Bluefy-Hinweis
- Geräte-Auswahl mit Profilen für Volcano, Crafty, Mighty, Venty
- Kontextuelle Hilfe-Buttons in jeder Karte

## Was war neu in v4.0

- Mobile-First UI mit Bottom-Nav und Live-Temperatur-Anzeige
- Echter Workflow-Builder statt JSON-Editieren
- 6 fertige Programm-Vorlagen
- PWA: auf den Home-Screen installierbar
- Migration alter v3-Slots

## Voraussetzungen

| Plattform | Browser | Funktioniert? |
|---|---|---|
| Android (Handy/Tablet) | Chrome | ✅ ja |
| Windows / macOS / Linux | Chrome oder Edge | ✅ ja |
| **iPhone / iPad** | **Bluefy** (App Store, kostenlos) | ✅ ja, nur in dieser App |
| iPhone / iPad | Safari, Chrome, Firefox | ❌ Apple sperrt Web Bluetooth dort |

- **HTTPS oder localhost** erforderlich
- **Nur eine BLE-Verbindung** pro Gerät: offizielle S&B-App vorher trennen

## Live-URL

https://marianacannabis.github.io/volcano/

## Welche Geräte funktionieren

Jeder Volcano Hybrid weltweit (UUIDs sind über alle Firmware-Versionen stabil). Genauso jeder Crafty / Crafty+ / Mighty / Mighty+ mit Bluetooth (Profile aktiv, Beta-Status, da meist nicht selbst gegengetestet). Venty ist experimentell, das Protokoll unterscheidet sich. Geräte ohne Bluetooth (Volcano Classic, Plenty, ältere Crafty ohne Funkmodul) lassen sich nicht steuern.

Du musst immer in ca. 2-5 m BLE-Reichweite sein. Wenn du deinen Volcano mitnimmst, steuerst du ihn vom Handy — wenn du irgendwo einen geliehenen Volcano vor dir hast, klappt das auch, sobald die offizielle S&B-App dort getrennt ist.

## Probleme & Diagnose

| Symptom | Ursache / Fix |
|---|---|
| „Web Bluetooth nicht verfügbar" | Falscher Browser. Chrome/Edge nutzen oder iOS-Banner folgen (Bluefy). |
| Connect-Dialog zeigt nichts | Volcano nicht an oder noch mit S&B-App verbunden. |
| Verbunden, aber Temperatur bleibt „––" | Notify-Char falsch. Auto-Mapping erneut. Falls nicht: Setup → Services scannen → die Liste schicken. |
| Buttons ohne Wirkung | Falsche Heater/Pump-Chars. Auto-Mapping erneut. |
| Werte 10× zu hoch | Parser-Heuristik daneben. Discovery-Output schicken, kalibriere ich. |
| Crafty/Mighty/Venty Beta | Auto-Mapping läuft, Heater funktioniert, aber Pumpe oder Status-Bits können abweichen. |

## Workflow-Aktionen

- `heat_on` / `heat_off`
- `pump_on` / `pump_off`
- `pump_for { seconds }`
- `set_temperature { value }`
- `wait_until { value }` (bis Temp erreicht, max 240s)
- `wait { seconds }`

## Sicherheit

- Volcano **niemals unbeaufsichtigt** lassen.
- Sicherheits-Timer schaltet nach X Minuten Heizer + Pumpe automatisch AUS.
- Bei Programmfehler werden Heizer und Pumpe automatisch abgeschaltet.

## Roadmap

- **Phase 2**: Raspberry Pi + Home Assistant Bridge + Alexa-Integration
- Live-Temperatur-Graph
- Drag-Reorder für Workflow-Schritte
- Bluefy-Detection per UA-Sniff sauberer

## Quelle der UUIDs

UUIDs und Write-Formate sind verifiziert gegen `firsttris/reactive-volcano-app` (CC BY-NC 4.0, live unter firsttris.github.io/reactive-volcano-app). Die UUIDs selbst sind technische Fakten über die Geräte-Firmware, nicht urheberrechtlich schützbar. Unsere App ist eine eigenständige Implementation (Vanilla JS Single-File statt React/Solid + Vite-Build) mit eigener UX, Onboarding, Workflow-Builder und geplanter HA-Integration.


