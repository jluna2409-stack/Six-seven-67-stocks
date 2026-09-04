import { get, update, addTx, TX, settings } from './store.js';
import { salaryNet } from './tax.js';
import { uid } from './format.js';

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

export function createRecurring({ name, amount, gross, freq, startTs }){
  update(st => {
    st.recurring.push({
      id: uid(), name: name || '', kind:'salary', amount, gross: !!gross,
      freq, nextTs: startTs, active: true, createdAt: Date.now()
    });
  }, { reason:'recurring' });
}

/** Compute what one run of a schedule actually deposits. */
export function previewRun(r){
  const s = settings();
  if (!r.gross) return { gross: r.amount, net: r.amount, isr: 0, imss: 0, subsidy: 0, taxable: false };
  const calc = salaryNet(r.amount, r.freq, s.fx, s.tables);
  return { ...calc, taxable: true };
}

/**
 * Apply every scheduled deposit whose date has already passed.
 * Runs on every app start, so the simulation self-heals after weeks away.
 */
export function runDue(now = Date.now()){
  const s = get();
  const applied = [];
  let guard = 0;

  update(st => {
    for (const r of st.recurring){
      if (!r.active) continue;
      while (r.nextTs <= now && guard++ < 600){
        const p = previewRun(r);
        st.cash += p.net;
        const row = {
          id: uid(), ts: r.nextTs, type: TX.SALARY, amount: p.net,
          gross: p.gross, isr: p.isr, imss: p.imss, taxable: p.taxable,
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
