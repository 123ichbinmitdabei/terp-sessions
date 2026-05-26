# Sessions PWA — Multi-Brand-Roadmap (v5.0 bis v8.0+)

> **Wichtiger Stand 26.05.2026:** Durch tiefere Recherche hat sich der bisherige Plan substanziell erweitert. Die wichtigste Entdeckung ist `firsttris/reactive-volcano-app` (MIT, aktiv gepflegt), das **alle vier S&B-Geräte** abdeckt und deutlich mehr Crafty/Mighty-Characteristics dokumentiert als xythobuz' Pico-Implementierung.

---

## KORREKTUREN zur bisherigen v5.0-Spec

**Veazy ist KEIN Out-of-Scope mehr.** Veazy nutzt **das exakt gleiche Service- und Characteristic-Schema wie Venty**. Code-Bestätigung:

```typescript
// VentyVeazyServiceUUIDs.Primary = "00000000-5354-4f52-5a26-4249434b454c"
// VentyVeazyCharacteristicUUIDs.control = "00000001-5354-4f52-5a26-4249434b454c"
```

Heißt: **VentyAdapter ist eigentlich VentyVeazyAdapter** — ein Adapter für beide Geräte, Unterschied nur in der Capabilities-Map (Veazy ist die kleinere Variante, dürfte weniger Features haben aber gleiches Protokoll).

**Device-Name-Patterns wurden präzisiert:**
- Volcano: `S&B VOLCANO H`
- Venty: `S&B VY___123` (mit `S&B `-Prefix vor VY!)
- Veazy: `S&B VZ___123`
- Crafty/Mighty: `STORZ&BICKEL` oder `Storz&Bickel`

**Crafty/Mighty hat VIEL mehr Characteristics als bisher angenommen.** Die xythobuz-Implementierung deckte nur 5 Chars ab. firsttris zeigt 19 Chars im einzigen Service. Wichtige neue:

```
0x23   useHoursCharacteristic       (Runtime Stunden)
0x1e3  useMinutesCharacteristic     (Runtime Minuten)
0x31   writeBoostTemp               (Boost-Temperatur!)
0x32   firmwareVersion
0x51   ledBrightness                (Brightness via BLE!)
0x61   autoOffCountdown             (Auto-Shutoff via BLE!)
0x63   akkuStatusCharacteristic     (Battery primary)
0x71   autoOffCurrentValue
0x72   firmwareBLEVersion
0x73   akkuStatusCharacteristic2    (Battery secondary)
0x83   systemStatusCharacteristic
0x93   handleProjectRegister
0x1b3  sicherheitscode
0x1c3  statusRegister2
0x1d3  factoryResetCharacteristic
```

**Heißt: Crafty/Mighty kann via BLE deutlich mehr als bisher geplant.** App-Safety-Timer bleibt trotzdem Pflicht, aber Settings wie Brightness, Auto-Off und Runtime sind jetzt verfügbar.

**Crafty/Mighty hat 3 Services (nicht 1):**
- Crafty1: `00000001-4c45-4b43-4942-265a524f5453`
- Crafty2: `00000002-4c45-4b43-4942-265a524f5453`  
- Crafty3: `00000003-4c45-4b43-4942-265a524f5453`

Die meisten Characteristics gehören zu Crafty1, aber Firmware/Auto-Off-Werte könnten in Crafty2/3 sein. CC sollte beim Discover alle drei Services parsen.

**Venty hat zusätzliche Settings2-Bits:**
```
VentyVeazySettings2Bits.BLE_PERMANENT = 1 << 0
```
Das war in der xythobuz-Quelle nicht dokumentiert. Erlaubt "Bluetooth always on" als Setting (relevant fürs Reconnect-Verhalten).

---

## TIER 1 — Storz & Bickel (sofort umsetzbar in v5.0)

Status der Recherche: **vollständig**. Quelle: firsttris/reactive-volcano-app (MIT, aktiv gepflegt, Web-Bluetooth-Implementierung) plus xythobuz/Volcano-Remote (GPLv3, C-Code für Pico) als Cross-Reference.

### 1.1 Volcano Hybrid ✅ (Andre besitzt)
- Status: bereits in v4.9.8 implementiert
- BLE-Profil siehe ursprüngliche v5_0_PLAN.md Kapitel 1.1, ergänzt um:
  - Bootloader-Service `00000001-1989-0108-1234-123456789abc` (für Firmware-Updates, out-of-scope)
  - Service2 `01000002-1989-0108-1234-123456789abc`
  - Service5 `10130000-...`
