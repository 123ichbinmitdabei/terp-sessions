# Sessions — S&B Vape Controller (v4.7)

Web-App zur Steuerung von Storz & Bickel Vaporizern (Volcano Hybrid, Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML PWA, ~300 KB, mobile-first, accessibility-orientiert.

## Was ist neu in v4.7 — Audio, Lernen, Kontext, Medizinisch, Soziales

18 substantielle neue Features in 5 Kategorien.

### Audio (3)

- **Hintergrund-Soundscape** mit 5 Stimmungen (Regen, Ozean, Wald, Lo-fi, Ambient) — alles direkt im Browser über Web Audio API generiert. Kein Streaming, kein externes Asset. Lautstärke regelbar.
- **Binaurale Beats** mit 5 Presets (Delta 3 Hz, Theta 6 Hz, Alpha 10 Hz, Beta 18 Hz, Gamma 40 Hz) — zwei leicht verschiedene Frequenzen pro Ohr für Brainwave-Entrainment. Mit Kopfhörern wirksam.
- **4-7-8 Atemübung** mit animiertem Atem-Kreis. 4s einatmen, 7s halten, 8s ausatmen. Nutzt die Aufheizzeit für Ruhe.

### Lernen (3)

- **Glossar** mit 21 Begriffen zu Cannabinoiden, Terpenen, Verdampfungstechniken (THC, CBD, CBN, Limonen, Linalool, Decarboxylierung, Entourage-Effekt, Konduktion vs. Konvektion, AVB, Mikrodose, T-Break …)
- **Verdampfungs-Wissenschaft**: Diagramm mit allen relevanten Cannabinoiden und Terpenen, jeweils mit Verdampfungstemperatur und Beschreibung. Cannabinoide orange hervorgehoben, Terpene blau.
- **Sortenkunde-Quiz**: 10 Fragen-Pool, 5 zufällige pro Runde, sofortige Auflösung mit Highlight der richtigen Antwort, Score am Ende.

### Kontext (4)

- **Wetter-Integration** via Open-Meteo API (frei, ohne API-Key). Aktuelle Temperatur und Wetter-Code mit deutschen Bezeichnungen. Standort einmalig setzen, danach auto-fetch.
- **Mond-Phase** berechnet (Conway-Approximation) als achtelige Phase mit Emoji.
- **Tageszeit-Empfehlung**: morgens Sativa-leicht, mittags Hybrid, abends Indica-betont, nachts schwere Indica.
- **Saison-Empfehlung**: Winter höhere Temps + schwerere Sorten, Sommer leichter mit Zitrus-Terpenen, etc.

### Medizinisch (4)

- **Symptom-Tracker**: 5-Skalen-Erfassung (Schmerz, Schlaf-Qualität, Appetit, Stimmung, Angst-Level) jeweils 1-10. Vor und nach der Session. Nach Session-Abschluss wird automatisch gefragt ob nochmal erfasst werden soll.
- **Tolerance-Break-Modus**: Konsum-Pause-Tracker mit Tagezähler, Ziel-Tagen (default 14, einstellbar), Fortschritts-Bar. Wenn aktiv warnt der Bag-Fill mit Bestätigungs-Dialog. T-Break-History wird gespeichert.
- **Konsum-Protokoll**: PDF-fähiger HTML-Report mit allen Sessions der letzten 90 Tage, Symptom-Daten der letzten 40 Erfassungen, Zusammenfassung. Öffnet in neuem Fenster, von dort über Browser-Druck als PDF speicherbar. Für Arztgespräche und Selbst-Dokumentation.
- **Bag-Fill-Schutz im T-Break**: aktiver T-Break löst beim Bag-Fill eine Bestätigungs-Abfrage aus, schützt vor versehentlichem Bruch.

### Soziales (4)

- **Multi-User-Profile** mit Avatar-Button oben in der Topbar. Mehrere Profile mit Namen und Emoji. Schneller Wechsel über Profile-Modal. Default-Profil immer vorhanden.
- **Gemeinsame Session-Modus** über BroadcastChannel — Geräte im selben WiFi sehen Aktionen anderer Nutzer als Toast. Privacy-friendly: kein Server, nur lokal.
- **Programm-Bibliothek**: JSON-URL importieren und mehrere Programme auf einmal in die Liste laden. Marianas Sammlung könnte z.B. unter `marianacannabis.github.io/sessions-library/programs.json` gehostet werden.
- **Routine-Erkennung**: nach 30 Sessions sucht die App nach Patterns (Wochentag + Stunde). Wenn 3+ Treffer am selben Slot, Toast mit Vorschlag: „Routine erkannt: Sonntags gegen 19:00".

### Plus

- **Im Setup-Tab eine Tools-Karte** mit allen 6 neuen Hauptfunktionen als Schnellzugriff.

## Was war in v4.6

22 Features: Großschrift, Hochkontrast, Tastatur-Shortcuts, Voice-Readout, differenzierte Haptik · PIN-Sperre, Auto-Lock, Bags-Tageslimit, Forget-Me, AES-Encryption · Reinigung, Sieb, Service-Log, Firmware · Loops, Variablen, Timeline-View · 12 Achievements, Streak, Sortennamen-Generator, Vape-Buddy, Easter Eggs.

## Plattform-Kompatibilität

| Feature | Android Chrome | Desktop Chrome | Bluefy iOS | Safari iOS |
|---|---|---|---|---|
| Bluetooth | ✅ | ✅ | ✅ | ❌ |
| Sprachsteuerung | ✅ | ✅ | eingeschr. | ❌ |
| Soundscapes | ✅ | ✅ | ✅ | ✅ |
| Binaural Beats | ✅ | ✅ | ✅ | ✅ |
| Wetter API | ✅ | ✅ | ✅ | ✅ |
| Geolokation | ✅ | ✅ | ✅ | ✅ |
| Shared Session | ✅ | ✅ | ✅ | ✅ |
| Web Crypto | ✅ | ✅ | ✅ | ✅ |

## Datenschutz

- Soundscapes: alle Sounds werden lokal erzeugt, kein Tracking
- Wetter: einziger externer Call ist die Open-Meteo API mit Latitude/Longitude (anonymisiert, kein Account)
- Reverse-Geocoding: Open-Meteo Geocoding für Stadtnamen
- Multi-User: alle Profile lokal, nichts wird hochgeladen
- Shared Session: nur über BroadcastChannel im selben Browser-Kontext, kein Server

## Werkzeuge im Setup-Tab

| Werkzeug | Zweck |
|---|---|
| 🎵 Audio & Atmen | Soundscapes, Beats, Breathing |
| 📚 Wissen & Quiz | Glossar, Wissenschaft, Quiz |
| 📋 Symptom-Tracker | Vor/Nach-Session-Bewertung |
| 📄 Konsum-Protokoll | PDF-Report für Arzt/Eigendoku |
| 📥 Bibliothek | JSON-Programm-Import |
| 👥 Profile | Multi-User-Profile |

## Roadmap

**v4.8** geplant: Power-User (Custom BLE-UUIDs, Raw-BLE-Console, DSL-Script, HA-YAML-Export), Externe Integration (MQTT-Publisher, Webhooks), Reise-Modi (Hotel, Akku-Spar, Offline-First), 3D-Volcano-Vorschau optional. ~15-20 Features.

Nach v4.8 ist Phase 1 wirklich fertig — dann Phase 2 (Raspberry Pi + Home Assistant + Alexa) als separates Setup.

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt. **Niemals unbeaufsichtigt füllen.**
