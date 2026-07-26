/* ═══════════════════════════════════════════════════════════════════════════
   test-kit.mjs — Test-Fundament fuer Terp Sessions (ab v9.43.0)

   HINTERGRUND: Die urspruengliche Puppeteer-Suite (24 Suiten, nur lokal,
   nie committet) ist verloren. Ersatz ist bewusst leichtgewichtig:
   KEIN Puppeteer, KEIN Headless-Chrome. Stattdessen wird das Inline-JS aus
   index.html extrahiert und in einem node:vm-Kontext mit gemocktem document,
   navigator.bluetooth und localStorage ausgefuehrt.

   Damit laufen die ECHTEN Funktionen der App (connectBLE, autoConnect, log,
   setConn, detectDevice, ...) — keine Nachbauten. Das DOM wird aus der echten
   index.html geparst, d.h. jede ID/Klasse/ARIA-Struktur im Test entspricht
   exakt dem Markup, das der Nutzer sieht.

   Fallstricke, die hier bewusst adressiert sind:
   - log() macht `while(el.children.length>5) el.removeChild(el.firstChild)`.
     Ohne echtes firstChild/lastChild laeuft das ab der 6. Zeile endlos.
     -> El.firstChild/lastChild sind echte Getter ueber childNodes.
   - Timer halten den Node-Prozess am Leben -> alle Timer werden ge-unref-t.
   - setConn() greift ungeschuetzt auf $('#dot'), $('#connChip'), $('#btnConnect')
     zu -> das DOM muss aus dem echten Markup kommen, Stub-Fabriken reichen nicht.
═══════════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const INDEX_HTML = path.join(HERE, 'index.html');

/* ═══════════════════════════════════════════════════════════════
   1. MINIMALER HTML-PARSER  ->  echter Knotenbaum
═══════════════════════════════════════════════════════════════ */

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW_TAGS = new Set(['script', 'style']);

let _mutationTick = 0;

class TextNode {
  constructor(text) { this.nodeType = 3; this.data = String(text); this.parentNode = null; }
  get textContent() { return this.data; }
  set textContent(v) { this.data = String(v); }
  get childNodes() { return []; }
  get children() { return []; }
}

class El {
  constructor(tag) {
    this.nodeType = 1;
    this.tagName = String(tag).toUpperCase();
    this.localName = String(tag).toLowerCase();
    this.attrs = new Map();
    this.childNodes = [];
    this.parentNode = null;
    this.style = makeStyle();
    this._listeners = new Map();
    this.scrollTop = 0; this.scrollLeft = 0;
    this.scrollHeight = 0; this.scrollWidth = 0;
    this.clientHeight = 0; this.clientWidth = 0;
    this.offsetHeight = 0; this.offsetWidth = 0;
    this.ownerDocument = null;
    this._dataset = null;
  }

