/* ═══════════════════════════════════════════════════════════════════════════
   v943autoconnect.mjs — v9.43.0 Auto-Verbindung mit gemerktem Geraet

   Prueft drei Ebenen:
     1. Harness-Sanitaet   — laedt index.html ueberhaupt, haengt log() nicht
     2. Reine Logik        — der AC_PURE-Block, DOM- und State-frei
     3. Integration        — autoConnect() gegen echten Connect-Pfad + Mock-GATT,
                             Schalter im v9.34-Beschreibungsschema, PREFS,
                             Boot-Reihenfolge gegenueber dem v9.33-Crash-Dialog

   Alle Integrationstests laufen gegen die ECHTEN Funktionen aus index.html,
   nicht gegen Nachbauten.
═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import { loadApp, makeBluetooth, makeVolcanoDevice, INDEX_HTML, assert, assertEq } from './test-kit.mjs';

export const meta = {
  name: 'v943autoconnect',
  title: 'v9.43.0 Auto-Verbindung (Stufe A/B, LRU, Backoff, Schalter)',
};

const DEV_ID = 'mock-volcano-1';
const DEV_NAME = 'VOLCANO 12345';

/** Frische App-Instanz. `pref` landet als vol_prefs im localStorage. */
function fresh({ pref, devices, getDevices, noBle, requestResult } = {}) {
  const bt = noBle ? null : makeBluetooth({
    devices: devices || [],
    getDevices: getDevices === false ? false : true,
    requestResult: requestResult || null,
  });
  const app = loadApp({
    noBle: !!noBle,
    bluetooth: bt || undefined,
    storage: pref ? { vol_prefs: pref } : {},
  });
  app.run('loadUUIDs()');           // macht init() genauso — sonst sind die UUID-Felder leer
  return app;
}

/** Kuerzt den Backoff auf 1 ms und schreibt mit, welche echten Wartezeiten
 *  autoConnect angefordert hat. So bleibt der Test schnell UND beweist, dass
 *  die Tabelle 1s/2s/4s tatsaechlich benutzt wird. */
function spyBackoff(app) {
  app.run(`globalThis._acDelays = [];
    (function(){ const echt = acBackoffMs; acBackoffMs = function(n){ _acDelays.push(echt(n)); return 1; }; })();`);
  return () => app.run('_acDelays');
}

/** Pref-Block fuer "ein Geraet ist bekannt und zuletzt genutzt". */
function prefKnown(extra = {}) {
  return Object.assign({
    autoConnect: true,
    lastDeviceId: DEV_ID,
    knownDevices: [{ id: DEV_ID, name: DEV_NAME, type: 'volcano', lastUsed: 1000 }],
  }, extra);
}