- vollständige Characteristic-Map siehe firsttris uuids.ts

### 1.2 Crafty / Crafty+ ✅
- Status: in v5.0.1 geplant, mit erweiterten Capabilities
- Single Adapter zusammen mit Mighty (siehe 1.3)

### 1.3 Mighty / Mighty+ ✅ (Andre besitzt)
- Status: in v5.0.1 geplant
- Gleicher Adapter wie Crafty (gleiche Firmware-Familie, identisches Protokoll)
- **Hauptkandidat für Andres Hardware-Test** in v5.0.1
- Erweiterte Capabilities ggü. ursprünglicher v5.0-Spec:
  ```
  targetTemp:    true
  currentTemp:   true  (mit Notify)
  heater:        true
  pump:          false
  battery:       true  (zwei Chars, primary + secondary)
  brightness:    true  (LED 0-100)
  vibration:     false (nur am Gerät selbst)
  autoShutoff:   true  (BLE-konfigurierbar, Sekunden)
  firmware:      true  (Version + BLE-Version)
  runtime:       true  (Stunden + Minuten)
  boostTemp:     true  (separater Boost-Setpoint)
  factoryReset:  true  (über Settings nur)
  ```
- App-Safety-Timer bleibt trotzdem aktiv (zusätzliche Sicherheitsschicht)

### 1.4 Venty ✅ (Andre besitzt)
- Status: in v5.0.2 geplant
- Command-basiertes Protokoll mit Notification-Response (siehe ursprüngliche v5.0-Spec 1.3)
- **Hauptkandidat für Andres Hardware-Test** in v5.0.2
- Neue Settings2-Bitmaske BLE_PERMANENT muss ergänzt werden

### 1.5 Veazy ✅ NEU — BONUS-Integration in v5.0.2

- **Gleicher Adapter wie Venty** (VentyVeazyAdapter), gleiche Service/Char-UUIDs
- Capability-Unterschiede:
  ```
  Venty:      boost=true, superBoost=true, brightness=true (1-9), vibration=true, ecoMode=true
  Veazy:      boost=true, superBoost=true (laut S&B-Support beide vorhanden!)
              brightness=true (1-9), vibration=true (laut S&B-Support)
              ecoMode=teilweise (charge/voltage konfigurierbar)
              tempRange={min:40, max:210}
  ```
- Test-Verifikation: nicht möglich (Andre hat kein Veazy), daher als "Beta, unverified" markieren mit Hinweis im Connect-Dialog
- Implementierungsaufwand: ~0,5 Tage zusätzlich da fast identisch zu Venty
- **Empfehlung:** In v5.0.2 mit dem gleichen Push mitnehmen, damit Sessions die einzige Multi-Device-App ist die alle 4 S&B-Geräte unterstützt

### Capability-Matrix S&B (überarbeitet)

| Capability       | Volcano | Crafty/Mighty | Venty | Veazy |
|------------------|:-------:|:-------------:|:-----:|:-----:|
| Target Temp      | ✅       | ✅             | ✅     | ✅     |
| Current Temp     | ✅       | ✅             | ❌     | ❌     |
| Heater           | ✅       | ✅             | ✅     | ✅     |
| Pump/Ballon      | ✅       | ❌             | ❌     | ❌     |
| Battery          | ❌       | ✅ (2 Chars)   | ✅     | ✅     |
| Boost            | ❌       | ✅ (sep. Temp) | ✅     | ✅     |
| Super-Boost      | ❌       | ❌             | ✅     | ✅     |
| Brightness BLE   | ✅ (0-100)| ✅ (LED 0-100)| ✅ (1-9)| ✅ (1-9)|
| Vibration BLE    | ✅       | ❌             | ✅     | ✅     |
| Auto-Shutoff BLE | ✅       | ✅ NEU         | ❌     | ❌     |
| App-Safety-Timer | optional | Pflicht       | Pflicht | Pflicht |
| Firmware-Version | ✅       | ✅ NEU         | (via Notification) | (via Notification) |
| Runtime          | ✅       | ✅ NEU         | (via Notification) | (via Notification) |
| Eco-Mode         | ❌       | ❌             | ✅     | ✅     |
| Display-Cooling  | ✅       | ❌             | ❌     | ❌     |
| Factory-Reset    | (am Gerät) | ✅ NEU      | ✅     | ✅     |
| BLE-Permanent-Setting | ❌  | ❌             | ✅ NEU | ✅ NEU |
| Temp-Range °C    | 40-230  | 40-210        | 40-210 | 40-210 |
| Device-Name-Pattern | `S&B VOLCANO` | `STORZ&BICKEL` | `S&B VY___` | `S&B VZ___` |

