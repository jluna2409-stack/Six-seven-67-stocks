import { get, update, addTx, TX, settings } from './store.js';
import { dayKey, uid } from './format.js';

/* ------------------------------ pricing --------------------------- */

export function commissionFor(gross){
  const s = settings();
  return Math.max(s.commissionMin || 0, gross * (s.commissionPct || 0) / 100);
}

export function lotQty(p){ return p.lots.reduce((a, l) => a + l.qty, 0); }
export function lotCost(p){ return p.lots.reduce((a, l) => a + l.qty * l.price + (l.fee || 0), 0); }

/** One row per position, enriched with live prices. */
export function positions(state = get(), prices = {}){
  const rows = [];
  for (const sym in state.positions){
    const p = state.positions[sym];
    const qty = lotQty(p);
    if (qty <= 1e-9) continue;
    const cost = lotCost(p);
    const q = prices[sym] || {};
    const last = q.c ?? p.lastPrice ?? (cost / qty);
    const prev = q.pc ?? last;
    const value = qty * last;
    const pl = value - cost;
    rows.push({
      symbol: sym, name: p.name || sym, type: p.type || '',
      qty, cost, avg: cost / qty, last, prev, value, pl,
      plPct: cost > 0 ? pl / cost * 100 : 0,
      dayChg: qty * (last - prev),
      dayPct: prev > 0 ? (last - prev) / prev * 100 : 0,
      live: !!q.c, stale: !q.c,
      lots: p.lots
    });
  }
  const total = rows.reduce((a, r) => a + r.value, 0);
  rows.forEach(r => r.weight = total > 0 ? r.value / total * 100 : 0);
  return rows.sort((a, b) => b.value - a.value);
}

export function invested(state = get(), prices = {}){
  return positions(state, prices).reduce((a, r) => a + r.value, 0);
}
export function netWorth(state = get(), prices = {}){
  return state.cash + invested(state, prices);
}
export function dayChange(state = get(), prices = {}){
  return positions(state, prices).reduce((a, r) => a + r.dayChg, 0);
}

/** External money in minus external money out (salary counts as money in). */
export function netContributed(state = get()){
  let c = 0;
  for (const t of state.transactions){
    if (t.type === TX.DEPOSIT || t.type === TX.SALARY) c += t.amount;
    else if (t.type === TX.WITHDRAW) c -= t.amount;
  }
  return c;
}

export function realizedGain(state = get(), year = null){
  return state.realized
    .filter(r => year == null || new Date(r.ts).getFullYear() === year)
    .reduce((a, r) => a + r.gain, 0);
}

export function unrealizedGain(state = get(), prices = {}){
  return positions(state, prices).reduce((a, r) => a + r.pl, 0);
}

export function totalsFor(state = get(), prices = {}){
  const inv = invested(state, prices);
  const nw = state.cash + inv;
  const contrib = netContributed(state);
  return {
    nw, cash: state.cash, invested: inv, contrib,
    gain: nw - contrib,
    gainPct: contrib > 0 ? (nw - contrib) / contrib * 100 : 0,
    dayChg: dayChange(state, prices),
    unrealized: unrealizedGain(state, prices),
    realized: realizedGain(state)
  };
}

/* ------------------------------ trading --------------------------- */

export function buy({ symbol, name, type, qty, price }){
  const fee = commissionFor(qty * price);
  const total = qty * price + fee;
  const s = get();
  if (total > s.cash + 1e-9) return { ok:false, error:'noCash' };

  update(st => {
    st.cash -= total;
    const p = st.positions[symbol] || (st.positions[symbol] = { symbol, name, type, lots: [] });
    p.name = name || p.name; p.type = type || p.type; p.lastPrice = price;
    p.lots.push({ id: uid(), qty, price, fee, ts: Date.now() });
    addTx({ type: TX.BUY, symbol, name, qty, price, fee, amount: total });
  }, { reason:'trade' });
  return { ok:true, fee, total };
}

