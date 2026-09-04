/**
 * Market data layer — Finnhub REST quotes + real-time WebSocket trades,
 * the US instrument catalog, and optional historical backfill.
 */
import { settings, get } from './store.js';

const BASE = 'https://finnhub.io/api/v1';

export const quotes = {};          // SYM -> { c, pc, h, l, o, t, src }
const tickSubs = new Set();
const statusSubs = new Set();
let ws = null, wsReady = false, wsRetry = 0, wsTimer = null;
let subscribed = new Set();
let status = { state:'idle', msg:'' };

export function onTick(fn){ tickSubs.add(fn); return () => tickSubs.delete(fn); }
export function onStatus(fn){ statusSubs.add(fn); fn(status); return () => statusSubs.delete(fn); }
function setStatus(state, msg = ''){ status = { state, msg }; statusSubs.forEach(f => f(status)); }
export function getStatus(){ return status; }

let tickQueue = new Set(), flushTimer = null;
function emitTick(sym){
  tickQueue.add(sym);
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    const syms = [...tickQueue]; tickQueue.clear(); flushTimer = null;
    tickSubs.forEach(f => { try { f(syms, quotes); } catch(e){ console.error(e); } });
  }, 250);
}

/* --------------------------- market clock ------------------------- */

/** US regular session: Mon–Fri 09:30–16:00 America/New_York. */
export function marketOpen(now = new Date()){
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone:'America/New_York', weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false
  }).formatToParts(now);
  const g = k => p.find(x => x.type === k)?.value;
  const wd = g('weekday');
  if (wd === 'Sat' || wd === 'Sun') return false;
  const mins = Number(g('hour')) * 60 + Number(g('minute'));
  return mins >= 570 && mins < 960;   // 9:30 -> 16:00 ET (holidays not modelled)
}

/* ------------------------------ REST ------------------------------ */

async function api(path, params = {}){
  const s = settings();
  const url = new URL(BASE + path);
  for (const k in params) url.searchParams.set(k, params[k]);
  url.searchParams.set('token', s.apiKey);
  const r = await fetch(url, { cache:'no-store' });
  if (r.status === 429) throw new Error('rate-limit');
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

export async function fetchQuote(symbol){
  const j = await api('/quote', { symbol });
  if (j && typeof j.c === 'number' && j.c > 0){
    quotes[symbol] = { ...j, src:'rest', at: Date.now() };
    emitTick(symbol);
  }
  return quotes[symbol];
}

/** Sequential fetch with spacing so we stay inside the free 60 req/min budget. */
export async function refreshQuotes(symbols, { spacing = 260 } = {}){
  let ok = 0;
  for (const s of symbols){
    try { await fetchQuote(s); ok++; } catch (e){ if (String(e.message) === 'rate-limit') break; }
    if (spacing) await new Promise(r => setTimeout(r, spacing));
  }
  return ok;
}

export async function fetchProfile(symbol){
  try { return await api('/stock/profile2', { symbol }); } catch { return null; }
}

/* --------------------------- WebSocket ---------------------------- */

export function connectWs(){
  const key = settings().apiKey;
  if (!key) { setStatus('err', 'no key'); return; }
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  setStatus('connecting');
  try { ws = new WebSocket(`wss://ws.finnhub.io?token=${encodeURIComponent(key)}`); }
  catch { setStatus('err'); return; }

  ws.onopen = () => {
    wsReady = true; wsRetry = 0;
    setStatus(marketOpen() ? 'live' : 'closed');
    subscribed.forEach(s => wsSend({ type:'subscribe', symbol:s }));
  };
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type !== 'trade' || !Array.isArray(m.data)) return;
    for (const d of m.data){
      const q = quotes[d.s] || (quotes[d.s] = { c:d.p, pc:d.p, at:Date.now() });
      q.c = d.p; q.t = Math.floor(d.t / 1000); q.src = 'ws'; q.at = Date.now();
      emitTick(d.s);
    }
  };
  ws.onerror = () => { if (!wsReady) setStatus('err'); };
  ws.onclose = () => {
    wsReady = false; ws = null;
    // After a couple of failed attempts stop promising a live feed: REST quotes still work.
    setStatus(!marketOpen() ? 'closed' : wsRetry >= 2 ? 'delayed' : 'connecting');
    clearTimeout(wsTimer);
    wsTimer = setTimeout(connectWs, Math.min(60000, 2000 * Math.pow(2, wsRetry++)));
  };
}

function wsSend(o){ if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(o)); }

export function watch(symbols){
  const next = new Set(symbols);
  for (const s of subscribed) if (!next.has(s)) wsSend({ type:'unsubscribe', symbol:s });
  for (const s of next) if (!subscribed.has(s)) wsSend({ type:'subscribe', symbol:s });
  subscribed = next;
}

/* ------------------------------ catalog --------------------------- */

let catalog = null;          // [{symbol,name,type,mic}]
let catalogMeta = { generated:'', count:0, etfs:0 };
const CAT_KEY = 'bolsa-sim/catalog/v1';

export function catalogInfo(){ return catalogMeta; }
export function catalogReady(){ return !!catalog; }

