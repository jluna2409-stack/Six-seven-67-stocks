import { get, update, addTx, TX, settings } from './store.js';
import { salaryNet } from './tax.js';
import { ratesFor, rateAt } from './fx.js';
import { uid, dayKey } from './format.js';

export const FREQS = ['weekly','biweekly','semimonthly','monthly'];

/** Next occurrence of a schedule after `ts`. */
export function advance(ts, freq){
  const d = new Date(ts);
  switch (freq){
    case 'weekly':   d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'semimonthly': {
      if (d.getDate() < 15) d.setDate(15);
      else if (d.getDate() === 15) d.setMonth(d.getMonth() + 1, 0);   // last day of month
      else { d.setMonth(d.getMonth() + 1, 15); }
      break;
    }
    default: {                                                        // monthly
      const day = d.getDate();
      d.setMonth(d.getMonth() + 1, 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, last));
    }
  }
  return d.getTime();
}

export function createRecurring({ name, amount, currency, gross, freq, startTs }){
  update(st => {
    st.recurring.push({
      id: uid(), name: name || '', kind:'salary',
      amount,                          // kept in the currency it was entered in
      currency: currency === 'MXN' ? 'MXN' : 'USD',
      gross: !!gross,
      freq, nextTs: startTs, active: true, createdAt: Date.now()
    });
  }, { reason:'recurring' });
}

/** The schedule's amount in USD at a given exchange rate. */
export function amountUsd(r, fx){
  return r.currency === 'MXN' ? r.amount / (fx || settings().fx) : r.amount;
}

/**
 * What one run of a schedule deposits.
 * @param {object} r   the schedule
 * @param {number} fx  USD/MXN to use; defaults to the current rate
 */
export function previewRun(r, fx){
  const s = settings();
  const rate = fx || s.fx;
  const gross = amountUsd(r, rate);
  if (!r.gross) return { gross, net: gross, isr: 0, imss: 0, subsidy: 0, taxable: false, fx: rate };
  const calc = salaryNet(gross, r.freq, rate, s.tables);
  return { ...calc, taxable: true, fx: rate };
}

/**
 * Apply every scheduled deposit whose date has already passed.
 *
 * A schedule entered in pesos is converted with the exchange rate of each
 * payday's own date, so a salary of "22,000 MXN" stays 22,000 MXN as the peso
 * moves, and back-dated periods are valued at the rate that actually applied
 * then rather than today's.
 */
export async function runDue(now = Date.now()){
  const s = get();

  // 1. enumerate what is due, without touching state yet
  const plan = [];
  for (const r of s.recurring){
    if (!r.active) continue;
    let ts = r.nextTs, guard = 0;
    while (ts <= now && guard++ < 600){
      plan.push({ id: r.id, ts });
      ts = advance(ts, r.freq);
    }
  }
  if (!plan.length) return [];

  // 2. resolve the exchange rate each peso-denominated run needs
  const byId = Object.fromEntries(s.recurring.map(r => [r.id, r]));
  const needs = plan.filter(p => byId[p.id]?.currency === 'MXN').map(p => dayKey(new Date(p.ts)));
  let rates = {};
  if (needs.length){
    try { rates = await ratesFor(needs); } catch { rates = {}; }
  }

  // 3. apply them in one atomic update
  const applied = [];
  update(st => {
    for (const r of st.recurring){
      if (!r.active) continue;
      let guard = 0;
      while (r.nextTs <= now && guard++ < 600){
        const fx = r.currency === 'MXN' ? rateAt(r.nextTs, rates) : st.settings.fx;
        const p = previewRun(r, fx);
        st.cash += p.net;
        const row = {
          id: uid(), ts: r.nextTs, type: TX.SALARY, amount: p.net,
          gross: p.gross, isr: p.isr, imss: p.imss, taxable: p.taxable,
          srcAmount: r.amount, srcCurrency: r.currency, fx,
          note: r.name || '', recurringId: r.id
        };
        st.transactions.push(row);
        applied.push(row);
        r.nextTs = advance(r.nextTs, r.freq);
      }
    }
    st.transactions.sort((a, b) => a.ts - b.ts);
    st.lastRun = now;
  }, { reason:'recurring' });

  return applied;
}

export function toggleRecurring(id){
  update(st => {
    const r = st.recurring.find(x => x.id === id);
    if (!r) return;
    r.active = !r.active;
    if (r.active && r.nextTs < Date.now()) r.nextTs = advance(Date.now(), r.freq);
  }, { reason:'recurring' });
}

export function deleteRecurring(id){
  update(st => { st.recurring = st.recurring.filter(x => x.id !== id); }, { reason:'recurring' });
}
