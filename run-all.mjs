#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   run-all.mjs — Regressions-Runner fuer Terp Sessions (ab v9.43.0)

   Aufruf:
     node run-all.mjs                  alle Suiten
     node run-all.mjs v943             nur Suiten, deren Name "v943" enthaelt
     node run-all.mjs --timeout=15000  Watchdog pro Test hochsetzen
     node run-all.mjs --list           nur auflisten, nichts ausfuehren

   Suiten werden AUTOMATISCH eingesammelt: jede Datei `v*.mjs` neben dieser
   Datei, die eine Funktion `runSuite` exportiert, wird geladen. Eine neue
   Suite braucht also keinen Eintrag hier — Datei anlegen, fertig.

   Vertrag einer Suite:
     export const meta = { name:'v943autoconnect', title:'…' };   // optional
     export function runSuite(t){
       t.before(async () => { … });      // optional, einmal pro Suite
       t('beschreibung', async () => { … });
       t.after(() => { … });             // optional
     }
   runSuite registriert Tests nur, es fuehrt sie nicht aus. Der Runner besitzt
   die Test-Schleife — nur so kann er pro Test einen Watchdog setzen.

   Zwei bewusste Entscheidungen:
   1. Ausgabe geht per fs.writeSync direkt auf FD 1. Node puffert stdout
      blockweise, sobald es kein TTY ist (Pipe/Datei/CI). Ohne writeSync sieht
      ein haengender Test wie ein haengender Runner aus, weil die letzten
      Zeilen noch im Puffer stehen.
   2. Der Test-Name wird VOR dem Lauf ausgegeben, das Ergebniszeichen danach.
      Ein Test, der synchron haengt (Endlosschleife), kann von Promise.race
      nicht abgebrochen werden — aber sein Name steht dann bereits auf dem
      Schirm und benennt den Schuldigen.
═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SELF = path.basename(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const FILTER = argv.filter(a => !a.startsWith('-'));
const LIST_ONLY = argv.includes('--list');
const DEFAULT_TIMEOUT = Number((argv.find(a => a.startsWith('--timeout=')) || '').split('=')[1]) || 10000;

/* ── unbuffered output ─────────────────────────────────────── */
function out(s) { try { fs.writeSync(1, s); } catch { process.stdout.write(s); } }
const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  ok: s => COLOR ? `\x1b[32m${s}\x1b[0m` : s,
  bad: s => COLOR ? `\x1b[31m${s}\x1b[0m` : s,
  dim: s => COLOR ? `\x1b[90m${s}\x1b[0m` : s,
  head: s => COLOR ? `\x1b[1m${s}\x1b[0m` : s,
};

/* ── Suiten einsammeln ─────────────────────────────────────── */
function discover() {
  return fs.readdirSync(HERE)
    .filter(f => /^v.*\.mjs$/i.test(f) && f !== SELF && f !== 'test-kit.mjs')
    .sort();
}

/* ── Registrar, den jede Suite bekommt ─────────────────────── */
function makeRegistrar() {
  const tests = [];
  const hooks = { before: [], after: [], afterEach: [] };
  const t = (name, fn, opts = {}) => { tests.push({ name, fn, timeout: opts.timeout || 0 }); };
  t.before = fn => hooks.before.push(fn);
  t.after = fn => hooks.after.push(fn);
  /* afterEach ist nicht Kosmetik: eine Suite, die pro Test eine App-Instanz
     mit laufenden Intervallen aufmacht und erst am Ende aufraeumt, laesst
     dutzende Zombie-Kontexte parallel weiterrechnen. Das killt den Heap. */
  t.afterEach = fn => hooks.afterEach.push(fn);
  t.skip = (name) => { tests.push({ name, fn: null, timeout: 0 }); };
  return { t, tests, hooks };
}

function withTimeout(promise, ms, label) {
  let timer;
  const guard = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error(`Watchdog: ${label} laeuft laenger als ${ms} ms`)), ms);
    if (timer.unref) timer.unref();
  });
  return Promise.race([Promise.resolve(promise), guard]).finally(() => clearTimeout(timer));
}

/* ── Hauptlauf ─────────────────────────────────────────────── */
const files = discover().filter(f => !FILTER.length || FILTER.some(x => f.toLowerCase().includes(x.toLowerCase())));

if (LIST_ONLY) {
  out(`${files.length} Suite(n):\n`);
  files.forEach(f => out('  ' + f + '\n'));
  process.exit(0);
}

if (!files.length) {
  out(c.bad('Keine Suite gefunden.') + (FILTER.length ? ` (Filter: ${FILTER.join(', ')})\n` : '\n'));
  process.exit(1);
}