---

## TIER 2 — PAX (geplant für v6.0)

Status der Recherche: **vollständig**. Quellen:
- `evertonstz/pax-romana` (MIT, TypeScript Web-Bluetooth, läuft live)
- `tristanseifert/kush-kontroller.app` (Swift/iOS)
- `blraaz.me` Blog-Posts (Protokoll-Doku)

### Unterstützte Geräte
- **PAX 3** (vom Aufwand identisch zu Pax Plus)
- **PAX Plus** (Nachfolger des PAX 3, identisches BLE-Protokoll)
- **PAX Mini** (laut firsttris Kompatibilität ähnlich)
- **PAX Era / Era Pro** (Concentrate-Pods, anderes Use-Case aber gleiches Protokoll)

Sehr verbreitet in Deutschland, **PAX 3 ist neben Volcano/Mighty einer der populärsten Vapes bei CSC-Mitgliedern**. Strategisch hochwertvoll.

### BLE-Profil

```
Single Service:        8e320200-64d2-11e6-bdf4-0800200c9a66
Read-Char (response):  8e320201-64d2-11e6-bdf4-0800200c9a66
Write-Char (command):  8e320202-64d2-11e6-bdf4-0800200c9a66
Notifications-Char:    8e320203-64d2-11e6-bdf4-0800200c9a66

Device-Name-Pattern:   "PAX3" oder "PAX" (variiert je Firmware)
```

### Encryption / Authentication

PAX-Geräte verschlüsseln **alle** Pakete via AES-128-ECB. Schlüssel wird aus Serial Number abgeleitet:

```javascript
// Pseudocode
async function derivePaxKey(serialNumber8chars) {
  // 1. Serial mit sich selbst konkatenieren
  const repeated = serialNumber8chars + serialNumber8chars;  // 16 chars
  // 2. UTF-8 = 16 bytes
  const bytes = new TextEncoder().encode(repeated);
  // 3. Verschlüsseln mit hardcoded shared key (aus reverse-engineering bekannt)
  const SHARED_KEY = /* 16 bytes, in pax-romana enthalten */;
  // 4. AES-128-ECB
  const sessionKey = await aesEcb(bytes, SHARED_KEY);
  return sessionKey;  // Wird für alle Packets verwendet
}
```

Serial Number kommt aus dem Device-Info-Service. WebCrypto-API kann AES-128-ECB nativ (kein externes Crypto-Lib nötig).

### Packet-Format

- 1 Byte: Message-Type
- N Bytes: Payload (typabhängig)
- Verschlüsselt mit AES-128-ECB session-key

**Wichtige Message-Types (auszugsweise):**
```
0x01  ActualTemp      (read)
0x02  HeaterSetPoint  (read/write)
0x03  Battery         (read)
0x04  Usage           (read, statistics)
0x05  UsageLimit      (read/write)
0x06  LockState       (read/write)
0x07  ChargeState     (read)
0x08  PodInserted     (read, Pax Era)
0x09  Time            (read/write)
0x0A  Brightness      (read/write)
0x0B  Hapticfeedback  (read/write)
0x0C  SupportedAttributes  (read)
0x0D  HeatingState    (read)
0x0E  SerialNumber    (read)
0x0F  SystemInfo      (read)
0x10  Status          (notify)
0x14  Mode/Profile    (read/write — Standard/Boost/Flavor/Stealth)
0x29  Color           (LED Color)
0x32  Tutorial        (Onboarding-State)
```

(Vollständige Liste: pax-romana src/pax + blraaz.me Blog)

### Capabilities PAX 3

