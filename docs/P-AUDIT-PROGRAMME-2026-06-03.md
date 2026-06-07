# Audit + Plan: Community-Programme mit Template-System (Paket P)

**Datum:** 2026-06-03
**Modus:** READ-ONLY. Kein Code, kein Backend, kein git, keine Tests geändert.
**Ziel (Andre):** Community-Programm-Erstellung soll denselben Editor + dieselbe Template-Auswahl wie eigene Programme bekommen. Zusätzlich sollen Community-Programme als Templates auftauchen, sodass die Template-Bibliothek mit jedem neuen Community-Programm wächst.

Alle Zeilennummern beziehen sich auf `index.html` (v9.2.0), Schema auf `community-backend.sql`.

> **UMGESETZT in v9.3.0 (Paket P).** Community-Programme nutzen denselben reichen Editor (`#modalEditor`-Delegation), den In-Editor-Template-Picker und das Veroeffentlichen wie eigene Programme. Status-Vermerk nachgetragen in v9.10.1 (Paket DOC-2) fuer Paritaet mit den anderen Audit-Docs.

---

## 1. Status quo: Eigene Programme

- **Editor:** `openEditor(id)` / Modal `#modalEditor` (ab Zeile 7919). Reich: Schritt-Builder mit Drag-Reorder (`renderBuilder` 7944), drei Ansichten (Liste, Timeline, Kurve, `setEditorMode`), Schritt-Hinzufügen-Palette (`openAddStep` 8162, `addStepWithAction` 8169), Schritt-Bearbeiten-Modal (`editStepAt` 8185, `saveStepEdit` 8232), Dauer-Schätzung (`estimateDuration`, `expandLoops`), Loop-Unterstützung.
- **Schritt-Vorlagen:** `STEP_TEMPLATES` (Zeile 5731), 31 Schritt-Bausteine (für die Add-Step-Palette).
- **Programm-Objekt:** `{ id:'wf-…', name, desc, steps:[{action, value?, seconds?}], isPreset:bool }`.
- **Programm-Templates:** `PRESETS` (Zeile 6955), **19 eingebaute Vorlagen**. Beim Erststart werden sie als bearbeitbare Einträge mit `isPreset=true` in `State.programs` migriert (12302 ff.) und im Programme-Tab unter „Vorlagen" gerendert (`renderPrograms` 7817, Preset-Sektion 7840). „↻ Vorlagen auf Werkseinstellungen" setzt sie zurück.
- **Speicher:** `localStorage` `vol_programs` (`State.programs`, 5819). Rein lokal, kein Backend.
- **Schritt-Vokabular:** `heat_on, heat_off, pump_on, pump_off, set_temperature, wait_until, wait, pump_for, loop_start, loop_end`.

**Wichtige Nuance:** Es gibt **kein In-Editor-Template-Dropdown**. „Template nutzen" heißt heute: eine Preset-Karte im Tab öffnen/bearbeiten (Bearbeiten ändert das Preset direkt in `State.programs`, `saveEditor` 8242 schreibt per `editingId` in-place) oder ein neues, leeres Programm anlegen (startet mit `steps:[{action:'heat_on'}]`). Die Funktion `duplicatePreset` (7905, Deep-Copy mit neuer id + „ (Kopie)") existiert, wird aber **nirgends aufgerufen** (toter Code).

---

## 2. Status quo: Community-Programme

- **Editor:** `_commProgramEditOpen(mode, source)` / Modal `#modalCommunityProgramEdit` (ab Zeile 7488). **Separate, deutlich einfachere** Implementierung: pro Schritt eine Zeile mit `<select>` für die Aktion + zwei Zahlen-Inputs (Wert/°C, Sekunden) + Entfernen (`_commProgStepsRender` 7528). Kein Drag, keine Kurve, keine Timeline, keine Schritt-Palette, keine Dauer-Schätzung.
- **Schritt-Vokabular:** `_commProgValidActions` (7526), **identisch** zu den eigenen Programmen (dieselben 10 Aktionen). Schritte sind also 1:1 austauschbar.
- **Erfasste Felder (mehr als eigener Editor):** Name (`cpName`), Beschreibung (`cpDesc`), Schritte (`_commProgEditSteps`), **Geräte** (`_commProgEditDevices` → `community_program_devices`), **Sorten-Verknüpfung** (`_commProgEditStrainIds` → `community_program_strains`), **Pseudonym/anonym** (`cpShowPseu`). Modi: create / edit / propose.
- **Backend-RPC:** `community_program_create(p_code, p_pin, p_show_pseudonym, p_data jsonb)` (community-backend.sql 470). Dazu `community_program_list` (500), `community_program_update_own`, `_delete_own`, `_propose_edit`, `_rate`, `community_program_link_strains`, `community_program_set_devices` (alle im `communityClient`, 18310 f.).
- **Schema `community_programs`** (community-backend.sql 80): `id uuid, author_code→csc_users(code), show_pseudonym, name, description, steps jsonb, total_duration_sec, is_factory_seed, created_at, updated_at, moderation_status`. Plus Link-Tabellen `community_program_strains` (96), `community_program_devices` (102).
- **Quelle der Liste:** `communityClient.programList(...)` → `_commProgCache` (7321, paginiert mit limit/offset).

