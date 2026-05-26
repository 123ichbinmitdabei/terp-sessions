# Sessions — S&B Vape Controller (v4.9.5)

Web-App zur Steuerung von Storz & Bickel Vaporizern (Volcano Hybrid, Crafty, Mighty, Venty) über Web Bluetooth.
Single-File HTML PWA, ~392 KB, mobile-first, accessibility-zentriert.

## Was ist neu in v4.9.5 — UX-Reparatur-Patch

Andre's Real-World-Test ergab mehrere ernsthafte UX-Probleme. Dieser Patch repariert sie.

### Bug-Fixes

#### Schriftgröße funktionierte nicht — JETZT GEFIXED

**Ursache:** 184 hardcodierte `font-size: Npx` im CSS. Das alte `applyFontScale()` setzte `html.style.fontSize`, was nur rem/em-Werte ändert. Hardcoded px-Werte blieben unverändert → optisch keine Wirkung.

**Fix:** Umstellung auf CSS `zoom` Property statt font-size. `main.wrap { zoom: var(--app-zoom) }` skaliert tatsächlich alle Pixel-Werte linear — auch die hardcoded px. Funktioniert auch in den Modal-Sheets. Die fixed Bottom-Nav und Voice-FAB bleiben unverändert (sind direkte body-Kinder, nicht im `main`).

**Tests:** Settings → Inklusion → Schriftgröße: A / A / A drücken. Jetzt sichtbar 100% / 125% / 150% Skalierung der gesamten App. Aktiver Button orange markiert. Toast bestätigt.

#### Blindenmodus aktivierte nur Sprache — JETZT GEFIXED

**Ursache:** toggleBlindMode rief zwar applyFontScale + applyHighContrast, aber wegen dem Schrift-Bug oben war der Effekt visuell nicht da. Außerdem wurden die anderen Toggle-UI-States in Settings nicht synchronisiert.

**Fix:** 
1. Mit dem zoom-System wirkt jetzt fontScale=150 tatsächlich
2. Neue `syncToggle()`-Helper synchronisiert ALLE UI-Toggles in Settings sobald Blindenmodus toggle wird: togBlindMode, togHighContrast, togVoiceReadout, togTooltipsVoice, togHaptiCustom, togSound, togHaptic

**Tests:** Settings → Inklusion → ♿ Blinden-Modus aktivieren → Sofort: Schrift 150%, Hochkontrast an, Voice-Readout an, alle Toggles sind UI-seitig richtig. TTS-Ansage spricht Shortcuts vor.

#### Mikrofon „service-not-allowed" — JETZT KLARE FEHLERMELDUNG

**Ursache:** Web Speech API (SpeechRecognition) wird von Bluefy iOS und vielen Mobile-Browsern nicht unterstützt. Generischer Fehler „Fehler: service-not-allowed" war unhilfreich.

**Fix:** Spezifische Fehler-Erkennung mit verständlichem Toast:
- `service-not-allowed` / `not-allowed`: „Browser erlaubt Spracherkennung nicht. iOS Safari/Bluefy unterstützen das leider nicht. Nutze Chrome auf Android oder Desktop, oder die URL-Commands für Siri."
- `no-speech`: „Nichts gehört. Erneut versuchen."
- `audio-capture`: „Kein Mikrofon-Zugriff. Bitte Berechtigung erteilen."
- `network`: „Netzwerk-Fehler. Spracherkennung braucht Internet."

Plus: Hinweis auf URL-Commands aus v4.9.4 als Alternative bei nicht-unterstütztem Browser.

#### Tooltips funktionierten auf Touch nicht — VERBESSERT

**Ursache:** `title`-Attribut zeigt auf Touch keinen Tooltip. Long-Press wurde manchmal vom Browser mit Kontextmenü überschrieben.

**Fix:**
- aria-label statt nur title (Screenreader-Support)
- `touch-action: manipulation` auf den Elementen
- Pointer-Move während Long-Press (>8px) bricht den Press ab (Scroll-Intent)
- pointerleave + pointercancel werden gehandelt
- Beim Trigger: `e.preventDefault()` für Browser-Default-Unterdrückung
- contextmenu-Listener verhindert Kontextmenü während Tooltip sichtbar
- Vibrations-Feedback (kurze 20ms-Pulse) wenn Tooltip erscheint

### Layout-Fixes

#### Bottom nicht vollständig sichtbar — NOCH MEHR PADDING

