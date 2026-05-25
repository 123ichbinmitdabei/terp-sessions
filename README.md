# Sessions — S&B Vape Controller (v4.6)

Web-App zur Steuerung von Storz & Bickel Vaporizern (Volcano Hybrid, Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML, PWA-fähig, mobile-first, accessibility-orientiert.

## Was ist neu in v4.6 — Accessibility, Sicherheit, Wartung, Engagement

22 neue Features in 6 Kategorien.

### Inklusion und Bedienbarkeit

- **Großschrift-Modus**: drei Stufen (100% / 125% / 150%) in den Einstellungen
- **Hochkontrast-Modus** (WCAG AAA): Schwarz/Weiß-Palette mit dickeren Borders und 3px-Fokus-Ring
- **Tastatur-Shortcuts**: 1-9 für Lieblings-Temperaturen, Space für Heizer-Toggle, B für Ballon, D für Direkt-Zug, V für Status-Vorlesen, ESC für Notaus
- **Voice-Status-Readout**: TTS-Vorlesefunktion auf Tastendruck (V) oder automatisch alle 30 Sekunden während verbunden. Liest aktuelle Temperatur, Ziel, Heizer-Status und ETA
- **Differenzierte Haptik-Patterns**: kurz (Touch), zwei-zu-eins (Erfolg), drei-mal (Ziel erreicht), zwei-lang (Warnung), drei-lang (Fehler), fünf-Takt (Achievement). Blinde lernen die Signale schnell

### Sicherheit und Schutz

- **PIN-Sperre**: 4-8-stellige PIN, SHA-256 mit Salt gehasht, beim Start abgefragt. Über Einstellungen aktivierbar
- **Auto-Lock**: nach X Minuten Inaktivität (0-60) wird die PIN erneut abgefragt. Erkennung über Click/Keyboard/Touch-Events
- **Selbstkontroll-Limit**: max X Ballons pro Tag — bei Überschreiten Warnung mit Fortsetzungs-Bestätigung
- **Forget-Me-Knopf**: alles weg: alle LocalStorage-Keys, Service Worker, Caches. Doppelte Sicherheitsabfrage, danach App-Neustart
- **Encryption at Rest**: Sessions-History und Notizen optional AES-GCM-verschlüsselt mit PBKDF2-Key-Derivation (100k Iterationen) aus der PIN. Verschlüsseln/Entschlüsseln in Einstellungen

### Wartung und Pflege

- **Reinigungs-Reminder**: nach X Sessions oder Y Heizstunden erscheint Reminder mit „Erledigt"-Bestätigung
- **Sieb-Wechsel-Counter**: separater Counter, Default alle 50 Sessions
- **Service-Historie**: chronologisches Log was wann gewartet wurde, ausklappbar im Setup-Tab
- **Firmware-Anzeige**: manuell eintragbares Feld, wird in Diagnose-Export aufgenommen
- **Visuelle Reminder-Balken**: zeigen Fortschritt zur nächsten Wartung als Bar — wird gelb bei 80%, rot bei 100%

### Programm-Editor Power

- **Loop / Wiederhole** als Step-Action: „+ Loop"-Button im Editor fügt ein `loop_start`/`loop_end`-Paar ein. Alle Schritte dazwischen werden 2-20x wiederholt
- **Variablen-Platzhalter**: ein Programm-Step kann `{temp}` oder `{seconds}` enthalten. Beim Start wird der User per Prompt nach Werten gefragt
- **Timeline-View** im Editor: alternative Darstellung als horizontale Timeline mit farbigen Blöcken (Heizer rot, Pumpe blau, Pause grau, Loop violett). Per Tab umschaltbar
- **Loops werden zur Laufzeit expandiert**: bei einer Loop mit 3x Wiederholung werden die inneren Schritte 3x nacheinander ausgeführt

### Engagement und Spaß

- **Achievements**: 12 freischaltbare Erfolge (Erster Ballon, 10 Ballons, 100 Ballons, Erstes eigenes Programm, 7-Tage-Streak, 30-Tage-Streak, alle Themes ausprobiert, 5 Sorten getestet, eigene Sorte, Reinigung, Sprachsteuerung-Nutzer). Toast mit Vibration beim Freischalten
- **Streak-Counter**: aufeinanderfolgende Tage mit mindestens einer Session — als 4. Stat-Kachel
- **Sortennamen-Generator**: zufällige Cannabis-Sorten-Namen mit Adjektiv + Nomen + Nummer („Crystal Lightning #42"). Generator-Button in Einstellungen, kann direkt als Custom-Sorte übernommen werden
- **Vape-Buddy-Charakter**: kleines Charakter-Icon unten links das mit dir kommuniziert. Mood je nach Geräte-Status (Schlafend wenn unverbunden, Heizt-auf während Aufheizung, Bereit wenn Ziel erreicht). Optional ein-/ausschaltbar
- **Easter Eggs**: Konami-Code (↑↑↓↓←→←→ba) schaltet alle Achievements frei. `sessions.about()` in der DevTools-Console zeigt Credits
- **ASCII-Volcano** in der DevTools-Console beim App-Start — kleine Geste für Entwickler

## Was war in v4.5

App-Umbenennung in „Sessions", Geräte-Capabilities-System, Quick-Actions im Hero, Pre-Heat-Timer, Auto-Cool-Down, Step-Templates, Aroma-DB auf 57 Sorten + Programm-Generator, Custom-Aromas, CSV-Export, Stats-Visualisierung, 6-Theme-Picker (Dark, Light, Lava, Forest, Cosmos, Paper), Multi-Geräte-Liste, Session-Replay, Quick-Favoriten, Smart-Defaults, PWA-Update-Prompt, Heizkurven-Analyse, Notfall-Diagnose, Sicherheits-Timer default an, Layout-Cleanup.

## Plattform-Hinweise

| Plattform | Web Bluetooth | Sprachsteuerung | Web Crypto (PIN+Encryption) | Wake Lock |
|---|---|---|---|---|
| Android Chrome | ✅ | ✅ | ✅ | ✅ |
| Desktop Chrome/Edge | ✅ | ✅ | ✅ | ✅ |
| iPhone/iPad Bluefy | ✅ | eingeschränkt | ✅ | ✅ |
| iPhone/iPad Safari | ❌ | ✅ | ✅ | ✅ |

## Tastatur-Shortcuts (v4.6)

| Taste | Aktion |
|---|---|
| 1 - 9 | Lieblings-Temperatur setzen |
| Space | Heizer ein/aus |
| B | Ballon füllen |
| D | Direkt-Zug starten |
| V | Status vorlesen |
| ESC | Notaus (Heizer + Pumpe aus) bzw. Modal schließen |

## Roadmap

**v4.7** geplant: Audio (Soundscapes, Binaurale Beats, Atemübung), Lernen (Glossar, Quiz, Verdampfungs-Wissenschaft), Kontext (Wetter, Standort, Saison, Mond), Medizinisch (Symptom-Tracker, T-Break-Modus), Soziales (Multi-User-Profil, Gemeinsame Sessions, Programm-Bibliothek)

**v4.8** geplant: Power-User (Custom BLE-UUIDs, Raw-BLE-Console, DSL-Script, HA-YAML-Export), Externe Integration (MQTT-Publisher, Webhooks), Reise-Modi (Hotel, Akku-Spar, Offline-First), Rest

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt. Werte in den Einstellungen feinjustierbar. **Niemals unbeaufsichtigt füllen.**
