# Sessions PWA v5.0 — Multi-Device-Spec (Volcano + Crafty/Mighty + Venty)

> **Quelle:** Reverse-engineered von `xythobuz/Volcano-Remote` (GPLv3) und `firsttris/reactive-volcano-app` (MIT). Beide produktiv getestet. **Veazy** vorerst out-of-scope (Andre hat es nicht, kein bestätigtes Protokoll bekannt).

---

## 1. BLE-Protokoll-Map — vollständig

### 1.1 Volcano Hybrid (bestehend, nur zur Vollständigkeit)

```
Service State (notify):   10100000-5354-4f52-5a26-4249434b454c
Service Control (write):  10110000-5354-4f52-5a26-4249434b454c

Pattern: "10[ss]00[xx]-5354-4f52-5a26-4249434b454c"
  ss = 10 (State-Service) oder 11 (Control-Service)
  xx = Characteristic-ID

State-Service (ss=10):
  0x03  Firmware-Version       read (12 bytes ASCII)
  0x0C  PrjStat1               read+notify  (Activity-Bitmaske)
        - 0x0020 HEIZUNG_ENA
        - 0x0200 AUTOBLESHUTDOWN
        - 0x2000 PUMPE_FET_ENABLE
  0x0D  PrjStat2               read+notify
        - 0x0200 FAHRENHEIT_ENA
        - 0x1000 DISPLAY_ON_COOLING
  0x0E  PrjStat3               read+notify
        - 0x0400 VIBRATION

Control-Service (ss=11):
  0x01  Current Temp           read+notify  (Uint16 LE, °C × 10)
  0x03  Target Temp            read/write   (Uint16 LE, °C × 10)
  0x05  Brightness             read/write   (0-100)
  0x0D  Auto-Shutoff Time      read/write   (Sekunden, Uint16 LE)
  0x0F  Heater ON              write        (egal welcher Wert)
  0x10  Heater OFF             write
  0x13  Pump ON                write
  0x14  Pump OFF               write
  0x15  Heat-Hours (Runtime)   read         (Uint32 LE, Stunden)
  0x16  Heat-Minutes (Runtime) read         (Uint32 LE, Minuten 0-59)
```

### 1.2 Crafty / Crafty+ / Mighty / Mighty+

```
Single Service: 00000001-4c45-4b43-4942-265a524f5453

Pattern: "000000[xx]-4c45-4b43-4942-265a524f5453"
  Hex-String "4c454b43-4942-265a-524f5453" = ASCII "LEKCIB&ZROTS"
  rückwärts = "STORZ&BICKEL"

Characteristics:
  0x11  Current Temp           read+notify  (Uint16 LE, °C × 10)
  0x21  Target Temp            read/write   (Uint16 LE, °C × 10)
  0x41  Battery                read         (Uint16 LE, %)
  0x81  Heater ON              write        (2 bytes, Wert egal)
  0x91  Heater OFF             write        (2 bytes, Wert egal)

KEINE Pumpe (kein Ballon). KEINE Vibration/Brightness via BLE.
Auto-Shutoff: nur am Gerät selbst.
```

**Crafty vs. Mighty:** Identisches BLE-Protokoll (gleiche Firmware-Familie). Mighty hat zusätzlich ein eingebautes Display, aber BLE-API ist gleich. Wir behandeln sie als **ein Adapter**.

### 1.3 Venty (komplett anderes Protokoll!)

