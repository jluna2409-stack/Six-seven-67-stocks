/**
 * Tax calendar: turns the year's numbers into dated obligations, so the app can
 * warn before a deadline instead of showing one lump "tax due".
 *
 *  - Annual return (art. 150 LISR): filed and paid by 30 April of the following
 *    year. Carries the 10% on capital gains (art. 129) and the balance of the
 *    progressive tariff on wages and dividends (art. 152).
 *  - Extra 10% on foreign dividends (art. 142 fr. V): a definitive tax the
 *    individual pays by the 17th of the month following the one it was received.
 */
import { get, settings, TX } from './store.js';
import { report } from './taxreport.js';
import { payTax } from './engine.js';

export const DAY = 86400000;
const SOON_ANNUAL = 45;   // days of warning before 30 April
const SOON_MONTHLY = 10;  // days of warning before the 17th

function statusOf(outstanding, due, now, soonDays){
  if (outstanding <= 0.005) return 'paid';
  if (soonDays == null) return 'accruing';      // the year has not closed yet
  if (now > due) return 'overdue';
  if (due - now <= soonDays * DAY) return 'soon';
  return 'upcoming';
}

export function daysUntil(due, now = Date.now()){
  return Math.round((due - now) / DAY);
}

/** Every dated tax obligation, oldest deadline first. */
export function obligations(state = get(), now = Date.now()){
  const s = settings();
  const rep = report(state);
  const out = [];

  // ---- annual returns, due 30 April of the following year
  for (const key of Object.keys(rep)){
    const y = Number(key);
    const r = rep[y];
    if (r.annualDue <= 0.005) continue;
    const due = new Date(y + 1, 3, 30, 23, 59, 59).getTime();
    const closed = now >= new Date(y + 1, 0, 1).getTime();
    const paid = state.taxPaid[String(y)] || 0;
    const outstanding = Math.max(0, r.annualDue - paid);
    out.push({
      id: String(y), kind:'annual', year: y, due, closed,
      amount: r.annualDue, paid, outstanding,
      status: statusOf(outstanding, due, now, closed ? SOON_ANNUAL : null)
    });
  }

  // ---- extra 10% on foreign dividends, due the 17th of the following month
  const byMonth = {};
  for (const t of state.transactions){
    if (t.type !== TX.DIVIDEND) continue;
    const d = new Date(t.ts);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[k] = (byMonth[k] || 0) + (t.gross || 0);
  }
  for (const k of Object.keys(byMonth)){
    const amount = byMonth[k] * (s.divExtraRate / 100);
    if (amount <= 0.005) continue;
    const [y, m] = k.split('-').map(Number);
    const due = new Date(y, m, 17, 23, 59, 59).getTime();   // m is 1-based, so this is the next month
    const id = `div-${k}`;
    const paid = state.taxPaid[id] || 0;
    const outstanding = Math.max(0, amount - paid);
    out.push({
      id, kind:'dividend', year: y, month: m, period: k, due, closed: true,
      amount, paid, outstanding,
      status: statusOf(outstanding, due, now, SOON_MONTHLY)
    });
  }

  return out.sort((a, b) => a.due - b.due);
}

/** Anything overdue or close enough to warn about. */
export function alerts(state = get(), now = Date.now()){
  return obligations(state, now).filter(o => o.status === 'overdue' || o.status === 'soon');
}

export function pending(state = get(), now = Date.now()){
  return obligations(state, now).filter(o => o.outstanding > 0.005 && o.status !== 'accruing');
}

/** Total still owed on obligations whose deadline already exists. */
export function totalOwed(state = get(), now = Date.now()){
  return pending(state, now).reduce((a, o) => a + o.outstanding, 0);
}

/**
 * Settle every overdue obligation from cash, when the user enabled it.
 * Skips anything cash cannot cover rather than overdrawing.
 */
export function autoPayDue(now = Date.now()){
  if (!settings().autoPayTax) return [];
  const done = [];
  for (const o of obligations(get(), now)){
    if (o.status !== 'overdue') continue;
    if (o.outstanding > get().cash + 1e-9) continue;
    const r = payTax(o.id, o.outstanding, { year: o.year });
    if (r.ok) done.push(o);
  }
  return done;
}