export function runSuite(t) {
  let app;                          // geteilte Instanz fuer die reinen Logik-Tests
  const open = [];                  // Instanzen des laufenden Tests, werden sofort wieder abgeraeumt
  const use = a => { open.push(a); return a; };

  t.before(() => { app = fresh(); });
  // Jede App-Instanz haelt einen kompletten DOM-Baum und laufende Intervalle.
  // Wer sie bis zum Suite-Ende offen laesst, hat am Ende 20 Apps, die parallel
  // vor sich hin rechnen — das hat beim Bau dieser Suite den Heap gesprengt.
  t.afterEach(() => { open.splice(0).forEach(a => { try { a.dispose(); } catch { } }); });
  t.after(() => { try { app.dispose(); } catch { } });

  /* ═══ 1. HARNESS-SANITAET ═══════════════════════════════ */

  t('index.html laedt im vm-Kontext, App-Scope ist erreichbar', () => {
    assertEq(typeof app.get('State'), 'object', 'State');
    assertEq(typeof app.get('PREFS'), 'object', 'PREFS');
    assertEq(typeof app.get('connectBLE'), 'function', 'connectBLE');
    assertEq(typeof app.get('autoConnect'), 'function', 'autoConnect');
    assertEq(typeof app.get('_connectWithDevice'), 'function', '_connectWithDevice');
  });

  t('log() haengt nicht, wenn mehr als 5 Zeilen ins Mini-Log laufen', () => {
    app.run('for(let i=0;i<40;i++) log("Zeile "+i);');
    assertEq(app.document.getElementById('miniLog').children.length, 5, 'Mini-Log haelt 5 Zeilen');
    assertEq(app.document.getElementById('log').children.length, 40, 'Haupt-Log sammelt');
  });

  t('log() begrenzt das Haupt-Log auf 200 Zeilen', () => {
    const a = use(fresh());
    a.run('for(let i=0;i<260;i++) log("x"+i);');
    assertEq(a.document.getElementById('log').children.length, 200);
  });

  t('AC_PURE-Block ist DOM- und State-frei', () => {
    const src = fs.readFileSync(INDEX_HTML, 'utf8');
    const m = src.match(/==AC_PURE_START==([\s\S]*?)==AC_PURE_END==/);
    assert(m, 'AC_PURE-Marker fehlen in index.html');
    const body = m[1];
    for (const verboten of ['document', 'State.', 'PREFS', '$(', 'localStorage', 'log(']) {
      assert(!body.includes(verboten), `AC_PURE-Block enthaelt "${verboten}" — nicht mehr rein`);
    }
    for (const fn of ['btCaps', 'acUpsertDevice', 'acSortKnownDesc', 'acPickAutoTarget',
      'acDecideStage', 'acBackoffMs', 'acStageBLabel']) {
      assert(body.includes('function ' + fn), `AC_PURE-Block: ${fn} fehlt`);
    }
  });

  /* ═══ 2. REINE LOGIK ════════════════════════════════════ */

  /* — btCaps — */
  t('btCaps: ohne bluetooth ist alles false', () => {
    assertEq(app.run('btCaps({})'), { api: false, getDevices: false, watchAds: false, forget: false });
  });

  t('btCaps: bluetooth ohne getDevices -> api true, getDevices false', () => {
    assertEq(app.run('btCaps({bluetooth:{requestDevice(){}}, BluetoothDevice:{prototype:{}}})'),
      { api: true, getDevices: false, watchAds: false, forget: false });
  });

  t('btCaps: getDevices wird erkannt', () => {
    assertEq(app.run('btCaps({bluetooth:{getDevices(){}}, BluetoothDevice:{prototype:{}}}).getDevices'), true);
  });

  t('btCaps: watchAdvertisements/forget kommen vom BluetoothDevice-Prototyp', () => {
    const r = app.run('btCaps({bluetooth:{getDevices(){}}, BluetoothDevice:{prototype:{watchAdvertisements(){}, forget(){}}}})');
    assertEq(r, { api: true, getDevices: true, watchAds: true, forget: true });
  });

  t('btCaps: wirft nie, auch bei einem navigator mit werfenden Gettern', () => {
    const r = app.run(`btCaps(Object.defineProperty({}, 'bluetooth', { get(){ throw new Error('boom'); } }))`);
    assertEq(r, { api: false, getDevices: false, watchAds: false, forget: false });
  });

  t('btCaps: ohne Argument faellt es auf den echten navigator zurueck', () => {
    assertEq(app.run('btCaps().api'), true, 'Mock-navigator hat bluetooth');
  });

  /* — acUpsertDevice — */
  t('acUpsertDevice: neues Geraet wird aufgenommen', () => {
    assertEq(app.run(`acUpsertDevice([], {id:'a', name:'A', lastUsed:5}, 5)`),
      [{ id: 'a', name: 'A', lastUsed: 5 }]);
  });

  t('acUpsertDevice: bekanntes Geraet wird aktualisiert statt dupliziert', () => {
    const r = app.run(`acUpsertDevice([{id:'a',name:'Alt',lastUsed:1}], {id:'a',name:'Neu',lastUsed:9}, 5)`);
    assertEq(r.length, 1, 'kein Duplikat');
    assertEq(r[0], { id: 'a', name: 'Neu', lastUsed: 9 });
  });

  t('acUpsertDevice: sortiert nach lastUsed absteigend', () => {
    const r = app.run(`acUpsertDevice([{id:'a',lastUsed:1},{id:'b',lastUsed:3}], {id:'c',lastUsed:2}, 5)`);
    assertEq(r.map(d => d.id), ['b', 'c', 'a']);
  });

  t('acUpsertDevice: kuerzt auf max (Standard 5)', () => {
    const r = app.run(`acUpsertDevice([1,2,3,4,5].map(i=>({id:'d'+i,lastUsed:i})), {id:'neu',lastUsed:99})`);
    assertEq(r.length, 5);
    assertEq(r[0].id, 'neu');
    assert(!r.some(d => d.id === 'd1'), 'aeltester Eintrag faellt raus');
  });

  t('acUpsertDevice: mutiert die Eingabeliste nicht', () => {
    const r = app.run(`(()=>{ const alt=[{id:'a',lastUsed:1}]; const neu=acUpsertDevice(alt,{id:'b',lastUsed:2},5);
      return {altLen:alt.length, neuLen:neu.length, gleichesObjekt: alt[0]===neu.find(d=>d.id==='a')}; })()`);
    assertEq(r, { altLen: 1, neuLen: 2, gleichesObjekt: false });
  });

  t('acUpsertDevice: bei gleichem lastUsed bleibt die Einfuegereihenfolge stehen', () => {
    // Dokumentiert bewusst das Verhalten bei Gleichstand: die Sortierung ist stabil,
    // ein gleich alter Neuzugang draengt sich also nicht vor. In der Praxis irrelevant,
    // weil echte Connects nie in derselben Millisekunde liegen.
    assertEq(app.run(`acUpsertDevice([{id:'a',lastUsed:5},{id:'b',lastUsed:5}], {id:'c',lastUsed:5}, 2).map(d=>d.id)`),
      ['a', 'b']);
  });

  t('acUpsertDevice: vertraegt null/kaputte Liste', () => {
    assertEq(app.run(`acUpsertDevice(null, {id:'a',lastUsed:1}, 5)`), [{ id: 'a', lastUsed: 1 }]);
    assertEq(app.run(`acUpsertDevice('quatsch', {id:'a',lastUsed:1}, 5).length`), 1);
  });

  /* — acSortKnownDesc — */
  t('acSortKnownDesc: sortiert absteigend, fehlendes lastUsed zaehlt als 0', () => {
    assertEq(app.run(`acSortKnownDesc([{id:'a'},{id:'b',lastUsed:5},{id:'c',lastUsed:2}]).map(d=>d.id)`),
      ['b', 'c', 'a']);
  });

  t('acSortKnownDesc: laesst das Original unangetastet', () => {
    assertEq(app.run(`(()=>{ const l=[{id:'a',lastUsed:1},{id:'b',lastUsed:9}];
      acSortKnownDesc(l); return l.map(d=>d.id); })()`), ['a', 'b']);
  });

  t('acSortKnownDesc: null -> leere Liste', () => {
    assertEq(app.run('acSortKnownDesc(null)'), []);
  });

  /* — acPickAutoTarget — */
  t('acPickAutoTarget: findet das zuletzt genutzte Geraet', () => {
    assertEq(app.run(`acPickAutoTarget([{id:'x'},{id:'y'}], 'y').id`), 'y');
  });

  t('acPickAutoTarget: ohne lastDeviceId niemals ein Ziel', () => {
    assertEq(app.run(`acPickAutoTarget([{id:'x'}], '')`), null);
    assertEq(app.run(`acPickAutoTarget([{id:'x'}], null)`), null);
  });

  t('acPickAutoTarget: unbekannte lastDeviceId -> null, kein stiller Ersatz', () => {
    assertEq(app.run(`acPickAutoTarget([{id:'x'},{id:'y'}], 'z')`), null);
  });

  t('acPickAutoTarget: devices kein Array -> null', () => {
    assertEq(app.run(`acPickAutoTarget(null, 'y')`), null);
  });

  /* — acDecideStage — */
  const caps = (getDevices) => `{api:true, getDevices:${getDevices}, watchAds:false, forget:false}`;

  t('acDecideStage: A wenn Schalter, lastDeviceId und getDevices zusammenkommen', () => {
    assertEq(app.run(`acDecideStage(${caps(true)}, {autoConnect:true, lastDeviceId:'a', knownDevices:[{id:'a'}]})`), 'A');
  });

  t('acDecideStage: ohne getDevices bleibt es bei B', () => {
    assertEq(app.run(`acDecideStage(${caps(false)}, {autoConnect:true, lastDeviceId:'a', knownDevices:[{id:'a'}]})`), 'B');
  });

  t('acDecideStage: Schalter aus -> B', () => {
    assertEq(app.run(`acDecideStage(${caps(true)}, {autoConnect:false, lastDeviceId:'a', knownDevices:[{id:'a'}]})`), 'B');
  });

  t('acDecideStage: ohne lastDeviceId -> B', () => {
    assertEq(app.run(`acDecideStage(${caps(true)}, {autoConnect:true, lastDeviceId:'', knownDevices:[{id:'a'}]})`), 'B');
  });

  t('acDecideStage: gar kein Geraet bekannt -> none', () => {
    assertEq(app.run(`acDecideStage(${caps(true)}, {autoConnect:true, lastDeviceId:'', knownDevices:[]})`), 'none');
    assertEq(app.run(`acDecideStage(${caps(true)}, {})`), 'none');
  });

  /* — acBackoffMs / acStageBLabel — */
  t('acBackoffMs: 1s, 2s, 4s', () => {
    assertEq([0, 1, 2].map(n => app.run(`acBackoffMs(${n})`)), [1000, 2000, 4000]);
  });

  t('acBackoffMs: darueber und bei Unsinn bleibt es bei 4s', () => {
    assertEq([3, 9, -1].map(n => app.run(`acBackoffMs(${n})`)), [4000, 4000, 4000]);
    assertEq(app.run('acBackoffMs(undefined)'), 4000);
  });

  t('acStageBLabel: mit und ohne Namen', () => {
    assertEq(app.run(`acStageBLabel('VOLCANO 12345')`), 'VOLCANO 12345 verbinden');
    assertEq(app.run(`acStageBLabel('')`), 'Gerät verbinden');
    assertEq(app.run(`acStageBLabel(null)`), 'Gerät verbinden');
  });

  /* ═══ 3. INTEGRATION ════════════════════════════════════ */

  /* — PREFS — */
  t('PREFS-Defaults: Auto-Verbindung ist Opt-in', () => {
    const p = app.get('PREFS');
    assertEq(p.autoConnect, false, 'autoConnect');
    assertEq(p.lastDeviceId, '', 'lastDeviceId');
    assertEq(p.knownDevices, [], 'knownDevices');
  });

  t('PREFS: kaputter knownDevices-Wert aus dem localStorage wird zu []', () => {
    const a = use(fresh({ pref: { knownDevices: null } }));
    assertEq(a.get('PREFS').knownDevices, []);
    const b = use(fresh({ pref: { knownDevices: { nicht: 'array' } } }));
    assertEq(b.get('PREFS').knownDevices, []);
  });

  /* — Schalter + Beschreibungsschema (v9.34) — */
  t('Schalter #togAutoConnect existiert als role=switch, aus im Auslieferungszustand', () => {
    const el = app.document.getElementById('togAutoConnect');
    assert(el, '#togAutoConnect fehlt');
    assertEq(el.getAttribute('role'), 'switch');
    assertEq(el.getAttribute('aria-checked'), 'false');
    assertEq(el.getAttribute('aria-label'), 'Auto-Verbindung');
  });

  t('Schalter ist im v9.34-Beschreibungsschema registriert (29 -> 30 Schalter)', () => {
    const a = use(fresh());
    assertEq(a.run('_a11yWireToggleDescriptions()'), 30, 'verdrahtete Schalter');
    const el = a.document.getElementById('togAutoConnect');
    const id = el.getAttribute('aria-describedby');
    assert(id, 'kein aria-describedby am neuen Schalter');
    const small = a.document.getElementById(id);
    assert(small && small.textContent.trim().length > 40, 'Beschreibungstext fehlt oder ist zu duenn');
  });

  t('Schalter schaltet PREFS.autoConnect um und speichert', () => {
    const a = use(fresh());
    a.run('wire()');
    a.document.getElementById('togAutoConnect').click();
    assertEq(a.get('PREFS').autoConnect, true, 'PREFS gesetzt');
    assertEq(a.document.getElementById('togAutoConnect').getAttribute('aria-checked'), 'true');
    const gespeichert = JSON.parse(a.localStorage.getItem('vol_prefs'));
    assertEq(gespeichert.autoConnect, true, 'in vol_prefs persistiert');
  });

  t('openSettings() spiegelt PREFS.autoConnect auf aria-checked', () => {
    const a = use(fresh({ pref: { autoConnect: true } }));
    assertEq(a.document.getElementById('togAutoConnect').getAttribute('aria-checked'), 'false', 'Markup-Startwert');
    a.run('openSettings()');
    assertEq(a.document.getElementById('togAutoConnect').getAttribute('aria-checked'), 'true',
      'Schalter muss beim Oeffnen der Einstellungen den gespeicherten Stand zeigen');
  });

  /* — Ein-Tipp-Leiste (Stufe B) — */
  t('#autoConnectBar existiert und ist im Auslieferungszustand versteckt', () => {
    const bar = app.document.getElementById('autoConnectBar');
    assert(bar, '#autoConnectBar fehlt');
    assertEq(bar.hidden, true);
    assert(app.document.getElementById('btnAutoConnect'), '#btnAutoConnect fehlt');
  });

  /* — autoConnect: Stufen-Entscheidung — */
  t('autoConnect: ohne Web Bluetooth passiert nichts', async () => {
    const a = use(fresh({ noBle: true, pref: prefKnown() }));
    assertEq(await a.run('autoConnect()'), 'kein-ble');
    assertEq(a.document.getElementById('autoConnectBar').hidden, true, 'keine Leiste ohne BLE');
  });

  t('autoConnect: kein Geraet bekannt -> none, keine Leiste', async () => {
    const a = use(fresh());
    assertEq(await a.run('autoConnect()'), 'none');
    assertEq(a.document.getElementById('autoConnectBar').hidden, true);
  });

  t('autoConnect: Browser ohne getDevices -> Stufe B mit Geraetenamen', async () => {
    const a = use(fresh({ pref: prefKnown(), getDevices: false }));
    assertEq(await a.run('autoConnect()'), 'B');
    assertEq(a.document.getElementById('autoConnectBar').hidden, false, 'Leiste sichtbar');
    assertEq(a.document.getElementById('btnAutoConnect').textContent, DEV_NAME + ' verbinden');
  });

  t('autoConnect: Schalter aus -> Stufe B statt stiller Verbindung', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown({ autoConnect: false }), devices: [dev] }));
    assertEq(await a.run('autoConnect()'), 'B');
    assertEq(dev.connectCount, 0, 'nichts verbunden');
    assertEq(a.document.getElementById('autoConnectBar').hidden, false);
  });

  t('autoConnect: alte v4.5-Geraeteliste reicht fuer Stufe B', async () => {
    const a = use(loadApp({
      storage: { vol_known_devices: [{ id: 'dev_1', bleName: 'VOLCANO ALT', alias: 'Wohnzimmer', devType: 'volcano', lastUsed: 5 }] },
      bluetooth: makeBluetooth({}),
    }));
    a.setFastTimers(true);
    assertEq(await a.run('autoConnect()'), 'B');
    assertEq(a.document.getElementById('btnAutoConnect').textContent, 'Wohnzimmer verbinden');
  });

  /* — autoConnect: Stufe A gegen echten Connect-Pfad — */
  t('autoConnect Stufe A: verbindet wirklich, Adapter und Chars sind gebunden', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    assertEq(await a.run('autoConnect()'), 'A');
    assertEq(a.get('State').connected, true, 'State.connected');
    assertEq(dev.connectCount, 1, 'genau ein gatt.connect()');
    assertEq(a.run('State.adapter.constructor.deviceType'), 'volcano', 'Adapter erkannt');
    assertEq(a.run('!!State.chars.curTemp'), true, 'Characteristics gebunden');
    assertEq(a.run('State.chars.curTemp.notifying'), true, 'Notifications aktiv');
    assertEq(a.document.getElementById('autoConnectBar').hidden, true, 'Leiste bleibt weg');
    assertEq(a.document.getElementById('btnConnect').textContent, 'Verbunden');
  });

  /* Der wichtigste Test der Suite: eine Verbindung, die der Nutzer nicht angestossen
     hat, darf das Geraet ANFASSEN, aber niemals BEDIENEN. Kein Schreibbefehl heisst
     kein Heizer, keine Pumpe, keine Zieltemperatur — egal wie der Versuch ausgeht. */
  const schreibbefehle = dev => Object.entries(dev.chars)
    .filter(([, c]) => c.writes.length)
    .map(([k, c]) => `${k}:${c.writes.length}`);

  t('Auto-Connect schickt NULL Schreibbefehle ans Geraet', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    assertEq(await a.run('autoConnect()'), 'A');
    assertEq(a.get('State').connected, true, 'wirklich verbunden, nicht bloss untaetig');
    assertEq(schreibbefehle(dev), [], 'kein einziger writeValue waehrend des Auto-Connects');
  });

  t('Auch nach fehlgeschlagenem Auto-Connect: NULL Schreibbefehle', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 99 });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    spyBackoff(a);
    assertEq(await a.run('autoConnect()'), 'B');
    assertEq(schreibbefehle(dev), []);
  });

  t('Auch der manuelle Connect schickt keine Schreibbefehle (Vergleichsmassstab)', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), getDevices: false, requestResult: dev }));
    await a.run('connectBLE()');
    assertEq(a.get('State').connected, true);
    assertEq(schreibbefehle(dev), []);
  });

  t('autoConnect Stufe A: verbindet NIE mit einem anderen Geraet', async () => {
    const fremd = makeVolcanoDevice({ id: 'ein-anderes-geraet', name: 'VOLCANO FREMD' });
    const a = use(fresh({ pref: prefKnown(), devices: [fremd] }));   // lastDeviceId ist nicht dabei
    assertEq(await a.run('autoConnect()'), 'B');
    assertEq(fremd.connectCount, 0, 'fremdes Geraet wurde nicht angefasst');
    assertEq(a.get('State').connected, false);
    assertEq(a.document.getElementById('autoConnectBar').hidden, false, 'stattdessen Ein-Tipp-Angebot');
  });

  t('autoConnect Stufe A: zwei Fehlversuche, dritter gelingt, Backoff 1s/2s', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 2 });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    const delays = spyBackoff(a);
    assertEq(await a.run('autoConnect()'), 'A');
    assertEq(dev.connectCount, 3, 'drei Versuche');
    assertEq(a.get('State').connected, true);
    assertEq(delays(), [1000, 2000], 'Backoff-Tabelle in dieser Reihenfolge angefordert');
  });

  t('autoConnect Stufe A: drei Fehlversuche -> Ein-Tipp-Angebot, nicht verbunden', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 99 });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    const delays = spyBackoff(a);
    assertEq(await a.run('autoConnect()'), 'B');
    assertEq(delays(), [1000, 2000], 'nach dem dritten Versuch wird nicht mehr gewartet');
    assertEq(dev.connectCount, 3, 'genau drei Versuche, dann Schluss');
    assertEq(a.get('State').connected, false);
    assertEq(a.document.getElementById('autoConnectBar').hidden, false);
    assertEq(a.document.getElementById('btnAutoConnect').textContent, DEV_NAME + ' verbinden');
  });

  t('Wiederholte Versuche stapeln keine Disconnect-Handler', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 2 });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    spyBackoff(a);
    await a.run('autoConnect()');
    assertEq(dev._listenerCount('gattserverdisconnected'), 1,
      'ein Handler nach drei Versuchen — sonst mehrere parallele Reconnect-Ketten');
  });

  t('autoConnect: getDevices wirft -> Stufe B statt Absturz', async () => {
    const a = use(fresh({ pref: prefKnown() }));
    a.run(`navigator.bluetooth.getDevices = async () => { throw new Error('NotAllowedError'); }`);
    assertEq(await a.run('autoConnect()'), 'B');
    assertEq(a.document.getElementById('autoConnectBar').hidden, false);
  });

  t('autoConnect laeuft pro App-Start nur einmal', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    assertEq(await a.run('autoConnect()'), 'A');
    assertEq(await a.run('autoConnect()'), 'bereits-gelaufen');
    assertEq(dev.connectCount, 1, 'kein zweiter Verbindungsversuch');
  });

  t('autoConnect tut nichts, wenn schon verbunden', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('State.connected = true');
    assertEq(await a.run('autoConnect()'), 'bereits-verbunden');
    assertEq(dev.connectCount, 0);
  });

  /* — Geraet merken — */
  t('Nach dem Verbinden ist das Geraet Auto-Connect-Ziel', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    const p = a.get('PREFS');
    assertEq(p.lastDeviceId, DEV_ID, 'lastDeviceId');
    assertEq(p.knownDevices.length, 1);
    assertEq(p.knownDevices[0].id, DEV_ID);
    assertEq(p.knownDevices[0].name, DEV_NAME);
    assertEq(p.knownDevices[0].type, 'volcano');
    assert(p.knownDevices[0].lastUsed > 1000, 'lastUsed aktualisiert');
  });

  t('Das Merken landet auch im localStorage', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    const gespeichert = JSON.parse(a.localStorage.getItem('vol_prefs'));
    assertEq(gespeichert.lastDeviceId, DEV_ID);
    assertEq(gespeichert.knownDevices[0].id, DEV_ID);
  });

  t('Geraet ohne BLE-ID wird nicht als Auto-Ziel gemerkt', () => {
    const a = use(fresh());
    assertEq(a.run(`acRememberBleDevice({name:'Ohne ID'}, 'volcano')`), false);
    assertEq(a.get('PREFS').lastDeviceId, '');
    assertEq(a.get('PREFS').knownDevices, []);
  });

  t('acRememberBleDevice haelt die Liste bei 5 Eintraegen, aelteste fallen raus', () => {
    const a = use(fresh());
    // Date.now() innerhalb einer Schleife liefert dieselbe Millisekunde. Echte Connects
    // liegen Sekunden bis Tage auseinander — hier wird genau das nachgestellt.
    a.run(`(()=>{
      const Echt = Date; let n = 1000;
      globalThis.Date = class extends Echt { static now(){ return ++n; } };
      try{ for(let i=1;i<=7;i++) acRememberBleDevice({id:'d'+i, name:'D'+i}, 'volcano'); }
      finally{ globalThis.Date = Echt; }
    })()`);
    const k = a.get('PREFS').knownDevices;
    assertEq(k.length, 5, 'Liste gedeckelt');
    assertEq(k.map(d => d.id), ['d7', 'd6', 'd5', 'd4', 'd3'], 'neueste zuerst');
    assertEq(a.get('PREFS').lastDeviceId, 'd7', 'zuletzt genutztes Geraet');
  });

  t('acRememberBleDevice: erneutes Verbinden holt ein Geraet wieder nach vorn', () => {
    const a = use(fresh());
    a.run(`(()=>{
      const Echt = Date; let n = 1000;
      globalThis.Date = class extends Echt { static now(){ return ++n; } };
      try{
        for(let i=1;i<=5;i++) acRememberBleDevice({id:'d'+i, name:'D'+i}, 'volcano');
        acRememberBleDevice({id:'d1', name:'D1'}, 'volcano');   // aeltestes erneut genutzt
        acRememberBleDevice({id:'neu', name:'Neu'}, 'volcano');
      } finally{ globalThis.Date = Echt; }
    })()`);
    const k = a.get('PREFS').knownDevices.map(d => d.id);
    assertEq(k, ['neu', 'd1', 'd5', 'd4', 'd3'], 'd2 faellt raus, nicht das reaktivierte d1');
  });

  /* — Ein-Tipp-Knopf — */
  t('Ein-Tipp-Knopf oeffnet den Geraetedialog und blendet die Leiste aus', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), getDevices: false, requestResult: dev }));
    a.run('wire()');
    assertEq(await a.run('autoConnect()'), 'B');
    assertEq(a.document.getElementById('autoConnectBar').hidden, false);
    a.document.getElementById('btnAutoConnect').click();
    await a.run('new Promise(r=>setTimeout(r,0))');
    assertEq(a.bluetooth.requestDeviceCalls, 1, 'Geraetedialog geoeffnet');
    assertEq(a.document.getElementById('autoConnectBar').hidden, true, 'Leiste weg');
  });

  t('Manueller Connect merkt das Geraet und versteckt die Leiste', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), getDevices: false, requestResult: dev }));
    await a.run('autoConnect()');                      // -> Stufe B, Leiste sichtbar
    assertEq(a.document.getElementById('autoConnectBar').hidden, false);
    await a.run('connectBLE()');
    assertEq(a.get('State').connected, true);
    assertEq(a.get('PREFS').lastDeviceId, DEV_ID);
    assertEq(a.document.getElementById('autoConnectBar').hidden, true);
  });

  t('Abgebrochener Geraetedialog: kein Absturz, nicht verbunden', async () => {
    const a = use(fresh({ pref: prefKnown(), getDevices: false }));   // requestDevice wirft
    await a.run('connectBLE()');
    assertEq(a.get('State').connected, false);
    assertEq(a.get('PREFS').lastDeviceId, DEV_ID, 'altes Ziel bleibt unangetastet');
  });

  /* — Voller App-Start — */
  t('Voller App-Start (DOMContentLoaded) laeuft fehlerfrei und verbindet automatisch', async () => {
    const dev = makeVolcanoDevice();
    const a = use(loadApp({
      storage: { vol_prefs: prefKnown() },
      bluetooth: makeBluetooth({ devices: [dev] }),
    }));
    a.errors();                                   // Fehler frueherer Tests wegraeumen
    a.fireReady();                                // das ist der echte init()-Pfad
    // Der Boot staffelt seine Setups per setTimeout, die A11Y-Verdrahtung sitzt bei 1250 ms.
    await new Promise(r => setTimeout(r, 1500));
    const fehler = a.errors();
    assertEq(fehler.map(e => e.message), [], 'Boot-Listener werfen nichts');
    assertEq(a.get('State').connected, true, 'automatisch verbunden');
    assertEq(dev.connectCount, 1);
    assertEq(a.document.getElementById('autoConnectBar').hidden, true, 'kein Ein-Tipp-Knopf noetig');
    assertEq(a.run('_a11yWireToggleDescriptions()'), 0, 'Boot hat alle Schalter bereits verdrahtet');
    // aria-checked wird — wie bei allen anderen Schaltern auch — erst in openSettings()
    // aus PREFS gespiegelt, nicht beim Boot. Dafuer gibt es einen eigenen Test.
  }, { timeout: 30000 });

  /* — Zusammenspiel mit v9.33 Crash-Recovery — */
  t('Boot-Reihenfolge: autoConnect steht vor dem Crash-Recovery-Dialog', () => {
    const src = fs.readFileSync(INDEX_HTML, 'utf8');
    const ac = src.indexOf('try{ autoConnect(); }catch(_){}');
    const cr = src.indexOf('try{ _maybeRunRecovery(); }catch(_){}');
    assert(ac > 0, 'autoConnect()-Aufruf in boot() fehlt');
    assert(cr > 0, '_maybeRunRecovery()-Aufruf fehlt');
    assert(ac < cr, 'autoConnect() muss VOR _maybeRunRecovery() stehen');
  });

  t('Crash-Recovery-Dialog ist unveraendert vorhanden', () => {
    assertEq(typeof app.get('_maybeRunRecovery'), 'function');
    assert(app.document.getElementById('modalRunRecovery') || fs.readFileSync(INDEX_HTML, 'utf8').includes('vol_run_recovery'),
      'Crash-Recovery-Marker fehlt');
  });

  t('autoConnect blockiert boot() nicht (kein await im Aufruf)', () => {
    const src = fs.readFileSync(INDEX_HTML, 'utf8');
    assert(!src.includes('await autoConnect()'), 'autoConnect() darf boot() nicht blockieren');
  });

  /* — Versionsstand — */
  t('Versionsstand ist v9.43.0 in sw.js und index.html', () => {
    const sw = fs.readFileSync(INDEX_HTML.replace(/index\.html$/, 'sw.js'), 'utf8');
    assert(/const VERSION = 'v9\.43\.0'/.test(sw), 'sw.js nicht auf v9.43.0');
    const src = fs.readFileSync(INDEX_HTML, 'utf8');
    assert(src.includes(`SW_VERSION_LABEL='v9.43.0'`), 'SW_VERSION_LABEL nicht auf v9.43.0');
    assert(src.includes('Terp Sessions v9.43.0 bereit.'), 'Boot-Log nicht auf v9.43.0');
  });
}