```
targetTemp:       true   (200-435°F = 93-224°C)
currentTemp:      true
heater:           true   (immer aktiv, Modi via Profile)
pump:             false
battery:          true
boost:            true   (Profile "Boost" = höhere End-Temp)
flavorMode:      true   (Profile "Flavor" = niedriger)
stealthMode:     true   (Profile "Stealth" = minimal LED)
standardMode:     true
brightness:       true   (0-100)
vibration:        true   (haptic on/off)
lockState:        true   (BLE-Lock — Sicherheit, App-only)
chargeState:      true   (charging/not-charging-Indikator)
usage:            true   (Session-Counter)
usageLimit:       true   (Setzbar — Selbstkontrolle wie unser Tageslimit!)
ledColor:         true   (Custom-Farben für Boost-Indikator)
tempRange °C:     93-224 (200-435°F)
```

### Aufwand-Schätzung

- 3-4 Tage Implementierung (komplexer als S&B wegen Encryption)
- WebCrypto-API für AES-128-ECB
- Packet-Encoder/Decoder mit Message-Types
- Test-Vector aus pax-romana zum Verifizieren der Crypto-Implementierung

### Was Andre besorgen müsste

- **Ein PAX 3 oder PAX Plus** (gebraucht ~150-200€, neu ~250€)
- Strategische Investition: ermöglicht Hardware-Test und Verifikation

---

## TIER 3 — Puffco (geplant für v7.0)

Status der Recherche: **vollständig**. Quellen:
- `Fr0st3h/Puffco-Reverse-Engineering-Writeup` (Protokoll-Doku komplett)
- `meekzyr/PuffcoPC` (Web-Bluetooth-Implementierung, MIT)
- `Xavierorozcomd/puffco-pc` (Fork mit Firmware-X-Support)

### Unterstützte Geräte
- **Puffco Peak Pro** (Concentrate-Rig, Hauptgerät)
- **Puffco Proxy** (mobiler Sherlock-style)
- **Puffco Pivot** (kleinerer Dab-Pen)
- **Puffco Hot Knife** (Zubehör mit eigenem BLE)

⚠️ **Zielgruppen-Hinweis:** Puffco macht Concentrate-Vaporizer (Dabs), nicht Dry-Herb. Andere Sub-Community in CSCs, aber wachsend. Sessions würde damit von "Vape Controller" zu "Vape + Dab Controller".

### Authentication-Hürde (kritisch)

Ab Firmware X verlangt Puffco eine SHA-256-Challenge-Response:

```javascript
// Pseudocode aus Fr0st3h-Writeup
async function authenticatePuffco(gattServer) {
  // 1. accessSeedKey aus E0-Characteristic lesen (16 bytes, ändert sich pro Connect)
  const initialSeed = await readE0Characteristic();
  
  // 2. Hardcoded DEVICE_HANDSHAKE-Key (16 bytes, aus deobfuscated Puffco Web-App)
  const DEVICE_HANDSHAKE = base64Decode('FUrZc0WilhUBteT2JlCc+A==');
  
  // 3. 32-Byte-Array bauen: DEVICE_HANDSHAKE + initialSeed
  const combined = new Uint8Array(32);
  combined.set(DEVICE_HANDSHAKE, 0);
  combined.set(initialSeed, 16);
  
  // 4. SHA-256-Hash
  const hashed = await crypto.subtle.digest('SHA-256', combined);
  
  // 5. Erste 16 Bytes zurück nach E0 schreiben
  await writeE0Characteristic(new Uint8Array(hashed).slice(0, 16));
  
  // 6. Wenn richtig: Puffco erlaubt Read/Write auf alle anderen Chars
}
```

### Capabilities Puffco Peak Pro

```
chamberTemp:      true   (4 Profile, customisierbar)
boostMode:        true   (preheat-cycle)
profile1234:      true   (4 verschiedene Setpoints)
batteryLevel:     true
dabCount:         true   (Statistik im Gerät selbst!)
sessionDuration:  true
lanternColor:     true   (LED-Farbe der Glas-Base)
lanternAnimation: true   (Animationen für Boost/Idle)
baseLED:          true
logoLED:          true
mainLED:          true
glassLED:         true
chamberType:      true   (Classic/Herbal/Performance — neuere Bowls)
deviceLock:       true
totalUptime:      true
deviceBirthday:   true   (Production-Date)
tempRange °C:     ca. 230-340 (Concentrate-Temperaturen, höher)
```

### Aufwand-Schätzung

- 4-5 Tage (Authentication + Profile-Management + LED-Animations-API)
- WebCrypto-API für SHA-256
- Andre müsste einen Puffco besorgen (~400€) — daher nicht hochpriorisiert

### Strategische Überlegung

