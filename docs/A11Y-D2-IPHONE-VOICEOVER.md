# A11Y-D2, VoiceOver-Test am iPhone (1-Hand-Anleitung)

Stand: v9.27.0
Ziel: in 10 bis 15 Minuten die 5 Tester-Pfade mit VoiceOver durchgehen und pruefen, ob die A11Y-D2-Fixes wirken. Geschrieben fuer Andre, nicht fuer den blinden Tester selbst.

## Vorbereitung

- iPhone, Safari (oder Bluefy, falls echte Bluetooth-Verbindung getestet werden soll). Web Bluetooth geht in Safari NICHT, fuer die reine VoiceOver-Pruefung reicht Safari trotzdem, da fast alles ohne Geraet ansagbar ist.
- VoiceOver einschalten: Einstellungen, Bedienungshilfen, VoiceOver, AN. Oder Seitentaste 3x (wenn als Kurzbefehl gesetzt).
- Wichtigste Gesten:
  - **Nach rechts wischen** = naechstes Element (das ist die „Lese-Reihenfolge", um die es hier geht).
  - **Nach links wischen** = vorheriges Element.
  - **Doppeltipp** = aktivieren (Taste druecken).
  - **Mit einem Finger ueber den Schirm fahren** = Touch-Exploration (was ist wo).
- App oeffnen: https://123ichbinmitdabei.github.io/terp-sessions/
- Tipp: vor dem Test einmal kurz die Onboarding-Tour wegtippen, damit sie die Reihenfolge nicht ueberlagert.

## Pfad 1, App starten und verbinden

1. **Geste:** Vom oberen Rand nach rechts durchwischen.
   **Erwartet:** „Terp Sessions" (Banner), dann „Getrennt" (Status), dann „Mit Vaporizer verbinden, Taste".
   **Haeufiger Fehler:** ein nackter Punkt oder ein Emoji wird vorgelesen (dekoratives Element nicht versteckt). Sollte nicht passieren.
2. **Geste:** Auf „Mit Vaporizer verbinden" doppeltippen (nur mit echtem Geraet/Bluefy sinnvoll).
   **Erwartet (NEU in v9.27.0):** nach dem Verbinden wird der Toast „Verbunden mit <Geraetename>" automatisch vorgelesen, ohne dass man ihn suchen muss.
   **Haeufiger Fehler:** Stille nach dem Verbinden. Das war der alte Zustand (Toast war stumm) und ist jetzt behoben.

## Pfad 2, Programm starten und stoppen

3. **Geste:** Unten zur Tab-Leiste wischen, „Programme, Tab" suchen, doppeltippen.
   **Erwartet:** VoiceOver sagt „Programme, Tab, ausgewaehlt" und betritt danach den passenden Bereich als „Tab-Panel" (NEU: role=tabpanel).
   **Haeufiger Fehler:** Tab sagt „ausgewaehlt", aber der Inhalt wird nicht als zugehoeriges Panel erkannt. Mit dem Fix sollte die Zuordnung sauber sein.
4. **Geste:** Ein Programm in der Liste doppeltippen, dann „Start" doppeltippen.
   **Erwartet (NEU):** „Programm gestartet: <Name>, <N> Schritte" wird angesagt, auch im Screen-Reader-Modus.
   **Haeufiger Fehler:** kein hoerbarer Start. War vorher nur ein stummes TTS-Event.
5. **Geste:** Waehrend der Lauf laeuft, nichts tun, nur zuhoeren beim Schrittwechsel.
   **Erwartet (NEU):** „Schritt 3 / 7" wird als Einheit vorgelesen (aria-atomic), nicht nur die geaenderte Zahl.
   **Haeufiger Fehler:** nur „3" oder nur „7" wird gesprochen. Jetzt kommt der ganze Satz.
6. **Geste:** „Programm stoppen" suchen, doppeltippen.
   **Erwartet:** „Programm stoppen und Geraet ausschalten, Taste", danach Rueckmeldung als Toast (jetzt hoerbar).

## Pfad 3, Sorte finden und bewerten

7. **Geste:** Zum Aroma-/Sorten-Bereich wischen, ins Suchfeld tippen.
   **Erwartet:** „Aroma suchen, Textfeld". Eingabe per Diktat oder Tastatur.
8. **Geste:** Eine Sorte oeffnen (Doppeltipp), im Detail-Dialog nach rechts wischen.
   **Erwartet:** Der Fokus springt IN den Dialog, der Hintergrund ist nicht mehr erreichbar (Inert). Beim Schliessen kehrt der Fokus zur Sorte zurueck.
9. **Geste:** Zur Bewertung wischen (die Blaetter).
   **Erwartet:** „Bewertung, X von 5 Blaettern" als Gruppe, jedes Blatt als „N von 5 Blättern, ausgewaehlt/nicht ausgewaehlt".
   **Haeufiger Fehler:** Blaetter sind sehr klein. Auswahl per VoiceOver-Doppeltipp geht trotzdem, weil sie als Radio ausgezeichnet sind. (Groessere Touch-Ziele sind fuer A11Y-D3 vorgemerkt.)

## Pfad 4, Quick-Action ausloesen

10. **Geste:** Auf der Steuern-Seite zu den Quick-Actions wischen.
    **Erwartet (NEU):** „Direkt-Zug, 5 Sek., Taste" statt nur „Direkt-Zug". Die Meta-Info (Dauer/Status) wird jetzt mit angesagt.
    **Haeufiger Fehler:** nur das Label ohne Dauer. Das war der alte Zustand (Label hat die Meta verschluckt).
11. **Geste:** ueber die Quick-Action-Reihe mit dem Finger fahren (Touch-Exploration).
    **Erwartet:** kein doppeltes Vorlesen des Icons (Icon ist aria-hidden), nur der sprechende Text.

## Pfad 5, Dialoge und Toasts

12. **Geste:** Eine Aktion ausloesen, die einen Toast erzeugt (z.B. Sorte speichern).
    **Erwartet (NEU):** der Toast wird vorgelesen, ohne dass man ihn anwischen muss („Sorte gespeichert").
    **Haeufiger Fehler:** Stille. Das war der zentrale alte Mangel und ist der wichtigste Fix.
13. **Geste:** Einen Bestaetigungs-Dialog ausloesen (z.B. etwas loeschen), darin wischen.
    **Erwartet:** Titel und Beschreibung werden gelesen, der Fokus bleibt im Dialog, „Abbrechen"/„OK" sind erreichbar, nach dem Schliessen kehrt der Fokus zurueck.
14. **Geste:** Im Dialog nach links/rechts wischen und versuchen, hinter den Dialog zu kommen.
    **Erwartet:** man bleibt im Dialog gefangen (Inert auf dem Hintergrund), kein Durchwischen zur App dahinter.

## Wenn etwas nicht stimmt

- Notiere pro Schritt: was VoiceOver gesagt hat vs. was erwartet war.
- Screenshot hilft nicht (VoiceOver ist Audio). Lieber kurz als Sprachnotiz festhalten oder den Bug-Report in der App nutzen (Pioneer-Bereich).
- Punkte, die bewusst noch offen sind (A11Y-D3): Pfeiltasten-Navigation in der Tab-Leiste, groessere Blatt-Touch-Ziele, Geraetename direkt im Verbindungs-Chip-Text.
