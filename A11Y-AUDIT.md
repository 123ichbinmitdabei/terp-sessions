# A11Y-Audit — v8.6.0 Vorher-Zustand

> Generiert via `audit-a11y.mjs` (temporäres Script, wird am Ende der v8.7.0-Session gelöscht). Output dient als Baseline für die Phase-B-Fixes.

## Zusammenfassung

| Befund | Anzahl |
|---|---|
| Interaktive Elemente OHNE accessible name (button/a/input ohne Text+aria+title+alt) | **72** |
| `<div>/<span>` mit onclick ohne role=button/tabindex/keyhandler | **0** |
| Skip-Link „Zum Hauptinhalt" vorhanden | ✅ |
| `<main>`-Element vorhanden | ✅ |
| Modal-Fokus-Trap im Code | ✅ |
| Modale Dialoge insgesamt | 29 |
| Geprüfte Farbpaare | 9 |
| Farbpaare unter WCAG AA 4.5:1 | **0** |
| Touch-Targets unter 44 CSS-Px | **8** |
| `srAnnounce()`-Aufrufe gefunden | 10 |
| `ttsEvent()`-Event-Namen registriert | 12 |

## Interaktive Elemente OHNE accessible name (Ausschnitt)

- `<input>` id=tInput  — `class="mono" id="tInput" type="number" min="40" max="230" step="1" value="185" inputmode="numeric"`
- `<input>` id=pInput  — `class="mono" id="pInput" type="number" min="1" max="120" step="1" value="15" inputmode="numeric"`
- `<input>` id=sInput  — `class="mono" id="sInput" type="number" min="1" max="60" step="1" value="20" inputmode="numeric"`
- `<input>` id=fileImport  — `type="file" id="fileImport" accept="application/json" hidden`
- `<input>`   — `type="checkbox" data-tf="strength"`
- `<input>`   — `type="checkbox" data-tf="effect"`
- `<input>`   — `type="checkbox" data-tf="aroma"`
- `<input>`   — `type="checkbox" data-tf="moodBefore"`
- `<input>`   — `type="checkbox" data-tf="moodAfter"`
- `<input>`   — `type="checkbox" data-tf="purpose"`
- `<input>`   — `type="checkbox" data-tf="tags"`
- `<input>`   — `type="checkbox" data-tf="notes"`
- `<input>` id=uuidServiceState  — `class="input mono" id="uuidServiceState" value="10100000-5354-4f52-5a26-4249434b454c"`
- `<input>` id=uuidServiceControl  — `class="input mono" id="uuidServiceControl" value="10110000-5354-4f52-5a26-4249434b454c"`
- `<input>` id=uuidSetTemp  — `class="input mono" id="uuidSetTemp" value="10110003-5354-4f52-5a26-4249434b454c"`
- `<input>` id=uuidCurTemp  — `class="input mono" id="uuidCurTemp" value="10110001-5354-4f52-5a26-4249434b454c"`
- `<input>` id=uuidActivity  — `class="input mono" id="uuidActivity" value="1010000c-5354-4f52-5a26-4249434b454c"`
- `<input>` id=uuidHeaterOn  — `class="input mono" id="uuidHeaterOn" value="1011000f-5354-4f52-5a26-4249434b454c"`
- `<input>` id=uuidHeaterOff  — `class="input mono" id="uuidHeaterOff" value="10110010-5354-4f52-5a26-4249434b454c"`
- `<input>` id=uuidPumpOn  — `class="input mono" id="uuidPumpOn" value="10110013-5354-4f52-5a26-4249434b454c"`
- `<input>` id=uuidPumpOff  — `class="input mono" id="uuidPumpOff" value="10110014-5354-4f52-5a26-4249434b454c"`
- `<input>` id=sessStrength  — `type="range" id="sessStrength" min="1" max="10" step="1" value="5" style="width:100%" oninput="document.getElementById('`
- `<input>` id=sessMoodBefore  — `type="range" id="sessMoodBefore" min="1" max="5" step="1" value="3" style="width:100%" oninput="document.getElementById(`
- `<input>` id=sessMoodAfter  — `type="range" id="sessMoodAfter" min="1" max="5" step="1" value="3" style="width:100%" oninput="document.getElementById('`
- `<textarea>` id=shareLinkText  — `class="input mono" id="shareLinkText" rows="3" readonly style="font-size:11px;word-break:break-all"`
- … und 15 weitere (siehe `audit-a11y.json`)