```
Single Service:     00000000-5354-4f52-5a26-4249434b454c
Single Characteristic: 00000001-5354-4f52-5a26-4249434b454c

Command-basiert: write → wait for notification → read response

TX-Format (write):  [command_byte] [value_bytes...]
RX-Format (notify): [response_bytes...]

Commands:
  0x01  SETTINGS    Temperatur, Boost, Heater, Eco
  0x06  INTERFACE   Brightness, Vibration

SETTINGS-Value-Bitmaske (für TX-Payload nach 0x01):
  1 << 1  SET_TEMPERATURE  (gefolgt von 2 byte Uint16 LE, °C × 10)
  1 << 2  SET_BOOST        (gefolgt von 1 byte bool)
  1 << 3  SET_SUPERBOOST   (gefolgt von 1 byte bool)
  1 << 5  HEATER           (gefolgt von 1 byte bool)
  1 << 7  SETTINGS         (gefolgt von Sub-Bitmaske)

Sub-Bitmaske (Settings):
  1 << 0  UNIT (0=°C, 1=°F)
  1 << 1  SETPOINT_REACHED (readonly Status)
  1 << 2  FACTORY_RESET
  1 << 3  ECOMODE_CHARGE (Strom-Sparen)
  1 << 4  BUTTON_CHANGED (Status)
  1 << 5  ECOMODE_VOLTAGE (Spannungs-Sparen)
  1 << 6  BOOST_VISUALIZATION

INTERFACE-Sub-Bitmaske (für TX nach 0x06):
  1 << 0  BRIGHTNESS (gefolgt von 1 byte, 1-9)
  1 << 3  VIBRATION (gefolgt von 1 byte bool)

KEINE Pumpe. ABER: Boost + SuperBoost (Power-Modi für stärkeren Hit).
Akku-Status: aus den Notification-Responses.
```

**Quote-Falle Warnung:** Die ASCII-Strings in den UUIDs sind keine deutschen Quotes, sondern Hex — kein Risiko hier. ABER: bei Code-Strings die diese UUIDs als Strings enthalten, im JS keine deutschen Quotes danach platzieren.

---

## 2. DeviceAdapter — Architektur

### 2.1 Interface (alle Adapter implementieren das)

```javascript
class DeviceAdapter {
  // Identität
  static deviceType    = 'unknown';    // 'volcano'|'crafty'|'mighty'|'venty'
  static displayName   = '';           // 'Volcano Hybrid'
  static namePatterns  = [];           // ['S&B VOLCANO H', /^VOLCANO/i]
  static serviceUUIDs  = [];           // ['10100000-...', '10110000-...']

  // Capabilities (was kann das Gerät via BLE)
  static capabilities = {
    targetTemp:    true,
    currentTemp:   true,
    heater:        true,
    pump:          false,    // nur Volcano
    balloon:       false,    // nur Volcano (= pump + autoCoolDown)
    battery:       false,    // Crafty/Mighty/Venty
    boost:         false,    // nur Venty
    superBoost:    false,    // nur Venty
    brightness:    false,
    vibration:     false,
    autoShutoff:   false,    // nur Volcano via BLE
    firmware:      false,
    runtime:       false,    // nur Volcano
    ecoMode:      false,    // nur Venty
    displayCooling: false,   // nur Volcano
  };

  // Temperatur-Range (Gerät-spezifisch)
  static tempRange = { min: 40, max: 230 };   // Volcano default

  // Lifecycle
  async connect(device) { /* device = BluetoothDevice */ }
  async disconnect() {}

  // Basisfunktionen (alle Adapter)
  async setTargetTemp(celsius) {}
  async getTargetTemp() { return 0; }   // °C as int
  async getCurrentTemp() { return 0; }
  async heaterOn() {}
  async heaterOff() {}

  // Optional (nur wenn capabilities[..] true)
  async pumpOn() {}
  async pumpOff() {}
  async getBattery() { return 0; }      // % 0-100
  async setBoost(on) {}
  async setSuperBoost(on) {}
  async setBrightness(v) {}
  async setVibration(on) {}
  async getFirmware() { return ''; }
  async getRuntimeMinutes() { return 0; }

  // Status-Subscription (alle Adapter sollten was liefern)
  async subscribeStatus(callback) {
    // callback({ currentTemp, targetTemp, heating, pumping, battery, boost, ... })
  }
}
```

### 2.2 Auto-Detection-Logik

Beim Connect-Dialog von Web-Bluetooth filtern wir auf **alle** S&B-Geräte. Nach erfolgreichem Connect bestimmen wir den Adapter:

