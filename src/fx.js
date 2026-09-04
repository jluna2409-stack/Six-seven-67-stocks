/**
 * USD/MXN exchange rate.
 *
 * Finnhub's /forex/rates is a paid endpoint, so the rate comes from free,
 * CORS-enabled providers that need no API key. Both publish one rate per day
 * (the same cadence as Banxico's FIX, which is what the tax rules use anyway),
 * so the app refreshes on open and every few hours rather than tick by tick.
 */
import { get, update } from './store.js';
import { dayKey } from './format.js';

const PROVIDERS = [
  {
    name: 'exchangerate-api.com',
    url: 'https://open.er-api.com/v6/latest/USD',
    parse: j => (j?.result === 'success' && j.rates?.MXN)
      ? { rate: j.rates.MXN, at: (j.time_last_update_unix || 0) * 1000 } : null
  },
  {
    name: 'currency-api',
    url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    parse: j => j?.usd?.mxn ? { rate: j.usd.mxn, at: j.date ? new Date(j.date + 'T12:00:00Z').getTime() : Date.now() } : null
  }
];

const listeners = new Set();
export function onFx(fn){ listeners.add(fn); return () => listeners.delete(fn); }

export function fxInfo(){
  const s = get().settings;
  return { rate: s.fx, auto: s.fxAuto !== false, at: s.fxAt || 0, source: s.fxSource || '' };
}

/** Fetch a fresh rate. Returns the info object, or null if every provider failed. */
export async function refreshFx({ force = false } = {}){
  const s = get().settings;
  if (s.fxAuto === false && !force) return null;

  for (const p of PROVIDERS){
    try {
      const r = await fetch(p.url, { cache:'no-store' });
      if (!r.ok) continue;
      const parsed = p.parse(await r.json());
      if (!parsed || !(parsed.rate > 0)) continue;
      update(st => {
        st.settings.fx = Math.round(parsed.rate * 10000) / 10000;
        st.settings.fxAt = parsed.at || Date.now();
        st.settings.fxSource = p.name;
      }, { reason:'fx' });
      const info = fxInfo();
      listeners.forEach(f => { try { f(info); } catch(e){ console.error(e); } });
      return info;
    } catch { /* try the next provider */ }
  }
  return null;
}

/** Refresh on open and every 6 hours while the tab lives. */
export function startFx(){
  refreshFx();
  setInterval(() => refreshFx(), 6 * 3600_000);
}

/* --------------------------- historical rates --------------------------- */

const HIST = d => `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${d}/v1/currencies/usd.json`;
const inflight = new Map();

/** Cached USD/MXN rate for one calendar day, or null if it cannot be resolved. */
export async function rateOn(day){
  const cached = get().fxHistory?.[day];
  if (cached) return cached;
  if (inflight.has(day)) return inflight.get(day);

  const job = (async () => {
    // The daily files skip some dates; walk back a few days before giving up.
    for (let back = 0; back < 3; back++){
      const d = new Date(day + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - back);
      const key = d.toISOString().slice(0, 10);
      try {
        const r = await fetch(HIST(key), { cache:'force-cache' });
        if (!r.ok) continue;
        const j = await r.json();
        const rate = j?.usd?.mxn;
        if (!(rate > 0)) continue;
        update(st => {
          st.fxHistory = st.fxHistory || {};
          st.fxHistory[day] = rate;
        }, { silent:true });
        return rate;
      } catch { /* try the previous day */ }
    }
    return null;
  })();

  inflight.set(day, job);
  const out = await job;
  inflight.delete(day);
  return out;
}

/**
 * Rates for a set of days, resolved in parallel.
 *
 * Bounded by `timeout`: whatever has not resolved by then falls back to the
 * current rate, so a slow or blocked network never stalls a scheduled deposit.
 * Anything that lands later is still cached for next time.
 */
export async function ratesFor(days, { timeout = 4000 } = {}){
  const fallback = get().settings.fx;
  const uniq = [...new Set(days)];
  const out = {};
  uniq.forEach(d => { out[d] = fallback; });

  const work = Promise.all(uniq.map(async d => {
    const r = await rateOn(d);
    if (r) out[d] = r;
  }));
  await Promise.race([work, new Promise(res => setTimeout(res, timeout))]);
  return out;
}

/** Rate to use for a timestamp: its own day's rate if known, else today's. */
export function rateAt(ts, rates){
  return rates?.[dayKey(new Date(ts))] || get().settings.fx;
}