## div/span mit onclick (Semantik-Risiko)


## Modale Dialoge (Ids)

- `modalSession`
- `modalSlides`
- `modalBeta`
- `modalShareExport`
- `modalShareImport`
- `modalEditor`
- `modalAddStep`
- `modalStepEdit`
- `modalWizard`
- `modalDevice`
- `modalHelp`
- `modalSettings`
- `modalBag`
- `modalAroma`
- `modalAromaDetail`
- `modalQR`
- `modalStepTpl`
- `modalAch`
- `modalAudio`
- `modalLearn`
- `modalSymptoms`
- `modalUsers`
- `modalManual`
- `modalDsl`
- `modalBleConsole`
- `modalBagEditor`
- `modalShortcuts`
- `modalSchedule`
- `modalScheduleEditor`

## Kontrast-Befunde (WCAG AA = 4.5:1 Text, 3:1 Large)

| Vordergrund (`--`) | Hintergrund (`--`) | Werte | Ratio | AA-Text | AA-Large | AAA-Text |
|---|---|---|---|---|---|---|
| text | bg | #f5ede0 / #0c0a08 | **17.01** | ✅ | ✅ | ✅ |
| muted | bg | #998873 / #0c0a08 | **5.76** | ✅ | ✅ | ❌ |
| hot | bg | #ff5722 / #0c0a08 | **6.25** | ✅ | ✅ | ❌ |
| text | bg-2 | #f5ede0 / #1d1813 | **15.16** | ✅ | ✅ | ✅ |
| muted | bg-2 | #998873 / #1d1813 | **5.14** | ✅ | ✅ | ❌ |
| text | bg-3 | #f5ede0 / #2a221a | **13.47** | ✅ | ✅ | ✅ |
| ok | bg | #34d399 / #0c0a08 | **10.28** | ✅ | ✅ | ✅ |
| warn | bg | #fbbf24 / #0c0a08 | **11.84** | ✅ | ✅ | ✅ |
| err | bg | #f87171 / #0c0a08 | **7.14** | ✅ | ✅ | ✅ |

## Touch-Targets (heuristisch aus CSS-Regeln)

| Selector | effektive Höhe | WCAG-2.5.5 (44 px) |
|---|---|---|
| `.btn.sm` | 36 px | ❌ |
| `.btn` | 48 px | ✅ |
| `.toggle` | 24 px | ❌ |
| `.nav-btn` | 16 px | ❌ |
| `.quick-action` | 80 px | ✅ |
| `.help-ico` | 24 px | ❌ |
| `.user-avatar` | 24 px | ❌ |
| `.aroma-temp` | 10 px | ❌ |
| `.sess-effect` | 12 px | ❌ |
| `.aroma-pill` | 8 px | ❌ |

## TTS-Event-Namen aktuell registriert

`heaterOn`, `heaterOff`, `pumpOn`, `pumpOff`, `programStart`, `programStepChange`, `programEnd`, `errors`, `sessionStart`, `sessionEnd`, `name`, `tempReached`

## `srAnnounce()`-Aufrufe (Stichprobe)

- `msg`
- `msg, urgent=false`
- ``Zieltemperatur ${temp} Grad erreicht`, true`
- `'Verbindung verloren, versuche Reconnect', true`
- ``Programm gestartet: ${p.name}``
- `'Ballon gefüllt', true`
- `'Bereit zum Ziehen', false`
- ``Pre-Heat geplant in ${min} Minuten auf ${temp} Grad`, false`
- `'Pre-Heat Zeit erreicht. Bitte manuell verbinden und starten.', true`
- ``Pre-Heat aktiv. Heizer an, Ziel ${preheatTargetTemp} Grad`, true`