- Concentrate-Markt wächst, aber kleiner als Dry-Herb
- **Würde Sessions-Branding erweitern müssen** ("Multi-Brand Vape & Dab Controller")
- Erst sinnvoll wenn Tier 1+2 stabil laufen und Demand aus Community kommt

---

## TIER 4 — Firefly (Recherche/RE in v8.0+, theoretisch machbar)

Status der Recherche: **teilweise**. Offizielle Web-App existiert (`fireflyvaporwebapp.com`), aber kein öffentliches Reverse-Engineering-Repo gefunden.

### Unterstützte Geräte (potenziell)
- **Firefly 2+** (aktuell, einziges aktives Modell)

### BLE-Status
- Offizielle App nutzt **Web Bluetooth API** über Chrome Desktop und Bluefy (iOS)
- Code ist im Browser einsehbar — wahrscheinlich nicht heavily obfuscated
- Würde **eigenes Reverse-Engineering** erfordern:
  1. fireflyvaporwebapp.com mit Chrome DevTools öffnen
  2. JS-Sources analysieren (Sources-Tab → Search for "bluetooth" / "characteristic" / "uuid")
  3. Service/Char-UUIDs extrahieren
  4. Packet-Format aus Network-Capture rekonstruieren

### Capabilities Firefly 2+ (aus offizieller App-Beschreibung)
```
temperatureControl: true   (200-500°F = 93-260°C, 7 Presets oder Precision-Mode)
batteryLevel:       true
touchSensorConfig:  true   (1 oder beide Sensoren zum Aktivieren)
calibration:        true   (Power-Tuning 80-111%, "richer" vs "smoother")
firmwareUpdate:     true   (Over-the-air via App)
activationTemp:     true   (Temperatur bei der Heizer startet)
```

### Aufwand-Schätzung
- Reverse-Engineering: 2-3 Tage (Code-Analyse + Mapping)
- Implementierung: 2-3 Tage
- **Risiko:** wenn Firefly obfuscated, deutlich länger
- **Risiko:** Firefly-Firma ist sehr klein und unsicher zukunftsfähig (Warranty seit 11/2024 eingestellt)

### Was Andre besorgen müsste
- Ein Firefly 2+ (~150€) — niedrige Priorität

---

## TIER 5 — Nicht-realisierbar (kein offenes Protokoll)

Diese Geräte haben Bluetooth aber keine dokumentierten Protokolle und keine Open-Source-Implementierungen. Eigenes Reverse-Engineering würde Wochen kosten und ist strategisch nicht sinnvoll für eine CSC-fokussierte App.

### Cannabis-Vaporizer ohne RE-Quelle

| Gerät                       | Bluetooth? | RE-Quelle | Bewertung                    |
|-----------------------------|:----------:|:---------:|------------------------------|
| DaVinci IQ                  | ✅          | ❌         | Eigene Web-App, Code unsicher |
| DaVinci IQ2                 | ✅          | ❌         | dito                          |
| DaVinci IQC                 | ✅          | ❌         | dito                          |
| DaVinci IQ3                 | ✅          | ❌         | dito                          |
| Ghost MV1                   | ✅          | ❌         | Discontinued, Firma weg       |
| Dr. Dabber Switch 2         | ✅          | ❌         | Concentrate, Niche            |
| Boundless CFX/CF/CFV        | ❌          | -         | Kein Bluetooth                |
| Healthy Rips Fury/Rogue     | ❌          | -         | Kein Bluetooth                |
| Arizer Solo/Air/XQ2         | ❌          | -         | Kein Bluetooth                |
| XMAX V3 Pro                 | ❌          | -         | Kein Bluetooth                |
| POTV Lobo                   | ❌          | -         | Kein Bluetooth                |
| Utillian 421/722            | ❌          | -         | Kein Bluetooth                |
| DynaVap M7/Apollo/Omni      | ❌          | -         | Mechanisch/Induktion          |

### DaVinci-Spezialfall

Wenn Andre langfristig DaVinci einbauen wollte:
- Andre besitzt selbst keins
- DaVinci-Geräte sind in DE weniger verbreitet als PAX/S&B
- Eigene Web-App ist `davincivaporizer.com` (Web-Bluetooth)
- Wäre theoretisch genauso RE-bar wie Firefly
- Aufwand: 2-4 Tage Recherche/Implementierung
- **Strategische Bewertung:** v9.0+, nur wenn Community-Demand entsteht

---