const started = Date.now();
let totalPass = 0, totalFail = 0, totalSkip = 0;
const failures = [];
const suiteRows = [];

out(c.head(`\nTerp Sessions — Regression (${files.length} Suite${files.length === 1 ? '' : 'n'}, Watchdog ${DEFAULT_TIMEOUT} ms)\n`));

for (const file of files) {
  let mod;
  try {
    mod = await import(pathToFileURL(path.join(HERE, file)).href);
  } catch (e) {
    out(c.bad(`\n✗ ${file} — Import fehlgeschlagen: ${e.message}\n`));
    totalFail++; failures.push({ suite: file, name: '(import)', err: e });
    suiteRows.push({ file, pass: 0, fail: 1, skip: 0 });
    continue;
  }
  if (typeof mod.runSuite !== 'function') {
    out(c.dim(`  ${file} übersprungen (kein runSuite-Export)\n`));
    continue;
  }

  const title = (mod.meta && (mod.meta.title || mod.meta.name)) || file;
  out('\n' + c.head(`── ${title}`) + c.dim(`  (${file})`) + '\n');

  const { t, tests, hooks } = makeRegistrar();
  let suitePass = 0, suiteFail = 0, suiteSkip = 0;
  const tSuite = Date.now();

  try {
    await withTimeout(mod.runSuite(t), DEFAULT_TIMEOUT * 3, `${file}: runSuite()`);
    for (const h of hooks.before) await withTimeout(h(), DEFAULT_TIMEOUT * 3, `${file}: before()`);
  } catch (e) {
    out('  ' + c.bad(`✗ Setup: ${e.message}`) + '\n');
    totalFail++; suiteFail++;
    failures.push({ suite: file, name: '(setup)', err: e });
    suiteRows.push({ file, pass: 0, fail: suiteFail, skip: 0 });
    continue;
  }

  for (const test of tests) {
    if (!test.fn) { out('  ' + c.dim(`- ${test.name} (übersprungen)`) + '\n'); totalSkip++; suiteSkip++; continue; }
    out(c.dim('  · ') + test.name + ' ');            // Name ZUERST — identifiziert auch sync-Haenger
    const t0 = Date.now();
    try {
      await withTimeout(test.fn(), test.timeout || DEFAULT_TIMEOUT, test.name);
      const ms = Date.now() - t0;
      out(c.ok('✓') + (ms > 250 ? c.dim(` ${ms} ms`) : '') + '\n');
      totalPass++; suitePass++;
    } catch (e) {
      out(c.bad('✗ ') + c.bad(e && e.message ? e.message : String(e)) + '\n');
      totalFail++; suiteFail++;
      failures.push({ suite: file, name: test.name, err: e });
    }
    for (const h of hooks.afterEach) { try { await withTimeout(h(), DEFAULT_TIMEOUT, `${file}: afterEach()`); } catch { /* Aufraeumen darf scheitern */ } }
  }

  for (const h of hooks.after) { try { await withTimeout(h(), DEFAULT_TIMEOUT, `${file}: after()`); } catch { /* Aufraeumen darf scheitern */ } }

  out(c.dim(`  ${suitePass}/${suitePass + suiteFail} grün in ${Date.now() - tSuite} ms\n`));
  suiteRows.push({ file, pass: suitePass, fail: suiteFail, skip: suiteSkip });
}

/* ── Bilanz ────────────────────────────────────────────────── */
out('\n' + c.head('── Bilanz') + '\n');
for (const r of suiteRows) {
  const mark = r.fail ? c.bad('✗') : c.ok('✓');
  out(`  ${mark} ${r.file.padEnd(28)} ${String(r.pass).padStart(4)} grün` +
    (r.fail ? c.bad(`, ${r.fail} rot`) : '') + (r.skip ? c.dim(`, ${r.skip} übersprungen`) : '') + '\n');
}
out(`\n  ${totalPass} / ${totalPass + totalFail} Tests grün` +
  (totalSkip ? `, ${totalSkip} übersprungen` : '') +
  `  (${((Date.now() - started) / 1000).toFixed(1)} s)\n`);

if (failures.length) {
  out('\n' + c.bad(`── ${failures.length} Fehler im Detail`) + '\n');
  for (const f of failures) {
    out(c.bad(`  ✗ ${f.suite} › ${f.name}\n`));
    const stack = (f.err && f.err.stack) ? String(f.err.stack).split('\n').slice(0, 6).join('\n') : String(f.err);
    out(c.dim(stack.replace(/^/gm, '      ')) + '\n');
  }
}

out(failures.length ? c.bad('\nROT\n\n') : c.ok('\nGRÜN\n\n'));
process.exit(failures.length ? 1 : 0);
