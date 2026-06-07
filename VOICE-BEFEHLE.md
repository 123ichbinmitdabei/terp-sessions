# Voice-Befehle — Terp Sessions

Stand: v9.10.1 (alle hier gelisteten Befehle sind live)

Diese Anleitung listet alle Sprachbefehle der App. Mikrofon-Sprachbefehle funktionieren in Chrome und Edge (Android und Desktop). In Bluefy auf iOS ist das Mikrofon nicht verfügbar, dort stehen stattdessen der Text-Befehl-Knopf sowie URL- und Siri-Befehle bereit (siehe SIRI-SHORTCUTS-ANLEITUNG.md).

---

## Aktivierung

Es gibt zwei Wege einen Befehl zu starten:

1. **Mikrofon-Button** (FAB unten rechts) antippen, kurze Bestätigung abwarten, sprechen.
2. **Wake-Word** „Hey Sessions" oder „Hey Terp Sessions" sagen (wenn in Settings aktiviert), kurzer Ton, dann sprechen.

Nach jedem Befehl gibt es eine TTS-Bestätigung. Diese kann in Settings auf „Knappe Ansagen" gestellt werden, dann werden die Bestätigungen kürzer.

---

## Hilfe

| Befehl | Wirkung |
|---|---|
| „Hilfe" | Liest alle verfügbaren Befehle als Kategorien vor |

---

## Navigation

| Befehl | Wirkung |
|---|---|
| „öffne Steuerung" | Wechselt zum Steuerungs-Tab |
| „öffne Programme" | Wechselt zum Programme-Tab |
| „öffne Sorten" | Wechselt zum Sorten-Tab |
| „öffne Setup" | Wechselt zum Setup-Tab |
| „schließe" | Aktuelles Modal schließen |
| „zurück" | Navigation zurück (gleiche Wirkung) |

---

## Gerät steuern

| Befehl | Wirkung |
|---|---|
| „heize an" | Heizer einschalten |
| „heize aus" | Heizer ausschalten |
| „auf 185 Grad" | Solltemperatur setzen (jede Zahl 40 bis 230) |
| „wärmer" | Solltemperatur +5°C |
| „kälter" | Solltemperatur -5°C |
| „pumpe an" | Pumpe einschalten |
| „pumpe aus" | Pumpe ausschalten |
| „pumpe 20 Sekunden" | Pumpe für angegebene Zeit laufen lassen |
| „Ballon füllen" | Standard-Pumpvorgang starten |
| „Status" | Aktueller Geräte-Status wird vorgelesen |
| „alles stoppen" | Heizer + Pumpe sofort aus |

---

## Programme

| Befehl | Wirkung |
|---|---|
| „starte Programm <Name>" | Programm starten (Name aus deinen oder den Werks-Programmen) |
| „stoppe das Programm" | Programm beenden, Gerät bleibt im aktuellen Zustand |

### Programm-Steuerung (seit v9.8.0)

Diese Befehle funktionieren während ein Programm läuft:

| Befehl | Synonyme | Wirkung |
|---|---|---|
| „pause" | „anhalten", „halt das programm" | Programm pausiert, Gerät bleibt wie es ist |
| „weiter" | „fortsetzen", „weitermachen" | Programm wird fortgesetzt |
| „nächster schritt" | „weiter zum nächsten" | Aktuellen Step überspringen, Pumpe wird bei Skip eines pump_for-Steps sofort ausgeschaltet |
| „vorheriger schritt" | „schritt zurück" | Einen Step zurück (Aktionen werden NICHT rückgängig gemacht, nur der Programm-Zeiger wird zurückgesetzt) |

**Hinweis zur Pause:** Wenn ein Programm 30 Minuten pausiert bleibt, wird es automatisch beendet (mit Voice-Hinweis). Das verhindert ein „vergessenes" Programm das ewig im Hintergrund hängt.

---

## Sorten

| Befehl | Wirkung |
|---|---|
| „öffne Sorte <Name>" | Sorten-Detail öffnen |
| „suche Sorte <Wort>" | Sorten-Filter nach Stichwort |
| „sorten mit <Wort>" | Synonym zur Suche |
| „bewerte Sorte <Name> mit 4 Sternen" | Bewertung speichern (Community-Sorte) |
| „bewerte Sorte <Name> mit 4 Blättern" | Synonym, gleiche Wirkung |
| „bewerte mit 4 Sternen" | Geöffnete Sorte bewerten |
| „bewerte mit 4 Blättern" | Synonym |

**Hinweis:** Die App nutzt visuell Cannabis-Blätter statt Sterne. Der Voice-Parser versteht beide Wörter, die TTS-Bestätigung sagt „Blätter".

---

## Sonstiges

| Befehl | Wirkung |
|---|---|
| „wiederhole" | Letzte TTS-Ansage wird wiederholt |

---

## Settings die das Voice-Erlebnis beeinflussen

Alle in Settings → Sprache & Ansagen:

- **Knappe Ansagen** — TTS-Bestätigungen werden kürzer
- **Sprechgeschwindigkeit** — TTS-Tempo (Slider)
- **Sprech-Lautstärke** — TTS-Volume (Slider)
- **Ich nutze einen Screen-Reader** — schaltet App-TTS aus, damit es sich nicht mit VoiceOver überlagert
- **Voice-Verbosity** — wie ausführlich die App spricht

---

## Siri-Shortcuts (iOS-spezifisch)

Für tiefere Integration mit iOS gibt es zusätzlich Siri-Shortcuts über URL-Commands. Siehe separate Anleitung: `SIRI-SHORTCUTS-ANLEITUNG.md`

---

## Pioneer-Tester-Hinweis

Wenn ein Befehl nicht funktioniert oder eine Bestätigung komisch klingt: bitte als Bug-Report melden, mit dem genauen Wortlaut den ihr gesagt habt, und was ihr erwartet hättet.

„Hilfe" zeigt immer den aktuellen Stand der unterstützten Befehle. Wenn ein neuer Befehl hinzukommt, taucht er dort automatisch auf.

---

## Bekannte Grenzen

- **Bluefy + VoiceOver gleichzeitig:** Die App-TTS und VoiceOver können sich überlagern. Lösung: in Settings „Ich nutze einen Screen-Reader" aktivieren, dann sagt nur VoiceOver, die App schweigt.
- **Lange Wartezeiten in Programmen:** Bis v9.7.1 reagiert „stoppe das Programm" erst nach Ende des aktuellen Steps. Ab v9.8.0 reagiert es innerhalb von ~200ms.
- **Wake-Word:** funktioniert nur in Chrome und Edge (Android und Desktop). In Safari und Bluefy auf iOS ist das Mikrofon nicht für Wake-Word-Daueraufnahme verfügbar.