  /* ── Baum ───────────────────────────────────────────────── */
  get children() { return this.childNodes.filter(n => n.nodeType === 1); }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  get firstElementChild() { return this.children[0] || null; }
  get lastElementChild() { const c = this.children; return c[c.length - 1] || null; }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; }
  get nextSibling() {
    const p = this.parentNode; if (!p) return null;
    return p.childNodes[p.childNodes.indexOf(this) + 1] || null;
  }
  get previousSibling() {
    const p = this.parentNode; if (!p) return null;
    const i = p.childNodes.indexOf(this);
    return i > 0 ? p.childNodes[i - 1] : null;
  }
  get nextElementSibling() {
    let n = this.nextSibling; while (n && n.nodeType !== 1) n = n.nextSibling; return n || null;
  }

  appendChild(node) {
    if (!node) return node;
    if (node._isFragment) { node.childNodes.slice().forEach(c => this.appendChild(c)); return node; }
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    _mutationTick++;
    return node;
  }
  append(...nodes) { nodes.forEach(n => this.appendChild(typeof n === 'string' ? new TextNode(n) : n)); }
  prepend(...nodes) {
    nodes.slice().reverse().forEach(n => this.insertBefore(typeof n === 'string' ? new TextNode(n) : n, this.firstChild));
  }
  removeChild(node) {
    const i = this.childNodes.indexOf(node);
    if (i < 0) return node;
    this.childNodes.splice(i, 1);
    node.parentNode = null;
    _mutationTick++;
    return node;
  }
  insertBefore(node, ref) {
    if (!ref) return this.appendChild(node);
    const i = this.childNodes.indexOf(ref);
    if (i < 0) return this.appendChild(node);
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.splice(i, 0, node);
    _mutationTick++;
    return node;
  }
  replaceChild(neu, alt) { this.insertBefore(neu, alt); this.removeChild(alt); return alt; }
  replaceChildren(...nodes) { this.childNodes.slice().forEach(c => this.removeChild(c)); this.append(...nodes); }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  cloneNode(deep) {
    const c = new El(this.localName);
    this.attrs.forEach((v, k) => c.attrs.set(k, v));
    c.ownerDocument = this.ownerDocument;
    if (deep) this.childNodes.forEach(n => c.appendChild(n.nodeType === 3 ? new TextNode(n.data) : n.cloneNode(true)));
    return c;
  }
  contains(node) {
    for (let n = node; n; n = n.parentNode) if (n === this) return true;
    return false;
  }

  /* ── Attribute ──────────────────────────────────────────── */
  getAttribute(n) { const v = this.attrs.get(String(n).toLowerCase()); return v === undefined ? null : v; }
  setAttribute(n, v) { this.attrs.set(String(n).toLowerCase(), String(v)); _mutationTick++; }
  removeAttribute(n) { this.attrs.delete(String(n).toLowerCase()); _mutationTick++; }
  hasAttribute(n) { return this.attrs.has(String(n).toLowerCase()); }
  get attributes() { return Array.from(this.attrs, ([name, value]) => ({ name, value })); }

  get id() { return this.getAttribute('id') || ''; }
  set id(v) { this.setAttribute('id', v); }
  get className() { return this.getAttribute('class') || ''; }
  set className(v) { this.setAttribute('class', v); }
  get value() { return this._value !== undefined ? this._value : (this.getAttribute('value') || ''); }
  set value(v) { this._value = String(v); }
  get checked() { return this._checked !== undefined ? this._checked : this.hasAttribute('checked'); }
  set checked(v) { this._checked = !!v; }
  get disabled() { return this._disabled !== undefined ? this._disabled : this.hasAttribute('disabled'); }
  set disabled(v) { this._disabled = !!v; if (v) this.setAttribute('disabled', ''); else this.removeAttribute('disabled'); }
  get hidden() { return this.hasAttribute('hidden'); }
  set hidden(v) { if (v) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }
  get type() { return this.getAttribute('type') || ''; }
  set type(v) { this.setAttribute('type', v); }
  get href() { return this.getAttribute('href') || ''; }
  set href(v) { this.setAttribute('href', v); }
  get src() { return this.getAttribute('src') || ''; }
  set src(v) { this.setAttribute('src', v); }
  get open() { return this.hasAttribute('open'); }
  set open(v) { if (v) this.setAttribute('open', ''); else this.removeAttribute('open'); }

  get dataset() {
    if (this._dataset) return this._dataset;
    const el = this;
    this._dataset = new Proxy({}, {
      get(_, prop) {
        if (typeof prop !== 'string') return undefined;
        return el.getAttribute('data-' + camelToDash(prop)) ?? undefined;
      },
      set(_, prop, v) { el.setAttribute('data-' + camelToDash(String(prop)), v); return true; },
      has(_, prop) { return el.hasAttribute('data-' + camelToDash(String(prop))); },
      deleteProperty(_, prop) { el.removeAttribute('data-' + camelToDash(String(prop))); return true; },
      ownKeys() {
        return Array.from(el.attrs.keys()).filter(k => k.startsWith('data-')).map(k => dashToCamel(k.slice(5)));
      },
      getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
    });
    return this._dataset;
  }

  get classList() {
    const el = this;
    const list = () => (el.className || '').split(/\s+/).filter(Boolean);
    const write = arr => { el.className = arr.join(' '); };
    return {
      get length() { return list().length; },
      contains: c => list().includes(c),
      add: (...cs) => { const a = list(); cs.forEach(c => { if (c && !a.includes(c)) a.push(c); }); write(a); },
      remove: (...cs) => write(list().filter(c => !cs.includes(c))),
      toggle: (c, force) => {
        const has = list().includes(c);
        const on = force === undefined ? !has : !!force;
        if (on) { const a = list(); if (!a.includes(c)) a.push(c); write(a); }
        else write(list().filter(x => x !== c));
        return on;
      },
      item: i => list()[i] || null,
      toString: () => el.className,
    };
  }

  /* ── Inhalt ─────────────────────────────────────────────── */
  get textContent() { return this.childNodes.map(n => n.textContent).join(''); }
  set textContent(v) {
    this.childNodes.slice().forEach(c => this.removeChild(c));
    if (v !== '' && v != null) this.appendChild(new TextNode(v));
  }
  get innerText() { return this.textContent; }
  set innerText(v) { this.textContent = v; }
  get innerHTML() { return this.childNodes.map(serializeNode).join(''); }
  set innerHTML(html) {
    this.childNodes.slice().forEach(c => this.removeChild(c));
    if (html == null || html === '') { _mutationTick++; return; }
    parseInto(String(html), this);
    _mutationTick++;
  }
  get outerHTML() { return serializeNode(this); }
  insertAdjacentHTML(pos, html) {
    const frag = new El('div');
    parseInto(String(html), frag);
    const kids = frag.childNodes.slice();
    if (pos === 'beforeend') kids.forEach(k => this.appendChild(k));
    else if (pos === 'afterbegin') kids.reverse().forEach(k => this.insertBefore(k, this.firstChild));
    else if (pos === 'beforebegin' && this.parentNode) kids.forEach(k => this.parentNode.insertBefore(k, this));
    else if (pos === 'afterend' && this.parentNode) kids.reverse().forEach(k => this.parentNode.insertBefore(k, this.nextSibling));
  }

  /* ── Selektoren ─────────────────────────────────────────── */
  querySelector(sel) { return queryAll(this, sel, true)[0] || null; }
  querySelectorAll(sel) { return queryAll(this, sel, false); }
  matches(sel) { return selectorMatches(this, sel); }
  closest(sel) {
    for (let n = this; n && n.nodeType === 1; n = n.parentNode) if (selectorMatches(n, sel)) return n;
    return null;
  }

  /* ── Events / UI ────────────────────────────────────────── */
  addEventListener(type, fn) {
    if (typeof fn !== 'function') return;
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    const a = this._listeners.get(type); if (!a) return;
    const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
  }
  dispatchEvent(evt) {
    if (typeof evt === 'string') evt = { type: evt, bubbles: true };
    evt.target = evt.target || this;
    let node = this;
    while (node) {
      evt.currentTarget = node;
      const a = node._listeners && node._listeners.get(evt.type);
      if (a) a.slice().forEach(fn => { try { fn.call(node, evt); } catch (e) { pushError(e); } });
      if (!evt.bubbles || evt._stopped) break;
      node = node.parentNode;
    }
    return !evt.defaultPrevented;
  }
  click() {
    this.dispatchEvent({
      type: 'click', bubbles: true, target: this,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this._stopped = true; },
    });
  }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; this.dispatchEvent({ type: 'focus', target: this }); }
  blur() { if (this.ownerDocument && this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null; }
  scrollIntoView() { }
  getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }; }
  animate() { return { finished: Promise.resolve(), cancel() { } }; }
  setSelectionRange() { }
  select() { }
}

