import { get } from '../store.js';
import { totalsFor, positions, twr, dividendSummary, holdingsSummary } from '../engine.js';
import { quotes, isFund } from '../market.js';
import { t } from '../i18n.js';
import { usd, usdCompact, signedUsd, signedPct, pct, cls, esc, dayKeyToTs, dateLong, timeShort, num } from '../format.js';
import { lineChart, donut, PALETTE } from '../charts.js';
import { latentTax } from '../taxreport.js';
import { helpBtn } from '../help.js';
import { sheet } from '../ui.js';
import { openDividend } from './tradesheet.js';
import { alerts, daysUntil } from '../obligations.js';

const RANGES = [['1D',1],['1W',7],['1M',30],['3M',90],['6M',180],['1Y',365],['ALL',1e6]];
let range = localStorage.getItem('bolsa-sim/range') || '1M';
let divScope = 'year';

// Intraday samples so the chart is alive on day one; kept for the session and
// restored on reload so today's curve is not lost when the tab is refreshed.
const IK = 'bolsa-sim/intraday';
const intraday = (() => {
  try {
    const raw = JSON.parse(sessionStorage.getItem(IK) || '[]');
    const start = new Date(); start.setHours(0,0,0,0);
    return raw.filter(p => Array.isArray(p) && p[0] >= start.getTime());
  } catch { return []; }
})();

export function sampleIntraday(nw){
  const now = Date.now();
  const last = intraday[intraday.length - 1];
  if (last && now - last[0] < 20000) return;
  intraday.push([now, nw]);
  if (intraday.length > 900) intraday.splice(0, intraday.length - 900);
  try { sessionStorage.setItem(IK, JSON.stringify(intraday)); } catch { /* ignore */ }
}

function buildSeries(state, liveNw){
  if (range === '1D'){
    const pts = intraday.slice();
    if (!pts.length) return [];
    return pts;
  }
  const days = RANGES.find(r => r[0] === range)[1];
  const cutoff = Date.now() - days * 86400000;
  const snaps = state.snapshots.filter(s => days >= 1e6 || dayKeyToTs(s.d) >= cutoff);
  const pts = snaps.map(s => [dayKeyToTs(s.d), s.nw]);
  if (pts.length){ pts[pts.length - 1] = [Date.now(), liveNw]; }
  // Day one: no daily history yet, so show the live intraday curve instead of an empty box.
  if (pts.length < 2) return intraday.length >= 2 ? intraday.slice() : pts;
  return pts;
}

