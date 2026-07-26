# Terp Sessions, Arbeitsanweisungen

Gilt für jede Aufgabe in diesem Repo.

## Arbeitsordner

- Der Arbeitsordner ist ausschließlich `C:\Users\Nutzer\Documents\terp-sessions`.
- Alles unter `C:\Users\Nutzer\Downloads` ist alt und darf nie als Basis dienen. Dort liegt unter anderem `_ALT-v5.0.2-NICHT-DEPLOYEN` mit einer v5.1.0 samt eigener `run-all.mjs`. Das ist eine Falle, kein Fundus.
- Vor jeder Aufgabe prüfen:
  - `git remote -v` muss auf `123ichbinmitdabei/terp-sessions` zeigen.
  - `sw.js` VERSION muss zur erwarteten Basisversion passen.
  - `git status` muss einen sauberen Baum zeigen.
- Bei Abweichung: sofort stoppen, nichts ändern, melden und warten. Nicht improvisieren, nicht die Testinfrastruktur neu erfinden.

## Architektur

- Single File: das gesamte Anwendungs-JS liegt inline in `index.html`, in zwei `<script>`-Blöcken (zuerst aes-js, dann die App).
- Kein Build, kein Bundler, keine CDN-Abhängigkeiten.
- `sw.js` ist der Service Worker mit dem App-Shell-Cache.

## Tests

- Tests gehören ins Repo. Jede Suite wird zusammen mit dem Feature committet, das sie absichert. Eine Suite, die nur lokal existiert, ist keine Suite, sondern eine Behauptung.
- Vor jedem Commit muss `node run-all.mjs` grün sein.
- Neue Suite: Datei `vXXXname.mjs` neben `run-all.mjs` anlegen, `runSuite(t)` exportieren. Der Runner sammelt sie automatisch ein, kein Eintrag nötig.
- Aufbau, Fallstricke und aktueller Stand: `TESTING-STATUS.md`, Abschnitt 0.

## Syntaxprüfung

Nach jeder Änderung am Inline-JS:

```bash
node -e "const fs=require('fs'),vm=require('vm');const h=fs.readFileSync('index.html','utf8');let n=0;for(const m of h.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)){new vm.Script(m[1],{filename:'index.html#script'+(++n)});}console.log('Syntax OK, '+n+' Bloecke');"
```

`node run-all.mjs` lädt beide Blöcke ohnehin über `node:vm`, ein Syntaxfehler bricht den Lauf also sofort ab. Der Einzelbefehl oben ist der schnelle Zwischencheck.

## Release

Die Version bei jedem Release an allen vier Stellen erhöhen:

| Stelle | Datei |
|---|---|
| `const VERSION` | `sw.js` |
| `SW_VERSION_LABEL` | `index.html` |
| Boot-Log `Terp Sessions vX.Y.Z bereit.` | `index.html` |
| Titelzeile plus neuer Versionsabschnitt | `README.md` |

## Git

- Kein force-push.
- Kein Push und kein Tag ohne ausdrückliche Freigabe von Andre.
- Tags sind lightweight, Format `v9.43.0`.
- Commit-Nachrichten auf Deutsch.

## Sprache

- Deutsch.
- Keine Gedankenstriche. Stattdessen Komma, Doppelpunkt oder Klammern.
- Deutsche Anführungszeichen: „so", nicht "so".
- Gilt für Code-Kommentare, Commit-Nachrichten, Dokumentation und Nutzertexte in der App.