function makeStyle() {
  const s = {
    setProperty(k, v) { s[dashToCamel(k)] = v; },
    getPropertyValue(k) { return s[dashToCamel(k)] || ''; },
    removeProperty(k) { delete s[dashToCamel(k)]; },
  };
  return s;
}
const dashToCamel = s => String(s).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const camelToDash = s => String(s).replace(/[A-Z]/g, c => '-' + c.toLowerCase());

function serializeNode(n) {
  if (n.nodeType === 3) return n.data;
  const attrs = Array.from(n.attrs, ([k, v]) => ` ${k}="${v}"`).join('');
  if (VOID_TAGS.has(n.localName)) return `<${n.localName}${attrs}>`;
  return `<${n.localName}${attrs}>${n.childNodes.map(serializeNode).join('')}</${n.localName}>`;
}

const ATTR_RE = /([a-zA-Z_:@\-.0-9]+)(\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttrs(str, el) {
  if (!str) return;
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(str))) {
    const name = m[1].toLowerCase();
    const val = m[3] ?? m[4] ?? m[5] ?? '';
    if (!el.attrs.has(name)) el.attrs.set(name, val);
  }
}

/** Parst HTML in `root`. Bewusst tolerant: unbekannte/ungeschlossene Tags
 *  werden nicht als Fehler behandelt, Whitespace-only-Text wird verworfen
 *  (sonst waeren firstChild-Schleifen wie in log() nicht mehr aequivalent). */
export function parseInto(html, root) {
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype[^>]*>|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/gi;
  let last = 0, m;
  while ((m = re.exec(html))) {
    const text = html.slice(last, m.index);
    if (text && text.trim()) stack[stack.length - 1].appendChild(new TextNode(text));
    last = re.lastIndex;
    const raw = m[0];
    if (raw.startsWith('<!')) continue;
    if (m[1]) {                       // Closing tag
      const name = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].localName === name) { stack.length = i; break; }
      }
      continue;
    }
    const name = m[2].toLowerCase();
    const el = new El(name);
    el.ownerDocument = root.ownerDocument || null;
    parseAttrs(m[3], el);
    stack[stack.length - 1].appendChild(el);
    if (RAW_TAGS.has(name)) {         // Inhalt roh ueberspringen
      const close = new RegExp('</' + name + '\\s*>', 'i');
      close.lastIndex = re.lastIndex;
      const rest = html.slice(re.lastIndex);
      const cm = rest.match(close);
      if (cm) { re.lastIndex = last = re.lastIndex + cm.index + cm[0].length; continue; }
    }
    if (!VOID_TAGS.has(name) && !m[4]) stack.push(el);
  }
  const tail = html.slice(last);
  if (tail && tail.trim()) stack[stack.length - 1].appendChild(new TextNode(tail));
  return root;
}

/* ═══════════════════════════════════════════════════════════════
   2. SELEKTOR-ENGINE (Teilmenge von CSS, ausreichend fuer die App)
      Unterstuetzt: tag, #id, .class, [attr], [attr=v], [attr^=v],
      [attr*=v], :not(simple), Nachfahren (Space) und Kind (>),
      sowie Listen mit Komma.
═══════════════════════════════════════════════════════════════ */

const _selCache = new Map();

function parseSelector(sel) {
  if (_selCache.has(sel)) return _selCache.get(sel);
  const groups = splitTop(sel, ',').map(part => {
    const seq = [];
    const chunks = part.trim().split(/\s*(>)\s*|\s+/).filter(Boolean);
    let combinator = ' ';
    for (const ch of chunks) {
      if (ch === '>') { combinator = '>'; continue; }
      seq.push({ combinator, comp: parseCompound(ch) });
      combinator = ' ';
    }
    return seq;
  }).filter(g => g.length);
  _selCache.set(sel, groups);
  return groups;
}