---

## 3. Lückenanalyse

| Fähigkeit | Eigener Editor | Community-Editor |
|---|---|---|
| Reicher Schritt-Builder (Drag, Kurve, Timeline) | ✓ | ✗ (nur Select-Zeilen) |
| Schritt-Palette (`STEP_TEMPLATES`, 31) | ✓ | ✗ |
| Schritt-Bearbeiten-Modal | ✓ | ✗ (inline) |
| Dauer-Schätzung | ✓ | ✗ (Backend `total_duration_sec`) |
| Loop-Schritte mit UX | ✓ | ✗ (im Vokabular, aber keine visuelle Verschachtelung) |
| Geräte | ✗ | ✓ |
| Sorten-Verknüpfung | ✗ | ✓ |
| Pseudonym / Veröffentlichen | ✗ | ✓ |
| Template-Auswahl | Preset-Liste im Tab (19) | ✗ (keine) |

**Kerneinsicht:** Das Schritt-Vokabular ist identisch, die Schritt-Editier-UI liegt aber **doppelt** vor (`renderBuilder` + Schritt-Modale vs. `_commProgStepsRender`). Genau hier lohnt ein Refactor zu einer gemeinsamen Komponente. Die Community-Seite kann mehr (Geräte/Sorten/Pseudonym), die eigene Seite hat die bessere Schritt-UX, beide ergänzen sich.

---

## 4. Konzept-Vorschlag

### Ziel 1: Community-Editor nutzt denselben Editor + Template-Auswahl
- **Gemeinsame Schritt-Editor-Komponente** aus `renderBuilder` + Schritt-Modalen extrahieren. Sie arbeitet auf einem `steps[]`-Array und meldet Änderungen zurück. Beide Editoren binden dieselbe Komponente ein.
- Der Community-Editor = gemeinsame Schritt-Komponente + die Community-spezifischen Felder (Name, Beschreibung, Geräte, Sorten, Pseudonym) drumherum.
- **Template-Picker** (durchsuchbares Modal, kein riesiges Dropdown) für BEIDE Editoren: Auswahl aus `{19 PRESETS} ∪ {Community-Programme}` → Deep-Copy der Schritte in den Editor.

### Ziel 2: Community-Programme wachsen die Template-Bibliothek
- Template-Quelle = `PRESETS` plus die via `programList` geladenen Community-Programme (`_commProgCache`).
- „Als Template laden" = **Deep-Copy** der Schritte (optional Geräte) in ein neues Programm mit neuer id, Owner = aktueller Nutzer, `isPreset=false` (lokal) bzw. neuer Community-Entwurf. **Keine Live-Referenz** auf das Original. Optionales, nicht-bindendes Metafeld `templateOrigin` (Original-id + Name) nur für Quellenangabe.

### Datenfluss (Prosa-Diagramm)
```
PRESETS (19, im Code)
        \
         +-> Template-Quelle -> Template-Picker -(Deep-Copy der Schritte)-> gemeinsamer Editor -> Speichern
        /                                                                        |
community_programs                                                               +-> lokal (vol_programs)   [eigenes Programm]
(Backend -> programList -> _commProgCache)                                       +-> community_program_create [veröffentlichen]
```

---

## 5. Edge-Cases (aus dem Auftrag)

- **Community-Programm wird gelöscht, während es als Template offen ist:** Durch Deep-Copy-beim-Laden ist die lokale Kopie sofort unabhängig, ein späteres Löschen des Originals ist irrelevant. Empfehlung: konsequent Deep-Copy beim Laden, keine Live-Vorschau, die auf das Original verweist (sonst 404 beim Speichern).
- **Sehr lange Template-Liste (100+):** Der gemischte Picker (19 Presets + N Community) braucht Suche + Filter + Lazy-Load. `programList` paginiert bereits (limit/offset) und unterstützt `p_filter` + `p_device`. Empfehlung: durchsuchbares Modal mit Textfilter, Geräte-Filter und Nachladen, optional Sortierung nach Bewertung. Kein einzelnes Dropdown mit 100+ Optionen.
- **Werks-Sorten / Sorten-Verknüpfungen beim Template-Laden:** Eigene Programme haben keine Sorten-Links, Community-Programme verknüpfen Sorten per uuid (`community_program_strains`). Beim Laden eines Community-Programms als **lokales** Template lassen sich diese uuids nicht auf lokale Daten abbilden. Empfehlung: Beim Laden in den lokalen Editor nur **Schritte** (optional Geräte) übernehmen, Sorten-Links weglassen oder als reine Metadaten anzeigen. Beim Veröffentlichen lokal→Community werden Sorten im Community-Editor neu gewählt. Das ist eine Design-Entscheidung (siehe offene Fragen).

