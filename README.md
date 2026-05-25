# Sessions — S&B Vape Controller (v4.8)

Web-App zur Steuerung von Storz & Bickel Vaporizern (Volcano Hybrid, Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML PWA, ~348 KB, mobile-first, accessibility-zentriert.

## Was ist neu in v4.8 — letzte Phase-1-Batch

15 substantielle Features in 6 Kategorien. Mit dieser Version ist Phase 1 fertig.

### Anleitung und Bedienung (Schwerpunkt)

- **📖 Eingebautes Handbuch** mit allen Funktionen, gegliedert in 10 Kategorien (Erste Schritte, Steuerung, Programme, Sicherheit, Accessibility, Audio, Wartung, Medizinisch, Power-User, Tipps). Such-Feld zum Filtern, ausklappbare Antworten. Hilfe-Knopf in der Topbar öffnet die Anleitung direkt.
- **♿ Blinden-Modus**: ein-Toggle aktiviert alle a11y-Features auf einmal: Großschrift 150%, Hochkontrast, Voice-Readout alle 30s, Tooltips per TTS, Vibration. TTS-Willkommens-Ansage erklärt die Shortcuts.
- **🗯 Tooltips überall**: jeder wichtige Knopf hat einen Hilfetext. Mobile Long-Press zeigt Tooltip-Popup. Bei aktivem „Tooltips per TTS"-Modus wird der Text beim Fokussieren mit Tab vorgelesen.
- **A11y-Audit**: aria-Labels, title-Attribute, Reading-Order durchgegangen. WCAG-AAA Hochkontrast mit 3px-Fokus-Ring.

### Reise-Modi

- **🏨 Hotel-Modus**: App versteckt sich hinter einem Wetter-Splash-Screen (zeigt aktuelles Wetter wenn Standort gesetzt). Entsperren per 5-Sekunden-Druck. Audio stoppt automatisch.
- **🔋 Akku-Spar-Modus**: Wake-Lock aus, Temperatur-Graph aus, Vape-Buddy aus, Animationen reduziert. Schont Handy-Akku unterwegs.
- **📡 Offline-Indikator**: Banner oben sichtbar wenn keine Internet-Verbindung. Alle App-Funktionen außer BLE-Discovery funktionieren weiter.

### Power-User Tools

- **⚙️ Custom BLE-Profile**: User kann eigene Geräteprofile mit Custom-UUIDs anlegen. Erweiterbar für nicht-S&B-Geräte oder Forschungs-Setups. Erscheinen in der Geräte-Liste nach Anlage.
- **📟 Raw BLE-Console**: Hex-Bytes pro Characteristic schreiben und lesen. Mit Decoding als Uint8/Uint16-LE/Uint32-LE. Für Reverse-Engineering und Forschung.
- **📜 DSL-Editor**: Programm-Skript-Sprache als Alternative zum visuellen Editor. Syntax: `heat on; set 185; wait until 185; pump 25s; loop 3 ... end loop; heat off`. Parser mit Live-Prüfung und Direkt-Speichern als Programm.
- **🏠 HA-YAML-Export**: jedes Programm kann als Home-Assistant-Script-YAML exportiert werden. Erzeugt Entity-IDs `switch.volcano_heater`, `switch.volcano_pump`, `number.volcano_target_temp`, `sensor.volcano_temp`. Brücke zu Phase 2.

### Externe Integration

- **🔗 Webhook bei Events**: konfigurierbare URL die bei Events angerufen wird (Heizer-an, Heizer-aus, Bag-fertig, Fehler). POST mit JSON-Body. Einzeln pro Event togglebar.
- **📡 MQTT-Publisher**: Verbindung zu MQTT-Broker über WebSocket (z.B. test.mosquitto.org). Published Events unter konfigurierbarem Topic-Prefix. MQTT 3.1.1 Raw-Encoding ohne externe Library.

### Polishing

- **Wetter network-first**: CC's Hinweis aus v4.7 umgesetzt. Open-Meteo-API wird jetzt immer frisch geladen, nicht aus Cache.
- **Manual als Topbar-Hilfe**: ? in der Topbar öffnet jetzt die Anleitung statt nur Wizard.
- **Einstellungen aufgeräumt**: Inklusion an oberster Stelle, Blinden-Modus prominent in oranger Box hervorgehoben.

## Vollständige Werkzeuge im Setup-Tab

| Werkzeug | Zweck |
|---|---|
| 📖 Anleitung | Vollständiges Handbuch mit Suche |
| 🎵 Audio & Atmen | Soundscapes, Beats, Breathing |
| 📚 Wissen & Quiz | Glossar, Verdampfungs-Wissenschaft, Quiz |
| 📋 Symptom-Tracker | Vor/Nach-Session-Bewertung |
| 📄 Konsum-Protokoll | PDF-Report für Arztgespräche |
| 📥 Bibliothek | JSON-Programm-Import |
| 👥 Profile | Multi-User-Profile |
| 📜 DSL-Editor | Programm-Skript-Sprache |
| 📟 BLE-Console | Raw BLE für Forscher |

## Tastatur-Shortcuts

| Taste | Aktion |
|---|---|
| 1 - 9 | Lieblings-Temperatur setzen |
| Space | Heizer ein/aus |
| B | Ballon füllen |
| D | Direkt-Zug starten |
| V | Status vorlesen |
| ESC | Notaus (Heizer + Pumpe aus) bzw. Modal schließen |

## Was war vorher

- **v4.7** (18 Features): Audio (Soundscape, Binaural, Atmung), Lernen (Glossar 21 Begriffe, Vapor-Wissenschaft, Quiz), Kontext (Wetter, Mond, Saison), Medizinisch (Symptome, T-Break, Konsum-PDF), Soziales (Multi-User, Shared Session, Bibliothek)
- **v4.6** (22 Features): Großschrift, Hochkontrast, Tastatur-Shortcuts, Voice-Readout, PIN, Auto-Lock, Bags-Limit, Forget-Me, AES-Encryption, Reinigungs-Reminder, Sieb-Counter, Service-Log, Loops, Variablen, Timeline, 12 Achievements, Streak, Sortennamen-Generator, Vape-Buddy, Easter Eggs
- **v4.5** (25 Features): Umbenannt auf „Sessions", Geräte-Capabilities, Quick-Actions, Pre-Heat, Auto-Cool, Step-Templates, 57 Sorten, 6 Themes, Multi-Geräte, Replay, Favoriten, Smart-Defaults, PWA-Update, Heizkurven, Notfall-Diagnose

## Phase 1 Abschluss

Mit v4.8 ist die App **Feature-vollständig** für den Single-File-Browser-Ansatz. Was in dieser Architektur noch ginge: 3D-Volcano-Visualisierung (Three.js, ~600 KB extra) — auf v4.9 verschoben falls gewünscht.

## Phase 2 (jetzt machbar)

Mit dem HA-YAML-Export aus v4.8 ist die Brücke gebaut:

- Raspberry Pi 4 (4 GB) ~75 €
- Home Assistant OS
- HACS → Chuffnugget volcano_integration (BLE-Native Bridge)
- Lovelace-Dashboard mit Sessions-Programmen als Scripts
- Nabu Casa Cloud (5,40 €/Monat) ODER eigene AWS Lambda für Alexa Smart Home Skill

Sag Bescheid wenn Phase 2 als nächstes startet.

## Plattform-Kompatibilität

| Feature | Android Chrome | Desktop Chrome | Bluefy iOS | Safari iOS |
|---|---|---|---|---|
| Bluetooth | ✅ | ✅ | ✅ | ❌ |
| Sprachsteuerung | ✅ | ✅ | eingeschr. | ❌ |
| Soundscapes | ✅ | ✅ | ✅ | ✅ |
| Wetter / Geolokation | ✅ | ✅ | ✅ | ✅ |
| Web Crypto / PIN | ✅ | ✅ | ✅ | ✅ |
| MQTT (WebSocket) | ✅ | ✅ | ✅ | ✅ |
| Webhook | ✅ | ✅ | ✅ | ✅ |
| Speech Synthesis | ✅ | ✅ | eingeschr. | ✅ |

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt. **Niemals unbeaufsichtigt füllen.**