function splitTop(str, sep) {
  const out = []; let depth = 0, cur = '';
  for (const c of str) {
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (c === sep && depth === 0) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim()).filter(Boolean);
}

const COMP_SRC = /(\*)|^([a-zA-Z][\w-]*)|#([\w\-:.]+)|\.([\w-]+)|\[([^\]]*)\]|:not\(([^)]*)\)|(:{1,2}[\w-]+(?:\([^)]*\))?)/;

/* Das Regex wird PRO AUFRUF neu gebaut, nicht modulweit geteilt: parseCompound
   ruft sich fuer :not(...) selbst auf, und ein geteiltes /g-Regex verliert dabei
   seinen lastIndex. Die aeussere Schleife faengt dann von vorn an, schiebt bei
   jedem Durchlauf denselben :not-Teil nach — bis der Heap voll ist.
   Genau das ist beim Bau dieser Suite passiert (_a11yAutoLabel benutzt
   'input:not([aria-label]):not([aria-labelledby])'). */
function parseCompound(str) {
  const comp = { tag: null, id: null, classes: [], attrs: [], nots: [] };
  const COMP_RE = new RegExp(COMP_SRC.source, 'g');
  let m;
  while ((m = COMP_RE.exec(str))) {
    if (m[0] === '') { COMP_RE.lastIndex++; continue; }   // Nulllaengen-Treffer nie ohne Fortschritt
    if (m[2]) comp.tag = m[2].toUpperCase();
    else if (m[3]) comp.id = m[3];
    else if (m[4]) comp.classes.push(m[4]);
    else if (m[5]) comp.attrs.push(parseAttrSel(m[5]));
    else if (m[6]) comp.nots.push(parseCompound(m[6]));
    /* m[1] '*' und m[7] (sonstige Pseudos) matchen alles */
  }
  return comp;
}

function parseAttrSel(body) {
  const m = body.match(/^([^\s~^$*|=]+)\s*(?:([~^$*|]?=)\s*(?:"([^"]*)"|'([^']*)'|(.*?))\s*)?$/);
  if (!m) return { name: body, op: null, val: null };
  return { name: m[1].toLowerCase(), op: m[2] || null, val: (m[3] ?? m[4] ?? m[5] ?? '') };
}

function matchCompound(el, comp) {
  if (el.nodeType !== 1) return false;
  if (comp.tag && el.tagName !== comp.tag) return false;
  if (comp.id && el.id !== comp.id) return false;
  for (const c of comp.classes) if (!el.classList.contains(c)) return false;
  for (const a of comp.attrs) {
    const v = el.getAttribute(a.name);
    if (v === null) return false;
    if (!a.op) continue;
    if (a.op === '=' && v !== a.val) return false;
    if (a.op === '^=' && !v.startsWith(a.val)) return false;
    if (a.op === '$=' && !v.endsWith(a.val)) return false;
    if (a.op === '*=' && !v.includes(a.val)) return false;
    if (a.op === '~=' && !v.split(/\s+/).includes(a.val)) return false;
  }
  for (const n of comp.nots) if (matchCompound(el, n)) return false;
  return true;
}

function matchSeq(el, seq) {
  let i = seq.length - 1;
  if (!matchCompound(el, seq[i].comp)) return false;
  let node = el.parentNode;
  for (i--; i >= 0; i--) {
    const { combinator } = seq[i + 1];
    if (combinator === '>') {
      if (!node || !matchCompound(node, seq[i].comp)) return false;
      node = node.parentNode;
    } else {
      let found = null;
      for (let n = node; n && n.nodeType === 1; n = n.parentNode) {
        if (matchCompound(n, seq[i].comp)) { found = n; break; }
      }
      if (!found) return false;
      node = found.parentNode;
    }
  }
  return true;
}

export function selectorMatches(el, sel) {
  try { return parseSelector(sel).some(seq => matchSeq(el, seq)); }
  catch { return false; }
}

function walk(root, fn) {
  for (const c of root.childNodes) {
    if (c.nodeType === 1) { if (fn(c) === false) return false; if (walk(c, fn) === false) return false; }
  }
  return true;
}

function queryAll(root, sel, firstOnly) {
  const groups = parseSelector(sel);
  const out = [];
  walk(root, el => {
    if (groups.some(seq => matchSeq(el, seq))) {
      out.push(el);
      if (firstOnly) return false;
    }
    return true;
  });
  return out;
}

/* ═══════════════════════════════════════════════════════════════
   3. FEHLERSAMMLER (Listener-Fehler gehen sonst still verloren)
═══════════════════════════════════════════════════════════════ */
let _errors = [];
function pushError(e) { _errors.push(e); }
export function takeErrors() { const e = _errors; _errors = []; return e; }

/* ═══════════════════════════════════════════════════════════════
   4. MOCK: localStorage / sessionStorage
═══════════════════════════════════════════════════════════════ */
export function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  return {
    get length() { return map.size; },
    key: i => Array.from(map.keys())[i] ?? null,
    getItem: k => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: k => { map.delete(String(k)); },
    clear: () => map.clear(),
    _map: map,
  };
}

