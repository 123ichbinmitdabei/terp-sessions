# Terp Sessions per Siri steuern (iPhone-Anleitung)

Stand: 2026-06-04, App-Version v9.6.0

Mit der iPhone-App **Kurzbefehle** (vorinstalliert, Symbol mit bunten Quadraten) kannst du Terp Sessions per Sprache steuern, zum Beispiel „Hey Siri, Vape heizen". Ein Kurzbefehl oeffnet dafuer die App mit einer besonderen URL, und die App fuehrt den Befehl dann selbst aus.

Diese Anleitung zeigt Schritt fuer Schritt, wie du das in etwa 5 Minuten einrichtest. Alle fertigen URLs zum Kopieren stehen weiter unten.

---

## 1. Voraussetzungen

- Ein iPhone oder iPad mit der App **Kurzbefehle** (ist normalerweise schon installiert; sonst kostenlos im App Store).
- Terp Sessions ist erreichbar unter:
  `https://123ichbinmitdabei.github.io/terp-sessions/`
- Fuer Geraete-Befehle (Heizen, Pumpe, Ballon) brauchst du auf dem iPhone den Browser **Bluefy**, weil Safari kein Bluetooth zu Geraeten kann. Befehle ohne Geraet (Notaus, Status, Hilfe, Vorheizen planen) gehen in jedem Browser.

> Wichtig zum Verstaendnis: Ein Siri-Kurzbefehl OEFFNET nur die App und sendet den Befehl. Damit ein Geraete-Befehl wirklich am Volcano ankommt, muss die App vorher mindestens einmal von Hand mit dem Geraet verbunden worden sein. Siri kann die Bluetooth-Verbindung nicht von selbst aus dem kalten Zustand aufbauen, das erlaubt Apple aus Sicherheitsgruenden nicht.

---

## 2. Schritt fuer Schritt: den ersten Kurzbefehl bauen

Beispiel: „Auf 185 Grad heizen".

1. Oeffne die App **Kurzbefehle**.
2. Tippe oben rechts auf **+** (neuer Kurzbefehl).
3. Tippe auf **Aktion hinzufuegen**.
4. Suche nach **URL** und waehle die Aktion **URL** (das ist nur das Textfeld fuer die Adresse).
5. Trage dort die gewuenschte URL aus der Liste unten ein, zum Beispiel:
   `https://123ichbinmitdabei.github.io/terp-sessions/?command=set_temp&value=185`
6. Tippe erneut auf **Aktion hinzufuegen**, suche nach **URLs oeffnen** und waehle diese Aktion. Sie oeffnet die URL aus Schritt 5.
7. Gib dem Kurzbefehl oben einen Namen, zum Beispiel **185 Grad**.
8. Fertig. Optional: oben auf **Info** oder **Zu Siri hinzufuegen** tippen und eine Sprach-Phrase festlegen.

Danach genuegt: „Hey Siri, 185 Grad". Siri oeffnet die App, die App setzt die Temperatur.

Tipp: Du kannst denselben Kurzbefehl beliebig oft kopieren und nur die URL austauschen, dann sparst du dir das Neuanlegen.

---

## 3. Alle URL-Befehle im Ueberblick

Ersetze in allen Beispielen den Anfang
`https://123ichbinmitdabei.github.io/terp-sessions/`
falls du die App unter einer anderen Adresse oder vom Homescreen nutzt.

Es gibt zwei Schreibweisen, beide funktionieren:

- Kurzform: `?cmd=heat-on`
- Siri-Form (sprechende Namen): `?command=heat_on`

### Geraete-Befehle (brauchen eine bestehende Bluetooth-Verbindung)

| Was es tut | URL-Anhang |
|---|---|
| Heizer an | `?command=heat_on` |
| Heizer aus | `?command=heat_off` |
| Temperatur setzen (z.B. 185) | `?command=set_temp&value=185` |
| Pumpe an | `?command=pump_on` |
| Pumpe aus | `?command=pump_off` |
| Ballon fuellen | `?cmd=fill` |
| Direkt-Zug | `?cmd=direct` |
| Programm starten (Name) | `?cmd=program&name=Sativa` |