```javascript
async function detectDevice(bleDevice, gattServer) {
  // 1. Name-Pattern (schnell)
  const name = bleDevice.name || '';
  if (/^S&B VOLCANO/i.test(name) || /^VOLCANO/i.test(name)) return VolcanoAdapter;
  if (/^VY\d{3}$/.test(name) || /^VENTY/i.test(name)) return VentyAdapter;
  if (/^VZ\d{3}$/.test(name)) return null; // Veazy: out-of-scope für v5.0
  if (/STORZ&BICKEL/i.test(name)) {
    // Crafty oder Mighty -> beide gleiches Protokoll
    return CraftyMightyAdapter;
  }

  // 2. Service-UUID-Probe (Fallback wenn Name unklar)
  try {
    await gattServer.getPrimaryService('10100000-5354-4f52-5a26-4249434b454c');
    return VolcanoAdapter;
  } catch (_) {}
  try {
    await gattServer.getPrimaryService('00000001-4c45-4b43-4942-265a524f5453');
    return CraftyMightyAdapter;
  } catch (_) {}
  try {
    await gattServer.getPrimaryService('00000000-5354-4f52-5a26-4249434b454c');
    return VentyAdapter;
  } catch (_) {}

  return null; // Unknown device
}
```

**Web-Bluetooth-Filter beim Pairing-Dialog** (damit alle S&B-Geräte angezeigt werden):

```javascript
const device = await navigator.bluetooth.requestDevice({
  filters: [
    { namePrefix: 'S&B VOLCANO' },
    { namePrefix: 'VOLCANO' },
    { namePrefix: 'STORZ&BICKEL' },
    { namePrefix: 'Storz&Bickel' },
    { namePrefix: 'VY' },     // Venty
    // { namePrefix: 'VZ' },  // Veazy out-of-scope
  ],
  optionalServices: [
    '10100000-5354-4f52-5a26-4249434b454c',  // Volcano State
    '10110000-5354-4f52-5a26-4249434b454c',  // Volcano Control
    '00000001-4c45-4b43-4942-265a524f5453',  // Crafty/Mighty
    '00000000-5354-4f52-5a26-4249434b454c',  // Venty
  ],
});
```

### 2.3 Capabilities-Map (kompakte Übersicht)

| Capability       | Volcano | Crafty/Mighty | Venty |
|------------------|:-------:|:-------------:|:-----:|
| Target Temp      | ✅       | ✅             | ✅     |
| Current Temp     | ✅       | ✅             | ❌ (nur Soll)|
| Heater On/Off    | ✅       | ✅             | ✅     |
| Pump (Ballon)    | ✅       | ❌             | ❌     |
| Battery          | ❌       | ✅             | ✅     |
| Boost Mode       | ❌       | ❌             | ✅     |
| Super-Boost      | ❌       | ❌             | ✅     |
| Brightness       | ✅ (0-100)| ❌            | ✅ (1-9)|
| Vibration        | ✅       | ❌             | ✅     |
| Auto-Shutoff BLE | ✅       | ❌             | ❌     |
| Firmware-Version | ✅       | ❌             | ❌     |
| Runtime-Counter  | ✅       | ❌             | ❌     |
| Eco-Mode         | ❌       | ❌             | ✅     |
| Display-Cooling  | ✅       | ❌             | ❌     |
| Temp-Range °C    | 40-230  | 40-210        | 40-210 |

**Wichtig:** Venty hat **keine** lesbare Current-Temperature in dem Sinne — die App pollt nur Status-Updates über Notifications. Wir zeigen daher bei Venty nur die Zieltemperatur prominent + ein „Heizen…" / „Bereit"-Indikator.

---

## 3. Refactor-Plan für `index.html`

### 3.1 Bestehender Volcano-Code kapseln

Aktueller Code in `index.html` macht direkt:
```javascript
// alt
const tempChar = await controlService.getCharacteristic('10110003-...');
await tempChar.writeValue(new Uint8Array([...]));
```

Wird zu:
```javascript
// neu
await State.adapter.setTargetTemp(180);
```