/* ═══════════════════════════════════════════════════════════════
   5. MOCK: Web Bluetooth / GATT
═══════════════════════════════════════════════════════════════ */

const U = {
  svcState: '10100000-5354-4f52-5a26-4249434b454c',
  svcControl: '10110000-5354-4f52-5a26-4249434b454c',
  setTemp: '10110003-5354-4f52-5a26-4249434b454c',
  curTemp: '10110001-5354-4f52-5a26-4249434b454c',
  activity: '1010000c-5354-4f52-5a26-4249434b454c',
  heaterOn: '1011000f-5354-4f52-5a26-4249434b454c',
  heaterOff: '10110010-5354-4f52-5a26-4249434b454c',
  pumpOn: '10110013-5354-4f52-5a26-4249434b454c',
  pumpOff: '10110014-5354-4f52-5a26-4249434b454c',
};
export const UUIDS = U;

function makeChar(uuid, props = {}) {
  const listeners = [];
  const ch = {
    uuid,
    properties: Object.assign({ read: true, write: true, writeWithoutResponse: false, notify: true, indicate: false }, props),
    value: new DataView(new ArrayBuffer(2)),
    writes: [],
    notifying: false,
    async readValue() { return ch.value; },
    async writeValue(v) { ch.writes.push(v); return undefined; },
    async writeValueWithoutResponse(v) { ch.writes.push(v); return undefined; },
    async startNotifications() { ch.notifying = true; return ch; },
    async stopNotifications() { ch.notifying = false; return ch; },
    addEventListener(t, fn) { if (t === 'characteristicvaluechanged') listeners.push(fn); },
    removeEventListener(t, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    /** Test-Helfer: Notify simulieren */
    _emit(dataView) { ch.value = dataView; listeners.forEach(fn => fn({ target: ch })); },
  };
  return ch;
}

function makeService(uuid, chars) {
  return {
    uuid,
    async getCharacteristic(u) {
      const c = chars.find(x => x.uuid.toLowerCase() === String(u).toLowerCase());
      if (!c) throw new Error('No Characteristic ' + u);
      return c;
    },
    async getCharacteristics() { return chars.slice(); },
  };
}

/** Vollstaendiger Volcano-Hybrid-Mock: reicht fuer detectDevice + bindAllChars
 *  + startAllNotifications, d.h. der echte Connect-Pfad laeuft komplett durch. */
export function makeVolcanoDevice(opts = {}) {
  const id = opts.id || 'mock-volcano-1';
  const name = opts.name || 'VOLCANO 12345';
  const chars = {
    setTemp: makeChar(U.setTemp), curTemp: makeChar(U.curTemp), activity: makeChar(U.activity),
    heaterOn: makeChar(U.heaterOn, { notify: false }), heaterOff: makeChar(U.heaterOff, { notify: false }),
    pumpOn: makeChar(U.pumpOn, { notify: false }), pumpOff: makeChar(U.pumpOff, { notify: false }),
  };
  const services = [
    makeService(U.svcState, [chars.curTemp, chars.activity]),
    makeService(U.svcControl, [chars.setTemp, chars.heaterOn, chars.heaterOff, chars.pumpOn, chars.pumpOff]),
  ];
  const listeners = new Map();
  const dev = {
    id, name, chars, services,
    connectCount: 0,
    failNextConnects: opts.failNextConnects || 0,
    hangConnect: !!opts.hangConnect,
    forgotten: false,
    watchedAds: 0,
    gatt: {
      connected: false,
      async connect() {
        dev.connectCount++;
        // hangConnect simuliert ein Geraet, das den Verbindungsaufbau nie beantwortet
        // (ausser Reichweite, verklemmter BLE-Stack). Ohne Timeout haengt der Aufrufer ewig.
        if (dev.hangConnect) return new Promise(() => { });
        if (dev.failNextConnects > 0) { dev.failNextConnects--; throw new Error('GATT Error: connect failed (mock)'); }
        dev.gatt.connected = true;
        return {
          device: dev,
          get connected() { return dev.gatt.connected; },
          async getPrimaryServices() { return services.slice(); },
          async getPrimaryService(u) {
            const s = services.find(x => x.uuid.toLowerCase() === String(u).toLowerCase());
            if (!s) throw new Error('No Service ' + u);
            return s;
          },
          disconnect() { dev.gatt.connected = false; dev._fire('gattserverdisconnected'); },
        };
      },
      disconnect() { dev.gatt.connected = false; dev._fire('gattserverdisconnected'); },
    },
    addEventListener(t, fn) { if (!listeners.has(t)) listeners.set(t, []); listeners.get(t).push(fn); },
    removeEventListener(t, fn) { const a = listeners.get(t) || []; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); },
    async watchAdvertisements() { dev.watchedAds++; },
    async forget() { dev.forgotten = true; },
    _fire(type) { (listeners.get(type) || []).slice().forEach(fn => { try { fn({ type, target: dev }); } catch (e) { pushError(e); } }); },
    /** Test-Helfer: wie oft haengt ein Handler dieses Typs am Geraet? */
    _listenerCount(type) { return (listeners.get(type) || []).length; },
  };
  return dev;
}