/** Sell using FIFO or average cost; returns realised gain net of commissions. */
export function sell({ symbol, qty, price }){
  const s = get();
  const p = s.positions[symbol];
  if (!p) return { ok:false, error:'noShares' };
  const have = lotQty(p);
  if (qty > have + 1e-9) return { ok:false, error:'noShares' };

  const gross = qty * price;
  const fee = commissionFor(gross);
  const proceeds = gross - fee;
  const method = settings().costMethod;

  let costBasis = 0;
  update(st => {
    const pos = st.positions[symbol];
    let remaining = qty;
    if (method === 'avg'){
      const totalQty = lotQty(pos), totalCost = lotCost(pos);
      const unit = totalCost / totalQty;
      costBasis = unit * qty;
      const ratio = (totalQty - qty) / totalQty;
      pos.lots = pos.lots.map(l => ({ ...l, qty: l.qty * ratio, fee: (l.fee || 0) * ratio }));
    } else {
      const kept = [];
      for (const l of pos.lots){
        if (remaining <= 1e-9){ kept.push(l); continue; }
        const take = Math.min(l.qty, remaining);
        const share = take / l.qty;
        costBasis += take * l.price + (l.fee || 0) * share;
        const left = l.qty - take;
        remaining -= take;
        if (left > 1e-9) kept.push({ ...l, qty: left, fee: (l.fee || 0) * (1 - share) });
      }
      pos.lots = kept;
    }
    if (lotQty(pos) <= 1e-9) delete st.positions[symbol];
    else pos.lastPrice = price;

    st.cash += proceeds;
    const gain = proceeds - costBasis;
    st.realized.push({ id: uid(), ts: Date.now(), symbol, qty, proceeds, cost: costBasis, gain });
    addTx({ type: TX.SELL, symbol, name: p.name, qty, price, fee, amount: proceeds, gain });
  }, { reason:'trade' });

  return { ok:true, fee, proceeds, cost: costBasis, gain: proceeds - costBasis };
}

/* ------------------------------ cash ------------------------------ */

export function deposit(amount, { type = TX.DEPOSIT, note = '', meta = null } = {}){
  update(st => { st.cash += amount; addTx({ type, amount, note, meta }); }, { reason:'cash' });
}

export function withdraw(amount, { note = '', emergency = false } = {}){
  const s = get();
  if (amount > s.cash + 1e-9) return { ok:false, error:'insufficient' };
  update(st => { st.cash -= amount; addTx({ type: TX.WITHDRAW, amount, note, emergency }); }, { reason:'cash' });
  return { ok:true };
}

/** Foreign dividend: gross is taxed 10% in the US at source; the net is credited. */
export function dividend({ symbol, gross, note = '' }){
  const s = settings();
  const wh = gross * (s.divUsRate / 100);
  const net = gross - wh;
  update(st => {
    st.cash += net;
    addTx({ type: TX.DIVIDEND, symbol, amount: net, gross, withheld: wh, note });
  }, { reason:'cash' });
  return { net, withheld: wh };
}

/**
 * Settle one tax obligation. `id` is the obligation key: the plain year for the
 * annual return ("2026"), or "div-YYYY-MM" for a monthly dividend payment.
 */
export function payTax(id, amount, meta = {}){
  const s = get();
  if (amount > s.cash + 1e-9) return { ok:false, error:'insufficient' };
  update(st => {
    st.cash -= amount;
    st.taxPaid[id] = (st.taxPaid[id] || 0) + amount;
    addTx({ type: TX.TAX, amount, obligation: id, year: meta.year, note: meta.label || '' });
  }, { reason:'tax' });
  return { ok:true };
}

/* ------------------------- daily bookkeeping ---------------------- */

/** Record / refresh today's net-worth snapshot. */
export function snapshot(prices = {}){
  const s = get();
  const t = totalsFor(s, prices);
  const d = dayKey();
  update(st => {
    const last = st.snapshots[st.snapshots.length - 1];
    const row = { d, nw: t.nw, cash: t.cash, invested: t.invested, contrib: t.contrib };
    if (last && last.d === d) st.snapshots[st.snapshots.length - 1] = row;
    else st.snapshots.push(row);
    if (st.snapshots.length > 4000) st.snapshots = st.snapshots.slice(-4000);
  }, { silent:true });
}

