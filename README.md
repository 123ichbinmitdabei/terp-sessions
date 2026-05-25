# Sessions — S&B Vape Controller (v4.9.4)

Web-App zur Steuerung von Storz & Bickel Vaporizern (Volcano Hybrid, Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML PWA, ~385 KB, mobile-first, accessibility-zentriert.

## Was ist neu in v4.9.4 — Siri / Google Assistant + Plattform-Polishing

### URL-Command-System für Sprachsteuerung

App reagiert jetzt auf URL-Parameter `?cmd=...`. User kann Siri-Kurzbefehle oder Google-Routinen anlegen, die diese URLs öffnen. Beim Aufruf führt die App den Befehl aus.

| Command | URL | Wirkung |
|---|---|---|
| Heizer an | `?cmd=heat-on` | Heizer einschalten |
| Heizer aus | `?cmd=heat-off` | Heizer ausschalten |
| Pumpe an/aus | `?cmd=pump-on` / `pump-off` | Pumpe steuern |
| Temperatur | `?cmd=set&temp=185` | Auf 185°C setzen |
| ±1°C | `?cmd=temp-up` / `temp-down` | Stufenweise |
| Ballon füllen | `?cmd=fill` | Aktueller Ballon |
| Direkt-Zug | `?cmd=direct` | Pumpe X Sek |
| Notaus | `?cmd=stop` | Heizer + Pumpe aus |
| Status | `?cmd=status` | TTS-Status vorlesen |
| Programm | `?cmd=program&name=Sativa` | Programm starten by Name (Substring-Match) |
| Pre-Heat | `?cmd=preheat&temp=185&min=10` | In X Min auf Y°C |

**TTS-Feedback:** App spricht jeden Befehl deutsch quittierend („Heizer an", „Temperatur 185 Grad", „Direktzug läuft").

### Siri-Shortcut Anleitung im Manual + im Modal

**Setup → Werkzeuge → 🎙 Sprach-Shortcuts** öffnet ein Modal mit:
- Schritt-für-Schritt-Anleitung für iOS (Kurzbefehle-App)
- Schritt-für-Schritt-Anleitung für Android (Google Assistant, Tasker)
- Voraussetzungen (Volcano muss schon einmal gepairt sein, Browser muss BLE können)
- Vollständige Liste aller Befehl-URLs mit „URL kopieren"-Buttons

Auch in Settings → Erweitert → Siri / Google Assistant zugänglich.

### Plattform-Erkennung + Compatibility-Banner

App erkennt:
- iOS Safari → Banner mit Hinweis auf Bluefy für BLE-Funktionen
- Android Chrome, Desktop Chrome/Edge, Bluefy iOS → kein Banner, alle Features
- Andere Browser → Hinweis im BT-Bereich

### Google-Fonts-Fix (CC's Befund aus v4.9.2)

CC hatte den ORB-Bug isoliert: Service Worker hat Google Fonts cache-first behandelt → opaque Response → Browser blockiert CSS. **Zwei Fixes:**

1. **SW-Passthrough**: `fonts.googleapis.com` und `fonts.gstatic.com` werden im SW jetzt explizit NICHT intercepted → Browser lädt direkt mit CORS
2. **`crossorigin="anonymous"`** auf dem Font-Link → echte CORS-Response statt opaque, auch falls SW doch mal greift

Damit sollte Fraunces / Inter Tight / IBM Plex Mono auf allen Plattformen visuell ankommen.

### Plattform-Kompatibilitäts-Matrix (aktualisiert)

| Plattform | App-UI | BLE-Steuerung | TTS | URL-Commands |
|---|---|---|---|---|
| Android Chrome | ✅ | ✅ | ✅ | ✅ |
| Desktop Chrome/Edge | ✅ | ✅ | ✅ | ✅ |
| Bluefy iOS | ✅ | ✅ | eingeschr. | ✅ |
| Safari iOS | ✅ (Banner) | ❌ | ✅ | ⚠ nur Non-BLE |
| Firefox | ✅ | ❌ | ✅ | ⚠ nur Non-BLE |

**App-UI** läuft überall — auch Safari iOS und Firefox sind nutzbar für: Programme-Editor, Manual, Symptom-Tracker, Konsum-Protokoll, Statistik, T-Break, alle Audio-Features, Quiz, DSL-Editor, HA-YAML-Export, Sprach-Shortcuts-Anleitung. Nur BLE-Steuerung ist auf Chromium-basierte Browser oder Bluefy beschränkt.

## Was war in v4.9.3

Ballon-Volumen-Rechner mit User-Profilen: Länge + Durchmesser → Volumen → automatisch passende Pumpzeit. Kalibrierungs-Modus für echte Pumpleistung.

## Wichtige Einschränkungen bei Sprachsteuerung

1. **App muss in der gewählten App offen / installiert sein** — wenn iPhone-Standard-Browser nicht Bluefy ist, geht das Bluetooth nicht
2. **Volcano muss schon einmal gepairt sein** in dem Browser, der die URL öffnet
3. **Auto-Reconnect** funktioniert bei manchen Browsern nicht 100%ig — App versucht es, gibt sonst Hinweis-Toast
4. Nicht-BLE-Befehle wie `?cmd=status` oder `?cmd=stop` funktionieren auch ohne Verbindung (`stop` macht App-internen Cleanup)

## Was zu testen ist

### Sprachsteuerung
1. **Settings → Erweitert → Siri/Google Assistant** öffnet das Modal mit Anleitung + URL-Liste
2. **URL kopieren** funktioniert (Clipboard-API)
3. **URL direkt im Browser eingeben**: `https://marianacannabis.github.io/volcano/?cmd=status` → Status wird per TTS vorgelesen
4. **`?cmd=set&temp=200`** mit verbundenem Gerät → Temperatur wird gesetzt + Toast + TTS
5. **URL nach Ausführung gecleant**: URL ohne `?cmd=` nach Befehlsende sichtbar (kein Doppel-Aufruf bei Reload)

### iOS Shortcut-Test (manuell mit iPhone)
1. Kurzbefehle-App öffnen
2. + → Aktion: „URL" → `https://marianacannabis.github.io/volcano/?cmd=heat-on`
3. + Aktion: „URLs öffnen"
4. Namen: „Volcano anheizen"
5. „Zu Siri" → Phrase: „Volcano anheizen"
6. Test: „Hey Siri, Volcano anheizen" → öffnet App, führt Befehl aus

### Plattform-Tests
1. Auf iPhone in Safari öffnen → Banner mit Bluefy-Hinweis erscheint
2. Auf iPhone in Bluefy öffnen → kein Banner, BLE funktioniert
3. Auf Desktop Chrome → kein Banner, alle Features
4. Auf Android Chrome → kein Banner, BLE funktioniert

### Fonts (CC's offener Punkt)
1. Auf echtem iPhone in Bluefy: schaut die Schrift „Fraunces" aus wie eine elegante Serifenschrift in den Headlines?
2. Auf Android Chrome: passt
3. Falls nicht: Fallback ist Inter / System-Sans → sieht okay aber weniger distinguished aus

## CC-Test-Vorschlag

```
Bitte v4.9.4 testen unter https://marianacannabis.github.io/volcano/

Fokus:
1) URL-Commands: alle 11 Befehle in /?cmd=... testen. Jeder muss:
   - die App öffnen (oder bei offenem Tab den Tab nehmen)
   - den Befehl ausführen (oder Toast/TTS-Hinweis falls BLE nötig aber nicht
     verbunden)
   - die URL danach cleanen (history.replaceState)
2) Shortcuts-Modal: btnOpenShortcuts und btnOpenShortcutsFromSettings
   öffnen das Modal mit allen 9 Beispiel-URLs. URL kopieren funktioniert.
3) Platform-Banner: ist sichtbar in iOS Safari (Headless: User-Agent setzen),
   nicht in Chrome/Bluefy.
4) Google Fonts: in der Live-Site (mit SW) sollten jetzt document.fonts.size
   ≥ 1 sein und die Fraunces-Faces geladen werden. ORB-Block sollte weg sein.
5) Re-Run der vollen Suite — nichts regrediert
```

## Roadmap

**v4.10 (auf Andre's Go)**: 3D-Volcano-Vorschau mit Three.js (dynamic load)

**Phase 2 (Andre sagt Bescheid)**: Pi 4 + HA + HACS + Alexa-Skill (HA-YAML ist die Brücke)

**BLE-Hardware-Test** mit Andre wenn er Zeit hat (Volcano + iPhone Bluefy):
- Default-Pumpleistung kalibrieren (v4.9.3 Ballon-Profile)
- BLE-Connect / Reconnect-Stabilität
- Programme durchspielen
- Voice-Commands real testen

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt. **Niemals unbeaufsichtigt füllen.**