/** navigator.bluetooth-Mock. `opts.getDevices:false` simuliert einen Browser
 *  ohne getDevices() (Stufe B). `opts.noApi:true` simuliert fehlendes BLE. */
export function makeBluetooth(opts = {}) {
  const bt = {
    _known: opts.devices || [],
    _requestResult: opts.requestResult || null,
    requestDeviceCalls: 0,
    getDevicesCalls: 0,
    /** Optionen des letzten requestDevice-Aufrufs — damit Tests pruefen koennen,
     *  ob gefiltert (Stufe B) oder offen (acceptAllDevices) gefragt wurde. */
    lastRequestOptions: null,
    async requestDevice(options) {
      bt.requestDeviceCalls++;
      bt.lastRequestOptions = options || null;
      if (bt._requestResult) return bt._requestResult;
      throw new Error('User cancelled the requestDevice() chooser.');
    },
    async getAvailability() { return true; },
    addEventListener() { }, removeEventListener() { },
  };
  if (opts.getDevices !== false) {
    bt.getDevices = async () => { bt.getDevicesCalls++; return bt._known.slice(); };
  }
  return bt;
}

/* ═══════════════════════════════════════════════════════════════
   6. APP-LOADER: Inline-JS aus index.html in einen vm-Kontext
═══════════════════════════════════════════════════════════════ */

let _htmlCache = null;
function readIndexHtml() {
  if (_htmlCache === null) _htmlCache = fs.readFileSync(INDEX_HTML, 'utf8');
  return _htmlCache;
}

/** Liefert die Inhalte aller <script>-Bloecke ohne src-Attribut. */
export function extractInlineScripts(html = readIndexHtml()) {
  const out = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/\ssrc\s*=/i.test(m[1])) continue;
    const before = html.slice(0, m.index);
    out.push({ code: m[2], line: before.split('\n').length, attrs: m[1] });
  }
  return out;
}

/**
 * Laedt die App in einen frischen vm-Kontext.
 *
 * @param {object} opts
 *   - storage:   Startinhalt fuer localStorage (Objekt, Werte werden JSON-serialisiert)
 *   - bluetooth: navigator.bluetooth-Mock (default: makeBluetooth())
 *   - noBle:     true -> navigator ohne bluetooth
 *   - ua:        User-Agent-String
 *   - url:       location.href
 *   - quiet:     true (default) -> console-Ausgaben der App unterdruecken
 */