export default function dashboard(host){
  host.innerHTML = `
    <div id="taxalert"></div>

    <section class="hero">
      <div class="lbl" data-i18n>${esc(t('dash.networth'))}${helpBtn('networth')}</div>
      <div class="val num" id="nw">—</div>
      <div class="sub num" id="nwsub">—</div>
    </section>

    <div class="card" style="margin-top:14px">
      <div class="chart-wrap" id="chart" style="margin-bottom:10px">
        <div class="scrub-readout"><span id="sc-l"></span><span id="sc-r"></span></div>
      </div>
      <div class="pillrow" id="ranges">
        ${RANGES.map(([k]) => `<button class="chip ${k === range ? 'active' : ''}" data-r="${k}">${esc(t('range.' + k))}</button>`).join('')}
      </div>
    </div>

    <div class="grid g4" id="kpis" style="margin-bottom:14px"></div>

    <div class="card">
      <h3 class="card-title">${esc(t('dash.watch'))}${helpBtn('realtime')}</h3>
      <div class="tape" id="tape"></div>
    </div>

    <div class="card">
      <h3 class="card-title">${esc(t('hold.title'))}${helpBtn('holdings')}</h3>
      <div id="holdings"></div>
    </div>

    <div class="card">
      <div class="row" style="margin-bottom:12px">
        <h3 class="card-title" style="margin:0">${esc(t('div.title'))}${helpBtn('dividends')}</h3>
        <div class="pillrow">
          <button class="chip active" data-dv="year">${esc(t('div.thisYear'))}</button>
          <button class="chip" data-dv="all">${esc(t('div.allTime'))}</button>
        </div>
      </div>
      <div id="divbox"></div>
    </div>

    <div class="card">
      <h3 class="card-title">${esc(t('dash.alloc'))}${helpBtn('alloc')}</h3>
      <div class="allocwrap">
        <div id="donut"></div>
        <div class="donut-legend" id="legend"></div>
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">${esc(t('dash.positions'))}</h3>
      <div class="list" id="poslist"></div>
    </div>`;

  const $ = id => host.querySelector('#' + id);

  host.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]');
    if (g){ location.hash = '#' + g.dataset.goto; return; }
    if (e.target.closest('[data-recdiv]')){
      const rows = positions(get(), quotes);
      if (!rows.length) return;
      pickDividendSymbol(rows);
      return;
    }
    const b = e.target.closest('[data-dv]'); if (!b) return;
    divScope = b.dataset.dv;
    host.querySelectorAll('[data-dv]').forEach(c => c.classList.toggle('active', c.dataset.dv === divScope));
    drawDividends();
  });

  host.querySelector('#ranges').addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    range = b.dataset.r;
    localStorage.setItem('bolsa-sim/range', range);
    host.querySelectorAll('#ranges .chip').forEach(c => c.classList.toggle('active', c.dataset.r === range));
    draw();
  });

  let lastNw = 0;

  function draw(){
    const state = get();
    const T = totalsFor(state, quotes);
    lastNw = T.nw;
    sampleIntraday(T.nw);

    $('nw').textContent = usd(T.nw);
    const pts = buildSeries(state, T.nw);
    const first = pts.length ? pts[0][1] : T.nw;
    const periodChg = T.nw - first;
    const periodPct = first > 0 ? periodChg / first * 100 : 0;
    const rangeLabel = range === '1D' ? t('dash.today') : t('range.' + range);
    $('nwsub').innerHTML = `<span class="${cls(periodChg)}">${signedUsd(periodChg)} · ${signedPct(periodPct)}</span> <span class="muted">${esc(rangeLabel)}</span>`;

    // ---- chart
    lineChart($('chart'), pts, {
      height: 190,
      baseline: pts.length ? pts[0][1] : null,
      emptyText: t('dash.nodata'),
      onScrub(p){
        if (!p){
          $('sc-l').textContent = ''; $('sc-r').textContent = '';
          $('nw').textContent = usd(T.nw);
          return;
        }
        $('nw').textContent = usd(p[1]);
        $('sc-l').textContent = range === '1D' ? timeShort(p[0]) : dateLong(p[0]);
        const d = p[1] - first;
        $('sc-r').innerHTML = `<span class="${cls(d)}">${signedUsd(d)}</span>`;
      }
    });
    // keep the readout box above the chart
    const ro = document.createElement('div');
    ro.className = 'scrub-readout';
    ro.innerHTML = `<span id="sc-l"></span><span id="sc-r"></span>`;
    $('chart').appendChild(ro);

    // ---- KPIs
    const rows = positions(state, quotes);
    const tw = twr(state.snapshots);
    $('kpis').innerHTML = [
      card(t('dash.cash'), usd(T.cash), `${pct(T.nw > 0 ? T.cash / T.nw * 100 : 0, 1)} ${t('pf.weight').toLowerCase()}`, '', 'cash'),
      card(t('dash.invested'), usd(T.invested), `${rows.length} ${t('dash.positions').toLowerCase()}`, '', 'invested'),
      card(t('dash.gain'), signedUsd(T.gain), signedPct(T.gainPct), cls(T.gain), 'gain'),
      card(t('dash.contrib'), usd(T.contrib), `${t('dash.twr')} ${signedPct(tw)}`, '', 'twr')
    ].join('');

    drawHoldings(rows);
    drawDividends();
    drawAlert();

    // ---- live tape
    $('tape').innerHTML = rows.length ? rows.slice(0, 12).map(r => `
      <div class="tape-card" data-sym="${esc(r.symbol)}">
        <div class="s">${esc(r.symbol)}</div>
        <div class="p num" data-px data-v="${r.last}">${usd(r.last)}</div>
        <div class="c num ${cls(r.dayPct)}" data-dp>${signedPct(r.dayPct)}</div>
      </div>`).join('') : `<div class="empty" style="padding:14px 0">${esc(t('dash.emptyPos'))}</div>`;

    // ---- allocation
    const slices = rows.slice(0, 9).map((r, i) => ({ label: r.symbol, value: r.value, color: PALETTE[i % PALETTE.length] }));
    const rest = rows.slice(9).reduce((a, r) => a + r.value, 0);
    if (rest > 0) slices.push({ label:'…', value: rest, color:'var(--tx3)' });
    if (T.cash > 0) slices.push({ label: t('dash.cash'), value: T.cash, color:'var(--bg-elev2)' });
    donut($('donut'), slices, { size:150, thickness:26, center: usdCompact(T.nw), centerLabel: t('dash.networth').toUpperCase() });
    $('legend').innerHTML = slices.map(s => `<div class="lg">
        <span class="sw" style="background:${s.color}"></span>
        <span style="flex:1">${esc(s.label)}</span>
        <span class="num muted">${pct(T.nw > 0 ? s.value / T.nw * 100 : 0, 1)}</span>
        <span class="num" style="min-width:82px;text-align:right">${usd(s.value)}</span>
      </div>`).join('');

    // ---- positions
    $('poslist').innerHTML = rows.length ? rows.map(r => `
      <button class="list-item" data-sym="${esc(r.symbol)}">
        <div class="li-main">
          <div class="li-t">${esc(r.symbol)} <span class="badge ${isFund(r.type) ? 'etf' : 'stock'}">${isFund(r.type) ? 'ETF' : 'STOCK'}</span></div>
          <div class="li-s">${num(r.qty, 4)} × ${usd(r.last)} · ${esc(t('pf.avg'))} ${usd(r.avg)}</div>
        </div>
        <div class="li-r">
          <div class="li-v num" data-val>${usd(r.value)}</div>
          <div class="li-d num ${cls(r.pl)}" data-pl>${signedUsd(r.pl)} · ${signedPct(r.plPct)}</div>
        </div>
      </button>`).join('') : `<div class="empty">${esc(t('dash.emptyPos'))}</div>`;

    // ---- tax hint
    const lat = latentTax(T.unrealized);
    if (lat > 0){
      const hint = document.createElement('div');
      hint.className = 'note info';
      hint.style.marginTop = '2px';
      hint.innerHTML = `${esc(t('tax.estUnrealized'))}${helpBtn('latent')}: <strong class="num">${usd(lat)}</strong> — ${esc(t('tax.unrealizedNote'))}`;
      $('poslist').after(hint);
    }
  }

  function card(k, v, d, c = '', help = ''){
    return `<div class="kpi"><div class="k">${esc(k)}${help ? helpBtn(help) : ''}</div>` +
      `<div class="v num ${c}">${v}</div><div class="d num">${d}</div></div>`;
  }

  /* ---- how many shares, of what company or index, worth how much ---- */
  function drawHoldings(rows){
    const H = holdingsSummary(get(), quotes);
    if (!H.count){ $('holdings').innerHTML = `<div class="empty">${esc(t('hold.none'))}</div>`; return; }
    $('holdings').innerHTML = `
      <div class="grid g3" style="margin-bottom:14px">
        <div class="kpi"><div class="k">${esc(t('hold.instruments'))}</div><div class="v num">${H.count}</div>
          <div class="d num">${num(H.totalShares, 2)} ${esc(t('hold.shares'))}</div></div>
        <div class="kpi"><div class="k">${esc(t('hold.stocks'))}</div><div class="v num">${H.stocks.n}</div>
          <div class="d num">${usd(H.stocks.value)}</div></div>
        <div class="kpi"><div class="k">${esc(t('hold.funds'))}</div><div class="v num">${H.funds.n}</div>
          <div class="d num">${usd(H.funds.value)}</div></div>
      </div>
      <div class="hold-grid">
        <div class="hd">${esc(t('hold.what'))}</div>
        <div class="hd" style="text-align:right">${esc(t('hold.shares'))}</div>
        <div class="hd" style="text-align:right">${esc(t('hold.value'))}</div>
        ${rows.map(r => `
          <div class="hn"><b>${esc(r.symbol)}</b>
            <span class="badge ${isFund(r.type) ? 'etf' : 'stock'}">${isFund(r.type) ? 'ETF' : 'STK'}</span>
            <span class="muted tiny">${esc(r.name)}</span></div>
          <div class="num" style="text-align:right">${num(r.qty, 4)}</div>
          <div class="num" style="text-align:right">${usd(r.value)}</div>`).join('')}
        <div class="ht">${esc(t('hold.total'))}</div>
        <div class="ht num" style="text-align:right">${num(H.totalShares, 2)}</div>
        <div class="ht num" style="text-align:right">${usd(H.value)}</div>
      </div>`;
  }

  /* ---- deadline warning, so a due date never passes unnoticed ---- */
  function drawAlert(){
    const due = alerts(get());
    if (!due.length){ $('taxalert').innerHTML = ''; return; }
    const late = due.filter(o => o.status === 'overdue');
    const worst = late[0] || due[0];
    const d = daysUntil(worst.due);
    const label = worst.kind === 'annual'
      ? t('ob.annual', { y: worst.year })
      : t('ob.dividend', { p: worst.period });
    const when = d === 0 ? t('ob.dueToday')
      : d === 1 ? t('ob.dueTomorrow')
      : d > 0 ? t('ob.daysLeft', { n: d })
      : t('ob.daysOver', { n: -d });
    const total = due.reduce((a, o) => a + o.outstanding, 0);

    $('taxalert').innerHTML = `
      <button class="alert ${late.length ? 'late' : 'warn'}" data-goto="taxes">
        <span class="ai">${late.length ? '⚠' : '◷'}</span>
        <span class="at">
          <span class="a1">${esc(late.length
            ? (late.length > 1 ? t('ob.alertOverdueN', { n: late.length }) : t('ob.alertOverdue', { n: 1 }))
            : t('ob.alertSoon'))}</span>
          <span class="a2">${esc(label)} · ${esc(when)} · <span class="num">${usd(total)}</span></span>
        </span>
        <span class="ag">›</span>
      </button>`;
  }

  /* ---- pick which holding paid the dividend ---- */
  function pickDividendSymbol(rows){
    if (rows.length === 1){ openDividend(rows[0].symbol, draw); return; }
    sheet({
      title: t('pf.dividend'),
      sub: esc(t('tr.pickSymbol')),
      body: `<div class="list">${rows.map(r => `
        <button class="list-item" data-pick="${esc(r.symbol)}">
          <div class="li-main"><div class="li-t">${esc(r.symbol)}</div>
            <div class="li-s">${esc(r.name)}</div></div>
          <div class="li-r"><div class="li-v num">${usd(r.value)}</div></div>
        </button>`).join('')}</div>`,
      onMount(el, close){
        el.addEventListener('click', ev => {
          const b = ev.target.closest('[data-pick]'); if (!b) return;
          close();
          setTimeout(() => openDividend(b.dataset.pick, draw), 260);
        });
      }
    });
  }

  /* ---- what the portfolio paid you in dividends alone ---- */
  function drawDividends(){
    const yr = divScope === 'year' ? new Date().getFullYear() : null;
    const D = dividendSummary(get(), quotes, yr);
    if (!D.count){
      $('divbox').innerHTML = `<div class="empty" style="padding:20px 10px;line-height:1.55">${esc(t('div.none'))}</div>`
        + (positions(get(), quotes).length ? `<button class="btn sec" data-recdiv>${esc(t('pf.dividend'))}</button>` : '');
      return;
    }
    $('divbox').innerHTML = `
      <div class="grid g2" style="margin-bottom:14px">
        <div class="kpi"><div class="k">${esc(t('div.netPocket'))}</div><div class="v num up">${usd(D.net)}</div>
          <div class="d num">${D.count} ${esc(t('div.payments'))}</div></div>
        <div class="kpi"><div class="k">${esc(t('div.yieldCost'))}</div><div class="v num">${pct(D.yieldOnCost, 2)}</div>
          <div class="d num">${esc(t('div.monthly'))} ${usd(D.monthlyAvg)}</div></div>
      </div>
      <div class="scrollx" style="margin:0"><table class="tbl">
        <thead><tr><th>${esc(t('pf.title'))}</th><th>${esc(t('div.gross'))}</th><th>${esc(t('div.withheld'))}</th><th>${esc(t('div.netPocket'))}</th></tr></thead>
        <tbody>${D.rows.map(r => `<tr>
          <td><b>${esc(r.symbol)}</b>${r.open ? '' : ` <span class="badge warn">${esc(t('div.sold'))}</span>`}
              <div class="tiny muted">${r.count} ${esc(t('div.payments'))} · ${dateLong(r.lastTs)}</div>
              <div class="tiny muted">${esc(t('div.yieldCost'))} ${r.yieldOnCost == null ? '—' : pct(r.yieldOnCost, 2)}</div></td>
          <td class="num">${usd(r.gross)}</td>
          <td class="num down">−${usd(r.withheld)}</td>
          <td class="num up">${usd(r.net)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>${esc(t('tr.total'))}</td><td class="num">${usd(D.gross)}</td>
          <td class="num down">−${usd(D.withheld)}</td><td class="num up">${usd(D.net)}</td></tr></tfoot>
      </table></div>
      ${D.annualised != null ? `<div class="tiny muted" style="margin-top:10px">${esc(t('div.annualised'))}: <span class="num">${usd(D.annualised)}</span></div>` : ''}
      <button class="btn sec" data-recdiv style="margin-top:14px">${esc(t('pf.dividend'))}</button>`;
  }

  draw();

  return {
    tick(){
      const state = get();
      const T = totalsFor(state, quotes);
      sampleIntraday(T.nw);
      if (!host.querySelector('.chart-wrap.scrubbing')) $('nw').textContent = usd(T.nw);
      const rows = positions(state, quotes);
      for (const r of rows){
        const tape = host.querySelector(`.tape-card[data-sym="${CSS.escape(r.symbol)}"]`);
        if (tape){
          const px = tape.querySelector('[data-px]');
          const nextTxt = usd(r.last);
          const prevVal = Number(px.dataset.v || r.last);
          if (px.textContent !== nextTxt){
            const upTick = r.last >= prevVal;
            px.textContent = nextTxt;
            px.dataset.v = String(r.last);
            tape.classList.remove('flash-up','flash-down');
            void tape.offsetWidth;
            tape.classList.add(upTick ? 'flash-up' : 'flash-down');
          }
          const dp = tape.querySelector('[data-dp]');
          dp.textContent = signedPct(r.dayPct);
          dp.className = 'c num ' + cls(r.dayPct);
        }
        const li = host.querySelector(`.list-item[data-sym="${CSS.escape(r.symbol)}"]`);
        if (li){
          li.querySelector('[data-val]').textContent = usd(r.value);
          const pl = li.querySelector('[data-pl]');
          pl.textContent = `${signedUsd(r.pl)} · ${signedPct(r.plPct)}`;
          pl.className = 'li-d num ' + cls(r.pl);
        }
      }
      if (Math.abs(T.nw - lastNw) / Math.max(1, lastNw) > 0.004){ lastNw = T.nw; }
    },
    refresh: draw
  };
}
