# Sessions — Vape Controller (v8.6.0)

Web-App zur Steuerung von Storz & Bickel Vaporizern, PAX 3 (Beta) und Puffco Peak Pro (Beta). Firefly: Erkennung + Reverse-Engineering-Aufruf (Probe-Only). Single-File HTML PWA.

## v8.7.0-prep — CSC E2EE Krypto-Modul (DORMANT, nicht aktiv)

**Sicherheitskritisch — Kryptographie. App-Version bleibt v8.6.0 für Endnutzer.**

- **`cscCrypto`-Modul** als IIFE inline in `index.html`: PBKDF2-HMAC-SHA256 (600 000 Iter) für Passphrase→Key, HKDF-SHA256 für Seed→Daten-Keys, AES-256-GCM (12-Byte-IV pro Operation, niemals reuse) für alle Verschlüsselungen. Ausschließlich Web Crypto API, keine externen Libs.
- **`csc-backend.sql` komplett überschrieben** (alte v8.5.0-prep-Version war Klartext und nie live): neues E2EE-Schema mit `csc_users.kdf_salt` + `encrypted_seed`, `csc_sessions.{iv, encrypted_blob}` (KEINE Klartext-Sortfelder mehr), `csc_circles` + `csc_circle_members` + `csc_circle_contributions` mit k-Anonymity-Schwelle.
- **BIP39-Recovery vertagt auf v8.7.1.** Begründung: 2048-Wort-EN-Liste muss byte-genau übereinstimmen, eine Memory-Reproduktion ist zu fehleranfällig. v8.7.1 wird die offizielle Datei aus `bitcoin/bips` mit SHA-256-Test einbinden.
- **`CSC-CRYPTO.md`** dokumentiert Threat-Model, Stack, Schlüssel-Hierarchie, Non-Goals, DSGVO-Restpflichten und die drei Stellen, an denen ich externe Krypto-Review für nötig halte.
- **31 Tests** in `v87crypto.mjs` (Round-Trip, IV-Uniqueness über 100 Operationen, AES-GCM-Auth-Failures bei falschem Key/IV/manipuliertem CT, PBKDF2-Determinismus + Salt-Trennung, HKDF-Purpose-Trennung, Session-Wrapper-Versionierung).
- **Volle Regression 480/480 grün** über 23 Suiten.

**KEIN UI, KEIN Live-Feature, KEIN Tag.** Der bestehende dormant `cscClient` wurde NICHT umgebaut — das ist die v8.7.1-Aufgabe, nach externem Krypto-Review.

**Was Andre tun muss vor jedem Live-Schritt:** externes Krypto-Review (siehe `CSC-CRYPTO.md` Abschnitt 6 + 7), Supabase-EU-Projekt mit neuem `csc-backend.sql` aufsetzen, BIP39-Recovery (v8.7.1) abwarten, dann erst v8.7.2 Aktivierung.

## v8.6.0 — Teilen vervollständigt (QR-Code inline, Buttons, CDN-Fix)

Drei fokussierte Module, keine neuen Features sonst. Keine Änderung an Adaptern, CSC-Backend/-Client, Voice oder Tracking-Logik.

### Modul 1 — Inline-QR-Encoder
- Eigener QR-Code-Encoder im index.html als IIFE: `qrEncode(text, eclName)` → `{size, modules, version, mask}` und `qrRender(text, opts)` → SVG-String.
- Basis: **Nayuki QR Code Generator** (MIT-Lizenz, Header im Source); slimmed JS-Port (byte-mode only, auto-version-Auswahl 1..40, alle 4 EC-Levels L/M/Q/H, 8 Masken werden penalty-evaluiert).
- Kein externes CDN, keine Network-Fetch, keine npm-Dependency. ~350 LoC inline.
- Render: einfaches `<svg>` mit `<path>` (run-length-encoded Rechtecke pro horizontalem Modul-Run), skaliert sauber. SVG-Hash deterministisch für gleichen Input.
- Test-Vektoren: "hi" → v1/21px; "https://...x×200" → v11/61px; "x×800" mit EC=L → v20/97px; UTF-8 + Emoji + Surrogate-Pairs funktionieren; Fallback-SVG bei Überlänge (>2,9 KB) statt Exception.

### Modul 2 — Teilen-Buttons in Listen + QR im Share-Modal
- **Programm-Karten** (eigene + Werks) haben jetzt zwei Share-Buttons: `📤` öffnet das v8.5.0-Modal (Link + JSON + neu QR), `🔗` bleibt der klassische `openQRShare`-Pfad (für Rückwärtskompatibilität mit dem alten `#prog=`-Format).
- **Sorten-Karten** (Aroma-Liste, Werks + User-eigene) bekommen einen `📤`-Button → öffnet das v8.5.0-Modal mit `kind:'aroma'`.
- **Share-Modal #modalShareExport** erweitert: neuer `🔲 QR-Code`-Button rendert SVG inline in einer weißen Karte unter den Buttons mit Hinweis „lokal generiert, kein externer Service". Bei Modal-Open wird der QR-Container zurückgesetzt.

### Modul 3 — Externe CDN-Schuld abgeräumt
- **`openQRShare` (pre-v8.5.0)** nutzte `api.qrserver.com` als `<img src>`-Fetch. Jetzt: `qrRender()` inline, gleiches `#qrBox` zeigt das SVG.
- **Grep-Audit** aller HTTPS-URLs in index.html: keine unbekannten externen Hosts mehr. Whitelist (dokumentierte intentional-Externe): `fonts.googleapis.com` + `fonts.gstatic.com` (Google Fonts, sw.js skipt bewusst), `api.open-meteo.com` + `geocoding-api.open-meteo.com` (Wetter-Feature, vom User opt-in), `github.com` + `apps.apple.com` + `marianacannabis.github.io` (alle nur `<a href>`-Links, kein Fetch), `nayuki.io` (Lizenz-Header-URL im Kommentar), `www.w3.org` (SVG-xmlns, kein Fetch). Webhook/MQTT-Felder bleiben User-konfigurierbar (`webhook.example.com`, `your-webhook-url` sind Placeholder).
- **Service Worker** `sw.js` SHELL-Array enthält ausschließlich relative Pfade (`./`, `./index.html`, …). Google-Fonts-Domains werden im Fetch-Handler explizit übersprungen (kein Cache, kein Intercept).