function ingest(obj){
  const rows = obj.rows.map(r => ({ symbol:r[0], name:r[1], type:r[2], mic:r[3] }));
  catalog = rows;
  catalogMeta = {
    generated: obj.generated || '',
    count: rows.length,
    etfs: rows.filter(r => isFund(r.type)).length
  };
  return rows;
}

export function isFund(type){
  return type === 'ETP' || type === 'Closed-End Fund' || type === 'Open-End Fund' || type === 'Mutual Fund';
}

export async function loadCatalog(){
  if (catalog) return catalog;
  try {
    const cached = localStorage.getItem(CAT_KEY);
    if (cached) return ingest(JSON.parse(cached));
  } catch { /* ignore */ }
  const r = await fetch('./data/catalog.json', { cache:'force-cache' });
  const j = await r.json();
  return ingest(j);
}

/** Pull a fresh symbol list straight from Finnhub and cache it locally. */
export async function refreshCatalog(){
  const s = settings();
  const r = await fetch(`${BASE}/stock/symbol?exchange=US&token=${encodeURIComponent(s.apiKey)}`);
  if (!r.ok) throw new Error('http ' + r.status);
  const arr = await r.json();
  const KEEP = new Set(['Common Stock','ETP','ADR','REIT','Closed-End Fund','Foreign Sh.','Open-End Fund','Mutual Fund','MLP','Royalty Trst','Ltd Part','NY Reg Shrs','GDR','Stapled Security','Tracking Stk']);
  const seen = new Set(), rows = [];
  for (const x of arr){
    if (!x.symbol || !KEEP.has(x.type) || /[.\/^]/.test(x.symbol) || seen.has(x.symbol)) continue;
    seen.add(x.symbol);
    rows.push([x.symbol, String(x.description || '').replace(/\s+/g,' ').trim(), x.type, x.mic || '']);
  }
  rows.sort((a,b) => a[0].localeCompare(b[0]));
  const obj = { source:'finnhub', generated:new Date().toISOString().slice(0,10), rows };
  try { localStorage.setItem(CAT_KEY, JSON.stringify(obj)); } catch { /* too big for quota */ }
  return ingest(obj);
}

export const POPULAR = ['VOO','SPY','QQQ','VTI','VT','IVV','SCHD','VGT','VXUS','BND','AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','BRK.B','JPM','KO'];

/** Ranked search over the catalog: exact symbol > symbol prefix > name match. */
export function search(q, { filter = 'all', limit = 60 } = {}){
  if (!catalog) return [];
  const Q = q.trim().toUpperCase();
  if (!Q){
    return catalog.filter(r => POPULAR.includes(r.symbol) && passes(r, filter)).slice(0, limit);
  }
  const out = [];
  for (const r of catalog){
    if (!passes(r, filter)) continue;
    let score = -1;
    if (r.symbol === Q) score = 0;
    else if (r.symbol.startsWith(Q)) score = 1;
    else if (r.name && r.name.toUpperCase().startsWith(Q)) score = 2;
    else if (r.name && r.name.toUpperCase().includes(Q)) score = 3;
    else if (r.symbol.includes(Q)) score = 4;
    if (score >= 0){
      out.push([score, r]);
      if (out.length > 900) break;
    }
  }
  out.sort((a,b) => a[0] - b[0] || a[1].symbol.length - b[1].symbol.length || a[1].symbol.localeCompare(b[1].symbol));
  return out.slice(0, limit).map(x => x[1]);
}

function passes(r, filter){
  if (filter === 'etf') return isFund(r.type);
  if (filter === 'stock') return !isFund(r.type);
  return true;
}

export function lookup(symbol){
  if (!catalog) return null;
  return catalog.find(r => r.symbol === symbol) || null;
}

/* --------------------------- price history ------------------------ */

/**
 * Daily closes for a symbol. Finnhub candles need a paid plan, so we try:
 *   1) Finnhub /stock/candle  (works if the key is upgraded)
 *   2) Alpha Vantage TIME_SERIES_DAILY (free key, optional)
 * and otherwise return null so the caller falls back to locally observed prices.
 */
export async function fetchHistory(symbol, days = 180){
  const s = settings();
  const to = Math.floor(Date.now() / 1000), from = to - days * 86400;
  try {
    const j = await api('/stock/candle', { symbol, resolution:'D', from, to });
    if (j && j.s === 'ok' && Array.isArray(j.c)) return j.t.map((t, i) => [t * 1000, j.c[i]]);
  } catch { /* premium endpoint — expected on the free tier */ }

  if (s.avKey){
    try {
      const u = new URL('https://www.alphavantage.co/query');
      u.searchParams.set('function','TIME_SERIES_DAILY');
      u.searchParams.set('symbol', symbol);
      u.searchParams.set('outputsize', days > 100 ? 'full' : 'compact');
      u.searchParams.set('apikey', s.avKey);
      const r = await fetch(u);
      const j = await r.json();
      const ts = j['Time Series (Daily)'];
      if (ts){
        return Object.entries(ts)
          .map(([d, v]) => [new Date(d + 'T16:00:00').getTime(), Number(v['4. close'])])
          .filter(x => isFinite(x[1]))
          .sort((a,b) => a[0] - b[0])
          .slice(-days);
      }
    } catch { /* ignore */ }
  }
  return null;
}