### Befehle ohne Geraet (funktionieren immer)

| Was es tut | URL-Anhang |
|---|---|
| Notaus, alles stoppen | `?command=stop_all` |
| Status vorlesen | `?command=status` |
| Programm abbrechen | `?command=abort` |
| Sprachbefehl-Hilfe oeffnen | `?command=help` |
| Sorte oeffnen (Name) | `?command=open_strain&value=Blue%20Dream` |
| Vorheizen planen (10 Min, 185) | `?cmd=preheat&temp=185&min=10` |
| Session-Planer oeffnen | `?cmd=schedule` |

Hinweis zu Leerzeichen: In einer URL wird ein Leerzeichen als `%20` geschrieben, also `Blue%20Dream`. In der Kurzbefehle-App darfst du meist auch einfach `Blue Dream` eintippen, die App wandelt es um.

---

## 4. Fertige Kurzbefehle zum Nachbauen

Name in Kurzbefehle, dann die einzutragende URL:

- **Vape heizen**
  `https://123ichbinmitdabei.github.io/terp-sessions/?command=heat_on`
- **185 Grad**
  `https://123ichbinmitdabei.github.io/terp-sessions/?command=set_temp&value=185`
- **Ballon fuellen**
  `https://123ichbinmitdabei.github.io/terp-sessions/?cmd=fill`
- **Notaus**
  `https://123ichbinmitdabei.github.io/terp-sessions/?command=stop_all`
- **Status**
  `https://123ichbinmitdabei.github.io/terp-sessions/?command=status`
- **Programm abbrechen**
  `https://123ichbinmitdabei.github.io/terp-sessions/?command=abort`
- **Hilfe**
  `https://123ichbinmitdabei.github.io/terp-sessions/?command=help`

Tipp: Die App listet dieselben URLs auch direkt zum Kopieren unter Setup, Werkzeuge, dann Sprach-Shortcuts.

---

## 5. Tipps zur Sprachausloesung

- Beim Anlegen oder spaeter unter **Info** den Punkt **Zu Siri hinzufuegen** waehlen und eine kurze, eindeutige Phrase sprechen, zum Beispiel „Vape heizen", nicht „heizen" allein.
- Halte die Phrasen unterschiedlich, damit Siri sie nicht verwechselt.
- Du kannst die Kurzbefehle auch als Symbole auf den Homescreen legen (in Kurzbefehle: Befehl, Teilen, Zum Home-Bildschirm).

---

## 6. Bekannte Grenzen (ehrlich)

- **Bluetooth-Wiederverbindung:** Ein per Siri kalt gestarteter Geraete-Befehl findet das Geraet oft nicht von selbst. Verlaesslich ist es, wenn die App bereits offen und mit dem Volcano verbunden ist. Sonst erscheint der Hinweis „Erst verbinden".
- **Sprachausgabe in Bluefy:** Bluefy kann die App-eigene Sprachausgabe systembedingt nicht. Terp Sessions schreibt Bestaetigungen deshalb zusaetzlich in eine Vorlese-Zeile, die VoiceOver vorliest (ab v9.6.0). Aktiviere dafuer am besten den Screen-Reader-Modus unter Setup, Sprachsteuerung.
- **Kein Rueckkanal zu Siri:** Siri selbst liest das Ergebnis nicht vor. Die App spricht oder zeigt es, Siri startet sie nur.
- **Vibration:** Auf dem iPhone vibriert die App nicht, das erlaubt Apple im Browser nicht. Der Haptik-Schalter ist auf iPhone entsprechend gekennzeichnet.

Bei Problemen hilft der Befehl `?command=help`, der die Liste der Sprachbefehle in der App oeffnet.
