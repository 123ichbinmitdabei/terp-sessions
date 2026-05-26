# 🔄 Übergabe an neuen Chat — Sessions PWA (Andre, Mariana Cannabis)

> **Stand: Dienstag, 26. Mai 2026** — kopiere diese Datei komplett in den ersten Prompt des neuen Chats. Damit kann der neue Claude nahtlos weiterarbeiten.

---

## 🎯 Sofort-Status: Wo wir gerade stehen

**Aktuell offene Versionen:**
- **v4.9.7** ist gepusht, aber GitHub Pages hängt seit >20 Min im `building`-Status. CC hat lokal gegen v4.9.7-Dateien getestet: **alle Tests grün** (Tour 8/8 Schritte durchklickbar, Settings-Tabs deutlich sichtbar, Regression 23/23). Sobald Pages durch ist, ist v4.9.7 live.
- **v4.9.8** (neu, dieser Chat) ist als ZIP in Andre's Downloads als `volcano-controller-v4.9.8.zip` — **noch nicht deployt**. Wartet auf v4.9.7-Live-Bestätigung, dann gleicher Deploy-Flow.

**Nächste Schritte:**
1. ⏳ Auf GitHub Pages warten bis v4.9.7 live (CC's Watcher läuft im Hintergrund)
2. ✅ Nach v4.9.7-Live: CC's Live-Verifikation gegen Live-URL
3. 🚀 v4.9.8 deployen (Session-Scheduler)
4. 🚀 Danach: **v5.0 = Crafty/Mighty/Venty BLE-Implementierung** (Andre hat OK gegeben "wenn alles okay ist dann 5.0"). Andre muss vorher sagen welches Gerät er physisch hat zum Testen.

---

## 📋 Andre's Kontext

- **Wer:** Andre, arbeitet bei **Mariana Cannabis** (Cannabis Social Club Umbrella-Organisation in Deutschland)
- **Wo:** Marburg-Area, Hessen
- **Sprache:** Deutsch, kurze Feedback-Schleifen, erwartet dass Claude eigenständig die Fixes erkennt
- **Wichtig:** Em-Dashes (—) in deutscher Prosa durch Kommas ersetzen
- **Test-Setup:** iPhone mit Bluefy-Browser (für Web Bluetooth auf iOS)
- **Deploy-Workflow:** Andre lädt ZIP runter → entpackt → CC (Claude Code) macht git add/commit/push + pollt Pages-Build automatisch

---

## 🏗 Sessions PWA — Projekt-Übersicht

**Was:** Web-App zur Steuerung von Storz & Bickel Vaporizern (Volcano Hybrid + geplant Crafty/Mighty/Venty) über Web Bluetooth

**Tech:** Single-File HTML PWA, Service Worker, LocalStorage
- **Aktuelle Größe:** ~432 KB (v4.9.8)
- **Repo:** github.com/MarianaCannabis/volcano (privater Push, public GitHub Pages)
- **Live-URL:** https://marianacannabis.github.io/volcano/
- **Lokales Arbeitsverzeichnis (Andre):** `C:\Users\Nutzer\Downloads\volcano-controller-v4\`

**Dateien:**
- `index.html` — die ganze App (~10.500 Zeilen)
- `sw.js` — Service Worker mit Cache-Strategie
- `manifest.json` — PWA-Manifest
- `icon-192.png`, `icon-512.png`
- `README.md` — Changelog pro Version

---

## 📐 BLE-UUIDs (verifiziert für Volcano)

```
Volcano Hybrid:
  Service State:   10100000-5354-4f52-5a26-4249434b454c
  Service Control: 10110000-5354-4f52-5a26-4249434b454c
  setTemp:         Uint32 LE × 10
  curTemp:         Uint16 LE / 10
  activity bitmask: HEAT=0x0020, AUTO_OFF=0x0200, PUMP=0x2000
  heaterOn/Off:    10110003-...-0014
  pumpOn/Off:      ähnlich

Crafty/Mighty (für v5.0, noch nicht implementiert):
  Service:         00000001-4c45-4b43-4942-265a524f5453

Venty (für v5.0):
  Service:         00000000-5354-4f52-5a26-4249434b454c
  (mit Boost-Mode)
```

---

## 🎨 Aktuelle Feature-Landschaft (Stand v4.9.8)

| Bereich | Status |
|---|---|
| **BLE-Steuerung Volcano** | ✅ vollständig (heizen, pumpen, temp setzen, status lesen) |
| **BLE Crafty/Mighty/Venty** | ❌ nur UUIDs hinterlegt, keine echte Kommunikation (= v5.0) |
| **Programme** | ✅ Vorlagen + Editor + DSL + Steps/Loops + Tooltips pro Programm |
| **Quick-Actions** | ✅ Direkt-Zug, Ballon-Füllen, **⏱ Timer (Session-Scheduler in v4.9.8)**, Aroma |
| **Session-Scheduler (v4.9.8)** | ✅ Heizen/Programm + in X Min/zu Uhrzeit + einmalig/täglich/Mo-Fr/Sa+So/eigene Tage |
| **Ballon-Volumen-Rechner (v4.9.3)** | ✅ Profile mit Länge/Durchmesser/Pumpleistung, Kalibrierung |
| **URL-Sprachsteuerung (v4.9.4)** | ✅ 12 Commands für Siri Shortcuts / Google Routinen |
| **Onboarding-Tour (v4.9.6, fixed v4.9.7)** | ✅ 8 Schritte mit Spotlight, Auto-Start beim ersten Mal |
| **Mobile-Gesten (v4.9.6)** | ✅ Swipe für Tab-Wechsel, Long-Press Hero für TTS |
| **Universal-Tooltips (v4.9.6)** | ✅ data-tip + aria-label + MutationObserver für dynamische Elemente |
| **Einklappbare Cards (v4.9.5)** | ✅ State in LocalStorage |
| **Responsive Layout (v4.9.5)** | ✅ <760px / 760-1100px / >1100px Breakpoints |
| **Schriftgröße via zoom (v4.9.5)** | ✅ funktioniert wirklich (statt fontSize-Bug) |
| **Blindenmodus (v4.9.5)** | ✅ alle 7 Toggle-UI-States werden synchron gehalten |
| **Settings-Tabs deutlich (v4.9.7)** | ✅ Hinweis-Text + orange Active-Tab + Fade-Gradient + Scroll-Snap |
| **Pre-Heat-Fix (v4.9.6)** | ✅ Anzeige verschwindet vollständig bei Cancel |
| **Accessibility (Focus-Trap, aria-label, ESC, Tastatur-Shortcuts)** | ✅ vollständig |
| **Sicherheit (PIN, Auto-Lock, Limits, AES-Encryption, Forget-Me)** | ✅ |
| **Wartung (Reinigung, Sieb, Service-Log)** | ✅ |
| **Medizinisch (Symptome, T-Break, PDF-Protokoll)** | ✅ |
| **Audio (Soundscapes, Beats, Atmung)** | ✅ |
| **Wissen (Glossar, Quiz, Diagramm)** | ✅ |
| **HA-YAML-Export** | ✅ pro Programm |
| **Externe Integration (Webhook, MQTT)** | ✅ |
| **Themes** | ✅ 6 Stück |
| **Manual mit Such-Funktion** | ✅ 10 Kategorien |
| **Plattform-Banner (iOS-Safari → Bluefy-Hinweis)** | ✅ |

---

## 🔬 Verifizierte Commit-Hashes

| Version | Commit | Status |
|---|---|---|
| v4.9.2 | d08ce32 | live |
| v4.9.3 | (mit v4.9.4 kombiniert) | live |
| v4.9.4 | f064d18 | live |
| v4.9.5 | 02935d3 | live |
| v4.9.6 | 710cea8 | live |
| **v4.9.7** | **b6b92b8** | ⏳ gepusht, Pages-Build hängt seit >20 Min |
| **v4.9.8** | — | 📦 ZIP fertig, noch nicht gepusht |

---

## 📦 v4.9.8 Inhalt (was im ZIP ist, noch nicht deployt)

**Pre-Heat → vollwertiger Session-Scheduler:**
- Quick-Action umbenannt von „Pre-Heat" zu „⏱ Timer"
- Neues Modal `#modalSchedule` mit Liste aller Schedules
- Neues Modal `#modalScheduleEditor` mit Aktion/Trigger/Wiederholung-Settings
- **Datenmodell:** Array `SCHEDULES` in LocalStorage `vol_schedules`
- **Aktion:** `{type:'heat', temp}` oder `{type:'program', progId}`
- **Trigger:** `{type:'in', mins}` oder `{type:'at', hour, minute}`
- **Wiederholung:** `'once'` / `'daily'` / `'weekdays'` / `'weekends'` / `'custom'` + `customDays[0-6]`
- **Engine:** `scheduleTick()` alle 30 Sek, `computeNextRun()` berechnet Trigger-Datum (sucht 14 Tage voraus)
- **Hero-Anzeige** zeigt nächsten anstehenden Schedule
- **URL-Commands:** `?cmd=preheat` erzeugt jetzt einen Schedule, neuer `?cmd=schedule` öffnet Modal
- **Tour-Step** für Timer eingefügt
- **Manual-Sektion** für Session-Planer ergänzt

**Deploy-Anweisung für CC (wenn v4.9.7 grün):**
```
Update auf v4.9.8:
1) ZIP: C:\Users\Nutzer\Downloads\volcano-controller-v4.9.8.zip
2) Entpacken, 6 Dateien in den Volcano-Ordner kopieren
3) git add . && git commit -m "v4.9.8: Pre-Heat zu vollwertigem
   Session-Scheduler ausgebaut. Quick-Action umbenannt in Timer.
   Aktionen: Heizen oder Programme. Trigger: in X Min oder zu Uhrzeit.
   Wiederholung: einmalig/täglich/Mo-Fr/Sa+So/eigene Wochentage.
   Multi-Schedule mit Liste, Editor, Toggle-Switches. Hero zeigt
   nächsten anstehenden Schedule. Tour-Step ergänzt. URL-Commands
   preheat erzeugen jetzt Schedules, neues schedule-Command."
4) git push
5) Pages-Build pollen bis built, HTTP-Check
6) Status melden
```

---

## 🛠 Etablierte Technische Patterns

**Code-Stil:**
- Single-File HTML mit inline `<script>` und `<style>`
- CDN nur für Fraunces / Inter Tight / IBM Plex Mono + api.qrserver.com (QR)
- `PREFS` Objekt mit `PREFS_DEFAULTS`, gespeichert via `LS.set('vol_prefs')`
- `LS.set/get` als Helper für LocalStorage
- `$()` als querySelector-Shortcut
- `escapeHtml()` für alle User-Eingaben in innerHTML
- `clamp(v, min, max)` für numerische Bounds
- `toast(msg)` für UI-Feedback (2.2s sichtbar)
- `ttsSay(text)` für deutsche TTS
- `haptiPattern(name)` für Haptik

**Bekannte Bugs / Patterns aus Erfahrung:**
- **ASCII-Closing-Quote `"` nach deutschem `„`** in JS-Strings bricht den Parser. **IMMER Unicode `"` (U+201D) nutzen.** Recurring critical bug!
- Nach JS-Änderung IMMER `node --check` laufen lassen
- 184 hardcoded `font-size:Npx` im CSS → daher `applyFontScale` über CSS `zoom` (in v4.9.5 gefixt)
- Service Worker darf `fonts.googleapis.com` NICHT intercepten (ORB-Block, in v4.9.4 gefixt)
- `<link rel="stylesheet" crossorigin="anonymous">` auf Google Fonts (v4.9.4)
- Tour-Scroll-Endlosschleife bei Rand-Elementen (top<80) → `_tourScrollRetried` Flag + nur bei echter Off-Screen scrollen (v4.9.7)
- Settings-Tabs brauchen Hinweis-Text + orange Active-State damit User die zusätzlichen Tabs entdecken (v4.9.7)

**SQL/Supabase (für andere Andre-Projekte):**
- SECURITY DEFINER für anon-Access
- Unique dollar-tags für multi-function SQL
- JSONB-Arrays für sub-data

**Schedule-Engine (v4.9.8) Pattern:**
- Tick alle 30 Sek
- `computeNextRun()` sucht über 14 Tage den nächsten passenden Wochentag
- Verpasste Schedules (>5 Min vorbei): überspringen + recompute
- Bei „once": disable nach Trigger; bei recurring: recompute

---

## 🔎 Letzte Andre-Feedback-Punkte (Status)

| Feedback | Status |
|---|---|
| Schriftgröße ging nicht | ✅ v4.9.5 (zoom) |
| Blindenmodus nur Sprache | ✅ v4.9.5 (syncToggle) |
| Mikrofon service-not-allowed | ✅ v4.9.5 (klare Fehlermeldung mit Workaround) |
| Tooltips funktionieren nicht | ✅ v4.9.5 + v4.9.6 (universal data-tip + dynamic) |
| Bottom nicht voll sichtbar | ✅ v4.9.5 (220px padding) |
| Kacheln einklappbar | ✅ v4.9.5 |
| Responsive | ✅ v4.9.5 (Tablet/Desktop Breakpoints) |
| Pre-Heat Cancel UI bleibt | ✅ v4.9.6 + v4.9.8 (geht durch Schedule-System) |
| Tooltips auch für Programme | ✅ v4.9.6 |
| Anleitung wie ein Assistent | ✅ v4.9.6 (Tour) + v4.9.7 Bug-Fix |
| Mobile-Equivalent für Tastatur | ✅ v4.9.6 (Swipe + Long-Press) |
| Settings-Tabs sichtbar machen | ✅ v4.9.7 |
| Tour-Bug Schritt 2 | ✅ v4.9.7 |
| Pre-Heat als Timer mit Wiederholung/Wochenplan | ✅ v4.9.8 |

**Noch offen für v5.0:**
- Andere Geräte (Crafty/Mighty/Venty) sollen alle funktionieren
- Andre's letzter Satz: "wenn alles okay ist dann 5.0"

---

## 🚀 v5.0 Vorbereitungs-Plan (für neuen Chat)

**Wenn Andre OK gibt, das ist der Plan:**

1. **Volcano-Logik kapseln** in eine `DeviceAdapter`-Klasse mit Interface:
   - `connect()`, `disconnect()`
   - `setTemp(t)`, `getTemp()`
   - `heaterOn()`, `heaterOff()`
   - `pumpOn()`, `pumpOff()`
   - `capabilities` (Ballon, Boost, Battery, etc.)

2. **Crafty/Mighty-Adapter** mit Service `00000001-4c45-4b43-4942-265a524f5453`
   - Recherchieren welche Chars zum Schreiben/Lesen
   - Akku-Status zusätzlich (Battery Service)
   - Andere Encoding-Varianten (Big-Endian vs Little-Endian je nach Char)

3. **Venty-Adapter** mit Service `00000000-5354-4f52-5a26-4249434b454c`
   - Boost-Mode-Support
   - Schnellere Heiz-Kurve berücksichtigen

4. **Auto-Detection beim BLE-Connect**: erkennt Gerätetyp anhand der angebotenen Services

5. **Capabilities-System aktualisieren**:
   - Ballon-Füllung nur für Volcano (Quick-Action ausblenden bei anderen)
   - Boost-Mode nur für Venty (eigener Quick-Action)
   - Akku-Anzeige für Crafty/Mighty/Venty

6. **State-Erweiterung**: `State.device.type` + `State.device.battery` + `State.device.boost`

**Was Andre vor v5.0 klären muss:**
- Welches Gerät hat er physisch verfügbar zum Testen? (Crafty/Mighty/Venty)
- Hat er es schon mal mit der offiziellen S&B-App gepairt (= UUIDs aktiv)?

**Realistische Erwartung:** v5.0 wird vermutlich 2-3 Iterationen brauchen wegen Trial-and-Error mit den BLE-Chars.

---

## 📂 Andre's Andere Projekte (Memory-Stand)

Andre arbeitet parallel an mehreren Projekten — der Sessions PWA war zuletzt der Hauptfokus, aber im Hintergrund existieren:

- **CSC-Bewerbungen** (csc-bewerbungen, Supabase project gvzayggvtlychyjbnsgv) — pausiert
- **CSC Raumplaner Pro** (csc-raumplaner, Supabase wvkjkdwahsqozeupoxpj) — pausiert
- **Bewährungshilfe-Assistent PWA** (123ichbinmitdabei.github.io/bewaehrungshilfe/) — pausiert
- **Diverse Mariana-Präsentationen** (Hessen, NRW, Community Holding) — abgeschlossen

**Pending für andere Projekte:**
- Bewährungshilfe-Assistent: Digitale Unterschrift hochladen + in Stammdaten speichern

---

## 💬 Erster Prompt für den neuen Chat (Vorschlag)

> Hallo! Ich übergebe von einem alten Chat. Hier ist die vollständige Übergabe-Dokumentation der Sessions-PWA (S&B Vape Controller).
> 
> [→ UEBERGABE.md kopieren]
> 
> Aktueller Stand: v4.9.7 ist gepusht aber GitHub Pages hängt seit >20 Min im Build. v4.9.8 (Session-Scheduler) ist als ZIP fertig und wartet aufs Deploy.
> 
> Bitte erst mal nachsehen ob v4.9.7 inzwischen live ist (`curl -s https://marianacannabis.github.io/volcano/sw.js | grep VERSION`), dann CC sagen entweder v4.9.7 final gegen Live zu verifizieren oder direkt v4.9.8 zu deployen.

---

## 🎯 Sofort-Aktionen für den neuen Chat

1. **Prüfen ob v4.9.7 live ist** — wenn ja: CC für Live-Verifikation, sonst noch warten
2. **v4.9.8 deployen** sobald v4.9.7 grün
3. **v5.0 starten** sobald Andre sagt: welches Gerät er testen will

---

## 📝 Wichtige Anweisungen für den nachfolgenden Claude

- **Sprache:** Deutsch, prägnant, em-Dashes durch Kommas ersetzen
- **Code-Stil:** Single-File-Pattern beibehalten, keine Refactorings ohne Grund
- **Quote-Fallen:** ASCII `"` nach deutschem `„` in JS-Strings vermeiden — immer Unicode `"`
- **Pro Änderung:** `node --check` ausführen
- **Pro Version:** Version-String in `index.html` Log + `sw.js VERSION` + README aktualisieren
- **Deploy-Format:** ZIP mit allen 6 Dateien (index.html, sw.js, manifest.json, icon-192.png, icon-512.png, README.md)
- **Test-Skripte:** Headless-Chrome-Artefakte erkennen (TTS-spy auf Utterance-Konstruktor, Tour-Timing >900ms, Pre-Heat-Prompts bypass)
- **Bei vollwerdendem Chat:** PROAKTIV neue Übergabe vorschlagen

