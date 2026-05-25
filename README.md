# Sessions — S&B Vape Controller (v4.5)

Web-App zur Steuerung von Storz & Bickel Vaporizern (Volcano Hybrid, Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML, PWA-fähig, mobile-first, accessibility-orientiert.

Vormals: „Volcano Controller". Umbenannt zu **„Sessions"** weil die App jetzt mehr als nur den Volcano steuert.

## Was ist neu in v4.5

### Strukturelle Änderungen

- **App umbenannt** auf „Sessions" (Title, Manifest, Brand)
- **Geräte-Capabilities-System**: jedes Gerät hat ein `capabilities`-Object — Pumpe-Buttons / Ballon-Quick-Action / Direkt-Zug werden automatisch aus- oder eingeblendet je nach Gerät
- **Schneller Geräte-Wechsel**: kleines Gerät-Badge im Hero direkt unter „Aktuelle Temperatur" — ein Tap öffnet den Geräte-Picker
- **Sicherheits-Timer Default an**: bei Heizer-an startet der Timer automatisch mit dem in den Einstellungen festgelegten Wert (Default 25 Min)
- **Steuerung-Tab aufgeräumt**: Quick-Actions oben im Hero ersetzen die redundanten Bag-Fill- und Aroma-Karten. Notizen kompakter
- **Layout-Fix**: mehr Padding-Bottom damit die letzte Karte nicht mehr von der Bottom-Nav abgeschnitten wird

### Neue Features

- **Direkt-Zug Quick-Action** (Hero-Card) — Pumpe X Sekunden (Default 5, einstellbar 1–60s), für Direkt-Zug-Nutzer und Crafty/Mighty/Venty
- **Pre-Heat-Timer** — „in 10 Min auf 185°C aufheizen". Geplante Aktivierung mit Live-Countdown im Hero, Sound + Vibration beim Auslösen
- **Auto-Cool-Down** nach Ballon-Füllung (toggle) — Heizer fährt auf einstellbare Standby-Temperatur runter (Default 160°C)
- **Step-Templates im Editor** — 6 fertige Schritt-Sequenzen (3-Stufen-Aroma-Tour, Bag-Fill-Block, Cool-Down, Safe-Shutdown, Mikro-Dose, End-Extraktion). „+ Template" Button im Editor
- **Aroma → Programm-Empfehlung** — jede Sorte hat einen „Programm erzeugen"-Button der automatisch einen 3-Stufen-Verlauf erstellt
- **Aroma-DB massiv erweitert** auf **57 Sorten**: alle Klassiker (OG Kush, Northern Lights, White Widow, Blue Dream, Sour Diesel, …) plus terpenbasierte Profile (Linalool, Limonen, Pinen, Caryophyllen, Myrcen, Humulen, Terpinolen) plus Hash-Klassiker
- **Eigene Sorten hinzufügen** in der Aroma-DB (Name, 3 Temperaturen, Beschreibung)
- **CSV-Export** von Sessions für Tabellen-Auswertung
- **Statistik-Visualisierung** — Bar-Chart der letzten 7 Tage im Setup-Tab
- **Theme-Picker** — 6 Themes: Dark, Light, Lava, Forest, Cosmos, Paper. Direkt in Einstellungen umschaltbar
- **Multi-Geräte-Liste** — letzte 8 verbundene Geräte werden gemerkt (mit Alias, Typ, Last-Used)
- **Session-Replay** — „▶ Letztes Programm nochmal" als prominenter Button im Programme-Tab
- **Quick-Favoriten** — 4 Lieblings-Temperaturen direkt unter dem Hero. Lange tippen ändert den Wert
- **Smart-Defaults** — die App merkt sich die häufigsten Temperaturen der letzten 30 Aktionen und nutzt sie als Default für Pre-Heat etc.
- **PWA-Update-Prompt** — bei neuer Version erscheint eine Bestätigung zum Aktualisieren
- **Notfall-Diagnose** — bei BLE-Fehlern wird ein Diagnose-Eintrag erstellt (App-Version, Geräte-State, Chars-Status). Download über Einstellungen
- **Heizkurven-Analyse** — Sessions mit auffälliger Heiz-Geschwindigkeit werden geloggt: „Heizer war 4s langsamer als üblich"

### Gerät-Fähigkeiten-Matrix

| Funktion | Volcano | Crafty/Mighty | Venty |
|---|---|---|---|
| Heizer an/aus | ✅ | ✅ | ✅ |
| Temperatur setzen | ✅ | ✅ | ✅ |
| **Ballon füllen** | ✅ | ❌ | ❌ |
| **Direkt-Zug** | ✅ (Whip-Adapter) | ✅ | ✅ |
| Auto-Shutoff | ✅ | ✅ | ✅ |
| Akku-Stand | — | geplant | geplant |
| Boost-Modus | — | — | geplant |

Bei Auswahl eines Gerätes ohne Pumpe (Crafty/Mighty) werden Pumpe-Button und Ballon-Quick-Action automatisch ausgeblendet. Direkt-Zug bleibt verfügbar.

## Was war neu in v4.4

Settings-Modal, Heller Modus, Session-Statistiken, Notizen, Sprachsteuerung, Aroma-Datenbank, Editierbare Vorlagen, Drag-Reorder, Programm-Dauer-Schätzung, QR-Share, Ballon-Helper, Daten-Export/Import.

## Was war neu in v4.3

iOS Safe-Area-Fix, vollständige Screenreader-Unterstützung, Wake Lock, Audio+Haptic, Live-Temperatur-Graph, ETA, Auto-Reconnect, Design-Refresh (Fraunces, Inter Tight, IBM Plex Mono).

## Voraussetzungen

| Plattform | Browser | Funktioniert? |
|---|---|---|
| Android | Chrome | ✅ alles inkl. Sprachsteuerung |
| Windows / macOS / Linux | Chrome / Edge | ✅ alles |
| iPhone / iPad | **Bluefy** | ✅ (Sprachsteuerung eingeschränkt) |
| iPhone / iPad | Safari / Chrome iOS | ❌ kein Web Bluetooth |

## Live-URL

https://marianacannabis.github.io/volcano/

## Roadmap (v4.6+ Ideen)

- Sprache-Toggle DE/EN (i18n)
- Akku-Stand für Crafty/Mighty/Venty (BLE Battery Char)
- Bewertungen/Sterne pro Sorte
- Tagebuch-Modus mit chronologischer Session-Liste
- Reinigungs-Erinnerung
- Großschrift-Modus für Sehbehinderte
- Custom Vibration-Patterns

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt mit Defaults:

| Ballon | Volumen | Default |
|---|---|---|
| Easy Valve groß | ~6 L | 38 s |
| Easy Valve klein | ~3 L | 20 s |
| Solid Valve | ~3.5 L | 24 s |
| Custom | frei | 30 s |

Werte feinjustierbar in den Einstellungen. **Niemals unbeaufsichtigt füllen.**