export function loadApp(opts = {}) {
  const html = readIndexHtml();
  const scripts = extractInlineScripts(html);

  /* ── DOM aus dem echten Markup ──────────────────────────── */
  const doc = makeDocument(html);

  /* ── Umgebung ───────────────────────────────────────────── */
  const localStorageMock = makeStorage(opts.storage || {});
  const sessionStorageMock = makeStorage(opts.session || {});
  const timers = new Set();
  const consoleSink = [];

  /* Timer-Politik: setInterval wird ge-unref-t (App-Polls duerfen den Prozess
     nicht am Leben halten), setTimeout NICHT — sonst faellt der Node-Prozess
     mitten in einem `await sleep(...)` aus dem Backoff heraus einfach tot um
     ("unsettled top-level await"). Aufgeraeumt wird ueber api.dispose().

     fastTimers verkuerzt NUR setTimeout und nie unter 1 ms. setInterval bleibt
     unangetastet: die App plant Polls im Sekundentakt, und ein auf 0 ms
     gestauchtes Intervall dreht sofort frei, bis der Heap voll ist. */
  const wrapTimer = (native, unref, compressible) => (cb, ms, ...a) => {
    const delay = (compressible && ctxState.fastTimers) ? Math.min(ms || 0, 1) : ms;
    const t = native(() => { try { cb(...a); } catch (e) { pushError(e); } }, delay);
    if (unref && t && typeof t.unref === 'function') t.unref();
    timers.add(t);
    return t;
  };
  const ctxState = { fastTimers: false };

  const bluetooth = opts.noBle ? undefined : (opts.bluetooth || makeBluetooth());

  const navigatorMock = {
    userAgent: opts.ua || 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
    language: 'de-DE', languages: ['de-DE', 'de'],
    onLine: true, maxTouchPoints: 5, hardwareConcurrency: 8,
    vibrate: () => true,
    clipboard: { writeText: async () => { }, readText: async () => '' },
    share: async () => { }, canShare: () => true,
    permissions: { query: async () => ({ state: 'granted', addEventListener() { } }) },
    wakeLock: { request: async () => ({ release: async () => { }, addEventListener() { } }) },
    serviceWorker: { register: async () => ({ addEventListener() { }, update() { }, waiting: null, installing: null }), ready: Promise.resolve({ addEventListener() { } }), addEventListener() { }, controller: null },
    storage: { estimate: async () => ({ usage: 0, quota: 1e9 }), persisted: async () => false, persist: async () => false },
    mediaDevices: { getUserMedia: async () => { throw new Error('no media in test'); } },
    sendBeacon: () => true,
    getBattery: async () => ({ level: 1, charging: true, addEventListener() { } }),
  };
  if (bluetooth) navigatorMock.bluetooth = bluetooth;

  class MockBluetoothDevice { }
  MockBluetoothDevice.prototype.watchAdvertisements = async function () { };
  MockBluetoothDevice.prototype.forget = async function () { };

  const noopClass = class { constructor() { } observe() { } unobserve() { } disconnect() { } takeRecords() { return []; } };

  const sandbox = {
    console: opts.quiet === false ? console : {
      log: (...a) => consoleSink.push(['log', a]), warn: (...a) => consoleSink.push(['warn', a]),
      error: (...a) => consoleSink.push(['error', a]), info: () => { }, debug: () => { }, table: () => { },
      group: () => { }, groupEnd: () => { }, time: () => { }, timeEnd: () => { }, trace: () => { },
    },
    document: doc,
    navigator: navigatorMock,
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
    location: makeLocation(opts.url || 'https://123ichbinmitdabei.github.io/terp-sessions/'),
    history: { replaceState() { }, pushState() { }, back() { }, go() { }, length: 1, state: null },
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 915, orientation: { type: 'portrait-primary', addEventListener() { } } },
    visualViewport: { width: 412, height: 915, addEventListener() { }, removeEventListener() { } },
    matchMedia: q => ({ media: q, matches: false, addEventListener() { }, removeEventListener() { }, addListener() { }, removeListener() { }, onchange: null }),
    getComputedStyle: () => ({ getPropertyValue: () => '', display: 'block' }),
    alert: () => { }, confirm: () => true, prompt: () => null,
    fetch: opts.fetch || (async () => { throw new Error('fetch blocked in test'); }),
    crypto: webcrypto,
    performance: { now: () => Date.now(), mark() { }, measure() { }, getEntriesByType: () => [] },
    requestAnimationFrame: cb => wrapTimer(setTimeout, true, false)(cb, 16),
    cancelAnimationFrame: t => clearTimeout(t),
    requestIdleCallback: cb => wrapTimer(setTimeout, true, false)(() => cb({ timeRemaining: () => 50 }), 1),
    cancelIdleCallback: t => clearTimeout(t),
    queueMicrotask,
    structuredClone: v => JSON.parse(JSON.stringify(v)),
    TextEncoder, TextDecoder, URL, URLSearchParams, AbortController,
    Blob: class { constructor(p) { this.parts = p; this.size = 0; this.type = ''; } async text() { return (this.parts || []).join(''); } },
    File: class { }, FileReader: class { readAsText() { } addEventListener() { } },
    Image: class { constructor() { this.onload = null; } set src(_) { } },
    Notification: Object.assign(class { constructor() { } }, { permission: 'default', requestPermission: async () => 'default' }),
    MutationObserver: noopClass, IntersectionObserver: noopClass, ResizeObserver: noopClass,
    speechSynthesis: { getVoices: () => [], speak() { }, cancel() { }, pause() { }, resume() { }, speaking: false, addEventListener() { } },
    SpeechSynthesisUtterance: class { constructor(t) { this.text = t; } addEventListener() { } },
    SpeechRecognition: undefined, webkitSpeechRecognition: undefined,
    AudioContext: class { constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; } createOscillator() { return { connect() { }, start() { }, stop() { }, frequency: { value: 0, setValueAtTime() { } }, type: '' }; } createGain() { return { connect() { }, gain: { value: 0, setValueAtTime() { }, exponentialRampToValueAtTime() { }, linearRampToValueAtTime() { } } }; } createBufferSource() { return { connect() { }, start() { }, stop() { }, buffer: null, loop: false }; } createBuffer() { return { getChannelData: () => new Float32Array(1) }; } resume() { return Promise.resolve(); } close() { return Promise.resolve(); } },
    BluetoothDevice: MockBluetoothDevice,
    Element: El, HTMLElement: El, Node: El, Text: TextNode,
    Event: class { constructor(t, i = {}) { this.type = t; this.bubbles = !!i.bubbles; this.detail = i.detail; this.defaultPrevented = false; } preventDefault() { this.defaultPrevented = true; } stopPropagation() { this._stopped = true; } },
    CustomEvent: class { constructor(t, i = {}) { this.type = t; this.bubbles = !!i.bubbles; this.detail = i.detail; this.defaultPrevented = false; } preventDefault() { this.defaultPrevented = true; } stopPropagation() { this._stopped = true; } },
    btoa: s => Buffer.from(String(s), 'binary').toString('base64'),
    atob: s => Buffer.from(String(s), 'base64').toString('binary'),
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.top = sandbox;
  sandbox.parent = sandbox;
  sandbox.setTimeout = wrapTimer(setTimeout, false, true);
  sandbox.setInterval = wrapTimer(setInterval, true, false);
  sandbox.clearTimeout = t => { clearTimeout(t); timers.delete(t); };
  sandbox.clearInterval = t => { clearInterval(t); timers.delete(t); };
  sandbox.addEventListener = (t, fn) => doc._winListeners.push([t, fn]);
  sandbox.removeEventListener = () => { };
  sandbox.dispatchEvent = evt => {
    doc._winListeners.filter(([t]) => t === evt.type).forEach(([, fn]) => { try { fn(evt); } catch (e) { pushError(e); } });
    return true;
  };
  sandbox.onerror = null;
  sandbox.scrollTo = () => { };
  sandbox.open = () => null;
  sandbox.print = () => { };
  sandbox.Date = Date; sandbox.Math = Math; sandbox.JSON = JSON;

  const ctx = vm.createContext(sandbox, { name: 'terp-sessions' });
  doc.defaultView = sandbox;

  for (const s of scripts) {
    const script = new vm.Script(s.code, { filename: 'index.html', lineOffset: s.line - 1 });
    script.runInContext(ctx);
  }

  const api = {
    ctx, sandbox, document: doc, window: sandbox,
    localStorage: localStorageMock, sessionStorage: sessionStorageMock,
    navigator: navigatorMock, bluetooth,
    console: consoleSink,
    /** Wert aus dem App-Scope holen — auch top-level const (State, PREFS, LS). */
    get(name) { return vm.runInContext(name, ctx); },
    /** Beliebigen Ausdruck im App-Scope auswerten. */
    run(code) { return vm.runInContext(code, ctx); },
    /** setTimeout-Verzoegerungen auf 1 ms stauchen. NICHT mit fireReady()
     *  kombinieren: der Boot plant dutzende gestaffelte Setups per setTimeout,
     *  die dann alle in derselben Millisekunde uebereinander herfallen. */
    setFastTimers(on = true) { ctxState.fastTimers = !!on; },
    /** DOMContentLoaded ausloesen (die App haengt diverse Setups daran). */
    fireReady() {
      if (ctxState.fastTimers) throw new Error('fireReady() nicht mit setFastTimers(true) kombinieren — der Boot braucht seine echte Staffelung.');
      doc._fireReady();
    },
    dispose() { timers.forEach(t => { try { clearTimeout(t); clearInterval(t); } catch { } }); timers.clear(); },
    errors: takeErrors,
  };
  return api;
}