### Tests + Regression
- +36 neue Tests: `v86qr.mjs` (17, davon UTF-8/Emoji/EC-Levels/Determinismus/Lizenz-Header) + `v86sharebuttons.mjs` (10) + `v86nocdn.mjs` (9, davon Grep gegen Whitelist + sw.js SHELL-Audit).
- **449 / 449** grün über 22 Suiten.
- Forward-compat-Patch: `v84voice.mjs` SW_VERSION_LABEL-Assert auf `/^v8\./` gelockert (war hart auf `'v8.4.0'`).

### Was NICHT in v8.6.0 ist (bewusst)
- Kein Bulk-Teilen-Mehrfachauswahl (Modul-2.4 war optional, ausgelassen für Fokus).
- Keine CSC-Mode-Aktivierung — Backend bleibt dormant; Supabase-Setup steht weiterhin bei Andre.
- Keine UI-Änderung am Quick-Action-Bereich oder am bestehenden Inline-Help-System.

## v8.5.0 — Praxis-Feedback

Sieben Module nach Andres Praxis-Nutzung von v8.4.0 mit dem Volcano. Keine Änderung an Adaptern, am CSC-Backend/-Client (bleibt dormant), an Voice-Parser oder Onboarding.

### Modul 1+2 — Programm-Anzeige Fix + Split-Screen
- `runCard` z-index auf 33 gesenkt, `voiceFab`/`wakeIndicator`/`connectHint` auf 41 gehoben → Header-Buttons (Mikro, Avatar, Hilfe, Settings) bleiben klickbar während Programm läuft. Bei aktivem Programm rutschen voiceFab und wake-indicator zusätzlich hoch (`bottom: 220px`), damit sie nicht unter dem expandierten Run-Panel verschwinden.
- Run-Panel zeigt jetzt die komplette Schritt-Liste mit aktuellem Schritt-Highlight, Restzeit pro Schritt (mm:ss) und Gesamt-Restzeit. Per-Step-Dauer per `_stepDurations()` aus der gleichen Logik wie `estimateDuration()`. Automatischer Switch auf Steuerungs-Tab beim Programm-Start, damit die Hero-Temperatur-Anzeige sichtbar bleibt → das ist die "untere Hälfte" des Splits.

### Modul 3 — TTS-Events konfigurierbar
- Neuer Master + Per-Event-Toggle-Map (`PREFS.ttsEvents`): `tempReached`, `programStart/StepChange/End`, `heaterOn/Off`, `pumpOn/Off`, `sessionStart/End`, `errors`.
- `ttsEvent(name, text)` als zentrale Sprech-Funktion; respektiert Master `PREFS.voiceTts`.
- Hooks in `cmdHeaterOn/Off`, `cmdPumpOn/Off`, `runProgram` (Step-Change + Start + End), `sessionTracker*`, `renderStatus` (`tempReached` mit ±2 °C Hysterese + einmal-pro-Heiz-Zyklus-Lockout).
- UI: `<details>`-Sub-Block unter „Sprachsteuerung" mit 11 Per-Event-Toggles.

### Modul 4 — Sorten-DB +70 (additiv)
- Von 57 auf **127** Sorten. Bestehende unverändert. Neu hinzugefügt: Sativa-/Indica-/Hybrid-Klassiker (Sour Diesel, Northern Lights, OG Kush, Pineapple Express, …), moderne hochpotente (Runtz, Zkittlez, Gelato, Wedding Cake, …), CBD/medizinisch (Harlequin, ACDC, Cannatonic, Bediol, …), Landrace (Acapulco Gold, Hindu Kush, Durban Poison, …), Hash (Bubble Hash, Dry Sift) und drei Temperatur-Profile (Niedertemp 160 °C / Mittel 180 °C / Hoch 210 °C).

### Modul 5 — Programm-Vorlagen +12 (additiv mit Tags)
- Bestehende 6 PRESETS unverändert. Neu: Aroma-Sweep 4 Stufen, Doppel-Ballon 185°, Easy-Valve-Refill 195°, Smooth-Ramp 165→195, Power-Ramp 180→215, CBD-Modus 160-175°, Abend-Indica 200°, Mighty Step-Session 180→205, Mighty Microdose 165°, Portable Power 195°, Schlaf-Programm 200° tief, Schmerz-Stütze 1:1, Microdose-Reihe (3× Mini). Jedes mit `tags`-Array (z. B. `['volcano','aroma']`, `['mighty','crafty','portable','microdose']`).

### Modul 6 — Offline-Teilen (JSON + Share-Link)
- Schema-validierte Share-Payloads (`{v:1, kind, items}`) für `aroma` / `program` / `bundle`. Hard limits: 100 Items, 200 Schritte pro Programm, 500 Zeichen pro Textfeld. Whitelist erlaubter Step-Actions (kein `eval`, kein Code).
- Share-Link: URL-Hash mit base64url-codiertem JSON, App liest beim Start aus dem Hash und öffnet **Vorschau-Modal** vor jedem Import.
- JSON-Datei-Download/-Upload via Blob + FileReader.
- Import vergibt **immer neue IDs**, überschreibt nichts.
- **QR-Code vertagt auf v8.5.1** — Inline-QR-Encoder (~700 LoC Reed-Solomon) sprengt den Session-Rahmen. Spec erlaubte das ausdrücklich. `openQRShare` (pre-v8.5.0) nutzt weiterhin `api.qrserver.com`-CDN; auch das wird in v8.5.1 auf inline umgestellt.

