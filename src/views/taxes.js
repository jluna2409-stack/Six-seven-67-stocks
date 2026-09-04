import { get, settings } from '../store.js';
import { report, activeYears, latentTax } from '../taxreport.js';
import { totalsFor, payTax } from '../engine.js';
import { quotes } from '../market.js';
import { t } from '../i18n.js';
import { usd, esc, pct, mxn, signedUsd, cls } from '../format.js';
import { confirmSheet, toast } from '../ui.js';

let year = new Date().getFullYear();

export default function taxes(host){
  host.innerHTML = `<div id="wrap"></div>`;

  function draw(){
    const st = get();
    const s = settings();
    const rep = report(st);
    const years = activeYears(st);
    if (!rep[year]) year = years[0];
    const r = rep[year];
    const T = totalsFor(st, quotes);

    host.querySelector('#wrap').innerHTML = `
      <div class="card">
        <div class="row" style="margin-bottom:12px">
          <h3 class="card-title" style="margin:0">${esc(t('tax.year'))}</h3>
          <div class="pillrow">${years.map(y =>
            `<button class="chip ${y===year?'active':''}" data-y="${y}">${y}</button>`).join('')}</div>
        </div>
        <div class="grid g2">
          <div class="kpi"><div class="k">${esc(t('tax.due'))}</div><div class="v num">${usd(r ? r.totalDue : 0)}</div>
            <div class="d">${esc(t('tax.dueDate', { y: year + 1 }))}</div></div>
          <div class="kpi"><div class="k">${esc(t('tax.effective'))}</div><div class="v num">${pct(r ? r.effectiveRate : 0, 1)}</div>
            <div class="d">${esc(t('tax.paid'))}: ${usd(r ? r.paid : 0)}</div></div>
        </div>
      </div>

      ${!r || (r.capGain + r.capLoss + r.salaryGross + r.divGross) === 0
        ? `<div class="card"><div class="empty">${esc(t('tax.noData'))}</div></div>` : `

      <div class="card">
        <h3 class="card-title">${esc(t('tax.capgains'))}</h3>
        <table class="tbl">
          <tbody>
            <tr><td>${esc(t('tax.gains'))}</td><td class="num up">${usd(r.capGain)}</td></tr>
            <tr><td>${esc(t('tax.losses'))}</td><td class="num down">−${usd(r.capLoss)}</td></tr>
            <tr><td>${esc(t('tax.netGain'))}</td><td class="num ${cls(r.netGainBefore)}">${signedUsd(r.netGainBefore)}</td></tr>
            <tr><td>${esc(t('tax.carry'))}</td><td class="num">${usd(r.carryIn)}</td></tr>
            <tr><td>${esc(t('tax.carryUsed'))}</td><td class="num">−${usd(r.carryUsed)}</td></tr>
            <tr><td>${esc(t('tax.taxable'))}</td><td class="num">${usd(r.capTaxable)}</td></tr>
            <tr><td>${esc(t('tax.rate'))}</td><td class="num">${pct(s.capRate, 0)}</td></tr>
          </tbody>
          <tfoot><tr><td>${esc(t('tax.due'))}</td><td class="num">${usd(r.capTax)}</td></tr></tfoot>
        </table>
        ${r.carryOut > 0 ? `<div class="tiny muted" style="margin-top:10px">${esc(t('tax.carryLeft'))}: <span class="num">${usd(r.carryOut)}</span></div>` : ''}
        <div class="note" style="margin-top:12px">${esc(t('tax.capgainsHelp'))}</div>
      </div>

      <div class="card">
        <h3 class="card-title">${esc(t('tax.dividends'))}</h3>
        <table class="tbl"><tbody>
          <tr><td>${esc(t('tax.divGross'))}</td><td class="num">${usd(r.divGross)}</td></tr>
          <tr><td>${esc(t('tax.divUS'))}</td><td class="num down">−${usd(r.divUsWithheld)}</td></tr>
          <tr><td>${esc(t('tax.divNet'))}</td><td class="num">${usd(r.divGross - r.divUsWithheld)}</td></tr>
          <tr><td>${esc(t('tax.divExtra'))}</td><td class="num down">${usd(r.divExtraTax)}</td></tr>
          <tr><td>${esc(t('tax.credits'))} (${esc(t('tax.divUS'))})</td><td class="num up">${usd(r.foreignCredit)}</td></tr>
        </tbody></table>
        <div class="note" style="margin-top:12px">${esc(t('tax.divHelp'))}</div>
      </div>

      <div class="card">
        <h3 class="card-title">${esc(t('tax.annual'))}</h3>
        <table class="tbl"><tbody>
          <tr><td>${esc(t('tax.salaryGross'))}</td><td class="num">${usd(r.salaryGross)}</td></tr>
          <tr><td>${esc(t('tax.divGross'))}</td><td class="num">${usd(r.divGross)}</td></tr>
          <tr><td>${esc(t('tax.base'))}</td><td class="num">${usd(r.accumUsd)}<div class="tiny muted">${mxn(r.accumMxn)}</div></td></tr>
          <tr><td>${esc(t('tax.isrAnnual'))}</td><td class="num">${usd(r.isrAnnual)}<div class="tiny muted">marginal ${pct(r.marginal,2)}</div></td></tr>
          <tr><td>${esc(t('tax.salaryRet'))}</td><td class="num up">−${usd(r.salaryIsrWithheld)}</td></tr>
          <tr><td>${esc(t('tax.credits'))}</td><td class="num up">−${usd(r.foreignCredit)}</td></tr>
        </tbody>
        <tfoot><tr>
          <td>${esc(r.annualBalance >= 0 ? t('tax.toPay') : t('tax.toRefund'))}</td>
          <td class="num ${r.annualBalance >= 0 ? 'down' : 'up'}">${usd(Math.abs(r.annualBalance))}</td>
        </tr></tfoot></table>
      </div>

      <div class="card">
        <h3 class="card-title">${esc(t('tax.balance'))}</h3>
        <table class="tbl"><tbody>
          <tr><td>${esc(t('tax.capgains'))} (${pct(s.capRate,0)})</td><td class="num">${usd(r.capTax)}</td></tr>
          <tr><td>${esc(t('tax.divExtra'))}</td><td class="num">${usd(r.divExtraTax)}</td></tr>
          <tr><td>${esc(t('tax.annual'))}</td><td class="num">${usd(Math.max(0, r.annualBalance))}</td></tr>
          <tr><td>${esc(t('tax.paid'))}</td><td class="num up">−${usd(r.paid)}</td></tr>
        </tbody>
        <tfoot><tr><td>${esc(t('tax.toPay'))}</td><td class="num">${usd(r.outstanding)}</td></tr></tfoot></table>
        ${r.outstanding > 0 ? `<button class="btn" id="pay" style="margin-top:14px">${esc(t('tax.pay'))} — ${usd(r.outstanding)}</button>
          <div class="tiny muted" style="margin-top:8px">${esc(t('tax.payHelp'))}</div>` : ''}
      </div>`}

      <div class="card">
        <h3 class="card-title">${esc(t('tax.estUnrealized'))}</h3>
        <div class="row"><span class="muted small">${esc(t('dash.unrealized'))}</span><span class="num ${cls(T.unrealized)}">${signedUsd(T.unrealized)}</span></div>
        <div class="row" style="margin-top:8px"><span class="muted small">${esc(t('tax.estUnrealized'))}</span><span class="num" style="font-weight:700">${usd(latentTax(T.unrealized))}</span></div>
        <div class="note info" style="margin-top:12px">${esc(t('tax.unrealizedNote'))}</div>
      </div>

      <div class="card">
        <h3 class="card-title">${esc(t('tax.tables'))}</h3>
        <div class="row small"><span class="muted">${esc(t('tax.tableYear'))}</span><span class="num">${s.tables.year}</span></div>
        <div class="row small" style="margin-top:8px"><span class="muted">${esc(t('set.fx'))}</span><span class="num">${s.fx}</span></div>
        <div class="row small" style="margin-top:8px"><span class="muted">UMA</span><span class="num">${mxn(s.tables.uma.monthly)} / ${esc(t('cash.monthly').toLowerCase())}</span></div>
        <div class="note" style="margin-top:12px">${esc(t('tax.disclaimer'))}</div>
      </div>`;

    host.querySelectorAll('[data-y]').forEach(b => b.onclick = () => { year = Number(b.dataset.y); draw(); });
    const pay = host.querySelector('#pay');
    if (pay) pay.onclick = () => confirmSheet(t('tax.pay'), t('tax.payHelp'), () => {
      const res = payTax(year, rep[year].outstanding);
      if (!res.ok) toast(t('cash.insufficient'), 'err'); else toast(t('act.done'), 'ok');
      draw();
    }, { danger:false });
  }

  draw();
  return { refresh: draw };
}
