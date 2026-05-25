# Sessions — S&B Vape Controller (v4.9)

Web-App zur Steuerung von Storz & Bickel Vaporizern (Volcano Hybrid, Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML PWA, ~358 KB, mobile-first, accessibility-zentriert.

## Was ist neu in v4.9 — Polishing & Reorganization

Kein Feature-Add — Aufräumen, Bedienkonzept und A11y-Audit.

### Settings-Modal komplett umstrukturiert

Aus 11 Sektionen untereinander wurden **6 Sub-Tabs** mit klarer Gliederung:

- **🎨 Stil** — Theme-Picker (Dark, Light, Lava, Forest, Cosmos, Paper)
- **♿ Inklusion** — Blinden-Modus prominent in orangener Box, Schriftgröße, Hochkontrast, Voice-Readout, Tooltip-TTS, Haptik, Tastatur-Shortcuts-Übersicht
- **🔒 Sicherheit** — Sicherheits-Timer, PIN, Auto-Lock, Tageslimit Ballons, Hotel-Modus, Akku-Spar-Modus
- **🛠 Workflow** — Direkt-Zug-Sekunden, Auto-Cool-Down, Sound, Haptik, Ballon-Profile, Wartungs-Schwellen, Firmware
- **🚀 Erweitert** — Sprachsteuerung (mit Sub-Befehlen als ausklappbares Details), Vape-Buddy, Sortennamen-Generator, Webhook, MQTT
- **💾 Daten** — JSON-Backup, CSV-Export, Diagnose, Encryption, Forget-Me

Statt 600px langem Scrollen jetzt klare 6-Wege-Navigation. Tabs sind horizontal scrollbar auf schmalen Bildschirmen.

### Setup-Tab strukturiert

Section-Header gliedern jetzt den langen Tab in **5 visuelle Blöcke**:

- **📱 Gerät** — Aktives Gerät (Device-Picker)
- **📊 Übersicht** — Heute-Kontext, T-Break, Statistik, Wartung
- **🛠 Werkzeuge** — Tools-Karte, App-Einstellungen
- **🔧 Erweitert** — Eigene Geräteprofile
- **📡 Verbindung & Debugging** — Bluetooth, UUID-Mapping

Section-Header sind mit Trennlinie und Großschrift-Mono-Text gestaltet — klare visuelle Trennung ohne extra Modals.

### A11y-Audit Verbesserungen

- **Focus-Trap in allen Modals**: Tab geht zyklisch durch alle fokussierbaren Elemente, Shift-Tab rückwärts. Erstes Element wird beim Öffnen automatisch fokussiert
- **Focus-Wiederherstellung**: beim Modal-Schluss wird der Fokus zurück zum Trigger-Knopf gesetzt
- **`aria-current="page"`** für aktiven Bottom-Nav-Tab — Screenreader sagt jetzt explizit „aktuelle Seite"
- **Backdrop-Click schließt Modals**: einheitlich für alle Modals via MutationObserver
- **`focus-visible` outline** konsistent für alle interaktiven Elemente (2px hot, 2px offset)
- **ARIA-Labels** zusätzlich auf allen Form-Inputs in den Settings
- **Voice-Sub-Befehle als `<details>`** statt versteckter Toggle-Liste — semantisch korrekter und screenreader-freundlich

### Polishing

- **HA-YAML-Button 🏠 auf jeder Programm-Karte** — direkter Export ohne DevTools-Trick (war v4.8 noch nicht im UI)
- **Empty-State für Programme-Tab** — wenn keine eigenen Programme: schöne Karte mit Icon, Hinweis-Text und Tipp
- **Settings-Tab-Wechsel mit Fade-Animation** — sanfte 200ms-Transition zwischen Tabs
- **Card-Hover** mit border-color Transition
- **Hover-States** konsistent für alle Buttons und Toggles

### Bedienkonzept-Änderungen

- Topbar-`?` öffnet das **Manual** (statt Wizard, der nur einmal beim Start nötig ist)
- **Onboarding-Wizard erneut zeigen**-Knopf bleibt in Settings → Daten
- Settings-Modal kann per **Backdrop-Tap** geschlossen werden (auch bei allen anderen Modals)
- **Notaus per ESC** funktioniert global, auch wenn Modal offen ist (schließt zuerst Modal)

## Was war in v4.8

15 Features: Manual mit 10 Kategorien, Blinden-Modus, Tooltips überall, Hotel-Modus, Akku-Spar, Offline-Indikator, Custom BLE-Profile, Raw BLE-Console, DSL-Editor, HA-YAML-Export, Webhook, MQTT.

## Plattform-Kompatibilität (unverändert)

| Plattform | Web Bluetooth | TTS | Web Crypto | MQTT |
|---|---|---|---|---|
| Android Chrome | ✅ | ✅ | ✅ | ✅ |
| Desktop Chrome/Edge | ✅ | ✅ | ✅ | ✅ |
| Bluefy iOS | ✅ | eingeschr. | ✅ | ✅ |
| Safari iOS | ❌ | ✅ | ✅ | ✅ |

## Was zu testen ist

1. **Settings öffnen** → 6 Tabs oben sichtbar → durchklicken
2. **Tab-Wechsel mit Tastatur** → Settings öffnen → Tab durch die Sub-Tabs
3. **Backdrop-Click** in jedem Modal sollte schließen
4. **Empty-Programme** → Programme-Tab → wenn keine eigenen: schöne Empty-State sichtbar
5. **HA-YAML pro Programm** → Programme-Tab → 🏠 auf einer Programm-Karte → YAML-Datei
6. **Section-Header im Setup** → Setup-Tab scrollen → 5 visuelle Abschnitte erkennbar
7. **Focus-Trap** → Modal öffnen, Tab durchgehen, sollte zyklisch sein
8. **aria-current** → Screenreader-Test: aktiver Bottom-Tab wird als „current page" angesagt

## CC: detaillierte Funktionsprüfung nach Deploy

Andre möchte nach v4.9 eine vollständige Funktionsprüfung von CC. Vorschlag-Liste für CC:

### Verbindung
- [ ] BLE-Connect zu Volcano via Bluefy (iPhone)
- [ ] Device-Picker im Hero (Volcano/Crafty/Mighty/Venty Wechsel)
- [ ] Auto-Mapping nach Connect
- [ ] Reconnect nach Trennung

### Steuerung
- [ ] Temperatur per Stepper, Pills, Slider, Voice setzen
- [ ] Heizer an/aus (per Knopf, Space, Voice)
- [ ] Direkt-Zug (Quick-Action im Hero)
- [ ] Ballon füllen mit Easy Valve groß/klein, Solid, Custom
- [ ] Pre-Heat-Timer mit Live-Countdown

### Programme
- [ ] Vorlage starten, bearbeiten, zurücksetzen
- [ ] Eigenes Programm erstellen, Schritte hinzufügen, sortieren, löschen
- [ ] Template einfügen, Loop, Variable {temp}
- [ ] Timeline-Ansicht im Editor
- [ ] Programm per QR teilen
- [ ] HA-YAML-Export pro Programm (🏠-Button)
- [ ] DSL-Editor: Script schreiben, parsen, speichern
- [ ] Session-Replay (letztes nochmal)

### Sicherheit
- [ ] Sicherheits-Timer auto-start
- [ ] PIN setzen, App neu öffnen → PIN-Abfrage
- [ ] Auto-Lock nach X Minuten
- [ ] Tageslimit Ballons funktioniert
- [ ] Forget-Me löscht wirklich alles

### Accessibility
- [ ] **Blinden-Modus** aktiviert alle Features
- [ ] Tastatur-Shortcuts (1-9, Space, B, D, V, ESC)
- [ ] Voice-Status-Readout (V drücken)
- [ ] Tooltips per Long-Press (Mobile)
- [ ] Tooltips per TTS bei Tab-Fokus
- [ ] Großschrift 125%, 150%
- [ ] Hochkontrast
- [ ] **Focus-Trap in Modals** — Tab geht zyklisch
- [ ] **aria-current** auf aktivem Bottom-Tab
- [ ] **Backdrop-Click** schließt Modals

### Audio
- [ ] Soundscapes (5 Stimmungen)
- [ ] Binaural Beats (5 Presets) mit Kopfhörern
- [ ] 4-7-8 Atemübung

### Wissen
- [ ] Glossar mit 21 Einträgen
- [ ] Verdampfungs-Diagramm
- [ ] Quiz mit 5 zufälligen Fragen

### Kontext
- [ ] Wetter via Geolokation
- [ ] Mondphase
- [ ] Tageszeit-/Saison-Empfehlung

### Medizinisch
- [ ] Symptom-Tracker vor + nach Session
- [ ] T-Break starten, Tagezähler, Bestätigung beim Bag-Fill
- [ ] Konsum-Protokoll als PDF (öffnet im neuen Tab)

### Soziales
- [ ] Multi-User-Profile anlegen, wechseln
- [ ] Programm-Bibliothek per URL importieren

### Wartung
- [ ] Reinigungs-Reminder feuert
- [ ] Sieb-Wechsel-Counter
- [ ] Service-Log

### Engagement
- [ ] Achievements (12 Stück)
- [ ] Streak-Counter
- [ ] Konami-Code freischaltet
- [ ] Sortennamen-Generator
- [ ] Vape-Buddy

### Erweitert
- [ ] Custom BLE-Profile anlegen
- [ ] Raw BLE-Console: Hex schreiben/lesen
- [ ] Webhook bei Heizer-an POST
- [ ] MQTT-Connect zu Broker

### Reise-Modi
- [ ] Hotel-Modus, 5s-Entsperrung
- [ ] Akku-Spar-Modus blendet Buddy/Graph aus
- [ ] Offline-Banner wenn netz aus

### Polishing
- [ ] Settings-Sub-Tabs alle erreichbar
- [ ] Setup-Tab-Sektionen sichtbar
- [ ] Fade-Animation bei Tab-Wechsel
- [ ] Backdrop-Click in allen Modals
- [ ] Focus-Trap in allen Modals
- [ ] Help-Knopf öffnet Manual
- [ ] Empty-State bei leeren Programmen
- [ ] HA-YAML-Button auf Programm-Karten
- [ ] Wetter network-first (frische Daten)

## Roadmap nach v4.9

**Phase 2** kann jetzt starten:
- Raspberry Pi 4 + Home Assistant
- HACS → Chuffnugget volcano_integration
- Lovelace-Dashboard
- HA-YAML-Export aus Sessions als Programm-Brücke
- Optional: Nabu Casa Cloud (5,40 €/M) für Alexa-Skill

oder **v4.10** mit 3D-Volcano-Visualisierung (Three.js, optional dynamisch geladen).

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt. **Niemals unbeaufsichtigt füllen.**