### Modul 7 — Tracking konfigurierbar + erweitert
- `PREFS.trackingEnabled` (Default an): aus → keine Auto-Notiz-Modale mehr nach Sessions.
- `PREFS.trackingFields` (8 Felder): `strength`, `effect`, `aroma`, `moodBefore`, `moodAfter`, `purpose`, `tags`, `notes`. Modal blendet nicht-aktivierte Felder aus (`data-track-field`-Attribut + `style.display`).
- Neue Felder: Stimmung vorher/nachher (1-5 Skala mit 😢😕😐🙂😊), Zweck (Schlaf/Schmerz/Genuss/Sozial/Kreativität/Sport/Anderes), Tags (Komma-getrennt mit `<datalist>`-Auto-Vervollständigung aus früheren Sessions). Aroma-Dropdown war bereits v8.3.0.
- **⚡ Schnell-Speichern**-Button: speichert mit `PREFS.trackingDefaults`-Werten, kein Ausfüllen nötig — direkte Antwort auf Andres „nervig"-Feedback bei Routine-Sessions.
- Setup-Akkordeon „📝 Sessions" hat jetzt eine zweite Karte „Tracking-Einstellungen" mit Master-Toggle + 8 Feld-Checkboxen.

### Tests + Regression
- +68 neue Tests: `v85uifix.mjs` (13) + `v85tts.mjs` (13) + `v85sharing.mjs` (25) + `v85tracking.mjs` (17).
- **413 / 413** grün über 19 Suiten.
- Keine forward-compat-Patches an älteren Suiten nötig.

## v8.5.0-prep — CSC-Mode (DORMANT, nicht für Endnutzer)

**Sicherheitskritisch.** App-Version bleibt v8.4.0. Diese Vorbereitung committet:

- `csc-backend.sql` — Schema + RLS-deny-all + SECURITY-DEFINER-RPCs (bcrypt-PIN-Hash via pgcrypto, Brute-Force-Lockout, k-anonymity auf Kreis-Aggregaten).
- `cscClient` im Frontend — feature-flagged hinter `PREFS.cscEnabled` (default **false**), kein UI verdrahtet, keine Auto-Sync-Trigger. Ohne `csc-config.json` passiert nichts.
- `CSC-SECURITY.md` — Threat-Model, logische Bewertung der 5 Pflicht-Selbst-Angriffe (Live-Lauf muss Andre nach Setup machen), DSGVO-Checkliste.
- `csc-config.example.json` — Vorlage; `csc-config.json` ist gitignored.

**Vor Aktivierung muss Andre:** Supabase-Projekt anlegen (EU-Region), `csc-backend.sql` ausführen, die 5 Live-Angriffe mit `curl` durchspielen, Einwilligungs-UI ergänzen, DPA + Privacy-Policy klären. Siehe `CSC-SECURITY.md` für Details. Nichts davon ist mit diesem Commit live.

Tests: +28 (`v85csc.mjs`, fetch-mocked) → 345 / 345 über 16 Suiten grün. Keine Änderung an Adaptern, Voice, Onboarding, Heizkurven, Aroma oder lokalem Tracking.

## v8.4.0 — Onboarding + Voice

Keine Änderung an Adaptern, Pioneers-Framework, UX-Polish, Session-Tracking, Heizkurven oder Aroma-Bibliothek.

### Erst-Onboarding

Frische Nutzer (kein `sessions_onboarded_v1`, `vol_tour_completed` oder `vol_onboarded` im Storage) sehen beim ersten Start einen 5-Slide-Welcome-Flow via dem bestehenden `showSlides`-Modal: Willkommen / Geräte / Verbinden / Features / Sicherheit. Nach Abschluss läuft die bestehende interaktive Schritt-für-Schritt-Tour (`startOnboardingTour`) automatisch weiter. Setup-Tab → „Onboarding nochmal zeigen" startet den Welcome-Flow erneut (unabhängig vom Tour-Reset-Button). Alt-Nutzer (vorhandenes `vol_tour_completed`) sehen weiterhin den bestehenden v5-Migrations-Wizard, nicht das Welcome.

Zusätzlich: ein dezenter „👆 hier tippen"-Pill neben dem „Verbinden"-Button für noch nicht verbundene Frisch-Nutzer (verschwindet beim ersten Connect-Versuch, dauerhaft via `sessions_connect_hint_dismissed_v1`).

### Voice-Steuerung — erweitert

Der existierende Voice-Pfad wurde um einen reinen Parser (`parseVoiceCommand(text) → {action, value, raw}`) refaktoriert — testbar ohne Web-Speech-API. Neue Befehle: „wärmer / heißer / hotter" (+5 °C), „kälter / cooler" (−5 °C), „status / wie warm" (TTS-Statusantwort über bestehendes `speakStatus`), „trennen / disconnect", „boost". Deutsche Zahlwörter werden via `parseGermanNumber` aufgelöst — z. B. „auf hundertneunundachtzig grad" → 189. Englische Varianten (`heater on`, `stop heating`, `pump for 20 seconds`, `set temperature 200`) werden ebenfalls erkannt. Hardlimits (`tempRange`) und das Beta-Confirmation-Modal (für `unverified`-Adapter wie PAX) gelten unverändert auch für Voice — kein Bypass.

### Wake-Word „Hey Sessions" 🧪 (experimentell)

Optionaler Toggle im Setup (Default AUS). **Ehrliche Bewertung im UI und im Code:**

