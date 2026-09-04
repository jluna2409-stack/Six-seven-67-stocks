import { DEFAULT_TABLES } from './tax.js';
import { dayKey, uid } from './format.js';

export const STORAGE_KEY = 'bolsa-sim/state/v1';
export const SCHEMA = 1;

export const DEFAULT_STATE = () => ({
  schema: SCHEMA,
  createdAt: Date.now(),
  onboarded: false,
  settings: {
    lang: (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es',
    theme: 'system',
    apiKey: 'daddji1r01qtj63oukn0daddji1r01qtj63oukng',
    avKey: '',
    fx: 17.0,
    fxAuto: true,
    fxAt: 0,
    fxSource: '',
    commissionPct: 0.25,
    commissionMin: 0,
    fractional: true,
    costMethod: 'fifo',          // fifo | avg
    capRate: 10,                 // % — LISR art. 129
    divUsRate: 10,               // % — US treaty withholding
    divExtraRate: 10,            // % — LISR art. 142 fr. V
    cashApy: 0,                  // % annual yield paid on idle cash
    autoPayTax: false,
    tables: DEFAULT_TABLES
  },
  cash: 0,
  positions: {},        // SYM -> { symbol, name, type, lots:[{id,qty,price,fee,ts}] }
  transactions: [],     // newest last
  recurring: [],        // [{id,name,kind,amount,gross,freq,nextTs,active}]
  realized: [],         // [{ts,symbol,qty,proceeds,cost,gain}]
  snapshots: [],        // [{d,nw,cash,invested,contrib}]
  taxPaid: {},          // year -> USD paid
  fxHistory: {},        // 'YYYY-MM-DD' -> USD/MXN, for back-dated conversions
  lastRun: 0,           // last time scheduler ran
  lastInterestDay: dayKey()
});

let state = null;
const subs = new Set();
let saveTimer = null;

/* ------------------------------------------------------------------ */

export function load(){
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { /* private mode */ }
  if (!raw){ state = DEFAULT_STATE(); return state; }
  try {
    const parsed = JSON.parse(raw);
    state = migrate(parsed);
  } catch {
    state = DEFAULT_STATE();
  }
  return state;
}

function migrate(s){
  const base = DEFAULT_STATE();
  const out = { ...base, ...s };
  out.settings = { ...base.settings, ...(s.settings || {}) };
  out.settings.tables = { ...DEFAULT_TABLES, ...(s.settings?.tables || {}) };
  for (const k of ['positions','taxPaid']) out[k] = { ...(s[k] || {}) };
  for (const k of ['transactions','recurring','realized','snapshots']) out[k] = Array.isArray(s[k]) ? s[k] : [];
  out.fxHistory = { ...(s.fxHistory || {}) };
  // schedules created before amounts carried a currency were stored in USD
  out.recurring = out.recurring.map(r => ({ ...r, currency: r.currency || 'USD' }));
  out.schema = SCHEMA;
  return out;
}

export function get(){ return state || load(); }
export function settings(){ return get().settings; }

export function subscribe(fn){ subs.add(fn); return () => subs.delete(fn); }

/** Mutate state through a function, then persist + notify. */
export function update(fn, opts = {}){
  const s = get();
  fn(s);
  save();
  if (!opts.silent) emit(opts.reason || 'update');
  return s;
}

export function emit(reason){ subs.forEach(f => { try { f(get(), reason); } catch(e){ console.error(e); } }); }

export function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 220);
}

export function persistNow(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(get())); }
  catch (e){ console.warn('persist failed', e); }
}

export function replaceState(next){
  state = migrate(next);
  persistNow();
  emit('replace');
}

export function resetAll(){
  state = DEFAULT_STATE();
  persistNow();
  emit('reset');
}

/* ------------------------------ ledger ---------------------------- */

export function addTx(tx){
  const s = get();
  const row = { id: uid(), ts: Date.now(), ...tx };
  s.transactions.push(row);
  return row;
}

export const TX = {
  DEPOSIT:'DEPOSIT', WITHDRAW:'WITHDRAW', SALARY:'SALARY', BUY:'BUY', SELL:'SELL',
  DIVIDEND:'DIVIDEND', TAX:'TAX', INTEREST:'INTEREST'
};

/* --------------------------- export / import ---------------------- */

export function exportBlob(){
  const data = JSON.stringify({ app:'bolsa-sim', schema:SCHEMA, exportedAt:new Date().toISOString(), state:get() }, null, 2);
  return new Blob([data], { type:'application/json' });
}

export function importFromText(text){
  const parsed = JSON.parse(text);
  const next = parsed.state || parsed;
  if (!next || typeof next !== 'object' || !('cash' in next)) throw new Error('bad file');
  replaceState(next);
}