## ROADMAP-Übersicht

### v5.0 (in Arbeit, CC autonom)
- v5.0.0 Foundation (Volcano-Kapselung)
- v5.0.1 CraftyMightyAdapter (Andre testet Mighty)
- v5.0.2 VentyVeazyAdapter (Andre testet Venty, Veazy als Beta-Bonus)
- v5.0.3 Polish

### v5.1 (optional, klein)
- Veazy-Verifikation falls jemand aus Community testet
- BLE_PERMANENT-Setting in Venty-Settings ergänzen
- Crafty/Mighty erweiterte Capabilities (Brightness, Auto-Shutoff, Runtime, Boost-Temp)

### v6.0 — PAX-Familie (2-4 Wochen Aufwand)
- PaxAdapter mit AES-128-ECB Encryption
- Unterstützte Geräte: PAX 3, PAX Plus, PAX Mini, PAX Era, PAX Era Pro
- **Andre besorgt PAX 3 für Hardware-Test** (~150€ gebraucht)
- Sessions-Branding-Update: "Multi-Brand Cannabis Vape Controller"

### v7.0 — Puffco (3-5 Wochen Aufwand)
- PuffcoAdapter mit SHA-256-Authentication
- Unterstützte Geräte: Peak Pro, Proxy, Pivot
- **Andre besorgt Puffco** (~400€) ODER Community-Tester
- Sessions-Branding-Update: "Multi-Brand Vape & Dab Controller"
- Optional vor Tier 7

### v8.0 — Firefly (3-4 Wochen Aufwand, RE-Heavy)
- Selbst reverse-engineern (kein öffentliches Repo)
- FireflyAdapter
- Risiko: Firma instabil, Geräte möglicherweise schon EOL

### v9.0+ — Niche / DaVinci (offen)
- Nur bei Community-Demand
- DaVinci eigenes RE

### Niemals geplant
- Ghost MV1 (tot)
- Healthy Rips (kein BT)
- Boundless, Arizer, Utillian, XMAX, POTV (kein BT)
- DynaVap (mechanisch)

---

## Architektur-Implikation für v5.0

Der `DeviceAdapter`-Pattern den CC gerade einbaut, **muss von Anfang an Multi-Brand-fähig sein**. Das heißt:

1. **Adapter-Klassen sind herstellerneutral benannt:**
   - `VolcanoAdapter` (bleibt)
   - `CraftyMightyAdapter` (bleibt)
   - `VentyVeazyAdapter` (statt nur "VentyAdapter")
   - später: `PaxAdapter`, `PuffcoAdapter`, `FireflyAdapter`

2. **Capabilities-Map enthält ALLE bekannten Felder** (auch wenn aktuell unused):
   - `boost`, `superBoost`, `flavorMode`, `stealthMode` (PAX)
   - `dabCount`, `lanternColor`, `chamberType` (Puffco)
   - `requiresAuth`, `authMethod` ('aes128-ecb-serial'|'sha256-handshake'|null)

3. **Auto-Detection muss auf Service-UUID basieren, nicht primär Name:**
   - Da PAX und Puffco eigene Service-UUIDs haben
   - Name-Patterns nur als Fallback

4. **State.device-Struktur muss flexibel sein:**
   ```javascript
   State.device = {
     type, name, manufacturer,
     firmware, serialNumber,
     battery, boost, superBoost, ecoCurrent, ecoVoltage,
     // Für PAX später:
     mode, profile, lockState, usageCount, usageLimit, dynamicMode,
     // Für Puffco später:
     dabCount, chamberType, lanternColor, profile1234,
   };
   ```

5. **requestDevice-Filter sollten bereits jetzt für spätere Hersteller offen sein:**
   ```javascript
   {
     filters: [
       // S&B
       { namePrefix: 'S&B VOLCANO' }, { namePrefix: 'VOLCANO' },
       { namePrefix: 'STORZ&BICKEL' }, { namePrefix: 'Storz&Bickel' },
       { namePrefix: 'S&B VY' }, { namePrefix: 'S&B VZ' },
       // Spätere (auskommentiert oder via Settings-Toggle aktivierbar)
       // { namePrefix: 'PAX' },
       // { namePrefix: 'Puffco' },
       // { namePrefix: 'Firefly' },
     ],
     optionalServices: [
       // S&B
       '10100000-5354-4f52-5a26-4249434b454c',
       '10110000-5354-4f52-5a26-4249434b454c',
       '00000001-4c45-4b43-4942-265a524f5453',
       '00000002-4c45-4b43-4942-265a524f5453',
       '00000003-4c45-4b43-4942-265a524f5453',
       '00000000-5354-4f52-5a26-4249434b454c',
       '00000001-1989-0108-1234-123456789abc',
       // Spätere Hersteller können hier ergänzt werden
     ],
   }
   ```

