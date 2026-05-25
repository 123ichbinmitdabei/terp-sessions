# Volcano Hybrid Controller v4

Web-App zur Steuerung des Storz & Bickel Volcano Hybrid über Web Bluetooth.
Single-File HTML, PWA-fähig, mobile-first.

## Was ist neu in v4

- **Mobile-First UI** mit Bottom-Nav, großen Touch-Targets, Live-Temperatur-Anzeige
- **Echter Workflow-Builder** statt JSON-Editieren: Schritte hinzufügen, umsortieren, editieren
- **6 fertige Vorlagen**: Aroma-Tour, Schnellsession, Mikro-Dose, Slow Burn, Ramp 150→210, End-Extraktion
- **PWA**: lässt sich auf den Home-Screen installieren, läuft im Vollbild
- **Bug-Fixes**:
  - Doppelter, kaputter Script-Block raus
  - Notify-Parsing: Temperaturen jetzt als Uint16 LE × 10 (korrekt)
  - Heuristik im Parser für unbekannte Firmware-Varianten
  - Separate Notify-Chars für Current Temp, Target Temp und Status-Bits
- **Migration** alter Slots (v3 → v4): wird beim ersten Start automatisch übernommen
- **Live-Run-UI**: schwebende Karte mit Fortschritt, Stop-Button, Auto-Off bei Fehler

## Voraussetzungen

- **Browser**: Chrome oder Edge auf Android oder Desktop. Web Bluetooth läuft nicht auf iOS Safari.
  - iPhone-Workaround: App „Bluefy" aus dem App Store. Funktioniert, ist aber nicht so schick.
- **HTTPS**: Web Bluetooth verlangt HTTPS oder `localhost`. Lokales Doppelklicken (`file://`) funktioniert **nicht**.
- **Nur eine BLE-Verbindung gleichzeitig**: offizielle S&B-App oder andere Clients trennen.

## Deployment auf GitHub Pages

In dein Repo packen, fertig:

```bash
# in das gewünschte Repo (z. B. marianacannabis.github.io/volcano/)
mkdir volcano && cd volcano
# alle Dateien aus diesem Ordner hier rein:
#   index.html  manifest.json  sw.js  icon-192.png  icon-512.png
git add .
git commit -m "Volcano Controller v4"
git push
```

Dann öffnest du auf dem Handy: `https://DEIN-USER.github.io/volcano/`

Tipp: In Chrome auf Android → Menü → „App installieren" oder „Zum Startbildschirm hinzufügen".

## Erste Inbetriebnahme

1. **Volcano** einschalten, in der Nähe. Offizielle S&B-App vorher trennen.
2. Im Browser die App öffnen (HTTPS!).
3. Oben rechts **„Verbinden"**, dein Gerät („VOLCANO …") wählen.
4. In den Tab **Setup** wechseln und einmalig **„Auto-Mapping"** laufen lassen. Falls keine korrekten Werte angezeigt werden:
   - **„Services scannen"** öffnen, die Liste sehen
   - die richtigen UUIDs ablesen (Notify-Char für Temperatur, Write-Chars für Heizer/Pumpe)
   - oben in den UUID-Feldern eintragen, **Speichern**, neu verbinden
5. **Test**-Button drückt einmal alle Befehle durch (Set-Temp + Heat/Pump on/off).

## Probleme & Diagnose

| Symptom | Ursache / Fix |
|---|---|
| „Web Bluetooth nicht verfügbar" | Falscher Browser oder kein HTTPS. Chrome/Edge nutzen, GitHub Pages-URL aufrufen. |
| Connect-Dialog zeigt nichts | Volcano nicht im Pairing-Mode? Bluetooth des Handys an? Andere BLE-Apps trennen. |
| Verbunden, aber Temperatur bleibt „––" | Notify-Char falsch. Im Setup → Discovery → die Char mit `notify` und ca. 2 Bytes Payload suchen. |
| Buttons ohne Wirkung | Falsche Write-Chars. Discovery → `write` Property prüfen. |
| Werte sind 10× zu hoch | Parser-Heuristik daneben. Discovery-Liste mir schicken, ich passe den Parser an. |

## Workflow-Aktionen

Verfügbare Schritte:

- `heat_on` / `heat_off`
- `pump_on` / `pump_off` (dauerhaft)
- `pump_for { seconds }` (Pumpe X Sekunden, dann aus)
- `set_temperature { value }` (40–230 °C)
- `wait_until { value }` (blockiert bis aktuelle Temp ≥ Ziel oder 240 s Timeout)
- `wait { seconds }` (einfach warten)

JSON-Beispiel siehe Export-Funktion.

## Sicherheit

- Volcano **niemals unbeaufsichtigt** lassen.
- Im Tab Steuerung gibt es einen **Sicherheits-Timer**: nach X Minuten Heizer + Pumpe automatisch AUS.
- Bei Programmfehler werden Heizer und Pumpe automatisch abgeschaltet.

## Roadmap (v4.1+)

- Notify-Hex-Dump im Setup für leichteres Debugging unbekannter Firmware
- Drag-Reorder für Workflow-Schritte (statt nur ▲▼)
- Optionaler Live-Temperatur-Graph
- HA-Bridge: lokale REST-API für Home Assistant, sobald wir Phase 2 angehen