| | Vorher (v4.9.2) | Jetzt (v4.9.5) |
|---|---|---|
| Body padding-bottom | 170+safe | **220+safe** |
| Letzte Card margin-bottom | 30px | **60px** |
| Body :has(.run-card.show) | 250+safe | **300+safe** |

Plus `scroll-padding-bottom: 180+safe` damit Anker/Focus nicht hinter der Bottom-Nav landen.

#### Responsive war nicht — JETZT WIRKLICH

| Bildschirmbreite | Verhalten |
|---|---|
| <760px (Handy) | wrap padding 14/12/20, max-width 580px |
| 760-1100px (Tablet) | wrap padding 24/20/30, max-width 720px, größere Card-Padding |
| >1100px (Desktop) | max-width 880px |

Plus **defensive word-wrap überall**:
- `overflow-wrap: anywhere` auf .card, .toggle-row, .info, .prog-name etc.
- `flex-wrap: wrap` auf .toggle-row (lange Texte umbrechen statt zu pushen)
- `max-width: 100%` auf alle .input und .stepper-Inputs

#### Lange Wörter brachen Layout — GEFIXED

`word-break: break-all` für .mono, code, pre (UUIDs, lange URLs).

### Neues Feature: Einklappbare Karten

User-Wunsch: „Kacheln sollen einklappbar sein, damit ich mir aussuchen kann was ich nutzen will".

**Implementierung:**
- Jede Card mit `<h3>`-Header ist jetzt klappbar
- Pfeil ▾ rechts am Header zeigt State (▾ ausgeklappt, ◂ eingeklappt)
- Tap/Click auf den H3-Text klappt die Card zu oder auf
- State pro Card wird im LocalStorage gespeichert (`vol_card_collapse`) → bleibt nach Reload
- Tastatur: Enter oder Space auf fokussiertem H3 klappt um (aria-expanded korrekt)
- Klick auf interne Buttons (Help-Icon, andere Knöpfe in H3) klappt NICHT

So kann jeder seine Setup-Seite auf die Karten reduzieren die er wirklich nutzt.

### Was bleibt offen (für nächste Versionen)

1. **Crafty / Mighty / Venty BLE-Implementierung** — UUIDs sind im Code, aber die echte BLE-Kommunikation wurde nur für Volcano implementiert. Diese Geräte haben anderen Char-Sets. Größerer Bau, v4.10 oder v5.0.
2. **App-Erweiterungen** — Andre wünschte „alle Anwendungen erweitern". Vage; ich brauche pro App konkrete Wünsche.

## Was war in v4.9.4

URL-Sprachsteuerung (Siri Shortcuts, Google Routinen), Plattform-Erkennung mit Banner, Google-Fonts ORB-Fix.

## Testliste v4.9.5

### Bug-Fixes
1. **Settings → Inklusion → A / A / A** drücken → App skaliert wirklich, aktiver Button orange
2. **♿ Blinden-Modus**: Schriftgröße 150%, alle Toggles in UI synchron, TTS spricht
3. **Mikrofon-FAB** auf iOS/Bluefy: klare Toast-Meldung mit Workaround-Hinweis
4. **Tooltip auf Knopf lange tippen**: Popup erscheint, Browser-Kontextmenü unterdrückt, Scroll-Move bricht ab

### Layout
5. **Setup-Tab scrollen bis ganz unten**: letzte Card mit allen Buttons sichtbar
6. **Programm starten** (Run-Card aktiv): Padding springt auf 300px, Run-Card überdeckt nichts
7. **Auf Desktop / breitem Tablet öffnen**: App nutzt mehr Platz, max-width 720/880px
8. **Lange Geräte-UUIDs in BLE-Console**: brechen jetzt sauber um statt Layout zu sprengen

### Einklappbare Cards
9. **Setup → eine Card-Überschrift tippen** (z.B. „Wartung & Pflege") → klappt zu, Pfeil rotiert
10. **App neu laden** → Cards bleiben im gleichen Zustand (LocalStorage)
11. **Help-Icon-Knopf in einer Card-Überschrift**: klappt nicht zu

## Roadmap

**v4.10 (auf Andre's Go)**: 3D-Volcano-Vorschau mit Three.js (dynamic load)

**v5.0 (größerer Bau)**: BLE-Implementierung für Crafty / Mighty / Venty mit deren spezifischem Char-Set

**Phase 2 (Andre sagt Bescheid)**: Pi 4 + HA + HACS + Alexa-Skill

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt. **Niemals unbeaufsichtigt füllen.**
