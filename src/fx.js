/**
 * USD/MXN exchange rate.
 *
 * Finnhub's /forex/rates is a paid endpoint, so the rate comes from free,
 * CORS-enabled providers that need no API key. Both publish one rate per day
 * (the same cadence as Banxico's FIX, which is what the tax rules use anyway),
 * so the app refreshes on open and every few hours rather than tick by tick.
 */
import { get, update } from './store.js';

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