function makeLocation(href) {
  const u = new URL(href);
  return {
    get href() { return u.href; }, set href(v) { /* Navigation ignorieren */ },
    origin: u.origin, protocol: u.protocol, host: u.host, hostname: u.hostname,
    port: u.port, pathname: u.pathname, search: u.search, hash: u.hash,
    reload() { }, replace() { }, assign() { }, toString() { return u.href; },
  };
}

function makeDocument(html) {
  const root = new El('html');
  const doc = {
    nodeType: 9,
    _winListeners: [],
    _listeners: new Map(),
    _idIndex: null, _idTick: -1,
    documentElement: root,
    activeElement: null,
    readyState: 'loading',
    visibilityState: 'visible',
    hidden: false,
    title: 'Terp Sessions',
    cookie: '',
    createElement(tag) { const e = new El(tag); e.ownerDocument = doc; return e; },
    createElementNS(_ns, tag) { return doc.createElement(tag); },
    createTextNode(t) { return new TextNode(t); },
    createDocumentFragment() { const f = new El('#fragment'); f._isFragment = true; f.ownerDocument = doc; return f; },
    getElementById(id) {
      if (doc._idTick !== _mutationTick) {
        doc._idIndex = new Map();
        walk(root, el => { const i = el.id; if (i && !doc._idIndex.has(i)) doc._idIndex.set(i, el); return true; });
        doc._idTick = _mutationTick;
      }
      return doc._idIndex.get(String(id)) || null;
    },
    getElementsByTagName(t) { return queryAll(root, t, false); },
    getElementsByClassName(c) { return queryAll(root, '.' + c, false); },
    querySelector(sel) { return queryAll(root, sel, true)[0] || null; },
    querySelectorAll(sel) { return queryAll(root, sel, false); },
    addEventListener(t, fn) { if (!doc._listeners.has(t)) doc._listeners.set(t, []); doc._listeners.get(t).push(fn); },
    removeEventListener(t, fn) { const a = doc._listeners.get(t) || []; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); },
    dispatchEvent(evt) {
      (doc._listeners.get(evt.type) || []).slice().forEach(fn => { try { fn(evt); } catch (e) { pushError(e); } });
      return true;
    },
    execCommand() { return true; },
    elementFromPoint() { return null; },
    _fireReady() {
      doc.readyState = 'interactive';
      doc.dispatchEvent({ type: 'DOMContentLoaded', target: doc });
      doc.readyState = 'complete';
      doc._winListeners.filter(([t]) => t === 'load').forEach(([, fn]) => { try { fn({ type: 'load' }); } catch (e) { pushError(e); } });
    },
  };
  root.ownerDocument = doc;
  parseInto(html, root);
  doc.body = queryAll(root, 'body', true)[0] || root;
  doc.head = queryAll(root, 'head', true)[0] || root;
  return doc;
}

/* ═══════════════════════════════════════════════════════════════
   7. KLEINE ASSERTION-HELFER (von den Suiten genutzt)
═══════════════════════════════════════════════════════════════ */
export function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion fehlgeschlagen');
}
export function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg ? msg + ': ' : '') + `erwartet ${e}, war ${a}`);
}
export function assertThrows(fn, msg) {
  try { fn(); } catch { return; }
  throw new Error(msg || 'Erwartete Exception blieb aus');
}