- **Was es ist:** Web Speech API mit `continuous=true`, hört auf Prefix „Hey Sessions / Okay Sessions / Sessions". Nach Match spricht die App via TTS „Ja?" und der nächste Satz wird als Voice-Befehl ausgeführt. 10 s Dialog-Timeout. Auto-Restart über `onend`, da die Recognition periodisch von alleine stoppt.
- **Was es NICHT ist:** kein lokales On-Device-Wake-Word wie Alexa/Hey-Siri. Chrome routet das Audio über die Google-Speech-Cloud — das ist im Setup-Label und in den Code-Kommentaren so dokumentiert.
- **Wo es geht:** Chrome / Edge auf Android und Desktop. iOS Safari, Firefox: nicht unterstützt; der Toggle lehnt das ab und meldet das per Toast.
- **Wo Vorsicht:** Mikrofon ist dauer-aktiv (Akku); Beta-Confirmation bleibt aktiv (Wake-Word kann keine ungelabelten Heiz-Befehle „durchrutschen" lassen).

### Tests + Regression

- +79 neue Tests: `v84onboarding.mjs` (19) + `v84voice.mjs` (60).
- **317 / 317** über 15 Suiten grün.
- Forward-compat: zwei Versionsasserts (`v51`, `v83aroma`) auf `^v8\.` gelockert; v51-Migration-Test prüft jetzt den Wizard-Titel (statt nur ob das Slides-Modal offen ist), damit der neue Welcome-Flow für frische Nutzer nicht fälschlich als Migration durchgeht.

## v8.3.0 — Heizkurven-Editor + Aroma-Bibliothek

Zwei Power-User-Features. Keine Änderung an Adaptern, Pioneers-Framework, UX-Polish oder Session-Tracking (nur ein optionaler Aroma-Hook im Session-Notiz-Modal).

### Heizkurven-Editor (visuell)

Im Programm-Editor neue dritte Ansicht **🌡 Kurve** neben Liste/Timeline (toggle bleibt gespeichert).

- **Inline-SVG** Ziel-Temperatur-Profil über die geschätzte Zeit (gleiches Zeitmodell wie `estimateDuration`).
- **Vertikales Ziehen** an einem Punkt ändert die Set-Temperatur (Snap 5 °C, geclamped auf den Geräte-Bereich). Folgende `wait_until`-Schritte mit gleichem Wert werden automatisch mitgezogen.
- **Dauer +/−** für jeden `wait`/`pump_for`-Schritt (±5 s).
- **Punkt hinzufügen / löschen** (Long-Press = löschen mit Bestätigung).
- **Live-Marker** für aktuellen Ist-Wert wenn verbunden; **Pump-Bänder** zeigen `pump_for`-Phasen.
- **▶ Simulation**: animierter Sweep über die Kurve in ~4 s (rein visuell, schickt nichts ans Gerät).
- Beide Editoren teilen dieselben Daten — eine Änderung in der Kurve erscheint sofort in der Liste.

### Aroma-Bibliothek

Bestehende DB mit 57 Sorten + Custom-Sorten **non-destruktiv erweitert** um abgeleitete Felder (`effects`, `thcLevel`, `recommendedTemp{min,max}`, `description`, `terpenes`, `userAdded`) via `normAroma()` — kein einziger DB-Eintrag wird verändert.

- **Filter & Suche**: Effekt-Pills (Entspannt/Energetisch/Kreativ/Schläfrig/Fokussiert/Sozial, Multi-Select), Typ (Sativa/Indica/Hybrid/Andere), THC-Level (Mid/High/CBD), Sortierung (A-Z / Beliebtheit / Zufall), kombinierbar mit der bestehenden Volltext-Suche.
- **„Empfohlen für dich"** oben: gewichtet die Effekt-Bewertungen aus deinen Session-Notizen (v8.2.0); ohne Sessions: drei zufällige Sorten als Einstieg.
- **Detail-Modal** pro Sorte: Typ + THC, Effekte, empfohlener Temperatur-Bereich + Direkt-Buttons zum Setzen, Statistik aus deinen Sessions („Du hast diese Sorte 5× getestet, ⌀ Stärke 7,2/10") bei eigener Sorte: löschen.
- **Custom-Sorten** weiterhin im bestehenden Key `vol_custom_aromas`; bestehende Einträge bleiben kompatibel.
- **Session-Modal-Integration**: optionales Aroma-Dropdown im v8.2.0-Notiz-Modal → `SessionNote.aroma` (einziger Eingriff in v8.2.0).
- **Tests**: +38 (v83curves 18 + v83aroma 20). Adapter/Pioneers/UX-Polish/Session-Tracking-Core unverändert.

## v8.2.0 — Session-Tracking (Minimal)

Ein eigenständiges, lokales Session-Tagebuch — **parallel** zur bestehenden v5.1.0-Statistik (die unverändert bleibt). Alles in `localStorage`, kein Tracking, kein Cloud-Sync, keine Chart-Library (Inline-SVG). Bewusst minimal gehalten; Mood/Zweck/Aroma/Limits folgen in v8.3.0.

- **Auto-Erkennung**: Heizer-EIN startet einen Session-Kandidaten, Heizer-AUS beendet ihn. Sessions unter 60 s werden verworfen; längere öffnen ein Notiz-Modal. Manueller Start/Stopp zusätzlich per Quick-Action („Session beginnen/beenden").
- **Notiz-Modal**: Stärke 1–10 (Pflicht, Default 5), Effekt (Entspannt/Energetisch/Kreativ/Schläfrig/Fokussiert/Sozial, optional), Freitext-Notiz. „Speichern" / „Später" (halb-gespeichert, erscheint als offene Session) / „Verwerfen".
- **Sessions-Sektion** im Setup-Tab (neues Akkordeon „📝 Sessions"): Liste neueste zuerst, Geräte-/Zeitraum-Filter, Aufklappen für Details, Bearbeiten/Löschen, JSON-Export, Banner für offene Sessions.
- **Drei Visualisierungen** (ab 5 Sessions): Wochen-Trend (12 W), GitHub-Style-Aktivitäts-Heatmap (7×12), Pausen-Historie (Top 5 + aktueller Streak).
- **Sanfte Hinweise**: sachlich-beobachtende Gesundheits-Notiz je nach Konsumdichte (keine Moral, kein Shaming).
- **3 Achievements** (Basis): „Bewusster Konsument", „Erste Pause", „Reflektierende Woche".
- **Tests**: +28 (v82tracking), volle Regression 264 grün. Keine Adapter-/Pioneers-/v5.1.0-Stats-Änderungen.

## v8.1.0 — UX-Polish

Vier Komfort-Features, keine Änderung an den Geräte-Adaptern oder Frameworks (236/236 Tests grün).

- **Theme „Automatisch (System)"**: neuer Schalter im Setup → Stil. Folgt dem hellen/dunklen Systemfarbschema (`prefers-color-scheme`) und reagiert live auf Systemwechsel. Die bestehenden 6 Themes (Dunkel/Hell/Lava/Forest/Cosmos/Paper) bleiben unverändert; eine manuelle Theme-Wahl beendet den Auto-Modus.
- **Benutzerfreundliche Fehlermeldungen**: technische BLE-Fehler werden in verständliche Hinweise mit Titel, Erklärung und konkreter Handlungsempfehlung übersetzt (`humanizeError` + größerer „friendly"-Toast mit Schließen-X, 8 s). Greift bei Verbinden, Heizen/Temperatur/Pumpe und Adapter-Auth; der UUID-Selbsttest bleibt bewusst still.
- **Setup-Tab als Akkordeon**: die fünf Setup-Sektionen (Gerät / Übersicht / Werkzeuge / Erweitert / Verbindung) sind jetzt auf-/zuklappbar (`<details>`), der Zustand wird pro Sektion gespeichert. Die App-Einstellungen im Settings-Modal (eigene Sub-Tabs) bleiben unverändert.
- **Smarte Schnellzugriffe**: die Quick-Actions auf der Steuerung passen sich Verbindungs-, Geräte- und Heizer-Status an (z. B. Volcano: Direkt-Zug/Ballon/Timer/Aroma mit Puls auf dem nächsten Schritt; Puffco: Heizen starten/abbrechen; Firefly: nur „Pioneer melden"). Eine Aktion lässt sich per Long-Press anpinnen (bleibt an Position 1).

## v8.0.0 — Firefly (Probe-Only, RE-Hilfe gesucht) 🔬

Firefly ist die schwierigste Plattform der Roadmap: **es existiert kein vollständiges Open-Source-Reverse-Engineering**. Die GitHub-Repo-Suche „firefly vaporizer bluetooth" liefert **0 Treffer**, npm/Web-Recherche keine eindeutige BLE-Service-/Characteristic-/Frame-Dokumentation. Die offizielle Steuerung läuft über die Hersteller-Web-App (fireflyvaporwebapp.com), die **bewusst nicht reverse-engineert** wurde.

**→ Konsequenz: kein Raten. Firefly läuft als Probe-Only-Adapter** — das Gerät wird erkannt, aber es gibt **keine Steuerung**. Stattdessen ein Aufruf an die Community, beim Reverse-Engineering zu helfen.

- **Erkennung:** per Name (`/firefly/i`); keine spekulative Service-UUID.
- **UI:** Beim Verbinden wird die manuelle Steuerung ausgeblendet und ein Banner „🔬 Gerät erkannt, Protokoll-Recherche läuft" mit einem Reverse-Engineering-Hilfe-Button (eigener E-Mail-Betreff `[Pioneers RE-Hilfe]`) gezeigt. Alle Steuer-Methoden werfen einen klaren Fehler statt etwas zu raten.
- **Pioneers-Framework:** neue Status-Stufe **`probe_only`** (Pille „🔬 RE-Hilfe gesucht", abgegrenzt von „🟡 Tester gesucht").
- **Was RE-Helfer liefern können:** BLE-Sniffer-Logs aus der offiziellen App (Android HCI-Snoop / Wireshark), Service-/Characteristic-UUIDs (nRF Connect / Web Bluetooth Inspector), beobachtete Befehle (Temperatur, Heizen, Akku). Damit lässt sich später ein echter Adapter nachziehen.
- **Scope:** Firefly 2 / 2+ als Subtypes geführt (`supported:false`, Recherche läuft). Hersteller-Temperaturbereich 200–500 °F (nur Info, nicht als Protokoll verwendet).
- **Tests:** 16 automatisierte (Detection, Probe-Only-Verhalten, alle Steuer-Methoden werfen, UI-Ausblendung, Banner, Pioneers-Pille). Volle Regression grün, alle anderen Geräte unverändert.

## v7.0.0 — Puffco Peak Pro (Beta) ⚠️

Erster Konzentrat-Vaporizer (Dab) im Adapter-Set. Das BLE-Protokoll wurde aus **zwei unabhängigen Open-Source-Quellen portiert, die sich exakt decken** (keine Widersprüche): [Fr0st3h/Puffco-Reverse-Engineering-Writeup](https://github.com/Fr0st3h/Puffco-Reverse-Engineering-Writeup) (README + deobfuscated App) und [meekzyr/PuffcoPC](https://github.com/meekzyr/PuffcoPC) (Python BLE-Client). Kein Raten.

**⚠️ BETA — NICHT auf Hardware getestet.** Der Entwickler besitzt kein Puffco-Gerät. Geht live geschützt durch das Sessions-Pioneers-Framework (Status `unverified` → Beta-Bestätigung vor dem ersten Heizen + Notfall-Stop). **Nur für Tester mit Peak Pro.**

- **Auth (Firmware X):** Beim Verbinden liest die App den `accessSeed` vom `E0`-Characteristic, berechnet `Token = SHA-256(DEVICE_HANDSHAKE[16] ‖ accessSeed[16])[0..15]` und schreibt ihn zurück auf `E0`. **SHA-256 ist nativ (Web Crypto) — kein AES.** Der Token-Algorithmus ist gegen **beide** Referenz-Implementierungen validiert (identischer Output für Fr0st3hs publizierten Seed); ältere Firmware ohne `E0` läuft ohne Auth. Auth-Fehler → sofortiger Disconnect.
- **Werte:** IEEE-754 float32 little-endian, Temperatur in **Celsius**. Aktuelle Temp `…025`, Ziel `…026`, Akku `…020`, Betriebszustand `…022`, Kammertyp `…03f`.
- **Heizen:** explizites Kommando (anders als PAX) — `heatCycleStart`/`heatCycleAbort` (float32 7/8) an `…040`. Beta-Bestätigung greift in `cmdHeaterOn`.
- **Zieltemperatur:** wird über das aktive Heiz-Profil gesetzt (Pointer `…061` + Preheat-Temp `…063`), genau wie die offizielle App + PuffcoPC. Hard-Lock **204–327 °C** (400–620 °F).
- **Pflicht-Sicherheitstimer** (tragbares Gerät, kein BLE-Auto-Aus). Keine Pumpe/Ballon.
- **Scope:** nur **Peak Pro**. Proxy/Pivot sind in den Quellen nicht dokumentiert → `supported:false`. Das neuere **Lorax**-Protokoll (neueste Firmware) ist noch nicht implementiert (TODO).
- **Tests:** 35 automatisierte (Auth gegen cross-validierten Vektor, float32-Byte-Vektoren von Fr0st3h, Mock-BLE-End-to-End inkl. Handshake-Verifikation). Volle Regression grün, alle anderen Geräte unverändert.

**Credits:** Puffco-Protokoll © [Fr0st3h](https://github.com/Fr0st3h/Puffco-Reverse-Engineering-Writeup) & [meekzyr/PuffcoPC](https://github.com/meekzyr/PuffcoPC). Reverse-Engineering zwecks Interoperabilität (DMCA §1201(f)).

## v6.0.0 — PAX 3 (Beta) ⚠️

Erster Adapter außerhalb der S&B-Familie. Das PAX-3-BLE-Protokoll wurde **1:1 aus dem Open-Source-Projekt [evertonstz/pax-romana](https://github.com/evertonstz/pax-romana) (MIT-Lizenz) portiert** — kein Reverse-Engineering, keine geratenen Bytes. Die Krypto ist gegen die Testvektoren von pax-romana selbst validiert (nicht-zirkulär).

**⚠️ BETA — NICHT auf Hardware getestet.** Der Entwickler besitzt kein PAX-Gerät. Der Adapter geht live, geschützt durch das Sessions-Pioneers-Framework (Status `unverified` → Beta-Bestätigung vor dem ersten Heizen + dauerhaft sichtbarer Notfall-Stop). **Nur für Tester mit PAX 3.** Feedback bitte an die Pioneers-Adresse in der App.

- **Krypto:** AES-128-ECB (Schlüssel-Ableitung aus der Seriennummer) + AES-128-OFB (Frame-Ver-/Entschlüsselung), via inline eingebettetem [aes-js](https://github.com/ricmoo/aes-js) (MIT). Web Crypto bietet weder ECB noch OFB.
- **Seriennummer-Pflicht:** Der Schlüssel wird aus der 8-stelligen PAX-Seriennummer (steht im Akkufach) abgeleitet → einmalige manuelle Eingabe beim Verbinden. Automatische Auslesung ist TODO (im PAX-Protokoll nicht über den BLE-Namen verfügbar).
- **Temperatur:** Hard-Lock 175–215 °C (PAX-3-Bereich). Werte außerhalb werden begrenzt.
- **Kein Heizer-Befehl:** PAX 3 heizt **automatisch** beim Ziehen (Lippensensor) — das Protokoll kennt kein „Heizer an/aus". Der Heizer-Status (Heizt/Bereit/Boost/Abkühlen/Standby/Aus) wird nur **gelesen**. Zieltemperatur setzen genügt.
- **Pflicht-Sicherheitstimer:** wie bei allen tragbaren Geräten (kein BLE-Auto-Aus) erzwingt die App einen Auto-Aus-Timer.
- **Scope:** nur **PAX 3**. PAX Plus/Mini und Era/Era Pro sind ein anderer Handshake und **nicht** enthalten.
- **Tests:** 39 automatisierte Tests (Krypto gegen pax-romana-Vektoren, Frame-Builder/-Parser, Mock-BLE-End-to-End-Connect mit ver-/entschlüsselten Frames). Volcano/Crafty/Mighty/Venty/Veazy unverändert (volle Regression grün).

**Credits:** PAX-3-Protokoll © [evertonstz/pax-romana](https://github.com/evertonstz/pax-romana) (MIT) · AES © [Richard Moore / aes-js](https://github.com/ricmoo/aes-js) (MIT) · Venty/Veazy-Protokoll © [firsttris/reactive-volcano-app](https://github.com/firsttris/reactive-volcano-app) (MIT).

## v5.2.0 — Sessions Pioneers (Beta-Tester-Framework)

Foundation für die Multi-Brand-Roadmap: ein Beta-Status-System (`stable` / `mock_only` / `unverified`) pro Gerätefamilie, eine Pioneers-Karte im Setup (E-Mail- + GitHub-Issue-Vorlage, Status-Pills, Diagnose-Log-Export, Tester-Checkliste), ein Beta-Bestätigungs-Dialog vor dem ersten Heizen auf ungetesteten Geräten und ein Notfall-Stop-Button. Greift automatisch für künftige Beta-Adapter (PAX/Puffco/Firefly). Bestehende Geräte (Volcano stable, Venty/Veazy stable, Crafty/Mighty mock-validiert) unverändert.

## v5.1.0 — Polish-Features

Vier nutzersichtbare Features, keine Adapter-Änderungen:
- **Geräte-Statistik** pro Gerätetyp (Sessions, Heizzeit, Heizer-/Pumpe-/Boost-Zyklen, Max-Temp, Ballons) im Setup-Tab, mit Reset pro Gerät. Eigener `sessions_stats_v1`-Store, failsafe.
- **Home-Assistant-Export**: WebHook-URL + auto-generiertes REST-Sensor-YAML-Snippet (Kopieren), optionales Test-Senden der Stats (kein Auto-Push, Privacy).
- **Gerätespezifische Tour**: beim ersten Connect je Gerätetyp eine kurze Slide-Tour (Volcano/Crafty-Mighty/Venty-Veazy), zurücksetzbar.
- **Migrations-Wizard** v4→v5: einmaliger Willkommens-Slide für Bestandsnutzer nach dem Update.

## v5.0.4 — Venty Status-Details

Macht bereits geparste Status-Felder im Hero sichtbar (keine neuen Protokoll-Hypothesen): Lade-Indikator (🔋 87% ⚡ wenn am Netzteil), Heiz-/Bereit-Status („Heizt…" / „✓ Bereit"), Boost-/Super-Boost-Badge. Nur Venty/Veazy betroffen, Volcano/Crafty/Mighty unverändert.

## v5.0.3 — Venty/Veazy-Protokoll aus firsttris portiert

Das Venty/Veazy-BLE-Protokoll ist jetzt 1:1 aus **[firsttris/reactive-volcano-app](https://github.com/firsttris/reactive-volcano-app)** (MIT-Lizenz, hardware-getestet) portiert, statt aus Hex-Dumps geraten. Kernpunkte: Status wird aktiv per Command 0x01 alle 500 ms angefragt (das Polling ist zugleich der Keep-Alive gegen den Idle-Disconnect); Write-Format ist `[cmd=1][mask][payload]`; der Status-Frame liefert Zieltemperatur (Bytes 4-5), **Akku (Byte 8)**, Heizer-Modus (Byte 11: aus/normal/boost/super), Lade-Status und Settings. Venty liefert protokollbedingt **keine Ist-Temperatur** — angezeigt werden Soll-Temperatur + Heiz-/Bereit-Status. UI aktualisiert sich jetzt live nach jedem Status. Permanent-Bluetooth wird korrekt gesetzt. Dank an firsttris (MIT).

## Hotfix v5.0.2.3 — Venty Frame-Typen kalibriert

Mit echten Hardware-Hex-Dumps: drei weitere Venty-Frame-Typen werden erkannt — Firmware-Info (Byte0 0x02, parst ASCII FW/BL-Version → Anzeige im Hero), Heater-Command-Echo (0x20, kein State-Update), Status (0x04, Current-Temp Bytes 1-2). Target-Temp und Akku kommen nicht über Notifications zurück (Bytes 4-5 sind eine Konstante) → Target aus eigenem Setzbefehl, Akku weiter „🔋 --". BLE_PERMANENT wird nur einmal pro Session versucht (kein „GATT operation already in progress" mehr bei Reconnect).

## Hotfix v5.0.2.2 — Venty Parser + Verbindungsstabilität

Nach Venty-Hardware-Test Runde 2: Notification-Parser unterscheidet jetzt Frame-Typen (1-Byte Settings-Echo, 5-Byte Command-Echo für Boost/SuperBoost, ≥6-Byte Status mit Current-Temp aus Bytes 2-3 Uint16 LE). Akku wird nur angezeigt, wenn der Wert bekannt ist (sonst „🔋 --", kein falscher Wert). Gegen den ~30s-Auto-Disconnect des Venty: BLE_PERMANENT-Setting-Versuch + Keep-Alive-Read alle 20s. Service-Stale-Recovery beim manuellen Service-Scan (neu verbinden + Services frisch holen). Erste 10 Notifications werden als Hex geloggt.

## Hotfix v5.0.2.1 — Geräte-Erkennung robust

Nach Venty-Hardware-Test (Fehl-Erkennung als Volcano): Erkennung läuft jetzt **Service-UUID-Probe zuerst** (zuverlässiger als Namens-Strings), **kein stiller Volcano-Fallback** mehr bei unbekanntem Gerät (stattdessen Disconnect + Fehlermeldung), Hero-Badge zeigt den **aktiven Adapter** (nicht das Legacy-Picker-Profil), Diagnose-Dump im sichtbaren App-Log bei jedem Connect, erste 5 Venty-Notifications immer als Hex geloggt (Parser-Kalibrierung), kein Reconnect-Loop bei nicht erkanntem Gerät.

## Was ist neu in v5.0.2 — Venty / Veazy Support

`VentyVeazyAdapter`: ein Adapter für Venty (Hardware-getestet ausstehend) und Veazy (Beta, ungetestet, gleiches Protokoll). Command-basiert über einen einzelnen Control-Characteristic mit Notification-Status (Boost, Super-Boost, Akku, Temperatur). Boost/Super-Boost-Steuerung in der Hero-Steuerung, Boost-LED-Visualisierung in den Einstellungen, K1-Pflicht-Safety-Timer + K3-Reconnect auch für Venty/Veazy. Zusätzlich: Crafty/Mighty Battery-Char-Fallback (0x63 → 0x41 → 0x73) für unterschiedliche Geräte-Generationen. Der Notification-Parser ist defensiv (nur plausible Werte) und bei Bedarf via Hex-Dump kalibrierbar. Volcano + Crafty/Mighty unverändert.

## Was war in v5.0.1 — Crafty / Mighty Support

`CraftyMightyAdapter`: Auto-Detection per Name (STORZ&BICKEL / MIGHTY / CRAFTY) und Service-UUID, Temperatur + Heizer + Akku über das Crafty/Mighty-BLE-Protokoll (Uint16 LE, dynamische Char-UUIDs). Keine Pumpe/Ballon (Direkt-Zug), Akku-Anzeige im Hero, Status-Polling alle 2s. Pumpe-bezogene Quick-Actions und Steps werden bei diesen Geräten ausgeblendet/übersprungen. Volcano bleibt unverändert.

## Was war in v5.0.0 — Foundation für Multi-Device

Reiner Architektur-Refactor, keine sichtbare Verhaltensänderung für Volcano. Der bestehende BLE-Code ist jetzt im **DeviceAdapter-Pattern** gekapselt (`DeviceAdapter`-Basisklasse, `VolcanoAdapter`), mit Capabilities-Map pro Gerät, Auto-Detection-Layer (`detectDevice`) und Vorbereitung für Crafty/Mighty (v5.0.1) und Venty (v5.0.2). Alle Steuerbefehle laufen über `State.adapter`.

## Was war in v4.9.8 — Session-Scheduler (Pre-Heat-Erweiterung)

Andre's Wunsch: „Pre-Heat umbenennen und als Timer nutzen. Start einer Session in X Stunden/Minuten mit Temperatur oder Programm, mit Möglichkeit der Wiederholung bis hin zum Wochenplan."

### Umbenennung: Pre-Heat → ⏱ Timer

Die Quick-Action „Pre-Heat" heißt jetzt **„Timer"** und öffnet einen vollwertigen Session-Planer statt zwei prompt-Dialoge. Der Meta-Text zeigt:
- „planen" wenn nichts geplant
- „in 10 Min" / „in 2 Std" wenn ein Schedule bald läuft
- „Mo. 20:00" für längerfristige

### Session-Scheduler — Datenmodell

| Feld | Optionen |
|---|---|
| **Name** | freier Text, max 40 Zeichen |
| **Aktion** | 🔥 Heizen auf X°C **oder** ⚙️ Programm starten |
| **Trigger** | In X Min (1–1440) **oder** zu Uhrzeit HH:MM |
| **Wiederholung** | Einmalig / Täglich / Mo–Fr / Sa+So / Eigene Wochentage |

Mehrere Schedules parallel möglich. Jeder hat einen Toggle-Switch zum Aktivieren/Deaktivieren ohne Löschen.

### Scheduler-Engine

- **Tick alle 30 Sek**: prüft alle aktiven Schedules
- **Re-Compute nach Trigger**: einmalige Schedules werden disabled, wiederkehrende bekommen neue nextRun-Zeit
- **Verpasste Schedules** (> 5 Min vorbei): werden übersprungen mit Recompute (kein Trigger Stunden später)
- **Sortierung**: aktive zuerst, nach nextRun
- **Persistenz**: LocalStorage `vol_schedules`

### Hero-Anzeige

Der bisherige Pre-Heat-Bereich im Hero zeigt jetzt den **nächsten anstehenden Schedule**:
- Name als großer Text
- Aktion + Restzeit / Uhrzeit als kleiner Text
- ×-Knopf deaktiviert den Schedule sofort (statt löschen)

### Sicherheits-Warnung im Modal

Da geplante Heiz-Aktionen ein Brandrisiko sind:

> ⚠️ **Sicherheit:** Geplante Sessions werden nur ausgeführt wenn die App geöffnet und mit dem Volcano verbunden ist. Auto-Cool-Down empfohlen.

App-Schließen = Schedule pausiert. Web Bluetooth kann nicht aus dem Hintergrund triggern, daher ist das physisch durch den Browser begrenzt.

### URL-Command Erweiterungen

- `?cmd=preheat&temp=185&min=10` erzeugt jetzt einen einmaligen Schedule (sauberer als alte prompt-Dialoge)
- `?cmd=schedule` öffnet das Scheduler-Modal direkt

Damit kann via Siri ein Schedule eingerichtet werden: „Hey Siri, Volcano in einer halben Stunde anheizen" → URL → Schedule angelegt + nextRun gesetzt.

### Tour-Erweiterung

Der Onboarding-Walkthrough hat jetzt einen Schritt für den Session-Planer: „4. Session-Planer (Timer) — plane Sessions zeitgesteuert..." Damit lernen neue User die Funktion automatisch kennen.

### Manual-Updates

Im Setup → Anleitung gibt es jetzt:
- „Session-Planer (Timer)" — komplette Erklärung
- „Schedule abbrechen" — wo und wie
- Pre-Heat-Eintrag entfernt (ist im Scheduler aufgegangen)

### Backward-Kompatibilität

- Alte `schedulePreheat()`-Funktion + `cancelPreheat()` bleiben für Legacy-Code da
- Bei Klick auf ×-Cancel im Hero: prüft erst ob ein Schedule next-up ist, sonst alter Pre-Heat-Cancel-Pfad
- Bestehende User ohne Schedules sehen den Quick-Button mit „planen"-Meta

## Beispiele

**Morgenroutine:**
- Name: „Morgen-Sativa"
- Aktion: Programm starten → „Sativa-Sweet-Spot"
- Trigger: Zu Uhrzeit → 08:00
- Wiederholung: Mo–Fr

**Abend einmalig:**
- Name: „Heute Abend"
- Aktion: Heizen auf 195°C
- Trigger: Zu Uhrzeit → 21:30
- Wiederholung: Einmalig

**Schnell vorheizen:**
- Name: „Jetzt vorheizen"
- Aktion: Heizen auf 185°C
- Trigger: In 5 Min
- Wiederholung: Einmalig (automatisch)

**Sonntags entspannt:**
- Name: „Sonntag-Indica"
- Aktion: Programm „Indica-Vollblüte"
- Trigger: 19:00
- Wiederholung: Eigene Wochentage → So

## Was bleibt offen

**v5.0 (nach Andre's Go):** Crafty / Mighty / Venty BLE-Implementierung — der Scheduler funktioniert dann automatisch für alle Geräte über das DeviceAdapter-Interface.

## Was war in v4.9.7

Tour-Endlosschleife gefixt (Spotlight bei Rand-Elementen), Settings-Tabs deutlich sichtbar gemacht (Hinweis-Text, oranger Active-Tab, Fade-Gradient, Scroll-Snap).

## Hinweis zur Ballon-Füllung

Volcano hat keinen Drucksensor — zeitbasiert gefüllt. **Niemals unbeaufsichtigt füllen — auch nicht via Schedule.**

## Hinweis zu Auto-Heat-Schedules

Geplantes Heizen ohne Anwesenheit ist ein Brandrisiko. **Lass die Auto-Cool-Down-Sicherheit immer aktiv** (Einstellungen → Sicherheit). Standard: nach 30 Min ohne Pumpaktivität schaltet sich der Heizer automatisch aus.