---

## Sofort-Empfehlung an CC für v5.0

Der CC arbeitet aktuell autonom. Bitte folgendes nachreichen sobald er pausiert:

```
ERGAENZUNG zur v5.0-Spec — neue Recherche-Ergebnisse:

1) Veazy ist KEIN out-of-scope. VentyAdapter wird zu VentyVeazyAdapter
   und unterstuetzt beide Geraete (gleiche Service/Char UUIDs).
   Veazy in v5.0.2 als Bonus-Adapter mitnehmen (~0,5 Tage Mehraufwand).

2) Crafty/Mighty hat DEUTLICH mehr Characteristics als bisher.
   Ergaenzung der Capabilities-Map in v5.0.1:
   - brightness: true (LED 0-100)
   - autoShutoff: true (BLE-konfigurierbar in Sekunden)
   - firmware: true (Version + BLE-Version)
   - runtime: true (Stunden + Minuten)
   - boostTemp: true (separater Setpoint, Char 0x31)

3) Crafty/Mighty hat 3 Services (0x01, 0x02, 0x03), beim Discover
   alle drei pruefen.

4) Volcano hat zusaetzliche Services (Bootloader, Service2, Service5)
   die noch nicht eingebunden waren. Fuer v5.0.0 nicht zwingend
   noetig, aber in optionalServices aufnehmen.

5) Device-Name-Patterns korrigieren:
   Venty: "S&B VY" (mit "S&B "-Prefix!)
   Veazy: "S&B VZ"

6) Architektur darf jetzt schon Multi-Brand-bereit sein:
   - Adapter herstellerneutral benennen
   - Capabilities-Map um zukuenftige Felder (boost, profile, lock,
     dabCount, lanternColor, requiresAuth) erweitern
   - State.device-Struktur flexibel halten

7) Quelle fuer alle aktualisierten S&B-Daten:
   firsttris/reactive-volcano-app/src/utils/uuids.ts (MIT)
   Andre hat die Spec v2 mit allen Details.

Die geplanten v6.0+ Phasen (PAX, Puffco, Firefly) sind separat
dokumentiert und kommen nach v5.0.3 abgeschlossen.
```

---

## Memory-Update (für den AI-Assistant zu merken)

Sessions PWA Roadmap-Status nach 26.05.2026 Recherche:

- **Aktuelle Iteration:** v5.0 mit Mighty + Venty, autonom durch CC
- **Sofort-Bonus:** Veazy zusätzlich in v5.0.2 (gleicher Adapter wie Venty)
- **Erweiterte Crafty/Mighty-Capabilities** in v5.0.1 (Brightness, Auto-Shutoff, Runtime, Boost-Temp)
- **Geplant v6.0:** PAX-Familie (PAX 3, Plus, Mini, Era, Era Pro) mit AES-128-ECB Encryption
- **Geplant v7.0:** Puffco-Familie (Peak Pro, Proxy, Pivot) mit SHA-256 Auth
- **Geplant v8.0:** Firefly 2+ (eigenes RE notwendig)
- **Optional v9.0+:** DaVinci (eigenes RE), nur bei Demand
- **Niemals:** Ghost MV1 (tot), Healthy Rips/Arizer/Boundless (kein BT), DynaVap (mechanisch)

Andre besitzt: Volcano Hybrid + Mighty + Venty.
Für v6.0: Andre besorgt PAX 3 (~150€ gebraucht).
Für v7.0: Andre besorgt Puffco oder Community-Tester (~400€).

Quellen für alle Hersteller:
- S&B: firsttris/reactive-volcano-app + xythobuz/Volcano-Remote
- PAX: evertonstz/pax-romana + blraaz.me + tristanseifert/kush-kontroller
- Puffco: Fr0st3h/Puffco-Reverse-Engineering-Writeup + meekzyr/PuffcoPC
- Firefly: fireflyvaporwebapp.com (eigenes RE)
- DaVinci: davincivaporizer.com (eigenes RE)
