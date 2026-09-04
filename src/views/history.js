import { get, TX } from '../store.js';
import { t } from '../i18n.js';
import { usd, num, esc, dateTime, cls, signedUsd } from '../format.js';

let filter = 'all';

const GROUPS = {
  all: null,
  trades: [TX.BUY, TX.SELL],
  cashflow: [TX.DEPOSIT, TX.WITHDRAW, TX.SALARY, TX.INTEREST],
  taxes: [TX.TAX, TX.DIVIDEND]
};

export default function history(host){
  host.innerHTML = `
    <div class="card">
      <div class="row" style="margin-bottom:12px">
        <div class="pillrow">
          ${Object.keys(GROUPS).map(k => `<button class="chip ${k===filter?'active':''}" data-f="${k}">${esc(t('hist.' + k))}</button>`).join('')}
        </div>
        <button class="btn sm ghost" id="csv">${esc(t('hist.export'))}</button>
      </div>
      <div class="list" id="rows"></div>
    </div>`;

  const $ = s => host.querySelector(s);

  function list(){
    const s = get();
    const g = GROUPS[filter];
    return s.transactions.filter(x => !g || g.includes(x.type)).slice().reverse();
  }

  function draw(){
    const rows = list();
    $('#rows').innerHTML = rows.length ? rows.map(x => {
      const inflow = [TX.DEPOSIT, TX.SALARY, TX.SELL, TX.DIVIDEND, TX.INTEREST].includes(x.type);
      let sub = dateTime(x.ts);
      if (x.type === TX.BUY || x.type === TX.SELL) sub += ` · ${num(x.qty,4)} × ${usd(x.price)}` + (x.fee ? ` · ${t('tr.fee')} ${usd(x.fee)}` : '');
      if (x.type === TX.SALARY && x.isr) sub += ` · ${t('cash.isrRet')} ${usd(x.isr)} · ${t('cash.imss')} ${usd(x.imss)}`;
      if (x.type === TX.DIVIDEND) sub += ` · ${t('tax.divUS')} ${usd(x.withheld || 0)}`;
      if (x.note) sub += ` · ${esc(x.note)}`;
      return `<div class="list-item" style="cursor:default">
        <div class="li-main">
          <div class="li-t">${esc(t('tx.' + x.type))}${x.symbol ? ` · ${esc(x.symbol)}` : ''}
            ${x.emergency ? `<span class="badge warn">${esc(t('cash.emergency'))}</span>` : ''}</div>
          <div class="li-s">${sub}</div>
        </div>
        <div class="li-r">
          <div class="li-v num ${inflow ? 'up' : 'down'}">${inflow ? '+' : '−'}${usd(x.amount)}</div>
          ${x.gain != null ? `<div class="li-d num ${cls(x.gain)}">${esc(t('tr.realizedGain'))} ${signedUsd(x.gain)}</div>` : ''}
        </div>
      </div>`;
    }).join('') : `<div class="empty">${esc(t('hist.empty'))}</div>`;
  }

  host.querySelector('.pillrow').onclick = e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    filter = b.dataset.f;
    host.querySelectorAll('[data-f]').forEach(c => c.classList.toggle('active', c.dataset.f === filter));
    draw();
  };

  $('#csv').onclick = () => {
    const rows = list();
    const head = ['date','type','symbol','qty','price','amount','fee','gain','gross','isr','imss','withheld','note'];
    const csv = [head.join(',')].concat(rows.map(x => head.map(k => {
      let v = k === 'date' ? new Date(x.ts).toISOString() : (x[k] ?? '');
      v = String(v).replace(/"/g, '""');
      return /[",\n]/.test(v) ? `"${v}"` : v;
    }).join(','))).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `bolsa-sim-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  draw();
  return { refresh: draw };
}