Konkrete Schritte:
1. Neue Klasse `VolcanoAdapter` ans Ende der Script-Section vor `init()`. Sie nimmt den bestehenden BLE-Code 1:1, nur in Methoden gekapselt.
2. Global `State.adapter` einführen.
3. Alle Stellen in `index.html` die direkt BLE-Chars benutzen → Suche & Ersetze auf `State.adapter.xxx()`.
4. **Programme/DSL:** Steps wie `heaterOn`, `pumpOn`, `setTemp` greifen jetzt über `State.adapter`. Bei Geräten ohne Pumpe wird ein Pump-Step übersprungen mit Warnung in der UI.

### 3.2 Quick-Actions dynamisch je Gerät

```javascript
function renderQuickActions() {
  const cap = State.adapter.constructor.capabilities;
  const el = $('#quickActions');
  el.innerHTML = '';
  el.append(makeAction('💨', 'Direkt-Zug', actDirectDraw));  // alle Geräte
  if (cap.balloon) {
    el.append(makeAction('🎈', 'Ballon füllen', actFillBalloon));
  }
  if (cap.boost) {
    el.append(makeAction('⚡', 'Boost', actBoostToggle));
  }
  el.append(makeAction('⏱', 'Timer', openSchedule));         // alle Geräte
  if (cap.battery) {
    el.append(makeAction('🔋', 'Akku', showBatteryDetails));
  }
  el.append(makeAction('🌿', 'Aroma', openAroma));
}
```

### 3.3 Datenmodell-Erweiterung

```javascript
// State (erweitert)
State.device = {
  type: 'volcano',        // 'volcano' | 'crafty' | 'mighty' | 'venty'
  name: 'S&B VOLCANO H',
  firmware: '',
  battery: null,          // null wenn nicht verfügbar
  boost: false,           // nur Venty
  superBoost: false,
  ecoCurrent: false,
  ecoVoltage: false,
};
```

LocalStorage-Migration für vorhandene User: alte `vol_*`-Keys bleiben, neuer Key `vol_last_device_type` wird mit `'volcano'` initialisiert falls undefined.

### 3.4 UI-Anpassungen

**Hero-Bereich:**
- Volcano: Pumpe-Indikator, Heizer-Indikator, Ballon-Status
- Crafty/Mighty: Heizer-Indikator + großer Akku-Indikator (auf Hero!)
- Venty: Heizer-Indikator + Akku + Boost-Indikator (orange wenn aktiv)

**Manuelle Steuerung:**
- „Pumpe für X Sek." nur bei `cap.pump` zeigen
- „Boost"-Slot (mit „Boost", „Super-Boost", „Aus"-Knöpfen) nur bei `cap.boost`

**Programme/DSL:**
- Bei Geräten ohne Pumpe: Pump-Steps grau ausblenden im Editor + Warnung „Nicht verfügbar auf [Gerät]"
- Bei Venty: Boost-Step als neuen Step-Typ hinzufügen (`{type:'boost', mode:'normal'|'super'|'off'}`)

**Settings → Erweitert:**
- Bestehender Bereich „Eigene Geräteprofile" bleibt
- Neuer Bereich „Geräte-Settings" zeigt gerätespezifische Optionen:
  - Volcano: Brightness, Auto-Shutoff, Display-on-Cooling, Vibration, Einheit °C/°F
  - Venty: Brightness (1-9), Vibration, Eco-Strom, Eco-Spannung
  - Crafty/Mighty: nur Hinweis „Diese Einstellungen sind nur am Gerät selbst änderbar"

---

## 4. Implementierungs-Reihenfolge (Iterationen)

### Iteration v5.0.0 — Foundation
1. `DeviceAdapter`-Basisklasse definieren
2. Bestehenden Volcano-Code in `VolcanoAdapter` kapseln (keine Verhaltensänderung)
3. Auto-Detection-Layer einbauen
4. Capabilities-System aktiv
5. Alle Quick-Actions / Steuerungen schalten via `State.adapter` und `capabilities`
6. Verify: Volcano funktioniert exakt wie v4.9.8

### Iteration v5.0.1 — CraftyMightyAdapter
1. Adapter implementieren (relativ simpel: 5 Chars)
2. Battery-Polling alle 30s
3. UI-Bits aktivieren: Pump verstecken, Battery-Hero zeigen
4. **Andre testet mit physischem Crafty/Mighty**, falls verfügbar
5. Fallback: Volcano-Funktion darf nicht regredieren

