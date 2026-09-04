import { get } from '../store.js';
import { positions, totalsFor } from '../engine.js';
import { quotes, isFund } from '../market.js';
import { t } from '../i18n.js';
import { usd, num, esc, signedUsd, signedPct, pct, cls } from '../format.js';
import { openPosition } from './tradesheet.js';
import { bars } from '../charts.js';
import { helpBtn } from '../help.js';

let sortBy = 'value';

export default function portfolio(host){
  host.innerHTML = `
    <div class="grid g4" id="tot" style="margin-bottom:14px"></div>

    <div class="card">
      <div class="row" style="margin-bottom:12px">
        <h3 class="card-title" style="margin:0">${esc(t('pf.title'))}${helpBtn('trade')}</h3>
        <div class="pillrow">
          <button class="chip ${sortBy==='value'?'active':''}" data-s="value">${esc(t('pf.sortValue'))}</button>
          <button class="chip ${sortBy==='pl'?'active':''}" data-s="pl">${esc(t('pf.sortPL'))}</button>
          <button class="chip ${sortBy==='name'?'active':''}" data-s="name">${esc(t('pf.sortName'))}</button>
        </div>
      </div>
      <div class="scrollx"><table class="tbl" id="tbl"></table></div>
    </div>

    <div class="card">
      <h3 class="card-title">${esc(t('pf.pl'))}${helpBtn('realized')}</h3>
      <div id="plbars"></div>
    </div>`;

  const $ = s => host.querySelector(s);

  function rows(){
    const r = positions(get(), quotes);
    if (sortBy === 'pl') r.sort((a,b) => b.pl - a.pl);
    else if (sortBy === 'name') r.sort((a,b) => a.symbol.localeCompare(b.symbol));
    else r.sort((a,b) => b.value - a.value);
    return r;
  }

  function draw(){
    const state = get();
    const T = totalsFor(state, quotes);
    const rs = rows();

    $('#tot').innerHTML = [
      ['dash.invested', usd(T.invested), `${rs.length} ${t('dash.positions').toLowerCase()}`, ''],
      ['dash.cash', usd(T.cash), '', ''],
      ['dash.unrealized', signedUsd(T.unrealized), '', cls(T.unrealized)],
      ['dash.realized', signedUsd(T.realized), '', cls(T.realized)]
    ].map(([k,v,d,c]) => `<div class="kpi"><div class="k">${esc(t(k))}</div><div class="v num ${c}">${v}</div>${d?`<div class="d num">${d}</div>`:''}</div>`).join('');

    $('#tbl').innerHTML = rs.length ? `
      <thead><tr>
        <th>${esc(t('pf.title'))}</th>
        <th>${esc(t('pf.qty'))}</th>
        <th>${esc(t('tr.price'))}</th>
        <th>${esc(t('pf.avg'))}</th>
        <th>${esc(t('pf.value'))}</th>
        <th>${esc(t('pf.pl'))}</th>
        <th>${esc(t('pf.day'))}</th>
        <th>${esc(t('pf.weight'))}</th>
      </tr></thead>
      <tbody>${rs.map(r => `
        <tr data-sym="${esc(r.symbol)}" style="cursor:pointer">
          <td><div style="font-weight:700">${esc(r.symbol)} <span class="badge ${isFund(r.type)?'etf':'stock'}">${isFund(r.type)?'ETF':'STK'}</span></div>
              <div class="tiny muted" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name)}</div></td>
          <td class="num">${num(r.qty,4)}</td>
          <td class="num" data-px>${usd(r.last)}</td>
          <td class="num">${usd(r.avg)}</td>
          <td class="num" data-val>${usd(r.value)}</td>
          <td class="num ${cls(r.pl)}" data-pl>${signedUsd(r.pl)}<div class="tiny ${cls(r.pl)}">${signedPct(r.plPct)}</div></td>
          <td class="num ${cls(r.dayChg)}" data-day>${signedUsd(r.dayChg)}<div class="tiny ${cls(r.dayPct)}">${signedPct(r.dayPct)}</div></td>
          <td class="num">${pct(r.weight,1)}</td>
        </tr>`).join('')}</tbody>
      <tfoot><tr>
        <td>${esc(t('tr.total'))}</td><td></td><td></td><td></td>
        <td class="num">${usd(T.invested)}</td>
        <td class="num ${cls(T.unrealized)}">${signedUsd(T.unrealized)}</td>
        <td class="num ${cls(T.dayChg)}">${signedUsd(T.dayChg)}</td>
        <td class="num">100%</td>
      </tr></tfoot>`
      : `<tbody><tr><td><div class="empty">${esc(t('dash.emptyPos'))}</div></td></tr></tbody>`;

    bars($('#plbars'), rs.map(r => ({ label: r.symbol, value: r.pl, text: `${signedUsd(r.pl)} · ${signedPct(r.plPct)}` })),
         { emptyText: t('dash.emptyPos') });
  }

  host.querySelector('.pillrow').addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    sortBy = b.dataset.s;
    host.querySelectorAll('[data-s]').forEach(c => c.classList.toggle('active', c.dataset.s === sortBy));
    draw();
  });
  host.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-sym]'); if (!tr) return;
    openPosition(tr.dataset.sym, draw);
  });

  draw();
  return {
    tick(){
      for (const r of positions(get(), quotes)){
        const tr = host.querySelector(`tr[data-sym="${CSS.escape(r.symbol)}"]`);
        if (!tr) continue;
        tr.querySelector('[data-px]').textContent = usd(r.last);
        tr.querySelector('[data-val]').textContent = usd(r.value);
        const pl = tr.querySelector('[data-pl]');
        pl.innerHTML = `${signedUsd(r.pl)}<div class="tiny ${cls(r.pl)}">${signedPct(r.plPct)}</div>`;
        pl.className = 'num ' + cls(r.pl);
        const dy = tr.querySelector('[data-day]');
        dy.innerHTML = `${signedUsd(r.dayChg)}<div class="tiny ${cls(r.dayPct)}">${signedPct(r.dayPct)}</div>`;
        dy.className = 'num ' + cls(r.dayChg);
      }
    },
    refresh: draw
  };
}
