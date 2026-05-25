# Volcano Hybrid Controller v4.4

Web-App zur Steuerung des Storz & Bickel Volcano Hybrid (und in Beta: Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML, PWA-fähig, mobile-first, mit interaktivem Onboarding, Screenreader, Wake Lock, Sprachsteuerung und vielem mehr.

## Was ist neu in v4.4

**10 neue Features als zusammenhängende Erweiterung:**

### 1. Settings-Modal (Zahnrad-Icon oben rechts)
Zentrale Schaltzentrale für alle Präferenzen: Theme, Sound, Haptik, Sprachsteuerung (mit einzelnen Befehlen abschaltbar), Ballonprofile, Datenexport/-import, Onboarding neu zeigen.

### 2. Heller Modus
Sauberer Light-Theme mit warmen Erdtönen, umschaltbar in den Einstellungen. Die `theme-color`-Meta wird automatisch angepasst.

### 3. Session-Statistiken
Drei Counter im Setup-Tab: Anzahl gefüllter Ballons, akkumulierte Heizdauer, Anzahl abgeschlossener Sessions. Werden bei Aktionen automatisch fortgeschrieben.

### 4. Notizen pro Session
Textfeld im Steuerung-Tab mit Auto-Save (700 ms debounce). „Session abschließen" archiviert die Notiz in die History (letzte 50 Sessions werden behalten) und resettet.

### 5. Sprachsteuerung (Web Speech API, Deutsch)
Mikrofon-FAB unten rechts. Default an, alle Befehle einzeln in den Einstellungen schaltbar:
- „Heize auf 185 Grad" / „Setze 200 Grad"
- „Heizer an" / „Heizer aus"
- „Pumpe an" / „Pumpe aus"
- „Pumpe 5 Sekunden"
- „Ballon füllen"
- „Starte Programm Aroma Tour"
- „Alles stoppen" / „Notaus"

Web Speech Recognition ist auf iOS/Bluefy oft eingeschränkt — auf Android Chrome funktioniert es zuverlässig. Bei nicht-Verfügbarkeit verschwindet der FAB einfach.

### 6. Aroma- und Sortendatenbank
20+ Sorten mit empfohlenen Verdampfungstemperaturen (3 Stufen pro Sorte). Sortierbar nach Suche („Sativa", „OG Kush", „Zitrus"…). Direktes Setzen der Temperatur per Tap.

### 7. Editierbare Vorlagen + Drag-Reorder
Die 6 Vorlagen-Programme werden beim ersten Start in den Storage migriert und sind jetzt voll editier- und löschbar. Im Editor lassen sich Schritte per Drag (≡-Handle) neu sortieren (Touch + Maus). „↻ Vorlagen auf Werkseinstellungen" stellt die Originale wieder her.

### 8. Programm-Dauer-Schätzung
In jeder Programm-Card und im Editor wird die geschätzte Gesamtdauer angezeigt („~5m 12s"). Berechnung berücksichtigt Aufheizrate (0.6 s/°C wenn schon heiß, 0.8 s/°C aus Raumtemperatur), Pausen und Pumpzeiten.

### 9. QR-Code-Share und -Import
- Jedes Programm hat einen 🔗-Button → QR-Code mit eingebetteter URL erscheint
- Empfänger scannt den QR mit dem Handy, App-URL öffnet mit `#prog=…` und fragt: importieren?
- Plus „URL kopieren" und „Teilen…" (nativer Share-Dialog wo verfügbar)

### 10. Ballon-Füll-Helper
Eigene Karte und Modal: vier Ballontypen (Easy Valve groß/klein, Solid Valve, Custom) mit voreingestellten Pumpzeiten, Live-Countdown, Warnung in den letzten 3 Sekunden (Vibration + Ton), Stop-Button, Auto-Counter für Statistiken. Pumpzeiten pro Typ in den Einstellungen anpassbar.

### Plus: Daten-Export/Import
Komplettes Backup als JSON-Datei (Einstellungen, Programme, Sessions, Notizen). Wiederherstellbar mit Bestätigung.

## Hinweis zum Ballon-Füllen

Der Volcano hat **keinen Drucksensor und keinen Volumen-Sensor** für die Ballons. Die App füllt rein zeitbasiert mit empirischen Default-Zeiten:

| Ballon | Volumen | Default-Pumpzeit |
|---|---|---|
| Easy Valve Ballon groß | ~6 L | 38 s |
| Easy Valve klein | ~3 L | 20 s |
| Solid Valve | ~3.5 L | 24 s |
| Custom | frei | 30 s |

Werte hängen leicht von Firmware-Version, Restdruck im Schlauch und Pumpenverschleiß ab. In den Einstellungen kannst du die Zeit pro Typ feinjustieren. Niemals unbeaufsichtigt füllen.

## Was war neu in v4.3

- iOS Safe-Area-Fix, dynamische Viewport-Höhe
- Vollständige Screenreader-Unterstützung (Skip-Link, aria-live, aria-pressed, sichtbare Fokus-Indikatoren)
- Wake Lock (Display bleibt an)
- Audio + Haptic Feedback
- Live-Temperatur-Graph, ETA, Auto-Reconnect
- Design-Refresh: Fraunces / Inter Tight / IBM Plex Mono, mineralische Erd-Tones

## Was war neu in v4.2

- Kritischer Bug-Fix: separate UUIDs für Heater/Pumpe On/Off, Uint32 LE Temperatur
- „Letzte Aktion"-Banner, Mini-Log

## Voraussetzungen

| Plattform | Browser | Funktioniert? |
|---|---|---|
| Android | Chrome | ✅ ja (alle Features inkl. Sprachsteuerung) |
| Windows / macOS / Linux | Chrome / Edge | ✅ ja |
| iPhone / iPad | **Bluefy** | ✅ ja (Sprachsteuerung ggf. eingeschränkt) |
| iPhone / iPad | Safari / Chrome iOS | ❌ kein Web Bluetooth |

## Live-URL

https://marianacannabis.github.io/volcano/

## Roadmap (v4.5+ Ideen)

- Pre-Heat-Timer („in 10 Min auf 185°C")
- Auto-Cool-Down nach Bag-Fill
- Step-Templates im Editor
- Multi-Theme-Picker (Lava, Forest, Cosmos, Paper)
- CSV-Export von Sessions
- Statistik-Visualisierung über Zeit
- Bluetooth-Mesh für Multi-Device-Setups
