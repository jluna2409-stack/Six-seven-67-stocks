import { get, settings } from './store.js';
import { annualSummary } from './tax.js';
import { TX } from './store.js';

/** Every calendar year that has taxable activity (plus the current one). */
export function activeYears(state = get()){
  const set = new Set([new Date().getFullYear()]);
  for (const r of state.realized) set.add(new Date(r.ts).getFullYear());
  for (const t of state.transactions){
    if (t.type === TX.SALARY || t.type === TX.DIVIDEND || t.type === TX.INTEREST) set.add(new Date(t.ts).getFullYear());
  }
  return [...set].sort((a, b) => b - a);
}

/** Raw taxable inputs for one year, in USD. */
export function yearInputs(state, year){
  let capGain = 0, capLoss = 0, salaryGross = 0, salaryIsr = 0, divGross = 0, divUs = 0, interest = 0;
  for (const r of state.realized){
    if (new Date(r.ts).getFullYear() !== year) continue;
    if (r.gain >= 0) capGain += r.gain; else capLoss += -r.gain;
  }
  for (const t of state.transactions){
    if (new Date(t.ts).getFullYear() !== year) continue;
    if (t.type === TX.SALARY && t.taxable){ salaryGross += t.gross || 0; salaryIsr += t.isr || 0; }
    else if (t.type === TX.DIVIDEND){ divGross += t.gross || 0; divUs += t.withheld || 0; }
    else if (t.type === TX.INTEREST) interest += t.amount || 0;
  }
  return { capGain, capLoss, salaryGross, salaryIsrWithheld: salaryIsr, divGross, divUsWithheld: divUs, interest };
}

/**
 * Chained report across all years so capital-loss carryforwards flow correctly
 * (LISR art. 129: losses may be applied for up to 10 following years).
 */
export function report(state = get()){
  const s = settings();
  const cfg = { fx: s.fx, capRate: s.capRate, divExtraRate: s.divExtraRate, tables: s.tables };
  const years = activeYears(state).slice().sort((a, b) => a - b);
  const out = {};
  let carry = 0;
  for (const y of years){
    const inp = yearInputs(state, y);
    const sum = annualSummary({ ...inp, carryIn: carry }, cfg);
    sum.year = y;
    sum.annualPaid = state.taxPaid[String(y)] || 0;
    sum.annualOutstanding = Math.max(0, sum.annualDue - sum.annualPaid);
    sum.paid = sum.annualPaid;
    sum.outstanding = sum.annualOutstanding;
    out[y] = sum;
    carry = sum.carryOut;
  }
  return out;
}

/** Tax that would be triggered if every open position were sold at today's price. */
export function latentTax(unrealized){
  const s = settings();
  return Math.max(0, unrealized) * (s.capRate / 100);
}
