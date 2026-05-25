# Volcano Hybrid Controller v4.3

Web-App zur Steuerung des Storz & Bickel Volcano Hybrid (und in Beta: Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML, PWA-fähig, mobile-first, mit interaktivem Onboarding, Screenreader-Unterstützung und Wake Lock.

## Was ist neu in v4.3

**Mobile-Optimierung (iOS / Bluefy / Android)**

- Bottom-Nav klebt jetzt mit Mindest-Abstand zum iPhone Home-Indicator und Bluefy-Toolbar (`--safe-bot-padding: max(env(safe-area-inset-bottom), 16px)`)
- Viewport-Höhe `100dvh` statt `100vh`, damit die Adressleiste der Browser keine Inhalte mehr abschneidet
- Run-Card und Toasts orientieren sich an der Safe Area
- `viewport-fit=cover` und `user-scalable=yes` für Zoom-Fähigkeit

**Vollständige Screenreader-Unterstützung (VoiceOver / TalkBack)**

- `lang="de"` Attribut, semantisches HTML mit `<main role="main">`, `<header role="banner">`, `<nav role="tablist">`
- Skip-Link „Zum Hauptinhalt springen" für Tastatur-Nutzer (oben links beim Fokussieren)
- Zwei dedizierte aria-live Regionen: `polite` für Status-Updates, `assertive` für kritische Meldungen
- aria-labels und aria-pressed an allen Buttons (Heizer-Toggle, Pumpe-Toggle, Tab-Navigation)
- Modals mit `role="dialog" aria-modal="true"` und beschreibendem aria-label
- Progressbar mit `role="progressbar" aria-valuemin/max/now` für Programm-Fortschritt
- Sichtbare Fokus-Indikatoren (gelber Ring auf allen interaktiven Elementen)
- Indicator-Status werden in aria-label aktualisiert: „Heizer: an" / „Heizer: aus"
- Bei Erreichen der Zieltemperatur: gesprochene Ankündigung
- Bei Verbindungsproblemen: gesprochene Warnung

**Neue Features**

- **Wake Lock**: das Display schaltet sich während aktivem Heizer und laufenden Programmen nicht ab (`navigator.wakeLock.request('screen')`). Re-acquire bei visibility change.
- **Audio + Haptic Feedback**: zweistimmiger Chime und Vibration bei Erreichen der Zieltemperatur
- **Live-Temperatur-Graph** im Hero: letzte 5 Minuten als SVG-Linie mit Gradient-Fill, dynamische min/max-Labels
- **Aufheiz-Schätzung (ETA)**: „noch 28s bis 185°C" basierend auf der Heizrate der letzten 60 Sekunden
- **Auto-Reconnect**: bei BLE-Abbruch 3 automatische Versuche mit 2s Backoff
- **Reach-Flash**: visuelle Bestätigung „185°C erreicht" wenn das Ziel zum ersten Mal erreicht wird

**Design-Refresh**

- Neue Typografie: **Fraunces** (Variable, character-volle Display-Schrift) für Überschriften und große Werte, **Inter Tight** für Body, **IBM Plex Mono** für Mono-Sektionen
- Mineralische Erd-Tones: tieferes Schwarz mit warmen Brauntönen, Lava-Orange Akzent
- Subtile Grain-Textur als Overlay für Atmosphäre
- Animierte Heat-Waves im Hero wenn der Heizer aktiv ist
- Verstärkte Glow-Effekte am Wert in Abhängigkeit der Heat-Level
- Bessere Karten-Hierarchie mit dekorativen Trennlinien
- `prefers-reduced-motion` wird respektiert (alle Animationen abgeschaltet wenn aktiv)

## Was war neu in v4.2

- Kritischer Bug-Fix: korrekte UUIDs für Heater/Pumpe (separate Chars für On/Off statt einer Char mit Wert)
- Temperatur als Uint32 LE × 10
- „Letzte Aktion"-Banner und Mini-Log im Steuerung-Tab
- Auto-Mapping mit Trefferzahl

## Was war neu in v4.1

- Interaktiver 9-Slide Beginner-Wizard
- iOS-Erkennung mit Bluefy-Hinweis
- Geräte-Auswahl mit Profilen für Volcano, Crafty, Mighty, Venty
- Kontextuelle Hilfe-Buttons

## Voraussetzungen

| Plattform | Browser | Funktioniert? |
|---|---|---|
| Android | Chrome | ✅ ja |
| Windows / macOS / Linux | Chrome oder Edge | ✅ ja |
| iPhone / iPad | **Bluefy** (App Store, kostenlos) | ✅ ja, nur dort |
| iPhone / iPad | Safari, Chrome iOS, Firefox iOS | ❌ Apple sperrt Web Bluetooth |

## Live-URL

https://marianacannabis.github.io/volcano/

## Welche Geräte funktionieren

Jeder Volcano Hybrid weltweit (UUIDs sind über die Firmware-Versionen stabil). Genauso jeder Crafty / Crafty+ / Mighty / Mighty+ mit Bluetooth (Beta). Venty ist experimentell, das Protokoll unterscheidet sich. Du musst immer in ca. 2-5 m BLE-Reichweite sein.

## Workflow-Aktionen

- `heat_on` / `heat_off`
- `pump_on` / `pump_off`
- `pump_for { seconds }`
- `set_temperature { value }`
- `wait_until { value }` (bis Temp erreicht, max 240s)
- `wait { seconds }`

## Sicherheit

- Volcano niemals unbeaufsichtigt lassen.
- Sicherheits-Timer schaltet nach X Minuten Heizer + Pumpe automatisch aus.
- Bei Programmfehler werden Heizer und Pumpe automatisch abgeschaltet.
- Wake Lock hält das Display an, damit Programme nicht durch System-Schlaf unterbrochen werden.
- `prefers-reduced-motion` wird respektiert (für Menschen mit Bewegungs-Empfindlichkeit).

## Roadmap (potentielle v4.4+ Ideen)

Diese Features sind im Code vorgesehen aber noch nicht implementiert, du wählst nach v4.3 welche du willst:

- **Session-Statistiken**: Ballons-Counter, Total Heizdauer pro Session, Energie-Verbrauch
- **Voice Control**: Web Speech API für „Heize auf 185 Grad"
- **QR-Code-Share** von Programmen für Geräte-übergreifende Vorlagen
- **Aroma-Datenbank**: Cannabissorten mit empfohlenen Temperaturen
- **Notizen pro Session**: was war drin, Bewertung, Stimmung
- **Programm-Estimated-Duration** im Editor
- **Drag-Reorder** für Workflow-Schritte
- **Light-Mode** als optionaler Toggle
- **PWA-Sync** mit lokalem Speicher-Backup

## Quelle der UUIDs

UUIDs und Write-Formate sind verifiziert gegen `firsttris/reactive-volcano-app` (CC BY-NC 4.0). Die UUIDs selbst sind technische Fakten über die Geräte-Firmware. Unsere App ist eine eigenständige Implementation mit eigener UX.
