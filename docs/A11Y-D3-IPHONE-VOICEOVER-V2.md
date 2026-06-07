# A11Y-D3, VoiceOver-Test am iPhone (Anhang V2)

Stand: v9.30.0. Ergaenzung zur v9.27-Matrix (A11Y-D2-IPHONE-VOICEOVER.md). Hier nur die drei neuen Punkte aus A11Y-D3. Geste / erwartete Ansage / haeufiger Fehler.

## 1. Pfeiltasten im Tab-Wechsel (vor allem mit externer Tastatur)

Hinweis: Auf reinem Touch nutzt du Tabs per Wisch + Doppeltipp wie gehabt. Dieser Punkt ist fuer Tester mit Bluetooth-Tastatur relevant.

1. **Geste:** Mit Tab-Taste bis zur unteren Navigation, dann **Pfeil-Rechts**.
   **Erwartet:** Fokus springt zum naechsten Tab (Steuerung, Programme, Setup), der Tab wird gleich aktiviert und der Inhalt wechselt. **Pfeil-Links** geht zurueck, **Pos1/Ende** zum ersten/letzten Tab.
   **Haeufiger Fehler:** Pfeiltasten tun nichts (alter Zustand) oder springen aus der Navigation heraus. Jetzt bleiben sie in der Tab-Leiste.

## 2. Groessere Trefferflaeche der Blatt-Bewertung

2. **Geste:** Eine Sorte oeffnen, zur Bewertung wischen, ein Blatt mit Doppeltipp setzen.
   **Erwartet:** „N von 5 Blättern, ausgewählt". Das Antippen trifft jetzt zuverlaessiger, weil jede Blatt-Taste eine 44x44-Punkte-Flaeche hat (das Blatt sieht gleich gross aus).
   **Haeufiger Fehler:** Frueher rutschte der Tipp oft auf das Nachbar-Blatt. Sollte jetzt seltener passieren.

## 3. Geraetename beim Verbinden und Trennen

3. **Geste:** Verbinden (echtes Geraet / Bluefy), auf den Verbindungs-Chip hoeren.
   **Erwartet (NEU):** „Verbunden mit [Geraetename]" statt nur „Verbunden". Beim Trennen: „Getrennt (war: [Geraetename])".
   **Haeufiger Fehler:** Nur „Verbunden" ohne Namen (alter Zustand). Der Chip ist aria-live=polite, also wird die Aenderung automatisch vorgelesen.

## Auch geprueft (schon ok, keine Aenderung noetig)

- Symptom-Tracker-Slider (1-10): als Schieberegler korrekt angesagt.
- Sessions-Tagebuch: Eintraege fokussierbar und beschriftet, Notizfeld beschriftet.
- DSL-Editor und Touch-Macro-Knoepfe: beschriftet.
- T-Break-Streak: jetzt als Status-Region, wird bei Aenderung angesagt.