/** Simple daily interest on idle cash, if the user enabled a cash yield. */
export function accrueCashInterest(){
  const s = get();
  const apy = s.settings.cashApy || 0;
  if (apy <= 0) return 0;
  const today = dayKey();
  if (s.lastInterestDay === today) return 0;
  const from = new Date(s.lastInterestDay || today);
  const days = Math.max(0, Math.min(370, Math.round((Date.now() - from.getTime()) / 86400000)));
  if (days <= 0){ update(st => { st.lastInterestDay = today; }, { silent:true }); return 0; }
  const interest = s.cash * (Math.pow(1 + apy / 100, days / 365) - 1);
  if (interest > 0.004){
    update(st => { st.cash += interest; st.lastInterestDay = today; addTx({ type: TX.INTEREST, amount: interest, days }); }, { reason:'cash' });
  } else {
    update(st => { st.lastInterestDay = today; }, { silent:true });
  }
  return interest;
}

/** Time-weighted return (%) chained over daily snapshots, neutralising cash flows. */
export function twr(snaps){
  if (!snaps || snaps.length < 2) return 0;
  let f = 1;
  for (let i = 1; i < snaps.length; i++){
    const prev = snaps[i-1], cur = snaps[i];
    const flow = (cur.contrib ?? 0) - (prev.contrib ?? 0);
    const base = prev.nw;
    if (base <= 0) continue;
    const r = (cur.nw - flow) / base;
    if (isFinite(r) && r > 0) f *= r;
  }
  return (f - 1) * 100;
}

/* ----------------------------- dividends -------------------------- */

/**
 * Everything earned from dividends, split from price gains.
 * @param {number|null} year  restrict to one calendar year, or null for all time
 */
export function dividendSummary(state = get(), prices = {}, year = null){
  const bySymbol = {};
  let gross = 0, withheld = 0, net = 0, count = 0, firstTs = 0;

  for (const t of state.transactions){
    if (t.type !== TX.DIVIDEND) continue;
    const y = new Date(t.ts).getFullYear();
    if (year != null && y !== year) continue;
    const g = t.gross || t.amount || 0;
    const w = t.withheld || 0;
    gross += g; withheld += w; net += t.amount || (g - w); count++;
    if (!firstTs || t.ts < firstTs) firstTs = t.ts;
    const r = bySymbol[t.symbol] || (bySymbol[t.symbol] = { symbol: t.symbol, gross:0, withheld:0, net:0, count:0, lastTs:0 });
    r.gross += g; r.withheld += w; r.net += t.amount || (g - w); r.count++;
    r.lastTs = Math.max(r.lastTs, t.ts);
  }

  // yield on cost: dividends against what the shares still held actually cost
  const pos = positions(state, prices);
  const costBy = Object.fromEntries(pos.map(p => [p.symbol, p.cost]));
  const rows = Object.values(bySymbol).map(r => ({
    ...r,
    name: state.positions[r.symbol]?.name || r.symbol,
    cost: costBy[r.symbol] || 0,
    yieldOnCost: costBy[r.symbol] > 0 ? r.gross / costBy[r.symbol] * 100 : null,
    open: !!state.positions[r.symbol]
  })).sort((a, b) => b.net - a.net);

  const totalCost = pos.reduce((a, p) => a + p.cost, 0);
  const days = firstTs ? Math.max(1, (Date.now() - firstTs) / 86400000) : 0;

  return {
    gross, withheld, net, count, rows, totalCost,
    yieldOnCost: totalCost > 0 ? gross / totalCost * 100 : 0,
    annualised: days > 30 ? gross * 365 / days : null,   // pace so far, extrapolated
    monthlyAvg: days > 0 ? net / (days / 30.44) : 0
  };
}

/** Compact holdings roll-up: how many shares, of what, worth how much. */
export function holdingsSummary(state = get(), prices = {}){
  const rows = positions(state, prices);
  const stocks = rows.filter(r => !FUND_TYPES.has(r.type));
  const funds  = rows.filter(r =>  FUND_TYPES.has(r.type));
  const sum = a => a.reduce((x, r) => x + r.value, 0);
  return {
    rows,
    count: rows.length,
    totalShares: rows.reduce((a, r) => a + r.qty, 0),
    value: sum(rows),
    stocks: { n: stocks.length, shares: stocks.reduce((a,r) => a + r.qty, 0), value: sum(stocks) },
    funds:  { n: funds.length,  shares: funds.reduce((a,r) => a + r.qty, 0),  value: sum(funds) }
  };
}

const FUND_TYPES = new Set(['ETP','Closed-End Fund','Open-End Fund','Mutual Fund']);
