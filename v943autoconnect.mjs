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
function fresh({ pref, devices, getDevices, noBle, requestResult, extraStorage } = {}) {
  const bt = noBle ? null : makeBluetooth({
    devices: devices || [],
    getDevices: getDevices === false ? false : true,
    requestResult: requestResult || null,
  });
  const app = loadApp({
    noBle: !!noBle,
    bluetooth: bt || undefined,
    storage: Object.assign({}, pref ? { vol_prefs: pref } : {}, extraStorage || {}),
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
    assert(app.document.getElementById('autoConnectList'), '#autoConnectList fehlt');
    assert(app.document.getElementById('btnAutoConnectOther'), '#btnAutoConnectOther fehlt');
    assertEq(app.document.getElementById('btnAutoConnect'), null,
      'die Geräte-Knöpfe werden erst bei Bedarf gerendert');
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

  /* ═══ L1: Stufe B mit Namensfilter ═════════════════════ */

  t('Ein-Tipp-Knopf filtert den Dialog auf genau ein Geraet', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), getDevices: false, requestResult: dev }));
    a.run('wire()');
    await a.run('autoConnect()');
    a.document.getElementById('btnAutoConnect').click();
    await a.run('new Promise(r=>setTimeout(r,0))');
    const opt = a.bluetooth.lastRequestOptions;
    assertEq(opt.filters, [{ name: DEV_NAME }], 'genau ein Namensfilter');
    assertEq(opt.acceptAllDevices, undefined, 'kein acceptAllDevices im gefilterten Dialog');
    assert(Array.isArray(opt.optionalServices) && opt.optionalServices.length > 8,
      'optionalServices muessen mit, sonst scheitert getPrimaryService spaeter');
    assert(opt.optionalServices.includes('10100000-5354-4f52-5a26-4249434b454c'), 'Volcano-State-Service dabei');
  });

  t('Gefilterter Dialog verbindet danach wirklich', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), getDevices: false, requestResult: dev }));
    await a.run(`acConnectKnown(${JSON.stringify(DEV_NAME)})`);
    assertEq(a.get('State').connected, true);
    assertEq(a.document.getElementById('autoConnectBar').hidden, true);
  });

  t('"anderes Geraet" oeffnet weiterhin den offenen Dialog', async () => {
    const dev = makeVolcanoDevice({ id: 'anderes', name: 'VOLCANO ANDERS' });
    const a = use(fresh({ pref: prefKnown(), getDevices: false, requestResult: dev }));
    a.run('wire()');
    await a.run('autoConnect()');
    a.document.getElementById('btnAutoConnectOther').click();
    await a.run('new Promise(r=>setTimeout(r,0))');
    assertEq(a.bluetooth.lastRequestOptions.acceptAllDevices, true);
    assertEq(a.bluetooth.lastRequestOptions.filters, undefined);
  });

  t('Ohne gemerkten Namen faellt Stufe B auf den offenen Dialog zurueck', async () => {
    const a = use(fresh({ pref: prefKnown({ knownDevices: [{ id: DEV_ID, name: '', type: 'volcano', lastUsed: 1 }] }) }));
    await a.run(`acConnectKnown('')`);
    assertEq(a.bluetooth.lastRequestOptions.acceptAllDevices, true);
  });

  t('Abgelehnter gefilterter Dialog laesst das Ein-Tipp-Angebot stehen', async () => {
    const a = use(fresh({ pref: prefKnown(), getDevices: false }));   // requestDevice wirft
    await a.run(`acConnectKnown(${JSON.stringify(DEV_NAME)})`);
    assertEq(a.get('State').connected, false);
    assertEq(a.document.getElementById('autoConnectBar').hidden, false, 'Angebot bleibt');
    assertEq(a.document.getElementById('btnAutoConnect').textContent, DEV_NAME + ' verbinden');
  });

  /* ═══ L2: Timeout um gatt.connect ══════════════════════ */

  t('Haengendes gatt.connect laeuft in den Timeout statt ewig zu warten', async () => {
    const dev = makeVolcanoDevice({ hangConnect: true });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('acConnectTimeoutMs = () => 40;');     // echte 8 s waeren im Test sinnlos
    spyBackoff(a);
    const t0 = Date.now();
    assertEq(await a.run('autoConnect()'), 'B', 'faellt auf Stufe B zurueck');
    assert(Date.now() - t0 < 3000, 'kein Haenger: ' + (Date.now() - t0) + ' ms');
    assertEq(dev.connectCount, 3, 'drei Versuche, jeder mit eigenem Timeout');
    assertEq(a.get('State').connected, false);
  });

  t('Nach dem Timeout ist die App bedienbar: Ein-Tipp-Angebot steht, Chip ist sauber', async () => {
    const dev = makeVolcanoDevice({ hangConnect: true });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('acConnectTimeoutMs = () => 40;');
    spyBackoff(a);
    await a.run('autoConnect()');
    const doc = a.document;
    assertEq(doc.getElementById('autoConnectBar').hidden, false, 'Ein-Tipp-Angebot sichtbar');
    assertEq(doc.getElementById('btnAutoConnectCancel').hidden, true, 'Abbrechen wieder weg');
    assertEq(doc.getElementById('btnConnect').disabled, false, 'Verbinden-Knopf wieder bedienbar');
    assert(!doc.getElementById('connChip').textContent.includes('Verbinde automatisch'),
      'Chip haengt nicht in "Verbinde automatisch" fest, war: ' + doc.getElementById('connChip').textContent);
  });

  t('Der Timeout raeumt die halboffene GATT-Verbindung auf', async () => {
    const dev = makeVolcanoDevice({ hangConnect: true });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('acConnectTimeoutMs = () => 40;');
    spyBackoff(a);
    await a.run('autoConnect()');
    assertEq(dev.gatt.connected, false, 'kein halboffener GATT, der den naechsten Versuch blockiert');
  });

  t('acConnectTimeoutMs steht im Auslieferungszustand auf 8 Sekunden', () => {
    assertEq(app.run('acConnectTimeoutMs()'), 8000);
  });

  /* ═══ L7: Abbrechen am connChip ════════════════════════ */

  t('Waehrend der Auto-Verbindung zeigt der Chip das Zielgeraet + Abbrechen', async () => {
    const dev = makeVolcanoDevice({ hangConnect: true });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('acConnectTimeoutMs = () => 400;');
    const lauf = a.run('autoConnect()');
    await a.run('new Promise(r=>setTimeout(r,40))');
    assertEq(a.document.getElementById('connChip').textContent, 'Verbinde automatisch mit ' + DEV_NAME);
    assertEq(a.document.getElementById('btnAutoConnectCancel').hidden, false, 'Abbrechen sichtbar');
    a.run('acAbortAutoConnect()');
    assertEq(await lauf, 'abgebrochen');
  });

  t('Abbrechen stoppt die Wiederholungen', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 99 });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run(`(function(){ const echt = acBackoffMs; acBackoffMs = function(n){ echt(n); return 60; }; })();`);
    const lauf = a.run('autoConnect()');
    await a.run('new Promise(r=>setTimeout(r,10))');
    a.run('acAbortAutoConnect()');
    assertEq(await lauf, 'abgebrochen');
    assert(dev.connectCount < 3, 'nicht alle drei Versuche durchgezogen, waren: ' + dev.connectCount);
    assertEq(a.document.getElementById('btnAutoConnectCancel').hidden, true);
    assertEq(a.document.getElementById('autoConnectBar').hidden, false, 'Ein-Tipp-Angebot als Ausweg');
  });

  t('Abbruch waehrend eines erfolgreichen Versuchs trennt wieder', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    // Abbruch trifft ein, waehrend _connectWithDevice noch laeuft
    a.run(`(function(){ const echt = _connectWithDevice;
      _connectWithDevice = async function(d){ const p = echt(d); acAbortAutoConnect(); return p; }; })();`);
    assertEq(await a.run('autoConnect()'), 'abgebrochen');
    assertEq(a.get('State').connected, false, 'nicht gegen den Willen des Nutzers verbunden geblieben');
  });

  t('Der Abbrechen-Knopf ist im Auslieferungszustand versteckt und verdrahtet', () => {
    const a = use(fresh());
    const btn = a.document.getElementById('btnAutoConnectCancel');
    assert(btn, '#btnAutoConnectCancel fehlt');
    assertEq(btn.hidden, true);
    assertEq(btn.getAttribute('aria-label'), 'Automatische Verbindung abbrechen');
    a.run('wire()');
    a.run('State.autoConnectAbort = false');
    btn.click();
    assertEq(a.get('State').autoConnectAbort, true, 'Klick setzt die Abbruch-Marke');
  });

  /* ═══ L3: Heizer-Sicherheit ════════════════════════════ */

  /** Aktivitäts-Notify mit gesetztem Heiz-Bit (ACT_BITS.HEAT = 0x0020). */
  const heizBit = () => { const dv = new DataView(new ArrayBuffer(2)); dv.setUint16(0, 0x0020, true); return dv; };
  /** Zieltemperatur-Notify (×10 codiert, siehe parseTempU16LE). */
  const zielTemp = grad => { const dv = new DataView(new ArrayBuffer(2)); dv.setUint16(0, grad * 10, true); return dv; };

  t('Heizer an nach Auto-Connect: rote Warnkarte mit Zieltemperatur', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    assertEq(await a.run('autoConnect()'), 'A');
    // echter Weg: das Gerät meldet per Notify Heizer an + Ziel 195 Grad
    dev.chars.setTemp._emit(zielTemp(195));
    dev.chars.activity._emit(heizBit());
    assertEq(a.get('State').heater, true, 'Notify-Pfad hat den Heizerstatus gesetzt');
    assertEq(a.run('acCheckHeaterAfterConnect()'), true);
    const box = a.document.getElementById('acHeatWarn');
    assertEq(box.hidden, false, 'Warnkarte sichtbar');
    assertEq(box.getAttribute('role'), 'alert');
    const text = a.document.getElementById('acHeatWarnMsg').textContent;
    assert(text.includes('Heizer ist an'), 'Text: ' + text);
    assert(text.includes('195 Grad'), 'Zieltemperatur fehlt im Text: ' + text);
    assertEq(a.document.getElementById('btnAcHeatOff').hidden, false, 'verbunden -> abschaltbar');
  });

  t('Heizer aus nach Auto-Connect: keine Warnkarte', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    assertEq(a.run('acCheckHeaterAfterConnect()'), false);
    assertEq(a.document.getElementById('acHeatWarn').hidden, true);
  });

  t('Geraet ohne eigenen Auto-Aus bekommt sofort den Sicherheitstimer', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    a.run('State.adapter.constructor.capabilities.requiresAppSafetyTimer = true; State.heater = true; State.target = 180;');
    assertEq(a.run('!!State.safetyTimer'), false, 'vorher kein Timer');
    a.run('acCheckHeaterAfterConnect()');
    assertEq(a.run('!!State.safetyTimer'), true, 'Sicherheitstimer scharf');
    assert(a.run('State.safetyEndAt') > Date.now(), 'Ablaufzeitpunkt in der Zukunft');
  });

  t('Geraet mit eigenem Auto-Aus bekommt keinen erzwungenen Timer', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    assertEq(a.run('State.adapter.constructor.capabilities.requiresAppSafetyTimer'), false, 'Volcano hat BLE-Auto-Aus');
    a.run('State.heater = true; State.target = 180;');
    a.run('acCheckHeaterAfterConnect()');
    assertEq(a.run('!!State.safetyTimer'), false);
  });

  t('renderStatus schreibt den Heizerstatus mit', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    dev.chars.setTemp._emit(zielTemp(190));
    dev.chars.activity._emit(heizBit());          // loest renderStatus aus
    const snap = JSON.parse(a.localStorage.getItem('vol_last_heat_state'));
    assertEq(snap.heater, true);
    assertEq(snap.target, 190);
    assertEq(snap.device, DEV_NAME);
  });

  t('Der Heizerstatus wird nur bei Aenderung geschrieben, nicht im Sekundentakt', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    a.run('State.heater = true; State.target = 200;');
    assertEq(a.run('acPersistHeatState()'), true, 'erste Aenderung wird geschrieben');
    assertEq(a.run('acPersistHeatState()'), false, 'unveraenderter Stand nicht nochmal');
    assertEq(a.run('acPersistHeatState()'), false);
    a.run('State.target = 210;');
    assertEq(a.run('acPersistHeatState()'), true, 'echte Aenderung wieder');
  });

  t('Ohne Verbindung wird kein Heizerstatus geschrieben', () => {
    const a = use(fresh());
    a.run('State.heater = true; State.target = 200;');
    assertEq(a.run('acPersistHeatState()'), false);
    assertEq(a.localStorage.getItem('vol_last_heat_state'), null);
  });

  t('Gescheiterter Auto-Connect + zuletzt heiss: Status als unbekannt melden', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 99 });
    const a = use(fresh({
      pref: prefKnown(), devices: [dev],
      extraStorage: { vol_last_heat_state: { heater: true, target: 205, device: DEV_NAME, at: 1 } },
    }));
    spyBackoff(a);
    assertEq(await a.run('autoConnect()'), 'B');
    const box = a.document.getElementById('acHeatWarn');
    assertEq(box.hidden, false, 'Warnkarte sichtbar');
    const text = a.document.getElementById('acHeatWarnMsg').textContent;
    assert(text.includes('Heizer-Status unbekannt'), 'Text: ' + text);
    assert(text.includes('205 Grad'), 'letzter bekannter Zielwert fehlt: ' + text);
    assertEq(a.document.getElementById('btnAcHeatOff').hidden, true,
      'ohne Verbindung darf kein "Heizer aus" angeboten werden, das waere eine Luege');
  });

  t('Gescheiterter Auto-Connect + zuletzt kalt: keine Warnkarte', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 99 });
    const a = use(fresh({
      pref: prefKnown(), devices: [dev],
      extraStorage: { vol_last_heat_state: { heater: false, target: 205, device: DEV_NAME, at: 1 } },
    }));
    spyBackoff(a);
    await a.run('autoConnect()');
    assertEq(a.document.getElementById('acHeatWarn').hidden, true);
  });

  t('Ohne jede Heizhistorie keine Warnkarte', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 99 });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    spyBackoff(a);
    await a.run('autoConnect()');
    assertEq(a.document.getElementById('acHeatWarn').hidden, true);
  });

  t('"Verstanden" blendet die Heizer-Warnung aus', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('wire()');
    await a.run('autoConnect()');
    a.run('State.heater = true; State.target = 180; acCheckHeaterAfterConnect();');
    assertEq(a.document.getElementById('acHeatWarn').hidden, false);
    a.document.getElementById('btnAcHeatAck').click();
    assertEq(a.document.getElementById('acHeatWarn').hidden, true);
  });

  t('"Heizer aus" schickt den Abschaltbefehl und blendet aus', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('wire()');
    await a.run('autoConnect()');
    a.run('State.heater = true; State.target = 180; acCheckHeaterAfterConnect();');
    assertEq(dev.chars.heaterOff.writes.length, 0, 'vorher kein Schreibbefehl');
    a.document.getElementById('btnAcHeatOff').click();
    await a.run('new Promise(r=>setTimeout(r,20))');
    assertEq(dev.chars.heaterOff.writes.length, 1, 'genau ein Abschaltbefehl — vom Nutzer ausgelöst');
    assertEq(a.document.getElementById('acHeatWarn').hidden, true);
  });

  t('Ein neuer Auto-Connect raeumt die alte Warnung weg', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run(`$('#acHeatWarn').hidden = false;`);   // Warnung aus einer früheren Runde
    await a.run('autoConnect()');
    assertEq(a.document.getElementById('acHeatWarn').hidden, true);
  });

  /* ═══ L4: alle bekannten Geraete anbieten ══════════════ */

  // Bewusst unsortiert abgelegt: die Reihenfolge muss aus lastUsed kommen, nicht aus dem Speicher.
  const dreiGeraete = (extra = {}) => prefKnown(Object.assign({
    knownDevices: [
      { id: 'd-alt', name: 'VOLCANO KELLER', type: 'volcano', lastUsed: 100 },
      { id: DEV_ID, name: DEV_NAME, type: 'volcano', lastUsed: 300 },
      { id: 'd-mitte', name: 'MIGHTY UNTERWEGS', type: 'crafty_mighty', lastUsed: 200 },
    ],
  }, extra));

  t('Stufe B bietet alle bekannten Geraete an, zuletzt genutztes zuerst', async () => {
    const a = use(fresh({ pref: dreiGeraete(), getDevices: false }));
    assertEq(await a.run('autoConnect()'), 'B');
    const knoepfe = a.document.querySelectorAll('#autoConnectList button');
    assertEq(knoepfe.map(b => b.dataset.acName), [DEV_NAME, 'MIGHTY UNTERWEGS', 'VOLCANO KELLER'],
      'sortiert nach lastUsed absteigend');
    assertEq(knoepfe.map(b => b.textContent), [
      DEV_NAME + ' verbinden', 'MIGHTY UNTERWEGS verbinden', 'VOLCANO KELLER verbinden',
    ]);
  });

  t('Nur das zuletzt genutzte Geraet ist hervorgehoben', async () => {
    const a = use(fresh({ pref: dreiGeraete(), getDevices: false }));
    await a.run('autoConnect()');
    const knoepfe = a.document.querySelectorAll('#autoConnectList button');
    assertEq(knoepfe[0].id, 'btnAutoConnect', 'erster Knopf ist der stabile Hauptanker');
    assertEq(knoepfe[0].className, 'btn primary block', 'hervorgehoben');
    assertEq(knoepfe.slice(1).map(b => b.className), ['btn ghost sm block', 'btn ghost sm block']);
    assertEq(a.document.getElementById('autoConnectHint').hidden, false, 'Sortierhinweis bei mehreren');
  });

  t('Bei nur einem Geraet gibt es keinen Sortierhinweis', async () => {
    const a = use(fresh({ pref: prefKnown(), getDevices: false }));
    await a.run('autoConnect()');
    assertEq(a.document.querySelectorAll('#autoConnectList button').length, 1);
    assertEq(a.document.getElementById('autoConnectHint').hidden, true);
  });

  t('Jeder Geraete-Knopf verbindet mit genau seinem Geraet', async () => {
    const mighty = makeVolcanoDevice({ id: 'd-mitte', name: 'MIGHTY UNTERWEGS' });
    const a = use(fresh({ pref: dreiGeraete(), getDevices: false, requestResult: mighty }));
    await a.run('autoConnect()');
    const zweiter = a.document.querySelectorAll('#autoConnectList button')[1];
    zweiter.click();
    await a.run('new Promise(r=>setTimeout(r,0))');
    assertEq(a.bluetooth.lastRequestOptions.filters, [{ name: 'MIGHTY UNTERWEGS' }],
      'der zweite Knopf filtert auf das zweite Gerät, nicht auf das erste');
  });

  t('Das gescheiterte Auto-Connect-Ziel steht danach an erster Stelle', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 99 });
    const a = use(fresh({ pref: dreiGeraete(), devices: [dev] }));
    spyBackoff(a);
    assertEq(await a.run('autoConnect()'), 'B');
    const knoepfe = a.document.querySelectorAll('#autoConnectList button');
    assertEq(knoepfe[0].dataset.acName, DEV_NAME);
    assertEq(knoepfe.filter(b => b.dataset.acName === DEV_NAME).length, 1, 'nicht doppelt gelistet');
  });

  t('Hoechstens fuenf Knoepfe, auch bei mehr Eintraegen', async () => {
    const viele = prefKnown({
      knownDevices: [1, 2, 3, 4, 5, 6, 7].map(i => ({ id: 'd' + i, name: 'GERAET ' + i, type: 'volcano', lastUsed: i })),
    });
    const a = use(fresh({ pref: viele, getDevices: false }));
    await a.run('autoConnect()');
    assertEq(a.document.querySelectorAll('#autoConnectList button').length, 5);
  });

  /* ═══ L8: Einstellungen, Liste "Bekannte Geraete" ══════ */

  t('Die Geraeteliste zeigt Name, Typ und letzte Nutzung', () => {
    const a = use(fresh({ pref: dreiGeraete() }));
    assertEq(a.run('renderKnownDevices()'), 3);
    const zeilen = a.document.querySelectorAll('#knownDevicesList .known-device-row');
    assertEq(zeilen.length, 3);
    assertEq(zeilen.map(r => r.dataset.acId), [DEV_ID, 'd-mitte', 'd-alt'], 'lastUsed absteigend');
    assertEq(zeilen[0].querySelector('b').textContent, DEV_NAME);
    const meta = zeilen[1].querySelector('small').textContent;
    assert(meta.includes('Crafty / Mighty'), 'Typ fehlt: ' + meta);
    assert(meta.includes('zuletzt'), 'letzte Nutzung fehlt: ' + meta);
  });

  t('Das Auto-Connect-Ziel ist als solches markiert', () => {
    const a = use(fresh({ pref: dreiGeraete() }));
    a.run('renderKnownDevices()');
    const zeilen = a.document.querySelectorAll('#knownDevicesList .known-device-row');
    assertEq(zeilen[0].querySelector('.ac-auto-marker').textContent, '✓ wird automatisch verbunden');
    assertEq(zeilen[1].querySelector('.ac-auto-marker'), null, 'nur eines wird automatisch verbunden');
  });

  t('Bei ausgeschaltetem Schalter sagt die Markierung das dazu', () => {
    const a = use(fresh({ pref: dreiGeraete({ autoConnect: false }) }));
    a.run('renderKnownDevices()');
    const marke = a.document.querySelector('#knownDevicesList .ac-auto-marker').textContent;
    assert(marke.includes('Schalter ist aus'), 'Text: ' + marke);
  });

  t('Leere Liste erklaert sich selbst', () => {
    const a = use(fresh());
    assertEq(a.run('renderKnownDevices()'), 0);
    const text = a.document.getElementById('knownDevicesList').textContent;
    assert(text.includes('Noch kein Gerät gemerkt'), 'Text: ' + text);
  });

  t('Browser ohne getDevices bekommt den erklaerenden Hinweis', () => {
    const a = use(fresh({ pref: dreiGeraete(), getDevices: false }));
    a.run('renderKnownDevices()');
    const hint = a.document.getElementById('knownDevicesCapHint');
    assertEq(hint.hidden, false);
    assert(hint.textContent.includes('keine automatische Verbindung'), 'Text: ' + hint.textContent);
    assert(hint.textContent.includes('mit einem Tipp'), 'Text: ' + hint.textContent);
  });

  t('Browser mit getDevices bekommt keinen Hinweis', () => {
    const a = use(fresh({ pref: dreiGeraete() }));
    a.run('renderKnownDevices()');
    assertEq(a.document.getElementById('knownDevicesCapHint').hidden, true);
  });

  t('"vergessen" entfernt aus PREFS und ruft device.forget()', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: dreiGeraete(), devices: [dev] }));
    a.run('renderKnownDevices()');
    assertEq(await a.run(`acForgetDevice(${JSON.stringify(DEV_ID)})`), true, 'im Browser vergessen');
    assertEq(dev.forgotten, true, 'device.forget() aufgerufen');
    assertEq(a.get('PREFS').knownDevices.map(d => d.id), ['d-mitte', 'd-alt']);
    assertEq(a.get('PREFS').lastDeviceId, '', 'Auto-Connect-Ziel mitentfernt');
    assertEq(a.document.querySelectorAll('#knownDevicesList .known-device-row').length, 2, 'Liste neu gezeichnet');
  });

  t('"vergessen" ohne forget-Faehigkeit entfernt nur aus der App', async () => {
    const a = use(fresh({ pref: dreiGeraete(), getDevices: false }));
    a.run(`delete globalThis.BluetoothDevice;`);   // Browser ohne forget auf dem Prototyp
    a.run('renderKnownDevices()');
    assertEq(await a.run(`acForgetDevice('d-mitte')`), false, 'Browser-Berechtigung bleibt');
    assertEq(a.get('PREFS').knownDevices.map(d => d.id), [DEV_ID, 'd-alt']);
    const logText = a.document.getElementById('log').textContent;
    assert(logText.includes('Website-Einstellungen'),
      'Der Nutzer muss erfahren, wo die Berechtigung wirklich liegt. Log: ' + logText.slice(-200));
  });

  t('Ein anderes Geraet vergessen laesst das Auto-Ziel in Ruhe', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: dreiGeraete(), devices: [dev] }));
    await a.run(`acForgetDevice('d-alt')`);
    assertEq(a.get('PREFS').lastDeviceId, DEV_ID, 'Auto-Ziel unveraendert');
  });

  t('"vergessen" laesst die Liste sortiert zurueck', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: dreiGeraete(), devices: [dev] }));
    await a.run(`acForgetDevice('d-mitte')`);
    assertEq(a.get('PREFS').knownDevices.map(d => d.lastUsed), [300, 100],
      'gleiche Invariante wie nach acUpsertDevice: lastUsed absteigend');
  });

  t('openSettings zeichnet die Geraeteliste', () => {
    const a = use(fresh({ pref: dreiGeraete() }));
    assertEq(a.document.querySelectorAll('#knownDevicesList .known-device-row').length, 0, 'vorher leer');
    a.run('openSettings()');
    assertEq(a.document.querySelectorAll('#knownDevicesList .known-device-row').length, 3);
  });

  /* ═══ L5: State.userDisconnected ═══════════════════════ */

  t('Manuelles Trennen setzt userDisconnected', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    assertEq(a.get('State').userDisconnected, false, 'nach dem Verbinden nicht gesetzt');
    await a.run('disconnectBLE()');
    assertEq(a.get('State').userDisconnected, true);
  });

  t('Erfolgreicher Connect hebt die Sperre wieder auf', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), getDevices: false, requestResult: dev }));
    a.run('State.userDisconnected = true;');
    await a.run('connectBLE()');
    assertEq(a.get('State').connected, true);
    assertEq(a.get('State').userDisconnected, false);
  });

  t('Abbrechen der Auto-Verbindung setzt userDisconnected ebenfalls', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 99 });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run(`(function(){ const echt = acBackoffMs; acBackoffMs = function(n){ echt(n); return 60; }; })();`);
    const lauf = a.run('autoConnect()');
    await a.run('new Promise(r=>setTimeout(r,10))');
    a.run('acAbortAutoConnect()');
    await lauf;
    assertEq(a.get('State').userDisconnected, true);
  });

  t('tryReconnect steigt bei manuell getrennter Verbindung sofort aus', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    a.run('State.connected = false; State.userDisconnected = true;');
    await a.run('tryReconnect()');
    assertEq(dev.connectCount, 1, 'kein zweiter Verbindungsversuch');
    assertEq(a.get('State').reconnectAttempts, 0, 'nicht mal ein Versuch gezaehlt');
  });

  t('Verbindungsabbruch loest von allein einen Reconnect aus', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('acBackoffMs = () => 10;');
    await a.run('autoConnect()');
    assertEq(dev.connectCount, 1);
    dev.gatt.disconnect();                       // Gerät fliegt raus
    await a.run('new Promise(r=>setTimeout(r,120))');
    assertEq(dev.connectCount, 2, 'automatisch wieder verbunden');
    assertEq(a.get('State').connected, true);
  });

  t('Nach manuellem Trennen gibt es keinen heimlichen Reconnect', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('acBackoffMs = () => 10;');
    await a.run('autoConnect()');
    await a.run('disconnectBLE()');
    await a.run('new Promise(r=>setTimeout(r,120))');
    assertEq(dev.connectCount, 1, 'kein Reconnect gegen den Willen des Nutzers');
    assertEq(a.get('State').connected, false);
  });

  /* ═══ L6: Reconnect auch im Leerlauf ═══════════════════ */

  t('acIdleReconnect verweigert bei ausgeschaltetem Schalter', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    a.run('State.connected = false; PREFS.autoConnect = false;');
    assertEq(a.run(`acIdleReconnect('test')`), 'schalter-aus');
    assertEq(dev.connectCount, 1);
  });

  t('acIdleReconnect verweigert nach manuellem Trennen', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    a.run('State.connected = false; State.userDisconnected = true;');
    assertEq(a.run(`acIdleReconnect('test')`), 'manuell-getrennt');
  });

  t('acIdleReconnect tut nichts, wenn schon verbunden oder kein Geraet da ist', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    await a.run('autoConnect()');
    assertEq(a.run(`acIdleReconnect('test')`), 'verbunden');
    const b = use(fresh({ pref: prefKnown() }));
    b.run('PREFS.autoConnect = true;');
    assertEq(b.run(`acIdleReconnect('test')`), 'kein-geraet');
  });

  t('acIdleReconnect ist auf einen Versuch je 10 Sekunden gedrosselt', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('acBackoffMs = () => 10;');
    await a.run('autoConnect()');
    a.run('State.connected = false; State.device.gatt.connected = false;');
    assertEq(a.run(`acIdleReconnect('erster')`), 'versucht');
    assertEq(a.run(`acIdleReconnect('zweiter')`), 'gedrosselt');
    assertEq(a.run(`acIdleReconnect('dritter')`), 'gedrosselt');
    assertEq(a.run('AC_IDLE_RECONNECT_THROTTLE_MS'), 10000);
  });

  t('Tab wieder sichtbar stoesst einen Reconnect an', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('acBackoffMs = () => 10;');
    await a.run('autoConnect()');
    // stille Trennung: die App hat das Ereignis im Hintergrund nie gesehen
    a.run('State.connected = false; State.device.gatt.connected = false;');
    a.document.visibilityState = 'visible';
    a.document.dispatchEvent({ type: 'visibilitychange' });
    await a.run('new Promise(r=>setTimeout(r,120))');
    assertEq(dev.connectCount, 2, 'beim Zurueckkehren neu verbunden');
    assertEq(a.get('State').connected, true);
  });

  t('Ein in den Hintergrund gehender Tab loest nichts aus', async () => {
    const dev = makeVolcanoDevice();
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    a.run('acBackoffMs = () => 10;');
    await a.run('autoConnect()');
    a.run('State.connected = false; State.device.gatt.connected = false;');
    a.document.visibilityState = 'hidden';
    a.document.dispatchEvent({ type: 'visibilitychange' });
    await a.run('new Promise(r=>setTimeout(r,60))');
    assertEq(dev.connectCount, 1);
  });

  t('Waehrend eines Auto-Connects laeuft keine zweite Reconnect-Kette', async () => {
    // Regression: der Leerlauf-Reconnect startete parallel zu autoConnect eine eigene
    // Verbindungskette. Zwei Schleifen verbanden um die Wette, beide Backoffs wurden sinnlos.
    const dev = makeVolcanoDevice({ failNextConnects: 2 });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    const delays = spyBackoff(a);
    assertEq(await a.run('autoConnect()'), 'A');
    assertEq(dev.connectCount, 3, 'genau drei Versuche, keine zweite Kette daneben');
    assertEq(delays(), [1000, 2000], 'nur der Backoff von autoConnect selbst');
    assertEq(a.get('State').autoConnectRunning, false, 'Sperre danach wieder aufgehoben');
  });

  t('acIdleReconnect haelt sich zurueck, solange autoConnect laeuft', () => {
    const a = use(fresh({ pref: prefKnown() }));
    a.run('State.autoConnectRunning = true; State.device = { name:"x" };');
    assertEq(a.run(`acIdleReconnect('test')`), 'auto-connect-laeuft');
  });

  t('Die Sperre faellt auch, wenn der Auto-Connect scheitert', async () => {
    const dev = makeVolcanoDevice({ failNextConnects: 99 });
    const a = use(fresh({ pref: prefKnown(), devices: [dev] }));
    spyBackoff(a);
    await a.run('autoConnect()');
    assertEq(a.get('State').autoConnectRunning, false);
  });

  t('Der Reconnect-Backoff nutzt die Tabelle 1s/2s/4s', () => {
    const src = fs.readFileSync(INDEX_HTML, 'utf8');
    assert(!/setTimeout\(tryReconnect,\s*800\)/.test(src), 'starre 800 ms sind raus');
    assert(!/setTimeout\(tryReconnect,\s*2000\)/.test(src), 'starre 2000 ms sind raus');
    assert(/setTimeout\(tryReconnect,\s*acBackoffMs\(/.test(src), 'Backoff-Tabelle wird benutzt');
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
