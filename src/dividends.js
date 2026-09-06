/**
 * Automatic dividend detection.
 *
 * Reads the announced dividend calendar for every open position and works out
 * which payments the user was actually entitled to — you collect a dividend if
 * you held the shares before the ex-dividend date — then offers them for one
 * click, or records them outright when the user enabled that.
 */
import { get, settings, update, TX } from './store.js';
import { fetchDividendHistory } from './market.js';
import { dividend } from './engine.js';
import { dayKey } from './format.js';

/** Shares held on a given date, rebuilt from the trade ledger. */
export function sharesOn(state, symbol, dateMs){
  let qty = 0;
  for (const t of state.transactions){
    if (t.symbol !== symbol || t.ts >= dateMs) continue;
    if (t.type === TX.BUY) qty += t.qty || 0;
    else if (t.type === TX.SELL) qty -= t.qty || 0;
  }
  return Math.max(0, qty);
}

/** True if this payment is already in the ledger (auto-recorded or typed by hand). */
export function alreadyRecorded(state, symbol, exDate){
  const ex = new Date(exDate + 'T12:00:00').getTime();
  return state.transactions.some(t => {
    if (t.type !== TX.DIVIDEND || t.symbol !== symbol) return false;
    if (t.exDate === exDate) return true;
    // a manual entry near the same date is almost certainly the same payment
    return Math.abs(t.ts - ex) < 20 * 86400000;
  });
}

/**
 * Scan every held position.
 * @returns {{ pending:Array, upcoming:Array, needsKey:boolean, limited:boolean }}
 *   pending  — already paid and not yet in the ledger
 *   upcoming — announced but not paid yet, shown for information
 */
export async function scanDividends(state = get(), { force = false } = {}){
  const s = settings();
  const out = { pending: [], upcoming: [], needsKey: !s.avKey, limited: false, problem: null };
  if (!s.avKey) return out;

  const today = dayKey();
  for (const symbol of Object.keys(state.positions)){
    let rows;
    try { rows = await fetchDividendHistory(symbol, { force }); }
    catch (e){
      // Whatever the provider is refusing, it will refuse the rest too.
      const m = String(e.message);
      if (m.startsWith('av-')){ out.problem = m.slice(3); out.limited = out.problem === 'limit'; break; }
      continue;
    }
    if (!rows) continue;

    for (const d of rows){
      const exMs = new Date(d.exDate + 'T12:00:00').getTime();
      const qty = sharesOn(state, symbol, exMs);
      if (qty <= 1e-9) continue;                       // not held on the ex-date
      const gross = qty * d.perShare;
      if (gross < 0.01) continue;
      const item = { symbol, exDate: d.exDate, payDate: d.payDate, perShare: d.perShare, qty, gross };
      if (d.payDate > today){ out.upcoming.push(item); continue; }
      if (alreadyRecorded(state, symbol, d.exDate)) continue;
      out.pending.push(item);
    }
  }
  out.pending.sort((a, b) => a.payDate.localeCompare(b.payDate));
  out.upcoming.sort((a, b) => a.payDate.localeCompare(b.payDate));
  // Kept so the banner survives navigation: re-rendering must not need the network.
  update(st => {
    st.divPending = out.pending;
    st.divUpcoming = out.upcoming[0] || null;
  }, { silent:true });
  return out;
}

/** Record one detected payment, dated on the day it was actually paid. */
export function recordDetected(item){
  return dividend({
    symbol: item.symbol,
    gross: item.gross,
    ts: new Date(item.payDate + 'T12:00:00').getTime(),
    exDate: item.exDate,
    perShare: item.perShare,
    qty: item.qty,
    note: ''
  });
}

/** Record everything pending; used by the auto setting and the "record all" button. */
export function recordAll(items){
  let n = 0;
  for (const it of items){ recordDetected(it); n++; }
  return n;
}

/** Called at startup: records silently only when the user asked for it. */
export async function autoRecordDividends(){
  if (!settings().autoDividends || !settings().avKey) return [];
  if (Date.now() < (get().avLimitedUntil || 0)) return [];
  const scan = await scanDividends();
  if (!scan.pending.length) return [];
  recordAll(scan.pending);
  return scan.pending;
}
