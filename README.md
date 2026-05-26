# Sessions — S&B Vape Controller (v4.9.6)

Web-App zur Steuerung von Storz & Bickel Vaporizern. Single-File HTML PWA, ~404 KB.

## Was ist neu in v4.9.6 — Tutorial-Assistent + universelle Tooltips + Mobile-Gesten

Andre's Real-World-Feedback:
- „Wenn Pre-Heat abgebrochen, sollte die Anzeige verschwinden" — Bug ✅
- „Nicht alle Knöpfe haben einen [Tooltip]" — ✅
- „Es wäre gut wenn es auch zu den Programmen einen gäbe, so dass auch diese kurz erläutert werden" — ✅
- „Eine genaue Anleitung wie man ein Programm zum ersten Mal durchführt, mit Tipps wie ein Assistent" — ✅
- „Bedienung über Tastatur funktioniert, brauchen aber was fürs Handy/Tablet" — ✅

### 🐛 Bug-Fix: Pre-Heat-Abbrechen

`cancelPreheat()` setzt jetzt zusätzlich `style.display = 'none'` und cleart den Info-Text. Auch `startPreheatCountdown()` resettet explizit das `display`. Verhindert Geister-Anzeige nach Abbruch.

### 🆕 Onboarding-Tour wie ein Assistent

Beim ersten App-Start zeigt sich automatisch ein **8-Schritte-Walkthrough mit Spotlight**:

1. Willkommen + Tour-Erklärung
2. Bluetooth verbinden (Highlight: Verbinden-Knopf in der Topbar)
3. Status auf einen Blick (Highlight: Hero-Card)
4. Quick-Actions (Highlight: Direkt-Zug)
5. Programme-Tab (Highlight: Programme-Knopf in Bottom-Nav)
6. Setup-Tab (Highlight: Setup-Knopf)
7. ? = Anleitung (Highlight: Hilfe-Knopf)
8. Tipps zum Schluss (Long-Press-Hinweis, ESC, V-Taste, Siri)

**Features:**
- Spotlight mit Puls-Animation um das aktuelle Element
- Scroll-into-View automatisch wenn Element nicht sichtbar
- Bubble mit Schritt-Zähler („Schritt 3 / 8")
- Buttons: Überspringen / Zurück / Weiter / Los geht's
- ESC zum Abbrechen
- LocalStorage merkt sich ob Tour gelaufen ist (`vol_tour_completed`)
- Settings → Daten → „🎓 Tour neu starten" jederzeit re-startbar

### 🆕 Universelle Tooltips für ALLE Knöpfe (auch dynamische)

**Vorher:** Tooltips nur für die ~50 IDs im TOOLTIPS-Dict. Dynamisch erzeugte Knöpfe (Programme, Aroma-Karten, Devices) bekamen nichts.

**Jetzt:**
1. **`data-tip` Attribut** überall: jeder Button kann einen Tip mitbringen
2. **`installTooltipBehavior(root)`** scannt alle Elemente mit `data-tip` ODER `aria-label` (auf Buttons/Links/Toggles/Tabs)
3. **MutationObserver `setupDynamicTooltips()`** beobachtet neue DOM-Knoten und installiert Tooltips automatisch
4. **`data-tipBound` Flag** verhindert Doppel-Bindung

**Programme-Tooltips:**
- Jede Karte hat einen Tip mit Programmbeschreibung + geschätzte Dauer (Long-Press auf die Karte)
- Jeder Aktions-Button hat eigenen Tip:
  - „Programm jetzt starten — automatischer Ablauf der Schritte"
  - „Schritte und Einstellungen bearbeiten"
  - „QR-Code erzeugen zum Teilen per Handy-Scan"
  - „Als Home-Assistant-Script-YAML herunterladen (Phase 2)"
  - „Programm dauerhaft löschen"

**Mehr Tooltips:**
- Heizer-Hauptknopf, „Letztes Programm nochmal", „+ Neues Programm"
- Bottom-Nav-Tabs erklären sich selbst
- Tour-Reset-Knopf erklärt sich selbst

### 🆕 Mobile-Gesten als Tastatur-Equivalent

**Swipe links / rechts** im Body wechselt zwischen den Tabs (Steuerung → Programme → Setup):
- Swipe-Mindeststrecke: 80px horizontal
- Max-Zeit: 500ms (sonst kein Swipe)
- Vertikal-Verschiebung > Horizontal: ignoriert (sonst würde Scrollen Tab wechseln)
- Ignoriert Inputs, Buttons, Modals, Stepper, Pills (nur "freie" Areas)
- Haptisches Feedback bei erfolgreichem Wechsel

**Long-Press (1 Sek) auf die Hero-Card** = V-Taste-Equivalent → Status wird per TTS vorgelesen:
- „Aktuelle Temperatur 185 Grad, Heizer an, Ziel 185 Grad"
- Funktioniert ohne Tastatur — wichtig für Mobile-User mit Blinden-Modus
- Dreifach-Vibration als Bestätigung

**Was bleibt für Tastatur-Nutzer:**
- 1-9 → Lieblings-Temperatur
- Space → Heizer
- B / D / V / ESC → Ballon / Direkt-Zug / Status / Notaus
- Tastatur-Shortcut-Liste weiter in Settings → Inklusion

### Was war in v4.9.5 (zur Erinnerung)

UX-Reparatur: Schriftgröße via `zoom` (statt fontSize), Blindenmodus mit UI-Sync, Mikrofon graceful Error, Bottom-Padding 220+safe, einklappbare Karten, echtes Responsive.

### Was bleibt offen

1. **Crafty / Mighty / Venty BLE-Implementierung** — UUIDs sind im Code, aber die echte BLE-Kommunikation ist nur für Volcano implementiert. Diese Geräte haben anderen Char-Sets. **Größerer Bau, v5.0.** Andre wünscht alle Geräte funktional.
2. **App-Erweiterungen** — Andre hat gesagt „alles nochmal anschauen und erweitern, professionalisieren". Vage; ich brauche pro App konkrete Wünsche. Vorschlag: nach Tour-Lauf am echten Gerät zeigt sich was wirklich noch fehlt.

## Was zu testen ist

### Sofort beim Reload (PWA-Update)
1. **Erster Start** → Tour startet nach 1.2s automatisch
2. **Tour „Weiter"** durchklicken bis zum Ende → speichert `vol_tour_completed=true`

### Pre-Heat Bug
3. Quick-Action „Pre-Heat" → 1 Min eingeben → Anzeige erscheint im Hero
4. ×-Knopf in der Pre-Heat-Anzeige drücken → **Anzeige muss verschwinden**

### Tooltips
5. **Lange auf JEDEN Knopf tippen** (>0.5s) → Popup mit Erklärung
6. **Lange auf eine Programm-Karte tippen** → Programm-Beschreibung + Dauer

### Mobile-Gesten
7. **Swipe nach links** in der Mitte vom Steuerung-Tab → wechselt zu Programme
8. **Swipe nach rechts** in Setup → zurück zu Programme
9. **Lange auf Hero-Card drücken** (1 Sek) → TTS spricht aktuellen Status

### Tour re-startbar
10. Settings → Daten → „🎓 Tour neu starten" → Tour läuft erneut

## Roadmap

**v5.0**: Crafty / Mighty / Venty BLE-Implementierung (eigenes Char-Set, größerer Bau)
**v4.10**: 3D-Volcano-Vorschau (Three.js dynamic, optional)
**Phase 2**: Pi 4 + HA + HACS + Alexa-Skill

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt. **Niemals unbeaufsichtigt füllen.**
