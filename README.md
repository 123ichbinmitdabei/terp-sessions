# Sessions — S&B Vape Controller (v4.9.2)

Web-App zur Steuerung von Storz & Bickel Vaporizern (Volcano Hybrid, Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML PWA, ~358 KB, mobile-first, accessibility-zentriert.

## Was ist neu in v4.9.2 — Bottom-Layout-Fix

Andre's Befund: „unten noch immer nicht alles lesbar". Ursache identifiziert: Voice-FAB (bottom: 108px) und Vape-Buddy ragen ~160px über den Bildschirmrand, aber das Body-Padding war nur 110px. Bei aktivem FAB wurde der letzte Content der Tabs überdeckt.

### Layout-Fixes

- **Body-Padding-Bottom drastisch erhöht** von 110px auf 170px (plus safe-area-inset). Das deckt jetzt Voice-FAB (160px) + Vape-Buddy + Bottom-Nav komplett ab.
- **Letzte Card im Tab bekommt extra 30px Margin** — visueller Atem-Raum vor der Bottom-Nav
- **Dynamic Padding wenn Run-Card aktiv**: `body:has(.run-card.show)` erhöht Padding auf 250px wenn ein Programm läuft — die schwebende Run-Card verdeckt damit keinen Content
- **Smooth Scroll-to-Top bei Tab-Wechsel**: User landet bei jedem Tab oben statt in der Mitte eines vorherigen Tabs

### Modal-Polishing

- **Modal-Sheet Padding-Bottom erhöht** von 22px auf 30px (plus safe-area) — Schließen-Button am Ende langer Modals war zu nah am Rand
- **`overscroll-behavior:contain`** im Modal — verhindert Scroll-Chaining auf Body wenn man im Modal am Ende ist (kein versehentlicher Pull-to-Refresh)

### Was war in v4.9.1

CC-Test-Findings: Favicon-Link für 404-Fix, Backdrop-Close per Event-Delegation (zukunftssicher), README-Doku korrigiert.

### Was war in v4.9

Polishing & Reorganization: Settings-Modal in 6 Sub-Tabs, Setup-Tab Section-Headers, Focus-Trap, aria-current, Backdrop-Close, HA-YAML-Button, Empty-State.

## Layout-Math (für die Doku)

| Element | Bottom-Position | Höhe | Top-Edge |
|---|---|---|---|
| Bottom-Nav | 0 + safe-bot | ~64px | 64+safe |
| Voice-FAB | 108+safe | 52px | 160+safe |
| Vape-Buddy | 108+safe | ~60px | 168+safe |
| Run-Card | 96+safe | ~80px | 176+safe |

Body-Padding-Bottom: **170+safe-bot** (deckt alle obigen ab, Margin auf letzter Card: 30px für Komfort-Abstand).

Mit Run-Card aktiv: **250+safe-bot** (deckt zusätzlich die laufende Run-Card ab).

## Was zu testen ist

1. **Scrollen im Steuerung-Tab bis ganz unten**: Sicherheits-Timer-Karte und Mini-Log sollten vollständig sichtbar sein, nicht abgeschnitten
2. **Setup-Tab ganz unten**: UUID-Mapping-Card und letzte Buttons müssen sichtbar sein
3. **Vape-Buddy einschalten** (Settings → Erweitert → Engagement): danach noch sichtbarer Content beim Scrollen?
4. **Programm starten**: Run-Card erscheint unten, Body-Padding wird automatisch größer
5. **Tab-Wechsel**: smooth scroll nach oben

## Hardware-Test (offen)

Mit echtem Volcano + iPhone/Android Bluefy noch zu testen:
- BLE-Connect, Heizer-Steuerung, Pumpe, Ballon-Füllung
- Sprachsteuerung (TTS)
- Long-Press-Tooltips
- MQTT/Webhook gegen echte Endpunkte
- Custom BLE-Profile mit eigenem Gerät
- Raw BLE-Console (Hex Read/Write)

## Roadmap

**v4.10 (auf Andre's Go)**: 3D-Volcano-Vorschau mit Three.js (dynamic load, optional)

**Phase 2 (Andre sagt Bescheid)**: Raspberry Pi 4 + Home Assistant + HACS volcano_integration + Lovelace + Nabu Casa/Alexa-Skill. HA-YAML-Export aus der App ist die Brücke.

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt. **Niemals unbeaufsichtigt füllen.**