### Iteration v5.0.2 — VentyAdapter
1. Command-basiertes Protokoll implementieren (komplexer)
2. Notification-Subscribe und Response-Parsing
3. Boost / Super-Boost Quick-Actions + DSL-Step
4. **Andre testet mit physischer Venty**, falls verfügbar
5. Fallback: Volcano + Crafty/Mighty bleiben intakt

### Iteration v5.0.3 — Polish
1. Programm-Vorlagen pro Gerät anpassen (Crafty: kein Ballon-Schritt; Venty: Boost-Vorlagen)
2. Manual-Sektion in 4 Tabs: Volcano / Crafty+Mighty / Venty / Allgemein
3. Onboarding-Tour gerätespezifisch (Schritt „Ballon füllen" entfällt bei portablen Geräten)
4. Statistik nach Gerätetyp getrennt (separate Counter)

---

## 5. Bekannte Risiken / Unbekannte

1. **Mighty BLE-Verifikation fehlt:** Mighty hat laut Annahme dasselbe Protokoll wie Crafty (gleiche Storz&Bickel-Firmware-Familie), aber bestätigt ist nur Crafty. **Andre, falls Du eine Mighty zur Verfügung hast, ist das der primäre Test-Kandidat.**
2. **Venty Notification-Timing:** Im xythobuz-Code wartet er bis zu 500ms auf Notification nach jedem Write. Im Browser ist das via Promise + Timeout zu lösen. Möglicherweise braucht Venty zwischen Writes eine kleine Pause (50-100ms) — empirisch zu ermitteln.
3. **Venty Notification-Response-Parsing:** Im xythobuz-Code wird die Notification-Response geparst, aber das exakte Mapping (welches Byte ist Akku, welches Boost-Status etc.) ist nicht 100% dokumentiert. Wir loggen erstmal alles in die BLE-Console und parsen iterativ.
4. **Bluefy-iOS:** Andre testet auf iOS mit Bluefy. Web-Bluetooth-Spec ist dort identisch, sollte ohne Anpassung funktionieren. Falls aber Notifications langsamer kommen, könnte Venty-Adapter dort schlechter performen.
5. **Crafty Current-Temp Endian:** Im xythobuz-Code wird `uint16_t *v = (uint16_t *)buff` gemacht — auf ARM ist das Little-Endian. In Browser-JS: `new DataView(buff).getUint16(0, /*littleEndian*/ true)`. **Wichtig:** im Gegensatz zum Volcano-Code, der teils Uint32 LE × 10 nutzt, ist Crafty **Uint16 LE × 10**.

---

## 6. Andre's Test-Geräte (zu klären)

- [ ] **Volcano Hybrid** — vorhanden, läuft seit v4.9.x ✅
- [ ] **Crafty / Crafty+** — vorhanden? ____
- [ ] **Mighty / Mighty+** — vorhanden? ____
- [ ] **Venty** — vorhanden? ____

Davon hängt ab welcher Adapter in v5.0.1 vs v5.0.2 echt verifiziert wird (rest bleibt „Beta, unverified" bis Test).

---

## 7. Quellen (für Reproduzierbarkeit)

- `xythobuz/Volcano-Remote` (GitHub Mirror): https://github.com/xythobuz/Volcano-Remote
  - `src/volcano.c`, `src/crafty.c`, `src/venty.c` enthalten alle Protokoll-Details
  - GPLv3, daher Code-Inspiration OK, kein direkter Code-Übernahme empfohlen
- `firsttris/reactive-volcano-app`: https://github.com/firsttris/reactive-volcano-app
  - Web-Bluetooth-Beispiel-Implementierung, MIT
- S&B-Web-App-Troubleshooting (Device-Name-Patterns): https://www.storz-bickel.com/en-us/support/web/troubleshooting
- evilsocket Crafty-Hack (2017, einzelne UUID): https://www.evilsocket.net/2017/08/25/Mini-Post-Hacking-a-Herb-Vaporizer-using-GNU-Linux-and-BLE-raw-commands/