---

## 6. Aufwandsschätzung

| Schritt | Inhalt | Aufwand |
|---|---|---|
| 1 | Gemeinsame Schritt-Editor-Komponente extrahieren (aus `renderBuilder` + Schritt-Modalen), eigenen Editor darauf umstellen, absichern. **Riskantester Teil, fasst den funktionierenden Kern-Editor an.** | 3 bis 4 h |
| 2 | Community-Editor auf die gemeinsame Komponente umstellen (`_commProgStepsRender` ersetzen, Community-Felder drumherum behalten) | 2 bis 3 h |
| 3 | Template-Picker (durchsuchbares Modal) über PRESETS ∪ Community, Deep-Copy beim Laden | 2 bis 3 h |
| 4 | Community-Programme in die Template-Quelle mergen + Quellenangabe-Metadaten | 1 bis 2 h |
| 5 | Edge-Cases (Sorten-Link-Politik, gelöschtes Original, Filter für lange Liste) | 1 bis 1,5 h |
| 6 | Tests (Editor-Parität, Template-Load-Deep-Copy, Merge, Edge-Cases) | 1,5 bis 2 h |

**Summe ca. 11 bis 16 h.**

**Backend-Änderung nötig?** Für den Kern **nein**: `community_program_create`, `programList`, Link-/Device-RPCs existieren alle, das Mergen ist reines Frontend (Daten kommen schon über `programList`). **Keine SQL-Pause nötig.** Nur falls Andre eine serverseitige Template-Rangfolge will (z. B. „beliebteste Vorlagen"), wäre eine kleine additive RPC denkbar, das wäre dann ein separater Patch mit SQL-Pause. Default: ohne Backend-Änderung.

---

## 7. Empfohlene Reihenfolge

1. **Schritt 1 zuerst** (gemeinsame Komponente). De-risked alles Folgende, sollte hinter Tests laufen, weil er den heute funktionierenden eigenen Editor anfasst.
2. **Schritt 2** (Community-Editor adoptiert die Komponente). Ab hier haben beide Editoren dieselbe Schritt-UX.
3. **Schritt 3** (Template-Picker), dann **4** (Merge), dann **5** (Edge-Cases), dann **6** (Tests, begleitend pro Schritt).

Sinnvoll als eigenes Paket mit Version-Bump (z. B. v9.3.0, MINOR, da größeres UI-Feature). Da kein Backend, kein Andre-SQL-Stopp.

---

## 8. Offene Design-Fragen für Andre

1. **„Template-Auswahl wie eigene Programme":** Eigene Programme haben aktuell **kein** In-Editor-Dropdown, nur die Preset-Liste im Tab. Soll ein **neuer In-Editor-Template-Picker für beide** her, oder sollen Community-Programme nur zusätzlich in der bestehenden Preset-Liste auftauchen?
2. **Sorten-Verknüpfungen beim Template-Laden:** lokal weglassen, oder nur in den Community-Editor übernehmen (wo die Sorten existieren)? Soll der Original-Autor als Quelle genannt werden?
3. **Welche Community-Programme werden Templates?** Alle automatisch, oder nur ab einer Schwelle (z. B. Bewertung ≥ X, oder ein „Template"-Flag)? 100+ ungefilterte Vorlagen können unübersichtlich werden.
4. **Lokal → Community veröffentlichen:** Soll der vereinheitlichte Editor erlauben, ein lokales Programm direkt in die Community zu veröffentlichen (heute getrennte Flows)?
5. **Toter Code `duplicatePreset`** (7905): im Zuge dessen aufräumen oder belassen?

---

## Beiläufig gefundene Punkte (nur notiert, nicht gefixt)

- `duplicatePreset` (Zeile 7905) ist toter, nirgends aufgerufener Code.
- Community-Editor: `loop_start`/`loop_end` sind im Vokabular, aber ohne visuelle Verschachtelung/UX, leicht fehlbedienbar.
- Eigener Editor speichert beim Bearbeiten eines Presets in-place (`saveEditor` 8244), es gibt also keine „Vorlage bleibt unverändert"-Garantie, außer über „auf Werkseinstellungen zurücksetzen". Beim Template-Konzept beachten.
